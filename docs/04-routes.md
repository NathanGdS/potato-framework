# Routes - Routing Engine

## Overview

`Routes` is the routing engine of the framework. It stores all routes, performs matching between request and route, and executes the handler pipeline.

```typescript
interface Route {
  method: string;
  originalSufix: string;
  sufix: RegExp;
  params: Record<string, string> | null;
  queries: Record<string, string> | null;
  requestCycle: RequestCycle;
}

export class Routes {
  private routes: Route[] = [];
  private globalPrefix: string | undefined;
  private alias = 'RouteHandler';
}
```

## Data Structure

### Route Interface

| Field | Type | Description |
|-------|------|-----------|
| `method` | `string` | HTTP method (GET, POST, etc.) |
| `originalSufix` | `string` | Original path (ex: `/users/:id`) |
| `sufix` | `RegExp` | Compiled regex for matching |
| `params` | `Record<string, string> \| null` | Parameters extracted from path |
| `queries` | `Record<string, string> \| null` | Query parameters |
| `requestCycle` | `RequestCycle` | Handlers associated with route |

### Routes State

| Attribute | Type | Description |
|----------|------|-----------|
| `routes` | `Route[]` | Array of all registered routes |
| `globalPrefix` | `string \| undefined` | Global prefix (ex: `/api/v1`) |
| `alias` | `string` | Name for logs (default: `RouteHandler`) |

---

## Route Registration Methods

### get(sufix, ...handlers)

```typescript
get(sufix: string, ...args: RouteHandler[]): void {
  this.createRequestCycle(sufix, HttpMethod.GET, ...args);
}
```

### post(sufix, ...handlers)

```typescript
post(sufix: string, ...args: RouteHandler[]): void {
  this.createRequestCycle(sufix, HttpMethod.POST, ...args);
}
```

### put(sufix, ...handlers)

```typescript
put(sufix: string, ...args: RouteHandler[]): void {
  this.createRequestCycle(sufix, HttpMethod.PUT, ...args);
}
```

### patch(sufix, ...handlers)

```typescript
patch(sufix: string, ...args: RouteHandler[]): void {
  this.createRequestCycle(sufix, HttpMethod.PATCH, ...args);
}
```

### delete(sufix, ...handlers)

```typescript
delete(sufix: string, ...args: RouteHandler[]): void {
  this.createRequestCycle(sufix, HttpMethod.DELETE, ...args);
}
```

**Pattern**: All HTTP methods use `createRequestCycle()` internally.

---

## createRequestCycle(sufix, httpMethod, ...args)

```typescript
private createRequestCycle(sufix: string, httpMethod: string, ...args: RouteHandler[]): void {
  const requestCycle = new RequestCycle();
  requestCycle.addMultiples(args);                     // Add handlers
  this.createRoute(httpMethod, sufix, requestCycle.getAllHandlers());
}
```

**Steps**:
1. Creates new `RequestCycle`
2. Adds all handlers
3. Calls `createRoute()` to create the route

---

## createRoute(method, sufix, handlers)

```typescript
private createRoute(method: string, sufix: string, handlers: RouteHandler[]): void {
  if (sufix.at(0) !== '/') {
    sufix = '/' + sufix;                               // Ensure / prefix
  }
  sufix = (this.globalPrefix ?? '') + sufix;           // Add global prefix

  const newRoute: Route = {
    method,
    originalSufix: sufix,
    sufix: buildRoutePath(sufix),                      // Compile regex
    params: null,
    queries: null,
    requestCycle: new RequestCycle(handlers),         // Create cycle with handlers
  };
  
  LoggerInstance().registerRoute(newRoute.method, newRoute.originalSufix, this.alias);
  this.routes.push(newRoute);                          // Add to array
}
```

**Steps**:
1. Normalize suffix (add `/` if needed)
2. Add global prefix (ex: `/api/v1`)
3. Compile regex with `buildRoutePath()`
4. Create route
5. Register log
6. Add to routes array

### buildRoutePath() - Regex Compilation

```typescript
export function buildRoutePath(path: string): RegExp {
  const routeParametersRegex = /:([a-zA-Z]+)/g;        // :id, :userId, etc.
  const params = path.replaceAll(routeParametersRegex, '(?<$1>[a-z0-9\\-_]+)');
  
  const queryRegex = new RegExp(`^${params}(?<query>\\?(.*))?$`);
  return queryRegex;
}
```

**Compilation Examples**:

| Original Path | Resulting Regex |
|---------------|------------------|
| `/users` | `^/users(?<query>\?.*)?$` |
| `/users/:id` | `^/users/(?<$1>[a-z0-9\\-_]+)(?<query>\?.*)?$` |
| `/users/:userId/posts/:postId` | `^/users/(?<$1>[a-z0-9\\-_]+)/(?<posts>[a-z0-9\\-_]+)(?<query>\?.*)?$` |

**Named Groups**:
- `(?<id>[a-z0-9\\-_]+)` - captures `:id` as named group `id`
- `(?<query>\\?.*)` - captures query string as named group `query`

---

## registerGlobalPrefix(prefix)

```typescript
registerGlobalPrefix(prefix: string): void {
  if (!prefix) return;

  if (prefix.at(0) !== '/') {
    prefix = '/' + prefix;
  }

  LoggerInstance().registerPrefix(prefix, this.alias);
  this.globalPrefix = prefix;
}
```

**Behavior**:
- If prefix doesn't start with `/`, adds it
- Registers log
- Stores prefix

**Example**:
```typescript
app.registerGlobalPrefix('api/v1');  // Prefix: "/api/v1"

// Route: app.get('/users', handler)
// Result: "/api/v1/users"
```

