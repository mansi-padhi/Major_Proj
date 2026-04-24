import React from 'react';
import { connect } from 'react-redux';
import ReactFC from 'react-fusioncharts';
import { fetchAppliances } from '../actions/index';

class AppliancesComponentImproved extends React.Component {
    componentDidMount() {
        // Fetch appliances data from backend
        const { dispatch, energy } = this.props;
        const period = (energy && energy.period) || 'month';
        dispatch(fetchAppliances(period));
    }

    componentDidUpdate(prevProps) {
        // Fetch new data when period changes
        const prevPeriod = prevProps.energy && prevProps.energy.period;
        const currentPeriod = this.props.energy && this.props.energy.period;

        if (prevPeriod !== currentPeriod) {
            this.props.dispatch(fetchAppliances(currentPeriod || 'month'));
        }
    }

    getAppliancesChartConfig() {
        const { energy } = this.props;
        const period = (energy && energy.period) || 'month';
        const appliancesData = energy && energy.appliances && energy.appliances[period];

        // Show empty chart if no data from MongoDB
        if (!appliancesData || !appliancesData.devices || appliancesData.devices.length === 0) {
            return {
                type: 'doughnut2d',
                width: '100%',
                height: '500',
                dataFormat: 'json',
                dataSource: {
                    chart: {
                        caption: 'Energy Usage by Device',
                        subCaption: 'Waiting for data from ESP32...',
                        numberSuffix: ' kWh',
                        theme: 'ocean',
                        bgColor: '#1e1e2e',
                        canvasBgColor: '#1e1e2e',
                        baseFontColor: '#FDFDFD',
                        showPercentValues: '1',
                        showValues: '1',
                        pieRadius: '140',
                        doughnutRadius: '70'
                    },
                    data: []
                }
            };
        }

        // Transform appliances data for chart
        const chartData = [];
        if (appliancesData.devices && Array.isArray(appliancesData.devices)) {
            appliancesData.devices.forEach(device => {
                chartData.push({
                    label: device.name || device.deviceId || 'Unknown',
                    value: parseFloat(device.energy || 0).toFixed(2)
                });
            });
        }

        return {
            type: 'doughnut2d',
            width: '100%',
            height: '500',
            dataFormat: 'json',
            dataSource: {
                chart: {
                    caption: 'Energy Usage by Device',
                    subCaption: `Total: ${appliancesData.totalEnergy ? appliancesData.totalEnergy.toFixed(2) : '0.00'} kWh`,
                    numberSuffix: ' kWh',
                    theme: 'ocean',
                    bgColor: '#1e1e2e',
                    canvasBgColor: '#1e1e2e',
                    baseFontColor: '#FDFDFD',
                    showPercentValues: '1',
                    showValues: '1',
                    pieRadius: '140',
                    doughnutRadius: '70',
                    paletteColors: '#00D4FF,#FFA500,#FF4444,#00FF00,#FF00FF,#FFFF00',
                    use3DLighting: '1',
                    showShadow: '1'
                },
                data: chartData
            }
        };
    }

    getDeviceStats() {
        const { energy } = this.props;
        const period = (energy && energy.period) || 'month';
        const appliancesData = energy && energy.appliances && energy.appliances[period];

        if (!appliancesData || !appliancesData.devices) {
            return [];
        }

        return appliancesData.devices.map(device => ({
            name: device.name || device.deviceId || 'Unknown Device',
            energy: device.energy || 0,
            cost: device.cost || 0,
            percentage: device.percentage || 0,
            avgPower: device.avgPower || 0,
            icon: this.getApplianceIcon(device.name || device.appliance || '')
        }));
    }

    getApplianceIcon(applianceName) {
        const name = applianceName.toLowerCase();

        if (name.includes('refriger')) return '🧊';
        if (name.includes('heating') || name.includes('ac')) return '🌡️';
        if (name.includes('light')) return '💡';
        if (name.includes('plug')) return '🔌';
        if (name.includes('all')) return '⚡';
        return '📱'; // Default icon
    }

