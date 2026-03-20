# RELATÓRIO — Diagnóstico final-olivia-smartblocks
> Gerado por Claude Code | 2026-03-16

---

## Status geral

O workflow nunca chegou ao status `CONCLUIDO` em nenhuma execução de teste porque falha em cascata:

1. **BUG CRÍTICO em C1** → `titulo_documento` ausente no gasPayload → GAS retorna VALIDATION_ERROR
2. **BUG ALTO em B1** → `select` incompleto → campos de processo chegam `undefined` no C1 → tags de substituição ficam vazias
3. **BUG ALTO em B1c** → coluna `cpf` inexistente → Supabase pode retornar erro 400 ou retornar `cpf: null`
4. **BUGS em D1/D2** → `.item.json` legado → pode crashar ao tentar salvar resultado

---

## Lista completa de bugs

### BUG 1 — `titulo_documento` ausente no gasPayload (CRÍTICO)
- **Node:** C1-MontarPayloadGAS
- **Root cause:** O objeto `gasPayload` no código do C1 não tem a propriedade `titulo_documento`. O GAS valida esse campo como obrigatório e retorna `VALIDATION_ERROR` imediatamente.
- **Evidência:** GAS responde `{"success":false,"error_code":"VALIDATION_ERROR","error_message":"titulo_documento é obrigatório e deve ser string não-vazia"}`
- **Fix:** Adicionar `titulo_documento: nomeArquivo` no objeto `gasPayload` dentro do jsCode do C1.
- **Status: CORRIGIDO no PATCHES.md (PATCH 1)**

---

### BUG 2 — OAB duplicado ("RSRS116571") (ALTO)
- **Node:** C1-MontarPayloadGAS
- **Root cause:** Código faz `[advogado.oab_uf, advogado.oab].join('')` — mas `advogado.oab` já contém o prefixo UF ("RS116571"), então concatenar `oab_uf` ("RS") resulta em "RSRS116571".
- **Evidência:** `"{{advogado_oab_codigo}}": "RSRS116571"` e `"{{advogado_oab}}": "OAB/RS/RS116571"` no output de C1.
- **Fix:** `const oabCodigo = advogado.oab || ''` e formatação correta com `OAB/${oab_uf} ${numero}`.
- **Status: CORRIGIDO no PATCHES.md (PATCH 1)**

---

### BUG 3 — B1-BuscarProcesso `select` incompleto (ALTO)
- **Node:** B1-BuscarProcesso
- **Root cause:** O `select` busca apenas `id,numero_processo,organizacao_id,cliente_id,empresa_id,advogado_id,estado_id`. Os campos usados em C1 (`numero_cnj`, `restricao_valor`, `restricao_data`, `restricao_contrato`, `restricao_orgao_nome`, `enderecamento`, `reu_nome`) não são buscados → chegam como `undefined`.
- **Impacto:** Todas as tags `{{numero_processo}}`, `{{valor_restricao}}`, `{{contrato_restricao}}`, `{{orgao_restritivo}}`, `{{data_restricao}}`, `{{reu_nome}}`, `{{enderecamento_vara}}` ficam vazias no documento final.
- **Status: CORRIGIDO no PATCHES.md (PATCH 2)**

---

### BUG 4 — B1c-BuscarCliente usa coluna `cpf` inexistente (ALTO)
- **Node:** B1c-BuscarCliente
- **Root cause:** O `select` inclui `cpf`, mas o schema da tabela `clientes` define `cpf_cnpj`. Supabase retorna todos os outros campos mas `cpf` fica `null`, e o C1 usa `cliente.cpf_cnpj` que nunca foi selecionado.
- **Impacto duplo:** (a) tag `{{cliente_cpf}}` sempre vazia; (b) se Supabase lançar erro 400 por coluna inexistente, o fluxo inteiro quebra.
- **Fix adicional:** Também faltavam `email` e `profissao` no select, usados em C1.
- **Status: CORRIGIDO no PATCHES.md (PATCH 3)**

---

### BUG 5 — B3-BuscarJuris usa API legada `.item.json` (MÉDIO)
- **Node:** B3-BuscarJuris
- **Root cause:** `$('A1-Validate').item.json` — `.item` é API n8n v3. Em n8n v4+, o correto é `.first().json`.
- **Impacto:** Pode lançar exceção em execuções onde o item pairing não é trivial.
- **Status: CORRIGIDO no PATCHES.md (PATCH 4)**

---

### BUG 6 — D1-SalvarSucesso usa `.item.json` legado (ALTO)
- **Node:** D1-SalvarSucesso
- **Root cause:** Query param `id` usa `$('C1-MontarPayloadGAS').item.json.historico_id` — API n8n v3. Em v4+, `.item` em nós não-input pode falhar ou retornar `undefined`.
- **Impacto:** PATCH ao Supabase usa `id=eq.undefined` → atualiza 0 linhas → job fica em PENDENTE mesmo quando GAS funciona.
- **Status: CORRIGIDO no PATCHES.md (PATCH 5)**

