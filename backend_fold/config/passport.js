// const passport = require('passport');
// const TwitterOAuth2Strategy = require('passport-twitter-oauth2');
// const TwitterOAuth1Strategy = require('passport-twitter').Strategy;
// const User = require('../models/user');

// // Options for Twitter OAuth2 (read from env into local vars first)
// const oauth2ClientID = process.env.TWITTER_CLIENT_ID;
// const oauth2ClientSecret = process.env.TWITTER_CLIENT_SECRET;
// const oauth2CallbackURL = process.env.TWITTER_CALLBACK_URL;

// const twitterOptions = {
//   clientID: oauth2ClientID,
//   clientSecret: oauth2ClientSecret,
//   callbackURL: oauth2CallbackURL,
//   // Explicit OAuth2 endpoints (ensure OAuth2 flow)
//   authorizationURL: 'https://twitter.com/i/oauth2/authorize',
//   tokenURL: 'https://api.twitter.com/2/oauth2/token',
//   includeEmail: true,
//   scope: [
//     'tweet.read',
//     'users.read',
//     'follows.read',
//     'follows.write',
//     'like.read',
//     'like.write',
//     'offline.access'
//   ],
//   pkce: true,
//   state: true
// };

// const twitterVerify = async (accessToken, refreshToken, profile, done) => {
//   try {
//     if (!profile?.id) return done(new Error('No Twitter ID received'), null);

//     let user = await User.findOne({ 'twitter.id': profile.id });
//     if (!user) {
//       user = new User({
//         name: profile.displayName || profile.username,
//         email: profile.emails?.[0]?.value || null,
//         twitter: {
//           id: profile.id,
//           username: profile.username,
//           displayName: profile.displayName,
//           accessToken,
//           refreshToken,
//           linkedAt: new Date()
//         }
//       });
//     } else {
//       user.twitter = {
//         ...user.twitter,
//         accessToken,
//         refreshToken,
//         username: profile.username,
//         displayName: profile.displayName
//       };
//     }

//     await user.save();
//     console.log('twitterVerify: saved user id=', user.id);
//     return done(null, user);
//   } catch (err) {
//     console.error('Twitter auth error:', err);
//     return done(err, null);
//   }
// };

// // Register OAuth2 strategy only when credentials are present
// if (oauth2ClientID && oauth2ClientSecret) {
//   const twitterStrategy = new TwitterOAuth2Strategy(twitterOptions, twitterVerify);
//   // Give it a distinct name to avoid conflicts with any OAuth1 strategies
//   twitterStrategy.name = 'twitter-oauth2';
//   passport.use(twitterStrategy);
// } else {
//   console.warn('Skipping Twitter OAuth2 strategy: TWITTER_CLIENT_ID or TWITTER_CLIENT_SECRET not set');
// }

// // --- OAuth 1.0a (3-legged) strategy for endpoints requiring OAuth1 tokens ---
// const twitter1Verify = async (token, tokenSecret, profile, done) => {
//   try {
//     if (!profile?.id) return done(new Error('No Twitter ID received (OAuth1)'), null);

//     let user = await User.findOne({ 'twitter.id': profile.id });
//     if (!user) {
//       user = new User({
//         name: profile.displayName || profile.username,
//         email: profile.emails?.[0]?.value || null,
//         twitter: {
//           id: profile.id,
//           username: profile.username,
//           displayName: profile.displayName,
//           token,
//           tokenSecret,
//           linkedAt: new Date()
//         }
//       });
//     } else {
//       user.twitter = {
//         ...user.twitter,
//         token,
//         tokenSecret,
//         username: profile.username,
//         displayName: profile.displayName
//       };
//     }

//     await user.save();
//     console.log('twitter1Verify: saved user id=', user.id);
//     return done(null, user);
//   } catch (err) {
//     console.error('Twitter OAuth1 auth error:', err);
//     return done(err, null);
//   }
// };

// const oauth1ConsumerKey = process.env.TWITTER_CONSUMER_KEY || process.env.TWITTER_CLIENT_ID;
// const oauth1ConsumerSecret = process.env.TWITTER_CONSUMER_SECRET || process.env.TWITTER_CLIENT_SECRET;
// const oauth1CallbackURL = process.env.TWITTER_OAUTH1_CALLBACK_URL || process.env.TWITTER_CALLBACK_URL;

// const twitter1Options = {
//   consumerKey: oauth1ConsumerKey,
//   consumerSecret: oauth1ConsumerSecret,
//   callbackURL: oauth1CallbackURL
// };

// if (oauth1ConsumerKey && oauth1ConsumerSecret) {
//   const twitter1Strategy = new TwitterOAuth1Strategy(twitter1Options, twitter1Verify);
//   twitter1Strategy.name = 'twitter-oauth1';
//   passport.use(twitter1Strategy);
// } else {
//   console.warn('Skipping Twitter OAuth1 strategy: TWITTER_CONSUMER_KEY or TWITTER_CONSUMER_SECRET not set');
// }

// // Serialize user ID to session
// passport.serializeUser((user, done) => {
//   done(null, user.id);
// });

// // Deserialize user from session
// passport.deserializeUser(async (id, done) => {
//   try {
//     const user = await User.findById(id).select('-password');
//     done(null, user);
//   } catch (err) {
//     done(err, null);
//   }
// });

// module.exports = passport;




const passport = require('passport');
const TwitterOAuth2Strategy = require('passport-twitter-oauth2');
const User = require('../models/user');

// Register OAuth2 (Twitter API v2) strategy only when credentials present
const oauth2ClientID = process.env.TWITTER_CLIENT_ID;
const oauth2ClientSecret = process.env.TWITTER_CLIENT_SECRET;
const oauth2CallbackURL = process.env.TWITTER_CALLBACK_URL;

if (oauth2ClientID && oauth2ClientSecret) {
  const twitterOptions = {
    clientID: oauth2ClientID,
    clientSecret: oauth2ClientSecret,
    callbackURL: oauth2CallbackURL,
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

  passport.use(new TwitterOAuth2Strategy(twitterOptions, async (accessToken, refreshToken, profile, done) => {
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
      console.log('twitter-oauth2 verify saved user id=', user.id);
      return done(null, user);
    } catch (err) {
      console.error('Twitter auth error:', err);
      return done(err, null);
    }
  }));
  console.log('Twitter OAuth2 strategy registered');
} else {
  console.warn('Skipping Twitter OAuth2 strategy: TWITTER_CLIENT_ID or TWITTER_CLIENT_SECRET not set');
}

// Passport session handling (serialize/deserialize)
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).select('-password');
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;