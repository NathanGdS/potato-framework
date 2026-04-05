# HttpMethod - HTTP Method Constants

## Overview

`HttpMethod` is a constant object that defines the **HTTP methods supported** by the framework. It provides type safety and prevents typos when defining routes.

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

## Structure

### Method Objects

| Key | Value | Description |
|-------|-------|-----------|
| `GET` | `"GET"` | GET method - read resources |
| `POST` | `"POST"` | POST method - create resources |
| `PATCH` | `"PATCH"` | PATCH method - partial updates |
| `PUT` | `"PUT"` | PUT method - full updates |
| `DELETE` | `"DELETE"` | DELETE method - delete resources |

### Type Alias

```typescript
export type HttpMethod = (typeof HttpMethod)[keyof typeof HttpMethod];
```

**Resolution**:
```typescript
typeof HttpMethod = {
  GET: "GET",
  POST: "POST",
  PATCH: "PATCH",
  PUT: "PUT",
  DELETE: "DELETE",
}

keyof typeof HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE"

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE"
```

## Usage in Framework

### In Routes

```typescript
// Routes.ts
export class Routes {
  get(sufix: string, ...args: RouteHandler[]): void {
    this.createRequestCycle(sufix, HttpMethod.GET, ...args);
  }

  post(sufix: string, ...args: RouteHandler[]): void {
    this.createRequestCycle(sufix, HttpMethod.POST, ...args);
  }

  patch(sufix: string, ...args: RouteHandler[]): void {
    this.createRequestCycle(sufix, HttpMethod.PATCH, ...args);
  }

  put(sufix: string, ...args: RouteHandler[]): void {
    this.createRequestCycle(sufix, HttpMethod.PUT, ...args);
  }

  delete(sufix: string, ...args: RouteHandler[]): void {
    this.createRequestCycle(sufix, HttpMethod.DELETE, ...args);
  }
}
```

### In Resource

```typescript
// Resource.ts
export class Resource extends Routes {
  defineHandler(input: DefineHandlerInput, ...args: RouteHandler[]): this {
    const parsedMethod = HttpMethod[input.method];
    if (!parsedMethod) {
      throw new Error('Invalid method');
    }

    let sufix = this.sufix;
    if (input.sufix) {
      sufix += '/' + input.sufix;
    }

    const middlewares: RouteHandler[] = [...args, ...this._defaultMiddlewares];
    this[input.method.toLowerCase() as 'get' | 'post' | 'patch' | 'put' | 'delete'](
      sufix,
      ...middlewares
    );
    return this;
  }
}
```

### DefineHandlerInput

```typescript
interface DefineHandlerInput {
  method: keyof typeof HttpMethod;  // "GET" | "POST" | "PATCH" | "PUT" | "DELETE"
  sufix?: string;
}
```

**Usage**:
```typescript
app.resource("message")
  .defineHandler({ method: HttpMethod.GET, sufix: ":id" }, handler)
  .defineHandler({ method: HttpMethod.POST }, handler);
```

## Usage in Examples

### Direct Route

```typescript
import { SweetPotatoApp, HttpMethod } from '../SweetPotatoApp.mjs';

const app = SweetPotatoApp();

app.get('/users', listHandler);
app.post('/users', createHandler);
app.put('/users/:id', updateHandler);
app.patch('/users/:id', patchHandler);
app.delete('/users/:id', deleteHandler);

app.listen(8000);
```

### Resource DSL

```typescript
import { SweetPotatoApp, HttpMethod } from '../SweetPotatoApp.mjs';

const app = SweetPotatoApp();

app.resource("message")
  .defaultMiddlewares(authMiddleware)
  .defineHandler({ method: HttpMethod.GET, sufix: ":id" }, getHandler)
  .defineHandler({ method: HttpMethod.GET }, listHandler)
  .defineHandler({ method: HttpMethod.POST }, createHandler)
  .defineHandler({ method: HttpMethod.PUT, sufix: ":id" }, updateHandler)
  .defineHandler({ method: HttpMethod.DELETE, sufix: ":id" }, deleteHandler);

app.listen(8000);
```

## Advantages of Using Constants

### Type Safety

**With constant**:
```typescript
app.get('/users', handler);  // ✅ Safe
app.post('/users', handler); // ✅ Safe
```

**Without constant (string literal)**:
```typescript
app.get('/users', handler);
app.postst('/users', handler); // ❌ Typo goes unnoticed
```

### Autocomplete

IDEs can provide autocomplete:
```typescript
app.get('/users', handler);
app.post('/users', handler);
app.put('/users', handler);     // Autocomplete available
app.patch('/users', handler);
app.delete('/users', handler);
```

### Safe Refactoring

If an HTTP method is removed or renamed:
```typescript
// Before
const HttpMethod = {
  GET: "GET",
  POST: "POST",
};

// After
const HttpMethod = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",  // New method
};
```

All usages are verified by TypeScript.

## Comparison with Other Frameworks

### Express.js

```javascript
// Express - string literals
app.get('/users', handler);
app.post('/users', handler);
app.put('/users', handler);

// Potato - with constants
app.get('/users', handler);
app.post('/users', handler);
app.put('/users', handler);
```

### Fastify

```javascript
// Fastify - string literals
app.get('/users', handler);
app.post('/users', handler);
app.put('/users', handler);

// Potato - with constants
app.get('/users', handler);
app.post('/users', handler);
app.put('/users', handler);
```

## Available Types

### HttpMethodType (exported for external use)

