const passport = require('passport');
const TwitterOAuth2Strategy = require('passport-twitter-oauth2');
const TwitterOAuth1Strategy = require('passport-twitter').Strategy;
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

const twitterStrategy = new TwitterOAuth2Strategy(twitterOptions, twitterVerify);
// Give it a distinct name to avoid conflicts with any OAuth1 strategies
twitterStrategy.name = 'twitter-oauth2';
passport.use(twitterStrategy);

// --- OAuth 1.0a (3-legged) strategy for endpoints requiring OAuth1 tokens ---
const twitter1Verify = async (token, tokenSecret, profile, done) => {
  try {
    if (!profile?.id) return done(new Error('No Twitter ID received (OAuth1)'), null);

    let user = await User.findOne({ 'twitter.id': profile.id });
    if (!user) {
      user = new User({
        name: profile.displayName || profile.username,
        email: profile.emails?.[0]?.value || null,
        twitter: {
          id: profile.id,
          username: profile.username,
          displayName: profile.displayName,
          token,
          tokenSecret,
          linkedAt: new Date()
        }
      });
    } else {
      user.twitter = {
        ...user.twitter,
        token,
        tokenSecret,
        username: profile.username,
        displayName: profile.displayName
      };
    }

    await user.save();
    return done(null, user);
  } catch (err) {
    console.error('Twitter OAuth1 auth error:', err);
    return done(err, null);
  }
};

const twitter1Options = {
  consumerKey: process.env.TWITTER_CONSUMER_KEY || process.env.TWITTER_CLIENT_ID,
  consumerSecret: process.env.TWITTER_CONSUMER_SECRET || process.env.TWITTER_CLIENT_SECRET,
  callbackURL: process.env.TWITTER_OAUTH1_CALLBACK_URL || process.env.TWITTER_CALLBACK_URL
};

const twitter1Strategy = new TwitterOAuth1Strategy(twitter1Options, twitter1Verify);
twitter1Strategy.name = 'twitter-oauth1';
passport.use(twitter1Strategy);

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