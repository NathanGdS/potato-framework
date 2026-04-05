# HttpMethod - Constantes de Métodos HTTP

## Visão Geral

`HttpMethod` é um objeto constante que define os **métodos HTTP suportados** pelo framework. Ele fornece type safety e evita erros de typo ao definir rotas.

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

## Estrutura

### Objetos de Métodos

| Chave | Valor | Descrição |
|-------|-------|-----------|
| `GET` | `"GET"` | Método GET - ler recursos |
| `POST` | `"POST"` | Método POST - criar recursos |
| `PATCH` | `"PATCH"` | Método PATCH - atualizações parciais |
| `PUT` | `"PUT"` | Método PUT - atualizações completas |
| `DELETE` | `"DELETE"` | Método DELETE - deletar recursos |

### Type Alias

```typescript
export type HttpMethod = (typeof HttpMethod)[keyof typeof HttpMethod];
```

**Resolução**:
```typescript
typeof HttpMethod = {
  GET: "GET",
  POST: "POST",
  PATCH: "PATCH",
  PUT: "PUT",
  DELETE: "DELETE",
}

keyof typeof HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE"

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE"
```

## Uso no Framework

### Em Routes

```typescript
// Routes.ts
export class Routes {
  get(sufix: string, ...args: RouteHandler[]): void {
    this.createRequestCycle(sufix, HttpMethod.GET, ...args);
  }

  post(sufix: string, ...args: RouteHandler[]): void {
    this.createRequestCycle(sufix, HttpMethod.POST, ...args);
  }

  patch(sufix: string, ...args: RouteHandler[]): void {
    this.createRequestCycle(sufix, HttpMethod.PATCH, ...args);
  }

  put(sufix: string, ...args: RouteHandler[]): void {
    this.createRequestCycle(sufix, HttpMethod.PUT, ...args);
  }

  delete(sufix: string, ...args: RouteHandler[]): void {
    this.createRequestCycle(sufix, HttpMethod.DELETE, ...args);
  }
}
```

### Em Resource

```typescript
// Resource.ts
export class Resource extends Routes {
  defineHandler(input: DefineHandlerInput, ...args: RouteHandler[]): this {
    const parsedMethod = HttpMethod[input.method];
    if (!parsedMethod) {
      throw new Error('Invalid method');
    }

    let sufix = this.sufix;
    if (input.sufix) {
      sufix += '/' + input.sufix;
    }

    const middlewares: RouteHandler[] = [...args, ...this._defaultMiddlewares];
    this[input.method.toLowerCase() as 'get' | 'post' | 'patch' | 'put' | 'delete'](
      sufix,
      ...middlewares
    );
    return this;
  }
}
```

### DefineHandlerInput

```typescript
interface DefineHandlerInput {
  method: keyof typeof HttpMethod;  // "GET" | "POST" | "PATCH" | "PUT" | "DELETE"
  sufix?: string;
}
```

**Uso**:
```typescript
app.resource("message")
  .defineHandler({ method: HttpMethod.GET, sufix: ":id" }, handler)
  .defineHandler({ method: HttpMethod.POST }, handler);
```

## Uso nos Exemplos

### Rota Direta

```typescript
import { SweetPotatoApp, HttpMethod } from '../SweetPotatoApp.mjs';

const app = SweetPotatoApp();

app.get('/users', listHandler);
app.post('/users', createHandler);
app.put('/users/:id', updateHandler);
app.patch('/users/:id', patchHandler);
app.delete('/users/:id', deleteHandler);

app.listen(8000);
```

### Resource DSL

```typescript
import { SweetPotatoApp, HttpMethod } from '../SweetPotatoApp.mjs';

const app = SweetPotatoApp();

app.resource("message")
  .defaultMiddlewares(authMiddleware)
  .defineHandler({ method: HttpMethod.GET, sufix: ":id" }, getHandler)
  .defineHandler({ method: HttpMethod.GET }, listHandler)
  .defineHandler({ method: HttpMethod.POST }, createHandler)
  .defineHandler({ method: HttpMethod.PUT, sufix: ":id" }, updateHandler)
  .defineHandler({ method: HttpMethod.DELETE, sufix: ":id" }, deleteHandler);

app.listen(8000);
```

## Vantagens do Uso de Constantes

### Type Safety

**Com constante**:
```typescript
app.get('/users', handler);  // ✅ Seguro
app.post('/users', handler); // ✅ Seguro
```

**Sem constante (string literal)**:
```typescript
app.get('/users', handler);
app.postst('/users', handler); // ❌ Erro de typo passa unnoticed
```

### Autocomplete

IDEs podem fornecer autocomplete:
```typescript
app.get('/users', handler);
app.post('/users', handler);
app.put('/users', handler);     // Autocomplete disponível
app.patch('/users', handler);
app.delete('/users', handler);
```

### Refatoração Segura

Se um método HTTP for removido ou renomeado:
```typescript
// Before
const HttpMethod = {
  GET: "GET",
  POST: "POST",
};

// After
const HttpMethod = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",  // Novo método
};
```

Todos os usos são verificados pelo TypeScript.

## Comparação com Outros Frameworks

### Express.js

```javascript
// Express - string literals
app.get('/users', handler);
app.post('/users', handler);
app.put('/users', handler);

// Potato - com constantes
app.get('/users', handler);
app.post('/users', handler);
app.put('/users', handler);
```

### Fastify

```javascript
// Fastify - string literals
app.get('/users', handler);
app.post('/users', handler);
app.put('/users', handler);

// Potato - com constantes
app.get('/users', handler);
app.post('/users', handler);
app.put('/users', handler);
```

## Tipos Disponíveis

### HttpMethodType (exportado para uso externo)

```typescript
export type { HttpMethod as HttpMethodType } from './constants/index.js';
```

