# Reporter — Módulo: Modo Express (OlivIA)
> Gerado por JANA 🦊 em 2026-03-17 | Conversa: [Jn] Express

---

## 1. Contexto Geral

O **Modo Express** é o fluxo principal de geração de petições da OlivIA no MdFlow. É um wizard de 5 etapas que guia o advogado desde a identificação do processo até a geração da petição final com IA, integrando análise de provas, triagem inteligente por perguntas, revisão da minuta e entrega via Google Docs + DOCX.

Esta conversa cobriu o ciclo final de desenvolvimento: integração com ANALISE-V4, smart blocks, lapidação pós-deepreview e commit de produção.

---

## 2. Workflows n8n Envolvidos

| ID | Nome | Status | Função |
|---|---|---|---|
| `8yeCpY5EaEP5XQ9e` | `prod-olivia-express` | ✅ ATIVO | Motor principal — recebe payload do wizard, orquestra análise + triagem + redação + revisão IA, salva em `olivia_historico` |
| `8ntAvTGMhCfrlfRt` | `OLIVIA-ANALISE-V4` | ✅ ATIVO | Análise de provas/documentos — recebe PDFs/DOCs, extrai tags de alta confiança, resolve blocos da petição base, retorna `analise_tags` + `peticao_base.blocos_resolvidos` |
| `9nTgWoQiU4FUIxQm` | `N8N-OLIVIA-PETICAO-V3` | ✅ ATIVO | Pipeline legado de geração (V3) — mantido para compatibilidade com flows anteriores |
| `9EuObcreZQ8F7xwj` | `TEST-OLIVIA-TRIAGEM-SIMPLE` | ✅ ATIVO | Ambiente de testes da triagem — usado para validar perguntas sem disparar geração real |
| `9dV4sCzpKKWIgXpC` | `WH-CTRL-02 — Controller Chat Olivia` | ✅ ATIVO | Chat da OlivIA no Controller V3 |
| `0lcbMHTEwbyrrYAH` | `N8N-PROC-OLIVIA-RESUMO` | ✅ ATIVO | Gera resumo IA do processo para `ia_resumo` + `chance_sucesso_ia` |
| `AvmF07YPjxXvM2H0` | `WH-OLIVIA-TRIAGEM-QUESTIONS` | ❌ LEGACY/inativo | Gerador legado de perguntas — substituído pela triagem embutida no `prod-olivia-express` |

**Webhook path principal:** `POST {VITE_N8N_WEBHOOK_URL}/mdflow/olivia/express`

---

## 3. Arquitetura e Lógica Implementada

### 3.1 Fluxo Ponta a Ponta

```
[Step 1: Identificação]
  → Usuário seleciona processo + tipo petição + modelo_grupo + advogado
  → Se modelo_tem_tags=true E sem documentos → bloqueia avanço (análise obrigatória)
  → Se modelo_tem_tags=false → avança direto (modelo simples)
  → useWizardTabs: cria olivia_historico + dispara ANALISE-V4 (mdflow/olivia/analise)
  → Polling em olivia_analises até status=CONCLUIDO (overlay com Progress bar)

[Step 2: Triagem]
  → Recebe analise_resultado da ANALISE-V4
  → Pré-preenche respostas com tags de confiança ≥ 0.7
  → Filtra perguntas já respondidas com alta confiança
  → Se todas com alta confiança → skip automático com badge "IA analisou tudo"
  → Layout 2 colunas: preview petição base (esquerda) + formulário perguntas (restantes, direita)
  → processo_context rico (30+ campos) enviado ao webhook de triagem
  → MicrophoneButton nas perguntas texto + instrucoes_adicionais

[Step 3: Revisão]
  → Editor rico da minuta com seções
  → MicrophoneButton nas instrucoes_finais
  → Autosave 30s

[Step 4: Geração]
  → useGerarPeticao → callWebhook('mdflow/olivia/express', payload completo)
  → Polling em olivia_historico (status: PENDENTE → EM_PROGRESSO → SUCESSO/ERRO)
  → ProgressSubsteps com substeps visuais

[Step 5: Conclusão]
  → ConclusaoResultado: métricas (score, modelo, tokens, custo, tempo)
  → RelatorioCasoAccordion: visão geral + fortes/fracos + riscos + chance + recomendações + docs faltantes
  → Download DOCX (docx@8 — ZIP válido)
  → Abrir Google Docs
```

