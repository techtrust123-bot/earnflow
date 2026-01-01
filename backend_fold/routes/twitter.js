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
    // If the OAuth flow was started in a popup, redirect to a small page
    // that will notify the opener and close itself. Otherwise redirect
    // to the profile page for normal navigation.
    const client = process.env.CLIENT_URL || ''
    // prefer the popup-close endpoint on this server (same-origin)
    return res.redirect(`/twitter/popup-close?twitter=linked`)
  }
);

// Serve a tiny HTML page that notifies the opener window and closes the popup.
router.get('/popup-close', (req, res) => {
  const twitter = req.query.twitter || 'linked'
  const reason = req.query.reason || ''
  const html = `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Twitter OAuth</title></head>
<body>
<script>
  (function(){
    try {
      const msg = { twitter: ${JSON.stringify(twitter)}, reason: ${JSON.stringify(reason)} };
      if (window.opener && !window.opener.closed) {
        try { window.opener.postMessage(msg, window.location.origin); } catch(e) {}
      }
    } catch(e) {}
    // give opener a moment to receive the message
    setTimeout(() => { try { window.close(); } catch(e) {} }, 300);
  })();
</script>
<p>Closing...</p>
</body>
</html>`
  res.set('Content-Type', 'text/html')
  res.send(html)
})

// Optional: Unlink
router.delete('/unlink', (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  
  req.user.twitter = undefined;
  req.user.save();
  
  res.json({ success: true, message: 'Twitter unlinked' });
});

module.exports = router;