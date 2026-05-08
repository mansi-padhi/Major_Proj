const mongoose = require('mongoose');
require('dotenv').config();
const Reading = require('../models/Reading');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

/**
 * Generate realistic energy monitoring data based on actual sensor patterns
 * 
 * Baseline from your real data:
 * - Voltage: ~225V (stable)
 * - Load 1 (small): 0.055-0.060A → ~12-13W
 * - Load 2 (medium): 0.238-0.244A → ~53-55W
 */

// Realistic usage patterns
const USAGE_PATTERNS = {
  // Hour of day multiplier (0-23)
  hourly: [
    0.3, 0.3, 0.3, 0.3, 0.3, 0.4,  // 00-05: Night (low usage)
    0.7, 0.9, 1.0, 0.8, 0.7, 0.8,  // 06-11: Morning peak
    0.9, 0.8, 0.7, 0.8, 0.9, 1.0,  // 12-17: Afternoon
    1.0, 0.9, 0.8, 0.7, 0.5, 0.4   // 18-23: Evening peak then decline
  ],
  // Day of week multiplier (0=Sun, 6=Sat)
  weekly: [0.8, 1.0, 1.0, 1.0, 1.0, 1.0, 0.9], // Weekends slightly lower
  // Month multiplier (seasonal variation)
  monthly: [1.1, 1.1, 1.0, 0.9, 0.9, 1.0, 1.1, 1.1, 1.0, 0.9, 0.9, 1.0]
};

// Base sensor values (from your actual readings)
const SENSOR_BASE = {
  voltage: { min: 224, max: 226 }, // Realistic mains voltage variation (mostly 225V)
  load1: { min: 0.043, max: 0.050, name: 'Load 1' }, // Actual measured: 9-11W
  load2: { min: 0.215, max: 0.223, name: 'Load 2' }, // Actual measured: ~49W
  temperature: { min: 26, max: 28 }, // Actual: ~27°C
  humidity: { min: 54, max: 57 },    // Actual: ~55%
  smokeLevel: { min: 300, max: 600 }  // FIXED: Safe range (normal air quality)
};

/**
 * Generate a realistic voltage value with natural variation
 * Voltage tends to be more stable but can fluctuate slightly
 */
function generateVoltage() {
  // Most readings cluster around 224-226V (matching actual sensor data)
  const random = Math.random();
  
  if (random < 0.8) {
    // 80% of time: 224-226V (normal, matching actual readings)
    return 224 + Math.random() * 2;
  } else if (random < 0.95) {
    // 15% of time: 222-224V (slight dip)
    return 222 + Math.random() * 2;
  } else {
    // 5% of time: 220-222V (brownout)
    return 220 + Math.random() * 2;
  }
}

/**
 * Generate realistic temperature (°C)
 */
function generateTemperature() {
  return SENSOR_BASE.temperature.min + Math.random() * 
    (SENSOR_BASE.temperature.max - SENSOR_BASE.temperature.min);
}

/**
 * Generate realistic humidity (%)
 */
function generateHumidity() {
  return SENSOR_BASE.humidity.min + Math.random() * 
    (SENSOR_BASE.humidity.max - SENSOR_BASE.humidity.min);
}

/**
 * Generate realistic smoke level (safe range for demonstration)
 * Normal air: 300-600 (safe)
 * Warning: 600-900 (elevated but acceptable)
 * Danger: >1000 (alert threshold)
 */
function generateSmokeLevel() {
  const random = Math.random();
  
  if (random < 0.85) {
    // 85% of time: 300-600 (normal, safe air quality)
    return Math.floor(SENSOR_BASE.smokeLevel.min + 
      Math.random() * (SENSOR_BASE.smokeLevel.max - SENSOR_BASE.smokeLevel.min));
  } else if (random < 0.98) {
    // 13% of time: 600-900 (slightly elevated, still safe)
    return Math.floor(600 + Math.random() * 300);
  } else {
    // 2% of time: 900-1100 (warning level, triggers alert)
    return Math.floor(900 + Math.random() * 200);
  }
}

/**
 * Determine if a load should be ON or OFF based on time and load type
 * 
 * Load 1 (12-14W): Small appliance (e.g., phone charger, small light)
 * - ON during: 6am-11pm (active hours)
 * - OFF during: 11pm-6am (night)
 * - Random off periods during day: 10% chance
 * 
 * Load 2 (53-55W): Medium appliance (e.g., fan, larger light, TV)
 * - ON during: 7am-10pm (active hours)
 * - OFF during: 10pm-7am (night)
 * - Random off periods during day: 20% chance (more intermittent)
 */
