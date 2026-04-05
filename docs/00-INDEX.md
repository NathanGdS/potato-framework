# Potato Framework - Engine Documentation

This technical documentation describes the internal workings of Potato Framework, a lightweight HTTP server framework for Node.js written in pure ES Modules.

---

## Table of Contents

### 1. Overview
- [Introduction](./01-introducao.md) - Framework overview and design philosophies
- [Architecture](./02-arquitetura.md) - Class structure and data flow

### 2. Internal Components
- [SweetPotato](./03-sweetpotato.md) - Main HTTP server class
- [Routes](./04-routes.md) - Routing engine and route management
- [Resource](./05-resource.md) - DSL for RESTful resource definition
- [RequestCycle](./06-requestcycle.md) - Middleware/handler execution

### 3. Utilities and Helpers
- [buildRoutePath](./07-utils-buildroutepath.md) - Route compilation with Regex
- [getRouteParams](./08-utils-getrouteparams.md) - Route parameter extraction
- [getQueries](./09-utils-getqueries.md) - Query parameter parsing
- [isPromise](./10-utils-ispromise.md) - Async function detection

### 4. Types and Constants
- [Base Types](./11-tipos-base.md) - HandlerContext, RouteHandler
- [HttpMethod](./12-constants-httpmethod.md) - HTTP method constants
- [HttpStatusCode](./13-constants-httpstatuscode.md) - HTTP status code constants

### 5. Error Handling
- [RouteNotFoundException](./14-errors-routenotfound.md) - Route not found error

### 6. Lifecycle and Flow
- [Request Lifecycle](./15-lifecycle-request.md) - Complete HTTP request flow

---

## Key Concepts

### Design Philosophy

1. **Zero External Dependencies** - Uses only Node.js native `http` module
2. **Pure ES Modules** - No build steps, compiled TypeScript, or bundlers
3. **Immutability** - HandlerContext is `Object.freeze()` to prevent mutations
4. **Sequential Execution** - Handlers run in order, no `next()` - each calls `finishRequest()`

### Comparison with Conventional Frameworks

| Feature | Potato Framework | Express/Fastify |
|---------|------------------|-----------------|
| Dependencies | 0 (Node.js only) | Dozens |
| Build Step | No | Yes (TypeScript) |
| next() middleware | No | Yes |
| Global middlewares | Yes (Resource) | Yes |

---

## How This Documentation is Organized

This documentation is **technical and detailed**, focused on:

1. **How things work** - Internal implementation
2. **Why it was done this way** - Design decisions
3. **How to use correctly** - Patterns and contracts

For usage examples, see the `examples/` folder or the main README.