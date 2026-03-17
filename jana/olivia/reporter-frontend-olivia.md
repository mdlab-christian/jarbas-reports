# Reporter: OlivIA — Frontend Completo (Todos os Módulos)
> **Gerado por:** JANA 🦊 | **Data:** 2026-03-17 | **Grupo:** [JN] /olivia - Frontend (-5043204176)
> **Compilado de:** grupos Olivia (-5219977942), c2b-frontend-express (-5254967011), c3-Olivia (-5291452663), [Jana] /olivia-Backend (-5134800985), [Jana] /olivia-Frontend (-5170047431)

---

## 1. Contexto Geral

A OlivIA é o módulo de geração de petições jurídicas do MdFlow. Trata-se do sistema mais complexo do produto, reunindo 4 modos de geração diferentes, análise de provas com IA, chat, fila de processamento e o VibeLaw Studio.

O desenvolvimento passou por **várias ondas de refatoração profunda** entre 11/03/2026 e 17/03/2026:

1. **Reimport de dados** (11/03) — banco zerado e reimportado do DB antigo + Google Drive
2. **Lapidação completa + E2E** (12/03) — todos os 4 modos testados, bugs críticos corrigidos
3. **Deep review técnico** (13/03) — 5 blockers P0 identificados + PRD master
4. **C0 Hotfixes + C3 Deep Review** (14/03) — 22 bugs corrigidos, análise de processo/decisão corrigida end-to-end
5. **C2b Frontend Express + C3 Review** (15/03) — review OlivIA frontend completo
6. **Backend reimport completo + OLIVIA-ANALISE V4** (16-17/03) — banco reimportado novamente, estrutura Drive criada, RAG indexado, V4 planejado

---

## 2. Workflows N8N Envolvidos

### 2.1 Ativos e Funcionais

| ID | Nome | Path | Função |
|----|------|------|--------|
| `5H7icedAtJIia23i` | N8N-DIST-GERAR-PETICAO | `mdflow/olivia/gerar-doc` | Geração assíncrona principal (Express + fallback Agente) |
| `efUURhKmLOvKBxWp` | N8N-OLIVIA-GERAR-MANUAL | `olivia/gerar-manual` | Smart Blocks — busca blocos + juris, retorna texto_gerado |
| `AvmF07YPjxXvM2H0` | WH-OLIVIA-TRIAGEM-QUESTIONS | `mdflow/olivia/triagem-get-questions` | Gera perguntas de triagem contextuais via IA |
| `DnecdvxoRKyMjZMD` | N8N-OLIVIA-VIBELAW-CHAT | `olivia/vibelaw-chat` | VibeLaw: chat + SSE streaming |
| `Akg1AxMpZayDdnk2` | N8N-OLIVIA-VIBELAW-APPLY-PATCH | `olivia/vibelaw-apply-patch` | VibeLaw: aplica edições no documento |
| `gMFefLfXZbf-MWhwiZF5B` / `lwYPIoWAuw0l7SmS` | N8N-OLIVIA-ANALISE-V2 | `olivia/analise-decisao` | Análise de decisões judiciais (V2) |
| `8ntAvTGMhCfrlfRt` | OLIVIA-ANALISE-V3 (atual prod) | `olivia/analise-provas` | Análise de provas — **V3 ativo, planejando V4** |
| `dGw50wQ4xjdsjR3n` | N8N-OLIVIA-PETICAO-V3 | `mdflow/olivia/gerar-doc` | V3 ativo — usa Google Drive para salvar docs |
| `E33erdoQcTEDUAaf` | Olivia-analise-v3 (N8N) | `olivia/analise-provas` | Workflow criado em Fase 3 do rebuild |
| `DjZoLN5KLpWOyCOr` | [OlivIA] Analise de IA | `olivia/analise-processo` | Análise de processo completo |
| `lXxs3xXg0UAtbcOu6v1h3` | SW-GERAR (sub-workflow) | — | Sub-workflow de geração |
| `bwZm-wraTuSMt_W39Cgye` | SW-REDATOR (sub-workflow) | — | Sub-workflow de redação |
| `cOw2eBb-hbTrTtQGA6WK6` | SW-REVISOR (sub-workflow) | — | Sub-workflow de revisão |
| `2W3ge7XWZp1HKwGK` | OlivIA (Chat) | `olivia/chat` | Chat conversacional com a OlivIA |

