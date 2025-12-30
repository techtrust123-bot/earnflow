// controllers/taskController.js
const mongoose = require('mongoose')
const TwitterTask = require("../models/adminTasks")
const TaskCompletion = require("../models/taskCompletion")
const User = require("../models/user")
const { verifyFollow, verifyLike, verifyRepost, verifyComment } = require("../services/twitterVerify")

exports.completeTwitterTask = async (req, res) => {
  const user = req.user
  const taskId = req.params.id

  try {
    // 1. Find task
    const task = await TwitterTask.findById(taskId)
    if (!task || !task.isActive) {
      return res.status(400).json({ 
        success: false,
        message: "Task unavailable or inactive" 
      })
    }

    // 2. Check Twitter linked
    if (!user.twitter?.id) {
      return res.status(400).json({ 
        success: false,
        message: "Please link your Twitter account first" 
      })
    }

    // 3. Fraud check
    if (user.fraudScore >= 5) {
      return res.status(403).json({ 
        success: false,
        message: "Account under review for suspicious activity" 
      })
    }

    // // 4. Check if already attempted
    // const exists = await TaskCompletion.findOne({ user: user._id, task: taskId })
    // if (exists) {
    //   return res.status(400).json({ 
    //     success: false,
    //     message: "You have already attempted this task" 
    //   })
    // }

    // 5. Rate limiting (prevent spam)
    const recentAttempt = await TaskCompletion.findOne({
      user: user._id,
      task: taskId,
      createdAt: { $gte: new Date(Date.now() - 60_000) } // Last 60 seconds
    })
    if (recentAttempt) {
      return res.status(429).json({
        success: false,
        message: "Please wait before trying again"
      })
    }

    // 6. Verify action per task type
    if (!user.twitter?.token || !user.twitter?.tokenSecret) {
      return res.status(400).json({ success: false, message: 'Please link your Twitter account (full permissions) first' })
    }

    let verified = false
    const vType = (task.verification?.type || '').toLowerCase()
    if (vType === 'follow') {
      verified = await verifyFollow(user.twitter.id, task.verification.targetId, user.twitter.token, user.twitter.tokenSecret)
    } else if (vType === 'like') {
      verified = await verifyLike(user.twitter.id, task.verification.targetTweetId || task.verification.targetId, user.twitter.token, user.twitter.tokenSecret)
    } else if (vType === 'repost' || vType === 'retweet') {
      verified = await verifyRepost(user.twitter.id, task.verification.targetTweetId || task.verification.targetId, user.twitter.token, user.twitter.tokenSecret)
    } else if (vType === 'comment' || vType === 'reply') {
      verified = await verifyComment(user.twitter.id, task.verification.targetTweetId || task.verification.targetId, user.twitter.token, user.twitter.tokenSecret)
    } else {
      return res.status(400).json({ success: false, message: 'Unsupported verification type' })
    }

    if (!verified) {
      // Record failed attempt with details
      await TaskCompletion.create({
        user: user._id,
        task: taskId,
        status: "failed",
        verifiedAt: new Date(),
        verificationType: task.verification?.type || null,
        targetId: task.verification?.targetId || null,
        targetTweetId: task.verification?.targetTweetId || null,
        reason: 'verification_failed'
      })

      return res.status(400).json({ 
        success: false,
        message: "Verification failed. Make sure you completed the task correctly."
      })
    }

    // 7. TRANSACTION: All or nothing
    const session = await mongoose.startSession()
    session.startTransaction()

    try {
      // Create completion record
      const completion = await TaskCompletion.create([{
        user: user._id,
        task: taskId,
        status: "verified",
        verifiedAt: new Date(),
        reverifyUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Re-check for 7 days
        verificationType: task.verification?.type || null,
        targetId: task.verification?.targetId || null,
        targetTweetId: task.verification?.targetTweetId || null
      }], { session })

      // Update task count
      const updatedTask = await TwitterTask.findByIdAndUpdate(
        taskId,
        { $inc: { completedCount: 1 } },
        { new: true, session },
        user.tasksCompleted += 1
      )
      await user.save({ session })

      // Deactivate if limit reached
      if (updatedTask.maxCompletions && updatedTask.completedCount >= updatedTask.maxCompletions) {
        await TwitterTask.findByIdAndUpdate(taskId, { isActive: false }, { session })
      }

      // Add reward and get updated user balance
      const updatedUser = await User.findByIdAndUpdate(
        user._id,
        { $inc: { balance: task.reward } },
        { new: true, session }
      )

      // Mark as rewarded
      completion[0].status = "rewarded"
      completion[0].rewardedAt = new Date()
      await completion[0].save({ session })

      await session.commitTransaction()

      return res.json({
        success: true,
        message: 'Task completed and reward added!',
        reward: task.reward,
        balance: updatedUser.balance
      })

    } catch (transactionErr) {
      await session.abortTransaction()
      throw transactionErr
    } finally {
      session.endSession()
    }

  } catch (error) {
    console.error("Complete Twitter task error:", error)
    return res.status(500).json({
      success: false,
      message: error.message
    })
  }
}

