# Resource - DSL para Definição de Recursos

## Visão Geral

`Resource` é uma classe que estende `Routes` e fornece uma **Fluent API** para definição de recursos RESTful. Ela simplifica a criação de múltiplas rotas para um mesmo recurso.

```typescript
export class Resource extends Routes {
  private sufix: string = '';
  private _defaultMiddlewares: RouteHandler[] = [];
}
```

## Estrutura de Dados

### Atributos Privados

| Atributo | Tipo | Descrição |
|----------|------|-----------|
| `sufix` | `string` | Sufixo base para definição de handlers (ex: `"message"`) |
| `_defaultMiddlewares` | `RouteHandler[]` | Middlewares padrão para todos os handlers do recurso |

---

## resource(sufix)

```typescript
resource(sufix: string): this {
  this.sufix = sufix;
  return this;
}
```

**Responsabilidade**: Define o sufixo base que será usado por todos os `defineHandler()` subsequentes.

**Uso**:
```typescript
app.resource("message")
  .defineHandler(...)
  .defineHandler(...);
```

**Expansão**:
- Sufixo: `"message"`
- Handlers serão registrados em: `/message`

**Retorno**: `this` (para chainable API)

---

## defineHandler(input, ...args)

```typescript
defineHandler(input: DefineHandlerInput, ...args: RouteHandler[]): this {
  const parsedMethod = HttpMethod[input.method];
  if (!parsedMethod) {
    throw new Error('Invalid method');
  }

  let sufix = this.sufix;

  if (input.sufix) {
    sufix += '/' + input.sufix;  // Adiciona sufixo específico
  }

  const middlewares: RouteHandler[] = [...args, ...this._defaultMiddlewares];
  this[input.method.toLowerCase() as 'get' | 'post' | 'patch' | 'put' | 'delete'](
    sufix,
    ...middlewares
  );
  return this;
}
```

**Responsabilidade**: Define um handler para um método HTTP específico, com sufixo opcional.

### DefineHandlerInput

```typescript
interface DefineHandlerInput {
  method: keyof typeof HttpMethod;  // GET, POST, PUT, PATCH, DELETE
  sufix?: string;                   // Sufixo opcional (ex: ":id")
}
```

### Lógica de Expansão

| Chamada | Sufixo Base | input.sufix | Rota Final |
|---------|-------------|-------------|------------|
| `defineHandler({method: POST})` | `"message"` | `undefined` | `/message` |
| `defineHandler({method: GET, sufix: ":id"})` | `"message"` | `":id"` | `/message/:id` |
| `defineHandler({method: GET, sufix: "list"})` | `"message"` | `"list"` | `/message/list` |

### Middlewares Combinados

```typescript
const middlewares: RouteHandler[] = [...args, ...this._defaultMiddlewares];
```

1. Primeiro: middlewares passados no `defineHandler()`
2. Depois: middlewares padrão do recurso (via `defaultMiddlewares()`)

**Exemplo**:
```typescript
app.resource("message")
  .defaultMiddlewares(logMiddleware)  // Adiciona log
  .defineHandler({method: GET}, authMiddleware, handler);
  
// Ordem de execução:
// 1. authMiddleware (passado no defineHandler)
// 2. logMiddleware (defaultMiddlewares)
// 3. handler
```

### Chamada Dinâmica ao Método HTTP

```typescript
this[input.method.toLowerCase() as 'get' | 'post' | 'patch' | 'put' | 'delete'](
  sufix,
  ...middlewares
);
```

Converte o enum para minúsculas e chama o método correspondente:
- `HttpMethod.GET` → `"get"` → `this.get()`
- `HttpMethod.POST` → `"post"` → `this.post()`
- etc.

---

## defaultMiddlewares(...args)

```typescript
defaultMiddlewares(...args: RouteHandler[]): this {
  this._defaultMiddlewares.push(...args);
  return this;
}
```

**Responsabilidade**: Adiciona middlewares que serão aplicados a todos os handlers deste recurso.

**Uso**:
```typescript
app.resource("message")
  .defaultMiddlewares(authMiddleware, logMiddleware)
  .defineHandler({method: GET}, handler1)
  .defineHandler({method: POST}, handler2);
```

**Comportamento**:
- Middlewares são armazenados em `_defaultMiddlewares`
- São executados após middlewares específicos, antes do handler
- Retorno `this` para chainable API

---

## Interação com Routes

### Herança

```typescript
export class Resource extends Routes {
  // ...
}
```

`Resource` herda todos os métodos de `Routes`:
- `get(sufix, ...handlers)`
- `post(sufix, ...handlers)`
- `put(sufix, ...handlers)`
- `patch(sufix, ...handlers)`
- `delete(sufix, ...handlers)`
- `registerGlobalPrefix(prefix)`
- `executeRequestCycle(...)`

### Redefinição de Métodos

`Resource` não redefine métodos de `Routes`. Ele **adiciona abstrações** sobre eles.

**Fluxo de Chamada**:
```
Resource.defineHandler()
  ↓
Resource.get/post/patch/put/delete()
  ↓
Routes.createRequestCycle()
  ↓
Routes.createRoute()
  ↓
Routes.routes.push()
```

---

## Padrões de Uso

### Recurso Simples

```typescript
app.resource("message")
  .defineHandler({ method: HttpMethod.GET }, listHandler)
  .defineHandler({ method: HttpMethod.POST }, createHandler);
```

**Resulta em**:
- `GET /message` → `listHandler`
- `POST /message` → `createHandler`

### Recurso com Parâmetros

```typescript
app.resource("message")
  .defineHandler({ method: HttpMethod.GET, sufix: ":id" }, getHandler)
  .defineHandler({ method: HttpMethod.PUT, sufix: ":id" }, updateHandler)
  .defineHandler({ method: HttpMethod.DELETE, sufix: ":id" }, deleteHandler);
```

