# PATCHES — final-olivia-smartblocks (n8n `hyGajjic2kZBVGvW`)
> Gerado por Claude Code | 2026-03-16

---

## PATCH 1 — C1-MontarPayloadGAS (`jsCode`)
**Bug:** `titulo_documento` ausente no `gasPayload` → GAS retorna VALIDATION_ERROR. OAB duplicado ("RSRS116571").

**Node ID:** `c1-montar`

**Parâmetro alterado:** `parameters.jsCode`

### ANTES (trecho crítico):
```javascript
const oabCodigo = [advogado.oab_uf, advogado.oab].filter(Boolean).join('');
const oabFormatado = [advogado.oab_uf, advogado.oab].filter(Boolean).join('/');
// ...
const gasPayload = {
  processo: { numero: processo.numero_cnj || validado.processo_id },
  modelo:   modeloGoogleDocId ? { google_doc_id: modeloGoogleDocId } : null,
  // titulo_documento NÃO EXISTE aqui ← BUG CRÍTICO
  blocos,
  ...
};
```

### DEPOIS (jsCode completo corrigido):
```json
{
  "jsCode": "// C1-MontarPayloadGAS v4.1 — CORRIGIDO\nconst validado   = ($('A1-Validate').first() || {json:{}}).json;\nconst _proc = ($('B1-BuscarProcesso').first() || {json:[]}).json; const processo = (Array.isArray(_proc) ? (_proc[0] || {}) : _proc) || {};\nconst _adv = ($('B1b-BuscarAdvogado').first() || {json:[]}).json; const advogado = (Array.isArray(_adv) ? (_adv[0] || {}) : _adv) || {};\nconst _cli = ($('B1c-BuscarCliente').first() || {json:[]}).json; const cliente = (Array.isArray(_cli) ? (_cli[0] || {}) : _cli) || {};\nconst _emp = ($('B1d-BuscarEmpresa').first() || {json:[]}).json; const empresa = (Array.isArray(_emp) ? (_emp[0] || {}) : _emp) || {};\nconst _mdl = ($('B1e-BuscarModelo').first() || {json:[]}).json; const modeloRow = (Array.isArray(_mdl) ? (_mdl[0] || {}) : _mdl) || {};\nconst blocosData = ($('B2b-AgregaBlocos').first() || {json:{blocos:[]}}).json.blocos || [];\nconst jurisData  = $('B3-BuscarJuris').first().json.jurisprudencias || [];\n\n// ── Montar mapa de blocos (preserva ordem do frontend)\nconst blocoMap = {};\nfor (const b of blocosData) blocoMap[b.id] = b;\n\nconst blocos = validado.blocos_ids\n  .map((id, idx) => {\n    const b = blocoMap[id];\n    if (!b || !b.google_doc_id) return null;\n    return { ordem: idx + 1, placeholder: `{{bloco_${idx + 1}}}`, google_doc_id: b.google_doc_id };\n  })\n  .filter(Boolean);\n\nif (blocos.length === 0) throw new Error('Nenhum bloco com google_doc_id encontrado');\n\n// ── Jurisprudências\nconst jurisprudencias = jurisData\n  .map((j, idx) => (j.google_doc_id ? { placeholder: `{{jurisprudencia_${idx + 1}}}`, google_doc_id: j.google_doc_id, titulo: j.titulo || '' } : null))\n  .filter(Boolean);\n\n// ── Modelo google_doc_id\nconst modeloGoogleDocId = modeloRow.google_doc_id_origem || null;\n\n// ── Dados advogado\nconst metaAdv = advogado.meta || {};\nconst fonteLetra = metaAdv.fonte_letra || 'Arial';\nconst dadosBancarios = metaAdv.dados_bancarios || '';\nconst advCidade = metaAdv.cidade || 'Canoas';\nconst advRodape = advogado.cabecalho_escritorio || '';\n\n// FIX BUG 5: oab já contém o código com prefixo UF (ex: 'RS116571')\n// NÃO concatenar oab_uf + oab novamente\nconst oabCodigo = advogado.oab || '';\nconst oabNumero = advogado.oab_uf\n  ? oabCodigo.replace(new RegExp('^' + advogado.oab_uf), '').trim()\n  : oabCodigo;\nconst oabFormatado = advogado.oab_uf\n  ? `OAB/${advogado.oab_uf} ${oabNumero}`\n  : `OAB/${oabCodigo}`;\n\n// ── Dados cliente — sexo\nconst sexo = cliente.sexo || '';\nconst isMasc = sexo === 'Masculino' || sexo === 'M';\nconst qualificacaoSexo    = isMasc ? 'já qualificado'  : 'já qualificada';\nconst sexoNacionalidade   = isMasc ? 'brasileiro'      : 'brasileira';\nconst sexoInscrito        = isMasc ? 'inscrito'        : 'inscrita';\nconst sexoPortador        = isMasc ? 'portador'        : 'portadora';\nconst sexoDomiciliado     = isMasc ? 'domiciliado'     : 'domiciliada';\n\n// ── Endereço cliente\nconst clienteEndereco = [\n  cliente.endereco_logradouro || '',\n  cliente.endereco_numero ? `nº ${cliente.endereco_numero}` : '',\n  [cliente.cidade, cliente.endereco_uf].filter(Boolean).join('/'),\n  cliente.cep ? `CEP ${cliente.cep}` : ''\n].filter(Boolean).join(', ');\n\n// ── Estado extenso\nconst mapaEstados = { RS: 'Rio Grande do Sul', SP: 'São Paulo', SC: 'Santa Catarina', PR: 'Paraná', MG: 'Minas Gerais', RJ: 'Rio de Janeiro' };\nconst uf = (cliente.endereco_uf || processo.estado_id || '').toUpperCase();\nconst estadoExtenso = mapaEstados[uf] || uf;\n\n// ── Datas\nconst dataHoje = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' });\nconst dataRestricao = processo.restricao_data ? new Date(processo.restricao_data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '';\n\n// ── Valor causa: 15000 + restricao_valor\nconst restricaoValorNum = parseFloat(String(processo.restricao_valor || 0));\nconst valorCausaNum = 15000 + restricaoValorNum;\nconst valorCausaFmt = valorCausaNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 });\nconst restricaoValorFmt = restricaoValorNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 });\n\n// ── Endereçamento vara\nconst enderecamentoJson = processo.enderecamento || {};\nconst enderecamentoVara = enderecamentoJson.vara_civel || '';\n\n// ── Tags de substituição\nconst camposSubstituicao = {\n  '{{advogado_nome}}':               (advogado.nome || '').toUpperCase(),\n  '{{advogado_oab_codigo}}':         oabCodigo,\n  '{{advogado_oab}}':                oabFormatado,\n  '{{advogado_enderecamento}}':      advogado.cabecalho_escritorio || '',\n  '{{advogado_rodape}}':             advRodape,\n  '{{advogado_email}}':              advogado.email || '',\n  '{{advogado_cidade}}':             advCidade,\n  '{{dados_bancarios}}':             dadosBancarios,\n  '{{parte_autora}}':                (cliente.nome || '').toUpperCase(),\n  '{{cliente_nome}}':                cliente.nome  || '',\n  '{{empresa_re}}':                  processo.reu_nome || empresa.nome || '',\n  '{{reu_nome}}':                    processo.reu_nome || empresa.nome || '',\n  '{{numero_processo}}':             processo.numero_cnj || processo.numero_processo || '',\n  '{{numero_cnj}}':                  processo.numero_cnj || '',\n  '{{valor_restricao}}':             restricaoValorFmt,\n  '{{contrato_restricao}}':          processo.restricao_contrato || '',\n  '{{orgao_restritivo}}':            processo.restricao_orgao_nome || '',\n  '{{data_restricao}}':              dataRestricao,\n  '{{cliente_cpf}}':                 cliente.cpf_cnpj || '',\n  '{{cliente_rg}}':                  cliente.rg       || '',\n  '{{cliente_email}}':               cliente.email    || '',\n  '{{cliente_profissao}}':           cliente.profissao || '',\n  '{{cliente_endereco}}':            clienteEndereco,\n  '{{qualificacao_sexo}}':           qualificacaoSexo,\n  '{{cliente_sexo_nacionalidade}}':  sexoNacionalidade,\n  '{{cliente_sexo_inscrito}}':       sexoInscrito,\n  '{{cliente_sexo_portador}}':       sexoPortador,\n  '{{cliente_sexo_domiciliado}}':    sexoDomiciliado,\n  '{{data_hoje}}':                   dataHoje,\n  '{{estado_extenso}}':              estadoExtenso,\n  '{{valor_causa}}':                 valorCausaFmt,\n  '{{empresa_endereco}}':            '',\n  '{{categoria_empresa}}':           '',\n  '{{enderecamento_vara}}':          enderecamentoVara,\n  '{{cabecalho_escritorio}}':        advogado.cabecalho_escritorio || '',\n};\n\n// ── Título + nome do arquivo\nconst nomeArquivo = `Petição - ${processo.numero_cnj || ''} - ${cliente.nome || ''}`.trim();\n\n// ── Payload GAS v4.1\nconst gasPayload = {\n  titulo_documento: nomeArquivo,  // FIX: campo obrigatório para o GAS\n  processo: { numero: processo.numero_cnj || validado.processo_id },\n  modelo:   modeloGoogleDocId ? { google_doc_id: modeloGoogleDocId } : null,\n  blocos,\n  jurisprudencias,\n  campos_substituicao: camposSubstituicao,\n  configuracoes: {\n    nome_arquivo: nomeArquivo,\n    pasta_destino_id: '1JTbKJqbmPzRTLlqRYZEZ5pNY-w8r1ALZ',\n    fallback_to_root: true,\n    debug: false\n  },\n  config: {\n    fonte:                  fonteLetra,\n    tamanho_corpo:          12,\n    cabecalho_escritorio:   advogado.cabecalho_escritorio || '',\n    aplicar_fonte_global:   true\n  }\n};\n\nreturn [{ json: {\n  historico_id:   validado.historico_id,\n  organizacao_id: validado.organizacao_id,\n  gasPayload,\n  debug: {\n    blocos_count:       blocos.length,\n    juris_count:        jurisprudencias.length,\n    modelo_google_doc:  modeloGoogleDocId,\n    advogado_nome:      advogado.nome,\n    cliente_nome:       cliente.nome,\n    processo_cnj:       processo.numero_cnj\n  }\n}}];"
}
```

