const express = require('express');
const router = express.Router();
const Subscriber = require('../models/Subscriber');
const telegramService = require('../services/telegramService');

// POST /api/telegram/register — called by bot on /start
router.post('/register', async (req, res) => {
    try {
        const { chat_id } = req.body;
        if (!chat_id) return res.status(400).json({ error: 'chat_id required' });

        await Subscriber.findOneAndUpdate(
            { chat_id: String(chat_id) },
            { active: true, subscribedAt: new Date() },
            { upsert: true }
        );

        res.json({ success: true, message: 'Subscriber registered' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/telegram/test — send test alert to all subscribers
router.post('/test', async (req, res) => {
    try {
        const subscribers = await Subscriber.find({ active: true });
        if (subscribers.length === 0) {
            return res.json({ success: false, message: 'No active subscribers. Send /start to the bot first.' });
        }

        await telegramService.sendAlert({
            type: 'test',
            severity: 'warning',
            value: 42,
            threshold: 40,
            unit: '°C',
            timestamp: new Date()
        });

        res.json({ success: true, message: `Test alert sent to ${subscribers.length} subscriber(s)` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
