# OAuth2 Flow Diagram - Visual Guide

## Complete OAuth2 Flow for All Platforms

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER PROFILE PAGE                            │
│  ┌─────────────┬──────────────┬──────────────┬──────────────┐       │
│  │   Connect   │   Connect    │   Connect    │   Connect    │       │
│  │   TikTok    │  Instagram   │  Facebook    │   YouTube    │       │
│  └──────┬──────┴──────┬───────┴──────┬───────┴──────┬───────┘       │
└─────────┼─────────────┼──────────────┼──────────────┼───────────────┘
          │             │              │              │
          │ Click       │ Click        │ Click        │ Click
          │             │              │              │
   ┌──────▼───────┬─────▼────────┬────▼─────────┬───▼──────────┐
   │              │              │              │              │
   ▼              ▼              ▼              ▼              ▼
┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ Browser │  │  Browser │  │ Browser  │  │ Browser  │  │ Browser  │
│ Popup 1 │  │  Popup 2 │  │ Popup 3  │  │ Popup 4  │  │ Popup N  │
└────┬────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
     │            │             │             │             │
     │ GET        │ GET         │ GET         │ GET         │
     │ /api/      │ /api/       │ /api/       │ /api/       │
     │ tiktok/    │ instagram/  │ facebook/   │ youtube/    │
     │ oauth2/    │ oauth2/     │ oauth2/     │ oauth2/     │
     │ connect    │ connect     │ connect     │ connect     │
     │            │             │             │             │
     ▼            ▼             ▼             ▼             ▼
┌──────────────────────────────────────────────────────────────────┐
│              BACKEND: OAuth2 Connect Endpoints                    │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  For each platform:                                             │
│  1. Generate random state (CSRF protection)                     │
│  2. Save state to session                                       │
│  3. Build authorization URL with:                              │
│     - Client ID                                                │
│     - Redirect URI                                             │
│     - Scopes (platform-specific)                               │
│     - State parameter                                          │
│  4. Redirect user to platform login                            │
│                                                                  │
└──────┬───────────┬──────────────┬──────────┬──────────────────┘
       │           │              │          │
       │ Redirect  │ Redirect     │ Redirect │ Redirect
       │ to TikTok │ to Instagram │ to FB    │ to Google
       │ Login     │ Login        │ Login    │ Login
       │           │              │          │
       ▼           ▼              ▼          ▼
┌──────────────────────────────────────────────────────────────────┐
│         PLATFORM LOGIN SERVERS (TikTok, Instagram, etc)          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User enters credentials                                     │
│  2. User sees permission request (scopes)                       │
│  3. User clicks "Allow" or "Authorize"                          │
│  4. Platform redirects to callback URL with:                    │
│     - Authorization code                                        │
│     - State parameter                                           │
│                                                                  │
└──────┬───────────┬──────────────┬──────────┬──────────────────┘
       │           │              │          │
       │ Redirect  │ Redirect     │ Redirect │ Redirect
       │ to:       │ to:          │ to:      │ to:
       │ /api/     │ /api/        │ /api/    │ /api/
       │ tiktok/   │ instagram/   │ facebook/│ youtube/
       │ oauth2/   │ oauth2/      │ oauth2/  │ oauth2/
       │ callback  │ callback     │ callback │ callback
       │ ?code=... │ ?code=...    │ ?code=..│ ?code=...
       │ &state=.. │ &state=...   │ &state=.│ &state=...
       │           │              │          │
       ▼           ▼              ▼          ▼
┌──────────────────────────────────────────────────────────────────┐
│            BACKEND: OAuth2 Callback Endpoints                    │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  For each platform:                                             │
│  1. Receive authorization code + state                          │
│  2. Validate state (must match session state)                   │
│  3. Exchange code for access token:                             │
│     POST to platform token endpoint with:                       │
│     - Code                                                      │
│     - Client ID                                                 │
│     - Client Secret                                             │
│  4. Receive access token from platform                          │
│  5. Use access token to get user info from platform             │
│  6. Get: user ID, username, display name                        │
│  7. Store in MongoDB user document:                             │
│     user.tiktok = {                                             │
│       id: "...",                                                │
│       username: "...",                                          │
│       accessToken: "...",                                       │
│       linkedAt: Date                                            │
│     }                                                           │
│  8. Redirect to popup-close endpoint                            │
│                                                                  │
└──────┬───────────┬──────────────┬──────────┬──────────────────┘
       │           │              │          │
       │ Redirect  │ Redirect     │ Redirect │ Redirect
       │ to:       │ to:          │ to:      │ to:
       │ /api/     │ /api/        │ /api/    │ /api/
       │ tiktok/   │ instagram/   │ facebook/│ youtube/
       │ popup-    │ popup-       │ popup-   │ popup-
       │ close?... │ close?...    │ close?...│ close?...
       │           │              │          │
       ▼           ▼              ▼          ▼
