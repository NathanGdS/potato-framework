# SweetPotato - Main Server Class

## Overview

`SweetPotato` is the main class of the framework. It extends `Resource`, creates the native Node.js HTTP server, and manages the complete lifecycle of each request.

```typescript
export class SweetPotato extends Resource {
  private appReq: IncomingMessage | null = null;
  private appRes: ServerResponse | null = null;
  private method: string = '';
  private path: string = '';
  private dataBody: unknown = null;
  private port: number = DEFAULT_PORT;
  private headers: IncomingMessage['headers'] = {};
  private private appName = 'App';
}
```

## Constructor

```typescript
constructor() {
  super();
  log().info('Starting a Sweet app for you', this.appName);
}
```

- Calls `super()` to initialize `Resource` and `Routes`
- Registers initial log with application name

## listen(port?: number)

**Responsibility**: Start the HTTP server and listen for requests

```typescript
listen(port?: number): void {
  this.port = port ?? DEFAULT_PORT;  // Default 8000
  
  http
    .createServer(async (req: IncomingMessage, res: ServerResponse) => {
      this.defineGlobalAttributes(req, res);   // 1. Capture data
      await this.defineBodyAttributes();        // 2. Read body
      await this.handleRoute();                 // 3. Find route

      if (!this.appRes!.writableEnded) {
        this.appRes!.end();                     // 4. Finalize if needed
      }
    })
    .listen(this.port, () => {
      log().info(`${this.getRoutes().length} routes created`, this.appName);
      log().info(`App is running on port ${this.port}`, this.appName);
    });
}
```

### Flow in createServer

1. **defineGlobalAttributes(req, res)**
   - Captures `req` and `res` for later use
   - Captures `method`, `url`, `headers`

2. **defineBodyAttributes()**
   - Reads all body chunks
   - Parses JSON

3. **handleRoute()**
   - Executes routing pipeline
   - Handles errors (404, 500)

4. **res.end()**
   - Finalizes response if not already done

---

## defineGlobalAttributes(req, res)

```typescript
private defineGlobalAttributes(req: IncomingMessage, res: ServerResponse): void {
  this.appReq = req;
  this.appRes = res;
  this.method = (req.method ?? 'GET').toUpperCase();   // GET, POST, etc.
  this.path = req.url ?? '/';                           // /users/123?foo=bar
  this.headers = req.headers;                           // headers object
}
```

**Captures**:

| Attribute | Source | Example Value |
|----------|-------|----------------|
| `appReq` | `req` | IncomingMessage |
| `appRes` | `res` | ServerResponse |
| `method` | `req.method` | "GET", "POST", "PUT", "PATCH", "DELETE" |
| `path` | `req.url` | "/users/123?foo=bar" |
| `headers` | `req.headers` | { host, user-agent, content-type, ... } |

---

## defineBodyAttributes()

```typescript
private async defineBodyAttributes(): Promise<void> {
  const buffers: Buffer[] = [];

  // Read all body chunks
  for await (const chunk of this.appReq!) {
    buffers.push(chunk as Buffer);
  }

  if (buffers.length) {
    // Parse JSON
    this.dataBody = JSON.parse(Buffer.concat(buffers).toString());
  }
}
```

**Behavior**:
- If empty body: `dataBody = null`
- If JSON body: parses to object
- If non-JSON body: will throw error (should be handled)

**Limitations**:
- Only supports JSON in body
- No parse error handling (should add try/catch)

---

## handleRoute()

```typescript
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
```

**Flow**:
1. Tries to execute routing pipeline
2. If `RouteNotFoundException`: returns 404
3. If other error: returns 500

---

## finishRequest(code, message)

```typescript
finishRequest(code: number | undefined, message: unknown): void {
  try {
    const statusCode = code ?? HttpStatusCode.SUCCESS;  // Default 200
    this.appRes!.writeHead(statusCode);
    this.appRes!.write(JSON.stringify(message));
    this.appRes!.end();
  } catch {
    // Fallback if writeHead already called
    this.appRes!.write(JSON.stringify(message));
    this.appRes!.end();
  }
}
```

**Behavior**:
- Sets statusCode with `writeHead()`
- Writes JSON in body
- Finalizes response with `end()`
- Has fallback for cases where `writeHead()` fails (headers already sent)

**Notes**:
- Try-catch protects against `[ERR_HTTP_HEADERS_SENT]`
- If headers already written, only writes body

---

## Private Attributes Detail

### appReq: IncomingMessage | null

Reference to the current request's IncomingMessage. Used to:
- Read body in chunks
- Access headers
- Access URL and method

### appRes: ServerResponse | null

Reference to the current request's ServerResponse. Used to:
- Write headers
- Write body
- Finalize response

### method: string

HTTP method of the request. Possible values:
- `"GET"`
- `"POST"`
- `"PUT"`
- `"PATCH"`
- `"DELETE"`
- `""` (default if not specified)

### path: string

Full URL of the request (path + query string):
- Ex: `/users/123?foo=bar&baz=qux`
- `Routes` will separate path and query for matching

### dataBody: unknown

Parsed request body:
- If JSON: object
- If empty: `null`
- If non-JSON: error (throws exception)

### port: number

Port where server listens. Default: `8000`

### headers: IncomingMessage['headers']

Request headers:
```typescript
{
  host: 'localhost:8000',
  'user-agent': 'curl/7.68.0',
  'content-type': 'application/json',
  // ... others
}
```

### appName: string

Application name for logs. Default: `'App'`

---

## Usage Patterns

### Direct Instantiation

```typescript
import { SweetPotato } from './package/SweetPotato.mjs';

const app = new SweetPotato();

app.get('/users', (ctx) => {
  ctx.headers;  // headers
  ctx.params;   // null (no parameters)
  ctx.body;     // null (GET without body)
  ctx.queries;  // query params
  
  app.finishRequest(200, { message: 'OK' });
});

app.listen(3000);
```

### Using Singleton (SweetPotatoApp)

```typescript
import { SweetPotatoApp } from './package/SweetPotatoApp.mjs';

const app = SweetPotatoApp();

app.get('/health', (ctx) => {
  app.finishRequest(200, { status: 'ok' });
});

app.listen();
```

---

## Errors and Handling

### [ERR_HTTP_HEADERS_SENT]

**Cause**: Trying to write headers after already sending response

**Prevention**: The try-catch in `finishRequest()` covers this:

```typescript
try {
  this.appRes!.writeHead(statusCode);
  this.appRes!.write(JSON.stringify(message));
  this.appRes!.end();
} catch {
  // Fallback
  this.appRes!.write(JSON.stringify(message));
  this.appRes!.end();
}
```

### RouteNotFoundException

**Cause**: No route matching path + method

**Handling**:
```typescript
if (error instanceof RouteNotFoundException) {
  return this.finishRequest(HttpStatusCode.NOT_FOUND, {
    message: (error as Error).message,
  });
}
```

### JSON Parse Error

**Cause**: Body is not valid JSON

**Handling**: Throws exception that falls into general catch → 500

---

## Responsibility Summary

| Responsibility | Methods |
|-----------------|---------|
| HTTP Server | `listen()`, `createServer()` |
| Data Capture | `defineGlobalAttributes()`, `defineBodyAttributes()` |
| Routing | `handleRoute()`, `executeRequestCycle()` |
| Response | `finishRequest()` |
| Logs | Constructor, `listen()` callback |

**SRP Principle**: `SweetPotato` has **single responsibility** - to be the HTTP server entry point, delegating routing logic to `Routes`.