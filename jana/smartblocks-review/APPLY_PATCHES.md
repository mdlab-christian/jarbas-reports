# APPLY_PATCHES — Instruções para Claude Code aplicar os patches no n8n

## Objetivo
Aplicar os 7 patches do arquivo PATCHES.md no workflow `final-olivia-smartblocks` (ID: `hyGajjic2kZBVGvW`) via n8n API.

## Credenciais (já exportadas via ~/jarbas/.env)
- `N8N_BASE_URL`: https://primary-production-e209.up.railway.app
- `N8N_API_KEY`: disponível em ~/jarbas/.env

## Workflow atual
- Arquivo: `workflow_atual.json` neste diretório (baixado agora)
- ID: `hyGajjic2kZBVGvW`
- Nome: `final-olivia-smartblocks`

## Como aplicar via API

A n8n API v1 usa PUT para atualizar workflow completo:

```bash
source ~/jarbas/.env
curl -X PUT "$N8N_BASE_URL/api/v1/workflows/hyGajjic2kZBVGvW" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d @workflow_corrigido.json
```

## Patches a aplicar (em ordem de prioridade)

### PATCH 1 — C1-MontarPayloadGAS (node id: "c1-montar")
Alterar `parameters.jsCode` para o código em PATCHES.md PATCH 1.
**Bug crítico:** `titulo_documento` ausente no gasPayload + OAB duplicado.

### PATCH 2 — B1-BuscarProcesso (node id: "b1-processo")
Alterar `parameters.queryParameters.parameters[1].value` (o select):
```
ANTES: "id,numero_processo,organizacao_id,cliente_id,empresa_id,advogado_id,estado_id"
DEPOIS: "id,numero_processo,numero_cnj,organizacao_id,cliente_id,empresa_id,advogado_id,estado_id,reu_nome,restricao_valor,restricao_data,restricao_contrato,restricao_orgao_nome,enderecamento"
```

### PATCH 3 — B1c-BuscarCliente (node id: "b1c-cliente")
Alterar `parameters.queryParameters.parameters[1].value` (o select):
```
ANTES: "id,nome,cpf,rg,sexo,endereco_logradouro,endereco_numero,cidade,endereco_uf,cep"
DEPOIS: "id,nome,cpf_cnpj,rg,sexo,email,profissao,endereco_logradouro,endereco_numero,cidade,endereco_uf,cep"
```

### PATCH 4 — B3-BuscarJuris (node id: "b3-juris")
Alterar `parameters.jsCode`:
```javascript
// DEPOIS (completo):
const validado = $('A1-Validate').first().json;
const ids = validado.jurisprudencias_ids || [];
if (ids.length === 0) {
  return [{ json: { jurisprudencias: [] } }];
}
return [{ json: { jurisprudencias: [] } }];
```

### PATCH 5 — D1-SalvarSucesso (node id: "d1-sucesso")
Alterar `parameters.queryParameters.parameters[0].value`:
```
ANTES: "=eq.{{ $('C1-MontarPayloadGAS').item.json.historico_id }}"
  ou:  "=eq.{{ $('A1-Validate').first().json.historico_id }}"  (manter se já correto)
DEPOIS: "=eq.{{ $('A1-Validate').first().json.historico_id }}"
```
Nota: verificar qual referência está sendo usada no workflow_atual.json — se já usa A1-Validate.first(), está OK.

### PATCH 6 — D2-SalvarErroGAS (node id: "d2-erro")
Alterar `parameters.queryParameters.parameters[0].value`:
```
ANTES: "=eq.{{ $('C1-MontarPayloadGAS').item.json.historico_id }}"
  ou:  "=eq.{{ $('A1-Validate').first().json.historico_id }}"  (manter se já correto)
DEPOIS: "=eq.{{ $('A1-Validate').first().json.historico_id }}"
```

### PATCH 7 — E1-SalvarErroGlobal (node id: "err-handler")
Alterar `parameters.jsCode` para o código completo em PATCHES.md PATCH 7.
**Melhoria:** salva status ERRO no Supabase quando qualquer node crashar.

## Processo de trabalho

1. Ler `workflow_atual.json`
2. Para cada patch: localizar o node pelo `id` ou `name` e aplicar a modificação
3. Salvar resultado em `workflow_corrigido.json`
4. Verificar se o JSON é válido
5. Aplicar via API (PUT)
6. Confirmar que o workflow voltou como `active: true`
7. Disparar um teste via webhook e verificar resultado no Supabase

## Teste após aplicar patches

```bash
source ~/jarbas/.env

# Disparar um teste
HIST_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
echo "Testando com historico_id: $HIST_ID"

# Primeiro criar o registro no Supabase
curl -s "https://qdivfairxhdihaqqypgb.supabase.co/rest/v1/olivia_historico" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{\"id\": \"$HIST_ID\", \"status\": \"PENDENTE\", \"organizacao_id\": \"55a0c7ba-1a23-4ae1-b69b-a13811324735\", \"actor_user_id\": \"5f8457c4-685d-4aa5-872d-790d34eea73b\", \"modo\": \"SMART_BLOCKS\"}"

# Disparar webhook
curl -s -X POST "$N8N_BASE_URL/webhook/smart-blocks" \
  -H "Content-Type: application/json" \
  -d "{
    \"request_id\": \"test-patch-applied-001\",
    \"organizacao_id\": \"55a0c7ba-1a23-4ae1-b69b-a13811324735\",
    \"actor_user_id\": \"5f8457c4-685d-4aa5-872d-790d34eea73b\",
    \"historico_id\": \"$HIST_ID\",
    \"data\": {
      \"processo_id\": \"48f876f0-d14f-481f-be49-7c096253edac\",
      \"modelo_id\": \"a43b499d-f787-4590-ab68-d8f0fc217723\",
      \"versao_id\": \"a43b499d-f787-4590-ab68-d8f0fc217723\",
      \"advogado_id\": \"a1000001-0000-4000-8000-000000000001\",
      \"blocos_ids\": [\"f2bcbefa-6603-4289-abeb-69d246ac4e13\", \"17f3bed4-0ab4-48f1-8bf3-2de4534b07b0\"],
      \"jurisprudencias_ids\": [],
      \"instrucoes_finais\": \"\"
    }
  }"

# Aguardar 30s e verificar status
sleep 30
curl -s "https://qdivfairxhdihaqqypgb.supabase.co/rest/v1/olivia_historico?id=eq.$HIST_ID&select=id,status,google_doc_url,error_message,finished_at" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" | jq .
```

## Notificação ao concluir
Quando terminar (com sucesso ou erro), executar:
```
openclaw system event --text "Claude Code: patches smartblocks aplicados — status: [SUCESSO/ERRO] — doc gerado: [URL ou 'falhou']" --mode now
```
