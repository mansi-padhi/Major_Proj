const mongoose = require('mongoose');
require('dotenv').config();
const Reading = require('../models/Reading');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('✅ MongoDB Connected'))
.catch((err) => console.error('❌ MongoDB Connection Error:', err));

// Generate random readings for testing
const generateReadings = (count, hoursBack = 24) => {
  const readings = [];
  const now = Date.now();
  const appliances = ['All', 'Heating & AC', 'Lighting', 'Plug Loads', 'Refrigeration', 'Other'];
  
  for (let i = 0; i < count; i++) {
    const timestamp = new Date(now - (Math.random() * hoursBack * 60 * 60 * 1000));
    const voltage = 220 + (Math.random() * 20 - 10); // 210-230V
    const current = Math.random() * 10; // 0-10A
    const power = voltage * current; // Watts (P = V × I)
    // Energy will be auto-calculated by the model's pre-save hook
    
    readings.push({
      deviceId: 'ESP32_001',
      voltage: parseFloat(voltage.toFixed(2)),
      current: parseFloat(current.toFixed(3)),
      power: parseFloat(power.toFixed(2)),
      appliance: appliances[Math.floor(Math.random() * appliances.length)],
      location: 'Home',
      timestamp
    });
  }
  
  return readings.sort((a, b) => a.timestamp - b.timestamp);
};

// Seed the database
const seedDatabase = async () => {
  try {
    console.log('🌱 Seeding database...');
    
    // Clear existing data
    await Reading.deleteMany({});
    console.log('🗑️  Cleared existing readings');
    
    // Generate data for last 24 hours (one reading every 5 minutes = 288 readings)
    const todayReadings = generateReadings(288, 24);
    
    // Generate data for last 30 days (one reading every hour = 720 readings)
    const monthReadings = generateReadings(720, 24 * 30);
    
    // Insert all readings
    await Reading.insertMany([...todayReadings, ...monthReadings]);
    
    console.log(`✅ Inserted ${todayReadings.length + monthReadings.length} readings`);
    console.log('🎉 Database seeded successfully!');
    
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
    
    console.log('\n📊 Stats:');
    console.log(`   Total Readings: ${stats[0].count}`);
    console.log(`   Total Energy: ${(stats[0].totalEnergy || 0).toFixed(3)} kWh`);
    console.log(`   Avg Power: ${stats[0].avgPower.toFixed(2)} W`);
    console.log(`   Max Power: ${(stats[0].maxPower || 0).toFixed(2)} W`);
    console.log(`   Estimated Cost: $${((stats[0].totalEnergy || 0) * 0.12).toFixed(2)}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
