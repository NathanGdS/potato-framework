# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Potato Framework** is a lightweight Node.js HTTP server framework (the main module is called `SweetPotato`). Uses native Node.js `http` module with no runtime dependencies, written in TypeScript compiled to ES Modules.

- Node.js 18.12.0+ required
- TypeScript source in `package/src/`, compiled to `package/dist/`
- Build step required: `npm run build` (tsc)
- Vitest test suite with 85% coverage thresholds

## Running Examples

Examples run via `tsx` (no build needed):

```bash
cd examples
npm run example-01   # 01-simple-app
npm run example-02   # 02-routes-with-resources
```

## Running Tests

```bash
cd package
npm test                # run all tests
npm run test:coverage   # run with coverage report
npm run test:watch      # watch mode
npm run build           # compile TypeScript → dist/
```

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
| `package/src/SweetPotato.ts` | Main server class; extends `Resource`; owns HTTP server and `finishRequest()` |
| `package/src/Routes.ts` | Routing engine; stores routes per HTTP method; matches via regex |
| `package/src/Resource.ts` | Fluent DSL for defining routes; extends `Routes` |
| `package/src/RequestCycle.ts` | Executes the middleware/handler chain (supports sync and async) |
| `package/src/SweetPotatoApp.ts` | Singleton wrapper around `SweetPotato` |

### Handler Contract

Every handler/middleware receives a `HandlerContext` (frozen object):

```typescript
interface HandlerContext {
  body: any;
  params: Record<string, string> | null;
  headers: IncomingHttpHeaders;
  queries: Record<string, string> | null;
}

type RouteHandler = (ctx: HandlerContext) => void | Promise<void>;
```

Handlers call `app.finishRequest(statusCode, data)` to send a response. No `next()` — all registered handlers for a route run sequentially via `RequestCycle`.

### Route Definition Patterns

**Direct methods:**
```typescript
app.get("path", ...middlewares, handlerFn);
app.post("path", handlerFn);
// also: .patch(), .put(), .delete()
```

**Resource DSL:**
```typescript
app.resource("message")
  .defineHandler({ method: "GET", sufix: ":id" }, handler)
  .defineHandler({ method: "POST" }, handler);
```

**Default middlewares on a resource:**
```typescript
app.resource("message")
  .defaultMiddlewares(authMiddleware)
  .defineHandler({ method: "GET" }, handler);
```

**Global prefix:**
```typescript
app.registerGlobalPrefix("api/v1");
```

### Route Path Building

`utils/buildRoutePath.ts` converts paths like `"users/:id"` into a `RegExp` capturing named groups. Route params extracted by `utils/get-route-params.ts`; query params by `utils/get-query-params.ts`.

### Async Detection

`utils/isPromise.ts` detects async functions by checking `constructor.name === "AsyncFunction"` or `instanceof Promise`, so `RequestCycle` can `await` them properly.

### Error Handling

- Unmatched routes → `RouteNotFoundException` → 404 response
- Handler throws → caught in `RequestCycle` → 500 response
- `[ERR_HTTP_HEADERS_SENT]` guard prevents double-response errors in async contexts

## Repository Layout

```
potato-framework/
├── package/                        # Framework source
│   ├── src/                        # TypeScript source
│   │   ├── index.ts                # Public API (exports SweetPotatoApp)
│   │   ├── SweetPotato.ts
│   │   ├── Routes.ts
│   │   ├── Resource.ts
│   │   ├── RequestCycle.ts
│   │   ├── SweetPotatoApp.ts
│   │   ├── types/                  # HandlerContext, RouteHandler
│   │   ├── constants/              # HttpMethod, HttpStatusCode, routes.constants
│   │   ├── errors/                 # RouteNotFoundException
│   │   └── utils/                  # buildRoutePath, logger, colours, param parsers
│   ├── dist/                       # Compiled output (JS + .d.ts)
│   ├── tests/                      # Vitest unit + integration tests
│   │   ├── integration/
│   │   └── utils/
│   ├── tsconfig.json
│   └── vitest.config.ts
├── examples/                       # TypeScript examples (tsx runtime)
│   ├── package.json                # own deps: potato-framework, tsx
│   ├── 01-simple-app/
│   └── 02-routes-with-resources/
└── docs/                           # Detailed documentation per module
```

## Learning Loop - Automated Knowledge Capture

### Purpose

This project implements a **learning loop** that captures lessons from implementation difficulties and repeated mistakes to prevent them in the future.

### How It Works

1. **Trigger**: When encountering implementation difficulties, retrial of previous mistakes, or design changes
2. **Action**: Save lessons to `./.claude/lessons.md`
3. **Content**: Specific, actionable insights with context and prevention strategies

### Lessons File Format

```markdown
---
date: YYYY-MM-DD
difficulty: [low|medium|high]
topic: [routing|middleware|async|etc]
---

## Lesson Title

**Problem:** What went wrong or was difficult

**Root Cause:** Why it happened

**Solution:** What fixed it or how we resolved it

**Prevention:** How to avoid this in the future
```

### Maintenance

- Review `./.claude/lessons.md` weekly during code review
- Aggregate lessons into documentation updates monthly
- Keep lessons specific to this project's patterns and mistakes
