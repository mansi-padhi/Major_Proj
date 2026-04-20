# ESP32 Connection Diagnostic

## Current Status

✅ **Backend**: Running and ready (with logging enabled)
✅ **Frontend**: Starting up
✅ **MongoDB**: Connected
✅ **API Endpoint**: Working correctly

❓ **ESP32**: Not receiving data yet

## How to Verify ESP32 is Sending Data

### Step 1: Check ESP32 Serial Monitor

Open Serial Monitor in Arduino IDE (Ctrl+Shift+M) and look for:

**✅ GOOD - ESP32 is working:**

```
=================================
IoT Energy Monitor - ESP32
Dual ACS712 Sensor Configuration
=================================

✓ WiFi Connected!
IP Address: 192.168.x.x

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

**❌ BAD - ESP32 has problems:**

**Problem 1: WiFi not connecting**

```
Connecting to WiFi....................
✗ WiFi Connection Failed!
Please check your credentials and try again.
```

**Solution**: Update WiFi SSID and password in the code

**Problem 2: Server connection failed**

```
Sending: {"deviceId":"esp32-1","sensor1":2.345,"sensor2":1.234,"voltage":230}
✗ Connection Error: connection refused
✗ Failed to send data
Success: 0 | Failed: 1
```

**Solution**: Check server IP address and network connectivity

**Problem 3: HTTP Error**

```
Sending: {"deviceId":"esp32-1","sensor1":2.345,"sensor2":1.234,"voltage":230}
✗ HTTP Error: 400
Error details: {"success":false,"message":"deviceId, sensor1 and sensor2 are required"}
✗ Failed to send data
```

**Solution**: Wrong data format - make sure you uploaded the NEW code

### Step 2: Check Backend Logs

The backend now has logging enabled. When ESP32 sends data, you'll see:

```
📡 Received POST request from ESP32
Request body: {
  "deviceId": "esp32-1",
  "sensor1": 2.345,
  "sensor2": 1.234,
  "voltage": 230
}
✅ Saved 2 readings from esp32-1
```

To check backend logs, run:

```bash
# In this chat, I can see the logs
# Or you can check the terminal where backend is running
```

### Step 3: Verify Data in Database

Run this command to see the latest ESP32 data:

```bash
curl "http://localhost:5000/api/readings?deviceId=esp32-1" | ConvertFrom-Json | Select-Object -ExpandProperty readings | Select-Object -First 5 deviceId, loadId, voltage, current, power, timestamp
```

Look for recent timestamps. If the timestamp is old, ESP32 hasn't sent new data.

### Step 4: Check Network Connectivity

**From your computer**, verify the server is accessible:

```bash
# Check if server is running
curl http://localhost:5000/api/health

# Check if server is accessible from network
curl http://10.164.131.99:5000/api/health
```

**From ESP32's network** (if possible), try to ping the server:

- Can ESP32 reach 10.164.131.99?
- Is port 5000 open on your firewall?

## Common Issues and Solutions

### Issue 1: Old Code Still Uploaded

**Symptoms**:

- Serial Monitor shows single current value
- deviceId is "ESP32_001" not "esp32-1"
- Data format is `{voltage, current}` not `{sensor1, sensor2, voltage}`

**Solution**:

1. Open `esp32/energy_monitor_dual_sensor/energy_monitor_dual_sensor.ino`
2. Update WiFi credentials
3. Upload to ESP32 again

### Issue 2: Wrong Server IP

**Symptoms**:

- ESP32 shows "Connection Error: connection refused"
- Backend logs show no incoming requests

**Solution**:

1. Find your computer's IP: Run `ipconfig` and look for IPv4 Address
2. Update ESP32 code line 18:
   ```cpp
   const char* SERVER_URL = "http://YOUR_ACTUAL_IP:5000/api/readings";
   ```
3. Upload to ESP32 again

### Issue 3: Firewall Blocking

**Symptoms**:

- ESP32 connects to WiFi
- Can't reach server
- Backend shows no requests

**Solution**:

1. Allow port 5000 in Windows Firewall
2. Or temporarily disable firewall for testing
3. Make sure ESP32 and computer are on same network

### Issue 4: ESP32 and Computer on Different Networks

**Symptoms**:

- ESP32 connected to WiFi
- Can't reach server at 10.164.131.99

**Solution**:

- Connect ESP32 to same WiFi network as your computer
- Or use computer's IP address on the network ESP32 is connected to

## Quick Test

To test if backend is working, run this simulation:

```bash
cd backend
node test-esp32-data.js
```

If this works but real ESP32 doesn't:

- ✅ Backend is fine
- ❌ Problem is with ESP32 code or network

## What to Tell Me

Please check your ESP32 Serial Monitor and tell me:

1. **Is WiFi connected?** (Do you see "✓ WiFi Connected!"?)
2. **What is the ESP32's IP address?** (Shows after WiFi connects)
3. **Is data being sent?** (Do you see "Sending: {...}"?)
4. **What is the response?** (Do you see "✓ Data sent successfully" or "✗ Failed"?)
5. **Any error messages?** (Copy the exact error if there is one)

This will help me identify exactly what's wrong!

## Expected Behavior

Once everything is working:

- ESP32 sends data every **60 seconds**
- Backend logs show "📡 Received POST request from ESP32"
- Database gets 2 new readings (Load1 and Load2) every 60 seconds
- Frontend dashboard updates automatically
- You can see real-time power consumption for both loads

## Current Time Check

Backend started at: 12:10 PM (approximately)
Current time: Check your clock

If ESP32 is sending every 60 seconds, you should see new data every minute.
