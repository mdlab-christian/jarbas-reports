# OlivIA — SPEC Completa: Modo Express
> Gerado por JANA 🦊 | 2026-03-17 | MacBook Air M4
> Conversa: [Jn] Express (chat_id: -5193500837)
> Versão: 1.0 — para uso na conversa unificada de finalização dos 3 modos

---

## 1. ESTADO ATUAL

### Conclusão estimada: ~82%

**O que funciona (confirmado em código/commits):**
- ✅ Wizard 5 steps completo: Identificação → Triagem → Estrutura → Revisão → Conclusão
- ✅ Integração com `prod-olivia-express` via `callWebhook('mdflow/olivia/express', ...)`
- ✅ ANALISE-V4 dispara automaticamente ao avançar Step 1→2 (quando `modelo_tem_tags=true`)
- ✅ Polling de análise com overlay animado + Progress bar + botão "Pular análise" após 15s
- ✅ Pré-fill de respostas com `confianca >= 0.7` no Step de Triagem
- ✅ Auto-avanço da triagem quando todas as perguntas têm alta confiança (badge Sparkles)
- ✅ Filtragem de perguntas já cobertas pela análise
- ✅ Layout 2 colunas no Step 2 (preview petição base + perguntas restantes)
- ✅ MicrophoneButton: perguntas texto + instrucoes_adicionais (Step 2) + instrucoes_finais (Step 3)
- ✅ `StepEstrutura`: outline drag-and-drop, edição de seções, regeneração via webhook
- ✅ `StepRevisao`: editor de minuta com autosave 30s, skip_revisor, chance_sucesso
- ✅ `StepConclusao`: gera petição, polling via `olivia_historico`, ProgressSubsteps
- ✅ `ConclusaoResultado`: métricas (score, modelo, tokens, custo, tempo), RelatorioCasoAccordion
- ✅ Download DOCX via `docx@8` (ZIP OOXML válido no Word)
- ✅ Google Docs: URL retornada pelo n8n e exibida na conclusão
- ✅ Multi-abas: wizard suporta até N abas simultâneas (WizardTabBar)
- ✅ Recovery: parâmetro `?recoveryRunId=<uuid>` reconstrói estado do rascunho
- ✅ Race condition de login corrigida (`flushSync` no auth_context)
- ✅ Bulk upload: 50 arquivos / 100MB por arquivo
- ✅ Tabs do wizard em mobile: footer sticky
- ✅ Bloqueio de avanço: modelo com tags sem documentos não avança

**O que nunca foi testado end-to-end:**
- ⚠️ Fluxo completo Steps 1→5 com petição gerada realmente e Google Doc criado (E2E browser)
- ⚠️ `RelatorioCasoAccordion`: depende de `meta.relatorio_processo` no `olivia_historico` — não confirmado que o `prod-olivia-express` (B8-Salvar) popula esse campo em produção com todos os dados
- ⚠️ Geração com `qualidade_ia=pensamento_estendido` (Extended Thinking) — timeout de 6-10min, nunca testado
- ⚠️ Recovery de sessão após abandon (parâmetro `?recoveryRunId`)
- ⚠️ Fluxo com `modelo_tem_tags=false` (modelo simples sem análise) — caminho alternativo

### Bugs conhecidos

| # | Severidade | Descrição | Arquivo |
|---|---|---|---|
| BUG-01 | P1 (corrigido em `089dbc1b`) | UploadProvasInline disparava análise automaticamente ao montar — removido auto-trigger | `UploadProvasInline.tsx` |
| BUG-02 | P1 (corrigido em `089dbc1b`) | `versao_id` não era obrigatório — wizard avançava sem versão publicada | `useWizardTabs.ts` |
| BUG-03 | P1 (corrigido em `089dbc1b`) | Botão "Pular análise" não funcionava + progresso fixo em 0 | `OliviaGeradorIA.tsx` |
| BUG-04 | P2 (aberto) | `loadingAnaliseMsg.includes()` para calcular % do Progress — frágil se mensagens mudarem | `OliviaGeradorIA.tsx` |
| BUG-05 | P2 (aberto) | `analise_resultado=null` com `modelo_tem_tags=true` não tem fallback explícito na triagem — comportamento indefinido | `StepTriagem.tsx` |
| BUG-06 | P2 (aberto) | `relatorio_processo` no `RelatorioCasoAccordion` pode não existir no `meta` JSONB se o n8n não o populou — accordion fica oculto silenciosamente | `ConclusaoResultado.tsx` |
| BUG-07 | P3 (aberto) | Race condition teórica em multi-abas: `analiseAbortRef` é compartilhado entre abas — se 2 abas dispararem análise simultânea, pode abortar a errada | `useWizardTabs.ts` |
| BUG-08 | P3 (aberto) | `test-results/` e `scripts/olivia_*.mjs` não commitados — pode afetar reprodutibilidade local | repo |

