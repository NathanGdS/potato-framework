# HttpStatusCode - HTTP Status Code Constants

## Overview

`HttpStatusCode` is a constant object that defines the **HTTP status codes** used by the framework. It provides type safety and prevents errors when defining responses.

```typescript
export const HttpStatusCode = {
  SUCCESS: 200,
  CREATED: 201,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export type HttpStatusCode = (typeof HttpStatusCode)[keyof typeof HttpStatusCode];
```

## Structure

### Status Codes

| Key | Value | Description |
|-------|-------|-----------|
| `SUCCESS` | `200` | Successful request |
| `CREATED` | `201` | Resource created |
| `NOT_FOUND` | `404` | Resource not found |
| `INTERNAL_SERVER_ERROR` | `500` | Internal server error |

### Type Alias

```typescript
export type HttpStatusCode = (typeof HttpStatusCode)[keyof typeof HttpStatusCode];
```

**Resolution**:
```typescript
typeof HttpStatusCode = {
  SUCCESS: 200,
  CREATED: 201,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
}

type HttpStatusCode = 200 | 201 | 404 | 500
```

## Usage in Framework

### In SweetPotato

```typescript
// SweetPotato.ts
finishRequest(code: number | undefined, message: unknown): void {
  try {
    const statusCode = code ?? HttpStatusCode.SUCCESS;  // Default 200
    this.appRes!.writeHead(statusCode);
    this.appRes!.write(JSON.stringify(message));
    this.appRes!.end();
  } catch {
    this.appRes!.write(JSON.stringify(message));
    this.appRes!.end();
  }
}
```

**Behavior**:
- If `code` is `undefined`: uses `HttpStatusCode.SUCCESS` (200)
- If `code` is `null`: uses `HttpStatusCode.SUCCESS` (200)
- If `code` is number: uses the provided number

### In Routes (Error Handling)

```typescript
// Routes.ts
async executeRequestCycle(...): Promise<void> {
  const routeIndex = this.getRouteIndex(path, method);
  if (routeIndex < 0) {
    throw new RouteNotFoundException();
  }
  // ...
}
```

```typescript
// SweetPotato.ts
private async handleRoute(): Promise<void> {
  try {
    return await this.executeRequestCycle(...);
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

## Available Status Codes

### 2xx - Success

| Code | Name | Usage |
|--------|------|-----|
| `200` | OK | Successful request |
| `201` | Created | Resource created (ex: POST) |

```typescript
// 200 OK
app.get('/users', (ctx) => {
  app.finishRequest(HttpStatusCode.SUCCESS, { users: [] });
});

// 201 Created
app.post('/users', (ctx) => {
  app.finishRequest(HttpStatusCode.CREATED, { id: 1, ...ctx.body });
});
```

### 4xx - Client Error

| Code | Name | Usage |
|--------|------|-----|
| `404` | Not Found | Resource not found |

```typescript
// 404 Not Found
app.get('/users/999', (ctx) => {
  app.finishRequest(HttpStatusCode.NOT_FOUND, { error: 'User not found' });
});
```

### 5xx - Server Error

| Code | Name | Usage |
|--------|------|-----|
| `500` | Internal Server Error | Server error |

```typescript
// 500 Internal Server Error
app.get('/users', (ctx) => {
  try {
    throw new Error('Database error');
  } catch {
    app.finishRequest(HttpStatusCode.INTERNAL_SERVER_ERROR, { error: 'Server error' });
  }
});
```

## Usage in Examples

### Simple Example

```typescript
import { SweetPotatoApp, HttpStatusCode } from '../SweetPotatoApp.mjs';

const app = SweetPotatoApp();

app.get('/health', (ctx) => {
  app.finishRequest(HttpStatusCode.SUCCESS, { status: 'ok' });
});

app.listen(8000);
```

### Example with Resource

```typescript
import { SweetPotatoApp, HttpStatusCode } from '../SweetPotatoApp.mjs';

const app = SweetPotatoApp();

app.get('/users/:id', (ctx) => {
  const userId = ctx.params?.id;
  
  if (userId === '1') {
    app.finishRequest(HttpStatusCode.SUCCESS, { id: 1, name: 'John' });
  } else {
    app.finishRequest(HttpStatusCode.NOT_FOUND, { error: 'User not found' });
  }
});

app.post('/users', (ctx) => {
  app.finishRequest(HttpStatusCode.CREATED, { id: 1, ...ctx.body });
});

