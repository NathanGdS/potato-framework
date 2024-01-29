export function buildRoutePath(path) {
    const routeParametersRegex = /:([a-zA-Z]+)/g
    const params = path.replaceAll(routeParametersRegex, '(?<$1>[a-z0-9\-_]+)');

    const queryRegex = new RegExp(`^${params}(?<query>\\?(.*))?$`);

    return queryRegex;
}