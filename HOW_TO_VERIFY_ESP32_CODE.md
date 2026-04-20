# How to Verify Which ESP32 Code is Running

## What You're Seeing Now (Wrong Code)

Your Serial Monitor shows:

```
Sensor1: 0.021 A    Sensor2: 0.083 A
Sensor1: 0.024 A    Sensor2: -0.027 A
Sensor1: 0.013 A    Sensor2: -0.014 A
```

This is from **test/debug code** that only prints sensor values but doesn't:

- Connect to WiFi
- Send data to server
- Show any status messages

## What You SHOULD See (Correct Code)

After uploading the correct code, you should see:

### 1. Startup Messages

```
=================================
IoT Energy Monitor - ESP32
Dual ACS712 Sensor Configuration
=================================

Connecting to WiFi........
✓ WiFi Connected!
IP Address: 192.168.1.123
Signal Strength: -45 dBm

✓ System Ready!
Starting energy monitoring...
Sending data every 60 seconds
```

### 2. Every 60 Seconds - Data Transmission

```
─────────────────────────────────
Reading #1
Voltage:   230.00 V
Load 1:    0.021 A  (4.83 W)
Load 2:    0.083 A  (19.09 W)
Total:     0.104 A  (23.92 W)
Sending: {"deviceId":"esp32-1","sensor1":0.021,"sensor2":0.083,"voltage":230}
Server Response:
{"success":true,"message":"Readings saved successfully","count":2,...}
✓ Data sent successfully
Success: 1 | Failed: 0
─────────────────────────────────
```

## Quick Check

**Look at the TOP of your Serial Monitor:**

❌ **If you see ONLY sensor readings** → Wrong code, need to upload new one

✅ **If you see WiFi messages and "Sending:"** → Correct code is running

## How to Upload the Correct Code

### Step 1: Open the Correct File

In Arduino IDE:

- File → Open
- Navigate to: `esp32/energy_monitor_dual_sensor/energy_monitor_dual_sensor.ino`
- Click Open

### Step 2: Update WiFi Credentials

Find these lines (around line 18-19):

```cpp
const char* WIFI_SSID = "YOUR_WIFI_SSID";        // Change this
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD"; // Change this
```

Change to your actual WiFi:

```cpp
const char* WIFI_SSID = "YourWiFiName";
const char* WIFI_PASSWORD = "YourWiFiPassword";
```

### Step 3: Verify Server URL

Check line 22 - should be:

```cpp
const char* SERVER_URL = "http://10.164.131.99:5000/api/readings";
```

If your computer's IP is different, update it. To find your IP:

- Open Command Prompt
- Type: `ipconfig`
- Look for "IPv4 Address" under your active network

### Step 4: Upload to ESP32

1. Connect ESP32 to computer via USB
2. Select Board: **Tools → Board → ESP32 Dev Module**
3. Select Port: **Tools → Port → COM# (ESP32)**
4. Click **Upload** button (→)
5. Wait for "Done uploading" message

### Step 5: Open Serial Monitor

1. Click Serial Monitor icon (top right)
2. Set baud rate to **115200** (bottom right)
3. Press **Reset button** on ESP32
4. Watch the output

## Troubleshooting

### Problem: "WiFi Connection Failed"

**Solution**:

- Check WiFi SSID and password are correct
- Make sure WiFi is 2.4GHz (ESP32 doesn't support 5GHz)
- Move ESP32 closer to router

### Problem: "Connection Error: connection refused"

**Solution**:

- Verify server IP address is correct
- Make sure backend is running: `http://localhost:5000/api/health`
- Check if ESP32 and computer are on same network
- Disable firewall temporarily to test

### Problem: "HTTP Error: 400"

**Solution**:

- This means data format is wrong
- Make sure you uploaded the NEW code, not old code

### Problem: Still seeing only "Sensor1: X A Sensor2: Y A"

**Solution**:

- You're still running old code
- Close Arduino IDE completely
- Reopen and load the correct file
- Upload again

## Files Comparison

### ❌ OLD CODE (What you have now)

**Location**: Unknown (might be custom test code)
**Output**: Only sensor readings

```
Sensor1: 0.021 A    Sensor2: 0.083 A
```

### ✅ NEW CODE (What you need)

**Location**: `esp32/energy_monitor_dual_sensor/energy_monitor_dual_sensor.ino`
**Output**: Full system with WiFi and server communication

```
✓ WiFi Connected!
Reading #1
Voltage: 230.00 V
Load 1: 0.021 A (4.83 W)
Sending: {...}
✓ Data sent successfully
```

## After Successful Upload

Once the correct code is running:

1. **Backend logs will show**:

   ```
   📡 Received POST request from ESP32
   Request body: {
     "deviceId": "esp32-1",
     "sensor1": 0.021,
     "sensor2": 0.083,
     "voltage": 230
   }
   ✅ Saved 2 readings from esp32-1
   ```

2. **Database will have new data**:

   ```bash
   curl "http://localhost:5000/api/readings?deviceId=esp32-1"
   ```

3. **Frontend will update automatically**:
   - Open: http://localhost:3000
   - Dashboard shows real-time data
   - Updates every 60 seconds

## Summary

**Current Status**: ❌ Running test code (only prints sensor values)

**Action Required**: Upload `esp32/energy_monitor_dual_sensor/energy_monitor_dual_sensor.ino`

**Expected Result**: ESP32 connects to WiFi and sends data to server every 60 seconds

**Time to Fix**: 2-3 minutes (just upload the correct code)
