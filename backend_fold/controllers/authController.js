const User = require("../models/user")
const jwt = require("jsonwebtoken")
require("dotenv").config()
const  {cookie} = require("cookie-parser")
const  transporter  = require("../transporter/transporter.js")
const bcrypt = require("bcryptjs")
const { Resend } = require("resend")




exports.register = async(req,res)=>{
    const {name, email, phoneNumber, password}=req.body

    if(!name || !email || !phoneNumber || !password){
        return res.status(400).json({message:"Name, email, phone number and password are required"})
    }

    try {
        const userExist = await User.findOne({email})
        if(userExist){
            return res.status(400).json({message:"User Already Exist"})
        }
        
        // Check if phone number already exists
        const phoneExists = await User.findOne({phoneNumber})
        if(phoneExists){
            return res.status(400).json({message:"Phone number already registered"})
        }
        
        const userCount = await User.countDocuments()
        const role = userCount === 0 ? "admin" : "user"

        const hashPassword = await bcrypt.hash(password,10)
        const userID = "USER-"+ Math.random().toString(36).substr(2,9).toUpperCase()
        const user = new User({
            name,
            email,
            phoneNumber,
            password:hashPassword,
            role,
            userID
        })

        // If the signup request included a referral code, attach and notify referrer
        const refCode = req.body?.ref || req.body?.referral || req.body?.referralCode
        if (refCode) {
            try {
                const referrer = await User.findOne({ $or: [{ referralCode: refCode }, { userID: refCode }] })
                if (referrer) {
                    // add a pending referral entry to referrer
                    referrer.recentReferrals = referrer.recentReferrals || []
                    referrer.recentReferrals.unshift({ name: name, date: new Date().toISOString(), status: 'pending', reward: 0 })
                    // keep only latest 20
                    if (referrer.recentReferrals.length > 20) referrer.recentReferrals.pop()
                    await referrer.save().catch(()=>{})
                    user.referredBy = referrer._id
                }
            } catch (e) {
                console.warn('Referral processing failed', e && e.message)
            }
        }

         const otp = String(Math.floor(100000 + Math.random() * 900000))
            user.verifyOtp = otp
            user.verifyOtpExpireAt = Date.now() + 10 * 60 * 1000

        await user.save()


        if (!process.env.SECRET) {
            console.error('Missing SECRET env var; cannot sign token')
            return res.status(500).json({ message: 'Server misconfiguration' })
        }

        const token = jwt.sign({id:user._id,role:user.role},process.env.SECRET,{expiresIn:"24h"})

        res.cookie("token",token,{
            httpOnly:true,
            secure:process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? 
            "none":"lax",
            maxAge: 24 * 60 * 60 * 1000
        })

        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
            from: 'Earn-Flow <no-reply@earnflow.onrender.com>',
            to: user.email,
            subject: "Welcome to Earn-Flow!",
            html: `<p>Hello ${user.name},</p><p>Your account has been created successfully.</p>`
        });

        const verificationMail = await resend.emails.send({
            from: 'Earn-Flow <no-reply@earnflow.onrender.com>',
            to: user.email,
            subject: "Verify Your Email",
            html: `<p>Hello ${user.name},</p><p>Please verify your email by using the OTP code: ${otp}</p>`
        });

        // const mailOption = {
        //     from: process.env.SENDER_EMAIL,
        //     to:email,
        //     subject: "EARN-FLOW-ACCOUNT",
        //     text:`your account has been created successful with email: ${email}`
        // }
        // try {
        //     await transporter.sendMail(mailOption)
        // } catch (e) {
        //     console.warn('Failed to send welcome email:', e && e.message)
        // }

        // const maileOption = {
        //     from: process.env.SENDER_EMAIL,
        //     to: email,
        //     subject: " Email Verification Otp Code",
        //     text: `your verification otp code is:${otp} use it to verify your account`
        // }
        // try {
        //     await transporter.sendMail(maileOption)
        // } catch (e) {
        //     console.warn('Failed to send verification email:', e && e.message)
        // }

                const safeUser = {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    userID: user.userID,
                    isAccountVerify: !!user.isAccountVerify,
                    accountStatus: user.accountStatus || 'unVerified',
                    twitter: user.twitter || null
                }

                res.status(201).json({ message: 'register successful', user: safeUser, token, balance: user.balance || 0 })
    } catch (error) {
        console.log(error)
        res.status(500).json({message:error.message})
    }
}

