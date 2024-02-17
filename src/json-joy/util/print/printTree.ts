type Child = (tab: string) => string;

export const printTree = (tab = '', children: (Child | null)[]): string => {
  children = children.filter(Boolean);
  let str = '';
  for (let i = 0; i < children.length; i++) {
    const isLast = i >= children.length - 1;
    const fn = children[i];
    if (!fn) continue;
    const child = fn(tab + `${isLast ? ' ' : '│'}  `);
    const branch = child ? (isLast ? '└─' : '├─') : '│ ';
    str += `\n${tab}${branch} ${child}`;
  }
  return str;
};
