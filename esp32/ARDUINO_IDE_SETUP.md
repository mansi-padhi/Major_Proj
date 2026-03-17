# 🔧 Complete ESP32 Setup Guide Using Arduino IDE

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Arduino IDE Installation](#arduino-ide-installation)
3. [ESP32 Board Setup](#esp32-board-setup)
4. [Required Libraries](#required-libraries)
5. [Hardware Connections](#hardware-connections)
6. [Code Upload](#code-upload)
7. [Testing & Troubleshooting](#testing--troubleshooting)

---

## 1. Prerequisites

### Hardware Required
- **ESP32 Development Board** (ESP32-WROOM-32 or similar)
- **ZMPT101B Voltage Sensor Module** (AC voltage measurement)
- **ACS712 Current Sensor Module** (5A, 20A, or 30A version)
- **USB Cable** (Micro-USB or USB-C depending on your ESP32 board)
- **Breadboard and Jumper Wires**
- **AC Power Source** (for testing - use with extreme caution!)

### Software Required
- Arduino IDE 1.8.x or 2.x
- USB to Serial drivers (CP210x or CH340 depending on your board)

---

## 2. Arduino IDE Installation

### Windows
1. Download Arduino IDE from: https://www.arduino.cc/en/software
2. Run the installer (.exe file)
3. Follow installation wizard
4. Launch Arduino IDE

### macOS
1. Download Arduino IDE (.dmg file)
2. Drag Arduino to Applications folder
3. Open Arduino from Applications

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install arduino
```

Or download the latest version from the official website.

---

## 3. ESP32 Board Setup

### Step 1: Add ESP32 Board Manager URL
1. Open Arduino IDE
2. Go to **File → Preferences** (or **Arduino IDE → Settings** on macOS)
3. In "Additional Board Manager URLs" field, add:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Click **OK**

### Step 2: Install ESP32 Board Package
1. Go to **Tools → Board → Boards Manager**
2. Search for "esp32"
3. Find "esp32 by Espressif Systems"
4. Click **Install** (this may take a few minutes)
5. Wait for installation to complete

### Step 3: Select Your ESP32 Board
1. Go to **Tools → Board → ESP32 Arduino**
2. Select your board model:
   - **ESP32 Dev Module** (most common)
   - **ESP32-WROOM-DA Module**
   - Or your specific board model

### Step 4: Configure Board Settings
Go to **Tools** menu and configure:
- **Upload Speed**: 115200
- **CPU Frequency**: 240MHz (WiFi/BT)
- **Flash Frequency**: 80MHz
- **Flash Mode**: QIO
- **Flash Size**: 4MB (32Mb)
- **Partition Scheme**: Default 4MB with spiffs
- **Core Debug Level**: None (or "Info" for debugging)
- **Port**: Select your COM port (Windows) or /dev/ttyUSB0 (Linux) or /dev/cu.usbserial (macOS)

---

## 4. Required Libraries

### Install Libraries via Library Manager

1. Go to **Sketch → Include Library → Manage Libraries**
2. Install the following libraries:

#### WiFi Library (Built-in)
- Already included with ESP32 board package
- No installation needed

#### HTTPClient Library (Built-in)
- Already included with ESP32 board package
- No installation needed

#### ArduinoJson Library
1. Search for "ArduinoJson"
2. Install **ArduinoJson by Benoit Blanchon**
3. Version 6.x or later recommended

### Verify Libraries
After installation, go to **Sketch → Include Library** and verify you see:
- WiFi
- HTTPClient
- ArduinoJson

---

## 5. Hardware Connections

### ⚠️ SAFETY WARNING
**DANGER: Working with AC voltage can be LETHAL!**
- Never touch exposed wires when connected to AC power
- Use proper insulation and enclosures
- Test with low voltage DC first
- If unsure, consult a qualified electrician

### Pin Connections

#### ZMPT101B Voltage Sensor
```
ZMPT101B → ESP32
VCC      → 3.3V or 5V (check your module)
GND      → GND
OUT      → GPIO 34 (ADC1_CH6)
```

#### ACS712 Current Sensor
```
ACS712   → ESP32
VCC      → 5V (most modules require 5V)
GND      → GND
OUT      → GPIO 35 (ADC1_CH7)
```

### Connection Diagram
```
                    ESP32
                 ┌─────────┐
                 │         │
    ZMPT101B ────┤ GPIO 34 │ (Voltage Sensor)
                 │         │
    ACS712   ────┤ GPIO 35 │ (Current Sensor)
                 │         │
    5V       ────┤ VIN/5V  │
                 │         │
    GND      ────┤ GND     │
                 │         │
    USB      ────┤ USB     │ (for programming & power)
                 └─────────┘
```

### Important Notes
- ESP32 ADC pins accept 0-3.3V maximum
- Ensure sensor output doesn't exceed 3.3V
- Use voltage divider if sensor outputs higher voltage
- Connect all grounds together (common ground)

---

## 6. Code Upload

### Step 1: Open the Project
1. Navigate to `esp32/energy_monitor/` folder
2. Open `energy_monitor.ino` in Arduino IDE

### Step 2: Configure WiFi and Server
Edit these lines in the code:
```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverUrl = "http://YOUR_SERVER_IP:5000/api/readings";
```

Replace:
- `YOUR_WIFI_SSID` with your WiFi network name
- `YOUR_WIFI_PASSWORD` with your WiFi password
- `YOUR_SERVER_IP` with your backend server IP address (e.g., "192.168.1.100")

### Step 3: Verify/Compile
1. Click the **Verify** button (✓) or press **Ctrl+R**
2. Wait for compilation to complete
3. Check for any errors in the output window

### Step 4: Upload to ESP32
1. Connect ESP32 to computer via USB cable
2. Select correct **Port** in **Tools → Port**
3. Click **Upload** button (→) or press **Ctrl+U**
4. Wait for upload to complete

### Step 5: Monitor Serial Output
1. Open **Tools → Serial Monitor** or press **Ctrl+Shift+M**
2. Set baud rate to **115200**
3. You should see:
   ```
   Connecting to WiFi...
   WiFi connected
   IP address: 192.168.x.x
   Voltage: 230.5V, Current: 2.3A
   Data sent successfully
   ```

---

## 7. Testing & Troubleshooting

### Initial Testing (Safe Mode)

#### Test 1: WiFi Connection
1. Upload code and open Serial Monitor
2. Check if ESP32 connects to WiFi
3. Note the IP address assigned

#### Test 2: Sensor Readings (No AC Power)
1. With sensors disconnected from AC
2. Check if voltage and current readings appear
3. Values should be near zero or baseline

#### Test 3: Server Communication
1. Ensure backend server is running
2. Check Serial Monitor for "Data sent successfully"
3. Verify data appears in MongoDB

### Common Issues & Solutions

#### Issue 1: ESP32 Not Detected
**Symptoms**: No COM port appears
**Solutions**:
- Install CP210x or CH340 USB drivers
- Try different USB cable (must be data cable, not charge-only)
- Press and hold BOOT button while uploading
- Try different USB port

#### Issue 2: Upload Failed
**Symptoms**: "Failed to connect to ESP32"
**Solutions**:
- Hold BOOT button during upload
- Check correct board selected in Tools → Board
- Reduce upload speed to 115200
- Press EN (reset) button before upload

#### Issue 3: WiFi Connection Failed
**Symptoms**: "Connecting to WiFi..." loops forever
**Solutions**:
- Verify SSID and password are correct
- Check WiFi is 2.4GHz (ESP32 doesn't support 5GHz)
- Move ESP32 closer to router
- Check router allows new device connections

#### Issue 4: Sensor Readings are Zero
**Symptoms**: Voltage and Current always 0
**Solutions**:
- Check sensor connections (VCC, GND, OUT)
- Verify correct GPIO pins (34 for voltage, 35 for current)
- Test sensors with multimeter
- Check sensor power supply (3.3V or 5V)

#### Issue 5: Inaccurate Readings
**Symptoms**: Readings don't match actual values
**Solutions**:
- Calibrate voltage sensor (adjust VOLTAGE_CALIBRATION)
- Calibrate current sensor (adjust CURRENT_CALIBRATION)
- Check sensor orientation (current sensor direction matters)
- Verify AC voltage is stable

#### Issue 6: Server Connection Failed
**Symptoms**: "Failed to send data"
**Solutions**:
- Verify backend server is running (port 5000)
- Check server IP address is correct
- Ensure ESP32 and server are on same network
- Check firewall settings on server
- Test server URL in browser: `http://SERVER_IP:5000/api/readings`

### Calibration

#### Voltage Calibration
1. Measure actual AC voltage with multimeter
2. Compare with ESP32 reading
3. Adjust `VOLTAGE_CALIBRATION` factor:
   ```cpp
   const float VOLTAGE_CALIBRATION = 106.8; // Adjust this value
   ```
4. Formula: `New_Value = Old_Value × (Actual_Voltage / ESP32_Reading)`

#### Current Calibration
1. Measure actual current with clamp meter
2. Compare with ESP32 reading
3. Adjust `CURRENT_CALIBRATION` factor:
   ```cpp
   const float CURRENT_CALIBRATION = 0.185; // Adjust this value
   ```
4. Formula: `New_Value = Old_Value × (Actual_Current / ESP32_Reading)`

### Debug Mode
Enable detailed logging by changing:
```cpp
// In Arduino IDE: Tools → Core Debug Level → Info or Debug
```

This will show detailed WiFi and HTTP information in Serial Monitor.

---

## 📝 Quick Reference

### Essential Commands
- **Verify**: Ctrl+R (Cmd+R on macOS)
- **Upload**: Ctrl+U (Cmd+U on macOS)
- **Serial Monitor**: Ctrl+Shift+M (Cmd+Shift+M on macOS)

### Pin Summary
- **GPIO 34**: Voltage sensor (ZMPT101B)
- **GPIO 35**: Current sensor (ACS712)
- **3.3V/5V**: Sensor power
- **GND**: Common ground

### Default Settings
- **Baud Rate**: 115200
- **Sampling Interval**: 5 seconds
- **WiFi Mode**: Station (STA)
- **Server Port**: 5000

---

## 🔗 Additional Resources

- [ESP32 Official Documentation](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/)
- [Arduino ESP32 GitHub](https://github.com/espressif/arduino-esp32)
- [ZMPT101B Datasheet](https://www.google.com/search?q=ZMPT101B+datasheet)
- [ACS712 Datasheet](https://www.allegromicro.com/en/products/sense/current-sensor-ics/zero-to-fifty-amp-integrated-conductor-sensor-ics/acs712)

---

## ⚠️ Final Safety Reminder

**ALWAYS:**
- Disconnect AC power before making connections
- Use proper insulation and enclosures
- Never work on live circuits
- Test with low voltage first
- Have a qualified electrician review your setup

**NEVER:**
- Touch exposed wires when AC is connected
- Work alone when testing with AC power
- Skip safety precautions
- Use damaged sensors or wires

---

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Serial Monitor output for error messages
3. Verify all connections and settings
4. Test each component individually

**Project Files:**
- Main code: `esp32/energy_monitor/energy_monitor.ino`
- Test code: `esp32/energy_monitor_test/energy_monitor_test.ino`
- Quick start: `esp32/QUICK_START.md`
- Full documentation: `esp32/README.md`

---

**Last Updated**: December 2025
**Version**: 1.0
