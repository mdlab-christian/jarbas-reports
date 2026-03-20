# final-olivia-analise — Workflow para Deep Review

## Contexto do Projeto
- **MdFlow** — plataforma LegalTech para escritório Midas
- **OlivIA** — módulo de análise jurídica com IA
- **Objetivo do workflow**: receber webhook do frontend, analisar processo juridicamente via Claude, retornar resultado estruturado em JSON com:
  - Análise probatória das provas
  - Mapeamento de tags da categoria → blocos de texto
  - Perguntas de triagem para Step 2 (Express)
  - Chance de sucesso (1/2/3)
  - Update em `olivia_analises` + `processos`

## Stack
- n8n (Railway) para orquestração
- Supabase (PostgreSQL) para persistência
- Claude Sonnet 4-6 via LangChain node para análise
- OpenAI text-embedding-ada-002 para RAG
- Supabase Storage para documentos PDF

## Fluxo Geral (Fases A-F)

**A** — Webhook + Validação + INSERT olivia_analises
**B** — GET Processo + Tags/Blocos + Playbook
**C** — Extração de Documentos PDF (loop)
**D** — RAG dinâmico + Montagem do pacote
**E** — Análise Claude Sonnet + Parse do JSON
**F** — Salvar resultado + UPDATE processos

## Payload de Entrada (via webhook POST /mdflow/olivia/analise)
```json
{
  "request_id": "uuid",
  "organizacao_id": "uuid",
  "user_id": "uuid",
  "data": {
    "processo_id": "uuid",
    "tipo": "PROVAS",
    "arquivos": [{"file_name": "...", "path": "...", "mime_type": "application/pdf"}],
    "contexto": "contexto adicional opcional"
  }
}
```

## Resposta (202 imediato)
```json
{
  "success": true,
  "analise_id": "uuid",
  "status": "PROCESSANDO",
  "message": "Análise iniciada. Use analise_id para polling."
}
```

## Tabelas Supabase relevantes
- `olivia_analises` — job de análise (status, resultado, meta com progresso)
- `processos` — processo jurídico (ia_resumo, chance_sucesso_ia)
- `webhook_requests` — log de chamadas
- `empresas` + `empresas_categorias` — empresa ré e categoria
- `clientes`, `advogados`, `comarcas_varas` — dados do processo
- RPCs: `fn_get_tags_and_blocos_for_analise`, `fn_get_playbook_for_context`, `fn_rag_search`

## Nodes — Descrição Detalhada

### WH-Analise (wh-analise-v3)
**Tipo:** `n8n-nodes-base.webhook`
**Path:** `mdflow/olivia/analise`
**Method:** `POST`
**ResponseMode:** `responseNode`
**Saída para:** `A1-LogWebhook-INSERT`

### A1-LogWebhook-INSERT (a1-log-insert)
**Tipo:** `n8n-nodes-base.httpRequest`
**Method:** `POST`
**URL:** `https://qdivfairxhdihaqqypgb.supabase.co/rest/v1/webhook_requests`
**Body template:**
```
={{ JSON.stringify({
  organizacao_id: $json.body.organizacao_id,
  user_id: $json.body.user_id,
  webhook_nome: 'olivia-analise-v3',
  contexto: 'olivia.analise.v3',
  rota_origem: '/webhook/mdflow/olivia/analise',
  status: 'processing',
  payload: $json.body
}) }}
```
**Saída para:** `A2-ValidatePayload`

### A2-ValidatePayload (a2-validate)
**Tipo:** `n8n-nodes-base.code`
**Code:**
```javascript
// A2 — Validação simples do payload
const body = $('WH-Analise').item.json.body;
const campos = ['request_id', 'organizacao_id', 'user_id'];
const camposData = ['processo_id'];

const erros = [];
for (const campo of campos) {
  if (!body?.[campo]) erros.push(`Campo obrigatório ausente: ${campo}`);
}
for (const campo of camposData) {
  if (!body?.data?.[campo]) erros.push(`Campo obrigatório ausente em data: ${campo}`);
}

return [{ json: { valid: erros.length === 0, error: erros[0] || null, errors: erros } }];
```
**Saída para:** `A3-PayloadValido?`

### A3-PayloadValido? (a3-if-valid)
**Tipo:** `n8n-nodes-base.if`
**Conditions:** [{"id": "valid", "leftValue": "={{ $json.valid }}", "rightValue": true, "operator": {"type": "boolean", "operation": "equals"}}]
**Saída para:** `A4-INSERT-olivia_analises`, `A-Respond-Error`

### A4-INSERT-olivia_analises (a4-insert-analise)
**Tipo:** `n8n-nodes-base.httpRequest`
**Method:** `POST`
**URL:** `https://qdivfairxhdihaqqypgb.supabase.co/rest/v1/olivia_analises`
**Body template:**
```
={{ JSON.stringify({
  organizacao_id: $('WH-Analise').item.json.body.organizacao_id,
  processo_id: $('WH-Analise').item.json.body.data.processo_id,
  user_id: $('WH-Analise').item.json.body.user_id,
  tipo: $('WH-Analise').item.json.body.data.tipo || 'PROVAS',
  arquivos: $('WH-Analise').item.json.body.data.arquivos || [],
  contexto: $('WH-Analise').item.json.body.data.contexto || '',
  status: 'PROCESSANDO',
  meta: {progresso: 5, fase: 'Iniciando análise...', request_id: $('WH-Analise').ite
```
**Saída para:** `A-Respond-202`, `B1-Prep`

