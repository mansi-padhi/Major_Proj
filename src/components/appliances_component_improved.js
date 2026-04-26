import React from 'react';
import { connect } from 'react-redux';
import ReactFC from 'react-fusioncharts';
import FusionCharts from 'fusioncharts';
import Charts from 'fusioncharts/fusioncharts.charts';
import FusionTheme from 'fusioncharts/themes/fusioncharts.theme.fusion';

Charts(FusionCharts);
FusionTheme(FusionCharts);
FusionCharts.options.creditLabel = false;

const API = 'http://localhost:5000/api';
const RATE = 8; // ₹8 per kWh

// ── Loads config — add Load 3 here when you wire a third sensor ──────────────
const LOADS = [
  { id: 'Load1', channel: 'load1', label: 'Load 1', color: '#00D4FF' },
  { id: 'Load2', channel: 'load2', label: 'Load 2', color: '#FFA500' }
];

class AppliancesComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loads: [],          // per-load energy/cost stats
      relays: [],         // relay states from backend
      isOnline: false,
      loading: true,
      relayLoading: {},   // { load1: true/false } while toggling
      loadDetected: false // actual load detection from current sensor
    };
    this._timer = null;
  }

  componentDidMount() {
    this.fetchAll();
    // Poll relay state and load detection every 5 seconds
    this._timer = setInterval(() => {
      this.fetchRelays();
      this.fetchLoadDetection();
    }, 5000);
  }

  componentWillUnmount() {
    clearInterval(this._timer);
  }

  // ── Data fetching ────────────────────────────────────────────────────────────

  async fetchAll() {
    await Promise.all([this.fetchLoads(), this.fetchRelays(), this.fetchLoadDetection()]);
    this.setState({ loading: false });
  }

  async fetchLoads() {
    try {
      const { energy } = this.props;
      const period = (energy && energy.period) || 'today';

      // Build date range based on period
      const now = new Date();
      let startDate, endDate;
      if (period === 'today') {
        startDate = new Date(now); startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now); endDate.setHours(23, 59, 59, 999);
      } else if (period === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      } else {
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      }

      const res = await fetch(
        `${API}/loads/summary?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      const data = await res.json();
      if (data.success) {
        this.setState({ loads: data.loads || [] });
      }
    } catch (e) {
      console.error('Loads fetch error:', e);
    }
  }

  async fetchRelays() {
    try {
      const res = await fetch(`${API}/relays?deviceId=esp32-1`);
      const data = await res.json();
      if (data.success) {
        this.setState({ relays: data.relays, isOnline: data.isOnline });
      }
    } catch (e) {
      console.error('Relay fetch error:', e);
    }
  }

  async fetchLoadDetection() {
    try {
      const res = await fetch(`${API}/readings/latest?deviceId=esp32-1`);
      const data = await res.json();
      if (data.success && data.data) {
        this.setState({ loadDetected: data.data.loadDetected || false });
      }
    } catch (e) {
      console.error('Load detection fetch error:', e);
    }
  }

  async toggleRelay(channel, currentState) {
    const newState = currentState === 'on' ? 'off' : 'on';
    this.setState(prev => ({
      relayLoading: { ...prev.relayLoading, [channel]: true }
    }));

    // Optimistic update
    this.setState(prev => ({
      relays: prev.relays.map(r =>
        r.channel === channel ? { ...r, state: newState } : r
      )
    }));

    try {
      await fetch(`${API}/relays/${channel}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: newState, deviceId: 'esp32-1' })
      });
    } catch (e) {
      console.error('Relay toggle error:', e);
      // Revert on failure
      this.setState(prev => ({
        relays: prev.relays.map(r =>
          r.channel === channel ? { ...r, state: currentState } : r
        )
      }));
    } finally {
      this.setState(prev => ({
        relayLoading: { ...prev.relayLoading, [channel]: false }
      }));
    }
  }

  // ── Chart config ─────────────────────────────────────────────────────────────

  getComparisonChartConfig() {
    const { loads } = this.state;

    // Build per-load data — always show all configured loads
    const energyData = LOADS.map(cfg => {
      const found = loads.find(l => l.loadId === cfg.id);
      return { label: cfg.label, value: found ? found.energyKwh.toFixed(4) : '0' };
    });

    const costData = LOADS.map(cfg => {
      const found = loads.find(l => l.loadId === cfg.id);
      return { label: cfg.label, value: found ? found.costINR.toFixed(2) : '0' };
    });

    return {
      type: 'msbar2d',
      width: '100%',
      height: '300',
      dataFormat: 'json',
      dataSource: {
        chart: {
          caption: 'Load Comparison',
          subCaption: 'Energy (kWh) and Cost (₹) per load',
          xAxisName: 'Load',
          yAxisName: 'Value',
          theme: 'fusion',
          bgColor: '#1e1e2e',
          canvasBgColor: '#1e1e2e',
          baseFontColor: '#CCCCCC',
          captionFontColor: '#FFFFFF',
          subCaptionFontColor: '#AAAAAA',
          showBorder: '0',
          showCanvasBorder: '0',
          divLineColor: '#2e2e3e',
          showAlternateHGridColor: '0',
          paletteColors: '#00D4FF,#FFA500',
          plotBorderAlpha: '0',
          showValues: '1',
          valueFontColor: '#FFFFFF',
          toolTipBgColor: '#2a2a3a',
          toolTipColor: '#FFFFFF',
          legendBgAlpha: '0',
          legendBorderAlpha: '0',
          legendFontColor: '#CCCCCC',
          useRoundEdges: '1'
        },
        categories: [{ category: LOADS.map(l => ({ label: l.label })) }],
        dataset: [
          { seriesname: 'Energy (kWh)', data: energyData },
          { seriesname: 'Cost (₹)',     data: costData }
        ]
      }
    };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  getRelayState(channel) {
    const r = this.state.relays.find(r => r.channel === channel);
    return r ? r.state : 'off';
  }

  getTopConsumer() {
    const { loads } = this.state;
    if (!loads || loads.length === 0) return null;
    return loads.reduce((top, l) => (!top || l.energyKwh > top.energyKwh ? l : top), null);
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  render() {
    const { loads, isOnline, loading, relayLoading } = this.state;
    const { energy } = this.props;
    const period = (energy && energy.period) || 'today';
    const topConsumer = this.getTopConsumer();

    if (loading) {
      return (
        <div style={styles.loadingBox}>
          <div style={styles.loadingText}>Loading appliance data...</div>
        </div>
      );
    }

    return (
      <div style={{ padding: '0 8px' }}>

        {/* ── Top stat cards ── */}
        <div style={styles.cardRow}>

          {/* Total Devices */}
          <div style={{ ...styles.statCard, borderLeft: '4px solid #00D4FF' }}>
            <div style={styles.statLabel}>Total Loads</div>
            <div style={{ ...styles.statValue, color: '#00D4FF' }}>{LOADS.length}</div>
          </div>

          {/* Top Consumer */}
          <div style={{ ...styles.statCard, borderLeft: '4px solid #FF4444' }}>
            <div style={styles.statLabel}>Top Consumer</div>
            {topConsumer ? (
              <div>
                <div style={{ ...styles.statValue, color: '#FF4444', fontSize: '20px' }}>
                  {topConsumer.loadName || topConsumer.loadId}
                </div>
                <div style={{ color: '#888', fontSize: '13px', marginTop: '4px' }}>
                  {topConsumer.energyKwh.toFixed(4)} kWh · ₹{topConsumer.costINR.toFixed(2)}
                </div>
              </div>
            ) : (
              <div style={{ ...styles.statValue, color: '#666', fontSize: '16px' }}>No data yet</div>
            )}
          </div>

          {/* Device online badge */}
          <div style={{ ...styles.statCard, borderLeft: `4px solid ${isOnline ? '#00C853' : '#FF3D00'}` }}>
            <div style={styles.statLabel}>ESP32 Status</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
              <span style={{
                width: '12px', height: '12px', borderRadius: '50%',
                backgroundColor: isOnline ? '#00C853' : '#FF3D00',
                display: 'inline-block'
              }} />
              <span style={{ ...styles.statValue, fontSize: '18px', color: isOnline ? '#00C853' : '#FF3D00' }}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>

        </div>

        {/* ── Main section: chart + relay control ── */}
        <div style={styles.mainRow}>

          {/* Left: Load comparison chart */}
          <div style={styles.chartCard}>
            <ReactFC {...this.getComparisonChartConfig()} />

            {/* Per-load stats table below chart */}
            <div style={styles.loadTable}>
              <div style={styles.tableHeader}>
                <span style={{ flex: 2 }}>Load</span>
                <span style={{ flex: 1, textAlign: 'right' }}>Energy</span>
                <span style={{ flex: 1, textAlign: 'right' }}>Cost</span>
                <span style={{ flex: 1, textAlign: 'right' }}>Avg Power</span>
              </div>
              {LOADS.map(cfg => {
                const d = loads.find(l => l.loadId === cfg.id);
                return (
                  <div key={cfg.id} style={styles.tableRow}>
                    <span style={{ flex: 2, color: cfg.color, fontWeight: '600' }}>{cfg.label}</span>
                    <span style={{ flex: 1, textAlign: 'right' }}>
                      {d ? d.energyKwh.toFixed(4) : '0.0000'} kWh
                    </span>
                    <span style={{ flex: 1, textAlign: 'right' }}>
                      ₹{d ? d.costINR.toFixed(2) : '0.00'}
                    </span>
                    <span style={{ flex: 1, textAlign: 'right' }}>
                      {d ? d.avgPowerW.toFixed(1) : '0.0'} W
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Relay control panel */}
          <div style={styles.relayPanel}>
            <div style={styles.relayTitle}>
              Remote Control
              {!isOnline && (
                <span style={styles.offlineBadge}>Device Offline</span>
              )}
            </div>
            <div style={styles.relaySubtitle}>
              Toggle loads on or off remotely. ESP32 polls every 2 seconds.
            </div>

            {LOADS.map(cfg => {
              const state = this.getRelayState(cfg.channel);
              const isOn = state === 'on';
              const busy = relayLoading[cfg.channel];
              const { loadDetected } = this.state;

              return (
                <div key={cfg.channel} style={styles.relayCard}>
                  <div style={styles.relayCardLeft}>
                    <div style={{ ...styles.relayLoadName, color: cfg.color }}>
                      {cfg.label}
                    </div>
                    <div style={styles.relayState}>
                      <span style={{
                        ...styles.stateDot,
                        backgroundColor: isOn ? '#00C853' : '#555566'
                      }} />
                      Relay: {isOn ? 'ON' : 'OFF'}
                    </div>
                    <div style={styles.loadState}>
                      <span style={{
                        ...styles.stateDot,
                        backgroundColor: loadDetected ? '#FFD700' : '#666666'
                      }} />
                      Load: {loadDetected ? 'DETECTED' : 'NO LOAD'}
                    </div>
                  </div>

                  {/* Toggle switch */}
                  <button
                    onClick={() => !busy && isOnline && this.toggleRelay(cfg.channel, state)}
                    disabled={busy || !isOnline}
                    style={{
                      ...styles.toggleBtn,
                      backgroundColor: isOn ? '#00C853' : '#3a3a4a',
                      opacity: (!isOnline || busy) ? 0.4 : 1,
                      cursor: (!isOnline || busy) ? 'not-allowed' : 'pointer'
                    }}
                    title={!isOnline ? 'Device is offline' : `Turn ${isOn ? 'off' : 'on'} ${cfg.label}`}
                  >
                    {busy ? '...' : isOn ? 'Turn OFF' : 'Turn ON'}
                  </button>
                </div>
              );
            })}

            <div style={styles.relayNote}>
              Manual switch override always works regardless of web state.
            </div>
          </div>

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
  cardRow: { display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' },
  statCard: {
    flex: '1 1 180px', backgroundColor: '#2a2a3a', borderRadius: '8px',
    padding: '16px 20px', minWidth: '160px'
  },
  statLabel: {
    fontSize: '11px', color: '#888888', marginBottom: '6px',
    textTransform: 'uppercase', letterSpacing: '0.5px'
  },
  statValue: { fontSize: '28px', fontWeight: '700', color: '#FFFFFF' },
  mainRow: { display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' },
  chartCard: {
    flex: '2 1 480px', backgroundColor: '#1e1e2e', borderRadius: '8px',
    padding: '16px', minWidth: '320px'
  },
  loadTable: { marginTop: '16px' },
  tableHeader: {
    display: 'flex', padding: '8px 12px',
    fontSize: '11px', color: '#666677', textTransform: 'uppercase',
    letterSpacing: '0.5px', borderBottom: '1px solid #2e2e3e'
  },
  tableRow: {
    display: 'flex', padding: '10px 12px', fontSize: '14px', color: '#CCCCCC',
    borderBottom: '1px solid #2a2a3a'
  },
  relayPanel: {
    flex: '1 1 260px', backgroundColor: '#1e1e2e', borderRadius: '8px',
    padding: '20px', minWidth: '240px'
  },
  relayTitle: {
    fontSize: '16px', fontWeight: '700', color: '#FFFFFF',
    marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px'
  },
  relaySubtitle: { fontSize: '12px', color: '#666677', marginBottom: '20px', lineHeight: '1.5' },
  offlineBadge: {
    fontSize: '11px', backgroundColor: '#FF3D00', color: '#FFFFFF',
    padding: '2px 8px', borderRadius: '10px', fontWeight: '600'
  },
  relayCard: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#2a2a3a', borderRadius: '8px', padding: '16px',
    marginBottom: '12px'
  },
  relayCardLeft: { display: 'flex', flexDirection: 'column', gap: '4px' },
  relayLoadName: { fontSize: '16px', fontWeight: '700' },
  relayState: {
    display: 'flex', alignItems: 'center', gap: '6px',
    fontSize: '13px', color: '#AAAAAA'
  },
  loadState: {
    display: 'flex', alignItems: 'center', gap: '6px',
    fontSize: '12px', color: '#999999'
  },
  stateDot: { width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block' },
  toggleBtn: {
    border: 'none', borderRadius: '6px', padding: '10px 20px',
    fontSize: '14px', fontWeight: '700', color: '#FFFFFF',
    transition: 'background-color 0.2s, opacity 0.2s', minWidth: '90px'
  },
  relayNote: {
    fontSize: '11px', color: '#555566', marginTop: '16px',
    lineHeight: '1.5', fontStyle: 'italic'
  }
};

const mapStateToProps = (state) => ({ energy: state.energy });
export default connect(mapStateToProps)(AppliancesComponent);
