# getRouteParams - Extração de Parâmetros de Rota

## Visão Geral

`getRouteParams` é um utilitário que **extrai apenas os parâmetros da rota** de um objeto de match regex, removendo o group especial `query` que é usado para query strings.

```typescript
export function getRouteParams(
  groups: Record<string, string>
): Record<string, string> | null {
  const { query: _query, ...others } = groups;
  if (Object.keys(others).length === 0) return {};
  return others;
}
```

## Propósito

Quando `buildRoutePath()` compila uma rota em regex, ele cria **dois tipos de named groups**:

1. **Parâmetros da rota**: `:id` → `(?<id>[a-z0-9\\-_]+)`
2. **Query string**: `(?<query>\\?.*)?`

`getRouteParams()` remove o group `query` e retorna apenas os parâmetros da rota.

## Lógica de Extração

### Processo de Destructuring

```typescript
const { query: _query, ...others } = groups;
```

1. **Extração explícita**: `query` é extraído e renomeado para `_query` (variável descartável)
2. **Rest**: `...others` captura todos os outros keys do objeto

### Filtro de Empty Objects

```typescript
if (Object.keys(others).length === 0) return {};
```

**Comportamento**:
- Se não há outros groups além de `query`: retorna `{}` (não `null`)
- Se há outros groups: retorna `others`

**Nota**: O retorno é `{}` (objeto vazio), não `null`, quando não há parâmetros.

## Exemplos de Uso

### Exemplo 1: Rota com Parâmetro

**Input**:
```typescript
const groups = { id: "123", query: undefined };
const params = getRouteParams(groups);
```

**Processo**:
1. Destructuring: `{ query: _query, ...others }`
   - `_query = undefined`
   - `others = { id: "123" }`
2. Check `Object.keys(others)`: `[ "id" ]` → length = 1
3. Retorna: `{ id: "123" }`

**Output**:
```typescript
{ id: "123" }
```

---

### Exemplo 2: Rota sem Parâmetro

**Input**:
```typescript
const groups = { query: undefined };
const params = getRouteParams(groups);
```

**Processo**:
1. Destructuring: `{ query: _query, ...others }`
   - `_query = undefined`
   - `others = {}` (vazio, não há outros keys)
2. Check `Object.keys(others)`: `[]` → length = 0
3. Retorna: `{}`

**Output**:
```typescript
{}
```

---

### Exemplo 3: Rota com Múltiplos Parâmetros

**Input**:
```typescript
const groups = { 
  id: "123", 
  userId: "456", 
  query: "?page=1" 
};
const params = getRouteParams(groups);
```

**Processo**:
1. Destructuring: `{ query: _query, ...others }`
   - `_query = "?page=1"`
   - `others = { id: "123", userId: "456" }`
2. Check: `Object.keys(others)` → `[ "id", "userId" ]`
3. Retorna: `{ id: "123", userId: "456" }`

**Output**:
```typescript
{ id: "123", userId: "456" }
```

---

### Exemplo 4: Path Sem Query String

**Input**:
```typescript
const groups = { id: "abc" };  // Sem key 'query'
const params = getRouteParams(groups);
```

**Processo**:
1. Destructuring: `{ query: _query, ...others }`
   - `_query = undefined` (default do destructuring)
   - `others = { id: "abc" }`
2. Check: `Object.keys(others)` → `[ "id" ]`
3. Retorna: `{ id: "abc" }`

**Output**:
```typescript
{ id: "abc" }
```

---

### Exemplo 5: Path Apenas com Query String

**Input**:
```typescript
const groups = { query: "?page=1&limit=10" };
const params = getRouteParams(groups);
```

**Processo**:
1. Destructuring: `{ query: _query, ...others }`
   - `_query = "?page=1&limit=10"`
   - `others = {}`
2. Check: `Object.keys(others)` → `[]` (vazio)
3. Retorna: `{}`

**Output**:
```typescript
{}
```

## Comparação: Com vs Sem getRouteParams

### Situação: Rota /users/:id

**Sem getRouteParams**:
```javascript
// Groups retornado pelo regex exec:
{ id: "123", query: undefined }

// Precisa filtrar manualmente:
const params = Object.fromEntries(
  Object.entries(groups).filter(([key]) => key !== 'query')
);
// { id: "123" }
```

**Com getRouteParams**:
```javascript
// Groups retornado pelo regex exec:
{ id: "123", query: undefined }

// Uso direto:
const params = getRouteParams(groups);
// { id: "123" }
```

## Integração com buildRoutePath

### Fluxo Completo

