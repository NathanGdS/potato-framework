export function getRouteParams(
  groups: Record<string, string>
): Record<string, string> | null {
  const { query: _query, ...others } = groups;
  if (Object.keys(others).length === 0) return {};
  return others;
}