---

## 2. ARQUITETURA FRONTEND

### Arquivo orquestrador principal
```
src/pages/olivia/components/gerador/OliviaGeradorIA.tsx
```
Rota: `/olivia/gerador/modo-express` (ou `/olivia/gerador` — ver `App.tsx`)

### Hook principal
```
src/hooks/olivia/useWizardTabs.ts
```
Gerencia: estado de todas as abas, steps, criação de `olivia_historico`, polling de análise, dirty state, recovery.

### Steps do wizard

| # | Nome interno | Componente | Arquivo |
|---|---|---|---|
| 0 | `identificacao` | `StepIdentificacao` | `steps/StepIdentificacao.tsx` |
| 1 | `triagem` | `StepTriagem` | `steps/StepTriagem.tsx` |
| 2 | `estrutura` | `StepEstrutura` | `steps/StepEstrutura.tsx` |
| 3 | `revisao` | `StepRevisao` | `steps/StepRevisao.tsx` |
| 4 | `conclusao` | `StepConclusao` | `steps/StepConclusao.tsx` |

### Estado gerenciado — WizardState (useWizardTabs.ts)

```typescript
interface WizardState {
  // Identificação
  processo_id: string | null
  numero_cnj: string | null
  tipo_peticao_id: string | null
  modelo_id: string | null           // olivia_modelos_peticao.id
  modelo_grupo_id: string | null     // olivia_modelos_grupo.id
  versao_id: string | null           // olivia_versoes.id (obrigatório para gerar)
  advogado_id: string | null
  qualidade_ia: 'padrao' | 'pensamento_estendido'
  dados_processo: DadosProcesso | null
  tipo_peticao_nome: string | null

  // Análise de provas
  provas_urls: string[]
  analise_id: string | null
  analise_resultado: AnaliseResultado | null
  modelo_tem_tags: boolean            // true = análise obrigatória antes de avançar
  isLoadingAnalise: boolean
  loadingAnaliseMsg: string
  loadingAnaliseProgress: number      // 0-100

  // Triagem
  perguntas: TriageQuestion[]
  respostas: Record<string, any>
  instrucoes_adicionais: string | null

  // Estrutura
  outline: OutlineSection[]
  playbook_id: string | null
  playbook_instrucoes: string | null
  categoria_empresa_id: string | null

  // Revisão
  minuta: string | null
  minuta_editada: string
  instrucoes_finais: string
  skip_revisor: boolean
  contraparte: string | null
  chance_sucesso: 'alta' | 'media' | 'baixa' | null
  contestacao_url: string | null

  // Geração / Conclusão
  status_geracao: OliviaHistoricoStatus | null
  relatorio: string | null
  google_doc_url: string | null
  google_doc_id: string | null
  dados_escavador: Record<string, any> | null

  // Chat
  chat_thread_id: string | null
  chat_historico: Array<{ role: 'user' | 'assistant'; content: string }> | null
  instrucoes_ia: string | null       // instrucoes do modelo (D12)
}
```

### Componentes críticos e caminhos

