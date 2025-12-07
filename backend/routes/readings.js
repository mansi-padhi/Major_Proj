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
router.post('/', async (req, res) => {
  try {
    console.log('📡 Received POST request from ESP32');
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    const {
      deviceId,
      sensor1,
      sensor2,
      voltage: voltageFromBody,
      loadNames,
      appliance,
      location
    } = req.body;

    // Basic validation
    if (deviceId == null || sensor1 == null || sensor2 == null) {
      return res.status(400).json({
        success: false,
        message: 'deviceId, sensor1 and sensor2 are required',
        receivedBody: req.body
      });
    }

    // Use provided voltage or default 230V
    const voltage = voltageFromBody ? Number(voltageFromBody) : 230;

    // Parse currents as numbers
    const current1 = Math.abs(Number(sensor1));
    const current2 = Math.abs(Number(sensor2));

    if (Number.isNaN(current1) || Number.isNaN(current2)) {
      return res.status(400).json({
        success: false,
        message: 'sensor1 and sensor2 must be numeric',
        receivedBody: req.body
      });
    }

    // Optional custom names from ESP (array like ["Fan", "Light"])
    const loadName1 =
      loadNames && Array.isArray(loadNames) && loadNames[0]
        ? loadNames[0]
        : 'Load 1';
    const loadName2 =
      loadNames && Array.isArray(loadNames) && loadNames[1]
        ? loadNames[1]
        : 'Load 2';

    // Common optional fields
    const applianceType = appliance || 'All';
    const place = location || 'Home';

    // Build documents: one per sensor
    const docsToInsert = [];

    // Load1 from sensor1
    if (current1 > 0 || current1 === 0) {
      const power1 = voltage * current1; // W
      docsToInsert.push({
        deviceId,
        voltage,
        current: current1,
        power: power1,
        // energy will be computed in pre-save hook
        loadId: 'Load1',
        loadName: loadName1,
        appliance: applianceType,
        location: place,
        timestamp: new Date()
      });
    }

    // Load2 from sensor2
    if (current2 > 0 || current2 === 0) {
      const power2 = voltage * current2; // W
      docsToInsert.push({
        deviceId,
        voltage,
        current: current2,
        power: power2,
        loadId: 'Load2',
        loadName: loadName2,
        appliance: applianceType,
        location: place,
        timestamp: new Date()
      });
    }

    if (docsToInsert.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid sensor readings found to save'
      });
    }

    const savedDocs = await Reading.insertMany(docsToInsert);

    console.log(`✅ Saved ${savedDocs.length} readings from ${deviceId}`);

    res.status(201).json({
      success: true,
      message: 'Readings saved successfully',
      count: savedDocs.length,
      readings: savedDocs.map(d =>
        typeof d.toFrontend === 'function' ? d.toFrontend() : d
      )
    });
  } catch (err) {
    console.error('❌ Error saving readings:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error while saving readings',
      error: err.message
    });
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

