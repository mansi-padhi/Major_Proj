const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');

// POST /api/ai/report
router.post('/report', async (req, res) => {
    try {
        const { deviceId = 'default' } = req.body;
        const result = await aiService.generateReport(deviceId);
        res.json({ success: true, ...result });
    } catch (error) {
        if (error.message.includes('Rate limit')) {
            return res.status(429).json({ error: error.message });
        }
        if (error.message.includes('ANTHROPIC_API_KEY')) {
            return res.status(503).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
});

// POST /api/ai/chat
router.post('/chat', async (req, res) => {
    try {
        const { message, history = [], deviceId = 'default' } = req.body;
        if (!message) return res.status(400).json({ error: 'message is required' });

        const reply = await aiService.chat(message, history, deviceId);
        res.json({ success: true, reply });
    } catch (error) {
        if (error.message.includes('Rate limit')) {
            return res.status(429).json({ error: error.message });
        }
        if (error.message.includes('ANTHROPIC_API_KEY')) {
            return res.status(503).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
