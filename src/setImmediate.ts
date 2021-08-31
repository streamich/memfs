type TSetImmediate = (callback: (...args) => void, args?) => void;
let _setImmediate: TSetImmediate;

if (typeof setImmediate === 'function') _setImmediate = setImmediate.bind(globalThis);
else _setImmediate = setTimeout.bind(globalThis);

export default _setImmediate as TSetImmediate;