```typescript
// 1. Build regex
const routeRegex = buildRoutePath("/users/:id");
// /^\/users\/(?<id>[a-z0-9\-_]+)(?<query>\?.*)?$/

// 2. Executar no path
const regexVerifier = routeRegex.exec("/users/123?page=1");
// { 
//   0: "/users/123?page=1", 
//   groups: { id: "123", query: "?page=1" } 
// }

// 3. Extrair parâmetros da rota
const params = getRouteParams(regexVerifier.groups);
// { id: "123" }

// 4. Extrair query parameters
const queries = getQueries(regexVerifier.groups?.['query']);
// { page: "1" }
```

## Integração com getQueries

### Divisão de Responsabilidades

| Função | Responsabilidade | Input | Output |
|--------|------------------|-------|--------|
| `getRouteParams()` | Extrair parâmetros da rota | `groups` | `{ id: "123" }` |
| `getQueries()` | Extrair query string | `query` string | `{ page: "1" }` |

### Complementaridade

```typescript
// getRouteParams remove 'query' do groups
const { query: _query, ...others } = groups;
// Retorna: { id: "123" }

// getQueries processa a query string separadamente
getQueries("?page=1&limit=10");
// Retorna: { page: "1", limit: "10" }
```

## Tratamento de Casos Edge

### Edge Case 1: Groups Vazio

```typescript
const groups = {};
const params = getRouteParams(groups);
// { query: _query, ...others } → others = {}
// Object.keys(others).length === 0 → true
// Retorna: {}
```

### Edge Case 2: Groups com apenas undefined

```typescript
const groups = { query: undefined };
const params = getRouteParams(groups);
// others = {}
// Retorna: {}
```

### Edge Case 3: Groups sem key 'query'

```typescript
const groups = { id: "123" };
const params = getRouteParams(groups);
// { query: _query (default), ...others = { id: "123" } }
// Retorna: { id: "123" }
```

### Edge Case 4: Keys que não são parâmetros

Se `buildRoutePath()` mudar e adicionar mais groups:
```typescript
const groups = { id: "123", query: "?page=1", extra: "value" };
const params = getRouteParams(groups);
// { query: _query, ...others = { id: "123", extra: "value" } }
// Retorna: { id: "123", extra: "value" }
```

**Nota**: `getRouteParams()` **não filtra por tipo de key**. Filtra apenas removendo `query`.

## Performance Considerations

### Complexidade

- **Time**: O(n) onde n = número de keys em `groups`
- **Space**: O(n) para o objeto `others`

### Operações

1. Destructuring: O(n)
2. Object.keys(): O(n)
3. Return: O(1) (referência)

### Otimização Possível

Se `groups` sempre tem apenas uma key `query` e o restante:
```typescript
// Alternativa mais performática (mas menos legível)
export function getRouteParams(groups: Record<string, string>): Record<string, string> {
  if (Object.keys(groups).length <= 1) return {};
  // ...
}
```

**A implementação atual é suficiente** para o uso no framework.

## Uso no Routes

### Em getRouteIndex()

```typescript
private getRouteIndex(path: string, method: string): number {
  return this.routes.findIndex((e) => {
    const regexVerifier = e.sufix.exec(path);
    if (!regexVerifier) return false;
    if (e.method !== method) return false;
    if (regexVerifier.find((t) => t === path)) {
      e.params = getRouteParams(regexVerifier.groups as Record<string, string>);  // ← Uso
      e.queries = getQueries(regexVerifier.groups?.['query']);
      return true;
    }
    return false;
  });
}
```

## Resumo

| Aspecto | Implementação |
|---------|---------------|
| **Responsabilidade** | Filtrar parâmetros da rota |
| **Input** | `Record<string, string>` |
| **Output** | `Record<string, string>` ou `{}` |
| **Filter** | Remove key `query` |
| **Empty** | Retorna `{}` se não há outros keys |

### Contrato de Retorno

| Input | Output | Notas |
|-------|--------|-------|
| `{ id: "1", query: "?" }` | `{ id: "1" }` | Parâmetro extraído |
| `{ query: "?" }` | `{}` | Sem parâmetros |
| `{ id: "1" }` | `{ id: "1" }` | Sem query |
| `{}` | `{}` | Vazio |

### Design Decisions

1. **Return `{}` não `null`**: Para evitar null checks no caller
2. **Destructuring**: Mais legível que loop manual
3. **Não filter()**: Menos overhead que Array.filter()

### Vantagens

- **Simples**: Uma linha de lógica principal
- **Limpo**: Separa responsabilidades (parâmetros vs query)
- **Predictável**: Comportamento conhecido

### Limitações

- **Nome fixo**: Dependente da key `query`
- **Sem validação**: Não verifica se `query` é realmente a query string
- **Sem type safety**: Recebe `Record<string, string>` genérico
