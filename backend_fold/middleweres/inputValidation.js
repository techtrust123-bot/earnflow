const { body, validationResult } = require('express-validator');

// Validation result handler middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  next();
};

// Registration validation
const validateRegistration = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2-100 characters'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('phoneNumber')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^[0-9]{10,15}$/).withMessage('Invalid phone number format'),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 12 }).withMessage('Password must be at least 12 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/).withMessage('Password must contain uppercase, lowercase, number, and special character'),
  
  handleValidationErrors
];

// Login validation
const validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format'),
  
  body('password')
    .notEmpty().withMessage('Password is required'),
  
  handleValidationErrors
];

// OTP verification validation
const validateOtpVerification = [
  body('otp')
    .trim()
    .notEmpty().withMessage('OTP is required')
    .matches(/^[0-9]{8}$/).withMessage('OTP must be 8 digits'),
  
  handleValidationErrors
];

// Withdrawal validation
const validateWithdrawal = [
  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isInt({ min: 500, max: 1000000 }).withMessage('Amount must be between 500 and 1,000,000'),
  
  body('accountNumber')
    .trim()
    .notEmpty().withMessage('Account number is required')
    .matches(/^[0-9]{10}$/).withMessage('Account number must be 10 digits'),
  
  body('bankCode')
    .trim()
    .notEmpty().withMessage('Bank code is required')
    .matches(/^[0-9]+$/).withMessage('Bank code must be numeric'),
  
  body('accountName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Account name must be between 2-100 characters'),
  
  body('pin')
    .trim()
    .notEmpty().withMessage('Transaction PIN is required')
    .matches(/^[0-9]{4,6}$/).withMessage('PIN must be 4-6 digits')
    .custom(value => {
      // Prevent common PIN patterns
      const sequences = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '0123', '1234', '2345', '3456', '4567', '5678', '6789'];
      if (sequences.includes(value)) {
        throw new Error('PIN cannot be a common sequence');
      }
      return true;
    }),
  
  handleValidationErrors
];

// Password reset validation
const validatePasswordReset = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format'),
  
  body('otp')
    .trim()
    .notEmpty().withMessage('OTP is required')
    .matches(/^[0-9]{8}$/).withMessage('OTP must be 8 digits'),
  
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 12 }).withMessage('Password must be at least 12 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/).withMessage('Password must contain uppercase, lowercase, number, and special character'),
  
  handleValidationErrors
];

// User task creation validation
const validateUserTaskCreation = [
  body('numUsers')
    .notEmpty().withMessage('Number of users is required')
    .isInt({ min: 100, max: 1000000 }).withMessage('Number of users must be between 100 and 1,000,000'),
  
  body('taskAmount')
    .notEmpty().withMessage('Task amount is required')
    .isInt({ min: 50, max: 100000 }).withMessage('Task amount must be between 50 and 100,000'),
  
  body('platform')
    .trim()
    .notEmpty().withMessage('Platform is required')
    .isIn(['twitter', 'instagram', 'tiktok', 'facebook', 'youtube']).withMessage('Invalid platform'),
  
  body('action')
    .trim()
    .notEmpty().withMessage('Action is required')
    .isIn(['follow', 'like', 'comment', 'share', 'retweet']).withMessage('Invalid action'),
  
  body('socialHandle')
    .trim()
    .notEmpty().withMessage('Social handle is required')
    .isLength({ min: 1, max: 100 }).withMessage('Social handle must be between 1-100 characters'),
  
  handleValidationErrors
];

// Transaction PIN setup validation
const validateTransactionPin = [
  body('pin')
    .trim()
    .notEmpty().withMessage('PIN is required')
    .matches(/^[0-9]{4,6}$/).withMessage('PIN must be 4-6 digits')
    .custom(value => {
      // Prevent common PIN patterns
      const sequences = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '0123', '1234', '2345', '3456', '4567', '5678', '6789'];
      if (sequences.includes(value)) {
        throw new Error('PIN cannot be a common sequence');
      }
      return true;
    }),
  
  handleValidationErrors
];

module.exports = {
  validateRegistration,
  validateLogin,
  validateOtpVerification,
  validateWithdrawal,
  validatePasswordReset,
  validateUserTaskCreation,
  validateTransactionPin,
  handleValidationErrors
};
