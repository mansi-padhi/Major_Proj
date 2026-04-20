import React from 'react';
import { connect } from 'react-redux';
import ReactFC from 'react-fusioncharts';
import moment from 'moment';

class CostComponentDynamic extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            selectedView: 'current' // 'current' or 'previous'
        };
    }

    componentDidMount() {
        this.setState({ selectedView: 'current' });
    }

    getChartData() {
        const { period, cost } = this.props;
        const { selectedView } = this.state;

        if (!cost || !cost[period]) {
            return this.getEmptyChart();
        }

        const data = cost[period];

        // Build chart based on period
        let categories = [];
        let values = [];

        if (period === 'today') {
            // Hourly data
            for (let i = 0; i < 24; i++) {
                categories.push({ label: `${i}:00` });
                values.push({ value: (Math.random() * 2).toFixed(2) }); // Placeholder
            }
        } else if (period === 'month') {
            // Daily data
            const days = moment().daysInMonth();
            for (let i = 1; i <= days; i++) {
                categories.push({ label: String(i) });
                values.push({ value: (Math.random() * 50).toFixed(2) }); // Placeholder
            }
        } else {
            // Monthly data
            for (let i = 0; i < 12; i++) {
                categories.push({ label: moment().month(i).format('MMM') });
                values.push({ value: (Math.random() * 500).toFixed(2) }); // Placeholder
            }
        }

        return {
            chart: {
                caption: selectedView === 'current' ? 'Current Period Cost' : 'Previous Period Cost',
                subCaption: `₹ per ${period === 'today' ? 'hour' : period === 'month' ? 'day' : 'month'}`,
                xAxisName: period === 'today' ? 'Hour' : period === 'month' ? 'Day' : 'Month',
                yAxisName: 'Cost (₹)',
                theme: 'ocean',
                bgColor: '#1D1B41',
                bgAlpha: '0',
                canvasBgAlpha: '0',
                showBorder: '0',
                showCanvasBorder: '0',
                paletteColors: '#58E2C2',
                baseFontColor: '#FDFDFD',
                baseFont: 'Nunito Sans'
            },
            categories: [{ category: categories }],
            dataset: [{
                data: values
            }]
        };
    }

    getEmptyChart() {
        return {
            chart: {
                caption: 'No Cost Data Available',
                theme: 'ocean',
                bgColor: '#1D1B41',
                bgAlpha: '0'
            },
            data: []
        };
    }

    render() {
        const { period, cost, loading } = this.props;
        const { selectedView } = this.state;

        const costData = cost && cost[period];
        const totalCost = costData ? costData.totalCost : 0;
        const totalEnergy = costData ? costData.totalEnergy : 0;

        return (
            <div>
                <div className="container-fluid">
                    <div className="row pl-5 pr-5 pt-5 pb-0 time-control">
                        <div
                            className={`col-xs-6 mr-4 ml-4 pl-1 pr-1 ${selectedView === 'current' ? 'active' : ''}`}
                            style={{
                                borderBottom: selectedView === 'current' ? 'solid 2px #FDFDFD' : 'none',
                                opacity: selectedView === 'current' ? 1 : 0.5,
                                cursor: 'pointer'
                            }}
                            onClick={() => this.setState({ selectedView: 'current' })}
                        >
                            THIS {period.toUpperCase()}
                        </div>
                        <div
                            className={`col-xs-6 mr-4 ml-4 pl-1 pr-1 ${selectedView === 'previous' ? 'active' : ''}`}
                            style={{
                                borderBottom: selectedView === 'previous' ? 'solid 2px #FDFDFD' : 'none',
                                opacity: selectedView === 'previous' ? 1 : 0.5,
                                cursor: 'pointer'
                            }}
                            onClick={() => this.setState({ selectedView: 'previous' })}
                        >
                            LAST {period.toUpperCase()}
                        </div>
                    </div>
                </div>
                <br />

                {/* Cost Summary Table */}
                <div className="container-fluid pl-5 pr-5">
                    <div className="row">
                        <div className="col-md-6">
                            <div style={{ color: '#FDFDFD', marginBottom: '10px' }}>
                                <strong>Total Energy:</strong> {totalEnergy} kWh
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div style={{ color: '#FDFDFD', marginBottom: '10px' }}>
                                <strong>Total Cost:</strong> ₹{totalCost}
                            </div>
                        </div>
                    </div>
                </div>

                <br />

                {loading ? (
                    <div style={{ color: '#FDFDFD', textAlign: 'center', padding: '50px' }}>
                        Loading cost data...
                    </div>
                ) : (
                    <div id="co-chart-container" className="pt-3 pb-3 pr-5 pl-5">
                        <ReactFC
                            type="msline"
                            width="100%"
                            height="400"
                            dataFormat="JSON"
                            dataSource={this.getChartData()}
                        />
                    </div>
                )}
            </div>
        );
    }
}

const mapStateToProps = (state) => ({
    period: state.energy.period,
    cost: state.energy.cost,
    loading: state.energy.loading
});

export default connect(mapStateToProps)(CostComponentDynamic);
