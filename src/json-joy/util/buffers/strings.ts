import {bufferToUint8Array} from './bufferToUint8Array';

export const ascii = (txt: TemplateStringsArray | string | [string]): Uint8Array => {
  if (typeof txt === 'string') return ascii([txt]);
  [txt] = txt;
  const len = txt.length;
  const res = new Uint8Array(len);
  for (let i = 0; i < len; i++) res[i] = txt.charCodeAt(i);
  return res;
};

export const utf8 = (txt: TemplateStringsArray | [string] | string): Uint8Array => {
  if (typeof txt === 'string') return utf8([txt]);
  [txt] = txt;
  return bufferToUint8Array(Buffer.from(txt, 'utf8'));
};