### A-Respond-202 (a-respond-202)
**Tipo:** `n8n-nodes-base.respondToWebhook`
**ResponseCode:** `202`
**Body:** `={{ JSON.stringify({success: true, analise_id: Array.isArray($json) ? $json[0].id : $json.id, status: 'PROCESSANDO', message: 'Análise iniciada. Use analise_id para polling.'}) }}`

### A-Respond-Error (a-respond-error)
**Tipo:** `n8n-nodes-base.respondToWebhook`
**ResponseCode:** `400`
**Body:** `={{ JSON.stringify({success: false, error: $('A2-ValidatePayload').item.json.error || 'Payload inválido', code: 'VALIDATION_ERROR'}) }}`

### B4-UPDATE-Classificando (b4-update-progress)
**Tipo:** `n8n-nodes-base.httpRequest`
**Method:** `PATCH`
**URL:** `=https://qdivfairxhdihaqqypgb.supabase.co/rest/v1/olivia_analises`
**Body template:**
```
={{ JSON.stringify({ "meta":  JSON.stringify({progresso: 20, fase: 'Contexto carregado. Classificando documentos...', categoria: $json.categoria_nome, tags_count: $json.total_tags, playbook: $json.playbook.nome}) }) }}
```
**Query params:** [{'name': 'id', 'value': '=eq.{{ $json.analise_id }}'}]
**Saída para:** `B4-PassCtx`

### C1-SplitDocs (c1-split-docs)
**Tipo:** `n8n-nodes-base.code`
**Code:**
```javascript
// C1 — Preparar array de documentos para extração
const ctx = $('B3-Process').item.json;
const arquivos = ctx.arquivos_input || [];

const docs = arquivos.map(arq => ({
  filename: arq.file_name || arq.filename || 'documento.pdf',
  storage_path: arq.path || arq.storage_path || '',
  mime_type: arq.mime_type || 'application/pdf',
  documento_tipo: null,
  extraction_model: null,
  extracted: null,
  qualidade_extracao: 0
}));

// Sempre retornar ao menos 1 item com o contexto
// _has_docs indica se tem arquivos para processar
if (docs.length === 0) {
  return [{ json: { ...ctx, docs_extraidos: [], total_docs: 0, qualidade_media: 0, _has_docs: false } }];
}
return docs.map(d => ({ json: { ...ctx, doc_atual: d, _has_docs: true } }));
```
**Saída para:** `C1b-HasDocs?`

### C2-Loop-Docs (c2-loop-docs)
**Tipo:** `n8n-nodes-base.splitInBatches`
**BatchSize:** `1`
**Saída para:** `C3-FetchArquivo`, `D1-ConsolidarDocs`

### C3-FetchArquivo (c3-fetch-arquivo)
**Tipo:** `n8n-nodes-base.httpRequest`
**Method:** `GET`
**URL:** `https://qdivfairxhdihaqqypgb.supabase.co/storage/v1/object/sign/processos/{{ $json.doc_atual.storage_path }}`
**Body template:**
```
={"expiresIn": 3600}
```
**Saída para:** `C4-ExtractPDF`

### C4-ExtractPDF (c4-extract-pdf)
**Tipo:** `n8n-nodes-base.extractFromFile`
**Operation:** `pdf`
**Saída para:** `C5-FormatPDF`

### C5-FormatPDF (c5-format-pdf)
**Tipo:** `n8n-nodes-base.code`
**Code:**
```javascript
// C5 — Formatar texto extraído do PDF
const ctx = $('C2-Loop-Docs').item.json;
const extracted = $input.item;

const texto = extracted.json?.text || '';
const DOC_BUDGET = 20000; // chars por doc
const texto_truncado = texto.substring(0, DOC_BUDGET);
const qualidade = texto_truncado.trim().length > 100 ? 80 : 20;

return [{
  json: {
    ...ctx,
    doc_atual: {
      ...ctx.doc_atual,
      extracted: {
        texto_completo: texto_truncado,
        qualidade_extracao: qualidade,
        method: 'pdf_native'
      },
      extraction_model: 'n8n-extract-pdf',
      qualidade_extracao: qualidade
    }
  }
}];
```
**Saída para:** `C2-Loop-Docs`

### D1-ConsolidarDocs (d1-consolidar)
**Tipo:** `n8n-nodes-base.code`
**Code:**
```javascript
// D1 — Consolidar todos os docs extraídos e preparar para análise
const allDocs = $input.all().map(item => item.json.doc_atual);
const ctx = $input.first().json;

// Consolidar docs
const docs_extraidos = allDocs.filter(d => d && d.extracted);
const qualidade_media = docs_extraidos.length > 0
  ? Math.round(docs_extraidos.reduce((s, d) => s + (d.qualidade_extracao || 0), 0) / docs_extraidos.length)
  : 0;

return [{
  json: {
    ...ctx,
    docs_extraidos,
    total_docs: docs_extraidos.length,
    qualidade_media
  }
}];
```
**Saída para:** `D2-UPDATE-50pct`

