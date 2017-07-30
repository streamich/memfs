
type TSetImmediate = (callback: (...args) => void, args?) => void;
let _setImmediate: TSetImmediate;

if(typeof setImmediate === 'function') _setImmediate = setImmediate;
else _setImmediate = setTimeout;

export default _setImmediate as TSetImmediate;
