# SPEC COMPLETA — OlivIA Gerador: Modo SMART BLOCKS

**Gerada em:** 2026-03-17  
**Por:** JANA 🦊  
**Fonte:** código repo `beta-mdflow` + banco Supabase + n8n + checkpoint sessão anterior  
**Branch ativa:** `fix/crm-rodada3-distribuicao`

---

## 1. ESTADO ATUAL

### % de Conclusão: **85%**

| Camada | Status | Detalhe |
|---|---|---|
| Frontend wizard (3 steps) | ✅ 100% | Funcional, todos os bugs conhecidos corrigidos |
| Webhook → n8n | ✅ 100% | Disparo confirmado, 202 imediato |
| n8n → GAS → Google Doc | ✅ 95% | E2E confirmado, GAS pode ser lento (até 90s) |
| Polling + toast final | ✅ 100% | `google_doc_url` salvo e exibido corretamente |
| Fila (`OliviaFilaTab`) | ✅ 100% | Label "SMART_BLOCKS" correto, botão "Abrir" funciona |
| Blocos personalizados (custom-UUID) | ⚠️ 40% | Frontend aceita, mas n8n ignora — sem feedback claro ao usuário |
| `jurisprudencias_ids` no n8n | ⚠️ 50% | Campo enviado, processamento no n8n não verificado |
| `instrucoes_adicionais` no n8n | ⚠️ 60% | Campo enviado, mapeamento no n8n não confirmado |
| Edge case: modelo sem blocos | ✅ 80% | UI mostra aviso, UX poderia guiar melhor para configuração |
| Limpeza de histórico antigo | ✅ 100% | Auto-cleanup de PENDENTEs > 10min antes de novo INSERT |

---

### Bugs Conhecidos

#### P0 — Bloqueadores de produção
> **Nenhum.** Todos os P0 foram corrigidos na sessão de 2026-03-17.

#### P1 — Importantes, não bloqueadores

**[P1] Blocos custom-UUID filtrados silenciosamente**
- Blocos com prefixo `custom-` são removidos do array antes do webhook (correto), mas o usuário não recebe feedback quando isso acontece numa seleção mista.
- Se TODOS os blocos forem custom → lança erro (OK). Se MISTURA → os custom somem sem aviso.
- **Arquivo:** `OliviaGeradorSmartBlocks.tsx` — função `iniciarGeracao`
- **Fix:** Adicionar toast após filtro: `"X bloco(s) personalizado(s) não incluídos na geração do Google Doc"` quando `blocosIdsParaWebhook.length < state.blocos_ids.length`

**[P1] Workflow `olivia/gerar-manual` não mapeado completamente**
- O endpoint responde (200 confirmado), mas o ID do workflow não foi identificado no listing da API n8n (>100 workflows, possível paginação).
- Não sabemos se `jurisprudencias_ids` e `instrucoes_adicionais` são processados.
- **Fix:** `GET /api/v1/workflows?limit=250` para identificar o workflow exato e auditar todos os nós.

#### P2 — Qualidade/UX

**[P2] Edição de bloco no Step 2 é local, não persiste**
- O usuário edita conteúdo no Sheet do Step 2 (em memória), mas o webhook envia apenas os IDs dos blocos — o n8n vai buscar o conteúdo **original** do banco.
- Usuário acha que editou e o doc sai com o conteúdo original.
- **Fix opções:** (a) enviar `blocos_conteudo_customizado: [{id, conteudo}]` no payload; ou (b) aviso visual: `"Edições locais não afetam o documento gerado"`.

**[P2] `jurisprudencias_ids` nunca testado E2E**
- Campo enviado no payload mas sem confirmação de que o workflow o usa ou injeta no doc.

**[P2] `instrucoes_adicionais` nunca testado E2E**
- Campo `instrucoes_finais` do state → enviado como `instrucoes_adicionais` no payload. Sem confirmação de uso no n8n.

**[P2] Timeout sem atualizar status no banco**
- Se o frontend estoura os 3min mas o n8n ainda está rodando, o registro fica `EM_PROGRESSO` indefinidamente no banco.
- **Fix:** Após timeout, fazer PATCH `olivia_historico.status = 'ERRO'` + `error_message = 'Timeout no frontend (3min)'`.

