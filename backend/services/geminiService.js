const { GoogleGenerativeAI } = require('@google/generative-ai');
const Reading   = require('../models/Reading');
const AIReport  = require('../models/AIReport');

const CACHE_TTL_HOURS  = parseInt(process.env.AI_CACHE_TTL_HOURS)    || 6;
const RATE_LIMIT       = parseInt(process.env.AI_RATE_LIMIT_PER_HOUR) || 20;
const ELECTRICITY_RATE = parseFloat(process.env.ELECTRICITY_RATE)     || 8.0;

// Per-device rate limiting: deviceId → [timestamps]
const rateLimitMap = new Map();

function checkRateLimit(deviceId) {
    const now       = Date.now();
    const windowMs  = 60 * 60 * 1000;
    const timestamps = (rateLimitMap.get(deviceId) || []).filter(t => now - t < windowMs);
    if (timestamps.length >= RATE_LIMIT) return false;
    timestamps.push(now);
    rateLimitMap.set(deviceId, timestamps);
    return true;
}

// ── Detect time range from user message ──────────────────────────────────────
function detectTimeRange(message) {
    const msg = message.toLowerCase();
    
    // Explicit time mentions
    if (msg.match(/yesterday|last day/)) return 'yesterday';
    if (msg.match(/last week|this week|past week|7 days|week/)) return 'week';
    if (msg.match(/last month|this month/)) return 'month';
    if (msg.match(/this year|last year|annual|yearly/)) return 'year';
    if (msg.match(/all time|total|overall|entire|everything/)) return 'all';
    
    // Question type inference
    if (msg.match(/average|typical|usual/)) return 'month';
    if (msg.match(/trend|pattern|history/)) return 'month';
    if (msg.match(/highest|lowest|peak|minimum/)) return 'month';
    
    // Default to today
    return 'today';
}

// ── Build context object sent to Gemini based on selected period ─────────────
async function buildComprehensiveContext(deviceId, period = 'today') {
    const now          = new Date();
    const deviceFilter = deviceId && deviceId !== 'default' ? { deviceId } : {};

    const totalReadings = await Reading.countDocuments(deviceFilter);
    if (totalReadings === 0) {
        return {
            status: 'no_data',
            message: 'No energy data available yet.',
            total_readings: 0
        };
    }

    // Determine date range based on period
    let startDate, endDate = now;
    let periodLabel = '';
    
    if (period === 'yesterday') {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        const yesterdayEnd = new Date(yesterday);
        yesterdayEnd.setHours(23, 59, 59, 999);
        startDate = yesterday;
        endDate = yesterdayEnd;
        periodLabel = 'yesterday';
    } else if (period === 'today') {
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        periodLabel = 'today';
    } else if (period === 'week') {
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        periodLabel = 'last 7 days';
    } else if (period === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        periodLabel = 'this month';
    } else if (period === 'year') {
        startDate = new Date(now.getFullYear(), 0, 1);
        periodLabel = 'this year';
    } else if (period === 'all') {
        // Get earliest reading
        const earliest = await Reading.findOne(deviceFilter)
            .sort({ timestamp: 1 })
            .select('timestamp');
        startDate = earliest ? earliest.timestamp : new Date(now);
        periodLabel = 'all time';
    } else {
        // Default to today
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        periodLabel = 'today';
    }

    const [periodStats, loadBreakdown, latestReading, recentReadings] =
        await Promise.all([
            // Period summary
            Reading.aggregate([
                { $match: { ...deviceFilter, timestamp: { $gte: startDate, $lte: endDate } } },
                { $group: { _id: null, energy: { $sum: '$energy' }, avgPower: { $avg: '$power' }, maxPower: { $max: '$power' }, count: { $sum: 1 } } }
            ]),
            // Per-load breakdown for the period
            Reading.aggregate([
                { $match: { ...deviceFilter, timestamp: { $gte: startDate, $lte: endDate } } },
                { $group: { _id: '$loadId', loadName: { $first: '$loadName' }, totalEnergy: { $sum: '$energy' }, avgPower: { $avg: '$power' }, maxPower: { $max: '$power' }, count: { $sum: 1 } } },
                { $sort: { totalEnergy: -1 } }
            ]),
            // Latest reading
            Reading.findOne(deviceFilter).sort({ timestamp: -1 }),
            // Last 20 readings for pattern analysis
            Reading.find({ ...deviceFilter, timestamp: { $gte: startDate, $lte: endDate } })
                .sort({ timestamp: -1 }).limit(20)
                .select('voltage current power energy timestamp loadId loadName temperature smokeLevel')
        ]);

    const totalPeriodEnergy = periodStats[0]?.energy || 0;

    return {
        status: 'active',
        period: periodLabel,
        electricity_rate_inr: ELECTRICITY_RATE,
        period_data: {
            energy_kwh: parseFloat((periodStats[0]?.energy || 0).toFixed(4)),
            avg_power_w: parseFloat((periodStats[0]?.avgPower || 0).toFixed(1)),
            max_power_w: parseFloat((periodStats[0]?.maxPower || 0).toFixed(1)),
            cost_inr:    parseFloat(((periodStats[0]?.energy || 0) * ELECTRICITY_RATE).toFixed(2)),
            readings:    periodStats[0]?.count || 0,
            start_date:  startDate.toISOString(),
            end_date:    endDate.toISOString()
        },
        load_breakdown: loadBreakdown.map(l => ({
            load: l.loadName || l._id,
            energy_kwh: parseFloat(l.totalEnergy.toFixed(4)),
            avg_power_w: parseFloat(l.avgPower.toFixed(1)),
            max_power_w: parseFloat(l.maxPower.toFixed(1)),
            cost_inr: parseFloat((l.totalEnergy * ELECTRICITY_RATE).toFixed(2)),
            percentage: totalPeriodEnergy > 0
                ? parseFloat(((l.totalEnergy / totalPeriodEnergy) * 100).toFixed(1))
                : 0
        })),
        latest_reading: latestReading ? {
            voltage_v:   latestReading.voltage,
            current_a:   latestReading.current,
            power_w:     latestReading.power,
            temperature: latestReading.temperature,
            smoke_adc:   latestReading.smokeLevel,
            timestamp:   latestReading.timestamp
        } : null,
        recent_readings: recentReadings.map(r => ({
            load:        r.loadName || r.loadId,
            voltage_v:   r.voltage,
            current_a:   r.current,
            power_w:     r.power,
            energy_kwh:  r.energy,
            timestamp:   r.timestamp
        })),
        total_readings: totalReadings
    };
}

