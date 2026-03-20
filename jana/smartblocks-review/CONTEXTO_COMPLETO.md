# Deep Review — Workflow `final-olivia-smartblocks` (n8n)
> Gerado por JANA 🦊 | 2026-03-16 | Revisão solicitada por Christian Paz

## Missão

Fazer deep review node a node do workflow n8n **`final-olivia-smartblocks`** (ID: `hyGajjic2kZBVGvW`), identificar todos os bugs e corrigi-los diretamente via API n8n.

**Objetivo final:** o workflow deve processar um job de Smart Blocks — receber webhook, buscar dados, montar payload GAS, chamar GAS, salvar URL do Google Doc no Supabase (`olivia_historico`) com `status = 'CONCLUIDO'` e `google_doc_url` preenchido.

---

## Credenciais

Todas em `~/jarbas/.env`:
```
SUPABASE_URL=https://qdivfairxhdihaqqypgb.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkaXZmYWlyeGhkaWhhcXF5cGdiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTA3MzcwOCwiZXhwIjoyMDg2NjQ5NzA4fQ.zu_reCiKzCqLETOWxytYQmez1SIwFRDlOruzsLOpBeY
N8N_BASE_URL=https://primary-production-e209.up.railway.app
N8N_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5MjhhOTg3OC04NWUyLTRlZTgtYjYxYS00NWE2ZjkxZDczODEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzczMTA4NTQ0fQ.fm6pT29355eg3UA_Qe90SF3DK-Tdo5ybzQcNkBQZTHI
SUPABASE_ACCESS_TOKEN=sbp_38632a902ee36a28bfb42396bed19a667cffaead
N8N_WEBHOOK_AUTH_KEY=mdflow
N8N_WEBHOOK_AUTH_VALUE=MdL1501@
```

---

## Workflow ID e estrutura esperada

- **Workflow ID:** `hyGajjic2kZBVGvW`
- **Nome:** `final-olivia-smartblocks`
- **Webhook path:** `POST /webhook/olivia/gerar-manual`
- **Auth:** header `mdflow: MdL1501@`

### Fluxo esperado:
```
WH-SmartBlocks → A1-Validate → A-Respond202 (async 202)
                              ↓
      B1-BuscarProcesso (processo)
      B1b-BuscarAdvogado (advogado)
      B1c-BuscarCliente (cliente via processo.cliente_id)
      B1d-BuscarEmpresa (empresa via processo.empresa_id)
      B1e-BuscarModelo (versão do modelo)
      B2-BuscarBlocos (blocos de texto)
      B2b-AgregaBlocos (agrega array de blocos em 1 item)
      B3-BuscarJuris (jurisprudências — pode retornar vazio)
                              ↓
      C1-MontarPayloadGAS (monta payload completo)
                              ↓
      C2-ChamarGAS (chama Google Apps Script)
                              ↓
      C3-CheckGAS (verifica resposta)
                              ↓
      D1-SalvarSucesso (atualiza olivia_historico: status=CONCLUIDO, google_doc_url)
      D2-SalvarErroGAS (atualiza olivia_historico: status=ERRO)
                              ↓
      E-ErrorTrigger → E1-SalvarErroGlobal
```

---

## Histórico de bugs encontrados e correções feitas

### Bug 1 — B2-BuscarBlocos: expressão `.item.json` (CORRIGIDO)
- **Original:** `=in.({{ .item.json.blocos_ids.join(',') }})`
- **Corrigido:** `=in.({{ $json.blocos_ids.join(",") }})`
- **Impacto:** query inválida no Supabase

### Bug 2 — C1-MontarPayloadGAS: `.item.json` em todos os nodes (CORRIGIDO)
- **Original:** `$('NodeX').item.json` em todos os acessos
- **Corrigido:** `$('NodeX').first().json` (ou versão com fallback)
- **Impacto:** erro `getPairedItem` quando B2 retorna múltiplos items