exports.login = async(req, res)=>{
    const {email, password} = req.body

      if( !email || !password){
        return res.status(400).json({message:"Input Field are Required"})
    }

    try {
        const user = await User.findOne({email})
        if(!user){
            return res.status(404).json({message:"Invalid email"})
        }
        const isMatch = await bcrypt.compare(password,user.password)
        if(!isMatch){
            return res.status(400).json({message:"Invalid password"})
        }

        if (!user.isAccountVerify) {
        return res.status(403).json({
            message: "Please verify your email",
            requiresVerification: true
        })
    }
        const token = jwt.sign({id: user._id, role: user.role},process.env.SECRET,{expiresIn:"24h"})

        if (!process.env.SECRET) {
            console.error('Missing SECRET env var; cannot sign token')
            return res.status(500).json({ message: 'Server misconfiguration' })
        }

        res.cookie("token",token,{
            httpOnly:true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? 
            "none":"lax",
            maxAge: 24 * 60 * 60 * 1000
        })

         
                const safeUser = {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    userID: user.userID,
                    isAccountVerify: !!user.isAccountVerify,
                    accountStatus: user.accountStatus || 'unVerified',
                    twitter: user.twitter || null,
                    tasksCompleted: user.tasksCompleted || 0,
                    referrals: user.referrals || 0

                }
                // if(!user.isAccountVerify){
                //     return res.status(403).json({
                //         message: "Please verify your email",
                //         requiresVerification: true
                //     })
                // }

                res.status(200).json({ message: 'Login Successful', user: safeUser, token, balance: user.balance || 0 })
    } catch (error) {
          console.log(error)
        res.status(500).json({message:error.message,})
    }

}

exports.logout = async(req,res)=>{
    try {
        res.clearCookie("token",{
            httpOnly: true,
            secure: process.env.NODE_ENV === "PRODUCTION",
            sameSite: process.env.NODE_ENV === "PRODUCTION" ? 
            "none":"lax",
        })
        res.status(200).json({message:"Logout  successful"})
    } catch (error) {
         console.log(error)
        res.status(500).json({message:error.message})
    }
}

exports.resendOtp = async(req,res)=>{
    const userId = req.user.id

    try {
        const user = await User.findById(userId)
        if(user.isAccountVerify){
            return res.status(404).json({message:"Account Already Verified",})
        }

        const otp = String(Math.floor(100000 + Math.random() * 900000))
        user.resendOtp = otp
        user.resendOtpExpireAt = Date.now() + 10 * 60 * 1000

        await user.save()

        const resend = new Resend(process.env.RESEND_API_KEY);
        const verificationMail = await resend.emails.send({
            from: 'Earn-Flow <noreply@earnflow.com>',
            to: user.email,
            subject: "Verify Your Email",
            html: `<p>Hello ${user.name},</p><p>Please verify your email by using the OTP code: ${otp}</p>`
        })

        // const mailOption = {
        //     from: process.env.SENDER_EMAIL,
        //     to: user.email,
        //     subject: " Email Verification Otp Code",
        //     text: `your verification otp code is:${otp} use it to verify your account`
        // }
        // await transporter.sendMail(mailOption)

        res.status(200).json({message:" resend otp send successful"})
    } catch (error) {
         console.log(error)
        res.status(500).json({message:error.message})
    }
}

exports.verifyAccount = async(req,res)=>{
    const {otp} = req.body
    const userId = req.user.id

    if(!otp){
        return res.status(400).json({message:"Input Field is required..."})
    }

    try {
        const user = await User.findById(userId)
        if(user.isAccountVerify){
            return res.status(400).json({message:"account already verified..."})
        }

        if(otp !== user.verifyOtp || otp === ""){
            return res.status(400).json({message: "Inavalid otp code..."})
        }

        if (!user.verifyOtp || !user.verifyOtpExpireAt) {
         return res.status(400).json({ message: "OTP not generated" })

        }


        if(user.verifyOtpExpireAt < Date.now()){
            return res.status(400).json({message:"Otp Expired..."})
        }


        user.verifyOtp = "",
        user.verifyOtpExpireAt = 0,
        user.isAccountVerify = true,
        user.accountStatus = "Verified"

        await user.save()

        // If this user was referred, credit the referrer on successful verification
        try {
            const reward = Number(process.env.REFERRAL_REWARD || process.env.REFERRAL_REWARD_AMOUNT || 50)
            if (user.referredBy) {
                const referrer = await User.findById(user.referredBy)
                if (referrer) {
                    referrer.referrals = (referrer.referrals || 0) + 1
                    referrer.referralsEarned = (referrer.referralsEarned || 0) + reward
                    // Optionally credit the referrer's balance so they see the bonus immediately
                    referrer.balance = (referrer.balance || 0) + reward

                    // Mark matching pending recent referral as completed
                    referrer.recentReferrals = referrer.recentReferrals || []
                    let found = false
                    for (let rr of referrer.recentReferrals) {
                        if ((rr.name === user.name || rr.name === user.email) && rr.status === 'pending') {
                            rr.status = 'completed'
                            rr.reward = reward
                            found = true
                            break
                        }
                    }
                    if (!found) {
                        referrer.recentReferrals.unshift({ name: user.name || user.email, date: new Date().toISOString(), status: 'completed', reward })
                        if (referrer.recentReferrals.length > 20) referrer.recentReferrals.pop()
                    }

                    await referrer.save().catch(err => console.warn('Could not save referrer update', err && err.message))
                }
            }
        } catch (e) {
            console.warn('Referral crediting failed', e && e.message)
        }

        res.status(200).json({message:"Account Verified Successful..."})
    } catch (error) {
        console.log(error)
        res.status(500).json({message:error.message})
    }
}

