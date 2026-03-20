# SPEC — OlivIA Modo Agente v2.0
> Gerada por JANA em 2026-03-17 | Commit base: `1295ae9e` | Branch: `main`
> Repo: `beta-mdflow` | Skill local: `~/Desktop/modo-agente/`

---

## 1. ESTADO ATUAL

### Conclusão estimada: **~72%**

| Área | Status | % |
|---|---|---|
| Frontend wizard (4 steps) | ✅ Funciona | 90% |
| Triagem via JANA (HTTP sync) | ✅ Testado e funcionando | 95% |
| Geração via JARBAS (fire-and-forget) | ⚠️ Implementado, NÃO testado E2E | 50% |
| Polling `olivia_historico` | ✅ Implementado | 85% |
| Google Doc (via JARBAS `/olivia/criar-doc`) | ⚠️ Implementado no skill, NÃO testado | 40% |
| StepConclusaoAgente — exibir resultado | ⚠️ Parcialmente testado | 60% |
| Score do revisor | ⚠️ Implementado, nunca testado | 40% |
| `gerarPeticaoAgente` (SSE local do server.mjs) | ❌ Não utilizado pelo frontend atual | 0% |

---

### Bugs conhecidos

#### P0 — Bloqueante para uso

| ID | Descrição técnica |
|---|---|
| P0-01 | **JARBAS `/olivia/gerar-modo-agente` não existe** — o endpoint chamado pelo `useOliviaAgente.ts` linha 183 é `JARBAS_BASE_URL/olivia/gerar-modo-agente`. Esse endpoint **não está implementado no JARBAS** (`jarbas.jarbas-mdlab.com`). O `server.mjs` da JANA expõe `/olivia/gerar-agente` (SSE local), mas o hook atual chama o JARBAS. A geração nunca conclui. |
| P0-02 | **`olivia_historico` inserido com `status: 'PENDENTE'` mas nunca atualizado** — o JARBAS precisaria atualizar o registro para `SUCESSO` ou `ERRO` depois de gerar. Sem o endpoint no JARBAS, o polling nunca sai de `PENDENTE`. Timeout após 5min. |
| P0-03 | **`salvarHistorico` no skill faz INSERT em vez de UPDATE** — o hook cria `olivia_historico` (com `historico_id`) antes de chamar o JARBAS, mas a skill do JARBAS chama `salvarHistorico` que insere um novo registro independente. O polling escuta o ID do primeiro; o resultado fica no ID do segundo. Nunca convergem. Fix: trocar para `UPDATE ... WHERE id = historico_id`. |

#### P1 — Defeito grave, workaround existe

| ID | Descrição técnica |
|---|---|
| P1-01 | **Motor anunciado como JANA, geração roda no JARBAS** — `gerarTriagem` usa JANA (correto), mas `gerarPeticao` sempre chama JARBAS. O badge "Motor: JANA" no Step 4 está errado quando `motorAtivo='jana'`. |
| P1-02 | **`skill_olivia_agente_v2.mjs` usa `ORG_ID` hardcoded** — linha 16: `const ORG_ID = process.env.ORG_ID`. Não usa o `organizacao_id` recebido no payload para a maioria das queries. Multitenancy quebrado. |

#### P2 — Funcional mas imperfeito

| ID | Descrição técnica |
|---|---|
| P2-01 | **E2E Step 2 → triagem requer modelo com versão publicada** — `olivia_modelos_grupo` filtrado por `status='published'`. Em dev, os modelos não têm versões publicadas. Triagem carrega, mas seleção de modelo falha silenciosamente. |
| P2-02 | **`StepConclusaoAgente` — `ConclusaoResultado` exibido só se `peticao_html` existir** — se JARBAS salvar em `texto_gerado` (não em `peticao_html`), o componente exibe apenas o fallback de "Petição gerada!" sem o texto. |
| P2-03 | **`StepRevisao` no Modo Agente** — componente original do wizard clássico (usa `useWizardTabs`). Tem lógica de geração IA que não se aplica ao Modo Agente. Pode conflitar. |

#### P3 — Cosmético / minor