**[P2] Recovery Banner só no Step 1**
- Se usuário recarrega estando no Step 2 ou 3, não vê o banner de geração anterior.

#### P3 — Cosmético/menor

**[P3] Link não clicável no toast de timeout**
- Toast sugere verificar em `/olivia` mas sem link clicável.

**[P3] 37 registros ABANDONADO + 25 ERRO no banco**
- Lixo de testes anteriores. Não afeta funcionalidade mas polui o histórico.

**[P3] Recovery Banner não aparece no Step 2/3**
- Condição: `currentStep === 1 && status_geracao !== 'SUCESSO'`. Poderia aparecer em todos os steps.

---

### O que foi testado e confirmado funcionando ✅

- Fluxo completo E2E: Processo → Tipo → Modelo → Versão → Advogado → Step 2 (seleção blocos) → Step 3 (gerar) → webhook dispara → n8n processa → `google_doc_url` salvo → polling detecta SUCESSO → toast com link → botão "Abrir Documento"
- Dirty-state guard: `beforeunload` + AlertDialog ao tentar sair com blocos selecionados
- Recovery Banner D6: detecta SUCESSO anterior para o mesmo processo
- Reset de `versao_id` ao trocar processo/tipo/modelo (3 pontos corrigidos)
- Filtro de custom-UUIDs antes do webhook
- Label "SMART_BLOCKS" na fila (não mais "Manual")
- `google_doc_url` no toast usa campo raiz (não `meta.google_doc_url`)
- Workflow duplicado `nEdXsfTOYcHwhM7j` desativado — sem mais runs sem `google_doc_id`
- 3 registros `EM_PROGRESSO` travados limpos; banco zerado para novo E2E

### O que nunca foi testado até o fim ❌

- Jurisprudências: selecionar e verificar se aparecem no doc gerado
- `instrucoes_adicionais`: adicionar instrução e verificar incorporação no doc
- Edição de bloco no Step 2: verificar se versão editada chega ao Google Doc (spoiler: não chega)
- Múltiplos blocos de categorias diferentes no mesmo processo
- Processo tipo empresa (com `restricao_valor`/`restricao_contrato`/`restricao_data`) gerando doc correto
- Timeout real de 3min: o que acontece no banco se n8n ainda está rodando

---

## 2. ARQUITETURA FRONTEND

### Arquivo orquestrador principal

```
src/pages/olivia/components/gerador/OliviaGeradorSmartBlocks.tsx
```

### Hook principal

**Nenhum hook dedicado ativo.**  
`src/hooks/olivia/useSmartBlocks.ts` está **`@deprecated`** — referência histórica, não usado em código novo. Toda a lógica reside inline no orquestrador.

---

### Steps do Wizard

| # | Label no Stepper | Chave (`WizardStep`) | Componente | Arquivo |
|---|---|---|---|---|
| 1 | Processo | `identificacao` | `SmartBlocksStep1Identificacao` | `src/pages/olivia/components/gerador/smart-blocks/SmartBlocksStep1Identificacao.tsx` |
| 2 | Seleção | `triagem` | `SmartBlocksStep2Blocos` | `src/pages/olivia/components/gerador/smart-blocks/SmartBlocksStep2Blocos.tsx` |
| 3 | Gerar | `revisao` | `SmartBlocksStep3Gerar` | Inline em `OliviaGeradorSmartBlocks.tsx` (não é arquivo separado) |

---

### Estado Gerenciado — `SmartBlocksWizardState`

