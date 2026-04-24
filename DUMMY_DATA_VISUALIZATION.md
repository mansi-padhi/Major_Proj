# Dummy Data Visualization - Frontend Preview

## Overview

All three main sections (Cost, Appliances, Usage-by-device) now display dummy data to show how the interface will look when real ESP32 data arrives.

## 1. Cost Component (Dashboard Section 2)

### Dummy Data Structure:

```javascript
{
  totalCost: 245.50,
  previousCost: 220.30,
  predictedCost: 255.00,
  data: [
    { label: 'Day 1', cost: 8.2 },
    { label: 'Day 2', cost: 7.5 },
    // ... 20 days of data
  ]
}
```

### What You'll See:

- **Line Chart**: Shows daily cost trend over 20 days (₹6.8 to ₹10.5 per day)
- **Stats Panel**:
  - Last Month: ₹220.30
  - This Month: ₹245.50 (highlighted in blue)
  - Predicted This Month: ₹255.00 (orange)
  - Extra Cost: -₹25.20 (red, showing increase)
- **Toggle Buttons**: Switch between "This Month" and "Last Month" views
- **Rate Display**: Shows "Rate: ₹7/kWh" in chart subtitle

---

## 2. Appliances Component (Dashboard Section 3)

### Dummy Data Structure:

```javascript
{
  totalEnergy: 35.5,
  totalCost: 248.50,
  devices: [
    {
      name: 'Load 1 (GPIO 34)',
      energy: 22.3,
      cost: 156.10,
      percentage: 62.8,
      avgPower: 1200
    },
    {
      name: 'Load 2 (GPIO 35)',
      energy: 13.2,
      cost: 92.40,
      percentage: 37.2,
      avgPower: 750
    }
  ]
}
```

### What You'll See:

- **Doughnut Chart**: Shows energy distribution between two loads
  - Load 1: 62.8% (blue slice)
  - Load 2: 37.2% (orange slice)
- **Summary Panel**:
  - Total Energy: 35.5 kWh
  - Total Cost: ₹248.50
- **Device Breakdown**:
  - Load 1 card: 22.3 kWh, ₹156.10, Avg Power: 1200W
  - Load 2 card: 13.2 kWh, ₹92.40, Avg Power: 750W

---

## 3. Usage-by-Device Component (Dashboard Section 4)

### Dummy Data Structure:

```javascript
[
  { label: "Day 1", sensor1: 2.5, sensor2: 1.2, voltage: 230 },
  { label: "Day 2", sensor1: 2.3, sensor2: 1.5, voltage: 230 },
  // ... 20 days of data
];
```

### What You'll See:

- **Multi-Series Column Chart**: Compares Load 1 vs Load 2 current over 20 days
  - Blue bars: Load 1 (GPIO 34) - ranges from 2.1A to 3.0A
  - Orange bars: Load 2 (GPIO 35) - ranges from 1.1A to 1.6A
- **Load 1 Stats Panel** (blue border):
  - Average Current: ~2.6A
  - Peak Current: 3.0A
  - Total Energy: ~11.9 kWh
- **Load 2 Stats Panel** (orange border):
  - Average Current: ~1.4A
  - Peak Current: 1.6A
  - Total Energy: ~6.4 kWh
- **Comparison Panel**: Shows Load 1 consumes ~86% more energy than Load 2

---

## How to View

1. **Frontend**: http://localhost:3000
2. **Navigate through sections**:
   - Dashboard (Section 1) - Shows all charts
   - Cost (Section 2) - Detailed cost analysis
   - Appliances (Section 3) - Device-wise breakdown
   - Usage-by-device (Section 4) - Load comparison

3. **Period Switching**: Click "Today", "Month", or "Year" buttons at top
   - Currently dummy data is set for "Month" period
   - Other periods will show "Waiting for data from ESP32..."

---

## When Real Data Arrives

Once your ESP32 starts sending data to the backend:

1. **POST endpoint**: `http://localhost:5000/api/readings`
2. **Payload format**:

   ```json
   {
     "deviceId": "esp32-1",
     "sensor1": 2.5,
     "sensor2": 1.2,
     "voltage": 230
   }
   ```

3. **Backend processing**:
   - Calculates power: `P = V × I`
   - Calculates energy: `E = P × time`
   - Calculates cost: `Cost = E × ₹7`
   - Stores in MongoDB Atlas

4. **Frontend fetching**:
   - Fetches from: `GET /api/dashboard?period=month`
   - Replaces dummy data with real data
   - Charts update automatically

---

## Color Scheme

- **Primary Blue**: #00D4FF (Load 1, current period)
- **Orange**: #FFA500 (Load 2, predictions)
- **Green**: #00FF00 (savings)
- **Red**: #FF4444 (extra costs, warnings)
- **Background**: #1e1e2e (dark theme)
- **Cards**: #2a2a3a (slightly lighter)

---

## Next Steps

1. ✅ Dummy data added to all components
2. ✅ Build successful
3. ✅ Frontend running on port 3000
4. ✅ Backend running on port 5000
5. ⏳ Upload ESP32 code to hardware
6. ⏳ Connect ESP32 to WiFi
7. ⏳ Verify data flow: ESP32 → Backend → MongoDB → Frontend

---

## Testing Checklist

- [ ] Open http://localhost:3000
- [ ] Click "Cost" - see line chart with 20 days data
- [ ] Click "Appliances" - see doughnut chart with 2 devices
- [ ] Click "Usage-by-device" - see column chart comparing loads
- [ ] Try period switching (Today/Month/Year)
- [ ] Check stats panels show correct numbers
- [ ] Verify no console errors in browser DevTools

---

**Status**: Ready for demonstration and ESP32 integration testing
**Submission**: Tomorrow - All frontend visualization complete
