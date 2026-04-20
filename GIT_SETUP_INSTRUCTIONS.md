# Git Setup Instructions

## Step 1: Install Git

1. Download Git for Windows from: https://git-scm.com/download/win
2. Run the installer with default settings
3. Restart your terminal/command prompt

## Step 2: Initialize Git Repository

Open a terminal in your project folder and run these commands:

```bash
# Initialize git repository
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial commit: Energy monitoring system with ESP32 integration"

# Add your remote repository (replace with your actual repo URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push to GitHub
git push -u origin main
```

## Step 3: Future Commits

After making changes, use these commands:

```bash
# Check what files changed
git status

# Add all changes
git add .

# Commit with a message
git commit -m "Your commit message here"

# Push to GitHub
git push
```

## What Changes Have Been Made

### Phase 1 Completed:

- ✅ Fixed redux-thunk compatibility (downgraded to v2.4.2)
- ✅ Fixed duplicate variable declarations in chart.js
- ✅ Set electricity rate to ₹7/kWh across all files
- ✅ Removed Emissions view completely
- ✅ Renamed "Usage-by-rooms" to "Usage-by-device"
- ✅ Fixed all compilation errors and warnings
- ✅ Connected to MongoDB Atlas cloud database
- ✅ Updated ESP32 dual sensor code for GPIO 34 & 35
- ✅ Created comprehensive documentation

### Phase 2 Infrastructure (Backend Only):

- ✅ Created all Phase 2 models (RelayState, Alert, Threshold, Subscriber, AIReport)
- ✅ Created all Phase 2 routes (relays, safety, telegram, ai)
- ✅ Created services (telegramService, aiService)
- ✅ Installed dependencies (node-telegram-bot-api, @anthropic-ai/sdk)
- ⚠️ Telegram and AI features not configured (no API keys)

### Documentation Created:

- `FRONTEND_STATUS.md` - Current frontend status and issues
- `SYSTEM_WORKING_STATUS.md` - System working confirmation
- `esp32/UPLOAD_INSTRUCTIONS.md` - ESP32 setup guide
- `esp32/ARDUINO_IDE_SETUP.md` - Arduino IDE setup
- `esp32/DUAL_SENSOR_SETUP.md` - Dual sensor wiring guide

### Files Modified:

- `package.json` - Downgraded redux-thunk
- `src/index.js` - Fixed thunk import
- `src/containers/chart.js` - Fixed errors, renamed Usage-by-device
- `src/reducer/reducer-options.js` - Updated navigation options
- `backend/.env` - MongoDB Atlas connection string
- `backend/package.json` - Added Phase 2 dependencies
- `backend/server.js` - Added Phase 2 routes
- `backend/models/Reading.js` - Added Phase 2 fields
- `esp32/energy_monitor_dual_sensor/energy_monitor_dual_sensor.ino` - Complete rewrite

## Recommended Commit Message

```
Phase 1 Complete: Energy monitoring system with ESP32 dual sensor support

Features:
- Dashboard with 5 real-time charts
- Cost tracking (₹7/kWh rate)
- Appliances monitoring
- Usage-by-device comparison (Load1 vs Load2)
- MongoDB Atlas cloud database integration
- ESP32 dual sensor support (GPIO 34 & 35)
- Auto-refresh every 30 seconds
- Zero compilation errors/warnings

Backend Infrastructure:
- Phase 2 models and routes created (not active)
- Telegram and AI services prepared (not configured)

Hardware:
- Dual ACS712 current sensors
- 230V AC voltage monitoring
- JSON payload format: {"deviceId":"esp32-1","sensor1":2.5,"sensor2":1.2,"voltage":230}

Next Steps:
- Connect frontend charts to live backend data
- Upload ESP32 code to hardware
- Test with real sensor readings
```

## Alternative: Using GitHub Desktop

If you prefer a GUI instead of command line:

1. Download GitHub Desktop: https://desktop.github.com/
2. Install and sign in with your GitHub account
3. Click "Add" → "Add Existing Repository"
4. Select your project folder
5. Click "Publish repository" to push to GitHub

## Need Help?

If you encounter any issues:

- Make sure Git is installed: `git --version`
- Check if you're in the right folder: `pwd` (should show your project path)
- Verify you have a GitHub account and repository created
