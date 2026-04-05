# isPromise - Detecção de Funções Assíncronas

## Visão Geral

`isPromise` é um utilitário que **detecta se uma função é assíncrona**. Ele é usado pelo `RequestCycle` para decidir se deve `await` a execução de um handler ou chamar síncronamente.

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

## Propósito

No contexto do `RequestCycle`, handlers podem ser:
- **Síncronos**: `(ctx) => { ... }`
- **Assíncronos**: `async (ctx) => { ... }` ou `(ctx) => Promise<void>`

`isPromise()` detecta qual é e executa adequadamente:

```typescript
async executeRequestCycle(data: HandlerContext): Promise<void> {
  for (let i = 0; i < this.handlers.length; i++) {
    const actualHandler = this.handlers[i];
    if (!isPromise(actualHandler)) {
      actualHandler(data);  // Síncrono
    } else {
      await actualHandler(data);  // Assíncrono
    }
  }
}
```

## Lógica de Detecção

### Check 1: Async Function

```typescript
typeof fn === 'function' && fn.constructor.name === 'AsyncFunction'
```

**Como funciona**:
- `typeof fn === 'function'`: Verifica que `fn` é uma função
- `fn.constructor.name === 'AsyncFunction'`: Verifica que a função foi criada com `async`

**Exemplos que passam**:
```javascript
async function handler(ctx) {}         // ✅ AsyncFunction
const handler = async (ctx) => {};     // ✅ AsyncFunction
const handler = async function(ctx) {}; // ✅ AsyncFunction
```

**Exemplos que falham**:
```javascript
function handler(ctx) {}               // ❌ Function (not AsyncFunction)
const handler = (ctx) => {};           // ❌ ArrowFunction
const handler = (ctx) => { return Promise.resolve() }; // ❌ ArrowFunction
```

### Check 2: Promise Instance

```typescript
fn instanceof Promise
```

**Como funciona**:
- Verifica se `fn` é uma instância de `Promise`

**Exemplos que passam**:
```javascript
const handler = () => new Promise(resolve => resolve());  // ✅ Promise
const handler = () => Promise.resolve();                     // ✅ Promise
const handler = async () => {};                             // ✅ AsyncFunction (já passou no check 1)
```

**Exemplos que falham**:
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

**Tabela de Truth**:

| Handler | Check 1 | Check 2 | Result |
|---------|---------|---------|--------|
| `async function f() {}` | ✅ | - | ✅ |
| `const f = async () => {}` | ✅ | - | ✅ |
| `function f() {}` | ❌ | ❌ | ❌ |
| `const f = () => {}` | ❌ | ❌ | ❌ |
| `const f = () => Promise.resolve()` | ❌ | ✅ | ✅ |
| `const f = () => new Promise(r => r())` | ❌ | ✅ | ✅ |

## Exemplos de Uso

### Handler Síncrono

```typescript
const syncHandler = (ctx) => {
  console.log('Síncrono');
  // Não retorna nada ou retorna void
};

isPromise(syncHandler);  // false → execute sem await
// Output: Sync handler
```

### Handler Assíncrono (Async Function)

```typescript
const asyncHandler = async (ctx) => {
  await db.query('SELECT 1');
  console.log('Assíncrono');
};

isPromise(asyncHandler);  // true → execute com await
// Output: Async handler (after db query)
```

### Handler Assíncrono (Promise Return)

```typescript
const promiseHandler = (ctx) => {
  return new Promise(resolve => {
    setTimeout(() => {
      console.log('Promise resolved');
      resolve();
    }, 100);
  });
};

isPromise(promiseHandler);  // true → execute com await
// Output: Promise resolved (after 100ms)
```

### Handler que Retorna Promise Diretamente

```typescript
const directPromiseHandler = (ctx) => {
  return Promise.resolve();  // Retorna Promise
};

isPromise(directPromiseHandler);  // true → execute com await
```

### Handler Síncrono que Retorna Promise

```typescript
const syncHandler = (ctx) => {
  return Promise.resolve();  // Retorna Promise, mas função não é async
};

isPromise(syncHandler);  // true → execute com await
```

