# Multi-Platform Tasks - Architecture & Data Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Redux)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ Tasks.jsx    │  │ Profile.jsx  │  │ AdminTasks   │           │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤           │
│  │ - Filter by  │  │ - Show all   │  │ - Create     │           │
│  │   platform   │  │   5 linked   │  │   tasks      │           │
│  │ - Display    │  │   accounts   │  │ - Set verify │           │
│  │   tasks      │  │ - Connect/   │  │   type per   │           │
│  │ - Complete   │  │   Unlink     │  │   platform   │           │
│  │   task       │  │   each one   │  │              │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│         │                │                    │                  │
│         └────────────────┴────────────────────┘                  │
│                          │                                       │
└──────────────────────────┼───────────────────────────────────────┘
                           │ HTTP/REST
                    POST /tasks/:id/complete
                    POST /profile/connect/:platform
                           │
┌──────────────────────────┼───────────────────────────────────────┐
│                    BACKEND (Node.js/Express)                     │
├──────────────────────────┼───────────────────────────────────────┤
│                          │                                       │
│    ┌─────────────────────▼──────────────────┐                   │
│    │   Routes (tasks.js, auth.js, etc)      │                   │
│    │   - POST /tasks/:id/complete           │                   │
│    │   - POST /tiktok/:id/complete          │                   │
│    │   - POST /instagram/:id/complete       │                   │
│    │   - POST /:platform/oauth2/connect     │                   │
│    └─────────────────────┬──────────────────┘                   │
│                          │                                       │
│    ┌─────────────────────▼──────────────────┐                   │
│    │   Controllers (Task.js, auth.js)       │                   │
│    │   - completeTask()                     │                   │
│    │     * Platform detection               │                   │
│    │     * Social account validation        │                   │
│    │     * Fraud check & rate limit         │                   │
│    └─────────────────────┬──────────────────┘                   │
│                          │                                       │
│    ┌─────────────────────▼──────────────────────────────────┐   │
│    │   Services (multiPlatformVerify.js)                    │   │
│    │   verifyTask(platform, type, id, target, token)        │   │
│    │   - Dispatcher function                                │   │
│    │   - Routes to platform-specific function               │   │
│    │   - Returns: true/false                                │   │
│    │                                                         │   │
│    │   Platform Implementations:                             │   │
│    │   - TikTok (follow, like, comment, share)             │   │
│    │   - Instagram (follow, like, comment, share)          │   │
│    │   - Facebook (follow, like, comment, share)           │   │
│    │   - YouTube (subscribe, like, comment)                │   │
│    │   - Twitter (follow, like, retweet, comment)          │   │
│    └─────────────────────┬──────────────────────────────────┘   │
│                          │                                       │
│    ┌─────────────────────▼──────────────────┐                   │
│    │   Database (MongoDB)                    │                   │
│    │   ┌──────────────────────────────────┐ │                   │
│    │   │ User Collection                  │ │                   │
│    │   │ - twitter: {id, token, ...}     │ │                   │
│    │   │ - tiktok: {id, token, ...}      │ │                   │
│    │   │ - instagram: {id, token, ...}   │ │                   │
│    │   │ - facebook: {id, token, ...}    │ │                   │
│    │   │ - youtube: {id, token, ...}     │ │                   │
│    │   │ - isSuspended: boolean          │ │                   │
│    │   │ - fraudScore: number            │ │                   │
│    │   └──────────────────────────────────┘ │                   │
│    │   ┌──────────────────────────────────┐ │                   │
│    │   │ Task Collection                  │ │                   │
│    │   │ - platform: enum                 │ │                   │
│    │   │ - verification: {                │ │                   │
│    │   │   type, targetId, targetPostId, │ │                   │
│    │   │   targetVideoId, ...}            │ │                   │
│    │   │ - reward: number                 │ │                   │
│    │   │ - isActive: boolean              │ │                   │
│    │   └──────────────────────────────────┘ │                   │
│    │   ┌──────────────────────────────────┐ │                   │
│    │   │ TaskCompletion Collection        │ │                   │
│    │   │ - user: ObjectId                 │ │                   │
│    │   │ - task: ObjectId                 │ │                   │
│    │   │ - status: pending/approved       │ │                   │
│    │   │ - reward: number                 │ │                   │
│    │   │ - createdAt: timestamp           │ │                   │
│    │   └──────────────────────────────────┘ │                   │
│    └─────────────────────────────────────────┘                   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                           │
                           │ OAuth2/API Calls
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
    ┌───▼────┐         ┌───▼────┐       ┌────▼──┐
    │ Twitter │         │ TikTok │  ...  │ YouTube│
    │   API   │         │  API   │       │  API  │
    └────────┘         └────────┘       └───────┘
