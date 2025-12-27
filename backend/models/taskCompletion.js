// models/TaskCompletion.js
const mongoose = require("mongoose")

const taskCompletionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TwitterTask"
  },

  status: {
    type: String,
    enum: ['pending', 'verified', 'rewarded', 'revoked'],
    default: 'pending'
  },

  verifiedAt: Date,
  rewardedAt: Date
}, { timestamps: true })

taskCompletionSchema.index({ user: 1, task: 1 }, { unique: true })

const TaskCompletion = mongoose.model("TaskCompletion", taskCompletionSchema)

module.exports = TaskCompletion
