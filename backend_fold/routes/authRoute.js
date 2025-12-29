const express = require("express")
const { register, login, logout, verifyAccount, sendResetOtp, resetPassword, resendOtp, getCurrentUser, deleteAccount } = require("../controllers/authController")
const { authMiddlewere } = require("../middleweres/authmiddlewere")
const router = express.Router()



router.post("/register", register)
router.post("/login",login)
router.post("/logout",authMiddlewere,logout)
router.post("/resendOtp", authMiddlewere,resendOtp)
router.post("/verify",authMiddlewere,verifyAccount)
router.post("/sendReset", sendResetOtp)
router.post("/resetPassword", resetPassword)

router.get('/me', authMiddlewere, getCurrentUser)

// Delete own account
router.delete('/delete', authMiddlewere, deleteAccount)

// console.log('types:', {
//   register: typeof register,
//   login: typeof login,
//   logout: typeof logout,s
//   resendOtp: typeof resendOtp,
//   verifyAccount: typeof verifyAccount,
//   sendResetOtp: typeof sendResetOtp,
//   resetPassword: typeof resetPassword,
//   authMiddlewere: typeof authMiddlewere
// })

module.exports = router