## Integração com RequestCycle

### ExecuteRequestCycle

```typescript
async executeRequestCycle(data: HandlerContext): Promise<void> {
  for (let i = 0; i < this.handlers.length; i++) {
    const actualHandler = this.handlers[i];
    
    if (!isPromise(actualHandler)) {
      // Síncrono: chama diretamente
      actualHandler(data);
    } else {
      // Assíncrono: espera com await
      await actualHandler(data);
    }
  }
}
```

### Fluxo Completo

```
RequestCycle.execute()
  │
  ├─→ Handler 1 (sync)
  │   ├─→ isPromise() → false
  │   ├─→ call(ctx)       (sem await)
  │   └─→ continue loop
  │
  ├─→ Handler 2 (async)
  │   ├─→ isPromise() → true
  │   ├─→ await call(ctx) (espera)
  │   └─→ continue loop
  │
  └─→ Handler 3 (promise)
      ├─→ isPromise() → true
      ├─→ await call(ctx) (espera)
      └─→ done
```

## Tipos de Handlers Detectados

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

### 3. Arrow Function Retornando Promise

```typescript
const myHandler = (ctx) => {
  return new Promise(resolve => {
    setTimeout(resolve, 100);
  });
};

isPromise(myHandler);  // true
// instanceof Promise: true
```

### 4. Arrow Function Retornando Promise.resolve()

```typescript
const myHandler = (ctx) => {
  return Promise.resolve();
};

isPromise(myHandler);  // true
// instanceof Promise: true
```

### 5. Function Síncrona

```typescript
function myHandler(ctx) {
  console.log('sync');
}

isPromise(myHandler);  // false
// constructor.name: "Function"
```

### 6. Arrow Function Síncrona

```typescript
const myHandler = (ctx) => {
  console.log('sync');
};

isPromise(myHandler);  // false
// constructor.name: "ArrowFunction"
```

### 7. arrow Function Síncrona que Retorna void

```typescript
const myHandler = (ctx) => {
  console.log('sync');
  return undefined;  // explicit return
};

isPromise(myHandler);  // false
```

### 8. Arrow Function Síncrona sem return

```typescript
const myHandler = (ctx) => {
  console.log('sync');
  // implicit undefined return
};

isPromise(myHandler);  // false
```

## Casos Edge

### Edge Case 1: Arrow Function que Retorna Promise

```typescript
const handler = (ctx) => Promise.resolve();  // Explicit return
isPromise(handler);  // true (instanceof Promise)
```

### Edge Case 2: Arrow Function Async

```typescript
const handler = async (ctx) => {};  // Async arrow
isPromise(handler);  // true (AsyncFunction)
```

### Edge Case 3: Arrow Function que Retorna new Promise

```typescript
const handler = (ctx) => new Promise(r => setTimeout(r, 100));
isPromise(handler);  // true (instanceof Promise)
```

### Edge Case 4: Arrow Function que Retorna Promise.then()

```typescript
const handler = (ctx) => Promise.resolve().then(() => {});
isPromise(handler);  // true (instanceof Promise)
```

### Edge Case 5: Arrow Function que Retorna Promise.catch()

```typescript
const handler = (ctx) => Promise.resolve().catch(() => {});
isPromise(handler);  // true (instanceof Promise)
```

### Edge Case 6: Arrow Function que Retorna Promise.all()

```typescript
const handler = (ctx) => Promise.all([Promise.resolve()]);
isPromise(handler);  // true (instanceof Promise)
```

### Edge Case 7: Arrow Function que Retorna Promise.race()

```typescript
const handler = (ctx) => Promise.race([Promise.resolve()]);
isPromise(handler);  // true (instanceof Promise)
```

### Edge Case 8: Arrow Function que Retorna Promise.reject()

```typescript
const handler = (ctx) => Promise.reject();
isPromise(handler);  // true (instanceof Promise)
```

### Edge Case 9: Arrow Function que Retorna Promise.resolve() com valor

