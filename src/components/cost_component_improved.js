import React from 'react';
import { connect } from 'react-redux';
import ReactFC from 'react-fusioncharts';
import { fetchCost } from '../actions/index';

class CostComponentImproved extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            compareMode: false // false = current period, true = compare with previous
        };
    }

    componentDidMount() {
        // Set default to current period
        this.setState({ compareMode: false });

        // Fetch cost data from backend
        const { dispatch, energy } = this.props;
        const period = (energy && energy.period) || 'month';
        dispatch(fetchCost(period));
    }

    componentDidUpdate(prevProps) {
        // Fetch new data when period changes
        const prevPeriod = prevProps.energy && prevProps.energy.period;
        const currentPeriod = this.props.energy && this.props.energy.period;

        if (prevPeriod !== currentPeriod) {
            this.props.dispatch(fetchCost(currentPeriod || 'month'));
        }
    }

    getCostChartConfig() {
        const { energy } = this.props;
        const period = (energy && energy.period) || 'month';
        const costData = energy && energy.cost && energy.cost[period];

        // Show empty chart if no data from MongoDB
        if (!costData || !costData.data || costData.data.length === 0) {
            return {
                type: 'msline',
                width: '100%',
                height: '400',
                dataFormat: 'json',
                dataSource: {
                    chart: {
                        caption: 'Energy Cost Analysis',
                        subCaption: 'Waiting for data from ESP32...',
                        xAxisName: 'Time',
                        yAxisName: 'Cost (₹)',
                        theme: 'ocean',
                        bgColor: '#1e1e2e',
                        canvasBgColor: '#1e1e2e',
                        baseFontColor: '#FDFDFD',
                        showValues: '0'
                    },
                    data: []
                }
            };
        }

        // Transform data for chart
        const chartData = [];
        if (costData.data && Array.isArray(costData.data)) {
            costData.data.forEach(item => {
                chartData.push({
                    label: item.label || item.date || item.hour || '',
                    value: parseFloat(item.cost || 0).toFixed(2)
                });
            });
        }

        const xAxisName = period === 'today' ? 'Hour' : period === 'month' ? 'Day' : 'Month';
        const totalCost = costData.totalCost || 0;

        return {
            type: 'msline',
            width: '100%',
            height: '400',
            dataFormat: 'json',
            dataSource: {
                chart: {
                    caption: `Energy Cost - ${period.charAt(0).toUpperCase() + period.slice(1)}`,
                    subCaption: `Total: ₹${totalCost.toFixed(2)} | Rate: ₹7/kWh`,
                    xAxisName: xAxisName,
                    yAxisName: 'Cost (₹)',
                    numberPrefix: '₹',
                    theme: 'ocean',
                    bgColor: '#1e1e2e',
                    canvasBgColor: '#1e1e2e',
                    baseFontColor: '#FDFDFD',
                    showValues: '0',
                    lineThickness: '3',
                    anchorRadius: '4',
                    paletteColors: '#00D4FF',
                    divLineColor: '#3a3a4a',
                    divLineAlpha: '50',
                    labelDisplay: 'rotate',
                    slantLabel: '1'
                },
                data: chartData
            }
        };
    }

    getCostStats() {
        const { energy } = this.props;
        const period = (energy && energy.period) || 'month';
        const costData = energy && energy.cost && energy.cost[period];

        if (!costData) {
            return {
                current: 0,
                previous: 0,
                predicted: 0,
                savings: 0
            };
        }

        return {
            current: costData.totalCost || 0,
            previous: costData.previousCost || 0,
            predicted: costData.predictedCost || 0,
            savings: (costData.previousCost || 0) - (costData.totalCost || 0)
        };
    }

    getPeriodLabel() {
        const { energy } = this.props;
        const period = (energy && energy.period) || 'month';

        switch (period) {
            case 'today':
                return {
                    current: 'Today',
                    previous: 'Yesterday',
                    format: 'MMM Do YYYY'
                };
            case 'month':
                return {
                    current: 'This Month',
                    previous: 'Last Month',
                    format: 'MMMM YYYY'
                };
            case 'year':
                return {
                    current: 'This Year',
                    previous: 'Last Year',
                    format: 'YYYY'
                };
            default:
                return {
                    current: 'Current',
                    previous: 'Previous',
                    format: 'MMM Do YYYY'
                };
        }
    }

    render() {
        const chartConfig = this.getCostChartConfig();
        const stats = this.getCostStats();
        const labels = this.getPeriodLabel();
        const { compareMode } = this.state;
        const { energy } = this.props;
        const period = (energy && energy.period) || 'month';

        return (
            <div>
                {/* Toggle Buttons */}
                <div className="container-fluid">
                    <div className="row pl-5 pr-5 pt-5 pb-0 time-control">
                        <div
                            className={`col-xs-6 mr-4 ml-4 pl-1 pr-1 ${!compareMode ? 'active' : ''}`}
                            id="c1"
                            onClick={() => this.setState({ compareMode: false })}
                            style={{
                                cursor: 'pointer',
                                borderBottom: !compareMode ? 'solid 2px #FDFDFD' : 'none',
                                opacity: !compareMode ? '1' : '0.5',
                                color: '#FDFDFD',
                                textTransform: 'uppercase',
                                padding: '10px',
                                textAlign: 'center'
                            }}
                        >
                            {labels.current}
                        </div>
                        <div
                            className={`col-xs-6 mr-4 ml-4 pl-1 pr-1 ${compareMode ? 'active' : ''}`}
                            id="c2"
                            onClick={() => this.setState({ compareMode: true })}
                            style={{
                                cursor: 'pointer',
                                borderBottom: compareMode ? 'solid 2px #FDFDFD' : 'none',
                                opacity: compareMode ? '1' : '0.5',
                                color: '#FDFDFD',
                                textTransform: 'uppercase',
                                padding: '10px',
                                textAlign: 'center'
                            }}
                        >
                            {labels.previous}
                        </div>
                    </div>
                </div>

                <br />

                {/* Stats and Additional Info */}
                <div className="container-fluid pl-5 pr-5">
                    <div className="row">
                        <div className="col-md-8">
                            <div id="co-chart-container">
                                <ReactFC {...chartConfig} />
                            </div>

                            {/* Additional Cost Breakdown */}
                            <div style={{
                                backgroundColor: '#2a2a3a',
                                borderRadius: '8px',
                                padding: '20px',
                                color: '#FDFDFD',
                                marginTop: '20px'
                            }}>
                                <h4 style={{ marginBottom: '20px', borderBottom: '2px solid #00D4FF', paddingBottom: '10px' }}>
                                    <span role="img" aria-label="money">💰</span> Cost Breakdown
                                </h4>
                                <div className="row">
                                    <div className="col-md-4" style={{ marginBottom: '15px' }}>
                                        <div style={{ fontSize: '12px', opacity: '0.7', marginBottom: '5px' }}>
                                            Energy Consumed
                                        </div>
                                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#00D4FF' }}>
                                            {((stats.current / 7) || 0).toFixed(2)} kWh
                                        </div>
                                    </div>
                                    <div className="col-md-4" style={{ marginBottom: '15px' }}>
                                        <div style={{ fontSize: '12px', opacity: '0.7', marginBottom: '5px' }}>
                                            Rate per kWh
                                        </div>
                                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#FFA500' }}>
                                            ₹7.00
                                        </div>
                                    </div>
                                    <div className="col-md-4" style={{ marginBottom: '15px' }}>
                                        <div style={{ fontSize: '12px', opacity: '0.7', marginBottom: '5px' }}>
                                            Daily Average
                                        </div>
                                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#00FF00' }}>
                                            ₹{(stats.current / 30 || 0).toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="cost-stats-table" style={{
                                backgroundColor: '#2a2a3a',
                                borderRadius: '8px',
                                padding: '20px',
                                color: '#FDFDFD',
                                marginBottom: '20px'
                            }}>
                                <h4 style={{ marginBottom: '20px', borderBottom: '2px solid #00D4FF', paddingBottom: '10px' }}>
                                    <span role="img" aria-label="chart">📊</span> Summary
                                </h4>
                                <div className="stat-row" style={{ marginBottom: '20px', borderBottom: '1px solid #3a3a4a', paddingBottom: '15px' }}>
                                    <div className="stat-title" style={{ fontSize: '14px', opacity: '0.7', marginBottom: '5px' }}>
                                        {labels.previous}
                                    </div>
                                    <div className="stat-value" style={{ fontSize: '24px', fontWeight: 'bold' }}>
                                        ₹{stats.previous.toFixed(2)}
                                    </div>
                                </div>

                                <div className="stat-row" style={{ marginBottom: '20px', borderBottom: '1px solid #3a3a4a', paddingBottom: '15px' }}>
                                    <div className="stat-title" style={{ fontSize: '14px', opacity: '0.7', marginBottom: '5px' }}>
                                        {labels.current}
                                    </div>
                                    <div className="stat-value" style={{ fontSize: '28px', fontWeight: 'bold', color: '#00D4FF' }}>
                                        ₹{stats.current.toFixed(2)}
                                    </div>
                                </div>

                                {period !== 'year' && (
                                    <div className="stat-row" style={{ marginBottom: '20px', borderBottom: '1px solid #3a3a4a', paddingBottom: '15px' }}>
                                        <div className="stat-title" style={{ fontSize: '14px', opacity: '0.7', marginBottom: '5px' }}>
                                            Predicted {labels.current}
                                        </div>
                                        <div className="stat-value" style={{ fontSize: '24px', fontWeight: 'bold', color: '#FFA500' }}>
                                            ₹{stats.predicted.toFixed(2)}
                                        </div>
                                    </div>
                                )}

                                <div className="stat-row">
                                    <div className="stat-title" style={{ fontSize: '14px', opacity: '0.7', marginBottom: '5px' }}>
                                        {stats.savings >= 0
                                            ? <span><span role="img" aria-label="green heart">💚</span> Savings</span>
                                            : <span><span role="img" aria-label="warning">⚠️</span> Extra Cost</span>
                                        }
                                    </div>
                                    <div className="stat-value" style={{
                                        fontSize: '28px',
                                        fontWeight: 'bold',
                                        color: stats.savings >= 0 ? '#00FF00' : '#FF4444'
                                    }}>
                                        {stats.savings >= 0 ? '+' : ''}₹{Math.abs(stats.savings).toFixed(2)}
                                    </div>
                                </div>
                            </div>

                            {/* Tips Section */}
                            <div style={{
                                backgroundColor: '#2a2a3a',
                                borderRadius: '8px',
                                padding: '20px',
                                color: '#FDFDFD'
                            }}>
                                <h4 style={{ marginBottom: '15px', borderBottom: '2px solid #00D4FF', paddingBottom: '10px' }}>
                                    <span role="img" aria-label="bulb">💡</span> Energy Saving Tips
                                </h4>
                                <ul style={{ fontSize: '14px', lineHeight: '1.8', paddingLeft: '20px' }}>
                                    <li>Turn off lights when not in use</li>
                                    <li>Use LED bulbs instead of incandescent</li>
                                    <li>Unplug devices when not in use</li>
                                    <li>Set AC to 24-26°C for optimal efficiency</li>
                                    <li>Regular maintenance of appliances</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

const mapStateToProps = (state) => ({
    energy: state.energy
});

export default connect(mapStateToProps)(CostComponentImproved);
