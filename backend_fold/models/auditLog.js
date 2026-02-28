const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'earn-users',
    index: true
  },
  action: {
    type: String,
    enum: [
      'login',
      'logout',
      'register',
      'password_change',
      'otp_verify',
      'withdrawal_attempt',
      'withdrawal_success',
      'withdrawal_failed',
      'task_completion',
      'task_failure',
      'balance_update',
      'settings_change',
      'admin_action',
      'suspicious_activity',
      'vending_initiated',
      'vending_sent',
      'vending_succeeded',
      'vending_failed',
      'hold_captured',
      'hold_released',
      'refund_processed'
    ],
    index: true
  },
  status: {
    type: String,
    enum: ['success', 'failure', 'pending'],
    default: 'success',
    index: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: String,
  userAgent: String,
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low',
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
    expires: 90 * 24 * 60 * 60  // Auto-delete after 90 days
  }
}, { timestamps: false });

// Static method to log actions
auditLogSchema.statics.log = async function(userId, action, details = {}, req = null) {
  try {
    const log = new this({
      user: userId,
      action,
      details,
      ipAddress: req?.ip,
      userAgent: req?.get('user-agent'),
      status: details.status || 'success',
      severity: details.severity || 'low'
    });
    await log.save();
    return log;
  } catch (err) {
    console.warn('Audit log failed:', err.message);
  }
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
