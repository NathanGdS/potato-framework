# SweetPotato - Classe Principal do Servidor

## Visão Geral

`SweetPotato` é a classe principal do framework. Ela estende `Resource`, cria o servidor HTTP nativo do Node.js e gerencia o ciclo de vida completo de cada requisição.

```typescript
export class SweetPotato extends Resource {
  private appReq: IncomingMessage | null = null;
  private appRes: ServerResponse | null = null;
  private method: string = '';
  private path: string = '';
  private dataBody: unknown = null;
  private port: number = DEFAULT_PORT;
  private headers: IncomingMessage['headers'] = {};
  private appName = 'App';
}
```

## Constructor

```typescript
constructor() {
  super();
  log().info('Starting a Sweet app for you', this.appName);
}
```

- Chama `super()` para inicializar `Resource` e `Routes`
- Registra log inicial com o nome da aplicação

## listen(port?: number)

**Responsabilidade**: Iniciar o servidor HTTP e escutar requisições

```typescript
listen(port?: number): void {
  this.port = port ?? DEFAULT_PORT;  // 8000 por padrão
  
  http
    .createServer(async (req: IncomingMessage, res: ServerResponse) => {
      this.defineGlobalAttributes(req, res);   // 1. Captura dados
      await this.defineBodyAttributes();        // 2. Lê body
      await this.handleRoute();                 // 3. Encontra rota

      if (!this.appRes!.writableEnded) {
        this.appRes!.end();                     // 4. Finaliza se necessário
      }
    })
    .listen(this.port, () => {
      log().info(`${this.getRoutes().length} routes created`, this.appName);
      log().info(`App is running on port ${this.port}`, this.appName);
    });
}
```

### Fluxo no createServer

1. **defineGlobalAttributes(req, res)**
   - Captura `req` e `res` para uso posterior
   - Captura `method`, `url`, `headers`

2. **defineBodyAttributes()**
   - Lê todos os chunks do body
   - Parseia JSON

3. **handleRoute()**
   - Executa o pipeline de roteamento
   - Trata erros (404, 500)

4. **res.end()**
   - Finaliza resposta se não foi feito antes

---

## defineGlobalAttributes(req, res)

```typescript
private defineGlobalAttributes(req: IncomingMessage, res: ServerResponse): void {
  this.appReq = req;
  this.appRes = res;
  this.method = (req.method ?? 'GET').toUpperCase();   // GET, POST, etc.
  this.path = req.url ?? '/';                           // /users/123?foo=bar
  this.headers = req.headers;                           // headers object
}
```

**Captura**:
| Atributo | Fonte | Valor Exemplo |
|----------|-------|----------------|
| `appReq` | `req` | IncomingMessage |
| `appRes` | `res` | ServerResponse |
| `method` | `req.method` | "GET", "POST", "PUT", "PATCH", "DELETE" |
| `path` | `req.url` | "/users/123?foo=bar" |
| `headers` | `req.headers` | { host, user-agent, content-type, ... } |

---

## defineBodyAttributes()

```typescript
private async defineBodyAttributes(): Promise<void> {
  const buffers: Buffer[] = [];

  // Lê todos os chunks do body
  for await (const chunk of this.appReq!) {
    buffers.push(chunk as Buffer);
  }

  if (buffers.length) {
    // Parseia JSON
    this.dataBody = JSON.parse(Buffer.concat(buffers).toString());
  }
}
```

**Comportamento**:
- Se body vazio: `dataBody = null`
- Se body JSON: parseia para objeto
- Se body não-JSON: lançará erro (deve ser tratado)

**Limitações**:
- Apenas suporta JSON no body
- Não há tratamento de erros de parse (deve adicionar try/catch)

---

## handleRoute()

