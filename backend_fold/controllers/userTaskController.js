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

    // Existing UserTask entries (if any). Support both `owner` and `user` fields.
    const myTasks = await UserTask.find({ $or: [{ owner: userId }, { user: userId }] }).populate('completedBy', 'name email')

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
      action: t.action || 'campaign',
      link: t.taskDetails || t.socialHandle || t.title || '',
      currency: t.currency || 'NGN',
      amount: t.totalAmount || t.totalCost || t.cost || 0,
      slots: t.slots || t.numUsers || t.numUsers,
      status: t.status || t.paymentStatus || (t.isActive ? 'active' : 'pending')
    ,
      completedBy: (t.completedBy || []).map(u => ({ id: u._id, name: u.name, email: u.email }))
    }))

    return res.json({ success: true, tasks: [...mapped, ...tasksOut] })
  } catch (err) {
    console.error('getMyTasks error', err)
    return res.status(500).json({ message: 'Server error' })
  }
}

// Check payment status by reference (used by frontend after popup)
exports.checkPayment = async (req, res) => {
  try {
    const ref = req.params.ref
    if (!ref) return res.status(400).json({ success: false, message: 'Missing reference' })

    const payment = await Payment.findOne({ reference: ref })
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' })

    // If already successful, return immediately
    if (payment.status === 'successful') return res.json({ success: true, status: 'successful', payment })

    // Try verifying with Paystack (only implemented for Paystack flow)
    try {
      const paystack = require('../services/paystack')
      const verify = await paystack.verifyTransaction(ref)
      if (verify.requestSuccessful && verify.responseBody) {
        const data = verify.responseBody
        if (String(data.status).toLowerCase() === 'success') {
          payment.status = 'successful'
          payment.meta = Object.assign({}, payment.meta || {}, { verification: data })
          await payment.save()

          // If this payment was for an approval, mark approval as paid
          if (payment.approval) {
            try {
              const TaskApproval = require('../models/taskApproval')
              const approval = await TaskApproval.findById(payment.approval)
              if (approval) {
                approval.paid = true
                await approval.save()
              }
            } catch (e) { console.warn('checkPayment: approval mark paid failed', e && e.message) }
          }

          return res.json({ success: true, status: 'successful', payment })
        }
      }
    } catch (e) {
      console.warn('checkPayment: verify error', e && e.message)
    }

    // Fallback: return current payment status
    return res.json({ success: false, status: payment.status || 'pending', payment })
  } catch (err) {
    console.error('checkPayment error', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}