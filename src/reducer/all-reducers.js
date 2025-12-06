import { combineReducers } from 'redux';
import OptionReducer from './reducer-options';
import ActiveUserReducer from './reducer-active';
import EnergyReducer from './reducer-energy';

const allred = combineReducers({
    users: OptionReducer,
    activeUser: ActiveUserReducer,
    energy: EnergyReducer
});

export default allred;