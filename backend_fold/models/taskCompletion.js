// models/TaskCompletion.js
const mongoose = require("mongoose")

const taskCompletionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Task"
  },

  status: {
    type: String,
    enum: ['pending', 'verified', 'rewarded', 'revoked', "failed"],
    default: 'pending'
  },

  verifiedAt: Date,
  rewardedAt: Date
  ,
  verificationType: String,
  targetId: String,
  targetTweetId: String,
  reason: String
}, { timestamps: true })

// taskCompletionSchema.index({ user: 1, task: 1 }, { unique: true })

const TaskCompletion = mongoose.model("TaskCompletion", taskCompletionSchema)

module.exports = TaskCompletion
