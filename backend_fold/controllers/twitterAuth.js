const axios = require("axios")
const crypto = require("crypto")
const qs = require("querystring")
const User = require("../models/user")

/* ---------------- OAuth 1.0a Helpers ---------------- */

function encodeRFC3986(str) {
  return encodeURIComponent(str)
    .replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase())
}

function oauthNonce() {
  return crypto.randomBytes(16).toString("hex")
}

function oauthTimestamp() {
  return Math.floor(Date.now() / 1000).toString()
}

function generateSignature(method, baseUrl, params, consumerSecret, tokenSecret = "") {
  const sortedParams = Object.keys(params)
    .sort()
    .map(k => `${encodeRFC3986(k)}=${encodeRFC3986(params[k])}`)
    .join("&")

  const baseString = [
    method.toUpperCase(),
    encodeRFC3986(baseUrl),
    encodeRFC3986(sortedParams)
  ].join("&")

  const signingKey =
    `${encodeRFC3986(consumerSecret)}&${encodeRFC3986(tokenSecret)}`

  return crypto
    .createHmac("sha1", signingKey)
    .update(baseString)
    .digest("base64")
}

function buildAuthHeader(params) {
  return (
    "OAuth " +
    Object.keys(params)
      .sort()
      .map(k => `${encodeRFC3986(k)}="${encodeRFC3986(params[k])}"`)
      .join(", ")
  )
}

/* ---------------- STEP 1: CONNECT TWITTER ---------------- */

exports.connectTwitter = async (req, res) => {
  // Validate required Twitter env vars early for clearer errors
  if (!process.env.TWITTER_CONSUMER_KEY || !process.env.TWITTER_CONSUMER_SECRET || !process.env.TWITTER_CALLBACK_URL) {
    console.error('Missing Twitter env vars:', {
      TWITTER_CONSUMER_KEY: !!process.env.TWITTER_CONSUMER_KEY,
      TWITTER_CONSUMER_SECRET: !!process.env.TWITTER_CONSUMER_SECRET,
      TWITTER_CALLBACK_URL: !!process.env.TWITTER_CALLBACK_URL
    })
    return res.status(500).json({ message: 'Twitter OAuth is not configured on the server (missing env vars)' })
  }
  try {
    const callbackUrl =
      `${process.env.TWITTER_CALLBACK_URL}?state=${req.user.id}`

    const requestUrl = "https://api.twitter.com/oauth/request_token"

    const oauthParams = {
      oauth_callback: callbackUrl,
      oauth_consumer_key: process.env.TWITTER_CONSUMER_KEY,
      oauth_nonce: oauthNonce(),
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp: oauthTimestamp(),
      oauth_version: "1.0"
    }

    oauthParams.oauth_signature = generateSignature(
      "POST",
      requestUrl,
      oauthParams,
      process.env.TWITTER_CONSUMER_SECRET
    )

    const headers = {
      Authorization: buildAuthHeader(oauthParams)
    }

    const response = await axios.post(requestUrl, null, { headers })
    const data = qs.parse(response.data)

    if (!data.oauth_token || !data.oauth_token_secret) {
      throw new Error("Invalid request token response")
    }

    // Save token secret temporarily
    await User.findByIdAndUpdate(req.user.id, {
      "twitter.requestTokenSecret": data.oauth_token_secret
    })

    const redirectUrl = `https://api.twitter.com/oauth/authenticate?oauth_token=${data.oauth_token}`

    // If this request is an XHR (frontend calling via axios), return JSON with the redirect URL
    const acceptsJson = req.headers.accept && req.headers.accept.includes('application/json')
    if (req.xhr || acceptsJson) {
      return res.json({ redirectUrl })
    }

    // Fallback: regular redirect
    return res.redirect(redirectUrl)
  } catch (err) {
    console.error("Twitter connect error:", err.response?.data || err.message)
    return res.status(500).json({ message: "Twitter connection failed" })
  }
}

/* ---------------- STEP 2: CALLBACK ---------------- */

exports.twitterCallback = async (req, res) => {
  try {
    const { oauth_token, oauth_verifier, state } = req.query

    if (!oauth_token || !oauth_verifier || !state) {
      return res.status(400).send("Missing OAuth parameters")
    }

    const user = await User.findById(state)
    if (!user || !user.twitter?.requestTokenSecret) {
      return res.status(400).send("Invalid OAuth session")
    }

    const accessUrl = "https://api.twitter.com/oauth/access_token"

    const oauthParams = {
      oauth_consumer_key: process.env.TWITTER_CONSUMER_KEY,
      oauth_nonce: oauthNonce(),
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp: oauthTimestamp(),
      oauth_token,
      oauth_verifier,
      oauth_version: "1.0"
    }

    oauthParams.oauth_signature = generateSignature(
      "POST",
      accessUrl,
      oauthParams,
      process.env.TWITTER_CONSUMER_SECRET,
      user.twitter.requestTokenSecret
    )

    const headers = {
      Authorization: buildAuthHeader(oauthParams)
    }

    const response = await axios.post(accessUrl, null, { headers })
    const data = qs.parse(response.data)

    if (!data.oauth_token || !data.oauth_token_secret) {
      throw new Error("Invalid access token response")
    }

    await User.findByIdAndUpdate(state, {
      twitter: {
        id: data.user_id,
        username: data.screen_name,
        token: data.oauth_token,
        tokenSecret: data.oauth_token_secret,
        linkedAt: new Date()
      }
    })

    return res.redirect(`${process.env.FRONTEND_URL}/profile?twitter=linked`)
  } catch (err) {
    console.error("Twitter callback error:", err.response?.data || err.message)
    return res.status(500).send("Twitter authentication failed")
  }
}
