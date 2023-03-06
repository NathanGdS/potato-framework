import { RouteNotFoundException } from "./errors/RouteNotFoundException.js";
import { HttpMethod } from "./constants/HttpMethod.constants.js";
import { buildRoutePath } from "./utils/buildRoutePath.js";
import { RequestCycle } from "./RequestCycle.js";
import { getQueries } from "./utils/get-query-params.js";
import { getRouteParams } from "./utils/get-route-params.js";

export class Routes {
    #routes = [];

    constructor() { }

    get(sufix, ...args) {
        this.#createRequestCycle(sufix, HttpMethod.GET, ...args);
    }

    post(sufix, ...args) {
        this.#createRequestCycle(sufix, HttpMethod.POST, ...args);
    }

    patch(sufix, ...args) {
        this.#createRequestCycle(sufix, HttpMethod.PATCH, ...args);
    }

    put(sufix, ...args) {
        this.#createRequestCycle(sufix, HttpMethod.PUT, ...args);
    }

    delete(sufix, ...args) {
        this.#createRequestCycle(sufix, HttpMethod.DELETE, ...args);
    }

    #createRequestCycle(sufix, httpMethod, ...args) {
        const requestCycle = new RequestCycle();
        requestCycle.addMultiples(args);
        this.#createRoute(httpMethod, sufix, requestCycle.getAllHandlers());
    }

    #createRoute(method, sufix, requestCycle) {
        if (sufix.at(0) != '/') {
            sufix = '/'+sufix;
        }
        const newRoute = {
            method,
            sufix: buildRoutePath(sufix),
            params: null,
            queries: null,
            requestCycle: new RequestCycle(requestCycle)
        }
        this.#routes.push(newRoute);
    }

    #getRouteIndex(path, method) {
        return this.#routes.findIndex(e => {
            const regexVerfier = e.sufix.exec(path);
            if(!regexVerfier) return;
            if(e.method != method) return;
            if(regexVerfier.find(t => t==path)){
                e.params = getRouteParams(regexVerfier.groups)
                e.queries = getQueries(regexVerfier.groups.query);
                return e;
            }
        });
    }

    async executeRequestCycle(path, method, body, headers) {
        const routeIndex = this.#getRouteIndex(path, method)
        if(routeIndex < 0) {
            throw new RouteNotFoundException();
        }
        const route = this.#routes[routeIndex];
        
        const params = route.params;
        const queries = route.queries;
        const requestCycleObject = {
            body,
            params,
            headers,
            queries
        }
        Object.freeze(requestCycleObject);
        if (route.requestCycle) {
            return await route.requestCycle.executeRequestCycle(requestCycleObject)
        }
        throw new Error('Error in request life cycle request')
    }
}