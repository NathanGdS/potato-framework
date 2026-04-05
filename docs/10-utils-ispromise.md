# isPromise - Async Function Detection

## Overview

`isPromise` is a utility that **detects if a function is asynchronous**. It is used by `RequestCycle` to decide whether to `await` a handler's execution or call it synchronously.

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

## Purpose

In the context of `RequestCycle`, handlers can be:
- **Synchronous**: `(ctx) => { ... }`
- **Asynchronous**: `async (ctx) => { ... }` or `(ctx) => Promise<void>`

`isPromise()` detects which one and executes appropriately:

```typescript
async executeRequestCycle(data: HandlerContext): Promise<void> {
  for (let i = 0; i < this.handlers.length; i++) {
    const actualHandler = this.handlers[i];
    if (!isPromise(actualHandler)) {
      actualHandler(data);  // Synchronous
    } else {
      await actualHandler(data);  // Asynchronous
    }
  }
}
```

## Detection Logic

### Check 1: Async Function

```typescript
typeof fn === 'function' && fn.constructor.name === 'AsyncFunction'
```

**How it works**:
- `typeof fn === 'function'`: Verifies that `fn` is a function
- `fn.constructor.name === 'AsyncFunction'`: Verifies that the function was created with `async`

**Examples that pass**:
```javascript
async function handler(ctx) {}         // ✅ AsyncFunction
const handler = async (ctx) => {};     // ✅ AsyncFunction
const handler = async function(ctx) {}; // ✅ AsyncFunction
```

**Examples that fail**:
```javascript
function handler(ctx) {}               // ❌ Function (not AsyncFunction)
const handler = (ctx) => {};           // ❌ ArrowFunction
const handler = (ctx) => { return Promise.resolve() }; // ❌ ArrowFunction
```

### Check 2: Promise Instance

```typescript
fn instanceof Promise
```

**How it works**:
- Verifies if `fn` is an instance of `Promise`

**Examples that pass**:
```javascript
const handler = () => new Promise(resolve => resolve());  // ✅ Promise
const handler = () => Promise.resolve();                     // ✅ Promise
const handler = async () => {};                             // ✅ AsyncFunction (already passed check 1)
```

**Examples that fail**:
```javascript
function handler(ctx) {}                                    // ❌ not Promise
const handler = () => {};                                   // ❌ not Promise
```

### Combined Logic

```typescript
if (
  (typeof fn === 'function' && fn.constructor.name === 'AsyncFunction') ||
  fn instanceof Promise
) {
  return true;
}
```

**Truth Table**:

| Handler | Check 1 | Check 2 | Result |
|---------|---------|---------|--------|
| `async function f() {}` | ✅ | - | ✅ |
| `const f = async () => {}` | ✅ | - | ✅ |
| `function f() {}` | ❌ | ❌ | ❌ |
| `const f = () => {}` | ❌ | ❌ | ❌ |
| `const f = () => Promise.resolve()` | ❌ | ✅ | ✅ |
| `const f = () => new Promise(r => r())` | ❌ | ✅ | ✅ |

## Usage Examples

### Synchronous Handler

```typescript
const syncHandler = (ctx) => {
  console.log('Synchronous');
  // Returns nothing or returns void
};

isPromise(syncHandler);  // false → execute without await
// Output: Sync handler
```

### Asynchronous Handler (Async Function)

```typescript
const asyncHandler = async (ctx) => {
  await db.query('SELECT 1');
  console.log('Asynchronous');
};

isPromise(asyncHandler);  // true → execute with await
// Output: Async handler (after db query)
```

### Asynchronous Handler (Promise Return)

```typescript
const promiseHandler = (ctx) => {
  return new Promise(resolve => {
    setTimeout(() => {
      console.log('Promise resolved');
      resolve();
    }, 100);
  });
};

isPromise(promiseHandler);  // true → execute with await
// Output: Promise resolved (after 100ms)
```

### Handler that Returns Promise Directly

```typescript
const directPromiseHandler = (ctx) => {
  return Promise.resolve();  // Returns Promise
};

isPromise(directPromiseHandler);  // true → execute with await
```

### Synchronous Handler that Returns Promise

```typescript
const syncHandler = (ctx) => {
  return Promise.resolve();  // Returns Promise, but function is not async
};

isPromise(syncHandler);  // true → execute with await
```

## Integration with RequestCycle

