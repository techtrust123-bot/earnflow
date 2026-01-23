# OAuth2 Implementation Checklist

## Step 1: Get Platform Credentials ✓

### TikTok
- [ ] Visit https://developer.tiktok.com/
- [ ] Create developer account
- [ ] Create new app in Developer Portal
- [ ] Note down: `Client ID`, `Client Secret`
- [ ] Add Redirect URI: `http://localhost:5000/api/tiktok/oauth2/callback`
- [ ] Request scopes: `user.info.basic`, `video.list`

### Instagram/Meta
- [ ] Visit https://developers.facebook.com/
- [ ] Create new app
- [ ] Choose app type: "Consumer"
- [ ] Add Instagram Basic Display product
- [ ] Note down: `Client ID`, `Client Secret`
- [ ] Add Redirect URI: `http://localhost:5000/api/instagram/oauth2/callback`

### Facebook
- [ ] Visit https://developers.facebook.com/
- [ ] Create new app (Consumer type)
- [ ] Add Facebook Login product
- [ ] Note down: `Client ID`, `Client Secret`
- [ ] Add Redirect URI: `http://localhost:5000/api/facebook/oauth2/callback`

### YouTube
- [ ] Visit https://console.cloud.google.com/
- [ ] Create new project
- [ ] Enable "YouTube Data API v3"
- [ ] Create OAuth 2.0 Client ID (Web application)
- [ ] Add authorized origins: `http://localhost:5000`, `https://yourdomain.com`
- [ ] Add authorized redirect URIs: `http://localhost:5000/api/youtube/oauth2/callback`
- [ ] Download credentials as JSON

---

## Step 2: Update Environment Variables ✓

- [ ] Edit `.env` file in root directory
- [ ] Add TIKTOK_CLIENT_ID
- [ ] Add TIKTOK_CLIENT_SECRET
- [ ] Add INSTAGRAM_CLIENT_ID
- [ ] Add INSTAGRAM_CLIENT_SECRET
- [ ] Add FACEBOOK_CLIENT_ID
- [ ] Add FACEBOOK_CLIENT_SECRET
- [ ] Add YOUTUBE_CLIENT_ID
- [ ] Add YOUTUBE_CLIENT_SECRET
- [ ] Add all CALLBACK_URLs

---

## Step 3: Create Controller Files ✓

- [ ] Create `backend_fold/controllers/tiktokAuth.js`
  - [ ] Copy oauth2Connect function
  - [ ] Copy oauth2Callback function
  - [ ] Test imports
- [ ] Create `backend_fold/controllers/instagramAuth.js`
  - [ ] Copy oauth2Connect function
  - [ ] Copy oauth2Callback function
  - [ ] Test imports
- [ ] Create `backend_fold/controllers/facebookAuth.js`
  - [ ] Copy oauth2Connect function
  - [ ] Copy oauth2Callback function
  - [ ] Test imports
- [ ] Create `backend_fold/controllers/youtubeAuth.js`
  - [ ] Copy oauth2Connect function
  - [ ] Copy oauth2Callback function
  - [ ] Test imports

---

## Step 4: Create Route Files ✓

- [ ] Create `backend_fold/routes/tiktok.js`
  - [ ] Add oauth2Connect route
  - [ ] Add oauth2Callback route
  - [ ] Add popup-close route
- [ ] Create `backend_fold/routes/instagram.js`
  - [ ] Add oauth2Connect route
  - [ ] Add oauth2Callback route
  - [ ] Add popup-close route
- [ ] Create `backend_fold/routes/facebook.js`
  - [ ] Add oauth2Connect route
  - [ ] Add oauth2Callback route
  - [ ] Add popup-close route
- [ ] Create `backend_fold/routes/youtube.js`
  - [ ] Add oauth2Connect route
  - [ ] Add oauth2Callback route
  - [ ] Add popup-close route

---

## Step 5: Register Routes in Server ✓

In `backend_fold/server.js` (or your main app file):

- [ ] Import tiktok routes: `const tiktokRoutes = require('./routes/tiktok')`
- [ ] Import instagram routes: `const instagramRoutes = require('./routes/instagram')`
- [ ] Import facebook routes: `const facebookRoutes = require('./routes/facebook')`
- [ ] Import youtube routes: `const youtubeRoutes = require('./routes/youtube')`
- [ ] Register tiktok: `app.use('/api/tiktok', tiktokRoutes)`
- [ ] Register instagram: `app.use('/api/instagram', instagramRoutes)`
- [ ] Register facebook: `app.use('/api/facebook', facebookRoutes)`
- [ ] Register youtube: `app.use('/api/youtube', youtubeRoutes)`
- [ ] Test server starts without errors

---

## Step 6: Add Unlink Endpoints ✓

Option A: Add to existing authController
- [ ] Add unlinkPlatform function to `backend_fold/controllers/authController.js`
- [ ] Add DELETE /unlink route to each platform route file
- [ ] Test with curl: `curl -X DELETE http://localhost:5000/api/tiktok/unlink`

Option B: Create shared unlink controller
- [ ] Create `backend_fold/controllers/unlinkController.js`
- [ ] Export unlinkPlatform function
- [ ] Import in each platform route file
- [ ] Add DELETE /unlink route to each file

---

## Step 7: Test OAuth Flows ✓

### TikTok
- [ ] Navigate to Profile page
- [ ] Click "Connect" for TikTok
- [ ] Should redirect to TikTok login
- [ ] After authorization, should show connected status
- [ ] Check MongoDB user record has tiktok object with id, username, accessToken
- [ ] Test unlink button

