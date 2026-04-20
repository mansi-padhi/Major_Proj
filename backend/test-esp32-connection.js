// Test script to simulate ESP32 POST request
const http = require('http');

// Simulate ESP32 data
const testData = JSON.stringify({
  deviceId: 'esp32-1',
  sensor1: 2.345,
  sensor2: 1.234,
  voltage: 230.0
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/readings',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': testData.length
  }
};

console.log('🧪 Testing ESP32 Connection...\n');
console.log('📤 Sending data:', testData);
console.log('📍 To: http://localhost:5000/api/readings');
console.log('\n⏳ Waiting for response...\n');

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('✅ SUCCESS!');
    console.log('📊 Status Code:', res.statusCode);
    console.log('📦 Response:', data);
    console.log('\n✅ Data should now be in MongoDB!');
    console.log('🔍 Check test monitor: http://localhost:5000/test-monitor.html');
    console.log('\n💡 Run "node diagnose.js" to verify data was saved');
  });
});

req.on('error', (error) => {
  console.log('❌ ERROR!');
  console.log('❌ Error:', error.message);
  console.log('\n💡 Is the backend running? Try: npm start');
});

req.write(testData);
req.end();
