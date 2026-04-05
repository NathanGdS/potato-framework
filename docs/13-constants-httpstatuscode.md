# HttpStatusCode - Constantes de Status HTTP

## Visão Geral

`HttpStatusCode` é um objeto constante que define os **códigos de status HTTP** utilizados pelo framework. Ele fornece type safety e evita erros ao definir responses.

```typescript
export const HttpStatusCode = {
  SUCCESS: 200,
  CREATED: 201,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export type HttpStatusCode = (typeof HttpStatusCode)[keyof typeof HttpStatusCode];
```

## Estrutura

### Status Codes

| Chave | Valor | Descrição |
|-------|-------|-----------|
| `SUCCESS` | `200` | Request bem-sucedido |
| `CREATED` | `201` | Recurso criado |
| `NOT_FOUND` | `404` | Recurso não encontrado |
| `INTERNAL_SERVER_ERROR` | `500` | Erro interno do servidor |

### Type Alias

```typescript
export type HttpStatusCode = (typeof HttpStatusCode)[keyof typeof HttpStatusCode];
```

**Resolução**:
```typescript
typeof HttpStatusCode = {
  SUCCESS: 200,
  CREATED: 201,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
}

type HttpStatusCode = 200 | 201 | 404 | 500
```

## Uso no Framework

### Em SweetPotato

```typescript
// SweetPotato.ts
finishRequest(code: number | undefined, message: unknown): void {
  try {
    const statusCode = code ?? HttpStatusCode.SUCCESS;  // 200 por padrão
    this.appRes!.writeHead(statusCode);
    this.appRes!.write(JSON.stringify(message));
    this.appRes!.end();
  } catch {
    this.appRes!.write(JSON.stringify(message));
    this.appRes!.end();
  }
}
```

**Comportamento**:
- Se `code` é `undefined`: usa `HttpStatusCode.SUCCESS` (200)
- Se `code` é `null`: usa `HttpStatusCode.SUCCESS` (200)
- Se `code` é número: usa o número fornecido

### Em Routes (Error Handling)

```typescript
// Routes.ts
async executeRequestCycle(...): Promise<void> {
  const routeIndex = this.getRouteIndex(path, method);
  if (routeIndex < 0) {
    throw new RouteNotFoundException();
  }
  // ...
}
```

```typescript
// SweetPotato.ts
private async handleRoute(): Promise<void> {
  try {
    return await this.executeRequestCycle(...);
  } catch (error) {
    if (error instanceof RouteNotFoundException) {
      return this.finishRequest(HttpStatusCode.NOT_FOUND, {
        message: (error as Error).message,
      });
    }
    return this.finishRequest(HttpStatusCode.INTERNAL_SERVER_ERROR, {
      message: (error as Error).message,
    });
  }
}
```

## Status Codes Disponíveis

### 2xx - Success

| Código | Nome | Uso |
|--------|------|-----|
| `200` | OK | Request bem-sucedido |
| `201` | Created | Recurso criado (ex: POST) |

```typescript
// 200 OK
app.get('/users', (ctx) => {
  app.finishRequest(HttpStatusCode.SUCCESS, { users: [] });
});

// 201 Created
app.post('/users', (ctx) => {
  app.finishRequest(HttpStatusCode.CREATED, { id: 1, ...ctx.body });
});
```

### 4xx - Client Error

| Código | Nome | Uso |
|--------|------|-----|
| `404` | Not Found | Recurso não encontrado |

```typescript
// 404 Not Found
app.get('/users/999', (ctx) => {
  app.finishRequest(HttpStatusCode.NOT_FOUND, { error: 'User not found' });
});
```

### 5xx - Server Error

| Código | Nome | Uso |
|--------|------|-----|
| `500` | Internal Server Error | Erro no servidor |

```typescript
// 500 Internal Server Error
app.get('/users', (ctx) => {
  try {
    throw new Error('Database error');
  } catch {
    app.finishRequest(HttpStatusCode.INTERNAL_SERVER_ERROR, { error: 'Server error' });
  }
});
```

## Uso nos Exemplos

### Exemplo Simples

```typescript
import { SweetPotatoApp, HttpStatusCode } from '../SweetPotatoApp.mjs';

const app = SweetPotatoApp();

app.get('/health', (ctx) => {
  app.finishRequest(HttpStatusCode.SUCCESS, { status: 'ok' });
});

app.listen(8000);
```

### Exemplo com Recurso

