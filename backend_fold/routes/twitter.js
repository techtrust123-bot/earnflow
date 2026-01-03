// routes/twitter.js
const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const axios = require('axios');
const twitterAuth = require('../controllers/twitterAuth');
const jwt = require('jsonwebtoken');
const { authMiddlewere } = require('../middleweres/authmiddlewere')
const User = require('../models/user')


// Debug endpoints
router.get('/debug', (req, res) => {
  try {
    const info = {
      ok: true,
      strategies: req._passport ? Object.keys(req._passport) : ['session'],
      session: {
        id: req.sessionID,
        hasPassport: !!req.session?.passport,
        passportKeys: req.session?.passport ? Object.keys(req.session.passport) : []
      }
    };
    res.json(info);
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

router.get('/session', (req, res) => {
  try {
    res.json({ ok: true, session: req.session });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// Popup close page
router.get('/popup-close', (req, res) => {
  const twitter = req.query.twitter || 'linked';
  const reason = req.query.reason || '';
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Twitter OAuth</title></head><body>
<script>
  (async function(){
    try {
      // Try to fetch the authenticated user from the API (popup is on backend origin)
      let user = null;
      try {
        const r = await fetch('/api/auth/me', { credentials: 'include' });
        if (r.ok) {
          const j = await r.json();
          user = j.user || null;
        }
      } catch(e) {}

      const msg = { twitter: "${twitter}", reason: "${reason}", user };
      if (window.opener) window.opener.postMessage(msg, '*');
    } catch(e) {}
    setTimeout(() => window.close(), 300);
  })();
</script><p>Closing...</p></body></html>`;
  res.set('Content-Type', 'text/html').send(html);
});

// OAuth1 Connect
router.get('/oauth1/connect', twitterAuth.connect);
// OAuth2 Connect (Twitter API v2)
if (process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET) {
  const hasStrategy = (name) => {
    try {
      if (typeof passport._strategy === 'function') {
        return !!passport._strategy(name)
      }
      if (passport._strategies && passport._strategies[name]) return true
      return false
    } catch (e) {
      return false
    }
  }

  router.get('/oauth2/connect', (req, res, next) => {
    try {
      if (hasStrategy('twitter-oauth2')) {
        return passport.authenticate('twitter-oauth2', { scope: [
          'tweet.read', 'users.read', 'follows.read', 'follows.write', 'like.read', 'like.write', 'offline.access'
        ], session: false })(req, res, next)
      }
      // Fallback to manual PKCE implementation in controller
      console.warn('[twitter][oauth2] strategy missing, using manual PKCE connect')
      return twitterAuth.oauth2Connect(req, res, next)
    } catch (err) {
      console.error('[twitter][oauth2] connect error', err)
      return res.status(500).json({ error: 'Server error initiating OAuth2' })
    }
  });


  router.get('/oauth2/callback', (req, res, next) => {
    try {
      if (hasStrategy('twitter-oauth2')) {
        return passport.authenticate('twitter-oauth2', { failureRedirect: '/api/twitter/popup-close?twitter=failed', session: false })(req, res, async () => {
          try {
            const user = req.user;
            if (user && process.env.SECRET) {
              try {
                const token = jwt.sign({ id: user._id, role: user.role }, process.env.SECRET, { expiresIn: '7d' });
                res.cookie('token', token, {
                  httpOnly: true,
                  secure: process.env.NODE_ENV === 'production',
                  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                  maxAge: 24 * 60 * 60 * 1000
                });
              } catch (e) {
                console.warn('[twitter][oauth2] could not sign cookie', e && e.message);
              }
            }
            return res.redirect('/api/twitter/popup-close?twitter=linked_oauth2');
          } catch (err) {
            console.error('[twitter][oauth2] callback error', err);
            return res.redirect('/api/twitter/popup-close?twitter=failed&reason=server_error');
          }
        })
      }
      // Fallback to manual PKCE callback handler
      console.warn('[twitter][oauth2] strategy missing, using manual PKCE callback')
      return twitterAuth.oauth2Callback(req, res, next)
    } catch (err) {
      console.error('[twitter][oauth2] callback wrapper error', err)
      return res.redirect('/api/twitter/popup-close?twitter=failed&reason=server_error')
    }
  });
} else {
  // Graceful 501 when OAuth2 not configured
  router.get('/oauth2/connect', (req, res) => res.status(501).json({ error: 'OAuth2 not configured on server' }));
  router.get('/oauth2/callback', (req, res) => res.status(501).json({ error: 'OAuth2 not configured on server' }));
}

// OAuth1 Callback — ONLY ONE OF THESE
router.get('/oauth1/callback', twitterAuth.callback);

// Unlink Twitter from authenticated user
router.delete('/unlink', authMiddlewere, async (req, res) => {
  try {
    const uid = req.user && (req.user.id || req.user._id || req.user)
    if (!uid) return res.status(401).json({ message: 'Unauthorized' })
    const user = await User.findById(uid)
    if (!user) return res.status(404).json({ message: 'User not found' })
    user.twitter = undefined
    await user.save()
    return res.json({ success: true, message: 'Twitter unlinked' })
  } catch (err) {
    console.error('[twitter] unlink error', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
})

module.exports = router;