# Complete Deployment Guide for Security-Hardened Flowearn

## Phase 1: Pre-Deployment Verification

### 1.1 Verify All Files Created Correctly

```bash
# Check all new security files exist
ls -la backend_fold/middleweres/rateLimiter.js
ls -la backend_fold/middleweres/inputValidation.js
ls -la backend_fold/models/auditLog.js
ls -la backend_fold/models/walletTransaction.js
ls -la backend_fold/models/walletHold.js
ls -la backend_fold/models/device.js
ls -la backend_fold/models/withdrawalRequest.js
ls -la backend_fold/services/fraudDetection.js
ls -la backend_fold/services/deviceFingerprint.js
```

### 1.2 Verify Syntax

```bash
cd backend_fold
node -c server.js              # Check server.js syntax
node -c controllers/withdrawController.js  # Check withdrawController
node -c controllers/authController.js      # Check authController
```

All should return `undefined` (no error).

### 1.3 Check Package.json

```bash
npm list | grep -E "rate-limit|validator|sanitize|hpp|node-cron"
```

Expected output shows:
- express-rate-limit@8.x
- express-validator@7.x
- express-mongo-sanitize@2.x
- hpp@0.2.x
- node-cron@4.x
- speakeasy@2.x
- qrcode@1.x
- redis@5.x

---

## Phase 2: Local Development Setup

### 2.1 Install Dependencies

```bash
cd backend_fold
npm install

# If any packages missing, install manually:
npm install express-rate-limit express-validator express-mongo-sanitize hpp node-cron speakeasy qrcode redis

# Verify installation
npm list express-rate-limit
```

### 2.2 Environment Variables

Create `.env` file in `backend_fold/`:

```bash
# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/flowearn

# Security
JWT_SECRET=your-super-secret-key-change-in-production-min-32-chars
SESSION_SECRET=your-session-secret-key-min-32-chars

# Email
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx

# OAuth (Twitter)
TWITTER_OAUTH1_CONSUMER_KEY=your_consumer_key
TWITTER_OAUTH1_CONSUMER_SECRET=your_consumer_secret
TWITTER_OAUTH1_CALLBACK_URL=http://localhost:10000/auth/twitter/callback

# Environment
NODE_ENV=development
PORT=10000

# Client URL
CLIENT_URL=http://localhost:5173
```

### 2.3 Database Indexes

The new security models require indexes. Add to your MongoDB connection setup:

```javascript
// In dbConfig.js or after connection:
const AuditLog = require('../models/auditLog');
const WalletTransaction = require('../models/walletTransaction');
const WalletHold = require('../models/walletHold');
const Device = require('../models/device');
const WithdrawalRequest = require('../models/withdrawalRequest');

// Create indexes
AuditLog.collection.createIndex({ userId: 1, createdAt: 1 });
AuditLog.collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days
WalletTransaction.collection.createIndex({ wallet: 1, createdAt: -1 });
WalletHold.collection.createIndex({ wallet: 1, expiresAt: 1 });
Device.collection.createIndex({ user: 1, fingerprintHash: 1 });
WithdrawalRequest.collection.createIndex({ user: 1, createdAt: -1 });
```

### 2.4 Test Locally

```bash
# Start development server
npm start

# Expected output:
# Server running on port 10000
# [Cron] Running wallet hold auto-release job...
```

### 2.5 Test Endpoints

```bash
# Test registration (should enforce 12-char password with special chars)
curl -X POST http://localhost:10000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phoneNumber": "09012345678",
    "password": "SecurePass1!"
  }'

# Test login
curl -X POST http://localhost:10000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass1!"
  }'

# Test withdrawal (should require PIN)
curl -X POST http://localhost:10000/api/withdraw/request \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_TOKEN_HERE" \
  -d '{
    "amount": 5000,
    "accountNumber": "1234567890",
    "bankCode": "001",
    "pin": "1234"
  }'
```

---

## Phase 3: Testing Security Features

### 3.1 Test Rate Limiting

```bash
# Test: Send 6 login attempts in 15 minutes (limit is 5)
for i in {1..6}; do
  echo "Attempt $i:"
  curl -X POST http://localhost:10000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test@example.com",
      "password": "WrongPass123!"
    }'
  sleep 1
done

# 6th request should return 429 (Too Many Requests)
```

### 3.2 Test OTP System

```bash
# Register new user
curl -X POST http://localhost:10000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "OTP Test",
    "email": "otp@test.com",
    "phoneNumber": "09087654321",
    "password": "TestPass123!"
  }'

# Copy the token from response
# Check email for 8-digit OTP

# Verify with wrong OTP (attempt 1)
curl -X POST http://localhost:10000/api/auth/verify \
  -H "Content-Type: application/json" \
  -H "Cookie: token=SAVED_TOKEN" \
  -d '{"otp": "12345678"}'

# Try again (attempts 2-3)
# This follows same failed attempts

# 4th attempt should be blocked with "Too many failed attempts"
```

### 3.3 Test Atomic Transactions

Use this test script to verify double-spending prevention:

