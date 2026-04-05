# getQueries - Parse de Query Parameters

## Visão Geral

`getQueries` é um utilitário que **parseia uma query string em um objeto de parâmetros**. Ele converte strings como `?page=1&limit=10` em objetos `{ page: "1", limit: "10" }`.

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

## Propósito

Separar query string parsing da lógica de roteamento, garantindo que:
1. `query` group do regex seja removido (por `getRouteParams`)
2. Query parameters sejam parseados separadamente

## Lógica de Parsing

### Passo a Passo

```typescript
query.substring(1)  // Remove o "?"
  .split('&')       // Divide em "key=value" pairs
  .reduce(...)      // Build objeto
```

### Detalhamento

1. **substring(1)**: Remove o caractere inicial `?`
   - `"?page=1&limit=10"` → `"page=1&limit=10"`

2. **split('&')**: Divide em array de pairs
   - `"page=1&limit=10"` → `["page=1", "limit=10"]`

3. **reduce()**: Build objeto resultado
   - `item.split('=')` → `["page", "1"]`
   - `data[param] = value` → `data["page"] = "1"`

## Exemplos de Uso

### Exemplo 1: Query Simples

**Input**:
```typescript
const queries = getQueries("?page=1");
```

**Processo**:
1. `query.substring(1)`: `"?page=1".substring(1)` → `"page=1"`
2. `.split('&')`: `"page=1".split('&')` → `["page=1"]`
3. `reduce()`:
   - `item = "page=1"`
   - `item.split('=')` → `["page", "1"]`
   - `data["page"] = "1"`

**Output**:
```typescript
{ page: "1" }
```

---

### Exemplo 2: Múltiplos Parameters

**Input**:
```typescript
const queries = getQueries("?page=1&limit=10&sort=desc");
```

**Processo**:
1. `substring(1)`: `"page=1&limit=10&sort=desc"`
2. `split('&')`: `["page=1", "limit=10", "sort=desc"]`
3. `reduce()`:
   - `["page", "1"]` → `data["page"] = "1"`
   - `["limit", "10"]` → `data["limit"] = "10"`
   - `["sort", "desc"]` → `data["sort"] = "desc"`

**Output**:
```typescript
{ page: "1", limit: "10", sort: "desc" }
```

---

### Exemplo 3: Valor Vazio

**Input**:
```typescript
const queries = getQueries("?page=");
```

**Processo**:
- `item.split('=')` → `["page", ""]` (empty string)

**Output**:
```typescript
{ page: "" }
```

---

### Exemplo 4: Valor sem Parâmetro (key sem =)

**Input**:
```typescript
const queries = getQueries("?page");
```

**Processo**:
- `item.split('=')` → `["page"]` (apenas um item)
- `[param, value] = ["page"]` → `param = "page"`, `value = undefined`

**Output**:
```typescript
{ page: undefined }
```

---

### Exemplo 5: Valores com `=` (ex: URL encoded)

**Input**:
```typescript
const queries = getQueries("?url=https://example.com");
```

**Processo**:
- `item.split('=')` → `["url", "https://example.com"]` (apenas first split)

**Output**:
```typescript
{ url: "https://example.com" }
```

**Nota**: `split('=', 2)` ou `split('=')` com destructure pega apenas first e second.

---

### Exemplo 6: URL com múltiplos `=` (ex: OAuth)

**Input**:
```typescript
const queries = getQueries("?token=abc=def=ghi");
```

**Processo**:
- `item.split('=')` → `["token", "abc", "def", "ghi"]`
- `[param, value]` → `param = "token"`, `value = "abc"` (resto é ignore)

**Output**:
```typescript
{ token: "abc" }
```

**⚠️ PROBLEMA**: Valores com `=` são truncados!

**Alternativa para valores complexos**:
```typescript
// Se usar split('=', 1) - pega tudo depois do primeiro =
data[param] = item.substring(param.length + 1);
```

---

### Exemplo 7: Input Null/Undefined

**Input**:
```typescript
const queries1 = getQueries(null);
const queries2 = getQueries(undefined);
```

**Processo**:
- `if (!query) return null;` → Short-circuit

**Output**:
```typescript
null  // ambos
```

---

### Exemplo 8: Query String Vazia

**Input**:
```typescript
const queries = getQueries("?");
```

**Processo**:
1. `substring(1)`: `"?".substring(1)` → `""` (empty string)
2. `split('&')`: `"".split('&')` → `[""]`
3. `reduce()`:
   - `item = ""`
   - `item.split('=')` → `[""]`
   - `data[""] = undefined`

