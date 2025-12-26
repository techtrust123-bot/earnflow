const express = require('express')
const router = express.Router()
const { authMiddlewere } = require('../middleweres/authmiddlewere')
const authorizeRoles = require('../middleweres/roleMiddlewere')
const { getUsers, getStats } = require('../controllers/adminUsers')

router.get('/users', authMiddlewere, authorizeRoles('admin'), getUsers)
router.get('/stats', authMiddlewere, authorizeRoles('admin'), getStats)

module.exports = router
