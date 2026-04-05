# buildRoutePath - Compilação de Rotas com Regex

## Visão Geral

`buildRoutePath` é um utilitário que **compila uma string de rota em uma expressão regular**. Ele permite definir rotas com parâmetros nomeados (ex: `:id`) que são convertidos em regex named groups.

```typescript
export function buildRoutePath(path: string): RegExp {
  const routeParametersRegex = /:([a-zA-Z]+)/g;
  const params = path.replaceAll(routeParametersRegex, '(?<$1>[a-z0-9\\-_]+)');

  const queryRegex = new RegExp(`^${params}(?<query>\\?(.*))?$`);

  return queryRegex;
}
```

## Lógica de Compilação

### Passo a Passo

1. **Identificar parâmetros de rota**:
   ```javascript
   /:([a-zA-Z]+)/g  // Regex para :parametro
   ```

2. **Substituir por regex named group**:
   ```javascript
   path.replaceAll(/:([a-zA-Z]+)/g, '(?<$1>[a-z0-9\\-_]+)')
   ```

3. **Adicionar suporte para query string**:
   ```javascript
   new RegExp(`^${params}(?<query>\\?(.*))?$`)
   ```

### Named Groups Explained

```regex
(?<id>[a-z0-9\\-_]+)
 │   │         │
 │   │         └─ Content: letras minúsculas, dígitos, hífen, underscore
 │   └─────────── Name: "id" (captação nomeada)
 └─────────────── Pattern: capture group named "id"
```

## Exemplos de Compilação

### Exemplo 1: Rota Simples

**Input**:
```typescript
buildRoutePath("/users")
```

**Passo 1** - Identificar parâmetros:
- `/users` não tem `:`, então não há substituição
- `params = "/users"`

**Passo 2** - Adicionar query support:
- `new RegExp(`^/users(?<query>\\?(.*))?$`)`

**Resultante**:
```javascript
/^\/users(?<query>\?.*)?$/
```

**Testes**:
| Path | Match | Groups |
|------|-------|--------|
| `/users` | ✅ | `{ query: undefined }` |
| `/users?page=1` | ✅ | `{ query: '?page=1' }` |

---

### Exemplo 2: Rota com Parâmetro

**Input**:
```typescript
buildRoutePath("/users/:id")
```

**Passo 1** - Identificar parâmetros:
- `:id` → `(?<id>[a-z0-9\\-_]+)`
- `params = "/users/(?<id>[a-z0-9\\-_]+)"`

**Passo 2** - Adicionar query support:
- `new RegExp(`^/users/(?<id>[a-z0-9\\-_]+)(?<query>\\?.*)?$`)`

**Resultante**:
```javascript
/^\/users\/(?<id>[a-z0-9\-_]+)(?<query>\?.*)?$/
```

**Testes**:
| Path | Match | Groups |
|------|-------|--------|
| `/users/123` | ✅ | `{ id: "123", query: undefined }` |
| `/users/abc` | ✅ | `{ id: "abc", query: undefined }` |
| `/users/123?page=1` | ✅ | `{ id: "123", query: '?page=1' }` |
| `/users/` | ❌ | - |
| `/users/123/extra` | ❌ | - |

**Regras de Validação**:
- Apenas `a-z`, `0-9`, `-`, `_` são permitidos
- Números são permitidos no parâmetro

---

### Exemplo 3: Rota com Múltiplos Parâmetros

**Input**:
```typescript
buildRoutePath("/users/:userId/posts/:postId")
```

**Compilação**:
- `:userId` → `(?<userId>[a-z0-9\\-_]+)`
- `:postId` → `(?<postId>[a-z0-9\\-_]+)`

**Resultante**:
```javascript
/^\/users\/(?<userId>[a-z0-9\-_]+)\/posts\/(?<postId>[a-z0-9\-_]+)(?<query>\?.*)?$/
```