**Uso no usuário**:
```typescript
import type { HttpMethodType } from './package/index.mjs';

const method: HttpMethodType = 'GET';  // Type checked
```

### HttpStatusCodeType

```typescript
export type { HttpStatusCode as HttpStatusCodeType } from './constants/index.js';
```

**Uso no usuário**:
```typescript
import type { HttpStatusCodeType } from './package/index.mjs';

const status: HttpStatusCodeType = 200;  // Type checked
```

## Métodos HTTP Completos

### GET

**Propósito**: Recuperar informações
**Body**: Não deve ter
**Idempotente**: Sim
**Cacheável**: Sim

```typescript
app.get('/users/:id', (ctx) => {
  const userId = ctx.params?.id;
  app.finishRequest(200, { id: userId });
});
```

### POST

**Propósito**: Criar novo recurso
**Body**: Opcional (geralmente tem)
**Idempotente**: Não
**Cacheável**: Não

```typescript
app.post('/users', (ctx) => {
  const userData = ctx.body;
  app.finishRequest(201, { id: 1, ...userData });
});
```

### PUT

**Propósito**: Atualizar recurso completo
**Body**: Obrigatório
**Idempotente**: Sim
**Cacheável**: Não

```typescript
app.put('/users/:id', (ctx) => {
  const userId = ctx.params?.id;
  const userData = ctx.body;
  app.finishRequest(200, { id: userId, ...userData });
});
```

### PATCH

**Propósito**: Atualização parcial
**Body**: Opcional (geralmente tem)
**Idempotente**: Não (mas pode ser)
**Cacheável**: Não

```typescript
app.patch('/users/:id', (ctx) => {
  const userId = ctx.params?.id;
  const updates = ctx.body;
  app.finishRequest(200, { id: userId, ...updates });
});
```

### DELETE

**Propósito**: Deletar recurso
**Body**: Não deve ter
**Idempotente**: Sim
**Cacheável**: Não

```typescript
app.delete('/users/:id', (ctx) => {
  const userId = ctx.params?.id;
  app.finishRequest(204, null);  // No content
});
```

## Padrões de Uso

### Uso Direto nas Rotas

```typescript
import { SweetPotato, HttpMethod } from '../SweetPotato.mjs';

const app = new SweetPotato();

app.get('/users', handler);  // Sem usar HttpMethod explicitamente
app.post('/users', handler);

app.listen(8000);
```

### Uso com Resource DSL

```typescript
import { SweetPotato, HttpMethod } from '../SweetPotato.mjs';

const app = new SweetPotato();

app.resource("users")
  .defineHandler({ method: HttpMethod.GET }, listHandler)
  .defineHandler({ method: HttpMethod.POST }, createHandler)
  .defineHandler({ method: HttpMethod.GET, sufix: ":id" }, getHandler)
  .defineHandler({ method: HttpMethod.PUT, sufix: ":id" }, updateHandler)
  .defineHandler({ method: HttpMethod.DELETE, sufix: ":id" }, deleteHandler);

app.listen(8000);
```

### Verificação de Método

```typescript
// Em middleware
const methodCheckMiddleware: RouteHandler = (ctx) => {
  const method = ctx.headers[':method'];
  
  if (method === HttpMethod.POST) {
    // Lógica específica para POST
  }
  
  if (method === HttpMethod.GET) {
    // Lógica específica para GET
  }
};
```

## Error Handling

### Invalid Method

```typescript
defineHandler(input: DefineHandlerInput, ...args: RouteHandler[]): this {
  const parsedMethod = HttpMethod[input.method];
  if (!parsedMethod) {
    throw new Error('Invalid method');  // ← Erro lançado aqui
  }
  // ...
}
```

**Dispara quando**:
```typescript
app.resource("users")
  .defineHandler({ method: "INVALID" as any }, handler);  // Error: Invalid method
```

**Correto**:
```typescript
app.resource("users")
  .defineHandler({ method: HttpMethod.GET }, handler);  // ✅
```

## Resumo

| Aspecto | Implementação |
|---------|---------------|
| **Tipo** | Object with `as const` |
| **Keys** | `GET`, `POST`, `PATCH`, `PUT`, `DELETE` |
| **Values** | `"GET"`, `"POST"`, `"PATCH"`, `"PUT"`, `"DELETE"` |
| **Type** | `"GET" \| "POST" \| "PATCH" \| "PUT" \| "DELETE"` |

### Exportação

```typescript
// constants/index.ts
export { HttpMethod } from "./HttpMethod.constants.js";
export type { HttpMethod as HttpMethodType } from "./HttpMethod.constants.js";
```

### Importação

```typescript
// No usuário
import { HttpMethod } from './package/index.mjs';

// Uso
app.get('/users', handler);
app.post('/users', handler);
```

### Vantagens

1. **Type Safety**: Erros de typo são detectados em compile time
2. **Autocomplete**: IDEs fornecem autocomplete para métodos
3. **Refatoração**: Mudanças em métodos são trackeadas pelo TypeScript
4. **Consistência**: Todos os métodos usam a mesma constante

### Limitações

1. **Apenas métodos comuns**: Não inclui métodos como `HEAD`, `OPTIONS`, `TRACE`
2. **Não extensível**: Para adicionar novos métodos, precisa modificar o framework

### Extensibilidade

Se necessário adicionar novos métodos:
```typescript
// Potencial expansão
const HttpMethod = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  PATCH: "PATCH",
  DELETE: "DELETE",
  HEAD: "HEAD",   // Novo
  OPTIONS: "OPTIONS",  // Novo
} as const;
```

Ou permitir string literals diretos:
```typescript
app.custom('WEBHOOK', '/webhook', handler);  // Custom method
```
