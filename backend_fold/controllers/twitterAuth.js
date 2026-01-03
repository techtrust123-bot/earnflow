const axios = require('axios')
const OAuth = require('oauth-1.0a')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const User = require('../models/user')

function createOauthClient() {
  return OAuth({
    consumer: { key: process.env.TWITTER_CONSUMER_KEY, secret: process.env.TWITTER_CONSUMER_SECRET },
    signature_method: 'HMAC-SHA1',
    hash_function(base_string, key) {
      return crypto.createHmac('sha1', key).update(base_string).digest('base64')
    }
  })
}

exports.connect = async (req, res) => {
  try {
    const callbackUrl = process.env.TWITTER_OAUTH1_CALLBACK_URL || `${req.protocol}://${req.get('host')}/api/twitter/oauth1/callback`
    const oauth = createOauthClient()
    const request_data = { url: 'https://api.twitter.com/oauth/request_token', method: 'POST', data: { oauth_callback: callbackUrl } }

    const headers = oauth.toHeader(oauth.authorize(request_data))
    const r = await axios.post(request_data.url, null, { headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' } })
    const params = new URLSearchParams(r.data)

    const oauth_token = params.get('oauth_token')
    const oauth_token_secret = params.get('oauth_token_secret')

    if (!oauth_token || !oauth_token_secret) {
      console.error('[twitter][oauth1] missing request token response', r.data)
      return res.redirect('/api/twitter/popup-close?twitter=failed&reason=request_token_failed')
    }

    req.session.oauthRequestToken = oauth_token
    req.session.oauthRequestTokenSecret = oauth_token_secret

    return req.session.save((err) => {
      if (err) {
        console.error('[twitter][oauth1] session save error', err)
        return res.redirect('/api/twitter/popup-close?twitter=failed&reason=session_save_failed')
      }
      const authUrl = `https://api.twitter.com/oauth/authenticate?oauth_token=${encodeURIComponent(oauth_token)}`
      return res.redirect(authUrl)
    })
  } catch (err) {
    console.error('[twitter][oauth1] request_token error', err)
    return res.redirect('/api/twitter/popup-close?twitter=failed&reason=request_token_error')
  }
}

exports.callback = async (req, res) => {
  try {
    console.debug('[twitter][oauth1] callback query:', req.query)
    const { oauth_token, oauth_verifier } = req.query || {}
    const storedToken = req.session?.oauthRequestToken
    const storedSecret = req.session?.oauthRequestTokenSecret

    if (!oauth_token || !oauth_verifier) return res.redirect('/api/twitter/popup-close?twitter=failed&reason=missing_params')
    if (!storedToken || !storedSecret || storedToken !== oauth_token) return res.redirect('/api/twitter/popup-close?twitter=failed&reason=missing_request_token')

    const oauth = createOauthClient()
    const token = { key: oauth_token, secret: storedSecret }
    const request_data = { url: 'https://api.twitter.com/oauth/access_token', method: 'POST', data: { oauth_verifier } }

    const headers = oauth.toHeader(oauth.authorize(request_data, token))
    const r = await axios.post(request_data.url, null, { headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' } })
    const params = new URLSearchParams(r.data)

    const accessToken = params.get('oauth_token')
    const accessSecret = params.get('oauth_token_secret')
    const user_id = params.get('user_id')
    const screen_name = params.get('screen_name')

    if (!accessToken || !accessSecret || !user_id) {
      return res.redirect('/api/twitter/popup-close?twitter=failed&reason=invalid_access_token')
    }

    // Try to link to JWT-authenticated user first
    const cookieToken = req.cookies?.token
    const headerToken = req.get('authorization') ? req.get('authorization').split(' ')[1] : null
    const rawToken = cookieToken || headerToken

    try {
      if (rawToken) {
        let decoded = null
        try { decoded = jwt.verify(rawToken, process.env.SECRET || process.env.JWT_SECRET) } catch (e) { decoded = null }
        if (decoded && decoded.id) {
          const existing = await User.findById(decoded.id)
          if (existing) {
            existing.twitter = {
              id: String(user_id),
              username: screen_name,
              token: accessToken,
              tokenSecret: accessSecret,
              linkedAt: new Date()
            }
            await existing.save()
            delete req.session.oauthRequestToken
            delete req.session.oauthRequestTokenSecret
            return res.redirect('/api/twitter/popup-close?twitter=linked_oauth1')
          }
        }
      }
    } catch (e) {
      console.warn('[twitter][oauth1] jwt/link error', e && e.message)
    }

    // Not linked via JWT — find existing by twitter id
    let user = await User.findOne({ 'twitter.id': String(user_id) })
    if (user) {
      user.twitter = {
        ...user.twitter,
        token: accessToken,
        tokenSecret: accessSecret,
        username: screen_name,
        linkedAt: new Date()
      }
      await user.save()

      // set JWT cookie for frontend
      try {
        if (process.env.SECRET) {
          const newToken = jwt.sign({ id: user._id, role: user.role }, process.env.SECRET, { expiresIn: '7d' })
          res.cookie('token', newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 24 * 60 * 60 * 1000
          })
        }
      } catch (e) {
        console.warn('[twitter][oauth1] issue token cookie failed', e && e.message)
      }

      delete req.session.oauthRequestToken
      delete req.session.oauthRequestTokenSecret
      return res.redirect('/api/twitter/popup-close?twitter=linked_oauth1')
    }

    // create new user
    user = new User({
      name: screen_name || `twitter_${user_id}`,
      email: null,
      password: Date.now().toString(36),
      twitter: {
        id: String(user_id),
        username: screen_name,
        token: accessToken,
        tokenSecret: accessSecret,
        linkedAt: new Date()
      }
    })
    await user.save()

    try {
      if (process.env.SECRET) {
        const newToken = jwt.sign({ id: user._id, role: user.role }, process.env.SECRET, { expiresIn: '7d' })
        res.cookie('token', newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
          maxAge: 24 * 60 * 60 * 1000
        })
      }
    } catch (e) {
      console.warn('[twitter][oauth1] sign token failed', e && e.message)
    }

    delete req.session.oauthRequestToken
    delete req.session.oauthRequestTokenSecret
    return res.redirect('/api/twitter/popup-close?twitter=linked_oauth1')
  } catch (err) {
    console.error('[twitter][oauth1] access_token error', err)
    return res.redirect('/api/twitter/popup-close?twitter=failed&reason=access_token_error')
  }
}

module.exports = exports
