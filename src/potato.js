import http from "node:http";
import log from "./utils/logger.js";
import { isPromise } from "./utils/isPromise.js"
import { CONSTANTS } from "./constants/index.js";

export default class PotatoApp {
    #appReq;
    #appRes;
    #method;
    #path;
    #dataBody;
    #routes = [];
    #port;

    constructor(port) {
        this.#port = port;
        if (!port) {
            this.#port = constants.defaultPort;
        }
        this.#startApp();
    }

    #startApp() {
        http.createServer(async (req, res) => {
            this.#defineGlobalAttributes(req, res);
            await this.#defineBodyAttributes();
            await this.#handleRoute();

            this.#appRes.end();
        }).listen(this.#port, () => {
            log(`App is running on port ${this.#port}`).info();
        });
    }

    createRoute(method, sufix, dynamicFunction) {
        if (sufix.at(0) != '/') {
            sufix = '/'+sufix;
        }
        this.#routes.push({
            method,
            sufix,
            dynamicFunction,
        });
    }

    #defineGlobalAttributes(req, res) {
        this.#appReq = req;
        this.#appRes = res;
        this.#method = req.method.toUpperCase();
        this.#path = req.url;
    }

    async #defineBodyAttributes() {
        const buffers = [];

        for await (const chunk of this.#appReq) {
          buffers.push(chunk);
        }

        if (buffers.length) {
            this.#dataBody = JSON.parse(Buffer.concat(buffers).toString());
        }
    }

    async #handleRoute() {
        const routeIndex = this.#getRouteIndex();
        if (routeIndex < 0) {
            return this.finishRequest(CONSTANTS.codes.NOT_FOUND, {
                message: CONSTANTS.routes.INVALID_ROUTE_MESSAGE
            })
        }
        const dynamicFunction = this.#routes[routeIndex].dynamicFunction;
        if(!isPromise(dynamicFunction)) {
            return dynamicFunction(this.#dataBody);
            
        }
        return await dynamicFunction(this.#dataBody);
    }

    #getRouteIndex() {
        return this.#routes.findIndex(e => e.sufix == this.#path && e.method == this.#method);
    }

    finishRequest(code, message) {
        if (!code) {
            code = constants.codes.SUCCESS;
        }
        this.#appRes.writeHead(code);
        this.#appRes.write(JSON.stringify(message));
        this.#appRes.end()
    }
}

