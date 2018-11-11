type TSetImmediate = (callback: (...args) => void, args?) => void;
let _setImmediate: TSetImmediate;

if (typeof setImmediate === 'function') _setImmediate = setImmediate.bind(global);
else _setImmediate = setTimeout.bind(global);

export default _setImmediate as TSetImmediate;