### 3.2 Análise de Provas (ANALISE-V4)

- Disparada automaticamente ao avançar do Step 1 quando `modelo_tem_tags=true`
- Endpoint: `mdflow/olivia/analise` → workflow `OLIVIA-ANALISE-V4`
- Retorna:
  - `analise_tags[]`: `{ id, bloco_id, confianca }` — mapeamento tag→bloco com confiança
  - `peticao_base.blocos_resolvidos[]`: blocos já resolvidos pela IA, com `conteudo_html` e `confianca`
- Polling via Supabase `olivia_analises` (realtime ou interval 2s, timeout 5min)
- Frontend exibe overlay animado com `Progress` bar baseado nas mensagens de progresso

### 3.3 Triagem Inteligente

- `analise_tags` com `confianca >= 0.7` → pré-preenchimento automático de respostas
- `perguntasFiltradas`: omite perguntas já cobertas com alta confiança
- `todasAltaConfianca`: quando zero perguntas restam → exibe badge Sparkles + botão "Concluir Triagem" direto
- `processo_context` enviado ao webhook de triagem contém: identificação, restrição, partes (cliente + empresa), financeiro, tribunal/vara, resumo IA, `analise_id` + `analise_resultado`

### 3.4 Race Condition no Login (fix crítico)

- **Problema:** após login, `ProtectedRoute` via vê `user=null` e redireciona de volta ao `/login`
- **Fix:** `flushSync()` em `auth_context.tsx` — garante que React commita `setUser` + `setOrgSuspended` de forma síncrona antes do `navigate()`

---

## 4. Arquivos Criados / Modificados

### Commit principal desta conversa: `f5188a40` + `0efa8055` (2026-03-17)

| Arquivo | Tipo | O que mudou |
|---|---|---|
| `src/contexts/auth_context.tsx` | fix crítico | `flushSync` no `handleLogin` e `handleAdminLogin` — elimina race condition com ProtectedRoute |
| `src/pages/olivia/components/analise/UploadArea.tsx` | feature | `maxFiles=50`, `maxSizeMB=100` — bulk upload habilitado; texto atualizado para "sem limite de documentos" |
| `src/pages/olivia/components/gerador/OliviaGeradorIA.tsx` | feature | Loading overlay animado com `<Progress>` bar durante análise; lógica `analiseObrigatoriaParaAvancar` usando `modelo_tem_tags`; botão Avançar desabilitado enquanto `isLoadingAnalise=true` |
| `src/pages/olivia/components/gerador/steps/StepRevisao.tsx` | feature | `MicrophoneButton` adicionado ao campo `instrucoes_finais` (transcrição acumula no campo) |
| `src/pages/olivia/components/gerador/steps/StepTriagem.tsx` | feature/refactor | Pré-fill de alta confiança; `perguntasFiltradas` (useMemo); `blocosResolvidos` para preview; layout 2 colunas com `ScrollArea`; MicrophoneButton por pergunta texto; `processo_context` expandido com 30+ campos; badge `todasAltaConfianca` |
| `src/pages/olivia/components/gerador/steps/conclusao/ConclusaoResultado.tsx` | feature | `RelatorioCasoAccordion` completo — renderiza `metricsData.meta.relatorio_processo` gerado pelo Opus: visão geral, pontos fortes/fracos, riscos processuais, chance de sucesso, recomendações, documentos faltantes |
| `workflow-ids.md` | doc | Criado na raiz do repo — IDs dos workflows principais |