| ID | Descrição técnica |
|---|---|
| P3-01 | Botão "Continuar" no Step 1 exige `advogado_id` não-nulo, mas o campo é nullable na geração. |
| P3-02 | `useEffect` de limpeza `jana.reset()` ao desmontar pode cancelar polling se usuário navegar para fora antes de concluir. Sem toast de aviso. |

---

### O que foi testado e confirmado ✅
- Build TypeScript sem erros (`npm run build` em 9.7s)
- `GET /health` no `server.mjs` (porta 18788) respondendo
- `POST /olivia/gerar-triagem` via JANA: recebe payload, retorna perguntas estruturadas (testado com Cumprimento de Sentença)
- Step 1 (Identificação): carrega processos, tipos, modelos; validação de modelo sem versão publicada funciona (bloqueia corretamente)
- Frontend monta sem erros de runtime em `localhost:5173/olivia/gerador/modo-agente`
- Perguntas boolean com `obrigatorio: false` não bloqueiam mais o avanço

### O que NUNCA foi testado até o fim ❌
- Geração completa Steps 2 → 3 → 4 com petição gerada
- Google Doc criado e URL retornada
- Score do revisor exibido em `StepConclusaoAgente`
- `ConclusaoResultado` com HTML real
- Fallback JARBAS na triagem (JANA offline → JARBAS)
- Timeout de 5min (polling expira com mensagem de erro)

---

## 2. ARQUITETURA FRONTEND

### Orquestrador principal
```
~/beta-mdflow/src/pages/olivia/components/gerador/OliviaGeradorAgente.tsx
```
Rota: `/olivia/gerador/modo-agente`

### Hook principal
```
~/beta-mdflow/src/hooks/olivia/useOliviaAgente.ts
```
Hook dedicado ao Modo Agente — **NÃO usa `useWizardTabs` para geração**, apenas para estado do Step 1.

### Steps do Wizard

| Step | Índice | Key | Componente | Arquivo |
|---|---|---|---|---|
| Identificação | 0 | `identificacao` | `<StepIdentificacao>` | `gerador/steps/StepIdentificacao.tsx` |
| Análise & Triagem | 1 | `triagem` | `<StepAnaliseTriagem>` | `gerador/steps/StepAnaliseTriagem.tsx` |
| Revisão | 2 | `revisao` | `<StepRevisao>` | `gerador/steps/StepRevisao.tsx` |
| Gerar | 3 | `conclusao` | `<StepConclusaoAgente>` | `gerador/steps/StepConclusaoAgente.tsx` |

### Estado gerenciado

#### `useOliviaAgente` — estado de geração
```typescript
OliviaAgenteStatus {
  step: 'idle' | 'triagem_loading' | 'gerando' | 'concluido' | 'erro'
  pct: number               // 0–100
  msg: string               // mensagem de progresso
  historico_id?: string     // UUID do olivia_historico
  google_doc_url?: string
  score?: number
  erro?: string
}
motorAtivo: 'jana' | 'jarbas'
```

#### `useWizardTabs` — campos usados pelo Modo Agente
```typescript
WizardState {
  processo_id: string | null
  numero_cnj: string | null
  tipo_peticao_id: string | null
  modelo_id: string | null          // olivia_modelos_peticao.id
  modelo_grupo_id: string | null    // olivia_modelos_grupo.id
  versao_id: string | null
  advogado_id: string | null
  dados_processo: DadosProcesso | null
}
```

#### `triagemData` — estado local do orquestrador
```typescript
{
  perguntas: TriagemPerguntaAgente[]
  respostas: Record<string, unknown>
  instrucoes_adicionais: string
  arquivos_uploads: Array<{ path: string; url: string; mime: string }>
}
```

#### `TriagemPerguntaAgente` — estrutura de pergunta de triagem
```typescript
{
  id: string
  tipo: 'boolean' | 'select' | 'multi_select' | 'currency' | 'text' | 'date'
  pergunta: string
  resposta_sugerida?: unknown
  confidence?: number       // 0.0–1.0
  fonte?: string
  obrigatorio?: boolean
  opcoes?: string[]         // para select/multi_select
  precisa_revisao?: boolean
}
```

