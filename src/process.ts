// Here we mock the global `process` variable in case we are not in Node's environment.

interface IProcess {
    getuid(): number,
    getgid(): number,
    cwd(): string,
    nextTick: (callback: (...args) => void, ...args) => void,
}

export function createProcess(): IProcess {
    return {
        getuid: () => 0,
        getgid: () => 0,
        cwd: () => '/',
        nextTick: require('./setImmediate').default,
    };
}

let _process: IProcess;
/* istanbul ignore next */
if(typeof process !== 'object') {
    /* istanbul ignore next */
    _process = createProcess();
} else
    _process = process;

export default _process as IProcess;
