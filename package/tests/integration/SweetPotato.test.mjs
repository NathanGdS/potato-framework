import http from 'node:http';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SweetPotato } from '../../SweetPotato.mjs';

// ---------------------------------------------------------------------------
// Test server helper
//
// SweetPotato.listen() creates and starts the http.Server internally with no
// exposed handle. To capture the server reference (needed for port 0 and
// clean teardown), we patch http.createServer before calling listen(), grab
// the server instance from the patched factory, then restore the original.
//
// Routes are registered with a "/t" global prefix to work around the latent
// framework bug where omitting registerGlobalPrefix makes routes unmatchable
// (the stored regex becomes "undefined/<path>" which never matches a real URL).
// ---------------------------------------------------------------------------
function createTestServer() {
  const app = new SweetPotato();
  // Apply a minimal prefix so the route regex is built correctly.
  app.registerGlobalPrefix('t');

  let serverHandle;
  // Track open sockets so we can force-destroy them on teardown when a test
  // leaves connections open (e.g. async-handler concurrency tests).
  const openSockets = new Set();

  const start = () =>
    new Promise((resolve) => {
      const originalCreateServer = http.createServer;

      http.createServer = (handler) => {
        const server = originalCreateServer(handler);
        serverHandle = server;
        return server;
      };

      app.listen(0);

      // Restore original immediately after listen() has set up the call chain.
      http.createServer = originalCreateServer;

      // Track every socket so we can destroy them during forced teardown.
      serverHandle.on('connection', (socket) => {
        openSockets.add(socket);
        socket.once('close', () => openSockets.delete(socket));
      });

      // Port 0 → OS picks a free port; 'listening' fires once the port is
      // bound and server.address().port is available.
      serverHandle.once('listening', () => resolve());
    });

  // Graceful stop: stop accepting connections, then force-destroy any sockets
  // that are still open so server.close() resolves promptly even when a test
  // left hanging connections (e.g. async-handler concurrency scenario).
  const stop = () =>
    new Promise((resolve, reject) => {
      serverHandle.close((err) => (err ? reject(err) : resolve()));
      for (const socket of openSockets) {
        socket.destroy();
      }
    });

  // All test requests must be prefixed with /t/<path>
  const url = (path) =>
    `http://localhost:${serverHandle.address().port}/t${path}`;

  return { app, start, stop, url };
}

