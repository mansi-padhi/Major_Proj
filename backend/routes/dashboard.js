const express = require('express');
const router = express.Router();
const Reading = require('../models/Reading');

// GET - Dashboard summary data
router.get('/summary', async (req, res) => {
  try {
    const { deviceId } = req.query;
    const now = new Date();

    // Today's data (create fresh Date object)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayQuery = { timestamp: { $gte: startOfToday } };
    if (deviceId) todayQuery.deviceId = deviceId;

    // This month's data (create fresh Date object)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const monthQuery = { timestamp: { $gte: startOfMonth } };
    if (deviceId) monthQuery.deviceId = deviceId;

    // Get all stats in parallel
    const [todayStats, monthStats, latestReading, totalDevices] = await Promise.all([
      Reading.aggregate([
        { $match: todayQuery },
        {
          $group: {
            _id: null,
            totalEnergy: { $sum: '$energy' },
            avgPower: { $avg: '$power' },
            maxPower: { $max: '$power' },
            count: { $sum: 1 }
          }
        }
      ]),
      Reading.aggregate([
        { $match: monthQuery },
        {
          $group: {
            _id: null,
            totalEnergy: { $sum: '$energy' },
            avgPower: { $avg: '$power' },
            maxPower: { $max: '$power' },
            count: { $sum: 1 }
          }
        }
      ]),
      Reading.findOne(deviceId ? { deviceId } : {}).sort({ timestamp: -1 }),
      Reading.distinct('deviceId')
    ]);

    const ELECTRICITY_RATE = parseFloat(process.env.ELECTRICITY_RATE) || 7.0; // ₹7/kWh

    res.json({
      success: true,
      today: {
        energy: (todayStats[0]?.totalEnergy || 0).toFixed(8),
        cost: ((todayStats[0]?.totalEnergy || 0) * ELECTRICITY_RATE).toFixed(4),
        avgPower: todayStats[0]?.avgPower.toFixed(2) || 0,
        maxPower: todayStats[0]?.maxPower.toFixed(2) || 0,
        readings: todayStats[0]?.count || 0
      },
      month: {
        energy: (monthStats[0]?.totalEnergy || 0).toFixed(8),
        cost: ((monthStats[0]?.totalEnergy || 0) * ELECTRICITY_RATE).toFixed(4),
        avgPower: monthStats[0]?.avgPower.toFixed(2) || 0,
        maxPower: monthStats[0]?.maxPower.toFixed(2) || 0,
        readings: monthStats[0]?.count || 0
      },
      latest: latestReading ? {
        deviceId: latestReading.deviceId,
        voltage: latestReading.voltage,
        current: latestReading.current,
        power: latestReading.power,
        energy: latestReading.energy,
        timestamp: latestReading.timestamp
      } : null,
      devices: {
        total: totalDevices.length,
        active: latestReading ? 1 : 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/dashboard/today — hourly kWh breakdown + live power for today tab
router.get('/today', async (req, res) => {
  try {
    const { deviceId } = req.query;
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const matchStage = { timestamp: { $gte: startOfToday } };
    if (deviceId) matchStage.deviceId = deviceId;

    // Hourly energy aggregation — one bar per hour
    const hourlyRaw = await Reading.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $hour: '$timestamp' },
          totalEnergy: { $sum: '$energy' },
          avgPower: { $avg: '$power' },
          // per-load breakdown (scalable to 2 loads)
          loads: {
            $push: { loadId: '$loadId', energy: '$energy', power: '$power' }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Fill all 24 hours (0-23), zero for hours with no data
    const RATE = 8.0; // ₹8 per kWh
    
    const hourly = Array.from({ length: 24 }, (_, h) => {
      const found = hourlyRaw.find(r => r._id === h);
      return {
        hour: h,
        label: `${String(h).padStart(2, '0')}:00`,
        energyKwh: found ? parseFloat(found.totalEnergy.toFixed(8)) : 0,
        costINR: found ? parseFloat((found.totalEnergy * RATE).toFixed(4)) : 0,
        avgPowerW: found ? parseFloat(found.avgPower.toFixed(1)) : 0
      };
    });

    // Latest reading for live power gauge
    const latestQuery = deviceId ? { deviceId } : {};
    const latest = await Reading.findOne(latestQuery).sort({ timestamp: -1 });

    // Today totals
    const todayTotals = await Reading.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalEnergy: { $sum: '$energy' },
          avgPower: { $avg: '$power' },
          maxPower: { $max: '$power' }
        }
      }
    ]);

    const totals = todayTotals[0] || { totalEnergy: 0, avgPower: 0, maxPower: 0 };

    res.json({
      success: true,
      hourly,
      live: latest ? {
        powerW: parseFloat(latest.power.toFixed(1)),
        currentA: parseFloat(latest.current.toFixed(3)),
        voltageV: parseFloat(latest.voltage.toFixed(1)),
        timestamp: latest.timestamp,
        // per-load data (scalable)
        loadId: latest.loadId,
        loadName: latest.loadName
      } : null,
      totals: {
        energyKwh: parseFloat(totals.totalEnergy.toFixed(8)),
        costINR: parseFloat((totals.totalEnergy * RATE).toFixed(4)),
        avgPowerW: parseFloat(totals.avgPower.toFixed(1)),
        maxPowerW: parseFloat(totals.maxPower.toFixed(1))
      },
      rate: RATE
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - Real-time stats (last 5 minutes)
router.get('/realtime', async (req, res) => {
  try {
    const { deviceId } = req.query;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const query = { timestamp: { $gte: fiveMinutesAgo } };
    if (deviceId) query.deviceId = deviceId;

    const readings = await Reading.find(query)
      .sort({ timestamp: -1 })
      .limit(50);

    const stats = await Reading.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          avgVoltage: { $avg: '$voltage' },
          avgCurrent: { $avg: '$current' },
          avgPower: { $avg: '$power' },
          maxPower: { $max: '$power' },
          minPower: { $min: '$power' }
        }
      }
    ]);

    res.json({
      success: true,
      readings: readings.reverse(),
      stats: stats[0] || {},
      count: readings.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;


// GET /api/dashboard/month — daily kWh breakdown for month tab
router.get('/month', async (req, res) => {
  try {
    const { deviceId } = req.query;
    const now = new Date();
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const matchStage = { timestamp: { $gte: startOfMonth } };
    if (deviceId) matchStage.deviceId = deviceId;

    // Daily energy aggregation
    const dailyRaw = await Reading.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dayOfMonth: '$timestamp' },
          totalEnergy: { $sum: '$energy' },
          avgPower: { $avg: '$power' },
          maxPower: { $max: '$power' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const RATE = 8.0; // ₹8 per kWh
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    // Fill all days of month
    const daily = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const found = dailyRaw.find(r => r._id === day);
      return {
        day,
        label: `Day ${day}`,
        energyKwh: found ? parseFloat(found.totalEnergy.toFixed(8)) : 0,
        costINR: found ? parseFloat((found.totalEnergy * RATE).toFixed(4)) : 0,
        avgPowerW: found ? parseFloat(found.avgPower.toFixed(1)) : 0
      };
    });

    // Month totals
    const monthTotals = await Reading.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalEnergy: { $sum: '$energy' },
          avgPower: { $avg: '$power' },
          maxPower: { $max: '$power' }
        }
      }
    ]);

    const totals = monthTotals[0] || { totalEnergy: 0, avgPower: 0, maxPower: 0 };

    res.json({
      success: true,
      daily,
      totals: {
        energyKwh: parseFloat(totals.totalEnergy.toFixed(8)),
        costINR: parseFloat((totals.totalEnergy * RATE).toFixed(4)),
        avgPowerW: parseFloat(totals.avgPower.toFixed(1)),
        maxPowerW: parseFloat(totals.maxPower.toFixed(1))
      },
      rate: RATE,
      month: now.getMonth() + 1,
      year: now.getFullYear()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/dashboard/year — monthly kWh breakdown for year tab
router.get('/year', async (req, res) => {
  try {
    const { deviceId } = req.query;
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const matchStage = { timestamp: { $gte: startOfYear } };
    if (deviceId) matchStage.deviceId = deviceId;

    // Monthly energy aggregation
    const monthlyRaw = await Reading.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $month: '$timestamp' },
          totalEnergy: { $sum: '$energy' },
          avgPower: { $avg: '$power' },
          maxPower: { $max: '$power' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const RATE = 8.0; // ₹8 per kWh
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Fill all 12 months
    const monthly = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const found = monthlyRaw.find(r => r._id === month);
      return {
        month,
        label: monthNames[i],
        energyKwh: found ? parseFloat(found.totalEnergy.toFixed(8)) : 0,
        costINR: found ? parseFloat((found.totalEnergy * RATE).toFixed(4)) : 0,
        avgPowerW: found ? parseFloat(found.avgPower.toFixed(1)) : 0
      };
    });

    // Year totals
    const yearTotals = await Reading.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalEnergy: { $sum: '$energy' },
          avgPower: { $avg: '$power' },
          maxPower: { $max: '$power' }
        }
      }
    ]);

    const totals = yearTotals[0] || { totalEnergy: 0, avgPower: 0, maxPower: 0 };

    res.json({
      success: true,
      monthly,
      totals: {
        energyKwh: parseFloat(totals.totalEnergy.toFixed(8)),
        costINR: parseFloat((totals.totalEnergy * RATE).toFixed(4)),
        avgPowerW: parseFloat(totals.avgPower.toFixed(1)),
        maxPowerW: parseFloat(totals.maxPower.toFixed(1))
      },
      rate: RATE,
      year: now.getFullYear()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
