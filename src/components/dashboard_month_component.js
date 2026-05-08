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

class DashboardMonthComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      daily: [],
      totals: {},
      loading: true,
      month: null,
      year: null
    };
  }

  componentDidMount() {
    this.fetchMonthData();
  }

  async fetchMonthData() {
    try {
      const res = await fetch(`${API}/dashboard/month`);
      const data = await res.json();
      if (data.success) {
        this.setState({
          daily: data.daily || [],
          totals: data.totals || {},
          month: data.month,
          year: data.year,
          loading: false
        });
      }
    } catch (e) {
      console.error('Month data fetch error:', e);
      this.setState({ loading: false });
    }
  }

  getDailyChartConfig() {
    const { daily } = this.state;
    const today = new Date().getDate();

    const data = daily.map((d) => ({
      label: d.label,
      value: d.energyKwh,
      color: d.day === today ? '#00D4FF' : '#4A90D9',
      toolText: `${d.label}: ${d.energyKwh.toFixed(8)} kWh  |  ₹${d.costINR.toFixed(4)}  |  Avg ${d.avgPowerW} W`
    }));

    return {
      type: 'column2d',
      width: '100%',
      height: '400',
      dataFormat: 'json',
      dataSource: {
        chart: {
          caption: 'Daily Energy Usage This Month',
          subCaption: 'kWh consumed per day (today highlighted)',
          xAxisName: 'Day of Month',
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
          labelFontSize: '10',
          labelFontColor: '#888888',
          useRoundEdges: '1',
          animation: '1'
        },
        data
      }
    };
  }

  render() {
    const { loading, totals, month, year } = this.state;

    if (loading) {
      return (
        <div style={styles.loadingBox}>
          <div style={styles.loadingText}>Loading month data...</div>
        </div>
      );
    }

    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];

    return (
      <div style={{ padding: '0 8px' }}>
        
        {/* Month header */}
        <div style={styles.header}>
          <h2 style={styles.headerTitle}>{monthNames[month]} {year}</h2>
        </div>

        {/* Summary stat cards */}
        <div style={styles.cardRow}>
          <StatCard label="Total Energy" value={`${parseFloat(totals.energyKwh || 0).toFixed(8)} kWh`} color="#00D4FF" />
          <StatCard label="Total Cost" value={`₹${parseFloat(totals.costINR || 0).toFixed(4)}`} color="#FFA500" />
          <StatCard label="Avg Power" value={`${totals.avgPowerW || 0} W`} color="#00C853" />
          <StatCard label="Peak Power" value={`${totals.maxPowerW || 0} W`} color="#FF3D00" />
        </div>

        {/* Daily usage chart */}
        <div style={styles.chartCard}>
          <ReactFC {...this.getDailyChartConfig()} />
        </div>

        {/* Energy tip */}
        <div style={styles.tipBox}>
          <span style={styles.tipIcon}>💡</span>
          <span style={styles.tipText}>
            Track your daily patterns to identify high-usage days and optimize consumption.
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

export default connect()(DashboardMonthComponent);
