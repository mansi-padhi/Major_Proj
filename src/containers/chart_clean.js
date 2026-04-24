import React, { Component } from 'react';
import { connect } from 'react-redux';
import ReactDOM from 'react-dom';
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

// Import static fallback data
import { first_chart_month, second_chart_month, third_chart_month, fourth_chart_month, fifth_chart_month } from '../chart-configs/dashboard_first_chart';

// Import improved components
import CostComponentImproved from '../components/cost_component_improved';
import AppliancesComponentImproved from '../components/appliances_component_improved';
import UsageComponentImproved from '../components/usage_component_improved';

import * as utils from '../utils/utils';

charts(FusionCharts);
widgets(FusionCharts);
powercharts(FusionCharts);
theme(FusionCharts);

FusionCharts.options.creditLabel = false;

class ChartDetail extends Component {

    componentDidMount() {
        // Initial setup
    }

    componentDidUpdate(prevProps) {
        // Safety check
        if (!this.props.user || !this.props.user.id) {
            return;
        }

        // Only update if user changed
        if (prevProps.user && prevProps.user.id === this.props.user.id) {
            return;
        }

        console.log('Chart componentDidUpdate - user.id:', this.props.user.id);

        // Render appropriate section based on user selection
        this.renderSection();
    }

    renderSection() {
        const { user, energy } = this.props;

        // Update navigation highlighting
        this.updateNavigation(user.id);

        // Hide all chart containers first
        this.hideAllCharts();

        // Render appropriate section
        switch (user.id) {
            case 1:
                this.renderDashboard();
                break;
            case 2:
                this.renderCost();
                break;
            case 3:
                this.renderAppliances();
                break;
            case 4:
                this.renderUsage();
                break;
            default:
                this.renderDashboard();
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

    hideAllCharts() {
        for (let i = 1; i <= 7; i++) {
            const chartElement = document.getElementById(`chart${i}`);
            const parentElement = document.getElementById(`parent${i}`);

            if (chartElement) {
                ReactDOM.unmountComponentAtNode(chartElement);
            }

            if (parentElement && i > 1) {
                parentElement.style.display = "none";
            }
        }
    }

    renderDashboard() {
        const { energy } = this.props;

        // Set title
        const parent1 = document.getElementById("parent1");
        if (parent1) {
            parent1.setAttribute("class", "col-lg-6 col-xl-4");
        }

        const text1 = document.getElementById("text1");
        if (text1) {
            text1.innerHTML = "COST PREDICTED";
        }

        // Show all dashboard chart containers
        for (let i = 2; i <= 5; i++) {
            const parentElement = document.getElementById(`parent${i}`);
            if (parentElement) {
                parentElement.style.display = "block";
                parentElement.style.width = "auto";
                parentElement.style.height = "auto";
            }
        }

        // Update date
        const dateElement = document.getElementById("date");
        if (dateElement) {
            dateElement.innerHTML = moment().format('MMMM YYYY');
        }

        // Check if we have data
        const hasDashboardData = energy && energy.dashboard && energy.dashboard.month;
        const monthReadings = energy && energy.readings && energy.readings.month;

        if (hasDashboardData && monthReadings) {
            console.log('✅ Using DYNAMIC data for dashboard charts!');

            // Render with dynamic data
            const chart1Data = getDashboardChart1Config(energy.dashboard, 'month');
            const chart2Data = getDashboardChart2Config(monthReadings, 'month');
            const chart3Data = getDashboardChart3Config(monthReadings, 'month');
            const chart4Data = getDashboardChart4Config(monthReadings, 'month');
            const chart5Data = getDashboardChart5Config(monthReadings, 'month');

            ReactDOM.render(
                <ReactFC type="doughnut2d" width="100%" height="300" dataFormat="JSON" dataSource={chart1Data} />,
                document.getElementById('chart1'));

            ReactDOM.render(
                <ReactFC type="msline" width="100%" height="300" dataFormat="JSON" dataSource={chart2Data} />,
                document.getElementById('chart2'));

            ReactDOM.render(
                <ReactFC type="msline" width="100%" height="300" dataFormat="JSON" dataSource={chart3Data} />,
                document.getElementById('chart3'));

            ReactDOM.render(
                <ReactFC type="msline" width="100%" height="300" dataFormat="JSON" dataSource={chart4Data} />,
                document.getElementById('chart4'));

            ReactDOM.render(
                <ReactFC type="msline" width="100%" height="300" dataFormat="JSON" dataSource={chart5Data} />,
                document.getElementById('chart5'));
        } else {
            // Show loading message
            console.log('⚠️ Waiting for data to load...');
            const loadingMessage = '<div style="display: flex; align-items: center; justify-content: center; height: 300px; color: #FDFDFD; font-family: Nunito Sans; font-size: 16px;">Waiting for ESP32 data...</div>';

            for (let i = 1; i <= 5; i++) {
                const chartElement = document.getElementById(`chart${i}`);
                if (chartElement) {
                    chartElement.innerHTML = loadingMessage;
                }
            }
        }
    }

    renderCost() {
        // Set title
        const parent1 = document.getElementById("parent1");
        if (parent1) {
            parent1.setAttribute("class", "chart1-co col-lg-12 col-xl-12");
        }

        const text1 = document.getElementById("text1");
        if (text1) {
            text1.innerHTML = "Cost Analysis";
        }

        // Update date
        const dateElement = document.getElementById("date");
        if (dateElement) {
            dateElement.innerHTML = moment().format('MMMM YYYY');
        }

        // Render improved Cost component
        ReactDOM.render(
            <CostComponentImproved />,
            document.getElementById('chart1'));
    }

    renderAppliances() {
        // Set title
        const parent1 = document.getElementById("parent1");
        if (parent1) {
            parent1.setAttribute("class", "chart1-app col-lg-12 col-xl-12");
        }

        const text1 = document.getElementById("text1");
        if (text1) {
            text1.innerHTML = "Appliances";
        }

        // Update date
        const dateElement = document.getElementById("date");
        if (dateElement) {
            dateElement.innerHTML = moment().format('MMMM YYYY');
        }

        // Render improved Appliances component
        ReactDOM.render(
            <AppliancesComponentImproved />,
            document.getElementById('chart1'));
    }

    renderUsage() {
        // Set title
        const parent1 = document.getElementById("parent1");
        if (parent1) {
            parent1.setAttribute("class", "chart1-us col-lg-12 col-xl-12");
        }

        const text1 = document.getElementById("text1");
        if (text1) {
            text1.innerHTML = "Usage by Device";
        }

        // Update date
        const dateElement = document.getElementById("date");
        if (dateElement) {
            dateElement.innerHTML = moment().format('MMMM YYYY');
        }

        // Render improved Usage component
        ReactDOM.render(
            <UsageComponentImproved />,
            document.getElementById('chart1'));
    }

    render() {
        return (
            <div></div>
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