| Componente | Arquivo | Função |
|---|---|---|
| `OliviaGeradorIA` | `gerador/OliviaGeradorIA.tsx` | Orquestrador do wizard |
| `useWizardTabs` | `hooks/olivia/useWizardTabs.ts` | Estado central |
| `useGerarPeticao` | `hooks/olivia/useGerarPeticao.ts` | Disparo do webhook de geração; `buildProcessoContext` + `buildTriagemRespostas` |
| `StepIdentificacao` | `steps/StepIdentificacao.tsx` | Seleção processo/tipo/modelo/advogado + QualidadeIA + upload provas |
| `StepTriagem` | `steps/StepTriagem.tsx` | Perguntas de triagem com pré-fill de análise |
| `StepEstrutura` | `steps/StepEstrutura.tsx` | Editor de outline (drag-and-drop DnD Kit) |
| `StepRevisao` | `steps/StepRevisao.tsx` | Editor de minuta + autosave + polling de geração |
| `StepConclusao` | `steps/StepConclusao.tsx` | CTA geração + polling + ProgressSubsteps + resultado |
| `ConclusaoResultado` | `steps/conclusao/ConclusaoResultado.tsx` | Métricas + RelatorioCasoAccordion |
| `UploadProvasInline` | `steps/UploadProvasInline.tsx` | Upload de provas inline no Step 1 (50 arquivos / 100MB) |
| `WizardChatPanel` | `gerador/WizardChatPanel.tsx` | Chat IA lateral (Steps 1-3) |
| `WizardStepper` | `gerador/shared/WizardStepper.tsx` | Indicador de progresso visual |
| `WizardTabBar` | `gerador/shared/WizardTabBar.tsx` | Multi-abas de petição |
| `ProgressSubsteps` | `gerador/shared/ProgressSubsteps.tsx` | Progresso granular durante geração |
| `callWebhook` | `lib/webhook.ts` | Wrapper genérico de chamada n8n com bearer `mdflow`, timeout configurável |
| `OLIVIA_GOOGLE_FOLDER_ID` | `lib/olivia/constants.ts` | Google Drive folder ID (`1JTbKJqbmPzRTLlqRYZEZ5pNY-w8r1ALZ` ou `VITE_OLIVIA_GOOGLE_FOLDER_ID`) |

---

## 3. BACKEND E INTEGRAÇÕES

### Workflows n8n

| ID | Nome | Status | O que faz |
|---|---|---|---|
| `8yeCpY5EaEP5XQ9e` | `prod-olivia-express` | ✅ ATIVO | Motor principal — recebe payload do Step 5, orquestra redação + revisão IA + Google Docs + salva em `olivia_historico` |
| `8ntAvTGMhCfrlfRt` | `OLIVIA-ANALISE-V4` | ✅ ATIVO | Análise de provas — PDFs/DOCs → Claude Opus + RAG jurisprudência → `analise_tags` + `peticao_base.blocos_resolvidos` |
| `9nTgWoQiU4FUIxQm` | `N8N-OLIVIA-PETICAO-V3` | ✅ ATIVO | Pipeline legado V3 (compatibilidade) |

### Endpoints chamados pelo frontend

| Webhook path | Método | Workflow | Momento | Payload principal |
|---|---|---|---|---|
| `mdflow/olivia/analise` | POST | `OLIVIA-ANALISE-V4` | Step 1→2 (automático) | `{ processo_id, modelo_grupo_id, arquivos_input, tipo_analise: 'PROVAS' }` |
| `olivia/analise-decisao` | POST | `OLIVIA-ANALISE-V4` | Fallback (provas existentes) | `{ processo_id, tipo: 'PROVAS', documentos: [{path, tipo, file_name}] }` |
| `mdflow/olivia/express` | POST | `prod-olivia-express` | Step 5 "Gerar Petição" | Ver payload completo abaixo |
| `mdflow/olivia/triagem-outline` | POST | (desconhecido) | Step 3 "Regenerar outline" | `{ processo_id, modelo_grupo_id, analise_resultado, ... }` |

