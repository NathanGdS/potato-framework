# Framework Base Types

## Overview

Potato Framework defines two fundamental types used throughout the engine:

1. **HandlerContext** - The object passed to all handlers
2. **RouteHandler** - The function type all handlers must follow

## HandlerContext

### Definition

```typescript
import type { IncomingHttpHeaders } from 'node:http';

export interface HandlerContext {
  body: any;
  params: Record<string, string> | null;
  headers: IncomingHttpHeaders;
  queries: Record<string, string> | null;
}
```

### Properties

| Property | Type | Description |
|-------------|------|-----------|
| `body` | `any` | Request body parsed as JSON (or `null`) |
| `params` | `Record<string, string> \| null` | Route parameters (ex: `:id`) |
| `headers` | `IncomingHttpHeaders` | Request headers |
| `queries` | `Record<string, string> \| null` | Query parameters (ex: `?page=1`) |

### Detailed Description

#### body: any

The HTTP request body, parsed from JSON to a JavaScript object.

**Possible values**:
- `null` - If no body or empty body
- `object` - If body is valid JSON
- `array` - If body is a JSON array
- `string`, `number`, `boolean` - If it's a JSON primitive

**Examples**:
```typescript
// GET /users (no body)
ctx.body;  // null

// POST /users with body {"name": "John"}
ctx.body;  // { name: "John" }

// PUT /users with body [{"id": 1}, {"id": 2}]
ctx.body;  // [{ id: 1 }, { id: 2 }]
```

**Note**: The framework assumes the body is always JSON. If not, it will throw an error.

---

#### params: Record<string, string> | null

Parameters extracted from the request path.

**Format**: Each `:parameter` in the path becomes a key in the object.

**Examples**:
```typescript
// GET /users/123
// Path: "/users/:id"
ctx.params;  // { id: "123" }

// GET /users/456/posts/789
// Path: "/users/:userId/posts/:postId"
ctx.params;  // { userId: "456", postId: "789" }

// GET /users
// Path: "/users"
ctx.params;  // null (or {} depending on implementation)
```

**Characteristics**:
- All values are strings (no parsing to number)
- Only lowercase letters, digits, hyphen, and underscore are allowed
- If no parameters: `null` (or empty object `{}`)

---

#### headers: IncomingHttpHeaders

HTTP request headers, as defined in Node.js `http` module.

**Node.js Definition**:
```typescript
type IncomingHttpHeaders = {
  [key: string]: string | string[] | undefined;
};
```

**Examples**:
```typescript
// Request: GET /users HTTP/1.1
// Host: localhost:8000
// User-Agent: curl/7.68.0
// Content-Type: application/json
// Authorization: Bearer token123

ctx.headers['host'];           // "localhost:8000"
ctx.headers['user-agent'];     // "curl/7.68.0"
ctx.headers['content-type'];   // "application/json"
ctx.headers['authorization'];  // "Bearer token123"
```

**Characteristics**:
- Keys are lowercase by Node.js
- Values can be string or string[] (for multiple headers)
- Some common headers:
  - `content-length`
  - `content-type`
  - `authorization`
  - `accept`
  - `accept-language`

---

#### queries: Record<string, string> | null

URL query parameters, parsed into an object.

**Format**: `?key1=value1&key2=value2` → `{ key1: "value1", key2: "value2" }`

**Examples**:
```typescript
// GET /users?page=1&limit=10
ctx.queries;  // { page: "1", limit: "10" }

// GET /users?sort=desc&order=asc
ctx.queries;  // { sort: "desc", order: "asc" }

// GET /users
ctx.queries;  // null
```

