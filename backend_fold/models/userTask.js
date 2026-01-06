const mongoose = require('mongoose')

const userTaskSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'earn-users', required: true },
  socialHandle: { type: String, required: true },
  numUsers: { type: Number, required: true, min: 100 },
  taskAmount: { type: Number, required: true, min: 50 },
  totalAmount: { type: Number, required: true },
  commission: { type: Number, required: true },
  taskDetails: { type: String, required: true },
  paymentReference: { type: String },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  isActive: { type: Boolean, default: false },
  completedCount: { type: Number, default: 0 },
  completedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true })

module.exports = mongoose.model('UserTask', userTaskSchema)