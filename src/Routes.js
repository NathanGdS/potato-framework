import { isPromise } from "./utils/isPromise.js"
import { RouteNotFoundException } from "./errors/RouteNotFoundException.js";
import { HttpMethod } from "./constants/HttpMethod.constants.js";
import { buildRoutePath } from "./utils/buildRoutePath.js";
import { Middleware } from "./Middleware.js"

export class Routes {
    #routes = [];

    constructor() {
    }

    #createRequestCycle(sufix, httpMethod, ...args) {
        const middlewares = new Middleware();
        const length = args.length;
        for(let i =0; i <=length-1; i++) {
            if (i == length-1){
                this.#createRoute(httpMethod, sufix, args[length-1], middlewares.getAllMiddlewares());
                middlewares.reset();
                return;
            }
            middlewares.add(args[i]);
        }
    }

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

    #createRoute(method, sufix, dynamicFunction, middlewares) {
        if (sufix.at(0) != '/') {
            sufix = '/'+sufix;
        }
        
        const newRoute = {
            method,
            sufix: buildRoutePath(sufix),
            dynamicFunction,
            params: null,
            middlewares: middlewares ?? []
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
        const route = this.#routes[routeIndex];
        
        const params = route.params
        const dynamicFunction = route.dynamicFunction;
        const requestCycleObject = {
            body,
            params
        }
        Object.freeze(requestCycleObject);
        //execute middlewares
        if (route.middlewares) {
            for (let i=0; i < route.middlewares.length; i ++) {
                const actualMiddleware = route.middlewares[i];
                if(!isPromise(actualMiddleware)) {
                    actualMiddleware(requestCycleObject);
                    
                }else {
                    await actualMiddleware(requestCycleObject);
                }
            }
        }

        if(!isPromise(dynamicFunction)) {
            return dynamicFunction(requestCycleObject);
            
        }
        return await dynamicFunction(body);
    }
}