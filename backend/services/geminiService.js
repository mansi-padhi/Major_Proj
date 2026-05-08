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

// ── Build context object sent to Gemini on every request ─────────────────────
async function buildComprehensiveContext(deviceId) {
    const now          = new Date();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const deviceFilter = deviceId && deviceId !== 'default' ? { deviceId } : {};

    const totalReadings = await Reading.countDocuments(deviceFilter);
    if (totalReadings === 0) {
        return {
            status: 'no_data',
            message: 'No energy data available yet.',
            total_readings: 0
        };
    }

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const [todayStats, weekStats, monthStats, loadBreakdown, latestReading, recentReadings] =
        await Promise.all([
            // Today summary
            Reading.aggregate([
                { $match: { ...deviceFilter, timestamp: { $gte: todayStart } } },
                { $group: { _id: null, energy: { $sum: '$energy' }, avgPower: { $avg: '$power' }, maxPower: { $max: '$power' }, count: { $sum: 1 } } }
            ]),
            // 7-day summary
            Reading.aggregate([
                { $match: { ...deviceFilter, timestamp: { $gte: sevenDaysAgo } } },
                { $group: { _id: null, energy: { $sum: '$energy' }, avgPower: { $avg: '$power' }, maxPower: { $max: '$power' }, count: { $sum: 1 } } }
            ]),
            // 30-day summary
            Reading.aggregate([
                { $match: { ...deviceFilter, timestamp: { $gte: thirtyDaysAgo } } },
                { $group: { _id: null, energy: { $sum: '$energy' }, avgPower: { $avg: '$power' }, maxPower: { $max: '$power' }, count: { $sum: 1 } } }
            ]),
            // Per-load breakdown (30 days)
            Reading.aggregate([
                { $match: { ...deviceFilter, timestamp: { $gte: thirtyDaysAgo } } },
                { $group: { _id: '$loadId', loadName: { $first: '$loadName' }, totalEnergy: { $sum: '$energy' }, avgPower: { $avg: '$power' }, maxPower: { $max: '$power' }, count: { $sum: 1 } } },
                { $sort: { totalEnergy: -1 } }
            ]),
            // Latest reading
            Reading.findOne(deviceFilter).sort({ timestamp: -1 }),
            // Last 20 readings for pattern analysis
            Reading.find(deviceFilter).sort({ timestamp: -1 }).limit(20)
                .select('voltage current power energy timestamp loadId loadName temperature smokeLevel')
        ]);

    const totalMonthEnergy = monthStats[0]?.energy || 0;

    return {
        status: 'active',
        electricity_rate_inr: ELECTRICITY_RATE,
        today: {
            energy_kwh: parseFloat((todayStats[0]?.energy || 0).toFixed(4)),
            avg_power_w: parseFloat((todayStats[0]?.avgPower || 0).toFixed(1)),
            max_power_w: parseFloat((todayStats[0]?.maxPower || 0).toFixed(1)),
            cost_inr:    parseFloat(((todayStats[0]?.energy || 0) * ELECTRICITY_RATE).toFixed(2)),
            readings:    todayStats[0]?.count || 0
        },
        last_7_days: {
            energy_kwh: parseFloat((weekStats[0]?.energy || 0).toFixed(4)),
            avg_power_w: parseFloat((weekStats[0]?.avgPower || 0).toFixed(1)),
            max_power_w: parseFloat((weekStats[0]?.maxPower || 0).toFixed(1)),
            cost_inr:    parseFloat(((weekStats[0]?.energy || 0) * ELECTRICITY_RATE).toFixed(2))
        },
        last_30_days: {
            energy_kwh: parseFloat(totalMonthEnergy.toFixed(4)),
            avg_power_w: parseFloat((monthStats[0]?.avgPower || 0).toFixed(1)),
            max_power_w: parseFloat((monthStats[0]?.maxPower || 0).toFixed(1)),
            cost_inr:    parseFloat((totalMonthEnergy * ELECTRICITY_RATE).toFixed(2))
        },
        load_breakdown: loadBreakdown.map(l => ({
            load: l.loadName || l._id,
            energy_kwh: parseFloat(l.totalEnergy.toFixed(4)),
            avg_power_w: parseFloat(l.avgPower.toFixed(1)),
            max_power_w: parseFloat(l.maxPower.toFixed(1)),
            cost_inr: parseFloat((l.totalEnergy * ELECTRICITY_RATE).toFixed(2)),
            percentage: totalMonthEnergy > 0
                ? parseFloat(((l.totalEnergy / totalMonthEnergy) * 100).toFixed(1))
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

// ── POST /api/ai/report — 5 structured insight cards with caching ─────────────
async function generateDetailedReport(deviceId = 'default') {
    if (!checkRateLimit(deviceId)) {
        throw new Error('Rate limit exceeded. Max 20 AI requests per hour.');
    }

    // Return cached report if < CACHE_TTL_HOURS old
    const cacheExpiry = new Date(Date.now() - CACHE_TTL_HOURS * 60 * 60 * 1000);
    const cached = await AIReport.findOne({
        deviceId,
        generatedAt: { $gte: cacheExpiry },
        source: 'gemini'
    }).sort({ generatedAt: -1 });

    if (cached) {
        return { insights: cached.insights, cachedAt: cached.generatedAt, fromCache: true };
    }

    const model   = getModel();
    const context = await buildComprehensiveContext(deviceId);

    if (context.status === 'no_data') {
        return {
            insights: [{
                title: 'No Data Available',
                body: 'Connect your ESP32 and start monitoring to generate insights.',
                type: 'summary'
            }],
            fromCache: false
        };
    }

    const prompt =
        `You are an energy efficiency analyst for a smart home monitoring system.\n` +
        `Analyse this household electricity data and return EXACTLY 5 insights as a JSON array.\n` +
        `Each insight must have: title (string), body (string, 1-2 sentences with specific numbers), ` +
        `type (one of: anomaly | recommendation | prediction | summary).\n` +
        `Return ONLY the JSON array, no other text.\n\n` +
        `Data:\n${JSON.stringify(context, null, 2)}`;

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

    // Cache result
    await AIReport.create({ deviceId, insights, source: 'gemini', generatedAt: new Date() });

    return { insights, fromCache: false };
}

// ── POST /api/ai/chat — conversational Q&A with context ──────────────────────
async function chatWithAnalysis(message, history = [], deviceId = 'default') {
    if (!checkRateLimit(deviceId)) {
        throw new Error('Rate limit exceeded. Max 20 AI requests per hour.');
    }

    const model   = getModel();
    const context = await buildComprehensiveContext(deviceId);

    const systemContext =
        `You are an Energy Assistant for a smart home monitoring system.\n` +
        `Answer questions based ONLY on the energy data below.\n` +
        `Be conversational, concise (under 150 words), and reference actual numbers.\n` +
        `If a question is unrelated to energy, say so clearly and offer to help with energy questions.\n\n` +
        `ENERGY DATA:\n${JSON.stringify(context, null, 2)}`;

    // Build Gemini chat history (last 10 messages)
    const chatHistory = [
        { role: 'user',  parts: [{ text: systemContext }] },
        { role: 'model', parts: [{ text: 'Understood. I am ready to answer questions about your energy data.' }] },
        ...history.slice(-10).map(h => ({
            role:  h.role === 'user' ? 'user' : 'model',
            parts: [{ text: h.content }]
        }))
    ];

    const chat  = model.startChat({ history: chatHistory, generationConfig: { maxOutputTokens: 512 } });
    const resp  = await chat.sendMessage(message);
    const reply = resp.response.text();

    return { reply, timestamp: new Date() };
}

module.exports = { generateDetailedReport, chatWithAnalysis, buildComprehensiveContext };
