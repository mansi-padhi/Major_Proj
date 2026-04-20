# ESP32 Upload Instructions

## Step 1: Install Arduino IDE

1. Download from: https://www.arduino.cc/en/software
2. Install and open Arduino IDE

## Step 2: Install ESP32 Board Support

1. Go to **File → Preferences**
2. In "Additional Board Manager URLs", add:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. Go to **Tools → Board → Boards Manager**
4. Search for "esp32" and install **"ESP32 by Espressif Systems"**

## Step 3: Install Required Libraries

Go to **Sketch → Include Library → Manage Libraries** and install:

1. **ArduinoJson** by Benoit Blanchon (version 6.x)
2. **WiFi** (built-in with ESP32)
3. **HTTPClient** (built-in with ESP32)

## Step 4: Configure the Code

Open `energy_monitor_dual_sensor.ino` and update these lines:

```cpp
// Line 20-21: Your WiFi credentials
const char* WIFI_SSID = "YourWiFiName";
const char* WIFI_PASSWORD = "YourWiFiPassword";

// Line 24: Your laptop's IP address
const char* SERVER_URL = "http://192.168.1.100:5000/api/readings";
```

### How to Find Your Laptop's IP:

**Windows:**

```bash
ipconfig
```

Look for "IPv4 Address" under your WiFi adapter (e.g., 192.168.1.100)

**Mac/Linux:**

```bash
ifconfig
```

Look for "inet" under your WiFi interface

## Step 5: Connect ESP32

1. Connect ESP32 to your computer via USB
2. In Arduino IDE:
   - **Tools → Board** → Select **"ESP32 Dev Module"**
   - **Tools → Port** → Select the COM port (e.g., COM3, COM4)
   - **Tools → Upload Speed** → Select **"115200"**

## Step 6: Upload Code

1. Click the **Upload** button (→) in Arduino IDE
2. Wait for "Done uploading" message
3. Open **Serial Monitor** (Tools → Serial Monitor)
4. Set baud rate to **115200**

## Step 7: Verify Operation

You should see in Serial Monitor:

```
========================================
  IoT Energy Monitor - Dual Sensor
========================================

Connecting to WiFi: YourWiFiName
.....
✓ WiFi Connected!
IP Address: 192.168.1.50
Signal Strength: -45 dBm

✓ System Ready!
Starting measurements...

========================================
Reading #1
========================================
Voltage:      230.00 V
Current L1:   2.450 A
Current L2:   1.230 A
Power L1:     563.50 W
Power L2:     282.90 W
Total Power:  846.40 W
----------------------------------------
Sending to server: {"deviceId":"esp32-1","sensor1":2.450,"sensor2":1.230,"voltage":230.0}
✓ Server Response: HTTP 201
✓ Data saved successfully!
========================================
```

## Troubleshooting

### WiFi Not Connecting

- Check SSID and password are correct
- Make sure ESP32 is within WiFi range
- Try 2.4GHz WiFi (ESP32 doesn't support 5GHz)

### HTTP Error / Cannot Connect to Server

- Verify your laptop's IP address is correct
- Make sure backend server is running (`node server.js`)
- Check firewall isn't blocking port 5000
- Ensure ESP32 and laptop are on the same WiFi network

### Current Reading Always 0

- Check ACS712 sensor connections
- Verify sensor is powered (VCC to 3.3V or 5V)
- Make sure load is actually drawing current
- Try adjusting `CURRENT_OFFSET` calibration value

### Voltage Reading Incorrect

- Adjust `VOLTAGE_MULTIPLIER` constant (line 38)
- If no voltage sensor, code defaults to 230V
- Calibrate by comparing with a multimeter

## Hardware Connections

```
ESP32 Pin 34 (ADC1_CH6) ← ACS712 #1 OUT (Load 1)
ESP32 Pin 35 (ADC1_CH7) ← ACS712 #2 OUT (Load 2)
ESP32 Pin 32 (ADC1_CH4) ← ZMPT101B OUT (Voltage - optional)

ESP32 3.3V → All sensor VCC
ESP32 GND  → All sensor GND
```

## Next Steps

Once ESP32 is sending data:

1. Open browser: `http://localhost:3000`
2. Click "Dashboard" to see live data
3. Data updates every 30 seconds
4. Check "Cost", "Appliances", and "Usage-by-device" sections

Your real sensor data is now flowing to MongoDB Atlas and displaying in the dashboard!