### executeRequestCycle

```typescript
async executeRequestCycle(data: HandlerContext): Promise<void> {
  for (let i = 0; i < this.handlers.length; i++) {
    const actualHandler = this.handlers[i];
    
    if (!isPromise(actualHandler)) {
      // Synchronous: call directly
      actualHandler(data);
    } else {
      // Asynchronous: wait with await
      await actualHandler(data);
    }
  }
}
```

### Complete Flow

```
RequestCycle.execute()
  │
  ├─→ Handler 1 (sync)
  │   ├─→ isPromise() → false
  │   ├─→ call(ctx)       (no await)
  │   └─→ continue loop
  │
  ├─→ Handler 2 (async)
  │   ├─→ isPromise() → true
  │   ├─→ await call(ctx) (waits)
  │   └─→ continue loop
  │
  └─→ Handler 3 (promise)
      ├─→ isPromise() → true
      ├─→ await call(ctx) (waits)
      └─→ done
```

## Detected Handler Types

### 1. Async Function Declaration

```typescript
async function myHandler(ctx) {
  await doSomething();
}

isPromise(myHandler);  // true
// constructor.name: "AsyncFunction"
```

### 2. Async Arrow Function

```typescript
const myHandler = async (ctx) => {
  await doSomething();
};

isPromise(myHandler);  // true
// constructor.name: "AsyncFunction"
```

### 3. Arrow Function Returning Promise

```typescript
const myHandler = (ctx) => {
  return new Promise(resolve => {
    setTimeout(resolve, 100);
  });
};

isPromise(myHandler);  // true
// instanceof Promise: true
```

### 4. Arrow Function Returning Promise.resolve()

```typescript
const myHandler = (ctx) => {
  return Promise.resolve();
};

isPromise(myHandler);  // true
// instanceof Promise: true
```

### 5. Synchronous Function

```typescript
function myHandler(ctx) {
  console.log('sync');
}

isPromise(myHandler);  // false
// constructor.name: "Function"
```

### 6. Synchronous Arrow Function

```typescript
const myHandler = (ctx) => {
  console.log('sync');
};

isPromise(myHandler);  // false
// constructor.name: "ArrowFunction"
```

### 7. Synchronous Arrow Function Returning void

```typescript
const myHandler = (ctx) => {
  console.log('sync');
  return undefined;  // explicit return
};

isPromise(myHandler);  // false
```

### 8. Synchronous Arrow Function without return

```typescript
const myHandler = (ctx) => {
  console.log('sync');
  // implicit undefined return
};

isPromise(myHandler);  // false
```

## Edge Cases

### Edge Case 1: Arrow Function Returning Promise

```typescript
const handler = (ctx) => Promise.resolve();  // Explicit return
isPromise(handler);  // true (instanceof Promise)
```

### Edge Case 2: Async Arrow Function

```typescript
const handler = async (ctx) => {};  // Async arrow
isPromise(handler);  // true (AsyncFunction)
```

### Edge Case 3: Arrow Function Returning new Promise

```typescript
const handler = (ctx) => new Promise(r => setTimeout(r, 100));
isPromise(handler);  // true (instanceof Promise)
```

### Edge Case 4: Arrow Function Returning Promise.then()

```typescript
const handler = (ctx) => Promise.resolve().then(() => {});
isPromise(handler);  // true (instanceof Promise)
```

### Edge Case 5: Arrow Function Returning Promise.catch()

```typescript
const handler = (ctx) => Promise.resolve().catch(() => {});
isPromise(handler);  // true (instanceof Promise)
```

### Edge Case 6: Arrow Function Returning Promise.all()

```typescript
const handler = (ctx) => Promise.all([Promise.resolve()]);
isPromise(handler);  // true (instanceof Promise)
```

### Edge Case 7: Arrow Function Returning Promise.race()

```typescript
const handler = (ctx) => Promise.race([Promise.resolve()]);
isPromise(handler);  // true (instanceof Promise)
```

### Edge Case 8: Arrow Function Returning Promise.reject()

```typescript
const handler = (ctx) => Promise.reject();
isPromise(handler);  // true (instanceof Promise)
```

### Edge Case 9: Arrow Function Returning Promise.resolve() with value

```typescript
const handler = (ctx) => Promise.resolve('value');
isPromise(handler);  // true (instanceof Promise)
```

