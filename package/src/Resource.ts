import { Routes } from './Routes.js';
import { HttpMethod } from './constants/index.js';
import type { RouteHandler } from './types/index.js';

interface DefineHandlerInput {
  method: keyof typeof HttpMethod;
  sufix?: string;
}

export class Resource extends Routes {
  private sufix: string = '';
  private _defaultMiddlewares: RouteHandler[] = [];

  resource(sufix: string): this {
    this.sufix = sufix;
    return this;
  }

  defineHandler(input: DefineHandlerInput, ...args: RouteHandler[]): this {
    const parsedMethod = HttpMethod[input.method];
    if (!parsedMethod) {
      throw new Error('Invalid method');
    }

    let sufix = this.sufix;

    if (input.sufix) {
      sufix += '/' + input.sufix;
    }

    const middlewares: RouteHandler[] = [...args, ...this._defaultMiddlewares];
    this[input.method.toLowerCase() as 'get' | 'post' | 'patch' | 'put' | 'delete'](
      sufix,
      ...middlewares
    );
    return this;
  }

  defaultMiddlewares(...args: RouteHandler[]): this {
    this._defaultMiddlewares.push(...args);
    return this;
  }
}