```typescript
interface SmartBlocksWizardState {
  currentStep: number;                          // 1 | 2 | 3

  processo: {
    id: string;
    numero_cnj: string;
    cliente_nome: string | null;
    empresa_nome?: string;
    advogado_id?: string;
    reu_nome?: string | null;
    vara_distribuicao?: string | null;
    restricao_valor?: number | null;
    restricao_contrato?: string | null;
    restricao_data?: string | null;
    tipo_processo?: string | null;
    status?: string | null;
  } | null;

  tipo_peticao_id: string | null;               // FK → olivia_tipos_peticao
  modelo_id: string | null;                     // FK → olivia_modelos_grupo
  versao_id: string | null;                     // FK → olivia_modelos_peticao (obrigatório, spec §32)
  advogado_id: string | null;                   // FK → advogados
  categoria_empresa_id: string | null;          // auto-preenchido do processo (empresas.categoria_id)

  blocos_ids: string[];                         // IDs dos blocos ativos (sem custom-UUID no webhook)
  jurisprudencias_ids: string[];                // ⚠️ enviado mas não testado E2E
  instrucoes_finais: string;                    // → instrucoes_adicionais no payload

  historicoId: string | null;                   // criado no INSERT, usado no polling
  status_geracao: 'SUCESSO' | 'ERRO' | null;   // null = não iniciado ou em progresso
  google_doc_url: string | null;               // preenchido quando SUCESSO + doc retornado
  texto_gerado: string | null;                 // LEGADO Express — Smart Blocks não usa
}
```

**Estado inicial (`INITIAL_STATE`):** todos os campos `null` / arrays vazios / `currentStep: 1`

---

### Regras de `canAdvance`

```typescript
// Step 1 → 2: todos os 5 campos obrigatórios
processo && tipo_peticao_id && modelo_id && versao_id && advogado_id

// Step 2 → 3:
blocos_ids.length > 0

// Step 3: sem "próximo" — botão "Gerar Documento" chama iniciarGeracao()
```

---

### Componentes Críticos

| Componente | Arquivo | Papel |
|---|---|---|
| `WizardStepper` | `src/pages/olivia/components/gerador/shared/WizardStepper.tsx` | Barra de steps clicável, `completedSteps` via `Set<WizardStep>` |
| `SmartBlocksRecoveryBanner` | Inline em `OliviaGeradorSmartBlocks.tsx` | Banner D6: detecta SUCESSO anterior, oferece retomar ou ignorar |
| `VersaoSelectSB` | Inline em `SmartBlocksStep1Identificacao.tsx` | Select de versões publicadas (`olivia_modelos_peticao` via `modelo_grupo_id`) |
| `BlocoRow` | Inline em `SmartBlocksStep2Blocos.tsx` | Row com checkbox + preview Sheet + edit Sheet |
| `OliviaFilaTab` | `src/pages/olivia/components/fila/OliviaFilaTab.tsx` | Histórico/fila de todas as gerações |
| `OliviaFilaDetalheSheet` | `src/pages/olivia/components/fila/OliviaFilaDetalheSheet.tsx` | Detalhe de uma geração |

---

### Queries Supabase no Frontend

**Step 1:**
| Query | Tabela | Filtros | Uso |
|---|---|---|---|
| Busca processo | `processos` + joins `clientes`, `empresas`, `advogados` | `org_id`, `deleted_at IS NULL`, debounce 300ms, limit 20 | Popover de busca |
| Tipos petição | `olivia_tipos_peticao` | `org_id + ativo=true`, order `ordem_exibicao` | Select |
| Modelos grupo | `olivia_modelos_grupo` | `org_id + tipo_peticao_id + status=published` + opt `categoria_empresa_id` | Select |
| Versões modelo | `olivia_modelos_peticao` | `modelo_grupo_id + org_id + status=published` | `VersaoSelectSB` |
| Advogados | `advogados` | `org_id + ativo=true` | Select |

**Step 2:**
| Query | Tabela | Filtros | Uso |
|---|---|---|---|
| Tags do modelo | `olivia_modelo_tags` | `modelo_id=active_version_id + org_id` | Junction (preferencial) |
| Fallback tags | `olivia_modelos_grupo.tags_ids` | — | Se junction vazia |
| Nomes de tags | `olivia_tags` | `org_id + ativo=true` | Badges |
| Blocos | `olivia_blocos_texto` | `org_id + status=published + deleted_at IS NULL`, opt `categoria_empresa_id`, depois filtra `tag_ids` client-side | Lista principal |

---