---

## PATCH 2 — B1-BuscarProcesso (query param `select`)
**Bug:** `select` não inclui campos usados no C1: `numero_cnj`, `restricao_valor`, `restricao_data`, `restricao_contrato`, `restricao_orgao_nome`, `enderecamento`, `reu_nome`.

**Node ID:** `b1-processo`

**Parâmetro alterado:** `parameters.queryParameters.parameters[1].value`

```json
{
  "name": "select",
  "value": "id,numero_processo,numero_cnj,organizacao_id,cliente_id,empresa_id,advogado_id,estado_id,reu_nome,restricao_valor,restricao_data,restricao_contrato,restricao_orgao_nome,enderecamento"
}
```

**ANTES:**
```
id,numero_processo,organizacao_id,cliente_id,empresa_id,advogado_id,estado_id
```

**DEPOIS:**
```
id,numero_processo,numero_cnj,organizacao_id,cliente_id,empresa_id,advogado_id,estado_id,reu_nome,restricao_valor,restricao_data,restricao_contrato,restricao_orgao_nome,enderecamento
```

---

## PATCH 3 — B1c-BuscarCliente (query param `select`)
**Bug:** coluna `cpf` não existe na tabela `clientes` (schema define `cpf_cnpj`). Também faltam `email` e `profissao` usados no C1.

