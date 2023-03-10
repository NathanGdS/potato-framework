import http from "node:http";
import { HttpStatusCode } from "./constants/HttpStatusCode.constants.js";
import { RouteNotFoundException } from "./errors/RouteNotFoundException.js";
import { Routes } from "./Routes.js";
import { LoggerInstance as log } from "./utils/logger.js";

class SweetPotato extends Routes {
    #appReq;
    #appRes;
    #method;
    #path;
    #dataBody;
    #port;
    #headers;
    #alias = 'App';

    constructor() {
        super();
        log().info('Starting a Sweet app for you', this.#alias);
    }

    listen(port) {
        this.#port = port ?? 8080;
        http.createServer(async (req, res) => {
            this.#defineGlobalAttributes(req, res);
            await this.#defineBodyAttributes();
            await this.#handleRoute();

            this.#appRes.end();
        }).listen(this.#port, () => {
            log().info(`${this.getRoutes().length} routes created`, this.#alias);
            log().info(`App is running on port ${this.#port}`, this.#alias);
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

// singleton of SweetPotato
export class SweetPotatoAppInstance {
    #instance;
    constructor() {
        if(!this.#instance) {
            this.#instance = new SweetPotato();
        }
        return this.#getInstance();
    }

    #getInstance() {
        return this.#instance;
    }
}