## 3. BACKEND E INTEGRAÇÕES

### Workflow n8n principal

| Campo | Valor |
|---|---|
| **Nome** | *(a confirmar — ver nota abaixo)* |
| **ID** | *(a confirmar — não encontrado no listing de 100 workflows)* |
| **Status** | ✅ Ativo (endpoint respondendo 200) |
| **Path** | `olivia/gerar-manual` |
| **URL completa** | `https://primary-production-e209.up.railway.app/webhook/olivia/gerar-manual` |
| **Motor salvo** | `smart-blocks` |

> ⚠️ **Nota crítica:** O workflow com path `olivia/gerar-manual` não apareceu no listing via API (`GET /api/v1/workflows?limit=100`). Provável causa: n8n tem >100 workflows ativos — a API pagina. **Tarefa #1:** Identificar ID com `GET /api/v1/workflows?limit=250` e auditar nós para confirmar processamento de `jurisprudencias_ids` e `instrucoes_adicionais`.

**Outros workflows relevantes:**

| Nome | ID | Status | Path | Observação |
|---|---|---|---|---|
| `prod-olivia-express` | `8yeCpY5EaEP5XQ9e` | ✅ Ativo | `mdflow/olivia/express` | Modo Express/Manual — NÃO é Smart Blocks |
| `N8N-OLIVIA-PETICAO-V3` | `9nTgWoQiU4FUIxQm` | ✅ Ativo | `olivia/gerar-peticao` | Modo IA Assistida — NÃO é Smart Blocks |
| `Gerador de petições - gerar arquivo google docs` | `98jZs5mFIjRiRVfi` | ✅ Ativo | `mdflow/modelos/gerador` | Gerador legado — usa GAS com switch por tipo |
| *(antigo duplicado Smart Blocks)* | `nEdXsfTOYcHwhM7j` | ❌ **Desativado** | — | Era causa de ~50% das runs sem `google_doc_id` |

---

### Endpoint chamado pelo frontend

```
POST https://primary-production-e209.up.railway.app/webhook/olivia/gerar-manual

Headers:
  Content-Type: application/json
  mdflow: MdL1501@
  x-org-id: {organizacao_id}
  x-user-id: {actor_user_id}
  x-request-id: {request_id}
```

**Payload completo enviado:**
```json
{
  "request_id": "uuid-gerado-no-frontend",
  "organizacao_id": "uuid",
  "actor_user_id": "uuid",
  "historico_id": "uuid",
  "data": {
    "processo_id": "uuid | null",
    "modelo_id": "uuid | null",
    "versao_id": "uuid | null",
    "advogado_id": "uuid | null",
    "tipo_peticao_id": "uuid | null",
    "blocos_ids": ["uuid", "uuid"],
    "jurisprudencias_ids": [],
    "instrucoes_adicionais": "string"
  }
}
```

> `blocos_ids` é pré-filtrado no frontend — IDs com prefixo `custom-` são removidos antes do envio.

---

### Sequência de execução — Step 3 (`iniciarGeracao`)

```
1. DELETE olivia_historico
     WHERE processo_id = X AND modo = 'SMART_BLOCKS'
       AND status = 'PENDENTE'
       AND created_at < NOW() - INTERVAL '10 min'
     (evita duplicatas de sessões abandonadas)

2. INSERT olivia_historico
     status = 'PENDENTE', modo = 'SMART_BLOCKS', motor = 'smart-blocks'
     meta = { google_folder_id, modelo_grupo_id }
   → retorna historicoId

3. Filtrar blocos_ids: remover IDs com prefixo 'custom-'
   SE nenhum bloco restante → throw Error (mensagem explicativa)

4. POST /webhook/olivia/gerar-manual (timeout: 30s)
   SE !webhookResp.success → throw Error

5. setState({ historicoId, status_geracao: null })
   toast("Gerando documento... acompanhe o progresso.")

6. Inicia timer visual (setInterval 1s → pollingElapsed)

7. Loop polling (a cada 3s, max 180s):
   SELECT status, google_doc_url, google_doc_id, error_message
     FROM olivia_historico WHERE id = historicoId

   → status = 'SUCESSO': setState(SUCESSO + google_doc_url), toast success
   → status = 'ERRO':    setState(ERRO), setErrorMsg(error_message)
   → outro:              setTimeout(poll, 3000)

8. SE timeout (180s): última verificação manual
   → ainda SUCESSO: setState(SUCESSO)
   → senão:         setState(ERRO), setErrorMsg("Tempo limite excedido (3 min)...")
```