### D2-UPDATE-50pct (d2-update-50)
**Tipo:** `n8n-nodes-base.httpRequest`
**Method:** `PATCH`
**URL:** `=https://qdivfairxhdihaqqypgb.supabase.co/rest/v1/olivia_analises`
**Body template:**
```
={{ JSON.stringify({ "meta":  JSON.stringify({progresso: 50, fase: 'Documentos extraídos. Buscando jurisprudência relevante...', total_docs: $json.total_docs, qualidade_media: $json.qualidade_media}) }) }}
```
**Query params:** [{'name': 'id', 'value': '=eq.{{ $json.analise_id }}'}]
**Saída para:** `D2-PassCtx`

### D3-GerarEmbedding (d3-embedding)
**Tipo:** `n8n-nodes-base.httpRequest`
**Method:** `POST`
**URL:** `https://api.openai.com/v1/embeddings`
**Body template:**
```
={{ JSON.stringify({"model": "text-embedding-ada-002", "input": $json.rag_query.substring(0, 8000)}) }}
```
**Saída para:** `D4-BuscarRAG`

### D4-BuscarRAG (d4-rag-search)
**Tipo:** `n8n-nodes-base.httpRequest`
**Method:** `POST`
**URL:** `https://qdivfairxhdihaqqypgb.supabase.co/rest/v1/rpc/fn_rag_search`
**Body template:**
```
={{ JSON.stringify({p_query_embedding: $json.data[0].embedding, p_organizacao_id: $('D2-PassCtx').item.json.organizacao_id, p_source_types: ['jurisprudencia', 'peticao'], p_top_k: 8, p_min_score: 0.3, p_agent_key: 'olivia-analise-provas'}) }}
```
**Saída para:** `D4b-AggRAG`

### D5-MontarPacote (d5-montar-pacote)
**Tipo:** `n8n-nodes-base.code`
**Code:**
```javascript
// D5 — Montar pacote completo para análise
const ctx = $('D2-PassCtx').item.json;
const ragRaw = $input.item.json._rag_results || [];

const ragResults = Array.isArray(ragRaw) ? ragRaw : [];
const jurisprudencias = ragResults.map(c => ({
  titulo: c.titulo,
  conteudo: c.conteudo?.substring(0, 500),
  score: c.score,
  source_type: c.source_type,
  tribunal: c.metadata?.tribunal || null
}));

// Truncar blocos para context window (max 200 chars cada)
const blocos_truncados = (ctx.blocos || []).map(b => ({
  id: b.id,
  titulo: b.titulo,
  tag_ids: b.tag_ids,
  conteudo_preview: (b.conteudo_preview || '').substring(0, 200)
}));

return [{
  json: {
    analise_id: ctx.analise_id,
    organizacao_id: ctx.organizacao_id,
    processo_id: ctx.processo_id,
    request_id: ctx.request_id,
    user_id: ctx.user_id,
    tipo_analise: ctx.tipo_analise,
    processo: ctx.processo,
    empresa: ctx.empresa,
    categoria_id: ctx.categoria_id,
    categoria_nome: ctx.categoria_nome,
    cliente: ctx.cliente,
    advogado: ctx.advogado,
    comarca: ctx.comarca,
    docs_extraidos: ctx.docs_extraidos,
    total_docs: ctx.total_docs,
    qualidade_media: ctx.qualidade_media,
    tags: ctx.tags || [],
    total_tags: ctx.total_tags || 0,
    blocos: blocos_truncados,
    total_blocos: ctx.total_blocos || 0,
    playbook: ctx.playbook,
    jurisprudencias: {
      total: jurisprudencias.length,
      chunks: jurisprudencias
    },
    analise_anterior: ctx.analise_anterior
  }
}];
```
**Saída para:** `E1-UPDATE-60pct`

### E1-UPDATE-60pct (e1-update-60)
**Tipo:** `n8n-nodes-base.httpRequest`
**Method:** `PATCH`
**URL:** `=https://qdivfairxhdihaqqypgb.supabase.co/rest/v1/olivia_analises`
**Body template:**
```
={{ JSON.stringify({ "meta":  JSON.stringify({progresso: 60, fase: 'Analisando perguntas da categoria...', tags_count: $json.total_tags, rag_count: $json.jurisprudencias.total}) }) }}
```
**Query params:** [{'name': 'id', 'value': '=eq.{{ $json.analise_id }}'}]
**Saída para:** `E1-PassCtx`

### E2-PrepararInput-Claude (e2-preparar-input)
**Tipo:** `n8n-nodes-base.code`
**Code:**
```javascript
// E2 — Preparar input para Claude Sonnet (análise unificada: tags + probatória)
const p = $('D5-MontarPacote').item.json;

const SYSTEM_PROMPT = `<identidade>
Você é a OlivIA, analista probatória sênior do escritório Midas (MDX LegalTech).
Especializada em direito do consumidor, restrições de crédito e análise documental probatória.
</identidade>

<objetivo>
Realizar análise probatória COMPLETA. Você deve:
1. Analisar as provas documentais do processo
2. Para cada TAG da categoria, decidir qual BLOCO DE TEXTO usar (ou gerar pergunta se incerto)
3. Retornar SEMPRE um JSON válido e estruturado — NENHUM texto fora do JSON

REGRA ABSOLUTA: Sua resposta é EXCLUSIVAMENTE um objeto JSON. Nenhum texto antes ou depois.
</objetivo>

