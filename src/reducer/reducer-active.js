export default function (state = null, action) {
  // console.trace(state);
  switch (action.type) {
    case "Option clicked":
      return action.payload;
    // break;
    default:
      return state;
  }
  //return state;
}