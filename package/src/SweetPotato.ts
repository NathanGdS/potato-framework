import { AsyncLocalStorage } from 'node:async_hooks';
import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import { Resource } from './Resource.js';
import { HttpStatusCode } from './constants/index.js';
import { RouteNotFoundException } from './errors/RouteNotFoundException.js';
import { LoggerInstance as log } from './utils/logger.js';

const DEFAULT_PORT = 8000;

interface RequestStore {
  req: IncomingMessage;
  res: ServerResponse;
}

const requestStore = new AsyncLocalStorage<RequestStore>();

export class SweetPotato extends Resource {
  private port: number = DEFAULT_PORT;
  private appName = 'App';

  constructor() {
    super();
    log().info('Starting a Sweet app for you', this.appName);
  }

  listen(port?: number): void {
    this.port = port ?? DEFAULT_PORT;
    http
      .createServer((req: IncomingMessage, res: ServerResponse) => {
        requestStore.run({ req, res }, async () => {
          await this.handleRoute(req);
          const store = requestStore.getStore()!;
          if (!store.res.writableEnded) {
            store.res.end();
          }
        });
      })
      .listen(this.port, () => {
        log().info(`${this.getRoutes().length} routes created`, this.appName);
        log().info(`App is running on port ${this.port}`, this.appName);
      });
  }

  private async defineBodyAttributes(req: IncomingMessage): Promise<unknown> {
    const buffers: Buffer[] = [];
    for await (const chunk of req) {
      buffers.push(chunk as Buffer);
    }
    return buffers.length ? JSON.parse(Buffer.concat(buffers).toString()) : null;
  }

  private async handleRoute(req: IncomingMessage): Promise<void> {
    const body = await this.defineBodyAttributes(req);
    const method = (req.method ?? 'GET').toUpperCase();
    const path = req.url ?? '/';
    const headers = req.headers;
    try {
      return await this.executeRequestCycle(path, method, body, headers);
    } catch (error) {
      if (error instanceof RouteNotFoundException) {
        return this.finishRequest(HttpStatusCode.NOT_FOUND, {
          message: (error as Error).message,
        });
      }
      return this.finishRequest(HttpStatusCode.INTERNAL_SERVER_ERROR, {
        message: (error as Error).message,
      });
    }
  }

  finishRequest(code: number | undefined, message: unknown): void {
    const store = requestStore.getStore();
    if (!store || store.res.writableEnded) return;
    const statusCode = code ?? HttpStatusCode.SUCCESS;
    store.res.writeHead(statusCode);
    store.res.write(JSON.stringify(message));
    store.res.end();
  }
}
