# Quick Copy-Paste Implementation Files

This file contains all the code ready to copy-paste into your project.

## Step 1: Create Controller Files

### `backend_fold/controllers/tiktokAuth.js`

Copy and paste this entire file:

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
            
            return res.redirect(`/api/tiktok/popup-close?tiktok=linked_${tiktokUser.open_id}`)
          }
        }
      }
    } catch (err) {
      console.error('[tiktok] JWT verify or user save error', err)
    }

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

### `backend_fold/controllers/instagramAuth.js`

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

    const userResponse = await axios.get(
      `${INSTAGRAM_USER_INFO_URL}?fields=id,username,name,media_count&access_token=${accessToken}`
    )

    const instagramUser = userResponse.data
    if (!instagramUser) {
      return res.redirect('/api/instagram/popup-close?instagram=failed&reason=no_user_info')
    }

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

### `backend_fold/controllers/facebookAuth.js`

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

    const userResponse = await axios.get(
      `${FACEBOOK_USER_INFO_URL}?fields=id,name,email&access_token=${accessToken}`
    )

    const facebookUser = userResponse.data
    if (!facebookUser) {
      return res.redirect('/api/facebook/popup-close?facebook=failed&reason=no_user_info')
    }

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

### `backend_fold/controllers/youtubeAuth.js`

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

## Step 2: Create Route Files

### `backend_fold/routes/tiktok.js`

```javascript
const express = require('express')
const { oauth2Connect, oauth2Callback } = require('../controllers/tiktokAuth')
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

### `backend_fold/routes/instagram.js`

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

### `backend_fold/routes/facebook.js`

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

### `backend_fold/routes/youtube.js`

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

## Step 3: Update server.js

Find your main server file (`backend_fold/server.js` or `backend_fold/app.js`) and add these lines:

**Add at the top with other imports:**
```javascript
const tiktokRoutes = require('./routes/tiktok')
const instagramRoutes = require('./routes/instagram')
const facebookRoutes = require('./routes/facebook')
const youtubeRoutes = require('./routes/youtube')
```

**Add after your other app.use() middleware:**
```javascript
app.use('/api/tiktok', tiktokRoutes)
app.use('/api/instagram', instagramRoutes)
app.use('/api/facebook', facebookRoutes)
app.use('/api/youtube', youtubeRoutes)
```

---

## Step 4: Update .env File

Add these lines to your `.env` file:

```env
# TikTok OAuth2
TIKTOK_CLIENT_ID=your_tiktok_client_id_here
TIKTOK_CLIENT_SECRET=your_tiktok_client_secret_here
TIKTOK_OAUTH2_CALLBACK_URL=http://localhost:5000/api/tiktok/oauth2/callback

# Instagram OAuth2  
INSTAGRAM_CLIENT_ID=your_instagram_client_id_here
INSTAGRAM_CLIENT_SECRET=your_instagram_client_secret_here
INSTAGRAM_OAUTH2_CALLBACK_URL=http://localhost:5000/api/instagram/oauth2/callback

# Facebook OAuth2
FACEBOOK_CLIENT_ID=your_facebook_client_id_here
FACEBOOK_CLIENT_SECRET=your_facebook_client_secret_here
FACEBOOK_OAUTH2_CALLBACK_URL=http://localhost:5000/api/facebook/oauth2/callback

# YouTube OAuth2
YOUTUBE_CLIENT_ID=your_youtube_client_id_here
YOUTUBE_CLIENT_SECRET=your_youtube_client_secret_here
YOUTUBE_OAUTH2_CALLBACK_URL=http://localhost:5000/api/youtube/oauth2/callback
```

---

## All Done!

That's all the code you need. Now:

1. Copy-paste the 4 controller files
2. Copy-paste the 4 route files
3. Update your server.js
4. Update your .env
5. Restart the server
6. Test OAuth flows

Refer to the OAUTH2_IMPLEMENTATION_GUIDE.md for detailed explanation of each part.
