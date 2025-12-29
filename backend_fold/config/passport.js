// config/passport.js
const passport = require("passport");
const TwitterStrategy = require("passport-twitter-oauth2");
const User = require("../models/user");

passport.use(
  new TwitterStrategy(
    {
      clientID: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
      callbackURL: process.env.TWITTER_CALLBACK_URL,
      includeEmail: true,
      // CRITICAL: These scopes allow reading follows, likes, etc.
      scope: [
        'tweet.read',
        'users.read',
        'follows.read',
        'follows.write',
        'like.read',
        'like.write',
        'offline.access'  // For refresh token (optional but good)
      ],
      pkce: true,  // Recommended for security
      state: true
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        if (!profile?.id) {
          return done(new Error("No Twitter ID received"), null);
        }

        // Find or create user
        let user = await User.findOne({ "twitter.id": profile.id });

        if (!user) {
          user = new User({
            name: profile.displayName || profile.username,
            email: profile.emails?.[0]?.value || null,
            twitter: {
              id: profile.id,
              username: profile.username,
              displayName: profile.displayName,
              accessToken,
              refreshToken,  // Save for long-term use
              linkedAt: new Date()
            }
          });
        } else {
          // Update tokens on re-login
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
        console.error("Twitter auth error:", err);
        return done(err, null);
      }
    }
  )
);

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