# Backend Setup Guide

## Quick Start (3 Steps)

### Step 1: Install MongoDB

**Option A: Local MongoDB (Recommended for Development)**

**Windows:**
1. Download MongoDB Community Server: https://www.mongodb.com/try/download/community
2. Install with default settings
3. MongoDB will run automatically as a service

**Mac:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux:**
```bash
sudo apt-get install mongodb
sudo systemctl start mongodb
```

**Option B: MongoDB Atlas (Cloud - Free Tier)**
1. Go to https://www.mongodb.com/cloud/atlas
2. Create free account
3. Create a cluster (free tier)
4. Get connection string
5. Update `.env` file with your connection string

### Step 2: Start the Backend Server

```bash
# From the backend directory
npm run dev
```

You should see:
```
✅ MongoDB Connected Successfully
🚀 Server running on port 5000
📊 API available at http://localhost:5000
```

### Step 3: Seed Test Data (Optional)

```bash
npm run seed
```

This will populate your database with sample readings for testing.

---

## Testing the API

### Method 1: Using Browser
Open: http://localhost:5000/api/health

### Method 2: Using cURL

```bash
# Health check
curl http://localhost:5000/api/health

# Add a reading (simulate ESP32)
curl -X POST http://localhost:5000/api/readings \
  -H "Content-Type: application/json" \
  -d "{\"deviceId\":\"ESP32_001\",\"voltage\":220,\"current\":2.5,\"power\":550}"

# Get dashboard summary
curl http://localhost:5000/api/dashboard/summary

# Get today's cost
curl http://localhost:5000/api/cost?period=today
```

### Method 3: Using Postman
1. Import the `test-api.http` file
2. Test each endpoint

---

## Troubleshooting

### Error: "MongoDB Connection Error"

**Solution 1: Check if MongoDB is running**
```bash
# Windows
services.msc  # Look for MongoDB service

# Mac/Linux
sudo systemctl status mongodb
```

**Solution 2: Use MongoDB Atlas (Cloud)**
Update `.env`:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/energy_monitoring
```

### Error: "Port 5000 already in use"

**Solution: Change port in .env**
```
PORT=5001
```

Or kill the process:
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:5000 | xargs kill -9
```

### Error: "Cannot find module"

**Solution: Reinstall dependencies**
```bash
rm -rf node_modules
npm install
```

---

## Next Steps

1. ✅ Backend is running
2. ⏳ Test API endpoints
3. ⏳ Connect ESP32 hardware
4. ⏳ Update React frontend

---

## API Documentation

See `README.md` for complete API documentation.

## Project Structure

```
backend/
├── models/
│   └── Reading.js          # MongoDB schema for sensor data
├── routes/
│   ├── readings.js         # CRUD operations for readings
│   ├── dashboard.js        # Dashboard analytics
│   ├── cost.js            # Cost calculations
│   └── appliances.js      # Appliance-wise breakdown
├── utils/
│   └── seedData.js        # Test data generator
├── .env                   # Configuration (DO NOT COMMIT)
├── server.js              # Main application entry
└── package.json
```

## Environment Variables

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/energy_monitoring
NODE_ENV=development
```

## Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with auto-reload
- `npm run seed` - Populate database with test data

---

## Support

If you encounter any issues:
1. Check MongoDB is running
2. Verify `.env` configuration
3. Check console for error messages
4. Ensure port 5000 is available