exports.sendResetOtp = async(req,res)=>{
    const {email} = req.body

    try {
        const user = await User.findOne({email})
        if(!user){
            return res.status(400).json({message:"user not found"})
        }

        const otp = String(Math.floor(100000 + Math.random() * 900000))
        user.resetOtp = otp,
        user.resetOtpExpireAt = Date.now() + 10 * 60 * 1000

        await user.save()

        const resend = new Resend(process.env.RESEND_API_KEY);
        const resetMail = await resend.emails.send({
            from: 'Earn-Flow <noreply@earnflow.com>',
            to: email,
            subject: "Password Reset OTP",
            html: `<p>Hello ${user.name},</p><p>Please use the following OTP to reset your password: ${otp}</p>`
        })

        // const mailOption = {
        //     from: process.env.SENDER_EMAIL,
        //     to: email,
        //     subject:"Password Reset Otp Code",
        //     text: `your password reset otp is: ${otp}`
        // }

        // await transporter.sendMail(mailOption)

        res.status(200).json({message:" resetOtp send successful..."})
    } catch (error) {
         console.log(error)
        res.status(500).json({message:error.message})
    }
}

// FIXED & PERFECT resetPassword controller
exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  // 1. Validate input
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ message: "Email, OTP, and new password are required" });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  try {
    // 2. Find user by email + OTP + not expired
    const user = await User.findOne({
      email,
      resetOtp: otp,
      resetOtpExpireAt: { $gt: Date.now() } // Only valid if not expired
    });

    // 3. If no user found → invalid/expired OTP
    if (!user) {
      return res.status(400).json({ 
        message: "Invalid or expired OTP. Please request a new one." 
      });
    }

    // 4. Update password & clear OTP
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.resetOtp = undefined;
    user.resetOtpExpireAt = undefined;

    await user.save();

    return res.status(200).json({ 
      success: true,
      message: "Password reset successful! You can now log in." 
    });

  } catch (error) {
    console.error("Reset Password Error:", error);
    return res.status(500).json({ 
      message: "Server error. Please try again later." 
    });
  }
};

// Get current logged-in user
exports.getCurrentUser = async (req, res) => {
    try {
        const userId = req.user?.id
        if (!userId) return res.status(401).json({ message: 'Not authenticated' })

        const user = await User.findById(userId).select('-password')
        if (!user) return res.status(404).json({ message: 'User not found' })

        return res.status(200).json({ user, balance: user.balance || 0 })
    } catch (error) {
        console.error('getCurrentUser error', error)
        return res.status(500).json({ message: 'Server error' })
    }
}

// Delete current logged-in user
exports.deleteAccount = async (req, res) => {
    try {
        const userId = req.user?.id
        if (!userId) return res.status(401).json({ message: 'Not authenticated' })

        // Delete user record
        await User.findByIdAndDelete(userId)

        // Clear auth cookie
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'PRODUCTION',
            sameSite: process.env.NODE_ENV === 'PRODUCTION' ? 'none' : 'lax',
        })

        return res.status(200).json({ success: true, message: 'Account deleted successfully' })
    } catch (error) {
        console.error('deleteAccount error', error)
        return res.status(500).json({ message: 'Server error' })
    }
}

// Set Transaction PIN
exports.setTransactionPin = async (req, res) => {
    try {
        const { pin } = req.body
        const userId = req.user?.id

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Not authenticated' })
        }

        if (!pin || pin.length < 4) {
            return res.status(400).json({ success: false, message: 'PIN must be at least 4 digits' })
        }

        if (!/^\d+$/.test(pin)) {
            return res.status(400).json({ success: false, message: 'PIN must contain only numbers' })
        }

        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' })
        }

        // Hash the PIN before storing
        const hashedPin = await bcrypt.hash(pin, 10)
        user.transactionPin = hashedPin
        user.transactionPinSet = true
        await user.save()

        res.json({
            success: true,
            message: 'Transaction PIN set successfully'
        })
    } catch (error) {
        console.error('setTransactionPin error', error)
        res.status(500).json({ success: false, message: 'Failed to set PIN' })
    }
}

// Verify Transaction PIN
exports.verifyTransactionPin = async (req, res) => {
    try {
        const { pin } = req.body
        const userId = req.user?.id

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Not authenticated' })
        }

        if (!pin) {
            return res.status(400).json({ success: false, message: 'PIN required' })
        }

        const user = await User.findById(userId)
        if (!user || !user.transactionPinSet) {
            return res.status(400).json({ success: false, message: 'PIN not set for this account' })
        }

        const pinMatches = await bcrypt.compare(pin, user.transactionPin)
        if (!pinMatches) {
            return res.status(401).json({ success: false, message: 'Invalid PIN' })
        }

        res.json({
            success: true,
            message: 'PIN verified successfully'
        })
    } catch (error) {
        console.error('verifyTransactionPin error', error)
        res.status(500).json({ success: false, message: 'Failed to verify PIN' })
    }
}