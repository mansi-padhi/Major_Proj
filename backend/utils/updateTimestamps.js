const mongoose = require('mongoose');
require('dotenv').config();
const Reading = require('../models/Reading');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// Update all timestamps to current month (April 2026)
const updateTimestamps = async () => {
    try {
        console.log('🔄 Updating timestamps to current month...\n');

        // Get all readings
        const readings = await Reading.find().sort({ timestamp: 1 });
        console.log(`📊 Found ${readings.length} readings\n`);

        if (readings.length === 0) {
            console.log('❌ No readings found in database');
            process.exit(0);
        }

        // Get the oldest and newest timestamps
        const oldestTimestamp = readings[0].timestamp;
        const newestTimestamp = readings[readings.length - 1].timestamp;

        console.log(`📅 Current data range:`);
        console.log(`   From: ${oldestTimestamp.toLocaleString()}`);
        console.log(`   To: ${newestTimestamp.toLocaleString()}\n`);

        // Calculate the time span
        const timeSpan = newestTimestamp - oldestTimestamp;

        // Set new end date to now
        const now = new Date();
        const newEndDate = now;
        const newStartDate = new Date(now - timeSpan);

        console.log(`📅 New data range:`);
        console.log(`   From: ${newStartDate.toLocaleString()}`);
        console.log(`   To: ${newEndDate.toLocaleString()}\n`);

        console.log('💾 Updating timestamps...');

        let updated = 0;
        for (const reading of readings) {
            // Calculate the offset from the oldest timestamp
            const offset = reading.timestamp - oldestTimestamp;

            // Apply the same offset to the new start date
            const newTimestamp = new Date(newStartDate.getTime() + offset);

            // Update the reading
            await Reading.updateOne(
                { _id: reading._id },
                {
                    $set: {
                        timestamp: newTimestamp,
                        updatedAt: now
                    }
                }
            );

            updated++;
            if (updated % 50 === 0) {
                process.stdout.write(`\r   Updated ${updated}/${readings.length} readings...`);
            }
        }

        console.log(`\n\n✅ Successfully updated ${updated} readings!\n`);

        // Show sample of updated data
        console.log('📋 Sample of updated readings:');
        const samples = await Reading.find().sort({ timestamp: -1 }).limit(3);
        samples.forEach((reading, index) => {
            console.log(`\n   ${index + 1}. ${reading.loadName}`);
            console.log(`      New Timestamp: ${reading.timestamp.toLocaleString()}`);
            console.log(`      Power: ${reading.power} W`);
            console.log(`      Energy: ${reading.energy.toFixed(6)} kWh`);
        });

        console.log('\n✅ Timestamp update complete!');
        console.log('🚀 Your frontend should now display the data\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error updating timestamps:', error);
        process.exit(1);
    }
};

updateTimestamps();
