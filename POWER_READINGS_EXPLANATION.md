# Power Readings Explanation

## Why Are Power Values Low (e.g., 26W)?

### Understanding Power vs Energy

**Power (Watts)** is the **instantaneous rate** of energy consumption:
- Like the speedometer in a car (km/h)
- Measured at a specific moment
- Unit: Watts (W)

**Energy (kWh)** is the **total amount** consumed over time:
- Like the odometer in a car (km)
- Accumulated over hours/days/months
- Unit: kilowatt-hours (kWh)

### Your Current Readings

Based on the latest sensor data:
- **Load 1 (Sensor 1)**: ~7-8 W (0.032 A × 230 V)
- **Load 2 (Sensor 2)**: ~16-17 W (0.073 A × 230 V)
- **Total Power**: ~24-26 W

### Is 26W Normal?

**YES!** These are typical values for:

| Appliance | Typical Power |
|-----------|---------------|
| LED Bulb (5W) | 5 W |
| LED Bulb (10W) | 10 W |
| Phone Charger (idle) | 0.5-2 W |
| Phone Charger (charging) | 5-20 W |
| Laptop Charger (idle) | 2-5 W |
| Laptop Charger (charging) | 30-90 W |
| WiFi Router | 5-15 W |
| TV (standby) | 1-5 W |
| Small Fan | 20-50 W |

### Energy Consumption Over Time

If your loads run continuously:

**5 minutes:**
- Energy = 26W × (5/60)h = 2.17 Wh = 0.00217 kWh
- Cost = 0.00217 kWh × ₹10/kWh = **₹0.022** (2 paise)

**1 hour:**
- Energy = 26W × 1h = 26 Wh = 0.026 kWh
- Cost = 0.026 kWh × ₹10/kWh = **₹0.26** (26 paise)

**1 day (24 hours):**
- Energy = 26W × 24h = 624 Wh = 0.624 kWh
- Cost = 0.624 kWh × ₹10/kWh = **₹6.24**

**1 month (30 days):**
- Energy = 26W × 24h × 30 = 18,720 Wh = 18.72 kWh
- Cost = 18.72 kWh × ₹10/kWh = **₹187.20**

### Why Power Seems Low

1. **Small Loads**: You're likely monitoring LED lights or small electronics
2. **Accurate Sensors**: ACS712 sensors are working correctly
3. **Real-time Data**: This is actual instantaneous power, not accumulated

### To See Higher Power Values

Connect higher-power appliances:
- **Incandescent Bulb (60W)**: 60 W
- **Electric Kettle**: 1000-2000 W
- **Hair Dryer**: 1000-1800 W
- **Microwave**: 800-1200 W
- **Iron**: 1000-1500 W
- **Air Conditioner**: 1000-2000 W

### Current System Behavior

✅ **Power readings (W)**: Correct - shows instantaneous consumption
✅ **Energy accumulation (kWh)**: Correct - accumulates over time
✅ **Cost calculation**: Correct - based on accumulated energy
✅ **Sensor readings**: Accurate - 0.032A and 0.073A are valid small currents

### Chart Display

The **Active Appliances** chart shows:
- **Load 1**: Power from Sensor 1 (in Watts)
- **Load 2**: Power from Sensor 2 (in Watts)

This is the **average power** over the selected period (today/month/year), which is why it might seem low - it's averaging all readings including times when loads might be off or in standby mode.

### Summary

Your system is working correctly! The 26W reading is accurate for small loads. To see more dramatic changes:
1. Connect higher-power appliances
2. Turn loads on/off to see power changes in real-time
3. Check the energy charts to see accumulation over time
4. Monitor cost over days/weeks to see meaningful totals
