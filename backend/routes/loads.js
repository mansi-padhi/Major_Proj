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

// GET /api/loads/month - Daily breakdown for current month (per load)
router.get('/month', async (req, res) => {
    try {
        const { deviceId, month, year } = req.query;
        const currentDate = new Date();
        const targetMonth = month ? parseInt(month) - 1 : currentDate.getMonth();
        const targetYear = year ? parseInt(year) : currentDate.getFullYear();

        const startOfMonth = new Date(targetYear, targetMonth, 1);
        const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

        const matchStage = {
            timestamp: { $gte: startOfMonth, $lte: endOfMonth }
        };
        if (deviceId) matchStage.deviceId = deviceId;

        // Aggregate by loadId and day
        const dailyByLoad = await Reading.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: {
                        loadId: '$loadId',
                        day: { $dayOfMonth: '$timestamp' }
                    },
                    loadName: { $first: '$loadName' },
                    totalEnergy: { $sum: '$energy' },
                    avgPower: { $avg: '$power' },
                    maxPower: { $max: '$power' }
                }
            },
            { $sort: { '_id.loadId': 1, '_id.day': 1 } }
        ]);

        // Get totals per load for the month
        const monthTotals = await Reading.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$loadId',
                    loadName: { $first: '$loadName' },
                    totalEnergy: { $sum: '$energy' },
                    avgPower: { $avg: '$power' },
                    maxPower: { $max: '$power' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Format daily data by load
        const loadData = {};
        dailyByLoad.forEach(item => {
            const loadId = item._id.loadId;
            if (!loadData[loadId]) {
                loadData[loadId] = {
                    loadId,
                    loadName: item.loadName,
                    daily: []
                };
            }
            loadData[loadId].daily.push({
                day: item._id.day,
                label: `Day ${item._id.day}`,
                energyKwh: parseFloat(item.totalEnergy.toFixed(8)),
                costINR: parseFloat((item.totalEnergy * RATE).toFixed(4)),
                avgPowerW: Math.round(item.avgPower),
                maxPowerW: Math.round(item.maxPower)
            });
        });

        // Format totals
        const totals = monthTotals.map(l => ({
            loadId: l._id,
            loadName: l.loadName,
            energyKwh: parseFloat(l.totalEnergy.toFixed(8)),
            costINR: parseFloat((l.totalEnergy * RATE).toFixed(4)),
            avgPowerW: Math.round(l.avgPower),
            maxPowerW: Math.round(l.maxPower)
        }));

        res.json({
            success: true,
            loads: Object.values(loadData),
            totals,
            month: targetMonth + 1,
            year: targetYear
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/loads/year - Monthly breakdown for current year (per load)
router.get('/year', async (req, res) => {
    try {
        const { deviceId, year } = req.query;
        const targetYear = year ? parseInt(year) : new Date().getFullYear();
        const startOfYear = new Date(targetYear, 0, 1);
        const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59);

        const matchStage = {
            timestamp: { $gte: startOfYear, $lte: endOfYear }
        };
        if (deviceId) matchStage.deviceId = deviceId;

        // Aggregate by loadId and month
        const monthlyByLoad = await Reading.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: {
                        loadId: '$loadId',
                        month: { $month: '$timestamp' }
                    },
                    loadName: { $first: '$loadName' },
                    totalEnergy: { $sum: '$energy' },
                    avgPower: { $avg: '$power' },
                    maxPower: { $max: '$power' }
                }
            },
            { $sort: { '_id.loadId': 1, '_id.month': 1 } }
        ]);

        // Get totals per load for the year
        const yearTotals = await Reading.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$loadId',
                    loadName: { $first: '$loadName' },
                    totalEnergy: { $sum: '$energy' },
                    avgPower: { $avg: '$power' },
                    maxPower: { $max: '$power' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Format monthly data by load
        const loadData = {};
        monthlyByLoad.forEach(item => {
            const loadId = item._id.loadId;
            if (!loadData[loadId]) {
                loadData[loadId] = {
                    loadId,
                    loadName: item.loadName,
                    monthly: []
                };
            }
            loadData[loadId].monthly.push({
                month: item._id.month,
                label: monthNames[item._id.month],
                energyKwh: parseFloat(item.totalEnergy.toFixed(8)),
                costINR: parseFloat((item.totalEnergy * RATE).toFixed(4)),
                avgPowerW: Math.round(item.avgPower),
                maxPowerW: Math.round(item.maxPower)
            });
        });

        // Format totals
        const totals = yearTotals.map(l => ({
            loadId: l._id,
            loadName: l.loadName,
            energyKwh: parseFloat(l.totalEnergy.toFixed(8)),
            costINR: parseFloat((l.totalEnergy * RATE).toFixed(4)),
            avgPowerW: Math.round(l.avgPower),
            maxPowerW: Math.round(l.maxPower)
        }));

        res.json({
            success: true,
            loads: Object.values(loadData),
            totals,
            year: targetYear
        });
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
