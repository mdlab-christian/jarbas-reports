# BRIEFING — Revisão e Correção: final-olivia-smartblocks (n8n)

## Objetivo
Revisar todos os nodes do workflow `final-olivia-smartblocks` (n8n, ID `hyGajjic2kZBVGvW`) e corrigir todos os erros encontrados. Produzir:
1. **PATCHES.md** — lista de cada node corrigido com o before/after exato
2. **GAS_ATUALIZADO.txt** — se o GAS (Google Apps Script) precisar de mudança, gerar o script completo atualizado
3. **RELATORIO.md** — diagnóstico completo

---

## Contexto do Sistema

### Arquitetura
- **n8n workflow** recebe webhook POST com payload SmartBlocks
- Valida, busca dados no Supabase, monta payload e chama um **Google Apps Script (GAS)** via HTTP
- GAS gera documento Google Docs e retorna URL
- n8n salva resultado em `olivia_historico` no Supabase

### Fluxo dos Nodes
```
WH-SmartBlocks → A1-Validate → A-Respond202
                      ↓
         [B1, B1b, B1c, B1d, B1e em paralelo]
                      ↓
         B2-BuscarBlocos → B2b-AgregaBlocos
                      ↓
              B3-BuscarJuris
                      ↓
         C1-MontarPayloadGAS
                      ↓
            C2-ChamarGAS (HTTP POST → GAS)
                      ↓
              C3-CheckGAS (if success==true)
              ↙              ↘
  D1-SalvarSucesso    D2-SalvarErroGAS
```

### Error Handler Global
- `E-ErrorTrigger` → `E1-SalvarErroGlobal`
- Ativado quando qualquer node lança exceção

---

## Bugs Identificados

### BUG 1 (CRÍTICO): C2-ChamarGAS retorna VALIDATION_ERROR
**Sintoma:** GAS responde `{"success":false,"error_code":"VALIDATION_ERROR","error_message":"titulo_documento é obrigatório e deve ser string não-vazia"}`

**Root cause descoberto nos dados reais:**
- O C1-MontarPayloadGAS gera o `gasPayload` corretamente com `titulo_documento` preenchido (ex: `"Petição - 5013649-66.2025.8.21.0015 - MARCELO AMARAL DA SILVA"`)
- O node C2-ChamarGAS usa: `body: "={{ JSON.stringify($json.gasPayload) }}"`
- O `$json` no contexto de C2 é o output de C1, que tem estrutura: `{ historico_id, organizacao_id, gasPayload, debug }`
- Então `$json.gasPayload` deveria funcionar... **MAS** olhando o C3-CheckGAS, o JSON path `$json.success` faz referência ao output de C2
- O GAS recebe o payload mas diz que `titulo_documento` está vazio — isso indica que o GAS está lendo `titulo_documento` de algum lugar diferente do root, OU o body enviado está aninhado incorretamente
- **Hipótese:** o body está sendo enviado como `{"gasPayload": {...}}` em vez de `{titulo_documento: ..., ...}` porque o C2 usa `$json.gasPayload` mas talvez o resultado do C1 já tenha o `gasPayload` como nested — **confirmar**: no output real do C1, o campo `gasPayload` contém um objeto com `titulo_documento` como propriedade. Mas o GAS está recebendo isso aninhado como `{gasPayload: {titulo_documento: "..."}}` em vez de `{titulo_documento: "..."}`.

**Fix necessário em C2-ChamarGAS:**
```
ANTES: body: "={{ JSON.stringify($json.gasPayload) }}"
DEPOIS: o body deve serializar apenas o gasPayload (sem o wrapper), OU o GAS deve ser atualizado para ler `payload.gasPayload.titulo_documento`
```

**Payload exato que C1 gera (confirmado de execução real):**
```json
{
  "historico_id": "2bf57b2a-...",
  "organizacao_id": "55a0c7ba-...",
  "gasPayload": {
    "titulo_documento": "Petição - 5013649-66.2025.8.21.0015 - MARCELO AMARAL DA SILVA",
    "processo": {"numero": "5013649-66.2025.8.21.0015"},
    "modelo": {"google_doc_id": "1hptbTHO4lBDjdFmHB0ocLYQALTzH3jNgoaX7HwweUgg"},
    "blocos": [...],
    "jurisprudencias": [],
    "campos_substituicao": {...},
    "configuracoes": {...},
    "config": {...}
  }
}
```

