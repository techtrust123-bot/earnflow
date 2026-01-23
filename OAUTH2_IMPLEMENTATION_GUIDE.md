# OAuth2 Implementation Guide for All Platforms

## Overview

This guide provides step-by-step instructions to create OAuth2 endpoints for TikTok, Instagram, Facebook, and YouTube. Each platform has different OAuth2 flows, but the general pattern is:

1. **Initiate OAuth** (`/platform/oauth2/connect`) - Redirect user to platform for authorization
2. **Handle Callback** (`/platform/oauth2/callback`) - Exchange code for access token
3. **Store Token** - Save access token in user model
4. **Redirect Back** - Close popup and return to profile

---

## Platform Credentials Setup

Before implementing, you need to register your app with each platform:

### 1. **TikTok Developer Portal**
- Visit: https://developer.tiktok.com/
- Create new app
- Get: `Client ID`, `Client Secret`
- Set Redirect URI: `http://localhost:5000/api/tiktok/oauth2/callback` (or production URL)
- Required Scopes: `user.info.basic`, `video.list`

### 2. **Instagram/Meta Developers**
- Visit: https://developers.facebook.com/
- Create app (type: Consumer)
- Create Instagram Basic Display product
- Get: `Client ID`, `Client Secret`
- Set Redirect URI: `http://localhost:5000/api/instagram/oauth2/callback`
- Required Scopes: `instagram_basic`

### 3. **Facebook Developers**
- Visit: https://developers.facebook.com/
- Create app (type: Consumer)
- Get: `Client ID`, `Client Secret`
- Set Redirect URI: `http://localhost:5000/api/facebook/oauth2/callback`
- Required Scopes: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`

### 4. **YouTube/Google Cloud**
- Visit: https://console.cloud.google.com/
- Create new project
- Enable YouTube Data API v3
- Create OAuth 2.0 Client ID (Web application)
- Get: `Client ID`, `Client Secret`
- Set Authorized JavaScript origins: `http://localhost:5000` and `https://yourdomain.com`
- Set Redirect URIs: `http://localhost:5000/api/youtube/oauth2/callback`
- Required Scopes: `https://www.googleapis.com/auth/youtube`

---

## Environment Variables Setup

Add to your `.env` file:

```env
# TikTok OAuth2
TIKTOK_CLIENT_ID=your_tiktok_client_id
TIKTOK_CLIENT_SECRET=your_tiktok_client_secret
TIKTOK_OAUTH2_CALLBACK_URL=http://localhost:5000/api/tiktok/oauth2/callback

# Instagram OAuth2
INSTAGRAM_CLIENT_ID=your_instagram_client_id
INSTAGRAM_CLIENT_SECRET=your_instagram_client_secret
INSTAGRAM_OAUTH2_CALLBACK_URL=http://localhost:5000/api/instagram/oauth2/callback

# Facebook OAuth2
FACEBOOK_CLIENT_ID=your_facebook_client_id
FACEBOOK_CLIENT_SECRET=your_facebook_client_secret
FACEBOOK_OAUTH2_CALLBACK_URL=http://localhost:5000/api/facebook/oauth2/callback

# YouTube OAuth2
YOUTUBE_CLIENT_ID=your_youtube_client_id
YOUTUBE_CLIENT_SECRET=your_youtube_client_secret
YOUTUBE_OAUTH2_CALLBACK_URL=http://localhost:5000/api/youtube/oauth2/callback
```

---

## Implementation: Create 4 Controller Files

### File 1: `backend_fold/controllers/tiktokAuth.js`

