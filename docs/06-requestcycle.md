# RequestCycle - Handler Executor

## Overview

`RequestCycle` is the class responsible for **executing handlers in sequence**. It is the heart of the middleware/handler pipeline, supporting both synchronous and asynchronous functions.

```typescript
export class RequestCycle {
  private handlers: RouteHandler[];

  constructor(handlers?: RouteHandler[]) {
    this.handlers = handlers ?? [];
  }
}
```

## Data Structure

### Private Attribute

| Attribute | Type | Description |
|----------|------|-----------|
| `handlers` | `RouteHandler[]` | Array of handlers to be executed |

### Handler Type

```typescript
type RouteHandler = (ctx: HandlerContext) => void | Promise<void>;
```

Handlers can be:
- **Synchronous**: `(ctx) => { ... }`
- **Asynchronous**: `async (ctx) => { ... }` or `(ctx) => Promise<void>`

---

## Constructor

```typescript
constructor(handlers?: RouteHandler[]) {
  this.handlers = handlers ?? [];
}
```

**Behavior**:
- If `handlers` provided: initializes with array
- If `handlers` is `undefined`: initializes with empty array

**Common usage**:
```typescript
// Empty (add later)
const cycle = new RequestCycle();

// With initial handlers
const cycle = new RequestCycle([middleware1, middleware2, handler]);
```

---

## add(func)

```typescript
add(func: RouteHandler): void {
  this.handlers.push(func);
}
```

**Responsibility**: Add a handler to the end of the list.

**Usage**:
```typescript
const cycle = new RequestCycle();
cycle.add(middleware1);
cycle.add(middleware2);
cycle.add(handler);
```

**Execution order**: First added → First executed (FIFO)

---

## addMultiples(funcs)

```typescript
addMultiples(funcs: RouteHandler[]): void {
  this.handlers.push(...funcs);
}
```

**Responsibility**: Add multiple handlers at once.

**Usage**:
```typescript
const cycle = new RequestCycle();
cycle.addMultiples([middleware1, middleware2, handler]);
```

**Equivalent to**:
```typescript
funcs.forEach(func => cycle.add(func));
```

---

## executeRequestCycle(data)

```typescript
async executeRequestCycle(data: HandlerContext): Promise<void> {
  for (let i = 0; i < this.handlers.length; i++) {
    const actualHandler = this.handlers[i];
    if (!isPromise(actualHandler)) {
      actualHandler(data);
    } else {
      await actualHandler(data);
    }
  }
}
```

**Responsibility**: Execute all handlers in sequence, detecting if they are async.

### Execution Flow

```
1. Loop over handlers
   │
   ├─→ Handler 1
   │   ├─→ isPromise() check
   │   ├─→ If SYNC: call(ctx)
   │   └─→ If ASYNC: await call(ctx)
   │
   ├─→ Handler 2
   │   └─→ ... same process
   │
   └─→ Handler N
       └─→ ... same process
```

### Async Detection

```typescript
if (!isPromise(actualHandler)) {
  actualHandler(data);  // Synchronous
} else {
  await actualHandler(data);  // Asynchronous
}
```

**How it works**:
1. `isPromise()` checks if handler is async
2. If synchronous: call directly
3. If asynchronous: wait with `await`

### HandlerContext

The same `data` is passed to all handlers:

```typescript
interface HandlerContext {
  body: any;
  params: Record<string, string> | null;
  headers: IncomingHttpHeaders;
  queries: Record<string, string> | null;
}
```

**Behavior**:
- Same object is passed to all handlers
- Object is `Object.freeze()` before being passed (in `Routes.executeRequestCycle()`)
- Handlers **cannot mutate** the context

---

## reset()

```typescript
reset(): void {
  this.handlers = [];
}
```

**Responsibility**: Clear all handlers.

**Usage**:
```typescript
const cycle = new RequestCycle([h1, h2, h3]);
cycle.reset();  // handlers = []
```

**Scenarios**:
- Reusing RequestCycle
- Tests
- Dynamic reconfiguration

---

## getAllHandlers()

```typescript
getAllHandlers(): RouteHandler[] {
  return this.handlers;
}
```

**Responsibility**: Returns copy of handlers array (internal reference).

**Usage**:
```typescript
const cycle = new RequestCycle([h1, h2]);
const allHandlers = cycle.getAllHandlers();
// allHandlers = [h1, h2]
```

**Note**: Returns internal reference (not a copy). Modifications affect internal state.

---

## isPromise() - Async Detection

### Implementation