### Componentes críticos

| Componente | Caminho completo |
|---|---|
| `OliviaGeradorAgente` (orquestrador) | `src/pages/olivia/components/gerador/OliviaGeradorAgente.tsx` |
| `StepIdentificacao` | `src/pages/olivia/components/gerador/steps/StepIdentificacao.tsx` |
| `StepAnaliseTriagem` | `src/pages/olivia/components/gerador/steps/StepAnaliseTriagem.tsx` |
| `StepRevisao` | `src/pages/olivia/components/gerador/steps/StepRevisao.tsx` |
| `StepConclusaoAgente` | `src/pages/olivia/components/gerador/steps/StepConclusaoAgente.tsx` |
| `ConclusaoResultado` | `src/pages/olivia/components/gerador/steps/conclusao/ConclusaoResultado.tsx` |
| `GeracaoProgress` | `src/pages/olivia/components/gerador/shared/GeracaoProgress.tsx` |
| `WizardStepper` | `src/pages/olivia/components/gerador/shared/WizardStepper.tsx` |
| `useOliviaAgente` | `src/hooks/olivia/useOliviaAgente.ts` |
| `useWizardTabs` | `src/hooks/olivia/useWizardTabs.ts` |
| `JANA_BASE_URL` / `JANA_AUTH` | `src/lib/jana-url.ts` |
| `JARBAS_BASE_URL` / `JARBAS_AUTH` | `src/lib/jarbas-url.ts` |

---

## 3. BACKEND E INTEGRAÇÕES

### Workflows n8n
**Nenhum workflow n8n** é usado no Modo Agente. O backend é direto via HTTP para JANA/JARBAS.

---

### Endpoints chamados pelo frontend

#### 1. Health check JANA (antes da triagem)
```
GET https://jana.jarbas-mdlab.com/health
Timeout: 5000ms
Response: { ok: true, service: 'olivia-agente-v2', ts: number }
```

#### 2. Triagem — síncrono via JANA (fallback JARBAS)
```
POST https://jana.jarbas-mdlab.com/olivia/gerar-triagem
POST https://jarbas.jarbas-mdlab.com/olivia/gerar-triagem   (fallback se JANA offline)
Header: mdflow: MdL1501@
Timeout: 120s
Body: {
  processo_id: string,
  modelo_id: string,         // olivia_modelos_peticao.id ou olivia_modelos_grupo.id
  organizacao_id: string,
  arquivos?: [{ path: string, url: string, mime: string }]  // máx 5
}
Response: {
  ok: true,
  perguntas: TriagemPerguntaAgente[],
  analise_provas: {
    resultado: string,
    pontos_relevantes: string[],
    restricao_info: { orgao_nome: string|null, valor: number|null, data: string|null, contrato: string|null },
    arquivos_analisados: number,
    fallback_usado: string
  } | null
}
```

#### 3. Geração — fire-and-forget via JARBAS ⚠️ ENDPOINT NÃO IMPLEMENTADO
```
POST https://jarbas.jarbas-mdlab.com/olivia/gerar-modo-agente
Header: mdflow: MdL1501@
Timeout: 30s (fire-and-forget — não aguarda resultado)
Body: {
  organizacao_id: string,
  historico_id: string,          // UUID criado pelo frontend ANTES da chamada
  modelo_grupo_id: string,       // olivia_modelos_grupo.id
  advogado_id: string | null,
  processo_context: {
    processo: { id, numero_cnj, reu_nome, objeto, clientes, empresas },
    cliente: object | null
  },
  triagem_respostas: Record<string, unknown>,
  instrucoes_adicionais: string,
  provas_urls: string[]
}
// JARBAS deve: processar e fazer UPDATE olivia_historico SET status='SUCESSO'|'ERRO' WHERE id=historico_id
```

#### 4. Google Doc — chamado internamente pelo skill (não pelo frontend)
```
POST https://jarbas.jarbas-mdlab.com/olivia/criar-doc   (ou http://192.168.15.78:3012/olivia/criar-doc)
Header: mdflow: MdL1501@
Timeout: 60s
Body: {
  titulo_documento: string,
  google_folder_id: '1JTbKJqbmPzRTLlqRYZEZ5pNY-w8r1ALZ',
  peticao_html: string,
  tags: {}
}
Response: { google_doc_url: string }
```

