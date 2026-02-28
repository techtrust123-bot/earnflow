const rateLimit = require('express-rate-limit');

// General API rate limiter
const generalApi = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later"
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Don't rate limit health checks
    return req.path === '/health';
  }
});

// Login rate limiter - strict
const authLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: "Too many login attempts, please try again after 15 minutes"
  },
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    // Rate limit by email to prevent account enumeration by IP cycling
    return req.body?.email || req.ip;
  }
});

// OTP verification - very strict
const otpAttempts = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 3,
  message: {
    success: false,
    message: "Too many OTP verification attempts. Try again in 1 minute.",
    retryAfter: 60
  },
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    // Rate limit by user ID if authenticated, else by IP + email
    return req.user?._id?.toString() || `${req.ip}-${req.body?.email}`;
  }
});

// Password reset OTP - strict
const resetOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    message: "Too many password reset attempts. Please try again later."
  },
  skipSuccessfulRequests: true,
  keyGenerator: (req) => req.body?.email || req.ip
});

// Withdrawal attempts - very strict
const withdrawalAttempts = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 3,
  message: {
    success: false,
    message: "Maximum withdrawal attempts reached. Try again in 1 hour."
  },
  keyGenerator: (req) => req.user?._id?.toString() || req.ip
});

// Register new account - prevent spam
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 10,  // 10 registrations per hour per IP
  message: {
    success: false,
    message: "Too many accounts created from this IP. Try again later."
  },
  keyGenerator: (req) => req.ip
});

// Task creation rate limiter
const taskCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 5,  // 5 tasks per hour per user
  message: {
    success: false,
    message: "Maximum tasks created per hour. Try again later."
  },
  keyGenerator: (req) => req.user?._id?.toString() || req.ip
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
