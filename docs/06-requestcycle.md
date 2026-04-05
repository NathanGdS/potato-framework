# RequestCycle - Executor de Handlers

## Visão Geral

`RequestCycle` é a classe responsável por **executar handlers em sequência**. Ela é o coração do pipeline de middleware/handlers, suportando tanto funções síncronas quanto assíncronas.

```typescript
export class RequestCycle {
  private handlers: RouteHandler[];

  constructor(handlers?: RouteHandler[]) {
    this.handlers = handlers ?? [];
  }
}
```

## Estrutura de Dados

### Atributo Privado

| Atributo | Tipo | Descrição |
|----------|------|-----------|
| `handlers` | `RouteHandler[]` | Array de handlers a serem executados |

### Handler Type

```typescript
type RouteHandler = (ctx: HandlerContext) => void | Promise<void>;
```

Handlers podem ser:
- **Síncronos**: `(ctx) => { ... }`
- **Assíncronos**: `async (ctx) => { ... }` ou `(ctx) => Promise<void>`

---

## Constructor

```typescript
constructor(handlers?: RouteHandler[]) {
  this.handlers = handlers ?? [];
}
```

**Comportamento**:
- Se `handlers` fornecido: inicializa com array
- Se `handlers` é `undefined`: inicializa com array vazio

**Uso comum**:
```typescript
// Vazio (adiciona depois)
const cycle = new RequestCycle();

// Com handlers iniciais
const cycle = new RequestCycle([middleware1, middleware2, handler]);
```

---

## add(func)

```typescript
add(func: RouteHandler): void {
  this.handlers.push(func);
}
```

**Responsabilidade**: Adiciona um handler ao final da lista.

**Uso**:
```typescript
const cycle = new RequestCycle();
cycle.add(middleware1);
cycle.add(middleware2);
cycle.add(handler);
```

**Ordem de execução**: Primeiro adicionado → Primeiro executado (FIFO)

---

## addMultiples(funcs)

```typescript
addMultiples(funcs: RouteHandler[]): void {
  this.handlers.push(...funcs);
}
```

**Responsabilidade**: Adiciona múltiplos handlers de uma vez.

**Uso**:
```typescript
const cycle = new RequestCycle();
cycle.addMultiples([middleware1, middleware2, handler]);
```

**Equivalente a**:
```typescript
funcs.forEach(func => cycle.add(func));
```

---

## executeRequestCycle(data)

```typescript
async executeRequestCycle(data: HandlerContext): Promise<void> {
  for (let i = 0; i < this.handlers.length; i++) {
    const actualHandler = this.handlers[i];
    if (!isPromise(actualHandler)) {
      actualHandler(data);
    } else {
      await actualHandler(data);
    }
  }
}
```

**Responsabilidade**: Executa todos os handlers em sequência, detectando se são async.

### Fluxo de Execução

```
1. Loop sobre handlers
   │
   ├─→ Handler 1
   │   ├─→ isPromise() check
   │   ├─→ Se SYNC: call(ctx)
   │   └─→ Se ASYNC: await call(ctx)
   │
   ├─→ Handler 2
   │   └─→ ... mesmo processo
   │
   └─→ Handler N
       └─→ ... mesmo processo
```

### Detecção de Async

```typescript
if (!isPromise(actualHandler)) {
  actualHandler(data);  // Síncrono
} else {
  await actualHandler(data);  // Assíncrono
}
```

**Como funciona**:
1. `isPromise()` verifica se o handler é async
2. Se síncrono: chama diretamente
3. Se assíncrono: aguarda com `await`

### HandlerContext

O mesmo `data` é passado para todos os handlers:

```typescript
interface HandlerContext {
  body: any;
  params: Record<string, string> | null;
  headers: IncomingHttpHeaders;
  queries: Record<string, string> | null;
}
```

**Comportamento**:
- O mesmo objeto é passado para todos os handlers
- O objeto é `Object.freeze()` antes de ser passado (em `Routes.executeRequestCycle()`)
- Handlers **não podem mutar** o contexto

---

## reset()

```typescript
reset(): void {
  this.handlers = [];
}
```

**Responsabilidade**: Limpa todos os handlers.

**Uso**:
```typescript
const cycle = new RequestCycle([h1, h2, h3]);
cycle.reset();  // handlers = []
```

**Cenários**:
- Reutilização do RequestCycle
- Testes
- Reconfiguração dinâmica

---

## getAllHandlers()

```typescript
getAllHandlers(): RouteHandler[] {
  return this.handlers;
}
```

**Responsabilidade**: Retorna cópia do array de handlers (referência interna).

**Uso**:
```typescript
const cycle = new RequestCycle([h1, h2]);
const allHandlers = cycle.getAllHandlers();
// allHandlers = [h1, h2]
```

**Nota**: Retorna a referência interna (não cópia). Modificações afetam o estado interno.

