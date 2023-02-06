export function buildRoutePath(path) {
    const routeParametersRegex = /:([a-zA-Z]+)/g
    const params = path.replaceAll(routeParametersRegex, '(?<$1>[a-z0-9\-_]+)');

    return new RegExp(`^${params}`)
}