export function getQueries(query) {
    if(!query) return null;
    return query.substr(1).split('&').reduce((data, item) => {
        const [param, value] = item.split('=');

        data[param] = value;
        return data;
    }, {})
}