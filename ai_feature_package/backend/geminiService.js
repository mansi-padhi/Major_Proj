const { GoogleGenerativeAI } = require('@google/generative-ai');
const Reading = require('../models/Reading');
const AIReport = require('../models/AIReport');

const CACHE_TTL_HOURS = parseInt(process.env.AI_CACHE_TTL_HOURS) || 6;
const RATE_LIMIT = parseInt(process.env.AI_RATE_LIMIT_PER_HOUR) || 20;
const ELECTRICITY_RATE = parseFloat(process.env.ELECTRICITY_RATE) || 7.0;

// Rate limiting: deviceId -> [timestamps]
const rateLimitMap = new Map();

function checkRateLimit(deviceId) {
    const now = Date.now();
    const windowMs = 60 * 60 * 1000;
    const timestamps = (rateLimitMap.get(deviceId) || []).filter(t => now - t < windowMs);
    if (timestamps.length >= RATE_LIMIT) return false;
    timestamps.push(now);
    rateLimitMap.set(deviceId, timestamps);
    return true;
}

async function buildComprehensiveContext(deviceId) {
    const now = new Date();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const deviceFilter = deviceId && deviceId !== 'default' ? { deviceId } : {};

    // Get only essential data to reduce token usage
    const totalReadings = await Reading.countDocuments(deviceFilter);

    if (totalReadings === 0) {
        return {
            status: 'no_data',
            message: 'No energy data available yet. Connect your ESP32 to start monitoring.',
            total_readings: 0
        };
    }

    // Get basic summary only (reduced data)
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const [todayStats, weekStats, latestReading] = await Promise.all([
        Reading.aggregate([
            { $match: { ...deviceFilter, timestamp: { $gte: todayStart } } },
            {
                $group: {
                    _id: null,
                    energy: { $sum: '$energy' },
                    avgPower: { $avg: '$power' },
                    maxPower: { $max: '$power' },
                    count: { $sum: 1 }
                }
            }
        ]),
        Reading.aggregate([
            { $match: { ...deviceFilter, timestamp: { $gte: sevenDaysAgo } } },
            {
                $group: {
                    _id: null,
                    energy: { $sum: '$energy' },
                    avgPower: { $avg: '$power' },
                    maxPower: { $max: '$power' },
                    count: { $sum: 1 }
                }
            }
        ]),
        Reading.findOne(deviceFilter).sort({ timestamp: -1 })
    ]);

    const ELECTRICITY_RATE = parseFloat(process.env.ELECTRICITY_RATE) || 7.0;

    // Get recent individual readings for detailed analysis
    const recentReadings = await Reading.find(deviceFilter)
        .sort({ timestamp: -1 })
        .limit(20)  // Last 20 readings
        .select('voltage current power energy timestamp loadId loadName');

    return {
        status: 'active',
        electricity_rate: ELECTRICITY_RATE,
        today: {
            energy_kwh: todayStats[0]?.energy || 0,
            avg_power_w: todayStats[0]?.avgPower || 0,
            max_power_w: todayStats[0]?.maxPower || 0,
            cost_inr: ((todayStats[0]?.energy || 0) * ELECTRICITY_RATE).toFixed(2),
            readings: todayStats[0]?.count || 0
        },
        week: {
            energy_kwh: weekStats[0]?.energy || 0,
            avg_power_w: weekStats[0]?.avgPower || 0,
            max_power_w: weekStats[0]?.maxPower || 0,
            cost_inr: ((weekStats[0]?.energy || 0) * ELECTRICITY_RATE).toFixed(2),
            readings: weekStats[0]?.count || 0
        },
        latest: latestReading ? {
            power_w: latestReading.power,
            voltage_v: latestReading.voltage,
            current_a: latestReading.current,
            timestamp: latestReading.timestamp
        } : null,
        recent_readings: recentReadings.map(r => ({
            voltage_v: r.voltage,
            current_a: r.current,
            power_w: r.power,
            energy_kwh: r.energy,
            load: r.loadName || r.loadId,
            timestamp: r.timestamp
        })),
        total_readings: totalReadings
    };
}

async function analyzeData(deviceId = 'default') {
    if (!checkRateLimit(deviceId)) {
        throw new Error('Rate limit exceeded. Max 20 AI requests per hour.');
    }

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_GEMINI_API_KEY not configured in .env');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    const context = await buildComprehensiveContext(deviceId);

    const prompt = `You are an expert energy analyst. Analyze the following comprehensive energy consumption data and provide:

1. **Executive Summary** - Overall energy consumption patterns and key metrics
2. **Load Analysis** - Which appliances/loads consume the most energy and why
3. **Peak Usage Patterns** - When peak consumption occurs and recommendations
4. **Cost Analysis** - Monthly cost trends and savings opportunities
5. **Anomalies & Concerns** - Any unusual patterns or potential issues
6. **Optimization Recommendations** - Specific, actionable steps to reduce consumption
7. **Trend Analysis** - Month-over-month changes and predictions

Data:
${JSON.stringify(context, null, 2)}

Provide a detailed, professional analysis with specific numbers and percentages from the data. Format your response with clear sections and bullet points.`;

    const result = await model.generateContent(prompt);
    const analysis = result.response.text();

    return {
        analysis,
        context,
        generatedAt: new Date(),
        deviceId
    };
}

