const mongoose = require('mongoose')
// const WebhookLog = require('../models/WebhookLog')


const WebhookLogSchema = new mongoose.Schema({
  payload: { type: mongoose.Schema.Types.Mixed },
  receivedAt: { type: Date, default: Date.now },
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'UserTask', required: false },
  provider: { type: String },
  method: { type: String },
  path: { type: String },
  verification: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: false })

module.exports = mongoose.model('WebhookLog', WebhookLogSchema)
