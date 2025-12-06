# ✅ ESP32 Integration - Complete!

## 📦 What's Been Created

```
esp32/
├── energy_monitor/
│   └── energy_monitor.ino          # Production firmware (with sensors)
├── energy_monitor_test/
│   └── energy_monitor_test.ino     # Test firmware (no sensors needed)
├── README.md                        # Complete setup guide
└── QUICK_START.md                   # 5-minute quick start
```

---

## 🎯 Two Versions Available

### 1. Test Version (Start Here!)
**File:** `esp32/energy_monitor_test/energy_monitor_test.ino`

✅ **No sensors required** - Just ESP32 board  
✅ **Generates simulated data** - Realistic voltage/current  
✅ **Perfect for testing** - Verify backend integration  
✅ **Quick setup** - 5 minutes to running  

**Use this to:**
- Test backend API
- Verify data flow
- Develop frontend
- Learn the system

### 2. Production Version
**File:** `esp32/energy_monitor/energy_monitor.ino`

⚡ **Real sensors required:**
- ZMPT101B (AC Voltage Sensor)
- ACS712 (Current Sensor)

⚡ **Features:**
- RMS voltage calculation
- RMS current calculation
- Accurate power measurement
- Calibration support

**Use this when:**
- You have actual sensors
- Ready for real deployment
- Need accurate measurements

---

## 🔌 Hardware Options

### Option A: Testing (Minimal)
```
Required:
- ESP32 Development Board ($5-10)
- USB Cable
- WiFi Network

Cost: ~$10
Time: 5 minutes
```

### Option B: Production (Full System)
```
Required:
- ESP32 Development Board ($5-10)
- ZMPT101B Voltage Sensor ($3-5)
- ACS712 Current Sensor ($2-4)
- Jumper Wires ($2)
- Breadboard (optional) ($3)

Cost: ~$15-25
Time: 30-60 minutes
```

---

## 🚀 Quick Start (Test Version)

### 1. Install Arduino IDE
Download: https://www.arduino.cc/en/software

### 2. Add ESP32 Support
**File → Preferences** → Add URL:
```
https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
```

**Tools → Board → Boards Manager** → Install "esp32"

### 3. Install ArduinoJson Library
**Sketch → Include Library → Manage Libraries** → Install "ArduinoJson"

### 4. Configure Firmware
Open `esp32/energy_monitor_test/energy_monitor_test.ino`

Update:
```cpp
const char* WIFI_SSID = "YourWiFiName";
const char* WIFI_PASSWORD = "YourPassword";
const char* SERVER_URL = "http://YOUR_IP:5000/api/readings";
```

### 5. Upload & Run
- Connect ESP32 via USB
- **Tools → Board** → "ESP32 Dev Module"
- **Tools → Port** → Select your port
- Click **Upload** (→)
- **Tools → Serial Monitor** (115200 baud)

---

## 📊 Data Flow

```
┌─────────────────┐
│   ESP32 Board   │
│  (Test Mode)    │
└────────┬────────┘
         │
         │ Generates simulated:
         │ - Voltage: 210-230V
         │ - Current: 0.1-10A
         │
         ▼
┌─────────────────┐
│  WiFi Network   │
└────────┬────────┘
         │
         │ HTTP POST every 5 seconds
         │ JSON: {"voltage": 220, "current": 2.5}
         │
         ▼
┌─────────────────────────┐
│  Backend API            │
│  POST /api/readings     │
└────────┬────────────────┘
         │
         │ Calculates:
         │ - Power = V × I
         │ - Energy (incremental)
         │
         ▼
┌─────────────────┐
│    MongoDB      │
│  (Stores data)  │
└─────────────────┘
```

---

## 🧪 Testing Checklist

### Backend Ready?
```bash
# Check backend is running
curl http://localhost:5000/api/health

# Should return:
{"status":"OK","message":"Energy Monitoring Backend is running"}
```

### ESP32 Connected?
Open Serial Monitor, you should see:
```
✓ WiFi Connected!
IP Address: 192.168.1.150
✓ System Ready!
```

### Data Flowing?
Serial Monitor shows:
```
Reading #1 (SIMULATED)
Voltage: 218.00 V
Current: 2.450 A
Power:   533.10 W
✓ Data sent successfully
```

### Backend Receiving?
```bash
curl http://localhost:5000/api/readings/latest

# Should return latest ESP32 reading
```

---

## 📈 Expected Output

### ESP32 Serial Monitor:
```
=================================
IoT Energy Monitor - TEST MODE
=================================

Connecting to WiFi........
✓ WiFi Connected!
IP Address: 192.168.1.150
Signal Strength: -45 dBm

✓ System Ready!
Generating simulated readings...

─────────────────────────────────
Reading #1 (SIMULATED)
Voltage: 218.00 V
Current: 2.450 A
Power:   533.10 W
Sending: {"deviceId":"ESP32_TEST","voltage":218,"current":2.45}
Server Response:
  Power: 533.10 W
  Energy: 0.000741 kWh
✓ Data sent successfully
Success: 1 | Failed: 0
─────────────────────────────────

─────────────────────────────────
Reading #2 (SIMULATED)
Voltage: 222.00 V
Current: 1.850 A
Power:   410.70 W
✓ Data sent successfully
Success: 2 | Failed: 0
─────────────────────────────────
```