```javascript
// test-atomicity.js
const axios = require('axios');

async function testConcurrentWithdrawals() {
  const token = 'YOUR_TOKEN_HERE';
  const config = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };

  const withdrawal = {
    amount: 5000,
    accountNumber: '1234567890',
    bankCode: '001',
    pin: '1234'
  };

  try {
    // Send 2 concurrent requests
    const results = await Promise.all([
      axios.post('http://localhost:10000/api/withdraw/request', withdrawal, config),
      axios.post('http://localhost:10000/api/withdraw/request', withdrawal, config)
    ]);

    console.log('Request 1:', results[0].data);
    console.log('Request 2:', results[1].data);

    // Expected: One succeeds, one fails with "insufficient balance"
    // NOT: Both succeed (overflow)
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

testConcurrentWithdrawals();

// Run with: node test-atomicity.js
```

### 3.4 Test Fraud Detection

```bash
# Create a user account and complete many tasks rapidly
# Then attempt a large withdrawal

# This should trigger manual review instead of instant approval
curl -X POST http://localhost:10000/api/withdraw/request \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100000,
    "accountNumber": "1234567890",
    "bankCode": "001",
    "pin": "1234"
  }' \
  -H "Cookie: token=SUSPICIOUS_ACCOUNT_TOKEN"

# Response should include: "pending_review" status
```

### 3.5 Test Input Validation

```bash
# Test: Invalid OTP (not 8 digits)
curl -X POST http://localhost:10000/api/auth/verify \
  -d '{"otp": "123"}' \
  -H "Content-Type: application/json" \
  -H "Cookie: token=TOKEN"

# Should get validation error

# Test: Invalid withdrawal amount
curl -X POST http://localhost:10000/api/withdraw/request \
  -d '{
    "amount": 100,
    "accountNumber": "1234567890",
    "bankCode": "001",
    "pin": "1234"
  }' \
  -H "Content-Type: application/json"

# Should get: "Amount must be between 500 and 1,000,000"
```

---

## Phase 4: Production Deployment

### 4.1 Environment Configuration

Update `.env` file for production:

```bash
# Production MUST use strong random secrets
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)

# Use production database
MONGO_URI=mongodb+srv://prod-user:prod-password@prod-cluster.mongodb.net/flowearn-prod

# Production URLs
NODE_ENV=production
CLIENT_URL=https://earnflow.onrender.com
TWITTER_OAUTH1_CALLBACK_URL=https://earnflow.onrender.com/auth/twitter/callback
```

### 4.2 Database Optimization

```bash
# In production, ensure indexes created:
mongo <<EOF
use flowearn-prod
db.auditlogs.createIndex({ userId: 1, createdAt: 1 })
db.auditlogs.createIndex({ createdAt: 1 }, { expireAfterSeconds: 7776000 })
db.wallettransactions.createIndex({ wallet: 1, createdAt: -1 })
db.walletholds.createIndex({ wallet: 1, expiresAt: 1 })
db.devices.createIndex({ user: 1, fingerprintHash: 1 })
db.withdrawalrequests.createIndex({ user: 1, createdAt: -1 })
EOF
```

### 4.3 Deploy to Production

#### Option A: Render.com (Current)

```bash
# Push to GitHub
git add .
git commit -m "Security hardening: atomic transactions, rate limiting, fraud detection"
git push origin main

# Render auto-deploys on push
# Verify deployment at: https://earnflow.onrender.com
```

#### Option B: Heroku

```bash
# Set environment variables
heroku config:set JWT_SECRET=$(openssl rand -base64 32)
heroku config:set SESSION_SECRET=$(openssl rand -base64 32)
heroku config:set NODE_ENV=production

# Deploy
git push heroku main

# Check logs
heroku logs --tail
```

#### Option C: Docker

```bash
# Create Dockerfile
cat > Dockerfile <<'EOF'
FROM node:18-alpine
WORKDIR /app
COPY backend_fold/package*.json ./
RUN npm install
COPY backend_fold .
CMD ["npm", "start"]
EOF

# Build and run
docker build -t flowearn-api .
docker run -p 10000:10000 --env-file .env flowearn-api

# Verify
curl http://localhost:10000
```

### 4.4 Production Verification

```bash
# Test that server is running
curl -s https://earnflow.onrender.com/api/health || echo "Health check failed"

# Check logs for errors
# On Render: https://dashboard.render.com → your-project → Logs

# Monitor audit logs in MongoDB
mongo <<EOF
use flowearn-prod
db.auditlogs.find().sort({createdAt: -1}).limit(10)
EOF

# Check for any errors
db.auditlogs.find({severity: "high"}).count()
```

### 4.5 Monitoring & Alerts

Set up monitoring for:

1. **High Fraud Scores**: Alert if average fraud score > 50
2. **Failed Transactions**: Alert if withdrawal failure rate > 1%
3. **Rate Limit Hits**: Track if legitimate users hitting rate limits
4. **Memory Usage**: Monitor node process memory
5. **Response Times**: Track API latency