**Testes**:
| Path | Match | Groups |
|------|-------|--------|
| `/users/1/posts/2` | ✅ | `{ userId: "1", postId: "2" }` |
| `/users/abc/posts/xyz` | ✅ | `{ userId: "abc", postId: "xyz" }` |

---

### Exemplo 4: Rota com Hífen e Underscore

**Input**:
```typescript
buildRoutePath("/items/:item-id/slug/:item_slug")
```

**Resultante**:
```javascript
/^\/items\/(?<item-id>[a-z0-9\-_]+)\/slug\/(?<item_slug>[a-z0-9\-_]+)(?<query>\?.*)?$/
```

**Testes**:
| Path | Match | Groups |
|------|-------|--------|
| `/items/item-1/slug/my-slug` | ✅ | `{ item-id: "item-1", item_slug: "my-slug" }` |
| `/items/item_1/slug/my_slug` | ✅ | `{ item-id: "item_1", item_slug: "my_slug" }` |

---

### Exemplo 5: Rota com Query String

**Input**:
```typescript
buildRoutePath("/search")
```

**Resultante**:
```javascript
/^\/search(?<query>\?.*)?$/
```

**Testes**:
| Path | Match | Groups |
|------|-------|--------|
| `/search` | ✅ | `{ query: undefined }` |
| `/search?q=test` | ✅ | `{ query: '?q=test' }` |
| `/search?page=1&limit=10` | ✅ | `{ query: '?page=1&limit=10' }` |

---

## Detalhes Técnicos

### Regex Pattern Breakdown

```regex
^                              # Início da string
  <params>                     # Parâmetros da rota (substituídos)
  (?<query>\?(.*))?            # Query string opcional (não capture group)
$                              # Fim da string
```

### Named Group `query`

O group `(?<query>\\?(.*))?` captura:
- `\?` - caractere `?` literal (escapado)
- `(.*)` - qualquer caractere zero ou mais vezes
- `?` - group é opcional

**Exemplo de extração**:
```javascript
// Path: "/users/123?page=1&limit=10"
// Groups: { id: "123", query: "?page=1&limit=10" }

// O group "query" inclui o "?"
// getQueries() remove o "?" com substring(1)
```

### Caracteres Permitidos em Parâmetros

A regex `[a-z0-9\\-_]+` permite:
- `a-z`: letras minúsculas
- `0-9`: dígitos
- `-`: hífen
- `_`: underscore

**Não permite**:
- Letras maiúsculas (ex: `:ID`)
- Espaços
- Caracteres especiais (ex: `:user@email`)

### Suporte a Query String

A query string é capturada como um **único group nomeado** `query`. A parsing da query string é feito separadamente por `getQueries()`.

```typescript
// buildRoutePath captura:
{ query: "?page=1&limit=10" }

// getQueries processa:
"page=1&limit=10" → { page: "1", limit: "10" }
```

---

## Integração com getRouteParams e getQueries

### Fluxo Completo de Extração

```typescript
// 1. buildRoutePath cria a regex
const routeRegex = buildRoutePath("/users/:id");

// 2. Executa no path
const regexVerifier = routeRegex.exec("/users/123?page=1");
// { 0: "/users/123?page=1", groups: { id: "123", query: "?page=1" } }

// 3. getRouteParams extrai parâmetros da rota
const params = getRouteParams(regexVerifier.groups);
// { id: "123" }

// 4. getQueries extrai query parameters
const queries = getQueries(regexVerifier.groups?.['query']);
// { page: "1" }
```

### getRouteParams Implementation

```typescript
export function getRouteParams(
  groups: Record<string, string>
): Record<string, string> | null {
  const { query: _query, ...others } = groups;
  if (Object.keys(others).length === 0) return {};
  return others;
}
```

**Comportamento**:
1. Remove o group `query` (que não é um parâmetro de rota)
2. Retorna apenas parâmetros da rota

**Exemplo**:
```javascript
// Groups: { id: "123", query: "?page=1" }
// After destructuring: { id: "123" }
```

---

## Casos Edge e Limitações

