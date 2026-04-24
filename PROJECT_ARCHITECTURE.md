# Energy Monitoring System - Project Architecture

## 📊 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ENERGY MONITORING SYSTEM                      │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│   ESP32 Device   │         │   Node.js API    │         │   React Frontend │
│   (Hardware)     │────────▶│   (Backend)      │────────▶│   (Dashboard)    │
└──────────────────┘         └──────────────────┘         └──────────────────┘
        │                             │                             │
        │                             │                             │
   ┌────▼────┐                  ┌────▼────┐                  ┌────▼────┐
   │ ACS712  │                  │ MongoDB │                  │ Charts  │
   │ Sensors │                  │  Atlas  │                  │ & Stats │
   └─────────┘                  └─────────┘                  └─────────┘
   GPIO 34/35                   Cloud DB                     FusionCharts
```

## 🔄 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            DATA FLOW                                     │
└─────────────────────────────────────────────────────────────────────────┘

1. HARDWARE LAYER
   ┌──────────────────────────────────────────────────────────────┐
   │  ESP32 + ACS712 Sensors (GPIO 34 & 35)                       │
   │  ├─ Read voltage & current every 5 seconds                   │
   │  ├─ Calculate power (P = V × I)                              │
   │  └─ Send JSON via HTTP POST                                  │
   └──────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
2. API LAYER
   ┌──────────────────────────────────────────────────────────────┐
   │  POST /api/readings                                           │
   │  ├─ Validate sensor data                                     │
   │  ├─ Calculate energy (E = P × time)                          │
   │  ├─ Calculate cost (Cost = E × ₹7/kWh)                       │
   │  └─ Store in MongoDB                                         │
   └──────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
3. DATABASE LAYER
   ┌──────────────────────────────────────────────────────────────┐
   │  MongoDB Atlas (Cloud)                                        │
   │  ├─ readings collection (sensor data)                        │
   │  ├─ Indexed by timestamp & deviceId                          │
   │  └─ Aggregation pipelines for analytics                      │
   └──────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
4. FRONTEND LAYER
   ┌──────────────────────────────────────────────────────────────┐
   │  React + Redux Dashboard                                      │
   │  ├─ Fetch data via API calls                                 │
   │  ├─ Transform data for charts                                │
   │  ├─ Display: Cost, Appliances, Usage, Dashboard              │
   │  └─ Scrolling background with monthly data                   │
   └──────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
Major_Proj/
├── backend/                      # Node.js Backend
│   ├── models/                   # MongoDB Models
│   │   ├── Reading.js           # Sensor readings schema
│   │   ├── Alert.js             # Alert notifications
│   │   ├── Threshold.js         # Safety thresholds
│   │   └── ...
│   ├── routes/                   # API Routes
│   │   ├── readings.js          # GET/POST readings
│   │   ├── cost.js              # Cost calculations
│   │   ├── appliances.js        # Device analytics
│   │   └── dashboard.js         # Dashboard summary
│   ├── services/                 # Business Logic
│   │   ├── aiService.js         # AI analysis
│   │   └── telegramService.js   # Notifications
│   ├── utils/                    # Utilities
│   │   ├── seedDummyData.js     # Seed MongoDB
│   │   └── updateTimestamps.js  # Update data dates
│   ├── server.js                 # Express server
│   └── .env                      # Environment config
│
├── src/                          # React Frontend
│   ├── components/               # React Components
│   │   ├── cost_component_improved.js
│   │   ├── appliances_component_improved.js
│   │   ├── usage_component_improved.js
│   │   └── MonthlyScrollingBackground.js
│   ├── containers/               # Container Components
│   │   └── chart.js             # Main chart container
│   ├── actions/                  # Redux Actions
│   │   └── index.js             # API action creators
│   ├── reducer/                  # Redux Reducers
│   │   └── reducer-energy.js    # Energy state reducer
│   └── services/                 # API Services
│       └── api.js               # Backend API calls
│
├── esp32/                        # ESP32 Firmware
│   └── energy_monitor_dual_sensor/
│       └── energy_monitor_dual_sensor.ino
│
└── Documentation/
    ├── QUICK_START.md
    ├── BACKEND_SUMMARY.md
    └── PROJECT_ARCHITECTURE.md (this file)
```

## 🔌 API Endpoints

### Readings API

```javascript
// POST - Add new reading
POST /api/readings
Body: {
  "deviceId": "esp32-1",
  "sensor1": 2.5,    // Current in Amps (GPIO 34)
  "sensor2": 1.2,    // Current in Amps (GPIO 35)
  "voltage": 230     // Voltage in Volts
}

// GET - Latest reading
GET /api/readings/latest

// GET - Month readings
GET /api/readings/month?month=4&year=2026
```

### Cost API

```javascript
// GET - Cost for period
GET /api/cost?period=month
GET /api/cost?month=4&year=2026

Response: {
  "success": true,
  "totalEnergy": 26.303,
  "totalCost": 184.12,
  "avgPower": 1102.13,
  "maxPower": 2293.87,
  "rate": 7
}
```

### Appliances API

```javascript
// GET - Appliances breakdown
GET /api/appliances?period=month

Response: {
  "success": true,
  "data": [
    {
      "appliance": "Refrigeration",
      "totalEnergy": 5.409,
      "avgPower": 1111.21,
      "percentage": 20.56
    }
  ]
}
```

## 💾 MongoDB Schema

### Reading Schema

