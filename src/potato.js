import http from "node:http";
import log from "./utils/logger.js";
import { CONSTANTS } from "./constants/index.js";
import { Routes } from "./Routes.js";
import { RouteNotFoundException } from "./errors/RouteNotFoundException.js";

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
        try {
            return await this.executeDynamicFunction(this.#path, this.#method, this.#dataBody);
        } catch (error) {
            if (error instanceof RouteNotFoundException) {
                return this.finishRequest(CONSTANTS.codes.NOT_FOUND, {
                    message: CONSTANTS.routes.INVALID_ROUTE_MESSAGE
                })
            }
            return this.finishRequest(500, {
                message: error.message
            })
        }
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

