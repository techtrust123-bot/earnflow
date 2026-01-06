// controllers/userTaskController.js
const UserTask = require('../models/userTask');
const Payment = require('../models/payment');
const User = require('../models/user');
const Transaction = require('../models/transaction');
const crypto = require('crypto');
const TaskApproval = require('../models/taskApproval')

exports.createUserTask = async (req, res) => {
  const {
    title,
    platform = 'twitter',
    action = 'follow',
    socialHandle,
    numUsers,
    taskAmount,
    currency = 'NGN',
    paymentMethods = ['CARD','ACCOUNT_TRANSFER'],
    startDate,
    endDate,
    tags = [],
    taskDetails
  } = req.body;

  const userId = req.user && (req.user._id || req.user.id);

  // Basic validation
  if (!socialHandle || !numUsers || !taskAmount || !taskDetails) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  if (Number(numUsers) < 100) return res.status(400).json({ message: 'Minimum 100 users' });
  if (Number(taskAmount) < 50) return res.status(400).json({ message: 'Minimum ₦50 per task' });

  const baseAmount = Math.round(Number(taskAmount) * Number(numUsers));
  const commission = Math.round(baseAmount * 0.10);
  const totalAmount = Math.round(baseAmount + commission);

  try {
    const paymentReference = `UTASK_${Date.now()}_${userId}`;

    // Pay with wallet balance
    const payWithBalance = req.body.payWithBalance === true;
    if (payWithBalance) {
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: 'User not found' });
      if (user.balance < totalAmount) return res.status(400).json({ message: 'Insufficient wallet balance' });

      user.balance = Math.max(0, user.balance - totalAmount);
      await user.save();

      const task = await UserTask.create({
        owner: userId,
        title: title || '',
        platform,
        action,
        socialHandle,
        slots: Number(numUsers),
        amount: Number(taskAmount),
        currency,
        cost: baseAmount,
        commission,
        totalCost: totalAmount,
        taskDetails,
        tags: Array.isArray(tags) ? tags : String(tags).split(',').map(t => t.trim()).filter(Boolean),
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        paymentReference,
        paid: true,
        paymentMethod: 'balance',
        status: 'active',
        isActive: true
      });

      await Payment.create({
        user: userId,
        task: task._id,
        reference: paymentReference,
        amount: totalAmount,
        status: 'successful',
        method: 'balance',
        paidOn: new Date()
      });

      try {
        await Transaction.create({
          user: userId,
          type: 'debit',
          amount: totalAmount,
          description: `Task payment (${task.title || task.action})`,
          status: 'successful',
          reference: paymentReference,
          related: task._id,
          relatedModel: 'user-tasks'
        });
      } catch (e) {
        console.warn('createUserTask: transaction record failed', e.message);
      }

      return res.json({
        success: true,
        message: 'Task created and activated using wallet balance',
        totalAmount,
        remainingBalance: user.balance
      });
    }

    // MONNIFY PAYMENT — RETURN SDK PARAMS FOR INLINE CHECKOUT
    const sdkParams = {
      amount: totalAmount,
      currency: "NGN",
      reference: paymentReference,
      customerName: req.user.name || "User",
      customerEmail: req.user.email,
      publicKey: process.env.PAYSTACK_PUBLIC_KEY,
      paymentDescription: title ? `Task: ${title}` : "Sponsored Task",
      metadata: {
        taskId: "pending",
        userId: userId.toString()
      },
      paymentMethods: paymentMethods
    };

    // Save pending task
    const task = await UserTask.create({
      owner: userId,
      title: title || '',
      platform,
      action,
      socialHandle,
      slots: Number(numUsers),
      amount: Number(taskAmount),
      currency,
      cost: baseAmount,
      commission,
      totalCost: totalAmount,
      taskDetails,
      tags: Array.isArray(tags) ? tags : String(tags).split(',').map(t => t.trim()).filter(Boolean),
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      paymentReference,
      paid: false,
      paymentMethod: 'paystack',
      status: 'pending'
    });

    await Payment.create({
      user: userId,
      task: task._id,
      reference: paymentReference,
      amount: totalAmount,
      status: 'pending'
    });

    // RETURN SDK PARAMS TO FRONTEND
    return res.json({
      success: true,
      message: "Ready for payment",
      paymentData: sdkParams,
      totalAmount,
      commission
    });

  } catch (err) {
    console.error('createUserTask error:', err.response?.data || err.message || err);
    return res.status(500).json({ message: 'Failed to create task' });
  }
};

// Return user's tasks (existing campaigns and approved approvals pending payment)
exports.getMyTasks = async (req, res) => {
  try {
    const userId = req.user && (req.user._id || req.user.id)
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })

    // Existing UserTask entries (if any)
    const myTasks = await UserTask.find({ owner: userId })

    // Approved approvals belonging to user that are not paid
    const approvals = await TaskApproval.find({ owner: userId, status: 'approved', paid: false })

    // Map approvals to a common shape expected by frontend
    const mapped = approvals.map(a => ({
      _id: a._id,
      action: a.action,
      link: a.url || a.socialHandle || a.title,
      currency: a.currency || 'NGN',
      amount: (100 * (a.numUsers || 1)),
      slots: a.numUsers || 1,
      status: 'approved',
      approval: true
    }))

    const tasksOut = (myTasks || []).map(t => ({
      _id: t._id,
      action: t.action,
      link: t.taskDetails || t.socialHandle,
      currency: t.currency || 'NGN',
      amount: t.totalAmount || t.cost || 0,
      slots: t.slots || t.numUsers,
      status: t.status || 'pending'
    }))

    return res.json({ success: true, tasks: [...mapped, ...tasksOut] })
  } catch (err) {
    console.error('getMyTasks error', err)
    return res.status(500).json({ message: 'Server error' })
  }
}