---

### Polling

| Campo | Valor |
|---|---|
| **Mecanismo** | Polling puro via Supabase client (sem SSE/Realtime) |
| **Tabela** | `olivia_historico` |
| **Campo de status** | `status` |
| **Valores possíveis** | `PENDENTE` → `EM_PROGRESSO` → `SUCESSO` \| `ERRO` |
| **Campo de resultado** | `google_doc_url` (string) + `google_doc_id` (text) |
| **Intervalo** | 3.000ms |
| **Timeout** | 180.000ms (3 min) |
| **Fallback timeout** | Última verificação síncrona antes de desistir |

---

### Google Drive

| Campo | Valor |
|---|---|
| **Folder ID** | `1JTbKJqbmPzRTLlqRYZEZ5pNY-w8r1ALZ` |
| **Fonte** | `OLIVIA_GOOGLE_FOLDER_ID` em `src/lib/olivia/constants.ts` |
| **Env var** | `VITE_OLIVIA_GOOGLE_FOLDER_ID` (fallback hardcoded) |
| **Como o doc é gerado** | n8n chama GAS (Google Apps Script) → copia template do Drive → substitui placeholders `{{campo}}` → move para folder → retorna URL |
| **JARBAS** | ❌ **NÃO usa** — foi tentado (commit `3f88c3a2`) mas descartado em favor de GAS direto |

---

## 4. BANCO DE DADOS (SUPABASE)

**Projeto:** `qdivfairxhdihaqqypgb`

### `olivia_historico` — Tabela principal de tracking

| Campo | Tipo | Obrigatório | Papel neste modo |
|---|---|---|---|
| `id` | uuid | NOT NULL PK | `historicoId` do wizard |
| `organizacao_id` | uuid | NOT NULL | Scope da organização |
| `user_id` | uuid | NULL | Quem gerou |
| `processo_id` | uuid | NULL | Processo selecionado no Step 1 |
| `tipo_peticao_id` | uuid | NULL | Tipo selecionado |
| `modelo_id` | uuid | NULL | `olivia_modelos_grupo.id` |
| `versao_id` | uuid | NULL | `olivia_modelos_peticao.id` |
| `advogado_id` | uuid | NULL | Advogado responsável |
| `modo` | text | NULL | **sempre `'SMART_BLOCKS'`** |
| `motor` | text | NULL | **sempre `'smart-blocks'`** |
| `status` | text | NULL | `PENDENTE` → `EM_PROGRESSO` → `SUCESSO` \| `ERRO` |
| `google_doc_url` | text | NULL | URL do doc gerado — **campo de conclusão** |
| `google_doc_id` | text | NULL | ID do Google Doc |
| `error_message` | text | NULL | Mensagem de erro quando `status=ERRO` |
| `meta` | jsonb | NULL | `{google_folder_id, modelo_grupo_id, blocos_ids, modo_geracao}` |
| `qualidade_ia` | text | NULL | sempre `'padrao'` |
| `request_id` | text | NULL | UUID de correlação frontend ↔ n8n |
| `created_at` | timestamptz | NOT NULL | Timestamp de criação |
| `finished_at` | timestamptz | NULL | Timestamp de conclusão |

**Campo que indica conclusão:** `status = 'SUCESSO'` (+ `google_doc_url` preenchido)

---

### Outras tabelas usadas

