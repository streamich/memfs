import { Link } from './node';
import type { IDir, IDirent, TCallback } from './node/types/misc';
import { validateCallback } from './node/util';
import * as opts from './node/types/options';
import Dirent from './Dirent';

/**
 * A directory stream, like `fs.Dir`.
 */
export class Dir implements IDir {
    static build(link: Link, options: opts.IOpendirOptions) {
        const dir = new Dir();
        dir.link = link;
        dir.path = link.getParentPath();
        dir.options = options;
        dir.iteratorInfo.push(link.children[Symbol.iterator]());
        return dir;
    }

    path: string;
    private link: Link;
    private options: opts.IOpendirOptions;
    private iteratorInfo: IterableIterator<[string, Link | undefined]>[] = [];

    private wrapAsync(method: (...args) => void, args: any[], callback: TCallback<any>) {
        validateCallback(callback);
        setImmediate(() => {
            let result;
            try {
                result = method.apply(this, args);
            } catch (err) {
                callback(err);
                return;
            }
            callback(null, result);
        });
    }

    private isFunction(x: any): x is Function {
        return typeof x === "function";
    }

    private promisify<T>(
        obj: T,
        fn: keyof T
    ): (...args: any[]) => Promise<any> {
        return (...args) =>
            new Promise<void>((resolve, reject) => {
                if (this.isFunction(obj[fn])) {
                    obj[fn].bind(obj)(...args, (error: Error, result: any) => {
                        if (error) reject(error);
                        resolve(result);
                    });
                }
                else {
                    reject("Not a function");
                }
            });
    }

    private closeBase(): void {
    }

    closeBaseAsync(callback: (err?: Error) => void): void {
        this.wrapAsync(this.closeBase, [], callback);
    }

    close(): Promise<void>;
    close(callback?: (err?: Error) => void): void;
    close(callback?: unknown): void | Promise<void> {
        if (typeof callback === "function") {
            this.closeBaseAsync(callback as (err?: Error) => void);
        }
        else {
            return this.promisify(this, "closeBaseAsync")();
        }
    }
    closeSync(): void {
        this.closeBase();
    }

    private readBase(iteratorInfo: IterableIterator<[string, Link | undefined]>[]): IDirent | null {
        let done: boolean | undefined;
        let value: [string, Link | undefined];
        let name: string;
        let link: Link | undefined;

        do {
            do {
                ({ done, value } = iteratorInfo[iteratorInfo.length - 1].next());

                if (!done) {
                    [name, link] = value;
                }
                else {
                    break;
                }
            } while (name === "." || name === "..");

            if (done) {
                iteratorInfo.pop();

                if (iteratorInfo.length === 0) {
                    break;
                }
                else {
                    done = false;
                }
            }
            else {
                if (this.options.recursive && link!.children.size) {
                    iteratorInfo.push(link!.children[Symbol.iterator]());
                };

                return Dirent.build(link!, this.options.encoding);
            }
        }
        while (!done);

        return null;
    }

    readBaseAsync(callback: (err: Error | null, dir?: IDirent | null) => void): void {
        this.wrapAsync(this.readBase, [this.iteratorInfo], callback);
    }

    read(): Promise<IDirent | null>;
    read(callback?: (err: Error | null, dir?: IDirent | null) => void): void;
    read(callback?: unknown): void | Promise<IDirent | null> {
        if (typeof callback === "function") {
            this.readBaseAsync(callback as (err: Error | null, dir?: IDirent | null) => void);
        }
        else {
            return this.promisify(this, "readBaseAsync")();
        }
    }
    readSync(): IDirent | null {
        return this.readBase(this.iteratorInfo);
    }
    [Symbol.asyncIterator](): AsyncIterableIterator<IDirent> {
        const iteratorInfo: IterableIterator<[string, Link | undefined]>[] = [];
        const _this = this;

        iteratorInfo.push(_this.link.children[Symbol.iterator]());

        // auxiliary object so promisify() can be used
        const o = {
            readBaseAsync(callback: (err: Error | null, dir?: IDirent | null) => void): void {
                _this.wrapAsync(_this.readBase, [iteratorInfo], callback);
            }
        }

        return {
            async next() {
                const dirEnt = await _this.promisify(o, "readBaseAsync")();

                if (dirEnt !== null) {
                    return { done: false, value: dirEnt };
                }
                else {
                    return { done: true, value: undefined };
                }
            },

            [Symbol.asyncIterator](): AsyncIterableIterator<IDirent> {
                throw new Error("Not implemented");
            }
        }
    }
}
