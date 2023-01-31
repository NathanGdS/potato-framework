import http from "node:http";
import log from "./utils/logger.js";
import { CONSTANTS } from "./constants/index.js";
import { Routes } from "./Routes.js";

export default class PotatoApp extends Routes {
    #appReq;
    #appRes;
    #method;
    #path;
    #dataBody;
    #port;

    constructor(port) {
        super();
        this.#port = port;
        if (!port) {
            this.#port = CONSTANTS.defaultPort;
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
        const routeIndex = this._getRouteIndex(this.#path, this.#method);
        if (routeIndex < 0) {
            return this.finishRequest(CONSTANTS.codes.NOT_FOUND, {
                message: CONSTANTS.routes.INVALID_ROUTE_MESSAGE
            })
        }
        return await this.executeDynamicFunction(routeIndex, this.#dataBody);
    }

    finishRequest(code, message) {
        if (!code) {
            code = CONSTANTS.codes.SUCCESS;
        }
        this.#appRes.writeHead(code);
        this.#appRes.write(JSON.stringify(message));
        this.#appRes.end()
    }
}