```javascript
const axios = require('axios')
const jwt = require('jsonwebtoken')
const User = require('../models/user')

const TIKTOK_OAUTH_URL = 'https://www.tiktok.com/v1/oauth/token'
const TIKTOK_USER_INFO_URL = 'https://open.tiktokapis.com/v1/user/info'

exports.oauth2Connect = async (req, res) => {
  try {
    const clientId = process.env.TIKTOK_CLIENT_ID
    const redirectUri = process.env.TIKTOK_OAUTH2_CALLBACK_URL
    
    if (!clientId || !redirectUri) {
      return res.status(501).json({ error: 'TikTok OAuth not configured' })
    }

    // Store state in session for CSRF protection
    const state = Math.random().toString(36).substring(7)
    req.session.tiktokOAuthState = state
    req.session.save((err) => {
      if (err) {
        console.error('[tiktok] session save error', err)
        return res.redirect('/api/tiktok/popup-close?tiktok=failed&reason=session_error')
      }

      const authUrl = `https://www.tiktok.com/v1/oauth/authorize?` +
        `client_key=${encodeURIComponent(clientId)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent('user.info.basic,video.list')}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `state=${encodeURIComponent(state)}`

      return res.redirect(authUrl)
    })
  } catch (err) {
    console.error('[tiktok] oauth2Connect error', err)
    return res.redirect('/api/tiktok/popup-close?tiktok=failed&reason=server_error')
  }
}

exports.oauth2Callback = async (req, res) => {
  try {
    const { code, state } = req.query
    const storedState = req.session?.tiktokOAuthState

    if (!code || !state || state !== storedState) {
      return res.redirect('/api/tiktok/popup-close?tiktok=failed&reason=invalid_state')
    }

    // Exchange code for access token
    const tokenResponse = await axios.post(TIKTOK_OAUTH_URL, {
      client_key: process.env.TIKTOK_CLIENT_ID,
      client_secret: process.env.TIKTOK_CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.TIKTOK_OAUTH2_CALLBACK_URL
    })

    const accessToken = tokenResponse.data?.access_token
    if (!accessToken) {
      return res.redirect('/api/tiktok/popup-close?tiktok=failed&reason=no_access_token')
    }

    // Get user info
    const userResponse = await axios.get(
      `${TIKTOK_USER_INFO_URL}?fields=open_id,union_id,display_name`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )

    const tiktokUser = userResponse.data?.data
    if (!tiktokUser) {
      return res.redirect('/api/tiktok/popup-close?tiktok=failed&reason=no_user_info')
    }

    // Try to link to JWT-authenticated user
    const cookieToken = req.cookies?.token
    const headerToken = req.get('authorization') ? req.get('authorization').split(' ')[1] : null
    const rawToken = cookieToken || headerToken

    try {
      if (rawToken) {
        let decoded = null
        try { decoded = jwt.verify(rawToken, process.env.SECRET || process.env.JWT_SECRET) } catch (e) { decoded = null }
        
        if (decoded && decoded.id) {
          const user = await User.findById(decoded.id)
          if (user) {
            user.tiktok = {
              id: tiktokUser.open_id,
              username: tiktokUser.display_name || tiktokUser.union_id,
              displayName: tiktokUser.display_name,
              accessToken: accessToken,
              linkedAt: new Date()
            }
            await user.save()
            
            // Redirect popup to close and update parent
            return res.redirect(`/api/tiktok/popup-close?tiktok=linked_${tiktokUser.open_id}`)
          }
        }
      }
    } catch (err) {
      console.error('[tiktok] JWT verify or user save error', err)
    }

    // Fallback: store in session and redirect
    req.session.tiktokUser = {
      id: tiktokUser.open_id,
      username: tiktokUser.display_name || tiktokUser.union_id,
      displayName: tiktokUser.display_name,
      accessToken: accessToken
    }
    req.session.save((err) => {
      if (err) {
        return res.redirect('/api/tiktok/popup-close?tiktok=failed&reason=session_save')
      }
      return res.redirect(`/api/tiktok/popup-close?tiktok=linked_${tiktokUser.open_id}`)
    })
  } catch (err) {
    console.error('[tiktok] oauth2Callback error', err.response?.data || err.message)
    return res.redirect('/api/tiktok/popup-close?tiktok=failed&reason=token_exchange_failed')
  }
}
```