```typescript
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

### Detection Logic

1. **Check 1**: `typeof fn === 'function' && fn.constructor.name === 'AsyncFunction'`
   - Detects functions declared with `async`
   - Ex: `async function handler(ctx) {}`

2. **Check 2**: `fn instanceof Promise`
   - Detects functions that return `Promise` directly
   - Ex: `(ctx) => new Promise(resolve => ...)`

### Examples

| Handler | isPromise() | Execution |
|---------|-------------|----------|
| `(ctx) => {}` | `false` | Synchronous |
| `async (ctx) => {}` | `true` | Asynchronous (await) |
| `(ctx) => Promise.resolve()` | `true` | Asynchronous (await) |
| `(ctx) => { return new Promise(...) }` | `true` | Asynchronous (await) |
| `(ctx) => { return new Promise(...) }()` | `false` | Synchronous (immediate invocation) |

### Edge Cases

**Async Arrow Function**:
```typescript
const handler = async (ctx) => {};  // isPromise() = true ✅
```

**Async Function Declaration**:
```typescript
async function handler(ctx) {}  // isPromise() = true ✅
```

**Return Promise**:
```typescript
const handler = (ctx) => Promise.resolve();  // isPromise() = true ✅
```

**Synchronous**:
```typescript
const handler = (ctx) => {};  // isPromise() = false ✅
```

---

## Usage Patterns

### Simple Usage

```typescript
const cycle = new RequestCycle();
cycle.add(middleware1);
cycle.add(middleware2);
cycle.add(handler);

await cycle.executeRequestCycle({ body, params, headers, queries });
```

### Usage with Initial Handlers

```typescript
const cycle = new RequestCycle([middleware1, middleware2]);
cycle.add(handler);

await cycle.executeRequestCycle(ctx);
```

### Usage with Mixed Sync/Async

```typescript
const syncMiddleware = (ctx) => {
  console.log('Sync middleware');
  // Does not call finishRequest - continues chain
};

const asyncMiddleware = async (ctx) => {
  await db.query('SELECT 1');
  // Does not call finishRequest - continues chain
};

const handler = (ctx) => {
  app.finishRequest(200, { data: 'ok' });
};

const cycle = new RequestCycle();
cycle.add(syncMiddleware);
cycle.add(asyncMiddleware);
cycle.add(handler);

await cycle.executeRequestCycle(ctx);
```

### Usage with Resource

```typescript
export class Resource extends Routes {
  private _defaultMiddlewares: RouteHandler[] = [];
  
  defaultMiddlewares(...args: RouteHandler[]): this {
    this._defaultMiddlewares.push(...args);
    return this;
  }
  
  private createRequestCycle(sufix: string, httpMethod: string, ...args: RouteHandler[]): void {
    const requestCycle = new RequestCycle();
    requestCycle.addMultiples(args);
    this.createRoute(httpMethod, sufix, requestCycle.getAllHandlers());
  }
}
```

### Usage with Routes

```typescript
export class Routes {
  async executeRequestCycle(path: string, method: string, body: unknown, headers: IncomingHttpHeaders): Promise<void> {
    const routeIndex = this.getRouteIndex(path, method);
    const route = this.routes[routeIndex];
    
    const requestCycleObject: HandlerContext = Object.freeze({
      body,
      params: route.params,
      headers,
      queries: route.queries,
    });
    
    if (route.requestCycle) {
      return await route.requestCycle.executeRequestCycle(requestCycleObject);
    }
  }
}
```

---

## Integration with Routes

### Complete Flow

```
Routes.executeRequestCycle()
  │
  ├─→ Create HandlerContext
  │   └─> Object.freeze({ body, params, headers, queries })
  │
  ├─→ Get RequestCycle from route
  │   └─> route.requestCycle (created in createRoute)
  │
  └─→ Execute RequestCycle
      └─> await cycle.executeRequestCycle(ctx)
          │
          ├─→ Handler 1 (middleware)
          ├─→ Handler 2 (middleware)
          └─→ Handler 3 (route)
              └─> app.finishRequest(200, data)
```

### RequestCycle Creation in createRoute

```typescript
private createRoute(method: string, sufix: string, handlers: RouteHandler[]): void {
  const newRoute: Route = {
    method,
    originalSufix: sufix,
    sufix: buildRoutePath(sufix),
    params: null,
    queries: null,
    requestCycle: new RequestCycle(handlers),  // ← Creation
  };
  
  this.routes.push(newRoute);
}
```

**Each route has its own RequestCycle** with associated handlers.

---

## Middleware Pattern

### Execution Order

```typescript
app.get('/users', m1, m2, handler);

