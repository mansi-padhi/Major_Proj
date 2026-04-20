// Test if backend is accessible from network
const http = require('http');

console.log('🔍 Testing Network Access to Backend\n');
console.log('Testing: http://10.97.183.155:5000/api/health\n');

const options = {
  hostname: '10.97.183.155',
  port: 5000,
  path: '/api/health',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('✅ SUCCESS! Backend is accessible from network');
    console.log('📊 Status Code:', res.statusCode);
    console.log('📦 Response:', data);
    console.log('\n✅ ESP32 should be able to connect!');
    console.log('\n💡 If ESP32 still shows error -1, check:');
    console.log('   1. ESP32 and computer are on same WiFi network');
    console.log('   2. Windows Firewall allows port 5000');
    console.log('   3. Router is not blocking communication');
  });
});

req.on('error', (error) => {
  console.log('❌ FAILED! Backend is NOT accessible from network');
  console.log('❌ Error:', error.message);
  console.log('\n💡 Possible issues:');
  console.log('   1. Backend not running (try: npm start)');
  console.log('   2. Firewall blocking port 5000');
  console.log('   3. Backend only listening on localhost');
  console.log('\n🔧 To fix firewall:');
  console.log('   Windows: Control Panel → Firewall → Allow app');
  console.log('   Add rule for Node.js on port 5000');
});

req.on('timeout', () => {
  console.log('❌ TIMEOUT! Backend not responding');
  req.destroy();
});

req.end();
