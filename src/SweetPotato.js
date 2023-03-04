import http from "node:http";
import log from "./utils/logger.js";
import { CONSTANTS } from "./constants/index.js";
import { Routes } from "./Routes.js";
import { RouteNotFoundException } from "./errors/RouteNotFoundException.js";
import { HttpStatusCode } from "./constants/HttpStatusCode.constants.js";

export default class SweetPotatoApp extends Routes {
    #appReq;
    #appRes;
    #method;
    #path;
    #dataBody;
    #port;
    #headers;

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
        this.#headers = req.headers;
        req = null;
        res = null;
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
            return await this.executeRequestCycle(this.#path, this.#method, this.#dataBody, this.#headers);
        } catch (error) {
            if (error instanceof RouteNotFoundException) {
                return this.finishRequest(HttpStatusCode.NOT_FOUND, {
                    message: error.message
                })
            }
            return this.finishRequest(HttpStatusCode.INTERNAL_SERVER_ERROR, {
                message: error.message
            })
        }
    }

    finishRequest(code, message) {
        if (!code) {
            code = HttpStatusCode.SUCCESS;
        }
        this.#appRes.writeHead(code);
        this.#appRes.write(JSON.stringify(message));
        this.#appRes.end()
    }
}

