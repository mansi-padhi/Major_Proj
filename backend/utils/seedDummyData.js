const mongoose = require('mongoose');
require('dotenv').config();
const Reading = require('../models/Reading');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB Atlas Connected'))
    .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// Generate realistic dual-sensor readings for last 20 days
const generateDualSensorReadings = () => {
    const readings = [];
    const now = new Date();
    const DAYS = 20;
    const READINGS_PER_DAY = 24; // One reading per hour

    console.log(`📊 Generating ${DAYS * READINGS_PER_DAY * 2} readings (${DAYS} days, ${READINGS_PER_DAY} readings/day, 2 sensors)...\n`);

    for (let day = DAYS - 1; day >= 0; day--) {
        for (let hour = 0; hour < READINGS_PER_DAY; hour++) {
            const timestamp = new Date(now);
            timestamp.setDate(timestamp.getDate() - day);
            timestamp.setHours(hour, 0, 0, 0);

            const voltage = 230; // Standard voltage

            // Load 1 (GPIO 34) - Higher consumption (e.g., AC, Heater)
            // Peak hours: 8am-10pm, Lower at night
            let sensor1Current;
            if (hour >= 8 && hour <= 22) {
                sensor1Current = 2.0 + Math.random() * 1.0; // 2.0-3.0A during day
            } else {
                sensor1Current = 1.5 + Math.random() * 0.8; // 1.5-2.3A at night
            }

            // Load 2 (GPIO 35) - Lower consumption (e.g., Lights, Fan)
            // Peak hours: 6pm-11pm, Lower during day
            let sensor2Current;
            if (hour >= 18 && hour <= 23) {
                sensor2Current = 1.2 + Math.random() * 0.5; // 1.2-1.7A evening
            } else if (hour >= 6 && hour <= 18) {
                sensor2Current = 0.8 + Math.random() * 0.4; // 0.8-1.2A day
            } else {
                sensor2Current = 0.5 + Math.random() * 0.3; // 0.5-0.8A night
            }

            const power1 = voltage * sensor1Current;
            const power2 = voltage * sensor2Current;

            // Reading for Load 1 (sensor1)
            readings.push({
                deviceId: 'esp32-1',
                voltage: parseFloat(voltage.toFixed(2)),
                current: parseFloat(sensor1Current.toFixed(3)),
                power: parseFloat(power1.toFixed(2)),
                loadId: 'Load1',
                loadName: 'Load 1 (GPIO 34)',
                appliance: 'Load1',
                location: 'Home',
                timestamp: new Date(timestamp)
            });

            // Reading for Load 2 (sensor2)
            readings.push({
                deviceId: 'esp32-1',
                voltage: parseFloat(voltage.toFixed(2)),
                current: parseFloat(sensor2Current.toFixed(3)),
                power: parseFloat(power2.toFixed(2)),
                loadId: 'Load2',
                loadName: 'Load 2 (GPIO 35)',
                appliance: 'Load2',
                location: 'Home',
                timestamp: new Date(timestamp)
            });
        }
    }

    return readings;
};

// Seed database
const seedDatabase = async () => {
    try {
        console.log('🌱 Starting database seeding...\n');

        // Clear existing data
        const deleteResult = await Reading.deleteMany({});
        console.log(`🗑️  Cleared ${deleteResult.deletedCount} existing readings\n`);

        // Generate readings
        const readings = generateDualSensorReadings();
        console.log(`📝 Generated ${readings.length} readings\n`);

        // Insert in batches for better performance
        console.log('💾 Inserting readings into MongoDB Atlas...');
        const BATCH_SIZE = 100;
        let insertedCount = 0;

        for (let i = 0; i < readings.length; i += BATCH_SIZE) {
            const batch = readings.slice(i, i + BATCH_SIZE);
            await Reading.insertMany(batch);
            insertedCount += batch.length;

            const progress = ((insertedCount / readings.length) * 100).toFixed(1);
            process.stdout.write(`\r   Progress: ${progress}% (${insertedCount}/${readings.length})`);
        }

        console.log('\n\n✅ All readings inserted successfully!\n');

        // Calculate and display statistics
        console.log('📊 Calculating statistics...\n');

        const stats = await Reading.aggregate([
            {
                $group: {
                    _id: '$loadId',
                    totalEnergy: { $sum: '$energy' },
                    avgCurrent: { $avg: '$current' },
                    maxCurrent: { $max: '$current' },
                    avgPower: { $avg: '$power' },
                    maxPower: { $max: '$power' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const ELECTRICITY_RATE = 7.0; // ₹7/kWh

        console.log('═══════════════════════════════════════════════════════');
        console.log('                  STATISTICS SUMMARY                   ');
        console.log('═══════════════════════════════════════════════════════\n');

        let totalEnergy = 0;
        let totalCost = 0;

        stats.forEach((stat) => {
            const energy = stat.totalEnergy || 0;
            const cost = energy * ELECTRICITY_RATE;
            totalEnergy += energy;
            totalCost += cost;

            console.log(`📍 ${stat._id === 'Load1' ? 'Load 1 (GPIO 34)' : 'Load 2 (GPIO 35)'}`);
            console.log(`   Readings: ${stat.count}`);
            console.log(`   Avg Current: ${stat.avgCurrent.toFixed(2)} A`);
            console.log(`   Max Current: ${stat.maxCurrent.toFixed(2)} A`);
            console.log(`   Avg Power: ${stat.avgPower.toFixed(2)} W`);
            console.log(`   Max Power: ${stat.maxPower.toFixed(2)} W`);
            console.log(`   Total Energy: ${energy.toFixed(2)} kWh`);
            console.log(`   Total Cost: ₹${cost.toFixed(2)}`);
            console.log('');
        });

        console.log('═══════════════════════════════════════════════════════');
        console.log(`   TOTAL ENERGY: ${totalEnergy.toFixed(2)} kWh`);
        console.log(`   TOTAL COST: ₹${totalCost.toFixed(2)}`);
        console.log(`   ELECTRICITY RATE: ₹${ELECTRICITY_RATE}/kWh`);
        console.log('═══════════════════════════════════════════════════════\n');

        // Show sample readings
        console.log('📋 Sample Readings (Latest 3):\n');
        const samples = await Reading.find().sort({ timestamp: -1 }).limit(3);
        samples.forEach((reading, index) => {
            console.log(`   ${index + 1}. ${reading.loadName}`);
            console.log(`      Time: ${reading.timestamp.toLocaleString()}`);
            console.log(`      Voltage: ${reading.voltage} V`);
            console.log(`      Current: ${reading.current} A`);
            console.log(`      Power: ${reading.power} W`);
            console.log(`      Energy: ${reading.energy.toFixed(6)} kWh`);
            console.log(`      Cost: ₹${reading.cost.toFixed(4)}`);
            console.log('');
        });

        console.log('✅ Database seeding complete!');
        console.log('🚀 You can now view the data in your frontend at http://localhost:3000\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error seeding database:', error);
        process.exit(1);
    }
};

// Run the seeding
seedDatabase();
