# Routes - Engine de Roteamento

## Visão Geral

`Routes` é a engine de roteamento do framework. Ela armazena todas as rotas, realiza o match entre requisição e rota, e executa o pipeline de handlers.

```typescript
interface Route {
  method: string;
  originalSufix: string;
  sufix: RegExp;
  params: Record<string, string> | null;
  queries: Record<string, string> | null;
  requestCycle: RequestCycle;
}

export class Routes {
  private routes: Route[] = [];
  private globalPrefix: string | undefined;
  private alias = 'RouteHandler';
}
```

## Estrutura de Dados

### Route Interface

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `method` | `string` | Método HTTP (GET, POST, etc.) |
| `originalSufix` | `string` | Caminho original (ex: `/users/:id`) |
| `sufix` | `RegExp` | Regex compilada para match |
| `params` | `Record<string, string> \| null` | Parâmetros extraídos do path |
| `queries` | `Record<string, string> \| null` | Query parameters |
| `requestCycle` | `RequestCycle` | Handlers associados à rota |

### Routes State

| Atributo | Tipo | Descrição |
|----------|------|-----------|
| `routes` | `Route[]` | Array de todas as rotas registradas |
| `globalPrefix` | `string \| undefined` | Prefixo global (ex: `/api/v1`) |
| `alias` | `string` | Nome para logs (default: `RouteHandler`) |

---

## Métodos de Registro de Rotas

### get(sufix, ...handlers)

```typescript
get(sufix: string, ...args: RouteHandler[]): void {
  this.createRequestCycle(sufix, HttpMethod.GET, ...args);
}
```

### post(sufix, ...handlers)

```typescript
post(sufix: string, ...args: RouteHandler[]): void {
  this.createRequestCycle(sufix, HttpMethod.POST, ...args);
}
```

### put(sufix, ...handlers)

```typescript
put(sufix: string, ...args: RouteHandler[]): void {
  this.createRequestCycle(sufix, HttpMethod.PUT, ...args);
}
```

### patch(sufix, ...handlers)

```typescript
patch(sufix: string, ...args: RouteHandler[]): void {
  this.createRequestCycle(sufix, HttpMethod.PATCH, ...args);
}
```

### delete(sufix, ...handlers)

```typescript
delete(sufix: string, ...args: RouteHandler[]): void {
  this.createRequestCycle(sufix, HttpMethod.DELETE, ...args);
}
```

**Padrão**: Todos os métodos HTTP usam `createRequestCycle()` internamente.

---

## createRequestCycle(sufix, httpMethod, ...args)

```typescript
private createRequestCycle(sufix: string, httpMethod: string, ...args: RouteHandler[]): void {
  const requestCycle = new RequestCycle();
  requestCycle.addMultiples(args);                     // Adiciona handlers
  this.createRoute(httpMethod, sufix, requestCycle.getAllHandlers());
}
```

**Passos**:
1. Cria novo `RequestCycle`
2. Adiciona todos os handlers
3. Chama `createRoute()` para criar a rota

---

## createRoute(method, sufix, handlers)

```typescript
private createRoute(method: string, sufix: string, handlers: RouteHandler[]): void {
  if (sufix.at(0) !== '/') {
    sufix = '/' + sufix;                               // Garante prefixo /
  }
  sufix = (this.globalPrefix ?? '') + sufix;           // Adiciona prefixo global

  const newRoute: Route = {
    method,
    originalSufix: sufix,
    sufix: buildRoutePath(sufix),                      // Compila regex
    params: null,
    queries: null,
    requestCycle: new RequestCycle(handlers),         // Cria cycle com handlers
  };
  
  LoggerInstance().registerRoute(newRoute.method, newRoute.originalSufix, this.alias);
  this.routes.push(newRoute);                          // Adiciona ao array
}
```

**Passos**:
1. Normaliza sufixo (adiciona `/` se necessário)
2. Adiciona prefixo global (ex: `/api/v1`)
3. Compila regex com `buildRoutePath()`
4. Cria rota
5. Registra log
6. Adiciona ao array de rotas

### buildRoutePath() - Compilação de Regex

