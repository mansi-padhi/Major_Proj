# ⚡ Electricity Rate Configuration

## Current Setting

**Rate**: $10.00 per kWh (increased for testing with small loads)

This is **83x higher** than typical rates to make costs visible even with small test loads.

---

## Where It's Used

The electricity rate is configured in 4 places:

### 1. Reading Model (`backend/models/Reading.js`)
```javascript
const ELECTRICITY_RATE = 10.0; // $ per kWh
```
**Used for**: Individual reading cost calculation

### 2. Cost Routes (`backend/routes/cost.js`)
```javascript
const ELECTRICITY_RATE = 10.0; // $ per kWh
```
**Used for**: Cost API endpoints (today/month/year costs)

### 3. Dashboard Routes (`backend/routes/dashboard.js`)
```javascript
const ELECTRICITY_RATE = 10.0; // $ per kWh
```
**Used for**: Dashboard summary costs

### 4. Chart Data Transformer (`src/utils/chartDataTransformer.js`)
```javascript
const ELECTRICITY_RATE = 10.0; // $ per kWh
```
**Used for**: Frontend chart cost calculations

---

## Example Cost Calculations

With the current rate of **$10.00 per kWh**:

### Small Load (10W for 1 hour)
- Energy: 0.01 kWh
- Cost: $0.10

### Medium Load (100W for 1 hour)
- Energy: 0.1 kWh
- Cost: $1.00

### Large Load (1000W for 1 hour)
- Energy: 1.0 kWh
- Cost: $10.00

### Your Current Sensors (~0.06A at 230V)
- Power: ~14W
- Energy per hour: 0.014 kWh
- Cost per hour: $0.14
- Cost per day: $3.36

---

## Typical Real-World Rates

For reference, typical electricity rates are:

- **USA**: $0.10 - $0.15 per kWh
- **India**: ₹5-8 per kWh (~$0.06-$0.10 per kWh)
- **Europe**: €0.20 - €0.30 per kWh (~$0.22-$0.33 per kWh)

---

## How to Change the Rate

### For Production Use

When you're ready to use real electricity rates, update all 4 files:

**Example for India (₹6 per kWh ≈ $0.072 per kWh):**

```javascript
const ELECTRICITY_RATE = 0.072; // $ per kWh
```

**Example for USA ($0.12 per kWh):**

```javascript
const ELECTRICITY_RATE = 0.12; // $ per kWh
```

### Quick Update Script

You can use find-and-replace:

1. Search for: `ELECTRICITY_RATE = 10.0`
2. Replace with: `ELECTRICITY_RATE = 0.12` (or your desired rate)
3. Update in all 4 files

---

## After Changing the Rate

### 1. Restart Backend
```bash
cd backend
# Stop with Ctrl+C
npm start
```

### 2. Rebuild Frontend (if changed chartDataTransformer.js)
```bash
# Stop frontend with Ctrl+C
npm start
```

### 3. New Data Only
- The rate change only affects **new readings**
- Old readings keep their original cost
- To recalculate all costs, you'd need to update the database

---

## Cost Display Locations

The cost will be visible in:

1. **Test Monitor** (`http://localhost:5000/test-monitor.html`)
   - Shows cost per reading

2. **Main Dashboard** (`http://localhost:3000`)
   - Today's cost
   - Monthly cost
   - Yearly cost
   - Cost charts

3. **API Responses**
   - `/api/readings` - Individual reading costs
   - `/api/cost` - Period cost summaries
   - `/api/dashboard` - Dashboard cost data

---

## Testing the New Rate

### 1. Send Test Data
```bash
cd backend
node test-esp32-connection.js
```

### 2. Check Cost in Response
You should see:
```json
{
  "energy": 0.001143,
  "cost": "0.01"  // With $10/kWh rate
}
```

### 3. View in Test Monitor
Open: `http://localhost:5000/test-monitor.html`

The cost should now be visible even with small loads!

---

## Currency Conversion

If you want to display costs in a different currency:

### Option 1: Change the Rate
Convert your local rate to USD equivalent:
```javascript
// Example: ₹6 per kWh = $0.072 per kWh
const ELECTRICITY_RATE = 0.072;
```

### Option 2: Add Currency Symbol (Frontend)
Update display code to show your currency:
```javascript
// In chartDataTransformer.js or display components
const costDisplay = `₹${(cost * 83.33).toFixed(2)}`; // Convert $ to ₹
```

---

## Current Status

✅ **Rate Updated**: $10.00 per kWh in all 4 locations
✅ **Purpose**: Testing with small loads
✅ **Effect**: Costs are now 83x more visible

**Next Steps**:
1. Restart backend server
2. Send new data from ESP32
3. Check test monitor for visible costs
4. When ready for production, change to real rate

---

**Remember**: This high rate is for testing only! Change it to your actual electricity rate before production use.