---

## isPromise() - Detecção de Async

### Implementação

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

### Lógica de Detecção

1. **Check 1**: `typeof fn === 'function' && fn.constructor.name === 'AsyncFunction'`
   - Detecta funções declaradas com `async`
   - Ex: `async function handler(ctx) {}`

2. **Check 2**: `fn instanceof Promise`
   - Detecta funções que retornam `Promise` diretamente
   - Ex: `(ctx) => new Promise(resolve => ...)`

### Exemplos

| Handler | isPromise() | Execução |
|---------|-------------|----------|
| `(ctx) => {}` | `false` | Síncrona |
| `async (ctx) => {}` | `true` | Assíncrona (await) |
| `(ctx) => Promise.resolve()` | `true` | Assíncrona (await) |
| `(ctx) => { return new Promise(...) }` | `true` | Assíncrona (await) |
| `(ctx) => { return new Promise(...) }()` | `false` | Síncrona (immediate invocation) |

### Casos Edge

**Arrow Function Async**:
```typescript
const handler = async (ctx) => {};  // isPromise() = true ✅
```

**Function Declaration Async**:
```typescript
async function handler(ctx) {}  // isPromise() = true ✅
```

**Return Promise**:
```typescript
const handler = (ctx) => Promise.resolve();  // isPromise() = true ✅
```

**Síncrono**:
```typescript
const handler = (ctx) => {};  // isPromise() = false ✅
```

---

## Padrões de Uso

### Uso Simples

```typescript
const cycle = new RequestCycle();
cycle.add(middleware1);
cycle.add(middleware2);
cycle.add(handler);

await cycle.executeRequestCycle({ body, params, headers, queries });
```

### Uso com Handlers Iniciais

```typescript
const cycle = new RequestCycle([middleware1, middleware2]);
cycle.add(handler);

await cycle.executeRequestCycle(ctx);
```

### Uso com Mixed Sync/Async

```typescript
const syncMiddleware = (ctx) => {
  console.log('Sync middleware');
  // Não chama finishRequest - continua chain
};

const asyncMiddleware = async (ctx) => {
  await db.query('SELECT 1');
  // Não chama finishRequest - continua chain
};

const handler = (ctx) => {
  app.finishRequest(200, { data: 'ok' });
};

const cycle = new RequestCycle();
cycle.add(syncMiddleware);
cycle.add(asyncMiddleware);
cycle.add(handler);

await cycle.executeRequestCycle(ctx);
```

### Uso com Resource

```typescript
export class Resource extends Routes {
  private _defaultMiddlewares: RouteHandler[] = [];
  
  defaultMiddlewares(...args: RouteHandler[]): this {
    this._defaultMiddlewares.push(...args);
    return this;
  }
  
  private createRequestCycle(sufix: string, httpMethod: string, ...args: RouteHandler[]): void {
    const requestCycle = new RequestCycle();
    requestCycle.addMultiples(args);
    this.createRoute(httpMethod, sufix, requestCycle.getAllHandlers());
  }
}
```

### Uso com Routes

```typescript
export class Routes {
  async executeRequestCycle(path: string, method: string, body: unknown, headers: IncomingHttpHeaders): Promise<void> {
    const routeIndex = this.getRouteIndex(path, method);
    const route = this.routes[routeIndex];
    
    const requestCycleObject: HandlerContext = Object.freeze({
      body,
      params: route.params,
      headers,
      queries: route.queries,
    });
    
    if (route.requestCycle) {
      return await route.requestCycle.executeRequestCycle(requestCycleObject);
    }
  }
}
```

---

## Integração com Routes

### Fluxo Completo

```
Routes.executeRequestCycle()
  │
  ├─→ Cria HandlerContext
  │   └─> Object.freeze({ body, params, headers, queries })
  │
  ├─→ Obtém RequestCycle da rota
  │   └─> route.requestCycle (criado em createRoute)
  │
  └─→ Executa RequestCycle
      └─> await cycle.executeRequestCycle(ctx)
          │
          ├─→ Handler 1 (middleware)
          ├─→ Handler 2 (middleware)
          └─→ Handler 3 (rota)
              └─> app.finishRequest(200, data)
```

### Criação do RequestCycle em createRoute

```typescript
private createRoute(method: string, sufix: string, handlers: RouteHandler[]): void {
  const newRoute: Route = {
    method,
    originalSufix: sufix,
    sufix: buildRoutePath(sufix),
    params: null,
    queries: null,
    requestCycle: new RequestCycle(handlers),  // ← Criação
  };
  
  this.routes.push(newRoute);
}
```

**Cada rota tem seu próprio RequestCycle** com os handlers associados.

---

## Middlewares Pattern

### Ordem de Execução

```typescript
app.get('/users', m1, m2, handler);

// Routes.createRequestCycle() cria RequestCycle com:
// handlers = [m1, m2, handler]
```

