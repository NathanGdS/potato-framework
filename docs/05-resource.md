# Resource - DSL for Resource Definition

## Overview

`Resource` is a class that extends `Routes` and provides a **Fluent API** for RESTful resource definition. It simplifies creating multiple routes for the same resource.

```typescript
export class Resource extends Routes {
  private sufix: string = '';
  private _defaultMiddlewares: RouteHandler[] = [];
}
```

## Data Structure

### Private Attributes

| Attribute | Type | Description |
|----------|------|-----------|
| `sufix` | `string` | Base suffix for handler definition (ex: `"message"`) |
| `_defaultMiddlewares` | `RouteHandler[]` | Default middlewares for all resource handlers |

---

## resource(sufix)

```typescript
resource(sufix: string): this {
  this.sufix = sufix;
  return this;
}
```

**Responsibility**: Defines the base suffix that will be used by all subsequent `defineHandler()` calls.

**Usage**:
```typescript
app.resource("message")
  .defineHandler(...)
  .defineHandler(...);
```

**Expansion**:
- Suffix: `"message"`
- Handlers will be registered at: `/message`

**Returns**: `this` (for chainable API)

---

## defineHandler(input, ...args)

```typescript
defineHandler(input: DefineHandlerInput, ...args: RouteHandler[]): this {
  const parsedMethod = HttpMethod[input.method];
  if (!parsedMethod) {
    throw new Error('Invalid method');
  }

  let sufix = this.sufix;

  if (input.sufix) {
    sufix += '/' + input.sufix;  // Add specific suffix
  }

  const middlewares: RouteHandler[] = [...args, ...this._defaultMiddlewares];
  this[input.method.toLowerCase() as 'get' | 'post' | 'patch' | 'put' | 'delete'](
    sufix,
    ...middlewares
  );
  return this;
}
```

**Responsibility**: Defines a handler for a specific HTTP method, with optional suffix.

### DefineHandlerInput

```typescript
interface DefineHandlerInput {
  method: keyof typeof HttpMethod;  // GET, POST, PUT, PATCH, DELETE
  sufix?: string;                   // Optional suffix (ex: ":id")
}
```

### Expansion Logic

| Call | Base Suffix | input.sufix | Final Route |
|---------|-------------|-------------|------------|
| `defineHandler({method: POST})` | `"message"` | `undefined` | `/message` |
| `defineHandler({method: GET, sufix: ":id"})` | `"message"` | `":id"` | `/message/:id` |
| `defineHandler({method: GET, sufix: "list"})` | `"message"` | `"list"` | `/message/list` |

### Combined Middlewares

```typescript
const middlewares: RouteHandler[] = [...args, ...this._defaultMiddlewares];
```

1. First: middlewares passed in `defineHandler()`
2. Then: default middlewares of the resource (via `defaultMiddlewares()`)

**Example**:
```typescript
app.resource("message")
  .defaultMiddlewares(logMiddleware)  // Add logging
  .defineHandler({method: GET}, authMiddleware, handler);
   
// Execution order:
// 1. authMiddleware (passed in defineHandler)
// 2. logMiddleware (defaultMiddlewares)
// 3. handler
```

### Dynamic HTTP Method Call

```typescript
this[input.method.toLowerCase() as 'get' | 'post' | 'patch' | 'put' | 'delete'](
  sufix,
  ...middlewares
);
```

Converts enum to lowercase and calls the corresponding method:
- `HttpMethod.GET` → `"get"` → `this.get()`
- `HttpMethod.POST` → `"post"` → `this.post()`
- etc.

---

## defaultMiddlewares(...args)

```typescript
defaultMiddlewares(...args: RouteHandler[]): this {
  this._defaultMiddlewares.push(...args);
  return this;
}
```

**Responsibility**: Adds middlewares that will be applied to all handlers of this resource.

**Usage**:
```typescript
app.resource("message")
  .defaultMiddlewares(authMiddleware, logMiddleware)
  .defineHandler({method: GET}, handler1)
  .defineHandler({method: POST}, handler2);
```

**Behavior**:
- Middlewares are stored in `_defaultMiddlewares`
- They are executed after specific middlewares, before the handler
- Returns `this` for chainable API

---

## Interaction with Routes

### Inheritance

```typescript
export class Resource extends Routes {
  // ...
}
```

`Resource` inherits all methods from `Routes`:
- `get(sufix, ...handlers)`
- `post(sufix, ...handlers)`
- `put(sufix, ...handlers)`
- `patch(sufix, ...handlers)`
- `delete(sufix, ...handlers)`
- `registerGlobalPrefix(prefix)`
- `executeRequestCycle(...)`

### Method Redefinition

`Resource` does not redefine methods from `Routes`. It **adds abstractions** over them.

**Call Flow**:
```
Resource.defineHandler()
  ↓
Resource.get/post/patch/put/delete()
  ↓
Routes.createRequestCycle()
  ↓
Routes.createRoute()
  ↓
Routes.routes.push()
```

---

## Usage Patterns

### Simple Resource

```typescript
app.resource("message")
  .defineHandler({ method: HttpMethod.GET }, listHandler)
  .defineHandler({ method: HttpMethod.POST }, createHandler);
```

**Results in**:
- `GET /message` → `listHandler`
- `POST /message` → `createHandler`

### Resource with Parameters

```typescript
app.resource("message")
  .defineHandler({ method: HttpMethod.GET, sufix: ":id" }, getHandler)
  .defineHandler({ method: HttpMethod.PUT, sufix: ":id" }, updateHandler)
  .defineHandler({ method: HttpMethod.DELETE, sufix: ":id" }, deleteHandler);
```

