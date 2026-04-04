import { describe, it, expect, expectTypeOf, beforeEach } from 'vitest';
import { Routes } from '../src/Routes.js';
import { RouteNotFoundException } from '../src/errors/RouteNotFoundException.js';
import { RequestCycle } from '../src/RequestCycle.js';
import { buildRoutePath } from '../src/utils/buildRoutePath.js';
import type { HandlerContext, RouteHandler } from '../src/types/index.js';

describe('Routes', () => {
  let routes: Routes;

  beforeEach(() => {
    routes = new Routes();
  });

  describe('route registration', () => {
    it('should register and match a GET route', async () => {
      const received: HandlerContext[] = [];
      routes.registerGlobalPrefix('v1');
      routes.get('/ping', (ctx) => received.push(ctx));

      await routes.executeRequestCycle('/v1/ping', 'GET', null, {});

      expect(received).toHaveLength(1);
    });

    it('should register and match a POST route', async () => {
      const received: HandlerContext[] = [];
      routes.registerGlobalPrefix('v1');
      routes.post('/ping', (ctx) => received.push(ctx));

      await routes.executeRequestCycle('/v1/ping', 'POST', null, {});

      expect(received).toHaveLength(1);
    });

    it('should register and match a PATCH route', async () => {
      const received: HandlerContext[] = [];
      routes.registerGlobalPrefix('v1');
      routes.patch('/ping', (ctx) => received.push(ctx));

      await routes.executeRequestCycle('/v1/ping', 'PATCH', null, {});

      expect(received).toHaveLength(1);
    });

    it('should register and match a PUT route', async () => {
      const received: HandlerContext[] = [];
      routes.registerGlobalPrefix('v1');
      routes.put('/ping', (ctx) => received.push(ctx));

      await routes.executeRequestCycle('/v1/ping', 'PUT', null, {});

      expect(received).toHaveLength(1);
    });

    it('should register and match a DELETE route', async () => {
      const received: HandlerContext[] = [];
      routes.registerGlobalPrefix('v1');
      routes.delete('/ping', (ctx) => received.push(ctx));

      await routes.executeRequestCycle('/v1/ping', 'DELETE', null, {});

      expect(received).toHaveLength(1);
    });
  });

  describe('route matching', () => {
    it('should call the correct handler for an exact GET path match', async () => {
      const received: string[] = [];
      routes.registerGlobalPrefix('v1');
      routes.get('/hello', (ctx) => received.push('hello'));
      routes.get('/world', (ctx) => received.push('world'));

      await routes.executeRequestCycle('/v1/hello', 'GET', null, {});

      expect(received).toEqual(['hello']);
    });

    it('should execute all handlers registered for the same route in order', async () => {
      const order: number[] = [];
      routes.registerGlobalPrefix('v1');
      routes.get('/chain',
        (ctx) => order.push(1),
        (ctx) => order.push(2),
        (ctx) => order.push(3),
      );

      await routes.executeRequestCycle('/v1/chain', 'GET', null, {});

      expect(order).toEqual([1, 2, 3]);
    });

    it('should pass body and headers into the context object', async () => {
      let captured: HandlerContext | undefined;
      const body = { name: 'potato' };
      const headers = { 'content-type': 'application/json' };
      routes.registerGlobalPrefix('v1');
      routes.post('/data', (ctx) => { captured = ctx; });

      await routes.executeRequestCycle('/v1/data', 'POST', body, headers);

      expect(captured?.body).toBe(body);
      expect(captured?.headers).toBe(headers);
    });

    it('should pass a frozen context object to the handler', async () => {
      let captured: HandlerContext | undefined;
      routes.registerGlobalPrefix('v1');
      routes.get('/frozen', (ctx) => { captured = ctx; });

      await routes.executeRequestCycle('/v1/frozen', 'GET', null, {});

      expect(Object.isFrozen(captured)).toBe(true);
    });
  });

  describe('route params', () => {
    it('should pass extracted :id param in the context params object', async () => {
      let captured: HandlerContext | undefined;
      routes.registerGlobalPrefix('v1');
      routes.get('/users/:id', (ctx) => { captured = ctx; });

      await routes.executeRequestCycle('/v1/users/42', 'GET', null, {});

      expect(captured?.params).toEqual({ id: '42' });
    });

    it('should pass multiple named params in the context params object', async () => {
      let captured: HandlerContext | undefined;
      routes.registerGlobalPrefix('v1');
      routes.get('/users/:userId/posts/:postId', (ctx) => { captured = ctx; });

      await routes.executeRequestCycle('/v1/users/10/posts/99', 'GET', null, {});

      expect(captured?.params).toEqual({ userId: '10', postId: '99' });
    });

    it('should have an empty params object for a static route (no named params)', async () => {
      let captured: HandlerContext | undefined;
      routes.registerGlobalPrefix('v1');
      routes.get('/static', (ctx) => { captured = ctx; });

      await routes.executeRequestCycle('/v1/static', 'GET', null, {});

      expect(captured?.params).toEqual({});
    });
  });

  describe('query strings', () => {
    it('should extract a single query param and pass it as queries', async () => {
      let captured: HandlerContext | undefined;
      routes.registerGlobalPrefix('v1');
      routes.get('/search', (ctx) => { captured = ctx; });

      await routes.executeRequestCycle('/v1/search?q=potato', 'GET', null, {});

      expect(captured?.queries).toEqual({ q: 'potato' });
    });

    it('should extract multiple query params and pass them as queries', async () => {
      let captured: HandlerContext | undefined;
      routes.registerGlobalPrefix('v1');
      routes.get('/search', (ctx) => { captured = ctx; });

      await routes.executeRequestCycle('/v1/search?q=potato&page=2', 'GET', null, {});

      expect(captured?.queries).toEqual({ q: 'potato', page: '2' });
    });

    it('should have null queries when no query string is present', async () => {
      let captured: HandlerContext | undefined;
      routes.registerGlobalPrefix('v1');
      routes.get('/search', (ctx) => { captured = ctx; });

      await routes.executeRequestCycle('/v1/search', 'GET', null, {});

      expect(captured?.queries).toBeNull();
    });

    it('should extract both route params and query strings simultaneously', async () => {
      let captured: HandlerContext | undefined;
      routes.registerGlobalPrefix('v1');
      routes.get('/users/:id', (ctx) => { captured = ctx; });

      await routes.executeRequestCycle('/v1/users/7?active=true', 'GET', null, {});

      expect(captured?.params).toEqual({ id: '7' });
      expect(captured?.queries).toEqual({ active: 'true' });
    });
  });

  describe('error handling', () => {
    it('should throw RouteNotFoundException for an unregistered path', async () => {
      await expect(
        routes.executeRequestCycle('/nope', 'GET', null, {})
      ).rejects.toBeInstanceOf(RouteNotFoundException);
    });

    it('should throw RouteNotFoundException for a registered path with a different method', async () => {
      routes.registerGlobalPrefix('v1');
      routes.get('/only-get', (ctx) => {});

      await expect(
        routes.executeRequestCycle('/v1/only-get', 'POST', null, {})
      ).rejects.toBeInstanceOf(RouteNotFoundException);
    });

    it('RouteNotFoundException should carry a 404 status', async () => {
      let error: Error | undefined;
      try {
        await routes.executeRequestCycle('/missing', 'GET', null, {});
      } catch (e) {
        error = e as Error;
      }

      expect(error).toBeInstanceOf(RouteNotFoundException);
      expect((error as RouteNotFoundException).status).toBe(404);
    });
  });

  describe('method isolation', () => {
    it('GET route should not respond to a POST request on the same path', async () => {
      routes.registerGlobalPrefix('v1');
      routes.get('/resource', (ctx) => {});

      await expect(
        routes.executeRequestCycle('/v1/resource', 'POST', null, {})
      ).rejects.toBeInstanceOf(RouteNotFoundException);
    });

    it('POST route should not respond to a GET request on the same path', async () => {
      routes.registerGlobalPrefix('v1');
      routes.post('/resource', (ctx) => {});

      await expect(
        routes.executeRequestCycle('/v1/resource', 'GET', null, {})
      ).rejects.toBeInstanceOf(RouteNotFoundException);
    });

    it('each HTTP method resolves to its own independent handler', async () => {
      const log: string[] = [];
      routes.registerGlobalPrefix('v1');
      routes.get('/resource', () => log.push('GET'));
      routes.post('/resource', () => log.push('POST'));
      routes.put('/resource', () => log.push('PUT'));

      await routes.executeRequestCycle('/v1/resource', 'GET', null, {});
      await routes.executeRequestCycle('/v1/resource', 'POST', null, {});
      await routes.executeRequestCycle('/v1/resource', 'PUT', null, {});

      expect(log).toEqual(['GET', 'POST', 'PUT']);
    });
  });

  describe('registerGlobalPrefix', () => {
    it('should prepend the prefix (without leading slash) to routes registered after it is set', async () => {
      const received: HandlerContext[] = [];
      routes.registerGlobalPrefix('api/v1');
      routes.get('/users', (ctx) => received.push(ctx));

      await routes.executeRequestCycle('/api/v1/users', 'GET', null, {});

      expect(received).toHaveLength(1);
    });

    it('should prepend a leading slash automatically when prefix has none', async () => {
      const received: HandlerContext[] = [];
      routes.registerGlobalPrefix('v2');
      routes.get('/items', (ctx) => received.push(ctx));

      await routes.executeRequestCycle('/v2/items', 'GET', null, {});

      expect(received).toHaveLength(1);
    });

    it('should accept a prefix that already starts with a leading slash', async () => {
      const received: HandlerContext[] = [];
      routes.registerGlobalPrefix('/api');
      routes.get('/items', (ctx) => received.push(ctx));

      await routes.executeRequestCycle('/api/items', 'GET', null, {});

      expect(received).toHaveLength(1);
    });

    it('prefixed route should not match the original unprefixed path', async () => {
      routes.registerGlobalPrefix('api/v1');
      routes.get('/users', (ctx) => {});

      await expect(
        routes.executeRequestCycle('/users', 'GET', null, {})
      ).rejects.toBeInstanceOf(RouteNotFoundException);
    });

    it('should silently ignore a falsy prefix and leave #globalPrefix unchanged', async () => {
      const received: HandlerContext[] = [];
      routes.registerGlobalPrefix('v1');
      routes.registerGlobalPrefix('');
      routes.get('/items', (ctx) => {});
      routes.get('/check', (ctx) => received.push(ctx));
      await routes.executeRequestCycle('/v1/check', 'GET', null, {});

      expect(received).toHaveLength(1);
    });

    it('should match a route created without registerGlobalPrefix using the direct path', async () => {
      const received: HandlerContext[] = [];
      routes.get('/users', (ctx) => received.push(ctx));

      await routes.executeRequestCycle('/users', 'GET', null, {});
      expect(received).toHaveLength(1);
    });
  });

  describe('type contracts', () => {
    it('handler should receive HandlerContext with correct types', async () => {
      let captured: HandlerContext | undefined;
      routes.registerGlobalPrefix('v1');
      routes.get('/type-check', (ctx) => { captured = ctx; });

      await routes.executeRequestCycle('/v1/type-check', 'GET', null, {});

      expect(captured).toBeDefined();
      expect(typeof captured?.body).toBe('object');
      expect(typeof captured?.params).toBe('object');
      expect(typeof captured?.headers).toBe('object');
      expect(captured?.queries === null || typeof captured?.queries === 'object').toBe(true);
    });

    it('registerGlobalPrefix should accept string parameter', () => {
      routes.registerGlobalPrefix('api/v1');
      expect(routes.getRoutes()).toBeDefined();
    });

    it('getRoutes should return Route array', () => {
      const routes_list = routes.getRoutes();
      expect(Array.isArray(routes_list)).toBe(true);
    });
  });

  describe('registerRoutes', () => {
    it('should allow registering routes externally', async () => {
      const received: HandlerContext[] = [];
      const routes2 = new Routes();
      routes2.registerGlobalPrefix('api');

      const handler: RouteHandler = (ctx) => received.push(ctx);
      routes2.registerRoutes([{
        method: 'GET',
        originalSufix: '/api/test',
        sufix: buildRoutePath('/api/test'),
        params: null,
        queries: null,
        requestCycle: new RequestCycle([handler]),
      }]);

      await routes2.executeRequestCycle('/api/test', 'GET', null, {});
      expect(received).toHaveLength(1);
    });
  });
});