**Conclusão:** O GAS espera receber `{titulo_documento: ..., blocos: [...], ...}` diretamente no root. O n8n está enviando corretamente com `JSON.stringify($json.gasPayload)` — o gasPayload tem o titulo_documento. Mas o GAS ainda está falhando. **Investigar se há um problema no próprio GAS** onde ele não está lendo o body corretamente (ex: `e.postData.contents` vs `JSON.parse(e.postData.contents)`).

### BUG 2 (CRÍTICO): D2-SalvarErroGAS com body vazio
**Sintoma:** `PGRST204: Could not find '' column of 'olivia_historico'`

**Root cause:** O node D2 usa `specifyBody: "keypair"` com um par vazio `{"": ""}`. Isso gera um JSON inválido `{"": ""}` que o Supabase rejeita.

**Fix necessário em D2-SalvarErroGAS:**
```
ANTES: bodyContentType: "raw", specifyBody: "keypair", body vazio
DEPOIS: usar body string com JSON.stringify como D1 já faz:
body: "={{ JSON.stringify({ status: 'ERRO', error_message: ($json.error_message || $json.message || $json.error || 'GAS error'), finished_at: new Date().toISOString() }) }}"
contentType: "json"
specifyBody: "string"
```

### BUG 3 (POTENCIAL): A1-Validate espera `body.data.*`
**Sintoma:** O webhook recebe um payload, mas A1-Validate espera `body.data.processo_id` etc.

**Payload enviado ao webhook (confirmado de test real):**
```json
{
  "request_id": "test-fix13-001",
  "organizacao_id": "55a0c7ba-...",
  "actor_user_id": "5f8457c4-...",
  "historico_id": "2bf57b2a-...",
  "data": {
    "processo_id": "48f876f0-...",
    "modelo_id": "a43b499d-...",
    "versao_id": "a43b499d-...",
    "advogado_id": "a1000001-...",
    "blocos_ids": ["f2bcbefa-...", "17f3bed4-..."],
    "jurisprudencias_ids": [],
    "instrucoes_finais": ""
  }
}
```

**Resultado validado de A1 (confirmado de execução real):** o validate está funcionando — retorna os campos corretos. **Não há bug aqui.**

### BUG 4 (POTENCIAL): B1-BuscarProcesso retorna array mas código espera objeto
**O código em C1 faz:** `$('B1-BuscarProcesso').first().json` — o Supabase REST retorna array `[{...}]`, e `.first()` pega o item 0 do n8n output. Como B1 é HTTP Request, cada item do array vira um item separado no n8n... **MAS** se o Supabase retorna array de 1 item, o HTTP Request node retorna isso como `json: [{id: ...}]` não como `json: {id: ...}`.

**Verificar:** no output real de B1 (`B1: {id: "48f876f0-..."}`) — parece que está chegando como objeto direto. Isso pode ser porque o node HTTP Request do n8n 4.x faz "split items" automaticamente. **Não há bug confirmado aqui** — dados chegaram corretos.

### BUG 5 (POTENCIAL): advogado_oab_codigo está errado
**No output de C1:**
```
"{{advogado_oab_codigo}}": "RSRS116571"
"{{advogado_oab}}": "OAB/RS/RS116571"
```

**Correto deveria ser:**
```
"{{advogado_oab_codigo}}": "RS116571"  
"{{advogado_oab}}": "OAB/RS 116571"
```

**Root cause no C1:**
```javascript
const oabCodigo = [advogado.oab_uf, advogado.oab].filter(Boolean).join('');
// advogado.oab_uf = "RS", advogado.oab = "RS116571" → resultado: "RSRS116571"  ← ERRADO
```

O campo `oab` no banco já contém o prefixo da UF. O código concatena desnecessariamente.

**Fix:**
```javascript
// oab já vem como "RS116571" (inclui UF + número)
const oabCodigo = advogado.oab || '';  // ex: "RS116571"
const oabFormatado = advogado.oab_uf ? `OAB/${advogado.oab_uf} ${advogado.oab.replace(advogado.oab_uf, '').trim()}` : advogado.oab || '';
// Ou mais simples: "OAB/RS 116571"
```

