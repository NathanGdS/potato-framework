import http from "node:http";
import log from "./utils/logger.js";

export default class PotatoApp {
    #appReq;
    #appRes;
    #method;
    #path;
    #dataBody;
    #routes = [];
    constructor(port) {
        http.createServer(async (req, res) => {
            this.#defineGlobalAttributes(req, res);
            await this.#defineBodyAttributes();
            this.#handleRoute();

            this.#appRes.end();
        }).listen(port, () => {
            log(`App is running on port ${port}`).info();
        })
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
        this.#method = req.method;
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

    #handleRoute() {
        const routeIndex = this.#routes.findIndex(e => e.sufix == this.#path && e.method == this.#method);
        if (routeIndex >= 0) {
            this.#routes[routeIndex].dynamicFunction(this.#dataBody);
            return;
        }
        return this.finishRequest(404, {
            message: 'Route not founded!'
        })
    }

    finishRequest(code, message) {
        if (!code) {
            code = 200;
        }
        this.#appRes.writeHead(code);
        this.#appRes.write(JSON.stringify(message));
        this.#appRes.end()
    }
    
}

// function isPromise(func) {
//     if (typeof func === 'object' && typeof func.then === 'function') {
//       return true;
//     }
  
//     return false;
//   }