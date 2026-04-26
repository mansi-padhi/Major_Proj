import React from 'react';
import { connect } from 'react-redux';
import ReactFC from 'react-fusioncharts';
import FusionCharts from 'fusioncharts';
import Widgets from 'fusioncharts/fusioncharts.widgets';
import Charts from 'fusioncharts/fusioncharts.charts';
import FusionTheme from 'fusioncharts/themes/fusioncharts.theme.fusion';

Charts(FusionCharts);
Widgets(FusionCharts);
FusionTheme(FusionCharts);
FusionCharts.options.creditLabel = false;

const API = 'http://localhost:5000/api';
const RATE = 8; // ₹8 per kWh

class DashboardComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hourly: [],       // 24-element array from /api/dashboard/today
      live: null,       // latest reading
      totals: {},       // today totals
      loading: true,
      liveLoading: false
    };
    this._liveTimer = null;
  }

  componentDidMount() {
    this.fetchTodayData();
    // Refresh live gauge every 6 seconds
    this._liveTimer = setInterval(() => this.fetchLive(), 6000);
  }

  componentWillUnmount() {
    clearInterval(this._liveTimer);
  }

  async fetchTodayData() {
    try {
      const res = await fetch(`${API}/dashboard/today`);
      const data = await res.json();
      if (data.success) {
        this.setState({
          hourly: data.hourly || [],
          live: data.live,
          totals: data.totals || {},
          loading: false
        });
      }
    } catch (e) {
      console.error('Dashboard fetch error:', e);
      this.setState({ loading: false });
    }
  }

  async fetchLive() {
    try {
      const res = await fetch(`${API}/dashboard/today`);
      const data = await res.json();
      if (data.success) {
        this.setState({ live: data.live, totals: data.totals || {} });
      }
    } catch (e) { /* silent */ }
  }

  // ── Chart 1: Hourly Usage Bar Chart ──────────────────────────────────────
  getHourlyChartConfig() {
    const { hourly } = this.state;
    const currentHour = new Date().getHours();

    const data = hourly.map((h, i) => ({
      label: h.label,
      value: h.energyKwh,
      color: i === currentHour ? '#00D4FF' : '#4A90D9',
      toolText: `${h.label}: ${h.energyKwh} kWh  |  ₹${h.costINR}  |  Avg ${h.avgPowerW} W`
    }));

    return {
      type: 'column2d',
      width: '100%',
      height: '320',
      dataFormat: 'json',
      dataSource: {
        chart: {
          caption: "Today's Hourly Energy Usage",
          subCaption: 'kWh consumed per hour  (current hour highlighted)',
          xAxisName: 'Hour of Day',
          yAxisName: 'Energy (kWh)',
          numberSuffix: ' kWh',
          theme: 'fusion',
          bgColor: '#1e1e2e',
          canvasBgColor: '#1e1e2e',
          baseFontColor: '#CCCCCC',
          captionFontColor: '#FFFFFF',
          subCaptionFontColor: '#AAAAAA',
          xAxisNameFontColor: '#AAAAAA',
          yAxisNameFontColor: '#AAAAAA',
          showValues: '0',
          showBorder: '0',
          showCanvasBorder: '0',
          divLineColor: '#2e2e3e',
          divLineAlpha: '80',
          showAlternateHGridColor: '0',
          plotBorderAlpha: '0',
          paletteColors: '#4A90D9',
          toolTipBgColor: '#2a2a3a',
          toolTipColor: '#FFFFFF',
          toolTipBorderColor: '#00D4FF',
          labelFontSize: '11',
          labelFontColor: '#888888',
          rotateLabels: '1',
          slantLabels: '1',
          labelDisplay: 'rotate',
          useRoundEdges: '1',
          animation: '1'
        },
        data
      }
    };
  }

  // ── Chart 4: Live Power Gauge ─────────────────────────────────────────────
  getLiveGaugeConfig() {
    const { live } = this.state;
    const powerW = live ? live.powerW : 0;
    // Gauge range: 0 – 3000 W (covers most household loads)
    return {
      type: 'angulargauge',
      width: '100%',
      height: '320',
      dataFormat: 'json',
      dataSource: {
        chart: {
          caption: 'Live Power Draw',
          subCaption: live
            ? `${live.voltageV} V  ·  ${live.currentA} A  ·  ${live.loadName || 'Load 1'}`
            : 'Waiting for ESP32...',
          lowerLimit: '0',
          upperLimit: '3000',
          numberSuffix: ' W',
          theme: 'fusion',
          bgColor: '#1e1e2e',
          canvasBgColor: '#1e1e2e',
          baseFontColor: '#CCCCCC',
          captionFontColor: '#FFFFFF',
          subCaptionFontColor: '#AAAAAA',
          showBorder: '0',
          gaugeOuterRadius: '110',
          gaugeInnerRadius: '70',
          pivotRadius: '8',
          pivotFillColor: '#00D4FF',
          showGaugeBorder: '0',
          majorTMNumber: '7',
          minorTMNumber: '4',
          majorTMColor: '#555566',
          minorTMColor: '#444455',
          tickValueDistance: '5',
          tickValueFontSize: '11',
          tickValueFontColor: '#888888',
          showValue: '1',
          valueFontSize: '22',
          valueFontBold: '1',
          valueFontColor: '#FFFFFF',
          toolTipBgColor: '#2a2a3a',
          toolTipColor: '#FFFFFF',
          animation: '0'  // no animation on live updates
        },
        colorRange: {
          color: [
            { minValue: '0',    maxValue: '500',  code: '#00C853', label: 'Low' },
            { minValue: '500',  maxValue: '1500', code: '#FFD600', label: 'Medium' },
            { minValue: '1500', maxValue: '3000', code: '#FF3D00', label: 'High' }
          ]
        },
        dials: {
          dial: [{ value: powerW, rearExtension: '10' }]
        }
      }
    };
  }

  render() {
    const { loading, live, totals } = this.state;
    const powerW = live ? live.powerW : 0;

    // Determine gauge status colour
    let statusColor = '#00C853';
    let statusLabel = 'Low';
    if (powerW > 1500) { statusColor = '#FF3D00'; statusLabel = 'High'; }
    else if (powerW > 500) { statusColor = '#FFD600'; statusLabel = 'Medium'; }

    if (loading) {
      return (
        <div style={styles.loadingBox}>
          <div style={styles.loadingText}>Loading dashboard data...</div>
        </div>
      );
    }

    return (
      <div style={{ padding: '0 8px' }}>

        {/* ── Summary stat cards ── */}
        <div style={styles.cardRow}>
          <StatCard label="Energy Today" value={`${totals.energyKwh || 0} kWh`} color="#00D4FF" />
          <StatCard label="Cost Today" value={`₹${totals.costINR || 0}`} color="#FFA500" />
          <StatCard label="Avg Power" value={`${totals.avgPowerW || 0} W`} color="#00C853" />
          <StatCard label="Peak Power" value={`${totals.maxPowerW || 0} W`} color="#FF3D00" />
        </div>

        {/* ── Two charts side by side ── */}
        <div style={styles.chartRow}>

          {/* Chart 1 — Hourly Usage */}
          <div style={styles.chartCard}>
            <ReactFC {...this.getHourlyChartConfig()} />
          </div>

          {/* Chart 4 — Live Power Gauge */}
          <div style={styles.chartCard}>
            <ReactFC {...this.getLiveGaugeConfig()} />

            {/* Live status badge below gauge */}
            <div style={styles.liveRow}>
              <span style={{ ...styles.liveDot, backgroundColor: statusColor }} />
              <span style={styles.liveLabel}>
                {live ? `${powerW} W  ·  ${statusLabel}` : 'No live data'}
              </span>
              {live && (
                <span style={styles.liveTime}>
                  {new Date(live.timestamp).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>

        </div>
      </div>
    );
  }
}

// ── Small reusable stat card ──────────────────────────────────────────────────
function StatCard({ label, value, color }) {
  return (
    <div style={{ ...styles.statCard, borderLeft: `4px solid ${color}` }}>
      <div style={styles.statLabel}>{label}</div>
      <div style={{ ...styles.statValue, color }}>{value}</div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  loadingBox: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '400px', backgroundColor: '#1e1e2e', borderRadius: '8px'
  },
  loadingText: { color: '#AAAAAA', fontSize: '16px' },
  cardRow: {
    display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap'
  },
  statCard: {
    flex: '1 1 160px', backgroundColor: '#2a2a3a', borderRadius: '8px',
    padding: '16px 20px', minWidth: '140px'
  },
  statLabel: { fontSize: '12px', color: '#888888', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  statValue: { fontSize: '26px', fontWeight: '700' },
  chartRow: {
    display: 'flex', gap: '16px', flexWrap: 'wrap'
  },
  chartCard: {
    flex: '1 1 420px', backgroundColor: '#1e1e2e', borderRadius: '8px',
    padding: '16px', minWidth: '320px'
  },
  liveRow: {
    display: 'flex', alignItems: 'center', gap: '8px',
    marginTop: '12px', paddingLeft: '8px'
  },
  liveDot: {
    width: '10px', height: '10px', borderRadius: '50%',
    display: 'inline-block', flexShrink: 0
  },
  liveLabel: { color: '#CCCCCC', fontSize: '14px', fontWeight: '600' },
  liveTime: { color: '#666677', fontSize: '12px', marginLeft: 'auto' }
};

export default connect()(DashboardComponent);
