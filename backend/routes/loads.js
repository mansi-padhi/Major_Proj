const express = require('express');
const router = express.Router();
const Reading = require('../models/Reading');

const RATE = 8; // ₹8 per kWh

// GET /api/loads/summary?startDate=&endDate=  (or ?period=today|month|year)
router.get('/summary', async (req, res) => {
    try {
        const { period, startDate, endDate, deviceId } = req.query;
        const now = new Date();

        let start, end;

        if (startDate && endDate) {
            start = new Date(startDate);
            end = new Date(endDate);
        } else {
            switch (period) {
                case 'month':
                    start = new Date(now.getFullYear(), now.getMonth(), 1);
                    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                    break;
                case 'year':
                    start = new Date(now.getFullYear(), 0, 1);
                    end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
                    break;
                default: // today
                    start = new Date(now); start.setHours(0, 0, 0, 0);
                    end = new Date(now); end.setHours(23, 59, 59, 999);
            }
        }

        const matchStage = { timestamp: { $gte: start, $lte: end } };
        if (deviceId) matchStage.deviceId = deviceId;

        const summary = await Reading.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$loadId',
                    loadName: { $first: '$loadName' },
                    totalEnergy: { $sum: '$energy' },
                    avgPower: { $avg: '$power' },
                    maxPower: { $max: '$power' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const loads = summary.map(l => ({
            loadId: l._id,
            loadName: l.loadName,
            energyKwh: parseFloat(l.totalEnergy.toFixed(6)),
            costINR: parseFloat((l.totalEnergy * RATE).toFixed(2)),
            avgPowerW: parseFloat(l.avgPower.toFixed(1)),
            maxPowerW: parseFloat(l.maxPower.toFixed(1)),
            readings: l.count
        }));

        res.json({ success: true, loads, rate: RATE });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET - Get specific load data
router.get('/:loadId', async (req, res) => {
    try {
        const { loadId } = req.params;
        const { period = 'today', limit = 100 } = req.query;

        let startDate;
        const now = new Date();

        if (period === 'today') {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        } else if (period === 'month') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (period === 'year') {
            startDate = new Date(now.getFullYear(), 0, 1);
        }

        const readings = await Reading.find({
            loadId,
            timestamp: { $gte: startDate }
        })
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .lean();

        res.json({
            success: true,
            loadId,
            period,
            count: readings.length,
            data: readings
        });
    } catch (error) {
        console.error('Error fetching load data:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
