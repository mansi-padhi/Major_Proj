# ESP32 Quick Start - 5 Minutes Setup

## 🚀 Fastest Way to Test (No Sensors)

### Step 1: Install Arduino IDE (2 minutes)
1. Download: https://www.arduino.cc/en/software
2. Install and open

### Step 2: Add ESP32 Support (1 minute)
1. **File → Preferences**
2. Paste in "Additional Board Manager URLs":
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. **Tools → Board → Boards Manager**
4. Search "esp32" → Install

### Step 3: Install Library (30 seconds)
1. **Sketch → Include Library → Manage Libraries**
2. Search "ArduinoJson" → Install

### Step 4: Configure & Upload (1 minute)
1. Open `esp32/energy_monitor_test/energy_monitor_test.ino`
2. Change these lines:
   ```cpp
   const char* WIFI_SSID = "YourWiFiName";
   const char* WIFI_PASSWORD = "YourWiFiPassword";
   const char* SERVER_URL = "http://YOUR_IP:5000/api/readings";
   ```
3. Find your IP:
   - Windows: `ipconfig` in CMD
   - Mac/Linux: `ifconfig` in Terminal
4. **Tools → Board** → Select "ESP32 Dev Module"
5. **Tools → Port** → Select your ESP32 port
6. Click **Upload** button (→)

### Step 5: Watch It Work! (30 seconds)
1. **Tools → Serial Monitor**
2. Set baud rate to **115200**
3. You should see data being sent every 5 seconds!

---

## ✅ Success Looks Like This:

```
=================================
IoT Energy Monitor - TEST MODE
=================================

Connecting to WiFi........
✓ WiFi Connected!
IP Address: 192.168.1.150

✓ System Ready!
Generating simulated readings...

─────────────────────────────────
Reading #1 (SIMULATED)
Voltage: 218.00 V
Current: 2.450 A
Power:   533.10 W
✓ Data sent successfully
Success: 1 | Failed: 0
─────────────────────────────────
```

---

## 🔍 Verify Backend Received Data

Open browser or use curl:
```bash
curl http://localhost:5000/api/readings/latest
```

You should see your ESP32 data!

---

## ⚠️ Troubleshooting

### Can't connect to WiFi?
- Check SSID and password
- ESP32 only works with 2.4GHz WiFi (not 5GHz)

### Can't reach server?
- Make sure backend is running: `npm run dev`
- Use your computer's IP, not "localhost"
- Check firewall isn't blocking port 5000

### Upload failed?
- Try different USB cable
- Press and hold "BOOT" button while uploading
- Check correct port is selected

---

## 🎉 Next Steps

1. ✅ ESP32 sending data
2. ✅ Backend receiving data
3. ⏳ Check dashboard: `http://localhost:5000/api/dashboard/summary`
4. ⏳ Add real sensors (see main README.md)
5. ⏳ Connect React frontend

**You're now collecting IoT energy data!** 🚀
