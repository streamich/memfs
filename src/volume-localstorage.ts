import {Volume} from "./volume";
import {Link, Node} from "./node";


export interface IStore {
    setItem(key: string, json);
    getItem(key: string);
    removeItem(key: string);
}


export class ObjectStore {

    obj: object;

    constructor(obj) {
        this.obj = obj;
    }

    setItem(key: string, json) {
        this.obj[key] = JSON.stringify(json);
    }

    getItem(key: string) {
        const data = this.obj[key];
        if(typeof data === void 0) return void 0;
        return JSON.parse(data);
    }

    removeItem(key: string) {
        delete this.obj[key];
    }
}


export function createVolume(namespace: string, LS: Storage | object = localStorage): new (...args) => Volume {
    const store = new ObjectStore(LS);
    const key = (type, id) => `memfs.${namespace}.${type}.${id}`;

    class NodeLocalStorage extends Node {
        private _key: string;

        get Key(): string {
            if(!this._key) this._key = key('ino', this.ino);
            return this._key;
        }

        sync() {
            store.setItem(this.Key, this.toJSON());
        }

        touch() {
            super.touch();
            this.sync();
        }

        del() {
            super.del();
            store.removeItem(this.Key);
        }
    }

    class LinkLocalStorage extends Link {
        private _key: string;

        get Key(): string {
            if(!this._key) this._key = key('link', this.getPath());
            return this._key;
        }

        sync() {
            store.setItem(this.Key, this.toJSON());
        }
    }

    return class VolumeLocalStorage extends Volume {
        constructor() {
            super({
                Node: NodeLocalStorage,
                Link: LinkLocalStorage,
            });
        }

        createLink(parent?, name?, isDirectory?, perm?) {
            const link = super.createLink(parent, name, isDirectory, perm);
            store.setItem(key('link', link.getPath()), link.toJSON());
            return link;
        }

        deleteLink(link) {
            store.removeItem(key('link', link.getPath()));
            return super.deleteLink(link);
        }
    }
}