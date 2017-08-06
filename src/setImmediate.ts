
type TSetImmediate = (callback: (...args) => void, args?) => void;
let _setImmediate: TSetImmediate;

/* istanbul ignore next */
if(typeof setImmediate === 'function') _setImmediate = setImmediate;
/* istanbul ignore next */
else _setImmediate = setTimeout;

export default _setImmediate as TSetImmediate;
