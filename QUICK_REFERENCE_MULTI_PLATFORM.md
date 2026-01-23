# Quick Reference - Multi-Platform Tasks

## What Was Changed

### ✅ Backend (Complete)
- **Models**: Extended `adminTasks` schema & `user` schema with 5 platforms
- **Service**: Created `multiPlatformVerify.js` with 14+ verification functions
- **Controller**: Added generic `completeTask()` function
- **Routes**: Added 5 new platform-specific endpoints

### ✅ Frontend (Complete)
- **Tasks.jsx**: Updated to use generic `/tasks/:id/complete` endpoint
- **CreateTask.jsx**: Added YouTube platform & dynamic actions
- **AdminTasks.jsx**: Platform dropdown & dynamic verification types
- **Profile.jsx**: Multi-platform social account linking

---

## How to Use

### For Users
1. Go to **Profile** page
2. Click "Connect" for each platform
3. Authorize the app via OAuth2
4. Go to **Tasks** page
5. Select platform filter
6. Complete available tasks
7. Verify proof via API call

### For Admins
1. Go to **Admin Tasks** page
2. Select platform from dropdown
3. Select verification type (platform-specific options shown)
4. Enter target ID (username for follow, video ID for others)
5. Create task

---

## API Endpoints

### User Completes Task
```
POST /tasks/:id/complete
Body: { platform: "X" | "TikTok" | "Instagram" | "Facebook" | "YouTube" }
```

### Create Task
```
POST /tasks/addtasks
Body: {
  title: string,
  platform: "X" | "Instagram" | "TikTok" | "Facebook" | "YouTube",
  verification: { type: string, targetId: string, ... },
  reward: number
}
```

---

## Platform-Specific Details

| Platform | Platforms | Follower | Like | Comment | Share | Subscribe |
|----------|-----------|----------|------|---------|-------|-----------|
| X | X, Twitter | ✓ | ✓ | ✓ | ✗ | ✗ |
| TikTok | TikTok | ✓ | ✓ | ✓ | ✓ | ✗ |
| Instagram | Instagram | ✓ | ✓ | ✓ | ✓ | ✗ |
| Facebook | Facebook | ✓ | ✓ | ✓ | ✓ | ✗ |
| YouTube | YouTube | ✗ | ✓ | ✓ | ✗ | ✓ |

---

## Files Modified

### Backend
- `backend_fold/models/adminTasks.js` ✏️
- `backend_fold/models/user.js` ✏️
- `backend_fold/controllers/Task.js` ✏️
- `backend_fold/routes/Tasks.js` ✏️
- `backend_fold/services/multiPlatformVerify.js` ✨ (NEW)

### Frontend
- `frontend/src/pages/Tasks.jsx` ✏️
- `frontend/src/pages/CreateTask.jsx` ✏️
- `frontend/src/pages/AdminTasks.jsx` ✏️
- `frontend/src/pages/Profile.jsx` ✏️

---

## OAuth2 Setup Required

Each platform needs OAuth2 endpoints. Create these routes:
- `/tiktok/oauth2/connect`
- `/instagram/oauth2/connect`
- `/facebook/oauth2/connect`
- `/youtube/oauth2/connect`

Each should:
1. Initiate OAuth2 flow
2. Get access token
3. Store in `user[platform].accessToken`
4. Redirect to `/profile?platform=linked` or `?platform=failed&reason=...`

---

## Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Link your X account first" | Account not authorized | Go to Profile, click Connect |
| "Task unavailable" | Admin hasn't created task | Create via Admin Tasks page |
| "Please wait before retrying" | Too many attempts (60s cooldown) | Wait 1 minute |
| Verification fails | API timeout or blocked | Check platform API status |

---

## Testing Priority

1. ✅ Platform filter dropdown appears (frontend)
2. ✅ Can select platform when creating task (admin)
3. ✅ Generic `/tasks/:id/complete` endpoint works
4. ✅ Verification routes to correct platform function
5. ✅ Balance updates upon completion
6. ✅ Social account linking from Profile

---

## Future Enhancements

- [ ] Screenshot verification UI for manual tasks
- [ ] Task analytics by platform
- [ ] Platform-specific reward multipliers
- [ ] Automated task creation templates
- [ ] Real-time verification status
- [ ] Platform-specific help guides

---

## Support Contacts

**Issues?**
- Check MULTI_PLATFORM_TASKS_IMPLEMENTATION.md for detailed docs
- Review logs in `taskCompletion` model records
- Check OAuth2 endpoint connectivity
- Verify platform API credentials
