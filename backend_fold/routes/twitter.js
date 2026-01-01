// routes/twitter.js
const express = require('express');
const router = express.Router();
const passport = require('../config/passport');

// Start OAuth — NO protect middleware
router.get('/connect', passport.authenticate('twitter'));

// Callback
router.get('/callback',
  passport.authenticate('twitter', { 
    failureRedirect: '/login?error=twitter_failed' 
  }),
  (req, res) => {
    res.redirect('/profile?twitter=linked');
  }
);

// Optional: Unlink
router.delete('/unlink', (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  
  req.user.twitter = undefined;
  req.user.save();
  
  res.json({ success: true, message: 'Twitter unlinked' });
});

module.exports = router;