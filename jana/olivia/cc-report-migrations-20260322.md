# OlivIA Migrations P0 Report
**Data:** 2026-03-22 | **Executor:** JANA (MacBook Air M4) | **Banco:** qdivfairxhdihaqqypgb

---

### T1 — Migration olivia_relatorios (url_docx / url_pdf)
**Status:** CONCLUIDA

Colunas `url_docx TEXT` e `url_pdf TEXT` adicionadas via migration `add_olivia_relatorios_url_columns`.
Verificado: ambas colunas presentes no schema.

### T2 — RLS olivia_modelo_juris
**Status:** JA EXISTENTE (nenhuma acao necessaria)

- `rowsecurity = true` (RLS habilitado)
- Policy `org_access` para ALL commands: `organizacao_id = get_org_id()` ja existente

### T3 — Fix qualidade_ia
**Status:** JA CORRETO (nenhuma acao necessaria)

- Nenhum registro com `qualidade_ia = 'pensamento_estendido'` encontrado
- CHECK constraint `chk_olivia_historico_qualidade_ia` ja permite apenas `padrao` e `avancado`
- Zero rows para corrigir

### T4 — Popular .env da OlivIA
**Status:** NAO APLICAVEL NESTA MAQUINA

- O usuario `olivia` NAO existe nesta maquina (JANA MacBook Air M4)
- O servidor OlivIA roda no JARBAS (Mac Mini M4)
- **Acao requerida:** Executar no JARBAS:
  ```bash
  grep "^ANTHROPIC_API_KEY=\|^SUPABASE_URL=\|^SUPABASE_KEY=" ~/jarbas/.env > /Users/olivia/.env
  chown olivia:staff /Users/olivia/.env
  ```

### T5 — Limpar skills orfas
**Status:** JA LIMPO (nenhuma acao necessaria)

- `olivia-busca-juris.mjs` — ATIVA, referenciada em server.mjs (step 2 do pipeline)
- `olivia-gdoc-importer.mjs` — arquivo NAO existe (ja removido)
- `olivia-formata-peticao.mjs` — arquivo NAO existe (ja removido)
- `docx-generator.mjs` — arquivo NAO existe (ja removido)

---

### Resumo

| Tarefa | Resultado |
|---|---|
| T1 Migration url_docx/url_pdf | APLICADA |
| T2 RLS olivia_modelo_juris | Ja existente |
| T3 qualidade_ia fix | Ja correto |
| T4 .env OlivIA | Requer JARBAS |
| T5 Skills orfas | Ja limpo |

### Como testar
1. `SELECT column_name FROM information_schema.columns WHERE table_name='olivia_relatorios' AND column_name IN ('url_docx','url_pdf');` — deve retornar 2 rows
2. Verificar que OlivIA gera relatorios com url_docx/url_pdf preenchidos apos proximo uso

### Atencao
- T4 deve ser executado manualmente no JARBAS (Mac Mini M4) onde o usuario `olivia` existe
