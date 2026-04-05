# getQueries - Query Parameter Parsing

## Overview

`getQueries` is a utility that **parses a query string into an object of parameters**. It converts strings like `?page=1&limit=10` into objects `{ page: "1", limit: "10" }`.

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

## Purpose

Separate query string parsing from routing logic, ensuring that:
1. `query` group from regex is removed (by `getRouteParams`)
2. Query parameters are parsed separately

## Parsing Logic

### Step by Step

```typescript
query.substring(1)  // Remove the "?"
  .split('&')       // Split into "key=value" pairs
  .reduce(...)      // Build object
```

### Detail

1. **substring(1)**: Removes the initial `?` character
   - `"?page=1&limit=10"` → `"page=1&limit=10"`

2. **split('&')**: Splits into array of pairs
   - `"page=1&limit=10"` → `["page=1", "limit=10"]`

3. **reduce()**: Build result object
   - `item.split('=')` → `["page", "1"]`
   - `data[param] = value` → `data["page"] = "1"`

## Usage Examples

### Example 1: Simple Query

**Input**:
```typescript
const queries = getQueries("?page=1");
```

**Process**:
1. `query.substring(1)`: `"?page=1".substring(1)` → `"page=1"`
2. `.split('&')`: `"page=1".split('&')` → `["page=1"]`
3. `reduce()`:
   - `item = "page=1"`
   - `item.split('=')` → `["page", "1"]`
   - `data["page"] = "1"`

**Output**:
```typescript
{ page: "1" }
```

---

### Example 2: Multiple Parameters

**Input**:
```typescript
const queries = getQueries("?page=1&limit=10&sort=desc");
```

**Process**:
1. `substring(1)`: `"page=1&limit=10&sort=desc"`
2. `split('&')`: `["page=1", "limit=10", "sort=desc"]`
3. `reduce()`:
   - `["page", "1"]` → `data["page"] = "1"`
   - `["limit", "10"]` → `data["limit"] = "10"`
   - `["sort", "desc"]` → `data["sort"] = "desc"`

**Output**:
```typescript
{ page: "1", limit: "10", sort: "desc" }
```

---

### Example 3: Empty Value

**Input**:
```typescript
const queries = getQueries("?page=");
```

**Process**:
- `item.split('=')` → `["page", ""]` (empty string)

**Output**:
```typescript
{ page: "" }
```

---

### Example 4: Parameter without Value (key without =)

**Input**:
```typescript
const queries = getQueries("?page");
```

**Process**:
- `item.split('=')` → `["page"]` (only one item)
- `[param, value] = ["page"]` → `param = "page"`, `value = undefined`

**Output**:
```typescript
{ page: undefined }
```

---

### Example 5: Values with `=` (ex: URL encoded)

**Input**:
```typescript
const queries = getQueries("?url=https://example.com");
```

**Process**:
- `item.split('=')` → `["url", "https://example.com"]` (only first split)

**Output**:
```typescript
{ url: "https://example.com" }
```

**Note**: `split('=', 2)` or `split('=')` with destructure takes only first and second.

---

### Example 6: URL with multiple `=` (ex: OAuth)

**Input**:
```typescript
const queries = getQueries("?token=abc=def=ghi");
```

**Process**:
- `item.split('=')` → `["token", "abc", "def", "ghi"]`
- `[param, value]` → `param = "token"`, `value = "abc"` (rest is ignored)

**Output**:
```typescript
{ token: "abc" }
```

**⚠️ PROBLEM**: Values with `=` are truncated!

**Alternative for complex values**:
```typescript
// If using split('=', 1) - gets everything after first =
data[param] = item.substring(param.length + 1);
```

---

### Example 7: Input Null/Undefined

**Input**:
```typescript
const queries1 = getQueries(null);
const queries2 = getQueries(undefined);
```

**Process**:
- `if (!query) return null;` → Short-circuit

**Output**:
```typescript
null  // both
```

---

### Example 8: Empty Query String

**Input**:
```typescript
const queries = getQueries("?");
```

**Process**:
1. `substring(1)`: `"?".substring(1)` → `""` (empty string)
2. `split('&')`: `"".split('&')` → `[""]`
3. `reduce()`:
   - `item = ""`
   - `item.split('=')` → `[""]`
   - `data[""] = undefined`

