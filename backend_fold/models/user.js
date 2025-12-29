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
        status: String,
        reward: Number
    }],
    balance:{
        type:Number,
        default: 0
    },
    twitter: {
        id: String,
        username: String,
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

  fraudScore: {
    type: Number,
    default: 0
  }
},{
    timestamps: true
});

const User = mongoose.model("earn-users", userSchema)
module.exports = User;