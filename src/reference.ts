

export class Reference {

    path: string[] = [];

    ref(path: string): Reference {
        const ref = new Reference;

        // Remove leading slash.
        if(path[0] === '/') path = path.substr(1);

        ref.path = this.path.concat(path.split('/'));

        return ref;
    }
}