function isLoadOn(loadId, hour, dayOfWeek) {
  if (loadId === 'Load1') {
    // Load 1: Small appliance (more consistent usage)
    if (hour >= 6 && hour < 23) {
      // Active hours: 6am-11pm
      // 90% uptime during active hours
      return Math.random() > 0.10;
    } else {
      // Night hours: 11pm-6am
      // Mostly off, but 5% chance (someone awake)
      return Math.random() < 0.05;
    }
  } else {
    // Load 2: Medium appliance (more intermittent)
    if (hour >= 7 && hour < 22) {
      // Active hours: 7am-10pm
      // 80% uptime during active hours
      return Math.random() > 0.20;
    } else if (hour >= 22 && hour < 24) {
      // Late evening: 10pm-12am
      // 30% chance (winding down)
      return Math.random() < 0.30;
    } else {
      // Night/early morning: 12am-7am
      // Mostly off, but 2% chance
      return Math.random() < 0.02;
    }
  }
}

/**
 * Generate a realistic current value with natural variation
 */
function generateCurrent(baseMin, baseMax, hourMultiplier, dayMultiplier, monthMultiplier) {
  const baseValue = baseMin + Math.random() * (baseMax - baseMin);
  const patternMultiplier = hourMultiplier * dayMultiplier * monthMultiplier;
  const randomVariation = 0.9 + Math.random() * 0.2; // ±10% random noise
  
  return Math.max(0, baseValue * patternMultiplier * randomVariation);
}

/**
 * Generate readings for a time period
 */
function generateReadings(startDate, endDate, intervalSeconds) {
  const readings = [];
  let currentTime = new Date(startDate);
  let previousTime = null;
  
  console.log(`📅 Generating data from ${startDate.toISOString()} to ${endDate.toISOString()}`);
  console.log(`⏱️  Interval: ${intervalSeconds} seconds`);
  
  while (currentTime <= endDate) {
    const hour = currentTime.getHours();
    const dayOfWeek = currentTime.getDay();
    const month = currentTime.getMonth();
    
    // Get pattern multipliers
    const hourMultiplier = USAGE_PATTERNS.hourly[hour];
    const dayMultiplier = USAGE_PATTERNS.weekly[dayOfWeek];
    const monthMultiplier = USAGE_PATTERNS.monthly[month];
    
    // Generate realistic voltage (varies between 220-225V)
    const voltage = parseFloat(generateVoltage().toFixed(1));
    
    // Check if loads should be ON or OFF
    const load1On = isLoadOn('Load1', hour, dayOfWeek);
    const load2On = isLoadOn('Load2', hour, dayOfWeek);
    
    // Generate Load 1 reading
    const current1 = load1On ? generateCurrent(
      SENSOR_BASE.load1.min,
      SENSOR_BASE.load1.max,
      hourMultiplier,
      dayMultiplier,
      monthMultiplier
    ) : 0; // OFF = 0 current
    
    const power1 = voltage * current1;
    
    // Calculate energy for Load 1 (E = P × t / 1000, where t is in hours)
    const energy1 = previousTime 
      ? (power1 * intervalSeconds) / (3600 * 1000) // kWh
      : (power1 * intervalSeconds) / (3600 * 1000); // First reading
    
    readings.push({
      deviceId: 'esp32-1',
      voltage: voltage,
      current: parseFloat(current1.toFixed(3)),
      power: parseFloat(power1.toFixed(2)),
      energy: parseFloat(energy1.toFixed(10)), // Pre-calculated energy
      loadId: 'Load1',
      loadName: SENSOR_BASE.load1.name,
      appliance: 'All',
      location: 'Home',
      timestamp: new Date(currentTime),
      temperature: parseFloat(generateTemperature().toFixed(1)),
      humidity: parseFloat(generateHumidity().toFixed(1)),
      smokeLevel: generateSmokeLevel()
    });
    
    // Generate Load 2 reading (same timestamp)
    const current2 = load2On ? generateCurrent(
      SENSOR_BASE.load2.min,
      SENSOR_BASE.load2.max,
      hourMultiplier,
      dayMultiplier,
      monthMultiplier
    ) : 0; // OFF = 0 current
    
    const power2 = voltage * current2;
    
    // Calculate energy for Load 2
    const energy2 = previousTime
      ? (power2 * intervalSeconds) / (3600 * 1000) // kWh
      : (power2 * intervalSeconds) / (3600 * 1000); // First reading
    
    readings.push({
      deviceId: 'esp32-1',
      voltage: voltage, // Same voltage reading for both loads (same time)
      current: parseFloat(current2.toFixed(3)),
      power: parseFloat(power2.toFixed(2)),
      energy: parseFloat(energy2.toFixed(10)), // Pre-calculated energy
      loadId: 'Load2',
      loadName: SENSOR_BASE.load2.name,
      appliance: 'All',
      location: 'Home',
      timestamp: new Date(currentTime),
      temperature: parseFloat(generateTemperature().toFixed(1)),
      humidity: parseFloat(generateHumidity().toFixed(1)),
      smokeLevel: generateSmokeLevel()
    });
    
    // Move to next interval
    previousTime = new Date(currentTime);
    currentTime = new Date(currentTime.getTime() + intervalSeconds * 1000);
  }
  
  console.log(`✅ Generated ${readings.length} readings`);
  return readings;
}