### File 2: `backend_fold/controllers/instagramAuth.js`

```javascript
const axios = require('axios')
const jwt = require('jsonwebtoken')
const User = require('../models/user')

const INSTAGRAM_OAUTH_URL = 'https://graph.instagram.com/v18.0/oauth/access_token'
const INSTAGRAM_USER_INFO_URL = 'https://graph.instagram.com/v18.0/me'

exports.oauth2Connect = async (req, res) => {
  try {
    const clientId = process.env.INSTAGRAM_CLIENT_ID
    const redirectUri = process.env.INSTAGRAM_OAUTH2_CALLBACK_URL
    
    if (!clientId || !redirectUri) {
      return res.status(501).json({ error: 'Instagram OAuth not configured' })
    }

    const state = Math.random().toString(36).substring(7)
    req.session.instagramOAuthState = state
    req.session.save((err) => {
      if (err) {
        console.error('[instagram] session save error', err)
        return res.redirect('/api/instagram/popup-close?instagram=failed&reason=session_error')
      }

      const authUrl = `https://api.instagram.com/oauth/authorize?` +
        `client_id=${encodeURIComponent(clientId)}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent('user_profile,user_media')}&` +
        `response_type=code&` +
        `state=${encodeURIComponent(state)}`

      return res.redirect(authUrl)
    })
  } catch (err) {
    console.error('[instagram] oauth2Connect error', err)
    return res.redirect('/api/instagram/popup-close?instagram=failed&reason=server_error')
  }
}

exports.oauth2Callback = async (req, res) => {
  try {
    const { code, state } = req.query
    const storedState = req.session?.instagramOAuthState

    if (!code || !state || state !== storedState) {
      return res.redirect('/api/instagram/popup-close?instagram=failed&reason=invalid_state')
    }

    // Exchange code for access token
    const tokenResponse = await axios.post(INSTAGRAM_OAUTH_URL, {
      client_id: process.env.INSTAGRAM_CLIENT_ID,
      client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: process.env.INSTAGRAM_OAUTH2_CALLBACK_URL,
      code: code
    })

    const accessToken = tokenResponse.data?.access_token
    const userId = tokenResponse.data?.user_id
    
    if (!accessToken || !userId) {
      return res.redirect('/api/instagram/popup-close?instagram=failed&reason=no_access_token')
    }

    // Get user info
    const userResponse = await axios.get(
      `${INSTAGRAM_USER_INFO_URL}?fields=id,username,name,media_count&access_token=${accessToken}`
    )

    const instagramUser = userResponse.data
    if (!instagramUser) {
      return res.redirect('/api/instagram/popup-close?instagram=failed&reason=no_user_info')
    }

    // Try to link to JWT-authenticated user
    const cookieToken = req.cookies?.token
    const headerToken = req.get('authorization') ? req.get('authorization').split(' ')[1] : null
    const rawToken = cookieToken || headerToken

    try {
      if (rawToken) {
        let decoded = null
        try { decoded = jwt.verify(rawToken, process.env.SECRET || process.env.JWT_SECRET) } catch (e) { decoded = null }
        
        if (decoded && decoded.id) {
          const user = await User.findById(decoded.id)
          if (user) {
            user.instagram = {
              id: String(instagramUser.id),
              username: instagramUser.username,
              displayName: instagramUser.name,
              accessToken: accessToken,
              linkedAt: new Date()
            }
            await user.save()
            
            return res.redirect(`/api/instagram/popup-close?instagram=linked_${instagramUser.id}`)
          }
        }
      }
    } catch (err) {
      console.error('[instagram] JWT verify or user save error', err)
    }

    // Fallback: store in session and redirect
    req.session.instagramUser = {
      id: String(instagramUser.id),
      username: instagramUser.username,
      displayName: instagramUser.name,
      accessToken: accessToken
    }
    req.session.save((err) => {
      if (err) {
        return res.redirect('/api/instagram/popup-close?instagram=failed&reason=session_save')
      }
      return res.redirect(`/api/instagram/popup-close?instagram=linked_${instagramUser.id}`)
    })
  } catch (err) {
    console.error('[instagram] oauth2Callback error', err.response?.data || err.message)
    return res.redirect('/api/instagram/popup-close?instagram=failed&reason=token_exchange_failed')
  }
}
```

### File 3: `backend_fold/controllers/facebookAuth.js`

```javascript
const axios = require('axios')
const jwt = require('jsonwebtoken')
const User = require('../models/user')

