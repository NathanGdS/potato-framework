export function getRouteParams(groups) {
    const {query, ...others} =groups;
    return others;
}