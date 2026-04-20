// Check for esp32-1 device data
const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const Reading = require('./models/Reading');
    
    console.log('🔍 Checking for esp32-1 device data...\n');
    
    // Find all readings from esp32-1
    const readings = await Reading.find({ deviceId: 'esp32-1' })
      .sort({ timestamp: -1 })
      .limit(5);
    
    if (readings.length === 0) {
      console.log('❌ No readings found for device: esp32-1');
      console.log('💡 Make sure ESP32 is sending data with deviceId: "esp32-1"');
    } else {
      console.log(`✅ Found ${readings.length} reading(s) for esp32-1:\n`);
      
      readings.forEach((reading, index) => {
        console.log(`Reading #${index + 1}:`);
        console.log('  Device:', reading.deviceId);
        console.log('  Voltage:', reading.voltage, 'V');
        console.log('  Sensor1:', reading.sensor1, 'A');
        console.log('  Sensor2:', reading.sensor2, 'A');
        console.log('  Total Current:', reading.current, 'A');
        console.log('  Power:', reading.power, 'W');
        console.log('  Energy:', reading.energy, 'kWh');
        console.log('  Timestamp:', reading.timestamp);
        console.log('');
      });
    }
    
    // Count total readings per device
    const deviceCounts = await Reading.aggregate([
      {
        $group: {
          _id: '$deviceId',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    console.log('📊 Readings per device:');
    deviceCounts.forEach(device => {
      console.log(`  ${device._id}: ${device.count} readings`);
    });
    
    process.exit(0);
  })
  .catch((err) => {
    console.log('❌ Error:', err.message);
    process.exit(1);
  });