```typescript
private async handleRoute(): Promise<void> {
  try {
    return await this.executeRequestCycle(
      this.path,
      this.method,
      this.dataBody,
      this.headers
    );
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

**Fluxo**:
1. Tenta executar o pipeline de roteamento
2. Se `RouteNotFoundException`: retorna 404
3. Se outro erro: retorna 500

---

## finishRequest(code, message)

```typescript
finishRequest(code: number | undefined, message: unknown): void {
  try {
    const statusCode = code ?? HttpStatusCode.SUCCESS;  // 200 por padrão
    this.appRes!.writeHead(statusCode);
    this.appRes!.write(JSON.stringify(message));
    this.appRes!.end();
  } catch {
    // Fallback se writeHead já tiver sido chamado
    this.appRes!.write(JSON.stringify(message));
    this.appRes!.end();
  }
}
```

**Comportamento**:
- Define statusCode com `writeHead()`
- Escreve JSON no body
- Finaliza resposta com `end()`
- Tem fallback para casos onde `writeHead()` falha (headers já enviados)

**Notas**:
- O `try-catch` protege contra `[ERR_HTTP_HEADERS_SENT]`
- Se já escreveu headers, apenas escreve o body

---

## Atributos Privados Detalhados

### appReq: IncomingMessage | null

Referência para o IncomingMessage da requisição atual. Usado para:
- Ler body em chunks
- Acessar headers
- Acessar URL e método

### appRes: ServerResponse | null

Referência para o ServerResponse da requisição atual. Usado para:
- Escrever headers
- Escrever body
- Finalizar resposta

### method: string

Método HTTP da requisição. Valores possíveis:
- `"GET"`
- `"POST"`
- `"PUT"`
- `"PATCH"`
- `"DELETE"`
- `""` (padrão se não especificado)

### path: string

URL completo da requisição (path + query string):
- Ex: `/users/123?foo=bar&baz=qux`
- O `Routes` irá separar path e query para match

### dataBody: unknown

Body da requisição parseado:
- Se JSON: objeto
- Se vazio: `null`
- Se não-JSON: erro (lança exception)

### port: number

Porta onde o servidor escuta. Padrão: `8000`

### headers: IncomingMessage['headers']

Headers da requisição:
```typescript
{
  host: 'localhost:8000',
  'user-agent': 'curl/7.68.0',
  'content-type': 'application/json',
  // ... outros
}
```

### appName: string

Nome da aplicação para logs. Padrão: `'App'`

---

## Padrões de Uso

### Instanciação Direta

```typescript
import { SweetPotato } from './package/SweetPotato.mjs';

const app = new SweetPotato();

app.get('/users', (ctx) => {
  ctx.headers;  // headers
  ctx.params;   // null (sem parâmetros)
  ctx.body;     // null (GET sem body)
  ctx.queries;  // query params
  
  app.finishRequest(200, { message: 'OK' });
});

app.listen(3000);
```

### Usando Singleton (SweetPotatoApp)

```typescript
import { SweetPotatoApp } from './package/SweetPotatoApp.mjs';

const app = SweetPotatoApp();

app.get('/health', (ctx) => {
  app.finishRequest(200, { status: 'ok' });
});

app.listen();
```

---

## Erros e Tratamento

### [ERR_HTTP_HEADERS_SENT]

**Causa**: Tentar escrever headers após já ter enviado resposta

**Prevenção**: O `try-catch` em `finishRequest()` cobre isso:

```typescript
try {
  this.appRes!.writeHead(statusCode);
  this.appRes!.write(JSON.stringify(message));
  this.appRes!.end();
} catch {
  // Fallback
  this.appRes!.write(JSON.stringify(message));
  this.appRes!.end();
}
```

### RouteNotFoundException

**Causa**: Nenhuma rota correspondente ao path + method

**Tratamento**:
```typescript
if (error instanceof RouteNotFoundException) {
  return this.finishRequest(HttpStatusCode.NOT_FOUND, {
    message: (error as Error).message,
  });
}
```

### JSON Parse Error

**Causa**: Body não é JSON válido

**Tratamento**: Lança exception que cai no catch geral → 500

---

## Resumo de Responsabilidades

| Responsabilidade | Métodos |
|-----------------|---------|
| Servidor HTTP | `listen()`, `createServer()` |
| Captura de dados | `defineGlobalAttributes()`, `defineBodyAttributes()` |
| Roteamento | `handleRoute()`, `executeRequestCycle()` |
| Resposta | `finishRequest()` |
| Logs | Constructor, `listen()` callback |

**Princípio SRP**: `SweetPotato` tem **uma única responsabilidade** - ser o ponto de entrada do servidor HTTP, delegando lógica de roteamento para `Routes`.
