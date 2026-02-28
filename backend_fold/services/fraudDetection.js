const TaskCompletion = require('../models/taskCompletion');
const AuditLog = require('../models/auditLog');
const User = require('../models/user');

// Calculate user fraud score based on multiple factors
exports.calculateFraudScore = async (user, context = {}) => {
  let fraudScore = 0;
  const indicators = [];

  try {
    // 1. Account age
    const accountAgeDays = (Date.now() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24);
    if (accountAgeDays < 1) {
      fraudScore += 25;
      indicators.push('brand_new_account');
    } else if (accountAgeDays < 7) {
      fraudScore += 15;
      indicators.push('very_new_account');
    }

    // 2. Email verification
    if (!user.isAccountVerify) {
      fraudScore += 20;
      indicators.push('unverified_email');
    }

    // 3. Failed verification attempts (last 24h)
    const failedCompletions = await TaskCompletion.countDocuments({
      user: user._id,
      status: 'failed',
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    if (failedCompletions > 10) {
      fraudScore += 30;
      indicators.push(`high_failed_attempts:${failedCompletions}`);
    }

    // 4. Rapid task completion (last 30 min)
    const tasksLast30Min = await TaskCompletion.countDocuments({
      user: user._id,
      createdAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) }
    });

    if (tasksLast30Min > 20) {
      fraudScore += 35;
      indicators.push(`rapid_completions:${tasksLast30Min}/30min`);
    }

    // 5. Duplicate task attempts
    const taskDuplicates = await TaskCompletion.aggregate([
      { $match: { user: user._id } },
      { $group: { _id: '$task', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]);

    if (taskDuplicates.length > 0) {
      fraudScore += Math.min(taskDuplicates.length * 10, 35);
      indicators.push(`duplicate_task_attempts:${taskDuplicates.length}`);
    }

    // 6. Abnormally high avg reward
    const totalEarnings = user.balance + (user.totalDebited || 0);
    const rewardedTasks = await TaskCompletion.countDocuments({
      user: user._id,
      status: 'rewarded'
    });

    if (rewardedTasks > 0) {
      const avgReward = totalEarnings / rewardedTasks;
      if (avgReward > 5000) {
        fraudScore += 20;
        indicators.push(`high_avg_reward:${avgReward.toFixed(0)}`);
      }
    }

    // 7. Failed withdrawal attempts (last 24h)
    const failedWithdrawals = await AuditLog.countDocuments({
      user: user._id,
      action: 'withdrawal_failed',
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    if (failedWithdrawals > 3) {
      fraudScore += 15;
      indicators.push(`multiple_failed_withdrawals:${failedWithdrawals}`);
    }

    // 8. Check for referral chain abuse
    if ((user.referrals || 0) > 50) {
      fraudScore += 20;
      indicators.push(`many_referrals:${user.referrals}`);
    }

  } catch (err) {
    console.error('Fraud score calculation failed:', err);
  }

  fraudScore = Math.min(fraudScore, 100);

  return {
    fraudScore,
    indicators,
    level: fraudScore >= 80 ? 'critical' : 
           fraudScore >= 50 ? 'high' : 
           fraudScore >= 25 ? 'medium' : 'low'
  };
};

// Determine if withdrawal should be blocked/reviewed
exports.shouldBlockWithdrawal = async (user, amount) => {
  const fraud = await exports.calculateFraudScore(user, { withdrawal: true });

  if (fraud.fraudScore >= 80) {
    return {
      blocked: true,
      reason: 'High fraud risk detected',
      contactSupport: true,
      fraudScore: fraud.fraudScore
    };
  }

  if (fraud.fraudScore >= 50) {
    return {
      requiresManualReview: true,
      reason: 'Transaction requires manual approval',
      fraudScore: fraud.fraudScore,
      indicators: fraud.indicators
    };
  }

  return { 
    blocked: false, 
    fraudScore: fraud.fraudScore 
  };
};

// Check for impossible geographic movement
exports.checkImpossibleMovement = async (userSessions) => {
  if (userSessions.length < 2) return false;

  // Simple check: if same user in two different continents within 5 minutes
  // This is a placeholder - would need geocoding library for production
  
  for (let i = 1; i < userSessions.length; i++) {
    const session1 = userSessions[i - 1];
    const session2 = userSessions[i];
    
    const timeDiffMinutes = (session2.createdAt - session1.createdAt) / (1000 * 60);
    
    // If IPs are very different but time is very short, flag it
    if (timeDiffMinutes < 5 && session1.ipAddress !== session2.ipAddress) {
      // In production, check if these IPs are geographically far apart
      // For now, just flag rapid IP changes
      return true;
    }
  }
  
  return false;
};