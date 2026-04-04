import { describe, it, expect, beforeEach } from 'vitest';
import { Resource } from '../Resource.mjs';
import { RouteNotFoundException } from '../errors/RouteNotFoundException.mjs';

// Note: all tests that exercise correct route resolution call
// resource.registerGlobalPrefix(...) before registering routes.
// Without a prefix, #globalPrefix is `undefined` and the stored path becomes
// "undefined/<sufix>" — the same latent bug documented in Routes.test.mjs.

describe('Resource DSL', () => {
  let resource;

  beforeEach(() => {
    resource = new Resource();
    resource.registerGlobalPrefix('api');
  });

  // ---------------------------------------------------------------------------
  // resource() + defineHandler — basic registration
  // ---------------------------------------------------------------------------
  describe('defineHandler — route registration', () => {
    it('should register a GET /users route via defineHandler', async () => {
      // Arrange
      const called = [];
      resource.resource('users').defineHandler({ method: 'GET' }, (ctx) => called.push(ctx));

      // Act
      await resource.executeRequestCycle('/api/users', 'GET', null, {});

      // Assert
      expect(called).toHaveLength(1);
    });

    it('should register a POST /users route via defineHandler', async () => {
      // Arrange
      const called = [];
      resource.resource('users').defineHandler({ method: 'POST' }, (ctx) => called.push(ctx));

      // Act
      await resource.executeRequestCycle('/api/users', 'POST', null, {});

      // Assert
      expect(called).toHaveLength(1);
    });

    it('should register a PATCH /users route via defineHandler', async () => {
      // Arrange
      const called = [];
      resource.resource('users').defineHandler({ method: 'PATCH' }, (ctx) => called.push(ctx));

      // Act
      await resource.executeRequestCycle('/api/users', 'PATCH', null, {});

      // Assert
      expect(called).toHaveLength(1);
    });

    it('should register a PUT /users route via defineHandler', async () => {
      // Arrange
      const called = [];
      resource.resource('users').defineHandler({ method: 'PUT' }, (ctx) => called.push(ctx));

      // Act
      await resource.executeRequestCycle('/api/users', 'PUT', null, {});

      // Assert
      expect(called).toHaveLength(1);
    });

    it('should register a DELETE /users route via defineHandler', async () => {
      // Arrange
      const called = [];
      resource.resource('users').defineHandler({ method: 'DELETE' }, (ctx) => called.push(ctx));

      // Act
      await resource.executeRequestCycle('/api/users', 'DELETE', null, {});

      // Assert
      expect(called).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // sufix support — path extension via input.sufix
  // ---------------------------------------------------------------------------
  describe('defineHandler — sufix path extension', () => {
    it('should register GET /users/:id when sufix is ":id"', async () => {
      // Arrange
      let captured;
      resource
        .resource('users')
        .defineHandler({ method: 'GET', sufix: ':id' }, (ctx) => { captured = ctx; });

      // Act
      await resource.executeRequestCycle('/api/users/42', 'GET', null, {});

      // Assert
      expect(captured.params).toEqual({ id: '42' });
    });

    it('should register a route with a multi-segment sufix', async () => {
      // Arrange
      const called = [];
      resource
        .resource('users')
        .defineHandler({ method: 'GET', sufix: 'active' }, (ctx) => called.push(ctx));

      // Act
      await resource.executeRequestCycle('/api/users/active', 'GET', null, {});

      // Assert
      expect(called).toHaveLength(1);
    });

    it('base resource route (no sufix) should not match the suffixed path', async () => {
      // Arrange
      resource
        .resource('users')
        .defineHandler({ method: 'GET' }, (ctx) => {});

      // Act / Assert
      await expect(
        resource.executeRequestCycle('/api/users/42', 'GET', null, {})
      ).rejects.toBeInstanceOf(RouteNotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // Invalid method validation
  // ---------------------------------------------------------------------------
  describe('defineHandler — invalid method', () => {
    it('should throw Error("Invalid method") for an unsupported HTTP method', () => {
      // Arrange
      resource.resource('users');

      // Act + Assert
      expect(() =>
        resource.defineHandler({ method: 'BREW' }, () => {})
      ).toThrow('Invalid method');
    });

    it('should throw Error("Invalid method") for a lower-case valid method name', () => {
      // Arrange — method lookup is case-sensitive (HttpMethod keys are uppercase)
      resource.resource('users');

      // Act + Assert
      expect(() =>
        resource.defineHandler({ method: 'get' }, () => {})
      ).toThrow('Invalid method');
    });

    it('should throw Error("Invalid method") for an empty string method', () => {
      // Arrange
      resource.resource('users');

      // Act + Assert
      expect(() =>
        resource.defineHandler({ method: '' }, () => {})
      ).toThrow('Invalid method');
    });
  });

  // ---------------------------------------------------------------------------
  // Fluent chaining — multiple defineHandler calls on one resource()
  // ---------------------------------------------------------------------------
  describe('defineHandler — fluent chaining', () => {
    it('should register multiple routes via chained defineHandler calls', async () => {
      // Arrange
      const log = [];
      resource
        .resource('messages')
        .defineHandler({ method: 'GET' }, (ctx) => log.push('GET'))
        .defineHandler({ method: 'POST' }, (ctx) => log.push('POST'));

      // Act
      await resource.executeRequestCycle('/api/messages', 'GET', null, {});
      await resource.executeRequestCycle('/api/messages', 'POST', null, {});

      // Assert
      expect(log).toEqual(['GET', 'POST']);
    });

    it('should register both a base route and a param route via chaining', async () => {
      // Arrange
      const log = [];
      resource
        .resource('items')
        .defineHandler({ method: 'GET' }, (ctx) => log.push('list'))
        .defineHandler({ method: 'GET', sufix: ':id' }, (ctx) => log.push('detail'));

      // Act
      await resource.executeRequestCycle('/api/items', 'GET', null, {});
      await resource.executeRequestCycle('/api/items/99', 'GET', null, {});

      // Assert
      expect(log).toEqual(['list', 'detail']);
    });
  });

  // ---------------------------------------------------------------------------
  // defaultMiddlewares — appended to every defineHandler chain
  // ---------------------------------------------------------------------------
  describe('defaultMiddlewares', () => {
    it('should append defaultMiddlewares after the explicit handler', async () => {
      // Arrange
      const order = [];
      resource
        .resource('users')
        .defaultMiddlewares((ctx) => order.push('mw1'), (ctx) => order.push('mw2'))
        .defineHandler({ method: 'GET' }, (ctx) => order.push('handler'));

      // Act
      await resource.executeRequestCycle('/api/users', 'GET', null, {});

      // Assert
      // Resource.defineHandler builds: [...args (explicit), ...#defaultMiddlewares]
      // so the explicit handler runs first, then the middlewares.
      expect(order).toEqual(['handler', 'mw1', 'mw2']);
    });

    it('should apply defaultMiddlewares to every defineHandler registered after the call', async () => {
      // Arrange
      const mwCalls = [];
      resource
        .resource('products')
        .defaultMiddlewares((ctx) => mwCalls.push('mw'))
        .defineHandler({ method: 'GET' }, (ctx) => {})
        .defineHandler({ method: 'POST' }, (ctx) => {});

      // Act
      await resource.executeRequestCycle('/api/products', 'GET', null, {});
      await resource.executeRequestCycle('/api/products', 'POST', null, {});

      // Assert — middleware ran once per request cycle
      expect(mwCalls).toEqual(['mw', 'mw']);
    });
  });

  // ---------------------------------------------------------------------------
  // registerGlobalPrefix — prefix behaviour on Resource
  // ---------------------------------------------------------------------------
  describe('registerGlobalPrefix', () => {
    it('should make routes respond under /api/v1/<resource> when prefix is "api/v1"', async () => {
      // Arrange
      const r = new Resource();
      r.registerGlobalPrefix('api/v1');
      const called = [];
      r.resource('users').defineHandler({ method: 'GET' }, (ctx) => called.push(ctx));

      // Act
      await r.executeRequestCycle('/api/v1/users', 'GET', null, {});

      // Assert
      expect(called).toHaveLength(1);
    });

    it('should work the same when the prefix includes a leading slash', async () => {
      // Arrange
      const r = new Resource();
      r.registerGlobalPrefix('/api/v1');
      const called = [];
      r.resource('users').defineHandler({ method: 'GET' }, (ctx) => called.push(ctx));

      // Act
      await r.executeRequestCycle('/api/v1/users', 'GET', null, {});

      // Assert
      expect(called).toHaveLength(1);
    });

    it('"/api/v1" and "api/v1" prefixes should produce identical matching behaviour', async () => {
      // Arrange
      const withSlash = new Resource();
      withSlash.registerGlobalPrefix('/api/v1');
      const called1 = [];
      withSlash.resource('orders').defineHandler({ method: 'GET' }, (ctx) => called1.push(ctx));

      const withoutSlash = new Resource();
      withoutSlash.registerGlobalPrefix('api/v1');
      const called2 = [];
      withoutSlash.resource('orders').defineHandler({ method: 'GET' }, (ctx) => called2.push(ctx));

      // Act
      await withSlash.executeRequestCycle('/api/v1/orders', 'GET', null, {});
      await withoutSlash.executeRequestCycle('/api/v1/orders', 'GET', null, {});

      // Assert
      expect(called1).toHaveLength(1);
      expect(called2).toHaveLength(1);
    });

    it('prefixed resource route should not match the unprefixed path', async () => {
      // Arrange
      resource.resource('users').defineHandler({ method: 'GET' }, (ctx) => {});

      // Act / Assert
      await expect(
        resource.executeRequestCycle('/users', 'GET', null, {})
      ).rejects.toBeInstanceOf(RouteNotFoundException);
    });

    // -------------------------------------------------------------------------
    // Latent bug documentation
    // -------------------------------------------------------------------------
    it('documents latent bug: resource route created without registerGlobalPrefix produces an unmatchable path', async () => {
      // Arrange — fresh Resource instance, registerGlobalPrefix never called.
      // #globalPrefix is `undefined`; #createRoute concatenates:
      //   sufix = undefined + "/users" = "undefined/users"  (no leading slash)
      // buildRoutePath wraps this into /^undefined\/users...$/
      // No valid HTTP path (always starting with "/") can match this regex.
      const r = new Resource();
      const called = [];
      r.resource('users').defineHandler({ method: 'GET' }, (ctx) => called.push(ctx));

      // The intended path "/users" throws.
      await expect(
        r.executeRequestCycle('/users', 'GET', null, {})
      ).rejects.toBeInstanceOf(RouteNotFoundException);

      // Even "/undefined/users" throws — the stored regex has no leading slash.
      await expect(
        r.executeRequestCycle('/undefined/users', 'GET', null, {})
      ).rejects.toBeInstanceOf(RouteNotFoundException);

      // Only the pathological non-slash string "undefined/users" matches,
      // confirming the route is unreachable in any real HTTP request.
      await r.executeRequestCycle('undefined/users', 'GET', null, {});
      expect(called).toHaveLength(1);
    });
  });
});
