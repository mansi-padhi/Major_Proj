import React, { Component } from 'react';
import { connect } from 'react-redux';
import moment from 'moment';
import FusionCharts from 'fusioncharts';
import charts from 'fusioncharts/fusioncharts.charts';
import widgets from 'fusioncharts/fusioncharts.widgets';
import powercharts from 'fusioncharts/fusioncharts.powercharts';
import theme from 'fusioncharts/themes/fusioncharts.theme.ocean';

// Import components
import DashboardComponent from '../components/dashboard_component';
import DashboardMonthComponent from '../components/dashboard_month_component';
import DashboardYearComponent from '../components/dashboard_year_component';
import CostComponentImproved from '../components/cost_component_improved';
import AppliancesComponentImproved from '../components/appliances_component_improved';
import AppliancesMonthComponent from '../components/appliances_month_component';
import AppliancesYearComponent from '../components/appliances_year_component';
import UsageComponentImproved from '../components/usage_component_improved';
import SafetyComponent from '../components/safety_component';
import AIAssistantComponent from '../components/ai_assistant_component';

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
        const sections = ['Dashboard', 'Cost', 'Appliances', 'Usage-by-device', 'Safety'];
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
        const period = (energy && energy.period) || 'month';

        // Render appropriate dashboard based on selected period
        if (period === 'today') {
            return <DashboardComponent />;
        } else if (period === 'month') {
            return <DashboardMonthComponent />;
        } else if (period === 'year') {
            return <DashboardYearComponent />;
        }

        // Default to today view
        return <DashboardComponent />;
    }

    renderAppliances() {
        const { energy } = this.props;
        const period = (energy && energy.period) || 'today';

        // Render appropriate appliances view based on selected period
        if (period === 'today') {
            return <AppliancesComponentImproved />;
        } else if (period === 'month') {
            return <AppliancesMonthComponent />;
        } else if (period === 'year') {
            return <AppliancesYearComponent />;
        }

        // Default to today view
        return <AppliancesComponentImproved />;
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
                {userId === 3 && this.renderAppliances()}
                {userId === 4 && <AIAssistantComponent />}
                {userId === 5 && <SafetyComponent />}
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