<legislacao_base>
- CDC Art. 43: Cadastros de inadimplentes — prazo máximo 5 anos, comunicação prévia obrigatória
- CDC Art. 14: Responsabilidade objetiva do fornecedor
- CDC Art. 6, VIII: Inversão do ônus da prova
- CDC Art. 42: Vedação de exposição ao ridículo na cobrança
- CC Art. 186 e 927: Responsabilidade civil por ato ilícito
- Súmula 385 STJ: Negativação preexistente legítima afasta dano moral
- Súmula 479 STJ: Responsabilidade objetiva de instituições financeiras
- Súmula 359 STJ: Comunicação prévia ao consumidor obrigatória
- Dano moral in re ipsa em negativação indevida
</legislacao_base>

<playbook_categoria>
${p.playbook?.instrucoes || 'Análise padrão — sem playbook específico para esta categoria.'}
</playbook_categoria>`;

// Documentos extraídos (truncados)
const docsTexto = (p.docs_extraidos || []).map((d, i) =>
  `[DOC ${i+1}: ${d.filename}]\n${d.extracted?.texto_completo?.substring(0, 15000) || '(sem texto extraído)'}`
).join('\n\n---\n\n');

// Tags e blocos disponíveis
const tagsTexto = (p.tags || []).map(t =>
  `Tag ID: ${t.id} | Código: ${t.codigo} | Nome: ${t.nome}`
).join('\n');

const blocosTexto = (p.blocos || []).map(b =>
  `Bloco ID: ${b.id} | Titulo: ${b.titulo}\nPreview: ${b.conteudo_preview}`
).join('\n---\n');

// Jurisprudência
const jurisTexto = (p.jurisprudencias?.chunks || []).map((j, i) =>
  `[JURIS ${i+1}] ${j.titulo} (score: ${j.score?.toFixed(2)})\n${j.conteudo}`
).join('\n\n');

// Análise anterior
const anteriorTexto = p.analise_anterior
  ? `ANÁLISE ANTERIOR (${p.analise_anterior.created_at?.substring(0,10)}): ${JSON.stringify(p.analise_anterior.resultado?.visao_geral || '').substring(0, 500)}`
  : 'Primeira análise deste processo.';

const USER_MESSAGE = `<processo>
Número: ${p.processo?.numero_cnj || p.processo?.numero_processo || 'N/A'}
Tipo: ${p.processo?.tipo_processo || 'N/A'}
Objeto: ${p.processo?.objeto || 'N/A'}
Empresa Ré: ${p.empresa?.nome || 'N/A'}
Categoria: ${p.categoria_nome}
Cliente: ${p.cliente?.nome || 'N/A'}
</processo>

<documentos_extraidos>
${docsTexto || '(Nenhum documento enviado)'}
</documentos_extraidos>

<tags_da_categoria title="Tags = perguntas que a IA deve responder com blocos">
${tagsTexto || '(Nenhuma tag cadastrada para esta categoria)'}
</tags_da_categoria>

<blocos_disponiveis title="Blocos = opções de resposta para as tags">
${blocosTexto || '(Nenhum bloco cadastrado)'}
</blocos_disponiveis>

<jurisprudencia_rag>
${jurisTexto || '(Sem jurisprudência encontrada)'}
</jurisprudencia_rag>

<contexto_historico>
${anteriorTexto}
</contexto_historico>

<contexto_adicional>
${p.contexto_adicional || ''}
</contexto_adicional>

<instrucoes_resposta>
Retorne um JSON com EXATAMENTE esta estrutura (sem campos extras no nível raiz, sem markdown):
{
  "visao_geral": "resumo executivo do caso",
  "pontos_fortes": ["string"],
  "pontos_fracos": ["string"],
  "analise_probatoria": "análise detalhada das provas",
  "riscos": [{"descricao": "string", "severidade": "ALTO|MEDIO|BAIXO", "mitigacao": "string"}],
  "recomendacoes": ["string"],
  "chance_sucesso": 1 ou 2 ou 3,
  "documentos_faltantes": ["string"],
  "analise_tags": [
    {
      "tag_id": "uuid",
      "tag_nome": "string",
      "bloco_id": "uuid ou null",
      "bloco_titulo": "string ou null",
      "confianca": 0.0-1.0,
      "justificativa": "por que escolheu este bloco",
      "pergunta_usuario": "null ou string (quando confianca < 0.7)"
    }
  ],
  "perguntas_triagem": [
    {
      "id": "string único",
      "ordem": 1,
      "texto": "pergunta para o usuário",
      "tipo": "text|textarea|select|multiselect|date|number",
      "obrigatoria": true,
      "opcoes": [],
      "tag_ref": "uuid ou null",
      "contexto": "por que estamos perguntando"
    }
  ],
  "categoria_analisada": "${p.categoria_nome}",
  "playbook_aplicado": "${p.playbook?.nome || 'Genérico'}",
  "tags_analisadas": ${(p.tags || []).length},
  "tags_resolvidas": 0,
  "tags_pendentes": 0
}
Threshold de confiança: >= 0.7 → usa o bloco. < 0.7 → preenche pergunta_usuario e bloco_id = null.
</instrucoes_resposta>`;

return [{
  json: {
    ...p,
    system_prompt: SYSTEM_PROMPT,
    user_message: USER_MESSAGE
  }
}];
```
**Saída para:** `E3-Claude-Analise-Sonnet`