---

### Polling — como o frontend sabe que terminou

**Tabela:** `olivia_historico`
**Campo:** `status`
**Valores:** `PENDENTE` → `EM_PROGRESSO` → `SUCESSO` | `ERRO`
**Intervalo:** 3000ms (`POLL_INTERVAL_MS`)
**Timeout:** 300.000ms / 5min (`TASK_TIMEOUT_MS`)
**Campos lidos:** `status`, `score_revisor`, `google_doc_url`, `peticao_html`, `texto_gerado`, `error_message`

**Fluxo esperado:**
1. Frontend cria `olivia_historico` com `status='PENDENTE'` → recebe `historico_id`
2. Frontend chama JARBAS fire-and-forget com `historico_id` no body
3. JARBAS processa e faz `UPDATE olivia_historico SET status='SUCESSO', peticao_html=..., google_doc_url=... WHERE id=historico_id`
4. Frontend polling detecta `status='SUCESSO'` → conclui com `historico_id` + `google_doc_url`

---

### Google Drive

| Campo | Valor |
|---|---|
| Folder ID | `1JTbKJqbmPzRTLlqRYZEZ5pNY-w8r1ALZ` |
| Quem cria | JARBAS via `/olivia/criar-doc` |
| Chamado por | `finalizarGoogleDoc()` em `skill_olivia_agente_v2.mjs` |
| Credencial | `~/Desktop/modo-agente/google-credentials.json` |

---

### JANA — Skill local (servidor HTTP)

| Item | Valor |
|---|---|
| Skill | `~/Desktop/modo-agente/skill_olivia_agente_v2.mjs` |
| Server | `~/Desktop/modo-agente/server.mjs` |
| Porta | `18788` |
| Tunnel público | `https://jana.jarbas-mdlab.com` |
| Subir | `node ~/Desktop/modo-agente/server.mjs` |

**Endpoints expostos pelo server.mjs:**

| Endpoint | Tipo | Função exportada | Status |
|---|---|---|---|
| `GET /health` | JSON | — | ✅ OK |
| `POST /olivia/gerar-triagem` | JSON síncrono | `gerarTriagemEndpoint()` | ✅ OK |
| `POST /olivia/gerar-agente` | SSE | `gerarPeticaoAgente()` | ⚠️ Não usado pelo frontend |

---

## 4. BANCO DE DADOS (SUPABASE)

### Tabelas usadas

| Tabela | Campos relevantes | Uso |
|---|---|---|
| `olivia_historico` | `id`, `processo_id`, `modelo_id`, `organizacao_id`, `advogado_id`, `modo`, `status`, `motor`, `user_id`, `peticao_html`, `texto_gerado`, `score_revisor`, `google_doc_url`, `error_message`, `meta` | Registro de geração + polling de status |
| `olivia_modelos_grupo` | `id`, `nome`, `tipo_peticao_id`, `status`, `organizacao_id`, `deleted_at` | Filtro Step 1 — apenas `status='published'` |
| `olivia_modelos_peticao` | `id`, `instrucoes_ia` | Detectar se modelo tem tags (triagem obrigatória) |
| `processos` | `id`, `numero_cnj`, `reu_nome`, `objeto`, `clientes(nome, cpf)`, `empresas(nome)` | Contexto do processo para skill |
| `processos_documentos` | `url`, `tipo`, `nome` | Documentos para análise Vision na triagem |
| `processos_movimentacoes` | (join) | Contexto histórico do processo para prompt |
| `advogados` | `id`, `nome`, `oab`, `oab_uf`, `ativo` | Seleção no Step 1 + rodapé da petição |
| `documentos` (Storage) | bucket `documentos`, path: `{org_id}/{processo_id}/triagem/...` | Upload de provas no Step 2 |

### Status de conclusão — `olivia_historico.status`