function getModel() {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_google_gemini_api_key_here') {
        throw new Error('GOOGLE_GEMINI_API_KEY not configured in .env');
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
}

// ── POST /api/ai/report — 5 structured insight cards (NO CACHING, REAL-TIME) ─
async function generateDetailedReport(deviceId = 'default', period = 'today') {
    if (!checkRateLimit(deviceId)) {
        throw new Error('Rate limit exceeded. Max 20 AI requests per hour.');
    }

    const model   = getModel();
    const context = await buildComprehensiveContext(deviceId, period);

    if (context.status === 'no_data') {
        return {
            insights: [{
                title: 'No Data Available',
                body: 'Connect your ESP32 and start monitoring to generate insights.',
                type: 'summary'
            }]
        };
    }

    const periodLabel = context.period || 'today';
    
    // Enhanced prompt with Indian residential context
    const prompt = `You are an expert energy efficiency analyst for a small Indian residential smart-home system.

SYSTEM CONTEXT (read carefully before analysing):
- Two loads only. Load 1 is a small appliance (~9–11 W, e.g. LED bulb or phone charger). Load 2 is a medium appliance (~48–50 W, e.g. ceiling fan, CFL bulbs, or small TV).
- Electricity rate: ₹7 per kWh. Monthly bills for this system typically range ₹210–₹315.
- Voltage standard: 220–230 V AC (Indian grid). Safe range: 207–253 V.
- Smoke sensor ADC safe <600, warning 600–1000, danger >1000.
- Temperature safe <35 °C; humidity safe <70 % RH.
- Normal usage pattern: loads cycle ON/OFF — not 24/7 continuous. Load 1 mostly active 6 am–11 pm; Load 2 active 7 am–10 pm with more intermittent gaps.
- Sensor accuracy: ±5 % current, ±2 % voltage. Small discrepancies are noise, not anomalies.

ANALYSIS PERIOD: ${periodLabel}
- today → focus on hourly patterns, peak hours, real-time spikes, today's projected cost
- this month → focus on daily trends, weekday vs weekend, cost trajectory, monthly projection
- this year → focus on monthly trends, seasonal variation, long-term cost analysis

TASK:
Analyse the energy data below and return EXACTLY 5 insights as a JSON array.

INSIGHT REQUIREMENTS:
1. Every insight MUST reference actual numbers from the data (watts, kWh, ₹, %, hours).
2. Every recommendation MUST include a concrete action AND an estimated monthly saving in ₹.
3. Every prediction MUST include a projected value (cost, kWh) and the timeframe.
4. Every anomaly MUST explain why it is unusual given the system scale and normal patterns.
5. Every summary MUST compare both loads and give a bottom-line cost figure.
6. Do NOT flag low wattage (10–50 W combined) as inherently problematic — this is a small system.
7. If data seems incomplete or the period is very short (<2 hours), note the limitation and still provide best-effort insights.
8. Cost calculations: Energy (kWh) × 7 = cost in ₹. Always verify your own arithmetic.

JSON SCHEMA (return ONLY this array, no markdown, no extra text):
[
  {
    "title": "string — specific, under 10 words, includes a key number",
    "body": "string — 1–2 sentences, cites actual data values, actionable or explanatory",
    "type": "anomaly | recommendation | prediction | summary"
  }
]

INSIGHT TYPE GUIDE:
- anomaly 🚨 → unusual voltage, smoke spike, power creep, 24/7 operation with no off-cycles, data gaps
- recommendation 💡 → specific time-shift, usage reduction, or scheduling tip WITH ₹ saving estimate
- prediction 📈 → projected monthly/annual cost or kWh based on current rate of consumption
- summary 📊 → load-level breakdown, combined stats, cost-per-load comparison

DATA:
${JSON.stringify(context, null, 2)}`;

    const result = await model.generateContent(prompt);
    const text   = result.response.text();

    let insights;
    try {
        const match = text.match(/\[[\s\S]*\]/);
        insights = JSON.parse(match ? match[0] : text);
    } catch {
        // Fallback: wrap raw text as a single summary card
        insights = [{ title: 'Energy Analysis', body: text, type: 'summary' }];
    }

    return { insights };
}

