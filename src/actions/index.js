import EnergyAPI from '../services/api';

// Action Types
export const SELECT_OPTION = 'SELECT_OPTION';
export const FETCH_DASHBOARD_SUCCESS = 'FETCH_DASHBOARD_SUCCESS';
export const FETCH_DASHBOARD_ERROR = 'FETCH_DASHBOARD_ERROR';
export const FETCH_READINGS_SUCCESS = 'FETCH_READINGS_SUCCESS';
export const FETCH_READINGS_ERROR = 'FETCH_READINGS_ERROR';
export const FETCH_COST_SUCCESS = 'FETCH_COST_SUCCESS';
export const FETCH_APPLIANCES_SUCCESS = 'FETCH_APPLIANCES_SUCCESS';
export const SET_PERIOD = 'SET_PERIOD';
export const SET_LOADING = 'SET_LOADING';

// Original action
export const selectOption = (user) => {
    window.currentOption = user.id;
    return {
        type: SELECT_OPTION,
        payload: user
    }
};

// Set period (today, month, year)
export const setPeriod = (period) => {
    return {
        type: SET_PERIOD,
        payload: period
    };
};

// Fetch dashboard summary
export const fetchDashboardSummary = () => {
    return async (dispatch) => {
        dispatch({ type: SET_LOADING, payload: true });
        try {
            const data = await EnergyAPI.getDashboardSummary();
            dispatch({
                type: FETCH_DASHBOARD_SUCCESS,
                payload: data
            });
        } catch (error) {
            dispatch({
                type: FETCH_DASHBOARD_ERROR,
                payload: error.message
            });
        }
    };
};

// Fetch readings based on period
export const fetchReadings = (period = 'today') => {
    return async (dispatch) => {
        dispatch({ type: SET_LOADING, payload: true });
        try {
            let data;
            switch(period) {
                case 'today':
                    data = await EnergyAPI.getTodayReadings();
                    break;
                case 'month':
                    data = await EnergyAPI.getMonthReadings();
                    break;
                case 'year':
                    data = await EnergyAPI.getYearReadings();
                    break;
                default:
                    data = await EnergyAPI.getTodayReadings();
            }
            dispatch({
                type: FETCH_READINGS_SUCCESS,
                payload: { period, data }
            });
        } catch (error) {
            dispatch({
                type: FETCH_READINGS_ERROR,
                payload: error.message
            });
        }
    };
};

// Fetch cost data
export const fetchCost = (period = 'today') => {
    return async (dispatch) => {
        try {
            const data = await EnergyAPI.getCost(period);
            dispatch({
                type: FETCH_COST_SUCCESS,
                payload: { period, data }
            });
        } catch (error) {
            console.error('Error fetching cost:', error);
        }
    };
};

// Fetch appliances data
export const fetchAppliances = (period = 'today') => {
    return async (dispatch) => {
        try {
            const data = await EnergyAPI.getAppliances(period);
            dispatch({
                type: FETCH_APPLIANCES_SUCCESS,
                payload: { period, data }
            });
        } catch (error) {
            console.error('Error fetching appliances:', error);
        }
    };
};