// CRON JOB: Re-verify rewarded tasks (run every 12 hours)
const cron = require("node-cron")

cron.schedule("0 */12 * * *", async () => {
  console.log("🔍 Running Twitter task re-verification job...")

  try {
    const completions = await TaskCompletion.find({
      status: "rewarded",
      reverifyUntil: { $gte: new Date() }
    }).populate("task user")

    for (const completion of completions) {
      await recheckCompletion(completion)
    }

    console.log(`✅ Re-verified ${completions.length} tasks`)
  } catch (error) {
    console.error("❌ Cron job failed:", error)
  }
})

const recheckCompletion = async (completion) => {
  const { task, user } = completion

  if (!task || !user || !user.twitter?.id) return

  let stillValid = false

  // Use verifyTask for rechecks as well
    try {
    const vType = (task.verification?.type || '').toLowerCase()
    if (vType === 'follow') {
      stillValid = await verifyFollow(user.twitter.id, task.verification.targetId, user.twitter.token, user.twitter.tokenSecret)
    } else if (vType === 'like') {
      stillValid = await verifyLike(user.twitter.id, task.verification.targetTweetId || task.verification.targetId, user.twitter.token, user.twitter.tokenSecret)
    } else if (vType === 'repost' || vType === 'retweet') {
      stillValid = await verifyRepost(user.twitter.id, task.verification.targetTweetId || task.verification.targetId, user.twitter.token, user.twitter.tokenSecret)
    } else if (vType === 'comment' || vType === 'reply') {
      stillValid = await verifyComment(user.twitter.id, task.verification.targetTweetId || task.verification.targetId, user.twitter.token, user.twitter.tokenSecret)
    } else {
      stillValid = false
    }
  } catch (err) {
    stillValid = false
  }

  if (stillValid) return // Still following → good

  // User unfollowed → REVOKE REWARD
  await revokeReward(completion, user, task)
}

const revokeReward = async (completion, user, task) => {
  if (completion.status === "revoked") return // Already revoked

  console.log(`⚠️ Revoking reward from user ${user._id} for task ${task._id}`)

  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    // Deduct reward
    user.balance = Math.max(0, user.balance - task.reward)

    // Increase fraud score
    user.fraudScore += task.reward >= 500 ? 2 : 1

    // Suspend if too many violations
    if (user.fraudScore >= 5) {
      user.isSuspended = true
    }

    await user.save({ session })

    // Update completion
    completion.status = "revoked"
    await completion.save({ session })

    // Fix task count
    // task.completedCount = Math.max(0, task.completedCount - 1)
    // task.isActive = true // Re-open if was closed

    if (
     !task.maxCompletions ||
    task.completedCount < task.maxCompletions
    ){
       task.isActive = true
  }

    await task.save({ session })

    await session.commitTransaction()
    console.log(`❌ Reward revoked from user ${user._id}`)
  } catch (err) {
    await session.abortTransaction()
    console.error("Revoke failed:", err)
  } finally {
    session.endSession()
  }
}