### E3-Claude-Analise-Sonnet (e3-claude-analise)
**Tipo:** `@n8n/n8n-nodes-langchain.anthropic`
**Model:** `claude-sonnet-4-6`
**MaxTokens:** `8192`
**Temperature:** `0.2`
**System:** `[dinâmico — ver E2-PrepararInput-Claude]`
**Saída para:** `E4-ParseResultado`

### E4-ParseResultado (e4-parse-resultado)
**Tipo:** `n8n-nodes-base.code`
**Code:**
```javascript
// E4 — Parse resultado do Claude + validação
const refs = $('E2-PrepararInput-Claude').first().json;
const output = $input.item.json;

// Extrair texto (LangChain Anthropic node)
let raw = '';
if (typeof output.text === 'string') {
  raw = output.text;
} else if (output.content && Array.isArray(output.content)) {
  const textBlock = output.content.find(b => b.type === 'text');
  raw = textBlock ? textBlock.text : '';
}

// Capturar tokens e custo (claude-sonnet-4-6: $3/$15 /M tokens)
const usage = output.usage || output.response_metadata?.usage || {};
const inputTokens = usage.input_tokens || 0;
const outputTokens = usage.output_tokens || 0;
const totalTokens = inputTokens + outputTokens;
const custoUsd = Number(((inputTokens * 3 + outputTokens * 15) / 1000000).toFixed(6));

// Parse JSON
let resultado = null;
let parseOk = false;

try {
  let clean = raw.trim();
  clean = clean.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  const jsonStart = clean.indexOf('{');
  if (jsonStart > 0) clean = clean.substring(jsonStart);
  resultado = JSON.parse(clean);
  parseOk = true;

  // Normalizar campos obrigatórios
  const camposArray = ['pontos_fortes', 'pontos_fracos', 'riscos', 'recomendacoes', 'documentos_faltantes', 'analise_tags', 'perguntas_triagem'];
  for (const field of camposArray) {
    if (!Array.isArray(resultado[field])) resultado[field] = [];
  }
  if (!resultado.visao_geral) resultado.visao_geral = 'Análise concluída.';
  const cs = parseInt(resultado.chance_sucesso);
  resultado.chance_sucesso = (cs >= 1 && cs <= 3) ? cs : 2;

  // Calcular tags_resolvidas e pendentes
  const analise_tags = resultado.analise_tags || [];
  resultado.tags_resolvidas = analise_tags.filter(t => t.confianca >= 0.7 && t.bloco_id).length;
  resultado.tags_pendentes = analise_tags.filter(t => t.confianca < 0.7 || !t.bloco_id).length;

} catch (e) {
  resultado = {
    visao_geral: 'Análise concluída mas parsing falhou: ' + e.message,
    pontos_fortes: [], pontos_fracos: [], riscos: [], recomendacoes: [],
    documentos_faltantes: [], analise_tags: [], perguntas_triagem: [],
    analise_probatoria: raw.substring(0, 1000),
    chance_sucesso: 2,
    categoria_analisada: refs.categoria_nome || 'Geral',
    playbook_aplicado: refs.playbook?.nome || 'Genérico',
    tags_analisadas: refs.total_tags || 0,
    tags_resolvidas: 0, tags_pendentes: 0
  };
}

return [{
  json: {
    analise_id: refs.analise_id,
    organizacao_id: refs.organizacao_id,
    processo_id: refs.processo_id,
    resultado,
    parse_ok: parseOk,
    tokens_usados: totalTokens,
    custo_usd: custoUsd,
    modelo_usado: 'claude-sonnet-4-6',
    chance_sucesso: resultado.chance_sucesso,
    visao_geral: resultado.visao_geral,
    status: parseOk ? 'CONCLUIDA' : 'CONCLUIDA_COM_ERROS'
  }
}];
```
**Saída para:** `F1-PATCH-olivia_analises`

### F1-PATCH-olivia_analises (f1-patch-analise)
**Tipo:** `n8n-nodes-base.httpRequest`
**Method:** `PATCH`
**URL:** `https://qdivfairxhdihaqqypgb.supabase.co/rest/v1/olivia_analises`
**Body template:**
```
={{ JSON.stringify({resultado: $json.resultado, status: $json.status, meta: {progresso: 95, fase: 'Salvando resultado...', parse_ok: $json.parse_ok, modelo: 'claude-sonnet-4-6', temperatura: 0.2, tokens: $json.tokens_usados, custo_usd: $json.custo_usd}, concluida_em: new Date().toISOString(), tokens_usados: $json.tokens_usados, custo_usd: $json.custo_usd, modelo_usado: $json.modelo_usado}) }}
```
**Query params:** [{'name': 'id', 'value': '=eq.{{ $json.analise_id }}'}]
**Saída para:** `F2-UPDATE-processos`

### F2-UPDATE-processos (f2-update-processo)
**Tipo:** `n8n-nodes-base.httpRequest`
**Method:** `PATCH`
**URL:** `https://qdivfairxhdihaqqypgb.supabase.co/rest/v1/processos`
**Body template:**
```
={{ JSON.stringify({ia_resumo: {visao_geral: $('E4-ParseResultado').item.json.visao_geral, analise_id: $('E4-ParseResultado').item.json.analise_id, gerado_em: new Date().toISOString()}, chance_sucesso_ia: $('E4-ParseResultado').item.json.chance_sucesso}) }}
```
**Query params:** [{'name': 'id', 'value': "=eq.{{ $('E4-ParseResultado').item.json.processo_id }}"}]
**Saída para:** `F3-UPDATE-100pct`