**Output**:
```typescript
{ "": undefined }
```

**⚠️ PROBLEM**: Empty pattern creates empty key!

---

### Example 9: Duplicate Parameters

**Input**:
```typescript
const queries = getQueries("?page=1&page=2");
```

**Process**:
- `data["page"] = "1"` → `data["page"] = "2"` (overwrite)

**Output**:
```typescript
{ page: "2" }
```

**⚠️ PROBLEM**: Duplicate values are overwritten!

---

### Example 10: Path without Query String

**Input**:
```typescript
const queries = getQueries("?page=1&limit=10");
// query = "?page=1&limit=10"
// substring(1) = "page=1&limit=10"
// split('&') = ["page=1", "limit=10"]
// reduce() = { page: "1", limit: "10" }

// But getRouteParams removes the 'query' group from regex groups
// getRouteParams({ query: "?page=1&limit=10" }) → {}
```

**Output**:
```typescript
// In a complete context:
const params = getRouteParams(groups);     // {}
const queries = getQueries(groups['query']); // { page: "1", limit: "10" }
```

## Integration with buildRoutePath

### Complete Flow

```typescript
// 1. buildRoutePath creates regex with 'query' group
const routeRegex = buildRoutePath("/users");
// /^\/users(?<query>\?.*)?$/

// 2. Execute on path
const regexVerifier = routeRegex.exec("/users?page=1&limit=10");
// groups = { query: "?page=1&limit=10" }

// 3. getRouteParams extracts parameters (removes 'query')
const params = getRouteParams(groups);  // {} (no route parameters)

// 4. getQueries parses the query string
const queries = getQueries(groups['query']);  // { page: "1", limit: "10" }
```

### Responsibility Division

| Function | Input | Output | Responsibility |
|--------|-------|--------|------------------|
| `buildRoutePath()` | Path string | `RegExp` | Compilation |
| `exec()` | Path | `execResult` | Match |
| `getRouteParams()` | `execResult.groups` | `Record<string, string>` | Route parameters |
| `getQueries()` | `execResult.groups.query` | `Record<string, string>` | Query string |

## Edge Case Handling

### Edge Case 1: Input Null/Undefined

```typescript
getQueries(null)      // return null
getQueries(undefined) // return null
```

**Behavior**: Short-circuit with `if (!query)` → `null`

---

### Edge Case 2: Empty Query String

```typescript
getQueries("")        // return {} (substring(1) = "", split = [""])
getQueries("?")       // return { "": undefined } (⚠️ problematic)
```

**Inconsistency**: `""` vs `"?` produce different results.

---

### Edge Case 3: Parameter without Value

```typescript
getQueries("?page")   // return { page: undefined }
```

**Result**: Key present with value `undefined`.

---

### Edge Case 4: Empty Value

```typescript
getQueries("?page=")  // return { page: "" }
```

**Result**: Key present with empty value.

---

### Edge Case 5: Special Characters (URL Encoding)

```typescript
getQueries("?name=John%20Doe")  // return { name: "John%20Doe" }
```

**Note**: `%20` is not automatically decoded. Should use `decodeURIComponent`.

**Possible improvement**:
```typescript
export function getQueries(query: string | undefined | null): Record<string, string> | null {
  if (!query) return null;
  
  return query.substring(1).split('&').reduce<Record<string, string>>((data, item) => {
    const [param, value] = item.split('=');
    data[param] = value ? decodeURIComponent(value) : '';
    return data;
  }, {});
}
```

---

### Edge Case 6: Duplicate Parameters

```typescript
getQueries("?page=1&page=2")  // return { page: "2" }
```

**Behavior**: Last value wins.

**Alternative for array**:
```typescript
data[param] = data[param] 
  ? [...Array.isArray(data[param]) ? data[param] : [data[param]], value]
  : [value];
```

## Usage in Routes

### In getRouteIndex()