// ── POST /api/ai/chat — conversational Q&A with context ──────────────────────
async function chatWithAnalysis(message, history = [], deviceId = 'default') {
    if (!checkRateLimit(deviceId)) {
        throw new Error('Rate limit exceeded. Max 20 AI requests per hour.');
    }

    const model   = getModel();
    
    // Simple time range detection - default to 'today' for better performance
    const timeRange = detectTimeRange(message);
    const context = await buildComprehensiveContext(deviceId, timeRange);

    const systemContext = `You are an Energy Assistant for a small Indian residential smart-home monitoring system.

SYSTEM CONTEXT:
- Two loads: Load 1 (~9–11 W, LED bulb/charger), Load 2 (~48–50 W, fan/CFL/TV)
- Electricity rate: ₹7 per kWh
- Voltage: 220–230 V AC (Indian grid)
- This is a SMALL system — 10–50 W combined is normal and efficient
- Loads cycle ON/OFF throughout the day

RESPONSE GUIDELINES:
1. Answer the user's question using the data provided below
2. ALWAYS use actual numbers (watts, kWh, ₹, %, hours)
3. Be specific about time periods when answering
4. For costs: Show breakdown (Load 1: ₹X, Load 2: ₹Y, Total: ₹Z)
5. For comparisons: Use percentages
6. For savings: Give specific actions with ₹ estimates
7. Be conversational and complete your response (2-3 sentences)
8. Use Indian terms: "fan", "bulb", "TV", "charger"
9. Never flag low wattage (10-50W) as problematic

SAFETY THRESHOLDS:
- Voltage: Safe 220-230V, Warning <207V or >253V
- Smoke: Safe <600, Warning 600-1000, Danger >1000
- Temperature: Safe <35°C, Warning >35°C

AVAILABLE DATA:
${JSON.stringify(context, null, 2)}`;

    // Build Gemini chat history (last 10 messages)
    const chatHistory = [
        { role: 'user',  parts: [{ text: systemContext }] },
        { role: 'model', parts: [{ text: 'Understood. I\'m ready to help you understand your energy usage. Ask me anything about your consumption, costs, or how to save money!' }] },
        ...history.slice(-10).map(h => ({
            role:  h.role === 'user' ? 'user' : 'model',
            parts: [{ text: h.content }]
        }))
    ];

    const chat  = model.startChat({ history: chatHistory, generationConfig: { maxOutputTokens: 1024 } });
    const resp  = await chat.sendMessage(message);
    const reply = resp.response.text();

    return { reply, timestamp: new Date() };
}

module.exports = { generateDetailedReport, chatWithAnalysis, buildComprehensiveContext, detectTimeRange };
