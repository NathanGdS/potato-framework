# Tipos Base do Framework

## Visão Geral

O Potato Framework define dois tipos fundamentais que são usados em toda a engine:

1. **HandlerContext** - O objeto passado para todos os handlers
2. **RouteHandler** - O tipo de função que todos os handlers devem seguir

## HandlerContext

### Definição

```typescript
import type { IncomingHttpHeaders } from 'node:http';

export interface HandlerContext {
  body: any;
  params: Record<string, string> | null;
  headers: IncomingHttpHeaders;
  queries: Record<string, string> | null;
}
```

### Propriedades

| Propriedade | Tipo | Descrição |
|-------------|------|-----------|
| `body` | `any` | Body da requisição parseado como JSON (ou `null`) |
| `params` | `Record<string, string> \| null` | Parâmetros da rota (ex: `:id`) |
| `headers` | `IncomingHttpHeaders` | Headers da requisição |
| `queries` | `Record<string, string> \| null` | Query parameters (ex: `?page=1`) |

### Descrição Detalhada

#### body: any

O corpo da requisição HTTP, parseado de JSON para objeto JavaScript.

**Valores possíveis**:
- `null` - Se não houver body ou body vazio
- `object` - Se body for JSON válido
- `array` - Se body for um JSON array
- `string`, `number`, `boolean` - Se for um JSON primitivo

**Exemplos**:
```typescript
// GET /users (sem body)
ctx.body;  // null

// POST /users com body {"name": "John"}
ctx.body;  // { name: "John" }

// PUT /users com body [{"id": 1}, {"id": 2}]
ctx.body;  // [{ id: 1 }, { id: 2 }]
```

**Nota**: O framework assume que o body é sempre JSON. Se não for, lançará erro.

---

#### params: Record<string, string> \| null

Parâmetros extraídos do path da requisição.

**Formato**: Cada `:parametro` no path se torna uma key no objeto.

**Exemplos**:
```typescript
// GET /users/123
// Path: "/users/:id"
ctx.params;  // { id: "123" }

// GET /users/456/posts/789
// Path: "/users/:userId/posts/:postId"
ctx.params;  // { userId: "456", postId: "789" }

// GET /users
// Path: "/users"
ctx.params;  // null (ou {} dependendo da implementação)
```

**Características**:
- Todos os valores são strings (não há parsing para number)
- Apenas letras minúsculas, dígitos, hífen e underscore são permitidos
- Se não houver parâmetros: `null` (ou objeto vazio `{}`)

---

#### headers: IncomingHttpHeaders

Headers da requisição HTTP, conforme definido no Node.js `http` module.

**Definição do Node.js**:
```typescript
type IncomingHttpHeaders = {
  [key: string]: string | string[] | undefined;
};
```

**Exemplos**:
```typescript
// Request: GET /users HTTP/1.1
// Host: localhost:8000
// User-Agent: curl/7.68.0
// Content-Type: application/json
// Authorization: Bearer token123

ctx.headers['host'];           // "localhost:8000"
ctx.headers['user-agent'];     // "curl/7.68.0"
ctx.headers['content-type'];   // "application/json"
ctx.headers['authorization'];  // "Bearer token123"
```

**Características**:
- Keys são lowercase pelo Node.js
- Valores podem ser string ou string[] (para headers múltiplos)
- Alguns headers comuns:
  - `content-length`
  - `content-type`
  - `authorization`
  - `accept`
  - `accept-language`

---

#### queries: Record<string, string> \| null

Query parameters da URL, parseados em objeto.

**Formato**: `?key1=value1&key2=value2` → `{ key1: "value1", key2: "value2" }`

**Exemplos**:
```typescript
// GET /users?page=1&limit=10
ctx.queries;  // { page: "1", limit: "10" }

// GET /users?sort=desc&order=asc
ctx.queries;  // { sort: "desc", order: "asc" }

// GET /users
ctx.queries;  // null
```

**Características**:
- Todos os valores são strings
- Parâmetros duplicados: último valor vence (current behavior)
- Não há URL decoding automático (ex: `%20` não vira espaço)
- Se não houver query: `null`

