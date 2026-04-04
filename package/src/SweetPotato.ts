import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import { Resource } from './Resource.js';
import { HttpStatusCode } from './constants/index.js';
import { RouteNotFoundException } from './errors/RouteNotFoundException.js';
import { LoggerInstance as log } from './utils/logger.js';

const DEFAULT_PORT = 8000;

export class SweetPotato extends Resource {
  private appReq: IncomingMessage | null = null;
  private appRes: ServerResponse | null = null;
  private method: string = '';
  private path: string = '';
  private dataBody: unknown = null;
  private port: number = DEFAULT_PORT;
  private headers: IncomingMessage['headers'] = {};
  private appName = 'App';

  constructor() {
    super();
    log().info('Starting a Sweet app for you', this.appName);
  }

  listen(port?: number): void {
    this.port = port ?? DEFAULT_PORT;
    http
      .createServer(async (req: IncomingMessage, res: ServerResponse) => {
        this.defineGlobalAttributes(req, res);
        await this.defineBodyAttributes();
        await this.handleRoute();

        if (!this.appRes!.writableEnded) {
          this.appRes!.end();
        }
      })
      .listen(this.port, () => {
        log().info(`${this.getRoutes().length} routes created`, this.appName);
        log().info(`App is running on port ${this.port}`, this.appName);
      });
  }

  private defineGlobalAttributes(req: IncomingMessage, res: ServerResponse): void {
    this.appReq = req;
    this.appRes = res;
    this.method = (req.method ?? 'GET').toUpperCase();
    this.path = req.url ?? '/';
    this.headers = req.headers;
  }

  private async defineBodyAttributes(): Promise<void> {
    const buffers: Buffer[] = [];

    for await (const chunk of this.appReq!) {
      buffers.push(chunk as Buffer);
    }

    if (buffers.length) {
      this.dataBody = JSON.parse(Buffer.concat(buffers).toString());
    }
  }

  private async handleRoute(): Promise<void> {
    try {
      return await this.executeRequestCycle(
        this.path,
        this.method,
        this.dataBody,
        this.headers
      );
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
    try {
      const statusCode = code ?? HttpStatusCode.SUCCESS;
      this.appRes!.writeHead(statusCode);
      this.appRes!.write(JSON.stringify(message));
      this.appRes!.end();
    } catch {
      this.appRes!.write(JSON.stringify(message));
      this.appRes!.end();
    }
  }
}
