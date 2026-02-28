const vendingService = require('../services/vendingService');

// POST /vends/initiate
exports.initiate = async (req, res) => {
  try {
    const userId = req.user._id;
    const { provider, amount, phone, plan, transactionId } = req.body;
    const result = await vendingService.initiateVend({ userId, provider, amount, phone, plan, transactionId });
    return res.status(202).json({ success: true, hold: result.hold, vending: result.vending });
  } catch (err) {
    console.error('vending initiate error', err);
    if (err.message && err.message.includes('Insufficient')) {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (err.code === 11000) {
      // duplicate transactionId
      return res.status(409).json({ success: false, message: 'Duplicate transactionId' });
    }
    return res.status(500).json({ success: false, message: 'Could not create vend', error: err.message });
  }
};

// GET /vends/status/:id
exports.status = async (req, res) => {
  try {
    const vend = await require('../models/vendingTransaction').findById(req.params.id);
    if (!vend) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, vending: vend });
  } catch (err) {
    console.error('vending status error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
