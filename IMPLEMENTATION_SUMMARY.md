# CreateTask.jsx and Backend Updates - Summary

## Overview
Modified the task creation system to replace URL-based submissions with screenshot-based submissions for **repost**, **like**, and **comment** actions. Users now provide their account username/handle, upload proof screenshots, and provide descriptions instead of URLs.

---

## Frontend Changes (CreateTask.jsx)

### 1. **Updated Form State**
- Added `accountUsername` field for user's social media handle
- Added `screenshot` field to store the file object
- Added `screenshotPreview` for showing image preview before upload

### 2. **New File Upload Handler**
- `handleFileChange()`: Validates and previews selected images
- Supports image formats (PNG, JPG, GIF, WebP)
- 5MB file size limit
- Shows image preview in the form

### 3. **Updated UI for Repost/Like/Comment**
- **Follow action**: Keeps original URL field (unchanged)
- **Repost/Like/Comment actions**: 
  - Username/Handle field (instead of URL)
  - Image upload section with drag-and-drop UI
  - Preview display when image is selected
  - Description field for instructions

### 4. **Updated Form Submission**
- Uses `FormData` for multipart file uploads
- Conditionally includes fields based on action type
- Properly submits file to backend with authentication

---

## Backend Changes

### 1. **Database Model Update (taskApproval.js)**
Added two new fields to TaskApproval schema:
- `accountUsername` (String): Stores the user's account handle for the task
- `screenshotUrl` (String): Stores the path/URL to the uploaded screenshot

### 2. **Multer Configuration (middleweres/multer.js)** - NEW FILE
- Configured disk storage for uploaded images
- Destination: `backend_fold/uploads` directory
- Filename: Auto-generated with timestamp
- File validation: Only image types allowed
- Size limit: 5MB

### 3. **Route Update (routes/userTasks.js)**
- Added multer middleware to `/request-approval` endpoint
- Handles single file upload with field name `screenshot`
- Integrated into the protect middleware chain

### 4. **Approval Controller Update (approvalController.js)**
- Updated `requestApproval()` handler to:
  - Validate `accountUsername` for repost/like/comment actions
  - Check for screenshot file presence
  - Generate `screenshotUrl` from uploaded file path
  - Store both new fields in database

### 5. **Static File Serving (server.js)**
- Added `/uploads` route to serve uploaded images
- Accessible via `http://localhost:5000/uploads/filename` pattern

### 6. **Verification Logic Update (Task.js)**
- Added check for `task.verification?.requiresScreenshot`
- Screenshot-based tasks bypass automatic Twitter verification
- Status set to `pending_review` instead of auto-verification
- Tasks await admin manual verification before rewards are given

---

## User Workflow

### For Repost/Like/Comment Tasks:
1. User fills in task title, platform, action
2. Enters their **account username** (e.g., @myhandle)
3. **Uploads screenshot** of the post they need to interact with
4. Provides **description** of what to do
5. Submits for admin approval
6. Upon approval, users complete the task and upload proof via screenshot
7. Admin manually verifies the screenshot and approves reward

### For Follow Tasks (Unchanged):
1. User provides target account to follow
2. Automatic verification via Twitter API
3. Reward credited immediately upon verification

---

## File Structure
```
backend_fold/
├── middleweres/
│   ├── authmiddlewere.js
│   ├── blockSuspended.js
│   ├── roleMiddlewere.js
│   └── multer.js                 ← NEW
├── controllers/
│   ├── Task.js                   ← UPDATED
│   └── approvalController.js      ← UPDATED
├── models/
│   └── taskApproval.js           ← UPDATED
├── routes/
│   └── userTasks.js              ← UPDATED
├── uploads/                      ← NEW (auto-created)
├── server.js                     ← UPDATED
└── ...

frontend/src/pages/
└── CreateTask.jsx                ← UPDATED
```

---

## Requirements Met
✅ Username/handle field instead of URL for repost/like/comment
✅ Screenshot/image upload functionality
✅ Description field for instructions
✅ Image validation and preview
✅ File size limits (5MB)
✅ Backend file handling with multer
✅ Database schema updates
✅ Static file serving
✅ Manual verification flow for screenshot tasks
✅ Backwards compatibility with follow tasks

---

## Notes
- Follow tasks continue using automatic Twitter API verification
- Repost/Like/Comment tasks require manual admin verification of screenshots
- Uploaded files stored in `backend_fold/uploads/` directory
- Images accessible via `/uploads/[filename]` endpoint
- All file operations include error handling and validation
