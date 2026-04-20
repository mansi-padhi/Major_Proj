const Alert = require('../models/Alert');
const Threshold = require('../models/Threshold');
const telegramService = require('../services/telegramService');

// This middleware is exported but also used directly in readings route
// It evaluates a reading against thresholds and creates alerts

async function evaluateReading(reading) {
    try {
        let thresholds = await Threshold.findOne({ deviceId: 'default' });
        if (!thresholds) {
            thresholds = {
                voltage: { warnMin: 210, warnMax: 250, critMin: 190, critMax: 260 },
                current: { warnMax: 8, critMax: 12 },
                temperature: { warnMax: 40, critMax: 55 },
                smoke: { warnMax: 300, critMax: 500 }
            };
        }

        const checks = [];

        // Voltage check
        const v = reading.voltage;
        if (v < thresholds.voltage.critMin || v > thresholds.voltage.critMax) {
            checks.push({ type: 'voltage', severity: 'critical', value: v, threshold: v < thresholds.voltage.critMin ? thresholds.voltage.critMin : thresholds.voltage.critMax, unit: 'V' });
        } else if (v < thresholds.voltage.warnMin || v > thresholds.voltage.warnMax) {
            checks.push({ type: 'voltage', severity: 'warning', value: v, threshold: v < thresholds.voltage.warnMin ? thresholds.voltage.warnMin : thresholds.voltage.warnMax, unit: 'V' });
        }

        // Current check
        const c = reading.current;
        if (c > thresholds.current.critMax) {
            checks.push({ type: 'current', severity: 'critical', value: c, threshold: thresholds.current.critMax, unit: 'A' });
        } else if (c > thresholds.current.warnMax) {
            checks.push({ type: 'current', severity: 'warning', value: c, threshold: thresholds.current.warnMax, unit: 'A' });
        }

        // Temperature check
        if (reading.temperature != null) {
            const t = reading.temperature;
            if (t > thresholds.temperature.critMax) {
                checks.push({ type: 'temperature', severity: 'critical', value: t, threshold: thresholds.temperature.critMax, unit: '°C' });
            } else if (t > thresholds.temperature.warnMax) {
                checks.push({ type: 'temperature', severity: 'warning', value: t, threshold: thresholds.temperature.warnMax, unit: '°C' });
            }
        }

        // Smoke check
        if (reading.smokeLevel != null) {
            const s = reading.smokeLevel;
            if (s > thresholds.smoke.critMax) {
                checks.push({ type: 'smoke', severity: 'critical', value: s, threshold: thresholds.smoke.critMax, unit: ' ADC' });
            } else if (s > thresholds.smoke.warnMax) {
                checks.push({ type: 'smoke', severity: 'warning', value: s, threshold: thresholds.smoke.warnMax, unit: ' ADC' });
            }
        }

        // Save alerts and send Telegram notifications
        for (const check of checks) {
            await Alert.create({
                deviceId: reading.deviceId,
                type: check.type,
                severity: check.severity,
                value: check.value,
                threshold: check.threshold,
                timestamp: reading.timestamp || new Date()
            });

            // Send Telegram alert
            await telegramService.sendAlert({
                ...check,
                timestamp: reading.timestamp || new Date()
            });
        }
    } catch (e) {
        console.error('Threshold evaluation error:', e.message);
    }
}

module.exports = evaluateReading;