**Execução**:
```
1. m1(ctx) - não chama finishRequest
2. m2(ctx) - não chama finishRequest  
3. handler(ctx) - chama finishRequest
```

### Handler Contract

Cada handler deve:
- **Síncrono**: Executar lógica, não chamar `finishRequest` (a menos que seja o final)
- **Assíncrono**: `await` operações, não chamar `finishRequest` (a menos que seja o final)

**Exemplo de Middleware Correto**:
```typescript
const authMiddleware = async (ctx) => {
  const user = await authenticate(ctx.headers.authorization);
  if (!user) {
    app.finishRequest(401, { error: 'Unauthorized' });
    return;  // ← Importante: stop chain
  }
  // Não chama finishRequest - continua chain
};
```

**Exemplo de Handler Final**:
```typescript
const getHandler = (ctx) => {
  app.finishRequest(200, { users: [] });  // ← Chama finishRequest
};
```

---

## Erros e Tratamento

### Erro em Handler

```typescript
// Handler que lança erro
const badHandler = (ctx) => {
  throw new Error('Something went wrong');
};

// Cai no catch do SweetPotato.handleRoute()
try {
  return await this.executeRequestCycle(...);
} catch (error) {
  return this.finishRequest(HttpStatusCode.INTERNAL_SERVER_ERROR, {
    message: (error as Error).message,
  });
}
```

**Comportamento**:
- Erro em qualquer handler → 500
- Erro em middleware → 500
- Erro em handler final → 500

### Handler já chamou finishRequest

```typescript
// Handler que chama finishRequest
const badMiddleware = (ctx) => {
  app.finishRequest(200, { data: 'ok' });
  // Continue no chain - mas resposta já enviada
};

// Handler seguinte tenta chamar finishRequest
const nextHandler = (ctx) => {
  app.finishRequest(200, { data: 'ok' });  // [ERR_HTTP_HEADERS_SENT]
};
```

**Prevenção em SweetPotato**:
```typescript
finishRequest(code: number | undefined, message: unknown): void {
  try {
    this.appRes!.writeHead(statusCode);
    this.appRes!.write(JSON.stringify(message));
    this.appRes!.end();
  } catch {
    // Fallback para [ERR_HTTP_HEADERS_SENT]
    this.appRes!.write(JSON.stringify(message));
    this.appRes!.end();
  }
}
```

---

## Resumo de Responsabilidades

| Responsabilidade | Métodos |
|-----------------|---------|
| Armazenar handlers | `constructor()`, `add()`, `addMultiples()` |
| Executar handlers | `executeRequestCycle()` |
| Limpar handlers | `reset()` |
| Inspeção | `getAllHandlers()` |
| Detectar async | `isPromise()` |

---

## Padrões de Projeto

| Padrão | Implementação |
|--------|---------------|
| **Chain of Responsibility** | Handlers encadeados, cada um decide se continua |
| **Strategy** | Handlers podem variar dinamicamente |
| **Template Method** | `executeRequestCycle()` define estrutura, handlers definem lógica |

---

## Performance Considerations

### Loop vsforEach

**Usado**:
```typescript
for (let i = 0; i < this.handlers.length; i++) {
  const actualHandler = this.handlers[i];
  // ...
}
```

**Alternativa**:
```typescript
this.handlers.forEach(async (actualHandler) => {
  await actualHandler(data);
});
```

**Por que loop?**:
- Necessidade de `await` em cada handler
- `forEach` com `async` não espera
- `for...of` poderia ser usado, mas loop clássico é mais performático

### Array Operations

- `add()`: `push()` - O(1)
- `addMultiples()`: `push(...)` - O(n)
- `reset()`: `[]` - O(1)
- `getAllHandlers()`: return `handlers` - O(1)

---

## Erros Conhecidos e Prevenção

### [ERR_HTTP_HEADERS_SENT]

**Causa**: Tentar escrever headers após já ter sido feito

**Prevenção**: `try-catch` em `finishRequest()`

### Async Handler não aguardado

**Causa**: Handler async sem `await`

**Prevenção**: `isPromise()` detecta e aguarda com `await`

### Handler já finalizou resposta

**Causa**: Handler chama `finishRequest()` e próximo também tenta

**Prevenção**: `writableEnded` check em SweetPotato

---

## Resumo Técnico

|Aspecto | Implementação |
|--------|---------------|
| **Execution Order** | FIFO (sequencial) |
| **Async Detection** | `isPromise()` com constructor.name check |
| **Error Handling** | Try-catch no SweetPotato |
| **Context Immutability** | `Object.freeze()` em Routes |
| **Handler Type** | `(ctx) => void \| Promise<void>` |

**Complexidade**:
- Execução: O(n) onde n = número de handlers
- Memória: O(n) para armazenar handlers
- Tempo por handler: O(1) + tempo do handler em si