| Tabela | Campos relevantes | Uso |
|---|---|---|
| `olivia_blocos_texto` | `id, titulo, conteudo, tag_ids, status, deleted_at, categoria_empresa_id` | Fonte dos blocos no Step 2 |
| `olivia_modelos_grupo` | `id, tags_ids, active_version_id` | Tags do modelo + versão ativa |
| `olivia_modelo_tags` | `modelo_id, tag_id` | Junction tags ↔ modelo (preferencial) |
| `olivia_modelos_peticao` | `id, nome, versao, status, modelo_grupo_id` | Versões publicadas — `VersaoSelectSB` |
| `olivia_tipos_peticao` | `id, nome, ativo, ordem_exibicao` | Select de tipos no Step 1 |
| `processos` | `id, numero_cnj, cliente_nome, empresa_nome, advogado_id, reu_nome, ...` | Busca no Step 1 |
| `advogados` | `id, nome, oab, oab_uf, ativo` | Select de advogados no Step 1 |
| `clientes` | `nome, cpf_cnpj` | Join via `processos` |
| `empresas` | `nome, categoria_id` | Join via `processos` — fornece `categoria_empresa_id` |
| `olivia_tags` | `id, nome, ativo` | Mapa para badges no Step 2 |

---

### Estado do banco (2026-03-17 21:40)

```
SMART_BLOCKS  SUCESSO      16  (10 com google_doc_url, 6 sem — runs do workflow antigo)
SMART_BLOCKS  ERRO         25  (maioria testes)
SMART_BLOCKS  ABANDONADO   37  (lixo de sessões antigas)
SMART_BLOCKS  EM_PROGRESSO  0  (limpo ✅)
```

### RLS
Não auditado especificamente para este modo. O INSERT usa Supabase client com anon key — se RLS ativo em `olivia_historico`, precisa de policy `INSERT` para usuário autenticado com `organizacao_id` correto. **A confirmar.**

---

## 5. DECISÕES TOMADAS NESTA CONVERSA

| # | Decisão | Porquê |
|---|---|---|
| 1 | **JARBAS descartado** — usa GAS direto | Latência e complexidade desnecessárias; GAS funciona E2E |
| 2 | **Workflow duplicado `nEdXsfTOYcHwhM7j` desativado** | Causa de ~50% das runs retornarem SUCESSO sem `google_doc_id` |
| 3 | **Filtro custom-UUID no frontend** | IDs `custom-*` não existem no banco; GAS ignora silenciosamente — filtrar no frontend dá feedback antes do n8n |
| 4 | **`tipo_peticao_label` propagado no n8n** | Nó "Buscar Google Doc Modelo" passou a buscar nome em `olivia_tipos_peticao` para usar nome correto do template no Drive |
| 5 | **`versao_id` reseta ao trocar processo/tipo/modelo** | Bug em 3 pontos do Step 1: botão Alterar, `onChange` tipo, `onChange` modelo — versão antiga persistia |
| 6 | **`motor = 'smart-blocks'`** | Distingue no histórico e na fila; outros modos usam `motor` diferente |
| 7 | **Drag-and-drop removido do Step 2** | Spec §32: ordem dos blocos definida pelo template, não pelo usuário |
| 8 | **Recovery Banner D6 só no Step 1** | Evita interferência no fluxo ativo; usuário pode ignorar se quiser nova geração |
| 9 | **Polling de 3min (sem SSE)** | GAS pode ser lento (até 90s); SSE avaliado mas não implementado — polling simples suficiente |
| 10 | **`versao_id` obrigatório no Step 1** | Spec §32: frontend bloqueia avanço sem versão selecionada |
| 11 | **Auto-cleanup de PENDENTEs > 10min** | Evita acúmulo de registros orphaned de sessões abandonadas |
| 12 | **3 registros EM_PROGRESSO travados limpos manualmente** | Banco limpo para E2E confiável |

---

## 6. O QUE FALTA PARA 100%

### Tarefas priorizadas

