# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Potato Framework** is a lightweight Node.js HTTP server framework (the main module is called `SweetPotato`). It uses native Node.js `http` module with no external dependencies, written in pure ES Modules (`.mjs`).

- Node.js 18.12.0+ required
- No build step — plain JavaScript ES Modules
- No TypeScript, no bundler, no test runner configured

## Running Examples

```bash
cd package
npm run ex-01   # Run simple app example
npm run ex-02   # Run routes-with-resources example
```

No lint or test scripts are configured in this project.

## Architecture

### Request Lifecycle

```
HTTP Request
  → SweetPotato (parses body, headers, method, path)
  → Routes (regex match via buildRoutePath)
  → RequestCycle (executes handlers/middlewares in sequence)
  → finishRequest(statusCode, data) → HTTP Response
```

### Core Classes

| File | Role |
|------|------|
| `package/SweetPotato.mjs` | Main server class; extends `Resource`; owns the HTTP server and `finishRequest()` |
| `package/Routes.mjs` | Routing engine; stores routes per HTTP method; matches via regex |
| `package/Resource.mjs` | Fluent DSL for defining routes; extends `Routes` |
| `package/RequestCycle.mjs` | Executes the middleware/handler chain (supports sync and async) |
| `package/SweetPotatoApp.mjs` | Singleton wrapper around `SweetPotato` |

### Handler Contract

Every handler/middleware receives a single frozen object:

```javascript
{ body, params, headers, queries }
```

- `body` — parsed JSON or `null`
- `params` — named route params (e.g., `:id`) or `null`
- `headers` — request headers object
- `queries` — query string params or `null`

Handlers call `app.finishRequest(statusCode, data)` to send a response. There is no `next()` — all registered handlers for a route run sequentially via `RequestCycle`.

### Route Definition Patterns

**Direct methods:**
```javascript
app.get("path", ...middlewares, handlerFn);
app.post("path", handlerFn);
// also: .patch(), .put(), .delete()
```

**Resource DSL:**
```javascript
app.resource("message")
  .defineHandler({ method: HttpMethod.GET, sufix: ":id" }, handler)
  .defineHandler({ method: HttpMethod.POST }, handler);
```

**Global prefix:**
```javascript
app.registerGlobalPrefix("api/v1");
```

### Route Path Building

`utils/buildRoutePath.mjs` converts paths like `"users/:id"` into a `RegExp` that also captures named groups. Route params are extracted later by `utils/get-route-params.mjs`.

### Async Detection

`utils/isPromise.mjs` detects async functions by checking `constructor.name === "AsyncFunction"` or `instanceof Promise`, so `RequestCycle` can `await` them properly.

### Error Handling

- Unmatched routes → `RouteNotFoundException` → 404 response
- Handler throws → caught in `RequestCycle` → 500 response
- `[ERR_HTTP_HEADERS_SENT]` guard is in place to prevent double-response errors in async contexts

## Repository Layout

```
potato-framework/
├── package/                        # Framework source
│   ├── index.mjs                   # Public API (exports SweetPotatoApp)
│   ├── SweetPotato.mjs
│   ├── Routes.mjs
│   ├── Resource.mjs
│   ├── RequestCycle.mjs
│   ├── SweetPotatoApp.mjs
│   ├── constants/                  # HttpMethod, HttpStatusCode enums
│   ├── errors/                     # RouteNotFoundException
│   └── utils/                      # buildRoutePath, logger, param parsers
└── examples/
    ├── 01-simple-app/
    └── 02-routes-with-resources/
```