```typescript
private getRouteIndex(path: string, method: string): number {
  return this.routes.findIndex((e) => {
    const regexVerifier = e.sufix.exec(path);
    if (!regexVerifier) return false;
    if (e.method !== method) return false;
    if (regexVerifier.find((t) => t === path)) {
      e.params = getRouteParams(regexVerifier.groups as Record<string, string>);
      e.queries = getQueries(regexVerifier.groups?.['query']);  // ← Usage
      return true;
    }
    return false;
  });
}
```

### Handler Context

```typescript
const requestCycleObject: HandlerContext = Object.freeze({
  body,
  params,      // from getRouteParams
  headers,
  queries,     // from getQueries
});
```

## Known Problems

### 1. Truncation of Values with `=`

```typescript
getQueries("?url=https://example.com");
// Expected: { url: "https://example.com" }
// Actual: { url: "https://example.com" }  // works in this case
```

**Careful**: If value has multiple `=`:
```typescript
getQueries("?token=a=b=c");
// Expected: { token: "a=b=c" }
// Actual: { token: "a" }
```

**Solution**:
```typescript
const [param, ...valueParts] = item.split('=');
data[param] = valueParts.join('=');
```

### 2. Overwriting Duplicate Parameters

```typescript
getQueries("?page=1&page=2");
// Expected: { page: ["1", "2"] } or error
// Actual: { page: "2" }
```

### 3. No URL Decoding

```typescript
getQueries("?name=John%20Doe");
// Expected: { name: "John Doe" }
// Actual: { name: "John%20Doe" }
```

### 4: Empty Query String

```typescript
getQueries("?");
// Expected: null or {}
// Actual: { "": undefined }
```

## Performance Considerations

### Complexity

- **Time**: O(n) where n = length of query string
- **Space**: O(k) where k = number of parameters

### Operations

1. `substring(1)`: O(n) - string copy
2. `split('&')`: O(n) - creates array
3. `reduce()`: O(k) - iterates over k items
4. `split('=')`: O(m) where m = length of item

### Possible Optimization

```typescript
// Avoid substring(1) - use initial index
export function getQueries(query: string | undefined | null): Record<string, string> | null {
  if (!query) return null;
  
  let start = 0;
  if (query.charAt(0) === '?') start = 1;
  
  // rest same
}
```

---

## Summary

| Aspect | Implementation |
|--------|---------------|
| **Responsibility** | Parse query string into object |
| **Input** | `string \| undefined \| null` |
| **Output** | `Record<string, string> \| null` |
| **Format** | `?key1=value1&key2=value2` |
| **Empty** | `null` if input is null/undefined |

### Return Contract

| Input | Output | Notes |
|-------|--------|-------|
| `null` | `null` | Short-circuit |
| `undefined` | `null` | Short-circuit |
| `""` | `""` → `{ "": undefined }` | ⚠️ |
| `"?"` | `"?"` → `{ "": undefined }` | ⚠️ |
| `"?page=1"` | `{ page: "1" }` | Normal |
| `"?page="` | `{ page: "" }` | Empty value |

### Design Decisions

1. **Return `null` not `{}`**: To differentiate "no query" from "empty query"
2. **`substring(1)`**: Simpler than index tracking
3. **Destructuring**: `const [param, value] = item.split('=')`

### Advantages

- **Simple**: Direct logic
- **Fast**: O(n) linear
- **Predictable**: Known behavior (except edge cases)

### Limitations

- **No decoding**: `%20` is not converted
- **No array**: Duplicate values are overwritten
- **No validation**: Keys/values not validated
- **Multiple `=`**: Values are truncated

### Possible Improvements

```typescript
export function getQueries(query: string | undefined | null): Record<string, string | string[]> | null {
  if (!query) return null;
  
  let start = 0;
  if (query.charAt(0) === '?') start = 1;
  
  return query.substring(start).split('&').reduce<Record<string, string | string[]>>((data, item) => {
    const idx = item.indexOf('=');
    if (idx === -1) return data;  // skip invalid
    
    const param = item.substring(0, idx);
    const value = item.substring(idx + 1) ? decodeURIComponent(item.substring(idx + 1)) : '';
    
    // Support for multiple values
    if (data[param]) {
      data[param] = Array.isArray(data[param]) 
        ? [...data[param] as string[], value]
        : [data[param] as string, value];
    } else {
      data[param] = value;
    }
    return data;
  }, {});
}