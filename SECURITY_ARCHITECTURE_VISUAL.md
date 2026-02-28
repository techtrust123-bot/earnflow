# SECURITY ARCHITECTURE REDESIGN - VISUAL REFERENCE

## Current vs. Secure Architecture

### ❌ CURRENT INSECURE FLOW

```
User Login Request
    ↓
[NO RATE LIMIT]  ← Vulnerable to brute force
    ↓
Verify Password (bcrypt) ✓
    ↓
Issue 24-hour JWT
    ↓
[NO TOKEN REVOCATION]  ← Compromised token valid for 24 hours
    ↓
User can immediately:
  - Withdraw ← [NO ACCOUNT VERIFICATION CHECK]
  - Complete tasks ← [NO FRAUD CHECK]
  - Access all resources
    ↓
Withdrawal Request
    ↓
Check Balance (OUTSIDE transaction) ← RACE CONDITION
    ↓
    ├─ Thread 1: balance = 100 ✓
    ├─ Thread 2: balance = 100 ✓ (same balance!)
    ↓
Debit balance (OUTSIDE transaction) ← DOUBLE SPENDING
    ↓
    ├─ Thread 1: balance = 100 - 100 = 0
    ├─ Thread 2: balance = 100 - 100 = 0
    ↓
Both threads think they succeeded
Both withdrawals go through
Total: 200 transferred from 100 balance!
```

### ✅ SECURE REDESIGNED FLOW

```
User Login Request
    ↓
[RATE LIMITED] ← 5 attempts per 15 min, per email
    ↓
Verify Email (timing-safe) ✓
    ↓
Verify Password (bcrypt) ✓
    ↓
[2FA CHECK]
    ├─ NOT ENABLED → Warn user
    ├─ ENABLED → Send TOTP challenge
    └─ User enters authenticator code ✓
    ↓
Issue Short-Lived Tokens:
    ├─ Access Token: 30 minutes
    ├─ Refresh Token: 7 days (stored in DB)
    └─ JTI (JWT ID): Track token in database ✓
    ↓
[DEVICE FINGERPRINTING]
    ├─ New device? Send verification code
    ├─ Until verified = Limited access
    └─ Mark device as trusted
    ↓
User Logged In (Limited Permissions)
    ↓
User Requests Withdrawal
    ↓
[RATE PROTECTED] ← 3 per hour
    ↓
[INPUT VALIDATION SCHEMA]
    ├─ Amount: 500-1,000,000 ✓
    ├─ Account: exactly 10 digits ✓
    ├─ BankCode: required ✓
    └─ PIN: required ✓
    ↓
[ACCOUNT VERIFICATION CHECK]
    ├─ Email verified? Yes ✓
    └─ Phone verified? Yes ✓
    ↓
[TRANSACTION PIN VERIFICATION]
    └─ Pin matches hash → Yes ✓
    ↓
[FRAUD SCORING]
    ├─ Account age: NEW ← ⚠️ +25 points
    ├─ Task completion: HIGH ← ⚠️ +30 points
    ├─ Withdrawal history: NONE ← ⚠️ +15 points
    └─ Total: 70 (HIGH risk)
    ↓
[RISK ASSESSMENT]
    ├─ Score >= 80? BLOCK
    ├─ Score 50-80? Manual review required
    └─ Score < 50? Proceed
    ↓
Create Manual Review Request
    ↓
Admin Review Dashboard
    ├─ Risk factors displayed
    ├─ User history shown
    ├─ Admin can APPROVE/DENY/HOLD
    └─ Every decision logged
    ↓
Once Approved → MongoDB Transaction Starts
    ↓
    ┌─────────────────────────────────┐
    │  ATOMIC TRANSACTION (Session)   │
    │                                 │
    │ 1. Lock wallet/balance          │
    │ 2. Check balance inside txn ✓   │
    │    (prevents race condition)    │
    │ 3. Create transaction record    │
    │ 4. Create withdrawal hold       │
    │ 5. Debit balance atomically     │
    │ 6. Commit all or nothing        │
    │                                 │
    └─────────────────────────────────┘
    ↓
Funds marked as "pending" (in hold)
    ↓
Initiate Bank Transfer
    ├─ Via Paystack/Monnify
    ├─ 48-hour hold if fails
    └─ Funds auto-released if not committed
    ↓
[WEBHOOK VERIFICATION]
    ├─ Signature validation ✓
    ├─ HMAC verification ✓
    └─ Idempotency check ✓
    ↓
Transfer Succeeded?
    ├─ YES → Mark transaction COMMITTED
    ├─ NO → Mark transaction FAILED
    └─ Funds held, admin can reverse
    ↓
[AUDIT LOG ENTRY]
    ├─ Action: withdrawal_success
    ├─ Amount, reference, account (masked)
    ├─ IP address, user agent
    └─ Timestamp
    ↓
Notification Sent
    ├─ Email confirmation
    ├─ SMS notification
    └─ In-app alert
```

