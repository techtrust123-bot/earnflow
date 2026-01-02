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
  try {
    const msg = { twitter: "${twitter}", reason: "${reason}" };
    if (window.opener) window.opener.postMessage(msg, window.location.origin);
  } catch(e) {}
  setTimeout(() => window.close(), 300);
</script><p>Closing...</p></body></html>`;
  res.set('Content-Type', 'text/html').send(html);
});

// OAuth1 Connect
router.get('/oauth1/connect', async (req, res) => {
  try {
    const callbackUrl = process.env.TWITTER_OAUTH1_CALLBACK_URL || `${req.protocol}://${req.get('host')}/api/twitter/oauth1/callback`;
    const oauth = createOauthClient();
    const request_data = { url: 'https://api.twitter.com/oauth/request_token', method: 'POST', data: { oauth_callback: callbackUrl } };

    const headers = oauth.toHeader(oauth.authorize(request_data));
    const r = await axios.post(request_data.url, null, { headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' } });
    const params = new URLSearchParams(r.data);

    const oauth_token = params.get('oauth_token');
    const oauth_token_secret = params.get('oauth_token_secret');

    if (!oauth_token || !oauth_token_secret) {
      console.error('[twitter][oauth1] missing request token response', r.data);
      return res.redirect('/popup-close?twitter=failed&reason=request_token_failed');
    }

    req.session.oauthRequestToken = oauth_token;
    req.session.oauthRequestTokenSecret = oauth_token_secret;

    // Save session then redirect to Twitter authorize
    req.session.save((err) => {
      if (err) {
        console.error('[twitter][oauth1] session save error', err);
        return res.redirect('/popup-close?twitter=failed&reason=session_save_failed');
      }
      const authUrl = `https://api.twitter.com/oauth/authenticate?oauth_token=${encodeURIComponent(oauth_token)}`;
      return res.redirect(authUrl);
    });
  } catch (err) {
    console.error('[twitter][oauth1] request_token error', err);
    return res.redirect('/popup-close?twitter=failed&reason=request_token_error');
  }
});

// OAuth1 Callback — ONLY ONE OF THESE
router.get('/oauth1/callback', async (req, res) => {
  try {
    console.debug('[twitter][oauth1] callback query:', req.query);

    const { oauth_token, oauth_verifier } = req.query || {};
    const storedToken = req.session?.oauthRequestToken;
    const storedSecret = req.session?.oauthRequestTokenSecret;

    if (!oauth_token || !oauth_verifier) return res.redirect('/popup-close?twitter=failed&reason=missing_params');
    if (!storedToken || !storedSecret || storedToken !== oauth_token) return res.redirect('/popup-close?twitter=failed&reason=missing_request_token');

    const oauth = createOauthClient();
    const token = { key: oauth_token, secret: storedSecret };
    const request_data = { url: 'https://api.twitter.com/oauth/access_token', method: 'POST', data: { oauth_verifier } };

    const headers = oauth.toHeader(oauth.authorize(request_data, token));
    const r = await axios.post(request_data.url, null, { headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' } });
    const params = new URLSearchParams(r.data);

    const accessToken = params.get('oauth_token');
    const accessSecret = params.get('oauth_token_secret');
    const user_id = params.get('user_id');
    const screen_name = params.get('screen_name');

    if (!accessToken || !accessSecret || !user_id) {
      return res.redirect('/twitter/popup-close?twitter=failed&reason=invalid_access_token');
    }

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

    req.login(user, (err) => {
      if (err) {
        console.error('[twitter][oauth1] req.login error', err);
        return res.redirect('/popup-close?twitter=failed&reason=login_failed');
      }

      req.session.save((saveErr) => {
        if (saveErr) {
          console.error('[twitter][oauth1] session save error', saveErr);
          return res.redirect('/popup-close?twitter=failed&reason=session_save_failed');
        }

        delete req.session.oauthRequestToken;
        delete req.session.oauthRequestTokenSecret;

        return res.redirect('/popup-close?twitter=linked_oauth1');
      });
    });
  } catch (err) {
    console.error('[twitter][oauth1] access_token error', err);
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