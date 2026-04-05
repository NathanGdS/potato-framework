# Introdução ao Potato Framework

## Visão Geral

O Potato Framework é uma **HTTP server framework lightweight** para Node.js, projetada com os seguintes princípios:

- **Zero dependências externas** - Usa apenas o módulo nativo `http`
- **ES Modules puro** - Sem build steps ou transpilação
- **Simplicidade** - Código pequeno, fácil de entender e debugar
- **TypeScript-first** - Escrito em TypeScript, distribuído como ES Modules

## Arquitetura

### Estrutura de Classes

```
┌─────────────────────────────────────────────────────────────┐
│                     SweetPotato (Server)                    │
│  - Cria servidor HTTP                                       │
│  - Gerencia requisições/Respostas                           │
│  - Extends Resource                                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ extends
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                       Resource (DSL)                        │
│  - Fluent API para definição de rotas                       │
│  - Suporta .get(), .post(), .put(), .patch(), .delete()    │
│  - Suporta Resource DSL                                     │
│  - Extends Routes                                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ extends
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                        Routes (Engine)                      │
│  - Armazena todas as rotas                                  │
│  - Realiza match de requisição para rota                    │
│  - Executa RequestCycle                                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ uses
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    RequestCycle (Executor)                  │
│  - Executa handlers em sequência                            │
│  - Detecta e espera por async handlers                      │
│  - Gerencia middlewares                                       │
└─────────────────────────────────────────────────────────────┘
```

### Responsabilidades por Classe

| Classe | Responsabilidade |
|--------|-----------------|
| `SweetPotato` | Main server class - cria servidor HTTP, gerencia request/response lifecycle |
| `Resource` | Fluent DSL - definição de rotas com métodos HTTP e recursos |
| `Routes` | Engine de roteamento - armazena rotas, faz match, executa handlers |
| `RequestCycle` | Executor - executa handlers/middlewares em sequência |

## Filosofia de Design

### 1. Handler Contract

Todos os handlers (middlewares e rotas) seguem o mesmo contrato:

```typescript
type RouteHandler = (ctx: HandlerContext) => void | Promise<void>;
```

O contexto passado para cada handler é **imutável** (`Object.freeze`):

```typescript
interface HandlerContext {
  body: any;              // Body JSON parseado
  params: Record<string, string> | null;  // Parâmetros de rota (:id)
  headers: IncomingHttpHeaders;
  queries: Record<string, string> | null; // Query parameters
}
```

### 2. Sem next() - Chaining Explícito

Ao contrário de Express/Fastify, **não existe `next()`**. Os handlers são executados em sequência:

```javascript
// Potato Framework
app.get("/users", middleware1, middleware2, handler);

// Express
app.get("/users", middleware1, middleware2, handler); // next() é implicitamente chamado
```

Cada handler tem acesso ao contexto completo e é responsável por chamar `app.finishRequest()`.

### 3. Request Lifecycle

```
HTTP Request
    │
    ├─→ SweetPotato (parseia headers, método, path)
    ├─→ defineBodyAttributes (lê body, parseia JSON)
    ├─→ Routes.executeRequestCycle (busca rota correspondente)
    ├─→ RequestCycle.execute (executa handlers em ordem)
    │       ├─→ Handler 1
    │       ├─→ Handler 2 (middleware)
    │       └─→ Handler 3 (rote)
    ├─→ finishRequest (envia resposta)
    └─→ HTTP Response
```

## Quando Usar

| Cenário | Recomendação |
|---------|-------------|
| Microservices simples | ✅ Potato Framework |
| API REST complexa com muitos middlewares | ⚠️ Considere Express/NestJS |
| Aplicações que precisam de WebSocket | ❌ Use outro framework |
| Learning/educação | ✅ Excelente opção |

## Estrutura de Código

```
package/
├── SweetPotato.mjs       # Classe principal do servidor
├── Routes.mjs            # Engine de roteamento
├── Resource.mjs          # DSL para definição de rotas
├── RequestCycle.mjs      # Execução de handlers
├── SweetPotatoApp.mjs    # Singleton wrapper
├── constants/            # HttpMethod, HttpStatusCode
├── errors/               # Error classes
└── utils/                # Helpers (buildRoutePath, logger, etc.)
```

## Versão eCompatibilidade

- **Node.js**: 18.12.0+
- **TypeScript**: 5.0+ (para desenvolvimento)
- **ES Modules**: Módulos ES nativos (.mjs/.ts)
