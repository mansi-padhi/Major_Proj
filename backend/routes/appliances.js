const express = require('express');
const router = express.Router();
const Reading = require('../models/Reading');

// GET - Appliance-wise energy consumption
router.get('/', async (req, res) => {
  try {
    const { period, deviceId } = req.query; // period: today, month, year
    
    let startDate;
    const now = new Date();

    switch(period) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.setHours(0, 0, 0, 0));
    }

    const query = {
      timestamp: { $gte: startDate }
    };
    
    if (deviceId) query.deviceId = deviceId;

    const applianceData = await Reading.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$appliance',
          totalEnergy: { $sum: '$energy' },
          avgPower: { $avg: '$power' },
          maxPower: { $max: '$power' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalEnergy: -1 } }
    ]);

    // Calculate percentages
    const totalEnergy = applianceData.reduce((sum, item) => sum + item.totalEnergy, 0);
    
    const result = applianceData.map(item => ({
      appliance: item._id,
      totalEnergy: parseFloat(item.totalEnergy.toFixed(3)),
      avgPower: parseFloat(item.avgPower.toFixed(2)),
      maxPower: parseFloat(item.maxPower.toFixed(2)),
      percentage: totalEnergy > 0 ? parseFloat(((item.totalEnergy / totalEnergy) * 100).toFixed(2)) : 0,
      count: item.count
    }));

    res.json({ 
      success: true, 
      data: result,
      totalEnergy: parseFloat(totalEnergy.toFixed(3)),
      period
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - Specific appliance data
router.get('/:appliance', async (req, res) => {
  try {
    const { appliance } = req.params;
    const { period, deviceId } = req.query;
    
    let startDate;
    const now = new Date();

    switch(period) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.setHours(0, 0, 0, 0));
    }

    const query = {
      appliance,
      timestamp: { $gte: startDate }
    };
    
    if (deviceId) query.deviceId = deviceId;

    const readings = await Reading.find(query).sort({ timestamp: 1 }).limit(1000);

    const stats = await Reading.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalEnergy: { $sum: '$energy' },
          avgPower: { $avg: '$power' },
          maxPower: { $max: '$power' },
          minPower: { $min: '$power' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({ 
      success: true, 
      appliance,
      data: readings,
      stats: stats[0] || {},
      period
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
