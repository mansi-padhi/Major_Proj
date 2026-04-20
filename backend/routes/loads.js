const express = require('express');
const router = express.Router();
const Reading = require('../models/Reading');

// GET - Get all loads summary
router.get('/summary', async (req, res) => {
    try {
        const { period = 'today' } = req.query;

        let startDate;
        const now = new Date();

        if (period === 'today') {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        } else if (period === 'month') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (period === 'year') {
            startDate = new Date(now.getFullYear(), 0, 1);
        }

        const loadsSummary = await Reading.aggregate([
            {
                $match: {
                    timestamp: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: '$loadId',
                    loadName: { $first: '$loadName' },
                    totalEnergy: { $sum: '$energy' },
                    avgPower: { $avg: '$power' },
                    maxPower: { $max: '$power' },
                    avgVoltage: { $avg: '$voltage' },
                    avgCurrent: { $avg: '$current' },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        const ELECTRICITY_RATE = 3; // ₹ per kWh

        const loads = loadsSummary.map(load => ({
            loadId: load._id,
            loadName: load.loadName,
            energy: parseFloat(load.totalEnergy.toFixed(3)),
            cost: parseFloat((load.totalEnergy * ELECTRICITY_RATE).toFixed(2)),
            avgPower: parseFloat(load.avgPower.toFixed(2)),
            maxPower: parseFloat(load.maxPower.toFixed(2)),
            avgVoltage: parseFloat(load.avgVoltage.toFixed(2)),
            avgCurrent: parseFloat(load.avgCurrent.toFixed(3)),
            readings: load.count
        }));

        res.json({
            success: true,
            period,
            loads
        });
    } catch (error) {
        console.error('Error fetching loads summary:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
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