### 2.2 Arquivados / Referência

| ID | Nome | Status | Notas |
|----|------|--------|-------|
| `TupOpRfZXkTHzzEuBOk7f` | OLIVIA-ANALISE-V1 | 🗄️ Arquivado | Tinha Vision, Mistral OCR, Opus — referência de qualidade |
| `9nTgWoQiU4FUIxQm` | N8N-OLIVIA-PETICAO-V3 | Legado | Versão anterior do V3 |

### 2.3 Workflows de Modelos (Relacionados)

| ID | Nome | Path | Função |
|----|------|------|--------|
| `17ZMrc` | N8N-MODELOS-PLACEHOLDERS | `mdflow/modelos/placeholders` | Extrai placeholders de modelos |
| `AS6LJMDkJyZB6yos7pSak` | N8N-MODELOS-RAG | `mdflow/modelos/rag-sync` | Sync RAG dos modelos |
| `5lleBpPy` | N8N-MODELOS-FLOW-VALIDATE | `mdflow/modelos/validate-flow` | Valida flow de modelos |
| `8psGC0Mj` | N8N-MODELOS-SCRAPING-TEST | `mdflow/modelos/test-scraping` | Testa scraping de modelos |

---

## 3. Arquitetura e Lógica Implementada

### 3.1 Estrutura de Arquivos Frontend

```
src/pages/olivia/
├── index.tsx                          — Layout principal com tabs
├── constants.ts                       — Constantes do módulo
├── types.ts                           — Types TypeScript
├── components/
│   ├── gerador/                       — Wizard gerador de petições
│   │   ├── OliviaGeradorIA.tsx        — Modo Express (IA Assistida)
│   │   ├── OliviaGeradorManual.tsx    — Modo Smart Blocks
│   │   ├── OliviaGeradorJarbas.tsx    — Modo Agente (JARBAS)
│   │   ├── steps/
│   │   │   ├── StepIdentificacao.tsx  — Step 1: processo + tipo + modelo
│   │   │   ├── StepTriagem.tsx        — Step 2: perguntas de triagem
│   │   │   ├── StepEstrutura.tsx      — Step 3: outline/estrutura
│   │   │   ├── StepConclusao.tsx      — Step 4: geração + revisão
│   │   │   └── StepRevisao.tsx        — Step 5: revisão final
│   │   └── manual/
│   │       ├── ManualStep2Conteudo.tsx — Smart Blocks: seleção de blocos
│   │       └── ManualStep4Conclusao.tsx — Smart Blocks: geração
│   ├── fila/
│   │   └── OliviaFilaDetalheSheet.tsx — Fila de processamento (sheet lateral)
│   ├── analise/
│   │   ├── OliviaAnaliseDecisao.tsx   — Análise de decisões
│   │   └── OliviaAnaliseProcesso.tsx  — Análise de processos
│   ├── chat/
│   │   └── ChatSidebar.tsx, ChatTimeline.tsx — Chat com OlivIA
│   └── vibelaw/
│       └── OliviaVibelawStudio.tsx    — VibeLaw Studio (split view)
├── hooks/
│   ├── useGerarPeticao.ts             — Hook de geração (todos os modos)
│   ├── useOliviaJarbas.ts             — Hook modo agente
│   ├── useWizardTabs.ts               — Controle do wizard
│   ├── useVibeLaw.ts                  — Hook VibeLaw
│   └── useVibeLawSSE.ts              — SSE streaming para VibeLaw
src/pages/olivia-v2/                   — Versão legada (7 arquivos, não usar)
```

### 3.2 Os 4 Modos de Geração

#### Modo Smart Blocks (MANUAL)
- Frontend: `OliviaGeradorManual.tsx` + `ManualStep2Conteudo.tsx` + `ManualStep4Conclusao.tsx`
- Webhook: `POST /webhook/olivia/gerar-manual` (N8N `efUURhKmLOvKBxWp`)
- Fluxo: seleção de blocos → concatena conteúdo + juris → webhook N8N → retorna texto_gerado
- **Comportamento real do webhook:** cria `olivia_historico` PENDENTE, retorna 202 `{historico_id, blocos_selecionados:[]}` (sem success field)
- **Bug N8N conhecido:** `blocos_selecionados:[]` → workflow fica PENDENTE forever
- **Fix frontend (BUG-M2):** se receber `historico_id` no top-level, faz UPDATE do registro existente para SUCESSO com texto fallback

