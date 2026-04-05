# getRouteParams - Route Parameter Extraction

## Overview

`getRouteParams` is a utility that **extracts only the route parameters** from a regex match object, removing the special `query` group used for query strings.

```typescript
export function getRouteParams(
  groups: Record<string, string>
): Record<string, string> | null {
  const { query: _query, ...others } = groups;
  if (Object.keys(others).length === 0) return {};
  return others;
}
```

## Purpose

When `buildRoutePath()` compiles a route into regex, it creates **two types of named groups**:

1. **Route parameters**: `:id` → `(?<id>[a-z0-9\\-_]+)`
2. **Query string**: `(?<query>\\?.*)?`

`getRouteParams()` removes the `query` group and returns only the route parameters.

## Extraction Logic

### Destructuring Process

```typescript
const { query: _query, ...others } = groups;
```

1. **Explicit extraction**: `query` is extracted and renamed to `_query` (discardable variable)
2. **Rest**: `...others` captures all other keys of the object

### Empty Object Filter

```typescript
if (Object.keys(others).length === 0) return {};
```

**Behavior**:
- If there are no other groups besides `query`: returns `{}` (not `null`)
- If there are other groups: returns `others`

**Note**: Returns `{}` (empty object), not `null`, when there are no parameters.

## Usage Examples

### Example 1: Route with Parameter

**Input**:
```typescript
const groups = { id: "123", query: undefined };
const params = getRouteParams(groups);
```

**Process**:
1. Destructuring: `{ query: _query, ...others }`
   - `_query = undefined`
   - `others = { id: "123" }`
2. Check `Object.keys(others)`: `[ "id" ]` → length = 1
3. Returns: `{ id: "123" }`

**Output**:
```typescript
{ id: "123" }
```

---

### Example 2: Route without Parameter

**Input**:
```typescript
const groups = { query: undefined };
const params = getRouteParams(groups);
```

**Process**:
1. Destructuring: `{ query: _query, ...others }`
   - `_query = undefined`
   - `others = {}` (empty, no other keys)
2. Check `Object.keys(others)`: `[]` → length = 0
3. Returns: `{}`

**Output**:
```typescript
{}
```

---

### Example 3: Route with Multiple Parameters

**Input**:
```typescript
const groups = { 
  id: "123", 
  userId: "456", 
  query: "?page=1" 
};
const params = getRouteParams(groups);
```

**Process**:
1. Destructuring: `{ query: _query, ...others }`
   - `_query = "?page=1"`
   - `others = { id: "123", userId: "456" }`
2. Check: `Object.keys(others)` → `[ "id", "userId" ]`
3. Returns: `{ id: "123", userId: "456" }`

**Output**:
```typescript
{ id: "123", userId: "456" }
```

---

### Example 4: Path without Query String

**Input**:
```typescript
const groups = { id: "abc" };  // No 'query' key
const params = getRouteParams(groups);
```

**Process**:
1. Destructuring: `{ query: _query, ...others }`
   - `_query = undefined` (default from destructuring)
   - `others = { id: "abc" }`
2. Check: `Object.keys(others)` → `[ "id" ]`
3. Returns: `{ id: "abc" }`

**Output**:
```typescript
{ id: "abc" }
```

---

### Example 5: Path with Query String Only

**Input**:
```typescript
const groups = { query: "?page=1&limit=10" };
const params = getRouteParams(groups);
```

**Process**:
1. Destructuring: `{ query: _query, ...others }`
   - `_query = "?page=1&limit=10"`
   - `others = {}`
2. Check: `Object.keys(others)` → `[]` (empty)
3. Returns: `{}`

**Output**:
```typescript
{}
```

## Comparison: With vs Without getRouteParams

### Situation: Route /users/:id

**Without getRouteParams**:
```javascript
// Groups returned by regex exec:
{ id: "123", query: undefined }

// Need to filter manually:
const params = Object.fromEntries(
  Object.entries(groups).filter(([key]) => key !== 'query')
);
// { id: "123" }
```

**With getRouteParams**:
```javascript
// Groups returned by regex exec:
{ id: "123", query: undefined }

// Direct use:
const params = getRouteParams(groups);
// { id: "123" }
```

## Integration with buildRoutePath

### Complete Flow