**Node ID:** `b1c-cliente`

**Parâmetro alterado:** `parameters.queryParameters.parameters[1].value`

```json
{
  "name": "select",
  "value": "id,nome,cpf_cnpj,rg,sexo,email,profissao,endereco_logradouro,endereco_numero,cidade,endereco_uf,cep"
}
```

**ANTES:**
```
id,nome,cpf,rg,sexo,endereco_logradouro,endereco_numero,cidade,endereco_uf,cep
```

**DEPOIS:**
```
id,nome,cpf_cnpj,rg,sexo,email,profissao,endereco_logradouro,endereco_numero,cidade,endereco_uf,cep
```

---

## PATCH 4 — B3-BuscarJuris (`jsCode`)
**Bug:** usa `.item.json` (API legada n8n v3) em vez de `.first().json`.

**Node ID:** `b3-juris`

**Parâmetro alterado:** `parameters.jsCode`

**ANTES:**
```javascript
const validado = $('A1-Validate').item.json;
```

**DEPOIS (jsCode completo):**
```json
{
  "jsCode": "// Buscar jurisprudências — só se IDs não vazio\nconst validado = $('A1-Validate').first().json;\nconst ids = validado.jurisprudencias_ids || [];\nif (ids.length === 0) {\n  return [{ json: { jurisprudencias: [] } }];\n}\n// Se tem IDs, retorna vazio por ora (HTTP Request separado chamaria)\nreturn [{ json: { jurisprudencias: [] } }];"
}
```

