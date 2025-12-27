// config/passport.js
const passport = require('passport')
const TwitterStrategy = require('passport-twitter').Strategy
const User = require('../models/user')
require("dotenv").config()

passport.use(new TwitterStrategy({
  consumerKey: process.env.TWITTER_CONSUMER_KEY,
  consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
  callbackURL: "http://localhost:5000/api/twitter/callback"
},
async (token, tokenSecret, profile, done) => {
  try {
    let user = await User.findOne({ 'twitter.id': profile.id })

    if (!user) {
      // Find by email or create new
      user = await User.findOne({ email: profile.emails?.[0]?.value })
      if (!user) {
        user = new User({
          name: profile.displayName,
          email: profile.emails?.[0]?.value || null,
          twitter: {
            id: profile.id,
            username: profile.username,
            token,
            tokenSecret
          }
        })
      } else {
        // Link to existing account
        user.twitter = {
          id: profile.id,
          username: profile.username,
          token,
          tokenSecret
        }
      }
    } else {
      // Update tokens
      user.twitter.token = token
      user.twitter.tokenSecret = tokenSecret
    }

    await user.save()
    return done(null, user)
  } catch (err) {
    return done(err)
  }
}))

// Serialize user
passport.serializeUser((user, done) => done(null, user.id))
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id)
    done(null, user)
  } catch (err) {
    done(err)
  }
})

module.exports = passport