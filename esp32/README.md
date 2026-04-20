# ESP32 Energy Monitor - Setup Guide

## 📁 Firmware Versions

### 1. `energy_monitor.ino` - Production Version
- **Use when:** You have actual voltage and current sensors
- **Sensors required:** ZMPT101B (voltage) + ACS712 (current)
- **Reads:** Real AC voltage and current from sensors

### 2. `energy_monitor_test.ino` - Test Version
- **Use when:** Testing without sensors
- **Sensors required:** None (ESP32 only)
- **Generates:** Simulated voltage and current data

---

## 🛠️ Hardware Requirements

### For Testing (Minimal):
- ESP32 Development Board
- USB cable
- WiFi network

### For Production (Full System):
- ESP32 Development Board
- ZMPT101B AC Voltage Sensor Module
- ACS712 Current Sensor Module (30A version recommended)
- Jumper wires
- Breadboard (optional)
- USB cable for programming

---

## 🔌 Hardware Connections (Production)

```
ESP32          ZMPT101B        ACS712
─────────────────────────────────────
3.3V    ───────> VCC
3.3V    ─────────────────────> VCC
GND     ───────> GND
GND     ─────────────────────> GND
GPIO 34 ───────> OUT
GPIO 35 ─────────────────────> OUT
```

### Pin Details:
- **GPIO 34** - ZMPT101B voltage sensor output (ADC1_CH6)
- **GPIO 35** - ACS712 current sensor output (ADC1_CH7)
- **3.3V** - Power for both sensors
- **GND** - Common ground

### Important Notes:
- ⚠️ **DANGER:** ZMPT101B connects to AC mains voltage. Use extreme caution!
- ⚠️ Only qualified electricians should connect to mains power
- Use proper isolation and safety measures
- Test with low voltage first

---

## 💻 Software Setup

### Step 1: Install Arduino IDE
1. Download from: https://www.arduino.cc/en/software
2. Install for your operating system

### Step 2: Install ESP32 Board Support
1. Open Arduino IDE
2. Go to **File → Preferences**
3. Add to "Additional Board Manager URLs":
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Go to **Tools → Board → Boards Manager**
5. Search for "esp32"
6. Install "esp32 by Espressif Systems"

### Step 3: Install Required Libraries
Go to **Sketch → Include Library → Manage Libraries** and install:

1. **ArduinoJson** by Benoit Blanchon
   - Version: 6.x or later
   - Used for JSON serialization

2. **WiFi** (Built-in with ESP32)
   - No installation needed

3. **HTTPClient** (Built-in with ESP32)
   - No installation needed

---

## ⚙️ Configuration

### 1. Open the Firmware
- For testing: Open `energy_monitor_test/energy_monitor_test.ino`
- For production: Open `energy_monitor/energy_monitor.ino`

### 2. Configure WiFi
```cpp
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
```

### 3. Configure Server URL
Find your computer's IP address:

**Windows:**
```cmd
ipconfig
```
Look for "IPv4 Address"

**Mac/Linux:**
```bash
ifconfig
```
Look for "inet" address

Then update:
```cpp
const char* SERVER_URL = "http://192.168.1.100:5000/api/readings";
```
Replace `192.168.1.100` with your actual IP address.

### 4. Configure Device ID (Optional)
```cpp
const char* DEVICE_ID = "ESP32_001";
```

---

## 📤 Upload to ESP32

### Step 1: Connect ESP32
- Connect ESP32 to computer via USB cable
- Wait for drivers to install (Windows)

### Step 2: Select Board
1. Go to **Tools → Board → ESP32 Arduino**
2. Select your ESP32 board (usually "ESP32 Dev Module")

### Step 3: Select Port
1. Go to **Tools → Port**
2. Select the COM port (Windows) or /dev/tty.* (Mac/Linux)

### Step 4: Upload
1. Click the **Upload** button (→)
2. Wait for compilation and upload
3. You should see "Done uploading"

### Step 5: Open Serial Monitor
1. Go to **Tools → Serial Monitor**
2. Set baud rate to **115200**
3. You should see output from ESP32

---

## 🧪 Testing

### Test Version (No Sensors):