**Results in**:
- `GET /message/:id` → `getHandler`
- `PUT /message/:id` → `updateHandler`
- `DELETE /message/:id` → `deleteHandler`

### Resource with Default Middlewares

```typescript
app.resource("message")
  .defaultMiddlewares(authMiddleware, logMiddleware)
  .defineHandler({ method: HttpMethod.GET }, listHandler)
  .defineHandler({ method: HttpMethod.POST }, createHandler);
```

**Execution order**:
1. `authMiddleware`
2. `logMiddleware`
3. `listHandler` / `createHandler`

### Resource with Global Prefix

```typescript
app.registerGlobalPrefix('api/v1');

app.resource("message")
  .defineHandler({ method: HttpMethod.GET }, listHandler);
```

**Resulting route**: `GET /api/v1/message`

### Complete Resource (CRUD)

```typescript
app.resource("message")
  .defaultMiddlewares(authMiddleware, logMiddleware)
  .defineHandler({ method: HttpMethod.GET, sufix: ":id" }, getHandler)
  .defineHandler({ method: HttpMethod.GET }, listHandler)
  .defineHandler({ method: HttpMethod.POST }, createHandler)
  .defineHandler({ method: HttpMethod.PUT, sufix: ":id" }, updateHandler)
  .defineHandler({ method: HttpMethod.DELETE, sufix: ":id" }, deleteHandler);
```

**Results in**:

| Method | Route | Handler |
|--------|------|---------|
| GET | `/message/:id` | `getHandler` |
| GET | `/message` | `listHandler` |
| POST | `/message` | `createHandler` |
| PUT | `/message/:id` | `updateHandler` |
| DELETE | `/message/:id` | `deleteHandler` |

---

## Comparison: Direct vs Resource

### Without Resource (Direct)

```typescript
app.get("/message", listHandler);
app.post("/message", createHandler);
app.get("/message/:id", getHandler);
app.put("/message/:id", updateHandler);
app.delete("/message/:id", deleteHandler);
```

**Problems**:
- Repetition of `/message` prefix
- Difficult to add global middlewares to resource
- Less expressive about intention (RESTful resource)

### With Resource

```typescript
app.resource("message")
  .defaultMiddlewares(authMiddleware)
  .defineHandler({ method: HttpMethod.GET, sufix: ":id" }, getHandler)
  .defineHandler({ method: HttpMethod.GET }, listHandler)
  .defineHandler({ method: HttpMethod.POST }, createHandler)
  .defineHandler({ method: HttpMethod.PUT, sufix: ":id" }, updateHandler)
  .defineHandler({ method: HttpMethod.DELETE, sufix: ":id" }, deleteHandler);
```

**Advantages**:
- Prefix defined once
- Easy to add middlewares
- More expressive and declarative

---

## Integration with Routes

### Inherited methods that work with Resource

Since `Resource` extends `Routes`, all `Routes` methods are available:

```typescript
const r = new Resource();

// Direct methods still work
r.get('/users', handler);

// More common: use the Resource DSL
r.resource("users")
  .defineHandler({ method: HttpMethod.GET }, listHandler);
```

### Access to routes array

```typescript
const r = new Resource();
r.get('/users', handler);

const routes = r.getRoutes();  // [{ method: "GET", sufix: /users, ... }]
```

### Register global prefix

```typescript
const r = new Resource();
r.registerGlobalPrefix('api/v1');

r.get('/users', handler);  // Route: /api/v1/users
```

---

## Errors and Handling

### Invalid Method

```typescript
const parsedMethod = HttpMethod[input.method];
if (!parsedMethod) {
  throw new Error('Invalid method');
}
```

**Fires when**:
- `input.method` is not one of the valid HTTP methods

**Correct**:
```typescript
defineHandler({ method: HttpMethod.GET }, handler)  // ✅
```

**Incorrect**:
```typescript
defineHandler({ method: "INVALID" }, handler)  // ❌ Error
```

---

## Fluent API Design

### Chainable Methods

All `Resource` methods return `this`:

```typescript
resource(sufix: string): this
defineHandler(input, ...args): this
defaultMiddlewares(...args): this
```

**Allows**:
```typescript
app.resource("message")
  .defaultMiddlewares(m1)
  .defineHandler({method: GET}, h1)
  .defaultMiddlewares(m2)  // Can call again
  .defineHandler({method: POST}, h2);
```

### Method Chaining with Routes

```typescript
app.resource("message")
  .defineHandler({ method: HttpMethod.GET }, handler);

// Can continue with Routes methods
app.registerGlobalPrefix("/api");  // Continue chain
```

---

## Performance Considerations

### Middlewares Array

Each `defaultMiddlewares()` call adds to the array:
```typescript
this._defaultMiddlewares.push(...args);
```

**Impact**:
- Array grows with each call
- Copied in each `defineHandler()`: `[...args, ...this._defaultMiddlewares]`

**Possible optimization**:
- Use reference instead of copy
- Validate inputs before creating array

---

## Responsibility Summary

| Responsibility | Methods |
|-----------------|---------|
| Define base suffix | `resource()` |
| Define handlers | `defineHandler()` |
| Add default middlewares | `defaultMiddlewares()` |

**Usage Pattern**: Fluent DSL for RESTful resource definition

**Integration**: Extends `Routes`, uses its methods internally