```typescript
import { SweetPotatoApp, HttpStatusCode } from '../SweetPotatoApp.mjs';

const app = SweetPotatoApp();

app.get('/users/:id', (ctx) => {
  const userId = ctx.params?.id;
  
  if (userId === '1') {
    app.finishRequest(HttpStatusCode.SUCCESS, { id: 1, name: 'John' });
  } else {
    app.finishRequest(HttpStatusCode.NOT_FOUND, { error: 'User not found' });
  }
});

app.post('/users', (ctx) => {
  app.finishRequest(HttpStatusCode.CREATED, { id: 1, ...ctx.body });
});

app.listen(8000);
```

### Exemplo com Resource DSL

```typescript
import { SweetPotatoApp, HttpMethod, HttpStatusCode } from '../SweetPotatoApp.mjs';

const app = SweetPotatoApp();

app.resource("message")
  .defineHandler({ method: HttpMethod.GET, sufix: ":id" }, (ctx) => {
    app.finishRequest(HttpStatusCode.SUCCESS, { id: ctx.params?.id });
  })
  .defineHandler({ method: HttpMethod.GET }, (ctx) => {
    app.finishRequest(HttpStatusCode.SUCCESS, { messages: [] });
  })
  .defineHandler({ method: HttpMethod.POST }, (ctx) => {
    app.finishRequest(HttpStatusCode.CREATED, { id: 1, ...ctx.body });
  });

app.listen(8000);
```

## Status Code Completo (RFC 7231)

### 1xx - Informational

| Código | Nome | Status no Framework |
|--------|------|---------------------|
| 100 | Continue | Não implementado |
| 101 | Switching Protocols | Não implementado |
| 102 | Processing | Não implementado |

### 2xx - Success

| Código | Nome | Implementado |
|--------|------|--------------|
| 200 | OK | ✅ `SUCCESS` |
| 201 | Created | ✅ `CREATED` |
| 202 | Accepted | ❌ |
| 203 | Non-Authoritative Information | ❌ |
| 204 | No Content | ❌ |
| 205 | Reset Content | ❌ |
| 206 | Partial Content | ❌ |
| 207 | Multi-Status | ❌ |
| 208 | Already Reported | ❌ |
| 226 | IM Used | ❌ |

### 3xx - Redirection

| Código | Nome | Status no Framework |
|--------|------|---------------------|
| 300 | Multiple Choices | ❌ |
| 301 | Moved Permanently | ❌ |
| 302 | Found | ❌ |
| 303 | See Other | ❌ |
| 304 | Not Modified | ❌ |
| 305 | Use Proxy | ❌ |
| 306 | (unused) | ❌ |
| 307 | Temporary Redirect | ❌ |
| 308 | Permanent Redirect | ❌ |

### 4xx - Client Error

| Código | Nome | Implementado |
|--------|------|--------------|
| 400 | Bad Request | ❌ |
| 401 | Unauthorized | ❌ |
| 403 | Forbidden | ❌ |
| 404 | Not Found | ✅ `NOT_FOUND` |
| 405 | Method Not Allowed | ❌ |
| 406 | Not Acceptable | ❌ |
| 407 | Proxy Auth Required | ❌ |
| 408 | Request Timeout | ❌ |
| 409 | Conflict | ❌ |
| 410 | Gone | ❌ |
| 411 | Length Required | ❌ |
| 412 | Precondition Failed | ❌ |
| 413 | Payload Too Large | ❌ |
| 414 | URI Too Long | ❌ |
| 415 | Unsupported Media Type | ❌ |
| 416 | Range Not Satisfiable | ❌ |
| 417 | Expectation Failed | ❌ |
| 421 | Misdirected Request | ❌ |
| 422 | Unprocessable Entity | ❌ |
| 423 | Locked | ❌ |
| 424 | Failed Dependency | ❌ |
| 425 | Too Early | ❌ |
| 426 | Upgrade Required | ❌ |
| 428 | Precondition Required | ❌ |
| 429 | Too Many Requests | ❌ |
| 431 | Request Header Fields Too Large | ❌ |
| 451 | Unavailable For Legal Reasons | ❌ |

### 5xx - Server Error

| Código | Nome | Implementado |
|--------|------|--------------|
| 500 | Internal Server Error | ✅ `INTERNAL_SERVER_ERROR` |
| 501 | Not Implemented | ❌ |
| 502 | Bad Gateway | ❌ |
| 503 | Service Unavailable | ❌ |
| 504 | Gateway Timeout | ❌ |
| 505 | HTTP Version Not Supported | ❌ |
| 506 | Variant Also Negotiates | ❌ |
| 507 | Insufficient Storage | ❌ |
| 508 | Loop Detected | ❌ |
| 510 | Not Extended | ❌ |
| 511 | Network Auth Required | ❌ |

## Erros e Tratamento