1. Upload `energy_monitor_test.ino`
2. Open Serial Monitor (115200 baud)
3. You should see:
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
   Sending: {"deviceId":"ESP32_TEST","voltage":218,"current":2.45}
   Server Response:
     Power: 533.10 W
     Energy: 0.000741 kWh
   ✓ Data sent successfully
   Success: 1 | Failed: 0
   ─────────────────────────────────
   ```

### Production Version (With Sensors):

1. **SAFETY FIRST:** Ensure proper isolation from mains voltage
2. Connect sensors as per wiring diagram
3. Upload `energy_monitor.ino`
4. Open Serial Monitor
5. Verify readings are reasonable

---

## 🔧 Calibration (Production Only)

### Voltage Calibration:
1. Measure actual AC voltage with a multimeter
2. Compare with ESP32 reading
3. Adjust `VOLTAGE_CALIBRATION` constant:
   ```cpp
   const float VOLTAGE_CALIBRATION = 220.0;  // Adjust this value
   ```

### Current Calibration:
1. Measure actual current with a clamp meter
2. Compare with ESP32 reading
3. Adjust `CURRENT_SENSITIVITY` constant:
   ```cpp
   const float CURRENT_SENSITIVITY = 0.066;  // For ACS712-30A
   ```

**ACS712 Sensitivity Values:**
- 5A version: 0.185 V/A
- 20A version: 0.100 V/A
- 30A version: 0.066 V/A

---

## 📊 Verify Backend Integration

### Check Backend Logs:
Your backend server should show:
```
POST /api/readings 201 - 45ms
```

### Check Database:
```bash
# In another terminal
curl http://localhost:5000/api/readings/latest
```

Expected response:
```json
{
  "success": true,
  "data": {
    "deviceId": "ESP32_TEST",
    "voltage": 218,
    "current": 2.45,
    "power": 533.1,
    "energy": 0.000741,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## 🐛 Troubleshooting

### WiFi Connection Failed
**Problem:** ESP32 can't connect to WiFi

**Solutions:**
- Check SSID and password are correct
- Ensure WiFi is 2.4GHz (ESP32 doesn't support 5GHz)
- Move ESP32 closer to router
- Check if WiFi has MAC address filtering

### HTTP Connection Error
**Problem:** Can't reach backend server

**Solutions:**
- Verify server is running: `curl http://localhost:5000/api/health`
- Check firewall isn't blocking port 5000
- Ensure ESP32 and server are on same network
- Use correct IP address (not localhost)
- Try pinging server from another device

### Sensor Readings are Zero
**Problem:** Voltage or current always reads 0

**Solutions:**
- Check sensor connections
- Verify sensors have power (3.3V)
- Check ADC pins are correct (GPIO 34, 35)
- Ensure sensors are properly connected to load
- Try swapping sensors to test if faulty

### Readings are Unstable
**Problem:** Values fluctuate wildly

**Solutions:**
- Increase `SAMPLES` constant (default 1000)
- Add capacitor (100nF) across sensor output
- Check for loose connections
- Ensure proper grounding
- Move away from electromagnetic interference

### Server Returns Error 400
**Problem:** Backend rejects data

**Solutions:**
- Check JSON format in Serial Monitor
- Verify voltage and current are numbers
- Ensure Content-Type header is set
- Check backend logs for error details

---

## 📈 Expected Behavior

### Normal Operation:
- Reading sent every 5 seconds
- Success rate > 95%
- Voltage: 200-240V (depending on region)
- Current: 0-30A (depending on load)
- Power: Voltage × Current

### Data Flow:
```
ESP32 Sensors → ESP32 Processing → WiFi → Backend API → MongoDB
     ↓              ↓                 ↓         ↓           ↓
  V & I         Calculate         HTTP      Store      Database
               Power & RMS        POST      Data
```

---

## 🔐 Security Considerations

### For Production:
1. **Change default credentials**
2. **Use HTTPS** instead of HTTP (requires SSL certificate)
3. **Add authentication** to API endpoints
4. **Isolate IoT network** from main network
5. **Regular firmware updates**
6. **Monitor for unusual activity**

### HTTPS Example (Advanced):
```cpp
#include <WiFiClientSecure.h>

WiFiClientSecure client;
client.setInsecure();  // For testing only
// For production, use proper certificate validation
```

---

## 📝 Next Steps

1. ✅ Test with simulated data
2. ✅ Verify backend receives data
3. ✅ Check database storage
4. ⏳ Connect actual sensors (if available)
5. ⏳ Calibrate sensors
6. ⏳ Deploy in production environment
7. ⏳ Monitor and optimize

---

## 🆘 Support

### Common Issues:
- See troubleshooting section above
- Check Serial Monitor for error messages
- Verify backend is running and accessible

### Resources:
- ESP32 Documentation: https://docs.espressif.com/
- Arduino Reference: https://www.arduino.cc/reference/
- ArduinoJson: https://arduinojson.org/

---

## 📊 Performance Metrics

### Expected Performance:
- **Reading Interval:** 5 seconds
- **Samples per Reading:** 1000
- **Accuracy:** ±2% (with calibration)
- **WiFi Range:** 50-100m (depending on obstacles)
- **Power Consumption:** ~160mA (WiFi active)
- **Uptime:** 24/7 continuous operation

---

## ✅ Checklist

Before deploying:
- [ ] WiFi credentials configured
- [ ] Server URL updated with correct IP
- [ ] Device ID set
- [ ] Libraries installed
- [ ] Code compiles without errors
- [ ] Serial Monitor shows successful connection
- [ ] Backend receives data
- [ ] Database stores readings
- [ ] Sensors calibrated (production only)
- [ ] Safety measures in place (production only)

---

**Your ESP32 is now ready to send energy data to your backend!** 🚀
