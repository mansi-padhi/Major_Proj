const initialState = {
  id: 1,
  name: "Dashboard"
};

export default function (state = initialState, action) {
  // console.trace(state);
  switch (action.type) {
    case "SELECT_OPTION":
      return action.payload;
    // break;
    default:
      return state;
  }
  //return state;
}