// Routes.createRequestCycle() creates RequestCycle with:
// handlers = [m1, m1, handler]
```

**Execution**:
```
1. m1(ctx) - does not call finishRequest
2. m2(ctx) - does not call finishRequest  
3. handler(ctx) - calls finishRequest
```

### Handler Contract

Each handler must:
- **Synchronous**: Execute logic, don't call `finishRequest` (unless it's the final one)
- **Asynchronous**: `await` operations, don't call `finishRequest` (unless it's the final one)

**Correct Middleware Example**:
```typescript
const authMiddleware = async (ctx) => {
  const user = await authenticate(ctx.headers.authorization);
  if (!user) {
    app.finishRequest(401, { error: 'Unauthorized' });
    return;  // ← Important: stop chain
  }
  // Does not call finishRequest - continues chain
};
```

**Final Handler Example**:
```typescript
const getHandler = (ctx) => {
  app.finishRequest(200, { users: [] });  // ← Calls finishRequest
};
```

---

## Errors and Handling

### Error in Handler

```typescript
// Handler that throws error
const badHandler = (ctx) => {
  throw new Error('Something went wrong');
};

// Falls into SweetPotato.handleRoute() catch
try {
  return await this.executeRequestCycle(...);
} catch (error) {
  return this.finishRequest(HttpStatusCode.INTERNAL_SERVER_ERROR, {
    message: (error as Error).message,
  });
}
```

**Behavior**:
- Error in any handler → 500
- Error in middleware → 500
- Error in final handler → 500

### Handler already called finishRequest

```typescript
// Handler that calls finishRequest
const badMiddleware = (ctx) => {
  app.finishRequest(200, { data: 'ok' });
  // Continue in chain - but response already sent
};

// Next handler tries to call finishRequest
const nextHandler = (ctx) => {
  app.finishRequest(200, { data: 'ok' });  // [ERR_HTTP_HEADERS_SENT]
};
```

**Prevention in SweetPotato**:
```typescript
finishRequest(code: number | undefined, message: unknown): void {
  try {
    this.appRes!.writeHead(statusCode);
    this.appRes!.write(JSON.stringify(message));
    this.appRes!.end();
  } catch {
    // Fallback for [ERR_HTTP_HEADERS_SENT]
    this.appRes!.write(JSON.stringify(message));
    this.appRes!.end();
  }
}
```

---

## Responsibility Summary

| Responsibility | Methods |
|-----------------|---------|
| Store handlers | `constructor()`, `add()`, `addMultiples()` |
| Execute handlers | `executeRequestCycle()` |
| Clear handlers | `reset()` |
| Inspection | `getAllHandlers()` |
| Detect async | `isPromise()` |

---

## Design Patterns

| Pattern | Implementation |
|--------|---------------|
| **Chain of Responsibility** | Chained handlers, each decides if continues |
| **Strategy** | Handlers can vary dynamically |
| **Template Method** | `executeRequestCycle()` defines structure, handlers define logic |

---

## Performance Considerations

### Loop vs forEach

**Used**:
```typescript
for (let i = 0; i < this.handlers.length; i++) {
  const actualHandler = this.handlers[i];
  // ...
}
```

**Alternative**:
```typescript
this.handlers.forEach(async (actualHandler) => {
  await actualHandler(data);
});
```

**Why loop?**:
- Need for `await` on each handler
- `forEach` with `async` doesn't wait
- `for...of` could be used, but classic loop is more performant

### Array Operations

- `add()`: `push()` - O(1)
- `addMultiples()`: `push(...)` - O(n)
- `reset()`: `[]` - O(1)
- `getAllHandlers()`: return `handlers` - O(1)

---

## Known Errors and Prevention

### [ERR_HTTP_HEADERS_SENT]

**Cause**: Trying to write headers after already done

**Prevention**: try-catch in `finishRequest()`

### Async Handler not awaited

**Cause**: Async handler without `await`

**Prevention**: `isPromise()` detects and awaits with `await`

### Handler already finished response

**Cause**: Handler calls `finishRequest()` and next also tries

**Prevention**: `writableEnded` check in SweetPotato

---

## Technical Summary

|Aspect | Implementation |
|--------|---------------|
| **Execution Order** | FIFO (sequential) |
| **Async Detection** | `isPromise()` with constructor.name check |
| **Error Handling** | Try-catch in SweetPotato |
| **Context Immutability** | `Object.freeze()` in Routes |
| **Handler Type** | `(ctx) => void \| Promise<void>` |

**Complexity**:
- Execution: O(n) where n = number of handlers
- Memory: O(n) to store handlers
- Time per handler: O(1) + handler's own time