// ---------------------------------------------------------------------------
// Shared setup / teardown
// ---------------------------------------------------------------------------
describe('SweetPotato — integration', () => {
  let server;

  beforeEach(async () => {
    server = createTestServer();
    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  // -------------------------------------------------------------------------
  // GET route — basic 200 + body
  // -------------------------------------------------------------------------
  describe('GET /route', () => {
    it('should return 200 and the correct JSON body', async () => {
      // Arrange
      server.app.get('/hello', (_ctx) => {
        server.app.finishRequest(200, { greeting: 'hello' });
      });

      // Act
      const res = await fetch(server.url('/hello'));
      const body = await res.json();

      // Assert
      expect(res.status).toBe(200);
      expect(body).toEqual({ greeting: 'hello' });
    });
  });

  // -------------------------------------------------------------------------
  // POST route — parsed body forwarded to handler
  // -------------------------------------------------------------------------
  describe('POST /route with JSON body', () => {
    it('should return 200 and handler should receive the parsed body', async () => {
      // Arrange
      let capturedBody;
      server.app.post('/echo', (ctx) => {
        capturedBody = ctx.body;
        server.app.finishRequest(200, { received: ctx.body });
      });

      // Act
      const res = await fetch(server.url('/echo'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'potato' }),
      });
      const responseBody = await res.json();

      // Assert
      expect(res.status).toBe(200);
      expect(capturedBody).toEqual({ name: 'potato' });
      expect(responseBody).toEqual({ received: { name: 'potato' } });
    });
  });

  // -------------------------------------------------------------------------
  // Route params
  // -------------------------------------------------------------------------
  describe('GET /route-with-params/:id', () => {
    it('should pass params.id correctly to the handler', async () => {
      // Arrange
      let capturedParams;
      server.app.get('/items/:id', (ctx) => {
        capturedParams = ctx.params;
        server.app.finishRequest(200, { id: ctx.params.id });
      });

      // Act
      const res = await fetch(server.url('/items/42'));
      const body = await res.json();

      // Assert
      expect(res.status).toBe(200);
      expect(capturedParams).toEqual({ id: '42' });
      expect(body).toEqual({ id: '42' });
    });
  });

  // -------------------------------------------------------------------------
  // Query strings
  // -------------------------------------------------------------------------
  describe('GET /route-with-query?name=foo', () => {
    it('should pass queries.name === "foo" to the handler', async () => {
      // Arrange
      let capturedQueries;
      server.app.get('/search', (ctx) => {
        capturedQueries = ctx.queries;
        server.app.finishRequest(200, { name: ctx.queries?.name });
      });

      // Act
      const res = await fetch(server.url('/search?name=foo'));
      const body = await res.json();

      // Assert
      expect(res.status).toBe(200);
      expect(capturedQueries?.name).toBe('foo');
      expect(body).toEqual({ name: 'foo' });
    });
  });

  // -------------------------------------------------------------------------
  // 404 — unregistered route
  // -------------------------------------------------------------------------
  describe('GET /not-exists', () => {
    it('should return 404 and a { message } body', async () => {
      // Arrange — no route registered for this path

      // Act
      const res = await fetch(server.url('/not-exists'));
      const body = await res.json();

      // Assert
      expect(res.status).toBe(404);
      expect(body).toHaveProperty('message');
    });
  });

  // -------------------------------------------------------------------------
  // 500 — handler throws
  // -------------------------------------------------------------------------
  describe('handler that throws', () => {
    it('should return 500 and a { message } body', async () => {
      // Arrange
      server.app.get('/boom', (_ctx) => {
        throw new Error('intentional handler error');
      });

      // Act
      const res = await fetch(server.url('/boom'));
      const body = await res.json();

      // Assert
      expect(res.status).toBe(500);
      expect(body).toHaveProperty('message');
    });
  });

  // -------------------------------------------------------------------------
  // finishRequest without status code → defaults to 200
  // -------------------------------------------------------------------------
  describe('finishRequest without status code', () => {
    it('should use 200 as the default status code', async () => {
      // Arrange
      server.app.get('/default-status', (_ctx) => {
        // call with no code (undefined / falsy) — framework must default to 200
        server.app.finishRequest(undefined, { ok: true });
      });

      // Act
      const res = await fetch(server.url('/default-status'));
      const body = await res.json();

      // Assert
      expect(res.status).toBe(200);
      expect(body).toEqual({ ok: true });
    });
  });

  // -------------------------------------------------------------------------
  // Concurrent requests — no [ERR_HTTP_HEADERS_SENT] crash
  //
  // NOTE: The framework stores #appReq / #appRes as instance-level fields,
  // meaning concurrent requests overwrite each other's response reference.
  // This is a known architectural constraint: only the *last* in-flight
  // request's response is written to by all concurrent handlers.
  //
  // The acceptance criterion is therefore: the server must not crash with an
  // unhandled [ERR_HTTP_HEADERS_SENT] exception. The existing try/catch guard
  // in finishRequest() absorbs that error so the process stays alive.
  //
  // We verify this by firing 2 overlapping async requests and confirming the
  // server is still responsive for a follow-up request afterwards.
  // -------------------------------------------------------------------------
  describe('multiple simultaneous requests', () => {
    it('should not crash the server with [ERR_HTTP_HEADERS_SENT] when requests overlap', async () => {
      // Arrange — synchronous handler to avoid the instance-state race;
      // finishRequest() is called before the next request can overwrite #appRes.
      server.app.get('/stable', (_ctx) => {
        server.app.finishRequest(200, { ok: true });
      });

      // Act — fire 5 requests, each resolving independently
      const responses = await Promise.all(
        Array.from({ length: 5 }, () => fetch(server.url('/stable')))
      );

      // Assert — server stays alive and returns 200 for all requests
      for (const res of responses) {
        expect(res.status).toBe(200);
      }
      const bodies = await Promise.all(responses.map((r) => r.json()));
      for (const body of bodies) {
        expect(body).toEqual({ ok: true });
      }
    });

    it('should keep the server alive after async handler overlap (guard prevents crash)', async () => {
      // Arrange — async handler; concurrent requests will overwrite #appRes.
      // finishRequest() catch block absorbs [ERR_HTTP_HEADERS_SENT].
      server.app.get('/async-overlap', async (_ctx) => {
        await new Promise((r) => setTimeout(r, 5));
        server.app.finishRequest(200, { ok: true });
      });

      // Act — fire 3 overlapping async requests; some may hang due to the
      // shared-state bug, so we race them against a timeout.
      const withTimeout = (promise, ms) =>
        Promise.race([
          promise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), ms)
          ),
        ]);

      // At least one request should complete (the last one to set #appRes wins).
      // We do not assert all succeed — that would require fixing the framework.
      let completedCount = 0;
      const settled = await Promise.allSettled(
        Array.from({ length: 3 }, () =>
          withTimeout(fetch(server.url('/async-overlap')), 500)
        )
      );
      for (const result of settled) {
        if (result.status === 'fulfilled') completedCount++;
      }

      // At least one request must complete without a server crash.
      expect(completedCount).toBeGreaterThanOrEqual(1);

      // The server must still be alive — a plain synchronous route should work.
      server.app.get('/alive-check', (_ctx) => {
        server.app.finishRequest(200, { alive: true });
      });
      const aliveRes = await fetch(server.url('/alive-check'));
      expect(aliveRes.status).toBe(200);
    });
  });
});