async function chatWithAnalysis(message, history = [], deviceId = 'default') {
    if (!checkRateLimit(deviceId)) {
        throw new Error('Rate limit exceeded. Max 20 AI requests per hour.');
    }

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_GEMINI_API_KEY not configured in .env');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    const context = await buildComprehensiveContext(deviceId);

    const systemPrompt = `You are an Energy Assistant AI for a smart energy monitoring system. Your primary purpose is to help users understand and optimize their electricity consumption.

CORE RESPONSIBILITIES:
1. ALWAYS answer questions about:
   - Electricity consumption and usage patterns
   - Energy costs and billing analysis
   - Peak usage times and trends
   - Appliance energy usage breakdown
   - Energy saving recommendations
   - Monthly/daily energy statistics
   - Power consumption analysis
   - Load monitoring and optimization

2. HANDLE AMBIGUOUS QUESTIONS intelligently:
   - If someone asks about "data" or "usage" - assume they mean ENERGY data/usage
   - If someone asks about "consumption" - assume they mean ELECTRICITY consumption
   - If someone asks about "costs" - assume they mean ELECTRICITY costs
   - Always try to provide helpful energy-related information

3. REFUSE ONLY clearly non-energy topics:
   - Politics, religion, sports, entertainment
   - General knowledge completely unrelated to energy
   - Personal advice unrelated to energy or home management

4. WHEN REFUSING, be helpful:
   - Say: "I specialize in energy-related questions. I can help you with electricity consumption, costs, usage patterns, or energy optimization tips. What would you like to know about your energy usage?"

5. RESPONSE GUIDELINES:
   - Always reference actual data from the user's energy monitoring system when available
   - Be conversational and helpful, not robotic
   - Keep responses under 200 words unless detailed analysis is requested
   - If no data is available, provide general energy advice and mention that real insights will be available once the ESP32 starts sending data

AVAILABLE ENERGY DATA:
${JSON.stringify(context, null, 2)}`;

    // Build conversation history
    const messages = [];
    const recentHistory = history.slice(-10);
    for (const h of recentHistory) {
        messages.push({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: h.content }]
        });
    }

    // Start a chat session with user-friendly system prompt
    const chat = model.startChat({
        history: [
            {
                role: 'user',
                parts: [{ text: 'You are an Energy Assistant for a smart home energy monitoring system. Help users understand their electricity usage and costs. NEVER mention technical details like ESP32, hardware, sensors, or system setup. ALWAYS use the actual energy data provided to you - if you have real voltage, current, and power readings, analyze them directly. Only mention "collecting initial readings" if the status is explicitly "no_data".' }]
            },
            {
                role: 'model',
                parts: [{ text: 'I understand. I am your Energy Assistant. I will analyze your actual energy data when available and provide specific insights based on your real consumption patterns, voltage readings, and power usage.' }]
            },
            ...messages
        ],
        generationConfig: {
            maxOutputTokens: 1024,
        }
    });

    // Include context in user-friendly way
    let contextMessage = message;
    if (context.status === 'no_data') {
        contextMessage += `\n\nNOTE: The monitoring system is still collecting initial readings. Provide general energy advice and mention that detailed analysis will be available once more data is collected. Do NOT mention ESP32 or hardware.`;
    } else {
        contextMessage += `\n\nIMPORTANT: You have REAL energy data available. Status: ${context.status}. Total readings: ${context.total_readings}. Use this actual data in your response:\n${JSON.stringify(context, null, 2)}`;
    }

    const response = await chat.sendMessage(contextMessage);
    const reply = response.response.text();

    return {
        reply,
        timestamp: new Date(),
        deviceId
    };
}

async function generateDetailedReport(deviceId = 'default') {
    if (!checkRateLimit(deviceId)) {
        throw new Error('Rate limit exceeded. Max 20 AI requests per hour.');
    }

    // Check cache
    const cacheExpiry = new Date(Date.now() - CACHE_TTL_HOURS * 60 * 60 * 1000);
    const cached = await AIReport.findOne({
        deviceId,
        generatedAt: { $gte: cacheExpiry },
        source: 'gemini'
    }).sort({ generatedAt: -1 });

    if (cached) {
        return {
            report: cached.insights,
            cachedAt: cached.generatedAt,
            fromCache: true
        };
    }

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_GEMINI_API_KEY not configured in .env');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    const context = await buildComprehensiveContext(deviceId);

    const prompt = `Generate a comprehensive energy analysis report with the following structure in JSON format:
{
  "title": "Energy Consumption Analysis Report",
  "summary": "Brief overview",
  "sections": [
    {
      "title": "section title",
      "insights": ["insight 1", "insight 2", ...]
    }
  ],
  "recommendations": ["recommendation 1", "recommendation 2", ...],
  "metrics": {
    "key": "value"
  }
}

Data to analyze:
${JSON.stringify(context, null, 2)}

Provide actionable insights with specific numbers from the data.`;

    const result = await model.generateContent(prompt);
    let report;

    try {
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        report = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch (e) {
        report = {
            title: 'Energy Analysis Report',
            summary: result.response.text(),
            sections: [],
            recommendations: [],
            metrics: {}
        };
    }

    // Cache the result
    await AIReport.create({
        deviceId,
        insights: report,
        source: 'gemini'
    });

    return {
        report,
        cachedAt: new Date(),
        fromCache: false
    };
}

module.exports = {
    analyzeData,
    chatWithAnalysis,
    generateDetailedReport,
    buildComprehensiveContext
};
