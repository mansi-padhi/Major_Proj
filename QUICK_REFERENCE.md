# Quick Reference - Chart Integration

## Problem Fixed
✅ Charts now show **real data from MongoDB** instead of "Chart 1", "Chart 2" placeholders

## What to Check

### 1. Open the App
- URL: http://localhost:3000
- Click "Dashboard" in left sidebar

### 2. Expected Results
You should see 7 charts with real data:

| Chart | Type | Shows | Expected Value |
|-------|------|-------|----------------|
| Chart 1 | Doughnut | Cost Breakdown | ~$2.97 total |
| Chart 2 | Line | Energy Consumption | Varying kWh over time |
| Chart 3 | Line | Power Usage | ~1000W average |
| Chart 4 | Line | Voltage | ~220V |
| Chart 5 | Line | Current | ~4.5A |
| Chart 6 | Line | Cost Over Time | Increasing $ |
| Chart 7 | Line | Cumulative Energy | Increasing kWh |

### 3. Test Buttons
- Click **TODAY** → Charts update with hourly data
- Click **MONTH** → Charts show daily data (default)
- Click **YEAR** → Charts show monthly data

## If Something's Wrong

### Charts Still Show "Chart 1", "Chart 2"
```bash
# Check if backend is running
curl http://localhost:5000/api/dashboard/summary

# Check if data exists in database
cd backend
npm run seed:realistic
```

### No Data in Charts
```bash
# Reseed the database
cd backend
npm run seed:realistic

# Restart backend
npm run dev
```

### Errors in Console
1. Open Browser DevTools (F12)
2. Check Console tab for errors
3. Check Network tab for failed API calls

## Key Files

### New Files Created
- `src/utils/chartDataTransformer.js` - Transforms API data to chart format
- `src/chart-configs/dashboard_charts_dynamic.js` - Dynamic chart configs

### Modified Files
- `src/containers/chart.js` - Uses real data from Redux

## How It Works

```
MongoDB → Backend API → Redux State → Chart Component → FusionCharts
```

1. **App.js** fetches data every 30 seconds
2. Data stored in **Redux** (`state.energy`)
3. **chart.js** receives data via props
4. **Dynamic configs** transform data to chart format
5. **FusionCharts** renders the charts

## Data Source

The charts display data from:
- **Database**: MongoDB (local)
- **Collection**: `readings`
- **Records**: 288 readings (24 hours, every 5 minutes)
- **Total Energy**: ~24.752 kWh
- **Total Cost**: ~$2.97 (at $0.12/kWh)

## Servers

### Backend (Port 5000)
```bash
cd backend
npm run dev
```

### Frontend (Port 3000)
```bash
npm start
```

## What's Next

### Currently Working
✅ Dashboard view (7 charts)

### Still Using Static Data
❌ Cost view
❌ Appliances view
❌ Usage by Rooms view
❌ Emissions view

These will be updated using the same approach.

## Success Indicators

✅ Charts show numbers, not "Chart 1", "Chart 2"
✅ Chart 1 shows doughnut with ~$2.97
✅ Other charts show line graphs with data
✅ Today/Month/Year buttons work
✅ No errors in browser console
✅ Backend shows API requests in terminal

## Quick Debug

### Check Redux State
Open browser console and type:
```javascript
window.store.getState().energy
```

Should show:
```javascript
{
  dashboard: { today: {...}, month: {...} },
  readings: { month: { data: [...] } },
  loading: false,
  error: null
}
```

### Check API Response
```bash
curl http://localhost:5000/api/readings/month
```

Should return JSON with data array.

## Documentation

- `SOLUTION_SUMMARY.md` - Complete technical details
- `TESTING_INSTRUCTIONS.md` - Detailed testing guide
- `CHART_INTEGRATION_STATUS.md` - Integration status
- `QUICK_REFERENCE.md` - This file

## Support

If charts still don't show data:
1. Check both servers are running
2. Verify database has data (`npm run seed:realistic`)
3. Check browser console for errors
4. Check backend terminal for errors
5. Verify API endpoints return data (curl commands above)