```javascript
// Add to server.js:
const monitor = {
  fraudScores: [],
  failedTxns: 0,
  successfulTxns: 0
};

// Log metrics every 1 hour
setInterval(() => {
  const avgFraud = monitor.fraudScores.length > 0 
    ? monitor.fraudScores.reduce((a,b) => a+b) / monitor.fraudScores.length 
    : 0;
  const failureRate = monitor.failedTxns / (monitor.failedTxns + monitor.successfulTxns);
  
  console.log('[METRICS]', { avgFraud, failureRate, uptime: process.uptime() });
}, 3600000);
```

---

## Phase 5: Post-Deployment Tasks

### 5.1 Update Documentation

- [ ] Update API documentation with new endpoints
- [ ] Document PIN requirement for withdrawals
- [ ] Document rate limits for client-side UI
- [ ] Update user FAQ with OTP/2FA flow

### 5.2 Notify Users

- [ ] Send email: "Security improvements - withdrawal now requires PIN"
- [ ] Add in-app notification about new security features
- [ ] Update Terms of Service if needed

### 5.3 Training

- [ ] Train support team on manual withdrawal review process
- [ ] Brief admin on fraud detection alerts
- [ ] Document escalation procedures for suspicious activity

### 5.4 Monitoring Setup

- [ ] Data dog / New Relic monitoring configured
- [ ] Alerts set for critical errors
- [ ] Daily audit log review process established
- [ ] Backup and disaster recovery plan updated

---

## Phase 6: Ongoing Maintenance

### 6.1 Weekly Tasks

```bash
# Check rate limit effectiveness
# Users should not be hitting limits legitimately
mongo <<EOF
use flowearn
db.auditlogs.find({action: "rate_limit_hit"}).count()
EOF

# Monitor fraud scores
db.auditlogs.find({fraudScore: {$gte: 50}}).count()

# Check failed withdrawals
db.auditlogs.find({action: "withdrawal_failed"}).count()
```

### 6.2 Monthly Tasks

```bash
# Purge old audit logs (90-day TTL auto-expires)
# Verify cron job is working:
mongo <<EOF
use flowearn
db.auditlogs.find({createdAt: {$lt: new Date(Date.now() - 90*24*60*60*1000)}}).count()
EOF

# Should be 0 (TTL expired them)
```

### 6.3 Quarterly Review

- [ ] Review fraud detection algorithm effectiveness
- [ ] Audit lock patterns and adjust rate limits if needed
- [ ] Security vulnerability scan
- [ ] Update dependencies
- [ ] Penetration testing (optional)

---

## Troubleshooting

### Issue: "Rate limit exceeded" for legitimate users

**Solution:** Adjust limits in `middleweres/rateLimiter.js`

```javascript
// Increase from 5 to 10 attempts per 15 minutes
min: 15,        // 15 minutes
max: 10,        // 10 attempts instead of 5
```

### Issue: Withdrawals timing out

**Solution:** Check MongoDB transactions support

```bash
# Verify MongoDB version (needs 4.0+)
mongo <<EOF
db.version()
EOF

# Verify replication set configured
rs.status()
```

### Issue: Cron job not running

**Solution:** Check node-cron logs

```javascript
// Add debugging to server.js cron:
cron.schedule('0 * * * *', async () => {
  console.log('[Cron] Release job started at:', new Date());
  // ... rest of code
  console.log('[Cron] Release job completed');
}, {
  timezone: "UTC"
});
```

### Issue: OTP emails not sent

**Solution:** Verify Resend API key

```bash
# Test Resend API
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer YOUR_RESEND_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "Earn-Flow <noreply@earnflow.onrender.com>",
    "to": "test@example.com",
    "subject": "Test Email",
    "html": "<p>Test</p>"
  }'
```

### Issue: Device fingerprinting not matching

**Solution:** Debug fingerprinting service

```javascript
// Add to services/deviceFingerprint.js:
function generateDeviceFingerprint(req) {
  console.log('Fingerprint input:', {
    userAgent: req.get('user-agent'),
    acceptLanguage: req.get('accept-language'),
    ip: req.ip
  });
  // ... rest of code
}
```

---

## Quick Rollback Plan

If critical issues found post-deployment:

```bash
# 1. Identify issue from logs
# 2. Revert to previous commit
git revert HEAD
git push

# 3. If database corrupted, restore from backup
# MongoDB Atlas automatic backups available

# 4. Temporary disable security features if needed:
# Comment out in server.js:
// app.use(mongoSanitize());
// app.use(hpp());
# Then: git push (emergency only)
```

---

## Success Criteria

After deployment, verify:

- [ ] All users must verify email before withdrawal
- [ ] All withdrawals require 4-6 digit PIN
- [ ] OTP is 8 digits, expires in 5 minutes
- [ ] Rate limiting active (5 login attempts/15min)
- [ ] Fraud detection blocking suspicious withdrawals
- [ ] Concurrent withdrawals don't cause overflow
- [ ] Cron job releases expired holds hourly
- [ ] Audit logs recording all actions
- [ ] Device fingerprinting tracking new devices
- [ ] Input validation rejecting invalid requests

If all above pass ✅ **DEPLOYMENT SUCCESSFUL**

---

Status: Ready for Production Deployment ✅