---

## RouteHandler

### Definição

```typescript
export type RouteHandler = (ctx: HandlerContext) => void | Promise<void>;
```

### Tipos de Handlers

#### Handler Síncrono

```typescript
const syncHandler: RouteHandler = (ctx) => {
  console.log(ctx.params);
  app.finishRequest(200, { data: 'ok' });
};

// Ou:
function syncHandler(ctx: HandlerContext): void {
  // ...
}
```

**Características**:
- Retorna `void` ou nada (implicit `undefined`)
- Não usa `async`
- Não precisa de `await`

---

#### Handler Assíncrono (Async Function)

```typescript
const asyncHandler: RouteHandler = async (ctx) => {
  const user = await db.findUser(ctx.params?.id);
  app.finishRequest(200, { user });
};

// Ou:
async function asyncHandler(ctx: HandlerContext): Promise<void> {
  // ...
}
```

**Características**:
- Tem `async` keyword
- Pode usar `await`
- Retorna `Promise<void>`
- Deve ser chamado com `await`

---

#### Handler que Retorna Promise Diretamente

```typescript
const promiseHandler: RouteHandler = (ctx) => {
  return new Promise<void>(resolve => {
    setTimeout(() => {
      console.log('Done');
      resolve();
    }, 100);
  });
};

// Ou:
function promiseHandler(ctx: HandlerContext): Promise<void> {
  return db.query();
}
```

**Características**:
- Não tem `async`
- Retorna explicitamente `Promise<void>`
- Deve ser chamado com `await`

---

## Uso no Framework

### Criação do HandlerContext

```typescript
// Em Routes.executeRequestCycle()

const requestCycleObject: HandlerContext = Object.freeze({
  body,
  params,
  headers,
  queries,
});
```

**Importante**: `Object.freeze()` torna o contexto **imutável**.

### Handler Contract

Cada handler deve:

1. **Acessar dados** de `ctx`:
   ```typescript
   const userId = ctx.params?.id;
   const token = ctx.headers['authorization'];
   ```

2. **Não mutar** o contexto (immutability):
   ```typescript
   // ❌ NÃO FAZER:
   ctx.params.id = 'new-value';  // Error (frozen)
   ```

3. **Não chamar `next()`**:
   - O framework executa handlers em sequência
   - Não há mecanismo de `next()`

4. **Chamar `app.finishRequest()`** no final:
   ```typescript
   app.finishRequest(statusCode, data);
   ```

### Ordem de Execução

```typescript
// Registration
app.get('/users', middleware1, middleware2, handler);

// Execution order:
// 1. middleware1(ctx) - não chama finishRequest
// 2. middleware2(ctx) - não chama finishRequest
// 3. handler(ctx) - chama finishRequest
```

### Middleware Pattern

```typescript
const authMiddleware: RouteHandler = async (ctx) => {
  const token = ctx.headers['authorization'];
  
  if (!token) {
    app.finishRequest(401, { error: 'Unauthorized' });
    return;  // Stop chain
  }
  
  // Continue chain - não chama finishRequest
};

const logMiddleware: RouteHandler = (ctx) => {
  console.log(`${ctx.params} accessed`);
  // Continue chain - não chama finishRequest
};

const getHandler: RouteHandler = (ctx) => {
  app.finishRequest(200, { users: [] });  // Final handler
};
```

---

## Comparação com Outros Frameworks

### Express.js

```typescript
// Express
app.get('/users', (req, res, next) => {
  // req, res são objetos separados
  // next() é chamado para passar para próximo middleware
});

// Potato
app.get('/users', (ctx) => {
  // ctx é único objeto com req e res escondidos
  // não há next() - handlers são executados em sequência
});
```

### Fastify

```typescript
// Fastify
app.get('/users', async (request, reply) => {
  // request e reply separados
});

// Potato
app.get('/users', async (ctx) => {
  // único contexto
});
```

---

## Padrões de Uso

### Acessando Todos os Dados

