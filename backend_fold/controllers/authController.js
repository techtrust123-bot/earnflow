const User = require("../models/user")
const jwt = require("jsonwebtoken")
require("dotenv").config()
const  {cookie} = require("cookie-parser")
const  transporter  = require("../transporter/transporter.js")
const bcrypt = require("bcryptjs")
const { Resend } = require("resend")
const AuditLog = require("../models/auditLog")
const deviceFingerprint = require('../services/deviceFingerprint')




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

         // Generate 8-digit OTP (much stronger than 6-digit)
            const otp = String(Math.floor(10000000 + Math.random() * 90000000))
            const crypto = require('crypto');
            // Hash OTP before storing for security
            const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
            user.verifyOtpHash = otpHash
            user.verifyOtpExpireAt = Date.now() + 5 * 60 * 1000 // 5 minutes
            user.verifyOtpAttempts = 0 // Initialize attempt counter

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
            subject: "Verify Your Email - Your OTP Code",
            html: `<p>Hello ${user.name},</p><p>Please verify your email by using this OTP code: <strong>${otp}</strong></p><p>This code expires in 5 minutes.</p><p>Do not share this code with anyone.</p>`
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

    if (!email || !password) {
        return res.status(400).json({ message: "Input fields are required" })
    }

    try {
        const user = await User.findOne({ email })
        if (!user) return res.status(404).json({ message: "Invalid email" })

        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) return res.status(400).json({ message: "Invalid password" })

        if (!user.isAccountVerify) {
            return res.status(403).json({
                message: "Please verify your email",
                requiresVerification: true
            })
        }

        // Device fingerprint check and single-device enforcement
        try {
            const deviceCheck = await deviceFingerprint.checkDevice(user, req)

            if (deviceCheck && deviceCheck.isNew) {
                // New device: require verification before allowing login
                // include the code so the frontend can present it to the user
                return res.status(403).json({
                    message: 'New device detected. Please verify the device before logging in.',
                    requiresDeviceVerification: true,
                    deviceId: deviceCheck.device._id,
                    verificationCode: deviceCheck.verificationCode // sent back for UI or SMS/email
                });
            }

            const device = deviceCheck && deviceCheck.device

            // If another active device exists, deny login
            if (user.activeDevice && device && user.activeDevice.toString() !== device._id.toString()) {
                return res.status(403).json({
                    message: 'You are already logged in on another device. Please logout from that device first.'
                })
            }

            if (device) {
                device.isActive = true
                device.lastUsed = new Date()
                await device.save()

                user.activeDevice = device._id
                user.lastLogin = new Date()
                await user.save()
            }
        } catch (dx) {
            console.warn('Device check error:', dx)
        }

        if (!process.env.SECRET) {
            console.error('Missing SECRET env var; cannot sign token')
            return res.status(500).json({ message: 'Server misconfiguration' })
        }

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.SECRET, { expiresIn: "24h" })

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
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

        res.status(200).json({ message: 'Login Successful', user: safeUser, token, balance: user.balance || 0 })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: error.message })
    }

}

exports.verifyDeviceAndLogin = async (req, res) => {
    const { email, password, deviceId, verificationCode } = req.body;

    if (!email || !password || !deviceId || !verificationCode) {
        return res.status(400).json({ message: 'Email, password, deviceId and verificationCode are required' });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'Invalid email' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid password' });

        if (!user.isAccountVerify) {
            return res.status(403).json({
                message: 'Please verify your email',
                requiresVerification: true
            });
        }

        // Verify the device code
        const verifyResult = await deviceFingerprint.verifyDevice(deviceId, verificationCode, user._id);
        if (!verifyResult.success) {
            return res.status(400).json({ message: verifyResult.message });
        }

        // mark device as active on user record
        user.activeDevice = deviceId;
        user.lastLogin = new Date();
        await user.save();

        // issue token
        if (!process.env.SECRET) {
            console.error('Missing SECRET env var; cannot sign token');
            return res.status(500).json({ message: 'Server misconfiguration' });
        }

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.SECRET, { expiresIn: '24h' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 24 * 60 * 60 * 1000
        });

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
        };

        res.status(200).json({ message: 'Login Successful', user: safeUser, token, balance: user.balance || 0 });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
};