### Bug 3 — B2-BuscarBlocos retorna múltiplos items (CORRIGIDO)
- HTTP Request node retorna 1 item por linha do Supabase
- **Solução:** adicionado node `B2b-AgregaBlocos` (Code node) que agrega todos em `{ blocos: [...] }`

### Bug 4 — B1-BuscarProcesso, B1b, B1c, B1d, B1e: Supabase node `operation:get` retornava 0 items (CORRIGIDO)
- Nodes Supabase nativos falhavam silenciosamente
- **Solução:** convertidos para `httpRequest` com a service_role key diretamente
- **Expressões corrigidas para evitar shell-eating:** `$('A1-Validate').first().json.processo_id`

### Bug 5 — B1c-BuscarCliente: coluna `cpf` não existe (CORRIGIDO)
- **Original:** select incluía `cpf`
- **Correto:** `cpf_cnpj`

### Bug 6 — B1e-BuscarModelo: coluna `tipo_peticao` não existe (CORRIGIDO)
- **Original:** select incluía `tipo_peticao`
- **Correto:** `tipo_peticao_id`

### Bug 7 — B1c/B1d: expressões acessando `B1-BuscarProcesso` que agora retorna array via httpRequest
- httpRequest retorna o array JSON como o `.json` do item
- **Precisa verificar:** as expressões `($('B1-BuscarProcesso').first() || {json:[]}).json[0]?.cliente_id` estão corretas?

### Bug 8 — Status do job fica em PENDENTE após execução (NÃO RESOLVIDO)
- Mesmo com webhook triggering, o job na `olivia_historico` não atualiza para CONCLUIDO
- Pode ser que o workflow falha antes de D1-SalvarSucesso
- **Última execução com erro:** `116052` — crashou em `B1e-BuscarModelo`
- **Execução mais recente (teste fix9):** `116052` ainda falhando

---

## Payload de teste

```json
{
  "request_id": "test-deep-review-cc-001",
  "organizacao_id": "55a0c7ba-1a23-4ae1-b69b-a13811324735",
  "actor_user_id": "5f8457c4-685d-4aa5-872d-790d34eea73b",
  "historico_id": "<criar novo via Supabase>",
  "data": {
    "processo_id": "48f876f0-d14f-481f-be49-7c096253edac",
    "modelo_id": "a43b499d-f787-4590-ab68-d8f0fc217723",
    "versao_id": "a43b499d-f787-4590-ab68-d8f0fc217723",
    "advogado_id": "a1000001-0000-4000-8000-000000000001",
    "blocos_ids": [
      "f2bcbefa-6603-4289-abeb-69d246ac4e13",
      "17f3bed4-0ab4-48f1-8bf3-2de4534b07b0"
    ],
    "jurisprudencias_ids": []
  }
}
```

**Para criar historico_id:**
```bash
source ~/jarbas/.env
curl -s -X POST "$SUPABASE_URL/rest/v1/olivia_historico" \
  -H "apikey: $SUPABASE_KEY" -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d '{"organizacao_id":"55a0c7ba-1a23-4ae1-b69b-a13811324735","user_id":"5f8457c4-685d-4aa5-872d-790d34eea73b","processo_id":"48f876f0-d14f-481f-be49-7c096253edac","status":"PENDENTE","modo":"SMART_BLOCKS","request_id":"test-cc-001","advogado_id":"a1000001-0000-4000-8000-000000000001"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['id'])"
```

**Para disparar webhook:**
```bash
source ~/jarbas/.env
curl -s -X POST "$N8N_BASE_URL/webhook/olivia/gerar-manual" \
  -H "Content-Type: application/json" \
  -H "mdflow: MdL1501@" \
  -d '{...payload aqui...}'
```

**Para ver última execução:**
```bash
source ~/jarbas/.env
curl -s "$N8N_BASE_URL/api/v1/executions?workflowId=hyGajjic2kZBVGvW&limit=3" \
  -H "X-N8N-API-KEY: $N8N_API_KEY"
```