| Valor | Significado |
|---|---|
| `PENDENTE` | Criado pelo frontend, aguardando JARBAS |
| `EM_PROGRESSO` | JARBAS processando (opcional — não obrigatório) |
| `SUCESSO` | Geração concluída — `peticao_html` + `google_doc_url` preenchidos |
| `ERRO` | Falha — `error_message` preenchido |

### Estrutura do campo `meta` (JSON)
```json
{
  "relatorio_processo": { ... },
  "analise_provas": { ... },
  "pipeline_ms": 45000,
  "redator": {
    "model": "claude-sonnet-4-6",
    "tokens_in": 12000,
    "tokens_out": 3000,
    "cost": 0.045
  }
}
```

### RLS
- `olivia_historico`: RLS ativo — `organizacao_id` deve coincidir com o usuário autenticado
- `olivia_modelos_grupo`: filtro manual por `organizacao_id` nas queries (sem RLS específico identificado)

---

## 5. DECISÕES TOMADAS NESTA CONVERSA

| Decisão | Motivo |
|---|---|
| **Arquitetura fire-and-forget + polling** (não SSE end-to-end) | SSE direto JANA→frontend era frágil (conexão longa, problemas de reconexão). Polling em `olivia_historico` é mais robusto e já funciona no modo clássico. |
| **Triagem via JANA com fallback JARBAS** | JANA é mais rápida para tarefas síncronas de 30–60s. JARBAS é fallback 24/7. |
| **Geração sempre via JARBAS** | Geração completa leva 45–90s e usa muita CPU. JARBAS (Mac Mini M4 24/7) é o motor certo. |
| **`historico_id` criado pelo frontend** | Permite ao frontend começar a fazer polling imediatamente sem depender de resposta do JARBAS. |
| **Perguntas boolean com `obrigatorio: false`** | Boolean tipo Switch sempre tem valor (true/false). Não faz sentido bloquear avanço por campo "obrigatório" que nunca fica "vazio". Corrigido em `1295ae9e`. |
| **`user_id` em vez de `criado_por`** | Campo real da tabela `olivia_historico`. Corrigido em `1295ae9e`. |
| **`handleContinuar` ignora boolean na validação** | Evita que switch "false" seja tratado como "não respondido". Corrigido em `1295ae9e`. |
| **Score revisor incluído no resultado** | Exibido como Badge no `StepConclusaoAgente` — qualidade percebida pelo advogado. |
| **`server.mjs` na porta 18788** | 18789 = OpenClaw JANA; 3012 = JARBAS. Porta dedicada sem conflito. |
| **Descartado: SSE frontend←JANA direto** | Substituído por polling. Exige conexão persistente, falha em reconnects. Commit `2afe9440`. |
| **Descartado: `gerarPeticaoAgente` SSE como caminho principal** | O `server.mjs` expõe `/olivia/gerar-agente` (SSE), mas o frontend não o usa. Geração delegada ao JARBAS via endpoint específico. |

---

## 6. O QUE FALTA PARA 100%

### Tarefas priorizadas

#### P0 — Bloqueante (sem isso não funciona)

| # | Tarefa | Arquivo | Estimativa |
|---|---|---|---|
| 1 | **Implementar endpoint `/olivia/gerar-modo-agente` no JARBAS** — recebe o payload do frontend, executa a skill de geração, faz `UPDATE olivia_historico SET status='SUCESSO', peticao_html=..., google_doc_url=... WHERE id=historico_id` | JARBAS: `~/jarbas/src/skills/` | 2–3h |
| 2 | **Trocar `salvarHistorico` por UPDATE no skill** — usar `historico_id` do payload. Trocar `.insert({...})` por `.update({status: 'SUCESSO', peticao_html, google_doc_url, ...}).eq('id', historico_id)` | `~/Desktop/modo-agente/skill_olivia_agente_v2.mjs` | 30min |

#### P1 — Importante

