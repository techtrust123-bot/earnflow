const mongoose = require('mongoose')

const supportInteractionSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  hour: {
    type: String,
    required: true,
    index: true
  },
  customerQueries: {
    type: Number,
    default: 0
  },
  activeSupport: {
    type: Number,
    default: 0
  },
  resolvedIssues: {
    type: Number,
    default: 0
  },
  averageResponseTime: {
    type: Number,
    default: 0
  },
  satisfactionScore: {
    type: Number,
    min: 0,
    max: 5,
    default: 4
  },
  totalTickets: {
    type: Number,
    default: 0
  }
}, { timestamps: true })

module.exports = mongoose.model('SupportInteraction', supportInteractionSchema)