| # | Prior. | Tarefa | Complexidade | Dependências |
|---|---|---|---|---|
| 1 | **P1** | Identificar ID do workflow `olivia/gerar-manual` via `GET /api/v1/workflows?limit=250` e mapear todos os nós | 1h | — |
| 2 | **P1** | Toast de aviso quando blocos custom são filtrados silenciosamente (`"X bloco(s) personalizado(s) ignorados"`) | 30min | — |
| 3 | **P1** | Testar E2E com `jurisprudencias_ids` preenchido e confirmar no doc | 2h | Tarefa 1 |
| 4 | **P1** | Testar E2E com `instrucoes_adicionais` preenchido e confirmar no doc | 1h | Tarefa 1 |
| 5 | **P2** | Edição de bloco: ou enviar `blocos_conteudo_customizado` no payload, ou aviso visual que edição é local | 2-3h | Decisão de arquitetura |
| 6 | **P2** | Timeout: PATCH `olivia_historico.status = 'ERRO'` quando frontend estoura 3min | 1h | — |
| 7 | **P2** | Confirmar RLS de `olivia_historico` para INSERT com anon key | 30min | — |
| 8 | **P3** | Link clicável para `/olivia` no toast de timeout | 30min | — |
| 9 | **P3** | Recovery Banner visível também no Step 2 e 3 | 1h | — |
| 10 | **P3** | Limpar 37 ABANDONADO + 25 ERRO no banco (opcional) | 30min | — |

### Estimativa para 100%

| Categoria | Horas |
|---|---|
| P1 crítico | ~4-5h |
| P2 qualidade | ~5h |
| P3 cosmético | ~2h |
| **Total** | **~11-12h** (1-2 dias de dev) |

---

## 7. ARQUIVOS E RELATÓRIOS

### Commits relevantes

| Hash | Descrição |
|---|---|
| `1bf3da18` | fix(smart-blocks): filtrar custom IDs, label modo, google_doc_url no toast |
| `808781c0` | fix(smart-blocks): 6 correções frontend — race condition Step2, instrucoes_adicionais, polling timeout, historico duplicado, docx legado, e2e timing |
| `b3cf5621` | fix(olivia/smart-blocks): review completo — 8 correções |
| `8e897e6a` | fix(olivia/smart-blocks): status PENDENTE + null para IDs opcionais no webhook payload |
| `d9d7ad10` | fix(olivia/smart-blocks): modelo_id→olivia_modelos_grupo (FK correto), versao_id=null (nullable) |
| `d3a8e1ec` | fix(olivia/smart-blocks): status inicial PENDENTE (constraint do banco) |
| `f7d4cf31` | fix(olivia/smart-blocks): polling correto com historico_id passado no webhook |
| `29f94d95` | fix(olivia/smart-blocks): P1 polling bug + Step2 bugs de tipo — CC fix completo |
| `7d2aef2a` | fix(olivia): corrige 4 issues P1 do E2E C5v2 |
| `b33bfae1` | feat(olivia/c5v2): Recovery SmartBlocks D6 + TypeScript cleanup críticos |
| `3f88c3a2` | feat(olivia/smart-blocks): substituir GAS por JARBAS /olivia/criar-doc *(descartado posteriormente)* |

### Relatórios HTML
Nenhum gerado especificamente nesta conversa para Smart Blocks.

### Mapa de arquivos para a JANA

```
src/pages/olivia/components/gerador/
├── OliviaGeradorSmartBlocks.tsx          ← ORQUESTRADOR PRINCIPAL + Step3 inline
└── smart-blocks/
    ├── SmartBlocksStep1Identificacao.tsx  ← Step 1 (processo, tipo, modelo, versão, advogado)
    └── SmartBlocksStep2Blocos.tsx         ← Step 2 (lista de blocos, checkbox, preview, edit)

src/pages/olivia/components/fila/
├── OliviaFilaTab.tsx                      ← Histórico de gerações
└── OliviaFilaDetalheSheet.tsx             ← Detalhe de uma geração

src/pages/olivia/components/gerador/shared/
└── WizardStepper.tsx                      ← Barra de steps compartilhada

src/hooks/olivia/
└── useSmartBlocks.ts                      ← @deprecated — NÃO USAR

src/lib/olivia/
└── constants.ts                           ← OLIVIA_GOOGLE_FOLDER_ID

src/lib/
└── webhook.ts                             ← callWebhook() + polling helpers
```

---

*JANA 🦊 | JARBAS Network | MdLab LegalTech | 2026-03-17*
