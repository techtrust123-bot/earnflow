const passport = require("passport");
const TwitterStrategy = require("passport-twitter-oauth2");
const User = require("../models/user");

passport.use(
  new TwitterStrategy(
    {
      clientID: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
      callbackURL: process.env.TWITTER_CALLBACK_URL,
      scope: ['tweet.read', 'users.read', 'follows.read', 'follows.write']
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        if (!profile || !profile.id) {
          return done(new Error("Invalid Twitter profile"), null);
        }
        let user = await User.findOne({ twitterId: profile.id });

        if (!user) {
          user = await User.create({
            twitterId: profile.id,
            username: profile.username,
          });
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});

module.exports = passport;
