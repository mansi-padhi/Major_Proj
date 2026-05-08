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

class DashboardYearComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      monthly: [],
      totals: {},
      loading: true,
      year: null
    };
  }

  componentDidMount() {
    this.fetchYearData();
  }

  async fetchYearData() {
    try {
      const res = await fetch(`${API}/dashboard/year`);
      const data = await res.json();
      if (data.success) {
        this.setState({
          monthly: data.monthly || [],
          totals: data.totals || {},
          year: data.year,
          loading: false
        });
      }
    } catch (e) {
      console.error('Year data fetch error:', e);
      this.setState({ loading: false });
    }
  }

  getMonthlyChartConfig() {
    const { monthly } = this.state;
    const currentMonth = new Date().getMonth() + 1;

    const data = monthly.map((m) => ({
      label: m.label,
      value: m.energyKwh,
      color: m.month === currentMonth ? '#00D4FF' : '#4A90D9',
      toolText: `${m.label}: ${m.energyKwh.toFixed(8)} kWh  |  ₹${m.costINR.toFixed(4)}  |  Avg ${m.avgPowerW} W`
    }));

    return {
      type: 'column2d',
      width: '100%',
      height: '400',
      dataFormat: 'json',
      dataSource: {
        chart: {
          caption: 'Monthly Energy Usage This Year',
          subCaption: 'kWh consumed per month (current month highlighted)',
          xAxisName: 'Month',
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
          useRoundEdges: '1',
          animation: '1'
        },
        data
      }
    };
  }

  render() {
    const { loading, totals, year } = this.state;

    if (loading) {
      return (
        <div style={styles.loadingBox}>
          <div style={styles.loadingText}>Loading year data...</div>
        </div>
      );
    }

    return (
      <div style={{ padding: '0 8px' }}>
        
        {/* Year header */}
        <div style={styles.header}>
          <h2 style={styles.headerTitle}>{year} Annual Summary</h2>
        </div>

        {/* Summary stat cards */}
        <div style={styles.cardRow}>
          <StatCard label="Total Energy" value={`${parseFloat(totals.energyKwh || 0).toFixed(8)} kWh`} color="#00D4FF" />
          <StatCard label="Total Cost" value={`₹${parseFloat(totals.costINR || 0).toFixed(4)}`} color="#FFA500" />
          <StatCard label="Avg Power" value={`${totals.avgPowerW || 0} W`} color="#00C853" />
          <StatCard label="Peak Power" value={`${totals.maxPowerW || 0} W`} color="#FF3D00" />
        </div>

        {/* Monthly usage chart */}
        <div style={styles.chartCard}>
          <ReactFC {...this.getMonthlyChartConfig()} />
        </div>

        {/* Energy tip */}
        <div style={styles.tipBox}>
          <span style={styles.tipIcon}>📊</span>
          <span style={styles.tipText}>
            Compare monthly trends to identify seasonal patterns and plan for high-usage periods.
          </span>
        </div>
      </div>
    );
  }
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ ...styles.statCard, borderLeft: `4px solid ${color}` }}>
      <div style={styles.statLabel}>{label}</div>
      <div style={{ ...styles.statValue, color }}>{value}</div>
    </div>
  );
}

const styles = {
  loadingBox: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '400px', backgroundColor: '#1e1e2e', borderRadius: '8px'
  },
  loadingText: { color: '#AAAAAA', fontSize: '16px' },
  header: {
    marginBottom: '20px', paddingBottom: '12px',
    borderBottom: '2px solid #2e2e3e'
  },
  headerTitle: {
    margin: 0, fontSize: '24px', fontWeight: '700',
    color: '#FFFFFF'
  },
  cardRow: {
    display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap'
  },
  statCard: {
    flex: '1 1 160px', backgroundColor: '#2a2a3a', borderRadius: '8px',
    padding: '16px 20px', minWidth: '140px'
  },
  statLabel: { 
    fontSize: '12px', color: '#888888', marginBottom: '6px', 
    textTransform: 'uppercase', letterSpacing: '0.5px' 
  },
  statValue: { fontSize: '22px', fontWeight: '700' },
  chartCard: {
    backgroundColor: '#1e1e2e', borderRadius: '8px',
    padding: '16px', marginBottom: '20px'
  },
  tipBox: {
    display: 'flex', alignItems: 'center', gap: '12px',
    backgroundColor: '#2a2a3a', borderRadius: '8px',
    padding: '16px', borderLeft: '4px solid #00D4FF'
  },
  tipIcon: { fontSize: '24px', flexShrink: 0 },
  tipText: { color: '#CCCCCC', fontSize: '14px', lineHeight: '1.5' }
};

export default connect()(DashboardYearComponent);
