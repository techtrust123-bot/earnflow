const express = require('express')
const router = express.Router()
const { authMiddlewere } = require('../middleweres/authmiddlewere')
const authorizeRoles = require('../middleweres/roleMiddlewere')
const { getUsers, getStats, deleteUser, updateUserRole } = require('../controllers/adminUsers')

router.get('/users', authMiddlewere, authorizeRoles('admin'), getUsers)
router.get('/stats', authMiddlewere, authorizeRoles('admin'), getStats)
router.delete('/users/:id', authMiddlewere, authorizeRoles('admin'), deleteUser)
router.patch('/users/:id/role', authMiddlewere, authorizeRoles('admin'), updateUserRole)

module.exports = router
