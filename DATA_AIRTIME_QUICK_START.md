# Quick Start: Data & Airtime Purchase System

## What's New?
✅ Users can now buy **Data** and **Airtime** bundles using their Earnflow balance
✅ Admins can manage packages and create custom bundles
✅ Full dark theme support
✅ Transaction history tracking

---

## For Users

### How to Buy Data/Airtime

1. **Login** to your Earnflow account
2. **Navigate** to "Buy Data & Airtime" from the sidebar
3. **Switch Tab** between "📱 Buy Data" or "📞 Buy Airtime"
4. **Select Package** - Click on the package you want to purchase
5. **Enter Phone Number** - Your mobile number
6. **Confirm** - Click "Confirm Purchase"
7. **Done!** - Balance deducted immediately

### Supported Providers
- **Data**: MTN, Airtel, Glo (100MB to 2GB)
- **Airtime**: MTN, Airtel, Glo, 9mobile (₦100 to ₦1,000)

### Features
- 📊 View your statistics (total spent, total bought)
- 📜 Recent transaction history with status
- 💰 Real-time balance display
- 🔄 Live package updates every 30 seconds

---

## For Admins

### How to Manage Packages

1. **Login** as admin
2. **Navigate** to "Data & Airtime" (in Admin section of sidebar)
3. **Create Package**
   - Click "+ New Package"
   - Fill in details:
     - **Name**: e.g., "1GB Data"
     - **Type**: Data or Airtime
     - **Provider**: MTN, Airtel, Glo, 9mobile
     - **Price**: Cost in naira (₦)
     - **Amount**: MB (data) or ₦ value (airtime)
     - **Description** (optional)
     - **Icon** (optional emoji)
   - Click "Create Package"

4. **View Packages**
   - Data Packages section shows all data bundles
   - Airtime Packages section shows all airtime bundles
   - Organized by provider

5. **Deactivate Package**
   - Click "Deactivate" button on any package
   - Package will no longer appear to users

### Seed Sample Packages (First Time Setup)

Run this command to populate database with sample packages:

```bash
cd backend_fold
node scripts/seedPackages.js
```

This adds:
- 12 data packages (MTN, Airtel, Glo)
- 16 airtime packages (MTN, Airtel, Glo, 9mobile)

---

## Technical Details

### New Files Created
```
Backend:
  ✓ models/dataAirtimePackage.js
  ✓ models/dataAirtimeTransaction.js
  ✓ routes/dataAirtime.js
  ✓ scripts/seedPackages.js

Frontend:
  ✓ pages/BuyDataAirtime.jsx
  ✓ pages/AdminDataAirtimePackages.jsx
```

### New Routes
- **User**: `/buy-data-airtime`
- **Admin**: `/admin/data-airtime-packages`

### API Endpoints
- `GET /api/data-airtime/packages/data` - List data packages
- `GET /api/data-airtime/packages/airtime` - List airtime packages
- `POST /api/data-airtime/buy/data` - Purchase data
- `POST /api/data-airtime/buy/airtime` - Purchase airtime
- `GET /api/data-airtime/transactions/history` - Purchase history
- `GET /api/data-airtime/stats` - User statistics
- `GET /api/data-airtime/admin/packages` - Admin view all
- `POST /api/data-airtime/admin/packages` - Admin create
- `DELETE /api/data-airtime/admin/packages/:id` - Admin deactivate

---

## How Transactions Work

1. **User purchases** → Balance checked
2. **Amount deducted** → Balance updated immediately
3. **Transaction recorded** → Stored in database
4. **Status updated** → Marked as "success"
5. **History available** → User can view in transaction list

### Transaction Info Stored
- User details (name, email, phone)
- Package details (name, provider, amount)
- Balance before/after
- Status and timestamp
- Reference ID for tracking

---

## Example Packages

### Data Bundles (₦50 - ₦650)
| Provider | Package | Price | Data |
|----------|---------|-------|------|
| MTN | 100MB | ₦50 | 100MB |
| MTN | 500MB | ₦200 | 500MB |
| MTN | 1GB | ₦350 | 1GB |
| MTN | 2GB | ₦650 | 2GB |

### Airtime Bundles (₦100 - ₦1,000)
| Provider | Package | Price | Value |
|----------|---------|-------|-------|
| MTN | ₦100 | ₦100 | ₦100 |
| MTN | ₦500 | ₦500 | ₦500 |
| MTN | ₦1,000 | ₦1,000 | ₦1,000 |

---

## Troubleshooting

### "Insufficient balance" Error
- ✓ Check your current balance at top of page
- ✓ Complete a task or withdraw to increase balance
- ✓ Select a lower-priced package

### "Package not found" Error
- ✓ Package may have been deactivated
- ✓ Refresh page to get latest packages
- ✓ Try selecting a different package

### Transaction Not Showing
- ✓ Refresh the page
- ✓ Check "Recent Transactions" section
- ✓ Wait 30 seconds for auto-refresh

### Can't See "Buy Data & Airtime"
- ✓ Must be verified user (check email verification)
- ✓ Must be logged in
- ✓ Navigate via sidebar or URL: `/buy-data-airtime`

---

## Support
For issues or questions:
- 💬 Use the Customer Support page
- 📧 Email support team
- 🐛 Report bugs in admin dashboard

---

**Version**: 1.0.0  
**Last Updated**: January 2026
