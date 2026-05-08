const mongoose = require('mongoose');

const aiReportSchema = new mongoose.Schema({
    deviceId: { type: String, default: 'default' },
    insights: { type: mongoose.Schema.Types.Mixed }, // supports both array and object formats
    source: { type: String, default: 'gemini' },
    generatedAt: { type: Date, default: Date.now }
});

aiReportSchema.index({ deviceId: 1, generatedAt: -1 });

module.exports = mongoose.model('AIReport', aiReportSchema);