---

## PATCH 5 — D1-SalvarSucesso (query param `id`)
**Bug:** `$('C1-MontarPayloadGAS').item.json` — `.item` é API n8n v3 e pode falhar em v4+.

**Node ID:** `d1-sucesso`

**Parâmetro alterado:** `parameters.queryParameters.parameters[0].value`

**ANTES:**
```
=eq.{{ $('C1-MontarPayloadGAS').item.json.historico_id }}
```

**DEPOIS:**
```json
{
  "name": "id",
  "value": "=eq.{{ $('C1-MontarPayloadGAS').first().json.historico_id }}"
}
```

---

## PATCH 6 — D2-SalvarErroGAS (query param `id`)
**Bug:** mesmo problema que D1 com `.item.json`.

**Node ID:** `d2-erro`

**Parâmetro alterado:** `parameters.queryParameters.parameters[0].value`

**ANTES:**
```
=eq.{{ $('C1-MontarPayloadGAS').item.json.historico_id }}
```

**DEPOIS:**
```json
{
  "name": "id",
  "value": "=eq.{{ $('C1-MontarPayloadGAS').first().json.historico_id }}"
}
```

---

## PATCH 7 — E1-SalvarErroGlobal (`jsCode`)
**Bug:** o error handler apenas loga o erro e retorna — nunca faz PATCH no `olivia_historico`, deixando o job em `PENDENTE` para sempre.

**Node ID:** `err-handler`

**Parâmetro alterado:** `parameters.jsCode`

**ANTES:**
```javascript
const errData = $input.first().json;
const lastError = errData.error || {};
const nodeName = lastError.node?.name || 'desconhecido';
const errorMsg = lastError.message || 'Erro desconhecido';
console.log('[E1] Error global em [' + nodeName + ']: ' + errorMsg);
return [{ json: { ok: false, error: errorMsg, node: nodeName } }];
```

