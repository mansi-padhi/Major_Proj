import {
  FETCH_DASHBOARD_SUCCESS,
  FETCH_DASHBOARD_ERROR,
  FETCH_READINGS_SUCCESS,
  FETCH_READINGS_ERROR,
  FETCH_COST_SUCCESS,
  FETCH_APPLIANCES_SUCCESS,
  SET_PERIOD,
  SET_LOADING
} from '../actions/index';

const initialState = {
  loading: false,
  error: null,
  period: 'month', // default period
  dashboard: {
    today: {},
    month: {},
    latest: null,
    devices: {}
  },
  readings: {
    today: null,
    month: null,
    year: null
  },
  cost: {
    today: null,
    month: null,
    year: null
  },
  appliances: {
    today: null,
    month: null,
    year: null
  }
};

export default function(state = initialState, action) {
  switch (action.type) {
    case SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };

    case SET_PERIOD:
      return {
        ...state,
        period: action.payload
      };

    case FETCH_DASHBOARD_SUCCESS:
      return {
        ...state,
        loading: false,
        dashboard: action.payload,
        error: null
      };

    case FETCH_DASHBOARD_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload
      };

    case FETCH_READINGS_SUCCESS:
      return {
        ...state,
        loading: false,
        readings: {
          ...state.readings,
          [action.payload.period]: action.payload.data
        },
        error: null
      };

    case FETCH_READINGS_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload
      };

    case FETCH_COST_SUCCESS:
      return {
        ...state,
        cost: {
          ...state.cost,
          [action.payload.period]: action.payload.data
        }
      };

    case FETCH_APPLIANCES_SUCCESS:
      return {
        ...state,
        appliances: {
          ...state.appliances,
          [action.payload.period]: action.payload.data
        }
      };

    default:
      return state;
  }
}
