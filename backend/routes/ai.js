const express = require('express');
const router  = express.Router();
const gemini  = require('../services/geminiService');

// POST /api/ai/report — generate 5 insight cards (cached 6h)
router.post('/report', async (req, res) => {
    try {
        const { deviceId = 'esp32-1' } = req.body;
        const result = await gemini.generateDetailedReport(deviceId);
        res.json({ success: true, ...result });
    } catch (error) {
        if (error.message.includes('Rate limit'))
            return res.status(429).json({ success: false, error: error.message });
        if (error.message.includes('GOOGLE_GEMINI_API_KEY'))
            return res.status(503).json({ success: false, error: 'Gemini API key not configured in .env' });
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/ai/chat — conversational Q&A
router.post('/chat', async (req, res) => {
    try {
        const { message, history = [], deviceId = 'esp32-1' } = req.body;
        if (!message) return res.status(400).json({ success: false, error: 'message is required' });

        const result = await gemini.chatWithAnalysis(message, history, deviceId);
        res.json({ success: true, ...result });
    } catch (error) {
        if (error.message.includes('Rate limit'))
            return res.status(429).json({ success: false, error: error.message });
        if (error.message.includes('GOOGLE_GEMINI_API_KEY'))
            return res.status(503).json({ success: false, error: 'Gemini API key not configured in .env' });
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/ai/context — debug: see what data gets sent to Gemini
router.get('/context', async (req, res) => {
    try {
        const { deviceId = 'esp32-1' } = req.query;
        const context = await gemini.buildComprehensiveContext(deviceId);
        res.json({ success: true, context });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
