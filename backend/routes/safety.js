const express = require('express');
const router = express.Router();
const Reading = require('../models/Reading');
const Alert = require('../models/Alert');
const Threshold = require('../models/Threshold');

// GET /api/safety/status?deviceId=esp32-1
router.get('/status', async (req, res) => {
    try {
        const { deviceId = 'esp32-1' } = req.query;

        // Get latest reading for each load separately
        const latestLoad1 = await Reading.findOne({ deviceId, loadId: 'Load1' }).sort({ timestamp: -1 });
        const latestLoad2 = await Reading.findOne({ deviceId, loadId: 'Load2' }).sort({ timestamp: -1 });

        // Use Load1 as the primary reading (carries safety sensor data)
        const latest = latestLoad1 || latestLoad2;

        if (!latest) {
            return res.json({ success: true, status: 'no_data', sensors: {} });
        }

        const thresholds = await Threshold.findOne({ deviceId: 'default' }) || getDefaultThresholds();
        const sensors = evaluateSeverity(latest, thresholds, latestLoad2);
        const overallSeverity = getOverallSeverity(sensors);

        res.json({
            success: true,
            deviceId,
            timestamp: latest.timestamp,
            overallSeverity,
            sensors,
            raw: {
                voltage:        latest.voltage,
                currentLoad1:   latestLoad1 ? latestLoad1.current : null,
                currentLoad2:   latestLoad2 ? latestLoad2.current : null,
                temperature:    latest.temperature,
                humidity:       latest.humidity,
                smokeLevel:     latest.smokeLevel
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/safety/alerts?limit=10
router.get('/alerts', async (req, res) => {
    try {
        const { limit = 10, deviceId } = req.query;
        const query = {};
        if (deviceId) query.deviceId = deviceId;

        const alerts = await Alert.find(query)
            .sort({ timestamp: -1 })
            .limit(parseInt(limit));

        res.json({ success: true, data: alerts });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PATCH /api/safety/alerts/:id — acknowledge
router.patch('/alerts/:id', async (req, res) => {
    try {
        const alert = await Alert.findByIdAndUpdate(
            req.params.id,
            { acknowledged: true },
            { new: true }
        );
        if (!alert) return res.status(404).json({ error: 'Alert not found' });
        res.json({ success: true, data: alert });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/safety/thresholds
router.get('/thresholds', async (req, res) => {
    try {
        let thresholds = await Threshold.findOne({ deviceId: 'default' });
        if (!thresholds) {
            thresholds = await Threshold.create({ deviceId: 'default' });
        }
        res.json({ success: true, data: thresholds });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/safety/thresholds
router.post('/thresholds', async (req, res) => {
    try {
        const updated = await Threshold.findOneAndUpdate(
            { deviceId: 'default' },
            { $set: req.body },
            { upsert: true, new: true }
        );
        res.json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Helper: evaluate severity for each sensor
function evaluateSeverity(reading, thresholds, load2Reading) {
    const sensors = {};

    // Voltage
    const v = reading.voltage;
    if (v < thresholds.voltage.critMin || v > thresholds.voltage.critMax) {
        sensors.voltage = { value: v, severity: 'critical', unit: 'V' };
    } else if (v < thresholds.voltage.warnMin || v > thresholds.voltage.warnMax) {
        sensors.voltage = { value: v, severity: 'warning', unit: 'V' };
    } else {
        sensors.voltage = { value: v, severity: 'normal', unit: 'V' };
    }

    // Current Load 1
    const c1 = reading.current;
    if (c1 > thresholds.current.critMax) {
        sensors.currentLoad1 = { value: c1, severity: 'critical', unit: 'A' };
    } else if (c1 > thresholds.current.warnMax) {
        sensors.currentLoad1 = { value: c1, severity: 'warning', unit: 'A' };
    } else {
        sensors.currentLoad1 = { value: c1, severity: 'normal', unit: 'A' };
    }

    // Current Load 2
    if (load2Reading) {
        const c2 = load2Reading.current;
        if (c2 > thresholds.current.critMax) {
            sensors.currentLoad2 = { value: c2, severity: 'critical', unit: 'A' };
        } else if (c2 > thresholds.current.warnMax) {
            sensors.currentLoad2 = { value: c2, severity: 'warning', unit: 'A' };
        } else {
            sensors.currentLoad2 = { value: c2, severity: 'normal', unit: 'A' };
        }
    }

    // Temperature
    if (reading.temperature != null) {
        const t = reading.temperature;
        if (t > thresholds.temperature.critMax) {
            sensors.temperature = { value: t, severity: 'critical', unit: '°C' };
        } else if (t > thresholds.temperature.warnMax) {
            sensors.temperature = { value: t, severity: 'warning', unit: '°C' };
        } else {
            sensors.temperature = { value: t, severity: 'normal', unit: '°C' };
        }
    }

    // Smoke
    if (reading.smokeLevel != null) {
        const s = reading.smokeLevel;
        if (s > thresholds.smoke.critMax) {
            sensors.smoke = { value: s, severity: 'critical', unit: 'ADC' };
        } else if (s > thresholds.smoke.warnMax) {
            sensors.smoke = { value: s, severity: 'warning', unit: 'ADC' };
        } else {
            sensors.smoke = { value: s, severity: 'normal', unit: 'ADC' };
        }
    }

    return sensors;
}

function getOverallSeverity(sensors) {
    const severities = Object.values(sensors).map(s => s.severity);
    if (severities.includes('critical')) return 'ALERT';
    if (severities.includes('warning')) return 'WARNING';
    return 'SAFE';
}

function getDefaultThresholds() {
    return {
        voltage: { warnMin: 210, warnMax: 250, critMin: 190, critMax: 260 },
        current: { warnMax: 8, critMax: 40 },
        temperature: { warnMax: 40, critMax: 55 },
        smoke: { warnMax: 300, critMax: 500 }
    };
}

module.exports = router;
module.exports.evaluateSeverity = evaluateSeverity;
module.exports.getDefaultThresholds = getDefaultThresholds;