### Instagram
- [ ] Navigate to Profile page
- [ ] Click "Connect" for Instagram
- [ ] Should redirect to Instagram/Facebook login
- [ ] After authorization, should show connected status
- [ ] Check MongoDB user record has instagram object
- [ ] Test unlink button

### Facebook
- [ ] Navigate to Profile page
- [ ] Click "Connect" for Facebook
- [ ] Should redirect to Facebook login
- [ ] After authorization, should show connected status
- [ ] Check MongoDB user record has facebook object
- [ ] Test unlink button

### YouTube
- [ ] Navigate to Profile page
- [ ] Click "Connect" for YouTube
- [ ] Should redirect to Google login
- [ ] After authorization, should show connected status
- [ ] Check MongoDB user record has youtube object with refreshToken
- [ ] Test unlink button

---

## Step 8: Test Task Completion ✓

- [ ] Create task for each platform via AdminTasks
- [ ] User completes TikTok task
  - [ ] Should call verifyTikTokFollow/Like/Comment/Share
  - [ ] Should verify with platform API
  - [ ] Should return reward and update balance
- [ ] User completes Instagram task
  - [ ] Should call verifyInstagramFollow/Like/Comment/Share
  - [ ] Should verify with platform API
  - [ ] Should return reward and update balance
- [ ] User completes Facebook task
  - [ ] Should call verifyFacebookFollow/Like/Comment/Share
  - [ ] Should verify with platform API
  - [ ] Should return reward and update balance
- [ ] User completes YouTube task
  - [ ] Should call verifyYouTubeSubscribe/Like/Comment
  - [ ] Should verify with platform API
  - [ ] Should return reward and update balance

---

## Step 9: Error Handling Testing ✓

- [ ] Test without env variables configured → Should return 501
- [ ] Test with invalid state parameter → Should redirect to failed page
- [ ] Test with expired auth code → Should handle gracefully
- [ ] Test with network timeout → Should log error and show user-friendly message
- [ ] Test unlink when not authenticated → Should require login
- [ ] Test multiple rapid OAuth attempts → Should handle correctly

---

## Step 10: Production Deployment ✓

- [ ] Update all CALLBACK_URLs in `.env` to production domain
- [ ] Update frontend `API_URL` config to production
- [ ] Ensure HTTPS is enforced
- [ ] Test full OAuth flow on production
- [ ] Implement token refresh for long-lived sessions
- [ ] Set up monitoring for OAuth failures
- [ ] Create admin dashboard to view OAuth errors
- [ ] Document platform credentials (in secure vault, not in code)

---

## Step 11: Monitoring & Maintenance ✓

- [ ] Monitor OAuth success/failure rates
- [ ] Monitor token expiration issues
- [ ] Monitor API rate limits per platform
- [ ] Create alerts for OAuth endpoint errors
- [ ] Test token refresh mechanism quarterly
- [ ] Update API versions when platforms release new versions
- [ ] Monitor for security vulnerabilities in OAuth libraries

---

## Troubleshooting

### "OAuth not configured" error
**Solution**: Check `.env` file has all required variables
```bash
echo $TIKTOK_CLIENT_ID  # Should output your client ID
```

### OAuth popup opens but doesn't redirect back
**Solution**: Check redirect URI matches exactly in platform settings

### "Invalid state" error
**Solution**: Ensure `express-session` is configured correctly:
```javascript
const session = require('express-session')
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true in production with HTTPS
}))
```

### Token exchange fails
**Solution**: Verify code is being passed correctly:
- Check OAuth `/callback` route logs
- Verify platform API endpoint is correct
- Check Client ID/Secret are not wrong
- Ensure request body format matches platform docs

### User info not retrieved
**Solution**: Check scopes are sufficient:
- TikTok: Need `user.info.basic`
- Instagram: Need `user_profile`
- Facebook: Need `public_profile`
- YouTube: Need `https://www.googleapis.com/auth/youtube`

---

## Files Created

```
backend_fold/
  controllers/
    ✓ tiktokAuth.js
    ✓ instagramAuth.js
    ✓ facebookAuth.js
    ✓ youtubeAuth.js
  routes/
    ✓ tiktok.js
    ✓ instagram.js
    ✓ facebook.js
    ✓ youtube.js
  
.env (updated with platform credentials)
server.js (updated with route registrations)
```

---

## Expected Behavior After Implementation

### Connection Flow
1. User clicks "Connect [Platform]" on Profile
2. Popup opens to OAuth authorization page
3. User logs in and authorizes app
4. Platform redirects to callback endpoint
5. Backend exchanges code for access token
6. Backend stores token in user document
7. Popup closes
8. Profile page shows "Connected: @username"
9. User can now complete tasks for that platform

### Task Completion Flow
1. User sees platform-specific tasks in Tasks page
2. User clicks "Verify" on task
3. Frontend calls `POST /tasks/:id/complete`
4. Backend gets user's access token for that platform
5. Backend calls platform API to verify action
6. If verified: reward added, balance updated
7. If not verified: error message shown

### Unlinking Flow
1. User clicks "Unlink" on Profile next to connected platform
2. Backend removes platform object from user document
3. Access token is deleted
4. User can no longer complete tasks for that platform

---

## Quick Start Command

After creating files, test with:
```bash
# 1. Start backend server
cd backend_fold
npm start

# 2. In another terminal, test connect endpoint
curl http://localhost:5000/api/tiktok/oauth2/connect -L
# Should redirect to TikTok login

# 3. Test unlink endpoint (requires authentication)
curl -X DELETE http://localhost:5000/api/tiktok/unlink \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Status: READY FOR IMPLEMENTATION ✓

All OAuth2 endpoint code has been provided. Follow the checklist above to implement and test each platform.
