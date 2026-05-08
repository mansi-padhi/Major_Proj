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

// Load configuration
const LOADS = [
  { id: 'Load1', label: 'Load 1', color: '#00D4FF' },
  { id: 'Load2', label: 'Load 2', color: '#FFA500' }
];

class AppliancesYearComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loads: [],
      totals: [],
      loading: true,
      year: null
    };
  }

  componentDidMount() {
    this.fetchYearData();
  }

  async fetchYearData() {
    try {
      const res = await fetch(`${API}/loads/year`);
      const data = await res.json();
      if (data.success) {
        this.setState({
          loads: data.loads || [],
          totals: data.totals || [],
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
    const { loads } = this.state;
    const currentMonth = new Date().getMonth() + 1;

    // Build datasets for each load
    const datasets = LOADS.map(cfg => {
      const loadData = loads.find(l => l.loadId === cfg.id);
      if (!loadData) {
        return {
          seriesname: cfg.label,
          data: []
        };
      }

      const data = loadData.monthly.map(m => ({
        value: m.energyKwh,
        color: m.month === currentMonth ? cfg.color : undefined,
        toolText: `${cfg.label} - ${m.label}: ${m.energyKwh.toFixed(8)} kWh | ₹${m.costINR.toFixed(4)} | Avg ${m.avgPowerW} W`
      }));

      return {
        seriesname: cfg.label,
        data
      };
    });

    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const categories = monthLabels.map(label => ({ label }));

    return {
      type: 'mscolumn2d',
      width: '100%',
      height: '400',
      dataFormat: 'json',
      dataSource: {
        chart: {
          caption: 'Monthly Energy Usage by Load',
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
          paletteColors: LOADS.map(l => l.color).join(','),
          toolTipBgColor: '#2a2a3a',
          toolTipColor: '#FFFFFF',
          toolTipBorderColor: '#00D4FF',
          labelFontSize: '11',
          labelFontColor: '#888888',
          legendBgAlpha: '0',
          legendBorderAlpha: '0',
          legendFontColor: '#CCCCCC',
          useRoundEdges: '1',
          animation: '1'
        },
        categories: [{ category: categories }],
        dataset: datasets
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

    // Calculate overall totals
    const overallEnergy = totals.reduce((sum, l) => sum + l.energyKwh, 0);
    const overallCost = totals.reduce((sum, l) => sum + l.costINR, 0);
    const overallAvgPower = totals.length > 0
      ? Math.round(totals.reduce((sum, l) => sum + l.avgPowerW, 0) / totals.length)
      : 0;
    const overallMaxPower = totals.length > 0
      ? Math.max(...totals.map(l => l.maxPowerW))
      : 0;

    return (
      <div style={{ padding: '0 8px' }}>
        
        {/* Year header */}
        <div style={styles.header}>
          <h2 style={styles.headerTitle}>{year} Annual Load Breakdown</h2>
        </div>

        {/* Overall summary stat cards */}
        <div style={styles.cardRow}>
          <StatCard label="Total Energy" value={`${overallEnergy.toFixed(8)} kWh`} color="#00D4FF" />
          <StatCard label="Total Cost" value={`₹${overallCost.toFixed(4)}`} color="#FFA500" />
          <StatCard label="Avg Power" value={`${overallAvgPower} W`} color="#00C853" />
          <StatCard label="Peak Power" value={`${overallMaxPower} W`} color="#FF3D00" />
        </div>

        {/* Monthly usage chart */}
        <div style={styles.chartCard}>
          <ReactFC {...this.getMonthlyChartConfig()} />
        </div>

        {/* Per-load summary table */}
        <div style={styles.tableCard}>
          <div style={styles.tableTitle}>Load Summary for {year}</div>
          <div style={styles.loadTable}>
            <div style={styles.tableHeader}>
              <span style={{ flex: 2 }}>Load</span>
              <span style={{ flex: 1, textAlign: 'right' }}>Energy (kWh)</span>
              <span style={{ flex: 1, textAlign: 'right' }}>Cost (₹)</span>
              <span style={{ flex: 1, textAlign: 'right' }}>Avg Power (W)</span>
              <span style={{ flex: 1, textAlign: 'right' }}>Peak Power (W)</span>
            </div>
            {LOADS.map(cfg => {
              const loadTotal = totals.find(t => t.loadId === cfg.id);
              return (
                <div key={cfg.id} style={styles.tableRow}>
                  <span style={{ flex: 2, color: cfg.color, fontWeight: '600' }}>
                    {cfg.label}
                  </span>
                  <span style={{ flex: 1, textAlign: 'right' }}>
                    {loadTotal ? loadTotal.energyKwh.toFixed(8) : '0.00000000'}
                  </span>
                  <span style={{ flex: 1, textAlign: 'right' }}>
                    {loadTotal ? loadTotal.costINR.toFixed(4) : '0.0000'}
                  </span>
                  <span style={{ flex: 1, textAlign: 'right' }}>
                    {loadTotal ? loadTotal.avgPowerW : 0}
                  </span>
                  <span style={{ flex: 1, textAlign: 'right' }}>
                    {loadTotal ? loadTotal.maxPowerW : 0}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Energy tip */}
        <div style={styles.tipBox}>
          <span style={styles.tipIcon}>📊</span>
          <span style={styles.tipText}>
            Analyze yearly trends to understand seasonal variations and plan for high-consumption periods.
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
  tableCard: {
    backgroundColor: '#1e1e2e', borderRadius: '8px',
    padding: '20px', marginBottom: '20px'
  },
  tableTitle: {
    fontSize: '16px', fontWeight: '700', color: '#FFFFFF',
    marginBottom: '16px'
  },
  loadTable: { width: '100%' },
  tableHeader: {
    display: 'flex', padding: '8px 12px',
    fontSize: '11px', color: '#666677', textTransform: 'uppercase',
    letterSpacing: '0.5px', borderBottom: '1px solid #2e2e3e'
  },
  tableRow: {
    display: 'flex', padding: '10px 12px', fontSize: '14px', color: '#CCCCCC',
    borderBottom: '1px solid #2a2a3a'
  },
  tipBox: {
    display: 'flex', alignItems: 'center', gap: '12px',
    backgroundColor: '#2a2a3a', borderRadius: '8px',
    padding: '16px', borderLeft: '4px solid #00D4FF'
  },
  tipIcon: { fontSize: '24px', flexShrink: 0 },
  tipText: { color: '#CCCCCC', fontSize: '14px', lineHeight: '1.5' }
};

export default connect()(AppliancesYearComponent);
