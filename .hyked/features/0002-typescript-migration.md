# 0002 — TypeScript Migration

**Status**: Complete
**Archived**: 2026-04-04
**User Stories**: 7 / 7

---

## Summary

Refatorar o Potato Framework de JavaScript puro (ES Modules `.mjs`) para TypeScript, com foco em segurança de tipos, geração de declarações `.d.ts` e manutenção/melhoria da cobertura de testes. O build final compila para `dist/` via `tsc`, tornando o pacote distribuível no npm com tipagem completa.

---

## User Stories

| ID | Title | Status |
|----|-------|--------|
| US-1 | Configurar Toolchain TypeScript | ✅ |
| US-2 | Configurar Infraestrutura de Testes para TypeScript | ✅ |
| US-3 | Migrar Constants e Errors para TypeScript | ✅ |
| US-4 | Migrar Utils para TypeScript | ✅ |
| US-5 | Migrar Classes Core para TypeScript | ✅ |
| US-6 | Migrar Testes para TypeScript | ✅ |
| US-7 | Atualizar API Pública e Exemplos | ✅ |

---

## Implementation Details

### US-1: Toolchain TypeScript
- Instalar typescript e @types/node como devDependencies
- Criar tsconfig.json com target ES2022, module NodeNext, strict true
- Adicionar rimraf para script clean
- Atualizar package.json com build e clean scripts
- Criar estrutura src/ espelhando arquivos .mjs

### US-2: Infraestrutura de Testes
- Renomear vitest.config.mjs para vitest.config.ts
- Atualizar include para "**/*.test.ts"
- Configurar coverage para src/**/*.ts com thresholds 85%

### US-3: Constants e Errors
- HttpMethod e HttpStatusCode como const objects com as const
- RouteNotFoundException extends Error com tipagem correta
- Criar src/constants/index.ts e src/errors/index.ts para re-exports

### US-4: Utils
- buildRoutePath.ts com tipo de retorno RegExp explícito
- isPromise.ts como type guard
- get-query-params.ts e get-route-params.ts retornando Record
- logger.ts e colours.ts com tipos
- Criar src/types/index.ts para HandlerContext

### US-5: Classes Core
- Routes.ts com mapa de rotas tipado por HttpMethod
- Resource.ts com fluent DSL tipado (retornando this)
- RequestCycle.ts com HandlerContext tipado
- SweetPotato.ts e SweetPotatoApp.ts com tipos completos

### US-6: Testes
- Todos os arquivos .test.mjs convertidos para .test.ts
- Imports atualizados para caminhos .js (ESM compatibility)
- Teste de integração SweetPotato.test.ts com servidor real

### US-7: API Pública
- src/index.ts exportando SweetPotatoApp, HttpMethod, HttpStatusCode, HandlerContext, RouteHandler
- dist/ gerado com .js e .d.ts
- Exemplos atualizados para importar de '../dist/index.js'

---

## Files Changed

| File | Change |
|------|--------|
| package/tsconfig.json | Novo arquivo |
| package/vitest.config.ts | Renomeado de .mjs |
| package/package.json | Atualizado com build, clean scripts |
| package/src/index.ts | Novo arquivo (API pública) |
| package/src/Routes.ts | Migrado de .mjs |
| package/src/Resource.ts | Migrado de .mjs |
| package/src/RequestCycle.ts | Migrado de .mjs |
| package/src/SweetPotato.ts | Migrado de .mjs |
| package/src/SweetPotatoApp.ts | Migrado de .mjs |
| package/src/types/index.ts | Novo arquivo |
| package/src/constants/HttpMethod.constants.ts | Novo arquivo |
| package/src/constants/HttpStatusCode.constants.ts | Novo arquivo |
| package/src/constants/routes.constants.ts | Migrado de .mjs |
| package/src/constants/index.ts | Novo arquivo |
| package/src/errors/RouteNotFoundException.ts | Migrado de .mjs |
| package/src/errors/index.ts | Novo arquivo |
| package/src/utils/buildRoutePath.ts | Migrado de .mjs |
| package/src/utils/isPromise.ts | Migrado de .mjs |
| package/src/utils/get-query-params.ts | Migrado de .mjs |
| package/src/utils/get-route-params.ts | Migrado de .mjs |
| package/src/utils/logger.ts | Migrado de .mjs |
| package/src/utils/colours.ts | Migrado de .mjs |
| package/tests/Routes.test.ts | Migrado de .test.mjs |
| package/tests/Resource.test.ts | Migrado de .test.mjs |
| package/tests/RequestCycle.test.ts | Migrado de .test.mjs |
| package/tests/SweetPotatoApp.test.ts | Migrado de .test.mjs |
| package/tests/integration/SweetPotato.test.ts | Migrado de .test.mjs |
| package/tests/utils/buildRoutePath.test.ts | Migrado de .test.mjs |
| package/tests/utils/get-query-params.test.ts | Migrado de .test.mjs |
| package/tests/utils/get-route-params.test.ts | Migrado de .test.mjs |
| package/tests/utils/isPromise.test.ts | Migrado de .test.mjs |
| examples/01-simple-app/index.mjs | Atualizado import path |
| examples/02-routes-with-resources/index.mjs | Atualizado import path |
