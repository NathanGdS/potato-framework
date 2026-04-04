# 0001 — Migrar Exemplos para TypeScript

**Status**: Complete
**Archived**: 2026-04-04
**User Stories**: 2 / 2

---

## Summary

Atualizados os exemplos em `examples/` para usar TypeScript ao invés de JavaScript puro. Os exemplos agora importam o código fonte do `package/src/` diretamente (não mais do `dist/`). Também foi alterado o `moduleResolution` do tsconfig para `Bundler` permitindo importações sem extensão `.js`.

---

## User Stories

| ID | Title | Status |
|----|-------|--------|
| US-1 | Converter exemplo 01-simple-app para TypeScript | ✅ |
| US-2 | Converter exemplo 02-routes-with-resources para TypeScript | ✅ |

---

## Implementation Details

- **01-simple-app**: Convertido de `.mjs` para `.ts`. Arquivos criados: `index.ts`, `routes/index.ts`, `routes/sync-test.routes.ts`, `routes/promise.routes.ts`, `middlewares/logger.middleware.ts`. Atualizado `package.json` para usar `tsx` como runner.
- **02-routes-with-resources**: Convertido de `.mjs` para `.ts`. Arquivos criados: `index.ts`, `exeternal-class.ts`.
- **Configuração**: Alterado `package/tsconfig.json` de `moduleResolution: NodeNext` para `Bundler` para permitir importações sem extensão `.js`.
- **Dependências**: Adicionado `tsx` como devDependency nos exemplos.

---

## Files Changed

| File | Change |
|------|--------|
| `package/tsconfig.json` | Alterado moduleResolution para Bundler |
| `examples/01-simple-app/index.ts` | Novo arquivo (convertido de .mjs) |
| `examples/01-simple-app/routes/index.ts` | Novo arquivo |
| `examples/01-simple-app/routes/sync-test.routes.ts` | Novo arquivo |
| `examples/01-simple-app/routes/promise.routes.ts` | Novo arquivo |
| `examples/01-simple-app/middlewares/logger.middleware.ts` | Novo arquivo |
| `examples/02-routes-with-resources/index.ts` | Novo arquivo |
| `examples/02-routes-with-resources/exeternal-class.ts` | Novo arquivo |
| `examples/package.json` | Adicionado tsx como devDependency |
| `examples/01-simple-app/index.mjs` | Removido |
| `examples/01-simple-app/routes/*.mjs` | Removidos |
| `examples/01-simple-app/middlewares/*.mjs` | Removidos |
| `examples/02-routes-with-resources/*.mjs` | Removidos |
