const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
    deviceId: { type: String, required: true, index: true },
    type: { type: String, required: true }, // 'voltage', 'current', 'temperature', 'smoke', 'motion'
    severity: { type: String, enum: ['warning', 'critical'], required: true },
    value: { type: Number, required: true },
    threshold: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now, index: true },
    acknowledged: { type: Boolean, default: false }
});

alertSchema.index({ deviceId: 1, timestamp: -1 });

module.exports = mongoose.model('Alert', alertSchema);
