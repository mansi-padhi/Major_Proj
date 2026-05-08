const TelegramBot = require('node-telegram-bot-api');
const Subscriber  = require('../models/Subscriber');
const RelayState  = require('../models/RelayState');

const BOT_TOKEN   = process.env.TELEGRAM_BOT_TOKEN;
const RATE        = parseFloat(process.env.ELECTRICITY_RATE) || 8.0;
const COOLDOWN_MS = (parseInt(process.env.ALERT_COOLDOWN_MINUTES) || 5) * 60 * 1000;

const cooldownMap = new Map(); // type → last sent timestamp

let bot = null;

function initBot() {
    if (!BOT_TOKEN || BOT_TOKEN === 'your_telegram_bot_token_here') {
        console.log('⚠️  TELEGRAM_BOT_TOKEN not set — Telegram notifications disabled');
        return;
    }

    try {
        bot = new TelegramBot(BOT_TOKEN, { polling: true });
        console.log('✅ Telegram bot initialized');

        // ── /start — subscribe ────────────────────────────────────────────────
        bot.onText(/\/start/, async (msg) => {
            const chatId = msg.chat.id;
            try {
                await Subscriber.findOneAndUpdate(
                    { chat_id: String(chatId) },
                    { active: true, subscribedAt: new Date() },
                    { upsert: true }
                );
                bot.sendMessage(chatId,
                    '⚡ *Smart Energy Monitor*\n\nYou are now subscribed to alerts\\!\n\n' +
                    '*Commands:*\n' +
                    '/status — current sensor readings\n' +
                    '/report — today\'s energy summary\n' +
                    '/on1 /off1 — control Load 1\n' +
                    '/on2 /off2 — control Load 2\n' +
                    '/stop — unsubscribe from alerts',
                    { parse_mode: 'MarkdownV2' }
                );
            } catch (e) {
                console.error('Telegram /start error:', e.message);
            }
        });

        // ── /stop — unsubscribe ───────────────────────────────────────────────
        bot.onText(/\/stop/, async (msg) => {
            const chatId = msg.chat.id;
            try {
                await Subscriber.findOneAndUpdate(
                    { chat_id: String(chatId) },
                    { active: false }
                );
                bot.sendMessage(chatId, '🔕 Unsubscribed from alerts. Send /start to re-subscribe.');
            } catch (e) {
                console.error('Telegram /stop error:', e.message);
            }
        });

        // ── /status — latest readings ─────────────────────────────────────────
        bot.onText(/\/status/, async (msg) => {
            const chatId = msg.chat.id;
            try {
                const Reading = require('../models/Reading');

                // Get latest per load
                const load1 = await Reading.findOne({ loadId: 'Load1' }).sort({ timestamp: -1 });
                const load2 = await Reading.findOne({ loadId: 'Load2' }).sort({ timestamp: -1 });
                const latest = load1 || load2;

                if (!latest) {
                    return bot.sendMessage(chatId, '❌ No readings available yet\\. Is the ESP32 running?', { parse_mode: 'MarkdownV2' });
                }

                const time = new Date(latest.timestamp).toLocaleTimeString();
                const tempLine = latest.temperature != null ? `🌡 Temp: ${latest.temperature}°C\n` : '';
                const smokeLine = latest.smokeLevel != null ? `💨 Smoke: ${latest.smokeLevel} ADC\n` : '';

                const text =
                    `⚡ *Current Status*\n\n` +
                    `🔌 Voltage: ${latest.voltage}V\n` +
                    (load1 ? `⚡ Load 1 Current: ${load1.current}A \\(${load1.power}W\\)\n` : '') +
                    (load2 ? `⚡ Load 2 Current: ${load2.current}A \\(${load2.power}W\\)\n` : '') +
                    tempLine + smokeLine +
                    `🕐 Last seen: ${time}`;

                bot.sendMessage(chatId, text, { parse_mode: 'MarkdownV2' });
            } catch (e) {
                console.error('Telegram /status error:', e.message);
                bot.sendMessage(chatId, '❌ Error fetching status\\.');
            }
        });

        // ── /report — today's energy summary ─────────────────────────────────
        bot.onText(/\/report/, async (msg) => {
            const chatId = msg.chat.id;
            try {
                const Reading = require('../models/Reading');
                const startOfDay = new Date();
                startOfDay.setHours(0, 0, 0, 0);

                const stats = await Reading.aggregate([
                    { $match: { timestamp: { $gte: startOfDay } } },
                    {
                        $group: {
                            _id: '$loadId',
                            totalEnergy: { $sum: '$energy' },
                            avgPower:    { $avg: '$power' },
                            maxPower:    { $max: '$power' }
                        }
                    },
                    { $sort: { _id: 1 } }
                ]);

                if (stats.length === 0) {
                    return bot.sendMessage(chatId, '📊 No data recorded today yet\\.');
                }

                let text = `📊 *Today's Energy Report*\n\n`;
                let totalEnergy = 0;
                for (const s of stats) {
                    const cost = (s.totalEnergy * RATE).toFixed(2);
                    totalEnergy += s.totalEnergy;
                    text += `*${s._id}*\n` +
                        `  Energy: ${s.totalEnergy.toFixed(4)} kWh\n` +
                        `  Cost: ₹${cost}\n` +
                        `  Avg Power: ${s.avgPower.toFixed(1)}W\n` +
                        `  Peak: ${s.maxPower.toFixed(1)}W\n\n`;
                }
                text += `*Total Cost: ₹${(totalEnergy * RATE).toFixed(2)}*`;

                bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
            } catch (e) {
                console.error('Telegram /report error:', e.message);
                bot.sendMessage(chatId, '❌ Error generating report.');
            }
        });

        // ── Relay commands ────────────────────────────────────────────────────
        const relayCommands = [
            { pattern: /\/on1/,  channel: 'load1', state: 'on'  },
            { pattern: /\/off1/, channel: 'load1', state: 'off' },
            { pattern: /\/on2/,  channel: 'load2', state: 'on'  },
            { pattern: /\/off2/, channel: 'load2', state: 'off' }
        ];

        relayCommands.forEach(({ pattern, channel, state }) => {
            bot.onText(pattern, async (msg) => {
                const chatId = msg.chat.id;
                try {
                    await RelayState.findOneAndUpdate(
                        { deviceId: 'esp32-1', channel },
                        { state, updatedAt: new Date() },
                        { upsert: true }
                    );
                    const label = channel === 'load1' ? 'Load 1' : 'Load 2';
                    bot.sendMessage(chatId,
                        `✅ *${label}* turned *${state.toUpperCase()}*\nESP32 will apply within 2 seconds.`,
                        { parse_mode: 'Markdown' }
                    );
                } catch (e) {
                    bot.sendMessage(chatId, `❌ Failed to set ${channel} ${state}`);
                }
            });
        });

        // ── Inline keyboard callbacks ─────────────────────────────────────────
        bot.on('callback_query', async (query) => {
            const chatId = query.message.chat.id;
            const data   = query.data;

            if (data === 'dismiss') {
                bot.answerCallbackQuery(query.id, { text: 'Alert dismissed' });
                bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
                    chat_id: chatId,
                    message_id: query.message.message_id
                });
            } else if (data === 'off_load1' || data === 'off_load2') {
                const channel = data === 'off_load1' ? 'load1' : 'load2';
                const label   = data === 'off_load1' ? 'Load 1' : 'Load 2';
                try {
                    await RelayState.findOneAndUpdate(
                        { deviceId: 'esp32-1', channel },
                        { state: 'off', updatedAt: new Date() },
                        { upsert: true }
                    );
                    bot.answerCallbackQuery(query.id, { text: `${label} turned OFF` });
                } catch (e) {
                    bot.answerCallbackQuery(query.id, { text: 'Failed to turn off' });
                }
            }
        });

    } catch (e) {
        console.error('Telegram bot init error:', e.message);
    }
}

