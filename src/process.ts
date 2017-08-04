// Here we mock the global `process` variable in case we are not in Node's environment.

interface IProcess {
    getuid(): number,
    getgid(): number,
    nextTick: (callback: (...args) => void, ...args) => void,
}


let _process: IProcess;
if(typeof process === 'undefined') {
    _process = {
        getuid: () => 0,
        getgid: () => 0,
        nextTick: require('./setImmediate'),
    };
} else
    _process = process;

export default _process as IProcess;