#### Modo Express / IA Assistida
- Frontend: `OliviaGeradorIA.tsx`
- Webhook triagem: `POST /webhook/mdflow/olivia/triagem-get-questions` (N8N `AvmF07YPjxXvM2H0`)
- Webhook geração: `POST /webhook/mdflow/olivia/gerar-doc` (N8N `dGw50wQ4xjdsjR3n` ou `5H7icedAtJIia23i`)
- Fluxo: 5 steps → triagem com perguntas IA → gerar doc assíncrono → poll a cada 3s
- JARBAS também processa Express quando online (modo=IA_ASSISTIDA + motor=jarbas)

#### Modo Agente (JARBAS)
- Frontend: `OliviaGeradorJarbas.tsx`
- Endpoint: `POST https://jarbas.jarbas-mdlab.com/olivia/gerar-modo-jarbas` (JARBAS direto)
- Fluxo: skill `skill_olivia_gerar_peticao.mjs` → RAG + sistema prompt jurídico → Google Doc
- Poll: `useOliviaJarbas.ts` polling `jarbas_tarefas` a cada 3s
- Schedule backup: 6h/13h/19h via cron. Fallback N8N quando offline.
- **Mais confiável:** 43/43 SUCESSO, texto_gerado NOT NULL

#### Modo VibeLaw
- Frontend: `OliviaVibelawStudio.tsx` (split view 38/62)
- SSE: `useVibeLawSSE.ts` com `Accept: text/event-stream` — token streaming
- Webhook chat: `POST /webhook/olivia/vibelaw-chat` (N8N `DnecdvxoRKyMjZMD`)
- Webhook apply: `POST /webhook/olivia/vibelaw-apply-patch` (N8N `Akg1AxMpZayDdnk2`)
- Threads: `olivia_threads` (tipo=VIBELAW) + mensagens em `olivia_messages`
- Não usa `olivia_historico`

### 3.3 Módulo Análise

#### Análise de Decisões
- Frontend: `OliviaAnaliseDecisao.tsx`
- Handler: `start.mjs` → cria `olivia_analises (PROCESSANDO)` → retorna `analise_id` → enfileira skill
- Skill: `skill_olivia_analise.mjs` (DECISAO)
- Poll: Supabase Realtime em `olivia_analises`
- Timeouts: 180s (SPEC 15.4)

#### Análise de Provas (Express Step 0)
- Workflow atual: OLIVIA-ANALISE-V3 (`8ntAvTGMhCfrlfRt`)
- **Status V3:** funcional mas degradado vs V1 (perdeu Vision, Mistral OCR, Opus, dados de restrição)
- **V4 planejado:** Vision paralelo, Mistral OCR fallback, Opus, threshold adaptativo, relatorio_equipe

#### Análise de Processo
- Frontend: `OliviaAnaliseProcesso.tsx`
- Handler: `start.mjs` → `olivia_analise_processo`
- Skill: `skill_olivia_analise.mjs` (PROCESSO)

### 3.4 Integração JARBAS Direto (sem N8N)

Os seguintes endpoints são chamados diretamente ao JARBAS (Cloudflare Tunnel):
- `POST /olivia/triagem-questions` — perguntas de triagem
- `POST /olivia/vibelaw-gerar-inicial` — geração inicial VibeLaw
- `POST /olivia/vibelaw-create-doc` — cria documento VibeLaw
- `POST /olivia/upload-documento` — upload de provas
- `POST /olivia/documentos-processo` — lista documentos do processo

---

## 4. Arquivos Criados/Modificados (caminhos completos)

### 4.1 Frontend — `~/beta-mdflow/`

