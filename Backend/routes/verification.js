const router = require('express').Router()
const { verifyBankAccount } = require('../controllers/verificationController')

router.get('/verify-account', verifyBankAccount)

module.exports = router