| # | Tarefa | Arquivo | Estimativa |
|---|---|---|---|
| 3 | **Corrigir `ORG_ID` hardcoded no skill** — substituir `ORG_ID` por `organizacao_id` do payload em todas as queries Supabase | `skill_olivia_agente_v2.mjs` | 30min |
| 4 | **Teste E2E completo** — publicar modelo em `/playbooks → Modelos`, rodar wizard completo, verificar Google Doc gerado | Manual | 1h |
| 5 | **Avaliar `StepRevisao` no contexto do Modo Agente** — confirmar se funciona como step de "revisão livre" ou se precisa de versão simplificada sem lógica do wizard clássico | `steps/StepRevisao.tsx` | 1–2h |

#### P2 — Melhoria

| # | Tarefa | Arquivo | Estimativa |
|---|---|---|---|
| 6 | **Corrigir badge `motorAtivo` no Step 4** — `gerarPeticao` sempre usa JARBAS; badge deve refletir isso independentemente do motor da triagem | `OliviaGeradorAgente.tsx` | 15min |
| 7 | **`ConclusaoResultado` com fallback para `texto_gerado`** — se `peticao_html` nulo, usar `texto_gerado` | `StepConclusaoAgente.tsx` | 30min |
| 8 | **`advogado_id` não deve bloquear botão Continuar** — torná-lo opcional no footer do Step 1 | `OliviaGeradorAgente.tsx` | 15min |

#### P3 — Nice to have

| # | Tarefa | Estimativa |
|---|---|---|
| 9 | Toast "geração em andamento" ao navegar para fora durante polling | 30min |
| 10 | Exibir progresso estimado com base em timestamps do `meta` do histórico | 1h |

### Dependências
```
Tarefa 1 → Tarefa 2 → Tarefa 4
Tarefa 3 → Tarefa 4
Tarefa 5 → (independente, testar junto com Tarefa 4)
Tarefas 6, 7, 8 → independentes entre si
```

### Resumo executivo
O frontend está ~90% pronto. O bloqueio crítico é implementar o endpoint `/olivia/gerar-modo-agente` no JARBAS e corrigir o `salvarHistorico` de INSERT para UPDATE. Com as tarefas 1–3 concluídas (estimado: **3–4h**), o modo vai de **72% → ~95%**. Restante é teste E2E + polish.

---

## 7. ARQUIVOS E RELATÓRIOS

### Commits relevantes — branch `main`, repo `beta-mdflow`

| Hash | Descrição |
|---|---|
| `1295ae9e` | fix(olivia): modo agente v2.0 — boolean obrigatorio false, user_id corrigido, validacao triagem ignora boolean |
| `2afe9440` | fix(olivia-agente): usa polling olivia_historico — remove SSE incorreto |
| `bd727042` | fix(olivia-agente): mensagens de erro mais descritivas no hook useOliviaAgente |
| `f08d09ef` | feat(olivia-agente): OliviaGeradorAgente — resumo processo no header, motorAtivo propagado para StepConclusaoAgente |
| `0a182435` | feat(olivia-agente): StepConclusaoAgente + GeracaoProgress — pipeline steps, tempo estimado, badge motor |
| `b2f2be52` | feat(olivia-agente): StepAnaliseTriagem — layout 2 colunas, indicador confiança, lista arquivos com remover, resumo processo |
| `683686cc` | fix(olivia-agente): corrige endpoint gerar-triagem — remove sufixo -agente incorreto |
| `8d30f893` | feat: OlivIA Modo Agente v2.0 — wizard 4 steps com SSE, Vision e triagem integrada |

### Arquivos locais (não versionados no repo)

| Arquivo | Localização |
|---|---|
| Skill backend principal | `~/Desktop/modo-agente/skill_olivia_agente_v2.mjs` |
| HTTP Server (porta 18788) | `~/Desktop/modo-agente/server.mjs` |
| Google credentials | `~/Desktop/modo-agente/google-credentials.json` |
| Este arquivo | `~/Desktop/modo-agente/SPEC_MODO_AGENTE.md` |
| Spec original (referência) | `~/Desktop/modo-agente/SPEC.md` |
| Status de sessão | `~/Desktop/modo-agente/STATUS.md` |

### Relatórios HTML
Nenhum relatório HTML foi gerado nesta conversa.

---

*SPEC gerada por JANA 🦊 — 2026-03-17 23:20 GMT-3*