app.listen(8000);
```

### Example with Resource DSL

```typescript
import { SweetPotatoApp, HttpMethod, HttpStatusCode } from '../SweetPotatoApp.mjs';

const app = SweetPotatoApp();

app.resource("message")
  .defineHandler({ method: HttpMethod.GET, sufix: ":id" }, (ctx) => {
    app.finishRequest(HttpStatusCode.SUCCESS, { id: ctx.params?.id });
  })
  .defineHandler({ method: HttpMethod.GET }, (ctx) => {
    app.finishRequest(HttpStatusCode.SUCCESS, { messages: [] });
  })
  .defineHandler({ method: HttpMethod.POST }, (ctx) => {
    app.finishRequest(HttpStatusCode.CREATED, { id: 1, ...ctx.body });
  });

app.listen(8000);
```

## Complete Status Codes (RFC 7231)

### 1xx - Informational

| Code | Name | Status in Framework |
|--------|------|---------------------|
| 100 | Continue | Not implemented |
| 101 | Switching Protocols | Not implemented |
| 102 | Processing | Not implemented |

### 2xx - Success

| Code | Name | Implemented |
|--------|------|--------------|
| 200 | OK | ✅ `SUCCESS` |
| 201 | Created | ✅ `CREATED` |
| 202 | Accepted | ❌ |
| 203 | Non-Authoritative Information | ❌ |
| 204 | No Content | ❌ |
| 205 | Reset Content | ❌ |
| 206 | Partial Content | ❌ |
| 207 | Multi-Status | ❌ |
| 208 | Already Reported | ❌ |
| 226 | IM Used | ❌ |

### 3xx - Redirection

| Code | Name | Status in Framework |
|--------|------|---------------------|
| 300 | Multiple Choices | ❌ |
| 301 | Moved Permanently | ❌ |
| 302 | Found | ❌ |
| 303 | See Other | ❌ |
| 304 | Not Modified | ❌ |
| 305 | Use Proxy | ❌ |
| 306 | (unused) | ❌ |
| 307 | Temporary Redirect | ❌ |
| 308 | Permanent Redirect | ❌ |

### 4xx - Client Error

| Code | Name | Implemented |
|--------|------|--------------|
| 400 | Bad Request | ❌ |
| 401 | Unauthorized | ❌ |
| 403 | Forbidden | ❌ |
| 404 | Not Found | ✅ `NOT_FOUND` |
| 405 | Method Not Allowed | ❌ |
| 406 | Not Acceptable | ❌ |
| 407 | Proxy Auth Required | ❌ |
| 408 | Request Timeout | ❌ |
| 409 | Conflict | ❌ |
| 410 | Gone | ❌ |
| 411 | Length Required | ❌ |
| 412 | Precondition Failed | ❌ |
| 413 | Payload Too Large | ❌ |
| 414 | URI Too Long | ❌ |
| 415 | Unsupported Media Type | ❌ |
| 416 | Range Not Satisfiable | ❌ |
| 417 | Expectation Failed | ❌ |
| 421 | Misdirected Request | ❌ |
| 422 | Unprocessable Entity | ❌ |
| 423 | Locked | ❌ |
| 424 | Failed Dependency | ❌ |
| 425 | Too Early | ❌ |
| 426 | Upgrade Required | ❌ |
| 428 | Precondition Required | ❌ |
| 429 | Too Many Requests | ❌ |
| 431 | Request Header Fields Too Large | ❌ |
| 451 | Unavailable For Legal Reasons | ❌ |

### 5xx - Server Error

| Code | Name | Implemented |
|--------|------|--------------|
| 500 | Internal Server Error | ✅ `INTERNAL_SERVER_ERROR` |
| 501 | Not Implemented | ❌ |
| 502 | Bad Gateway | ❌ |
| 503 | Service Unavailable | ❌ |
| 504 | Gateway Timeout | ❌ |
| 505 | HTTP Version Not Supported | ❌ |
| 506 | Variant Also Negotiates | ❌ |
| 507 | Insufficient Storage | ❌ |
| 508 | Loop Detected | ❌ |
| 510 | Not Extended | ❌ |
| 511 | Network Auth Required | ❌ |

## Errors and Handling

### RouteNotFoundException

```typescript
// Routes.ts
async executeRequestCycle(...): Promise<void> {
  const routeIndex = this.getRouteIndex(path, method);
  if (routeIndex < 0) {
    throw new RouteNotFoundException();  // ← Throws exception
  }
  // ...
}