**Output**:
```typescript
{ "": undefined }
```

**⚠️ PROBLEMA**: Padrão vazio cria key vazia!

---

### Exemplo 9: Parâmetros Duplicados

**Input**:
```typescript
const queries = getQueries("?page=1&page=2");
```

**Processo**:
- `data["page"] = "1"` → `data["page"] = "2"` (overwrite)

**Output**:
```typescript
{ page: "2" }
```

**⚠️ PROBLEMA**: Valores duplicados são sobrescritos!

---

### Exemplo 10: Path sem Query String

**Input**:
```typescript
const queries = getQueries("?page=1&limit=10");
// query = "?page=1&limit=10"
// substring(1) = "page=1&limit=10"
// split('&') = ["page=1", "limit=10"]
// reduce() = { page: "1", limit: "10" }

// Mas getRouteParams remove o grupo 'query' dos regex groups
// getRouteParams({ query: "?page=1&limit=10" }) → {}
```

**Output**:
```typescript
// Em um contexto completo:
const params = getRouteParams(groups);     // {}
const queries = getQueries(groups['query']); // { page: "1", limit: "10" }
```

## Integração com buildRoutePath

### Fluxo Completo

```typescript
// 1. buildRoutePath cria regex com group 'query'
const routeRegex = buildRoutePath("/users");
// /^\/users(?<query>\?.*)?$/

// 2. Executa no path
const regexVerifier = routeRegex.exec("/users?page=1&limit=10");
// groups = { query: "?page=1&limit=10" }

// 3. getRouteParams extrai parâmetros (remove 'query')
const params = getRouteParams(groups);  // {} (sem parâmetros da rota)

// 4. getQueries parseia a query string
const queries = getQueries(groups['query']);  // { page: "1", limit: "10" }
```

### Divisão de Responsabilidades

| Função | Input | Output | Responsabilidade |
|--------|-------|--------|------------------|
| `buildRoutePath()` | Path string | `RegExp` | Compilação |
| `exec()` | Path | `execResult` | Match |
| `getRouteParams()` | `execResult.groups` | `Record<string, string>` | Parâmetros da rota |
| `getQueries()` | `execResult.groups.query` | `Record<string, string>` | Query string |

## Tratamento de Casos Edge

### Edge Case 1: Input Null/Undefined

```typescript
getQueries(null)      // return null
getQueries(undefined) // return null
```

**Comportamento**: Short-circuit com `if (!query)` → `null`

---

### Edge Case 2: Query String Vazia

```typescript
getQueries("")        // return {} (substring(1) = "", split = [""])
getQueries("?")       // return { "": undefined } (⚠️ problemático)
```

**Inconsistência**: `""` vs `"?` produzem resultados diferentes.

---

### Edge Case 3: Parâmetro sem Valor

```typescript
getQueries("?page")   // return { page: undefined }
```

**Resultado**: Key presente com valor `undefined`.

---

### Edge Case 4: Valor Vazio

```typescript
getQueries("?page=")  // return { page: "" }
```

**Resultado**: Key presente com valor vazio.

---

### Edge Case 5: Caracteres Especiais (URL Encoding)

```typescript
getQueries("?name=John%20Doe")  // return { name: "John%20Doe" }
```

**Nota**: `%20` não é automaticamente decode. Deve-se usar `decodeURIComponent`.

**Possível melhoria**:
```typescript
export function getQueries(query: string | undefined | null): Record<string, string> | null {
  if (!query) return null;
  
  return query.substring(1).split('&').reduce<Record<string, string>>((data, item) => {
    const [param, value] = item.split('=');
    data[param] = value ? decodeURIComponent(value) : '';
    return data;
  }, {});
}
```

---

### Edge Case 6: Parâmetros Duplicados

```typescript
getQueries("?page=1&page=2")  // return { page: "2" }
```

**Comportamento**: Último valor vence.

**Alternativa para array**:
```typescript
data[param] = data[param] 
  ? [...Array.isArray(data[param]) ? data[param] : [data[param]], value]
  : [value];
```

## Uso no Routes

### Em getRouteIndex()

