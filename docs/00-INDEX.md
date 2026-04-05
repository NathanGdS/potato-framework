# Potato Framework - Documentação da Engine

Esta documentação técnica descreve o funcionamento interno da Potato Framework, uma lightweight HTTP server framework para Node.js escrita em ES Modules puro.

---

## Sumário

### 1. Visão Geral
- [Introdução](./01-introducao.md) - Visão geral do framework e suas filosofias de design
- [Arquitetura](./02-arquitetura.md) - Estrutura de classes e fluxo de dados

### 2. Componentes Internos
- [SweetPotato](./03-sweetpotato.md) - Classe principal do servidor HTTP
- [Routes](./04-routes.md) - Engine de roteamento e gerenciamento de rotas
- [Resource](./05-resource.md) - DSL para definição de recursos RESTful
- [RequestCycle](./06-requestcycle.md) - Execução de middleware/handlers

### 3. Utilitários e Helpers
- [buildRoutePath](./07-utils-buildroutepath.md) - Compilação de rotas com Regex
- [getRouteParams](./08-utils-getrouteparams.md) - Extração de parâmetros de rota
- [getQueries](./09-utils-getqueries.md) - Parse de query parameters
- [isPromise](./10-utils-ispromise.md) - Detecção de funções async

### 4. Tipos e Constantes
- [Tipos Base](./11-tipos-base.md) - HandlerContext, RouteHandler
- [HttpMethod](./12-constants-httpmethod.md) - Constantes de métodos HTTP
- [HttpStatusCode](./13-constants-httpstatuscode.md) - Constantes de status HTTP

### 5. Tratamento de Erros
- [RouteNotFoundException](./14-errors-routenotfound.md) - Erro de rota não encontrada

### 6. Lifecycle e Fluxo
- [Ciclo de Vida da Requisição](./15-lifecycle-request.md) - Fluxo completo de uma requisição HTTP

---

## Conceitos-Chave

### Filosofia de Design

1. **Zero Dependências Externas** - Usa apenas o módulo nativo `http` do Node.js
2. **ES Modules Puro** - Sem build steps, TypeScript compilado ou bundlers
3. **Immutability** - HandlerContext é `Object.freeze()` para prevenir mutações
4. **Sequential Execution** - Handlers executam em ordem, sem `next()` - cada um chama `finishRequest()`

### Comparação com Frameworks Convencionais

| Característica | Potato Framework | Express/Fastify |
|---------------|------------------|-----------------|
| Dependências | 0 (apenas Node.js) | Dúzias | 
| Build Step | Não | Sim (TypeScript) |
| next() middleware | Não | Sim |
| Middlewares globais | Sim (Resource) | Sim |

---

## Como Esta Documentação Está Organizada

Esta documentação é **técnica e detalhada**, focada em:

1. **Como as coisas funcionam** - Implementação interna
2. **Por que foi feito assim** - Decisões de design
3. **Como usar corretamente** - Padrões e contratos

Para exemplos de uso, consulte a pasta `examples/` ou a README principal.
