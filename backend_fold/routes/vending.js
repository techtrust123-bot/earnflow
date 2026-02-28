const express = require('express');
const router = express.Router();
const { protect } = require('../middleweres/authmiddlewere');
const vendingController = require('../controllers/vendingController');
const { body, validationResult } = require('express-validator');

// initiate vend
router.post('/initiate',
  protect,
  [
    body('amount').isNumeric().withMessage('amount must be numeric'),
    body('transactionId').notEmpty().withMessage('transactionId required')
  ],
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ success: false, errors: errs.array() });
    vendingController.initiate(req, res);
  }
);

router.get('/status/:id', protect, vendingController.status);

module.exports = router;
