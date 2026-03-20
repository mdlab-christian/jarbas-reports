# Prompt CC — Geração de PRD Markdown para Etapas OlivIA
> Gerado por JANA em 2026-03-19
> Cole este prompt num novo terminal Claude Code na raiz do projeto beta-mdflow

---

## MISSÃO

Você vai gerar o campo `prd_markdown` para **cada etapa do projeto Reconstrução OlivIA** que ainda está sem PRD (`prd_markdown = NULL`).

São **24 etapas** (E04 a E27), já com `cc_prompt` preenchido mas sem PRD estruturado em markdown.

O PRD de cada etapa deve ser **rico, completo e acionável** — suficiente para um agente executar sem ambiguidade.

---

## FONTES DE CONTEXTO (leia TUDO antes de começar)

### Documentos no Desktop (`~/Desktop/projeto olivia/`)

| Arquivo | Conteúdo |
|---|---|
| `PLANO-MESTRE-OLIVIA-DEFINITIVO.md` | Plano mestre consolidado — SSOT principal |
| `T1-revisao-complemento.md` | Revisão/complemento das decisões de arquitetura |
| `T2-prd-frontend.md` | PRD frontend — UX de cada etapa, componentes, fluxos |
| `T2-prd-frontend-ux-addendum.md` | Addendum UX com detalhes adicionais |
| `T3-prd-backend.md` | PRD backend — tabelas, FKs, migrations, queries |
| `T4-prd-automacoes.md` | PRD automações — n8n workflows, GAS, webhooks |
| `T-GAS-revisao.md` | Revisão completa dos Google Apps Scripts |
| `PROMPT-CC-PLANO-DEFINITIVO.md` | Prompt master que gerou o plano |
| `PARECER-PRONTIDAO.md` | Parecer técnico de prontidão |
| `RELATORIO-ABSORCAO.md` | Relatório de absorção das specs |
| `Specs/` | Pasta com specs individuais por feature |

### Banco Supabase — Dados Reais das Etapas

**Projeto:** Reconstrução OlivIA (`qdivfairxhdihaqqypgb`)

Para buscar as etapas:
```sql
SELECT id, ordem, titulo, descricao, camada, cc_prompt, complexidade, executor
FROM projetos_etapas
WHERE projeto_id = (SELECT id FROM projetos WHERE nome ILIKE '%OlivIA%' LIMIT 1)
  AND status = 'rascunho'
ORDER BY ordem;
```

---

## FORMATO DO PRD MARKDOWN (obrigatório para cada etapa)

Cada `prd_markdown` deve seguir este template exato:

```markdown
# [Título da Etapa]

## Contexto
[O que está acontecendo, por que esta etapa existe, qual problema resolve]

## Objetivo
[O que deve existir/funcionar ao final desta etapa — em 2-3 linhas diretas]

## Pré-requisitos
- [Etapa anterior necessária, ou "Nenhum"]
- [Dado ou configuração necessária]

## Escopo

### Incluído
- [O que esta etapa FAZ]

### Excluído
- [O que esta etapa NÃO faz — evitar ambiguidade]

## Especificação Técnica

### Arquivos a modificar/criar
- `caminho/relativo/ao/arquivo.tsx` — [o que muda]

### Queries Supabase
```sql
-- Query principal desta etapa
SELECT ...
```

### Contratos de API / Webhooks (se aplicável)
```typescript
// Request
interface XxxRequest { ... }

// Response
interface XxxResponse { ... }
```

### Lógica de negócio
[Descrição passo a passo do que o código deve fazer]

## Critério de Aceite
- [ ] [Comportamento verificável 1]
- [ ] [Comportamento verificável 2]
- [ ] [Teste/validação específica]

## Não fazer
- ❌ [O que absolutamente não deve acontecer nesta etapa]
- ❌ [Edge case a evitar]

## Dependências do banco
[Tabelas relevantes com campos-chave para esta etapa]
```

---

## INSTRUÇÕES DE EXECUÇÃO