```

---

## Task Completion Flow

```
┌─────────────────────────────────────┐
│ User Clicks "Verify Task" on Tasks  │
└────────────────┬────────────────────┘
                 │
                 ▼
    ┌─────────────────────────────────┐
    │ Frontend sends request:          │
    │ POST /tasks/:id/complete         │
    │ { platform: "TikTok" }           │
    └────────────────┬────────────────┘
                     │
                     ▼
    ┌──────────────────────────────────────┐
    │ Backend Task Controller:              │
    │ completeTask(req, res)                │
    │                                      │
    │ 1. Get taskId from params            │
    │ 2. Get user from req.user            │
    │ 3. Get platform from req.body        │
    └────────────────┬─────────────────────┘
                     │
                     ▼
    ┌──────────────────────────────────────┐
    │ Validation Chain                     │
    │                                      │
    │ ✓ Task exists & active?              │
    │ ✓ Social account linked?             │
    │ ✓ Not suspended?                     │
    │ ✓ Fraud score < 5?                   │
    │ ✓ Not completed in last 60s?         │
    └────────────────┬─────────────────────┘
                     │
                     ▼
    ┌──────────────────────────────────────┐
    │ If screenshot-based:                 │
    │ - Create pending TaskCompletion      │
    │ - Return "awaiting review"           │
    │ - Exit                               │
    │                                      │
    │ Else: continue...                    │
    └────────────────┬─────────────────────┘
                     │
                     ▼
    ┌──────────────────────────────────────┐
    │ Call Verification Service:           │
    │                                      │
    │ verifyTask(                          │
    │   platform: "TikTok",                │
    │   type: "like",                      │
    │   userSocialId: user.tiktok.id,      │
    │   targetId: task.verification.      │
    │            targetVideoId,            │
    │   token: user.tiktok.accessToken     │
    │ )                                    │
    └────────────────┬─────────────────────┘
                     │
      ┌──────────────┼──────────────┐
      │              │              │
      ▼              ▼              ▼
    TikTok      Instagram       YouTube
    API Call    API Call        API Call
      │              │              │
      └──────────────┼──────────────┘
                     │
                     ▼
    ┌──────────────────────────────────────┐
    │ Verification Result:                 │
    │ boolean (true = verified)            │
    └────────────────┬─────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼ (TRUE)                ▼ (FALSE)
    ┌──────────────────┐   ┌──────────────────┐
    │ Create Task      │   │ Log failure      │
    │ Completion       │   │ Return error     │
    │ Mark approved    │   │ (400/403 status) │
    │ Add reward       │   │                  │
    │ Update balance   │   │                  │
    └────────────────┬┘   └──────────────────┘
                     │
                     ▼
    ┌──────────────────────────────────────┐
    │ Atomic Transaction:                  │
    │ - Save TaskCompletion                │
    │ - Update user.balance                │
    │ - Return new balance                 │
    └────────────────┬─────────────────────┘
                     │
                     ▼
    ┌──────────────────────────────────────┐
    │ Response to Frontend:                │
    │ {                                    │
    │   success: true,                     │
    │   message: "Verified!",              │
    │   reward: 500,                       │
    │   balance: 50500  // NEW BALANCE     │
    │ }                                    │
    └────────────────┬─────────────────────┘
                     │
                     ▼
    ┌──────────────────────────────────────┐
    │ Frontend Redux:                      │
    │ - Update balance in store            │
    │ - Show toast success                 │
    │ - Remove task from list              │
    │ - Show animation                     │
    └──────────────────────────────────────┘
