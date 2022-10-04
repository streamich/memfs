// Copied from fs-monkey/lib/correctPath but with ECMAScript Module imports.

import process from 'process';

const isWin = process.platform === 'win32';

function removeTrailingSeparator(str) {
  let i = str.length - 1;

  if (i < 2) {
    return str;
  }

  while (isSeparator(str, i)) {
    i--;
  }

  return str.substr(0, i + 1);
}

function isSeparator(str, i) {
  const _char = str[i];
  return i > 0 && (_char === '/' || (isWin && _char === '\\'));
}

function normalizePath(str, stripTrailing) {
  if (typeof str !== 'string') {
    throw new TypeError('expected a string');
  }

  str = str.replace(/[\\\/]+/g, '/');

  if (stripTrailing !== false) {
    str = removeTrailingSeparator(str);
  }

  return str;
}

export function unixify(filepath) {
  const stripTrailing = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;

  if (isWin) {
    filepath = normalizePath(filepath, stripTrailing);
    return filepath.replace(/^([a-zA-Z]+:|\.\/)/, '');
  }

  return filepath;
}
