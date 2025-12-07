// Simulate ESP32 sending data
const testData = {
    deviceId: "ESP32_001",
    sensor1: 5.2,      // Load 1: 5.2A
    sensor2: 3.8,      // Load 2: 3.8A
    voltage: 230,      // 230V
    loadNames: ["Fan", "Light"]
};

console.log('📡 Sending test data to backend...');
console.log('Data:', JSON.stringify(testData, null, 2));

fetch('http://localhost:5000/api/readings', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify(testData)
})
    .then(res => res.json())
    .then(result => {
        console.log('\n✅ Response from backend:');
        console.log(JSON.stringify(result, null, 2));

        if (result.success) {
            console.log('\n📊 Readings saved:');
            result.readings.forEach((reading, i) => {
                console.log(`\n  Reading ${i + 1}:`);
                console.log(`  - Load: ${reading.loadName} (${reading.loadId})`);
                console.log(`  - Voltage: ${reading.voltage} V`);
                console.log(`  - Current: ${reading.current} A`);
                console.log(`  - Power: ${reading.power} W`);
                console.log(`  - Energy: ${reading.energy} kWh`);
            });
        }
    })
    .catch(err => {
        console.error('\n❌ Error:', err.message);
    });
