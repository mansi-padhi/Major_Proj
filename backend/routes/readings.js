const express = require('express');
const router = express.Router();
const Reading = require('../models/Reading');

// POST - Receive data from ESP32
router.post('/', async (req, res) => {
  try {
    const { deviceId, voltage, current, sensor1, sensor2, appliance, location } = req.body;

    // Handle dual-sensor format (sensor1 + sensor2) or single current value
    let totalCurrent = current;
    
    if (sensor1 !== undefined && sensor2 !== undefined) {
      // Dual sensor mode: combine both sensors
      totalCurrent = sensor1 + sensor2;
      console.log(`📊 Dual sensor data: Sensor1=${sensor1}A, Sensor2=${sensor2}A, Total=${totalCurrent}A`);
    } else if (sensor1 !== undefined) {
      // Single sensor mode (sensor1 only)
      totalCurrent = sensor1;
    }

    // Validate required fields
    if (voltage === undefined || totalCurrent === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: voltage and (current OR sensor1)' 
      });
    }

    // Create reading (power and energy will be auto-calculated)
    const reading = new Reading({
      deviceId: deviceId || 'ESP32_001',
      voltage,
      current: totalCurrent,
      sensor1: sensor1,
      sensor2: sensor2,
      appliance: appliance || 'All',
      location: location || 'Home',
      timestamp: new Date()
    });

    await reading.save();

    console.log(`✅ Reading saved: V=${voltage}V, I=${totalCurrent}A, P=${reading.power}W`);

    res.status(201).json({ 
      success: true,
      message: 'Reading saved successfully',
      data: reading.toFrontend()
    });
  } catch (error) {
    console.error('Error saving reading:', error);
    res.status(500).json({ 
      error: 'Failed to save reading',
      message: error.message 
    });
  }
});

// GET - Fetch latest reading
router.get('/latest', async (req, res) => {
  try {
    const { deviceId } = req.query;
    
    const query = deviceId ? { deviceId } : {};
    const reading = await Reading.findOne(query).sort({ timestamp: -1 });

    if (!reading) {
      return res.status(404).json({ error: 'No readings found' });
    }

    res.json({ success: true, data: reading });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - Fetch today's readings
router.get('/today', async (req, res) => {
  try {
    const { deviceId } = req.query;
    
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const query = {
      timestamp: { $gte: startOfDay }
    };
    
    if (deviceId) query.deviceId = deviceId;

    const readings = await Reading.find(query).sort({ timestamp: 1 });

    // Aggregate by hour
    const hourlyData = await Reading.aggregate([
      { $match: query },
      {
        $group: {
          _id: { $hour: '$timestamp' },
          avgVoltage: { $avg: '$voltage' },
          avgCurrent: { $avg: '$current' },
          avgPower: { $avg: '$power' },
          totalEnergy: { $sum: '$energy' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({ 
      success: true, 
      data: readings,
      hourlyData,
      count: readings.length 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - Fetch this month's readings
router.get('/month', async (req, res) => {
  try {
    const { deviceId, month, year } = req.query;
    
    const currentDate = new Date();
    const targetMonth = month ? parseInt(month) - 1 : currentDate.getMonth();
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();

    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

    const query = {
      timestamp: { $gte: startOfMonth, $lte: endOfMonth }
    };
    
    if (deviceId) query.deviceId = deviceId;

    // Aggregate by day
    const dailyData = await Reading.aggregate([
      { $match: query },
      {
        $group: {
          _id: { $dayOfMonth: '$timestamp' },
          avgVoltage: { $avg: '$voltage' },
          avgCurrent: { $avg: '$current' },
          avgPower: { $avg: '$power' },
          totalEnergy: { $sum: '$energy' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({ 
      success: true, 
      data: dailyData,
      month: targetMonth + 1,
      year: targetYear
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - Fetch this year's readings
router.get('/year', async (req, res) => {
  try {
    const { deviceId, year } = req.query;
    
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    const startOfYear = new Date(targetYear, 0, 1);
    const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59);

    const query = {
      timestamp: { $gte: startOfYear, $lte: endOfYear }
    };
    
    if (deviceId) query.deviceId = deviceId;

    // Aggregate by month
    const monthlyData = await Reading.aggregate([
      { $match: query },
      {
        $group: {
          _id: { $month: '$timestamp' },
          avgVoltage: { $avg: '$voltage' },
          avgCurrent: { $avg: '$current' },
          avgPower: { $avg: '$power' },
          totalEnergy: { $sum: '$energy' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({ 
      success: true, 
      data: monthlyData,
      year: targetYear
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - Fetch readings by date range
router.get('/range', async (req, res) => {
  try {
    const { deviceId, startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'startDate and endDate are required' 
      });
    }

    const query = {
      timestamp: { 
        $gte: new Date(startDate), 
        $lte: new Date(endDate) 
      }
    };
    
    if (deviceId) query.deviceId = deviceId;

    const readings = await Reading.find(query).sort({ timestamp: 1 });

    res.json({ 
      success: true, 
      data: readings,
      count: readings.length 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE - Clear all readings (for testing)
router.delete('/clear', async (req, res) => {
  try {
    const result = await Reading.deleteMany({});
    res.json({ 
      success: true, 
      message: `Deleted ${result.deletedCount} readings` 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