### RouteNotFoundException

```typescript
// Routes.ts
async executeRequestCycle(...): Promise<void> {
  const routeIndex = this.getRouteIndex(path, method);
  if (routeIndex < 0) {
    throw new RouteNotFoundException();  // ← Lança exception
  }
  // ...
}

// SweetPotato.ts
private async handleRoute(): Promise<void> {
  try {
    return await this.executeRequestCycle(...);
  } catch (error) {
    if (error instanceof RouteNotFoundException) {
      return this.finishRequest(HttpStatusCode.NOT_FOUND, {  // 404
        message: (error as Error).message,
      });
    }
    // Outros erros → 500
    return this.finishRequest(HttpStatusCode.INTERNAL_SERVER_ERROR, {
      message: (error as Error).message,
    });
  }
}
```

**Fluxo**:
1. `Routes.executeRequestCycle()` → não encontra rota → `throw RouteNotFoundException`
2. `SweetPotato.handleRoute()` → catch → verifica tipo → `finishRequest(HttpStatusCode.NOT_FOUND, ...)`

### Error Genérico

```typescript
// SweetPotato.ts
private async handleRoute(): Promise<void> {
  try {
    return await this.executeRequestCycle(...);
  } catch (error) {
    // Qualquer erro que não seja RouteNotFoundException
    return this.finishRequest(HttpStatusCode.INTERNAL_SERVER_ERROR, {  // 500
      message: (error as Error).message,
    });
  }
}
```

**Cenários**:
- Erro em handler (síncrono ou async)
- Erro em middleware
- Erro de parsing do body
- Qualquer outra exception não tratada

## Padrões de Uso

### Sucesso Simples (200)

```typescript
app.get('/health', (ctx) => {
  app.finishRequest(HttpStatusCode.SUCCESS, { status: 'ok' });
});
```

### Recurso Criado (201)

```typescript
app.post('/users', (ctx) => {
  const user = createUser(ctx.body);
  app.finishRequest(HttpStatusCode.CREATED, user);
});
```

### Recurso Não Encontrado (404)

```typescript
app.get('/users/:id', (ctx) => {
  const user = findUser(ctx.params?.id);
  if (!user) {
    app.finishRequest(HttpStatusCode.NOT_FOUND, { error: 'User not found' });
    return;
  }
  app.finishRequest(HttpStatusCode.SUCCESS, user);
});
```

### Erro do Servidor (500)

```typescript
app.get('/data', (ctx) => {
  try {
    const data = fetchData();
    app.finishRequest(HttpStatusCode.SUCCESS, data);
  } catch (error) {
    app.finishRequest(HttpStatusCode.INTERNAL_SERVER_ERROR, { 
      error: 'Failed to fetch data' 
    });
  }
});
```

### Middleware de Validação

```typescript
const validateUserMiddleware: RouteHandler = (ctx) => {
  if (!ctx.body?.name) {
    app.finishRequest(HttpStatusCode.BAD_REQUEST, {  // 400
      error: 'Name is required'
    });
    return;
  }
  
  if (!ctx.body?.email || !isValidEmail(ctx.body.email)) {
    app.finishRequest(HttpStatusCode.BAD_REQUEST, {  // 400
      error: 'Invalid email'
    });
    return;
  }
  
  // Continue - não chama finishRequest
};
```

### Handler Assíncrono

```typescript
const getUserHandler: RouteHandler = async (ctx) => {
  try {
    const user = await db.query('SELECT * FROM users WHERE id = ?', ctx.params?.id);
    
    if (!user) {
      app.finishRequest(HttpStatusCode.NOT_FOUND, { error: 'User not found' });
      return;
    }
    
    app.finishRequest(HttpStatusCode.SUCCESS, user);
  } catch (error) {
    app.finishRequest(HttpStatusCode.INTERNAL_SERVER_ERROR, { 
      error: 'Database error' 
    });
  }
};
```

## Type Safety

### Com Type Alias

```typescript
import type { HttpStatusCodeType } from './package/index.mjs';

const code: HttpStatusCodeType = 200;  // ✅
const code: HttpStatusCodeType = 201;  // ✅
const code: HttpStatusCodeType = 404;  // ✅
const code: HttpStatusCodeType = 500;  // ✅

// Error: Type 300 is not assignable to type HttpStatusCodeType
const code: HttpStatusCodeType = 300;  // ❌
```

### Com Constante Direta