exports.logout = async(req,res)=>{
    try {
        // Clear auth cookie
        res.clearCookie("token",{
            httpOnly: true,
            secure: process.env.NODE_ENV === "PRODUCTION",
            sameSite: process.env.NODE_ENV === "PRODUCTION" ? 
            "none":"lax",
        })

        try {
            // If user is authenticated, clear activeDevice if this device matches
            const userId = req.user?.id
            if (userId) {
                const user = await User.findById(userId)
                if (user) {
                    try {
                        const { hash } = deviceFingerprint.generateDeviceFingerprint(req)
                        const Device = require('../models/device')
                        const dev = await Device.findOne({ user: user._id, fingerprintHash: hash })
                        if (dev && user.activeDevice && dev._id.toString() === user.activeDevice.toString()) {
                            user.activeDevice = null
                            await user.save()
                            dev.isActive = false
                            await dev.save()
                        }
                    } catch (e) {
                        console.warn('Logout device-clear error:', e)
                    }
                }
            }

        } catch (e) {
            // non-fatal
        }

        res.status(200).json({message:"Logout successful"})
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

        // Generate 8-digit OTP
        const otp = String(Math.floor(10000000 + Math.random() * 90000000))
        const crypto = require('crypto');
        const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
        user.verifyOtpHash = otpHash
        user.verifyOtpExpireAt = Date.now() + 5 * 60 * 1000 // 5 minutes
        user.verifyOtpAttempts = 0 // Reset attempts on resend

        await user.save()

        const resend = new Resend(process.env.RESEND_API_KEY);
        const verificationMail = await resend.emails.send({
            from: 'Earn-Flow <noreply@earnflow.com>',
            to: user.email,
            subject: "Verify Your Email - Your OTP Code",
            html: `<p>Hello ${user.name},</p><p>Please verify your email by using this OTP code: <strong>${otp}</strong></p><p>This code expires in 5 minutes.</p>`
        })

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
        return res.status(400).json({message:"OTP is required"})
    }

    try {
        const user = await User.findById(userId)
        if(user.isAccountVerify){
            return res.status(400).json({message:"Account already verified"})
        }

        // Security Check: OTP attempt rate limiting (3 attempts per verification window)
        if (!user.verifyOtpAttempts) user.verifyOtpAttempts = 0
        
        if (user.verifyOtpAttempts >= 3) {
            await AuditLog.log(user._id, 'verification_failed', {
                reason: 'max_attempts_exceeded',
                status: 'locked',
                severity: 'high'
            }, req)
            
            return res.status(429).json({
                message: "Too many failed attempts. Please request a new OTP.",
                remainingTime: user.verifyOtpExpireAt ? Math.ceil((user.verifyOtpExpireAt - Date.now()) / 1000) : 0
            })
        }

        if (!user.verifyOtpHash || !user.verifyOtpExpireAt) {
            return res.status(400).json({ message: "OTP not generated. Please request a new one." })
        }

        // Check if OTP expired
        if (user.verifyOtpExpireAt < Date.now()) {
            return res.status(400).json({
                message: "OTP Expired. Please request a new one.",
                requiresResend: true
            })
        }

        // Security: Hash the submitted OTP and compare using timing-safe comparison
        const crypto = require('crypto');
        const submittedOtpHash = crypto.createHash('sha256').update(otp).digest('hex');
        
        // Timing-safe comparison prevents timing attacks
        const isValid = crypto.timingSafeEqual(
            Buffer.from(submittedOtpHash),
            Buffer.from(user.verifyOtpHash)
        ).valueOf();

        if (!isValid) {
            // Increment failed attempts
            user.verifyOtpAttempts += 1
            await user.save()
            
            await AuditLog.log(user._id, 'verification_failed', {
                reason: 'invalid_otp',
                attempt: user.verifyOtpAttempts,
                status: 'failure'
            }, req)

            return res.status(400).json({
                message: `Invalid OTP. ${3 - user.verifyOtpAttempts} attempts remaining.`,
                attemptsRemaining: 3 - user.verifyOtpAttempts
            })
        }

        // OTP is valid - verify account
        user.verifyOtpHash = undefined
        user.verifyOtpExpireAt = undefined
        user.verifyOtpAttempts = 0
        user.isAccountVerify = true
        user.accountStatus = "Verified"

        await user.save()

        await AuditLog.log(user._id, 'account_verified', {
            status: 'success',
            severity: 'medium'
        }, req)

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

        res.status(200).json({message:"Account Verified Successfully"})
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
            return res.status(400).json({message:"User not found"})
        }

        // Generate 8-digit OTP
        const otp = String(Math.floor(10000000 + Math.random() * 90000000))
        const crypto = require('crypto');
        const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
        user.resetOtpHash = otpHash
        user.resetOtpExpireAt = Date.now() + 5 * 60 * 1000 // 5 minutes
        user.resetOtpAttempts = 0

        await user.save()

        const resend = new Resend(process.env.RESEND_API_KEY);
        const resetMail = await resend.emails.send({
            from: 'Earn-Flow <noreply@earnflow.com>',
            to: email,
            subject: "Password Reset OTP - Your Code",
            html: `<p>Hello ${user.name},</p><p>Please use the following OTP to reset your password: <strong>${otp}</strong></p><p>This code expires in 5 minutes.</p><p>If you didn't request a password reset, please ignore this email.</p>`
        })

        res.status(200).json({message:"Reset OTP sent successfully"})
    } catch (error) {
         console.log(error)
        res.status(500).json({message:error.message})
    }
}

