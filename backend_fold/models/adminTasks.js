const mongoose = require('mongoose')

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  platform: { type: String, required: true }, // e.g., "X", "Instagram", "TikTok"
  reward: { type: Number, required: true, min: 0.1 },
  link: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  maxCompletions: { type: Number, default: 1000, min: 1 },
  completedCount: { type: Number, default: 0 },
  completedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Track who completed
  startDate: { type: Date },
  endDate: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  //  verification: {
  //   type: {
  //     type: String,
  //     enum: ['follow', 'like', 'retweet'],
  //     required: true
  //   },
  //   targetId: {
  //     type: String,
  //     required: true // Twitter userId or tweetId
  //   }
  // },
}, { timestamps: true })

const Tasks = mongoose.model('Task', taskSchema)
module.exports = Tasks