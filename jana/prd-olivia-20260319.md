# PRD OlivIA v3 -- Visao Completa

> Gerado em 2026-03-19 | JANA (Claude Code Opus 4.6)
> Projeto: Reconstrucao OlivIA | ID: `48d9bfaa-206f-457c-95f6-36ed25e4162e` | Versao: 5

---

## 1. Objetivo

**OlivIA** e o gerador de peticoes juridicas da plataforma MdFlow (MDX LegalTech). Permite que advogados criem peticoes de forma automatizada usando 4 modos de geracao, desde montagem manual de blocos ate redacao completa por agente IA.

**Dominio:** Negativacao indevida (Serasa, SPC, Boa Vista, Quod, SCR/Registrato, RMC/RCC). ~2.000 processos ativos, meta 80-100 distribuicoes/dia.

**Produto dentro do ecossistema:**
- MdFlow (SaaS principal) > OlivIA (modulo de peticoes)
- Integracoes: JARBAS (Mac Mini, agente IA), n8n (automacoes), GAS (Google Apps Script, Smart Blocks)

---

## 2. Stack Tecnica

| Camada | Tecnologias |
|---|---|
| **Frontend** | React 18 + TypeScript + Vite + Tailwind CSS 3.x |
| **UI** | shadcn/ui + Radix UI + Framer Motion 11+ + Lucide React |
| **State** | @tanstack/react-query 5+ (server state) + useState/useCallback (local) |
| **Backend** | Supabase (PostgreSQL) -- projeto `qdivfairxhdihaqqypgb` |
| **Automacoes** | n8n (Railway) -- webhooks + orquestracao IA |
| **IA** | Anthropic Claude (Sonnet/Opus) via n8n + JARBAS |
| **Docs** | Google Docs via GAS (Smart Blocks) + Google Drive API |
| **DnD** | @dnd-kit (reordenacao de outline) |
| **Editor** | Textarea (atual) -- planejado TipTap v2 para modo Agente |
| **Realtime** | Supabase Realtime (postgres_changes) |
| **Auth** | Supabase Auth + RLS multi-tenant (org_id()) |
| **Design System** | v5 Warm Charcoal -- tokens CSS, sem hardcodes |

---

## 3. Arquitetura de Paginas e Rotas

### Rota principal: `/olivia`
Pagina com 4 abas (tabs via URL params):

| Tab | Componente | Descricao |
|---|---|---|
| `gerador` (default) | `OliviaGeradorLanding` | Landing com KPIs, modo cards, rascunhos, historico |
| `fila` | `OliviaFilaTab` | Fila de geracao (PENDENTE, EM_PROGRESSO, SUCESSO, ERRO) |
| `analise` | `OliviaAnaliseUnificada` | Analise IA de processos e decisoes |
| `chat` | `OliviaChatPage` | Chat conversacional com OlivIA |

### Sub-rotas do Gerador (wizards):

| Rota | Componente | Modo |
|---|---|---|
| `/olivia/gerador/express` | `OliviaGeradorIA` | Express -- 5 steps, IA assistida via n8n |
| `/olivia/gerador/modo-agente` | `OliviaGeradorAgente` | Agente -- 4 steps, JARBAS/Claude profundo |
| `/olivia/gerador/smart-blocks` | `OliviaGeradorSmartBlocks` | Smart Blocks -- selecao manual de blocos, GAS |
| `/olivia/gerador/vibelaw` | `OliviaVibelawStudio` | VibeLaw -- chat interativo (BETA) |
| `/olivia/gerador/manual` | `OliviaGeradorManual` | Manual legado (Smart Blocks antigo) |
| `/olivia/gerador/ia` | `OliviaGeradorIA` | Alias para Express |

### Redirecionamentos:
- `/olivia-v2` e `/olivia-v2/*` -> `/olivia` (redirect)

---

## 4. Componentes Principais

