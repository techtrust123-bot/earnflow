// controllers/twitterAuth.js


const axios = require("axios")
const User = require("../models/user")

exports.twitterCallback = async (req, res) => {
  const { code, state } = req.query

  const tokenRes = await axios.post(
    "https://api.twitter.com/2/oauth2/token",
    new URLSearchParams({
      code,
      grant_type: "authorization_code",
      client_id: process.env.TWITTER_CLIENT_ID,
      redirect_uri: process.env.TWITTER_CALLBACK_URL,
      code_verifier: "challenge"
    }),
    {
      auth: {
        username: process.env.TWITTER_CLIENT_ID,
        password: process.env.TWITTER_CLIENT_SECRET
      }
    }
  )

  const accessToken = tokenRes.data.access_token

  const userRes = await axios.get(
    "https://api.twitter.com/2/users/me",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  await User.findByIdAndUpdate(state, {
    twitter: {
      id: userRes.data.data.id,
      username: userRes.data.data.username,
      accessToken,
      linkedAt: new Date()
    }
  })

  res.redirect("/dashboard")
}




exports.connectTwitter = (req, res) => {
  const url =
    `https://twitter.com/i/oauth2/authorize` +
    `?response_type=code` +
    `&client_id=${process.env.TWITTER_CLIENT_ID}` +
    `&redirect_uri=${process.env.TWITTER_CALLBACK_URL}` +
    `&scope=tweet.read users.read follows.read offline.access` +
    `&state=${req.user.id}` +
    `&code_challenge=challenge` +
    `&code_challenge_method=plain`

  res.redirect(url)
}