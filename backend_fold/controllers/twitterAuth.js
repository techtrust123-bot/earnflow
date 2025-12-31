// const axios = require("axios")
// const crypto = require("crypto")
// const qs = require("querystring")
// const User = require("../models/user")

// /* ---------------- OAuth 1.0a Helpers ---------------- */

// function encodeRFC3986(str) {
//   return encodeURIComponent(str)
//     .replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase())
// }

// function oauthNonce() {
//   return crypto.randomBytes(16).toString("hex")
// }

// function oauthTimestamp() {
//   return Math.floor(Date.now() / 1000).toString()
// }

// function generateSignature(method, baseUrl, params, consumerSecret, tokenSecret = "") {
//   const sortedParams = Object.keys(params)
//     .sort()
//     .map(k => `${encodeRFC3986(k)}=${encodeRFC3986(params[k])}`)
//     .join("&")

//   const baseString = [
//     method.toUpperCase(),
//     encodeRFC3986(baseUrl),
//     encodeRFC3986(sortedParams)
//   ].join("&")

//   const signingKey =
//     `${encodeRFC3986(consumerSecret)}&${encodeRFC3986(tokenSecret)}`

//   return crypto
//     .createHmac("sha1", signingKey)
//     .update(baseString)
//     .digest("base64")
// }

// function buildAuthHeader(params) {
//   return (
//     "OAuth " +
//     Object.keys(params)
//       .sort()
//       .map(k => `${encodeRFC3986(k)}="${encodeRFC3986(params[k])}"`)
//       .join(", ")
//   )
// }

/* ---------------- STEP 1: CONNECT TWITTER ---------------- */

// exports.connectTwitter = async (req, res) => {
//   // Validate required Twitter env vars early for clearer errors
//   if (!process.env.TWITTER_CONSUMER_KEY || !process.env.TWITTER_CONSUMER_SECRET || !process.env.TWITTER_CALLBACK_URL) {
//     console.error('Missing Twitter env vars:', {
//       TWITTER_CONSUMER_KEY: !!process.env.TWITTER_CONSUMER_KEY,
//       TWITTER_CONSUMER_SECRET: !!process.env.TWITTER_CONSUMER_SECRET,
//       TWITTER_CALLBACK_URL: !!process.env.TWITTER_CALLBACK_URL
//     })
//     return res.status(500).json({ message: 'Twitter OAuth is not configured on the server (missing env vars)' })
//   }
//   try {
//     const callbackUrl =
//       `${process.env.TWITTER_CALLBACK_URL}?state=${req.user.id}`

//     const requestUrl = "https://api.twitter.com/oauth/request_token"

//     const oauthParams = {
//       oauth_callback: callbackUrl,
//       oauth_consumer_key: process.env.TWITTER_CONSUMER_KEY,
//       oauth_nonce: oauthNonce(),
//       oauth_signature_method: "HMAC-SHA1",
//       oauth_timestamp: oauthTimestamp(),
//       oauth_version: "1.0"
//     }

//     oauthParams.oauth_signature = generateSignature(
//       "POST",
//       requestUrl,
//       oauthParams,
//       process.env.TWITTER_CONSUMER_SECRET
//     )

//     const headers = {
//       Authorization: buildAuthHeader(oauthParams)
//     }

//     const response = await axios.post(requestUrl, null, { headers })
//     const data = qs.parse(response.data)

//     if (!data.oauth_token || !data.oauth_token_secret) {
//       throw new Error("Invalid request token response")
//     }

//     // Save request token and secret temporarily on the user for callback validation
//     const TOKEN_TTL_MS = 10 * 60 * 1000 // 10 minutes
//     const now = new Date()
//     const expiresAt = new Date(Date.now() + TOKEN_TTL_MS)
//     const existing = await User.findById(req.user.id)
//     await User.findByIdAndUpdate(req.user.id, {
//       twitter: {
//         ...(existing.twitter || {}),
//         requestToken: data.oauth_token,
//         requestTokenSecret: data.oauth_token_secret,
//         requestTokenExpiresAt: expiresAt
//       }
//     })

//     const redirectUrl = `https://api.twitter.com/oauth/authenticate?oauth_token=${data.oauth_token}`