### 4.1 Pagina Index (`pages/Olivia/index.tsx`)
- Tab navigation com URL params (`?tab=gerador`)
- Badge de contagem na tab Fila (realtime)
- Notificacoes realtime de status (SUCESSO/ERRO) via Supabase channels
- ErrorBoundary por tab

### 4.2 Landing (`components/gerador/OliviaGeradorLanding.tsx` -- 557 linhas)
- **KPI row**: Total 30d, Hoje, Concluidas (% sucesso), Score medio
- **PeticaoTabBar**: Rascunhos em andamento com busca por CNJ/cliente
- **ModeCards**: 4 cards (Express, Agente, Smart Blocks, VibeLaw)
- **Rate limit**: Banner quando limite atingido
- **Historico**: Ultimas 5 peticoes com status badges
- **Recovery**: Continuar peticoes em andamento

### 4.3 Wizard Express (`components/gerador/OliviaGeradorIA.tsx`)
- 5 steps: Identificacao > Triagem IA > Estrutura (Outline DnD) > Revisao > Conclusao
- Chat lateral (WizardChatPanel) toggleable
- Stepper animado com Framer Motion
- Dirty state guard (ConfirmDialog ao sair)

### 4.4 Wizard Agente (`components/gerador/OliviaGeradorAgente.tsx`)
- 4 steps: Identificacao > Analise & Triagem > Revisao > Gerar
- Motor: JANA/JARBAS com fallback
- Hook dedicado: `useOliviaAgente`

### 4.5 Wizard Smart Blocks (`components/gerador/OliviaGeradorSmartBlocks.tsx`)
- Processo + Modelo > Tag Wizard > Gerar Google Doc
- Geracao via GAS (Google Apps Script) atraves de webhook n8n
- Sem rate limit (nao usa IA)

### 4.6 Steps compartilhados (`components/gerador/steps/`)

| Step | Componente | Responsabilidade |
|---|---|---|
| Identificacao | `StepIdentificacao.tsx` | Selecao de processo, tipo peticao, modelo, advogado |
| Triagem | `StepTriagem.tsx` | Perguntas dinamicas da IA, respostas do advogado |
| Estrutura | `StepEstrutura.tsx` + `OutlineEditor.tsx` | Outline drag-and-drop de secoes |
| Revisao | `StepRevisao.tsx` + `RevisaoPreview.tsx` | Edicao da minuta, contraparte, instrucoes |
| Conclusao | `StepConclusao.tsx` | Resultado final, link Google Doc, download |

### 4.7 Componentes shared do gerador (`components/gerador/shared/`)

| Componente | Responsabilidade |
|---|---|
| `ProcessoSelector` | Busca e selecao de processos (reutilizado em /decisoes) |
| `WizardStepper` | Indicador visual de progresso do wizard |
| `WizardTabBar` | Tabs de peticoes simultaneas |
| `ModeCard` | Card de modo de geracao |
| `GeracaoProgress` | Barra de progresso durante geracao |
| `ProgressSubsteps` | Sub-etapas detalhadas da geracao |
| `RecoveryCard` | Card para retomar peticoes abandonadas |
| `RenderMarkdown` | Renderizacao de markdown para preview |
| `QualidadeIaSelector` | Seletor: Padrao vs Pensamento Estendido |

### 4.8 Analise IA (`components/analise/`)
- `OliviaAnaliseUnificada` -- Hub com sub-abas (Processo, Decisao)
- `OliviaAnaliseProcesso` -- Analise completa de processo
- `OliviaAnaliseDecisao` -- Analise de decisao judicial
- Upload de documentos + visualizacao de resultados

### 4.9 Chat OlivIA (`components/chat/`)
- `OliviaChatPage` -- Pagina principal do chat
- `ChatTimeline` -- Timeline de mensagens
- `ChatComposer` -- Input com sugestoes rapidas
- `ChatSidebar` -- Historico de threads