### Edge Case 1: Path Vazio

```typescript
buildRoutePath("");
// new RegExp("^(?<query>\\?.*)?$")
// Match: "", "?page=1"
```

### Edge Case 2: Apenas Query String

```typescript
buildRoutePath("?");
// new RegExp("^(?<query>\\?.*)?$")
// Match: "?", "?page=1"
```

### Edge Case 3: Parâmetro Sem Nome Válido

```typescript
buildRoutePath("/users/:");  // Parâmetro sem nome
// : não tem [a-zA-Z]+, então não é substituído
// new RegExp("^/users/:(?<query>\\?.*)?$")
```

### Edge Case 4: Parâmetro com Números Iniciais

```typescript
buildRoutePath("/users/:1id");  // Parâmetro começa com número
// :1id não match /:([a-zA-Z]+)/g (começa com 1)
// new RegExp("^/users/:1id(?<query>\\?.*)?$")
// O :1id não é tratado como parâmetro
```

### Edge Case 5: Parâmetro com Maiúsculas

```typescript
buildRoutePath("/users/:ID");
// :ID match /:([a-zA-Z]+)/g
// new RegExp("^/users/(?<ID>[a-z0-9\\-_]+)(?<query>\\?.*)?$")
// Mas "/users/ABC" não match (maiúsculas não são permitidas no valor)
```

**Resultado**: O parâmetro `:ID` é reconhecido, mas valores com maiúsculas não são aceitos.

---

## Performance Considerations

### Regex Compilation

Cada chamada a `buildRoutePath()` compila uma nova regex:
```typescript
return queryRegex;  // nova RegExp() a cada chamada
```

**Otimização possível**:
```typescript
// Cache de compilação
const routeCache = new Map<string, RegExp>();

function buildRoutePath(path: string): RegExp {
  if (routeCache.has(path)) {
    return routeCache.get(path)!;
  }
  
  const regex = /* compile */;
  routeCache.set(path, regex);
  return regex;
}
```

### Impacto

- **Sem cache**: O(n × m) onde n=chamadas, m=comprimento do path
- **Com cache**: O(n) + O(m) para primeira compilação

---

## Uso no Framework

### Em Routes.createRoute()

```typescript
private createRoute(method: string, sufix: string, handlers: RouteHandler[]): void {
  const newRoute: Route = {
    method,
    originalSufix: sufix,
    sufix: buildRoutePath(sufix),  // ← Compilação aqui
    // ...
  };
}
```

**Cada rota tem sua regex compilada uma vez** no momento de criação.

### Em getRouteIndex()

```typescript
private getRouteIndex(path: string, method: string): number {
  return this.routes.findIndex((e) => {
    const regexVerifier = e.sufix.exec(path);  // ← Executa regex compilada
    // ...
  });
}
```

**A regex compilada é executada para cada requisição** até encontrar match.

---

## Resumo

| Aspecto | Implementação |
|---------|---------------|
| **Conversão** | `:param` → `(?<param>[a-z0-9\\-_]+)` |
| **Query Support** | `(?<query>\\?.*)?` |
| **Named Groups** | Para extração de parâmetros |
| **Compilação** | A cada chamada (sem cache) |
| **Custo** | O(m) por rota criada |
| **Execução** | O(n) por requisição (n=parâmetros) |

### Padrão de Uso

1. **Route definition**: `app.get("/users/:id", handler)`
2. **buildRoutePath**: Compila em regex named groups
3. **Route storage**: Regex é armazenada em `Route.sufix`
4. **Request time**: `route.sufix.exec(path)` extrai params

### Vantagens

- **Flexibilidade**: Suporta múltiplos parâmetros
- **Validação**: Regex restringe caracteres permitidos
- **Extração**: Named groups facilitam extração de parâmetros

### Limitações

- Apenas letras minúsculas no valor (sem maiúsculas)
- Sem suporte a regex customizada
- Sem validação de tipos (não distingue `:id` vs `:userId`)
