import { describe, it, expect, expectTypeOf } from 'vitest';
import { RequestCycle } from '../src/RequestCycle.js';
import type { HandlerContext, RouteHandler } from '../src/types/index.js';

describe('RequestCycle', () => {
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  describe('add()', () => {
    it('should add a single handler to the queue', () => {
      const cycle = new RequestCycle();
      const handler: RouteHandler = () => {};

      cycle.add(handler);

      expect(cycle.getAllHandlers()).toHaveLength(1);
      expect(cycle.getAllHandlers()[0]).toBe(handler);
    });
  });

  describe('addMultiples()', () => {
    it('should add multiple handlers in order', () => {
      const cycle = new RequestCycle();
      const h1: RouteHandler = () => {};
      const h2: RouteHandler = () => {};
      const h3: RouteHandler = () => {};

      cycle.addMultiples([h1, h2, h3]);

      const handlers = cycle.getAllHandlers();
      expect(handlers).toHaveLength(3);
      expect(handlers[0]).toBe(h1);
      expect(handlers[1]).toBe(h2);
      expect(handlers[2]).toBe(h3);
    });
  });

  describe('reset()', () => {
    it('should clear all handlers', () => {
      const cycle = new RequestCycle();
      cycle.add(() => {});
      cycle.add(() => {});
      expect(cycle.getAllHandlers()).toHaveLength(2);

      cycle.reset();

      expect(cycle.getAllHandlers()).toHaveLength(0);
    });
  });

  describe('getAllHandlers()', () => {
    it('should return the current handler array', () => {
      const cycle = new RequestCycle();
      const h1: RouteHandler = () => {};
      const h2: RouteHandler = () => {};
      cycle.addMultiples([h1, h2]);

      const handlers = cycle.getAllHandlers();

      expect(handlers).toEqual([h1, h2]);
    });

    it('should return an empty array when no handlers are added', () => {
      const cycle = new RequestCycle();

      const handlers = cycle.getAllHandlers();

      expect(handlers).toEqual([]);
    });
  });

  describe('executeRequestCycle()', () => {
    it('should call sync handler exactly once with the data object', async () => {
      const cycle = new RequestCycle();
      const data: HandlerContext = { body: null, params: null, headers: {}, queries: null };
      let callCount = 0;
      let received: HandlerContext | undefined;
      cycle.add((ctx) => {
        callCount++;
        received = ctx;
      });

      await cycle.executeRequestCycle(data);

      expect(callCount).toBe(1);
      expect(received).toBe(data);
    });

    it('should pass the same data object reference to each handler', async () => {
      const cycle = new RequestCycle();
      const data: HandlerContext = { body: null, params: null, headers: {}, queries: null };
      const receivedRefs: HandlerContext[] = [];
      cycle.addMultiples([
        (ctx) => { receivedRefs.push(ctx); },
        (ctx) => { receivedRefs.push(ctx); },
        (ctx) => { receivedRefs.push(ctx); },
      ]);

      await cycle.executeRequestCycle(data);

      expect(receivedRefs).toHaveLength(3);
      expect(receivedRefs[0]).toBe(data);
      expect(receivedRefs[1]).toBe(data);
      expect(receivedRefs[2]).toBe(data);
    });

    it('should await async handlers before proceeding to next', async () => {
      const order: number[] = [];
      const cycle = new RequestCycle();
      cycle.addMultiples([
        async () => { await delay(20); order.push(1); },
        async () => { order.push(2); },
      ]);

      await cycle.executeRequestCycle({} as HandlerContext);

      expect(order).toEqual([1, 2]);
    });

    it('should execute multiple handlers in sequential order', async () => {
      const order: number[] = [];
      const cycle = new RequestCycle();
      cycle.addMultiples([
        async () => { await delay(30); order.push(1); },
        async () => { await delay(10); order.push(2); },
        async () => { order.push(3); },
      ]);

      await cycle.executeRequestCycle({} as HandlerContext);

      expect(order).toEqual([1, 2, 3]);
    });

    it('should handle a mix of sync and async handlers in order', async () => {
      const order: string[] = [];
      const cycle = new RequestCycle();
      cycle.addMultiples([
        () => { order.push('sync-1'); },
        async () => { await delay(10); order.push('async-1'); },
        () => { order.push('sync-2'); },
        async () => { order.push('async-2'); },
      ]);

      await cycle.executeRequestCycle({} as HandlerContext);

      expect(order).toEqual(['sync-1', 'async-1', 'sync-2', 'async-2']);
    });

    it('should execute no handlers when the queue is empty', async () => {
      const cycle = new RequestCycle();

      await expect(cycle.executeRequestCycle({} as HandlerContext)).resolves.toBeUndefined();
    });
  });

  describe('type contracts', () => {
    it('should accept RouteHandler type functions', () => {
      const cycle = new RequestCycle();
      const handler: RouteHandler = (ctx) => {
        expectTypeOf(ctx.body).toBeUnknown();
        expectTypeOf(ctx.params).toBeNullish().or.toBeObject();
        expectTypeOf(ctx.headers).toBeObject();
        expectTypeOf(ctx.queries).toBeNullish().or.toBeObject();
      };

      cycle.add(handler);

      expect(cycle.getAllHandlers()).toHaveLength(1);
    });

    it('getAllHandlers should return RouteHandler array', () => {
      const cycle = new RequestCycle();
      const handler: RouteHandler = () => {};
      cycle.add(handler);

      const handlers = cycle.getAllHandlers();

      expectTypeOf(handlers[0]).toBeFunction();
      expectTypeOf(handlers).toBeArray();
    });

    it('executeRequestCycle should accept HandlerContext', async () => {
      const cycle = new RequestCycle();
      const context: HandlerContext = {
        body: { key: 'value' },
        params: { id: '123' },
        headers: { 'content-type': 'application/json' },
        queries: { page: '1' },
      };

      await expect(cycle.executeRequestCycle(context)).resolves.toBeUndefined();
    });
  });
});