```typescript
import { HttpStatusCode } from './package/index.mjs';

app.finishRequest(HttpStatusCode.SUCCESS, data);     // ✅ 200
app.finishRequest(HttpStatusCode.CREATED, data);     // ✅ 201
app.finishRequest(HttpStatusCode.NOT_FOUND, data);   // ✅ 404
app.finishRequest(HttpStatusCode.INTERNAL_SERVER_ERROR, data);  // ✅ 500
```

## Diferença entre HttpStatusCodeType e number

### HttpStatusCodeType

```typescript
type HttpStatusCodeType = 200 | 201 | 404 | 500;

const code: HttpStatusCodeType = 200;  // ✅
const code: HttpStatusCodeType = 300;  // ❌
```

### number (mais amplo)

```typescript
const code: number = 200;  // ✅
const code: number = 300;  // ✅
const code: number = 999;  // ✅ (mas não é HTTP status válido)
```

### Uso na Function

```typescript
// Na definição da função
finishRequest(code: number | undefined, message: unknown): void {
  const statusCode = code ?? HttpStatusCode.SUCCESS;
  // ...
}

// O parâmetro aceita:
app.finishRequest(undefined, data);     // usa SUCCESS (200)
app.finishRequest(200, data);           // ✅ number literal
app.finishRequest(HttpStatusCode.SUCCESS, data);  // ✅ HttpStatusCodeType
app.finishRequest(300, data);           // ✅ number literal (mas não ideal)
```

## Resumo

| Aspecto | Implementação |
|---------|---------------|
| **Tipo** | Object with `as const` |
| **Status Codes** | `SUCCESS`, `CREATED`, `NOT_FOUND`, `INTERNAL_SERVER_ERROR` |
| **Values** | `200`, `201`, `404`, `500` |
| **Type** | `200 \| 201 \| 404 \| 500` |

### Status Codes Implementados

| Status | Código | Nome | Uso |
|--------|--------|------|-----|
| SUCCESS | 200 | OK | Request bem-sucedido |
| CREATED | 201 | Created | Recurso criado |
| NOT_FOUND | 404 | Not Found | Recurso não encontrado |
| INTERNAL_SERVER_ERROR | 500 | Internal Server Error | Erro no servidor |

### Uso na Function FinishRequest

```typescript
finishRequest(code: number | undefined, message: unknown): void {
  const statusCode = code ?? HttpStatusCode.SUCCESS;  // Default: 200
  this.appRes!.writeHead(statusCode);
  this.appRes!.write(JSON.stringify(message));
  this.appRes!.end();
}
```

**Padrões**:
- `code = undefined` → `200`
- `code = 200` → `200`
- `code = HttpStatusCode.SUCCESS` → `200`
- `code = HttpStatusCode.NOT_FOUND` → `404`

### Vantagens

1. **Type Safety**: Erros de typo são detectados em compile time
2. **Autocomplete**: IDEs fornecem autocomplete para status codes
3. **Readability**: `HttpStatusCode.SUCCESS` é mais legível que `200`
4. **Maintainability**: Fácil adicionar novos status codes

### Limitações

1. **Apenas alguns status codes**: Não inclui todos os RFC 7231
2. **Não extensível pelo usuário**: Para adicionar, precisa modificar o framework

### Alternativas

**Permitir string literals**:
```typescript
app.finishRequest('200', data);  // Direct number
```

**Mais status codes**:
```typescript
export const HttpStatusCode = {
  SUCCESS: 200,
  CREATED: 201,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  BAD_REQUEST: 400,      // Novo
  UNAUTHORIZED: 401,     // Novo
  FORBIDDEN: 403,        // Novo
  // ...
} as const;
```

## Padrões de Uso no Framework

### SweetPotato.handleRoute()

```typescript
private async handleRoute(): Promise<void> {
  try {
    return await this.executeRequestCycle(...);
  } catch (error) {
    if (error instanceof RouteNotFoundException) {
      return this.finishRequest(HttpStatusCode.NOT_FOUND, {  // 404
        message: (error as Error).message,
      });
    }
    return this.finishRequest(HttpStatusCode.INTERNAL_SERVER_ERROR, {  // 500
      message: (error as Error).message,
    });
  }
}
```

### SweetPotato.finishRequest()

```typescript
finishRequest(code: number | undefined, message: unknown): void {
  const statusCode = code ?? HttpStatusCode.SUCCESS;  // 200
  this.appRes!.writeHead(statusCode);
  this.appRes!.write(JSON.stringify(message));
  this.appRes!.end();
}
```

### Routes.executeRequestCycle()

```typescript
const requestCycleObject: HandlerContext = Object.freeze({
  body,
  params,
  headers,
  queries,
});

return await route.requestCycle.executeRequestCycle(requestCycleObject);
```

**Erros são tratados em SweetPotato**, não em Routes.