**Resulta em**:
- `GET /message/:id` → `getHandler`
- `PUT /message/:id` → `updateHandler`
- `DELETE /message/:id` → `deleteHandler`

### Recurso com Middlewares Padrão

```typescript
app.resource("message")
  .defaultMiddlewares(authMiddleware, logMiddleware)
  .defineHandler({ method: HttpMethod.GET }, listHandler)
  .defineHandler({ method: HttpMethod.POST }, createHandler);
```

**Ordem de execução**:
1. `authMiddleware`
2. `logMiddleware`
3. `listHandler` / `createHandler`

### Recurso com Prefixo Global

```typescript
app.registerGlobalPrefix('api/v1');

app.resource("message")
  .defineHandler({ method: HttpMethod.GET }, listHandler);
```

**Rota resultante**: `GET /api/v1/message`

### Recurso Completo (CRUD)

```typescript
app.resource("message")
  .defaultMiddlewares(authMiddleware, logMiddleware)
  .defineHandler({ method: HttpMethod.GET, sufix: ":id" }, getHandler)
  .defineHandler({ method: HttpMethod.GET }, listHandler)
  .defineHandler({ method: HttpMethod.POST }, createHandler)
  .defineHandler({ method: HttpMethod.PUT, sufix: ":id" }, updateHandler)
  .defineHandler({ method: HttpMethod.DELETE, sufix: ":id" }, deleteHandler);
```

**Resulta em**:
| Método | Rota | Handler |
|--------|------|---------|
| GET | `/message/:id` | `getHandler` |
| GET | `/message` | `listHandler` |
| POST | `/message` | `createHandler` |
| PUT | `/message/:id` | `updateHandler` |
| DELETE | `/message/:id` | `deleteHandler` |

---

## Comparação: Direto vs Resource

### Sem Resource (Direto)

```typescript
app.get("/message", listHandler);
app.post("/message", createHandler);
app.get("/message/:id", getHandler);
app.put("/message/:id", updateHandler);
app.delete("/message/:id", deleteHandler);
```

**Problemas**:
- Repetição do prefixo `/message`
- Difícil adicionar middlewares globais ao recurso
- Menos expressivo sobre a intenção (recurso RESTful)

### Com Resource

```typescript
app.resource("message")
  .defaultMiddlewares(authMiddleware)
  .defineHandler({ method: HttpMethod.GET, sufix: ":id" }, getHandler)
  .defineHandler({ method: HttpMethod.GET }, listHandler)
  .defineHandler({ method: HttpMethod.POST }, createHandler)
  .defineHandler({ method: HttpMethod.PUT, sufix: ":id" }, updateHandler)
  .defineHandler({ method: HttpMethod.DELETE, sufix: ":id" }, deleteHandler);
```

**Vantagens**:
- Prefixo definido uma vez
- Middlewares fáceis de adicionar
- Mais expressivo e declarativo

---

## Integração com Routes

### Método herdados que funcionam com Resource

Como `Resource` estende `Routes`, todos os métodos de `Routes` estão disponíveis:

```typescript
const r = new Resource();

// Métodos diretos ainda funcionam
r.get('/users', handler);

// Mais comum: usar o Resource DSL
r.resource("users")
  .defineHandler({ method: HttpMethod.GET }, listHandler);
```

### Acesso ao array de rotas

```typescript
const r = new Resource();
r.get('/users', handler);

const routes = r.getRoutes();  // [{ method: "GET", sufix: /users, ... }]
```

### Register global prefix

```typescript
const r = new Resource();
r.registerGlobalPrefix('api/v1');

r.get('/users', handler);  // Rota: /api/v1/users
```

---

## Erros e Tratamento

### Invalid Method

```typescript
const parsedMethod = HttpMethod[input.method];
if (!parsedMethod) {
  throw new Error('Invalid method');
}
```

**Dispara quando**:
- `input.method` não é um dos métodos HTTP válidos

**Correto**:
```typescript
defineHandler({ method: HttpMethod.GET }, handler)  // ✅
```

**Incorreto**:
```typescript
defineHandler({ method: "INVALID" }, handler)  // ❌ Error
```

---

## Fluent API Design

### Chainable Methods

Todos os métodos de `Resource` retornam `this`:

```typescript
resource(sufix: string): this
defineHandler(input, ...args): this
defaultMiddlewares(...args): this
```

**Permite**:
```typescript
app.resource("message")
  .defaultMiddlewares(m1)
  .defineHandler({method: GET}, h1)
  .defaultMiddlewares(m2)  // Pode chamar novamente
  .defineHandler({method: POST}, h2);
```

### Method Chaining com Routes

```typescript
app.resource("message")
  .defineHandler({ method: HttpMethod.GET }, handler);

// Pode continuar com métodos de Routes
app.registerGlobalPrefix("/api");  // Continua chain
```

---

## Performance Considerations

### Middlewares Array

Cada `defaultMiddlewares()` adiciona ao array:
```typescript
this._defaultMiddlewares.push(...args);
```

**Impacto**:
- Array cresce com cada chamada
- Copiado em cada `defineHandler()`: `[...args, ...this._defaultMiddlewares]`

**Otimização possível**:
- Usar reference ao invés de copy
- Validar inputs antes de criar array

---

## Resumo de Responsabilidades

| Responsabilidade | Métodos |
|-----------------|---------|
| Definir sufixo base | `resource()` |
| Definir handlers | `defineHandler()` |
| Adicionar middlewares padrão | `defaultMiddlewares()` |

**Padrão de Uso**: Fluent DSL para definição de recursos RESTful

**Integração**: Estende `Routes`, usa seus métodos internamente