### 4.10 Fila (`components/fila/`)
- `OliviaFilaTab` -- Tabela com todas as geracoes
- `OliviaFilaDetalheSheet` -- Sheet lateral com detalhes
- Status badges com cores do Design System

### 4.11 VibeLaw (`components/vibelaw/`)
- 8 componentes: Chat, Composer, ContextPanel, EditorPanel, Preview, Onboarding, ActionCard
- Chat interativo com preview ao vivo do documento
- Status: BETA

---

## 5. Hooks

| Hook | Arquivo | Responsabilidade |
|---|---|---|
| `useOliviaWizard` | `hooks/olivia/useOliviaWizard.ts` | Estado completo do wizard (30+ campos), navegacao entre steps |
| `useWizardTabs` | `hooks/olivia/useWizardTabs.ts` | Multi-tab de peticoes simultaneas |
| `useGerarPeticao` | `hooks/olivia/useGerarPeticao.ts` | Payload canonico para webhook de geracao |
| `useOliviaAgente` | `hooks/olivia/useOliviaAgente.ts` | Comunicacao com JARBAS/JANA para modo Agente |
| `useOliviaChat` | `hooks/olivia/useOliviaChat.ts` | Chat com OlivIA (threads, mensagens) |
| `useRateLimit` | `hooks/olivia/useRateLimit.ts` | Rate limiting (10 geracoes/hora) |
| `useAutosave` | `hooks/olivia/useAutosave.ts` | Autosave do wizard a cada 30s |
| `useJarbasStatus` | `hooks/olivia/useJarbasStatus.ts` | Status online/offline do JARBAS |
| `useRelatorioProcesso` | `hooks/olivia/useRelatorioProcesso.ts` | Relatorio de processo para contexto IA |
| `useVibeLaw` | `hooks/olivia/useVibeLaw.ts` | Estado do VibeLaw Studio |
| `useVibeLawSSE` | `hooks/olivia/useVibeLawSSE.ts` | SSE para streaming VibeLaw |
| `useAudioRecorder` | `hooks/olivia/useAudioRecorder.ts` | Gravacao de audio (futuro) |
| `useSmartBlocks` | `hooks/olivia/useSmartBlocks.ts` | **DEPRECATED** -- migrado para callWebhook |

---

## 6. Tabelas de Banco (22 tabelas olivia_*)

### 6.1 Tabela Central: `olivia_historico` (46 colunas, 90 registros)
**Proposito:** Registro de cada geracao de peticao. E o hub central do sistema.

| Campo critico | Tipo | FK | Descricao |
|---|---|---|---|
| `id` | uuid PK | -- | ID unico |
| `organizacao_id` | uuid! | organizacoes | Tenant isolation |
| `user_id` | uuid | users | Quem gerou |
| `processo_id` | uuid | processos | Processo vinculado |
| `modelo_id` | uuid | olivia_modelos_grupo | Modelo usado |
| `tipo_peticao_id` | uuid | olivia_tipos_peticao | Tipo da peticao |
| `versao_id` | uuid | olivia_versoes | Versao do modelo |
| `advogado_id` | uuid | advogados | Advogado responsavel |
| `cliente_id` | uuid | clientes | Cliente |
| `analise_id` | uuid | olivia_analises | Analise IA vinculada |
| `status` | text | -- | PENDENTE/EM_PROGRESSO/SUCESSO/ERRO/ABANDONADO |
| `modo` | text | -- | MANUAL/IA_ASSISTIDA/VIBELAW/JARBAS/EXPRESS/SMART_BLOCKS |
| `motor` | text | -- | jarbas/n8n |
| `qualidade_ia` | text | -- | padrao/pensamento_estendido |
| `texto_gerado` | text | -- | Texto da peticao gerada |
| `revisao` | text | -- | Texto da revisao |
| `google_doc_url` | text | -- | URL do Google Doc |
| `google_doc_id` | text | -- | ID do Google Doc |
| `pdf_url` | text | -- | URL do PDF |
| `score_revisor` | numeric | -- | Nota do revisor IA (0-10) |
| `progresso` | jsonb | -- | Steps de progresso da geracao |
| `meta` | jsonb | -- | Metadados adicionais |
| `tokens_usados` | integer | -- | Tokens consumidos |
| `custo_usd` | numeric | -- | Custo em USD |
| `tempo_geracao_ms` | integer | -- | Tempo total em ms |
| `error_message` | text | -- | Mensagem de erro |

