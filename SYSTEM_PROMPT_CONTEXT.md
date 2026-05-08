# Smart Energy Monitoring System - Context for AI Prompt Enhancement

## Project Overview

**Project Name**: Smart Energy Dashboard with AI-Powered Analysis  
**Purpose**: Real-time household energy monitoring and intelligent analysis system for residential users  
**Target Users**: Homeowners seeking to understand and optimize their electricity consumption  
**Location**: India (Currency: INR ₹, Electricity Rate: ₹7-8 per kWh)

---

## System Architecture

### Hardware Setup

**Microcontroller**: ESP32 Development Board
- WiFi-enabled for real-time data transmission
- Sends readings every 5 seconds to backend server
- Device ID: `esp32-1`

**Sensors**:
1. **ACS712 5A Current Sensors (×2)**
   - Sensitivity: 0.185 V/A
   - Measures AC current for two separate loads
   - Load 1: ~9-11W (small appliance - phone charger, small LED bulb)
   - Load 2: ~48-50W (medium appliance - fan, larger bulb, TV)

2. **ZMPT101B Voltage Sensor**
   - Measures AC mains voltage
   - Typical reading: 220-226V (Indian standard: 230V ±10%)
   - Multiplier calibration: 1800

3. **DHT11 Temperature & Humidity Sensor**
   - Temperature range: 0-50°C (typical indoor: 26-28°C)
   - Humidity range: 20-90% RH (typical indoor: 54-57%)
   - Used for environmental monitoring and safety

4. **MQ-2 Smoke/Gas Sensor**
   - Analog output: 0-4095 (ADC reading)
   - Safe range: 300-600 (normal air quality)
   - Warning range: 600-900 (elevated but acceptable)
   - Danger range: >1000 (triggers safety alerts)

**Relay Module (×2)**:
- Remote control capability for each load
- Can turn appliances ON/OFF via web interface
- Manual override always available

### Software Stack

**Backend**:
- Node.js + Express.js
- MongoDB database for time-series data storage
- Gemini 2.5 Flash API for AI analysis
- Real-time data processing (5-second intervals)