**Payload completo `mdflow/olivia/express`** (enviado pelo `StepConclusao.tsx`):
```json
{
  "request_id": "<uuid>",
  "organizacao_id": "<uuid>",
  "actor_user_id": "<uuid>",
  "data": {
    "historico_id": "<uuid>",
    "modelo_grupo_id": "<uuid>",
    "versao_id": "<uuid>",
    "advogado_id": "<uuid>",
    "processo_id": "<uuid>",
    "tipo_peticao_id": "<uuid>",
    "tipo_peticao_nome": "<string>",
    "modelo_id": "<uuid>",
    "processo_context": { /* buildProcessoContext — 30+ campos */ },
    "triagem_respostas": { /* perguntas + respostas */ },
    "minuta_final": "<markdown>",
    "outline": [{ "tag_id", "titulo", "ordem", "incluir", "is_custom", "observacoes" }],
    "estrutura": [ /* idem outline, forma alternativa */ ],
    "tags_customizadas": [{ "nome", "observacoes", "ordem" }],
    "analise_id": "<uuid | null>",
    "analise_resultado": { /* AnaliseResultado | null */ },
    "instrucoes_finais": "<string | null>",
    "instrucoes_adicionais": "<string | null>",
    "qualidade_ia": "padrao | pensamento_estendido",
    "skip_revisor": false,
    "playbook_id": "<uuid | null>",
    "playbook_instrucoes": "<string | null>",
    "categoria_empresa_id": "<uuid | null>",
    "provas_urls": ["<storage_path>"],
    "contestacao_url": "<string | null>",
    "escritorio_contraparte_id": "<uuid | null>",
    "contraparte_id": "<uuid | null>",
    "chance_sucesso": "alta | media | baixa | null",
    "google_folder_id": "1JTbKJqbmPzRTLlqRYZEZ5pNY-w8r1ALZ",
    "blocos_selecionados": [],
    "instrucoes_ia": "<string | null>",
    "chat_historico": [{ "role", "content" }]
  }
}
```

### Pipeline interno do `prod-olivia-express`

```
WH-Gerar → B-IF-Valid
  ↓ válido
B-Respond202 (HTTP 202 imediato)
  ↓ background
B2-BuscarContexto → B3-MontarPrompt → B4-ChamarRedator → B5-ParseRedator
  → B6-IF Skip (skip_revisor?)
    → B7-Revisor (score IA)
  → B8-Salvar (PATCH olivia_historico: status=SUCESSO, texto_gerado, meta.relatorio_processo, score_revisor, custo)
  → B9-AppsScript (Google Docs via GAS)
  → B10-UpdateGoogleDocUrl (PATCH olivia_historico: google_doc_url)
```

### Polling / como o frontend sabe que terminou

- **Tabela:** `olivia_historico`
- **Campo de status:** `status` (texto)
- **Valores possíveis:** `PENDENTE` → `EM_PROGRESSO` → `SUCESSO` / `CONCLUIDO` / `ERRO`
- **Intervalo de polling:** 3s (`refetchInterval` no `StepRevisao.tsx` via `useQuery`)
- **Timeout:** 5 minutos — após isso, `isTimedOut=true` e exibe botão "Tentar novamente"
- **Campos lidos no polling:** `status, modo, meta, texto_gerado, score_revisor, error_message`
- **Geração auto-disparada:** `StepRevisao` dispara automaticamente ao detectar `status=PENDENTE` + `textoGerado=null` (não requer clique do usuário)
- **Progresso granular:** `meta.progresso` (string key) mapeado em `PROGRESSO_KEY_TO_PCT`: `buscando_contexto=15%`, `montando_prompt=30%`, `gerando_texto=60%`, `revisando=85%`, `concluido=100%`

### Google Drive

- **Folder ID:** `1JTbKJqbmPzRTLlqRYZEZ5pNY-w8r1ALZ` (override via `VITE_OLIVIA_GOOGLE_FOLDER_ID`)
- **Como o doc é gerado:** `B9-AppsScript` chama Google Apps Script (GAS) via HTTP com `textoGerado` + `folder_id` + `cabecalho_escritorio`
- **GAS endpoint:** `https://script.google.com/macros/s/AKfycbzLGb-U5QcGwlhwiGt9EL28qMYlg1BDL1WyU7uhknra65sW3rqqy2s8qfL27vn182kc/exec`
- **Resultado:** `google_doc_url` salvo em `olivia_historico.google_doc_url` + lido pelo frontend em `metricsData?.google_doc_url`
- **Fallback:** também disponível em `metricsData.meta.google_doc_url` (JSONB)
- **Frontend:** `useEffect` em `StepConclusao` sincroniza `google_doc_url` para o `wizardState` assim que aparece

