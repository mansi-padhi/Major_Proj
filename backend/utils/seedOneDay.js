require('dotenv').config();
const mongoose = require('mongoose');
const Reading = require('../models/Reading');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/energy_monitoring';

// Appliance types for variety
const appliances = ['Heating & AC', 'Lighting', 'Refrigeration', 'Plug Loads', 'Other'];
const locations = ['Living Room', 'Kitchen', 'Bedroom', 'Office', 'Garage'];

// Generate realistic readings for one day (today)
function generateOneDayReadings() {
    const readings = [];
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    
    // Generate readings every 5 minutes for 24 hours = 288 readings
    for (let i = 0; i < 288; i++) {
        const timestamp = new Date(startOfToday.getTime() + (i * 5 * 60 * 1000));
        const hour = timestamp.getHours();
        
        // Simulate realistic power consumption patterns throughout the day
        let basePower;
        if (hour >= 0 && hour < 6) {
            // Night: low consumption (500-800W)
            basePower = 500 + Math.random() * 300;
        } else if (hour >= 6 && hour < 9) {
            // Morning: high consumption (1500-2200W)
            basePower = 1500 + Math.random() * 700;
        } else if (hour >= 9 && hour < 17) {
            // Day: medium consumption (800-1200W)
            basePower = 800 + Math.random() * 400;
        } else if (hour >= 17 && hour < 22) {
            // Evening: high consumption (1800-2500W)
            basePower = 1800 + Math.random() * 700;
        } else {
            // Late evening: medium consumption (1000-1500W)
            basePower = 1000 + Math.random() * 500;
        }
        
        // Add some randomness
        const power = basePower + (Math.random() - 0.5) * 200;
        
        // Calculate voltage and current from power
        // Assuming ~220V average with some variation
        const voltage = 215 + Math.random() * 15; // 215-230V
        const current = power / voltage;
        
        readings.push({
            deviceId: 'ESP32_001',
            voltage: parseFloat(voltage.toFixed(2)),
            current: parseFloat(current.toFixed(3)),
            power: parseFloat(power.toFixed(2)),
            appliance: appliances[Math.floor(Math.random() * appliances.length)],
            location: locations[Math.floor(Math.random() * locations.length)],
            timestamp: timestamp
        });
    }
    
    return readings;
}

async function seedDatabase() {
    try {
        console.log('🌱 Seeding database with one day of data...\n');
        
        // Connect to MongoDB
        await mongoose.connect(MONGODB_URI);
        console.log('✅ MongoDB Connected');
        
        // Clear existing readings
        await Reading.deleteMany({});
        console.log('🗑️  Cleared existing readings');
        
        // Generate readings
        console.log('📊 Generating 288 readings for today (every 5 minutes)...');
        const readings = generateOneDayReadings();
        
        // Insert readings sequentially to allow energy calculation
        console.log('💾 Inserting readings sequentially...');
        for (let i = 0; i < readings.length; i++) {
            await Reading.create(readings[i]);
            
            // Show progress every 50 readings
            if ((i + 1) % 50 === 0) {
                console.log(`   Inserted ${i + 1}/${readings.length} readings...`);
            }
        }
        
        console.log('\n✅ Inserted 288 readings successfully!');
        console.log('🎉 Database seeded with one day of data!\n');
        
        // Calculate and display stats
        const stats = await Reading.aggregate([
            {
                $group: {
                    _id: null,
                    totalEnergy: { $sum: '$energy' },
                    avgPower: { $avg: '$power' },
                    maxPower: { $max: '$power' },
                    minPower: { $min: '$power' },
                    avgVoltage: { $avg: '$voltage' },
                    avgCurrent: { $avg: '$current' }
                }
            }
        ]);
        
        if (stats.length > 0) {
            const s = stats[0];
            const cost = s.totalEnergy * 0.12; // $0.12 per kWh
            
            console.log('📊 Stats:');
            console.log(`   Total Readings: 288`);
            console.log(`   Total Energy: ${s.totalEnergy.toFixed(3)} kWh`);
            console.log(`   Avg Power: ${s.avgPower.toFixed(2)} W`);
            console.log(`   Max Power: ${s.maxPower.toFixed(2)} W`);
            console.log(`   Min Power: ${s.minPower.toFixed(2)} W`);
            console.log(`   Avg Voltage: ${s.avgVoltage.toFixed(2)} V`);
            console.log(`   Avg Current: ${s.avgCurrent.toFixed(3)} A`);
            console.log(`   Estimated Cost: $${cost.toFixed(2)}\n`);
        }
        
        // Show sample readings
        const samples = await Reading.find().limit(3);
        console.log('📋 Sample Readings:\n');
        samples.forEach((reading, index) => {
            console.log(`   Reading ${index + 1}:`);
            console.log(`   - Time: ${reading.timestamp.toLocaleString()}`);
            console.log(`   - Voltage: ${reading.voltage} V`);
            console.log(`   - Current: ${reading.current} A`);
            console.log(`   - Power: ${reading.power} W`);
            console.log(`   - Energy: ${reading.energy} kWh`);
            console.log(`   - Appliance: ${reading.appliance}`);
            console.log(`   - Location: ${reading.location}\n`);
        });
        
        console.log('✅ Seeding complete!\n');
        
    } catch (error) {
        console.error('❌ Error seeding database:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

seedDatabase();
