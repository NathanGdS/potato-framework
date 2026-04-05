# buildRoutePath - Route Compilation with Regex

## Overview

`buildRoutePath` is a utility that **compiles a route string into a regular expression**. It allows defining routes with named parameters (ex: `:id`) that are converted into regex named groups.

```typescript
export function buildRoutePath(path: string): RegExp {
  const routeParametersRegex = /:([a-zA-Z]+)/g;
  const params = path.replaceAll(routeParametersRegex, '(?<$1>[a-z0-9\\-_]+)');

  const queryRegex = new RegExp(`^${params}(?<query>\\?(.*))?$`);

  return queryRegex;
}
```

## Compilation Logic

### Step by Step

1. **Identify route parameters**:
   ```javascript
   /:([a-zA-Z]+)/g  // Regex for :parameter
   ```

2. **Replace with named group regex**:
   ```javascript
   path.replaceAll(/:([a-zA-Z]+)/g, '(?<$1>[a-z0-9\\-_]+)')
   ```

3. **Add query string support**:
   ```javascript
   new RegExp(`^${params}(?<query>\\?(.*))?$`)
   ```

### Named Groups Explained

```regex
(?<id>[a-z0-9\\-_]+)
 │   │         │
 │   │         └─ Content: lowercase letters, digits, hyphen, underscore
 │   └─────────── Name: "id" (named capture)
 └─────────────── Pattern: capture group named "id"
```

## Compilation Examples

### Example 1: Simple Route

**Input**:
```typescript
buildRoutePath("/users")
```

**Step 1** - Identify parameters:
- `/users` has no `:`, so no replacement
- `params = "/users"`

**Step 2** - Add query support:
- `new RegExp(`^/users(?<query>\\?(.*))?$`)`

**Result**:
```javascript
/^\/users(?<query>\?.*)?$/
```

**Tests**:
| Path | Match | Groups |
|------|-------|--------|
| `/users` | ✅ | `{ query: undefined }` |
| `/users?page=1` | ✅ | `{ query: '?page=1' }` |

---

### Example 2: Route with Parameter

**Input**:
```typescript
buildRoutePath("/users/:id")
```

**Step 1** - Identify parameters:
- `:id` → `(?<id>[a-z0-9\\-_]+)`
- `params = "/users/(?<id>[a-z0-9\\-_]+)"`

**Step 2** - Add query support:
- `new RegExp(`^/users/(?<id>[a-z0-9\\-_]+)(?<query>\\?.*)?$`)`

**Result**:
```javascript
/^\/users\/(?<id>[a-z0-9\-_]+)(?<query>\?.*)?$/
```

**Tests**:
| Path | Match | Groups |
|------|-------|--------|
| `/users/123` | ✅ | `{ id: "123", query: undefined }` |
| `/users/abc` | ✅ | `{ id: "abc", query: undefined }` |
| `/users/123?page=1` | ✅ | `{ id: "123", query: '?page=1' }` |
| `/users/` | ❌ | - |
| `/users/123/extra` | ❌ | - |

**Validation Rules**:
- Only `a-z`, `0-9`, `-`, `_` are allowed
- Numbers are allowed in parameter

---

### Example 3: Route with Multiple Parameters

**Input**:
```typescript
buildRoutePath("/users/:userId/posts/:postId")
```

**Compilation**:
- `:userId` → `(?<userId>[a-z0-9\\-_]+)`
- `:postId` → `(?<postId>[a-z0-9\\-_]+)`

**Result**:
```javascript
/^\/users\/(?<userId>[a-z0-9\-_]+)\/posts\/(?<postId>[a-z0-9\-_]+)(?<query>\?.*)?$/
```

**Tests**:
| Path | Match | Groups |
|------|-------|--------|
| `/users/1/posts/2` | ✅ | `{ userId: "1", postId: "2" }` |
| `/users/abc/posts/xyz` | ✅ | `{ userId: "abc", postId: "xyz" }` |

---

### Example 4: Route with Hyphen and Underscore

**Input**:
```typescript
buildRoutePath("/items/:item-id/slug/:item_slug")
```

**Result**:
```javascript
/^\/items\/(?<item-id>[a-z0-9\-_]+)\/slug\/(?<item_slug>[a-z0-9\-_]+)(?<query>\?.*)?$/
```

**Tests**:
| Path | Match | Groups |
|------|-------|--------|
| `/items/item-1/slug/my-slug` | ✅ | `{ item-id: "item-1", item_slug: "my-slug" }` |
| `/items/item_1/slug/my_slug` | ✅ | `{ item-id: "item_1", item_slug: "my_slug" }` |

---

### Example 5: Route with Query String

**Input**:
```typescript
buildRoutePath("/search")
```

**Result**:
```javascript
/^\/search(?<query>\?.*)?$/
```

**Tests**:
| Path | Match | Groups |
|------|-------|--------|
| `/search` | ✅ | `{ query: undefined }` |
| `/search?q=test` | ✅ | `{ query: '?q=test' }` |
| `/search?page=1&limit=10` | ✅ | `{ query: '?page=1&limit=10' }` |

---

## Technical Details

### Regex Pattern Breakdown

```regex
^                              # Start of string
  <params>                     # Route parameters (replaced)
  (?<query>\?(.*))?            # Optional query string (non-capture group)
$                              # End of string
```

### Named Group `query`

The group `(?<query>\\?(.*))?` captures:
- `\?` - literal `?` character (escaped)
- `(.*)` - any character zero or more times
- `?` - group is optional

