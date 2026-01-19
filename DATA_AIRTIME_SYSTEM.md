# Data & Airtime Purchase System

Complete implementation for users to buy data and airtime bundles using their Earnflow balance.

## Features Implemented

### ✅ Frontend Features
- **Buy Data & Airtime Page** - Dedicated page to purchase data/airtime packages
  - Tab switching between Data and Airtime
  - Real-time balance display
  - Package selection grid
  - Phone number input
  - Purchase confirmation with summary
  - Recent transaction history with status badges

- **Admin Package Management** - Admin dashboard to manage all packages
  - View all active data and airtime packages
  - Create new packages with full details
  - Deactivate packages
  - Organized by type (Data/Airtime) and provider

- **Navigation Integration**
  - Added "Buy Data & Airtime" to sidebar navigation
  - Accessible only to verified users
  - Direct route at `/buy-data-airtime`
  - Admin access at `/admin/data-airtime-packages`

### ✅ Backend Features
- **Database Models**
  - `DataAirtimePackage` - Package definitions (name, type, provider, price, balance)
  - `DataAirtimeTransaction` - Purchase history with transaction tracking

- **API Endpoints** (15 total)

  **User Endpoints:**
  - `GET /data-airtime/packages/data` - Get all active data packages
  - `GET /data-airtime/packages/airtime` - Get all active airtime packages
  - `POST /data-airtime/buy/data` - Purchase data bundle
  - `POST /data-airtime/buy/airtime` - Purchase airtime bundle
  - `GET /data-airtime/transactions/history` - Get purchase history
  - `GET /data-airtime/stats` - Get monthly statistics

  **Admin Endpoints:**
  - `GET /data-airtime/admin/packages` - View all packages (admin only)
  - `POST /data-airtime/admin/packages` - Create new package (admin only)
  - `DELETE /data-airtime/admin/packages/:id` - Deactivate package (admin only)

### ✅ Transaction Processing
- Automatic balance deduction on purchase
- Transaction reference generation
- Status tracking (pending → success/failed)
- Detailed transaction logging with phone number
- Dual transaction records (DataAirtimeTransaction + main Transaction)

## File Structure

### Backend
```
backend_fold/
  models/
    dataAirtimePackage.js      # Package schema
    dataAirtimeTransaction.js   # Transaction schema
  routes/
    dataAirtime.js             # All API endpoints
  scripts/
    seedPackages.js            # Sample data seed script
```

### Frontend
```
frontend/src/
  pages/
    BuyDataAirtime.jsx         # User purchase page
    AdminDataAirtimePackages.jsx # Admin management
  components/
    Layout.jsx                  # Added to sidebar navigation
  App.jsx                       # Added routes
```

## Setup Instructions

### 1. Seed Sample Packages (Backend)
```bash
cd backend_fold
node scripts/seedPackages.js
```

This creates:
- **Data packages**: MTN, Airtel, Glo (100MB, 500MB, 1GB, 2GB)
- **Airtime packages**: MTN, Airtel, Glo, 9mobile (₦100, ₦200, ₦500, ₦1000)

### 2. Access Admin Dashboard
1. Login as admin user
2. Navigate to Sidebar → "Data & Airtime" (under Admin section)
3. Click "New Package" to add custom packages

### 3. User Can Purchase
1. Login as regular user
2. Click "Buy Data & Airtime" from sidebar
3. Select Data or Airtime tab
4. Choose package and phone number
5. Confirm purchase
6. Balance deducted immediately

## API Request Examples

### Get Data Packages
```
GET /api/data-airtime/packages/data
```
**Response:**
```json
{
  "success": true,
  "packages": [
    {
      "_id": "...",
      "name": "1GB Data",
      "type": "data",
      "provider": "MTN",
      "amount": 350,
      "balance": 1024,
      "description": "MTN 1GB Data Pack",
      "icon": "📱",
      "active": true
    }
  ]
}
```

### Buy Data
```
POST /api/data-airtime/buy/data
Content-Type: application/json

{
  "packageId": "...",
  "phoneNumber": "08012345678"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Data purchase successful!",
  "transaction": {
    "ref": "DATA-abc123-1705680000000",
    "package": "1GB Data",
    "amount": 350,
    "data": 1024,
    "previousBalance": 5000,
    "newBalance": 4650
  }
}
```