// FIXED & PERFECT resetPassword controller with timing-safe comparison
exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  // 1. Validate input
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ message: "Email, OTP, and new password are required" });
  }

  if (newPassword.length < 12) {
    return res.status(400).json({ 
      message: "Password must be at least 12 characters with uppercase, lowercase, number, and special character" 
    });
  }

  // Check password strength
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;
  if (!passwordRegex.test(newPassword)) {
    return res.status(400).json({
      message: "Password must contain uppercase, lowercase, number, and special character"
    });
  }

  try {
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(400).json({ 
        message: "User not found" 
      });
    }

    // Check attempt rate limiting (3 attempts only)
    if (!user.resetOtpAttempts) user.resetOtpAttempts = 0
    if (user.resetOtpAttempts >= 3) {
      return res.status(429).json({
        message: "Too many failed attempts. Please request a new OTP.",
        requiresResend: true
      });
    }

    if (!user.resetOtpHash || !user.resetOtpExpireAt) {
      return res.status(400).json({ 
        message: "OTP not generated. Please request a new one.",
        requiresResend: true
      });
    }

    // Check if OTP expired
    if (user.resetOtpExpireAt < Date.now()) {
      return res.status(400).json({ 
        message: "OTP expired. Please request a new one.",
        requiresResend: true
      });
    }

    // Timing-safe OTP comparison
    const crypto = require('crypto');
    const submittedOtpHash = crypto.createHash('sha256').update(otp).digest('hex');
    
    let isValid = false;
    try {
      isValid = crypto.timingSafeEqual(
        Buffer.from(submittedOtpHash),
        Buffer.from(user.resetOtpHash)
      ).valueOf();
    } catch (err) {
      isValid = false;
    }

    if (!isValid) {
      user.resetOtpAttempts += 1;
      await user.save();
      
      return res.status(400).json({ 
        message: `Invalid OTP. ${3 - user.resetOtpAttempts} attempts remaining.`,
        attemptsRemaining: 3 - user.resetOtpAttempts
      });
    }

    // Update password & clear OTP
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.resetOtpHash = undefined;
    user.resetOtpExpireAt = undefined;
    user.resetOtpAttempts = 0;

    await user.save();

    await AuditLog.log(user._id, 'password_reset', {
      status: 'success',
      severity: 'medium'
    }, req);

    return res.status(200).json({ 
      success: true,
      message: "Password reset successful! You can now log in with your new password." 
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

// Revoke other device sessions (logout other devices)
exports.logoutOtherDevices = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { password } = req.body;
        if (!userId) return res.status(401).json({ message: 'Not authenticated' });

        if (!password) return res.status(400).json({ message: 'Password is required to revoke other sessions' });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ message: 'Invalid password' });

        // Determine current device fingerprint
        let currentDeviceHash = null;
        try {
            const fp = deviceFingerprint.generateDeviceFingerprint(req);
            currentDeviceHash = fp.hash;
        } catch (e) {
            console.warn('Could not generate fingerprint on revoke', e);
        }

        const Device = require('../models/device');

        // Set all user's devices to inactive
        await Device.updateMany({ user: user._id }, { $set: { isActive: false } });

        // If current device can be found, mark it active again
        if (currentDeviceHash) {
            const cur = await Device.findOne({ user: user._id, fingerprintHash: currentDeviceHash });
            if (cur) {
                cur.isActive = true;
                cur.lastUsed = new Date();
                await cur.save();
                user.activeDevice = cur._id;
            } else {
                user.activeDevice = null;
            }
        } else {
            user.activeDevice = null;
        }

        await user.save();

        await AuditLog.log(user._id, 'revoke_other_devices', { message: 'User revoked other device sessions' }, req);

        return res.json({ success: true, message: 'Other device sessions revoked' });
    } catch (err) {
        console.error('logoutOtherDevices error', err);
        return res.status(500).json({ message: 'Failed to revoke other sessions' });
    }
}