```

---

## Platform Authentication Flow

```
┌────────────────────────────────────┐
│ User clicks "Connect [Platform]"   │
│ on Profile page                    │
└────────────────┬───────────────────┘
                 │
                 ▼
    ┌────────────────────────────────┐
    │ Frontend opens OAuth2 popup:    │
    │ window.open(                    │
    │   "${API_URL}/platform/        │
    │    oauth2/connect"              │
    │ )                               │
    └────────────────┬────────────────┘
                     │
                     ▼
    ┌────────────────────────────────┐
    │ Backend OAuth2 Endpoint:        │
    │ /tiktok/oauth2/connect          │
    │                                 │
    │ 1. Redirect to platform OAuth   │
    │ 2. User authorizes app          │
    │ 3. Platform redirects back      │
    │    with auth code               │
    └────────────────┬────────────────┘
                     │
                     ▼
    ┌────────────────────────────────┐
    │ Backend processes OAuth code:   │
    │                                 │
    │ 1. Exchange code for token      │
    │ 2. Get user info from platform  │
    │ 3. Store in user model:         │
    │    user.tiktok = {              │
    │      id: ...,                   │
    │      username: ...,             │
    │      accessToken: ...,          │
    │      linkedAt: new Date()       │
    │    }                            │
    │ 4. Redirect to /profile         │
    └────────────────┬────────────────┘
                     │
                     ▼
    ┌────────────────────────────────┐
    │ Frontend popup closes           │
    │ Main window polls and detects   │
    │ redirect back to /profile       │
    └────────────────┬────────────────┘
                     │
                     ▼
    ┌────────────────────────────────┐
    │ Frontend fetches updated user:  │
    │ GET /auth/me                    │
    │                                 │
    │ Redux updates:                  │
    │ - user.tiktok.username set      │
    │ - UI shows "Connected" status   │
    │ - "Connect" button changes to   │
    │   "Unlink"                      │
    └────────────────────────────────┘
```

---

## Verification Type Decision Matrix

| Platform | Follow | Like | Comment | Share | Subscribe |
|----------|--------|------|---------|-------|-----------|
| **X/Twitter** | ✅ `targetId` | ✅ `targetPostId` | ✅ `targetPostId` | ❌ | ❌ |
| **TikTok** | ✅ `targetId` | ✅ `targetVideoId` | ✅ `targetVideoId` | ✅ `targetVideoId` | ❌ |
| **Instagram** | ✅ `targetId` | ✅ `targetPostId` | ✅ `targetPostId` | ✅ `targetPostId` | ❌ |
| **Facebook** | ✅ `targetId` | ✅ `targetPostId` | ✅ `targetPostId` | ✅ `targetPostId` | ❌ |
| **YouTube** | ❌ | ✅ `targetVideoId` | ✅ `targetVideoId` | ❌ | ✅ `targetChannelId` |

---

## Error Handling Pyramid

```
                    ┌─────────────────┐
                    │ Platform Error  │
                    │ API unavailable │
                    │ Rate limited    │
                    │ Auth expired    │
                    └────────┬────────┘
                             │ Return: false (verification fails)
                             ▼
                    ┌─────────────────┐
                    │ Timeout Error   │
                    │ >10 second API  │
                    └────────┬────────┘
                             │ Return: false
                             ▼
                    ┌─────────────────┐
                    │ Validation Error│
                    │ Missing target  │
                    │ Invalid token   │
                    └────────┬────────┘
                             │ Return: false
                             ▼
                    ┌─────────────────┐
                    │ Status Check    │
                    │ Task inactive   │
                    │ User suspended  │
                    │ Fraud score     │
                    │ Recent attempt  │
                    └────────┬────────┘
                             │ Return: 400/403 error
                             ▼
                    ┌─────────────────┐
                    │ Success Path    │
                    │ Create record   │
                    │ Update balance  │
                    │ Return reward   │
                    └─────────────────┘