---

## executeRequestCycle(path, method, body, headers)

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

  if (route.requestCycle) {
    return await route.requestCycle.executeRequestCycle(requestCycleObject);
  }
  throw new Error('Error in request life cycle request');
}
```

**Flow**:
1. Finds route index with `getRouteIndex()`
2. If not found: throws `RouteNotFoundException`
3. Extracts params and queries from found route
4. Creates frozen `HandlerContext` (`Object.freeze`)
5. Executes `RequestCycle.execute()`

---

## getRouteIndex(path, method)

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

1. **Execute regex**:
   ```javascript
   e.sufix.exec(path)  // Ex: /^/users/(?<id>[a-z0-9\-_]+)(?<query>\?.*)?$/.exec("/users/123")
   ```

2. **Check method**:
   ```javascript
   if (e.method !== method) return false;
   ```

3. **Check exact path**:
   ```javascript
   if (regexVerifier.find((t) => t === path))  // Confirm full match
   ```

4. **Extract parameters**:
   ```javascript
   e.params = getRouteParams(regexVerifier.groups);
   e.queries = getQueries(regexVerifier.groups?.['query']);
   ```

### getRouteParams(groups)

```typescript
export function getRouteParams(
  groups: Record<string, string>
): Record<string, string> | null {
  const { query: _query, ...others } = groups;  // Remove 'query' group
  if (Object.keys(others).length === 0) return {};
  return others;
}
```

**Example**:
```javascript
// Regex: /^/users/(?<id>[a-z0-9\-_]+)(?<query>\?.*)?$/
// Path: "/users/123"
// groups: { id: "123", query: undefined }

// Result: { id: "123" }
```

### getQueries(query)

```typescript
export function getQueries(query: string | undefined | null): Record<string, string> | null {
  if (!query) return null;
  return query.substring(1).split('&').reduce<Record<string, string>>((data, item) => {
    const [param, value] = item.split('=');
    data[param] = value;
    return data;
  }, {});
}
```

**Example**:
```javascript
// Input: "?foo=bar&baz=qux"
// Result: { foo: "bar", baz: "qux" }
```

---

## registerRoutes(routes)

```typescript
registerRoutes(routes: Route[]): void {
  routes.forEach((e) => {
    this.routes.push(e);
  });
}
```

Allows registering multiple routes at once. Useful for:
- Loading routes from external file
- Importing routes from another module

---

## getRoutes()

```typescript
getRoutes(): Route[] {
  return this.routes;
}
```

Returns all registered routes. Useful for:
- Logs
- Debugging
- Inspection middleware

---

## Responsibility Summary

| Responsibility | Methods |
|-----------------|---------|
| Route registration | `get()`, `post()`, `put()`, `patch()`, `delete()` |
| Route creation | `createRoute()`, `createRequestCycle()` |
| Route matching | `getRouteIndex()`, `executeRequestCycle()` |
| Parameter extraction | `getRouteParams()`, `getQueries()` |
| Global prefix | `registerGlobalPrefix()` |
| Inspection | `getRoutes()`, `registerRoutes()` |

---

## Usage Patterns

### Simple Route

```typescript
app.get('/users', (ctx) => {
  // ctx.body, ctx.params, ctx.headers, ctx.queries
  app.finishRequest(200, { users: [] });
});
```

### Route with Parameter

```typescript
app.get('/users/:id', (ctx) => {
  ctx.params;  // { id: "123" }
  app.finishRequest(200, { user: {} });
});
```

### Route with Query String

```typescript
app.get('/users', (ctx) => {
  ctx.queries;  // { page: "1", limit: "10" }
  app.finishRequest(200, { users: [] });
});
```

### Global Prefix

```typescript
app.registerGlobalPrefix('api/v1');

app.get('/users', handler);  // Route: /api/v1/users
```

### Multiple Handlers (Middleware)

```typescript
app.get('/users', authMiddleware, logMiddleware, (ctx) => {
  app.finishRequest(200, { users: [] });
});
```

---

## Errors and Handling

### RouteNotFoundException

**Cause**: No route matches path + method

**Thrown in**: `executeRequestCycle()` when `getRouteIndex()` returns `-1`

**Handling in `SweetPotato`**:
```typescript
try {
  return await this.executeRequestCycle(...);
} catch (error) {
  if (error instanceof RouteNotFoundException) {
    return this.finishRequest(HttpStatusCode.NOT_FOUND, {
      message: (error as Error).message,
    });
  }
  // ...
}
```

---

## Performance Considerations

### Regex Compilation

Each route has its regex compiled once in `createRoute()`:
```typescript
sufix: buildRoutePath(sufix)  // Compiled once
```

The regex is reused in `getRouteIndex()` for each request:
```typescript
e.sufix.exec(path)  // Execute compiled regex
```

### Array.findIndex

Linear search in routes array has O(n) complexity:
```typescript
this.routes.findIndex(...)  // O(n) where n = number of routes
```

For large number of routes, consider:
- Route trie
- Map by HTTP method

---

## Technical Summary

|Aspect | Implementation |
|--------|---------------|
| **Match Algorithm** | Regex exec with named groups |
| **Params Extraction** | Object destructuring + filtering |
| **Query Parsing** | String split + reduce |
| **Storage** | Array of objects |
| **Search** | Linear search (findIndex) |
| **Global Prefix** | String concatenation |

**Complexity**:
- Registration: O(1) per route
- Matching: O(n × m) where n=routes, m=path length
- Memory: O(n) to store routes