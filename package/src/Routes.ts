import type { IncomingHttpHeaders } from 'node:http';
import { HttpMethod } from './constants/index.js';
import type { HandlerContext, RouteHandler } from './types/index.js';
import { RouteNotFoundException } from './errors/RouteNotFoundException.js';
import { RequestCycle } from './RequestCycle.js';
import { buildRoutePath } from './utils/buildRoutePath.js';
import { getQueries } from './utils/get-query-params.js';
import { getRouteParams } from './utils/get-route-params.js';
import { LoggerInstance } from './utils/logger.js';

interface Route {
  method: string;
  originalSufix: string;
  sufix: RegExp;
  params: Record<string, string> | null;
  queries: Record<string, string> | null;
  requestCycle: RequestCycle;
}

export class Routes {
  private routes: Route[] = [];
  private globalPrefix: string | undefined;
  private alias = 'RouteHandler';

  get(sufix: string, ...args: RouteHandler[]): void {
    this.createRequestCycle(sufix, HttpMethod.GET, ...args);
  }

  post(sufix: string, ...args: RouteHandler[]): void {
    this.createRequestCycle(sufix, HttpMethod.POST, ...args);
  }

  patch(sufix: string, ...args: RouteHandler[]): void {
    this.createRequestCycle(sufix, HttpMethod.PATCH, ...args);
  }

  put(sufix: string, ...args: RouteHandler[]): void {
    this.createRequestCycle(sufix, HttpMethod.PUT, ...args);
  }

  delete(sufix: string, ...args: RouteHandler[]): void {
    this.createRequestCycle(sufix, HttpMethod.DELETE, ...args);
  }

  private createRequestCycle(sufix: string, httpMethod: string, ...args: RouteHandler[]): void {
    const requestCycle = new RequestCycle();
    requestCycle.addMultiples(args);
    this.createRoute(httpMethod, sufix, requestCycle.getAllHandlers());
  }

  registerGlobalPrefix(prefix: string): void {
    if (!prefix) return;

    if (prefix.at(0) !== '/') {
      prefix = '/' + prefix;
    }

    LoggerInstance().registerPrefix(prefix, this.alias);

    this.globalPrefix = prefix;
  }

  private createRoute(method: string, sufix: string, handlers: RouteHandler[]): void {
    if (sufix.at(0) !== '/') {
      sufix = '/' + sufix;
    }
    sufix = (this.globalPrefix ?? '') + sufix;

    const newRoute: Route = {
      method,
      originalSufix: sufix,
      sufix: buildRoutePath(sufix),
      params: null,
      queries: null,
      requestCycle: new RequestCycle(handlers),
    };
    LoggerInstance().registerRoute(newRoute.method, newRoute.originalSufix, this.alias);
    this.routes.push(newRoute);
  }

  private getRouteIndex(path: string, method: string): number {
    return this.routes.findIndex((e) => {
      const regexVerifier = e.sufix.exec(path);
      if (!regexVerifier) return false;
      if (e.method !== method) return false;
      if (regexVerifier.find((t) => t === path)) {
        e.params = getRouteParams(regexVerifier.groups as Record<string, string>);
        e.queries = getQueries(regexVerifier.groups?.['query']);
        return true;
      }
      return false;
    });
  }

  async executeRequestCycle(
    path: string,
    method: string,
    body: unknown,
    headers: IncomingHttpHeaders
  ): Promise<void> {
    const routeIndex = this.getRouteIndex(path, method);
    if (routeIndex < 0) {
      throw new RouteNotFoundException();
    }
    const route = this.routes[routeIndex];

    const params = route.params;
    const queries = route.queries;
    const requestCycleObject: HandlerContext = Object.freeze({
      body,
      params,
      headers,
      queries,
    });

    if (route.requestCycle) {
      return await route.requestCycle.executeRequestCycle(requestCycleObject);
    }
    throw new Error('Error in request life cycle request');
  }

  registerRoutes(routes: Route[]): void {
    routes.forEach((e) => {
      this.routes.push(e);
    });
  }

  getRoutes(): Route[] {
    return this.routes;
  }
}
