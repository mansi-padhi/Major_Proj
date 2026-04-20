const TelegramBot = require('node-telegram-bot-api');
const Subscriber = require('../models/Subscriber');
const RelayState = require('../models/RelayState');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Cooldown map: alertType -> lastSentTimestamp
const cooldownMap = new Map();
const COOLDOWN_MS = (parseInt(process.env.ALERT_COOLDOWN_MINUTES) || 5) * 60 * 1000;

let bot = null;

function initBot() {
    if (!BOT_TOKEN) {
        console.log('⚠️  TELEGRAM_BOT_TOKEN not set — Telegram notifications disabled');
        return;
    }

    try {
        bot = new TelegramBot(BOT_TOKEN, { polling: true });
        console.log('✅ Telegram bot initialized');

        // /start — register subscriber
        bot.onText(/\/start/, async (msg) => {
            const chatId = msg.chat.id;
            try {
                await Subscriber.findOneAndUpdate(
                    { chat_id: String(chatId) },
                    { active: true, subscribedAt: new Date() },
                    { upsert: true }
                );
                bot.sendMessage(chatId,
                    '⚡ *Smart Energy Monitor*\n\nYou are now subscribed to alerts!\n\n' +
                    'Commands:\n/status — current readings\n/report — today\'s summary\n' +
                    '/on1 /off1 — control Load 1\n/on2 /off2 — control Load 2',
                    { parse_mode: 'Markdown' }
                );
            } catch (e) {
                console.error('Telegram /start error:', e.message);
            }
        });

        // /status
        bot.onText(/\/status/, async (msg) => {
            const chatId = msg.chat.id;
            try {
                const Reading = require('../models/Reading');
                const latest = await Reading.findOne().sort({ timestamp: -1 });
                if (!latest) {
                    return bot.sendMessage(chatId, '❌ No readings available yet.');
                }
                const text = `⚡ *Current Status*\n\n` +
                    `Voltage: ${latest.voltage}V\n` +
                    `Current: ${latest.current}A\n` +
                    `Power: ${latest.power}W\n` +
                    `Last seen: ${new Date(latest.timestamp).toLocaleTimeString()}`;
                bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
            } catch (e) {
                bot.sendMessage(chatId, '❌ Error fetching status.');
            }
        });

        // /report
        bot.onText(/\/report/, async (msg) => {
            const chatId = msg.chat.id;
            try {
                const Reading = require('../models/Reading');
                const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
                const stats = await Reading.aggregate([
                    { $match: { timestamp: { $gte: startOfDay } } },
                    { $group: { _id: null, totalEnergy: { $sum: '$energy' }, avgPower: { $avg: '$power' }, maxPower: { $max: '$power' } } }
                ]);
                const d = stats[0] || { totalEnergy: 0, avgPower: 0, maxPower: 0 };
                const rate = parseFloat(process.env.ELECTRICITY_RATE) || 7.0;
                const text = `📊 *Today's Report*\n\n` +
                    `Energy: ${d.totalEnergy.toFixed(3)} kWh\n` +
                    `Cost: ₹${(d.totalEnergy * rate).toFixed(2)}\n` +
                    `Avg Power: ${d.avgPower.toFixed(1)}W\n` +
                    `Peak Power: ${d.maxPower.toFixed(1)}W`;
                bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
            } catch (e) {
                bot.sendMessage(chatId, '❌ Error generating report.');
            }
        });

        // Relay commands
        const relayCommands = [
            { pattern: /\/on1/, channel: 'load1', state: 'on' },
            { pattern: /\/off1/, channel: 'load1', state: 'off' },
            { pattern: /\/on2/, channel: 'load2', state: 'on' },
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
                    bot.sendMessage(chatId, `✅ ${channel.toUpperCase()} turned *${state.toUpperCase()}*`, { parse_mode: 'Markdown' });
                } catch (e) {
                    bot.sendMessage(chatId, `❌ Failed to set ${channel} ${state}`);
                }
            });
        });

        // Inline keyboard callback
        bot.on('callback_query', async (query) => {
            const chatId = query.message.chat.id;
            const data = query.data;

            if (data === 'dismiss') {
                bot.answerCallbackQuery(query.id, { text: 'Alert dismissed' });
                bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
                    chat_id: chatId,
                    message_id: query.message.message_id
                });
            } else if (data === 'off_load1') {
                await RelayState.findOneAndUpdate(
                    { deviceId: 'esp32-1', channel: 'load1' },
                    { state: 'off', updatedAt: new Date() },
                    { upsert: true }
                );
                bot.answerCallbackQuery(query.id, { text: 'Load 1 turned OFF' });
            } else if (data === 'off_load2') {
                await RelayState.findOneAndUpdate(
                    { deviceId: 'esp32-1', channel: 'load2' },
                    { state: 'off', updatedAt: new Date() },
                    { upsert: true }
                );
                bot.answerCallbackQuery(query.id, { text: 'Load 2 turned OFF' });
            }
        });

    } catch (e) {
        console.error('Telegram bot init error:', e.message);
    }
}

async function sendAlert(alert) {
    if (!bot) return;

    // Cooldown check
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
        const time = new Date(alert.timestamp || Date.now()).toLocaleTimeString();
        const text = `${emoji} *${alert.severity.toUpperCase()} — ${alert.type.toUpperCase()}*\n` +
            `Value: ${alert.value}${alert.unit || ''}\n` +
            `Threshold: ${alert.threshold}${alert.unit || ''}\n` +
            `Time: ${time}`;

        const keyboard = {
            inline_keyboard: [[
                { text: '✅ Dismiss', callback_data: 'dismiss' },
                { text: '⛔ Turn Off Load 1', callback_data: 'off_load1' }
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
                if (e.message.includes('blocked') || e.message.includes('not found')) {
                    await Subscriber.findOneAndUpdate({ chat_id: sub.chat_id }, { active: false });
                }
            }
        }
    } catch (e) {
        console.error('sendAlert error:', e.message);
    }
}

module.exports = { initBot, sendAlert };
