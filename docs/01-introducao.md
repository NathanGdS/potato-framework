# Introduction to Potato Framework

## Overview

Potato Framework is a **lightweight HTTP server framework** for Node.js, designed with the following principles:

- **Zero external dependencies** - Uses only native `http` module
- **Pure ES Modules** - No build steps or transpilation
- **Simplicity** - Small code, easy to understand and debug
- **TypeScript-first** - Written in TypeScript, distributed as ES Modules

## Architecture

### Class Structure

```
┌─────────────────────────────────────────────────────────────┐
│                     SweetPotato (Server)                    │
│  - Creates HTTP server                                      │
│  - Manages request/response                                 │
│  - Extends Resource                                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ extends
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                       Resource (DSL)                        │
│  - Fluent API for route definition                          │
│  - Supports .get(), .post(), .put(), .patch(), .delete()   │
│  - Supports Resource DSL                                    │
│  - Extends Routes                                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ extends
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                        Routes (Engine)                      │
│  - Stores all routes                                        │
│  - Matches request to route                                 │
│  - Executes RequestCycle                                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ uses
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    RequestCycle (Executor)                 │
│  - Executes handlers in sequence                           │
│  - Detects and waits for async handlers                    │
│  - Manages middlewares                                      │
└─────────────────────────────────────────────────────────────┘
```

### Class Responsibilities

| Class | Responsibility |
|--------|-----------------|
| `SweetPotato` | Main server class - creates HTTP server, manages request/response lifecycle |
| `Resource` | Fluent DSL - route definition with HTTP methods and resources |
| `Routes` | Routing engine - stores routes, matches, executes handlers |
| `RequestCycle` | Executor - executes handlers/middlewares in sequence |

## Design Philosophy

### 1. Handler Contract

All handlers (middlewares and routes) follow the same contract:

```typescript
type RouteHandler = (ctx: HandlerContext) => void | Promise<void>;
```

The context passed to each handler is **immutable** (`Object.freeze`):

```typescript
interface HandlerContext {
  body: any;                                      // Parsed JSON body
  params: Record<string, string> | null;  // Route parameters (:id)
  headers: IncomingHttpHeaders;
  queries: Record<string, string> | null; // Query parameters
}
```

### 2. No next() - Explicit Chaining

Unlike Express/Fastify, **there is no `next()`**. Handlers execute in sequence:

```javascript
// Potato Framework
app.get("/users", middleware1, middleware2, handler);

// Express
app.get("/users", middleware1, middleware2, handler); // next() is implicitly called
```

Each handler has access to the full context and is responsible for calling `app.finishRequest()`.

### 3. Request Lifecycle

```
HTTP Request
    │
    ├─→ SweetPotato (parses headers, method, path)
    ├─→ defineBodyAttributes (reads body, parses JSON)
    ├─→ Routes.executeRequestCycle (finds matching route)
    ├─→ RequestCycle.execute (executes handlers in order)
    │       ├─→ Handler 1
    │       ├─→ Handler 2 (middleware)
    │       └─→ Handler 3 (route)
    ├─→ finishRequest (sends response)
    └─→ HTTP Response
```

## When to Use

| Scenario | Recommendation |
|---------|-------------|
| Simple microservices | ✅ Potato Framework |
| Complex REST API with many middlewares | ⚠️ Consider Express/NestJS |
| Applications needing WebSocket | ❌ Use another framework |
| Learning/education | ✅ Excellent choice |

## Code Structure

```
package/
├── SweetPotato.mjs       # Main server class
├── Routes.mjs            # Routing engine
├── Resource.mjs          # DSL for route definition
├── RequestCycle.mjs      # Handler execution
├── SweetPotatoApp.mjs    # Singleton wrapper
├── constants/            # HttpMethod, HttpStatusCode
├── errors/               # Error classes
└── utils/                # Helpers (buildRoutePath, logger, etc.)
```

## Version Compatibility

- **Node.js**: 18.12.0+
- **TypeScript**: 5.0+ (for development)
- **ES Modules**: Native ES modules (.mjs/.ts)