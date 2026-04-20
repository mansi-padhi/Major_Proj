const mongoose = require('mongoose');

const thresholdSchema = new mongoose.Schema({
    deviceId: { type: String, default: 'default', unique: true },
    voltage: {
        warnMin: { type: Number, default: 210 },
        warnMax: { type: Number, default: 250 },
        critMin: { type: Number, default: 190 },
        critMax: { type: Number, default: 260 }
    },
    current: {
        warnMax: { type: Number, default: 8 },
        critMax: { type: Number, default: 12 }
    },
    temperature: {
        warnMax: { type: Number, default: 40 },
        critMax: { type: Number, default: 55 }
    },
    smoke: {
        warnMax: { type: Number, default: 300 },
        critMax: { type: Number, default: 500 }
    }
}, { timestamps: true });

module.exports = mongoose.model('Threshold', thresholdSchema);
