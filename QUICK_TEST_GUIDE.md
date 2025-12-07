# ⚡ Quick Test Guide - Your ESP32 Setup

## 🎯 Your Configuration

```
WiFi: Realme
Server: 10.97.183.155:5000
Device: esp32-1
Sensors: 2x ACS712 30A
Pins: GPIO 34 (Sensor 1), GPIO 35 (Sensor 2)
Interval: 6 seconds
```

---

## 🚀 3-Step Quick Start

### 1️⃣ Start Backend
```bash
cd backend
npm start
```
✅ Look for: "✅ MongoDB Connected" and "🚀 Server running on port 5000"

### 2️⃣ Upload ESP32 Code
```
Arduino IDE → Open → esp32/energy_monitor_dual_sensor/energy_monitor_dual_sensor.ino
Tools → Board → ESP32 Dev Module
Tools → Port → (Your COM port)
Click Upload ⬆️
```
✅ Look for: "Done uploading"

### 3️⃣ Open Test Monitor
```
Browser → http://10.97.183.155:5000/test-monitor.html
```
✅ Look for: 🟢 "Connected - Receiving Data"

---

## 📊 What You Should See

### Serial Monitor (115200 baud)
```
✅ WiFi connected!
IP address: 10.97.183.XXX
Sensor 1 zero offset (V): 2.5123
Sensor 2 zero offset (V): 2.5087
Calibration done.

Sensor1: 2.345 A    Sensor2: 1.234 A
POSTing: {"deviceId":"esp32-1","sensor1":2.345,"sensor2":1.234,"voltage":230.0}
Server response code: 201
```

### Test Monitor Webpage
```
⚡ Voltage:        230.0 V
🔌 Sensor 1:       2.345 A
🔌 Sensor 2:       1.234 A
💡 Total Power:    823.17 W

Status: 🟢 Connected - Receiving Data
```

---

## 🔧 Quick Fixes

### ❌ WiFi Not Connecting
```cpp
// Check these lines in your code:
const char* ssid     = "Realme";
const char* password = "mansi1603";
```
- Verify WiFi is 2.4GHz
- Move ESP32 closer to router

### ❌ Server Connection Failed
```bash
# Test server is running:
curl http://10.97.183.155:5000/api/health

# Or in browser:
http://10.97.183.155:5000/api/health
```
- Ensure backend is running
- Check firewall allows port 5000

### ❌ Readings Always Zero
- Disconnect loads during calibration
- Check sensor power (5V, GND)
- Verify voltage dividers (10kΩ + 20kΩ)
- Check GPIO pins (34, 35)

### ❌ Test Monitor Shows "Waiting"
- Check backend is running
- Verify ESP32 is sending (check Serial Monitor)
- Refresh browser page

---

## 📱 Access from Phone

1. Connect phone to same WiFi ("Realme")
2. Open browser
3. Go to: `http://10.97.183.155:5000/test-monitor.html`
4. Monitor in real-time!

---

## 🎛️ Quick Settings

### Change Update Interval
In ESP32 code (line 37):
```cpp
const unsigned long POST_INTERVAL = 6000; // milliseconds
```

### Change Server IP
In ESP32 code (line 32):
```cpp
const char* SERVER_URL = "http://YOUR_IP:5000/api/readings";
```

### Change Voltage
In ESP32 code (line 34):
```cpp
const float MAINS_VOLTAGE = 230.0; // Your mains voltage
```

---

## 📊 Data Format

### ESP32 Sends
```json
{
  "deviceId": "esp32-1",
  "sensor1": 2.345,
  "sensor2": 1.234,
  "voltage": 230.0
}
```

### Backend Stores
```json
{
  "voltage": 230.0,
  "current": 3.579,      // sensor1 + sensor2
  "sensor1": 2.345,
  "sensor2": 1.234,
  "power": 823.17,       // voltage × current
  "energy": 0.001142,    // kWh
  "timestamp": "2025-12-07T10:30:45Z"
}
```

---

## ✅ Success Checklist

- [ ] Backend shows "MongoDB Connected"
- [ ] ESP32 shows "WiFi connected"
- [ ] Serial Monitor shows "Server response code: 201"
- [ ] Test Monitor shows 🟢 "Connected"
- [ ] Voltage displays correctly (~230V)
- [ ] Sensor currents update every 6 seconds
- [ ] Recent readings table fills up
- [ ] Power calculation is correct

---

## 🔗 Quick Links

### Local Access (Same Computer)
- Test Monitor: http://localhost:5000/test-monitor.html
- API Health: http://localhost:5000/api/health
- Main Dashboard: http://localhost:3000

### Network Access (Other Devices)
- Test Monitor: http://10.97.183.155:5000/test-monitor.html
- API Health: http://10.97.183.155:5000/api/health
- Main Dashboard: http://10.97.183.155:3000

---

## 📁 Important Files

```
esp32/energy_monitor_dual_sensor/
  └── energy_monitor_dual_sensor.ino  ← Your ESP32 code

backend/
  ├── server.js                        ← Start with: npm start
  ├── routes/readings.js               ← API endpoint
  ├── models/Reading.js                ← Data model
  └── public/test-monitor.html         ← Test webpage

Documentation/
  ├── QUICK_TEST_GUIDE.md              ← This file
  ├── TEST_MONITOR_GUIDE.md            ← Detailed guide
  └── esp32/DUAL_SENSOR_SETUP.md       ← Complete setup
```

---

## 🎯 Testing Steps

### 1. No Load Test
1. Disconnect all loads from sensors
2. Power on ESP32
3. Wait for calibration
4. Check readings are near 0A

### 2. Single Load Test
1. Connect 100W bulb to Sensor 1
2. Check Serial Monitor: Sensor1 ≈ 0.43A
3. Check Test Monitor: Power ≈ 100W

### 3. Dual Load Test
1. Connect load to Sensor 2 as well
2. Check both sensors reading
3. Verify total current = sensor1 + sensor2
4. Verify power = voltage × total current

---

## 💡 Pro Tips

1. **Always calibrate with no load** - Disconnect everything during startup
2. **Check Serial Monitor first** - It shows detailed debug info
3. **Use Test Monitor for quick checks** - Real-time visual feedback
4. **Use Main Dashboard for analysis** - Charts and historical data
5. **Keep backend running** - ESP32 needs it to store data

---

## 🆘 Emergency Reset

If everything seems broken:

```bash
# 1. Stop backend
Ctrl+C in backend terminal

# 2. Clear MongoDB (optional)
# In browser: http://localhost:5000/test-monitor.html
# Click "Clear All Data" button

# 3. Restart backend
cd backend
npm start

# 4. Reset ESP32
Press EN button on ESP32 board

# 5. Refresh test monitor
F5 in browser
```

---

## 📞 Quick Support

**Problem**: Can't see data in test monitor
**Check**: 
1. Backend running? ✓
2. ESP32 connected to WiFi? ✓
3. Serial Monitor shows "201"? ✓
4. Browser console errors? (F12)

**Problem**: Readings seem wrong
**Check**:
1. Calibration completed? ✓
2. Voltage dividers correct? ✓
3. Sensor orientation? ✓
4. Compare with multimeter ✓

---

**You're all set! Start monitoring your energy consumption! ⚡🎉**
