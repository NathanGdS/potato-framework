# Request Lifecycle

## Overview

This document describes the **complete lifecycle of an HTTP request** within the Potato Framework, from request arrival to response sending.

## Flow Diagram

```mermaid
sequenceDiagram
    participant Client
    participant Server as Node.js HTTP Server
    participant SP as SweetPotato
    participant Routes as Routes Engine
    participant RC as RequestCycle
    participant Handler1 as Handler 1
    participant Handler2 as Handler 2
    participant Response as HTTP Response

    Note over Client,Response: Phase 1: Request Reception
    Client->>Server: HTTP Request (GET /users/123?page=1)
    
    Note over Server,Response: Phase 2: Initial Setup
    Server->>SP: createServer callback
    SP->>SP: defineGlobalAttributes(req, res)
    SP->>SP: defineBodyAttributes()
    
    Note over Server,Response: Phase 3: Routing
    SP->>Routes: executeRequestCycle(path, method, body, headers)
    Routes->>Routes: getRouteIndex(path, method)
    Routes->>Routes: Regex match on each route
    Routes->>Routes: getRouteParams() + getQueries()
    
    alt Route found
        Routes->>Routes: routeIndex >= 0
        Routes->>RC: executeRequestCycle(ctx)
        
        Note over Server,Response: Phase 4: Handler Execution
        loop For each handler
            RC->>Handler1: ctx
            Handler1->>Handler1: Logic (middleware)
            Handler1-->>RC: continue
            
            RC->>Handler2: ctx
            Handler2->>Handler2: Logic (handler)
            Handler2->>Response: finishRequest(200, data)
        end
        
        Response-->>Client: HTTP Response (200 OK)
        
    else Route not found
        Routes-->>SP: throw RouteNotFoundException
        SP->>SP: catch error
        SP->>Response: finishRequest(404, error.message)
        Response-->>Client: HTTP Response (404 Not Found)
    end
    
    Note over Server,Response: Phase 5: Finalization
    Response->>Response: writableEnded check
    Response-->>Client: Final HTTP Response
```

## Phase 1: Request Reception

### HTTP Server Event

```typescript
// SweetPotato.ts
http
  .createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // Start of lifecycle
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
```

### Initial State

At callback time:
```typescript
req: IncomingMessage {
  method: "GET",
  url: "/users/123?page=1",
  headers: { host, user-agent, ... },
  // ...
}

res: ServerResponse {
  // ...
}
```

---

## Phase 2: Initial Setup

### defineGlobalAttributes(req, res)

**Responsibility**: Capture global request data

```typescript
private defineGlobalAttributes(req: IncomingMessage, res: ServerResponse): void {
  this.appReq = req;
  this.appRes = res;
  this.method = (req.method ?? 'GET').toUpperCase();   // "GET"
  this.path = req.url ?? '/';                           // "/users/123?page=1"
  this.headers = req.headers;                           // headers object
}
```

**Captured attributes**:

| Attribute | Source | Example Value |
|----------|-------|----------------|
| `appReq` | `req` | IncomingMessage |
| `appRes` | `res` | ServerResponse |
| `method` | `req.method` | `"GET"` |
| `path` | `req.url` | `"/users/123?page=1"` |
| `headers` | `req.headers` | `{ host: "localhost:8000" }` |

---

### defineBodyAttributes()

**Responsibility**: Read and parse request body

```typescript
private async defineBodyAttributes(): Promise<void> {
  const buffers: Buffer[] = [];

  for await (const chunk of this.appReq!) {
    buffers.push(chunk as Buffer);
  }

  if (buffers.length) {
    this.dataBody = JSON.parse(Buffer.concat(buffers).toString());
  }
}
```

**Behavior**:

1. Loop over body chunks
2. Concatenate all buffers
3. Parse JSON
4. If empty body: `dataBody = null`

**Limitations**:
- Only supports JSON
- No parse error handling

---

## Phase 3: Routing

### handleRoute()

**Responsibility**: Find and execute matching route

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

1. Calls `executeRequestCycle()` with path, method, body, headers
2. If `RouteNotFoundException`: 404
3. If other error: 500

---

### Routes.executeRequestCycle()

**Responsibility**: Execute handler pipeline of route

```typescript
async executeRequestCycle(
  path: string,
  method: string,
  body: unknown,
  headers: IncomingHttpHeaders
): Promise<void> {
  const routeIndex = this.getRouteIndex(path, method);
  if (routeIndex < 0) {
    throw new RouteNotFoundException();
  }
  
  const route = this.routes[routeIndex];
  const params = route.params;
  const queries = route.queries;
  
  const requestCycleObject: HandlerContext = Object.freeze({
    body,
    params,
    headers,
    queries,
  });
  
  return await route.requestCycle.executeRequestCycle(requestCycleObject);
}
```

**Steps**:

1. Calls `getRouteIndex(path, method)` to find route
2. If not found: `throw RouteNotFoundException`
3. Creates frozen `HandlerContext`
4. Executes `RequestCycle.execute()`

---

### Routes.getRouteIndex(path, method)

