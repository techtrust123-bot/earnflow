const passport = require('passport');
const TwitterStrategy = require('passport-twitter-oauth2');
const User = require('../models/user');

// Options for Twitter OAuth2
const twitterOptions = {
  clientID: process.env.TWITTER_CLIENT_ID,
  clientSecret: process.env.TWITTER_CLIENT_SECRET,
  callbackURL: process.env.TWITTER_CALLBACK_URL,
  // Explicit OAuth2 endpoints (ensure OAuth2 flow)
  authorizationURL: 'https://twitter.com/i/oauth2/authorize',
  tokenURL: 'https://api.twitter.com/2/oauth2/token',
  includeEmail: true,
  scope: [
    'tweet.read',
    'users.read',
    'follows.read',
    'follows.write',
    'like.read',
    'like.write',
    'offline.access'
  ],
  pkce: true,
  state: true
};

const twitterVerify = async (accessToken, refreshToken, profile, done) => {
  try {
    if (!profile?.id) return done(new Error('No Twitter ID received'), null);

    let user = await User.findOne({ 'twitter.id': profile.id });
    if (!user) {
      user = new User({
        name: profile.displayName || profile.username,
        email: profile.emails?.[0]?.value || null,
        twitter: {
          id: profile.id,
          username: profile.username,
          displayName: profile.displayName,
          accessToken,
          refreshToken,
          linkedAt: new Date()
        }
      });
    } else {
      user.twitter = {
        ...user.twitter,
        accessToken,
        refreshToken,
        username: profile.username,
        displayName: profile.displayName
      };
    }

    await user.save();
    return done(null, user);
  } catch (err) {
    console.error('Twitter auth error:', err);
    return done(err, null);
  }
};

const twitterStrategy = new TwitterStrategy(twitterOptions, twitterVerify);
// Give it a distinct name to avoid conflicts with any OAuth1 strategies
twitterStrategy.name = 'twitter-oauth2';
passport.use(twitterStrategy);

// Serialize user ID to session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).select('-password');
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;