### Get User Statistics
```
GET /api/data-airtime/stats
```
**Response:**
```json
{
  "success": true,
  "stats": {
    "totalDataSpent": 1050,
    "totalAirtimeSpent": 800,
    "totalDataBought": 2560,
    "totalAirtimeBought": 1800,
    "dataTransactionCount": 3,
    "airtimeTransactionCount": 2,
    "lastDataPurchase": {...},
    "lastAirtimePurchase": {...}
  }
}
```

### Admin: Create Package
```
POST /api/data-airtime/admin/packages
Content-Type: application/json
Authorization: Bearer {adminToken}

{
  "name": "3GB Data",
  "type": "data",
  "provider": "MTN",
  "amount": 900,
  "balance": 3072,
  "description": "MTN 3GB Data Pack",
  "icon": "📱"
}
```

## Database Collections

### DataAirtimePackage
```javascript
{
  _id: ObjectId,
  name: String,
  type: 'data' | 'airtime',
  provider: 'MTN' | 'Airtel' | 'Glo' | '9mobile',
  amount: Number,              // Price in naira
  balance: Number,             // MB (data) or ₦ (airtime)
  description: String,
  icon: String,
  active: Boolean,
  createdAt: Date
}
```

### DataAirtimeTransaction
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  userName: String,
  userEmail: String,
  type: 'data' | 'airtime',
  packageId: ObjectId,
  packageName: String,
  provider: String,
  amount: Number,
  balance: Number,
  phoneNumber: String,
  status: 'pending' | 'success' | 'failed' | 'refunded',
  transactionRef: String,
  previousBalance: Number,
  newBalance: Number,
  errorMessage: String,
  createdAt: Date,
  completedAt: Date
}
```

## Usage Flow

### User Purchase Flow
1. **View Packages** → GET `/packages/data` or `/packages/airtime`
2. **Select Package** → Display package details
3. **Enter Phone** → User provides phone number
4. **Purchase** → POST `/buy/data` or `/buy/airtime`
5. **Update Balance** → Frontend refreshes/redirects to show new balance
6. **View History** → GET `/transactions/history` shows purchase record

### Admin Flow
1. **Login as Admin** → Verify admin role
2. **Navigate to Packages** → `/admin/data-airtime-packages`
3. **Create Package** → Fill form with details
4. **Submit** → POST `/admin/packages`
5. **View All** → GET `/admin/packages` displays all
6. **Deactivate** → DELETE `/admin/packages/:id`

## Dark Theme
- ✅ BuyDataAirtime page has full dark mode support
- ✅ AdminDataAirtimePackages page has full dark mode support
- ✅ Consistent with app theme using isDark context
- ✅ All form inputs, buttons, and cards styled for both themes

## Security Features
- ✅ Authentication required for all user endpoints
- ✅ Admin role verification for admin endpoints
- ✅ Phone number validation before purchase
- ✅ Balance verification before transaction
- ✅ Transaction reference generation for tracking
- ✅ Duplicate transaction model for audit trail

## Future Enhancements
1. **Real Integration**: Connect to actual MTN, Airtel API
2. **Webhook Verification**: Receive confirmation from providers
3. **Automatic Refunds**: Refund on provider failure
4. **SMS Notification**: Send transaction confirmation to user
5. **Transaction Receipt**: PDF download of receipts
6. **Bulk Purchase**: Buy multiple packages in one transaction
7. **Subscription Plans**: Monthly auto-renewal packages
8. **Analytics Dashboard**: Provider performance metrics
9. **Promo Codes**: Discount codes on packages
10. **Live Support**: Chat support for failed transactions

## Testing Checklist
- [ ] Create packages as admin
- [ ] View packages as user
- [ ] Purchase data with sufficient balance
- [ ] Purchase airtime with sufficient balance
- [ ] Verify balance deduction after purchase
- [ ] Check transaction history
- [ ] Deactivate package as admin
- [ ] Test with insufficient balance (error handling)
- [ ] Verify dark theme on both pages
- [ ] Test mobile responsiveness
- [ ] Verify admin-only access control
- [ ] Test phone number input validation
