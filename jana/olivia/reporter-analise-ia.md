# Reporter: Módulo OLIVIA — Análise IA (V3 → V4)
> Gerado por JANA 🦊 em 2026-03-17 | Grupo: [JN] Analise IA (-5170047431)

---

## 1. Contexto Geral

Este relatório cobre o trabalho de **revisão arquitetural, diagnóstico de regressões e planejamento da V4** do módulo de **Análise IA da Olivia** — o motor que analisa documentos jurídicos (PDFs) de um processo e gera um relatório estratégico para o advogado.

O trabalho consistiu em:
1. Documentar e auditar a **V3 atual** (workflow `8ntAvTGMhCfrlfRt`)
2. Comparar com a **V1 de referência** (`TupOpRfZXkTHzzEuBOk7f`) para identificar regressões
3. Gerar um **plano técnico completo da V4** com sprints priorizados
4. Corrigir o **endpoint do frontend** que estava apontando para o path errado

---

## 2. Workflows N8n Envolvidos

| ID | Nome | Status | Função |
|----|------|--------|--------|
| `8ntAvTGMhCfrlfRt` | OLIVIA-ANALISE-V4 | ✅ Ativo | Workflow principal de análise — recebe webhook, processa docs, chama Claude, persiste resultado |
| `TupOpRfZXkTHzzEuBOk7f` | (V1 referência) | — | Versão antiga com Vision, Mistral OCR e Opus — usada como referência de qualidade |

### Fluxo do `OLIVIA-ANALISE-V4` (nó a nó)

```
A. Entrada + Validação
  WH-Analise           → Webhook POST /mdflow/olivia/analise
  A1-LogWebhook-INSERT → Loga request em webhook_requests (Supabase)
  A2-ValidatePayload   → Valida campos obrigatórios
  A3-PayloadValido?    → Branch: válido → continua | inválido → Respond-Error
  A4-INSERT-olivia_analises → Cria registro com status=PROCESSANDO
  A-Respond-202        → Responde 202 imediatamente (async)

B. Contexto do Processo
  B1-HTTP-Processo     → Busca processo + dados no Supabase
  B1-HTTP-AnaliseAnt   → Busca análises anteriores
  B1-Process           → Consolida dados do processo
  B2-HTTP-Tags         → fn_get_tags_and_blocos_for_context → tags/blocos relevantes
  B2-Process           → Processa tags
  B3-HTTP-Playbook     → fn_get_playbook_for_context → playbook jurídico
  B3-Process           → Processa playbook
  B4-UPDATE-Classificando → Atualiza status → CLASSIFICANDO

C. Extração de Documentos
  C1-SplitDocs         → Split array de docs
  C2-Loop-Docs         → Loop por documento
  C1b-HasDocs?         → Branch: tem docs → extrai | sem docs → pula
  C3-FetchArquivo      → Signed URL do Supabase Storage (bucket: processos)
  C3b-DownloadPDF      → Download do PDF
  C4-ExtractPDF        → Extract text do PDF (nativo)
  C5-FormatPDF         → Formata texto
  C5b-NeedsVision?     → Branch: PDF escaneado/ruim → Vision | texto ok → continua
  C6-GeminiVision      → Gemini 2.0 Flash Vision (fallback 1 para PDFs escaneados)
  C7-MistralOCR        → Mistral OCR Latest (fallback 2)
  C8-MergeVision       → Consolida resultado Vision/OCR
  C5c-QualityOK        → Verifica qualidade do texto extraído

D. Consolidação + RAG
  D1-ConsolidarDocs    → Junta todos os docs processados
  D2-UPDATE-50pct      → Atualiza progresso → 50%
  D3-GerarEmbedding    → OpenAI Embeddings do texto consolidado
  D4-BuscarRAG         → fn_rag_search → busca jurisprudências relevantes no banco
  D4b-AggRAG           → Agrega resultados RAG
  D5-MontarPacote      → Monta payload final para Claude

E. Análise Claude
  E1-UPDATE-60pct      → Atualiza progresso → 60%
  E2-PrepararInput-Claude → Monta prompt completo
  E3-Claude-Opus-HTTP  → POST api.anthropic.com/v1/messages (Opus)
  E4-ParseResultado    → Parse do JSON retornado pelo Claude

F. Persistência + Finalização
  F1-PATCH-olivia_analises → Salva resultado completo
  F2-UPDATE-processos  → Atualiza campos no processo
  F3-UPDATE-100pct     → Status → CONCLUIDO, progresso → 100%
  F4-LogWebhook-UPDATE → Log final
  Error Trigger + ErrorHandler → Captura erros, salva status=ERRO
```

