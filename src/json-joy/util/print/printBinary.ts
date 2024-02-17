type Child = (tab: string) => string;

export const printBinary = (tab = '', children: [left?: null | Child, right?: null | Child]): string => {
  const [left, right] = children;
  let str = '';
  if (left) str += `\n${tab}← ${left(tab + '  ')}`;
  if (right) str += `\n${tab}→ ${right(tab + '  ')}`;
  return str;
};
