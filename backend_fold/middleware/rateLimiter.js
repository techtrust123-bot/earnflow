const rateLimit = require('express-rate-limit');

// Helper: use express-rate-limit's ipKeyGenerator when available to be IPv6-safe
const ipKeyGenerator = rateLimit.ipKeyGenerator || (rateLimit.keyGenerators && rateLimit.keyGenerators.ip) || rateLimit.ipKeyGenerator || ((req) => req.ip);

// General API rate limiter
const generalApi = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health'
});

// Login rate limiter - strict
const authLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many login attempts, please try again after 15 minutes'
  },
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    // Rate limit by email to prevent account enumeration; fall back to normalized IP
    return req.body?.email || ipKeyGenerator(req);
  }
});

// OTP verification - very strict
const otpAttempts = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3,
  message: {
    success: false,
    message: 'Too many OTP verification attempts. Try again in 1 minute.',
    retryAfter: 60
  },
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    // Rate limit by user ID if authenticated, else by normalized IP + email
    const subject = req.user?._id?.toString();
    if (subject) return subject;
    return `${ipKeyGenerator(req)}-${req.body?.email || ''}`;
  }
});

// Password reset OTP - strict
const resetOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    message: 'Too many password reset attempts. Please try again later.'
  },
  skipSuccessfulRequests: true,
  keyGenerator: (req) => req.body?.email || ipKeyGenerator(req)
});

// Withdrawal attempts - very strict
const withdrawalAttempts = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    success: false,
    message: 'Maximum withdrawal attempts reached. Try again in 1 hour.'
  },
  keyGenerator: (req) => req.user?._id?.toString() || ipKeyGenerator(req)
});

// Register new account - prevent spam
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 registrations per hour per IP
  message: {
    success: false,
    message: 'Too many accounts created from this IP. Try again later.'
  },
  keyGenerator: (req) => ipKeyGenerator(req)
});

// Task creation rate limiter
const taskCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 tasks per hour per user
  message: {
    success: false,
    message: 'Maximum tasks created per hour. Try again later.'
  },
  keyGenerator: (req) => req.user?._id?.toString() || ipKeyGenerator(req)
});

module.exports = {
  generalApi,
  authLogin,
  otpAttempts,
  resetOtpLimiter,
  withdrawalAttempts,
  registerLimiter,
  taskCreationLimiter
};