| Arquivo | Operação | Commit | Descrição |
|---------|----------|--------|-----------|
| `src/pages/olivia/components/gerador/manual/ManualStep4Conclusao.tsx` | MOD | `4833e6d` | BUG-M1+M2: modelo_grupo_id + UPDATE ao invés de INSERT |
| `src/pages/olivia/hooks/useWizardTabs.ts` | MOD | `555eac5` | Auto-resolve versao_id is_current + canAdvance step 0 fix |
| `src/pages/olivia/components/gerador/steps/StepConclusao.tsx` | MOD | `a10cd6c` | DEV guard console.error |
| `src/pages/olivia/components/gerador/steps/StepIdentificacao.tsx` | MOD | `a10cd6c` | 2x DEV guard |
| `src/pages/olivia/components/gerador/manual/ManualStep2Conteudo.tsx` | MOD | `a10cd6c` | 4x DEV guard |
| `src/pages/olivia/components/vibelaw/OliviaVibelawStudio.tsx` | MOD | `a5aaa7d` | DS tokens + ScoreBadge colors |
| `src/pages/olivia/components/gerador/steps/StepTriagem.tsx` | MOD | `a5aaa7d` | 6 hardcodes → DS tokens, `min-h-[400px]` |
| `src/pages/olivia/hooks/useOliviaJarbas.ts` | MOD | `2f03034` | fetchProcessoInsight deps + handleBack erro + RLS org_id + progInterval cleanup |
| `src/pages/olivia/components/gerador/OliviaGeradorJarbas.tsx` | MOD | `2f03034` | race condition double-click |
| `src/pages/olivia/components/analise/OliviaAnaliseDecisao.tsx` | MOD | `2f03034` | timeout 180s, update olivia_analises correto |
| `src/pages/olivia/components/analise/OliviaAnaliseProcesso.tsx` | MOD | `2f03034` | timeout 180s |
| `src/pages/olivia/components/chat/ChatSidebar.tsx` | MOD | `e333c83` | null guard em updated_at |
| `src/pages/olivia/components/chat/ChatTimeline.tsx` | MOD | `e333c83` | ReactMarkdown + remarkGfm |
| `src/index.css` | MOD | — | background CSS fix: `30 12% 6%` |
| `src/lib/jarbas-url.ts` | MOD | — | JARBAS_BASE_URL = `https://jarbas.jarbas-mdlab.com` |

### 4.2 JARBAS — `~/jarbas/`

| Arquivo | Operação | Commit | Descrição |
|---------|----------|--------|-----------|
| `src/start.mjs` | MOD | `702235d` | Handlers `/olivia/analise-processo` + `/olivia/analise-decisao` |
| `src/webhook-main.mjs` | MOD | `702235d` | Handlers dedicados análise |
| `src/skills/skill_olivia_analise.mjs` | CRIADO | `702235d` | Nova skill: análise PROCESSO + DECISAO com Claude Sonnet |
| `src/skills/skill_olivia_gerar_triagem.mjs` | MOD | `2600bf6` | Fix linha 57: `.from('olivia_modelos')` → `.from('olivia_modelos_peticao')` |
| `src/skills/skill_olivia_vibelaw_criar_doc.mjs` | CONFIRMADO | — | Já existia, operacional |
| `src/skills/skill_olivia_revisor.mjs` | CRIADO | `6978807` | Revisor de petições |
| `src/skills/skill_olivia_eproc_protocolar.mjs` | EXISTENTE | — | TJRS + TJSC, Playwright |
| `templates/peticao-abnt.docx` | CRIADO | — | Template DOCX ABNT base |
| `memory/playbook_juridico.md` | EXISTENTE | — | Playbook jurídico para análise |

### 4.3 Scripts de Importação — `~/beta-mdflow/scripts/`

| Arquivo | Criado em | Função |
|---------|-----------|--------|
| `olivia_01_assuntos.mjs` | 11/03 | Importa 480 assuntos |
| `olivia_02_juris.mjs` | 11/03 | Importa 1353 jurisprudências |
| `olivia_03_blocos.mjs` | 11/03 | Importa 1244 blocos de texto |
| `olivia_04_modelos.mjs` | 11/03 | Importa 329 modelos de petição |
| `olivia_05_grupos.mjs` | 16/03 | Cria 177 grupos (novo — JANA) |
| `fix_grupos_orfaos.mjs` | 16/03 | Corrige 27 grupos órfãos |
| `olivia_06_drive.mjs` | 16/03 | Cria estrutura Google Drive |
| `olivia_12b_docx_content.mjs` | 16/03 | Extrai conteúdo DOCX via mammoth |
| `olivia_15_rag_force.mjs` | 16/03 | Indexa RAG para modelos grandes (>20k chars) |
| `reports/drive-config.json` | 16/03 | IDs das pastas Drive salvas |