### Hooks e libs principais

| Arquivo | Função |
|---|---|
| `src/hooks/olivia/useWizardTabs.ts` | Estado central do wizard; controla `isLoadingAnalise`, `loadingAnaliseMsg`, `modelo_tem_tags`, polling da análise, criação de `olivia_historico` |
| `src/hooks/olivia/useGerarPeticao.ts` | Dispara o webhook `prod-olivia-express`; constrói `buildProcessoContext` + `buildTriagemRespostas` |
| `src/hooks/olivia/useRelatorioProcesso.ts` | Busca relatório do processo para exibir métricas na conclusão |
| `src/lib/webhook.ts` | `callWebhook()` — wrapper genérico com auth header `mdflow`, timeout configurável, suporte 202 Accepted |
| `src/lib/jarbas-url.ts` | `JARBAS_BASE_URL` + `JARBAS_AUTH` — base URL do JARBAS para chamadas diretas |

---

## 5. Estado Atual

### ✅ Funcional

- Wizard completo 5 etapas (Identificação → Triagem → Revisão → Geração → Conclusão)
- Integração frontend ↔ `prod-olivia-express` via `callWebhook('mdflow/olivia/express')`
- ANALISE-V4 dispara automaticamente quando `modelo_tem_tags=true`
- Pré-fill de respostas por confiança ≥ 0.7
- Filtragem de perguntas já respondidas com alta confiança
- Layout 2 colunas com preview da petição base
- Loading overlay animado com Progress bar
- MicrophoneButton em perguntas texto + instrucoes_adicionais + instrucoes_finais
- `RelatorioCasoAccordion` na conclusão (visão geral, fortes/fracos, riscos, chance de sucesso)
- Bulk upload (50 arquivos / 100MB por arquivo)
- Race condition login corrigida com `flushSync`
- Download DOCX via `docx@8` (ZIP válido)
- Google Docs fallback

### ⚠️ Pendente / A verificar

- **StepConclusao → `metricsData.meta.relatorio_processo`**: confirmado que o select do Supabase já inclui `meta` — mas depende do `prod-olivia-express` popular `relatorio_processo` dentro do JSONB `meta` na coluna `olivia_historico`. Verificar se o Opus está de fato gerando e salvando esse campo no workflow n8n.
- **Timeout de análise**: polling com timeout de 5min — se ANALISE-V4 demorar mais que isso, wizard trava em loading. Avaliar aumentar ou adicionar botão "pular análise".
- **`analise_resultado` no wizard state**: salvo para envio ao webhook de geração, mas não há fallback explícito se a análise for `null` e `modelo_tem_tags=true`.
- **Tests E2E**: `tests/e2e/crm.spec.ts` existe mas não há E2E cobrindo o fluxo completo do Express. Recomendado criar.

### ❌ Bugs conhecidos / débitos

- `test-results/` e `scripts/olivia_*.mjs` não commitados — estão no `.gitignore` implícito ou pendentes de decisão se vão para o repo
- `loadingAnaliseMsg` no `OliviaGeradorIA.tsx` usa `.includes()` para calcular porcentagem do Progress — frágil se as mensagens mudarem no hook

---

## 6. Decisões Arquiteturais

| Decisão | Motivo |
|---|---|
| `modelo_tem_tags` controla se análise é obrigatória | Modelos simples (sem tags) não precisam de análise prévia — avançam direto, reduzindo fricção |
| Pré-fill com confiança ≥ 0.7 | Threshold conservador: abaixo disso o usuário confirma manualmente. Evita erros silenciosos em casos ambíguos |
| Layout 2 colunas no Step 2 quando há preview | UX: o advogado vê a petição base sendo construída em tempo real enquanto responde as perguntas restantes |
| `flushSync` no auth_context | React 18 batching causava race condition — `flushSync` força commit síncrono antes do `navigate()` |
| `processo_context` rico (30+ campos) | A IA precisa de máximo contexto para gerar petições precisas sem depender de Q&A adicional |
| `instrucoes_adicionais` + `instrucoes_finais` unificados no payload | Permite que o advogado complemente a instrução em dois momentos (Step 2 e Step 3) — o backend recebe tudo concatenado |
| `RelatorioCasoAccordion` colapsável | Não sobrecarrega a tela de conclusão — o relatório fica disponível mas não intromete no fluxo principal |
| Bulk upload 50 arquivos / 100MB | Necessidade de processos com muitos documentos (e.g. INSS, bancário) — limite anterior de 5/10MB era impeditivo |