**Characteristics**:
- All values are strings
- Duplicate parameters: last value wins (current behavior)
- No automatic URL decoding (ex: `%20` doesn't become space)
- If no query: `null`

---

## RouteHandler

### Definition

```typescript
export type RouteHandler = (ctx: HandlerContext) => void | Promise<void>;
```

### Handler Types

#### Synchronous Handler

```typescript
const syncHandler: RouteHandler = (ctx) => {
  console.log(ctx.params);
  app.finishRequest(200, { data: 'ok' });
};

// Or:
function syncHandler(ctx: HandlerContext): void {
  // ...
}
```

**Characteristics**:
- Returns `void` or nothing (implicit `undefined`)
- Does not use `async`
- Does not need `await`

---

#### Asynchronous Handler (Async Function)

```typescript
const asyncHandler: RouteHandler = async (ctx) => {
  const user = await db.findUser(ctx.params?.id);
  app.finishRequest(200, { user });
};

// Or:
async function asyncHandler(ctx: HandlerContext): Promise<void> {
  // ...
}
```

**Characteristics**:
- Has `async` keyword
- Can use `await`
- Returns `Promise<void>`
- Must be called with `await`

---

#### Handler Returning Promise Directly

```typescript
const promiseHandler: RouteHandler = (ctx) => {
  return new Promise<void>(resolve => {
    setTimeout(() => {
      console.log('Done');
      resolve();
    }, 100);
  });
};

// Or:
function promiseHandler(ctx: HandlerContext): Promise<void> {
  return db.query();
}
```

**Characteristics**:
- Does not have `async`
- Explicitly returns `Promise<void>`
- Must be called with `await`

---

## Usage in Framework

### Creating HandlerContext

```typescript
// In Routes.executeRequestCycle()

const requestCycleObject: HandlerContext = Object.freeze({
  body,
  params,
  headers,
  queries,
});
```

**Important**: `Object.freeze()` makes the context **immutable**.

### Handler Contract

Each handler must:

1. **Access data** from `ctx`:
   ```typescript
   const userId = ctx.params?.id;
   const token = ctx.headers['authorization'];
   ```

2. **Not mutate** the context (immutability):
   ```typescript
   // ❌ DON'T DO:
   ctx.params.id = 'new-value';  // Error (frozen)
   ```

3. **Not call `next()`**:
   - Framework executes handlers in sequence
   - There's no `next()` mechanism

4. **Call `app.finishRequest()`** at the end:
   ```typescript
   app.finishRequest(statusCode, data);
   ```

### Execution Order

```typescript
// Registration
app.get('/users', middleware1, middleware2, handler);

// Execution order:
// 1. middleware1(ctx) - does not call finishRequest
// 2. middleware2(ctx) - does not call finishRequest
// 3. handler(ctx) - calls finishRequest
```

### Middleware Pattern

```typescript
const authMiddleware: RouteHandler = async (ctx) => {
  const token = ctx.headers['authorization'];
  
  if (!token) {
    app.finishRequest(401, { error: 'Unauthorized' });
    return;  // Stop chain
  }
  
  // Continue chain - does not call finishRequest
};

const logMiddleware: RouteHandler = (ctx) => {
  console.log(`${ctx.params} accessed`);
  // Continue chain - does not call finishRequest
};

const getHandler: RouteHandler = (ctx) => {
  app.finishRequest(200, { users: [] });  // Final handler
};
```

---

## Comparison with Other Frameworks

### Express.js

```typescript
// Express
app.get('/users', (req, res, next) => {
  // req, res are separate objects
  // next() is called to pass to next middleware
});

// Potato
app.get('/users', (ctx) => {
  // ctx is single object with hidden req and res
  // no next() - handlers execute in sequence
});
```

### Fastify

```typescript
// Fastify
app.get('/users', async (request, reply) => {
  // request and reply are separate
});

// Potato
app.get('/users', async (ctx) => {
  // single context
});
```

---

## Usage Patterns

### Accessing All Data

```typescript
const handler: RouteHandler = (ctx) => {
  // Body
  const userData = ctx.body;
  
  // Parameters
  const userId = ctx.params?.id;
  
  // Headers
  const authorization = ctx.headers['authorization'];
  const contentType = ctx.headers['content-type'];
  
  // Queries
  const page = ctx.queries?.page;
  const limit = ctx.queries?.limit;
  
  app.finishRequest(200, {
    userData,
    userId,
    authorization,
    contentType,
    page,
    limit,
  });
};
```

### Authentication Middleware

```typescript
const authMiddleware: RouteHandler = async (ctx) => {
  const token = ctx.headers['authorization'];
  
  if (!token) {
    app.finishRequest(401, { error: 'Missing token' });
    return;
  }
  
  // Continue - does not call finishRequest
};
```

### Logging Middleware

```typescript
const logMiddleware: RouteHandler = (ctx) => {
  const timestamp = new Date().toISOString();
  const method = ctx.headers[':method'] || 'UNKNOWN';
  
  console.log(`[${timestamp}] ${method} - ${ctx.params}`);
  
  // Continue - does not call finishRequest
};
```

### Final Handler

```typescript
const getHandler: RouteHandler = (ctx) => {
  const userId = ctx.params?.id;
  
  // Simple sync handler
  app.finishRequest(200, { id: userId });
};

const postHandler: RouteHandler = async (ctx) => {
  const userData = ctx.body;
  
  // Async handler
  const user = await db.createUser(userData);
  app.finishRequest(201, user);
};
```

---

## Complementary Types

### HttpMethod

```typescript
export const HttpMethod = {
  GET: "GET",
  POST: "POST",
  PATCH: "PATCH",
  PUT: "PUT",
  DELETE: "DELETE",
} as const;

export type HttpMethod = (typeof HttpMethod)[keyof typeof HttpMethod];
```

**Usage**:
```typescript
const method: HttpMethod = HttpMethod.GET;  // "GET"
```

### HttpStatusCode

```typescript
export const HttpStatusCode = {
  SUCCESS: 200,
  CREATED: 201,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export type HttpStatusCode = (typeof HttpStatusCode)[keyof typeof HttpStatusCode];
```

**Usage**:
```typescript
app.finishRequest(HttpStatusCode.SUCCESS, data);
```

---

## Summary

| Type | Description |
|------|-----------|
| **HandlerContext** | Immutable object passed to handlers with body, params, headers, queries |
| **RouteHandler** | Function type `(ctx: HandlerContext) => void \| Promise<void>` |

### HandlerContext

| Property | Type | Optional | Description |
|-------------|------|----------|-----------|
| `body` | `any` | Yes | Parsed body (JSON) |
| `params` | `Record<string, string> \| null` | Yes | Route parameters |
| `headers` | `IncomingHttpHeaders` | No | HTTP headers |
| `queries` | `Record<string, string> \| null` | Yes | Query parameters |

### RouteHandler

| Variation | Syntax | Usage |
|----------|---------|-----|
| **Synchronous** | `(ctx) => { ... }` | Without `async` |
| **Async** | `async (ctx) => { ... }` | With `await` |
| **Promise** | `(ctx) => Promise<void>` | Returns Promise |

### Handler Contract

1. Receives `HandlerContext` as single parameter
2. Must not mutate the context (immutable)
3. Does not call `next()` - framework manages sequence
4. Must call `app.finishRequest(statusCode, data)` at some point (or let another handler do it)

### Immutability

```typescript
const requestCycleObject: HandlerContext = Object.freeze({
  body,
  params,
  headers,
  queries,
});
```

**Guarantee**: Handlers cannot modify the context.

### Type Safety

```typescript
// Type guard to detect async handlers
export function isPromise(fn: unknown): fn is Promise<unknown> {
  if (
    (typeof fn === 'function' && fn.constructor.name === 'AsyncFunction') ||
    fn instanceof Promise
  ) {
    return true;
  }
  return false;
}
```

**Usage**:
```typescript
if (!isPromise(actualHandler)) {
  actualHandler(data);  // Sync
} else {
  await actualHandler(data);  // Async
}
```