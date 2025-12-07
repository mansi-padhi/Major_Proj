// Test script to add a new reading
const data = {
    voltage: 230,
    current: 6.5,
    deviceId: "ESP32_001",
    appliance: "All"
};

fetch('http://localhost:5000/api/readings', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
})
    .then(res => res.json())
    .then(result => {
        console.log('✅ Reading added:');
        console.log('Voltage:', result.data.voltage, 'V');
        console.log('Current:', result.data.current, 'A');
        console.log('Power (calculated):', result.data.power, 'W');
        console.log('Energy:', result.data.energy, 'kWh');
    })
    .catch(err => console.error('Error:', err));
