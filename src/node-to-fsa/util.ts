export const basename = (path: string) => {
  const lastSlashIndex = path.lastIndexOf('/');
  return lastSlashIndex === -1 ? path : path.slice(lastSlashIndex + 1);
};
