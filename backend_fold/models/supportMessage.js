const mongoose = require('mongoose')

const supportMessageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: String,
  userEmail: String,
  message: {
    type: String,
    required: true
  },
  sender: {
    type: String,
    enum: ['customer', 'support'],
    default: 'customer'
  },
  category: {
    type: String,
    enum: ['general', 'payment', 'task', 'withdrawal', 'account', 'other'],
    default: 'general'
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'resolved', 'closed'],
    default: 'open'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: Date,
  attachments: [String],
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true })

module.exports = mongoose.model('SupportMessage', supportMessageSchema)