### Backend Console:
```
POST /api/readings 201 45ms
POST /api/readings 201 42ms
POST /api/readings 201 38ms
```

### Database Query:
```bash
curl http://localhost:5000/api/dashboard/summary
```

Response:
```json
{
  "success": true,
  "today": {
    "energy": "0.125",
    "cost": "0.01",
    "avgPower": "485.50",
    "maxPower": "650.00",
    "readings": 150
  },
  "latest": {
    "deviceId": "ESP32_TEST",
    "voltage": 222,
    "current": 1.85,
    "power": 410.7,
    "energy": 0.000741,
    "timestamp": "2024-01-15T10:35:00.000Z"
  }
}
```

---

## 🔧 Configuration Options

### Change Reading Interval:
```cpp
const int READING_INTERVAL = 5000;  // milliseconds (5 seconds)
```

Options:
- `1000` = 1 second (high frequency)
- `5000` = 5 seconds (recommended)
- `10000` = 10 seconds (low frequency)
- `60000` = 1 minute (very low frequency)

### Change Device ID:
```cpp
const char* DEVICE_ID = "ESP32_TEST";
```

Use different IDs for multiple devices:
- `"ESP32_Kitchen"`
- `"ESP32_LivingRoom"`
- `"ESP32_Bedroom"`

### Adjust Simulated Values:
```cpp
// In generateVoltage():
float baseVoltage = 220.0;  // Change base voltage
float variation = random(-10, 11);  // Change variation range

// In generateCurrent():
// Modify scenarios for different load patterns
```

---

## 🐛 Common Issues & Solutions

### Issue: WiFi Won't Connect
**Symptoms:** Stuck on "Connecting to WiFi..."

**Solutions:**
1. Check SSID and password are correct
2. Ensure WiFi is 2.4GHz (ESP32 doesn't support 5GHz)
3. Move ESP32 closer to router
4. Check WiFi doesn't have MAC filtering

### Issue: HTTP Connection Failed
**Symptoms:** "Connection Error" in Serial Monitor

**Solutions:**
1. Verify backend is running: `curl http://localhost:5000/api/health`
2. Use computer's IP address, not "localhost"
3. Check firewall isn't blocking port 5000
4. Ensure ESP32 and computer are on same network

### Issue: Upload Failed
**Symptoms:** "Failed to connect to ESP32"

**Solutions:**
1. Try different USB cable
2. Press and hold "BOOT" button while uploading
3. Check correct port is selected in Tools → Port
4. Install CH340 or CP2102 drivers if needed

### Issue: No Serial Output
**Symptoms:** Serial Monitor is blank

**Solutions:**
1. Check baud rate is set to 115200
2. Press "EN" (reset) button on ESP32
3. Try different USB port
4. Verify code uploaded successfully

---

## 📚 Documentation Reference

| Document | Purpose |
|----------|---------|
| `esp32/QUICK_START.md` | 5-minute setup guide |
| `esp32/README.md` | Complete documentation |
| `energy_monitor_test.ino` | Test firmware (no sensors) |
| `energy_monitor.ino` | Production firmware (with sensors) |

---

## ⏭️ Next Steps

### Phase 1: Testing (Current)
- [x] Backend API created
- [x] ESP32 test firmware created
- [ ] Upload test firmware to ESP32
- [ ] Verify data flow
- [ ] Check database storage

### Phase 2: Production Hardware
- [ ] Purchase sensors (ZMPT101B + ACS712)
- [ ] Wire sensors to ESP32
- [ ] Upload production firmware
- [ ] Calibrate sensors
- [ ] Test with real load

### Phase 3: Frontend Integration
- [ ] Update React app to use backend API
- [ ] Display real-time data
- [ ] Show energy charts
- [ ] Add cost calculations

### Phase 4: Deployment
- [ ] Deploy backend to cloud
- [ ] Configure ESP32 for production
- [ ] Set up monitoring
- [ ] Add alerts

---

## 🎯 Success Criteria

✅ **ESP32 connects to WiFi**  
✅ **Sends data every 5 seconds**  
✅ **Backend receives and stores data**  
✅ **Database contains readings**  
✅ **API returns latest data**  
✅ **Success rate > 95%**  

---

## 💡 Pro Tips

1. **Start with test version** - No sensors needed
2. **Check Serial Monitor** - All debug info is there
3. **Use correct IP address** - Not localhost
4. **Keep backend running** - ESP32 needs it
5. **Monitor success rate** - Should be > 95%
6. **Test with curl** - Verify backend independently

---

## 🆘 Need Help?

### Check These First:
1. Serial Monitor output (115200 baud)
2. Backend console logs
3. Network connectivity
4. Firewall settings

### Common Commands:
```bash
# Check backend health
curl http://localhost:5000/api/health

# Get latest reading
curl http://localhost:5000/api/readings/latest

# Get dashboard summary
curl http://localhost:5000/api/dashboard/summary

# Check today's data
curl http://localhost:5000/api/readings/today
```

---

## 🎉 You're Ready!

Your ESP32 firmware is complete and ready to:
- ✅ Connect to WiFi
- ✅ Generate/read sensor data
- ✅ Send to backend API
- ✅ Monitor success/failure
- ✅ Handle reconnections
- ✅ Display debug info

**Upload the test firmware and watch your IoT system come to life!** 🚀
