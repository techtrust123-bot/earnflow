const mongoose = require('mongoose')

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'earn-users', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  meta: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true })

module.exports = mongoose.model('Notification', notificationSchema)