const FACEBOOK_OAUTH_URL = 'https://graph.facebook.com/v18.0/oauth/access_token'
const FACEBOOK_USER_INFO_URL = 'https://graph.facebook.com/v18.0/me'

exports.oauth2Connect = async (req, res) => {
  try {
    const clientId = process.env.FACEBOOK_CLIENT_ID
    const redirectUri = process.env.FACEBOOK_OAUTH2_CALLBACK_URL
    
    if (!clientId || !redirectUri) {
      return res.status(501).json({ error: 'Facebook OAuth not configured' })
    }

    const state = Math.random().toString(36).substring(7)
    req.session.facebookOAuthState = state
    req.session.save((err) => {
      if (err) {
        console.error('[facebook] session save error', err)
        return res.redirect('/api/facebook/popup-close?facebook=failed&reason=session_error')
      }

      const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
        `client_id=${encodeURIComponent(clientId)}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent('public_profile,pages_show_list')}&` +
        `state=${encodeURIComponent(state)}&` +
        `response_type=code`

      return res.redirect(authUrl)
    })
  } catch (err) {
    console.error('[facebook] oauth2Connect error', err)
    return res.redirect('/api/facebook/popup-close?facebook=failed&reason=server_error')
  }
}

exports.oauth2Callback = async (req, res) => {
  try {
    const { code, state } = req.query
    const storedState = req.session?.facebookOAuthState

    if (!code || !state || state !== storedState) {
      return res.redirect('/api/facebook/popup-close?facebook=failed&reason=invalid_state')
    }

    // Exchange code for access token
    const tokenResponse = await axios.get(FACEBOOK_OAUTH_URL, {
      params: {
        client_id: process.env.FACEBOOK_CLIENT_ID,
        client_secret: process.env.FACEBOOK_CLIENT_SECRET,
        code: code,
        redirect_uri: process.env.FACEBOOK_OAUTH2_CALLBACK_URL
      }
    })

    const accessToken = tokenResponse.data?.access_token
    if (!accessToken) {
      return res.redirect('/api/facebook/popup-close?facebook=failed&reason=no_access_token')
    }

    // Get user info
    const userResponse = await axios.get(
      `${FACEBOOK_USER_INFO_URL}?fields=id,name,email&access_token=${accessToken}`
    )

    const facebookUser = userResponse.data
    if (!facebookUser) {
      return res.redirect('/api/facebook/popup-close?facebook=failed&reason=no_user_info')
    }

    // Try to link to JWT-authenticated user
    const cookieToken = req.cookies?.token
    const headerToken = req.get('authorization') ? req.get('authorization').split(' ')[1] : null
    const rawToken = cookieToken || headerToken

    try {
      if (rawToken) {
        let decoded = null
        try { decoded = jwt.verify(rawToken, process.env.SECRET || process.env.JWT_SECRET) } catch (e) { decoded = null }
        
        if (decoded && decoded.id) {
          const user = await User.findById(decoded.id)
          if (user) {
            user.facebook = {
              id: facebookUser.id,
              username: facebookUser.email || facebookUser.name,
              displayName: facebookUser.name,
              accessToken: accessToken,
              linkedAt: new Date()
            }
            await user.save()
            
            return res.redirect(`/api/facebook/popup-close?facebook=linked_${facebookUser.id}`)
          }
        }
      }
    } catch (err) {
      console.error('[facebook] JWT verify or user save error', err)
    }

    // Fallback: store in session and redirect
    req.session.facebookUser = {
      id: facebookUser.id,
      username: facebookUser.email || facebookUser.name,
      displayName: facebookUser.name,
      accessToken: accessToken
    }
    req.session.save((err) => {
      if (err) {
        return res.redirect('/api/facebook/popup-close?facebook=failed&reason=session_save')
      }
      return res.redirect(`/api/facebook/popup-close?facebook=linked_${facebookUser.id}`)
    })
  } catch (err) {
    console.error('[facebook] oauth2Callback error', err.response?.data || err.message)
    return res.redirect('/api/facebook/popup-close?facebook=failed&reason=token_exchange_failed')
  }
}
```

### File 4: `backend_fold/controllers/youtubeAuth.js`

```javascript
const axios = require('axios')
const jwt = require('jsonwebtoken')
const User = require('../models/user')

