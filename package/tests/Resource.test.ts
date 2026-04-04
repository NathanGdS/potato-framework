import { describe, it, expect, beforeEach } from 'vitest';
import { Resource } from '../src/Resource.js';
import { RouteNotFoundException } from '../src/errors/RouteNotFoundException.js';
import type { HandlerContext, RouteHandler } from '../src/types/index.js';

describe('Resource DSL', () => {
  let resource: Resource;

  beforeEach(() => {
    resource = new Resource();
    resource.registerGlobalPrefix('api');
  });

  describe('defineHandler — route registration', () => {
    it('should register a GET /users route via defineHandler', async () => {
      const called: HandlerContext[] = [];
      resource.resource('users').defineHandler({ method: 'GET' }, (ctx) => called.push(ctx));

      await resource.executeRequestCycle('/api/users', 'GET', null, {});

      expect(called).toHaveLength(1);
    });

    it('should register a POST /users route via defineHandler', async () => {
      const called: HandlerContext[] = [];
      resource.resource('users').defineHandler({ method: 'POST' }, (ctx) => called.push(ctx));

      await resource.executeRequestCycle('/api/users', 'POST', null, {});

      expect(called).toHaveLength(1);
    });

    it('should register a PATCH /users route via defineHandler', async () => {
      const called: HandlerContext[] = [];
      resource.resource('users').defineHandler({ method: 'PATCH' }, (ctx) => called.push(ctx));

      await resource.executeRequestCycle('/api/users', 'PATCH', null, {});

      expect(called).toHaveLength(1);
    });

    it('should register a PUT /users route via defineHandler', async () => {
      const called: HandlerContext[] = [];
      resource.resource('users').defineHandler({ method: 'PUT' }, (ctx) => called.push(ctx));

      await resource.executeRequestCycle('/api/users', 'PUT', null, {});

      expect(called).toHaveLength(1);
    });

    it('should register a DELETE /users route via defineHandler', async () => {
      const called: HandlerContext[] = [];
      resource.resource('users').defineHandler({ method: 'DELETE' }, (ctx) => called.push(ctx));

      await resource.executeRequestCycle('/api/users', 'DELETE', null, {});

      expect(called).toHaveLength(1);
    });
  });

  describe('defineHandler — sufix path extension', () => {
    it('should register GET /users/:id when sufix is ":id"', async () => {
      let captured: HandlerContext | undefined;
      resource
        .resource('users')
        .defineHandler({ method: 'GET', sufix: ':id' }, (ctx) => { captured = ctx; });

      await resource.executeRequestCycle('/api/users/42', 'GET', null, {});

      expect(captured?.params).toEqual({ id: '42' });
    });

    it('should register a route with a multi-segment sufix', async () => {
      const called: HandlerContext[] = [];
      resource
        .resource('users')
        .defineHandler({ method: 'GET', sufix: 'active' }, (ctx) => called.push(ctx));

      await resource.executeRequestCycle('/api/users/active', 'GET', null, {});

      expect(called).toHaveLength(1);
    });

    it('base resource route (no sufix) should not match the suffixed path', async () => {
      resource
        .resource('users')
        .defineHandler({ method: 'GET' }, (ctx) => {});

      await expect(
        resource.executeRequestCycle('/api/users/42', 'GET', null, {})
      ).rejects.toBeInstanceOf(RouteNotFoundException);
    });
  });

  describe('defineHandler — invalid method', () => {
    it('should throw Error("Invalid method") for an unsupported HTTP method', () => {
      resource.resource('users');

      expect(() =>
        resource.defineHandler({ method: 'BREW' }, () => {})
      ).toThrow('Invalid method');
    });

    it('should throw Error("Invalid method") for a lower-case valid method name', () => {
      resource.resource('users');

      expect(() =>
        resource.defineHandler({ method: 'get' }, () => {})
      ).toThrow('Invalid method');
    });

    it('should throw Error("Invalid method") for an empty string method', () => {
      resource.resource('users');

      expect(() =>
        resource.defineHandler({ method: '' }, () => {})
      ).toThrow('Invalid method');
    });
  });

  describe('defineHandler — fluent chaining', () => {
    it('should register multiple routes via chained defineHandler calls', async () => {
      const log: string[] = [];
      resource
        .resource('messages')
        .defineHandler({ method: 'GET' }, (ctx) => log.push('GET'))
        .defineHandler({ method: 'POST' }, (ctx) => log.push('POST'));

      await resource.executeRequestCycle('/api/messages', 'GET', null, {});
      await resource.executeRequestCycle('/api/messages', 'POST', null, {});

      expect(log).toEqual(['GET', 'POST']);
    });

    it('should register both a base route and a param route via chaining', async () => {
      const log: string[] = [];
      resource
        .resource('items')
        .defineHandler({ method: 'GET' }, (ctx) => log.push('list'))
        .defineHandler({ method: 'GET', sufix: ':id' }, (ctx) => log.push('detail'));

      await resource.executeRequestCycle('/api/items', 'GET', null, {});
      await resource.executeRequestCycle('/api/items/99', 'GET', null, {});

      expect(log).toEqual(['list', 'detail']);
    });
  });

  describe('defaultMiddlewares', () => {
    it('should append defaultMiddlewares after the explicit handler', async () => {
      const order: string[] = [];
      resource
        .resource('users')
        .defaultMiddlewares((ctx) => order.push('mw1'), (ctx) => order.push('mw2'))
        .defineHandler({ method: 'GET' }, (ctx) => order.push('handler'));

      await resource.executeRequestCycle('/api/users', 'GET', null, {});

      expect(order).toEqual(['handler', 'mw1', 'mw2']);
    });

    it('should apply defaultMiddlewares to every defineHandler registered after the call', async () => {
      const mwCalls: string[] = [];
      resource
        .resource('products')
        .defaultMiddlewares((ctx) => mwCalls.push('mw'))
        .defineHandler({ method: 'GET' }, (ctx) => {})
        .defineHandler({ method: 'POST' }, (ctx) => {});

      await resource.executeRequestCycle('/api/products', 'GET', null, {});
      await resource.executeRequestCycle('/api/products', 'POST', null, {});

      expect(mwCalls).toEqual(['mw', 'mw']);
    });
  });

  describe('registerGlobalPrefix', () => {
    it('should make routes respond under /api/v1/<resource> when prefix is "api/v1"', async () => {
      const r = new Resource();
      r.registerGlobalPrefix('api/v1');
      const called: HandlerContext[] = [];
      r.resource('users').defineHandler({ method: 'GET' }, (ctx) => called.push(ctx));

      await r.executeRequestCycle('/api/v1/users', 'GET', null, {});

      expect(called).toHaveLength(1);
    });

    it('should work the same when the prefix includes a leading slash', async () => {
      const r = new Resource();
      r.registerGlobalPrefix('/api/v1');
      const called: HandlerContext[] = [];
      r.resource('users').defineHandler({ method: 'GET' }, (ctx) => called.push(ctx));

      await r.executeRequestCycle('/api/v1/users', 'GET', null, {});

      expect(called).toHaveLength(1);
    });

    it('"/api/v1" and "api/v1" prefixes should produce identical matching behaviour', async () => {
      const withSlash = new Resource();
      withSlash.registerGlobalPrefix('/api/v1');
      const called1: HandlerContext[] = [];
      withSlash.resource('orders').defineHandler({ method: 'GET' }, (ctx) => called1.push(ctx));

      const withoutSlash = new Resource();
      withoutSlash.registerGlobalPrefix('api/v1');
      const called2: HandlerContext[] = [];
      withoutSlash.resource('orders').defineHandler({ method: 'GET' }, (ctx) => called2.push(ctx));

      await withSlash.executeRequestCycle('/api/v1/orders', 'GET', null, {});
      await withoutSlash.executeRequestCycle('/api/v1/orders', 'GET', null, {});

      expect(called1).toHaveLength(1);
      expect(called2).toHaveLength(1);
    });

    it('prefixed resource route should not match the unprefixed path', async () => {
      resource.resource('users').defineHandler({ method: 'GET' }, (ctx) => {});

      await expect(
        resource.executeRequestCycle('/users', 'GET', null, {})
      ).rejects.toBeInstanceOf(RouteNotFoundException);
    });

    it('should match a resource route created without registerGlobalPrefix using the direct path', async () => {
      const r = new Resource();
      const called: HandlerContext[] = [];
      r.resource('users').defineHandler({ method: 'GET' }, (ctx) => called.push(ctx));

      await r.executeRequestCycle('/users', 'GET', null, {});
      expect(called).toHaveLength(1);
    });
  });

  describe('type contracts', () => {
    it('resource() should return Resource instance for chaining', () => {
      const result = resource.resource('users');
      expect(result).toBeInstanceOf(Resource);
    });

    it('defineHandler should accept RouteHandler', () => {
      const handler: RouteHandler = (ctx) => {
        expect(typeof ctx.body).toBe('object');
        expect(typeof ctx.params).toBe('object');
      };
      resource.resource('test').defineHandler({ method: 'GET' }, handler);
    });

    it('defaultMiddlewares should accept multiple RouteHandlers', () => {
      const mw1: RouteHandler = () => {};
      const mw2: RouteHandler = async () => {};
      const result = resource.defaultMiddlewares(mw1, mw2);
      expect(result).toBeInstanceOf(Resource);
    });
  });
});