---

## Database Schema Evolution

### Current (Multiple Balance Locations)

```
User Collection:
├── _id
├── email
├── password
├── balance ← Balance location 1 (implicit field)
├── totalDebited
├── createdAt
└── ...

Wallet Collection:
├── _id
├── user_id (ref)
├── balance ← Balance location 2 (explicit)
├── totalCredited
├── totalDebited
└── lastTransaction

⚠️ PROBLEM: Two sources of truth for balance!
   Can be out of sync, allowing double-spending
```

### Redesigned (Single Source of Truth)

```
User Collection:
├── _id
├── email
├── password
├── phoneNumber
├── isAccountVerify
├── twoFAEnabled
├── twoFASecret (encrypted)
├── transactionPin (hashed)
├── accountStatus: ['active', 'suspended', 'deleted']
├── withdrawalSettings
│   ├── dailyLimit: 50000
│   ├── totalWithdrawalsToday: 0
│   └── lastWithdrawalDate
├── createdAt
├── lastActive
└── ...

Wallet Collection:
├── _id
├── user_id (unique index)
├── balance ← SINGLE SOURCE OF TRUTH
├── availableBalance (balance - holds)
├── totalCredited
├── totalDebited
├── lastTransaction
└── ...

WalletTransaction Collection (Immutable Audit Log):
├── _id
├── wallet_id
├── type: ['credit', 'debit', 'hold', 'release']
├── amount
├── status: ['pending', 'committed', 'reversed']
├── balanceBefore
├── balanceAfter
├── commitmentHash ← Tampering detection
├── description
├── reference (unique index)
├── metadata
├── ipAddress
├── userAgent
├── createdAt
└── [IMMUTABLE - never changes after commit]

WalletHold Collection (Funds Reserved):
├── _id
├── wallet_id
├── transaction_id
├── amount
├── reason
├── status: ['active', 'released', 'forfeited']
├── expiresAt (auto-release if expired)
└── ...

AuditLog Collection (All Actions):
├── _id
├── user_id (index)
├── action: ['login', 'withdrawal', 'task_complete', ...]
├── status: ['success', 'failure']
├── details (JSON)
├── ipAddress
├── userAgent
├── severity: ['low', 'medium', 'high', 'critical']
├── createdAt (TTL: 90 days)
└── ...

Device Collection (Track Devices):
├── _id
├── user_id
├── fingerprint (JSON)
├── fingerprintHash
├── trustStatus: ['trusted', 'suspicious', 'blocked']
├── lastUsed
├── firstSeen
├── approvedAt
└── ...

WithdrawalRequest Collection (Manual Reviews):
├── _id
├── user_id
├── amount
├── accountNumber (encrypted)
├── bankCode
├── status: ['pending_review', 'approved', 'denied', 'completed']
├── reason (why requires review)
├── riskScore
├── riskFactors: []
├── reviewedBy (admin_id)
├── reviewedAt
├── createdAt
└── ...

FraudIncident Collection (Fraud Investigation):
├── _id
├── user_id
├── taskId
├── fraudScore
├── fraudIndicators: []
├── action: ['flagged', 'suspended', 'investigated']
├── notes
├── createdAt
└── ...

TokenRecord Collection (Token Tracking):
├── _id
├── user_id (index)
├── jti (JWT ID, unique)
├── type: ['access', 'refresh']
├── issuedAt
├── expiresAt (TTL index)
├── revokedAt
├── userAgent
├── ipAddress
└── ...
```

---

## Authentication Flow - New Multi-Layer Design

