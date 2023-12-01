/// <reference types="jest" />
import { Link, Node } from '../node';
export declare const create: (json?: {
    [s: string]: string;
}) => import("../volume").Volume;
export declare const createFs: (json?: any) => import("..").IFs;
export declare const tryGetChild: (link: Link, name: string) => Link;
export declare const tryGetChildNode: (link: Link, name: string) => Node;
/**
 * The `File` global is available only starting in Node v20. Hence we run the
 * tests only in those versions.
 */
export declare const onlyOnNode20: jest.Describe;