### 4.4 Missão OlivIA — `~/jarbas/missoes/olivia-lancamento-1403/`

| Arquivo | Descrição |
|---------|-----------|
| `SPEC.md` | SPEC master (3411 linhas, 121KB, 29 seções) — **APROVADO por Christian** |
| `STATUS.md` | Status de execução por conversa (C0–C5) |
| `cc-review-plan.md` | 82 tópicos de review para Claude Code |

---

## 5. Estado Atual

### 5.1 O que está Funcional ✅

| Componente | Status | Evidência |
|-----------|--------|-----------|
| Smart Blocks | ✅ Funciona (com fix BUG-M2) | 12 SUCESSO no banco |
| Express / IA Assistida | ✅ Funciona | 5 SUCESSO no banco |
| Modo Agente (JARBAS) | ✅ Perfeito | 43/43 SUCESSO |
| VibeLaw Chat (SSE) | ✅ Funciona | Threads criadas, streaming ativo |
| VibeLaw Apply Patch | ✅ Funciona | Workflow ativo |
| Triagem get-questions | ✅ Funciona | Perguntas contextuais geradas |
| Análise de Decisões | ✅ Funciona (pós C3) | Smoke test: analise_id retornado |
| Análise de Processo | ✅ Funciona (pós C3) | Handlers corrigidos |
| Análise de Provas (V3) | ✅ Funciona (degradada) | Workflow ativo mas sem Vision/Opus |
| Chat OlivIA | ✅ Funciona | Workflow `2W3ge7XWZp1HKwGK` ativo |
| Fila de Processamento | ✅ Funciona | OliviaFilaDetalheSheet normalizado |
| Banco reimportado | ✅ 100% | 10 tipos, 1353 juris, 1244 blocos, 329 modelos, 177 grupos |
| RAG indexado | ✅ 100% | 2903 docs indexados |
| Drive estrutura criada | ✅ 100% | Pastas criadas com IDs no banco |
| Drive IDs no banco | ✅ 100% | 10 tipos + 480 assuntos com drive_folder_id |
| Conteúdo modelos | ✅ 329/329 | Via Google Docs + DOCX mammoth |

### 5.2 Pendente / Em Desenvolvimento ⏳

| Item | Prioridade | Contexto |
|------|-----------|---------|
| OLIVIA-ANALISE-V4 | **P0** | Plano publicado, aguardando aprovação do Christian |
| Sprint 1 V4: Vision + Mistral + Opus + restrições + threshold | P0 | Sprint 1 ordem: HTTP Request → restrições → Opus → PDF→Vision → triple fallback → Express → threshold |
| Sprint 2 V4: classificação de doc, RAG on-demand, frontend Express | P1 | Após Sprint 1 |
| Frontend Express — integração V4 | P1 | relatorio_equipe + peticao_base na Etapa 2 |
| VibeLaw quality UI (review de qualidade) | P1 | Task 5.2 do rebuild |
| Smart Blocks Edge Function deploy | P2 | Task 5.5 do rebuild |
| OliviaVibelawStudio.tsx refatoração | P2 | 814 linhas → sub-componentes |
| OliviaGeradorJarbas.tsx refatoração | P2 | 551 linhas → sub-componentes |
| consolidar useOliviaRateLimit() | P2 | hook duplicado |
| ModalHistoricoAnalises wiring StepIdentificacao | P2 | UX melhoria |
| Fallback N8N para analise-processo + analise-decisao | P1 | Quando JARBAS offline |
| E2E final: 20 petições, score ≥ 8, DOCX válidos | P1 | Fase 11 do lapidação final |
| C5: tag v2.0.0-olivia | P1 | Após E2E aprovado |

### 5.3 Bugs Conhecidos / Regressões 🐛

