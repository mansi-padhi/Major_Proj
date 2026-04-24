import React from 'react';
import { connect } from 'react-redux';
import ReactFC from 'react-fusioncharts';
import EnergyAPI from '../services/api';

class UsageComponentImproved extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            monthlyData: [],
            loading: true
        };
    }

    async componentDidMount() {
        await this.fetchLast3Months();
    }

    async fetchLast3Months() {
        try {
            this.setState({ loading: true });

            const now = new Date();
            const months = [];

            // Get last 3 months
            for (let i = 2; i >= 0; i--) {
                const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const month = date.getMonth() + 1;
                const year = date.getFullYear();

                try {
                    // Fetch data for specific month and year from MongoDB
                    const response = await fetch(
                        `http://localhost:5000/api/cost?month=${month}&year=${year}`
                    );
                    const data = await response.json();
                    const monthName = date.toLocaleString('default', { month: 'short' });

                    months.push({
                        label: monthName,
                        energy: data.totalEnergy || 0,
                        cost: data.totalCost || 0
                    });
                } catch (error) {
                    console.error(`Error fetching data for month ${month}:`, error);
                    const monthName = date.toLocaleString('default', { month: 'short' });
                    months.push({
                        label: monthName,
                        energy: 0,
                        cost: 0
                    });
                }
            }

            this.setState({ monthlyData: months, loading: false });
        } catch (error) {
            console.error('Error fetching monthly data:', error);
            this.setState({ loading: false });
        }
    }

    getUsageChartConfig() {
        const { monthlyData, loading } = this.state;

        if (loading || !monthlyData || monthlyData.length === 0) {
            return {
                type: 'mscolumn2d',
                width: '100%',
                height: '500',
                dataFormat: 'json',
                dataSource: {
                    chart: {
                        caption: 'Monthly Energy Comparison',
                        subCaption: 'Last 3 Months',
                        xAxisName: 'Month',
                        yAxisName: 'Energy (kWh)',
                        theme: 'ocean',
                        bgColor: '#1e1e2e',
                        canvasBgColor: '#1e1e2e',
                        baseFontColor: '#FDFDFD',
                        showValues: '1'
                    },
                    categories: [{ category: [] }],
                    dataset: []
                }
            };
        }

        const categories = monthlyData.map(m => ({ label: m.label }));
        const energyData = monthlyData.map(m => ({ value: m.energy.toFixed(2) }));

        return {
            type: 'column2d',
            width: '100%',
            height: '500',
            dataFormat: 'json',
            dataSource: {
                chart: {
                    caption: 'Monthly Energy Comparison',
                    subCaption: 'Last 3 Months',
                    xAxisName: 'Month',
                    yAxisName: 'Energy (kWh)',
                    numberSuffix: ' kWh',
                    theme: 'ocean',
                    bgColor: '#1e1e2e',
                    canvasBgColor: '#1e1e2e',
                    baseFontColor: '#FDFDFD',
                    showValues: '1',
                    plotSpacePercent: '50',
                    divLineColor: '#3a3a4a',
                    divLineAlpha: '50',
                    paletteColors: '#00D4FF',
                    valueFontSize: '14',
                    valueFontBold: '1'
                },
                data: energyData.map((d, i) => ({
                    label: categories[i].label,
                    value: d.value
                }))
            }
        };
    }

    getMonthlyStats() {
        const { monthlyData } = this.state;

        if (!monthlyData || monthlyData.length === 0) {
            return {
                total: 0,
                average: 0,
                highest: { month: '-', value: 0 },
                lowest: { month: '-', value: 0 }
            };
        }

        const total = monthlyData.reduce((sum, m) => sum + m.energy, 0);
        const average = total / monthlyData.length;

        const sorted = [...monthlyData].sort((a, b) => b.energy - a.energy);
        const highest = sorted[0];
        const lowest = sorted[sorted.length - 1];

        return {
            total,
            average,
            highest: { month: highest.label, value: highest.energy },
            lowest: { month: lowest.label, value: lowest.energy }
        };
    }

    render() {
        const chartConfig = this.getUsageChartConfig();
        const stats = this.getMonthlyStats();
        const { monthlyData, loading } = this.state;

        return (
            <div className="container-fluid pl-5 pr-5">
                <div className="row">
                    {/* Chart Section */}
                    <div className="col-md-8">
                        {loading ? (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '500px',
                                color: '#FDFDFD',
                                fontSize: '18px'
                            }}>
                                Loading data...
                            </div>
                        ) : (
                            <ReactFC {...chartConfig} />
                        )}
                    </div>

                    {/* Stats Section */}
                    <div className="col-md-4">
                        {/* Summary Stats */}
                        <div style={{
                            backgroundColor: '#2a2a3a',
                            borderRadius: '8px',
                            padding: '20px',
                            color: '#FDFDFD',
                            marginBottom: '20px'
                        }}>
                            <h4 style={{
                                marginBottom: '20px',
                                borderBottom: '2px solid #00D4FF',
                                paddingBottom: '10px'
                            }}>
                                3-Month Summary
                            </h4>

                            <div style={{ marginBottom: '15px' }}>
                                <div style={{ fontSize: '12px', opacity: '0.7', marginBottom: '5px' }}>
                                    Total Energy
                                </div>
                                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#00D4FF' }}>
                                    {stats.total.toFixed(2)} kWh
                                </div>
                            </div>

                            <div style={{ marginBottom: '15px' }}>
                                <div style={{ fontSize: '12px', opacity: '0.7', marginBottom: '5px' }}>
                                    Average per Month
                                </div>
                                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                                    {stats.average.toFixed(2)} kWh
                                </div>
                            </div>

                            <div style={{ marginBottom: '15px' }}>
                                <div style={{ fontSize: '12px', opacity: '0.7', marginBottom: '5px' }}>
                                    Highest Month
                                </div>
                                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#00FF00' }}>
                                    {stats.highest.month}: {stats.highest.value.toFixed(2)} kWh
                                </div>
                            </div>

                            <div>
                                <div style={{ fontSize: '12px', opacity: '0.7', marginBottom: '5px' }}>
                                    Lowest Month
                                </div>
                                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#FFA500' }}>
                                    {stats.lowest.month}: {stats.lowest.value.toFixed(2)} kWh
                                </div>
                            </div>
                        </div>

                        {/* Monthly Breakdown */}
                        <div style={{
                            backgroundColor: '#2a2a3a',
                            borderRadius: '8px',
                            padding: '20px',
                            color: '#FDFDFD'
                        }}>
                            <h4 style={{
                                marginBottom: '20px',
                                borderBottom: '2px solid #00D4FF',
                                paddingBottom: '10px'
                            }}>
                                Monthly Breakdown
                            </h4>
                            {monthlyData.map((month, index) => (
                                <div key={index} style={{
                                    marginBottom: '15px',
                                    padding: '15px',
                                    backgroundColor: '#1e1e2e',
                                    borderRadius: '6px',
                                    borderLeft: '4px solid #00D4FF'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        marginBottom: '8px'
                                    }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                                            {month.label}
                                        </div>
                                        <div style={{ color: '#00D4FF', fontWeight: 'bold' }}>
                                            {month.energy.toFixed(2)} kWh
                                        </div>
                                    </div>
                                    <div style={{
                                        fontSize: '14px',
                                        opacity: '0.8'
                                    }}>
                                        Cost: ₹{month.cost.toFixed(2)}
                                    </div>
                                </div>
                            ))}
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

export default connect(mapStateToProps)(UsageComponentImproved);