### 6.2 Modelo de Dados Completo

| Tabela | Registros | Proposito | FKs principais |
|---|---|---|---|
| `olivia_historico` | 90 | Hub central de geracoes | processos, users, modelos_grupo, tipos_peticao, versoes, advogados, clientes, analises |
| `olivia_analises` | 51 | Analises IA de processos/decisoes | processos, decisoes, ai_models |
| `olivia_modelos_grupo` | 177 | Grupos de modelos (agrupamento logico) | tipos_peticao, empresas_categorias |
| `olivia_modelos_peticao` | 329 | Versoes individuais de modelos | tipos_peticao, modelo_grupo_id |
| `olivia_tags` | 183 | Tags/secoes de peticao | olivia_tags_secao |
| `olivia_blocos_texto` | 1244 | Blocos de conteudo reutilizaveis | empresas_categorias |
| `olivia_jurisprudencias` | 1353 | Base de jurisprudencias | olivia_jurisprudencias_assunto |
| `olivia_threads` | 28 | Threads de chat OlivIA | users, processos, clientes |
| `olivia_messages` | 122 | Mensagens dentro de threads | olivia_threads |
| `olivia_modelo_tags` | 508 | Relacao N:M modelo-tag | olivia_modelos_peticao, olivia_tags |
| `olivia_tipos_peticao` | 10 | Tipos (Inicial, Replica, Apelacao...) | -- |
| `olivia_versoes` | 329 | Versoes de configuracao | -- |
| `olivia_playbooks` | 9 | Instrucoes para agentes IA | tipos_peticao, empresas_categorias |
| `olivia_placeholders_registry` | 12 | Registry de placeholders | -- |
| `olivia_modelo_juris` | 0 | Relacao modelo-jurisprudencia | modelos_grupo, jurisprudencias |
| `olivia_flow` | 0 | Flows de wizard | modelos_grupo |
| `olivia_tipos_prova` | 0 | Tipos de prova | -- |
| `olivia_structural_templates` | 0 | Templates estruturais | -- |
| `olivia_historico_gerador` | -- | Historico legado do gerador | processos, clientes, empresas, advogados |
| `olivia_jurisprudencias_assunto` | -- | Assuntos de jurisprudencia | -- |
| `olivia_jurisprudencias_config` | -- | Config de scraping por tribunal | -- |
| `olivia_tags_secao` | -- | Secoes que agrupam tags | -- |

### 6.3 Relacoes Criticas (ER simplificado)

```
olivia_tipos_peticao
  |-- olivia_modelos_grupo (tipo_peticao_id)
       |-- olivia_modelos_peticao (modelo_grupo_id)
       |    |-- olivia_modelo_tags (modelo_id)
       |         |-- olivia_tags (tag_id)
       |              |-- olivia_tags_secao (secao_id)
       |-- olivia_flow (modelo_grupo_id)
       |-- olivia_modelo_juris (modelo_grupo_id)
       |    |-- olivia_jurisprudencias (juris_id)
       |         |-- olivia_jurisprudencias_assunto (assunto_id)
       |-- olivia_historico (modelo_id)
            |-- olivia_analises (analise_id)
            |-- olivia_versoes (versao_id)
            |-- processos (processo_id)
            |-- advogados (advogado_id)
            |-- clientes (cliente_id)
            |-- users (user_id)

olivia_threads
  |-- olivia_messages (thread_id)

olivia_blocos_texto (standalone, linked by tag_ids ARRAY)

olivia_playbooks (standalone, linked by tipo_peticao_id + categoria_empresa_id)
```