| Bug | Severidade | Status | Workaround |
|-----|-----------|--------|-----------|
| N8N gerar-manual: `blocos_selecionados:[]` → workflow PENDENTE forever | P1 | **Aberto** | BUG-M2 faz UPDATE com texto fallback |
| OLIVIA-ANALISE-V3: PDFs escaneados sem Vision = análise vazia silenciosa | P0 | **Aberto** | Será corrigido no V4 |
| OLIVIA-ANALISE-V3: dados de restrição não injetados no prompt | P0 | **Aberto** | V4 corrige |
| OLIVIA-ANALISE-V3: usa Sonnet em vez de Opus (qualidade) | P0 | **Aberto** | V4 volta para Opus |
| OLIVIA-ANALISE-V3: tokens/custo sempre 0 | P2 | **Aberto** | V4 corrige |
| Express: 10 ERROs históricos por timeout N8N | P1 | Infra (não código) | — |
| Express: 1 SUCESSO com texto_null (motor=n8n) | P2 | Histórico | editor mostra vazio, não crasha |

---

## 6. Decisões Arquiteturais

| Dec | Decisão | Motivo |
|-----|---------|--------|
| D1 | Smart Blocks: Frontend + Supabase + Edge Function → Apps Script → Google Doc (zero N8N/JARBAS) | Baixa latência, sem dependência de infra externa |
| D2 | Express: Frontend + N8N (ANALISE + GERADOR) → Google Doc | Simplicidade de orquestração |
| D3 | Modo Agente: Frontend + JARBAS (olivia-juridico + RAG) → DOCX + PDF + HTML | JARBAS tem acesso total a skills jurídicas |
| D4 | VibeLaw: Frontend + JARBAS + Generative UI + SSE → DOCX + PDF + HTML | Streaming nativo, experiência typewriter |
| D5 | Thread VibeLaw por PROCESSO (não por sessão) | Contexto jurídico preservado entre sessões |
| D6 | Apply patch = regenerar completo (não diff patch) | Evita corrupção de documentos |
| D7 | olivia_historico.meta para resumo + olivia_historico.peticao_html sob demanda | Sem nova tabela, armazenamento eficiente |
| D8 | RLS jarbas_tarefas: policy authenticated com org_id check | Segurança multi-tenant |
| D9 | olivia_modelos_grupo.active_version_id → resolve versão automaticamente no N8N | Sem precisar passar versao_id explicitamente |
| D10 | Análise de Provas V4: Sonnet Vision (paralelo, por página) → Opus (análise final) | Melhor qualidade, sem perda de contexto vs Gemini→Claude |
| D11 | V4: threshold triagem = confiança 0.5-0.7 → proposta (não pergunta) | Reduz fricção desnecessária para advogado |
| D12 | V4: playbook scope = "prova" não "analise" | Mais específico para o contexto de provas |
| D13 | V4: resultados por documento imediatamente no banco | Não acumular em memória, resiliente a falhas |
| D14 | V4: deduplicação por MD5 | Evita reprocessar mesmo arquivo |
| D15 | UUIDs preservados do banco antigo na reimportação | Compatibilidade total com frontend existente |
| D16 | RAG: 3 modelos grandes (>20k chars) indexados via script direto (olivia_15_rag_force.mjs) | Workflow N8N falha com conteúdo grande |

---

## 7. Integrações com Outros Sistemas

### 7.1 Supabase (`qdivfairxhdihaqqypgb`)

**Tabelas principais:**
- `olivia_historico` — registro de petições geradas (status, motor, texto_gerado)
- `olivia_modelos_grupo` (177 grupos) → `olivia_modelos_peticao` (329 modelos)
- `olivia_blocos_texto` (1244 blocos) — conteúdo para Smart Blocks
- `olivia_jurisprudencias` (1353) + `olivia_jurisprudencias_assunto` (480)
- `olivia_analises` — análises de processo/decisão/provas
- `olivia_threads` + `olivia_messages` — threads VibeLaw
- `olivia_tipos_peticao` (10 tipos) — tipos de petição
- `jarbas_tarefas` — fila de tarefas para o JARBAS (constraint `tipo_check` com lista explícita)

**RPCs relevantes:**
- `fn_processos_busca(numero_cnj, cliente, empresa)` — busca de processos
- `fn_olivia_get_triagem` — retorna modelo completo com placeholders
- `rpc_disparar_auditoria` — dispara auditoria (módulo auditorias)

