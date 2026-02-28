const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  provider: { type: String, required: true, index: true },
  reportDate: { type: Date, required: true, index: true },
  rawData: mongoose.Schema.Types.Mixed,
  processed: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('ProviderReport', reportSchema);