### 6.4 Tabelas VAZIAS (gaps conhecidos)
- `olivia_flow` (0) -- Wizard flows nao populados
- `olivia_modelo_juris` (0) -- Vinculacao modelo-jurisprudencia ausente
- `olivia_tipos_prova` (0) -- Nao seedada
- `olivia_structural_templates` (0) -- Nao implementado

---

## 7. RPCs (16 funcoes)

| Funcao | Proposito |
|---|---|
| `olivia_create_historico` | Cria registro em olivia_historico com validacoes |
| `olivia_autosave_wizard` | Salva estado do wizard (autosave 30s) |
| `olivia_save_draft_minuta` | Salva rascunho da minuta editada |
| `fn_olivia_historico_set_finished` | Marca historico como finalizado |
| `fn_olivia_get_triagem` | Retorna triagem (modelo + conteudo + placeholders) |
| `fn_olivia_get_triagem_by_grupo` | Triagem por grupo de modelo |
| `fn_olivia_kpis` | KPIs da pagina OlivIA |
| `fn_olivia_listar_threads` | Lista threads do chat |
| `fn_olivia_messages_update_thread` | Atualiza contadores da thread apos mensagem |
| `fn_olivia_playbooks_soft_delete` | Soft delete de playbooks |
| `olivia_detect_stuck_processing` | Detecta geracoes travadas |
| `olivia_get_analises_processo` | Analises de um processo |
| `olivia_dashboard_kpis` | KPIs do dashboard |
| `get_olivia_dashboard_stats` | Stats consolidados |
| `get_equipe_olivia_kpis` | KPIs por membro da equipe |
| `check_olivia_rate_limit` | Verifica rate limit (10/hora) |

---

## 8. RLS (Row Level Security)

**Padrao aplicado em TODAS as 22 tabelas:** Modelo A (tenant isolation)

```sql
-- SELECT: organizacao_id = org_id()
-- INSERT: sem restricao de USING (WITH CHECK implicito)
-- UPDATE: organizacao_id = org_id()
-- DELETE: organizacao_id = org_id() AND perfil = 'admin'
```

**Excecoes:**
- `olivia_threads`: DELETE permite apenas owner (`user_id = auth.uid()`)
- `olivia_playbooks`: SELECT adiciona `deleted_at IS NULL`
- `olivia_modelos_grupo`: Policy extra para `service_role` (ALL)
- `olivia_flow`: SELECT usa subquery em `users` (Modelo B parcial)

---

## 9. Fluxos Criticos de Usuario

### 9.1 Fluxo Express (mais usado)
```
Landing (/olivia?tab=gerador)
  -> Clicar "Express"
  -> /olivia/gerador/express
  -> Step 1: Selecionar processo + tipo peticao + modelo + advogado
  -> Step 2: Responder perguntas da triagem IA (webhook n8n)
  -> Step 3: Editar outline (drag-and-drop de secoes)
  -> Step 4: Revisar minuta gerada (editar texto, adicionar instrucoes)
  -> Step 5: Conclusao (link Google Doc, download PDF)
```

**Webhook chain:**
1. `olivia/triagem-questions` -- Gera perguntas dinamicas
2. `olivia/gerar-doc-v3` (dGw50wQ4xjdsjR3n) -- Orquestra geracao
   - Sub: `sw-olivia-redator` -- Redige peticao
   - Sub: `sw-olivia-revisor` -- Revisa peticao

### 9.2 Fluxo Smart Blocks
```
Landing -> "Smart Blocks" -> /olivia/gerador/smart-blocks
  -> Step 1: Selecionar processo + modelo
  -> Step 2: Wizard de tags (selecionar blocos de conteudo)
  -> Step 3: Gerar via GAS (Google Apps Script)
  -> Resultado: Google Doc pronto
```

