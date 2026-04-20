const express = require('express');
const router = express.Router();
const RelayState = require('../models/RelayState');
const Reading = require('../models/Reading');

// GET /api/relays?deviceId=esp32-1 — get all relay states for a device
router.get('/', async (req, res) => {
    try {
        const { deviceId = 'esp32-1' } = req.query;

        // Check if device is online (last reading within 30 seconds)
        const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
        const lastReading = await Reading.findOne({ deviceId }).sort({ timestamp: -1 });
        const isOnline = lastReading && lastReading.timestamp > thirtySecondsAgo;

        let states = await RelayState.find({ deviceId });

        // If no states exist yet, create defaults
        if (states.length === 0) {
            await RelayState.insertMany([
                { deviceId, channel: 'load1', state: 'off' },
                { deviceId, channel: 'load2', state: 'off' }
            ]);
            states = await RelayState.find({ deviceId });
        }

        res.json({
            success: true,
            deviceId,
            isOnline,
            lastSeen: lastReading ? lastReading.timestamp : null,
            relays: states.map(s => ({
                channel: s.channel,
                state: s.state,
                updatedAt: s.updatedAt
            }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/relays/:channel — set desired relay state
router.post('/:channel', async (req, res) => {
    try {
        const { channel } = req.params;
        const { state, deviceId = 'esp32-1' } = req.body;

        if (!['load1', 'load2'].includes(channel)) {
            return res.status(400).json({ error: 'Channel must be load1 or load2' });
        }
        if (!['on', 'off'].includes(state)) {
            return res.status(400).json({ error: 'State must be on or off' });
        }

        const updated = await RelayState.findOneAndUpdate(
            { deviceId, channel },
            { state, updatedAt: new Date() },
            { upsert: true, new: true }
        );

        res.json({
            success: true,
            channel: updated.channel,
            state: updated.state,
            updatedAt: updated.updatedAt
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/relays/history?channel=load1&limit=20
router.get('/history', async (req, res) => {
    try {
        const { channel, deviceId = 'esp32-1', limit = 20 } = req.query;
        const query = { deviceId };
        if (channel) query.channel = channel;

        // For history we'd need a separate audit log — for now return current state
        const states = await RelayState.find(query).limit(parseInt(limit));
        res.json({ success: true, data: states });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
