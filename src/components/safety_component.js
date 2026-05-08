import React from 'react';

const API = 'http://localhost:5000/api';

// ── Thresholds (must match backend/models/Threshold.js defaults) ─────────────
const THRESHOLDS = {
  temperature: { warn: 40, crit: 55 },   // °C  — DHT22
  smoke:       { warn: 300, crit: 500 }, // ADC — MQ2
  voltage:     { warnMin: 210, warnMax: 250, critMin: 190, critMax: 260 }, // V
  current:     { warn: 8, crit: 40 }     // A
};

function getSeverity(type, value) {
  if (value == null) return 'no_data';
  const t = THRESHOLDS[type];
  if (!t) return 'normal';
  if (type === 'voltage') {
    if (value < t.critMin || value > t.critMax) return 'critical';
    if (value < t.warnMin || value > t.warnMax) return 'warning';
    return 'normal';
  }
  if (value > t.crit) return 'critical';
  if (value > t.warn) return 'warning';
  return 'normal';
}

const SEVERITY_COLORS = {
  critical: '#FF3D00',
  warning:  '#FFA500',
  normal:   '#00C853',
  no_data:  '#555566',
  info:     '#00D4FF'
};

const SEVERITY_BG = {
  critical: 'rgba(255,61,0,0.12)',
  warning:  'rgba(255,165,0,0.12)',
  normal:   'rgba(0,200,83,0.10)',
  no_data:  'rgba(85,85,102,0.10)',
  info:     'rgba(0,212,255,0.10)'
};

class SafetyComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      status: null,
      alerts: [],
      loading: true,
      alertsLoading: true
    };
    this._timer = null;
  }

  componentDidMount() {
    this.fetchAll();
    this._timer = setInterval(() => this.fetchStatus(), 10000);
  }

  componentWillUnmount() {
    clearInterval(this._timer);
  }

  async fetchAll() {
    await Promise.all([this.fetchStatus(), this.fetchAlerts()]);
    this.setState({ loading: false });
  }

  async fetchStatus() {
    try {
      const res  = await fetch(`${API}/safety/status?deviceId=esp32-1`);
      const data = await res.json();
      // Only update state if we have actual sensor data (not no_data response)
      if (data.success && data.status !== 'no_data') {
        this.setState({ status: data });
      }
    } catch (e) {
      console.error('Safety status error:', e);
    }
  }

  async fetchAlerts() {
    try {
      const res  = await fetch(`${API}/safety/alerts?limit=20&deviceId=esp32-1`);
      const data = await res.json();
      if (data.success) this.setState({ alerts: data.data, alertsLoading: false });
    } catch (e) {
      console.error('Alerts fetch error:', e);
      this.setState({ alertsLoading: false });
    }
  }

  async acknowledgeAlert(id) {
    try {
      await fetch(`${API}/safety/alerts/${id}`, { method: 'PATCH' });
      this.setState(prev => ({
        alerts: prev.alerts.map(a => a._id === id ? { ...a, acknowledged: true } : a)
      }));
    } catch (e) {
      console.error('Acknowledge error:', e);
    }
  }

  // ── Render helpers ────────────────────────────────────────────────────────────

  renderSensorCard(label, value, unit, severity, icon) {
    const color = SEVERITY_COLORS[severity];
    const bg    = SEVERITY_BG[severity];
    const displayVal = value != null ? `${value}${unit}` : 'No Data';

    return (
      <div style={{ ...styles.sensorCard, borderLeft: `4px solid ${color}`, backgroundColor: bg }}>
        <div style={styles.sensorIcon}>{icon}</div>
        <div style={styles.sensorLabel}>{label}</div>
        <div style={{ ...styles.sensorValue, color }}>{displayVal}</div>
        <div style={{ ...styles.severityBadge, backgroundColor: color }}>
          {severity === 'no_data' ? 'NO DATA' : severity.toUpperCase()}
        </div>
      </div>
    );
  }

  renderOverallBanner(overallSeverity) {
    const map = {
      ALERT:   { color: '#FF3D00', bg: 'rgba(255,61,0,0.15)',   icon: '🚨', text: 'ALERT — Critical condition detected!' },
      WARNING: { color: '#FFA500', bg: 'rgba(255,165,0,0.15)',  icon: '⚠️', text: 'WARNING — Check sensor readings' },
      SAFE:    { color: '#00C853', bg: 'rgba(0,200,83,0.12)',   icon: '✅', text: 'SAFE — All readings within normal range' }
    };
    const s = map[overallSeverity] || map['SAFE'];
    return (
      <div style={{ ...styles.banner, backgroundColor: s.bg, borderLeft: `5px solid ${s.color}` }}>
        <span style={{ fontSize: '22px', marginRight: '10px' }} role="img" aria-label="status">{s.icon}</span>
        <span style={{ color: s.color, fontWeight: '700', fontSize: '16px' }}>{s.text}</span>
      </div>
    );
  }

  render() {
    const { status, alerts, loading, alertsLoading } = this.state;

    if (loading) {
      return (
        <div style={styles.loadingBox}>
          <div style={styles.loadingText}>Loading safety data...</div>
        </div>
      );
    }

    // No readings in DB yet — show waiting state
    if (!status) {
      return (
        <div style={{ padding: '0 8px' }}>
          <div style={{ ...styles.banner, backgroundColor: 'rgba(85,85,102,0.15)', borderLeft: '5px solid #555566' }}>
            <span style={{ fontSize: '22px', marginRight: '10px' }} role="img" aria-label="waiting">📡</span>
            <span style={{ color: '#AAAAAA', fontWeight: '700', fontSize: '16px' }}>
              Waiting for ESP32 data — no readings received yet
            </span>
          </div>
          <div style={styles.alertSection}>
            <div style={styles.alertHeader}>Recent Alerts</div>
            <div style={styles.noAlerts}>No alerts recorded — system is running normally.</div>
          </div>
        </div>
      );
    }

    const raw = (status && status.raw) ? status.raw : {};
    const overallSeverity = (status && status.overallSeverity) ? status.overallSeverity : 'SAFE';
    const lastSeen = (status && status.timestamp) ? new Date(status.timestamp).toLocaleTimeString() : '—';

    const tempSeverity     = getSeverity('temperature', raw.temperature);
    const smokeSeverity    = getSeverity('smoke',       raw.smokeLevel);
    const voltageSeverity  = getSeverity('voltage',     raw.voltage);
    const current1Severity = getSeverity('current',     raw.currentLoad1);
    const current2Severity = getSeverity('current',     raw.currentLoad2);

    const unacknowledged = alerts.filter(a => !a.acknowledged);

    return (
      <div style={{ padding: '0 8px' }}>

        {/* ── Overall status banner ── */}
        {this.renderOverallBanner(overallSeverity)}

        {/* ── Last updated ── */}
        <div style={styles.lastUpdated}>
          Last reading: {lastSeen} · Auto-refreshes every 10s
        </div>

        {/* ── Sensor cards — 6 cards for all sensors ── */}
        <div style={styles.sensorGrid}>
          {this.renderSensorCard(
            'Voltage',
            raw.voltage != null ? raw.voltage.toFixed(1) : null,
            ' V', voltageSeverity, '⚡'
          )}
          {this.renderSensorCard(
            'Current — Load 1',
            raw.currentLoad1 != null ? raw.currentLoad1.toFixed(3) : null,
            ' A', current1Severity, '🔌'
          )}
          {this.renderSensorCard(
            'Current — Load 2',
            raw.currentLoad2 != null ? raw.currentLoad2.toFixed(3) : null,
            ' A', current2Severity, '🔌'
          )}
          {this.renderSensorCard(
            'Temperature',
            raw.temperature != null ? raw.temperature.toFixed(1) : null,
            ' °C', tempSeverity, '🌡️'
          )}
          {this.renderSensorCard(
            'Humidity',
            raw.humidity != null ? raw.humidity.toFixed(1) : null,
            ' %', raw.humidity != null ? 'normal' : 'no_data', '💧'
          )}
          {this.renderSensorCard(
            'Smoke Level',
            raw.smokeLevel != null ? raw.smokeLevel : null,
            ' ADC', smokeSeverity, '💨'
          )}
        </div>

        {/* ── Threshold reference ── */}
        <div style={styles.thresholdBox}>
          <div style={styles.thresholdTitle}>Threshold Reference</div>
          <div style={styles.thresholdGrid}>
            {[
              { label: 'Temperature', warn: '> 40°C', crit: '> 55°C' },
              { label: 'Smoke (MQ2)', warn: '> 300 ADC', crit: '> 500 ADC' },
              { label: 'Voltage',     warn: '< 210V or > 250V', crit: '< 190V or > 260V' },
              { label: 'Current',     warn: '> 8A', crit: '> 40A' }
            ].map(t => (
              <div key={t.label} style={styles.thresholdRow}>
                <span style={styles.thresholdLabel}>{t.label}</span>
                <span style={{ ...styles.thresholdVal, color: '#FFA500' }}>⚠ {t.warn}</span>
                <span style={{ ...styles.thresholdVal, color: '#FF3D00' }}>🚨 {t.crit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Alert history ── */}
        <div style={styles.alertSection}>
          <div style={styles.alertHeader}>
            Recent Alerts
            {unacknowledged.length > 0 && (
              <span style={styles.unackBadge}>{unacknowledged.length} unacknowledged</span>
            )}
          </div>

          {alertsLoading ? (
            <div style={styles.loadingText}>Loading alerts...</div>
          ) : alerts.length === 0 ? (
            <div style={styles.noAlerts}>No alerts recorded — system is running normally.</div>
          ) : (
            <div style={styles.alertList}>
              {alerts.map(alert => (
                <div key={alert._id} style={{
                  ...styles.alertRow,
                  opacity: alert.acknowledged ? 0.5 : 1,
                  borderLeft: `4px solid ${alert.severity === 'critical' ? '#FF3D00' : '#FFA500'}`
                }}>
                  <div style={styles.alertLeft}>
                    <span style={{
                      ...styles.alertSeverity,
                      color: alert.severity === 'critical' ? '#FF3D00' : '#FFA500'
                    }}>
                      {alert.severity === 'critical' ? '🚨' : '⚠️'} {alert.severity.toUpperCase()}
                    </span>
                    <span style={styles.alertType}>{alert.type.toUpperCase()}</span>
                    <span style={styles.alertValue}>
                      {alert.value} (threshold: {alert.threshold})
                    </span>
                    <span style={styles.alertTime}>
                      {new Date(alert.timestamp).toLocaleString()}
                    </span>
                  </div>
                  {!alert.acknowledged && (
                    <button
                      onClick={() => this.acknowledgeAlert(alert._id)}
                      style={styles.ackBtn}
                    >
                      Acknowledge
                    </button>
                  )}
                  {alert.acknowledged && (
                    <span style={styles.ackLabel}>✓ Acknowledged</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    );
  }
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  loadingBox: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '400px', backgroundColor: '#1e1e2e', borderRadius: '8px'
  },
  loadingText: { color: '#AAAAAA', fontSize: '16px' },
  banner: {
    display: 'flex', alignItems: 'center', padding: '14px 20px',
    borderRadius: '8px', marginBottom: '16px'
  },
  lastUpdated: {
    fontSize: '12px', color: '#666677', marginBottom: '16px'
  },
  sensorGrid: {
    display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '20px'
  },
  sensorCard: {
    flex: '1 1 160px', minWidth: '140px', borderRadius: '8px',
    padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px'
  },
  sensorIcon: { fontSize: '24px' },
  sensorLabel: {
    fontSize: '11px', color: '#888888', textTransform: 'uppercase', letterSpacing: '0.5px'
  },
  sensorValue: { fontSize: '26px', fontWeight: '700' },
  severityBadge: {
    display: 'inline-block', fontSize: '10px', color: '#FFFFFF',
    padding: '2px 8px', borderRadius: '10px', fontWeight: '700',
    alignSelf: 'flex-start', marginTop: '4px'
  },
  thresholdBox: {
    backgroundColor: '#1e1e2e', borderRadius: '8px', padding: '16px', marginBottom: '20px'
  },
  thresholdTitle: {
    fontSize: '13px', color: '#888888', textTransform: 'uppercase',
    letterSpacing: '0.5px', marginBottom: '12px'
  },
  thresholdGrid: { display: 'flex', flexDirection: 'column', gap: '8px' },
  thresholdRow: {
    display: 'flex', gap: '16px', alignItems: 'center',
    fontSize: '13px', flexWrap: 'wrap'
  },
  thresholdLabel: { color: '#CCCCCC', fontWeight: '600', minWidth: '120px' },
  thresholdVal: { fontSize: '12px' },
  alertSection: {
    backgroundColor: '#1e1e2e', borderRadius: '8px', padding: '16px'
  },
  alertHeader: {
    fontSize: '15px', fontWeight: '700', color: '#FFFFFF',
    marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px'
  },
  unackBadge: {
    fontSize: '11px', backgroundColor: '#FF3D00', color: '#FFFFFF',
    padding: '2px 8px', borderRadius: '10px', fontWeight: '600'
  },
  noAlerts: {
    color: '#00C853', fontSize: '14px', padding: '12px 0'
  },
  alertList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  alertRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#2a2a3a', borderRadius: '6px', padding: '12px 16px',
    flexWrap: 'wrap', gap: '8px'
  },
  alertLeft: {
    display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap'
  },
  alertSeverity: { fontSize: '13px', fontWeight: '700' },
  alertType: {
    fontSize: '12px', color: '#CCCCCC', backgroundColor: '#3a3a4a',
    padding: '2px 8px', borderRadius: '4px'
  },
  alertValue: { fontSize: '13px', color: '#AAAAAA' },
  alertTime: { fontSize: '11px', color: '#666677' },
  ackBtn: {
    border: 'none', borderRadius: '6px', padding: '6px 14px',
    fontSize: '12px', fontWeight: '600', color: '#FFFFFF',
    backgroundColor: '#3a3a4a', cursor: 'pointer'
  },
  ackLabel: { fontSize: '12px', color: '#00C853' }
};

export default SafetyComponent;
