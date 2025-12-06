# Energy Monitoring Backend API

IoT-based energy monitoring system backend built with Node.js, Express, and MongoDB.

## Features

- ✅ Real-time energy data collection from ESP32
- ✅ Time-series data storage with MongoDB
- ✅ RESTful API endpoints
- ✅ Cost calculation and predictions
- ✅ Appliance-wise energy breakdown
- ✅ Dashboard analytics

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or MongoDB Atlas)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
Create a `.env` file in the backend directory:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/energy_monitoring
NODE_ENV=development
```

For MongoDB Atlas (cloud):
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/energy_monitoring
```

3. Start MongoDB (if using local):
```bash
mongod
```

## Usage

### Development Mode (with auto-reload):
```bash
npm run dev
```

### Production Mode:
```bash
npm start
```

### Seed Database (for testing):
```bash
npm run seed
```

## API Endpoints

### Health Check
- `GET /api/health` - Check if API is running

### Readings
- `POST /api/readings` - Add new reading from ESP32
- `GET /api/readings/latest` - Get latest reading
- `GET /api/readings/today` - Get today's readings
- `GET /api/readings/month` - Get this month's readings
- `GET /api/readings/year` - Get this year's readings
- `GET /api/readings/range?startDate=&endDate=` - Get readings by date range

### Dashboard
- `GET /api/dashboard/summary` - Get dashboard summary
- `GET /api/dashboard/realtime` - Get real-time stats (last 5 min)

### Cost
- `GET /api/cost?period=today|month|year` - Calculate cost
- `GET /api/cost/prediction?period=month|year` - Predict future cost
- `GET /api/cost/comparison?period=today|month|year` - Compare with previous period

### Appliances
- `GET /api/appliances?period=today|month|year` - Get appliance-wise data
- `GET /api/appliances/:appliance?period=today` - Get specific appliance data

## Example ESP32 Request

```cpp
// POST to http://your-server:5000/api/readings
{
  "deviceId": "ESP32_001",
  "voltage": 220.5,
  "current": 2.3,
  "power": 507.15,
  "energy": 0.0007,
  "location": "Home",
  "appliance": "Lighting"
}
```

## Example API Response

```json
{
  "success": true,
  "data": {
    "deviceId": "ESP32_001",
    "voltage": 220.5,
    "current": 2.3,
    "power": 507.15,
    "energy": 0.0007,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

## Database Schema

```javascript
{
  deviceId: String,
  voltage: Number,      // Volts
  current: Number,      // Amperes
  power: Number,        // Watts
  energy: Number,       // kWh
  powerFactor: Number,
  frequency: Number,    // Hz
  location: String,
  appliance: String,
  timestamp: Date
}
```

## Testing with cURL

```bash
# Add a reading
curl -X POST http://localhost:5000/api/readings \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "ESP32_001",
    "voltage": 220,
    "current": 2.5,
    "power": 550
  }'

# Get today's cost
curl http://localhost:5000/api/cost?period=today

# Get dashboard summary
curl http://localhost:5000/api/dashboard/summary
```

## Project Structure

```
backend/
├── models/
│   └── Reading.js          # MongoDB schema
├── routes/
│   ├── readings.js         # Readings endpoints
│   ├── dashboard.js        # Dashboard endpoints
│   ├── cost.js            # Cost calculation endpoints
│   └── appliances.js      # Appliance endpoints
├── utils/
│   └── seedData.js        # Database seeding script
├── .env                   # Environment variables
├── .gitignore
├── server.js              # Main server file
└── package.json
```

## Next Steps

1. ✅ Backend API is ready
2. ⏳ Connect ESP32 hardware
3. ⏳ Update React frontend to consume API
4. ⏳ Deploy to production

## Troubleshooting

### MongoDB Connection Error
- Make sure MongoDB is running: `mongod`
- Check MONGODB_URI in .env file
- For Atlas, check network access and credentials

### Port Already in Use
- Change PORT in .env file
- Or kill the process: `npx kill-port 5000`

## License

ISC