/**
 * Main seeding function
 */
async function seedRealisticData() {
  try {
    console.log('\n🌱 Starting realistic data generation...\n');
    
    // Option 1: Clear all existing data
    console.log('🗑️  Clearing existing readings...');
    await Reading.deleteMany({});
    console.log('✅ Cleared\n');
    
    const now = new Date();
    const allReadings = [];
    
    // ═══════════════════════════════════════════════════════════
    // STRATEGY 1: Generate data for last 30 days
    // ═══════════════════════════════════════════════════════════
    
    // Last 24 hours: 5-second intervals (real-time simulation)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const todayReadings = generateReadings(oneDayAgo, now, 5);
    allReadings.push(...todayReadings);
    
    // Days 2-7: 30-second intervals
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekReadings = generateReadings(sevenDaysAgo, oneDayAgo, 30);
    allReadings.push(...weekReadings);
    
    // Days 8-30: 2-minute intervals
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const monthReadings = generateReadings(thirtyDaysAgo, sevenDaysAgo, 120);
    allReadings.push(...monthReadings);
    
    // ═══════════════════════════════════════════════════════════
    // STRATEGY 2 (Optional): Generate full year data
    // Uncomment below if you want year tab data
    // ═══════════════════════════════════════════════════════════
    
    // const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    // const yearReadings = generateReadings(oneYearAgo, thirtyDaysAgo, 300); // 5-minute intervals
    // allReadings.push(...yearReadings);
    
    // ═══════════════════════════════════════════════════════════
    // Insert data in batches (bypass pre-save hooks)
    // We've already calculated energy, so we don't need the hook
    // ═══════════════════════════════════════════════════════════
    
    console.log(`\n📦 Inserting ${allReadings.length} readings in batches...`);
    const BATCH_SIZE = 5000;
    let inserted = 0;
    
    for (let i = 0; i < allReadings.length; i += BATCH_SIZE) {
      const batch = allReadings.slice(i, i + BATCH_SIZE);
      // Use insertMany to bypass pre-save hooks (energy already calculated)
      await Reading.insertMany(batch, { ordered: false });
      inserted += batch.length;
      console.log(`   Inserted ${inserted}/${allReadings.length} (${((inserted/allReadings.length)*100).toFixed(1)}%)`);
    }
    
    console.log('\n✅ All readings inserted!\n');
    
    // ═══════════════════════════════════════════════════════════
    // Show statistics
    // ═══════════════════════════════════════════════════════════
    
    const stats = await Reading.aggregate([
      {
        $group: {
          _id: null,
          totalEnergy: { $sum: '$energy' },
          avgPower: { $avg: '$power' },
          maxPower: { $max: '$power' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    const todayStats = await Reading.aggregate([
      { $match: { timestamp: { $gte: oneDayAgo } } },
      {
        $group: {
          _id: null,
          totalEnergy: { $sum: '$energy' },
          avgPower: { $avg: '$power' }
        }
      }
    ]);
    
    const monthStats = await Reading.aggregate([
      { $match: { timestamp: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: null,
          totalEnergy: { $sum: '$energy' },
          avgPower: { $avg: '$power' }
        }
      }
    ]);
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 DATABASE STATISTICS');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Total Readings:    ${stats[0].count.toLocaleString()}`);
    console.log(`Total Energy:      ${(stats[0].totalEnergy || 0).toFixed(8)} kWh`);
    console.log(`Avg Power:         ${stats[0].avgPower.toFixed(2)} W`);
    console.log(`Max Power:         ${(stats[0].maxPower || 0).toFixed(2)} W`);
    console.log(`Total Cost (₹7):   ₹${((stats[0].totalEnergy || 0) * 7).toFixed(4)}`);
    console.log('───────────────────────────────────────────────────────');
    console.log(`Today Energy:      ${(todayStats[0]?.totalEnergy || 0).toFixed(8)} kWh`);
    console.log(`Today Cost:        ₹${((todayStats[0]?.totalEnergy || 0) * 7).toFixed(4)}`);
    console.log(`Today Avg Power:   ${(todayStats[0]?.avgPower || 0).toFixed(2)} W`);
    console.log('───────────────────────────────────────────────────────');
    console.log(`Month Energy:      ${(monthStats[0]?.totalEnergy || 0).toFixed(8)} kWh`);
    console.log(`Month Cost:        ₹${((monthStats[0]?.totalEnergy || 0) * 7).toFixed(4)}`);
    console.log(`Month Avg Power:   ${(monthStats[0]?.avgPower || 0).toFixed(2)} W`);
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('🎉 Database seeded successfully!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seeder
seedRealisticData();