// SweetPotato.ts
private async handleRoute(): Promise<void> {
  try {
    return await this.executeRequestCycle(...);
  } catch (error) {
    if (error instanceof RouteNotFoundException) {
      return this.finishRequest(HttpStatusCode.NOT_FOUND, {  // 404
        message: (error as Error).message,
      });
    }
    // Other errors → 500
    return this.finishRequest(HttpStatusCode.INTERNAL_SERVER_ERROR, {
      message: (error as Error).message,
    });
  }
}
```

**Flow**:
1. `Routes.executeRequestCycle()` → doesn't find route → `throw RouteNotFoundException`
2. `SweetPotato.handleRoute()` → catch → checks type → `finishRequest(HttpStatusCode.NOT_FOUND, ...)`

### Generic Error

```typescript
// SweetPotato.ts
private async handleRoute(): Promise<void> {
  try {
    return await this.executeRequestCycle(...);
  } catch (error) {
    // Any error that's not RouteNotFoundException
    return this.finishRequest(HttpStatusCode.INTERNAL_SERVER_ERROR, {  // 500
      message: (error as Error).message,
    });
  }
}
```

**Scenarios**:
- Error in handler (sync or async)
- Error in middleware
- Body parsing error
- Any other unhandled exception

## Usage Patterns

### Simple Success (200)

```typescript
app.get('/health', (ctx) => {
  app.finishRequest(HttpStatusCode.SUCCESS, { status: 'ok' });
});
```

### Resource Created (201)

```typescript
app.post('/users', (ctx) => {
  const user = createUser(ctx.body);
  app.finishRequest(HttpStatusCode.CREATED, user);
});
```

### Resource Not Found (404)

```typescript
app.get('/users/:id', (ctx) => {
  const user = findUser(ctx.params?.id);
  if (!user) {
    app.finishRequest(HttpStatusCode.NOT_FOUND, { error: 'User not found' });
    return;
  }
  app.finishRequest(HttpStatusCode.SUCCESS, user);
});
```

### Server Error (500)

```typescript
app.get('/data', (ctx) => {
  try {
    const data = fetchData();
    app.finishRequest(HttpStatusCode.SUCCESS, data);
  } catch (error) {
    app.finishRequest(HttpStatusCode.INTERNAL_SERVER_ERROR, { 
      error: 'Failed to fetch data' 
    });
  }
});
```

### Validation Middleware

```typescript
const validateUserMiddleware: RouteHandler = (ctx) => {
  if (!ctx.body?.name) {
    app.finishRequest(HttpStatusCode.BAD_REQUEST, {  // 400
      error: 'Name is required'
    });
    return;
  }
  
  if (!ctx.body?.email || !isValidEmail(ctx.body.email)) {
    app.finishRequest(HttpStatusCode.BAD_REQUEST, {  // 400
      error: 'Invalid email'
    });
    return;
  }
  
  // Continue - does not call finishRequest
};
```

### Async Handler

```typescript
const getUserHandler: RouteHandler = async (ctx) => {
  try {
    const user = await db.query('SELECT * FROM users WHERE id = ?', ctx.params?.id);
    
    if (!user) {
      app.finishRequest(HttpStatusCode.NOT_FOUND, { error: 'User not found' });
      return;
    }
    
    app.finishRequest(HttpStatusCode.SUCCESS, user);
  } catch (error) {
    app.finishRequest(HttpStatusCode.INTERNAL_SERVER_ERROR, { 
      error: 'Database error' 
    });
  }
};
```

## Type Safety

### With Type Alias

```typescript
import type { HttpStatusCodeType } from './package/index.mjs';

const code: HttpStatusCodeType = 200;  // ✅
const code: HttpStatusCodeType = 201;  // ✅
const code: HttpStatusCodeType = 404;  // ✅
const code: HttpStatusCodeType = 500;  // ✅

// Error: Type 300 is not assignable to type HttpStatusCodeType
const code: HttpStatusCodeType = 300;  // ❌
```

### With Constant Directly

```typescript
import { HttpStatusCode } from './package/index.mjs';