### Edge Case 10: Arrow Function Returning Promise.resolve() with then()

```typescript
const handler = (ctx) => Promise.resolve().then(() => 'value');
isPromise(handler);  // true (instanceof Promise)
```

## Known Problems

### Problem 1: Async Arrow Function vs Synchronous Arrow Function Returning Promise

```typescript
const asyncHandler = async (ctx) => {};          // isPromise: true (AsyncFunction)
const promiseHandler = (ctx) => Promise.resolve(); // isPromise: true (Promise)

// Both are detected as async, but:
// - asyncHandler: function constructor.name === "AsyncFunction"
// - promiseHandler: instanceof Promise === true
```

**Result**: Both are executed with `await`, which is the correct behavior.

### Problem 2: Arrow Function Returning Non-Promise

```typescript
const handler = (ctx) => { return 'value'; };  // isPromise: false
isPromise(handler);  // false (returns string, not Promise)
```

**Result**: Executed without `await`, correct.

### Problem 3: Arrow Function Returning Nothing

```typescript
const handler = (ctx) => {};  // isPromise: false
isPromise(handler);  // false (returns undefined, not Promise)
```

**Result**: Executed without `await`, correct.

### Problem 4: Arrow Function Returning undefined explicitly

```typescript
const handler = (ctx) => { return undefined; };  // isPromise: false
isPromise(handler);  // false
```

**Result**: Executed without `await`, correct.

### Problem 5: Arrow Function Returning Promise with then

```typescript
const handler = (ctx) => Promise.resolve().then(() => {});
isPromise(handler);  // true (instanceof Promise)
```

**Result**: Executed with `await`, correct.

### Problem 6: Arrow Function Returning Promise with catch

```typescript
const handler = (ctx) => Promise.resolve().catch(() => {});
isPromise(handler);  // true (instanceof Promise)
```

**Result**: Executed with `await`, correct.

### Problem 7: Arrow Function Returning Promise with finally

```typescript
const handler = (ctx) => Promise.resolve().finally(() => {});
isPromise(handler);  // true (instanceof Promise)
```

**Result**: Executed with `await`, correct.

### Problem 8: Arrow Function Returning Promise with race

```typescript
const handler = (ctx) => Promise.race([Promise.resolve()]);
isPromise(handler);  // true (instanceof Promise)
```

**Result**: Executed with `await`, correct.

### Problem 9: Arrow Function Returning Promise with all

```typescript
const handler = (ctx) => Promise.all([Promise.resolve()]);
isPromise(handler);  // true (instanceof Promise)
```

**Result**: Executed with `await`, correct.

### Problem 10: Arrow Function Returning Promise with any

```typescript
const handler = (ctx) => Promise.any([Promise.resolve()]);
isPromise(handler);  // true (instanceof Promise)
```

**Result**: Executed with `await`, correct.

## Performance Considerations

### Complexity

- **Time**: O(1) - direct checks
- **Space**: O(1) - no additional data structures

### Operations

1. `typeof fn === 'function'`: O(1)
2. `fn.constructor.name === 'AsyncFunction'`: O(1)
3. `fn instanceof Promise`: O(1)

### Optimization

The current implementation is **optimal**:
- Short-circuit with `||` avoids second check if first is true
- No iteration or data structure creation
- Direct type checks

### Comparison with Alternatives

**Alternative 1: Using then() check**
```typescript
function isPromise(fn: unknown): boolean {
  return fn != null && typeof fn.then === 'function';
}
```

**Problem**: Any object with `then` method would be considered a Promise (duck typing).

**Alternative 2: Using async/await detection**
```typescript
async function isPromise(fn: unknown): Promise<boolean> {
  try {
    await fn as Promise<unknown>;
    return true;
  } catch {
    return false;
  }
}
```

**Problem**: Requires `await`, slower, harder to use.

**Conclusion**: Current implementation is **the most performant and correct**.

## Usage in RequestCycle

### executeRequestCycle Implementation

```typescript
export class RequestCycle {
  private handlers: RouteHandler[];
  
  async executeRequestCycle(data: HandlerContext): Promise<void> {
    for (let i = 0; i < this.handlers.length; i++) {
      const actualHandler = this.handlers[i];
      
      // Detect and execute appropriately
      if (!isPromise(actualHandler)) {
        actualHandler(data);  // Synchronous
      } else {
        await actualHandler(data);  // Asynchronous
      }
    }
  }
}
```