```typescript
private getRouteIndex(path: string, method: string): number {
  return this.routes.findIndex((e) => {
    const regexVerifier = e.sufix.exec(path);
    if (!regexVerifier) return false;
    if (e.method !== method) return false;
    if (regexVerifier.find((t) => t === path)) {
      e.params = getRouteParams(regexVerifier.groups as Record<string, string>);
      e.queries = getQueries(regexVerifier.groups?.['query']);  // ← Uso
      return true;
    }
    return false;
  });
}
```

### Handler Context

```typescript
const requestCycleObject: HandlerContext = Object.freeze({
  body,
  params,      // de getRouteParams
  headers,
  queries,     // de getQueries
});
```

## Problemas Conhecidos

### 1. Truncamento de Valores com `=`

```typescript
getQueries("?url=https://example.com");
// Expected: { url: "https://example.com" }
// Actual: { url: "https://example.com" }  // funciona nesse caso
```

**Cuidado**: Se valor tiver múltiplos `=`:
```typescript
getQueries("?token=a=b=c");
// Expected: { token: "a=b=c" }
// Actual: { token: "a" }
```

**Solução**:
```typescript
const [param, ...valueParts] = item.split('=');
data[param] = valueParts.join('=');
```

### 2. Sobrescrita de Parâmetros Duplicados

```typescript
getQueries("?page=1&page=2");
// Expected: { page: ["1", "2"] } ou error
// Actual: { page: "2" }
```

### 3. Sem URL Decoding

```typescript
getQueries("?name=John%20Doe");
// Expected: { name: "John Doe" }
// Actual: { name: "John%20Doe" }
```

### 4. Query String Vazia

```typescript
getQueries("?");
// Expected: null ou {}
// Actual: { "": undefined }
```

## Performance Considerations

### Complexidade

- **Time**: O(n) onde n = comprimento da query string
- **Space**: O(k) onde k = número de parâmetros

### Operações

1. `substring(1)`: O(n) - cópia da string
2. `split('&')`: O(n) - cria array
3. `reduce()`: O(k) - itera sobre k items
4. `split('=')`: O(m) - onde m = comprimento do item

### Otimização Possível

```typescript
// Evitar substring(1) - usar índice inicial
export function getQueries(query: string | undefined | null): Record<string, string> | null {
  if (!query) return null;
  
  let start = 0;
  if (query.charAt(0) === '?') start = 1;
  
  // restante igual
}
```

---

## Resumo

| Aspecto | Implementação |
|---------|---------------|
| **Responsabilidade** | Parse query string em objeto |
| **Input** | `string \| undefined \| null` |
| **Output** | `Record<string, string> \| null` |
| **Formato** | `?key1=value1&key2=value2` |
| **Empty** | `null` se input é null/undefined |

### Contrato de Retorno

| Input | Output | Notas |
|-------|--------|-------|
| `null` | `null` | Short-circuit |
| `undefined` | `null` | Short-circuit |
| `""` | `""` → `{ "": undefined }` | ⚠️ |
| `"?"` | `"?"` → `{ "": undefined }` | ⚠️ |
| `"?page=1"` | `{ page: "1" }` | Normal |
| `"?page="` | `{ page: "" }` | Valor vazio |

### Design Decisions

1. **Return `null` não `{}`**: Para diferenciar "sem query" de "query vazia"
2. **`substring(1)`**: Mais simples que index tracking
3. **Destructuring**: `const [param, value] = item.split('=')`

### Vantagens

- **Simples**: Lógica direta
- **Rápido**: O(n) linear
- **Previsível**: Comportamento conhecido (exceto edge cases)

### Limitações

- **Sem decoding**: `%20` não é convertido
- **Sem array**: Valores duplicados são sobrescritos
- **Sem validação**: Keys/valores não validados
- **Múltiplos `=`**: Valores truncados

### Possíveis Melhorias

```typescript
export function getQueries(query: string | undefined | null): Record<string, string | string[]> | null {
  if (!query) return null;
  
  let start = 0;
  if (query.charAt(0) === '?') start = 1;
  
  return query.substring(start).split('&').reduce<Record<string, string | string[]>>((data, item) => {
    const idx = item.indexOf('=');
    if (idx === -1) return data;  // skip inválido
    
    const param = item.substring(0, idx);
    const value = item.substring(idx + 1) ? decodeURIComponent(item.substring(idx + 1)) : '';
    
    // Support para múltiplos valores
    if (data[param]) {
      data[param] = Array.isArray(data[param]) 
        ? [...data[param] as string[], value]
        : [data[param] as string, value];
    } else {
      data[param] = value;
    }
    return data;
  }, {});
}
```
