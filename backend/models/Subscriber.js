const mongoose = require('mongoose');

const subscriberSchema = new mongoose.Schema({
    chat_id: { type: String, required: true, unique: true },
    subscribedAt: { type: Date, default: Date.now },
    active: { type: Boolean, default: true }
});

module.exports = mongoose.model('Subscriber', subscriberSchema);