┌──────────────────────────────────────────────────────────────────┐
│          POPUP-CLOSE ENDPOINT (Helper Page)                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  This is a simple HTML page that:                               │
│  1. Extracts linked/failed status from URL                      │
│  2. Posts message to parent window                              │
│  3. Closes the popup                                            │
│                                                                  │
│  JavaScript:                                                    │
│    const params = new URLSearchParams(window.location.search)  │
│    const status = params.get('tiktok')  // 'linked_...' or fail │
│    window.opener.postMessage({tiktok: status}, '*')            │
│    window.close()                                               │
│                                                                  │
└──────┬───────────┬──────────────┬──────────┬──────────────────┘
       │           │              │          │
       │ Send msg  │ Send msg     │ Send msg │ Send msg
       │ Close     │ Close        │ Close    │ Close
       │ popup     │ popup        │ popup    │ popup
       │           │              │          │
       ▼           ▼              ▼          ▼
┌──────────────────────────────────────────────────────────────────┐
│           FRONTEND: Profile Page (Message Handler)               │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  window.addEventListener('message', (e) => {                   │
│    if (e.data.tiktok === 'linked_123') {                        │
│      // Show success toast                                      │
│      // Refresh user data from /auth/me                         │
│      // Update UI to show "Connected: @username"                │
│      // Show "Unlink" button instead of "Connect"               │
│    } else if (e.data.tiktok === 'failed') {                     │
│      // Show error toast                                        │
│      // Log failure reason                                      │
│    }                                                            │
│  })                                                             │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
       │
       │ User can now:
       │ 1. See platform account connected
       │ 2. Complete tasks for that platform
       │ 3. Unlink account if needed
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│              USER CAN NOW COMPLETE TASKS!                        │
│                                                                  │
│  When user clicks "Verify" on a TikTok task:                    │
│  1. POST /tasks/:id/complete                                    │
│  2. Backend gets access token from user.tiktok.accessToken      │
│  3. Backend calls TikTok API to verify action                   │
│  4. If verified: reward credited                                │
│     If not: error message shown                                 │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Side-by-Side Platform Comparison

```
┌──────────────────────────────────────────────────────────────────┐
│              OAUTH2 ENDPOINTS SUMMARY                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  TIKTOK                    INSTAGRAM                            │
│  ═══════════════════════════════════════════════════════════    │
│  Connect:                  Connect:                             │
│  /api/tiktok/oauth2/       /api/instagram/oauth2/              │
│  connect                   connect                             │
│                                                                │
│  Callback:                 Callback:                           │
│  /api/tiktok/oauth2/       /api/instagram/oauth2/              │
│  callback                  callback                            │
│                                                                │
│  ───────────────────────────────────────────────────────────  │
│                                                                  │
│  FACEBOOK                  YOUTUBE                             │
│  ═══════════════════════════════════════════════════════════    │
│  Connect:                  Connect:                             │
│  /api/facebook/oauth2/     /api/youtube/oauth2/                │
│  connect                   connect                             │
│                                                                │
│  Callback:                 Callback:                           │
│  /api/facebook/oauth2/     /api/youtube/oauth2/                │
│  callback                  callback                            │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Environment Variables Setup

```
.env FILE
═════════════════════════════════════════════════════════════════════

# TikTok OAuth2
TIKTOK_CLIENT_ID=your_client_id_from_tiktok_dev
TIKTOK_CLIENT_SECRET=your_client_secret_from_tiktok_dev
TIKTOK_OAUTH2_CALLBACK_URL=http://localhost:5000/api/tiktok/oauth2/callback

# Instagram OAuth2  
INSTAGRAM_CLIENT_ID=your_client_id_from_meta
INSTAGRAM_CLIENT_SECRET=your_client_secret_from_meta
INSTAGRAM_OAUTH2_CALLBACK_URL=http://localhost:5000/api/instagram/oauth2/callback

# Facebook OAuth2
FACEBOOK_CLIENT_ID=your_facebook_client_id
FACEBOOK_CLIENT_SECRET=your_facebook_client_secret
FACEBOOK_OAUTH2_CALLBACK_URL=http://localhost:5000/api/facebook/oauth2/callback

# YouTube OAuth2
YOUTUBE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=your_google_client_secret
YOUTUBE_OAUTH2_CALLBACK_URL=http://localhost:5000/api/youtube/oauth2/callback

