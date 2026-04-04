import { describe, it, expect, beforeEach } from 'vitest';
import { Routes } from '../Routes.mjs';
import { RouteNotFoundException } from '../errors/RouteNotFoundException.mjs';

// All tests that exercise correct route resolution must call
// routes.registerGlobalPrefix(...) before registering routes, because
// #globalPrefix is initialised as `undefined`. Without a prefix, the stored
// path becomes "undefined/<sufix>" (see latent-bug test at the bottom).

describe('Routes', () => {
  let routes;

  beforeEach(() => {
    routes = new Routes();
  });

  // ---------------------------------------------------------------------------
  // Route registration — all HTTP methods
  // ---------------------------------------------------------------------------
  describe('route registration', () => {
    it('should register and match a GET route', async () => {
      // Arrange
      const received = [];
      routes.registerGlobalPrefix('v1');
      routes.get('/ping', (ctx) => received.push(ctx));

      // Act
      await routes.executeRequestCycle('/v1/ping', 'GET', null, {});

      // Assert
      expect(received).toHaveLength(1);
    });

    it('should register and match a POST route', async () => {
      // Arrange
      const received = [];
      routes.registerGlobalPrefix('v1');
      routes.post('/ping', (ctx) => received.push(ctx));

      // Act
      await routes.executeRequestCycle('/v1/ping', 'POST', null, {});

      // Assert
      expect(received).toHaveLength(1);
    });

    it('should register and match a PATCH route', async () => {
      // Arrange
      const received = [];
      routes.registerGlobalPrefix('v1');
      routes.patch('/ping', (ctx) => received.push(ctx));

      // Act
      await routes.executeRequestCycle('/v1/ping', 'PATCH', null, {});

      // Assert
      expect(received).toHaveLength(1);
    });

    it('should register and match a PUT route', async () => {
      // Arrange
      const received = [];
      routes.registerGlobalPrefix('v1');
      routes.put('/ping', (ctx) => received.push(ctx));

      // Act
      await routes.executeRequestCycle('/v1/ping', 'PUT', null, {});

      // Assert
      expect(received).toHaveLength(1);
    });

    it('should register and match a DELETE route', async () => {
      // Arrange
      const received = [];
      routes.registerGlobalPrefix('v1');
      routes.delete('/ping', (ctx) => received.push(ctx));

      // Act
      await routes.executeRequestCycle('/v1/ping', 'DELETE', null, {});

      // Assert
      expect(received).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Route matching — correct handler called
  // ---------------------------------------------------------------------------
  describe('route matching', () => {
    it('should call the correct handler for an exact GET path match', async () => {
      // Arrange
      const received = [];
      routes.registerGlobalPrefix('v1');
      routes.get('/hello', (ctx) => received.push('hello'));
      routes.get('/world', (ctx) => received.push('world'));

      // Act
      await routes.executeRequestCycle('/v1/hello', 'GET', null, {});

      // Assert
      expect(received).toEqual(['hello']);
    });

    it('should execute all handlers registered for the same route in order', async () => {
      // Arrange
      const order = [];
      routes.registerGlobalPrefix('v1');
      routes.get('/chain',
        (ctx) => order.push(1),
        (ctx) => order.push(2),
        (ctx) => order.push(3),
      );

      // Act
      await routes.executeRequestCycle('/v1/chain', 'GET', null, {});

      // Assert
      expect(order).toEqual([1, 2, 3]);
    });

    it('should pass body and headers into the context object', async () => {
      // Arrange
      let captured;
      const body = { name: 'potato' };
      const headers = { 'content-type': 'application/json' };
      routes.registerGlobalPrefix('v1');
      routes.post('/data', (ctx) => { captured = ctx; });

      // Act
      await routes.executeRequestCycle('/v1/data', 'POST', body, headers);

      // Assert
      expect(captured.body).toBe(body);
      expect(captured.headers).toBe(headers);
    });

    it('should pass a frozen context object to the handler', async () => {
      // Arrange
      let captured;
      routes.registerGlobalPrefix('v1');
      routes.get('/frozen', (ctx) => { captured = ctx; });

      // Act
      await routes.executeRequestCycle('/v1/frozen', 'GET', null, {});

      // Assert
      expect(Object.isFrozen(captured)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Route params
  // ---------------------------------------------------------------------------
  describe('route params', () => {
    it('should pass extracted :id param in the context params object', async () => {
      // Arrange
      let captured;
      routes.registerGlobalPrefix('v1');
      routes.get('/users/:id', (ctx) => { captured = ctx; });

      // Act
      await routes.executeRequestCycle('/v1/users/42', 'GET', null, {});

      // Assert
      expect(captured.params).toEqual({ id: '42' });
    });

    it('should pass multiple named params in the context params object', async () => {
      // Arrange
      let captured;
      routes.registerGlobalPrefix('v1');
      routes.get('/users/:userId/posts/:postId', (ctx) => { captured = ctx; });

      // Act
      await routes.executeRequestCycle('/v1/users/10/posts/99', 'GET', null, {});

      // Assert
      expect(captured.params).toEqual({ userId: '10', postId: '99' });
    });

    it('should have an empty params object for a static route (no named params)', async () => {
      // Arrange
      let captured;
      routes.registerGlobalPrefix('v1');
      routes.get('/static', (ctx) => { captured = ctx; });

      // Act
      await routes.executeRequestCycle('/v1/static', 'GET', null, {});

      // Assert
      // getRouteParams strips the "query" key and returns all other named groups;
      // a static route has no named groups, so params is an empty object.
      expect(captured.params).toEqual({});
    });
  });

  // ---------------------------------------------------------------------------
  // Query strings
  // ---------------------------------------------------------------------------
  describe('query strings', () => {
    it('should extract a single query param and pass it as queries', async () => {
      // Arrange
      let captured;
      routes.registerGlobalPrefix('v1');
      routes.get('/search', (ctx) => { captured = ctx; });

      // Act
      await routes.executeRequestCycle('/v1/search?q=potato', 'GET', null, {});

      // Assert
      expect(captured.queries).toEqual({ q: 'potato' });
    });

    it('should extract multiple query params and pass them as queries', async () => {
      // Arrange
      let captured;
      routes.registerGlobalPrefix('v1');
      routes.get('/search', (ctx) => { captured = ctx; });

      // Act
      await routes.executeRequestCycle('/v1/search?q=potato&page=2', 'GET', null, {});

      // Assert
      expect(captured.queries).toEqual({ q: 'potato', page: '2' });
    });

    it('should have null queries when no query string is present', async () => {
      // Arrange
      let captured;
      routes.registerGlobalPrefix('v1');
      routes.get('/search', (ctx) => { captured = ctx; });

      // Act
      await routes.executeRequestCycle('/v1/search', 'GET', null, {});

      // Assert
      expect(captured.queries).toBeNull();
    });

    it('should extract both route params and query strings simultaneously', async () => {
      // Arrange
      let captured;
      routes.registerGlobalPrefix('v1');
      routes.get('/users/:id', (ctx) => { captured = ctx; });

      // Act
      await routes.executeRequestCycle('/v1/users/7?active=true', 'GET', null, {});

      // Assert
      expect(captured.params).toEqual({ id: '7' });
      expect(captured.queries).toEqual({ active: 'true' });
    });
  });

  // ---------------------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------------------
  describe('error handling', () => {
    it('should throw RouteNotFoundException for an unregistered path', async () => {
      // Arrange — no routes registered

      // Act / Assert
      await expect(
        routes.executeRequestCycle('/nope', 'GET', null, {})
      ).rejects.toBeInstanceOf(RouteNotFoundException);
    });

    it('should throw RouteNotFoundException for a registered path with a different method', async () => {
      // Arrange
      routes.registerGlobalPrefix('v1');
      routes.get('/only-get', (ctx) => {});

      // Act / Assert
      await expect(
        routes.executeRequestCycle('/v1/only-get', 'POST', null, {})
      ).rejects.toBeInstanceOf(RouteNotFoundException);
    });

    it('RouteNotFoundException should carry a 404 status', async () => {
      // Arrange / Act
      let error;
      try {
        await routes.executeRequestCycle('/missing', 'GET', null, {});
      } catch (e) {
        error = e;
      }

      // Assert
      expect(error).toBeInstanceOf(RouteNotFoundException);
      expect(error.status).toBe(404);
    });
  });

  // ---------------------------------------------------------------------------
  // Method isolation
  // ---------------------------------------------------------------------------
  describe('method isolation', () => {
    it('GET route should not respond to a POST request on the same path', async () => {
      // Arrange
      routes.registerGlobalPrefix('v1');
      routes.get('/resource', (ctx) => {});

      // Act / Assert
      await expect(
        routes.executeRequestCycle('/v1/resource', 'POST', null, {})
      ).rejects.toBeInstanceOf(RouteNotFoundException);
    });

    it('POST route should not respond to a GET request on the same path', async () => {
      // Arrange
      routes.registerGlobalPrefix('v1');
      routes.post('/resource', (ctx) => {});

      // Act / Assert
      await expect(
        routes.executeRequestCycle('/v1/resource', 'GET', null, {})
      ).rejects.toBeInstanceOf(RouteNotFoundException);
    });

    it('each HTTP method resolves to its own independent handler', async () => {
      // Arrange
      const log = [];
      routes.registerGlobalPrefix('v1');
      routes.get('/resource', () => log.push('GET'));
      routes.post('/resource', () => log.push('POST'));
      routes.put('/resource', () => log.push('PUT'));

      // Act
      await routes.executeRequestCycle('/v1/resource', 'GET', null, {});
      await routes.executeRequestCycle('/v1/resource', 'POST', null, {});
      await routes.executeRequestCycle('/v1/resource', 'PUT', null, {});

      // Assert
      expect(log).toEqual(['GET', 'POST', 'PUT']);
    });
  });

  // ---------------------------------------------------------------------------
  // Global prefix — happy path
  // ---------------------------------------------------------------------------
  describe('registerGlobalPrefix', () => {
    it('should prepend the prefix (without leading slash) to routes registered after it is set', async () => {
      // Arrange
      const received = [];
      routes.registerGlobalPrefix('api/v1');
      routes.get('/users', (ctx) => received.push(ctx));

      // Act
      await routes.executeRequestCycle('/api/v1/users', 'GET', null, {});

      // Assert
      expect(received).toHaveLength(1);
    });

    it('should prepend a leading slash automatically when prefix has none', async () => {
      // Arrange
      const received = [];
      routes.registerGlobalPrefix('v2');
      routes.get('/items', (ctx) => received.push(ctx));

      // Act
      await routes.executeRequestCycle('/v2/items', 'GET', null, {});

      // Assert
      expect(received).toHaveLength(1);
    });

    it('should accept a prefix that already starts with a leading slash', async () => {
      // Arrange
      const received = [];
      routes.registerGlobalPrefix('/api');
      routes.get('/items', (ctx) => received.push(ctx));

      // Act
      await routes.executeRequestCycle('/api/items', 'GET', null, {});

      // Assert
      expect(received).toHaveLength(1);
    });

    it('prefixed route should not match the original unprefixed path', async () => {
      // Arrange
      routes.registerGlobalPrefix('api/v1');
      routes.get('/users', (ctx) => {});

      // Act / Assert
      await expect(
        routes.executeRequestCycle('/users', 'GET', null, {})
      ).rejects.toBeInstanceOf(RouteNotFoundException);
    });

    it('should silently ignore a falsy prefix and leave #globalPrefix unchanged', async () => {
      // Arrange — calling with empty string does nothing
      routes.registerGlobalPrefix('v1');
      routes.registerGlobalPrefix('');   // should be ignored
      routes.get('/items', (ctx) => {});

      // The prefix is still 'v1', so '/v1/items' should resolve
      const received = [];
      routes.get('/check', (ctx) => received.push(ctx));
      await routes.executeRequestCycle('/v1/check', 'GET', null, {});

      expect(received).toHaveLength(1);
    });

    // -------------------------------------------------------------------------
    // Latent bug documentation
    // -------------------------------------------------------------------------
    it('documents latent bug: route created without any prefix produces an unmatchable path', async () => {
      // Arrange — new Routes() instance, registerGlobalPrefix never called.
      // #globalPrefix is `undefined` (JS undefined, not the string).
      // In #createRoute: sufix starts as "/users" (leading slash added), then
      //   sufix = this.#globalPrefix + sufix
      //         = undefined + "/users"
      //         = "undefined/users"   ← JS string coercion, no leading slash
      // buildRoutePath produces /^undefined\/users...$/
      // No valid HTTP path (which always starts with "/") can ever satisfy that regex.
      const received = [];
      routes.get('/users', (ctx) => received.push(ctx));

      // The intended path "/users" throws because the stored regex is wrong.
      await expect(
        routes.executeRequestCycle('/users', 'GET', null, {})
      ).rejects.toBeInstanceOf(RouteNotFoundException);

      // Even "/undefined/users" throws — the stored regex has no leading slash.
      await expect(
        routes.executeRequestCycle('/undefined/users', 'GET', null, {})
      ).rejects.toBeInstanceOf(RouteNotFoundException);

      // Only the pathological non-slash string "undefined/users" matches,
      // which is never a real HTTP request path — confirming the route is dead.
      await routes.executeRequestCycle('undefined/users', 'GET', null, {});
      expect(received).toHaveLength(1);
    });
  });
});