---

## 3. Arquitetura e Lógica

### Fluxo de Ponta a Ponta

```
Frontend (UploadProvasInline)
  ↓ POST /webhook/mdflow/olivia/analise
  ↓ { processo_id, organizacao_id, actor_user_id, documentos: [...] }
  
n8n OLIVIA-ANALISE-V4
  ↓ Respond 202 → frontend inicia polling
  ↓ Busca contexto (processo + tags + playbook + análises anteriores)
  ↓ Loop por documento:
       → Extract PDF (nativo)
       → Se escaneado: Gemini Vision → Mistral OCR (triple fallback)
  ↓ Consolida texto de todos os docs
  ↓ Gera embedding → RAG search (jurisprudências)
  ↓ Monta prompt → Claude Opus (análise final)
  ↓ Parse resultado JSON
  ↓ Persiste em olivia_analises + atualiza processos

Frontend (polling olivia_analises)
  ↓ a cada 3s até status=CONCLUIDO|ERRO
  ↓ Exibe resultado
```

### Modelo de IA

- **Claude Opus** (claude-opus-4-6) — análise principal
- **Gemini 2.0 Flash** — Vision/OCR de PDFs escaneados (fallback 1)
- **Mistral OCR Latest** — OCR avançado (fallback 2)
- **OpenAI text-embedding-3-small** — embeddings para RAG

### Tabelas Supabase Envolvidas

| Tabela | Uso |
|--------|-----|
| `olivia_analises` | Registro principal de cada análise (status, resultado, progresso, tokens, custo) |
| `processos` | Dados do processo jurídico — atualizado após análise |
| `webhook_requests` | Log de todas as chamadas ao webhook |
| `olivia_blocos_texto` | Blocos de texto para contexto |
| `clientes`, `leads` | Dados do cliente e restrições |

### Funções RPC (Supabase)

| Função | Uso |
|--------|-----|
| `fn_get_tags_and_blocos_for_context` | Retorna tags e blocos relevantes para o processo |
| `fn_get_playbook_for_context` | Retorna playbook jurídico aplicável |
| `fn_rag_search` | Busca vetorial de jurisprudências |

---

## 4. Arquivos Criados/Modificados