### F3-UPDATE-100pct (f3-update-100)
**Tipo:** `n8n-nodes-base.httpRequest`
**Method:** `PATCH`
**URL:** `=https://qdivfairxhdihaqqypgb.supabase.co/rest/v1/olivia_analises`
**Body template:**
```
={{ JSON.stringify({ "status":  $('E4-ParseResultado').item.json.status, "meta":  JSON.stringify({progresso: 100, fase: 'Análise concluída!', parse_ok: $('E4-ParseResultado').item.json.parse_ok, modelo: 'claude-sonnet-4-6', tags_resolvidas: $('E4-ParseResultado').item.json.resultado.tags_resolvidas, tags_pendentes: $('E4-ParseResultado').item.json.resultado.tags_pendentes, perguntas_triagem_count: ($('E4-ParseResultado').item.json.resultado.perguntas_triagem || []).length}) }) }}
```
**Query params:** [{'name': 'id', 'value': "=eq.{{ $('E4-ParseResultado').item.json.analise_id }}"}]
**Saída para:** `F4-LogWebhook-UPDATE`

### F4-LogWebhook-UPDATE (f4-log-update)
**Tipo:** `n8n-nodes-base.code`
**Code:**
```javascript
// F4 — Log final (fire and forget)
const analise_id = $('E4-ParseResultado').item.json.analise_id;
console.log('[OLIVIA-ANALISE-V3] Análise concluída:', analise_id);
return [{ json: { logged: true, analise_id } }];
```

### Error Trigger (error-trigger)
**Tipo:** `n8n-nodes-base.errorTrigger`
Trigger de erro — captura qualquer exceção no workflow.
**Saída para:** `ErrorHandler`

### ErrorHandler (error-handler)
**Tipo:** `n8n-nodes-base.code`
**Code:**
```javascript
// ErrorHandler — logar erro e atualizar olivia_analises
const error = $input.item.json;
const SUPA_URL = 'https://qdivfairxhdihaqqypgb.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkaXZmYWlyeGhkaWhhcXF5cGdiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTA3MzcwOCwiZXhwIjoyMDg2NjQ5NzA4fQ.zu_reCiKzCqLETOWxytYQmez1SIwFRDlOruzsLOpBeY';
const HEADERS = { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' };

console.error('[OLIVIA-ANALISE-V3] Erro:', error.message);

// Tentar extrair analise_id do contexto de erro
const analise_id = error.execution?.data?.resultData?.runData?.['A4-INSERT-olivia_analises']?.[0]?.data?.main?.[0]?.[0]?.json?.id;

if (analise_id) {
  try {
    await $helpers.httpRequest({
      method: 'PATCH',
      url: `${SUPA_URL}/rest/v1/olivia_analises?id=eq.${analise_id}`,
      headers: HEADERS,
      body: { status: 'ERRO', meta: { progresso: 0, fase: 'Erro: ' + (error.message || 'Erro desconhecido').substring(0, 200) } }
    });
  } catch(e) { console.error('Falha ao atualizar status de erro:', e.message); }
}

return [{ json: { handled: true, error: error.message } }];
```

### B1-Prep (b1-prep)
**Tipo:** `n8n-nodes-base.code`
**Code:**
```javascript
// B1-PREP — Extrair analise_id e processo_id para queries
const body = $('WH-Analise').item.json.body;
const analiseRaw = $('A4-INSERT-olivia_analises').item.json;
const analise = Array.isArray(analiseRaw) ? analiseRaw[0] : analiseRaw;

return [{
  json: {
    analise_id: analise.id,
    organizacao_id: body.organizacao_id,
    request_id: body.request_id,
    user_id: body.user_id,
    processo_id: body.data.processo_id,
    tipo_analise: body.data.tipo || 'PROVAS',
    arquivos_input: body.data.arquivos || [],
    contexto_adicional: body.data.contexto || ''
  }
}];
```
**Saída para:** `B1-HTTP-Processo`

### B1-HTTP-Processo (b1-http-processo)
**Tipo:** `n8n-nodes-base.httpRequest`
**Method:** `GET`
**URL:** `=https://qdivfairxhdihaqqypgb.supabase.co/rest/v1/processos`
**Query params:** [{'name': 'id', 'value': '=eq.{{ $json.processo_id }}'}, {'name': 'select', 'value': 'id,numero_cnj,numero_processo,tipo_processo,objeto,valor_causa,valor_condenacao,grau,polo_representado,ia_resumo,chance_sucesso_ia,empresa_id,empresa:empresas(id,nome,cnpj,razao_social,nome_fantasia,segmento,categoria_id,analise_ia,categoria:empresas_categorias(id,nome)),cliente:clientes(id,nome,cpf_cnpj,rg,data_nascimento,email,telefone,endereco_logradouro,endereco_numero,endereco_complemento,endereco_bairro,cidade,endereco_uf,cep,profissao,estado_civil,nacionalidade,sexo),advogado:advogados(id,nome,oab,oab_uf,email,cabecalho_escritorio),comarca:comarcas_varas(id,comarca,vara,estado_id)'}, {'name': 'limit', 'value': '1'}]
**Saída para:** `B1-HTTP-AnaliseAnt`

