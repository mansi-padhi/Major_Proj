// Diagnostic script to check backend setup
const mongoose = require('mongoose');
require('dotenv').config();

console.log('🔍 BACKEND DIAGNOSTICS\n');
console.log('=' .repeat(50));

// Check environment variables
console.log('\n1️⃣ Environment Variables:');
console.log('   MONGODB_URI:', process.env.MONGODB_URI ? '✅ Set' : '❌ Not set');
console.log('   PORT:', process.env.PORT || '5000 (default)');

// Check MongoDB connection
console.log('\n2️⃣ Testing MongoDB Connection...');
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('   ✅ MongoDB Connected Successfully');
    
    // Check if Reading model exists
    const Reading = require('./models/Reading');
    console.log('   ✅ Reading model loaded');
    
    // Count existing readings
    const count = await Reading.countDocuments();
    console.log(`   📊 Existing readings in database: ${count}`);
    
    // Get latest reading if exists
    if (count > 0) {
      const latest = await Reading.findOne().sort({ timestamp: -1 });
      console.log('\n3️⃣ Latest Reading:');
      console.log('   Device:', latest.deviceId);
      console.log('   Voltage:', latest.voltage, 'V');
      console.log('   Current:', latest.current, 'A');
      if (latest.sensor1) console.log('   Sensor1:', latest.sensor1, 'A');
      if (latest.sensor2) console.log('   Sensor2:', latest.sensor2, 'A');
      console.log('   Power:', latest.power, 'W');
      console.log('   Timestamp:', latest.timestamp);
    } else {
      console.log('\n3️⃣ No readings in database yet');
      console.log('   💡 ESP32 needs to send data first');
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Diagnostics Complete!\n');
    
    // Check if server is running
    const http = require('http');
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/health',
      method: 'GET'
    };
    
    console.log('4️⃣ Checking if server is running...');
    const req = http.request(options, (res) => {
      console.log('   ✅ Server is running on port 5000');
      console.log('   📍 Test monitor: http://localhost:5000/test-monitor.html');
      process.exit(0);
    });
    
    req.on('error', (e) => {
      console.log('   ❌ Server is NOT running');
      console.log('   💡 Start it with: npm start');
      process.exit(0);
    });
    
    req.end();
    
  })
  .catch((err) => {
    console.log('   ❌ MongoDB Connection Failed');
    console.log('   Error:', err.message);
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Check if MongoDB is running');
    console.log('   2. Verify MONGODB_URI in .env file');
    console.log('   3. Check network connection');
    process.exit(1);
  });
