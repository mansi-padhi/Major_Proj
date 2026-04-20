const mongoose = require('mongoose');

const aiReportSchema = new mongoose.Schema({
    deviceId: { type: String, default: 'default' },
    insights: [{ title: String, body: String, type: String }],
    generatedAt: { type: Date, default: Date.now }
});

aiReportSchema.index({ deviceId: 1, generatedAt: -1 });

module.exports = mongoose.model('AIReport', aiReportSchema);
