# ESP32 Upload Checklist ✓

## Current Problem

Your ESP32 is running **test code** that only reads sensors but doesn't send data to the server.

## Solution: Upload the Correct Code

### ☐ Step 1: Open Arduino IDE

- Launch Arduino IDE on your computer

### ☐ Step 2: Open the Correct File

- File → Open
- Navigate to your project folder
- Open: `esp32/energy_monitor_dual_sensor/energy_monitor_dual_sensor.ino`

### ☐ Step 3: Update WiFi Settings

Find these lines (around line 18-19):

```cpp
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
```

Replace with YOUR WiFi credentials:

```cpp
const char* WIFI_SSID = "YourActualWiFiName";
const char* WIFI_PASSWORD = "YourActualPassword";
```

### ☐ Step 4: Verify Server IP (Optional)

Line 22 should show:

```cpp
const char* SERVER_URL = "http://10.164.131.99:5000/api/readings";
```

If your computer's IP is different:

- Open Command Prompt
- Type: `ipconfig`
- Find your IPv4 Address
- Update the IP in the code

### ☐ Step 5: Select Board

- Tools → Board → ESP32 Arduino → **ESP32 Dev Module**

### ☐ Step 6: Select Port

- Tools → Port → **COM# (ESP32)** or **/dev/ttyUSB# (ESP32)**

### ☐ Step 7: Upload

- Click the **Upload** button (→ arrow icon)
- Wait for "Done uploading" message (30-60 seconds)

### ☐ Step 8: Open Serial Monitor

- Click Serial Monitor icon (magnifying glass, top right)
- Set baud rate to **115200** (bottom right dropdown)

### ☐ Step 9: Reset ESP32

- Press the **RESET** button on your ESP32 board
- Watch the Serial Monitor

### ☐ Step 10: Verify Output

You should see:

```
=================================
IoT Energy Monitor - ESP32
Dual ACS712 Sensor Configuration
=================================

Connecting to WiFi........
✓ WiFi Connected!
IP Address: 192.168.x.x

✓ System Ready!
Starting energy monitoring...
Sending data every 60 seconds
```

## Success Indicators

✅ **WiFi Connected** - Shows IP address
✅ **Sending data** - Shows "Sending: {...}" every 60 seconds
✅ **Server response** - Shows "✓ Data sent successfully"
✅ **Backend logs** - Shows "📡 Received POST request from ESP32"

## If Something Goes Wrong

### WiFi Not Connecting

- Check SSID and password are correct (case-sensitive!)
- Make sure it's 2.4GHz WiFi (ESP32 doesn't support 5GHz)
- Move ESP32 closer to router

### Can't Connect to Server

- Verify server IP is correct
- Check backend is running: Open browser → http://localhost:5000/api/health
- Make sure ESP32 and computer are on same WiFi network

### Upload Failed

- Check USB cable is connected properly
- Try a different USB port
- Press and hold BOOT button while uploading
- Check correct COM port is selected

## After Successful Upload

Wait 60 seconds, then check:

1. **Serial Monitor** - Should show "✓ Data sent successfully"
2. **Backend Terminal** - Should show "📡 Received POST request"
3. **Database** - Run: `curl "http://localhost:5000/api/readings?deviceId=esp32-1"`
4. **Frontend** - Open: http://localhost:3000 (should show real data)

## Quick Test

To verify backend is ready:

```bash
cd backend
node test-esp32-data.js
```

If this works, backend is fine. Problem is just ESP32 code.

---

**Estimated Time**: 3-5 minutes
**Difficulty**: Easy (just upload and update WiFi credentials)
**Result**: Real-time energy monitoring working end-to-end!