### 7.2 Google Drive (Apps Script)
- **Apps Script ID:** `1korRdpdAn2y7kr-RRZQyPEoJ0XroqM__xhzSnkqWEpv38f6vBaiK_5HI`
- **Pasta raiz:** `OlivIA/` → ID `1-1nF0ml2Fb3rr713JbZpG4nNaQAxFzrK`
- **Subpasta org:** `MP Advocacia/` → `1hcncTkVY3PopO0wlkX1DWbZsW9GTu1tj`
- Estrutura: `Processos/`, `Modelos/` (10 subpastas), `Blocos de Texto/`, `Jurisprudências/` (45 subpastas)
- Drive IDs salvos nas tabelas: `olivia_tipos_peticao.drive_folder_id`, `olivia_jurisprudencias_assunto.drive_folder_id`

### 7.3 JARBAS (Mac Mini M4 — Cloudflare Tunnel)
- **URL:** `https://jarbas.jarbas-mdlab.com` (configurado em `src/lib/jarbas-url.ts`)
- **Porta local:** 3012 (`start.mjs` — servidor ativo)
- **Detecta online via:** HTTP `/health` (analise-utils.ts) + Supabase `jarbas_instances` (useOliviaJarbas)
- **Status UPPERCASE:** `PROCESSANDO`, `CONCLUIDA`, `ERRO` (importante para frontend)

### 7.4 N8N (Railway)
- **URL:** `https://primary-production-e209.up.railway.app`
- **Auth webhook:** header `mdflow: MdL1501@`
- **Org Midas:** `55a0c7ba-1a23-4ae1-b69b-a13811324735`

### 7.5 RAG (ChromaDB via N8N)
- **2903 documentos indexados** (100% dos modelos)
- 3 modelos grandes indexados via `olivia_15_rag_force.mjs` (bypass do N8N)
- Workflow sync: `AS6LJMDkJyZB6yos7pSak` (N8N-MODELOS-RAG)

### 7.6 Conta de Testes E2E
- **Email:** `mdlab.equipe@gmail.com` | **Senha:** `MdL1501@`
- Perfil: admin, acesso total
- **Regra:** NUNCA usar conta pessoal do Christian para testes automatizados

---

## 8. Pontos de Atenção / Riscos / Débitos Técnicos

### 8.1 Riscos P0

| Risco | Impacto | Status |
|-------|---------|--------|
| OLIVIA-ANALISE-V3 não processa PDFs escaneados | Análise vazia silenciosa para a maioria dos documentos jurídicos (são scans) | 🔴 Aberto — V4 resolve |
| V3 sem Opus = qualidade inferior | Análises aprovadas com score baixo sem o advogado saber | 🔴 Aberto — V4 resolve |
| gerar-manual bug N8N `blocos_selecionados:[]` | Smart Blocks depende de fallback no frontend — workaround frágil | 🟡 Mitigado mas não corrigido |

### 8.2 Débitos Técnicos

| Débito | Severidade | Arquivo |
|--------|-----------|---------|
| OliviaVibelawStudio.tsx — 814 linhas | P2 | `src/pages/olivia/components/vibelaw/` |
| OliviaGeradorJarbas.tsx — 551 linhas | P2 | `src/pages/olivia/components/gerador/` |
| OliviaAnaliseDecisao.tsx — 506 linhas (extrair HistoricoAnalises) | P2 | `src/pages/olivia/components/analise/` |
| useOliviaRateLimit() duplicado | P2 | hooks/ |
| `olivia-v2/` pasta legada — 7 arquivos não usados | P3 | `src/pages/olivia-v2/` |
| jarbas_tarefas.tipo_check — constraint explícita exige migration para cada novo tipo | P1 | Supabase |

### 8.3 Dependências Externas Críticas

| Dependência | Risco | Mitigação |
|-------------|-------|-----------|
| Cloudflare Tunnel (`jarbas.jarbas-mdlab.com`) | Se cair, Modo Agente + VibeLaw param | Fallback N8N para Express |
| Google Drive (Apps Script) | Se revogar acesso, Smart Blocks perde docs | Storage Supabase (planejado C2) |
| Railway N8N | Se cair, Express + triagem param | JARBAS como fallback |
| JARBAS Mac Mini | Se desligar, Modo Agente indisponível | Express como fallback |

### 8.4 Migrações Pendentes

- **Migrar armazenamento docs:** Google Drive → Supabase Storage `peticoes` (planejado C2, aprovado por Christian em princípio)
- **`olivia_flow` deletado** — tinha NOT NULL + FK para grupos que foram limpos na reimportação de 16/03