```typescript
export type { HttpMethod as HttpMethodType } from './constants/index.js';
```

**User usage**:
```typescript
import type { HttpMethodType } from './package/index.mjs';

const method: HttpMethodType = 'GET';  // Type checked
```

### HttpStatusCodeType

```typescript
export type { HttpStatusCode as HttpStatusCodeType } from './constants/index.js';
```

**User usage**:
```typescript
import type { HttpStatusCodeType } from './package/index.mjs';

const status: HttpStatusCodeType = 200;  // Type checked
```

## Complete HTTP Methods

### GET

**Purpose**: Retrieve information
**Body**: Should not have
**Idempotent**: Yes
**Cacheable**: Yes

```typescript
app.get('/users/:id', (ctx) => {
  const userId = ctx.params?.id;
  app.finishRequest(200, { id: userId });
});
```

### POST

**Purpose**: Create new resource
**Body**: Optional (usually has)
**Idempotent**: No
**Cacheable**: No

```typescript
app.post('/users', (ctx) => {
  const userData = ctx.body;
  app.finishRequest(201, { id: 1, ...userData });
});
```

### PUT

**Purpose**: Full resource update
**Body**: Required
**Idempotent**: Yes
**Cacheable**: No

```typescript
app.put('/users/:id', (ctx) => {
  const userId = ctx.params?.id;
  const userData = ctx.body;
  app.finishRequest(200, { id: userId, ...userData });
});
```

### PATCH

**Purpose**: Partial update
**Body**: Optional (usually has)
**Idempotent**: No (but can be)
**Cacheable**: No

```typescript
app.patch('/users/:id', (ctx) => {
  const userId = ctx.params?.id;
  const updates = ctx.body;
  app.finishRequest(200, { id: userId, ...updates });
});
```

### DELETE

**Purpose**: Delete resource
**Body**: Should not have
**Idempotent**: Yes
**Cacheable**: No

```typescript
app.delete('/users/:id', (ctx) => {
  const userId = ctx.params?.id;
  app.finishRequest(204, null);  // No content
});
```

## Usage Patterns

### Direct Usage in Routes

```typescript
import { SweetPotato, HttpMethod } from '../SweetPotato.mjs';

const app = new SweetPotato();

app.get('/users', handler);  // Not using HttpMethod explicitly
app.post('/users', handler);

app.listen(8000);
```

### Usage with Resource DSL

```typescript
import { SweetPotato, HttpMethod } from '../SweetPotato.mjs';

const app = new SweetPotato();

app.resource("users")
  .defineHandler({ method: HttpMethod.GET }, listHandler)
  .defineHandler({ method: HttpMethod.POST }, createHandler)
  .defineHandler({ method: HttpMethod.GET, sufix: ":id" }, getHandler)
  .defineHandler({ method: HttpMethod.PUT, sufix: ":id" }, updateHandler)
  .defineHandler({ method: HttpMethod.DELETE, sufix: ":id" }, deleteHandler);

app.listen(8000);
```

### Method Verification

```typescript
// In middleware
const methodCheckMiddleware: RouteHandler = (ctx) => {
  const method = ctx.headers[':method'];
  
  if (method === HttpMethod.POST) {
    // POST-specific logic
  }
  
  if (method === HttpMethod.GET) {
    // GET-specific logic
  }
};
```

## Error Handling

### Invalid Method

```typescript
defineHandler(input: DefineHandlerInput, ...args: RouteHandler[]): this {
  const parsedMethod = HttpMethod[input.method];
  if (!parsedMethod) {
    throw new Error('Invalid method');  // ← Error thrown here
  }
  // ...
}
```

**Fires when**:
```typescript
app.resource("users")
  .defineHandler({ method: "INVALID" as any }, handler);  // Error: Invalid method
```

**Correct**:
```typescript
app.resource("users")
  .defineHandler({ method: HttpMethod.GET }, handler);  // ✅
```

## Summary

| Aspect | Implementation |
|--------|---------------|
| **Type** | Object with `as const` |
| **Keys** | `GET`, `POST`, `PATCH`, `PUT`, `DELETE` |
| **Values** | `"GET"`, `"POST"`, `"PATCH"`, `"PUT"`, `"DELETE"` |
| **Type** | `"GET" \| "POST" \| "PATCH" \| "PUT" \| "DELETE"` |

### Export

```typescript
// constants/index.ts
export { HttpMethod } from "./HttpMethod.constants.js";
export type { HttpMethod as HttpMethodType } from "./HttpMethod.constants.js";
```

### Import

```typescript
// In user code
import { HttpMethod } from './package/index.mjs';

// Usage
app.get('/users', handler);
app.post('/users', handler);
```

### Advantages

1. **Type Safety**: Typo errors detected at compile time
2. **Autocomplete**: IDEs provide autocomplete for methods
3. **Refactoring**: Changes in methods are tracked by TypeScript
4. **Consistency**: All methods use the same constant

### Limitations

1. **Only common methods**: Does not include methods like `HEAD`, `OPTIONS`, `TRACE`
2. **Not extensible**: To add new methods, need to modify the framework

### Extensibility

If needed to add new methods:
```typescript
// Potential expansion
const HttpMethod = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  PATCH: "PATCH",
  DELETE: "DELETE",
  HEAD: "HEAD",   // New
  OPTIONS: "OPTIONS",  // New
} as const;
```

Or allow direct string literals:
```typescript
app.custom('WEBHOOK', '/webhook', handler);  // Custom method