//     // If this request is an XHR (frontend calling via axios), return JSON with the redirect URL
//     const acceptsJson = req.headers.accept && req.headers.accept.includes('application/json')
//     if (req.xhr || acceptsJson) {
//       return res.json({ redirectUrl })
//     }

//     // Fallback: regular redirect
//     return res.redirect(redirectUrl)
//   } catch (err) {
//     console.error("Twitter connect error:", err.response?.data || err.message)
//     return res.status(500).json({ message: "Twitter connection failed" })
//   }
// }

// /* ---------------- STEP 2: CALLBACK ---------------- */

// exports.twitterCallback = async (req, res) => {
//   try {
//     const { oauth_token, oauth_verifier, state } = req.query

//     if (!oauth_token || !oauth_verifier) {
//       const redirect = `${process.env.FRONTEND_URL}/profile?twitter=failed&reason=${encodeURIComponent('missing_params')}`
//       return res.redirect(302, redirect)
//     }

//     // Prefer state-based lookup (keeps original flow). If state is missing or session expired,
//     // fall back to finding the user who initiated the request using the saved request token.
//     let user = null
//     if (state) {
//       user = await User.findById(state)
//     }

//     if (!user) {
//       // try find by requestToken matching the oauth_token returned by Twitter
//       user = await User.findOne({ 'twitter.requestToken': oauth_token })
//     }

//     if (!user || !user.twitter?.requestTokenSecret) {
//       const redirect = `${process.env.FRONTEND_URL}/profile?twitter=failed&reason=${encodeURIComponent('invalid_session')}`
//       return res.redirect(302, redirect)
//     }

//     // Ensure the saved request token hasn't expired
//     if (user.twitter.requestTokenExpiresAt && new Date(user.twitter.requestTokenExpiresAt) < new Date()) {
//       const redirect = `${process.env.FRONTEND_URL}/profile?twitter=failed&reason=${encodeURIComponent('expired')}`
//       return res.redirect(302, redirect)
//     }

//     const accessUrl = "https://api.twitter.com/oauth/access_token"

//     const oauthParams = {
//       oauth_consumer_key: process.env.TWITTER_CONSUMER_KEY,
//       oauth_nonce: oauthNonce(),
//       oauth_signature_method: "HMAC-SHA1",
//       oauth_timestamp: oauthTimestamp(),
//       oauth_token,
//       oauth_verifier,
//       oauth_version: "1.0"
//     }

//     oauthParams.oauth_signature = generateSignature(
//       "POST",
//       accessUrl,
//       oauthParams,
//       process.env.TWITTER_CONSUMER_SECRET,
//       user.twitter.requestTokenSecret
//     )

//     const headers = {
//       Authorization: buildAuthHeader(oauthParams)
//     }

//     const response = await axios.post(accessUrl, null, { headers })
//     const data = qs.parse(response.data)

//     if (!data.oauth_token || !data.oauth_token_secret) {
//       throw new Error("Invalid access token response")
//     }

//     // Replace temporary request token fields with permanent access tokens
//     await User.findByIdAndUpdate(user._id, {
//       twitter: {
//         id: data.user_id,
//         username: data.screen_name,
//         token: data.oauth_token,
//         tokenSecret: data.oauth_token_secret,
//         linkedAt: new Date()
//       }
//     })

//     // Clear temporary request token fields (if present)
//     try {
//       await User.updateOne({ _id: user._id }, { $unset: { 'twitter.requestToken': '', 'twitter.requestTokenSecret': '', 'twitter.requestTokenExpiresAt': '' } })
//     } catch (e) {
//       // non-fatal
//       console.warn('Could not clear temporary twitter request token fields', e && e.message)
//     }

//     return res.redirect(`${process.env.FRONTEND_URL}/profile?twitter=linked`)
//   } catch (err) {
//     console.error("Twitter callback error:", err.response?.data || err.message)
//     const reason = encodeURIComponent((err && err.message) || 'server_error')
//     const redirect = `${process.env.FRONTEND_URL}/profile?twitter=failed&reason=${reason}`
//     return res.redirect(302, redirect)
//   }
// }