```typescript
const handler = (ctx) => Promise.resolve('value');
isPromise(handler);  // true (instanceof Promise)
```

### Edge Case 10: Arrow Function que Retorna Promise.resolve() com then()

```typescript
const handler = (ctx) => Promise.resolve().then(() => 'value');
isPromise(handler);  // true (instanceof Promise)
```

## Problemas Conhecidos

### Problem 1: Arrow Function Async vs Arrow Function Síncrona que Retorna Promise

```typescript
const asyncHandler = async (ctx) => {};          // isPromise: true (AsyncFunction)
const promiseHandler = (ctx) => Promise.resolve(); // isPromise: true (Promise)

// Ambos são detectados como async, mas:
// - asyncHandler: function constructor.name === "AsyncFunction"
// - promiseHandler: instanceof Promise === true
```

**Resultado**: Ambos são executados com `await`, que é o comportamento correto.

### Problem 2: Arrow Function que Retorna Não-Promise

```typescript
const handler = (ctx) => { return 'value'; };  // isPromise: false
isPromise(handler);  // false (retorna string, não Promise)
```

**Resultado**: Executado sem `await`, correto.

### Problem 3: Arrow Function que Não Retorna Nada

```typescript
const handler = (ctx) => {};  // isPromise: false
isPromise(handler);  // false (retorna undefined, não Promise)
```

**Resultado**: Executado sem `await`, correto.

### Problem 4: Arrow Function que Retorna undefined explicitamente

```typescript
const handler = (ctx) => { return undefined; };  // isPromise: false
isPromise(handler);  // false
```

**Resultado**: Executado sem `await`, correto.

### Problem 5: Arrow Function que Retorna Promise com then

```typescript
const handler = (ctx) => Promise.resolve().then(() => {});
isPromise(handler);  // true (instanceof Promise)
```

**Resultado**: Executado com `await`, correto.

### Problem 6: Arrow Function que Retorna Promise com catch

```typescript
const handler = (ctx) => Promise.resolve().catch(() => {});
isPromise(handler);  // true (instanceof Promise)
```

**Resultado**: Executado com `await`, correto.

### Problem 7: Arrow Function que Retorna Promise com finally

```typescript
const handler = (ctx) => Promise.resolve().finally(() => {});
isPromise(handler);  // true (instanceof Promise)
```

**Resultado**: Executado com `await`, correto.

### Problem 8: Arrow Function que Retorna Promise com race

```typescript
const handler = (ctx) => Promise.race([Promise.resolve()]);
isPromise(handler);  // true (instanceof Promise)
```

**Resultado**: Executado com `await`, correto.

### Problem 9: Arrow Function que Retorna Promise com all

```typescript
const handler = (ctx) => Promise.all([Promise.resolve()]);
isPromise(handler);  // true (instanceof Promise)
```

**Resultado**: Executado com `await`, correto.

### Problem 10: Arrow Function que Retorna Promise com any

```typescript
const handler = (ctx) => Promise.any([Promise.resolve()]);
isPromise(handler);  // true (instanceof Promise)
```

**Resultado**: Executado com `await`, correto.

## Performance Considerations

### Complexidade

- **Time**: O(1) - verificações diretas
- **Space**: O(1) - nenhuma estrutura de dados adicional

### Operações

1. `typeof fn === 'function'`: O(1)
2. `fn.constructor.name === 'AsyncFunction'`: O(1)
3. `fn instanceof Promise`: O(1)

### Otimização

A implementação atual já é **ótima**:
- Short-circuit com `||` evita segundo check se primeiro for true
- Nenhuma iteração ou criação de estrutura de dados
- Verificações diretas de tipo

### Comparação com Alternativas

**Alternativa 1: Using then() check**
```typescript
function isPromise(fn: unknown): boolean {
  return fn != null && typeof fn.then === 'function';
}
```

**Problema**: Qualquer objeto com método `then` seria considerado Promise (duck typing).

**Alternativa 2: Using async/await detection**
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

**Problema**: Requires `await`, slower, harder to use.

