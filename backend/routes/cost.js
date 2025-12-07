const express = require('express');
const router = express.Router();
const Reading = require('../models/Reading');

// Cost calculation constants
const ELECTRICITY_RATE = 3; // ₹ per kWh

// GET - Calculate cost for a period
router.get('/', async (req, res) => {
  try {
    const { period, deviceId, rate } = req.query;
    const costRate = rate ? parseFloat(rate) : ELECTRICITY_RATE;

    let startDate;
    const now = new Date();

    switch (period) {
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

    const result = await Reading.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalEnergy: { $sum: '$energy' },
          avgPower: { $avg: '$power' },
          maxPower: { $max: '$power' }
        }
      }
    ]);

    if (result.length === 0) {
      return res.json({
        success: true,
        totalEnergy: 0,
        totalCost: 0,
        avgPower: 0,
        maxPower: 0,
        rate: costRate,
        period
      });
    }

    const data = result[0];
    const totalCost = data.totalEnergy * costRate;

    res.json({
      success: true,
      totalEnergy: parseFloat(data.totalEnergy.toFixed(3)),
      totalCost: parseFloat(totalCost.toFixed(2)),
      avgPower: parseFloat(data.avgPower.toFixed(2)),
      maxPower: parseFloat(data.maxPower.toFixed(2)),
      rate: costRate,
      period,
      currency: 'USD'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - Cost prediction for next period
router.get('/prediction', async (req, res) => {
  try {
    const { period, deviceId } = req.query;

    // Get current period data
    let startDate, endDate;
    const now = new Date();

    switch (period) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
    }

    const query = {
      timestamp: { $gte: startDate, $lte: now }
    };

    if (deviceId) query.deviceId = deviceId;

    const currentData = await Reading.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalEnergy: { $sum: '$energy' },
          avgPower: { $avg: '$power' }
        }
      }
    ]);

    if (currentData.length === 0) {
      return res.json({
        success: true,
        prediction: 0,
        message: 'Not enough data for prediction'
      });
    }

    // Calculate elapsed time and total time in period
    const elapsedTime = now - startDate;
    const totalTime = endDate - startDate;
    const progressRatio = elapsedTime / totalTime;

    // Predict based on current usage
    const currentEnergy = currentData[0].totalEnergy;
    const predictedEnergy = progressRatio > 0 ? currentEnergy / progressRatio : 0;
    const predictedCost = predictedEnergy * ELECTRICITY_RATE;

    res.json({
      success: true,
      currentEnergy: parseFloat(currentEnergy.toFixed(3)),
      currentCost: parseFloat((currentEnergy * ELECTRICITY_RATE).toFixed(2)),
      predictedEnergy: parseFloat(predictedEnergy.toFixed(3)),
      predictedCost: parseFloat(predictedCost.toFixed(2)),
      progress: parseFloat((progressRatio * 100).toFixed(2)),
      period,
      currency: 'USD'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - Cost comparison (current vs previous period)
router.get('/comparison', async (req, res) => {
  try {
    const { period, deviceId } = req.query;

    let currentStart, currentEnd, previousStart, previousEnd;
    const now = new Date();

    switch (period) {
      case 'month':
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        currentEnd = now;
        previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        break;
      case 'year':
        currentStart = new Date(now.getFullYear(), 0, 1);
        currentEnd = now;
        previousStart = new Date(now.getFullYear() - 1, 0, 1);
        previousEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
        break;
      default: // today vs yesterday
        currentStart = new Date(now.setHours(0, 0, 0, 0));
        currentEnd = now;
        previousStart = new Date(now.setDate(now.getDate() - 1));
        previousStart.setHours(0, 0, 0, 0);
        previousEnd = new Date(previousStart);
        previousEnd.setHours(23, 59, 59, 999);
    }

    const currentQuery = {
      timestamp: { $gte: currentStart, $lte: currentEnd }
    };

    const previousQuery = {
      timestamp: { $gte: previousStart, $lte: previousEnd }
    };

    if (deviceId) {
      currentQuery.deviceId = deviceId;
      previousQuery.deviceId = deviceId;
    }

    const [currentData, previousData] = await Promise.all([
      Reading.aggregate([
        { $match: currentQuery },
        { $group: { _id: null, totalEnergy: { $sum: '$energy' } } }
      ]),
      Reading.aggregate([
        { $match: previousQuery },
        { $group: { _id: null, totalEnergy: { $sum: '$energy' } } }
      ])
    ]);

    const currentEnergy = currentData[0]?.totalEnergy || 0;
    const previousEnergy = previousData[0]?.totalEnergy || 0;
    const currentCost = currentEnergy * ELECTRICITY_RATE;
    const previousCost = previousEnergy * ELECTRICITY_RATE;

    const difference = currentCost - previousCost;
    const percentageChange = previousCost > 0
      ? ((difference / previousCost) * 100)
      : 0;

    res.json({
      success: true,
      current: {
        energy: parseFloat(currentEnergy.toFixed(3)),
        cost: parseFloat(currentCost.toFixed(2))
      },
      previous: {
        energy: parseFloat(previousEnergy.toFixed(3)),
        cost: parseFloat(previousCost.toFixed(2))
      },
      difference: parseFloat(difference.toFixed(2)),
      percentageChange: parseFloat(percentageChange.toFixed(2)),
      trend: difference > 0 ? 'increased' : difference < 0 ? 'decreased' : 'same',
      period,
      currency: 'USD'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
