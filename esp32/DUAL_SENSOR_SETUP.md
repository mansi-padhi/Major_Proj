# 🔌 Dual ACS712 Sensor Setup Guide

## Your Current Configuration

### Hardware
- **ESP32 Development Board**
- **2x ACS712 30A Current Sensors**
- **Voltage Dividers**: 10kΩ + 20kΩ resistors for each sensor
- **WiFi Network**: "Realme"
- **Server IP**: 10.97.183.155:5000

### Pin Configuration
```
Sensor 1 OUT → 10kΩ → GPIO 34 → 20kΩ → GND
Sensor 2 OUT → 10kΩ → GPIO 35 → 20kΩ → GND

Both Sensors:
  VCC → 5V
  GND → GND
```

---

## 📊 Data Flow

### ESP32 Sends (Every 6 seconds)
```json
{
  "deviceId": "esp32-1",
  "sensor1": 2.345,
  "sensor2": 1.234,
  "voltage": 230.0
}
```

### Backend Processes
```javascript
// Combines sensors
totalCurrent = sensor1 + sensor2 = 3.579 A

// Calculates power
power = voltage × totalCurrent = 823.17 W

// Calculates energy
energy = power × time / 1000 (kWh)
```

### MongoDB Stores
```json
{
  "deviceId": "esp32-1",
  "voltage": 230.0,
  "current": 3.579,
  "sensor1": 2.345,
  "sensor2": 1.234,
  "power": 823.17,
  "energy": 0.001142,
  "timestamp": "2025-12-07T10:30:45.123Z"
}
```

---

## 🚀 Quick Start

### 1. Upload ESP32 Code
```bash
# Open Arduino IDE
# File → Open → esp32/energy_monitor_dual_sensor/energy_monitor_dual_sensor.ino
# Tools → Board → ESP32 Dev Module
# Tools → Port → (Select your COM port)
# Click Upload
```

### 2. Start Backend Server
```bash
cd backend
npm start
```

Expected output:
```
✅ MongoDB Connected Successfully
🚀 Server running on port 5000
📊 API available at http://localhost:5000
```

### 3. Open Test Monitor
Navigate to: **http://10.97.183.155:5000/test-monitor.html**

Or from the same computer: **http://localhost:5000/test-monitor.html**

---

## 🔍 Serial Monitor Output

### During Startup
```
=== ESP32 + TWO ACS712 30A Current Sensors ===
Connecting to WiFi: Realme
.....
✅ WiFi connected!
IP address: 10.97.183.XXX
Make sure NO LOAD is connected during calibration...
Sensor 1 zero offset (V): 2.5123
Sensor 2 zero offset (V): 2.5087
Calibration done. Now you can connect the loads.
Reading currents...
```

### During Operation
```
Sensor1: 2.345 A    Sensor2: 1.234 A
POSTing: {"deviceId":"esp32-1","sensor1":2.345,"sensor2":1.234,"voltage":230.0}
Server response code: 201
Response: {"success":true,"message":"Reading saved successfully","data":{...}}

Sensor1: 2.340 A    Sensor2: 1.230 A
Sensor1: 2.342 A    Sensor2: 1.232 A
...
```

---

## ⚙️ Configuration Settings

### WiFi Settings (Lines 30-31)
```cpp
const char* ssid     = "Realme";
const char* password = "mansi1603";
```

### Server Settings (Lines 32-34)
```cpp
const char* SERVER_URL = "http://10.97.183.155:5000/api/readings";
const char* DEVICE_ID  = "esp32-1";
const float MAINS_VOLTAGE = 230.0;
```

### Timing Settings (Line 37)
```cpp
const unsigned long POST_INTERVAL = 6000; // 6 seconds
```

### Sensor Settings (Lines 13-24)
```cpp
const int ACS1_PIN = 34;           // GPIO pin for sensor 1
const int ACS2_PIN = 35;           // GPIO pin for sensor 2
const float SENSITIVITY = 0.066;   // 30A version
const float DIVIDER_GAIN = 1.5;    // 10k/20k divider
```