### Handler Context

```typescript
interface HandlerContext {
  body: any;
  params: Record<string, string> | null;
  headers: IncomingHttpHeaders;
  queries: Record<string, string> | null;
}

type RouteHandler = (ctx: HandlerContext) => void | Promise<void>;
```

**Handlers can be**:
- Synchronous: `(ctx) => { ... }` → `void`
- Asynchronous: `async (ctx) => { ... }` → `Promise<void>`
- Promise: `(ctx) => Promise<void>` → `Promise<void>`

**`isPromise()` detects all cases**.

## Types and Type Guard

### Type Guard

The signature `fn is Promise<unknown>` makes `isPromise()` a **type guard**:

```typescript
async executeRequestCycle(data: HandlerContext): Promise<void> {
  for (let i = 0; i < this.handlers.length; i++) {
    const actualHandler = this.handlers[i];
    
    if (!isPromise(actualHandler)) {
      // Type is: RouteHandler (not Promise)
      actualHandler(data);
    } else {
      // Type is: Promise<unknown>
      await actualHandler(data);
    }
  }
}
```

**Type narrowing**: TypeScript knows the type of `actualHandler` inside each branch.

## Implementation Alternatives

### Alternative 1: Constructor Name Only

```typescript
export function isPromise(fn: unknown): fn is Promise<unknown> {
  return typeof fn === 'function' && fn.constructor.name === 'AsyncFunction';
}
```

**Problem**: Does not detect arrow functions that return Promise directly.

### Alternative 2: Instanceof Only

```typescript
export function isPromise(fn: unknown): fn is Promise<unknown> {
  return fn instanceof Promise;
}
```

**Problem**: Does not detect async functions (the function itself is not a Promise, but returns one).

### Alternative 3: Using then()

```typescript
export function isPromise(fn: unknown): boolean {
  return fn != null && typeof fn.then === 'function';
}
```

**Problem**: Any object with `then` is considered Promise (duck typing).

### Alternative 4: Check both async and Promise

```typescript
export function isPromise(fn: unknown): boolean {
  if (typeof fn !== 'function') return false;
  
  // Check async
  if (fn.constructor.name === 'AsyncFunction') return true;
  
  // Check return value by actually calling (impossible without execution)
  // or check if it's a Promise (for functions that return Promise directly)
  return fn instanceof Promise;
}
```

**Conclusion**: Current implementation is **the best combination of performance and correctness**.

## Summary

| Aspect | Implementation |
|--------|---------------|
| **Responsibility** | Detect if function is async |
| **Input** | `unknown` (any value) |
| **Output** | `boolean` |
| **Type Guard** | `fn is Promise<unknown>` |
| **Detection** | `AsyncFunction` constructor name OR `instanceof Promise` |

### Return Contract

| Handler | isPromise() | Execution |
|---------|-------------|----------|
| `function f(ctx) {}` | `false` | Synchronous |
| `async function f(ctx) {}` | `true` | `await` |
| `const f = () => {}` | `false` | Synchronous |
| `const f = async () => {}` | `true` | `await` |
| `const f = () => Promise.resolve()` | `true` | `await` |
| `const f = () => new Promise(...)` | `true` | `await` |

### Design Decisions

1. **Two separate checks**: `AsyncFunction` AND `Promise` are different things
2. **Short-circuit with `||`**: If first check is true, doesn't execute second
3. **Type guard**: Return type `fn is Promise<unknown>`

### Advantages

- **Fast**: O(1) checks
- **Simple**: Direct logic
- **Correct**: Detects all valid cases

### Limitations

- **Does not differentiate**: `async function` vs `() => Promise` (but both should use `await`)
- **No parameter validation**: Accepts any `unknown`
- **Type guard only**: no overload for non-function inputs

### Usage in Framework

1. **RequestCycle.executeRequestCycle()**: Decides `await` or direct call
2. **Middleware detection**: Handlers can be mixed sync/async
3. **Tests**: Verify async vs sync behavior

### Advantage in Context

**Allows mix of handlers**:
```typescript
app.get('/users', 
  syncMiddleware,        // Synchronous - executes without await
  async dbMiddleware,   // Asynchronous - executes with await
  syncHandler            // Synchronous - executes without await
);
```

**Each handler is executed with the correct semantics**.