    render() {
        const chartConfig = this.getAppliancesChartConfig();
        const deviceStats = this.getDeviceStats();
        const { energy } = this.props;
        const period = (energy && energy.period) || 'month';
        const appliancesData = energy && energy.appliances && energy.appliances[period];
        const totalEnergy = (appliancesData && appliancesData.totalEnergy) || 0;
        const totalCost = (appliancesData && appliancesData.totalCost) || 0;

        // Calculate top consumer
        const topConsumer = deviceStats.length > 0 ? deviceStats[0] : null;

        return (
            <div className="container-fluid pl-5 pr-5">
                {/* Top Stats Cards */}
                <div className="row" style={{ marginBottom: '20px' }}>
                    <div className="col-md-3">
                        <div style={{
                            backgroundColor: '#2a2a3a',
                            borderRadius: '8px',
                            padding: '20px',
                            color: '#FDFDFD',
                            borderLeft: '4px solid #00D4FF'
                        }}>
                            <div style={{ fontSize: '12px', opacity: '0.7', marginBottom: '5px' }}>
                                Total Devices
                            </div>
                            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#00D4FF' }}>
                                {deviceStats.length}
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div style={{
                            backgroundColor: '#2a2a3a',
                            borderRadius: '8px',
                            padding: '20px',
                            color: '#FDFDFD',
                            borderLeft: '4px solid #FFA500'
                        }}>
                            <div style={{ fontSize: '12px', opacity: '0.7', marginBottom: '5px' }}>
                                Total Energy
                            </div>
                            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#FFA500' }}>
                                {totalEnergy.toFixed(1)} kWh
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div style={{
                            backgroundColor: '#2a2a3a',
                            borderRadius: '8px',
                            padding: '20px',
                            color: '#FDFDFD',
                            borderLeft: '4px solid #00FF00'
                        }}>
                            <div style={{ fontSize: '12px', opacity: '0.7', marginBottom: '5px' }}>
                                Total Cost
                            </div>
                            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#00FF00' }}>
                                ₹{totalCost.toFixed(0)}
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div style={{
                            backgroundColor: '#2a2a3a',
                            borderRadius: '8px',
                            padding: '20px',
                            color: '#FDFDFD',
                            borderLeft: '4px solid #FF4444'
                        }}>
                            <div style={{ fontSize: '12px', opacity: '0.7', marginBottom: '5px' }}>
                                Top Consumer
                            </div>
                            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#FF4444' }}>
                                {topConsumer ? `${topConsumer.icon} ${topConsumer.percentage.toFixed(0)}%` : 'N/A'}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row">
                    {/* Chart Section */}
                    <div className="col-md-7">
                        <ReactFC {...chartConfig} />

                        {/* Energy Efficiency Tips */}
                        <div style={{
                            backgroundColor: '#2a2a3a',
                            borderRadius: '8px',
                            padding: '20px',
                            color: '#FDFDFD',
                            marginTop: '20px'
                        }}>
                            <h4 style={{ marginBottom: '15px', borderBottom: '2px solid #00D4FF', paddingBottom: '10px' }}>
                                ⚡ Device Efficiency Tips
                            </h4>
                            <div className="row">
                                <div className="col-md-6">
                                    <div style={{ marginBottom: '10px' }}>
                                        <strong>🧊 Refrigeration:</strong>
                                        <div style={{ fontSize: '13px', opacity: '0.8' }}>Keep temperature at 3-4°C</div>
                                    </div>
                                    <div style={{ marginBottom: '10px' }}>
                                        <strong>🌡️ AC/Heating:</strong>
                                        <div style={{ fontSize: '13px', opacity: '0.8' }}>Set to 24-26°C for efficiency</div>
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div style={{ marginBottom: '10px' }}>
                                        <strong>💡 Lighting:</strong>
                                        <div style={{ fontSize: '13px', opacity: '0.8' }}>Switch to LED bulbs</div>
                                    </div>
                                    <div style={{ marginBottom: '10px' }}>
                                        <strong>🔌 Plug Loads:</strong>
                                        <div style={{ fontSize: '13px', opacity: '0.8' }}>Unplug when not in use</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Section */}
                    <div className="col-md-5">
                        <div style={{
                            backgroundColor: '#2a2a3a',
                            borderRadius: '8px',
                            padding: '20px',
                            color: '#FDFDFD',
                            marginBottom: '20px'
                        }}>
                            <h4 style={{ marginBottom: '20px', borderBottom: '2px solid #00D4FF', paddingBottom: '10px' }}>
                                📊 Summary
                            </h4>
                            <div style={{ marginBottom: '15px' }}>
                                <div style={{ fontSize: '14px', opacity: '0.7' }}>Total Energy</div>
                                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#00D4FF' }}>
                                    {totalEnergy.toFixed(2)} kWh
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '14px', opacity: '0.7' }}>Total Cost</div>
                                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#FFA500' }}>
                                    ₹{totalCost.toFixed(2)}
                                </div>
                            </div>
                        </div>

                        {/* Device List */}
                        <div style={{
                            backgroundColor: '#2a2a3a',
                            borderRadius: '8px',
                            padding: '20px',
                            color: '#FDFDFD',
                            maxHeight: '400px',
                            overflowY: 'auto'
                        }}>
                            <h4 style={{ marginBottom: '20px', borderBottom: '2px solid #00D4FF', paddingBottom: '10px' }}>
                                Device Breakdown
                            </h4>
                            {deviceStats.length === 0 ? (
                                <div style={{ textAlign: 'center', opacity: '0.5', padding: '20px' }}>
                                    No device data available
                                </div>
                            ) : (
                                deviceStats.map((device, index) => (
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
                                            alignItems: 'center',
                                            marginBottom: '8px'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ fontSize: '28px' }}>{device.icon}</span>
                                                <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                                                    {device.name}
                                                </div>
                                            </div>
                                            <div style={{ color: '#00D4FF', fontWeight: 'bold' }}>
                                                {device.percentage.toFixed(1)}%
                                            </div>
                                        </div>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            fontSize: '14px',
                                            opacity: '0.8'
                                        }}>
                                            <div>{device.energy.toFixed(2)} kWh</div>
                                            <div>₹{device.cost.toFixed(2)}</div>
                                        </div>
                                        {device.avgPower > 0 && (
                                            <div style={{
                                                fontSize: '12px',
                                                opacity: '0.6',
                                                marginTop: '5px'
                                            }}>
                                                Avg Power: {device.avgPower.toFixed(2)} W
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
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

export default connect(mapStateToProps)(AppliancesComponentImproved);