```typescript
export function buildRoutePath(path: string): RegExp {
  const routeParametersRegex = /:([a-zA-Z]+)/g;        // :id, :userId, etc.
  const params = path.replaceAll(routeParametersRegex, '(?<$1>[a-z0-9\\-_]+)');
  
  const queryRegex = new RegExp(`^${params}(?<query>\\?(.*))?$`);
  return queryRegex;
}
```

**Exemplos de Compilação**:

| Path Original | Regex Resultante |
|---------------|------------------|
| `/users` | `^/users(?<query>\?.*)?$` |
| `/users/:id` | `^/users/(?<$1>[a-z0-9\\-_]+)(?<query>\?.*)?$` |
| `/users/:userId/posts/:postId` | `^/users/(?<$1>[a-z0-9\\-_]+)/(?<posts>[a-z0-9\\-_]+)(?<query>\?.*)?$` |

**Named Groups**:
- `(?<id>[a-z0-9\\-_]+)` - captura `:id` como grupo nomeado `id`
- `(?<query>\\?.*)` - captura query string como grupo nomeado `query`

---

## registerGlobalPrefix(prefix)

```typescript
registerGlobalPrefix(prefix: string): void {
  if (!prefix) return;

  if (prefix.at(0) !== '/') {
    prefix = '/' + prefix;
  }

  LoggerInstance().registerPrefix(prefix, this.alias);
  this.globalPrefix = prefix;
}
```

**Comportamento**:
- Se prefixo não começa com `/`, adiciona
- Registra log
- Armazena prefixo

**Exemplo**:
```typescript
app.registerGlobalPrefix('api/v1');  // Prefixo: "/api/v1"

// Rota: app.get('/users', handler)
// Resultado: "/api/v1/users"
```

---

## executeRequestCycle(path, method, body, headers)

```typescript
async executeRequestCycle(
  path: string,
  method: string,
  body: unknown,
  headers: IncomingHttpHeaders
): Promise<void> {
  const routeIndex = this.getRouteIndex(path, method);
  if (routeIndex < 0) {
    throw new RouteNotFoundException();
  }
  const route = this.routes[routeIndex];

  const params = route.params;
  const queries = route.queries;
  const requestCycleObject: HandlerContext = Object.freeze({
    body,
    params,
    headers,
    queries,
  });

  if (route.requestCycle) {
    return await route.requestCycle.executeRequestCycle(requestCycleObject);
  }
  throw new Error('Error in request life cycle request');
}
```

**Fluxo**:
1. Encontra índice da rota com `getRouteIndex()`
2. Se não encontrada: lança `RouteNotFoundException`
3. Extrai params e queries da rota encontrada
4. Cria `HandlerContext` congelado (`Object.freeze`)
5. Executa `RequestCycle.execute()`

---

## getRouteIndex(path, method)

```typescript
private getRouteIndex(path: string, method: string): number {
  return this.routes.findIndex((e) => {
    const regexVerifier = e.sufix.exec(path);
    if (!regexVerifier) return false;
    if (e.method !== method) return false;
    if (regexVerifier.find((t) => t === path)) {
      e.params = getRouteParams(regexVerifier.groups as Record<string, string>);
      e.queries = getQueries(regexVerifier.groups?.['query']);
      return true;
    }
    return false;
  });
}
```

**Lógica de Match**:

1. **Executa regex**:
   ```javascript
   e.sufix.exec(path)  // Ex: /^/users/(?<id>[a-z0-9\-_]+)(?<query>\?.*)?$/.exec("/users/123")
   ```

2. **Verifica método**:
   ```javascript
   if (e.method !== method) return false;
   ```

3. **Verifica path exato**:
   ```javascript
   if (regexVerifier.find((t) => t === path))  // Confirma match completo
   ```

4. **Extrai parâmetros**:
   ```javascript
   e.params = getRouteParams(regexVerifier.groups);
   e.queries = getQueries(regexVerifier.groups?.['query']);
   ```

### getRouteParams(groups)

```typescript
export function getRouteParams(
  groups: Record<string, string>
): Record<string, string> | null {
  const { query: _query, ...others } = groups;  // Remove grupo 'query'
  if (Object.keys(others).length === 0) return {};
  return others;
}
```

