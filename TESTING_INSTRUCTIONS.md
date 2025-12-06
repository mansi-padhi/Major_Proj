# Testing Instructions - Real Data Integration

## What Was Fixed

The charts were showing "Chart 1", "Chart 2" placeholders because they were using static mock data instead of the real data from the MongoDB database.

### Changes Made:

1. **Created Data Transformation Layer** (`src/utils/chartDataTransformer.js`)
   - Transforms backend API responses into FusionCharts format
   - Handles aggregated data structure from backend

2. **Created Dynamic Chart Configs** (`src/chart-configs/dashboard_charts_dynamic.js`)
   - 7 chart configuration functions that use real API data
   - Handles today, month, and year periods
   - Falls back to empty charts if no data available

3. **Updated Chart Container** (`src/containers/chart.js`)
   - Connected to Redux `energy` state
   - Uses dynamic data when available
   - Falls back to static data if API data not loaded
   - Updated button handlers (Today/Month/Year) to use dynamic data

## How to Test

### 1. Verify Servers Are Running

**Backend Server** (Port 5000):
```bash
cd backend
npm run dev
```

**Frontend Server** (Port 3000):
```bash
npm start
```

### 2. Open the Application

Navigate to: http://localhost:3000

### 3. Test Dashboard View

1. **Click on "Dashboard" in the left sidebar** (should be selected by default)
2. **You should see 7 charts displaying real data**:
   - Chart 1: Cost Breakdown (Doughnut chart showing ~$2.97 total)
   - Chart 2: Energy Consumption (Line chart showing energy over days)
   - Chart 3: Power Usage (Line chart showing power fluctuations)
   - Chart 4: Voltage (Line chart showing ~220V)
   - Chart 5: Current (Line chart showing current variations)
   - Chart 6: Cost Over Time (Line chart showing cost accumulation)
   - Chart 7: Cumulative Energy (Line chart showing total energy buildup)

3. **Test Period Buttons**:
   - Click "TODAY" - charts should update (may show less data)
   - Click "MONTH" - charts should show monthly data (default)
   - Click "YEAR" - charts should update (may show less data)

### 4. Verify Data is Real

**Expected Values** (based on mock data in database):
- Total Energy (Month): ~24.752 kWh
- Total Cost (Month): ~$2.97
- Voltage: ~220V average
- Current: ~4.5A average
- Power: ~1000W average

**Check in Browser Console**:
1. Open Developer Tools (F12)
2. Go to Console tab
3. Type: `window.store.getState().energy`
4. You should see:
   ```javascript
   {
     dashboard: { today: {...}, month: {...}, latest: {...} },
     readings: { month: { data: [...] } },
     loading: false,
     error: null
   }
   ```

### 5. Verify Auto-Refresh

The data should automatically refresh every 30 seconds. Watch the charts to see if they update (though with static mock data, values won't change much).

## Troubleshooting

### If Charts Still Show "Chart 1", "Chart 2":

1. **Check API Connection**:
   ```bash
   curl http://localhost:5000/api/dashboard/summary
   curl http://localhost:5000/api/readings/month
   ```
   Both should return JSON data.

2. **Check Redux State**:
   - Open Browser DevTools → Console
   - Type: `window.store.getState().energy`
   - Verify `dashboard` and `readings` have data

3. **Check for Errors**:
   - Open Browser DevTools → Console
   - Look for any red error messages
   - Check Network tab for failed API calls

4. **Check Backend Logs**:
   - Look at the terminal running `npm run dev` in backend folder
   - Should show successful API requests

### If Charts Show Empty/Zero Values:

1. **Verify Database Has Data**:
   ```bash
   cd backend
   npm run seed:realistic
   ```
   This will populate the database with 288 readings.

2. **Check MongoDB Connection**:
   - Backend terminal should show "✅ MongoDB Connected Successfully"
   - If not, check `.env` file in backend folder

### If Only Some Charts Work:

This is expected! Currently only the Dashboard view (7 charts) has been updated to use real data. The other views (Cost, Appliances, Usage, Emissions) still use static data and will be updated next.

## What's Working Now

✅ Dashboard view (7 charts) with real data
✅ Today/Month/Year period switching
✅ Auto-refresh every 30 seconds
✅ Fallback to static data if API fails

## What's Still Using Static Data

❌ Cost view (user.id === 2)
❌ Appliances view (user.id === 3)
❌ Usage by Rooms view (user.id === 4)
❌ Emissions view (user.id === 5)

These will be updated in the same way once dashboard is verified working.

## Success Criteria

You'll know it's working when:
1. Charts show actual numbers instead of "Chart 1", "Chart 2"
2. Chart 1 shows a doughnut with ~$2.97 total cost
3. Other charts show line graphs with varying data points
4. Clicking Today/Month/Year updates the charts
5. No errors in browser console
6. Backend shows successful API requests in terminal

## Next Steps

Once dashboard charts are verified:
1. Update Cost view to use real data
2. Update Appliances view (will need appliance categorization logic)
3. Update Usage by Rooms view (will need room/location data)
4. Update Emissions view (will need carbon calculation logic)
5. Add more ESP32 devices for multi-device monitoring
