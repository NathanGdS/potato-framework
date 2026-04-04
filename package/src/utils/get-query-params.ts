export function getQueries(query: string | undefined | null): Record<string, string> | null {
  if (!query) return null;
  return query.substring(1).split('&').reduce<Record<string, string>>((data, item) => {
    const [param, value] = item.split('=');
    data[param] = value;
    return data;
  }, {});
}