---

### BUG 7 — D2-SalvarErroGAS usa `.item.json` legado (ALTO)
- **Node:** D2-SalvarErroGAS
- **Root cause:** Mesmo problema que D1.
- **Impacto:** Quando GAS retorna erro, o job fica em PENDENTE em vez de ERRO.
- **Status: CORRIGIDO no PATCHES.md (PATCH 6)**

---

### BUG 8 — E1-SalvarErroGlobal não salva no Supabase (MÉDIO)
- **Node:** E1-SalvarErroGlobal
- **Root cause:** O código apenas faz `console.log` e retorna um objeto local. Nunca faz PATCH no `olivia_historico`. Jobs que crasham por exceção ficam em `PENDENTE` para sempre.
- **Fix:** Usar `this.helpers.httpRequest` para chamar a API n8n e recuperar o `historico_id` da execução que falhou, depois fazer PATCH no Supabase.
- **Status: CORRIGIDO no PATCHES.md (PATCH 7)**

---

### BUG 9 — GAS lê payload incorretamente (CRÍTICO — na versão anterior do GAS)
- **Análise:** O GAS antigo possivelmente usava `e.parameter.titulo_documento` (URL params) em vez de `JSON.parse(e.postData.contents).titulo_documento` (JSON body). O n8n envia o payload via `Content-Type: application/json` no body.
- **Fix:** GAS_ATUALIZADO.txt usa `JSON.parse(e.postData.contents)` corretamente.
- **Status: CORRIGIDO no GAS_ATUALIZADO.txt**

---

## Bugs marcados como NÃO-BUG

| Item | Análise |
|------|---------|
| BUG 3 (Briefing) — A1-Validate espera `body.data.*` | Não é bug. O código corretamente lê `body.data.*` do payload. Confirmado funcionando. |
| BUG 4 (Briefing) — B1-BuscarProcesso retorna array | Não é bug. C1 já trata corretamente com `Array.isArray(_proc) ? _proc[0] : _proc`. |
| D2-SalvarErroGAS body vazio | Não confirmado no JSON atual. O `body` já estava correto com `JSON.stringify(...)`. Bug aparentemente já tinha sido corrigido antes. |

---

## Fluxo de execução esperado após patches

```
WH-SmartBlocks POST → A1-Validate (extrai campos)
  → A-Respond202 (retorna 202 imediatamente)
    → [paralelo]
      B1-BuscarProcesso (SELECT com todos os campos ✓)
        → B1b-BuscarAdvogado
        → B1c-BuscarCliente (select cpf_cnpj ✓)
        → B1d-BuscarEmpresa
      B1e-BuscarModelo
      B2-BuscarBlocos → B2b-AgregaBlocos
      B3-BuscarJuris (first().json ✓)
    → [todos convergem em]
      C1-MontarPayloadGAS
        gasPayload.titulo_documento = "Petição - {cnj} - {cliente}" ✓
        oabCodigo = "RS116571" ✓
        oabFormatado = "OAB/RS 116571" ✓
      → C2-ChamarGAS (POST JSON ao GAS)
        GAS recebe JSON.parse(e.postData.contents) ✓
        GAS valida titulo_documento → passa ✓
        GAS copia modelo, insere blocos, substitui tags, aplica fonte
        GAS retorna {success: true, url: ..., google_doc_id: ...}
      → C3-CheckGAS (success == true?)
        → true: D1-SalvarSucesso (PATCH id=eq.historico_id ✓)
                status=CONCLUIDO, google_doc_url=... ← JOB CONCLUÍDO
        → false: D2-SalvarErroGAS (PATCH id=eq.historico_id ✓)
                 status=ERRO
```

---

## Arquivos produzidos

| Arquivo | Conteúdo |
|---------|----------|
| `PATCHES.md` | 7 patches JSON prontos para aplicar via n8n API (PUT `/api/v1/workflows/hyGajjic2kZBVGvW`) |
| `GAS_ATUALIZADO.txt` | Google Apps Script completo e funcional para substituir o script atual |
| `RELATORIO.md` | Este arquivo |

---

## Prioridade de aplicação

1. **PATCH 1** (C1 — titulo_documento + OAB) — resolve o VALIDATION_ERROR imediato
2. **PATCH 2** (B1 — select completo) — resolve tags vazias no documento
3. **PATCH 3** (B1c — cpf_cnpj) — resolve CPF do cliente
4. **PATCH 5 + 6** (D1 + D2 — .first()) — resolve saving do resultado
5. **GAS_ATUALIZADO.txt** — implantar no Google Apps Script
6. **PATCH 4** (B3 — .first()) — resolve potencial crash no juris
7. **PATCH 7** (E1 — salvar erro) — melhoria do error handler