### JARBAS

- **Quando usa:** `StepTriagem.tsx` usa JARBAS como motor de triagem alternativo (via `jarbas_tarefas` + polling Supabase)
- **Comportamento:** insere tarefa `tipo='olivia_gerar_triagem'` na tabela `jarbas_tarefas`, JARBAS processa e atualiza `status='concluida'` com `resultado` → frontend faz polling a cada 2s até 120s
- **Fallback:** se JARBAS offline/timeout → wizard continua sem perguntas de triagem (gracioso)
- **URL direta:** `JARBAS_BASE_URL` (lib/jarbas-url.ts) para chamadas como `/olivia/criar-doc`, `/olivia/upload-documento`

---

## 4. BANCO DE DADOS (SUPABASE)

**Projeto:** `qdivfairxhdihaqqypgb`

### Tabelas principais

| Tabela | Campos relevantes para o Express |
|---|---|
| `olivia_historico` | `id, organizacao_id, user_id, processo_id, tipo_peticao_id, modelo_id, versao_id, advogado_id, status, modo, meta (JSONB), texto_gerado, minuta, score_revisor, aprovado_revisor, google_doc_url, google_doc_id, custo_usd, tokens_usados, modelo_usado, qualidade_ia, skip_revisor, analise_id, contestacao_url, tipo_peticao_label, peticao_html, tempo_geracao_ms, finished_at` |
| `olivia_analises` | `id, organizacao_id, processo_id, tipo, status, meta (JSONB), resultado (JSONB), created_at` |
| `olivia_modelos_grupo` | `id, organizacao_id, nome` — `modelo_grupo_id` no wizard |
| `olivia_modelos_peticao` | `id, organizacao_id, nome, instrucoes_ia, versao, ativo` |
| `olivia_versoes` | `id, modelo_id, publicado` — `versao_id` obrigatório para gerar |
| `olivia_modelo_tags` | `id, modelo_id, tag_id, obrigatoria, ordem` — define se modelo tem tags |
| `olivia_tags` | `id, organizacao_id, nome, tipo` |
| `olivia_playbooks` | `id, organizacao_id, agent_key, nome, contexto` |
| `olivia_blocos_texto` | 1244 registros — blocos resolvidos pela análise |
| `olivia_jurisprudencias` | 1353 registros — usadas no RAG da análise |
| `jarbas_tarefas` | `id, organizacao_id, tipo, payload, status, resultado, prioridade, max_tentativas` — fila do JARBAS para triagem |
| `processos` | `id, numero_cnj, clientes, empresas, valor_causa, objeto, grau, ...` |

### Tabela de status da geração

**Tabela:** `olivia_historico`
**Campo:** `status` (text)

| Valor | Significado |
|---|---|
| `PENDENTE` | Criado, aguardando n8n processar |
| `EM_PROGRESSO` | n8n processando |
| `SUCESSO` | Geração concluída com sucesso |
| `CONCLUIDO` | Alias de SUCESSO (legado) |
| `ERRO` | Falha na geração — `error_message` populado |

**Campo de progresso:** `meta.progresso` (JSONB) — chaves: `buscando_contexto`, `montando_prompt`, `gerando_texto`, `revisando`, `concluido`
**Campo de relatório:** `meta.relatorio_processo` (JSONB) — populado pelo `B8-Salvar` do workflow

### RLS relevante

- `olivia_historico`: filtrado por `organizacao_id` em todas as queries
- `olivia_analises`: filtrado por `organizacao_id` e `processo_id`
- Upload de provas: Supabase Storage bucket `olivia-documents`

---

## 5. DECISÕES TOMADAS NESTA CONVERSA

