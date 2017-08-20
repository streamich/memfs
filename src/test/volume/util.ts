import {Volume} from '../..';


export const create = (json: {[s: string]: string} = {'/foo': 'bar'}) => {
    const vol = Volume.fromJSON(json);
    return vol;
};
