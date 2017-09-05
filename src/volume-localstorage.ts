import {Volume} from "./volume";
import {Link, Node} from "./node";

const LS = {};

export class NodeLocalstorage extends Node {
    key() {
        return `memfs.ino.${this.ino}`;
    }

    sync() {
        LS[this.key()] = this.toJSON();
    }

    touch() {
        super.touch();
        this.sync();
    }

    del() {
        delete LS[this.key()];
    }
}

export class LinkLocalstorage extends Link {

}

export class VolumeLocalstorage extends Volume {
    constructor() {
        super({
            Node: NodeLocalstorage,
            Link: LinkLocalstorage,
        });


    }
}

export function createVolume(namespace: string, LS = localStorage) {

    const key = (type, id) => `memfs.${namespace}.${type}.${id}`;

    export class NodeLocalstorage extends Node {
        key() {
            return key('ino', this.ino);
        }

        sync() {
            LS[this.key()] = this.toJSON();
        }

        touch() {
            super.touch();
            this.sync();
        }

        del() {
            super.del();
            delete LS[this.key()];
        }
    }

    export class LinkLocalstorage extends Link {

    }

    export class VolumeLocalstorage extends Volume {
        constructor() {
            super({
                Node: NodeLocalstorage,
                Link: LinkLocalstorage,
            });


        }
    }
}