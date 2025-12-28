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
    balance:{
        type:Number,
        default: 0
    },
    twitter: {
    id: String,
    username: String,
    accessToken: String,
    refreshToken: String,
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