// ── sendAlert — called by thresholdEvaluator ─────────────────────────────────
async function sendAlert(alert) {
    if (!bot) return;

    // Per-type cooldown to avoid spam
    const key = alert.type;
    const lastSent = cooldownMap.get(key);
    if (lastSent && Date.now() - lastSent < COOLDOWN_MS) {
        console.log(`⏳ Telegram cooldown active for ${key}`);
        return;
    }
    cooldownMap.set(key, Date.now());

    try {
        const subscribers = await Subscriber.find({ active: true });
        if (subscribers.length === 0) return;

        const emoji = alert.severity === 'critical' ? '🔴' : '🟡';
        const time  = new Date(alert.timestamp || Date.now()).toLocaleTimeString();

        const text =
            `${emoji} *${alert.severity.toUpperCase()} ALERT*\n\n` +
            `Sensor: ${alert.type.toUpperCase()}\n` +
            `Value: ${alert.value}${alert.unit || ''}\n` +
            `Threshold: ${alert.threshold}${alert.unit || ''}\n` +
            `Time: ${time}`;

        const keyboard = {
            inline_keyboard: [[
                { text: '✅ Dismiss',          callback_data: 'dismiss'   },
                { text: '⛔ Off Load 1',       callback_data: 'off_load1' },
                { text: '⛔ Off Load 2',       callback_data: 'off_load2' }
            ]]
        };

        for (const sub of subscribers) {
            try {
                await bot.sendMessage(sub.chat_id, text, {
                    parse_mode: 'Markdown',
                    reply_markup: keyboard
                });
            } catch (e) {
                console.error(`Failed to send to ${sub.chat_id}:`, e.message);
                // Auto-deactivate blocked/deleted accounts
                if (e.message.includes('blocked') || e.message.includes('not found') || e.message.includes('deactivated')) {
                    await Subscriber.findOneAndUpdate({ chat_id: sub.chat_id }, { active: false });
                }
            }
        }
    } catch (e) {
        console.error('sendAlert error:', e.message);
    }
}

module.exports = { initBot, sendAlert };
