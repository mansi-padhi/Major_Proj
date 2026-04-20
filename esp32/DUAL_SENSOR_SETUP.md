# ESP32 Dual Sensor Setup Guide

## What You Need to Update

You uploaded the old ESP32 code that only supports 1 sensor. You need to upload the **NEW** code that supports 2 ACS712 sensors.

## Steps to Upload New Code

### 1. Open the New Code

- Open Arduino IDE
- Go to: `esp32/energy_monitor_dual_sensor/energy_monitor_dual_sensor.ino`

### 2. Update WiFi Credentials

Find these lines and update them:

```cpp
const char* WIFI_SSID = "YOUR_WIFI_SSID";        // Your WiFi name
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD"; // Your WiFi password
```

### 3. Verify Server URL (Already Set)

The server URL is already configured:

```cpp
const char* SERVER_URL = "http://10.164.131.99:5000/api/readings";
const char* DEVICE_ID = "esp32-1";
```

### 4. Hardware Connections

Connect your 2 ACS712 sensors:

- **ACS712 #1 (Load 1)**: OUT pin → ESP32 GPIO 34
- **ACS712 #2 (Load 2)**: OUT pin → ESP32 GPIO 35
- **Both sensors**: VCC → 3.3V or 5V, GND → GND

### 5. Upload to ESP32

1. Connect ESP32 to computer via USB
2. Select correct board: **ESP32 Dev Module**
3. Select correct COM port
4. Click **Upload** button
5. Wait for "Done uploading" message

### 6. Monitor Serial Output

1. Open Serial Monitor (Ctrl+Shift+M)
2. Set baud rate to **115200**
3. You should see:
   - WiFi connection status
   - Sensor readings every 60 seconds
   - Server response confirmation

## Expected Serial Output

```
=================================
IoT Energy Monitor - ESP32
Dual ACS712 Sensor Configuration
=================================

Connecting to WiFi........
✓ WiFi Connected!
IP Address: 192.168.x.x
Signal Strength: -45 dBm

✓ System Ready!
Starting energy monitoring...
Sending data every 60 seconds

─────────────────────────────────
Reading #1
Voltage:   230.00 V
Load 1:    2.345 A  (539.35 W)
Load 2:    1.234 A  (283.82 W)
Total:     3.579 A  (823.17 W)
Sending: {"deviceId":"esp32-1","sensor1":2.345,"sensor2":1.234,"voltage":230}
Server Response:
{"success":true,"message":"Readings saved successfully",...}
✓ Data sent successfully
Success: 1 | Failed: 0
─────────────────────────────────
```

## Troubleshooting

### WiFi Not Connecting

- Check SSID and password are correct
- Make sure ESP32 is within WiFi range
- Try restarting ESP32

### Server Connection Failed

- Verify backend is running: `http://10.164.131.99:5000/api/health`
- Check if ESP32 and server are on same network
- Try pinging server from ESP32's network

### No Current Readings (0.00 A)

- Check ACS712 connections
- Verify sensors have power (VCC and GND)
- Make sure load is actually drawing current
- Check if sensors are connected to correct GPIO pins

### Data Not Showing in Frontend

- Check backend logs for incoming POST requests
- Verify MongoDB is running
- Check if readings are being saved: `http://10.164.131.99:5000/api/readings?deviceId=esp32-1`

## Key Differences from Old Code

| Feature     | Old Code             | New Code                      |
| ----------- | -------------------- | ----------------------------- |
| Sensors     | 1 ACS712             | 2 ACS712                      |
| Device ID   | ESP32_001            | esp32-1                       |
| Server URL  | 192.168.1.100        | 10.164.131.99                 |
| Data Format | `{voltage, current}` | `{sensor1, sensor2, voltage}` |
| Interval    | 5 seconds            | 60 seconds                    |

## Next Steps

After uploading:

1. Monitor Serial output to confirm data is being sent
2. Check backend logs to see if data is received
3. Verify data appears in MongoDB
4. Check frontend dashboard for real-time updates