---

## 7. Integrações com Outros Sistemas

| Sistema | Como integra | Arquivo |
|---|---|---|
| **n8n** (Railway) | `callWebhook()` com bearer header `mdflow` | `src/lib/webhook.ts` |
| **Supabase** | Polling `olivia_analises` + `olivia_historico`; queries via `supabase-js` | `useWizardTabs.ts`, `StepConclusao.tsx` |
| **Google Docs** | URL retornada pelo n8n em `google_doc_url` (top-level e fallback `meta` JSONB) | `StepConclusao.tsx` |
| **DOCX (docx@8)** | `downloadDocxReal()` — gera ZIP OOXML válido no browser | `src/lib/download-docx.ts` |
| **MicrophoneButton** | Componente compartilhado que usa Whisper/Web Speech para transcrição | `src/components/shared/MicrophoneButton.tsx` |
| **JARBAS (Mac Mini)** | Chamadas diretas via `JARBAS_BASE_URL` para `/olivia/criar-doc`, `/olivia/upload-documento` etc. | `src/lib/jarbas-url.ts` |

---

## 8. Pontos de Atenção / Riscos / Débitos Técnicos

### 🔴 Alto
- **`relatorio_processo` no Opus**: a UI está preparada para renderizar, mas depende do n8n popular esse campo no `meta` JSONB do `olivia_historico`. Se o campo não existir → accordion não aparece (defensivo), mas o valor do relatório é perdido. **Verificar no workflow.**

### 🟡 Médio
- **Timeout 5min na análise**: usuários com conexão lenta ou ANALISE-V4 sobrecarregado ficam presos no overlay. Considerar botão "pular análise / tentar depois".
- **`loadingAnaliseMsg.includes()`**: frágil. Substituir por enum de estados ou valor numérico de progresso retornado diretamente pelo webhook.
- **Race entre abas do wizard**: `useWizardTabs` gerencia múltiplas abas — se o usuário abrir 2 abas com análises simultâneas, o `analiseAbortRef` pode conflitar. Baixo risco em uso real.

### 🟢 Baixo / Débitos Futuros
- Adicionar E2E Playwright cobrindo fluxo completo Express (Step 1→5)
- `scripts/olivia_*.mjs` (15 scripts de setup/seed) — decidir se entram no repo ou ficam locais
- `workflow-ids.md` criado no repo — manter atualizado conforme novos workflows são criados

---

## 9. Commits desta Sprint (2026-03-15 a 2026-03-17)

```
f5188a40  feat(olivia/express): correções finais + lapidações pós-deepreview
446640be  feat(olivia/analise-v4): frontend integration — modelo_grupo_id + badges peticao_base/relatorio
d9d7ad10  fix(olivia/smart-blocks): modelo_id→olivia_modelos_grupo (FK correto)
d3a8e1ec  fix(olivia/smart-blocks): status inicial PENDENTE
f7d4cf31  fix(olivia/smart-blocks): polling correto com historico_id
29f94d95  fix(olivia/smart-blocks): P1 polling bug + Step2 bugs de tipo
```

---

*Gerado por JANA 🦊 | MacBook Air M4 | 2026-03-17 00:50 BRT*
*Repo: github.com/mdlab-christian/beta-mdflow | Branch: main*