### Frontend (~/beta-mdflow)

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/pages/olivia/components/gerador/steps/UploadProvasInline.tsx` | ✅ Corrigido | Fix endpoint: estava chamando path errado, corrigido para `mdflow/olivia/analise` |
| `src/hooks/olivia/useAnaliseIA.ts` | — | Hook de polling da análise |

### Commits Relevantes

```
68841187  fix(olivia/upload-provas): corrigir endpoint webhook → mdflow/olivia/analise (V4)
```

### Relatórios HTML Gerados (~/jarbas-reports/jana/)

| Arquivo | Conteúdo |
|---------|----------|
| `olivia-analise-v3-doc.html` | Documentação completa da V3 |
| `olivia-analise-arquitetura-review.html` | Review arquitetural V3 vs V1 |
| `olivia-analise-comparativo.html` | Comparativo V1 vs V3 |
| `olivia-analise-v4-plano.html` | Plano técnico da V4 (sprints) |

URLs publicadas:
- https://mdlab-christian.github.io/jarbas-reports/jana/olivia-analise-v3-doc.html
- https://mdlab-christian.github.io/jarbas-reports/jana/olivia-analise-arquitetura-review.html
- https://mdlab-christian.github.io/jarbas-reports/jana/olivia-analise-v4-plano.html

---

## 5. Estado Atual

### ✅ Funcional

- Workflow `OLIVIA-ANALISE-V4` ativo no n8n
- Fluxo completo: webhook → contexto → extração → RAG → Claude → persistência
- Triple fallback de extração: PDF nativo → Gemini Vision → Mistral OCR
- Frontend: endpoint corrigido para `mdflow/olivia/analise`
- Polling do frontend até CONCLUIDO/ERRO

### ❌ Pendente / Bugs Conhecidos

| # | Problema | Impacto | Prioridade |
|---|----------|---------|-----------|
| P0 | **Dados de restrição não injetados no prompt** | Claude analisa sem info de restrição (valor, orgão, contrato) | CRÍTICO |
| P0 | **Tokens e custo sempre 0** no banco | Sem observabilidade de uso/custo | ALTO |
| P1 | **Sonnet em vez de Opus** (nó E3 possivelmente desatualizado) | Qualidade de análise reduzida | ALTO |
| P1 | **Triagem excessiva** — confiança 0.5-0.7 gera perguntas desnecessárias | Experiência ruim | MÉDIO |
| P2 | **Playbook scope errado** — "analise" em vez de "prova" | Contexto jurídico incorreto | MÉDIO |
| P2 | **Campo `relatorio_equipe` ausente** — necessário para Express Etapa 2 | Integração Express incompleta | MÉDIO |

### 🔄 Planejado (V4 Sprint 1)

Ordem de execução recomendada pelo CC:
1. HTTP Request headers (Supabase Auth)
2. Injetar dados de restrição no prompt
3. Confirmar/forçar Claude Opus
4. PDF → Vision (triple fallback já presente, validar fluxo)
5. Fix threshold triagem (0.5-0.7 → proposta, não pergunta)
6. Integração Express (relatorio_equipe + 5 campos)
7. Salvar tokens/custo

---

## 6. Decisões Arquiteturais

| Decisão | Razão |
|---------|-------|
| **Async 202 + polling** | PDFs grandes demoram >30s — resposta síncrona daria timeout |
| **Triple fallback Vision** | PDFs escaneados sem OCR = análise vazia silenciosa — inaceitável em contexto jurídico |
| **Claude Vision nativo** preferível a Gemini→Claude | Elimina perda de contexto na passagem de imagem entre modelos |
| **Gemini File API** para PDF→imagem | Blocker crítico: n8n não converte PDF em imagens nativamente |
| **Classificação antes de extração** (planejado V4) | Doc classificado = extração direcionada = qualidade maior |
| **Resultados por doc no banco imediatamente** (planejado) | Não acumular em memória — resiliência a timeouts |
| **Confiança por bloco, não por documento** (planejado) | Granularidade maior — bloco incerto não contamina doc inteiro |
| **Deduplicação por MD5** (planejado) | Evitar processar o mesmo doc duas vezes |
| **RAG on-demand** vs sempre ativo | Custo/latência — RAG só quando há jurisprudências relevantes |

---

## 7. Integrações com Outros Sistemas

| Sistema | Integração | Detalhe |
|---------|-----------|---------|
| **Supabase** | DB + Storage + RPC | Tabelas: olivia_analises, processos, webhook_requests. Storage: bucket `processos` (PDFs) |
| **Anthropic Claude** | API direta (HTTP) | Opus para análise final. Header: x-api-key |
| **Gemini** | API direta (HTTP) | Gemini 2.0 Flash para Vision de PDFs escaneados |
| **Mistral** | API direta (HTTP) | Mistral OCR Latest como fallback 2 de extração |
| **OpenAI** | API direta (HTTP) | text-embedding-3-small para RAG |
| **Frontend (beta-mdflow)** | Webhook + Polling | POST webhook → polling `olivia_analises` a cada 3s |
| **Módulo Express (Olivia)** | Integração planejada | relatorio_equipe + peticao_base + modelo_template — Sprint 1 |

---

## 8. Pontos de Atenção / Riscos / Débitos Técnicos

### 🚨 Riscos Críticos

1. **PDFs escaneados silenciosamente vazios** — sem Vision ativo e validado, análise retorna string vazia sem erro → advogado recebe relatório inútil
2. **Restrições do cliente ausentes no prompt** — Claude analisa o doc sem saber qual é a dívida real → estratégia jurídica incorreta
3. **Custo não registrado** — sem observabilidade, impossible saber quanto está sendo gasto por análise/cliente

### ⚠️ Débitos Técnicos

1. **V1 e V3 coexistindo** — V1 (TupOpRfZXkTHzzEuBOk7f) ainda existe como referência mas não é o ativo. Risco de confusão.
2. **Edge function `olivia-smart-blocks`** no Supabase ainda tem código legado que não usa o n8n (substituída pelo workflow `hyGajjic2kZBVGvW`)
3. **Threshold de triagem hardcoded** — deve virar configuração por organização
4. **Sem retry automático** em caso de timeout da API Anthropic

### 📋 Próximos Passos Recomendados

1. Validar fluxo Vision de ponta a ponta com PDF escaneado real
2. Injetar `restricao_orgao_nome`, `restricao_valor`, `restricao_contrato` no prompt do Claude
3. Sprint 1 completo (ver seção 5 — Planejado)
4. Deprecar/arquivar V1 após V4 validada

---

*Gerado por JANA 🦊 | 2026-03-17 00:50 GMT-3*
*Grupo: [JN] Analise IA | chat_id: -5170047431*
