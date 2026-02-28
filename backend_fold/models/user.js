const mongoose = require("mongoose")
const userSchema = new mongoose.Schema({
    role:{
        type: String,
        enum: ["admin","user"],
        default: "user",
    },
       name:{
        type: String,
        required: true
    },
     email:{
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    phoneNumber: {
        type: String,
        default: "",
        unique: true,
        sparse: true
    },
     password:{
        type: String,
        required: true,
        trim: true
    },
    accountStatus:{
        type: String,
        enum: ["Verified","unVerified"],
        default: "unVerified"
    },
       verifyOtp:{
        type: String,
        default: ""
    },
      verifyOtpExpireAt:{
        type: Number,
        default: 0,
    },
    resendOtp:{
        type:String,
        default: ""
    },
    resendOtpExpireAt:{
        type:Number,
        default: 0
    },
    resetOtp:{
        type: String,
        default: "",
    },
      resetOtpExpireAt:{
        type: Number,
        default: 0,
    },
    // Hashed OTP fields (security improvement)
    verifyOtpHash:{
        type: String,
        default: ""
    },
    verifyOtpAttempts:{
        type: Number,
        default: 0
    },
    resetOtpHash:{
        type: String,
        default: ""
    },
    resetOtpAttempts:{
        type: Number,
        default: 0
    },
     isAccountVerify:{
        type: Boolean,
        default: false,
    },
      userID:{
        type: String,
        default: "",
        unique:true
    },
    referralCode: {
        type: String,
        unique: true,
        sparse: true,
        default: function() {
            return `EARN${Math.floor(100000 + Math.random() * 900000)}`
        }
    },
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'earn-users',
        default: null
    },
    referrals: {
        type: Number,
        default: 0
    },
    referralsEarned: {
        type: Number,
        default: 0
    },
    referralClicks: {
        type: Number,
        default: 0
    },
    lastActive: {
        type: Date,
        default: null,
        index: true
    },
    recentReferrals: [{
        name: String,
        date: String,
            requestToken: String,
            requestTokenExpiresAt: Date,
        reward: Number
    }],
    balance:{
        type:Number,
        default: 0
    },
    twitter: {
        id: String,
        username: String,
        displayName: String,
        // OAuth2 fields (optional)
        accessToken: String,
        refreshToken: String,
        // OAuth1.0a fields for user-context actions (follow/like verification)
        token: String,
        tokenSecret: String,
        // Temporary storage during request_token flow
        requestTokenSecret: String,
        linkedAt: Date
    },
    tiktok: {
        id: String,
        username: String,
        displayName: String,
        accessToken: String,
        refreshToken: String,
        linkedAt: Date
    },
    instagram: {
        id: String,
        username: String,
        displayName: String,
        accessToken: String,
        refreshToken: String,
        linkedAt: Date
    },
    facebook: {
        id: String,
        username: String,
        displayName: String,
        accessToken: String,
        refreshToken: String,
        linkedAt: Date
    },
    youtube: {
        id: String,
        username: String,
        displayName: String,
        accessToken: String,
        refreshToken: String,
        linkedAt: Date
    },
    tasksCompleted: {
        type: Number,
        default: 0
    },
  fraudScore: {
    type: Number,
    default: 0
  },
  isSuspended: {
    type: Boolean,
    default: false
  },
  transactionPin: {
    type: String,
    default: ""
  },
  transactionPinSet: {
    type: Boolean,
    default: false
  },
  // Withdrawal settings and tracking
  withdrawalSettings: {
    dailyLimit: {
      type: Number,
      default: 50000  // ₦50,000 daily limit
    },
    weeklyLimit: {
      type: Number,
      default: 200000  // ₦200,000 weekly limit
    },
    totalWithdrawalsToday: {
      type: Number,
      default: 0
    },
    lastWithdrawalDate: {
      type: Date,
      default: null
    }
  },
  // 2FA (Two-Factor Authentication) fields
  twoFASecret: {
    type: String,
    default: ""  // Encrypted TOTP secret
  },
  twoFAEnabled: {
    type: Boolean,
    default: false
  },
  backupCodes: [{
    code: String,
    used: { type: Boolean, default: false },
    createdAt: Date
  }],
  // Phone verification
  phoneVerified: {
    type: Boolean,
    default: false
  },
  // Device and IP tracking
  lastLogin: {
    type: Date,
    default: null
  },
  lastTransaction: {
    type: Date,
    default: null
  },
  // Single active device enforcement
  activeDevice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    default: null
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockedUntil: {
    type: Date,
    default: null
  }
},{
    timestamps: true
});

const User = mongoose.model("earn-users", userSchema)
module.exports = User;