```

---

## Database Schema Relationships

```
┌──────────────────────────────────────┐
│ User Collection                      │
├──────────────────────────────────────┤
│ _id: ObjectId                        │
│ name: String                         │
│ email: String                        │
│ balance: Number                      │
│ fraudScore: Number                   │
│ isSuspended: Boolean                 │
│                                      │
│ twitter: {                           │
│   id: String,                        │
│   username: String,                  │
│   accessToken: String,               │
│   linkedAt: Date                     │
│ }                                    │
│ tiktok: {...}                        │
│ instagram: {...}                     │
│ facebook: {...}                      │
│ youtube: {...}                       │
└──────────────────────────────────────┘
           ▲                │
           │ owns           │ completes
           │                ▼
           │    ┌──────────────────────────┐
           │    │ TaskCompletion Collection│
           │    ├──────────────────────────┤
           │    │ _id: ObjectId            │
           │    │ user: ObjectId (ref User)│
           │    │ task: ObjectId (ref Task)│
           │    │ status: String           │
           │    │ reward: Number           │
           │    │ createdAt: Date          │
           │    └──────────────────────────┘
           │                │
           │ creates        │ references
           │                ▼
    ┌──────────────────────────────────────┐
    │ Task Collection                      │
    ├──────────────────────────────────────┤
    │ _id: ObjectId                        │
    │ title: String                        │
    │ platform: Enum                       │
    │ reward: Number                       │
    │ isActive: Boolean                    │
    │ maxCompletions: Number               │
    │ completedCount: Number               │
    │                                      │
    │ verification: {                      │
    │   type: String,                      │
    │   targetId: String,                  │
    │   targetPostId: String,              │
    │   targetVideoId: String,             │
    │   targetChannelId: String,           │
    │   requiresScreenshot: Boolean        │
    │ }                                    │
    └──────────────────────────────────────┘
```

---

## State Management Flow (Redux)

```
┌─────────────────────────────────────┐
│ Initial State                       │
│                                     │
│ auth: {                             │
│   user: {                           │
│     twitter: {...},                 │
│     tiktok: {...},                  │
│     instagram: {...},               │
│     facebook: {...},                │
│     youtube: {...}                  │
│   },                                │
│   balance: 50000                    │
│ }                                   │
└────────────────┬────────────────────┘
                 │
         ┌───────┴────────┐
         │                │
         ▼                ▼
    Action:           Action:
    updateBalance     loginSuccess
    dispatch(         dispatch(
      updateBalance   loginSuccess({
      (55000)         user: {...},
    )                 balance: 55000
                      })
         │            )
         │                │
         └────────┬───────┘
                  ▼
         ┌─────────────────┐
         │ Redux Reducer   │
         │ Updates state   │
         └────────┬────────┘
                  │
                  ▼
    ┌──────────────────────────────┐
    │ New State                    │
    │ balance: 55000               │
    │ user: { ... updated ... }    │
    └──────────────────────────────┘
                  │
                  ▼
    ┌──────────────────────────────┐
    │ Components Re-render:        │
    │ - Display new balance        │
    │ - Show account connections   │
    │ - Update task list           │
    └──────────────────────────────┘
```

---

This architecture ensures:
- ✅ **Scalability**: Easy to add new platforms
- ✅ **Security**: Token storage and fraud detection
- ✅ **Reliability**: Error handling at every step
- ✅ **User Experience**: Clear feedback and responsive UI
- ✅ **Maintainability**: Clean separation of concerns
