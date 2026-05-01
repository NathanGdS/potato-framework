import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SweetPotato } from '../../src/SweetPotato.ts';

function rawGet(port: number, path: string, timeoutMs = 500): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout after ${timeoutMs}ms: GET ${path}`)), timeoutMs);
    const req = http.request(
      { hostname: 'localhost', port, path, method: 'GET', agent: new http.Agent() },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          clearTimeout(timer);
          try { resolve({ status: res.statusCode!, body: JSON.parse(data) }); }
          catch (e) { reject(e); }
        });
      },
    );
    req.on('error', (e) => { clearTimeout(timer); reject(e); });
    req.end();
  });
}

interface TestServer {
  app: SweetPotato;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  url: (path: string) => string;
}

function createTestServer(): TestServer {
  const app = new SweetPotato();
  app.registerGlobalPrefix('t');

  let serverHandle: http.Server | null = null;
  const openSockets = new Set<import('node:net').Socket>();

  const start = (): Promise<void> =>
    new Promise((resolve) => {
      const originalCreateServer = http.createServer;

      http.createServer = ((handler: (req: IncomingMessage, res: ServerResponse) => void) => {
        const server = originalCreateServer(handler);
        serverHandle = server;
        return server;
      }) as typeof http.createServer;

      app.listen(0);

      http.createServer = originalCreateServer;

      serverHandle.on('connection', (socket) => {
        openSockets.add(socket);
        socket.once('close', () => openSockets.delete(socket));
      });

      serverHandle.once('listening', () => resolve());
    });

  const stop = (): Promise<void> =>
    new Promise((resolve, reject) => {
      if (!serverHandle) {
        resolve();
        return;
      }
      serverHandle.close((err) => {
        if (err) reject(err);
        else resolve();
      });
      for (const socket of openSockets) {
        socket.destroy();
      }
    });

  const url = (path: string): string => {
    const port = (serverHandle?.address() as { port: number }).port;
    return `http://localhost:${port}/t${path}`;
  };

  return { app, start, stop, url };
}

describe('SweetPotato — integration', () => {
  let server: TestServer;

  beforeEach(async () => {
    server = createTestServer();
    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  describe('GET /route', () => {
    it('should return 200 and the correct JSON body', async () => {
      server.app.get('/hello', (_ctx) => {
        server.app.finishRequest(200, { greeting: 'hello' });
      });

      const res = await fetch(server.url('/hello'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ greeting: 'hello' });
    });
  });

  describe('POST /route with JSON body', () => {
    it('should return 200 and handler should receive the parsed body', async () => {
      let capturedBody: unknown;
      server.app.post('/echo', (ctx) => {
        capturedBody = ctx.body;
        server.app.finishRequest(200, { received: ctx.body });
      });

      const res = await fetch(server.url('/echo'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'potato' }),
      });
      const responseBody = await res.json();

      expect(res.status).toBe(200);
      expect(capturedBody).toEqual({ name: 'potato' });
      expect(responseBody).toEqual({ received: { name: 'potato' } });
    });
  });

  describe('GET /route-with-params/:id', () => {
    it('should pass params.id correctly to the handler', async () => {
      let capturedParams: Record<string, string> | null | undefined;
      server.app.get('/items/:id', (ctx) => {
        capturedParams = ctx.params;
        server.app.finishRequest(200, { id: ctx.params?.id });
      });

      const res = await fetch(server.url('/items/42'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(capturedParams).toEqual({ id: '42' });
      expect(body).toEqual({ id: '42' });
    });
  });

  describe('GET /route-with-query?name=foo', () => {
    it('should pass queries.name === "foo" to the handler', async () => {
      let capturedQueries: Record<string, string> | null | undefined;
      server.app.get('/search', (ctx) => {
        capturedQueries = ctx.queries;
        server.app.finishRequest(200, { name: ctx.queries?.name });
      });

      const res = await fetch(server.url('/search?name=foo'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(capturedQueries?.name).toBe('foo');
      expect(body).toEqual({ name: 'foo' });
    });
  });

  describe('GET /not-exists', () => {
    it('should return 404 and a { message } body', async () => {
      const res = await fetch(server.url('/not-exists'));
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body).toHaveProperty('message');
    });
  });

  describe('handler that throws', () => {
    it('should return 500 and a { message } body', async () => {
      server.app.get('/boom', (_ctx) => {
        throw new Error('intentional handler error');
      });

      const res = await fetch(server.url('/boom'));
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body).toHaveProperty('message');
    });
  });

  describe('finishRequest without status code', () => {
    it('should use 200 as the default status code', async () => {
      server.app.get('/default-status', (_ctx) => {
        server.app.finishRequest(undefined, { ok: true });
      });

      const res = await fetch(server.url('/default-status'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ ok: true });
    });
  });

  describe('concurrent request isolation', () => {
    it('each concurrent request should receive its own correct response', async () => {
      const port = new URL(server.url('/')).port;

      server.app.get('/slow', async (_ctx) => {
        await new Promise((r) => setTimeout(r, 50));
        server.app.finishRequest(200, { id: 'slow' });
      });
      server.app.get('/fast', (_ctx) => {
        server.app.finishRequest(200, { id: 'fast' });
      });

      const [slowRes, fastRes] = await Promise.all([
        rawGet(Number(port), '/t/slow', 500),
        rawGet(Number(port), '/t/fast', 500),
      ]);

      expect(slowRes.status).toBe(200);
      expect(fastRes.status).toBe(200);
      expect(slowRes.body).toEqual({ id: 'slow' });
      expect(fastRes.body).toEqual({ id: 'fast' });
    });
  });

  describe('multiple simultaneous requests', () => {
    it('should not crash the server with [ERR_HTTP_HEADERS_SENT] when requests overlap', async () => {
      server.app.get('/stable', (_ctx) => {
        server.app.finishRequest(200, { ok: true });
      });

      const responses = await Promise.all(
        Array.from({ length: 5 }, () => fetch(server.url('/stable')))
      );

      for (const res of responses) {
        expect(res.status).toBe(200);
      }
      const bodies = await Promise.all(responses.map((r) => r.json()));
      for (const body of bodies) {
        expect(body).toEqual({ ok: true });
      }
    });

    it('all async requests should complete successfully without state leaking between them', async () => {
      server.app.get('/async-overlap', async (_ctx) => {
        await new Promise((r) => setTimeout(r, 5));
        server.app.finishRequest(200, { ok: true });
      });

      const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
        Promise.race([
          promise,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), ms)
          ),
        ]);

      let completedCount = 0;
      const settled = await Promise.allSettled(
        Array.from({ length: 3 }, () =>
          withTimeout(fetch(server.url('/async-overlap')), 500)
        )
      );
      for (const result of settled) {
        if (result.status === 'fulfilled') completedCount++;
      }

      expect(completedCount).toBe(3);

      server.app.get('/alive-check', (_ctx) => {
        server.app.finishRequest(200, { alive: true });
      });
      const aliveRes = await fetch(server.url('/alive-check'));
      expect(aliveRes.status).toBe(200);
    });
  });
});
