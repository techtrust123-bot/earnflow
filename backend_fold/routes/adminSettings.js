const express = require('express')
const router = express.Router()
const { authMiddlewere } = require('../middleweres/authmiddlewere')
const authorizeRoles = require('../middleweres/roleMiddlewere')
const controller = require('../controllers/adminSettings')

router.get('/exchange-rate', authMiddlewere, authorizeRoles('admin'), controller.getExchangeRate)
router.put('/exchange-rate', authMiddlewere, authorizeRoles('admin'), controller.setExchangeRate)
router.delete('/exchange-rate', authMiddlewere, authorizeRoles('admin'), controller.clearExchangeRate)
router.get('/exchange-rate/audit', authMiddlewere, authorizeRoles('admin'), controller.listExchangeRateAudits)

module.exports = router