```typescript
// 1. Build regex
const routeRegex = buildRoutePath("/users/:id");
// /^\/users\/(?<id>[a-z0-9\-_]+)(?<query>\?.*)?$/

// 2. Execute on path
const regexVerifier = routeRegex.exec("/users/123?page=1");
// { 
//   0: "/users/123?page=1", 
//   groups: { id: "123", query: "?page=1" } 
// }

// 3. Extract route parameters
const params = getRouteParams(regexVerifier.groups);
// { id: "123" }

// 4. Extract query parameters
const queries = getQueries(regexVerifier.groups?.['query']);
// { page: "1" }
```

## Integration with getQueries

### Responsibility Division

| Function | Responsibility | Input | Output |
|--------|------------------|-------|--------|
| `getRouteParams()` | Extract route parameters | `groups` | `{ id: "123" }` |
| `getQueries()` | Extract query string | `query` string | `{ page: "1" }` |

### Complementarity

```typescript
// getRouteParams removes 'query' from groups
const { query: _query, ...others } = groups;
// Returns: { id: "123" }

// getQueries processes query string separately
getQueries("?page=1&limit=10");
// Returns: { page: "1", limit: "10" }
```

## Edge Case Handling

### Edge Case 1: Empty Groups

```typescript
const groups = {};
const params = getRouteParams(groups);
// { query: _query, ...others } → others = {}
// Object.keys(others).length === 0 → true
// Returns: {}
```

### Edge Case 2: Groups with only undefined

```typescript
const groups = { query: undefined };
const params = getRouteParams(groups);
// others = {}
// Returns: {}
```

### Edge Case 3: Groups without 'query' key

```typescript
const groups = { id: "123" };
const params = getRouteParams(groups);
// { query: _query (default), ...others = { id: "123" } }
// Returns: { id: "123" }
```

### Edge Case 4: Keys that are not parameters

If `buildRoutePath()` changes and adds more groups:
```typescript
const groups = { id: "123", query: "?page=1", extra: "value" };
const params = getRouteParams(groups);
// { query: _query, ...others = { id: "123", extra: "value" } }
// Returns: { id: "123", extra: "value" }
```

**Note**: `getRouteParams()` **does not filter by key type**. It only removes `query`.

## Performance Considerations

### Complexity

- **Time**: O(n) where n = number of keys in `groups`
- **Space**: O(n) for the `others` object

### Operations

1. Destructuring: O(n)
2. Object.keys(): O(n)
3. Return: O(1) (reference)

### Possible Optimization

If `groups` always has only one `query` key and the rest:
```typescript
// More performant alternative (but less readable)
export function getRouteParams(groups: Record<string, string>): Record<string, string> {
  if (Object.keys(groups).length <= 1) return {};
  // ...
}
```

**Current implementation is sufficient** for framework usage.

## Usage in Routes

### In getRouteIndex()

```typescript
private getRouteIndex(path: string, method: string): number {
  return this.routes.findIndex((e) => {
    const regexVerifier = e.sufix.exec(path);
    if (!regexVerifier) return false;
    if (e.method !== method) return false;
    if (regexVerifier.find((t) => t === path)) {
      e.params = getRouteParams(regexVerifier.groups as Record<string, string>);  // ← Usage
      e.queries = getQueries(regexVerifier.groups?.['query']);
      return true;
    }
    return false;
  });
}
```

## Summary

| Aspect | Implementation |
|--------|---------------|
| **Responsibility** | Filter route parameters |
| **Input** | `Record<string, string>` |
| **Output** | `Record<string, string>` or `{}` |
| **Filter** | Remove `query` key |
| **Empty** | Returns `{}` if no other keys |

### Return Contract

| Input | Output | Notes |
|-------|--------|-------|
| `{ id: "1", query: "?" }` | `{ id: "1" }` | Parameter extracted |
| `{ query: "?" }` | `{}` | No parameters |
| `{ id: "1" }` | `{ id: "1" }` | No query |
| `{}` | `{}` | Empty |

### Design Decisions

1. **Return `{}` not `null`**: To avoid null checks in caller
2. **Destructuring**: More readable than manual loop
3. **No filter()**: Less overhead than Array.filter()

### Advantages

- **Simple**: One line of main logic
- **Clean**: Separates responsibilities (parameters vs query)
- **Predictable**: Known behavior

### Limitations

- **Fixed name**: Depends on `query` key
- **No validation**: Doesn't verify if `query` is really the query string
- **No type safety**: Takes generic `Record<string, string>`