| Decisão | Motivo |
|---|---|
| `modelo_tem_tags` controla obrigatoriedade da análise | Modelos simples (sem tags) avançam direto — reduz fricção para casos simples |
| Pré-fill de confiança `>= 0.7` | Threshold conservador — abaixo disso o advogado confirma manualmente. Evita erros silenciosos em casos ambíguos |
| Polling de análise no Step 1→2 (não no Step 2) | UX: o advogado não vê o Step 2 "em branco" — o overlay aparece ainda no Step 1, transição só quando análise conclui |
| `loadingAnaliseMsg` exibe mensagens contextuais por faixa de progresso | Humaniza a espera: "Carregando contexto..." / "Analisando documentos..." / "Gerando petição base..." |
| Botão "Pular análise" após 15s | Se análise demora, não bloqueia o advogado — ele pode avançar sem o pré-fill |
| Layout 2 colunas no Step 2 com preview | UX: advogado vê a petição base sendo construída em tempo real enquanto responde perguntas |
| `flushSync` no auth_context | React 18 batching causava race condition após login — `flushSync` força commit síncrono antes do `navigate()` |
| Bulk upload 50 arquivos / 100MB | Processos com muitos documentos (INSS, bancário) precisavam de limite maior |
| `RelatorioCasoAccordion` colapsável | Não sobrecarregar a tela de conclusão — relatório disponível mas não intromete |
| `OLIVIA_GOOGLE_FOLDER_ID` como constante com fallback env | Permite override por organização via `VITE_OLIVIA_GOOGLE_FOLDER_ID` sem hardcode |
| `instrucoes_adicionais` (Step 2) + `instrucoes_finais` (Step 3) | Advogado pode complementar em dois momentos — backend recebe ambos |
| Auto-trigger de geração no `StepRevisao` | Fluxo fluido — ao entrar no Step 4 com `status=PENDENTE`, geração já começa sem clique extra |

**Mudanças de UX decididas:**
- QualidadeIA movida para "acima do fold" no Step 1 (commit `4c0d0ae8`)
- Auto-avanço na triagem com counter de 3s (badge com Sparkles) quando todas as respostas são de alta confiança
- Indicador de edição na revisão (diff visual entre minuta original e editada)
- Loading descritivo durante análise (mensagens contextuais em vez de spinner simples)

**Descartado:**
- SSE para polling do status de geração → mantido polling simples a 3s (SSE adicionava complexidade sem ganho para o Express; já adotado só no Modo Agente)
- Geração no Step 3 (Revisão) → mantida no Step 5 (Conclusão), com auto-trigger ao entrar
- StepConclusao sendo o passo de EDIÇÃO da minuta → ficou no StepRevisao (Step 4), Conclusão só exibe resultado

---

## 6. O QUE FALTA PARA 100%

### Prioridade P0 (blocker para produção)

| # | Tarefa | Complexidade | Arquivo(s) |
|---|---|---|---|
| 1 | **Validar `relatorio_processo` em produção** — confirmar que o n8n B8-Salvar popula `meta.relatorio_processo` com os campos completos (`visao_geral`, `pontos_fortes`, `pontos_fracos`, `riscos`, `chance_sucesso`, `recomendacoes`, `documentos_faltantes`) e que o accordion renderiza | 2h | `ConclusaoResultado.tsx` + n8n `prod-olivia-express` B8 |
| 2 | **Teste E2E completo ponta a ponta** — Step 1→5 com petição gerada, Google Doc criado, relatório exibido | 3h | Playwright / manual |

### Prioridade P1 (importante, não blocker imediato)

| # | Tarefa | Complexidade | Dependência |
|---|---|---|---|
| 3 | **Substituir `loadingAnaliseMsg.includes()` por enum de estados** — usar `loadingAnaliseProgress` (numérico) direto para calcular a barra de progresso, sem depender de string | 1h | `OliviaGeradorIA.tsx` |
| 4 | **Fallback explícito quando `analise_resultado=null` e `modelo_tem_tags=true`** — exibir mensagem clara ao usuário na triagem e continuar graciosamente | 1h | `StepTriagem.tsx` |
| 5 | **`relatorio_equipe` para Express Etapa 2** — campo mencionado no contexto da ANALISE-V4 como pendente; verificar se o Express precisa populá-lo no Step 2 | 2h | `OLIVIA-ANALISE-V4` n8n + banco |

### Prioridade P2 (melhorias futuras)