═════════════════════════════════════════════════════════════════════
```

---

## Database User Document After Linking All Platforms

```javascript
{
  _id: ObjectId("..."),
  name: "John Doe",
  email: "john@example.com",
  balance: 50000,
  
  // Twitter (existing)
  twitter: {
    id: "12345",
    username: "johndoe",
    displayName: "John Doe",
    accessToken: "eHkK...",
    linkedAt: ISODate("2024-01-20T10:30:00.000Z")
  },
  
  // TikTok (new)
  tiktok: {
    id: "6789012",
    username: "johndoe_tiktok",
    displayName: "John Doe TikTok",
    accessToken: "slk_abc123...",
    linkedAt: ISODate("2024-01-21T14:20:00.000Z")
  },
  
  // Instagram (new)
  instagram: {
    id: "987654321",
    username: "johndoe.insta",
    displayName: "John Doe Instagram",
    accessToken: "IGACEdg...",
    linkedAt: ISODate("2024-01-21T15:10:00.000Z")
  },
  
  // Facebook (new)
  facebook: {
    id: "100087654321",
    username: "john.doe.facebook",
    displayName: "John Doe",
    accessToken: "EABsbzL...",
    linkedAt: ISODate("2024-01-21T16:00:00.000Z")
  },
  
  // YouTube (new)
  youtube: {
    id: "UCaBcDeFgHiJkLmNoPqRs",
    username: "john_doe_channel",
    displayName: "John's Channel",
    accessToken: "ya29.a0...",
    refreshToken: "1//0gL...",
    linkedAt: ISODate("2024-01-21T16:45:00.000Z")
  },
  
  // Security
  isSuspended: false,
  fraudScore: 0
}
```

---

## Request/Response Examples

### Example 1: Connect TikTok Flow

**Frontend Code:**
```javascript
window.open('http://localhost:5000/api/tiktok/oauth2/connect')
```

**Backend /connect Response:**
- Generates state: `abc123xyz`
- Saves to session: `req.session.tiktokOAuthState = 'abc123xyz'`
- Redirects user to:
  ```
  https://www.tiktok.com/v1/oauth/authorize?
  client_key=YOUR_CLIENT_ID&
  response_type=code&
  scope=user.info.basic,video.list&
  redirect_uri=http://localhost:5000/api/tiktok/oauth2/callback&
  state=abc123xyz
  ```

**User Authorizes → Platform Redirects to:**
```
http://localhost:5000/api/tiktok/oauth2/callback?
code=AUTHORIZATION_CODE_FROM_TIKTOK&
state=abc123xyz
```

**Backend /callback Processing:**
1. Validates state matches: `abc123xyz`
2. Exchanges code for access token via TikTok API
3. Gets user info: `{ open_id: "6789...", display_name: "johndoe" }`
4. Saves to user: `user.tiktok = { id, username, accessToken }`
5. Redirects to: `/api/tiktok/popup-close?tiktok=linked_6789...`

**Popup Close Page Posts:**
```javascript
window.opener.postMessage({tiktok: 'linked_6789...'}, '*')
window.close()
```

**Parent Window Handler:**
```javascript
// Sees message, shows toast, refreshes user data
// Updates UI: "Connected: @johndoe" with "Unlink" button
```

---

## Common Issues & Solutions

```
ISSUE: "TikTok OAuth not configured"
═════════════════════════════════════════════════════════════════════
CAUSE:   Missing TIKTOK_CLIENT_ID or TIKTOK_CLIENT_SECRET in .env
SOLUTION: Add credentials to .env file and restart server
          Verify with: echo $TIKTOK_CLIENT_ID


ISSUE: Popup opens but doesn't redirect back
═════════════════════════════════════════════════════════════════════
CAUSE:   Platform doesn't recognize redirect URL
SOLUTION: Check callback URL matches EXACTLY:
          - In .env
          - In platform developer settings
          - No trailing slashes or query params


ISSUE: "Invalid state" error
═════════════════════════════════════════════════════════════════════
CAUSE:   Session not persisting across requests
SOLUTION: Verify express-session is configured:
          const session = require('express-session')
          app.use(session({...}))
          should be BEFORE route registration


ISSUE: Access token not stored in database
═════════════════════════════════════════════════════════════════════
CAUSE:   JWT not found or validation failing
SOLUTION: Ensure user is authenticated:
          - Token in cookie or Authorization header
          - Token is valid and not expired
          - User exists in database


ISSUE: "No user info" after token exchange
═════════════════════════════════════════════════════════════════════
CAUSE:   Scopes insufficient for requested fields
SOLUTION: Add required scopes in oauth2Connect():
          TikTok:    'user.info.basic'
          Instagram: 'user_profile'
          Facebook:  'public_profile'
          YouTube:   'https://www.googleapis.com/auth/youtube'
```

---

Done! You now have complete visual understanding of OAuth2 flow for all 4 platforms.
