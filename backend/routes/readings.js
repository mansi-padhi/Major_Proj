// Old single-sensor endpoints (kept for reference)
// These are replaced by the dual-sensor endpoints below

// // GET - Fetch today's readings
// router.get('/today', async (req, res) => {
//   try {
//     const { deviceId } = req.query;

//     const startOfDay = new Date();
//     startOfDay.setHours(0, 0, 0, 0);

//     const query = {
//       timestamp: { $gte: startOfDay }
//     };

//     if (deviceId) query.deviceId = deviceId;

//     const readings = await Reading.find(query).sort({ timestamp: 1 });

//     // Aggregate by hour
//     const hourlyData = await Reading.aggregate([
//       { $match: query },
//       {
//         $group: {
//           _id: { $hour: '$timestamp' },
//           avgVoltage: { $avg: '$voltage' },
//           avgCurrent: { $avg: '$current' },
//           avgPower: { $avg: '$power' },
//           totalEnergy: { $sum: '$energy' },
//           count: { $sum: 1 }
//         }
//       },
//       { $sort: { _id: 1 } }
//     ]);

//     res.json({ 
//       success: true, 
//       data: readings,
//       hourlyData,
//       count: readings.length 
//     });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // GET - Fetch this month's readings
// router.get('/month', async (req, res) => {
//   try {
//     const { deviceId, month, year } = req.query;

//     const currentDate = new Date();
//     const targetMonth = month ? parseInt(month) - 1 : currentDate.getMonth();
//     const targetYear = year ? parseInt(year) : currentDate.getFullYear();

//     const startOfMonth = new Date(targetYear, targetMonth, 1);
//     const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

//     const query = {
//       timestamp: { $gte: startOfMonth, $lte: endOfMonth }
//     };

//     if (deviceId) query.deviceId = deviceId;

//     // Aggregate by day
//     const dailyData = await Reading.aggregate([
//       { $match: query },
//       {
//         $group: {
//           _id: { $dayOfMonth: '$timestamp' },
//           avgVoltage: { $avg: '$voltage' },
//           avgCurrent: { $avg: '$current' },
//           avgPower: { $avg: '$power' },
//           totalEnergy: { $sum: '$energy' },
//           count: { $sum: 1 }
//         }
//       },
//       { $sort: { _id: 1 } }
//     ]);

//     res.json({ 
//       success: true, 
//       data: dailyData,
//       month: targetMonth + 1,
//       year: targetYear
//     });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // GET - Fetch this year's readings
// router.get('/year', async (req, res) => {
//   try {
//     const { deviceId, year } = req.query;

//     const targetYear = year ? parseInt(year) : new Date().getFullYear();
//     const startOfYear = new Date(targetYear, 0, 1);
//     const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59);

//     const query = {
//       timestamp: { $gte: startOfYear, $lte: endOfYear }
//     };

//     if (deviceId) query.deviceId = deviceId;

//     // Aggregate by month
//     const monthlyData = await Reading.aggregate([
//       { $match: query },
//       {
//         $group: {
//           _id: { $month: '$timestamp' },
//           avgVoltage: { $avg: '$voltage' },
//           avgCurrent: { $avg: '$current' },
//           avgPower: { $avg: '$power' },
//           totalEnergy: { $sum: '$energy' },
//           count: { $sum: 1 }
//         }
//       },
//       { $sort: { _id: 1 } }
//     ]);

//     res.json({ 
//       success: true, 
//       data: monthlyData,
//       year: targetYear
//     });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // GET - Fetch readings by date range
// router.get('/range', async (req, res) => {
//   try {
//     const { deviceId, startDate, endDate } = req.query;

//     if (!startDate || !endDate) {
//       return res.status(400).json({ 
//         error: 'startDate and endDate are required' 
//       });
//     }

//     const query = {
//       timestamp: { 
//         $gte: new Date(startDate), 
//         $lte: new Date(endDate) 
//       }
//     };

//     if (deviceId) query.deviceId = deviceId;

//     const readings = await Reading.find(query).sort({ timestamp: 1 });

//     res.json({ 
//       success: true, 
//       data: readings,
//       count: readings.length 
//     });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // DELETE - Clear all readings (for testing)
// router.delete('/clear', async (req, res) => {
//   try {
//     const result = await Reading.deleteMany({});
//     res.json({ 
//       success: true, 
//       message: `Deleted ${result.deletedCount} readings` 
//     });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// module.exports = router;

const express = require('express');
const router = express.Router();
const Reading = require('../models/Reading');
const evaluateReading = require('../middleware/thresholdEvaluator');