### B1-HTTP-AnaliseAnt (b1-http-analise-ant)
**Tipo:** `n8n-nodes-base.httpRequest`
**Method:** `GET`
**URL:** `=https://qdivfairxhdihaqqypgb.supabase.co/rest/v1/olivia_analises`
**Query params:** [{'name': 'processo_id', 'value': "=eq.{{ $('B1-Prep').item.json.processo_id }}"}, {'name': 'status', 'value': 'eq.CONCLUIDA'}, {'name': 'order', 'value': 'created_at.desc'}, {'name': 'limit', 'value': '1'}, {'name': 'select', 'value': 'id,tipo,resultado,created_at'}]
**Saída para:** `B1-Process`

### B1-Process (b1-process)
**Tipo:** `n8n-nodes-base.code`
**Code:**
```javascript
// B1-PROCESS — Montar objeto completo do processo
const ctx = $('B1-Prep').item.json;
const processosRaw = $('B1-HTTP-Processo').item.json;
const analisesResp = $('B1-HTTP-AnaliseAnt').item.json;
const analisesRaw = analisesResp?.body ?? analisesResp;

const processos = Array.isArray(processosRaw) ? processosRaw : [processosRaw];
const processo = processos[0];
if (!processo || !processo.id) throw new Error('Processo não encontrado: ' + ctx.processo_id);

const empresa = processo.empresa || {};
const categoria = empresa.categoria || {};

const analises = Array.isArray(analisesRaw) ? analisesRaw : [];
const analise_anterior = analises[0] || null;

return [{
  json: {
    analise_id: ctx.analise_id,
    organizacao_id: ctx.organizacao_id,
    request_id: ctx.request_id,
    user_id: ctx.user_id,
    processo_id: ctx.processo_id,
    tipo_analise: ctx.tipo_analise,
    arquivos_input: ctx.arquivos_input || [],
    contexto_adicional: ctx.contexto_adicional || '',
    processo: {
      id: processo.id,
      numero_cnj: processo.numero_cnj,
      numero_processo: processo.numero_processo,
      tipo_processo: processo.tipo_processo,
      objeto: processo.objeto,
      valor_causa: processo.valor_causa,
      grau: processo.grau,
      polo_representado: processo.polo_representado
    },
    empresa: {
      id: empresa.id,
      nome: empresa.nome,
      cnpj: empresa.cnpj,
      razao_social: empresa.razao_social,
      segmento: empresa.segmento,
      analise_ia: empresa.analise_ia
    },
    categoria_id: empresa.categoria_id,
    categoria_nome: categoria.nome || 'Geral',
    cliente: processo.cliente || {},
    advogado: processo.advogado || {},
    comarca: processo.comarca || {},
    analise_anterior: analise_anterior,
    ia_resumo_existente: processo.ia_resumo,
    chance_sucesso_existente: processo.chance_sucesso_ia
  }
}];
```
**Saída para:** `B2-HTTP-Tags`

### B2-HTTP-Tags (b2-http-tags)
**Tipo:** `n8n-nodes-base.httpRequest`
**Method:** `POST`
**URL:** `https://qdivfairxhdihaqqypgb.supabase.co/rest/v1/rpc/fn_get_tags_and_blocos_for_analise`
**Body template:**
```
={{ JSON.stringify({p_organizacao_id: $json.organizacao_id, p_categoria_id: $json.categoria_id}) }}
```
**Saída para:** `B2-Process`

### B2-Process (b2-process)
**Tipo:** `n8n-nodes-base.code`
**Code:**
```javascript
// B2-PROCESS — Processar tags e blocos
const ctx = $('B1-Process').item.json;
const result = $('B2-HTTP-Tags').item.json;

let tags = [];
let blocos = [];
let categoria_nome = ctx.categoria_nome || 'Geral';

if (result && !result.code) {
  tags = result.tags || [];
  blocos = (result.blocos || []).slice(0, 50);
  categoria_nome = result.categoria_nome || categoria_nome;
}

// RAG query dinâmica
const tagTexts = tags.map(t => t.nome).join(' ');
const ragQuery = [tagTexts, ctx.empresa?.nome || '', ctx.processo?.tipo_processo || '']
  .filter(Boolean).join(' ').substring(0, 500);

return [{
  json: {
    ...ctx,
    categoria_nome,
    tags,
    blocos,
    total_tags: tags.length,
    total_blocos: blocos.length,
    rag_query: ragQuery
  }
}];
```
**Saída para:** `B3-HTTP-Playbook`

### B3-HTTP-Playbook (b3-http-playbook)
**Tipo:** `n8n-nodes-base.httpRequest`
**Method:** `POST`
**URL:** `https://qdivfairxhdihaqqypgb.supabase.co/rest/v1/rpc/fn_get_playbook_for_context`
**Body template:**
```
={{ JSON.stringify({p_organizacao_id: $json.organizacao_id, p_scope: 'analise', p_categoria_empresa_id: $json.categoria_id || null}) }}
```
**Saída para:** `B3-Process`

