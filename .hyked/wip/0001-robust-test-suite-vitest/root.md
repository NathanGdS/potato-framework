# 0001 — Robust Test Suite with Vitest

## Description
Adicionar uma suíte de testes robusta ao Potato Framework usando Vitest como test runner.
O objetivo é garantir ≥85% de cobertura real, com testes que validam comportamento observável
(não mocks de si mesmos), seguindo o padrão AAA (Arrange / Act / Assert).

## Tech Context
- Framework: Node.js 18.12.0+, ES Modules puro (`.mjs`)
- Test runner: Vitest (suporte nativo a ESM sem transpilação)
- Coverage: @vitest/coverage-v8, threshold ≥85% em branches, lines, functions e statements
- Sem TypeScript, sem bundler — os testes devem ser `.test.mjs` também
- Arquitetura testável: utils são funções puras; Routes/RequestCycle são classes com estado interno privado (#); integração via HTTP real com `node:http` + `fetch`

### Padrões obrigatórios
- Todo teste segue AAA: bloco Arrange (setup), bloco Act (execução), bloco Assert (verificações)
- Testes de integração sobem o servidor em porta aleatória (port 0) e usam `fetch` real
- Nenhum teste mocka comportamento interno para passar — apenas stubs de efeitos colaterais (logger, stdio)

## Out of Scope
- Testes de SweetPotatoApp (singleton wrapper) — cobertura indireta via integração é suficiente
- Testes de `colours.mjs` e `logger.mjs` — são utilitários de output, não lógica de negócio
- E2E com browser ou supertest — integração com `fetch` nativo é suficiente
