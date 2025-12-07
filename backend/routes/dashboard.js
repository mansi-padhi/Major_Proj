const express = require('express');
const router = express.Router();
const Reading = require('../models/Reading');

// GET - Dashboard summary data
router.get('/summary', async (req, res) => {
  try {
    const { deviceId } = req.query;
    const now = new Date();

    // Today's data
    const startOfToday = new Date(now.setHours(0, 0, 0, 0));
    const todayQuery = { timestamp: { $gte: startOfToday } };
    if (deviceId) todayQuery.deviceId = deviceId;

    // This month's data
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
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

    const ELECTRICITY_RATE = 3; // ₹ per kWh

    res.json({
      success: true,
      today: {
        energy: todayStats[0]?.totalEnergy.toFixed(3) || 0,
        cost: (todayStats[0]?.totalEnergy * ELECTRICITY_RATE).toFixed(2) || 0,
        avgPower: todayStats[0]?.avgPower.toFixed(2) || 0,
        maxPower: todayStats[0]?.maxPower.toFixed(2) || 0,
        readings: todayStats[0]?.count || 0
      },
      month: {
        energy: monthStats[0]?.totalEnergy.toFixed(3) || 0,
        cost: (monthStats[0]?.totalEnergy * ELECTRICITY_RATE).toFixed(2) || 0,
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