### B3-Process (b3-process)
**Tipo:** `n8n-nodes-base.code`
**Code:**
```javascript
// B3-PROCESS — Processar playbook
const ctx = $('B2-Process').item.json;
const results = $('B3-HTTP-Playbook').item.json;
const arr = Array.isArray(results) ? results : (results && !results.code ? [results] : []);
const playbook = arr[0] || null;

return [{
  json: {
    ...ctx,
    playbook: (playbook && playbook.nome) ? {
      encontrado: true,
      nome: playbook.nome,
      instrucoes: playbook.instrucoes || '',
      match_level: playbook.match_level
    } : {
      encontrado: false,
      nome: 'Genérico',
      instrucoes: null,
      match_level: null
    }
  }
}];
```
**Saída para:** `B4-UPDATE-Classificando`

### C1b-HasDocs? (c1b-if-docs)
**Tipo:** `n8n-nodes-base.if`
**Conditions:** [{"id": "check-has-docs", "leftValue": "={{ $json._has_docs }}", "rightValue": true, "operator": {"type": "boolean", "operation": "true", "singleValue": true}}]
**Saída para:** `C2-Loop-Docs`, `D2-UPDATE-50pct`

### B4-PassCtx (b4-passctx)
**Tipo:** `n8n-nodes-base.code`
**Code:**
```javascript
// Recuperar contexto do node anterior ao UPDATE
return [{json: $('B3-Process').item.json}];
```
**Saída para:** `C1-SplitDocs`

### D2-PassCtx (d2-passctx)
**Tipo:** `n8n-nodes-base.code`
**Code:**
```javascript
// Recuperar contexto - D1 pode não ter rodado (bypass sem docs)
let ctx;
try {
  ctx = $('D1-ConsolidarDocs').item.json;
} catch(e) {
  // Bypass: sem docs, pegar contexto de B3-Process com campos extras
  const b3ctx = $('B3-Process').item.json;
  ctx = {
    ...b3ctx,
    docs_extraidos: [],
    total_docs: 0,
    qualidade_media: 0
  };
}
return [{json: ctx}];
```
**Saída para:** `D3-GerarEmbedding`

### E1-PassCtx (e1-passctx)
**Tipo:** `n8n-nodes-base.code`
**Code:**
```javascript
// Recuperar contexto de D5-MontarPacote
return [{json: $('D5-MontarPacote').item.json}];
```
**Saída para:** `E2-PrepararInput-Claude`

### D4b-AggRAG (d4b-agg-rag)
**Tipo:** `n8n-nodes-base.code`
**Code:**
```javascript
// D4b — Agregar resultados RAG (fullResponse ou array)
const items = $input.all();

let ragResults = [];
for (const item of items) {
  const j = item.json;
  // fullResponse: j.body é o array de resultados
  if (j.body !== undefined) {
    const body = Array.isArray(j.body) ? j.body : [];
    ragResults = ragResults.concat(body);
  } else if (j.id !== undefined) {
    // Item direto do RAG
    ragResults.push(j);
  }
}

// Retornar sempre 1 item
return [{ json: { _rag_results: ragResults } }];
```
**Saída para:** `D5-MontarPacote`


## Conexões Resumidas (fluxo principal)

```
WH-Analise → A1-LogWebhook-INSERT → A2-ValidatePayload → A3-PayloadValido?
  ├─ [TRUE]  → A4-INSERT-olivia_analises → A-Respond-202 (202 imediato)
  │                                      → B1-Prep → B1-HTTP-Processo → B1-HTTP-AnaliseAnt → B1-Process
  │                                         → B2-HTTP-Tags → B2-Process → B3-HTTP-Playbook → B3-Process
  │                                         → B4-UPDATE-Classificando → B4-PassCtx → C1-SplitDocs
  │                                         → C1b-HasDocs?
  │                                             ├─ [TRUE]  → C2-Loop-Docs → C3-FetchArquivo → C4-ExtractPDF → C5-FormatPDF → [loop]
  │                                             │                         └─ [done] → D1-ConsolidarDocs → D2-UPDATE-50pct
  │                                             └─ [FALSE] → D2-UPDATE-50pct
  │                                         → D2-PassCtx → D3-GerarEmbedding → D4-BuscarRAG → D4b-AggRAG
  │                                         → D5-MontarPacote → E1-UPDATE-60pct → E1-PassCtx
  │                                         → E2-PrepararInput-Claude → E3-Claude-Analise-Sonnet → E4-ParseResultado
  │                                         → F1-PATCH-olivia_analises → F2-UPDATE-processos → F3-UPDATE-100pct → F4-LogWebhook-UPDATE
  └─ [FALSE] → A-Respond-Error (400)

Error Trigger → ErrorHandler (atualiza olivia_analises status=ERRO)
```

## Pontos de Atenção Pré-identificados

1. **API Keys hardcoded** — todas as keys estão hardcoded nos nodes HTTP (Supabase key, OpenAI key) ao invés de usar credentials n8n
2. **C3-FetchArquivo** — usa GET para obter signed URL, mas a URL gerada não está sendo usada corretamente para download do arquivo
3. **D2-PassCtx** — node de passagem de contexto com try/catch para bypass sem docs — verificar se conexões estão corretas
4. **E2-PrepararInput-Claude** — prompt muito longo com todos os docs concatenados — verificar limites de context window
5. **Error Handler** — tenta extrair analise_id do execution data de forma frágil, pode não funcionar
6. **Falta de retry** — nenhum mecanismo de retry em caso de falha no Claude ou Supabase
7. **C3-FetchArquivo** — usa método GET mas envia body JSON — deveria ser POST para gerar signed URL
