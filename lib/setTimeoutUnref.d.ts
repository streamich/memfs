export declare type TSetTimeout = (callback: (...args) => void, time?: number, args?: any[]) => any;
/**
 * `setTimeoutUnref` is just like `setTimeout`, only in Node's environment it will "unref" its macro task.
 * @param callback
 * @param time
 * @param args
 * @returns {any}
 */
declare function setTimeoutUnref(callback: any, time?: any, args?: any): object;
export default setTimeoutUnref;