**Exemplo**:
```javascript
// Regex: /^/users/(?<id>[a-z0-9\-_]+)(?<query>\?.*)?$/
// Path: "/users/123"
// groups: { id: "123", query: undefined }

// Resultado: { id: "123" }
```

### getQueries(query)

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

**Exemplo**:
```javascript
// Input: "?foo=bar&baz=qux"
// Resultado: { foo: "bar", baz: "qux" }
```

---

## registerRoutes(routes)

```typescript
registerRoutes(routes: Route[]): void {
  routes.forEach((e) => {
    this.routes.push(e);
  });
}
```

Permite registrar múltiplas rotas de uma vez. Útil para:
- Carregar rotas de arquivo externo
- Importar rotas de outro módulo

---

## getRoutes()

```typescript
getRoutes(): Route[] {
  return this.routes;
}
```

Retorna todas as rotas registradas. Útil para:
- Logs
- Debugging
- Middleware deinspeção

---

## Resumo de Responsabilidades

| Responsabilidade | Métodos |
|-----------------|---------|
| Registro de rotas | `get()`, `post()`, `put()`, `patch()`, `delete()` |
| Criação de rotas | `createRoute()`, `createRequestCycle()` |
| Match de rotas | `getRouteIndex()`, `executeRequestCycle()` |
| Extração de params | `getRouteParams()`, `getQueries()` |
| Prefixo global | `registerGlobalPrefix()` |
| Inspeção | `getRoutes()`, `registerRoutes()` |

---

## Padrões de Uso

### Rota Simples

```typescript
app.get('/users', (ctx) => {
  // ctx.body, ctx.params, ctx.headers, ctx.queries
  app.finishRequest(200, { users: [] });
});
```

### Rota com Parâmetro

```typescript
app.get('/users/:id', (ctx) => {
  ctx.params;  // { id: "123" }
  app.finishRequest(200, { user: {} });
});
```

### Rota com Query String

```typescript
app.get('/users', (ctx) => {
  ctx.queries;  // { page: "1", limit: "10" }
  app.finishRequest(200, { users: [] });
});
```

### Prefixo Global

```typescript
app.registerGlobalPrefix('api/v1');

app.get('/users', handler);  // Rota: /api/v1/users
```

### Múltiplos Handlers (Middleware)

```typescript
app.get('/users', authMiddleware, logMiddleware, (ctx) => {
  app.finishRequest(200, { users: [] });
});
```

---

## Erros e Tratamento

### RouteNotFoundException

**Causa**: Nenhuma rota corresponde ao path + method

**Lançado em**: `executeRequestCycle()` quando `getRouteIndex()` retorna `-1`

**Tratamento em `SweetPotato`**:
```typescript
try {
  return await this.executeRequestCycle(...);
} catch (error) {
  if (error instanceof RouteNotFoundException) {
    return this.finishRequest(HttpStatusCode.NOT_FOUND, {
      message: (error as Error).message,
    });
  }
  // ...
}
```

---

## Performance Considerations

### Regex Compilation

Cada rota tem sua regex compilada uma vez em `createRoute()`:
```typescript
sufix: buildRoutePath(sufix)  // Compilada uma vez
```

A regex é reusada em `getRouteIndex()` para cada requisição:
```typescript
e.sufix.exec(path)  // Execução da regex compilada
```

### Array.findIndex

A busca linear no array de rotas tem complexidade O(n):
```typescript
this.routes.findIndex(...)  // O(n) onde n = número de rotas
```

Para grande número de rotas, considerar:
- Trie de rotas
- Map por método HTTP

---

## Resumo Técnico

|Aspecto | Implementação |
|--------|---------------|
| **Match Algorithm** | Regex exec com named groups |
| **Params Extraction** | Object destructuring + filtering |
| **Query Parsing** | String split + reduce |
| **Storage** | Array de objetos |
| **Search** | Linear search (findIndex) |
| **Global Prefix** | String concatenation |

**Complexidade**:
- Registro: O(1) por rota
- Match: O(n × m) onde n=rotas, m=comprimento do path
- Memória: O(n) para armazenar rotas