```
                    ┌─────────────────────────────────────┐
                    │  USER LOGIN/REGISTER REQUEST        │
                    └──────────────┬──────────────────────┘
                                   │
                                   ↓
                    ┌─────────────────────────────────────┐
                    │  RATE LIMIT CHECK (Express-Limiter) │
                    │  5 attempts per 15 min per email    │
                    └──────────────┬──────────────────────┘
                                   │
                    ┌──────────────┴──────────────────────┐
                    │                                    │
                   YES                                  NO
                    │                                    │
                    ↓                                    ↓
          Continue                              429 Too Many Requests


                    ┌─────────────────────────────────────┐
                    │  EMAIL & PASSWORD VERIFICATION      │
                    │  - Bcrypt compare (timing-safe)     │
                    │  - Generic error messages           │
                    └──────────────┬──────────────────────┘
                                   │
                    ┌──────────────┴──────────────────────┐
                    │                                    │
         Match (Registered)              No Match (Unregistered)
                    │                                    │
                    ↓                                    ↓
              Continue                       401 Invalid Credentials
                                             (No email enumeration)


          For NEW REGISTRATION:
                    │
                    ↓
      ┌─────────────────────────────────────┐
      │  GENERATE OTP                       │
      │  - 8-digit (not 6)                  │
      │  - Hash for storage                 │
      │  - Send via Email + SMS             │
      │  - 5-min expiry (not 10)            │
      └─────────────────────────────────────┘
                    │
                    ↓
      ┌─────────────────────────────────────┐
      │  EMAIL VERIFICATION (OTP)           │
      │  - Rate limit: 3 per min            │
      │  - Timing-safe comparison           │
      │  - Account lockout after 3 failures │
      │  - Track attempts across time window│
      └─────────────────────────────────────┘
                    │
      ┌─────────────┴──────────────────────┐
      │                                    │
     VALID                              INVALID/EXPIRED
      │                                    │
      ↓                                    ↓
 Mark as Verified                   Send new OTP or error


          For LOGIN:
                    │
                    ↓
      ┌─────────────────────────────────────┐
      │  CHECK: Account Verified?           │
      │  - Email verified: REQUIRED         │
      │  - Phone verified: REQUIRED         │
      │  (unless accessing read-only        │
      │   endpoints)                        │
      └─────────────────────────────────────┘
                    │
      ┌─────────────┴──────────────────────┐
      │                                    │
      YES                                NO
      │                                    │
      ↓                                    ↓
  Continue                        403 Verify email first


      ┌─────────────────────────────────────┐
      │  2FA CHECK                          │
      │  - Is 2FA enabled? (admin setting)  │
      │  - User has authenticator app?      │
      └─────────────────────────────────────┘
                    │
      ┌─────────────┴──────────────────────┐
      │                                    │
    ENABLED                           DISABLED
      │                                    │
      ↓                                    ↓
  Send TOTP Challenge              Warn user to enable
  User scans authenticator            (allow login but flag)
  Enters 6-digit code                     │
      │                                    ↓
      └────────────────────┬───────────────┘
                           │
                           ↓
      ┌─────────────────────────────────────┐
      │  DEVICE FINGERPRINTING              │
      │  - User agent                       │
      │  - IP address                       │
      │  - Accept-language                  │
      │  - Create hash                      │
      └─────────────────────────────────────┘
                    │
      ┌─────────────┴──────────────────────┐
      │                                    │
    NEW DEVICE                         KNOWN DEVICE
      │                                    │
      ↓                                    ↓
  Generate verification code         Update last_used
  Send via email                          │
  Request user verify device             ↓
  Limited access until verified      Continue


      ┌─────────────────────────────────────┐
      │  TOKEN GENERATION                   │
      │                                     │
      │  Access Token (JWT):                │
      │  ├─ Expires: 30 minutes             │
      │  ├─ Payload: user_id, role, jti    │
      │  ├─ Sign with SECRET                │
      │  └─ HttpOnly, Secure cookies        │
      │                                     │
      │  Refresh Token (JWT):               │
      │  ├─ Expires: 7 days                 │
      │  ├─ Payload: user_id, jti           │
      │  ├─ Sign with REFRESH_SECRET        │
      │  └─ HttpOnly, Secure, separate path │
      │                                     │
      │  JTI Record (Database):             │
      │  ├─ user_id, jti, issued_at        │
      │  ├─ expires_at, revoked_at (null)  │
      │  ├─ ip_address, user_agent         │
      │  └─ device_fingerprint             │
      │                                     │
      └─────────────────────────────────────┘
                    │
                    ↓
      ┌─────────────────────────────────────┐
      │  RETURN TO CLIENT                   │
      │  - Tokens in secure cookies         │
      │  - User data in JSON response       │
      │  - Setup reminder (2FA, PIN, etc)   │
      └─────────────────────────────────────┘


        SUBSEQUENT API REQUESTS:
                    │
                    ↓
      ┌─────────────────────────────────────┐
      │  MIDDLEWARE: Verify Token           │
      │  - Extract from cookie or header    │
      │  - Verify JWT signature             │
      │  - Check JTI in database            │
      │  - Check if revoked                 │
      │  - Check expiration                 │
      │  - Attach user to request           │
      └─────────────────────────────────────┘
                    │
      ┌─────────────┴──────────────────────┐
      │                                    │
     VALID                             INVALID/EXPIRED
      │                                    │
      ↓                                    ↓
  Continue with request          401 Unauthorized
                                 (Suggest refresh or relogin)


  TOKEN EXPIRATION (30 min):
                    │
                    ↓
      ┌─────────────────────────────────────┐
      │  Client detects ExpiredTokenError   │
      │  (from API response or JWT decode)  │
      │                                     │
      │  POST /auth/refresh                 │
      │  - Send refresh token (cookie)      │
      │  - Verify refresh token             │
      │  - Check token database record      │
      │  - Issue new access token (30 min)  │
      └─────────────────────────────────────┘
                    │
      ┌─────────────┴──────────────────────┐
      │                                    │
     SUCCESS                            FAILURE
      │                                    │
      ↓                                    ↓
  Return new access token         Delete all user sessions
  Continue work seamlessly        Force re-login
                                  (Possible account compromise)


  LOGOUT / TOKEN REVOCATION:
                    │
                    ↓
      ┌─────────────────────────────────────┐
      │  POST /auth/logout                  │
      │  - Extract JTI from token           │
      │  - Mark JTI revoked in database     │
      │  - Set revoked_at = now()           │
      │  - Clear cookies                    │
      └─────────────────────────────────────┘
                    │
                    ↓
      Token now fully invalid,
      even if JWT signature still valid.
```

