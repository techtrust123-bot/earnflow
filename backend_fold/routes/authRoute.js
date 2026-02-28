const express = require("express")
const { register, login, verifyDeviceAndLogin, resetActiveDevice, logout, verifyAccount, sendResetOtp, resetPassword, resendOtp, getCurrentUser, deleteAccount, setTransactionPin, verifyTransactionPin } = require("../controllers/authController")
const { authMiddlewere } = require("../middleweres/authmiddlewere")
const { authLogin, otpAttempts, resetOtpLimiter, registerLimiter } = require("../middleweres/rateLimiter")
const { validateRegistration, validateLogin, validateOtpVerification, validatePasswordReset, validateTransactionPin } = require("../middleweres/inputValidation")
const router = express.Router()
const { logoutOtherDevices } = require("../controllers/authController")



router.post("/register", registerLimiter, validateRegistration, register)
router.post("/login", authLogin, validateLogin, login)
router.post("/verify-device", authLogin, validateLogin, verifyDeviceAndLogin)
router.post("/reset-active", validateLogin, resetActiveDevice)  // clear stuck session without auth
router.post("/logout", authMiddlewere, logout)
router.post('/logout-others', authMiddlewere, logoutOtherDevices)
// OTP operations can be called before login (user supplies email)
router.post("/resendOtp", otpAttempts, resendOtp)
router.post("/verify", otpAttempts, validateOtpVerification, verifyAccount)
router.post("/sendReset", resetOtpLimiter, sendResetOtp)
router.post("/resetPassword", resetOtpLimiter, validatePasswordReset, resetPassword)
router.post("/set-pin", authMiddlewere, validateTransactionPin, setTransactionPin)
router.post("/verify-pin", authMiddlewere, verifyTransactionPin)

router.get('/me', authMiddlewere, getCurrentUser)

// Delete own account
router.delete('/delete', authMiddlewere, deleteAccount)

module.exports = router