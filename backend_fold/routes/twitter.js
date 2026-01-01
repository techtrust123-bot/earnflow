// routes/twitter.js
const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const axios = require('axios');

// Start OAuth — NO protect middleware
// Log session id for debugging and explicitly use the OAuth2 strategy name
router.get('/connect', (req, res, next) => {
  try { console.debug('[twitter] sessionID:', req.sessionID); } catch(e) {}
  try {
    const strategies = Object.keys(passport._strategies || {});
    console.debug('[twitter] passport strategies:', strategies);
    console.debug('[twitter] using strategy exists?', !!(passport._strategies && passport._strategies['twitter-oauth2']));
    console.debug('[twitter] cookie header present?', !!req.headers.cookie);
    console.debug('[twitter] session.passport keys:', req.session && req.session.passport ? Object.keys(req.session.passport) : null);
  } catch (e) {
    console.error('[twitter] debug log failed', e)
  }

  const doAuth = () => {
    // Wrap res.redirect so we can log the exact redirect URL passport issues
    const origRedirect = res.redirect && res.redirect.bind(res);
    if (origRedirect) {
      res.redirect = function(url) {
        try { console.debug('[twitter] redirect to:', url); } catch (e) {}
        return origRedirect(url);
      }
    }
    passport.authenticate('twitter-oauth2')(req, res, next);
  }

  try {
    if (req.session && typeof req.session.save === 'function') {
      req.session.save((err) => {
        if (err) console.error('[twitter] session save error:', err);
        doAuth();
      });
      return;
    }
  } catch (e) {}
  doAuth();
});

// Debug endpoint: returns non-sensitive info about session and strategies
router.get('/debug', (req, res) => {
  try {
    const strategies = Object.keys(passport._strategies || {});
    const sessionInfo = {
      sessionID: req.sessionID || null,
      hasPassport: !!(req.session && req.session.passport),
      passportKeys: req.session && req.session.passport ? Object.keys(req.session.passport) : []
    }
    return res.json({ ok: true, strategies, session: sessionInfo });
  } catch (err) {
    console.error('[twitter] /debug error', err)
    return res.status(500).json({ ok: false })
  }
})

// Return redacted session contents for debugging (does not log secrets)
router.get('/session', (req, res) => {
  try {
    if (!req.session) return res.json({ ok: true, session: null })

    const clone = JSON.parse(JSON.stringify(req.session))
    // Redact anything that looks like a token
    const redact = (obj) => {
      if (!obj || typeof obj !== 'object') return obj
      for (const k of Object.keys(obj)) {
        try {
          if (/token|secret|pass|refresh|oauth/i.test(k) && obj[k]) obj[k] = '[REDACTED]'
          else if (typeof obj[k] === 'object') redact(obj[k])
        } catch (e) {}
      }
    }
    redact(clone)
    return res.json({ ok: true, session: clone })
  } catch (err) {
    console.error('[twitter] /session error', err)
    return res.status(500).json({ ok: false })
  }
})

// Callback
router.get('/callback',
  passport.authenticate('twitter-oauth2', { 
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

// --- OAuth1 (3-legged) connect and callback ---
router.get('/oauth1/connect', (req, res, next) => {
  try { console.debug('[twitter][oauth1] sessionID:', req.sessionID); } catch(e) {}
  const doAuth = () => {
    // wrap redirect so we can log the Twitter redirect URL (helps debug callback mismatches)
    const origRedirect = res.redirect && res.redirect.bind(res);
    if (origRedirect) {
      res.redirect = function(url) {
        try { console.debug('[twitter][oauth1] redirect to:', url); } catch (e) {}
        return origRedirect(url);
      }
    }
    passport.authenticate('twitter-oauth1')(req, res, next);
  };
  try {
    if (req.session && typeof req.session.save === 'function') {
      req.session.save((err) => { if (err) console.error('[twitter][oauth1] session save error:', err); doAuth(); });
      return;
    }
  } catch (e) {}
  doAuth();
});

router.get('/oauth1/callback',
  (req, res, next) => {
    try { console.debug('[twitter][oauth1] callback query:', req.query); } catch (e) {}
    try { console.debug('[twitter][oauth1] callback headers.cookie:', !!req.headers.cookie); } catch (e) {}
    try {
      const sessKeys = req.session ? Object.keys(req.session) : null;
      console.debug('[twitter][oauth1] session present:', !!req.session, 'sessionKeys:', sessKeys);
    } catch (e) {}

    // Early failure when no cookie or session present (common cause of "no request token")
    if (!req.headers.cookie) return res.redirect('/twitter/popup-close?twitter=failed&reason=missing_cookie');
    if (!req.session || !req.sessionID) return res.redirect('/twitter/popup-close?twitter=failed&reason=missing_session');

    next();
  },
  passport.authenticate('twitter-oauth1', { failureRedirect: '/twitter/popup-close?twitter=failed&reason=server_error' }),
  (req, res) => {
    try { console.debug('[twitter][oauth1] authenticated, user id:', req.user && req.user.id); } catch (e) {}
    return res.redirect(`/twitter/popup-close?twitter=linked_oauth1`);
  }
);

// App-only bearer token (client credentials) — returns token data
router.get('/bearer-token', async (req, res) => {
  try {
    const key = process.env.TWITTER_CLIENT_ID;
    const secret = process.env.TWITTER_CLIENT_SECRET;
    if (!key || !secret) return res.status(400).json({ ok: false, message: 'Missing consumer key/secret' });

    const creds = Buffer.from(`${key}:${secret}`).toString('base64');
    const response = await axios.post('https://api.twitter.com/oauth2/token', 'grant_type=client_credentials', {
      headers: {
        Authorization: `Basic ${creds}`,
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      }
    });

    return res.json({ ok: true, data: response.data });
  } catch (err) {
    console.error('[twitter] bearer-token error', err?.response?.data || err.message || err);
    return res.status(500).json({ ok: false, error: err?.response?.data || err.message });
  }
});

// Optional: Unlink
router.delete('/unlink', (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  
  req.user.twitter = undefined;
  req.user.save();
  
  res.json({ success: true, message: 'Twitter unlinked' });
});

module.exports = router;