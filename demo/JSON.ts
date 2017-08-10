import {Volume} from '../src/volume';


const vol = Volume.fromJSON({
    './src/index.js': `
import React from 'react';
import {render} from 'react-dom';
import {App} from './components/app';

const el = document.createElement('div');
document.body.appendChild(el);
render(el, React.createElement(App, {}));
`,

    './README.md': `
# Hello World

This is some super cool project.
`,

    '.node_modules/EMPTY': '',

}, '/app');

console.log(vol.toJSON());
console.log(vol.readFileSync('/app/src/index.js', 'utf8'));
console.log(vol.readFileSync('/app/README.md', 'utf8'));