**Responsibility**: Find index of matching route

```typescript
private getRouteIndex(path: string, method: string): number {
  return this.routes.findIndex((e) => {
    const regexVerifier = e.sufix.exec(path);
    if (!regexVerifier) return false;
    if (e.method !== method) return false;
    if (regexVerifier.find((t) => t === path)) {
      e.params = getRouteParams(regexVerifier.groups as Record<string, string>);
      e.queries = getQueries(regexVerifier.groups?.['query']);
      return true;
    }
    return false;
  });
}
```

**Matching Logic**:

1. **Execute route regex on path**
   ```typescript
   e.sufix.exec(path)  // /^\/users\/(?<id>[a-z0-9\-_]+)(?<query>\?.*)?$/.exec("/users/123")
   ```

2. **Check method**
   ```typescript
   if (e.method !== method) return false;
   ```

3. **Check full path**
   ```typescript
   if (regexVerifier.find((t) => t === path))
   ```

4. **Extract parameters and queries**
   ```typescript
   e.params = getRouteParams(regexVerifier.groups);
   e.queries = getQueries(regexVerifier.groups?.['query']);
   ```

---

## Phase 4: Handler Execution

### RequestCycle.executeRequestCycle()

**Responsibility**: Execute handlers in sequence

```typescript
async executeRequestCycle(data: HandlerContext): Promise<void> {
  for (let i = 0; i < this.handlers.length; i++) {
    const actualHandler = this.handlers[i];
    
    if (!isPromise(actualHandler)) {
      actualHandler(data);  // Synchronous
    } else {
      await actualHandler(data);  // Asynchronous
    }
  }
}
```

**Flow**:

1. Loop over all handlers
2. `isPromise()` detects if handler is async
3. Synchronous: call directly
4. Asynchronous: wait with `await`

### Handler Context

Same context is passed to all handlers:

```typescript
interface HandlerContext {
  body: any;
  params: Record<string, string> | null;
  headers: IncomingHttpHeaders;
  queries: Record<string, string> | null;
}
```

**Example values**:

```typescript
// Request: GET /users/123?page=1

const ctx: HandlerContext = Object.freeze({
  body: null,                            // GET has no body
  params: { id: "123" },                // from buildRoutePath
  headers: { host: "localhost:8000" },  // from defineGlobalAttributes
  queries: { page: "1" },               // from getQueries
});
```

---

### Handler Contract

Each handler must:

1. **Receive context**:
   ```typescript
   const handler: RouteHandler = (ctx) => { ... }
   ```

2. **Not mutate context** (immutability):
   ```typescript
   // ❌ DON'T DO:
   ctx.params.id = 'new-value';
   ```

3. **Not call `next()`**:
   - Handlers execute in sequence
   - There's no `next()` mechanism

4. **Call `app.finishRequest()`**:
   ```typescript
   app.finishRequest(statusCode, data);
   ```

---

## Handler Types

### Synchronous Handler

```typescript
const syncHandler: RouteHandler = (ctx) => {
  console.log('Synchronous handler');
  app.finishRequest(200, { data: 'ok' });
};

// isPromise(syncHandler) = false
// Execution: actualHandler(data)
```

### Asynchronous Handler

```typescript
const asyncHandler: RouteHandler = async (ctx) => {
  await db.query('SELECT 1');
  app.finishRequest(200, { data: 'ok' });
};

// isPromise(asyncHandler) = true (AsyncFunction)
// Execution: await actualHandler(data)
```

### Handler Returning Promise

```typescript
const promiseHandler: RouteHandler = (ctx) => {
  return new Promise<void>(resolve => {
    setTimeout(() => {
      console.log('Done');
      resolve();
    }, 100);
  });
};

// isPromise(promiseHandler) = true (instanceof Promise)
// Execution: await actualHandler(data)
```

---

## Handler Chain Example

### With Middleware

```typescript
const authMiddleware: RouteHandler = async (ctx) => {
  const token = ctx.headers['authorization'];
  if (!token) {
    app.finishRequest(401, { error: 'Unauthorized' });
    return;  // Stop chain
  }
  // Continue - does not call finishRequest
};

const logMiddleware: RouteHandler = (ctx) => {
  console.log(`${ctx.params} accessed at ${new Date()}`);
  // Continue - does not call finishRequest
};

const getHandler: RouteHandler = (ctx) => {
  app.finishRequest(200, { id: ctx.params?.id });
};

// Registration
app.get('/users/:id', authMiddleware, logMiddleware, getHandler);
```

### Execution Order

```
1. authMiddleware(ctx) - verify token
   ├─ No token → finishRequest(401) → chain stops
   └─ With token → continue

2. logMiddleware(ctx) - log access
   └─ continue (does not call finishRequest)

3. getHandler(ctx) - final handler
   └─ finishRequest(200, { id }) → response sent
```

---

## Phase 5: Finalization

### finishRequest(code, message)

**Responsibility**: Send HTTP response

```typescript
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
```

**Steps**:

