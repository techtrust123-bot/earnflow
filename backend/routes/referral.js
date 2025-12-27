const express = require('express')
const router = express.Router()
const { authMiddlewere } = require('../middleweres/authmiddlewere')
const { getMyReferral } = require('../controllers/referralController')

router.get('/me', authMiddlewere, getMyReferral)

module.exports = router