---

## 🎯 Calibration Process

### Automatic Calibration (On Startup)
1. **Disconnect all loads** from both sensors
2. Power on ESP32
3. Wait for "Calibration done" message
4. Note the offset values in Serial Monitor
5. Now you can connect loads

### Why Calibration Matters
- ACS712 outputs ~2.5V at 0A (not exactly 0V)
- Voltage divider affects this value
- Each sensor may have slightly different offset
- Calibration measures and compensates for this

### Manual Calibration (If Needed)
If readings seem off, you can manually set offsets:

```cpp
// In setup(), replace calibration with fixed values:
offset1 = 2.5123;  // Use value from Serial Monitor
offset2 = 2.5087;  // Use value from Serial Monitor
```

---

## 🔧 Voltage Divider Explanation

### Why Use Voltage Divider?
- ACS712 outputs 0-5V
- ESP32 ADC accepts 0-3.3V maximum
- Divider reduces voltage to safe range

### Your Configuration
```
Sensor OUT (0-5V)
    ↓
  10kΩ
    ↓
GPIO Pin (0-3.3V) ← ESP32 reads here
    ↓
  20kΩ
    ↓
  GND

Voltage at GPIO = Sensor_OUT × (20k / 30k) = Sensor_OUT × 0.667
```

### Code Compensation
```cpp
const float DIVIDER_GAIN = 1.5;  // Multiply by 1.5 to get original voltage
// Because: Sensor_OUT = GPIO_Voltage × 1.5
```

---

## 📈 Expected Readings

### No Load (Calibrated)
```
Sensor1: 0.000 A    Sensor2: 0.000 A
```

### Light Load (100W bulb on Sensor 1)
```
Sensor1: 0.435 A    Sensor2: 0.000 A
Power: 100W
```

### Medium Load (1000W heater on Sensor 2)
```
Sensor1: 0.000 A    Sensor2: 4.348 A
Power: 1000W
```

### Combined Load
```
Sensor1: 2.174 A    Sensor2: 4.348 A
Total Current: 6.522 A
Total Power: 1500W
```

---

## 🐛 Troubleshooting

