const mongoose = require('mongoose')

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  platform: { type: String, enum: ['X', 'Twitter', 'Instagram', 'TikTok', 'Facebook', 'YouTube'], required: true },
  reward: { type: Number, required: true, min: 0.1 },
  link: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  paid: { type: Boolean, default: false },
  status: { type: String, enum: ['pending', 'active', 'completed', 'paused'], default: 'active' },
  maxCompletions: { type: Number, required: true }, // 0 means unlimited
  completedCount: { type: Number, default: 0 },
  completedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  startDate: { type: Date },
  endDate: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  verification: {
    type: {
      type: String,
      enum: ['follow', 'like', 'retweet', 'repost', 'comment', 'subscribe', 'view', 'share', 'tag', 'visit', 'custom'],
      required: false
    },
    targetId: { type: String, required: false }, // For 'follow' - target user ID
    targetTweetId: { type: String, required: false }, // For Twitter/X posts
    targetVideoId: { type: String, required: false }, // For TikTok/YouTube videos
    targetPostId: { type: String, required: false }, // For Instagram/Facebook posts
    targetChannelId: { type: String, required: false }, // For YouTube/TikTok channels
    requiresScreenshot: { type: Boolean, default: false }, // Manual verification
    customVerificationDetails: { type: String, required: false } // For custom tasks
  },
  taskDetails: { type: String },
  description: { type: String },
}, { timestamps: true })

const Tasks = mongoose.model('Task', taskSchema)
module.exports = Tasks