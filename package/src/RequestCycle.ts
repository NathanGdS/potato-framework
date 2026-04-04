import { isPromise } from './utils/isPromise.js';
import type { HandlerContext, RouteHandler } from './types/index.js';

export class RequestCycle {
  private handlers: RouteHandler[];

  constructor(handlers?: RouteHandler[]) {
    this.handlers = handlers ?? [];
  }

  add(func: RouteHandler): void {
    this.handlers.push(func);
  }

  addMultiples(funcs: RouteHandler[]): void {
    this.handlers.push(...funcs);
  }

  async executeRequestCycle(data: HandlerContext): Promise<void> {
    for (let i = 0; i < this.handlers.length; i++) {
      const actualHandler = this.handlers[i];
      if (!isPromise(actualHandler)) {
        actualHandler(data);
      } else {
        await actualHandler(data);
      }
    }
  }

  reset(): void {
    this.handlers = [];
  }

  getAllHandlers(): RouteHandler[] {
    return this.handlers;
  }
}