| # | Tarefa | Complexidade |
|---|---|---|
| 6 | Criar E2E Playwright cobrindo Step 1→5 completo | 4h |
| 7 | Aumentar timeout de análise de 5min para 8min + mensagem melhor após timeout | 30min |
| 8 | Corrigir race condition teórica de `analiseAbortRef` em multi-abas | 2h |
| 9 | Sprint 2: classificação automática de documentos + RAG on-demand no Express | 1-2 dias |
| 10 | `texto_integral` das 1353 jurisprudências: campo vazio — só ementa disponível | dependência de dados |
| 11 | Playbook scope "prova" vs "analise" — separar contexto de playbook para análise vs geração | 1h |

### Dependências entre tarefas
- Tarefa 1 (validar relatorio_processo) é pré-requisito para tarefa 2 (E2E)
- Tarefa 4 (fallback analise_resultado) é independente
- Tarefas 9-11 são Sprint 2 — não bloquear entrega da Sprint 1

---

## 7. ARQUIVOS E RELATÓRIOS

### Relatórios HTML gerados nesta conversa (GitHub Pages)

| Relatório | URL |
|---|---|
| Reporter Modo Express | https://mdlab-christian.github.io/jarbas-reports/jana/olivia/reporter-modo-express.html |
| Deep Review Express | https://mdlab-christian.github.io/jarbas-reports/jana/express-deep-review.html |
| Deep Review Express V2 | https://mdlab-christian.github.io/jarbas-reports/jana/express-deep-review-v2.html |
| Lapidação Final Express | https://mdlab-christian.github.io/jarbas-reports/jana/express-lapidacao-final.html |
| Plano Final Express + Validação | https://mdlab-christian.github.io/jarbas-reports/jana/olivia/plano-final-express-validacao-2026-03-16.html |
| Reporter ANALISE-V4 | https://mdlab-christian.github.io/jarbas-reports/jana/olivia/reporter-analise-ia.html |
| Review OLIVIA-ANALISE-V4 | https://mdlab-christian.github.io/jarbas-reports/jana/olivia/review-olivia-analise-v4.html |

### Commits relevantes

| Hash | Descrição |
|---|---|
| `f5188a40` | feat(olivia/express): correções finais + lapidações pós-deepreview |
| `4c0d0ae8` | ux(express): ciclo 2 — QualidadeIA acima do fold · auto-avanço triagem · loading descritivo · indicador edição |
| `089dbc1b` | fix(express): BUG-01 remove auto-trigger upload · BUG-02 versao_id obrigatório · BUG-03 pular análise + progress real · RISK-02 contraparte pré-fill |
| `e617702d` | fix: add missing useEffect import in OliviaGeradorIA |
| `446640be` | feat(olivia/analise-v4): frontend integration — modelo_grupo_id + badges peticao_base/relatorio |
| `7b94b2fe` | StepConclusao + ConclusaoResultado: revisão 8.1/10 + 5 melhorias |
| `0efa8055` | feat(olivia/express): correções finais (batch) |

### Arquivos de spec/doc gerados

| Arquivo | Caminho local |
|---|---|
| Reporter Express (MD) | `~/jarbas-reports/jana/olivia/reporter-modo-express.md` |
| Este arquivo (SPEC) | `~/jarbas-reports/jana/olivia/SPEC-MODO-EXPRESS.md` |

---

## 8. CONTEXTO TÉCNICO PARA RETOMADA

```
Repo:         ~/beta-mdflow  (branch main)
Dev server:   npm run dev -- --port 5173  →  http://localhost:5173
Rota Express: http://localhost:5173/olivia/gerador/modo-express
n8n:          https://primary-production-e209.up.railway.app
Supabase:     qdivfairxhdihaqqypgb
Conta testes: mdlab.equipe@gmail.com / MdL1501@
Google Drive: folder 1JTbKJqbmPzRTLlqRYZEZ5pNY-w8r1ALZ
```

**Workflow IDs importantes:**
- Express motor: `8yeCpY5EaEP5XQ9e` (`prod-olivia-express`)
- Análise provas: `8ntAvTGMhCfrlfRt` (`OLIVIA-ANALISE-V4`)

---

*SPEC gerada por JANA 🦊 | MacBook Air M4 | 2026-03-17 23:20 BRT*
*Repo: github.com/mdlab-christian/beta-mdflow*