**Webhook:** `olivia/gerar-manual` -> n8n -> GAS

### 9.3 Fluxo Modo Agente
```
Landing -> "Modo Agente" -> /olivia/gerador/modo-agente
  -> Step 1: Identificacao (mesmo do Express)
  -> Step 2: Analise & Triagem (JARBAS analisa com 7 sub-agentes)
  -> Step 3: Revisao (editor com sugestoes da IA)
  -> Step 4: Gerar (conclusao)
```

**Motor:** JARBAS (Mac Mini) via skill_olivia_agente_v2.mjs (sera v3)

### 9.4 Fluxo Analise IA
```
/olivia?tab=analise
  -> Selecionar processo ou decisao
  -> Upload de documentos (opcional)
  -> IA analisa e retorna resultado estruturado
  -> Historico de analises consultavel
```

### 9.5 Fluxo Chat
```
/olivia?tab=chat
  -> Nova thread ou selecionar existente
  -> Chat livre ou contextualizado por processo
  -> Sugestoes rapidas
  -> Action cards (PATCH, busca juris, pesquisa)
```

---

## 10. Automacoes (N8N)

### 10.1 Workflows OlivIA

| ID | Nome | Path | Status | Funcao |
|---|---|---|---|---|
| `dGw50wQ4xjdsjR3n` | WH-OLIVIA-GERAR-DOC-V3 | olivia/gerar-doc | ATIVO | Orquestrador principal (17 nodes) |
| `bwZm-wraTuSMt_W39Cgye` | sw-olivia-redator | (sub-workflow) | ATIVO | Redacao da peticao |
| `cOw2eBb-hbTrTtQGA6WK6` | sw-olivia-revisor | (sub-workflow) | ATIVO | Revisao da peticao |
| `AvmF07YPjxXvM2H0` | WH-OLIVIA-TRIAGEM-QUESTIONS | olivia/triagem | ATIVO | Gera perguntas dinamicas |
| `MN5kuLDzuIrIpufm` | prod-olivia-express | olivia/express | ATIVO | Express completo (10 Code nodes) |
| `hyGajjic2kZBVGvW` | final-smart-blocks | olivia/smart-blocks | ATIVO | Smart Blocks (5 Code nodes) |
| `8ntAvTGMhCfrlfRt` | olivia-analise-v4 | olivia/analise | ATIVO | Analise IA |
| `2Yvg36Bzfss7g5KQ` | WH-OLIVIA-RECURSO | olivia/recurso | ATIVO | Recurso judicial (stubs) |
| `DnecdvxoRKyMjZMD` | VIBELAW-CHAT | vibelaw/chat | ATIVO | Chat VibeLaw |
| `DGzFsMFIUMArbWfg` | VIBELAW-CREATE-DOC | vibelaw/create-doc | ATIVO | Criar doc VibeLaw |
| `Akg1AxMpZayDdnk2` | APPLY-PATCH | vibelaw/apply-patch | ATIVO | Aplicar patch ao doc |
| `0lcbMHTEwbyrrYAH` | N8N-PROC-OLIVIA-RESUMO | olivia/resumo | ATIVO | Resumo de processo |

### 10.2 Bugs conhecidos nos workflows
- **fetch() is not defined**: 15 Code nodes nos workflows Express (10) e Smart Blocks (5) usam `fetch()` que nao existe no runtime n8n. Fix: substituir por `$helpers.httpRequest()` ou `require('https')`
- **dGw50wQ4xjdsjR3n**: Precisa verificacao de Code nodes internos

### 10.3 Envelope canonico
```json
// Request (frontend -> n8n)
{ "request_id": "uuid", "contexto": "olivia.gerar", "organizacao_id": "uuid", "actor_user_id": "uuid", "origem_rota": "/olivia", "data": {...} }

// Response (n8n -> frontend)
{ "success": true, "message": "...", "action": "toast_refresh", "data": {}, "error_code": null }
```