**Para ver detalhes de execução:**
```bash
source ~/jarbas/.env
curl -s "$N8N_BASE_URL/api/v1/executions/EXEC_ID?includeData=true" \
  -H "X-N8N-API-KEY: $N8N_API_KEY"
```

---

## Schema das tabelas relevantes

Ver arquivo: `schema_relevante.json` na mesma pasta.

## Workflow completo atual

Ver arquivo: `workflow_final-olivia-smartblocks.json` na mesma pasta.

---

## Como atualizar o workflow via API

```bash
source ~/jarbas/.env

# 1. Baixar workflow atual
curl -s "$N8N_BASE_URL/api/v1/workflows/hyGajjic2kZBVGvW" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" -o /tmp/wf.json

# 2. Modificar com Python (editar nodes/connections)
python3 << 'PYEOF'
import json
with open('/tmp/wf.json') as f:
    wf = json.load(f)
# ... suas modificações aqui ...
payload = {"name": wf["name"], "nodes": wf["nodes"], "connections": wf["connections"], "settings": wf.get("settings", {})}
with open('/tmp/wf_fixed.json', 'w') as f:
    json.dump(payload, f)
PYEOF

# 3. Fazer PUT para salvar
curl -s -X PUT "$N8N_BASE_URL/api/v1/workflows/hyGajjic2kZBVGvW" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d @/tmp/wf_fixed.json | python3 -c "import json,sys; d=json.loads(sys.stdin.read()); print('OK:', d.get('id','?'), d.get('message',''))"
```

**ATENÇÃO:** O PUT aceita apenas: `name`, `nodes`, `connections`, `settings`. Não incluir `id`, `active`, `meta`, `versionId`, etc.

---

## Observações importantes

1. **httpRequest nodes** retornam o array JSON como `item.json` — ou seja, `$('B1-BuscarProcesso').first().json` é um array `[{processo...}]`, não o objeto direto. Precisa de `$('B1-BuscarProcesso').first().json[0]` ou extrair no C1.

2. **Supabase nodes nativos** (type: `n8n-nodes-base.supabase`) falharam com `operation:get` — credencial `eTPLmfOuR54XjbJ5` parece não funcionar para essa tabela. Use sempre **httpRequest** com a key inline.

3. **B2-BuscarBlocos** usa `=in.({{ $json.blocos_ids.join(",") }})` — isso retorna múltiplos items (1 por bloco). O node `B2b-AgregaBlocos` foi adicionado para consolidar.

4. **E1-SalvarErroGlobal** usa `$input.first().json` que também pode ter problema se o error trigger não popula items corretamente. Verificar.

5. **D1-SalvarSucesso e D2-SalvarErroGAS** usam `httpRequest` — verificar se as expressões e fields de update do Supabase estão corretos.

6. O job na `olivia_historico` **nunca chegou a CONCLUIDO** em nenhum dos testes — indica que o workflow sempre falha antes de D1.

---

## Tarefa do Claude Code

1. **Ler** `workflow_final-olivia-smartblocks.json` e `schema_relevante.json`
2. **Revisar node a node**, identificando:
   - Expressões n8n incorretas (`.item.json` vs `.first().json` vs `$json`)
   - Columns que não existem no schema
   - Problemas de pairing de items entre nodes paralelos
   - Nodes que podem retornar 0 items quebrando a chain
   - Qualquer outro bug
3. **Corrigir** via API n8n (PUT `/api/v1/workflows/hyGajjic2kZBVGvW`)
4. **Testar** disparando o webhook com o payload de teste acima
5. **Monitorar** até o job ficar `CONCLUIDO` no Supabase com `google_doc_url` preenchido
6. **Relatar** o que foi corrigido e o resultado final

Salvar relatório final em: `~/jarbas-reports/jana/smartblocks-review/REPORT_CC.md`

Notificar quando terminar:
```bash
openclaw system event --text "Claude Code concluiu review final-olivia-smartblocks: RESULTADO" --mode now
```