---

## Withdrawal Risk Scoring Algorithm

```
RISK SCORE CALCULATION:

Base Score: 0

├─ ACCOUNT AGE
│  ├─ Brand new (< 1 day): +25 points
│  ├─ Very new (1-7 days): +15 points
│  └─ Fresh (7-30 days): +5 points
│
├─ VERIFICATION STATUS
│  ├─ Email unverified: +20 points
│  ├─ Phone unverified: +15 points
│  └─ No 2FA: +10 points
│
├─ WITHDRAWAL AMOUNT
│  ├─ Withdrawing 90-100% of balance: +30 points
│  ├─ Withdrawing 70-90% of balance: +15 points
│  └─ Large amount (> last avg): +10 points
│
├─ WITHDRAWAL HISTORY
│  ├─ First ever withdrawal: +15 points
│  ├─ New bank account (first time): +20 points
│  └─ Multiple withdrawals in 24h: +10 each
│
├─ TASK COMPLETION PATTERN
│  ├─ Very high daily tasks (>100): +35 points
│  ├─ Spike vs average (>5x normal): +25 points
│  └─ Many failed attempts (>50%): +20 points
│
├─ DEVICE / IP ANALYSIS
│  ├─ Many different IPs (>10 in 30d): +20 points
│  ├─ Impossible geographic movement: +40 points
│  └─ Many accounts on same IP: +35 points
│
├─ TIME PATTERN
│  ├─ Rapid withdrawal after task: +10 points
│  ├─ Withdrawal at unusual hour: +5 points
│  └─ All activity in narrow time window: +15 points
│
└─ HISTORICAL FLAGS
   ├─ Previous fraud attempt: +30 points
   ├─ Previous chargeback: +25 points
   └─ Suspended previously: +40 points


FINAL DECISION:

Score 0-24:    ✅ LOW RISK
               └─ Auto-approve

Score 25-49:   ⚠️  MEDIUM RISK
               ├─ May need phone verification
               ├─ Withdrawal limit reduced
               └─ Monitor transaction

Score 50-79:   🔴 HIGH RISK
               ├─ Manual review required (2-4 hours)
               ├─ Admin can approve/deny
               ├─ Multiple verification factors
               └─ Funds placed on hold

Score 80-100:  ⛔ CRITICAL RISK
               ├─ Block withdrawal immediately
               ├─ Flag account for investigation
               ├─ Notify user
               └─ Require support intervention


RISK INDICATORS REPORTED TO ADMIN:

{
  fraudScore: 65,
  riskLevel: "HIGH",
  indicators: [
    "brand_new_account",
    "high_task_completion_spike:120/day",
    "first_withdrawal",
    "new_bank_account",
    "many_ips:8"
  ],
  requiresApproval: true,
  suggestedAction: "manual_review"
}
```

---

## Attack Mitigation Matrix

