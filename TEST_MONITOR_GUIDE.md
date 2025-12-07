# 📊 ESP32 Test Monitor Guide

## Overview
A simple, real-time web interface to monitor your ESP32 sensor data as it's being stored in MongoDB.

---

## 🚀 Quick Start

### 1. Start Your Backend Server
```bash
cd backend
npm start
```

The server should be running on `http://localhost:5000`

### 2. Open the Test Monitor
Open your browser and navigate to:
```
http://localhost:5000/test-monitor.html
```

### 3. Upload ESP32 Code
Make sure your ESP32 code is configured with the correct server URL:
```cpp
const char* SERVER_URL = "http://YOUR_SERVER_IP:5000/api/readings";
```

Replace `YOUR_SERVER_IP` with:
- `localhost` if testing on the same machine
- Your computer's local IP (e.g., `192.168.1.100`) if ESP32 is on the same network
- Your public IP if accessing remotely

---

## 📡 What You'll See

### Live Dashboard Cards
1. **Voltage** - Mains voltage (230V typically)
2. **Sensor 1 Current** - Current from ACS712 sensor 1
3. **Sensor 2 Current** - Current from ACS712 sensor 2
4. **Total Power** - Combined power consumption (V × I)

### Recent Readings Table
- Shows last 10 readings from MongoDB
- Updates automatically every 2 seconds (configurable)
- Displays timestamp, voltage, currents, power, and device ID

### Status Indicator
- 🟢 **Connected** - Receiving data successfully
- 🟡 **Waiting** - No data yet, waiting for ESP32
- 🔴 **Disconnected** - Backend not responding

---

## 🎛️ Controls

### Auto-Refresh Interval
- Default: 2 seconds
- Adjustable: 1-60 seconds
- Click "Update Interval" to apply changes

### Refresh Now Button
- Manually fetch latest data
- Useful for immediate updates

### Clear All Data Button
- ⚠️ **WARNING**: Deletes ALL readings from MongoDB
- Use for testing/debugging only
- Requires confirmation

---

## 🔧 ESP32 Code Format

Your ESP32 is sending data in this format:
```json
{
  "deviceId": "esp32-1",
  "sensor1": 2.345,
  "sensor2": 1.234,
  "voltage": 230.0
}
```

The backend automatically:
- Combines `sensor1 + sensor2` into total `current`
- Calculates `power = voltage × current`
- Calculates incremental `energy` (kWh)
- Stores everything in MongoDB

---

## 🐛 Troubleshooting

### No Data Appearing?

**Check 1: Backend Running?**
```bash
# Should see: "✅ MongoDB Connected Successfully"
# and "🚀 Server running on port 5000"
```

**Check 2: ESP32 Connected to WiFi?**
- Open Arduino Serial Monitor (115200 baud)
- Should see: "✅ WiFi connected!"
- Note the IP address

**Check 3: ESP32 Sending Data?**
- Serial Monitor should show: "POSTing: {...}"
- Should see: "Server response code: 201"

**Check 4: Correct Server URL?**
- ESP32 code must point to your backend server
- Format: `http://SERVER_IP:5000/api/readings`
- Test in browser: `http://localhost:5000/api/health`

### Status Shows "Disconnected"?

**Solution 1: Check Backend**
```bash
cd backend
npm start
```

**Solution 2: Check MongoDB**
- Ensure MongoDB is running
- Check `.env` file has correct `MONGODB_URI`

**Solution 3: Check Firewall**
- Allow port 5000 through firewall
- Disable firewall temporarily for testing

### Readings Show Zero?

**Check Sensor Connections:**
- Sensor 1 OUT → GPIO 34 (via voltage divider)
- Sensor 2 OUT → GPIO 35 (via voltage divider)
- VCC → 5V
- GND → GND

**Check Calibration:**
- ESP32 code calibrates on startup
- Ensure NO LOAD during calibration
- Check Serial Monitor for offset values

---

## 📊 Data Flow

```
ESP32 Sensors
    ↓
WiFi Network
    ↓
Backend API (POST /api/readings)
    ↓
MongoDB Database
    ↓
Test Monitor (GET /api/readings/latest)
    ↓
Your Browser
```

---

## 🔍 Monitoring Tips

### For Testing
1. Start with NO LOAD connected
2. Verify sensors read near zero
3. Connect a known load (e.g., 100W bulb)
4. Verify readings match expected values

### For Calibration
1. Measure actual voltage with multimeter
2. Measure actual current with clamp meter
3. Compare with ESP32 readings
4. Adjust calibration factors in ESP32 code:
   ```cpp
   const float SENSITIVITY = 0.066;  // Adjust this
   const float DIVIDER_GAIN = 1.5;   // Adjust this
   ```

### For Production
1. Set refresh interval to 5-10 seconds
2. Monitor for stable readings
3. Check for any anomalies
4. Use main dashboard for detailed analysis

---

## 🌐 API Endpoints Used

The test monitor uses these endpoints:

- `GET /api/readings/latest` - Get most recent reading
- `GET /api/readings/today` - Get today's readings
- `DELETE /api/readings/clear` - Clear all readings (testing only)

---

## 📱 Mobile Access

The test monitor is responsive and works on mobile devices:

1. Find your computer's IP address:
   ```bash
   # Windows
   ipconfig
   
   # Mac/Linux
   ifconfig
   ```

2. On your phone's browser, navigate to:
   ```
   http://YOUR_COMPUTER_IP:5000/test-monitor.html
   ```

3. Monitor your ESP32 from anywhere on your local network!

---

## 🎨 Features

- ✅ Real-time updates (auto-refresh)
- ✅ Clean, modern UI
- ✅ Responsive design (mobile-friendly)
- ✅ Color-coded status indicators
- ✅ Recent readings history
- ✅ Manual refresh option
- ✅ Configurable refresh interval
- ✅ Database management (clear data)
- ✅ No external dependencies (pure HTML/CSS/JS)

---

## 🔗 Next Steps

Once you verify data is flowing correctly:

1. **Use Main Dashboard**: Navigate to `http://localhost:3000` for full analytics
2. **Check MongoDB**: Use MongoDB Compass to view raw data
3. **Test API**: Use `backend/test-api.http` for API testing
4. **Deploy**: Move to production environment

---

## 📞 Support

If you encounter issues:

1. Check Serial Monitor output from ESP32
2. Check backend console logs
3. Check browser console (F12) for errors
4. Verify all connections and configurations

**Related Files:**
- ESP32 Code: `esp32/energy_monitor/energy_monitor.ino`
- Backend API: `backend/routes/readings.js`
- Data Model: `backend/models/Reading.js`
- Main Dashboard: `http://localhost:3000`

---

**Happy Monitoring! ⚡**
