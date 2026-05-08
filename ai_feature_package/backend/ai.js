const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');
const geminiService = require('../services/geminiService');

// ============ ANTHROPIC CLAUDE ENDPOINTS ============

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

// ============ GOOGLE GEMINI ENDPOINTS ============

// POST /api/ai/gemini/analyze
// Comprehensive data analysis using Gemini
router.post('/gemini/analyze', async (req, res) => {
    try {
        const { deviceId = 'default' } = req.body;
        const result = await geminiService.analyzeData(deviceId);
        res.json({ success: true, ...result });
    } catch (error) {
        if (error.message.includes('Rate limit')) {
            return res.status(429).json({ error: error.message });
        }
        if (error.message.includes('GOOGLE_GEMINI_API_KEY')) {
            return res.status(503).json({ error: 'Google Gemini API key not configured' });
        }
        res.status(500).json({ error: error.message });
    }
});

// POST /api/ai/gemini/chat
// Chat with Gemini about energy data
router.post('/gemini/chat', async (req, res) => {
    try {
        const { message, history = [], deviceId = 'default' } = req.body;
        if (!message) return res.status(400).json({ error: 'message is required' });

        const result = await geminiService.chatWithAnalysis(message, history, deviceId);
        res.json({ success: true, ...result });
    } catch (error) {
        if (error.message.includes('Rate limit')) {
            return res.status(429).json({ error: error.message });
        }
        if (error.message.includes('GOOGLE_GEMINI_API_KEY')) {
            return res.status(503).json({ error: 'Google Gemini API key not configured' });
        }
        res.status(500).json({ error: error.message });
    }
});

// POST /api/ai/gemini/report
// Detailed report generation with caching
router.post('/gemini/report', async (req, res) => {
    try {
        const { deviceId = 'default' } = req.body;
        const result = await geminiService.generateDetailedReport(deviceId);
        res.json({ success: true, ...result });
    } catch (error) {
        if (error.message.includes('Rate limit')) {
            return res.status(429).json({ error: error.message });
        }
        if (error.message.includes('GOOGLE_GEMINI_API_KEY')) {
            return res.status(503).json({ error: 'Google Gemini API key not configured' });
        }
        res.status(500).json({ error: error.message });
    }
});

// GET /api/ai/gemini/context
// Get the data context used for analysis (useful for debugging)
router.get('/gemini/context', async (req, res) => {
    try {
        const { deviceId = 'default' } = req.query;
        const context = await geminiService.buildComprehensiveContext(deviceId);
        res.json({ success: true, context });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