| Attack Vector | Current State | Mitigated By | Status |
|---|---|---|---|
| Brute Force Login | ❌ No limit | Rate limiting (5/15min) | ✅ |
| OTP Brute Force | ❌ 1M combinations | Rate limiting (3/1min) + 8-digit | ✅ |
| Double Spending | ❌ Race condition | MongoDB transactions | ✅ |
| Token Theft | ❌ 24hr validity | 30-min expiry + device check | ✅ |
| Account Takeover | ❌ No 2FA | TOTP 2FA required | ✅ |
| Bot Task Completion | ❌ No detection | Fraud scoring + rate limit | ✅ |
| Referral Fraud | ❌ No controls | KYC + device tracking | 🔶 Partial |
| Screenshot Forge | ❌ No validation | Admin review + metadata check | 🔶 Partial |
| Unauthorized Withdrawal | ❌ No verification | PIN + device check + manual review | ✅ |
| Account Enumeration | ❌ Different errors | Generic error messages | ✅ |
| Session Fixation | ❌ No device binding | Device fingerprinting | ✅ |
| SQL Injection | ❌ Direct queries | Input validation (express-validator) | ✅ |
| CSRF | ❌ No tokens | CSRF middleware | 🔶 To-do |
| Chargeback Abuse | ❌ No holds | Escrow holds (48h) | ✅ |

---

## Scalability Considerations

### Redis Integration (Recommended for Production)

```javascript
// For rate limiting at scale:
npm install redis express-rate-limit-redis redis

const RedisStore = require('rate-limit-redis');
const redis = require('redis');
const client = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD
});

const authLimiter = rateLimit({
  store: new RedisStore({
    client: client,
    prefix: 'rl:auth:',
  }),
  windowMs: 15 * 60 * 1000,
  max: 5
});
```

### Caching Strategy

```javascript
// Cache user object for 5 minutes
const CACHE_TTL = 5 * 60;

exports.getCurrentUser = async (req, res) => {
  const cacheKey = `user:${req.user._id}`;
  
  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) return res.json(JSON.parse(cached));
  
  // If not cached, fetch and cache
  const user = await User.findById(req.user._id);
  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(user));
  
  res.json(user);
};
```

### Session Storage (Already Implemented)

```javascript
// Uses MongoDB via connect-mongo (already in server.js)
// Sessions auto-expire after 14 days
```

### Database Indexing Strategy

```javascript
// Ensure these indexes exist for performance:

// user.js
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ phoneNumber: 1 }, { unique: true, sparse: true });
db.users.createIndex({ lastActive: 1 });

// wallet.js
db.wallets.createIndex({ user: 1 }, { unique: true });

// transaction.js
db.transactions.createIndex({ user: 1, createdAt: -1 });
db.transactions.createIndex({ reference: 1 }, { unique: true });
db.transactions.createIndex({ status: 1 });

// auditlog.js
db.auditlogs.createIndex({ user: 1, createdAt: -1 });
db.auditlogs.createIndex({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days TTL

// device.js
db.devices.createIndex({ user: 1, fingerprintHash: 1 });
db.devices.createIndex({ user: 1, lastUsed: -1 });
```

---

## Monitoring Dashboard Metrics

Create admin dashboard showing:

```javascript
Real-Time Metrics:
├─ Active users (last 5 min)
├─ Successful transaction rate
├─ Failed transaction rate
├─ Average transaction time
├─ Rate limit hits (by endpoint)
├─ Failed login attempts
├─ OTP verification success rate
└─ Active fraud investigations

Fraud Dashboard:
├─ Users flagged today
├─ High-risk withdrawals (pending)
├─ Suspicious activity clusters
├─ Device fingerprint anomalies
├─ Geographic impossibilities
├─ Bot-like patterns detected
└─ Trending fraud indicators

Daily Reports:
├─ Total transactions
├─ Total volume (NGN)
├─ Success rate %
├─ Average withdrawal amount
├─ New user registrations
├─ Fraud score distribution
├─ Manual review queue
└─ Referral abuse attempts
```

---

## Compliance Checklist

- [ ] GDPR: User data deletion on request
- [ ] PCI-DSS: Don't store bank account unencrypted
- [ ] AML: Transaction reporting for large amounts
- [ ] KYC: User identity verification
- [ ] SOX: Financial controls and audit trail
- [ ] Data retention: Delete audit logs after 90 days
- [ ] Breach notification: Report within 72 hours
- [ ] Privacy policy: Updated for new systems
- [ ] Terms of service: Updated security policies

