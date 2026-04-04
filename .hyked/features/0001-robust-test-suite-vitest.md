# 0001 — Robust Test Suite with Vitest

**Status**: Complete
**Archived**: 2026-04-04
**User Stories**: 6 / 6

---

## Summary

Added a comprehensive test suite to the Potato Framework using Vitest as the test runner with native ESM support. The suite covers all observable behaviors across utils, routing engine, request cycle, resource DSL, and full HTTP integration — achieving ≥85% coverage across all thresholds (branches, lines, functions, statements). All tests follow the AAA (Arrange / Act / Assert) pattern and use real HTTP via `fetch` for integration tests, avoiding internal mocks.

---

## User Stories

| ID | Title | Status |
|----|-------|--------|
| US-1 | Vitest Setup & Coverage Config | ✅ |
| US-2 | Utils Unit Tests | ✅ |
| US-3 | Routes Engine Tests | ✅ |
| US-4 | RequestCycle Tests | ✅ |
| US-5 | SweetPotato Integration Tests | ✅ |
| US-6 | Resource DSL & Global Prefix Tests | ✅ |

---

## Implementation Details

**US-1 — Vitest Setup & Coverage Config**
- Installed `vitest` and `@vitest/coverage-v8` as devDependencies.
- Created `package/vitest.config.mjs` with `test.environment: 'node'`, `coverage.provider: 'v8'`, and coverage thresholds of 85% for branches, lines, functions, and statements.
- Added scripts to `package/package.json`: `test` (vitest run), `test:coverage` (vitest run --coverage), and `test:watch` (vitest).

**US-2 — Utils Unit Tests**
- `buildRoutePath.test.mjs`: covers static paths, single and multiple named params, query string capture, and negative match cases.
- `get-query-params.test.mjs`: covers null/undefined input, simple query, multiple params, and edge cases like bare flags.
- `get-route-params.test.mjs`: covers extraction of multiple named groups, absence of extraneous `query` field in result.
- `isPromise.test.mjs`: covers sync functions (arrow and named), async functions, and `Promise.resolve()` instances.

**US-3 — Routes Engine Tests**
- `Routes.test.mjs`: validates route registration for all HTTP methods (GET, POST, PATCH, PUT, DELETE), correct handler invocation for matching path+method, param extraction passed to handler context, query string passed to handler context, `RouteNotFoundException` thrown for unregistered paths, method isolation (GET route does not respond to POST), and `registerGlobalPrefix` prefixing all routes.

**US-4 — RequestCycle Tests**
- `RequestCycle.test.mjs`: validates that sync handlers are called exactly once with the data object, async handlers are awaited before the next handler runs, multiple handlers execute in sequential order (not parallel), `data` object reference is preserved, `add()` and `addMultiples()` queue handlers correctly, `reset()` clears the queue, and `getAllHandlers()` returns the current array.

**US-5 — SweetPotato Integration Tests**
- `tests/integration/SweetPotato.test.mjs`: spins up a real HTTP server on a random port (port 0) using `beforeEach`/`afterEach` isolation. Covers: GET 200 + JSON body, POST with parsed body, route params extraction, query string extraction, 404 for unknown routes, 500 for handler errors, `finishRequest` default status 200, and concurrent requests not triggering `[ERR_HTTP_HEADERS_SENT]`.

**US-6 — Resource DSL & Global Prefix Tests**
- `tests/Resource.test.mjs`: validates `resource('users').defineHandler({ method: 'GET' }, fn)` registers the route correctly, `:id` suffix variant, invalid HTTP method throws `Error('Invalid method')`, `defaultMiddlewares` appends to handler chain, fluent chaining of multiple `defineHandler` calls, `registerGlobalPrefix('api/v1')` with and without leading slash, and documents the `undefined` prefix bug as a pending TODO.

---

## Files Changed

| File | Change |
|------|--------|
| `package/package.json` | Added devDependencies (`vitest`, `@vitest/coverage-v8`), added `test`, `test:coverage`, `test:watch` scripts |
| `package/vitest.config.mjs` | Created — Vitest config with node environment, v8 coverage provider, 85% thresholds |
| `package/tests/utils/buildRoutePath.test.mjs` | Created — unit tests for buildRoutePath util |
| `package/tests/utils/get-query-params.test.mjs` | Created — unit tests for getQueries util |
| `package/tests/utils/get-route-params.test.mjs` | Created — unit tests for getRouteParams util |
| `package/tests/utils/isPromise.test.mjs` | Created — unit tests for isPromise util |
| `package/tests/Routes.test.mjs` | Created — unit tests for Routes routing engine |
| `package/tests/RequestCycle.test.mjs` | Created — unit tests for RequestCycle handler chain |
| `package/tests/integration/SweetPotato.test.mjs` | Created — integration tests with real HTTP server |
| `package/tests/Resource.test.mjs` | Created — unit tests for Resource DSL and global prefix |