**Conclusão**: A implementação atual é a **mais performática e correta**.

## Uso no RequestCycle

### ExecuteRequestCycle Implementation

```typescript
export class RequestCycle {
  private handlers: RouteHandler[];
  
  async executeRequestCycle(data: HandlerContext): Promise<void> {
    for (let i = 0; i < this.handlers.length; i++) {
      const actualHandler = this.handlers[i];
      
      // Detecta e executa adequadamente
      if (!isPromise(actualHandler)) {
        actualHandler(data);  // Síncrono
      } else {
        await actualHandler(data);  // Assíncrono
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

**Handlers podem**:
- Síncronos: `(ctx) => { ... }` → `void`
- Assíncronos: `async (ctx) => { ... }` → `Promise<void>`
- Promise: `(ctx) => Promise<void>` → `Promise<void>`

**`isPromise()` detecta todos os casos**.

## Tipos e Type Guard

### Type Guard

A assinatura `fn is Promise<unknown>` torna `isPromise()` um **type guard**:

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

**Type narrowing**: TypeScript sabe o tipo de `actualHandler` dentro de cada branch.

## Alternativas de Implementação

### Alternative 1: Constructor Name Only

```typescript
export function isPromise(fn: unknown): fn is Promise<unknown> {
  return typeof fn === 'function' && fn.constructor.name === 'AsyncFunction';
}
```

**Problema**: Não detecta arrow functions que retornam Promise diretamente.

### Alternative 2: Instanceof Only

```typescript
export function isPromise(fn: unknown): fn is Promise<unknown> {
  return fn instanceof Promise;
}
```

**Problema**: Não detecta async functions (a função em si não é Promise, mas retorna uma).

### Alternative 3: Using then()

```typescript
export function isPromise(fn: unknown): boolean {
  return fn != null && typeof fn.then === 'function';
}
```

**Problema**: Qualquer objeto com `then` é considerado Promise (duck typing).

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

**Conclusão**: A implementação atual é a **melhor combinação de performance e corretude**.

## Resumo

| Aspecto | Implementação |
|---------|---------------|
| **Responsabilidade** | Detectar se função é async |
| **Input** | `unknown` (qualquer valor) |
| **Output** | `boolean` |
| **Type Guard** | `fn is Promise<unknown>` |
| **Detecção** | `AsyncFunction` constructor name OR `instanceof Promise` |

### Contrato de Retorno

| Handler | isPromise() | Execução |
|---------|-------------|----------|
| `function f(ctx) {}` | `false` | Síncrona |
| `async function f(ctx) {}` | `true` | `await` |
| `const f = () => {}` | `false` | Síncrona |
| `const f = async () => {}` | `true` | `await` |
| `const f = () => Promise.resolve()` | `true` | `await` |
| `const f = () => new Promise(...)` | `true` | `await` |

### Design Decisions

1. **Dois checks separados**: `AsyncFunction` AND `Promise` são different things
2. **Short-circuit com `||`**: Se primeiro check for true, não executa segundo
3. **Type guard**: Return type `fn is Promise<unknown>`

### Vantagens

- **Rápido**: O(1) verificações
- **Simples**: Lógica direta
- **Correto**: Detecta todos os casos válidos

### Limitações

- **Não diferencia**: `async function` vs `() => Promise` (mas ambos devem usar `await`)
- **Sem validação de parâmetros**: Aceita qualquer `unknown`
- **Type guard only**: não tem overload para não-function inputs

### Casos de Uso no Framework

1. **RequestCycle.executeRequestCycle()**: Decide `await` ou call direto
2. **Middleware detection**: Handlers podem ser mixed sync/async
3. **Testes**: Verificar comportamento async vs sync

### Vantagem no Contexto

**Permite mix de handlers**:
```typescript
app.get('/users', 
  syncMiddleware,        // Síncrono - executa sem await
  async dbMiddleware,    // Assíncrono - executa com await
  syncHandler            // Síncrono - executa sem await
);
```

**Cada handler é executado com a semântica correta**.
