type TSetImmediate = (callback: (...args) => void, args?) => void;
let _setImmediate: TSetImmediate;

if (typeof setImmediate === 'function')
  _setImmediate = setImmediate.bind(typeof globalThis !== 'undefined' ? globalThis : global);
else _setImmediate = setTimeout.bind(typeof globalThis !== 'undefined' ? globalThis : global);

export default _setImmediate as TSetImmediate;
