# 🔧 ESP32 Troubleshooting Guide

## ✅ Issue Fixed!

The problem was that the `power` field in the Reading model was marked as `required: true`, which caused validation to fail before the pre-save hook could calculate it.

**Fix Applied**: Changed `power` field to `required: false` in `backend/models/Reading.js`

---

## 🧪 Testing Tools Created

### 1. Diagnostic Script
```bash
cd backend
node diagnose.js
```
**Shows:**
- MongoDB connection status
- Number of readings in database
- Latest reading details
- Server status

### 2. ESP32 Connection Test
```bash
cd backend
node test-esp32-connection.js
```
**Does:**
- Simulates ESP32 POST request
- Tests if API endpoint works
- Shows response from server

### 3. Check ESP32 Data
```bash
cd backend
node check-esp32-data.js
```
**Shows:**
- All readings from device "esp32-1"
- Count of readings per device
- Latest sensor values

---

## 📊 Current Status

### ✅ What's Working
- Backend server running on port 5000
- MongoDB connected successfully
- API endpoint `/api/readings` accepting data
- Test data successfully saved to database
- Test monitor page updated to filter by device ID

### 📝 Test Results
```
Device: esp32-1
Voltage: 230 V
Sensor1: 2.345 A
Sensor2: 1.234 A
Total Current: 3.579 A
Power: 823.17 W
✅ Successfully saved to MongoDB!
```

---

## 🚀 Next Steps

### 1. Test with Real ESP32

**Upload your code to ESP32 and check Serial Monitor:**

Expected output:
```
✅ WiFi connected!
IP address: 10.97.183.XXX
Sensor 1 zero offset (V): 2.5123
Sensor 2 zero offset (V): 2.5087
Calibration done.

Sensor1: X.XXX A    Sensor2: X.XXX A
POSTing: {"deviceId":"esp32-1","sensor1":X.XXX,"sensor2":X.XXX,"voltage":230.0}
Server response code: 201
Response: {"success":true,...}
```

**If you see "Server response code: 201"** → ✅ Data is being saved!

**If you see error code (400, 500, etc.)** → Check the response message

### 2. Open Test Monitor

Navigate to: **http://localhost:5000/test-monitor.html**

Or from network: **http://10.97.183.155:5000/test-monitor.html**

**You should see:**
- 🟢 Green "Connected" status
- Live voltage reading
- Both sensor currents
- Total power
- Recent readings table

### 3. Verify Data in MongoDB

Run diagnostic:
```bash
cd backend
node check-esp32-data.js
```

---

## 🐛 Common Issues & Solutions

### Issue 1: ESP32 Can't Connect to WiFi

**Symptoms:**
- Serial Monitor shows "Connecting to WiFi..." forever
- Never shows "✅ WiFi connected!"

**Solutions:**
1. Check WiFi credentials in ESP32 code:
   ```cpp
   const char* ssid     = "Realme";
   const char* password = "mansi1603";
   ```
2. Ensure WiFi is 2.4GHz (ESP32 doesn't support 5GHz)
3. Move ESP32 closer to router
4. Check if router allows new devices

### Issue 2: ESP32 Can't Reach Server

**Symptoms:**
- WiFi connected but POST fails
- Error code: -1 or timeout

**Solutions:**
1. Verify server IP in ESP32 code:
   ```cpp
   const char* SERVER_URL = "http://10.97.183.155:5000/api/readings";
   ```
2. Check if backend is running:
   ```bash
   curl http://10.97.183.155:5000/api/health
   ```
3. Ensure ESP32 and server are on same network
4. Check firewall allows port 5000
5. Try using computer's IP instead of localhost

### Issue 3: Server Returns Error 500

**Symptoms:**
- ESP32 sends data but gets error 500
- Backend logs show validation error

**Solutions:**
- ✅ Already fixed! The `power` field issue is resolved
- If still happening, check backend console for error details

### Issue 4: Test Monitor Shows "Waiting"

**Symptoms:**
- Page loads but shows yellow "Waiting for data"
- No readings appear

**Solutions:**
1. Check if ESP32 is sending data (Serial Monitor)
2. Verify backend is running
3. Run diagnostic: `node check-esp32-data.js`
4. Refresh browser page (F5)
5. Check browser console (F12) for errors

### Issue 5: Test Monitor Shows Old Data

**Symptoms:**
- Shows data from "ESP32_001" instead of "esp32-1"

**Solutions:**
- ✅ Already fixed! Test monitor now filters by device ID
- Clear browser cache and refresh
- Or clear old data: Click "Clear All Data" button

### Issue 6: Readings Are Zero

**Symptoms:**
- ESP32 sends data but sensors read 0.000 A

**Solutions:**
1. Check sensor connections:
   - Sensor 1 OUT → GPIO 34 (via divider)
   - Sensor 2 OUT → GPIO 35 (via divider)
   - VCC → 5V
   - GND → GND
2. Verify voltage dividers (10kΩ + 20kΩ)
3. Check sensor power supply
4. Ensure calibration completed (no load during startup)

---

## 🔍 Debug Checklist

### Backend
- [ ] Backend running? (`npm start`)
- [ ] MongoDB connected? (check console)
- [ ] Port 5000 accessible? (`curl http://localhost:5000/api/health`)
- [ ] Firewall allows port 5000?

### ESP32
- [ ] Code uploaded successfully?
- [ ] WiFi credentials correct?
- [ ] WiFi connected? (check Serial Monitor)
- [ ] Server URL correct?
- [ ] Sending data? (see "POSTing:" in Serial Monitor)
- [ ] Getting response 201? (success)

### Test Monitor
- [ ] Page loads? (http://localhost:5000/test-monitor.html)
- [ ] Backend running?
- [ ] Browser console shows no errors? (F12)
- [ ] Device ID matches? ("esp32-1")

---

## 📱 Quick Commands

### Start Backend
```bash
cd backend
npm start
```

### Test API
```bash
cd backend
node test-esp32-connection.js
```

### Check Data
```bash
cd backend
node check-esp32-data.js
```

### Diagnose System
```bash
cd backend
node diagnose.js
```

### Clear Old Data (Optional)
Open test monitor and click "Clear All Data" button

Or via MongoDB:
```bash
# In MongoDB shell
use energy_monitoring
db.readings.deleteMany({deviceId: "ESP32_001"})
```

---

## 🎯 Success Indicators

### ESP32 Serial Monitor
```
✅ WiFi connected!
Server response code: 201
```

### Backend Console
```
📊 Dual sensor data: Sensor1=X.XXXA, Sensor2=X.XXXA, Total=X.XXXA
✅ Reading saved: V=230V, I=X.XXXA, P=XXXW
```

### Test Monitor
```
🟢 Connected - Receiving Data
Voltage: 230.0 V
Sensor 1: X.XXX A
Sensor 2: X.XXX A
Power: XXX.XX W
```

---

## 📞 Still Having Issues?

1. **Check Serial Monitor** - Most detailed debug info
2. **Check Backend Console** - Server-side errors
3. **Check Browser Console** (F12) - Frontend errors
4. **Run Diagnostics** - `node diagnose.js`
5. **Test API Manually** - `node test-esp32-connection.js`

---

**Your system is ready! Upload the ESP32 code and start monitoring! ⚡**
