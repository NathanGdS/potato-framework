import { isPromise } from "./utils/isPromise.js"
import { RouteNotFoundException } from "./errors/RouteNotFoundException.js";
import { HttpMethod } from "./constants/HttpMethod.constants.js";
import { buildRoutePath } from "./utils/buildRoutePath.js";

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
        
        const newRoute = {
            method,
            sufix: buildRoutePath(sufix),
            dynamicFunction,
            params: null
        }
        this.#routes.push(newRoute);
    }

    #getRouteIndex(path, method) {
        return this.#routes.findIndex(e => {
            const regexVerfier = e.sufix.exec(path);
            if(regexVerfier && e.method == method) {
               if(regexVerfier.find(t => t==path)){
                e.params = regexVerfier.groups
                return e;
               }
            }
        });
    }

    async executeDynamicFunction(path, method, body) {
        const routeIndex = this.#getRouteIndex(path, method)
        if(routeIndex < 0) {
            throw new RouteNotFoundException();
        }
        
        const params =this.#routes[routeIndex].params
        const dynamicFunction = this.#routes[routeIndex].dynamicFunction;
        if(!isPromise(dynamicFunction)) {
            return dynamicFunction({
                body,
                params
            });
            
        }
        return await dynamicFunction(body);
    }
}