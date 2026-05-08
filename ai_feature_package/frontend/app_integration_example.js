// Example of how to integrate EnergyAssistantWidget into your app.js

import React from 'react';
import { connect } from 'react-redux';
import OptionList from '../containers/optionlist';
import ChartDetail from '../containers/chart';
import MonthlyScrollingBackground from './MonthlyScrollingBackground';
import EnergyAssistantWidget from './energy_assistant_widget'; // ADD THIS LINE
import { fetchDashboardSummary, fetchReadings, fetchCost, fetchAppliances, setPeriod } from '../actions/index';
import './app.css';

class App extends React.Component {
    // ... your existing component code ...

    render() {
        return (
            <div>
                {/* Your existing JSX content */}
                <MonthlyScrollingBackground />

                <div className="container-fluid">
                    {/* Your dashboard content */}
                </div>

                {/* ADD THIS COMPONENT AT THE END, BEFORE CLOSING </div> */}
                <EnergyAssistantWidget />
            </div>
        );
    }
}

// ... rest of your component code ...
export default connect(mapStateToProps, mapDispatchToProps)(App);