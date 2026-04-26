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
        const period = (energy && energy.period) || 'month';

        // Today tab: show the two new clean charts
        if (period === 'today') {
            return <DashboardComponent />;
        }

        // Month / Year tabs: placeholder until we build those views
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: '300px', color: '#AAAAAA', fontSize: '16px',
                backgroundColor: '#1e1e2e', borderRadius: '8px', margin: '20px 0'
            }}>
                {period === 'month' ? 'Monthly view coming soon' : 'Yearly view coming soon'}
            </div>
        );
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