/**
 * Expected payload from ESP32:
 * {
 *   "deviceId": "esp32-1",
 *   "sensor1": 1.234,   // current from ACS712 #1 (A)
 *   "sensor2": 0.567,   // current from ACS712 #2 (A)
 *   "voltage": 230      // optional (if not sent, default 230V)
 * }
 *
 * This route will create:
 *  - One document for Load1 (sensor1)
 *  - One document for Load2 (sensor2)
 */

// ---------- POST /api/readings  (called by ESP32) ----------
// Accepts EITHER:
//   Single sensor: { deviceId, voltage, current, power }
//   Dual sensor:   { deviceId, sensor1, sensor2, voltage }
router.post('/', async (req, res) => {
  try {
    console.log('📡 Received POST /api/readings');
    console.log('Body:', JSON.stringify(req.body, null, 2));

    const {
      deviceId = 'esp32-1',
      sensor1,
      sensor2,
      voltage: voltageFromBody,
      current: currentFromBody,
      power: powerFromBody,
      loadNames,
      appliance,
      location,
      relay1,
      relay2,
      loadDetected
    } = req.body;

    const voltage = voltageFromBody != null ? Number(voltageFromBody) : 230;
    const applianceType = appliance || 'All';
    const place = location || 'Home';

    const docsToInsert = [];

    // ── Dual-sensor format (sensor1 + sensor2) ──────────────────
    if (sensor1 != null && sensor2 != null) {
      const c1 = Math.abs(Number(sensor1));
      const c2 = Math.abs(Number(sensor2));
      const name1 = (loadNames && loadNames[0]) || 'Load 1';
      const name2 = (loadNames && loadNames[1]) || 'Load 2';

      docsToInsert.push({
        deviceId, voltage, current: c1, power: voltage * c1,
        loadId: 'Load1', loadName: name1,
        appliance: applianceType, location: place, timestamp: new Date()
      });
      docsToInsert.push({
        deviceId, voltage, current: c2, power: voltage * c2,
        loadId: 'Load2', loadName: name2,
        appliance: applianceType, location: place, timestamp: new Date()
      });

    // ── Single-sensor format (voltage + current) ─────────────────
    } else if (currentFromBody != null) {
      const c = Math.abs(Number(currentFromBody));
      const p = powerFromBody != null ? Number(powerFromBody) : voltage * c;

      docsToInsert.push({
        deviceId, voltage, current: c, power: p,
        loadId: 'Load1', loadName: 'Load 1',
        appliance: applianceType, location: place, timestamp: new Date(),
        loadDetected: loadDetected || false
      });

    } else {
      return res.status(400).json({
        success: false,
        message: 'Provide either (sensor1 + sensor2) or (current) in the payload'
      });
    }

    const saved = await Reading.insertMany(docsToInsert);
    console.log(`✅ Saved ${saved.length} reading(s) from ${deviceId}`);

    // Threshold evaluation (non-blocking)
    if (saved.length > 0) {
      evaluateReading(saved[0]).catch(e =>
        console.error('Threshold eval error:', e.message)
      );
    }

    res.status(201).json({
      success: true,
      message: 'Readings saved successfully',
      count: saved.length,
      readings: saved.map(d => (typeof d.toFrontend === 'function' ? d.toFrontend() : d))
    });
  } catch (err) {
    console.error('❌ Error saving readings:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------- GET /api/readings  (for frontend / debug) ----------
router.get('/', async (req, res) => {
  try {
    const { deviceId, loadId, appliance } = req.query;
    const filter = {};

    if (deviceId) filter.deviceId = deviceId;
    if (loadId) filter.loadId = loadId;
    if (appliance) filter.appliance = appliance;

    const readings = await Reading.find(filter)
      .sort({ timestamp: -1 })
      .limit(200);

    res.json({
      success: true,
      total: readings.length,
      readings: readings.map(r =>
        typeof r.toFrontend === 'function' ? r.toFrontend() : r
      )
    });
  } catch (err) {
    console.error('❌ Error fetching readings:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching readings',
      error: err.message
    });
  }
});

// ---------- GET /api/readings/latest ----------
router.get('/latest', async (req, res) => {
  try {
    const { deviceId } = req.query;
    const query = deviceId ? { deviceId } : {};
    const reading = await Reading.findOne(query).sort({ timestamp: -1 });

    if (!reading) {
      return res.status(404).json({
        success: false,
        error: 'No readings found'
      });
    }

    res.json({
      success: true,
      data: reading.toFrontend ? reading.toFrontend() : reading
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ---------- GET /api/readings/today ----------
router.get('/today', async (req, res) => {
  try {
    const { deviceId } = req.query;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const query = { timestamp: { $gte: startOfDay } };
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
      data: readings.map(r => r.toFrontend ? r.toFrontend() : r),
      hourlyData,
      count: readings.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ---------- GET /api/readings/month ----------
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
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ---------- GET /api/readings/year ----------
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
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

