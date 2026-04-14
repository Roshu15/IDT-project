const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  temperature: { type: Number, required: true },
  students: { type: Number, required: true },
  lights: { type: String, required: true },
  fans: { type: String, required: true },
  fanSpeed: { type: String, required: true },
  energy: { type: Number, required: true },
  mode: { type: String, required: true },
  decision: { type: String }
});

module.exports = mongoose.model('Log', logSchema);
