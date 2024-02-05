import { HttpMethod } from "./constants/HttpMethod.constants.mjs";
import { RouteNotFoundException } from "./errors/RouteNotFoundException.mjs";
import { RequestCycle } from "./RequestCycle.mjs";
import { buildRoutePath } from "./utils/buildRoutePath.mjs";
import { getQueries } from "./utils/get-query-params.mjs";
import { getRouteParams } from "./utils/get-route-params.mjs";
import { LoggerInstance } from "./utils/logger.mjs";

export class Routes {
  #routes = [];
  #globalPrefix;
  #alias = "RouteHandler";

  constructor() {}

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
    requestCycle.addMultiples(args);
    this.#createRoute(httpMethod, sufix, requestCycle.getAllHandlers());
  }

  registerGlobalPrefix(prefix) {
    if (!prefix) return;

    if (prefix.at(0) != "/") {
      prefix = "/" + prefix;
    }

    this.#globalPrefix = prefix;
  }

  #createRoute(method, sufix, requestCycle) {
    if (sufix.at(0) != "/") {
      sufix = "/" + sufix;
    }
    sufix = this.#globalPrefix + sufix;

    const newRoute = {
      method,
      originalSufix: sufix,
      sufix: buildRoutePath(sufix),
      params: null,
      queries: null,
      requestCycle: new RequestCycle(requestCycle),
    };
    LoggerInstance().registerRoute(
      newRoute.method,
      newRoute.originalSufix,
      this.#alias
    );
    this.#routes.push(newRoute);
  }

  #getRouteIndex(path, method) {
    return this.#routes.findIndex((e) => {
      const regexVerfier = e.sufix.exec(path);
      if (!regexVerfier) return;
      if (e.method != method) return;
      if (regexVerfier.find((t) => t == path)) {
        e.params = getRouteParams(regexVerfier.groups);
        e.queries = getQueries(regexVerfier.groups.query);
        return e;
      }
    });
  }

  async executeRequestCycle(path, method, body, headers) {
    const routeIndex = this.#getRouteIndex(path, method);
    if (routeIndex < 0) {
      throw new RouteNotFoundException();
    }
    const route = this.#routes[routeIndex];

    const params = route.params;
    const queries = route.queries;
    const requestCycleObject = {
      body,
      params,
      headers,
      queries,
    };
    Object.freeze(requestCycleObject);
    if (route.requestCycle) {
      return await route.requestCycle.executeRequestCycle(requestCycleObject);
    }
    throw new Error("Error in request life cycle request");
  }

  registerRoutes(routes) {
    routes.forEach((e) => {
      this.#routes.push(e);
    });
  }

  getRoutes() {
    return this.#routes;
  }
}

export class Resource extends Routes {
  #sufix;
  #defaultMiddlewares = [];
  #handlers = [];
  constructor() {
    super();
  }

  /**
   *
   * @param {string} sufix
   * @returns {Resource}
   */
  resource(sufix) {
    this.#sufix = sufix;
    return this;
  }

  /**
   * @typedef {object} HandlerInput
   * @property {HttpMethod} method
   * @property {string} sufix
   */

  /**
   * @param {HandlerInput} input
   * @param {Array<Function>} args
   * @returns {Resource}
   */
  defineHandler(input, ...args) {
    const parsedMethod = HttpMethod[input.method];
    if (!parsedMethod) {
      throw new Error("Invalid method");
    }

    let sufix = this.#sufix;

    if (input.sufix) {
      sufix += "/" + input.sufix;
    }
    const middlewares = [...args, ...this.#defaultMiddlewares];
    this[input.method.toLowerCase()](sufix, ...middlewares);
    return this;
  }

  defaultMiddlewares(...args) {
    this.#defaultMiddlewares.push(...args);
    return this;
  }
}
