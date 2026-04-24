import React, { Component } from 'react';
import { connect } from 'react-redux';
import moment from 'moment';
import FusionCharts from 'fusioncharts';
import charts from 'fusioncharts/fusioncharts.charts';
import widgets from 'fusioncharts/fusioncharts.widgets';
import powercharts from 'fusioncharts/fusioncharts.powercharts';
import theme from 'fusioncharts/themes/fusioncharts.theme.ocean';
import ReactFC from 'react-fusioncharts';

// Import dynamic chart configs for Dashboard
import {
    getDashboardChart1Config,
    getDashboardChart2Config,
    getDashboardChart3Config,
    getDashboardChart4Config,
    getDashboardChart5Config
} from '../chart-configs/dashboard_charts_dynamic';

// Import improved components
import CostComponentImproved from '../components/cost_component_improved';
import AppliancesComponentImproved from '../components/appliances_component_improved';
import UsageComponentImproved from '../components/usage_component_improved';

charts(FusionCharts);
widgets(FusionCharts);
powercharts(FusionCharts);
theme(FusionCharts);

FusionCharts.options.creditLabel = false;

class ChartDetail extends Component {

    componentDidUpdate(prevProps) {
        // Update date display
        const dateElement = document.getElementById("date");
        if (dateElement) {
            dateElement.innerHTML = moment().format('MMMM YYYY');
        }

        // Update navigation highlighting
        if (this.props.user && this.props.user.id) {
            this.updateNavigation(this.props.user.id);
        }
    }

    updateNavigation(activeId) {
        const sections = ['Dashboard', 'Cost', 'Appliances', 'Usage-by-device'];
        sections.forEach((section, index) => {
            const element = document.getElementById(section);
            if (element) {
                if (index + 1 === activeId) {
                    element.setAttribute("class", "left-option active");
                } else {
                    element.setAttribute("class", "left-option");
                }
            }
        });

        // Collapse mobile menu
        const nav = document.getElementById("bd-docs-nav");
        if (nav) {
            nav.setAttribute("class", "bd-links collapse");
        }
    }

    renderDashboard() {
        const { energy } = this.props;
        const hasDashboardData = energy && energy.dashboard && energy.dashboard.month;
        const monthReadings = energy && energy.readings && energy.readings.month;

        if (hasDashboardData && monthReadings) {
            const chart1Data = getDashboardChart1Config(energy.dashboard, 'month');
            const chart2Data = getDashboardChart2Config(monthReadings, 'month');
            const chart3Data = getDashboardChart3Config(monthReadings, 'month');
            const chart4Data = getDashboardChart4Config(monthReadings, 'month');
            const chart5Data = getDashboardChart5Config(monthReadings, 'month');

            return (
                <div className="row mt-3 db-chart">
                    <div className="col-lg-6 col-xl-4">
                        <div className="chart-card mb-4">
                            <div className="chart-title">COST PREDICTED</div>
                            <div className="chart">
                                <ReactFC type="doughnut2d" width="100%" height="300" dataFormat="JSON" dataSource={chart1Data} />
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-6 col-xl-4">
                        <div className="chart-card mb-4">
                            <div className="chart-title">CHANGE IN COST</div>
                            <div className="chart">
                                <ReactFC type="msline" width="100%" height="300" dataFormat="JSON" dataSource={chart2Data} />
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-6 col-xl-4">
                        <div className="chart-card mb-4">
                            <div className="chart-title">USAGE ESTIMATE</div>
                            <div className="chart">
                                <ReactFC type="msline" width="100%" height="300" dataFormat="JSON" dataSource={chart3Data} />
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-6 col-xl-4">
                        <div className="chart-card mb-4">
                            <div className="chart-title">ACTIVE APPLIANCES</div>
                            <div className="chart">
                                <ReactFC type="msline" width="100%" height="300" dataFormat="JSON" dataSource={chart4Data} />
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-6 col-xl-4">
                        <div className="chart-card mb-4">
                            <div className="chart-title">ENERGY INTENSITY</div>
                            <div className="chart">
                                <ReactFC type="msline" width="100%" height="300" dataFormat="JSON" dataSource={chart5Data} />
                            </div>
                        </div>
                    </div>
                </div>
            );
        } else {
            return (
                <div className="row mt-3 db-chart">
                    <div className="col-12">
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '300px',
                            color: '#FDFDFD',
                            fontSize: '18px',
                            backgroundColor: '#2a2a3a',
                            borderRadius: '8px',
                            margin: '20px'
                        }}>
                            Waiting for ESP32 data...
                        </div>
                    </div>
                </div>
            );
        }
    }

    render() {
        const { user } = this.props;
        const userId = user && user.id ? user.id : 1;

        console.log('ChartDetail render - userId:', userId);
        console.log('ChartDetail render - user:', user);

        return (
            <div>
                {userId === 1 && this.renderDashboard()}
                {userId === 2 && <CostComponentImproved />}
                {userId === 3 && <AppliancesComponentImproved />}
                {userId === 4 && <UsageComponentImproved />}
            </div>
        );
    }
}

// Map Redux state to props
function mapStateToProps(state) {
    return {
        user: state.activeUser,
        energy: state.energy
    };
}

export default connect(mapStateToProps)(ChartDetail);