### Issue: WiFi Not Connecting
**Check:**
- SSID is correct: "Realme"
- Password is correct: "mansi1603"
- WiFi is 2.4GHz (ESP32 doesn't support 5GHz)
- Router is powered on and in range

**Solution:**
```cpp
// Increase retry count if needed
while (WiFi.status() != WL_CONNECTED && retries < 60) {
```

### Issue: Server Connection Failed
**Check:**
- Backend server is running on port 5000
- Server IP is correct: 10.97.183.155
- ESP32 and server are on same network
- Firewall allows port 5000

**Test Server:**
```bash
# From ESP32's network, try:
curl http://10.97.183.155:5000/api/health
```

### Issue: Readings Always Zero
**Check:**
- Sensors are powered (5V, GND connected)
- Voltage dividers are correct (10kΩ + 20kΩ)
- GPIO pins are correct (34, 35)
- Calibration completed successfully

**Debug:**
```cpp
// Add in readCurrent() function:
Serial.print("Raw ADC: ");
Serial.print(avgRaw);
Serial.print(" vEsp: ");
Serial.print(vEsp);
Serial.print(" vSensor: ");
Serial.println(vSensor);
```

### Issue: Negative Readings
**Solution:**
Uncomment this line in `readCurrent()`:
```cpp
if (current < 0) current = -current;
```

Or check sensor orientation (current direction matters).

### Issue: Inaccurate Readings
**Calibration Steps:**
1. Measure actual current with clamp meter
2. Compare with ESP32 reading
3. Adjust SENSITIVITY:
   ```cpp
   // If ESP32 reads 5A but actual is 6A:
   // New sensitivity = 0.066 × (5/6) = 0.055
   const float SENSITIVITY = 0.055;
   ```

---

## 📊 Test Monitor Features

### Real-Time Display
- Voltage (V)
- Sensor 1 Current (A)
- Sensor 2 Current (A)
- Total Power (W)

### Recent Readings Table
- Last 10 entries
- Timestamps
- All sensor values
- Device ID

### Controls
- Auto-refresh interval (default: 2 seconds)
- Manual refresh button
- Clear all data button

### Status Indicator
- 🟢 Green: Connected and receiving data
- 🟡 Yellow: Waiting for first data
- 🔴 Red: Backend disconnected

---

## 🎛️ Advanced Configuration

### Change Posting Interval
```cpp
const unsigned long POST_INTERVAL = 10000; // 10 seconds
```

### Change Device ID
```cpp
const char* DEVICE_ID = "esp32-bedroom";
```

### Change Mains Voltage
```cpp
const float MAINS_VOLTAGE = 220.0; // For 220V regions
```

### Use Different Sensor Version
```cpp
// For ACS712 5A version:
const float SENSITIVITY = 0.185;

// For ACS712 20A version:
const float SENSITIVITY = 0.100;
```

---

## 📁 File Locations

### ESP32 Code
- **Main Code**: `esp32/energy_monitor_dual_sensor/energy_monitor_dual_sensor.ino`
- **Setup Guide**: `esp32/ARDUINO_IDE_SETUP.md`
- **This Guide**: `esp32/DUAL_SENSOR_SETUP.md`

### Backend
- **API Route**: `backend/routes/readings.js`
- **Data Model**: `backend/models/Reading.js`
- **Server**: `backend/server.js`

### Test Monitor
- **Webpage**: `backend/public/test-monitor.html`
- **Guide**: `TEST_MONITOR_GUIDE.md`

---

## 🔗 Access URLs

### From Same Computer
- Test Monitor: `http://localhost:5000/test-monitor.html`
- API Health: `http://localhost:5000/api/health`
- Main Dashboard: `http://localhost:3000`

### From Other Devices (Same Network)
- Test Monitor: `http://10.97.183.155:5000/test-monitor.html`
- API Health: `http://10.97.183.155:5000/api/health`
- Main Dashboard: `http://10.97.183.155:3000`

---

## ✅ Verification Checklist

### Hardware
- [ ] Both ACS712 sensors connected to 5V and GND
- [ ] Voltage dividers installed (10kΩ + 20kΩ for each sensor)
- [ ] Sensor 1 OUT → GPIO 34 (via divider)
- [ ] Sensor 2 OUT → GPIO 35 (via divider)
- [ ] USB cable connected for programming

### Software
- [ ] Arduino IDE installed with ESP32 board support
- [ ] Code uploaded successfully
- [ ] Serial Monitor shows WiFi connected
- [ ] Calibration completed (offsets displayed)

### Backend
- [ ] MongoDB running
- [ ] Backend server started (port 5000)
- [ ] Can access http://localhost:5000/api/health

### Testing
- [ ] Test monitor opens in browser
- [ ] Status shows "Connected"
- [ ] Live values updating
- [ ] Recent readings table populating
- [ ] Data persists in MongoDB

---

## 🎉 Success Indicators

You'll know everything is working when:

1. **Serial Monitor shows:**
   ```
   ✅ WiFi connected!
   Sensor1: X.XXX A    Sensor2: X.XXX A
   Server response code: 201
   ```

2. **Test Monitor displays:**
   - Green "Connected" status
   - Live voltage reading (230V)
   - Both sensor currents updating
   - Power calculation showing
   - Recent readings table filling

3. **Backend logs show:**
   ```
   📊 Dual sensor data: Sensor1=X.XXXA, Sensor2=X.XXXA, Total=X.XXXA
   ✅ Reading saved: V=230V, I=X.XXXA, P=XXXW
   ```

---

## 📞 Support

If you encounter issues:
1. Check Serial Monitor for error messages
2. Verify all connections match the pin diagram
3. Ensure backend server is running
4. Test with no load first (should read ~0A)
5. Check firewall settings for port 5000

**Your system is ready to monitor dual current sensors! 🎊**
