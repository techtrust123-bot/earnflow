# Backend Support System Implementation

## Overview
Complete backend API implementation for the customer support chat and live interaction statistics chart on the Earnflow dashboard.

## New Backend Components

### 1. Models Created

#### `backend_fold/models/supportMessage.js`
- Stores all support messages between customers and support team
- Fields:
  - `userId`: Reference to the user who initiated support
  - `message`: The message content
  - `sender`: Either 'customer' or 'support'
  - `category`: Support ticket category (general, payment, task, withdrawal, account, other)
  - `status`: Ticket status (open, in-progress, resolved, closed)
  - `priority`: Priority level (low, medium, high, urgent)
  - `resolvedBy`: Admin user who resolved the ticket
  - `resolvedAt`: Timestamp of resolution
  - Timestamps for tracking

#### `backend_fold/models/supportInteraction.js`
- Tracks support statistics by hour for the live chart
- Fields:
  - `timestamp`: When the interaction occurred
  - `hour`: Hour identifier for grouping
  - `customerQueries`: Number of customer inquiries
  - `activeSupport`: Number of active support team members
  - `resolvedIssues`: Number of resolved tickets
  - `averageResponseTime`: Average response time in seconds
  - `satisfactionScore`: Customer satisfaction rating (0-5)
  - `totalTickets`: Total tickets processed

### 2. Routes Created

#### `backend_fold/routes/support.js`
Complete support API with the following endpoints:

**Customer Endpoints:**
- `GET /support/messages` - Fetch all support messages for current user
- `POST /support/send` - Send new support message
  - Body: `{ message, category }`
  - Auto-generates support response after 2 seconds
- `POST /support/close/:messageId` - Close a support ticket
- `GET /support/stats/live` - Get live chart data (last 6 hours)
- `GET /support/stats/summary` - Get support statistics summary

**Admin Endpoints:**
- `GET /support/admin/all` - Get all support messages (admin only)
- `POST /support/admin/respond/:messageId` - Send support response (admin only)
- `POST /support/admin/resolve/:messageId` - Mark ticket as resolved (admin only)

### 3. Frontend Integration

#### Updated `frontend/src/pages/Dashboard.jsx`
- Integrated backend API calls for:
  - Fetching support messages on mount
  - Auto-refreshing chart data every 30 seconds
  - Sending support messages to backend
  - Displaying real-time data from backend
- Features:
  - Live support chat with message history
  - Dynamic bar chart showing customer/support/resolved metrics
  - Auto-responses from support team
  - Dark theme support

## API Response Examples

### GET /support/messages
```json
{
  "success": true,
  "messages": [
    {
      "id": "ObjectId",
      "sender": "You",
      "message": "I have a question about my payment",
      "time": "2026-01-19T10:30:00Z",
      "status": "open"
    }
  ]
}
```

### GET /support/stats/live
```json
{
  "success": true,
  "chart": {
    "labels": ["12am", "1am", "2am", "3am", "4am", "5am"],
    "customers": [12, 18, 15, 22, 28, 35],
    "support": [5, 8, 6, 10, 14, 18],
    "resolved": [4, 7, 5, 9, 12, 16],
    "avgCustomers": 18.3,
    "avgSupport": 10.2,
    "avgResolved": 8.8
  }
}
```

## Key Features

✅ Real-time support messaging system
✅ Automatic support team responses
✅ Live interaction statistics with hourly tracking
✅ Admin support ticket management
✅ Support ticket categorization and prioritization
✅ Message history and status tracking
✅ Multi-status workflow (open → in-progress → resolved → closed)
✅ Admin-only response and resolution endpoints
✅ 30-second auto-refresh of chart data on frontend
✅ Full dark theme compatibility

## Database Collections

1. **SupportMessage** - Stores all support conversation messages
2. **SupportInteraction** - Stores hourly statistics for the chart

## Environment Notes

- Support API requires authentication for customer endpoints (except admin stats)
- Admin endpoints require `user.role === 'admin'`
- Auto-responses are generated server-side after 2 seconds
- Chart data displays last 6 hours of interactions
- All timestamps use ISO 8601 format

## Usage Flow

1. Customer opens dashboard
2. Frontend loads support messages via `GET /support/messages`
3. Frontend loads chart data via `GET /support/stats/live`
4. Chart auto-refreshes every 30 seconds
5. Customer sends message via `POST /support/send`
6. Backend auto-generates response after 2 seconds
7. Frontend reloads messages to show response
8. Admin can view all messages and respond via admin endpoints
9. Admin resolves ticket, which updates interaction statistics

## Files Modified/Created

**Created:**
- `backend_fold/models/supportMessage.js`
- `backend_fold/models/supportInteraction.js`
- `backend_fold/routes/support.js`

**Modified:**
- `backend_fold/routes/index.js` - Added support routes
- `frontend/src/pages/Dashboard.jsx` - Integrated backend API calls

## Next Steps

- Optional: Create admin panel for support ticket management
- Optional: Add email notifications for new support tickets
- Optional: Implement real-time WebSocket updates for live chat
- Optional: Add file attachment support for support messages
