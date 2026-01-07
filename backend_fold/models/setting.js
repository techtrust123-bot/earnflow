const mongoose = require('mongoose')

const SettingSchema = new mongoose.Schema({
  key: { type: String, required: true, index: true, unique: true },
  value: { type: String },
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'earn-users' },
  lastModifiedAt: { type: Date }
}, { timestamps: true })

module.exports = mongoose.models.Setting || mongoose.model('Setting', SettingSchema)
