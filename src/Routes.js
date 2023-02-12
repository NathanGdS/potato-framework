import { RouteNotFoundException } from "./errors/RouteNotFoundException.js";
import { HttpMethod } from "./constants/HttpMethod.constants.js";
import { buildRoutePath } from "./utils/buildRoutePath.js";
import { RequestCycle } from "./RequestCycle.js";

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
        requestCycle.addMultiples(args)
        const length = args.length;
        this.#createRoute(httpMethod, sufix, args[length-1], requestCycle.getAllMiddlewares());
    }

    #createRoute(method, sufix, dynamicFunction, middlewares) {
        if (sufix.at(0) != '/') {
            sufix = '/'+sufix;
        }
        
        const newRoute = {
            method,
            sufix: buildRoutePath(sufix),
            dynamicFunction,
            params: null,
            requestCycle: new RequestCycle(middlewares)
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

    async executeRequestCycle(path, method, body) {
        const routeIndex = this.#getRouteIndex(path, method)
        if(routeIndex < 0) {
            throw new RouteNotFoundException();
        }
        const route = this.#routes[routeIndex];
        
        const params = route.params;
        const requestCycleObject = {
            body,
            params
        }
        Object.freeze(requestCycleObject);
        if (route.requestCycle) {
            return await route.requestCycle.executeRequestCycle(requestCycleObject)
        }
        throw new Error('Error in request life cycle request')
    }
}