---

## 9. Commits de Referência

| Commit | Descrição |
|--------|-----------|
| `4833e6d` | fix(olivia): BUG-M1 + BUG-M2 ManualStep4Conclusao |
| `a5aaa7d` | fix(olivia): lapidação gerador — DS tokens, DEV guards, texto_gerado |
| `555eac5` | fix(olivia): useWizardTabs versao_id null auto-resolve |
| `a10cd6c` | fix(olivia): Express hasDocuments opcional + barra progresso + FilaDetalheSheet |
| `91b225b` | fix(olivia-c3): 4 issues C3 review |
| `5c1c51a` | fix(olivia): fetchProcessoInsight deps + handleBack erro |
| `2f03034` | fix(olivia): deep review CC — 9 bugs |
| `e333c83` | fix(olivia/chat): null guard + remarkGfm |
| `63d6555` | feat(olivia): análise processo/decisão — fix end-to-end (JARBAS) |
| `d7ce637` | fix(olivia): registra skills no array (JARBAS) |
| `702235d` | fix(olivia): handlers start.mjs + migration constraint (JARBAS) |
| `6978807` | feat(olivia): SSE endpoint vibelaw + skill_olivia_revisor (JARBAS) |
| `2a81a43` | fix(olivia): SSE integration frontend — token streaming |
| `ae97287` | Plano v2 HTML publicado |
| `248fc20` | PRD Master Definitivo 2026-03-14 |

---

## 10. HTMLs e Documentação Publicados

| URL | Descrição |
|-----|-----------|
| https://mdlab-christian.github.io/jarbas-reports/olivia/prd-master-definitivo-2026-03-14.html | PRD Master Definitivo |
| https://mdlab-christian.github.io/jarbas-reports/olivia/spec-prd-olivia-2026-03-13.html | SPEC PRD OlivIA |
| https://mdlab-christian.github.io/jarbas-reports/olivia/validacao-final-vibelaw-2026-03-13.html | Validação Final |
| https://mdlab-christian.github.io/jarbas-reports/olivia/olivia-deep-review-2026-03-14.html | Deep Review C3 (14/03) |
| https://mdlab-christian.github.io/jarbas-reports/olivia/plano-execucao-v2-2026-03-14.html | Plano Execução v2 |
| https://mdlab-christian.github.io/jarbas-reports/olivia/status-olivia-2026-03-13.html | Status OlivIA 13/03 |
| https://mdlab-christian.github.io/jarbas-reports/olivia/brainstorming-olivia-2026-03-13.html | Brainstorming v1 |
| https://mdlab-christian.github.io/jarbas-reports/olivia/brainstorming-olivia-v2-2026-03-13.html | Brainstorming v2 |
| https://mdlab-christian.github.io/jarbas-reports/jana/olivia-analise-v3-doc.html | Documentação OLIVIA-ANALISE-V3 |
| https://mdlab-christian.github.io/jarbas-reports/jana/olivia-analise-arquitetura-review.html | Review Arquitetural V3 |
| https://mdlab-christian.github.io/jarbas-reports/jana/olivia-analise-v4-plano.html | Plano OLIVIA-ANALISE-V4 |

---

## 11. Próximas Ações Prioritárias

1. **[P0]** Christian valida HTML do plano V4 → JANA inicia Sprint 1 (grupo [Jana] /olivia-Frontend)
2. **[P0]** Sprint 1 OLIVIA-ANALISE-V4: Vision + Mistral OCR + Opus + dados restrição + threshold adaptativo + relatorio_equipe + playbook scope
3. **[P1]** Sprint 2 V4: classificação de doc, RAG on-demand, frontend Express (5 mudanças)
4. **[P1]** Fase 11 E2E: 20 petições, score ≥ 8, DOCX válidos → tag v2.0.0-olivia
5. **[P1]** Fix definitivo N8N gerar-manual `blocos_selecionados:[]`
6. **[P2]** Migrar armazenamento docs: Google Drive → Supabase Storage (C2)

---

*Gerado por JANA 🦊 | MacBook Air M4 | 2026-03-17 01:00 BRT*
*Compilado de: 6 grupos Telegram, 14 arquivos de memória, 11 commits rastreados*
