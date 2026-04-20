const mongoose = require('mongoose');

const relayStateSchema = new mongoose.Schema({
    deviceId: { type: String, required: true, index: true },
    channel: { type: String, enum: ['load1', 'load2'], required: true },
    state: { type: String, enum: ['on', 'off'], default: 'off' },
    updatedAt: { type: Date, default: Date.now }
});

relayStateSchema.index({ deviceId: 1, channel: 1 }, { unique: true });

module.exports = mongoose.model('RelayState', relayStateSchema);