**Frontend**:
- React 15.6.2
- Redux for state management
- FusionCharts for data visualization
- Dark theme UI (#1e1e2e background)

**Data Storage**:
- Reading model stores: voltage, current, power, energy, loadId, timestamp, temperature, humidity, smokeLevel
- Energy calculated using: E (kWh) = (Power × Time) / (3600 × 1000)
- Cost calculated using: Cost (₹) = Energy (kWh) × Rate (₹7/kWh)

---

## Data Characteristics

### Measurement Precision
- **Voltage**: 1 decimal place (225.0V)
- **Current**: 3 decimal places (0.043A)
- **Power**: 2 decimal places (9.68W)
- **Energy**: 8 decimal places (0.00000134 kWh)
- **Cost**: 4 decimal places (₹0.0094)

### Typical Values (Based on Actual Sensor Data)
- **Load 1 (Small Appliance)**:
  - Current: 0.043-0.050A
  - Power: 9-11W
  - Daily energy: ~0.2-0.3 kWh
  - Daily cost: ~₹1.5-2.5

- **Load 2 (Medium Appliance)**:
  - Current: 0.215-0.223A
  - Power: 48-50W
  - Daily energy: ~0.8-1.2 kWh
  - Daily cost: ~₹6-9

- **Combined System**:
  - Daily total: ~1.0-1.5 kWh
  - Monthly total: ~30-45 kWh
  - Monthly cost: ~₹210-315

### Usage Patterns (Realistic Simulation)
- **Load 1**: 90% uptime during 6am-11pm, mostly off at night
- **Load 2**: 80% uptime during 7am-10pm, more intermittent usage
- **Hourly variation**: Low at night (0.3x), peak during day (1.0x), evening peak (1.0x)
- **Weekly variation**: Weekdays (1.0x), weekends slightly lower (0.8-0.9x)
- **Seasonal variation**: Monthly multipliers (0.9-1.1x)

---

## Analysis Periods

The system supports three analysis periods:

1. **Today**: 00:00:00 to current time (same day)
   - High-resolution data (5-second intervals)
   - ~17,280 readings per day (both loads combined)
   - Focus: Hourly patterns, peak times, real-time anomalies

2. **Month**: 1st of current month to current time
   - Mixed resolution (5s for recent, 30s-2min for older data)
   - ~40,000-60,000 readings per month
   - Focus: Daily trends, weekday vs weekend, cost accumulation

3. **Year**: January 1st to current time
   - Lower resolution for older data (2-5 minute intervals)
   - ~100,000-150,000 readings per year
   - Focus: Monthly trends, seasonal patterns, long-term cost analysis

---

## Current AI Analysis Capabilities

### Energy Report (5 Insight Cards)

**Insight Types**:
1. **Anomaly** (🚨 Red): Unusual patterns, data inconsistencies, unexpected spikes
2. **Recommendation** (💡 Cyan): Actionable energy-saving tips, optimization suggestions
3. **Prediction** (📈 Orange): Future trends, cost projections, usage forecasts
4. **Summary** (📊 Green): Overall statistics, key findings, comparative analysis

**Current Prompt** (Simplified):
```
You are an energy efficiency analyst for a smart home monitoring system.
Analyse this household electricity data for [period] and return EXACTLY 5 insights as a JSON array.
Each insight must have: title (string), body (string, 1-2 sentences with specific numbers), 
type (one of: anomaly | recommendation | prediction | summary).
Return ONLY the JSON array, no other text.

Data: [JSON context object]
```

### Energy Chat (Conversational Q&A)

**Current Prompt** (Simplified):
```
You are an Energy Assistant for a smart home monitoring system.
Answer questions based ONLY on the energy data below.
Be conversational, concise (under 150 words), and reference actual numbers.
If a question is unrelated to energy, say so clearly and offer to help with energy questions.

ENERGY DATA: [JSON context object]
```

---

## Data Context Provided to AI

### Structure of Context Object

```json
{
  "status": "active",
  "period": "today|this month|this year",
  "electricity_rate_inr": 7.0,
  
  "period_data": {
    "energy_kwh": 1.2345,
    "avg_power_w": 45.2,
    "max_power_w": 65.0,
    "cost_inr": 8.64,
    "readings": 17280,
    "start_date": "2026-05-09T00:00:00.000Z",
    "end_date": "2026-05-09T19:30:00.000Z"
  },
  
  "load_breakdown": [
    {
      "load": "Load 1",
      "energy_kwh": 0.2345,
      "avg_power_w": 10.5,
      "max_power_w": 13.0,
      "cost_inr": 1.64,
      "percentage": 19.0
    },
    {
      "load": "Load 2",
      "energy_kwh": 1.0000,
      "avg_power_w": 49.8,
      "max_power_w": 55.0,
      "cost_inr": 7.00,
      "percentage": 81.0
    }
  ],
  
  "latest_reading": {
    "voltage_v": 225.0,
    "current_a": 0.219,
    "power_w": 49.28,
    "temperature": 27.0,
    "smoke_adc": 456,
    "timestamp": "2026-05-09T19:30:00.000Z"
  },
  
  "recent_readings": [
    // Last 20 readings with voltage, current, power, energy, timestamp
  ],
  
  "total_readings": 108000
}
```

---

## What Makes Good Analysis

### Key Insights Users Want

1. **Cost Awareness**:
   - "How much am I spending?"
   - "Which appliance costs more to run?"
   - "Am I on track for my monthly budget?"

2. **Usage Patterns**:
   - "When do I use the most power?"
   - "Are there unusual spikes?"
   - "How does today compare to yesterday/last week?"

3. **Load Comparison**:
   - "Which load dominates consumption?"
   - "Is the power distribution balanced?"
   - "Should I be concerned about one load?"

4. **Actionable Recommendations**:
   - "How can I save money?"
   - "What times should I avoid heavy usage?"
   - "Are there inefficiencies I can fix?"

5. **Safety Concerns**:
   - "Are voltage levels stable?"
   - "Is smoke sensor reading normal?"
   - "Any temperature anomalies?"

### Common Issues to Detect

1. **Data Anomalies**:
   - Zero energy despite non-zero power
   - Negative energy values (calculation errors)
   - Inconsistent aggregated vs individual load data
   - Missing readings (gaps in data)

2. **Usage Anomalies**:
   - Unexpected 24/7 operation (should have off periods)
   - Sudden power spikes (>2x normal)
   - Gradual power increase (appliance degradation)
   - Load imbalance (one load >>90% of total)

3. **Safety Concerns**:
   - Voltage outside 220-230V range
   - Smoke sensor >1000 (danger level)
   - Temperature >35°C (overheating)
   - Humidity >70% (moisture issues)

4. **Cost Concerns**:
   - Daily cost >₹15 (unusually high for 2 small loads)
   - Monthly projection >₹450 (budget alert)
   - Sudden cost increase (>50% vs previous period)

---

## Indian Context & Cultural Considerations

### Electricity Pricing
- Residential tariff: ₹5-10 per kWh (varies by state and slab)
- System uses: ₹7/kWh (mid-range estimate)
- Monthly bills typically: ₹500-2000 for average households
- Peak hours: 6pm-10pm (higher demand, some states have ToD pricing)

### Typical Appliances
- **Load 1 (9-11W)**: LED bulb, phone charger, night light, small fan
- **Load 2 (48-50W)**: Ceiling fan, CFL bulbs, TV, laptop charger, small water pump

### Usage Patterns
- Morning peak: 6am-9am (getting ready for work/school)
- Afternoon dip: 12pm-3pm (many people out)
- Evening peak: 6pm-11pm (family time, cooking, entertainment)
- Night: Minimal usage (only essential appliances)

### Energy Consciousness
- Indians are generally cost-conscious about electricity
- Common practices: switching off lights, using fans instead of AC, unplugging devices
- Growing awareness of energy efficiency and sustainability
- Interest in solar power and renewable energy

---

## Technical Constraints

### AI Model Limitations
- **Model**: Gemini 2.5 Flash
- **Rate Limit**: 20 requests per hour per device
- **Response Format**: Must be valid JSON array for reports
- **Response Length**: Keep insights concise (1-2 sentences, ~50-100 words each)
- **Context Window**: Limited, so data is pre-aggregated

### Data Limitations
- **Historical Data**: Currently ~30 days of generated data
- **Real-time Data**: Only when ESP32 is connected and sending
- **Sensor Accuracy**: ±5% for current, ±2% for voltage
- **Energy Calculation**: Depends on accurate timestamps and power readings

---

## Desired Improvements for Enhanced Prompt

### What We Want the AI to Do Better

1. **More Specific Recommendations**:
   - Instead of: "Consider reducing usage during peak hours"
   - Better: "Load 2 runs continuously from 6pm-11pm (5 hours) costing ₹1.75 daily. Running it for 3 hours instead could save ₹10.50/month"

2. **Contextual Awareness**:
   - Understand that 9-11W is a small load (LED bulb level)
   - Recognize that 48-50W is medium (fan/TV level)
   - Know that these are typical Indian household appliances
   - Adjust expectations based on load size

3. **Pattern Recognition**:
   - Identify normal on/off cycles vs continuous operation
   - Detect gradual degradation (power creep over weeks)
   - Recognize day/night patterns
   - Compare weekday vs weekend usage

4. **Safety Intelligence**:
   - Correlate high temperature with high power usage
   - Flag smoke sensor readings approaching danger levels
   - Warn about voltage instability
   - Suggest preventive maintenance

5. **Cost Optimization**:
   - Calculate potential savings from specific actions
   - Project monthly costs based on current trends
   - Compare current period to previous periods
   - Identify most expensive hours/days

6. **Data Quality Awareness**:
   - Recognize when data might be incomplete
   - Flag calculation inconsistencies
   - Suggest when more data is needed for accurate analysis
   - Acknowledge limitations of short time periods

---

## Example of Good vs Bad Analysis

### ❌ Bad Analysis (Generic, Vague)
```json
{
  "title": "High Energy Consumption Detected",
  "body": "Your energy usage is higher than expected. Consider reducing consumption during peak hours to save money.",
  "type": "recommendation"
}
```

### ✅ Good Analysis (Specific, Actionable)
```json
{
  "title": "Load 2 Evening Usage Drives 65% of Daily Cost",
  "body": "Load 2 (likely a fan or TV) runs continuously from 6pm-11pm consuming 0.25 kWh (₹1.75) daily. Reducing evening usage by 2 hours could save ₹35/month while maintaining comfort during peak usage times.",
  "type": "recommendation"
}
```

### ❌ Bad Analysis (Incorrect Context)
```json
{
  "title": "Extremely Low Power Consumption",
  "body": "Your system is using only 50W on average, which is unusually low. Check if all appliances are functioning properly.",
  "type": "anomaly"
}
```

### ✅ Good Analysis (Correct Context)
```json
{
  "title": "Efficient Load Distribution for Small Appliances",
  "body": "Your two loads (11W LED bulb and 49W fan) show healthy operation with combined average of 35W. This is typical for basic lighting and ventilation, costing approximately ₹245/month at current usage patterns.",
  "type": "summary"
}
```

---

## Summary for Prompt Enhancement

**Key Points to Emphasize**:

1. **System Scale**: Small residential setup (2 loads, 10-50W each, not industrial)
2. **Indian Context**: ₹7/kWh pricing, typical appliances, cost-conscious users
3. **Data Quality**: Be aware of calculation errors, missing data, inconsistencies
4. **Specificity**: Always include actual numbers, costs, and actionable steps
5. **Load Context**: Load 1 = small (bulb), Load 2 = medium (fan/TV)
6. **Safety**: Monitor voltage (220-230V), smoke (<1000), temperature (<35°C)
7. **Patterns**: Expect on/off cycles, not 24/7 operation
8. **Cost Focus**: Users care most about monthly bills and savings potential
9. **Period Awareness**: Adjust analysis depth based on today/month/year
10. **Actionability**: Every recommendation should have a clear action and estimated savings

**Tone**: Professional but friendly, educational, empowering, cost-conscious, safety-aware

**Format**: Concise (1-2 sentences), specific numbers, clear actions, realistic expectations

---

## Current Prompt Location

File: `backend/services/geminiService.js`

**Report Generation Prompt** (Line ~120):
```javascript
const prompt =
  `You are an energy efficiency analyst for a smart home monitoring system.\n` +
  `Analyse this household electricity data for ${periodLabel} and return EXACTLY 5 insights as a JSON array.\n` +
  `Each insight must have: title (string), body (string, 1-2 sentences with specific numbers), ` +
  `type (one of: anomaly | recommendation | prediction | summary).\n` +
  `Return ONLY the JSON array, no other text.\n\n` +
  `Data:\n${JSON.stringify(context, null, 2)}`;
```

**Chat Prompt** (Line ~140):
```javascript
const systemContext =
  `You are an Energy Assistant for a smart home monitoring system.\n` +
  `Answer questions based ONLY on the energy data below.\n` +
  `Be conversational, concise (under 150 words), and reference actual numbers.\n` +
  `If a question is unrelated to energy, say so clearly and offer to help with energy questions.\n\n` +
  `ENERGY DATA:\n${JSON.stringify(context, null, 2)}`;
```

---

**Use this document to generate an enhanced system prompt that produces more accurate, contextual, and actionable AI analysis for Indian residential energy monitoring.**
