const Anthropic = require('@anthropic-ai/sdk');
const Reading = require('../models/Reading');
const AIReport = require('../models/AIReport');

const CACHE_TTL_HOURS = parseInt(process.env.AI_CACHE_TTL_HOURS) || 6;
const RATE_LIMIT = parseInt(process.env.AI_RATE_LIMIT_PER_HOUR) || 10;
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

async function buildContext(deviceId) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const deviceFilter = deviceId && deviceId !== 'default' ? { deviceId } : {};

    // Last 30 days daily summaries
    const dailySummaries = await Reading.aggregate([
        { $match: { ...deviceFilter, timestamp: { $gte: thirtyDaysAgo } } },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
                energy_kwh: { $sum: '$energy' },
                peak_power_w: { $max: '$power' },
                avg_power_w: { $avg: '$power' }
            }
        },
        { $sort: { _id: 1 } },
        {
            $project: {
                date: '$_id',
                energy_kwh: { $round: ['$energy_kwh', 4] },
                peak_power_w: { $round: ['$peak_power_w', 1] },
                cost_inr: { $round: [{ $multiply: ['$energy_kwh', ELECTRICITY_RATE] }, 2] },
                _id: 0
            }
        }
    ]);

    // Load breakdown
    const loadBreakdown = await Reading.aggregate([
        { $match: { ...deviceFilter, timestamp: { $gte: thirtyDaysAgo } } },
        {
            $group: {
                _id: '$loadName',
                total_energy_kwh: { $sum: '$energy' },
                avg_power_w: { $avg: '$power' }
            }
        }
    ]);
    const totalEnergy = loadBreakdown.reduce((s, l) => s + l.total_energy_kwh, 0);
    const loads = loadBreakdown.map(l => ({
        name: l._id,
        total_energy_kwh: parseFloat(l.total_energy_kwh.toFixed(4)),
        avg_power_w: parseFloat(l.avg_power_w.toFixed(1)),
        percentage: totalEnergy > 0 ? parseFloat(((l.total_energy_kwh / totalEnergy) * 100).toFixed(1)) : 0
    }));

    // Hourly pattern
    const hourlyPattern = await Reading.aggregate([
        { $match: { ...deviceFilter, timestamp: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { $hour: '$timestamp' }, avg_power_w: { $avg: '$power' } } },
        { $sort: { _id: 1 } },
        { $project: { hour: '$_id', avg_power_w: { $round: ['$avg_power_w', 1] }, _id: 0 } }
    ]);

    // Current vs last month cost
    const [currentMonthStats, lastMonthStats] = await Promise.all([
        Reading.aggregate([
            { $match: { ...deviceFilter, timestamp: { $gte: startOfMonth } } },
            { $group: { _id: null, energy: { $sum: '$energy' } } }
        ]),
        Reading.aggregate([
            { $match: { ...deviceFilter, timestamp: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
            { $group: { _id: null, energy: { $sum: '$energy' } } }
        ])
    ]);

    const currentMonthEnergy = currentMonthStats[0]?.energy || 0;
    const lastMonthEnergy = lastMonthStats[0]?.energy || 0;

    // Latest reading
    const latest = await Reading.findOne(deviceFilter).sort({ timestamp: -1 });

    return {
        period: 'last 30 days',
        electricity_rate_inr_per_kwh: ELECTRICITY_RATE,
        daily_summaries: dailySummaries,
        load_breakdown: loads,
        hourly_pattern: hourlyPattern,
        cost_comparison: {
            current_month_energy_kwh: parseFloat(currentMonthEnergy.toFixed(4)),
            current_month_cost_inr: parseFloat((currentMonthEnergy * ELECTRICITY_RATE).toFixed(2)),
            last_month_energy_kwh: parseFloat(lastMonthEnergy.toFixed(4)),
            last_month_cost_inr: parseFloat((lastMonthEnergy * ELECTRICITY_RATE).toFixed(2))
        },
        latest_reading: latest ? {
            voltage: latest.voltage,
            current: latest.current,
            power: latest.power,
            timestamp: latest.timestamp
        } : null,
        total_readings: await Reading.countDocuments(deviceFilter)
    };
}

async function generateReport(deviceId = 'default') {
    if (!checkRateLimit(deviceId)) {
        throw new Error('Rate limit exceeded. Max 10 AI requests per hour.');
    }

    // Check cache
    const cacheExpiry = new Date(Date.now() - CACHE_TTL_HOURS * 60 * 60 * 1000);
    const cached = await AIReport.findOne({
        deviceId,
        generatedAt: { $gte: cacheExpiry }
    }).sort({ generatedAt: -1 });

    if (cached) {
        return { insights: cached.insights, cachedAt: cached.generatedAt, fromCache: true };
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured in .env');

    const client = new Anthropic({ apiKey });
    const context = await buildContext(deviceId);

    const response = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        system: 'You are an energy efficiency analyst. Analyse this household electricity data and return exactly 5 insights as a JSON array: [{title, body, type}]. Types must be one of: anomaly, recommendation, prediction, summary. Be specific, data-driven, and concise. Reference actual numbers from the data. Do not add any text outside the JSON array.',
        messages: [{
            role: 'user',
            content: `Analyse this energy data and return 5 insights as JSON:\n${JSON.stringify(context, null, 2)}`
        }]
    });

    let insights;
    try {
        const text = response.content[0].text.trim();
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        insights = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch (e) {
        throw new Error('Failed to parse AI response as JSON');
    }

    // Cache the result
    await AIReport.create({ deviceId, insights });

    return { insights, cachedAt: new Date(), fromCache: false };
}

async function chat(message, history = [], deviceId = 'default') {
    if (!checkRateLimit(deviceId)) {
        throw new Error('Rate limit exceeded. Max 10 AI requests per hour.');
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured in .env');

    const client = new Anthropic({ apiKey });
    const context = await buildContext(deviceId);

    const systemPrompt = `You are an energy assistant for a smart home monitoring system. You have access to the user's electricity consumption data shown below. Answer questions based only on this data. Be conversational, concise, and precise. If a question cannot be answered from the data, say so clearly.\n\nDATA:\n${JSON.stringify(context, null, 2)}`;

    // Build message history (last 5 exchanges)
    const messages = [];
    const recentHistory = history.slice(-10); // last 5 pairs
    for (const h of recentHistory) {
        messages.push({ role: h.role, content: h.content });
    }
    messages.push({ role: 'user', content: message });

    const response = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 512,
        system: systemPrompt,
        messages
    });

    return response.content[0].text;
}

module.exports = { generateReport, chat, buildContext };