app.finishRequest(HttpStatusCode.SUCCESS, data);     // ✅ 200
app.finishRequest(HttpStatusCode.CREATED, data);     // ✅ 201
app.finishRequest(HttpStatusCode.NOT_FOUND, data);   // ✅ 404
app.finishRequest(HttpStatusCode.INTERNAL_SERVER_ERROR, data);  // ✅ 500
```

## Difference between HttpStatusCodeType and number

### HttpStatusCodeType

```typescript
type HttpStatusCodeType = 200 | 201 | 404 | 500;

const code: HttpStatusCodeType = 200;  // ✅
const code: HttpStatusCodeType = 300;  // ❌
```

### number (broader)

```typescript
const code: number = 200;  // ✅
const code: number = 300;  // ✅
const code: number = 999;  // ✅ (but not valid HTTP status)
```

### Usage in Function

```typescript
// In function definition
finishRequest(code: number | undefined, message: unknown): void {
  const statusCode = code ?? HttpStatusCode.SUCCESS;
  // ...
}

// The parameter accepts:
app.finishRequest(undefined, data);     // uses SUCCESS (200)
app.finishRequest(200, data);           // ✅ number literal
app.finishRequest(HttpStatusCode.SUCCESS, data);  // ✅ HttpStatusCodeType
app.finishRequest(300, data);           // ✅ number literal (but not ideal)
```

## Summary

| Aspect | Implementation |
|--------|---------------|
| **Type** | Object with `as const` |
| **Status Codes** | `SUCCESS`, `CREATED`, `NOT_FOUND`, `INTERNAL_SERVER_ERROR` |
| **Values** | `200`, `201`, `404`, `500` |
| **Type** | `200 \| 201 \| 404 \| 500` |

### Implemented Status Codes

| Status | Code | Name | Usage |
|--------|--------|------|-----|
| SUCCESS | 200 | OK | Successful request |
| CREATED | 201 | Created | Resource created |
| NOT_FOUND | 404 | Not Found | Resource not found |
| INTERNAL_SERVER_ERROR | 500 | Internal Server Error | Server error |

### Usage in finishRequest Function

```typescript
finishRequest(code: number | undefined, message: unknown): void {
  const statusCode = code ?? HttpStatusCode.SUCCESS;  // Default: 200
  this.appRes!.writeHead(statusCode);
  this.appRes!.write(JSON.stringify(message));
  this.appRes!.end();
}
```

**Patterns**:
- `code = undefined` → `200`
- `code = 200` → `200`
- `code = HttpStatusCode.SUCCESS` → `200`
- `code = HttpStatusCode.NOT_FOUND` → `404`

### Advantages

1. **Type Safety**: Typo errors detected at compile time
2. **Autocomplete**: IDEs provide autocomplete for status codes
3. **Readability**: `HttpStatusCode.SUCCESS` is more readable than `200`
4. **Maintainability**: Easy to add new status codes

### Limitations

1. **Only some status codes**: Does not include all RFC 7231
2. **Not extensible by user**: To add, need to modify the framework

### Alternatives

**Allow string literals**:
```typescript
app.finishRequest('200', data);  // Direct number
```

**More status codes**:
```typescript
export const HttpStatusCode = {
  SUCCESS: 200,
  CREATED: 201,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  BAD_REQUEST: 400,      // New
  UNAUTHORIZED: 401,     // New
  FORBIDDEN: 403,        // New
  // ...
} as const;
```

## Usage Patterns in Framework

### SweetPotato.handleRoute()

```typescript
private async handleRoute(): Promise<void> {
  try {
    return await this.executeRequestCycle(...);
  } catch (error) {
    if (error instanceof RouteNotFoundException) {
      return this.finishRequest(HttpStatusCode.NOT_FOUND, {  // 404
        message: (error as Error).message,
      });
    }
    return this.finishRequest(HttpStatusCode.INTERNAL_SERVER_ERROR, {  // 500
      message: (error as Error).message,
    });
  }
}
```

### SweetPotato.finishRequest()

```typescript
finishRequest(code: number | undefined, message: unknown): void {
  const statusCode = code ?? HttpStatusCode.SUCCESS;  // 200
  this.appRes!.writeHead(statusCode);
  this.appRes!.write(JSON.stringify(message));
  this.appRes!.end();
}
```

### Routes.executeRequestCycle()

```typescript
const requestCycleObject: HandlerContext = Object.freeze({
  body,
  params,
  headers,
  queries,
});

return await route.requestCycle.executeRequestCycle(requestCycleObject);
```

**Errors are handled in SweetPotato**, not in Routes.