const YOUTUBE_OAUTH_URL = 'https://oauth2.googleapis.com/token'
const YOUTUBE_USER_INFO_URL = 'https://www.googleapis.com/youtube/v3/channels'

exports.oauth2Connect = async (req, res) => {
  try {
    const clientId = process.env.YOUTUBE_CLIENT_ID
    const redirectUri = process.env.YOUTUBE_OAUTH2_CALLBACK_URL
    
    if (!clientId || !redirectUri) {
      return res.status(501).json({ error: 'YouTube OAuth not configured' })
    }

    const state = Math.random().toString(36).substring(7)
    req.session.youtubeOAuthState = state
    req.session.save((err) => {
      if (err) {
        console.error('[youtube] session save error', err)
        return res.redirect('/api/youtube/popup-close?youtube=failed&reason=session_error')
      }

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(clientId)}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent('https://www.googleapis.com/auth/youtube')}&` +
        `access_type=offline&` +
        `prompt=consent&` +
        `state=${encodeURIComponent(state)}`

      return res.redirect(authUrl)
    })
  } catch (err) {
    console.error('[youtube] oauth2Connect error', err)
    return res.redirect('/api/youtube/popup-close?youtube=failed&reason=server_error')
  }
}

exports.oauth2Callback = async (req, res) => {
  try {
    const { code, state } = req.query
    const storedState = req.session?.youtubeOAuthState

    if (!code || !state || state !== storedState) {
      return res.redirect('/api/youtube/popup-close?youtube=failed&reason=invalid_state')
    }

    // Exchange code for access token
    const tokenResponse = await axios.post(YOUTUBE_OAUTH_URL, {
      client_id: process.env.YOUTUBE_CLIENT_ID,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.YOUTUBE_OAUTH2_CALLBACK_URL
    })

    const accessToken = tokenResponse.data?.access_token
    const refreshToken = tokenResponse.data?.refresh_token
    
    if (!accessToken) {
      return res.redirect('/api/youtube/popup-close?youtube=failed&reason=no_access_token')
    }

    // Get user info (channels)
    const userResponse = await axios.get(YOUTUBE_USER_INFO_URL, {
      params: {
        part: 'snippet,statistics',
        mine: true,
        access_token: accessToken
      }
    })

    const channel = userResponse.data?.items?.[0]
    if (!channel) {
      return res.redirect('/api/youtube/popup-close?youtube=failed&reason=no_user_info')
    }

    // Try to link to JWT-authenticated user
    const cookieToken = req.cookies?.token
    const headerToken = req.get('authorization') ? req.get('authorization').split(' ')[1] : null
    const rawToken = cookieToken || headerToken

    try {
      if (rawToken) {
        let decoded = null
        try { decoded = jwt.verify(rawToken, process.env.SECRET || process.env.JWT_SECRET) } catch (e) { decoded = null }
        
        if (decoded && decoded.id) {
          const user = await User.findById(decoded.id)
          if (user) {
            user.youtube = {
              id: channel.id,
              username: channel.snippet.customUrl || channel.snippet.title,
              displayName: channel.snippet.title,
              accessToken: accessToken,
              refreshToken: refreshToken || null,
              linkedAt: new Date()
            }
            await user.save()
            
            return res.redirect(`/api/youtube/popup-close?youtube=linked_${channel.id}`)
          }
        }
      }
    } catch (err) {
      console.error('[youtube] JWT verify or user save error', err)
    }

    // Fallback: store in session and redirect
    req.session.youtubeUser = {
      id: channel.id,
      username: channel.snippet.customUrl || channel.snippet.title,
      displayName: channel.snippet.title,
      accessToken: accessToken,
      refreshToken: refreshToken
    }
    req.session.save((err) => {
      if (err) {
        return res.redirect('/api/youtube/popup-close?youtube=failed&reason=session_save')
      }
      return res.redirect(`/api/youtube/popup-close?youtube=linked_${channel.id}`)
    })
  } catch (err) {
    console.error('[youtube] oauth2Callback error', err.response?.data || err.message)
    return res.redirect('/api/youtube/popup-close?youtube=failed&reason=token_exchange_failed')
  }
}
```

---

## Implementation: Create 4 Route Files

Create these route files in `backend_fold/routes/`:

### File: `backend_fold/routes/tiktok.js`

```javascript
const express = require('express')
const { oauth2Connect, oauth2Callback } = require('../controllers/tiktokAuth')
const router = express.Router()

router.get('/oauth2/connect', oauth2Connect)
router.get('/oauth2/callback', oauth2Callback)

// Popup close endpoint (frontend helper)
router.get('/popup-close', (req, res) => {
  const html = `
    <html>
      <head><title>Closing...</title></head>
      <body>
        <script>
          const params = new URLSearchParams(window.location.search);
          window.opener?.postMessage({tiktok: params.get('tiktok') || 'failed'}, '*');
          window.close();
        </script>
      </body>
    </html>
  `
  res.send(html)
})

module.exports = router
```

### File: `backend_fold/routes/instagram.js`

```javascript
const express = require('express')
const { oauth2Connect, oauth2Callback } = require('../controllers/instagramAuth')
const router = express.Router()

router.get('/oauth2/connect', oauth2Connect)
router.get('/oauth2/callback', oauth2Callback)

router.get('/popup-close', (req, res) => {
  const html = `
    <html>
      <head><title>Closing...</title></head>
      <body>
        <script>
          const params = new URLSearchParams(window.location.search);
          window.opener?.postMessage({instagram: params.get('instagram') || 'failed'}, '*');
          window.close();
        </script>
      </body>
    </html>
  `
  res.send(html)
})

module.exports = router
```

### File: `backend_fold/routes/facebook.js`

```javascript
const express = require('express')
const { oauth2Connect, oauth2Callback } = require('../controllers/facebookAuth')
const router = express.Router()

router.get('/oauth2/connect', oauth2Connect)
router.get('/oauth2/callback', oauth2Callback)

router.get('/popup-close', (req, res) => {
  const html = `
    <html>
      <head><title>Closing...</title></head>
      <body>
        <script>
          const params = new URLSearchParams(window.location.search);
          window.opener?.postMessage({facebook: params.get('facebook') || 'failed'}, '*');
          window.close();
        </script>
      </body>
    </html>
  `
  res.send(html)
})

module.exports = router
```

### File: `backend_fold/routes/youtube.js`

```javascript
const express = require('express')
const { oauth2Connect, oauth2Callback } = require('../controllers/youtubeAuth')
const router = express.Router()

router.get('/oauth2/connect', oauth2Connect)
router.get('/oauth2/callback', oauth2Callback)

router.get('/popup-close', (req, res) => {
  const html = `
    <html>
      <head><title>Closing...</title></head>
      <body>
        <script>
          const params = new URLSearchParams(window.location.search);
          window.opener?.postMessage({youtube: params.get('youtube') || 'failed'}, '*');
          window.close();
        </script>
      </body>
    </html>
  `
  res.send(html)
})

module.exports = router
```

---

## Integration: Register Routes in Main Server File

In your `backend_fold/server.js` (or main app file), add these routes:

```javascript
// Add these imports at the top
const tiktokRoutes = require('./routes/tiktok')
const instagramRoutes = require('./routes/instagram')
const facebookRoutes = require('./routes/facebook')
const youtubeRoutes = require('./routes/youtube')

// Add these route registrations (after your other routes)
app.use('/api/tiktok', tiktokRoutes)
app.use('/api/instagram', instagramRoutes)
app.use('/api/facebook', facebookRoutes)
app.use('/api/youtube', youtubeRoutes)
```

---

## Unlink Endpoints

Add these unlink functions to a shared auth controller or create individual ones:

### In `backend_fold/controllers/authController.js` (or create `unlinkController.js`):

```javascript
const User = require('../models/user')

exports.unlinkPlatform = async (req, res) => {
  try {
    const user = req.user
    const platform = req.params.platform?.toLowerCase()

    if (!platform || !['twitter', 'tiktok', 'instagram', 'facebook', 'youtube'].includes(platform)) {
      return res.status(400).json({ success: false, message: 'Invalid platform' })
    }

    const normalizedPlatform = platform === 'twitter' || platform === 'x' ? 'twitter' : platform

    user[normalizedPlatform] = undefined
    await user.save()

    res.json({
      success: true,
      message: `${platform} account unlinked successfully`
    })
  } catch (err) {
    console.error(`[unlink] error unlinking ${req.params.platform}:`, err)
    res.status(500).json({ success: false, message: 'Failed to unlink account' })
  }
}
```

Then add these routes to each platform route file:

```javascript
const { protect } = require('../middleweres/authmiddlewere')
const { unlinkPlatform } = require('../controllers/authController')

router.delete('/unlink', protect, (req, res, next) => {
  req.params.platform = 'tiktok' // or instagram, facebook, youtube
  unlinkPlatform(req, res)
})
```

---

## Testing the Endpoints

### 1. Test OAuth Connect
```bash
curl http://localhost:5000/api/tiktok/oauth2/connect
# Should redirect to TikTok login page
```

### 2. Test with Frontend
Navigate to Profile page and click "Connect TikTok" - should open OAuth popup

### 3. Check User Model
After successful linking, user document should have:
```javascript
{
  tiktok: {
    id: "123456",
    username: "myusername",
    displayName: "My Display Name",
    accessToken: "slk_....",
    linkedAt: ISODate(...)
  }
}
```

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "OAuth not configured" | Missing env variables | Add credentials to `.env` |
| Blank redirect page | Session not saving | Check `req.session` setup, ensure `express-session` middleware |
| "Invalid state" | CSRF token mismatch | Verify session is persistent across requests |
| Token exchange fails | Wrong callback URL | Verify callback URL matches exactly in platform settings |
| No user info | Scope insufficient | Add required scopes in controller |
| Pop-up closes immediately | JavaScript error | Check browser console for errors |

---

## Security Best Practices

✅ **Do:**
- Use HTTPS in production
- Store tokens securely (encrypted at rest)
- Validate state parameter (CSRF protection)
- Use short-lived tokens, refresh when needed
- Log authentication events
- Implement rate limiting on OAuth endpoints

❌ **Don't:**
- Store secrets in frontend code
- Log sensitive tokens
- Use hardcoded redirect URIs
- Skip state validation
- Allow anyone to unlink others' accounts

---

## Next Steps

1. Register apps with each platform
2. Get credentials (Client ID, Client Secret)
3. Add to `.env` file
4. Create controller files
5. Create route files
6. Register routes in `server.js`
7. Test OAuth flow
8. Add unlink endpoints
9. Deploy to production
