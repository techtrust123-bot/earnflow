const mongoose = require('mongoose')

const taskApprovalSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'earn-users', required: true },
  title: { type: String, required: true },
  platform: { type: String, enum: ['twitter','tiktok','instagram','facebook'], required: true },
  action: { type: String, enum: ['follow','like','repost','comment'], required: true },
  socialHandle: { type: String },
  numUsers: { type: Number, default: 100 },
  url: { type: String },
  description: { type: String, trim: true },
  // For repost, like, comment actions: username/handle of the user's account
  accountUsername: { type: String },
  // For repost, like, comment actions: screenshot/image proof of the post
  screenshotUrl: { type: String },
  status: { type: String, enum: ['requested','approved','rejected'], default: 'requested' },
  paid: { type: Boolean, default: false },
  currency: { type: String, enum: ['NGN','USD'], default: 'NGN' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'earn-users' },
  reviewedAt: { type: Date }
}, { timestamps: true })

module.exports = mongoose.model('TaskApproval', taskApprovalSchema)