1. Set statusCode (default: 200)
2. Write headers with `writeHead()`
3. Write body with `write()`
4. Finalize with `end()`
5. Fallback for `[ERR_HTTP_HEADERS_SENT]`

---

### writableEnded Check

```typescript
if (!this.appRes!.writableEnded) {
  this.appRes!.end();
}
```

**Purpose**: Avoid trying to finalize an already finalized response.

**When it happens**:
- Handler calls `finishRequest()`
- Another handler or code tries to write again

---

## Lifecycle Summary

| Phase | Description | Time | Responsible |
|------|-----------|-------|-------------|
| 1 | Request reception | Instantaneous | Node.js HTTP Server |
| 2 | Initial setup (capture data) | O(1) | SweetPotato |
| 3 | Routing (find route) | O(n × m) | Routes |
| 4 | Handler execution | O(k) | RequestCycle |
| 5 | Finalization (response) | O(1) | SweetPotato |

### Complexity

- **Setup**: O(1)
- **Route matching**: O(n) where n = number of routes
- **Handler execution**: O(k) where k = number of handlers
- **Total per request**: O(n + k)

### Memory Usage

| Item | Estimated Size |
|------|------------------|
| `HandlerContext` | ~100-200 bytes |
| `Route` | ~500-1000 bytes |
| `RequestCycle` | ~100-200 bytes |
| `HandlerContext` (frozen) | ~100-200 bytes |

**Total per request**: ~1-2 KB (not counting body)

---

## Errors in Lifecycle

### RouteNotFoundException

**Occurrence**: Phase 3 (Routes.getRouteIndex)

**Cause**: No route matches path + method

**Handling**:
```typescript
if (error instanceof RouteNotFoundException) {
  return this.finishRequest(HttpStatusCode.NOT_FOUND, {
    message: (error as Error).message,
  });
}
```

**Response**: 404 Not Found

---

### Error in Handler

**Occurrence**: Phase 4 (RequestCycle.executeRequestCycle)

**Cause**: Exception thrown by any handler

**Handling**:
```typescript
try {
  return await this.executeRequestCycle(...);
} catch (error) {
  return this.finishRequest(HttpStatusCode.INTERNAL_SERVER_ERROR, {
    message: (error as Error).message,
  });
}
```

**Response**: 500 Internal Server Error

---

### [ERR_HTTP_HEADERS_SENT]

**Occurrence**: Phase 5 (finishRequest)

**Cause**: Trying to write headers after already done

**Handling**:
```typescript
try {
  this.appRes!.writeHead(statusCode);
  this.appRes!.write(JSON.stringify(message));
  this.appRes!.end();
} catch {
  this.appRes!.write(JSON.stringify(message));
  this.appRes!.end();
}
```

**Response**: Only body is written

---

## Advanced Usage Patterns

### Validation Middleware

```typescript
const validateMiddleware: RouteHandler = (ctx) => {
  if (!ctx.body?.email || !isValidEmail(ctx.body.email)) {
    app.finishRequest(400, { error: 'Invalid email' });
    return;
  }
  // Continue
};
```

### Cache Middleware

```typescript
const cacheMiddleware: RouteHandler = async (ctx) => {
  const cacheKey = `users:${ctx.params?.id}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    app.finishRequest(200, JSON.parse(cached));
    return;
  }
  // Continue (no cache)
};
```

### Rate Limiting Middleware

```typescript
const rateLimitMiddleware: RouteHandler = async (ctx) => {
  const ip = ctx.headers['x-forwarded-for'] || 'unknown';
  const count = await redis.incr(`ratelimit:${ip}`);
  
  if (count > 100) {
    app.finishRequest(429, { error: 'Rate limit exceeded' });
    return;
  }
  // Continue
};
```

---

## State Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Request Received                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              defineGlobalAttributes()                        │
│              defineBodyAttributes()                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Routes.executeRequestCycle()              │
│                    ├─ getRouteIndex()                       │
│                    │   └─ Regex match                       │
│                    └─ create HandlerContext                 │
└─────────────────────────────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
              ▼                           ▼
    ┌──────────────────┐      ┌─────────────────────┐
    │ Route Found     │      │ Route Not Found     │
    └──────────────────┘      └─────────────────────┘
              │                           │
              ▼                           │
    ┌──────────────────┐                  │
    │ RequestCycle     │                  │
    │ execute()        │                  │
    ├─ Handler 1       │                  │
    ├─ Handler 2       │                  │
    └─ Handler N       │                  │
              │                           │
              ▼                           ▼
    ┌──────────────────┐      ┌─────────────────────┐
    │ finishRequest()  │      │ finishRequest(404)  │
    └──────────────────┘      └─────────────────────┘
              │
              ▼
    ┌──────────────────┐
    │ HTTP Response    │
    └──────────────────┘
```

---

## Conclusion

The Potato Framework lifecycle is **simple and straightforward**:

1. **Receives** HTTP request
2. **Captures** global data
3. **Finds** matching route
4. **Executes** handlers in sequence
5. **Sends** HTTP response

Each phase has **single responsibility** and data is **encapsulated** in the `HandlerContext` that is passed forward.