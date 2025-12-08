# 📊 IoT Energy Monitoring System - Project Summary

## One-Line Description
Real-time IoT-based electricity monitoring system using ESP32 and dual ACS712 sensors with web dashboard for consumption analysis and cost tracking.

## Project Overview
A complete 3-tier IoT system that monitors electrical current in real-time, calculates power and energy consumption, stores data in the cloud, and visualizes it through an interactive web dashboard.

## Tech Stack at a Glance

| Layer | Technologies |
|-------|-------------|
| **IoT** | ESP32, ACS712 (×2), Arduino IDE, C++ |
| **Backend** | Node.js, Express.js, MongoDB, Mongoose |
| **Frontend** | React, Redux, FusionCharts |
| **Communication** | WiFi (802.11n), HTTP/REST, JSON |
| **Tools** | Git, VS Code, MongoDB Compass, Postman |

## System Architecture (Simple)

```
┌─────────────┐
│   ESP32     │  Reads current every 6s
│  + Sensors  │  Sends via WiFi/HTTP
└──────┬──────┘
       │ POST /api/readings
       ↓
┌─────────────┐
│   Node.js   │  Calculates power/energy
│   Backend   │  Stores in MongoDB
└──────┬──────┘
       │ GET /api/*
       ↓
┌─────────────┐
│    React    │  Fetches every 30s
│  Dashboard  │  Displays charts
└─────────────┘
```

## Key Features
1. ✅ Real-time monitoring (6-second intervals)
2. ✅ Dual sensor support (2 circuits)
3. ✅ Automatic power/energy/cost calculation
4. ✅ Interactive charts (5 types)
5. ✅ Historical data (today/month/year)
6. ✅ Auto-refresh dashboard
7. ✅ MongoDB time-series storage
8. ✅ RESTful API
9. ✅ Responsive web interface
10. ✅ Device management

## Data Flow (30 seconds)
1. **ESP32** reads current from 2 sensors
2. **Calculates** combined current
3. **Sends** JSON via HTTP POST
4. **Backend** receives, validates data
5. **Calculates** power (V×I) and energy
6. **Stores** in MongoDB
7. **Frontend** polls API every 30s
8. **Transforms** data for charts
9. **Displays** on dashboard
10. **User** sees real-time consumption

## Calculations

### Power
```
P (Watts) = V (Volts) × I (Amperes)
P = 230V × 3.5A = 805W
```

### Energy
```
E (kWh) = P (W) × t (hours) / 1000
E = 805W × 0.00167h / 1000 = 0.00134 kWh
```

### Cost
```
Cost ($) = E (kWh) × Rate ($/kWh)
Cost = 0.00134 kWh × $10/kWh = $0.0134
```

## API Endpoints (Quick Reference)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/readings` | Receive sensor data |
| GET | `/api/readings/latest` | Latest reading |
| GET | `/api/readings/today` | Today's data (hourly) |
| GET | `/api/readings/month` | Month's data (daily) |
| GET | `/api/readings/year` | Year's data (monthly) |
| GET | `/api/dashboard` | Summary stats |
| GET | `/api/cost` | Cost calculations |

## Database Schema (Simplified)

```javascript
Reading {
  deviceId: "esp32-1",
  voltage: 230.0,
  current: 3.579,      // sensor1 + sensor2
  sensor1: 2.345,
  sensor2: 1.234,
  power: 823.17,       // calculated
  energy: 0.001372,    // calculated
  timestamp: Date,
  appliance: "All",
  location: "Home"
}
```

## Hardware Setup

```
ACS712 Sensor 1 → 10kΩ → GPIO 34 → 20kΩ → GND
ACS712 Sensor 2 → 10kΩ → GPIO 35 → 20kΩ → GND

Both sensors: VCC → 5V, GND → GND
ESP32: USB → Computer (programming/power)
```

## Key Algorithms

### Sensor Reading (ESP32)
```cpp
1. Take 100 samples
2. Average them
3. Convert ADC to voltage: V = ADC × 3.3 / 4095
4. Compensate divider: V_sensor = V × 1.5
5. Calculate current: I = (V_sensor - offset) / 0.066
```

### Energy Calculation (Backend)
```javascript
1. Get time since last reading: Δt
2. Calculate average power: (P_current + P_last) / 2
3. Calculate energy: E = P_avg × Δt / 1000
4. Accumulate total energy
```

## Project Statistics

- **Lines of Code**: ~5,000+
- **Files**: 50+
- **API Endpoints**: 7
- **Database Collections**: 1 (readings)
- **Charts**: 5
- **Sensors**: 2
- **Development Time**: ~2-3 months
- **Team Size**: 1-4 members

## Achievements

✅ Successfully integrated hardware, backend, and frontend
✅ Real-time data transmission working
✅ Accurate power and energy calculations
✅ Interactive dashboard with multiple visualizations
✅ Scalable architecture
✅ Complete documentation
✅ Working prototype

## Future Enhancements

1. Add voltage sensor (ZMPT101B)
2. Implement WebSocket for real-time updates
3. Add user authentication
4. Mobile app (React Native)
5. Email/SMS alerts
6. Machine learning for predictions
7. Appliance detection (NILM)
8. Solar panel integration

## Challenges Overcome

1. ✅ ESP32 network connectivity (Error -1)
2. ✅ Backend validation errors
3. ✅ Chart data integration
4. ✅ Period button reverting issue
5. ✅ Sensor calibration
6. ✅ IP address changes

## Key Learnings

- IoT device programming and sensor interfacing
- Full-stack web development
- RESTful API design
- Time-series data management
- Real-time data visualization
- System architecture design
- Debugging and troubleshooting

## Deployment

### Development
- Backend: `http://localhost:5000`
- Frontend: `http://localhost:3000`
- Database: MongoDB local/Atlas

### Production (Recommended)
- Backend: AWS EC2 / DigitalOcean
- Frontend: Netlify / Vercel / AWS S3
- Database: MongoDB Atlas
- Domain: Custom domain with SSL

## Testing

- ✅ Hardware: Multimeter verification
- ✅ Firmware: Serial Monitor debugging
- ✅ Backend: Postman API testing
- ✅ Frontend: Manual browser testing
- ✅ Integration: End-to-end data flow
- ✅ Load: Multiple concurrent requests

## Documentation

1. `VIVA_PREPARATION.md` - Complete viva guide
2. `PROJECT_SUMMARY.md` - This file
3. `QUICK_START.md` - Quick setup guide
4. `TROUBLESHOOTING_ESP32.md` - ESP32 debugging
5. `ARDUINO_IDE_SETUP.md` - Hardware setup
6. `ELECTRICITY_RATE_CONFIG.md` - Cost configuration
7. Various README files in subdirectories

## Contact & Resources

- **GitHub**: [Your repository]
- **Demo Video**: [Link if available]
- **Presentation**: [Link if available]
- **Documentation**: See project files

---

## Quick Demo Script (2 minutes)

1. **Show Hardware**: ESP32 + 2 sensors connected
2. **Serial Monitor**: Live current readings
3. **Backend**: API receiving data (check logs)
4. **Database**: MongoDB showing stored readings
5. **Dashboard**: Charts updating in real-time
6. **Features**: Switch between TODAY/MONTH/YEAR
7. **Data**: Show power, energy, cost calculations

---

**Project Status**: ✅ Complete and Working

**Ready for**: Demonstration, Viva, Deployment

**Next Steps**: Production deployment, additional features