```typescript
const handler: RouteHandler = (ctx) => {
  // Body
  const userData = ctx.body;
  
  // Parameters
  const userId = ctx.params?.id;
  
  // Headers
  const authorization = ctx.headers['authorization'];
  const contentType = ctx.headers['content-type'];
  
  // Queries
  const page = ctx.queries?.page;
  const limit = ctx.queries?.limit;
  
  app.finishRequest(200, {
    userData,
    userId,
    authorization,
    contentType,
    page,
    limit,
  });
};
```

### Middleware de Autenticação

```typescript
const authMiddleware: RouteHandler = async (ctx) => {
  const token = ctx.headers['authorization'];
  
  if (!token) {
    app.finishRequest(401, { error: 'Missing token' });
    return;
  }
  
  // Continue - não chama finishRequest
};
```

### Middleware de Logging

```typescript
const logMiddleware: RouteHandler = (ctx) => {
  const timestamp = new Date().toISOString();
  const method = ctx.headers[':method'] || 'UNKNOWN';
  
  console.log(`[${timestamp}] ${method} - ${ctx.params}`);
  
  // Continue - não chama finishRequest
};
```

### Handler Final

```typescript
const getHandler: RouteHandler = (ctx) => {
  const userId = ctx.params?.id;
  
  // Simples sync handler
  app.finishRequest(200, { id: userId });
};

const postHandler: RouteHandler = async (ctx) => {
  const userData = ctx.body;
  
  // Async handler
  const user = await db.createUser(userData);
  app.finishRequest(201, user);
};
```

---

## Tipos Complementares

### HttpMethod

```typescript
export const HttpMethod = {
  GET: "GET",
  POST: "POST",
  PATCH: "PATCH",
  PUT: "PUT",
  DELETE: "DELETE",
} as const;

export type HttpMethod = (typeof HttpMethod)[keyof typeof HttpMethod];
```

**Uso**:
```typescript
const method: HttpMethod = HttpMethod.GET;  // "GET"
```

### HttpStatusCode

```typescript
export const HttpStatusCode = {
  SUCCESS: 200,
  CREATED: 201,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export type HttpStatusCode = (typeof HttpStatusCode)[keyof typeof HttpStatusCode];
```

**Uso**:
```typescript
app.finishRequest(HttpStatusCode.SUCCESS, data);
```

---

## Resumo

| Tipo | Descrição |
|------|-----------|
| **HandlerContext** | Objeto imutável passado para handlers com body, params, headers, queries |
| **RouteHandler** | Tipo de função `(ctx: HandlerContext) => void \| Promise<void>` |

### HandlerContext

| Propriedade | Tipo | Opcional | Descrição |
|-------------|------|----------|-----------|
| `body` | `any` | Sim | Body parseado (JSON) |
| `params` | `Record<string, string> \| null` | Sim | Parâmetros da rota |
| `headers` | `IncomingHttpHeaders` | Não | Headers HTTP |
| `queries` | `Record<string, string> \| null` | Sim | Query parameters |

### RouteHandler

| Variação | Sintaxe | Uso |
|----------|---------|-----|
| **Síncrono** | `(ctx) => { ... }` | Sem `async` |
| **Async** | `async (ctx) => { ... }` | Com `await` |
| **Promise** | `(ctx) => Promise<void>` | Retorna Promise |

### Contrato de Handler

1. Recebe `HandlerContext` como único parâmetro
2. Não deve mutar o contexto (imutável)
3. Não chama `next()` - framework gerencia sequência
4. Deve chamar `app.finishRequest(statusCode, data)` em algum momento (ou deixar para outro handler)

### Immutability

```typescript
const requestCycleObject: HandlerContext = Object.freeze({
  body,
  params,
  headers,
  queries,
});
```

**Garantia**: Handlers não podem modificar o contexto.

### Type Safety

```typescript
// Type guard para detectar async handlers
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

**Uso**:
```typescript
if (!isPromise(actualHandler)) {
  actualHandler(data);  // Sync
} else {
  await actualHandler(data);  // Async
}
```