### Passo 1 — Ler os documentos
Leia sequencialmente (em ordem de prioridade):
1. `~/Desktop/projeto olivia/PLANO-MESTRE-OLIVIA-DEFINITIVO.md` — completo
2. `~/Desktop/projeto olivia/T2-prd-frontend.md` — seção de cada etapa
3. `~/Desktop/projeto olivia/T3-prd-backend.md` — seção de cada etapa
4. `~/Desktop/projeto olivia/T4-prd-automacoes.md` — seção de cada etapa
5. `~/Desktop/projeto olivia/T-GAS-revisao.md` — para E04, E05, E13, E14
6. `~/Desktop/projeto olivia/T1-revisao-complemento.md` — decisões de arquitetura

### Passo 2 — Buscar etapas no banco
Execute a query acima para obter todas as 24 etapas (E04-E27) com seus `cc_prompt` e metadados.

### Passo 3 — Para CADA etapa (E04 a E27):
1. Identifique qual documento tem o conteúdo mais detalhado para essa etapa (cruzar `camada` + `titulo`)
2. Cruze o `cc_prompt` existente com os documentos
3. Gere o `prd_markdown` completo no formato acima
4. Execute o UPDATE no banco:

```sql
UPDATE projetos_etapas
SET prd_markdown = '[PRD GERADO]'
WHERE id = '[UUID DA ETAPA]';
```

### Passo 4 — Validar ao final
```sql
SELECT ordem, titulo, 
  CASE WHEN prd_markdown IS NOT NULL THEN 'OK' ELSE 'FALTANDO' END as prd_status
FROM projetos_etapas
WHERE projeto_id = (SELECT id FROM projetos WHERE nome ILIKE '%OlivIA%' LIMIT 1)
  AND status = 'rascunho'
ORDER BY ordem;
```

Resultado esperado: **24 etapas com prd_status = OK**.

---

## DIRETRIZES DE QUALIDADE

### O PRD deve ser...
- **Específico:** nomes de arquivos reais, queries SQL com campos reais, não genérico
- **Cruzado:** se T2 diz que o Step 1 tem um SearchBox e T3 diz que a query usa `olivia_modelos_peticao`, o PRD deve unir os dois
- **Acionável:** um agente que leu só o PRD consegue executar sem perguntas adicionais
- **Honesto sobre dependências:** se E12 depende de E10, dizer explicitamente

### Regras de cruzamento por camada
| Camada | Documentos principais |
|---|---|
| `investigacao` | PLANO-MESTRE, T1-revisao |
| `frontend` | T2-prd-frontend, T2-addendum, PLANO-MESTRE |
| `backend` | T3-prd-backend, PLANO-MESTRE |
| `automacao` | T4-prd-automacoes, T-GAS-revisao |

### Sobre o GAS (Google Apps Script)
- `T-GAS-revisao.md` tem análise detalhada do GAS Smart Blocks v4.0 (962 linhas)
- E05 (fix fetch) e E13-E14 (Smart Blocks wizard) dependem fortemente desta revisão
- Usar os detalhes de função e contrato do T-GAS para enriquecer esses PRDs

### Sobre o campo `cc_prompt` existente
- Ele é a **base**, mas não é o PRD final
- O PRD deve ser mais completo: adicionar contexto de negócio, especificação técnica detalhada, critérios de aceite verificáveis, e o formato estruturado acima
- Não copiar o `cc_prompt` como está — expandir e estruturar

---

## CREDENCIAIS NECESSÁRIAS

```bash
# .env do projeto
source ~/beta-mdflow/.env
# ou
source ~/jarbas/.env

# Supabase project
SUPABASE_PROJECT_ID=qdivfairxhdihaqqypgb
```

Para executar queries direto via MCP Supabase ou curl:
```bash
curl -X POST "https://api.supabase.com/v1/projects/qdivfairxhdihaqqypgb/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "SEU SQL AQUI"}'
```

---

## OUTPUT ESPERADO

Ao final, um relatório resumido:
```
✅ E04 — CC Geração Índice Detalhado SPEC — PRD gerado (847 chars)
✅ E05 — Fix fetch() n8n — PRD gerado (1.203 chars)
...
✅ E27 — Reimport texto_integral — PRD gerado (634 chars)

Total: 24/24 etapas com prd_markdown preenchido
```

---

*Gerado por JANA 🦊 em 2026-03-19 — Projeto Reconstrução OlivIA*
