const mongoose = require('mongoose')

const settingAuditSchema = new mongoose.Schema({
  key: { type: String, required: true },
  oldValue: { type: String },
  newValue: { type: String },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'earn-users' },
  changedAt: { type: Date, default: Date.now },
  note: { type: String }
}, { timestamps: true })

module.exports = mongoose.models.SettingAudit || mongoose.model('SettingAudit', settingAuditSchema)
