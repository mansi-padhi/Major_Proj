# 🚀 Quick Start Guide - IoT Energy Monitoring Backend

## ✅ Backend Setup Complete!

All backend files are created and tested. Here's how to get started:

---

## 📦 What You Have

```
✅ Express.js REST API server
✅ MongoDB integration with time-series support
✅ 20+ API endpoints for energy monitoring
✅ Cost calculation & prediction algorithms
✅ Appliance-wise energy tracking
✅ Dashboard analytics APIs
✅ Test data seeding script
✅ Complete API documentation
```

---

## 🎯 Start Backend in 3 Steps

### Step 1: Install MongoDB

**Windows (Easiest):**
1. Download: https://www.mongodb.com/try/download/community
2. Run installer → Use default settings
3. MongoDB starts automatically ✅

**Alternative: MongoDB Atlas (Cloud - Free)**
1. Sign up: https://www.mongodb.com/cloud/atlas
2. Create free cluster
3. Get connection string
4. Update `backend/.env`:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/energy_monitoring
   ```

### Step 2: Start the Server

```bash
cd backend
npm run dev
```

**Expected Output:**
```
✅ MongoDB Connected Successfully
🚀 Server running on port 5000
📊 API available at http://localhost:5000
```

### Step 3: Test It Works

**Open in browser:**
```
http://localhost:5000/api/health
```

**Or use command line:**
```bash
curl http://localhost:5000/api/health
```

**Expected Response:**
```json
{
  "status": "OK",
  "message": "Energy Monitoring Backend is running",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## 🧪 Optional: Add Test Data

```bash
cd backend
npm run seed
```

This creates sample readings for testing the dashboard.

---

## 📡 Test API Endpoints

### Add a Reading (Simulate ESP32)
```bash
curl -X POST http://localhost:5000/api/readings \
  -H "Content-Type: application/json" \
  -d "{\"voltage\":220,\"current\":2.5,\"power\":550}"
```

### Get Dashboard Summary
```bash
curl http://localhost:5000/api/dashboard/summary
```

### Get Today's Cost
```bash
curl http://localhost:5000/api/cost?period=today
```

---

## 🔌 Key API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/readings` | POST | Add sensor reading (ESP32) |
| `/api/readings/latest` | GET | Get latest reading |
| `/api/readings/today` | GET | Today's readings |
| `/api/readings/month` | GET | Monthly readings |
| `/api/dashboard/summary` | GET | Dashboard overview |
| `/api/cost?period=today` | GET | Calculate cost |
| `/api/appliances?period=month` | GET | Appliance breakdown |

**Full API docs:** `backend/README.md`

---

## 🔄 Complete System Workflow

```
┌──────────────┐
│    ESP32     │  Reads voltage & current from sensors
│   (Hardware) │  Calculates power (V × I)
└──────┬───────┘
       │
       │ HTTP POST /api/readings
       │ { voltage: 220, current: 2.5, power: 550 }
       ▼
┌──────────────────┐
│  Backend API     │  Stores in MongoDB
│  (Port 5000)     │  Calculates energy & cost
└──────┬───────────┘
       │
       │ Stores in database
       ▼
┌──────────────────┐
│    MongoDB       │  Time-series collection
│  (Port 27017)    │  Indexed by timestamp
└──────┬───────────┘
       │
       │ GET /api/dashboard/summary
       │ GET /api/readings/today
       ▼
┌──────────────────┐
│  React Frontend  │  Displays charts & analytics
│  (Port 3000)     │  Real-time updates
└──────────────────┘
```

---

## 📁 Project Structure

```
backend/
├── models/
│   └── Reading.js              # MongoDB schema
├── routes/
│   ├── readings.js             # Sensor data endpoints
│   ├── dashboard.js            # Analytics endpoints
│   ├── cost.js                 # Cost calculations
│   └── appliances.js           # Appliance tracking
├── utils/
│   └── seedData.js             # Test data generator
├── .env                        # Configuration
├── server.js                   # Main server
├── package.json                # Dependencies
├── README.md                   # API documentation
├── SETUP.md                    # Setup guide
└── test-api.http               # API examples
```

---

## 🛠️ Available Commands

```bash
npm start          # Start production server
npm run dev        # Start with auto-reload (development)
npm run seed       # Add test data to database
node test-server.js # Verify setup before starting
```

---

## 🆘 Troubleshooting

### ❌ "MongoDB Connection Error"

**Check if MongoDB is running:**
```bash
# Windows: Open Services → Look for MongoDB
# Mac/Linux: sudo systemctl status mongodb
```

**Solution:** Start MongoDB or use MongoDB Atlas (cloud)

### ❌ "Port 5000 already in use"

**Solution 1:** Change port in `backend/.env`:
```
PORT=5001
```

**Solution 2:** Kill the process:
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:5000 | xargs kill -9
```

### ❌ "Cannot find module"

**Solution:**
```bash
cd backend
rm -rf node_modules
npm install
```

---

## ✅ Verification Checklist

- [ ] MongoDB installed and running
- [ ] Backend server starts without errors
- [ ] Health endpoint returns OK
- [ ] Can add readings via POST
- [ ] Can retrieve data via GET
- [ ] Test data seeded successfully

---

## ⏭️ Next Steps

Choose your path:

### Option 1: ESP32 Development
- Write firmware to read sensors
- Send HTTP POST to backend
- Test data flow

### Option 2: Frontend Integration
- Update React app to use backend API
- Replace static data with real API calls
- Add real-time updates

### Option 3: Test & Verify
- Test all API endpoints
- Verify data storage
- Check calculations

---

## 📚 Documentation

- **API Reference:** `backend/README.md`
- **Setup Guide:** `backend/SETUP.md`
- **Test Examples:** `backend/test-api.http`
- **This Guide:** `QUICK_START.md`

---

## 💡 Tips

1. **Use MongoDB Atlas** for easy cloud database (no local install needed)
2. **Keep backend running** while developing frontend
3. **Use Postman** or `test-api.http` for testing endpoints
4. **Check logs** if something doesn't work - errors are descriptive

---

## 🎉 You're Ready!

Your backend is fully functional and ready to:
- ✅ Receive data from ESP32
- ✅ Store in MongoDB
- ✅ Serve data to React frontend
- ✅ Calculate costs and analytics

**Start the server and begin testing!**

```bash
cd backend
npm run dev
```

Then open: http://localhost:5000