Frontend usa `callWebhook()` de `@/lib/webhook` -- prefix `olivia/` nao recebe `mdflow/` automatico.

---

## 11. Restricoes e Regras

### 11.1 Regras de Negocio
- **Rate limit**: 10 geracoes/hora por usuario (RPC `check_olivia_rate_limit`)
- **Autosave**: Wizard salva automaticamente a cada 30s (`AUTOSAVE_INTERVAL_MS`)
- **Max tabs**: 5 peticoes simultaneas (`MAX_WIZARD_TABS`)
- **Multi-tenant**: TODA query filtra por `organizacao_id`
- **Soft delete**: Abandonar peticao = status ABANDONADO (nao delete)
- **Google Drive**: Docs salvos em folder `1JTbKJqbmPzRTLlqRYZEZ5pNY-w8r1ALZ`
- **Modelo FK**: `olivia_historico.modelo_id` -> `olivia_modelos_grupo.id` (NAO modelos_peticao)

### 11.2 Status permitidos
```
olivia_historico.status: PENDENTE | EM_PROGRESSO | PROCESSANDO | SUCESSO | ERRO | ABANDONADO
olivia_historico.modo: MANUAL | IA_ASSISTIDA | VIBELAW | JARBAS | EXPRESS | SMART_BLOCKS
olivia_historico.qualidade_ia: padrao | pensamento_estendido
olivia_threads.status: ATIVA | ARQUIVADA | EXCLUIDA
olivia_threads.tipo: CHAT | VIBELAW | ANALISE
olivia_historico.motor: jarbas | n8n (default jarbas)
```

### 11.3 O que NAO pode ser alterado
- Tabelas core: `processos`, `clientes`, `users`, `organizacoes`
- Contratos de webhook existentes (envelope canonico)
- RLS policies sem aprovacao CTO
- Design System tokens CSS
- Convencao `org_id()` para RLS

### 11.4 Dados existentes (numeros reais)
- 329 modelos de peticao (233 com conteudo_template)
- 183 tags de secao
- 1.244 blocos de texto reutilizaveis
- 1.353 jurisprudencias (1.338 sem texto_integral -- gap P1)
- 10 tipos de peticao
- 508 relacoes modelo-tag
- 12 placeholders registrados
- 9 playbooks
- 90 historicos (23 SUCESSO, 37 ABANDONADO, 28 ERRO = 26% taxa sucesso)
- 0 flows, 0 modelo_juris, 0 tipos_prova (gaps)

---

## 12. Decisoes Arquiteturais Existentes

### 12.1 Decisoes de Arquitetura (D-ARQ)
| # | Decisao | Status |
|---|---|---|
| D-ARQ-01 | 3 modos de resiliencia (Express, Smart Blocks, Agente) | FIRME |
| D-ARQ-02 | Express = modo recomendado (100% n8n, sem JARBAS) | FIRME |
| D-ARQ-03 | Smart Blocks = backup mecanico (GAS, sem IA) | FIRME |
| D-ARQ-04 | Agente = modo premium (JARBAS + Claude Opus) | FIRME |
| D-ARQ-05 | Step 1 unificado para todos os modos | FIRME |
| D-ARQ-06 | VibeLaw excluido da reconstrucao v3 (manter referencia) | FIRME |
| D-ARQ-07 | olivia_historico como hub central (todas as geracoes) | FIRME |
| D-ARQ-08 | n8n como motor de automacao (nunca frontend direto) | FIRME |
| D-ARQ-09 | Google Docs como output padrao | FIRME |
| D-ARQ-10 | Zustand para multi-tab state (planejado E12) | FIRME |
| D-ARQ-11 | TipTap v2 para editor Agente (planejado E18) | FIRME |
| D-ARQ-12 | RAG Controller: interface pronta, populacao futura | FIRME |

