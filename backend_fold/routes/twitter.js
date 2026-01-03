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
router.get('/oauth2/connect', passport.authenticate('twitter-oauth2', { scope: [
  'tweet.read', 'users.read', 'follows.read', 'follows.write', 'like.read', 'like.write', 'offline.access'
], session: false }));

router.get('/oauth2/callback', passport.authenticate('twitter-oauth2', { failureRedirect: '/api/twitter/popup-close?twitter=failed', session: false }), (req, res) => {
  try {
    // `req.user` is set by passport verify; issue JWT cookie for frontend
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
});

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