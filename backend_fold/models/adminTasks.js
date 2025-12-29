const mongoose = require('mongoose')

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  platform: { type: String, required: true }, // e.g., "X", "Instagram", "TikTok"
  reward: { type: Number, required: true, min: 0.1 },
  link: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  maxCompletions: { type: Number, required: true }, // 0 means unlimited
  completedCount: { type: Number, default: 0 },
  completedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Track who completed
  startDate: { type: Date },
  endDate: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  verification: {
    type: {
      type: String,
      enum: ['follow', 'like', 'retweet', 'repost', 'comment'],
      required: false
    },
    targetId: {
      type: String,
      // For 'follow' this is the target userId. For tweet-based checks use `targetTweetId`.
      required: false
    },
    targetTweetId: {
      type: String,
      required: false
    }
  },
}, { timestamps: true })

const Tasks = mongoose.model('Task', taskSchema)
module.exports = Tasks