const User = require("../models/user")
const jwt = require("jsonwebtoken")
require("dotenv").config()
const  {cookie} = require("cookie-parser")
const  transporter  = require("../transporter/transporter.js")
const bcrypt = require("bcryptjs")



exports.register = async(req,res)=>{
    const {name, email, password}=req.body

    if(!name || !email || !password){
        return res.status(400).json({message:"Input Field are Required"})
    }

    try {
        const userExist = await User.findOne({email})
        if(userExist){
            return res.status(400).json({message:"User Already Exist"})
        }
        const userCount = await User.countDocuments()
        const role = userCount === 0 ? "admin" : "user"

        const hashPassword = await bcrypt.hash(password,10)
        const userID = "USER-"+ Math.random().toString(36).substr(2,9).toUpperCase()
        const user = new User({
            name,
            email,
            password:hashPassword,
            role,
            userID
        })

         const otp = String(Math.floor(100000 + Math.random() * 900000))
            user.verifyOtp = otp
            user.verifyOtpExpireAt = Date.now() + 10 * 60 * 1000

        await user.save()


        if (!process.env.SECRET) {
            console.error('Missing SECRET env var; cannot sign token')
            return res.status(500).json({ message: 'Server misconfiguration' })
        }

        const token = jwt.sign({id:user._id,role:user.role},process.env.SECRET,{expiresIn:"7d"})

        res.cookie("token",token,{
            httpOnly:true,
            secure:process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? 
            "none":"lax",
            maxAge: 24 * 60 * 60 * 1000
        })

        const mailOption = {
            from: process.env.SENDER_EMAIL,
            to:email,
            subject: "EARN-FLOW-ACCOUNT",
            text:`your account has been created successful with email: ${email}`
        }
        await transporter.sendMail(mailOption)


        const maileOption = {
            from: process.env.SENDER_EMAIL,
            to: email,
            subject: " Email Verification Otp Code",
            text: `your verification otp code is:${otp} use it to verify your account`
        }
        await transporter.sendMail(maileOption)

                const safeUser = {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    userID: user.userID
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
        const token = jwt.sign({id: user._id, role: user.role},process.env.SECRET,{expiresIn:"2d"})

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
                    userID: user.userID
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

        const mailOption = {
            from: process.env.SENDER_EMAIL,
            to: user.email,
            subject: " Email Verification Otp Code",
            text: `your verification otp code is:${otp} use it to verify your account`
        }
        await transporter.sendMail(mailOption)

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

        // // Backend: /api/auth/verify
        // if (user.isVerified) {
        //     const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' })
  
        //     return res.json({
        //         success: true,
        //         message: "Email verified!",
        //         user: { id: user._id, name: user.name, email: user.email, balance: user.balance },
        //         token
        //     })
        // }

        user.verifyOtp = "",
        user.verifyOtpExpireAt = 0,
        user.isAccountVerify = true,
        user.accountStatus = "Verified"

        await user.save()

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

        const mailOption = {
            from: process.env.SENDER_EMAIL,
            to: email,
            subject:"Password Reset Otp Code",
            text: `your password reset otp is: ${otp}`
        }

        await transporter.sendMail(mailOption)

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