```javascript
{
  deviceId: String,        // "esp32-1"
  voltage: Number,         // 230V
  current: Number,         // 2.5A
  power: Number,           // 575W (calculated)
  energy: Number,          // 0.0958 kWh (calculated)
  cost: Number,            // 0.67 ₹ (calculated)
  loadId: String,          // "Load1" or "Load2"
  loadName: String,        // "Load 1 (GPIO 34)"
  appliance: String,       // "Refrigeration"
  location: String,        // "Home"
  timestamp: Date,         // 2026-04-21T10:30:00Z
  createdAt: Date,
  updatedAt: Date
}
```

## 🎨 Frontend Components

### 1. Cost Component

```javascript
// src/components/cost_component_improved.js

Features:
- Line chart showing cost over time
- Summary cards (Previous, Current, Predicted, Savings)
- Cost breakdown (Energy, Rate, Daily Average)
- Energy saving tips

Data Flow:
componentDidMount()
  → dispatch(fetchCost('month'))
  → API: GET /api/cost?period=month
  → Redux Store
  → Render charts & stats
```

### 2. Appliances Component

```javascript
// src/components/appliances_component_improved.js

Features:
- Doughnut chart showing device distribution
- Top stats cards (Total Devices, Energy, Cost, Top Consumer)
- Device list with icons (🧊🌡️💡🔌⚡📱)
- Efficiency tips

Data Flow:
componentDidMount()
  → dispatch(fetchAppliances('month'))
  → API: GET /api/appliances?period=month
  → Redux Store
  → Render charts & device list
```

### 3. Usage Component

```javascript
// src/components/usage_component_improved.js

Features:
- Column chart comparing last 3 months
- Monthly breakdown cards
- Summary stats (Total, Average, Highest, Lowest)

Data Flow:
componentDidMount()
  → fetchLast3Months()
  → API: GET /api/cost?month=2&year=2026 (Feb)
  → API: GET /api/cost?month=3&year=2026 (Mar)
  → API: GET /api/cost?month=4&year=2026 (Apr)
  → State update
  → Render chart
```

### 4. Scrolling Background

```javascript
// src/components/MonthlyScrollingBackground.js

Features:
- Animated scrolling background
- Shows last 6 or 12 months
- Toggle button to switch views
- Semi-transparent cards with energy & cost

Data Flow:
componentDidMount()
  → fetchMonthlyData()
  → Loop: GET /api/cost?month=X&year=Y (12 times)
  → State update
  → Render scrolling animation

Toggle:
onClick()
  → setState({ monthsToShow: 6 or 12 })
  → fetchMonthlyData()
  → Re-render with new data
```

## 🔧 ESP32 Code Snippet

```cpp
// esp32/energy_monitor_dual_sensor/energy_monitor_dual_sensor.ino

// Configuration
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverUrl = "http://192.168.1.X:5000/api/readings";

// Sensor pins
const int SENSOR1_PIN = 34;  // GPIO 34 (Load 1)
const int SENSOR2_PIN = 35;  // GPIO 35 (Load 2)

// Main loop
void loop() {
  // Read sensors
  float sensor1Current = readCurrent(SENSOR1_PIN);
  float sensor2Current = readCurrent(SENSOR2_PIN);
  float voltage = 230.0;

  // Create JSON payload
  String jsonPayload = "{";
  jsonPayload += "\"deviceId\":\"esp32-1\",";
  jsonPayload += "\"sensor1\":" + String(sensor1Current, 2) + ",";
  jsonPayload += "\"sensor2\":" + String(sensor2Current, 2) + ",";
  jsonPayload += "\"voltage\":" + String(voltage, 2);
  jsonPayload += "}";

  // Send to backend
  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  int httpCode = http.POST(jsonPayload);
  http.end();

  delay(5000); // Send every 5 seconds
}
```

## 🚀 Deployment

### Backend (Port 5000)

```bash
cd backend
npm install
node server.js
```

### Frontend (Port 3000)

```bash
npm install
npm start
```

### MongoDB Connection

```bash
# Local MongoDB
MONGODB_URI=mongodb://localhost:27017/energy-monitoring

# MongoDB Atlas (Cloud)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/energy-monitoring
```

## 📊 Key Features

1. **Real-time Monitoring**: ESP32 sends data every 5 seconds
2. **Dual Sensor Support**: Monitor 2 separate loads (GPIO 34 & 35)
3. **Cost Calculation**: Automatic cost calculation at ₹7/kWh
4. **Historical Data**: View data by Today/Month/Year
5. **Device Analytics**: Breakdown by appliance type
6. **Scrolling Background**: Animated monthly data display
7. **Responsive UI**: Works on desktop and mobile
8. **MongoDB Integration**: Cloud database storage

## 🔐 Environment Variables

```bash
# backend/.env
MONGODB_URI=mongodb://localhost:27017/energy-monitoring
PORT=5000
ELECTRICITY_RATE=7.0
TELEGRAM_BOT_TOKEN=
ANTHROPIC_API_KEY=
```

## 📈 Performance

- **Data Points**: 288 readings (24 hours × 2 sensors × 6 days)
- **API Response Time**: < 100ms
- **Chart Rendering**: < 500ms
- **Database Queries**: Indexed for fast aggregation
- **Frontend Bundle**: 584 KB (gzipped)

## 🎯 Future Enhancements

- [ ] Real-time WebSocket updates
- [ ] Mobile app (React Native)
- [ ] AI-powered anomaly detection
- [ ] Telegram bot notifications
- [ ] Export data to CSV/PDF
- [ ] Multi-device support
- [ ] User authentication

---

**Last Updated**: April 21, 2026  
**Version**: 1.0.0  
**License**: MIT
