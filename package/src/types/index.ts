import type { IncomingHttpHeaders } from 'node:http';

export interface HandlerContext {
  body: unknown;
  params: Record<string, string> | null;
  headers: IncomingHttpHeaders;
  queries: Record<string, string> | null;
}

export type RouteHandler = (ctx: HandlerContext) => void | Promise<void>;
