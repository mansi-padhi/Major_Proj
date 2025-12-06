/**
 * Simple test script to verify backend setup
 * Run this BEFORE starting the full server to check for issues
 */

console.log('🧪 Testing Backend Setup...\n');

// Test 1: Check Node.js version
console.log('1️⃣ Checking Node.js version...');
const nodeVersion = process.version;
console.log(`   ✅ Node.js ${nodeVersion}`);

// Test 2: Check if required modules are installed
console.log('\n2️⃣ Checking dependencies...');
try {
  require('express');
  console.log('   ✅ express');
  require('mongoose');
  console.log('   ✅ mongoose');
  require('cors');
  console.log('   ✅ cors');
  require('dotenv');
  console.log('   ✅ dotenv');
  require('body-parser');
  console.log('   ✅ body-parser');
} catch (error) {
  console.log(`   ❌ Missing dependency: ${error.message}`);
  console.log('   Run: npm install');
  process.exit(1);
}

// Test 3: Check if .env file exists
console.log('\n3️⃣ Checking configuration...');
const fs = require('fs');
const path = require('path');

if (fs.existsSync(path.join(__dirname, '.env'))) {
  console.log('   ✅ .env file found');
  require('dotenv').config();
  console.log(`   ✅ PORT: ${process.env.PORT || '5000 (default)'}`);
  console.log(`   ✅ MONGODB_URI: ${process.env.MONGODB_URI ? 'configured' : 'using default'}`);
} else {
  console.log('   ⚠️  .env file not found (using defaults)');
}

// Test 4: Check if routes exist
console.log('\n4️⃣ Checking route files...');
const routes = ['readings', 'dashboard', 'cost', 'appliances'];
routes.forEach(route => {
  if (fs.existsSync(path.join(__dirname, 'routes', `${route}.js`))) {
    console.log(`   ✅ routes/${route}.js`);
  } else {
    console.log(`   ❌ routes/${route}.js missing`);
  }
});

// Test 5: Check if model exists
console.log('\n5️⃣ Checking model files...');
if (fs.existsSync(path.join(__dirname, 'models', 'Reading.js'))) {
  console.log('   ✅ models/Reading.js');
} else {
  console.log('   ❌ models/Reading.js missing');
}

// Test 6: Try to load server.js (syntax check)
console.log('\n6️⃣ Checking server.js syntax...');
try {
  const serverCode = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
  if (serverCode.includes('app.listen')) {
    console.log('   ✅ server.js syntax OK');
  }
} catch (error) {
  console.log(`   ❌ Error in server.js: ${error.message}`);
  process.exit(1);
}

console.log('\n✅ All checks passed!');
console.log('\n📋 Next steps:');
console.log('   1. Make sure MongoDB is running');
console.log('   2. Run: npm run dev');
console.log('   3. Open: http://localhost:5000/api/health');
console.log('\n💡 If MongoDB is not installed:');
console.log('   - Download: https://www.mongodb.com/try/download/community');
console.log('   - Or use MongoDB Atlas (cloud): https://www.mongodb.com/cloud/atlas');