### BUG 6 (MENOR): E1-SalvarErroGlobal com body vazio
**Mesmo problema do D2:** o error handler global também não está salvando o erro corretamente — ele executa mas não atualiza o `olivia_historico` com status ERRO, deixando tudo em PENDENTE.

**Verificar os parâmetros de E1-SalvarErroGlobal** e corrigir igual ao D2.

---

## GAS — Precisa ser atualizado?

### O que o GAS recebe (payload do n8n):
```json
{
  "titulo_documento": "Petição - ...",
  "processo": {"numero": "..."},
  "modelo": {"google_doc_id": "..."},
  "blocos": [{"ordem": 1, "placeholder": "{{bloco_1}}", "google_doc_id": "..."}],
  "jurisprudencias": [],
  "campos_substituicao": {"{{advogado_nome}}": "...", ...},
  "configuracoes": {"nome_arquivo": "...", "pasta_destino_id": "1JTbKJqbmPzRTLlqRYZEZ5pNY-w8r1ALZ", ...},
  "config": {"fonte": "Arial", "tamanho_corpo": 12, ...}
}
```

### O que o GAS deveria retornar (sucesso):
```json
{"success": true, "url": "https://docs.google.com/...", "google_doc_id": "...", "google_doc_url": "..."}
```

### O que o GAS está retornando:
```json
{"success": false, "error_code": "VALIDATION_ERROR", "error_message": "titulo_documento é obrigatório e deve ser string não-vazia"}
```

**Análise:** O GAS está recebendo o payload mas está lendo `titulo_documento` como vazio. Isso pode ocorrer se:
1. O GAS usa `e.parameter.titulo_documento` em vez de `JSON.parse(e.postData.contents).titulo_documento`
2. O content-type não está sendo enviado como `application/json` e o GAS não parseia o body

**O n8n C2 envia:**
- `contentType: "json"` → header `Content-Type: application/json`  
- `body: "={{ JSON.stringify($json.gasPayload) }}"` → body é string JSON válida

**Provável causa real:** O GAS foi escrito para receber via `e.postData.contents` e parsear como JSON, mas talvez esteja fazendo `e.parameter` ou parseia mas acessa campo errado.

**Tarefa:** Gerar um GAS_ATUALIZADO.txt com o script Google Apps Script correto para:
1. Receber o payload via `doPost(e)` com `JSON.parse(e.postData.contents)`
2. Validar `titulo_documento` corretamente
3. Copiar o Google Doc modelo (`modelo.google_doc_id`)
4. Para cada bloco em `blocos` (ordenado por `ordem`): copiar o doc do bloco e substituir o placeholder no doc principal
5. Aplicar `campos_substituicao` no documento final
6. Renomear o arquivo conforme `configuracoes.nome_arquivo`
7. Mover para pasta `configuracoes.pasta_destino_id`
8. Retornar `{success: true, url: ..., google_doc_id: ..., google_doc_url: ...}`

---

## Tarefas para o Claude Code

1. **Revisar TODOS os nodes listados acima** e identificar todos os bugs
2. **Produzir PATCHES.md** com as correções exatas para cada node problemático (no formato JSON dos parâmetros do n8n, pronto para aplicar via API)
3. **Produzir GAS_ATUALIZADO.txt** — script Google Apps Script completo e funcional para o `doPost` do SmartBlocks
4. **Produzir RELATORIO.md** — diagnóstico final com lista de todos os bugs e status (corrigido/não corrigido/não é bug)

---

## URL do GAS atual
`https://script.google.com/a/macros/perinottipazadvogados.com/s/AKfycbzO1wSgI-4vg3rTzId92DS08VGuImXQEwhZlW6miPwpNzT-AuMtkXJpXW-a7ozyjv6PLw/exec`

## Workflow ID n8n
`hyGajjic2kZBVGvW` — `final-olivia-smartblocks`

## Supabase
- Projeto: `qdivfairxhdihaqqypgb`
- Tabela: `olivia_historico` (campos: id, status, error_message, google_doc_url, google_doc_id, finished_at, modo)
- Tabela: `olivia_blocos_texto` (campos: id, titulo, google_doc_id)
- Tabela: `olivia_modelos_peticao` (campos: id, nome, tipo_peticao_id, google_doc_id_origem, instrucoes_ia, modelo_grupo_id)
