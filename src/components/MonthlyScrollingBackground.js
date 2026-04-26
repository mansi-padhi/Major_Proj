import React from 'react';

class MonthlyScrollingBackground extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            monthlyData: [],
            loading: true,
            monthsToShow: 12 // Default to 12 months
        };
    }

    async componentDidMount() {
        await this.fetchMonthlyData();
    }

    async fetchMonthlyData() {
        try {
            const { monthsToShow } = this.state;
            const now = new Date();
            const months = [];

            // Get last N months
            for (let i = monthsToShow - 1; i >= 0; i--) {
                const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const month = date.getMonth() + 1;
                const year = date.getFullYear();

                try {
                    const response = await fetch(
                        `http://localhost:5000/api/cost?month=${month}&year=${year}`
                    );
                    const data = await response.json();
                    const monthName = date.toLocaleString('default', { month: 'short', year: '2-digit' });

                    months.push({
                        label: monthName,
                        energy: data.totalEnergy || 0,
                        cost: data.totalCost || 0
                    });
                } catch (error) {
                    console.error(`Error fetching data for month ${month}:`, error);
                }
            }

            this.setState({ monthlyData: months, loading: false });
        } catch (error) {
            console.error('Error fetching monthly data:', error);
            this.setState({ loading: false });
        }
    }

    toggleMonthsView = () => {
        this.setState(
            prevState => ({
                monthsToShow: prevState.monthsToShow === 12 ? 6 : 12,
                loading: true
            }),
            () => this.fetchMonthlyData()
        );
    }

    render() {
        const { monthlyData, loading, monthsToShow } = this.state;

        if (loading || monthlyData.length === 0) {
            return null;
        }

        // Duplicate the data for seamless scrolling
        const duplicatedData = [...monthlyData, ...monthlyData];

        return (
            <div>
                {/* Toggle Button */}
                <div style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    zIndex: 1000
                }}>
                    <button
                        onClick={this.toggleMonthsView}
                        style={{
                            backgroundColor: '#00D4FF',
                            color: '#1a1a2e',
                            border: 'none',
                            borderRadius: '25px',
                            padding: '12px 24px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(0, 212, 255, 0.4)',
                            transition: 'all 0.3s ease'
                        }}
                        onMouseOver={(e) => {
                            e.target.style.backgroundColor = '#00B8E6';
                            e.target.style.transform = 'scale(1.05)';
                        }}
                        onMouseOut={(e) => {
                            e.target.style.backgroundColor = '#00D4FF';
                            e.target.style.transform = 'scale(1)';
                        }}
                    >
                        <span role="img" aria-label="chart">📊</span> {monthsToShow === 12 ? 'Show 6 Months' : 'Show 12 Months'}
                    </button>
                </div>

                {/* Scrolling Background */}
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    zIndex: -1,
                    overflow: 'hidden',
                    backgroundColor: '#1a1a2e',
                    opacity: 0.3
                }}>
                    <style>
                        {`
                            @keyframes scroll {
                                0% {
                                    transform: translateX(0);
                                }
                                100% {
                                    transform: translateX(-50%);
                                }
                            }
                            .scrolling-container {
                                animation: scroll ${monthsToShow === 12 ? '60s' : '40s'} linear infinite;
                                display: flex;
                                width: fit-content;
                            }
                        `}
                    </style>
                    <div className="scrolling-container" style={{
                        display: 'flex',
                        gap: '30px',
                        padding: '20px'
                    }}>
                        {duplicatedData.map((month, index) => (
                            <div key={index} style={{
                                minWidth: '200px',
                                backgroundColor: 'rgba(42, 42, 58, 0.5)',
                                borderRadius: '12px',
                                padding: '20px',
                                border: '1px solid rgba(0, 212, 255, 0.2)',
                                backdropFilter: 'blur(10px)'
                            }}>
                                <div style={{
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    color: '#00D4FF',
                                    marginBottom: '10px',
                                    textAlign: 'center'
                                }}>
                                    {month.label}
                                </div>
                                <div style={{ fontSize: '14px', color: '#FDFDFD', marginBottom: '5px' }}>
                                    <span role="img" aria-label="lightning">⚡</span> {month.energy.toFixed(1)} kWh
                                </div>
                                <div style={{ fontSize: '14px', color: '#FFA500' }}>
                                    <span role="img" aria-label="money bag">💰</span> ₹{month.cost.toFixed(0)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }
}

export default MonthlyScrollingBackground;