### 12.2 Decisoes de Frontend (D-FE)
| # | Decisao |
|---|---|
| D-FE-01 | Wizard com steps lineares (nao pular) |
| D-FE-02 | Dirty state obrigatorio (confirmar antes de sair) |
| D-FE-03 | Paginacao server-side em fila |
| D-FE-04 | Realtime para badges e notificacoes |
| D-FE-05 | callWebhook() centralizado (nunca fetch direto) |
| D-FE-06 | @dnd-kit para reordenacao de outline |
| D-FE-07 | Progress polling 3s para geracoes async |
| D-FE-08 | staleTime 30_000 em todos hooks React Query |
| D-FE-09 | NAO usar seletor de playbook (decisao firme) |
| D-FE-10 | Skeleton loading em todas as queries |
| D-FE-11 | ErrorBoundary por tab e por wizard |
| D-FE-12 | 4 mode cards iguais (sem badge recommended) |

### 12.3 Decisoes de Backend (D-BE)
| # | Decisao |
|---|---|
| D-BE-01 | modelo_id FK -> olivia_modelos_grupo (nao peticao) |
| D-BE-02 | status UPPERCASE em olivia_historico/threads |
| D-BE-03 | modo UPPERCASE em olivia_historico |
| D-BE-04 | motor default = 'jarbas' |
| D-BE-05 | published_at opcional (usar ativo=true como filtro) |
| D-BE-06 | tags_ids ARRAY em modelos_grupo (denormalizacao) |

---

## 13. Bugs Conhecidos (P0-P1)

| # | Bug | Severidade | Status |
|---|---|---|---|
| 1 | fetch() is not defined em 15 Code nodes n8n | P0 BLOQUEANTE | Documentado E05 |
| 2 | FK modelo_id: frontend passa modelos_peticao.id em vez de modelos_grupo.id | P0 BLOQUEANTE | Documentado E06 |
| 3 | published_at NULL em 329 modelos (query versao falha) | P0 BLOQUEANTE | Documentado E10 |
| 3.5 | salvarHistorico usa INSERT quando deveria UPDATE (duplica registros) | P1 | Documentado E07 |
| 4 | ORG_ID hardcoded em skill_olivia_agente_v2.mjs | P2 | Documentado E08 |
| 5 | Versoes duplicadas no seletor Smart Blocks | P2 | Documentado E09 |
| 6 | olivia_modelo_juris vazia (0 vinculacoes) | P1 | Gap aberto |
| 7 | texto_integral vazio em 99% das juris | P1 | E27 criada |
| 8 | olivia_flow vazia (0 wizard flows) | P1 | Documentado E11 |
| 9 | Taxa de sucesso 26% (23/90) | CRITICO | Correcoes P0 devem elevar >70% |

---

## 14. Metricas Atuais

| Metrica | Valor |
|---|---|
| Total de geracoes | 90 |
| Taxa de sucesso | 26% (23/90) |
| Abandonados | 41% (37/90) |
| Erros | 31% (28/90) |
| Em progresso | 2 |
| Threads de chat | 28 |
| Mensagens de chat | 122 |
| Analises IA | 51 |

---

## 15. Projeto de Reconstrucao

**ID:** `48d9bfaa-206f-457c-95f6-36ed25e4162e`
**Versao:** 5
**Etapas:** 27 (3 concluidas, 24 rascunho)
**Parecer:** PRONTO PARA EXECUCAO

**Proximo passo:** E04 (SPEC detalhada) ou E10+E06+E05 em paralelo (fixes P0)

**Plano completo:** `~/Desktop/projeto olivia/PLANO-MESTRE-OLIVIA-DEFINITIVO.md`
**cc_prompts:** 27 PRDs completos no banco (`projetos_etapas`, 743-5796 chars cada)

---

> PRD gerado por JANA (Claude Code Opus 4.6) | 2026-03-19 | MdLab LegalTech
> Dados reais: Supabase qdivfairxhdihaqqypgb | 22 tabelas olivia_* | 86 arquivos frontend | 12 workflows n8n
