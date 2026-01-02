// routes/twitter.js
const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const axios = require('axios');
const OAuth = require('oauth-1.0a');
const crypto = require('crypto');
const User = require('../models/user');

function createOauthClient() {
  return OAuth({
    consumer: { key: process.env.TWITTER_CONSUMER_KEY, secret: process.env.TWITTER_CONSUMER_SECRET },
    signature_method: 'HMAC-SHA1',
    hash_function(base_string, key) {
      return crypto.createHmac('sha1', key).update(base_string).digest('base64');
    }
  });
}

// Simple debug endpoints
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
});

router.get('/session', (req, res) => {
  try {
    if (!req.session) return res.json({ ok: true, session: null })
    const clone = JSON.parse(JSON.stringify(req.session))
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

// Popup close page
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
    setTimeout(() => { try { window.close(); } catch(e) {} }, 300);
  })();
</script>
<p>Closing...</p>
</body>
</html>`
  res.set('Content-Type', 'text/html')
  res.send(html)
})

// --- OAuth1 (3-legged) manual implementation ---
router.get('/oauth1/connect', async (req, res) => {
  try { console.debug('[twitter][oauth1] sessionID:', req.sessionID); } catch(e) {}

  if (!process.env.TWITTER_CONSUMER_KEY || !process.env.TWITTER_CONSUMER_SECRET) {
    return res.redirect('/twitter/popup-close?twitter=failed&reason=missing_consumer_keys');
  }

  const oauth = createOauthClient();
  const callbackUrl = process.env.TWITTER_OAUTH1_CALLBACK_URL || (process.env.CLIENT_URL ? `${process.env.CLIENT_URL.replace(/\/$/, '')}/api/twitter/oauth1/callback` : null);
  if (!callbackUrl) return res.redirect('/twitter/popup-close?twitter=failed&reason=missing_callback');

  const request_data = {
    url: 'https://api.twitter.com/oauth/request_token',
    method: 'POST',
    data: { oauth_callback: callbackUrl }
  };

  try {
    const headers = oauth.toHeader(oauth.authorize(request_data));
    const r = await axios.post(request_data.url, null, { headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' } });
    const params = new URLSearchParams(r.data);
    const oauth_token = params.get('oauth_token');
    const oauth_token_secret = params.get('oauth_token_secret');
    const oauth_callback_confirmed = params.get('oauth_callback_confirmed');

    if (!oauth_token || !oauth_token_secret || oauth_callback_confirmed !== 'true') {
      console.error('[twitter][oauth1] invalid request_token response', r.data);
      return res.redirect('/twitter/popup-close?twitter=failed&reason=invalid_request_token');
    }

    // persist secret in session so we can exchange for access token on callback
    req.session.oauthRequestToken = oauth_token;
    req.session.oauthRequestTokenSecret = oauth_token_secret;
    try { req.session.save(() => {}); } catch(e) {}

    const redirectUrl = `https://api.twitter.com/oauth/authorize?oauth_token=${encodeURIComponent(oauth_token)}`;
    try { console.debug('[twitter][oauth1] redirect to:', redirectUrl); } catch(e) {}
    return res.redirect(redirectUrl);
  } catch (err) {
    console.error('[twitter][oauth1] request_token error', err?.response?.data || err.message || err);
    return res.redirect('/twitter/popup-close?twitter=failed&reason=request_token_failed');
  }
});

router.get('/oauth1/callback', async (req, res) => {
  try { console.debug('[twitter][oauth1] callback query:', req.query); } catch (e) {}

  const { oauth_token, oauth_verifier } = req.query || {};
  const storedToken = req.session && req.session.oauthRequestToken;
  const storedSecret = req.session && req.session.oauthRequestTokenSecret;

  if (!oauth_token || !oauth_verifier) return res.redirect('/twitter/popup-close?twitter=failed&reason=missing_params');
  if (!storedToken || !storedSecret || storedToken !== oauth_token) return res.redirect('/twitter/popup-close?twitter=failed&reason=missing_request_token');

  const oauth = createOauthClient();
  const token = { key: oauth_token, secret: storedSecret };
  const request_data = { url: 'https://api.twitter.com/oauth/access_token', method: 'POST', data: { oauth_verifier } };

  try {
    const headers = oauth.toHeader(oauth.authorize(request_data, token));
    const r = await axios.post(request_data.url, null, { headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' } });
    const params = new URLSearchParams(r.data);
    const accessToken = params.get('oauth_token');
    const accessSecret = params.get('oauth_token_secret');
    const user_id = params.get('user_id');
    const screen_name = params.get('screen_name');

    if (!accessToken || !accessSecret || !user_id) {
      console.error('[twitter][oauth1] invalid access_token response', r.data);
      return res.redirect('/twitter/popup-close?twitter=failed&reason=invalid_access_token');
    }

    // find or create user
    let user = await User.findOne({ 'twitter.id': String(user_id) });
    if (!user) {
      user = new User({
        name: screen_name || `twitter_${user_id}`,
        email: null,
        password: Date.now().toString(36),
        twitter: {
          id: String(user_id),
          username: screen_name,
          token: accessToken,
          tokenSecret: accessSecret,
          linkedAt: new Date()
        }
      });
    } else {
      user.twitter = {
        ...user.twitter,
        token: accessToken,
        tokenSecret: accessSecret,
        username: screen_name
      };
    }

    await user.save();

    // log the user in (populate passport session)
    // req.login(user, (err) => {
    //   if (err) {
    //     console.error('[twitter][oauth1] req.login error', err);
    //     return res.redirect('/twitter/popup-close?twitter=failed&reason=login_failed');
    //   }

    //   // clear temporary request token data
    //   try { delete req.session.oauthRequestToken; delete req.session.oauthRequestTokenSecret; req.session.save(() => {}); } catch(e) {}

    //   return res.redirect(`/twitter/popup-close?twitter=linked_oauth1`);
    // });
   req.login(user, (err) => {
  if (err) {
    console.error('[twitter][oauth1] req.login error', err);
    return res.redirect('/twitter/popup-close?twitter=failed&reason=login_failed');
  }

  // CRITICAL FIX: Save session before redirect
  req.session.save((saveErr) => {
    if (saveErr) {
      console.error('[twitter][oauth1] session save error', saveErr);
      return res.redirect('/twitter/popup-close?twitter=failed&reason=session_save_failed');
    }

    console.log('Twitter linked successfully for user:', user._id);

    // clear temporary request token data
    delete req.session.oauthRequestToken;
    delete req.session.oauthRequestTokenSecret;

    return res.redirect(`/twitter/popup-close?twitter=linked_oauth1`);
  });
});
  } catch (err) {
    console.error('[twitter][oauth1] access_token error', err?.response?.data || err.message || err);
    return res.redirect('/twitter/popup-close?twitter=failed&reason=access_token_failed');
  }
});

// Unlink
router.delete('/unlink', (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  req.user.twitter = undefined;
  req.user.save();
  res.json({ success: true, message: 'Twitter unlinked' });
});

module.exports = router;