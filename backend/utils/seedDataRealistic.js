const mongoose = require('mongoose');
require('dotenv').config();
const Reading = require('../models/Reading');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// Generate realistic readings with proper time intervals
const generateRealisticReadings = async (count, hoursBack = 24) => {
  const readings = [];
  const now = Date.now();
  const appliances = ['All', 'Heating & AC', 'Lighting', 'Plug Loads', 'Refrigeration', 'Other'];
  const loads = [
    { id: 'Load1', name: 'Load 1' },
    { id: 'Load2', name: 'Load 2' },
    { id: 'Load3', name: 'Load 3' },
    { id: 'Load4', name: 'Load 4' }
  ];
  const intervalMs = (hoursBack * 60 * 60 * 1000) / count; // Evenly spaced

  for (let i = 0; i < count; i++) {
    const timestamp = new Date(now - ((count - i) * intervalMs));
    const voltage = 220 + (Math.random() * 20 - 10); // 210-230V
    const current = Math.random() * 10; // 0-10A
    const power = voltage * current; // Watts
    const load = loads[Math.floor(Math.random() * loads.length)];

    readings.push({
      deviceId: 'ESP32_001',
      voltage: parseFloat(voltage.toFixed(2)),
      current: parseFloat(current.toFixed(3)),
      power: parseFloat(power.toFixed(2)),
      loadId: load.id,
      loadName: load.name,
      appliance: appliances[Math.floor(Math.random() * appliances.length)],
      location: 'Home',
      timestamp
    });
  }

  return readings;
};

// Seed with sequential inserts to allow energy calculation
const seedDatabase = async () => {
  try {
    console.log('🌱 Seeding database with realistic data...\n');

    // Clear existing data
    await Reading.deleteMany({});
    console.log('🗑️  Cleared existing readings');

    // Generate readings for last 24 hours (one every 5 minutes = 288 readings)
    console.log('📊 Generating 288 readings for last 24 hours...');
    const todayReadings = await generateRealisticReadings(288, 24);

    // Insert sequentially to allow energy calculation
    console.log('💾 Inserting readings sequentially (this may take a moment)...');
    let insertedCount = 0;

    for (const reading of todayReadings) {
      await Reading.create(reading);
      insertedCount++;

      // Show progress every 50 readings
      if (insertedCount % 50 === 0) {
        console.log(`   Inserted ${insertedCount}/${todayReadings.length} readings...`);
      }
    }

    console.log(`\n✅ Inserted ${insertedCount} readings successfully!`);
    console.log('🎉 Database seeded with realistic data!\n');

    // Show some stats
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

    if (stats.length > 0) {
      console.log('📊 Stats:');
      console.log(`   Total Readings: ${stats[0].count}`);
      console.log(`   Total Energy: ${(stats[0].totalEnergy || 0).toFixed(3)} kWh`);
      console.log(`   Avg Power: ${stats[0].avgPower.toFixed(2)} W`);
      console.log(`   Max Power: ${(stats[0].maxPower || 0).toFixed(2)} W`);
      console.log(`   Estimated Cost: $${((stats[0].totalEnergy || 0) * 0.12).toFixed(2)}`);
    }

    // Show sample readings
    console.log('\n📋 Sample Readings:');
    const samples = await Reading.find().sort({ timestamp: -1 }).limit(3);
    samples.forEach((reading, index) => {
      console.log(`\n   Reading ${index + 1}:`);
      console.log(`   - Voltage: ${reading.voltage} V`);
      console.log(`   - Current: ${reading.current} A`);
      console.log(`   - Power: ${reading.power} W`);
      console.log(`   - Energy: ${reading.energy.toFixed(6)} kWh`);
      console.log(`   - Appliance: ${reading.appliance}`);
    });

    console.log('\n✅ Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
