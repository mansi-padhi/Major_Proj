# ✅ Simplified Database Schema

## Changes Made

The database schema has been simplified to match what the ESP32 will actually send:

### Before (Complex):
```javascript
{
  deviceId, voltage, current, power, energy, powerFactor, 
  frequency, location, appliance, timestamp
}
```

### After (Simplified):
```javascript
{
  deviceId,    // String - ESP32 device identifier
  voltage,     // Number - Voltage reading (V)
  current,     // Number - Current reading (A)
  power,       // Number - Power (W) - calculated as V × I
  timestamp    // Date - When reading was taken
}
```

---

## ESP32 Integration

### What ESP32 Needs to Send:

**Minimum Required:**
```json
{
  "voltage": 220.5,
  "current": 2.3
}
```

**Recommended (with deviceId):**
```json
{
  "deviceId": "ESP32_001",
  "voltage": 220.5,
  "current": 2.3
}
```

**Backend automatically calculates:**
- `power = voltage × current`
- `timestamp = current time`

---

## API Endpoint for ESP32

```
POST http://your-server-ip:5000/api/readings
Content-Type: application/json

{
  "deviceId": "ESP32_001",
  "voltage": 220.5,
  "current": 2.3
}
```

**Response:**
```json
{
  "success": true,
  "message": "Reading saved successfully",
  "data": {
    "deviceId": "ESP32_001",
    "voltage": 220.5,
    "current": 2.3,
    "power": 507.15,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## Energy Calculation

Since we don't store energy directly, it's calculated on-the-fly:

**Formula:**
```
Energy (kWh) = (Average Power × Number of Readings × Interval) / (3600 × 1000)
```

**Assumptions:**
- Readings taken every 5 seconds (configurable in `utils/energyCalculator.js`)
- Energy calculated from power readings over time

**Example:**
- Average Power: 500W
- Readings: 720 (1 hour at 5-second intervals)
- Interval: 5 seconds

```
Energy = (500 × 720 × 5) / (3600 × 1000)
       = 1,800,000 / 3,600,000
       = 0.5 kWh
```

---

## Database Indexes

For optimal query performance:

```javascript
// Index on timestamp (descending) and deviceId
{ timestamp: -1, deviceId: 1 }

// Index on deviceId and timestamp (descending)
{ deviceId: 1, timestamp: -1 }
```

---

## MongoDB Schema Definition

```javascript
const readingSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    default: 'ESP32_001'
  },
  voltage: {
    type: Number,
    required: true,
    min: 0
  },
  current: {
    type: Number,
    required: true,
    min: 0
  },
  power: {
    type: Number,
    required: true,
    min: 0
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true  // Adds createdAt and updatedAt
});

// Auto-calculate power before saving
readingSchema.pre('save', function(next) {
  if (!this.power || this.power === 0) {
    this.power = this.voltage * this.current;
  }
  next();
});
```

---

## Example ESP32 Arduino Code

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverUrl = "http://192.168.1.100:5000/api/readings";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected!");
}

void loop() {
  // Read sensors
  float voltage = readVoltageSensor();  // Your sensor code
  float current = readCurrentSensor();  // Your sensor code
  
  // Send to backend
  sendReading(voltage, current);
  
  delay(5000);  // Send every 5 seconds
}

void sendReading(float voltage, float current) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");
    
    // Create JSON
    StaticJsonDocument<200> doc;
    doc["deviceId"] = "ESP32_001";
    doc["voltage"] = voltage;
    doc["current"] = current;
    
    String jsonString;
    serializeJson(doc, jsonString);
    
    // Send POST request
    int httpCode = http.POST(jsonString);
    
    if (httpCode > 0) {
      String response = http.getString();
      Serial.println("Response: " + response);
    } else {
      Serial.println("Error: " + String(httpCode));
    }
    
    http.end();
  }
}
```

---

## Testing the Simplified Schema

### 1. Test with cURL:
```bash
curl -X POST http://localhost:5000/api/readings \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"ESP32_001","voltage":220,"current":2.5}'
```

### 2. Expected Response:
```json
{
  "success": true,
  "message": "Reading saved successfully",
  "data": {
    "deviceId": "ESP32_001",
    "voltage": 220,
    "current": 2.5,
    "power": 550,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### 3. Verify in Database:
```bash
# If you have MongoDB Compass or mongo shell
db.readings.find().sort({timestamp: -1}).limit(1)
```

---

## Benefits of Simplified Schema

✅ **Simpler ESP32 Code** - Only send voltage and current  
✅ **Less Data Transfer** - Smaller JSON payloads  
✅ **Automatic Calculations** - Backend handles power calculation  
✅ **Flexible** - Easy to add fields later if needed  
✅ **Efficient Storage** - Only store raw sensor data  
✅ **Accurate** - Energy calculated from actual readings  

---

## Future Enhancements (Optional)

You can add these fields later if needed:

```javascript
{
  location: String,        // "Living Room", "Kitchen"
  appliance: String,       // "AC", "Refrigerator"
  powerFactor: Number,     // For more accurate calculations
  frequency: Number,       // AC frequency (50/60 Hz)
  temperature: Number,     // If you add temp sensor
  humidity: Number         // If you add humidity sensor
}
```

Just update the schema and ESP32 code when ready!

---

## Summary

✅ Schema simplified to: `deviceId`, `voltage`, `current`, `power`, `timestamp`  
✅ ESP32 only needs to send: `voltage` and `current`  
✅ Backend auto-calculates: `power` and `timestamp`  
✅ Energy calculated on-demand from power readings  
✅ All routes updated to work with new schema  
✅ Ready for ESP32 integration!
