import { isPromise } from "./utils/isPromise.js"
import { RouteNotFoundException } from "./errors/RouteNotFoundException.js";
import { HttpMethod } from "./constants/HttpMethod.constants.js";

export class Routes {
    #routes = [];

    constructor() {
    }

    get(sufix, dynamicFunction) {
        this.#createRoute(HttpMethod.GET, sufix, dynamicFunction);
    }

    post(sufix, dynamicFunction) {
        this.#createRoute(HttpMethod.POST, sufix, dynamicFunction);
    }

    patch(sufix, dynamicFunction) {
        this.#createRoute(HttpMethod.PATCH, sufix, dynamicFunction);
    }

    put(sufix, dynamicFunction) {
        this.#createRoute(HttpMethod.PUT, sufix, dynamicFunction);
    }

    delete(sufix, dynamicFunction) {
        this.#createRoute(HttpMethod.DELETE, sufix, dynamicFunction);
    }

    #createRoute(method, sufix, dynamicFunction) {
        if (sufix.at(0) != '/') {
            sufix = '/'+sufix;
        }

        this.#routes.push({
            method,
            sufix,
            dynamicFunction,
        });
    }

    #getRouteIndex(path, method) {
        return this.#routes.findIndex(e => e.sufix == path && e.method == method);
    }

    async executeDynamicFunction(path, method, body) {
        const routeIndex = this.#getRouteIndex(path, method)
        if(routeIndex < 0) {
            throw new RouteNotFoundException();
        }
        const dynamicFunction = this.#routes[routeIndex].dynamicFunction;
        if(!isPromise(dynamicFunction)) {
            return dynamicFunction(body);
            
        }
        return await dynamicFunction(body);
    }
}