**Extraction example**:
```javascript
// Path: "/users/123?page=1&limit=10"
// Groups: { id: "123", query: "?page=1&limit=10" }

// The "query" group includes the "?"
// getQueries() removes the "?" with substring(1)
```

### Allowed Characters in Parameters

The regex `[a-z0-9\\-_]+` allows:
- `a-z`: lowercase letters
- `0-9`: digits
- `-`: hyphen
- `_`: underscore

**Does NOT allow**:
- Uppercase letters (ex: `:ID`)
- Spaces
- Special characters (ex: `:user@email`)

### Query String Support

The query string is captured as a **single named group** `query`. Query string parsing is done separately by `getQueries()`.

```typescript
// buildRoutePath captures:
{ query: "?page=1&limit=10" }

// getQueries processes:
"page=1&limit=10" → { page: "1", limit: "10" }
```

---

## Integration with getRouteParams and getQueries

### Complete Extraction Flow

```typescript
// 1. buildRoutePath creates the regex
const routeRegex = buildRoutePath("/users/:id");

// 2. Execute on path
const regexVerifier = routeRegex.exec("/users/123?page=1");
// { 0: "/users/123?page=1", groups: { id: "123", query: "?page=1" } }

// 3. getRouteParams extracts route parameters
const params = getRouteParams(regexVerifier.groups);
// { id: "123" }

// 4. getQueries extracts query parameters
const queries = getQueries(regexVerifier.groups?.['query']);
// { page: "1" }
```

### getRouteParams Implementation

```typescript
export function getRouteParams(
  groups: Record<string, string>
): Record<string, string> | null {
  const { query: _query, ...others } = groups;
  if (Object.keys(others).length === 0) return {};
  return others;
}
```

**Behavior**:
1. Removes the `query` group (which is not a route parameter)
2. Returns only route parameters

**Example**:
```javascript
// Groups: { id: "123", query: "?page=1" }
// After destructuring: { id: "123" }
```

---

## Edge Cases and Limitations

### Edge Case 1: Empty Path

```typescript
buildRoutePath("");
// new RegExp("^(?<query>\\?.*)?$")
// Match: "", "?page=1"
```

### Edge Case 2: Query String Only

```typescript
buildRoutePath("?");
// new RegExp("^(?<query>\\?.*)?$")
// Match: "?", "?page=1"
```

### Edge Case 3: Parameter Without Valid Name

```typescript
buildRoutePath("/users/:");  // Parameter without name
// : does not have [a-zA-Z]+, so not replaced
// new RegExp("^/users/:(?<query>\\?.*)?$")
```

### Edge Case 4: Parameter with Initial Numbers

```typescript
buildRoutePath("/users/:1id");  // Parameter starts with number
// :1id does not match /:([a-zA-Z]+)/g (starts with 1)
// new RegExp("^/users/:1id(?<query>\\?.*)?$")
// The :1id is not treated as a parameter
```

### Edge Case 5: Parameter with Uppercase

```typescript
buildRoutePath("/users/:ID");
// :ID matches /:([a-zA-Z]+)/g
// new RegExp("^/users/(?<ID>[a-z0-9\\-_]+)(?<query>\\?.*)?$")
// But "/users/ABC" does not match (uppercase not allowed in value)
```

**Result**: The parameter `:ID` is recognized, but values with uppercase are not accepted.

---

## Performance Considerations

### Regex Compilation

Each call to `buildRoutePath()` compiles a new regex:
```typescript
return queryRegex;  // new RegExp() each call
```

**Possible optimization**:
```typescript
// Compilation cache
const routeCache = new Map<string, RegExp>();

function buildRoutePath(path: string): RegExp {
  if (routeCache.has(path)) {
    return routeCache.get(path)!;
  }
  
  const regex = /* compile */;
  routeCache.set(path, regex);
  return regex;
}
```

### Impact

- **Without cache**: O(n × m) where n=calls, m=path length
- **With cache**: O(n) + O(m) for first compilation

---

## Usage in Framework

### In Routes.createRoute()

```typescript
private createRoute(method: string, sufix: string, handlers: RouteHandler[]): void {
  const newRoute: Route = {
    method,
    originalSufix: sufix,
    sufix: buildRoutePath(sufix),  // ← Compilation here
    // ...
  };
}
```

**Each route has its regex compiled once** at creation time.

### In getRouteIndex()

```typescript
private getRouteIndex(path: string, method: string): number {
  return this.routes.findIndex((e) => {
    const regexVerifier = e.sufix.exec(path);  // ← Executes compiled regex
    // ...
  });
}
```

**The compiled regex is executed for each request** until match is found.

---

## Summary

| Aspect | Implementation |
|--------|---------------|
| **Conversion** | `:param` → `(?<param>[a-z0-9\\-_]+)` |
| **Query Support** | `(?<query>\\?.*)?` |
| **Named Groups** | For parameter extraction |
| **Compilation** | Each call (no cache) |
| **Cost** | O(m) per route created |
| **Execution** | O(n) per request (n=parameters) |

### Usage Pattern

1. **Route definition**: `app.get("/users/:id", handler)`
2. **buildRoutePath**: Compiles to regex named groups
3. **Route storage**: Regex is stored in `Route.sufix`
4. **Request time**: `route.sufix.exec(path)` extracts params

### Advantages

- **Flexibility**: Supports multiple parameters
- **Validation**: Regex restricts allowed characters
- **Extraction**: Named groups make parameter extraction easy

### Limitations

- Only lowercase letters in value (no uppercase)
- No custom regex support
- No type validation (doesn't distinguish `:id` vs `:userId`)