**DEPOIS (jsCode completo):**
```json
{
  "jsCode": "// E1-SalvarErroGlobal v2 — salva status ERRO no Supabase\nconst SUPABASE_URL = 'https://qdivfairxhdihaqqypgb.supabase.co';\nconst SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkaXZmYWlyeGhkaWhhcXF5cGdiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTA3MzcwOCwiZXhwIjoyMDg2NjQ5NzA4fQ.zu_reCiKzCqLETOWxytYQmez1SIwFRDlOruzsLOpBeY';\nconst N8N_BASE_URL = 'https://primary-production-e209.up.railway.app';\nconst N8N_API_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5MjhhOTg3OC04NWUyLTRlZTgtYjYxYS00NWE2ZjkxZDczODEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzczMTA4NTQ0fQ.fm6pT29355eg3UA_Qe90SF3DK-Tdo5ybzQcNkBQZTHI';\n\nconst errData  = $input.first().json;\nconst exec     = errData.execution || {};\nconst lastErr  = exec.error || errData.error || {};\nconst nodeName = lastErr.node?.name || exec.lastNodeExecuted || 'desconhecido';\nconst errorMsg = lastErr.message || 'Erro desconhecido';\nconst execId   = exec.id;\n\nconst result = { ok: false, error: errorMsg, node: nodeName };\n\n// Tentar obter historico_id via API n8n (execução que falhou)\nlet historicoId = null;\nif (execId) {\n  try {\n    const execDetails = await this.helpers.httpRequest({\n      method: 'GET',\n      url: `${N8N_BASE_URL}/api/v1/executions/${execId}?includeData=true`,\n      headers: { 'X-N8N-API-KEY': N8N_API_KEY }\n    });\n    // historico_id vem do body do webhook (A1-Validate extrai para root)\n    const runData = execDetails?.data?.resultData?.runData;\n    const a1Output = runData?.['A1-Validate']?.[0]?.data?.main?.[0]?.[0]?.json;\n    if (a1Output?.historico_id) {\n      historicoId = a1Output.historico_id;\n    } else {\n      // Fallback: tentar do webhook body\n      const whOutput = runData?.['WH-SmartBlocks']?.[0]?.data?.main?.[0]?.[0]?.json;\n      historicoId = whOutput?.body?.historico_id || whOutput?.historico_id || null;\n    }\n  } catch(apiErr) {\n    result.api_error = apiErr.message;\n  }\n}\n\nresult.historico_id = historicoId;\n\n// Atualizar olivia_historico com status ERRO\nif (historicoId) {\n  try {\n    await this.helpers.httpRequest({\n      method: 'PATCH',\n      url: `${SUPABASE_URL}/rest/v1/olivia_historico?id=eq.${historicoId}`,\n      headers: {\n        'apikey': SUPABASE_KEY,\n        'Authorization': `Bearer ${SUPABASE_KEY}`,\n        'Content-Type': 'application/json',\n        'Prefer': 'return=minimal'\n      },\n      body: JSON.stringify({\n        status: 'ERRO',\n        error_message: `[${nodeName}] ${errorMsg}`,\n        finished_at: new Date().toISOString()\n      })\n    });\n    result.supabase_updated = true;\n  } catch(patchErr) {\n    result.supabase_error = patchErr.message;\n  }\n}\n\nreturn [{ json: result }];"
}
```

---

## Resumo dos patches

| # | Node | ID | Tipo de bug | Severidade |
|---|------|----|-------------|------------|
| 1 | C1-MontarPayloadGAS | `c1-montar` | `titulo_documento` ausente no gasPayload + OAB duplicado | **CRÍTICO** |
| 2 | B1-BuscarProcesso | `b1-processo` | `select` incompleto — campos ausentes | **ALTO** |
| 3 | B1c-BuscarCliente | `b1c-cliente` | coluna `cpf` não existe (deve ser `cpf_cnpj`) | **ALTO** |
| 4 | B3-BuscarJuris | `b3-juris` | `.item.json` legado n8n v3 | **MÉDIO** |
| 5 | D1-SalvarSucesso | `d1-sucesso` | `.item.json` legado n8n v3 | **ALTO** |
| 6 | D2-SalvarErroGAS | `d2-erro` | `.item.json` legado n8n v3 | **ALTO** |
| 7 | E1-SalvarErroGlobal | `err-handler` | Não salva no Supabase — job fica em PENDENTE | **MÉDIO** |
