/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MdFlow Google Doc Creator — Express Mode v2.0
 * Projeto: MDX LegalTech — OlivIA Gerador de Petições (Modo Express)
 *
 * ── Changelog v2.0 (JANA 🦊 — 2026-03-16) ──
 * ADD: Suporte a `blocos[]` — novo formato de entrada (array de blocos com conteudo_html)
 * ADD: Parser HTML nativo — converte <h1><h2><h3><p><strong><em><br><ul><ol><li>
 * ADD: Badge de confiança no log de execução (confianca por bloco)
 * ADD: Campo `tags_novas_criadas` — seções extras geradas pela IA (inseridas automaticamente)
 * ADD: Modo `blocos` vs modo `secoes` — detecta automaticamente pelo payload
 * ADD: `titulo_peticao` aceito como alias de `titulo`
 * ADD: `relatorio_processo` salvo como propriedade do doc (não inserido no corpo)
 * FIX: Mantém 100% de compatibilidade com formato antigo (secoes[])
 * MELHORIA: estatisticas inclui `modo_entrada`, `blocos_processados`, `blocos_do_banco`, `blocos_gerados`
 *
 * ── Changelog v1.2 (JANA 🦊 — 2026-03-16) ──
 * FIX: campo `url` adicionado ao retorno
 * FIX: campo `success` retorna false explicitamente em todos os erros
 * FIX: tags_substituicao aceita chaves com e sem {{}}
 * FIX: replaceTagsInSection substitui mesmo quando valor é string vazia
 * FIX: cleanResidualTags não trava em docs grandes (safety counter 500)
 * ADD: tipo de seção `assinatura` — centralizado
 * ADD: tipo de seção `pedidos_lista` — lista numerada automática
 * ADD: validação de `titulo` ausente → usa nomeArquivo como fallback
 * ADD: log de execução mais rico
 * MELHORIA: inserirSecao respects \n\n como parágrafo duplo
 *
 * Deploy: Web App → Execute as Me → Anyone with link
 * Chamado por: B8.5-CriarGoogleDoc (n8n — workflow final-olivia-express)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: ENTRY POINTS
// ═══════════════════════════════════════════════════════════════════════════════

function doPost(e) {
  var startTime = new Date().getTime();
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ success: false, error_code: 'NO_BODY', error_message: 'Request body vazio ou ausente' });
    }
    var payload;
    try { payload = JSON.parse(e.postData.contents); }
    catch (parseErr) { return jsonResponse({ success: false, error_code: 'PARSE_ERROR', error_message: 'Falha ao parsear JSON: ' + parseErr.message }); }

    var debug = payload.configuracoes && payload.configuracoes.debug === true;
    if (debug) Logger.log('[DEBUG] Payload keys: ' + Object.keys(payload).join(', '));

    // Validar payload (suporta blocos[] OU secoes[])
    var validation = validatePayload(payload);
    if (!validation.valid) {
      return jsonResponse({ success: false, error_code: 'VALIDATION_ERROR', error_message: validation.error });
    }

    var processo = payload.processo || {};
    var config = payload.configuracoes || {};
    var tagsRaw = payload.tags_substituicao || {};
    var tags = normalizarTags(tagsRaw);
    var nomeArquivo = config.nome_arquivo || ('Petição Express - ' + new Date().toISOString().substring(0, 10));
    var pastaId = config.pasta_destino_id || null;
    var fallbackRoot = config.fallback_to_root === true;
    var cabecalho = config.cabecalho_escritorio || null;

    // v2.0: titulo aceita titulo_peticao como alias
    var tituloDoc = payload.titulo || payload.titulo_peticao || nomeArquivo;

    // Detectar modo de entrada
    var modoEntrada = 'secoes';
    var blocos = null;
    var secoes = null;
    if (payload.blocos && Array.isArray(payload.blocos) && payload.blocos.length > 0) {
      modoEntrada = 'blocos';
      blocos = payload.blocos;
      // Também processar tags_novas_criadas se existirem
      if (payload.tags_novas_criadas && Array.isArray(payload.tags_novas_criadas)) {
        blocos = mergeTagsNovas(blocos, payload.tags_novas_criadas);
      }
    } else {
      secoes = payload.secoes;
    }

    // Idempotência por historico_id (janela 120s)
    var idempotencyKey = generateIdempotencyKey(processo.historico_id || processo.numero || nomeArquivo);
    var cachedResult = checkDuplicate(idempotencyKey);
    if (cachedResult) {
      if (debug) Logger.log('[DEBUG] Cache hit');
      cachedResult.from_cache = true;
      return jsonResponse(cachedResult);
    }

    // Criar documento
    var docResult = criarDocumento(nomeArquivo, pastaId, fallbackRoot);
    if (!docResult.success) {
      return jsonResponse({ success: false, error_code: docResult.error_code, error_message: docResult.error_message });
    }
    var doc = docResult.doc;
    var body = doc.getBody();

    // Configurar página ABNT
    configurarPagina(doc);

    // Cabeçalho do escritório
    var cabecalhoOk = false;
    if (cabecalho) { cabecalhoOk = inserirCabecalhoEscritorio(doc, cabecalho); }

    var statsSecoes = { ok: 0, falhou: [], blocos_do_banco: 0, blocos_gerados: 0 };

    // Processar conteúdo conforme modo
    if (modoEntrada === 'blocos') {
      // Ordenar por posicao
      blocos.sort(function(a, b) { return (a.posicao || 0) - (b.posicao || 0); });
      var primeiroBloco = true;
      for (var i = 0; i < blocos.length; i++) {
        var bloco = blocos[i];
        var ok = inserirBlocoHTML(body, bloco, primeiroBloco, debug);
        if (ok) {
          statsSecoes.ok++;
          if (bloco.bloco_id) statsSecoes.blocos_do_banco++;
          else statsSecoes.blocos_gerados++;
        } else {
          statsSecoes.falhou.push(bloco.tag_nome || bloco.titulo_secao || ('bloco_' + i));
        }
        primeiroBloco = false;
      }
    } else {
      // Modo antigo: secoes[]
      var primeiraSecao = true;
      for (var j = 0; j < secoes.length; j++) {
        var ok2 = inserirSecao(body, secoes[j], primeiraSecao, debug);
        if (ok2) statsSecoes.ok++;
        else statsSecoes.falhou.push(secoes[j].tipo || ('secao_' + j));
        primeiraSecao = false;
      }
    }

    // Substituir {{tags}} (body + header + footer)
    var tagStats = { substituidas: 0, nao_encontradas: [], residuais_marcadas: 0 };
    replaceTagsInSection(body, tags, tagStats);
    var header = doc.getHeader();
    if (header) replaceTagsInSection(header, tags, tagStats);
    var footer = doc.getFooter();
    if (footer) replaceTagsInSection(footer, tags, tagStats);

    // Limpeza de tags residuais
    cleanResidualTags(doc, tagStats);

    // v2.0: Salvar relatorio_processo como custom property do doc (não no corpo)
    if (payload.relatorio_processo) {
      try {
        var props = PropertiesService.getDocumentProperties();
        if (!props) props = PropertiesService.getScriptProperties();
        props.setProperty('relatorio_processo_' + doc.getId(),
          JSON.stringify(payload.relatorio_processo).substring(0, 9000));
      } catch(pe) { Logger.log('[WARN] Não foi possível salvar relatorio_processo: ' + pe.message); }
    }

    doc.saveAndClose();

    var executionTime = new Date().getTime() - startTime;
    var docId = doc.getId();
    var docUrl = 'https://docs.google.com/document/d/' + docId + '/edit';

    var result = {
      success: true,
      url: docUrl,
      google_doc_id: docId,
      google_doc_url: docUrl,
      nome_arquivo: nomeArquivo,
      estatisticas: {
        titulo_usado: tituloDoc,
        modo_entrada: modoEntrada,
        secoes_inseridas: statsSecoes.ok,
        secoes_falhou: statsSecoes.falhou,
        blocos_do_banco: statsSecoes.blocos_do_banco,
        blocos_gerados: statsSecoes.blocos_gerados,
        tags_substituidas: tagStats.substituidas,
        tags_nao_encontradas: tagStats.nao_encontradas,
        tags_residuais_marcadas: tagStats.residuais_marcadas,
        cabecalho_escritorio: cabecalhoOk,
        tempo_processamento_ms: executionTime
      },
      from_cache: false
    };

    saveDuplicateKey(idempotencyKey, result);
    if (debug) Logger.log('[DEBUG] Concluído: ' + docId + ' em ' + executionTime + 'ms | modo: ' + modoEntrada);
    return jsonResponse(result);

  } catch (error) {
    Logger.log('[ERROR] doPost: ' + error.message + '\n' + (error.stack || ''));
    return jsonResponse({ success: false, error_code: 'EXECUTION_ERROR', error_message: error.message, error_stack: error.stack ? error.stack.substring(0, 500) : null });
  }
}

function doGet(e) {
  return jsonResponse({ success: true, service: 'MdFlow Express Doc Creator', version: '2.0', timestamp: new Date().toISOString(), message: 'OK — POST para criar documento express (suporta blocos[] e secoes[])' });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: VALIDAÇÃO
// ═══════════════════════════════════════════════════════════════════════════════

function validatePayload(payload) {
  if (!payload) return { valid: false, error: 'Payload vazio ou inválido' };
  // Aceita blocos[] ou secoes[]
  var hasBlocos = payload.blocos && Array.isArray(payload.blocos) && payload.blocos.length > 0;
  var hasSecoes = payload.secoes && Array.isArray(payload.secoes) && payload.secoes.length > 0;
  if (!hasBlocos && !hasSecoes) {
    return { valid: false, error: 'Payload deve conter "blocos" ou "secoes" como array não vazio' };
  }
  if (hasBlocos) {
    for (var i = 0; i < payload.blocos.length; i++) {
      var b = payload.blocos[i];
      if (!b.conteudo_html && b.conteudo_html !== '') {
        return { valid: false, error: 'Cada bloco deve ter campo "conteudo_html" (índice ' + i + ')' };
      }
    }
  }
  if (hasSecoes) {
    for (var j = 0; j < payload.secoes.length; j++) {
      var s = payload.secoes[j];
      if (s.conteudo === undefined || s.conteudo === null) {
        return { valid: false, error: 'Cada seção deve ter campo "conteudo" (índice ' + j + ')' };
      }
      if (!s.tipo) return { valid: false, error: 'Cada seção deve ter campo "tipo" (índice ' + j + ')' };
    }
  }
  return { valid: true, error: null };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: CRIAÇÃO DO DOCUMENTO
// ═══════════════════════════════════════════════════════════════════════════════

function criarDocumento(nomeArquivo, pastaId, fallbackRoot) {
  return withRetry(function() {
    var doc = DocumentApp.create(nomeArquivo);
    if (pastaId) {
      try {
        var docFile = DriveApp.getFileById(doc.getId());
        var pasta = DriveApp.getFolderById(pastaId);
        pasta.getName();
        docFile.moveTo(pasta);
      } catch (e) {
        if (!fallbackRoot) {
          try { DriveApp.getFileById(doc.getId()).setTrashed(true); } catch(ex) {}
          return { success: false, doc: null, error_code: 'FOLDER_ACCESS_DENIED', error_message: 'Sem acesso à pasta ' + pastaId + ': ' + e.message };
        }
        Logger.log('[WARN] Pasta inacessível, usando raiz: ' + e.message);
      }
    }
    return { success: true, doc: doc, error_code: null, error_message: null };
  }, 2, 1500);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: CONFIGURAÇÃO DE PÁGINA ABNT
// ═══════════════════════════════════════════════════════════════════════════════

function configurarPagina(doc) {
  try {
    var body = doc.getBody();
    body.setMarginTop(85.05);    // 3cm
    body.setMarginBottom(56.7);  // 2cm
    body.setMarginLeft(85.05);   // 3cm
    body.setMarginRight(56.7);   // 2cm
  } catch (e) { Logger.log('[WARN] configurarPagina: ' + e.message); }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: CABEÇALHO DO ESCRITÓRIO
// ═══════════════════════════════════════════════════════════════════════════════

function inserirCabecalhoEscritorio(doc, textoCabecalho) {
  try {
    var header = doc.addHeader();
    var linhas = textoCabecalho.split('\n');
    for (var i = 0; i < linhas.length; i++) {
      var para;
      if (i === 0 && header.getNumChildren() > 0) {
        para = header.getChild(0).asParagraph();
        para.appendText(linhas[i]);
      } else {
        para = header.appendParagraph(linhas[i]);
      }
      para.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
      para.editAsText().setFontFamily('Arial').setFontSize(10);
      if (i === 0) para.editAsText().setBold(true);
    }
    return true;
  } catch (e) { Logger.log('[WARN] inserirCabecalhoEscritorio: ' + e.message); return false; }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6A: INSERÇÃO DE BLOCO HTML (NOVO — v2.0)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Merge tags_novas_criadas nos blocos existentes respeitando posicao_entre.
 */
function mergeTagsNovas(blocos, tagsNovas) {
  var resultado = blocos.slice();
  for (var i = 0; i < tagsNovas.length; i++) {
    var nova = tagsNovas[i];
    var posEntre = nova.posicao_entre || [null, null];
    var anteriorId = posEntre[0];
    var posteriorId = posEntre[1];
    var insertIdx = resultado.length; // default: append
    if (posteriorId) {
      for (var j = 0; j < resultado.length; j++) {
        if (resultado[j].tag_id === posteriorId) { insertIdx = j; break; }
      }
    } else if (anteriorId) {
      for (var k = 0; k < resultado.length; k++) {
        if (resultado[k].tag_id === anteriorId) { insertIdx = k + 1; break; }
      }
    }
    var blocoNovo = {
      tag_id: null,
      tag_nome: nova.tag_nome,
      posicao: insertIdx + 0.5, // Será reordenado
      bloco_id: null,
      titulo_secao: nova.tag_nome,
      conteudo_html: nova.conteudo_html,
      tag_nova: true,
      confianca: 0.95
    };
    resultado.splice(insertIdx, 0, blocoNovo);
  }
  // Renumerar posicoes
  for (var m = 0; m < resultado.length; m++) resultado[m].posicao = m + 1;
  return resultado;
}

/**
 * Insere um bloco com conteudo_html no Google Doc.
 * Suporta: <h1><h2><h3><p><strong><em><u><br><ul><ol><li>
 * Estratégia: parse linha a linha do HTML simplificado.
 */
function inserirBlocoHTML(body, bloco, primeiroBloco, debug) {
  try {
    var html = bloco.conteudo_html || '';
    var tituloSecao = bloco.titulo_secao || '';
    var confianca = bloco.confianca !== undefined ? bloco.confianca : 1.0;

    // Espaçamento entre blocos
    if (!primeiroBloco) {
      var espaco = body.appendParagraph('');
      espaco.setSpacingBefore(0);
      espaco.setSpacingAfter(0);
      espaco.editAsText().setFontSize(6);
    }

    // Log de confiança
    if (debug) Logger.log('[DEBUG] Bloco: ' + (bloco.tag_nome||'?') + ' | confianca: ' + confianca + ' | bloco_id: ' + (bloco.bloco_id||'gerado'));

    // Parse e inserção do HTML
    parseAndInsertHTML(body, html, debug);

    return true;
  } catch (e) {
    Logger.log('[ERROR] inserirBlocoHTML: ' + e.message);
    return false;
  }
}

/**
 * Parser HTML simples para Google Docs.
 * Converte tags HTML em parágrafos formatados.
 */
function parseAndInsertHTML(body, html, debug) {
  if (!html || html.trim() === '') return;

  // Normalizar HTML
  var h = html
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');

  // Dividir em blocos de tag (h1, h2, h3, p, ul, ol, li)
  // Estratégia: tokenizar por tags de bloco
  var segmentos = tokenizeHTML(h);

  for (var i = 0; i < segmentos.length; i++) {
    var seg = segmentos[i];
    var tag = seg.tag;
    var text = stripInlineTags(seg.content); // texto puro com marcadores bold/italic

    if (text.trim() === '' && tag !== 'br') continue;

    var para;
    switch(tag) {
      case 'h1':
        para = body.appendParagraph(text);
        para.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
        para.editAsText().setFontFamily('Arial').setFontSize(14).setBold(true);
        para.setLineSpacing(1.5);
        para.setSpacingBefore(0);
        para.setSpacingAfter(0);
        break;

      case 'h2':
        para = body.appendParagraph(text);
        para.setAlignment(DocumentApp.HorizontalAlignment.LEFT);
        para.editAsText().setFontFamily('Arial').setFontSize(12).setBold(true);
        para.setLineSpacing(1.5);
        para.setSpacingBefore(0);
        para.setSpacingAfter(0);
        break;

      case 'h3':
        para = body.appendParagraph(text);
        para.setAlignment(DocumentApp.HorizontalAlignment.LEFT);
        para.editAsText().setFontFamily('Arial').setFontSize(12).setItalic(true).setBold(true);
        para.setLineSpacing(1.5);
        para.setSpacingBefore(0);
        para.setSpacingAfter(0);
        break;

      case 'li':
        para = body.appendParagraph('• ' + text);
        para.setAlignment(DocumentApp.HorizontalAlignment.JUSTIFY);
        para.editAsText().setFontFamily('Arial').setFontSize(12);
        para.setLineSpacing(1.5);
        para.setSpacingBefore(0);
        para.setSpacingAfter(0);
        para.setIndentFirstLine(0);
        para.setIndentStart(28.35); // 1cm recuo
        break;

      case 'br':
        var brPara = body.appendParagraph('');
        brPara.editAsText().setFontSize(6);
        break;

      default: // p, div, span, text
        // Aplicar formatação inline (bold/italic) respeitando marcadores
        insertParagraphWithInlineFormatting(body, seg.content);
        break;
    }

    // Aplicar negrito/itálico inline em h2/h3/h1 se tiver marcadores
    if (para && seg.content && (seg.content.indexOf('<strong>') !== -1 || seg.content.indexOf('<em>') !== -1)) {
      applyInlineFormattingToParagraph(para, seg.content);
    }
  }
}

/**
 * Tokeniza HTML em segmentos {tag, content}.
 */
function tokenizeHTML(html) {
  var result = [];
  // Match tags de bloco: h1, h2, h3, p, li, div, br
  var blockTagPattern = /<(h[1-3]|p|li|div|br)\b[^>]*>([\s\S]*?)<\/\1>|<br\s*\/?>/gi;
  var lastIndex = 0;
  var match;

  // Usar execução manual em loop (GAS não tem lastIndex no mesmo nível)
  var remaining = html;
  var processed = 0;

  while (processed < html.length) {
    // Encontrar próxima tag de bloco
    var nextTagPos = findNextBlockTag(remaining);
    if (nextTagPos === -1) {
      // Texto restante sem tags de bloco
      var txt = stripBlockTags(remaining).trim();
      if (txt) result.push({ tag: 'p', content: txt });
      break;
    }
    // Texto antes da tag
    var beforeText = remaining.substring(0, nextTagPos).replace(/<[^>]+>/g, '').trim();
    if (beforeText) result.push({ tag: 'p', content: beforeText });

    // Extrair tag
    var tagMatch = extractBlockTag(remaining.substring(nextTagPos));
    if (!tagMatch) break;
    result.push({ tag: tagMatch.tag, content: tagMatch.content });
    remaining = remaining.substring(nextTagPos + tagMatch.length);
    processed += nextTagPos + tagMatch.length;
    if (tagMatch.length === 0) break; // safety
  }

  return result.filter(function(s) { return s.content && s.content.trim() !== ''; });
}

function findNextBlockTag(html) {
  var match = html.match(/<(h[1-3]|p|li|div|br)[\s>\/]/i);
  return match ? html.indexOf(match[0]) : -1;
}

function extractBlockTag(html) {
  // h1-h3, p, li, div
  var m = html.match(/^<(h[1-3]|p|li|div)\b[^>]*>([\s\S]*?)<\/\1>/i);
  if (m) return { tag: m[1].toLowerCase(), content: m[2], length: m[0].length };
  // br
  var br = html.match(/^<br\s*\/?>/i);
  if (br) return { tag: 'br', content: '', length: br[0].length };
  return null;
}

function stripBlockTags(html) {
  return html.replace(/<\/?(?:h[1-6]|p|div|ul|ol|li|br)[^>]*>/gi, ' ');
}

function stripInlineTags(html) {
  return html.replace(/<[^>]+>/g, '').trim();
}

function stripBlockTagsInline(html) {
  return html.replace(/<\/?(h[1-6]|p|div|ul|ol|li|br)[^>]*>/gi, '');
}

/**
 * Insere parágrafo com formatação inline (bold/italic).
 */
function insertParagraphWithInlineFormatting(body, html) {
  var text = stripInlineTags(html);
  if (!text.trim()) return;

  var para = body.appendParagraph('');
  para.setAlignment(DocumentApp.HorizontalAlignment.JUSTIFY);
  para.editAsText().setFontFamily('Arial').setFontSize(12);
  para.setLineSpacing(1.5);
  para.setSpacingBefore(0);
  para.setSpacingAfter(0);

  applyInlineFormattingToParagraph(para, html);
}

/**
 * Aplica bold/italic inline num parágrafo existente.
 * Estratégia: parseia o HTML inline e aplica atributos por range de caracteres.
 */
function applyInlineFormattingToParagraph(para, html) {
  try {
    // Segmentar HTML inline em partes {text, bold, italic, underline}
    var parts = parseInlineHTML(html);
    if (parts.length === 0) return;

    // Limpar texto atual e remontar
    var fullText = parts.map(function(p) { return p.text; }).join('');
    var existing = para.getText();
    var textElem = para.editAsText();

    // Se o parágrafo já tem o texto certo (de stripInlineTags), só aplicar formatação
    if (existing !== fullText) {
      // Reescrever
      textElem.setText(fullText);
      // Resetar formatação
      if (fullText.length > 0) {
        textElem.setFontFamily('Arial').setFontSize(12).setBold(false).setItalic(false).setUnderline(false);
      }
    }

    // Aplicar formatação por range
    var offset = 0;
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      if (part.text.length === 0) continue;
      var start = offset;
      var end = offset + part.text.length - 1;
      if (part.bold) textElem.setBold(start, end, true);
      if (part.italic) textElem.setItalic(start, end, true);
      if (part.underline) textElem.setUnderline(start, end, true);
      offset += part.text.length;
    }
  } catch (e) {
    Logger.log('[WARN] applyInlineFormattingToParagraph: ' + e.message);
  }
}

/**
 * Parse HTML inline em segmentos com flags bold/italic/underline.
 */
function parseInlineHTML(html) {
  var parts = [];
  var bold = false, italic = false, underline = false;
  var pos = 0;
  var stripped = html.replace(/<\/?(h[1-6]|p|div|ul|ol|li|br)[^>]*>/gi, '');

  while (pos < stripped.length) {
    if (stripped[pos] !== '<') {
      // Texto normal
      var end = stripped.indexOf('<', pos);
      if (end === -1) end = stripped.length;
      var chunk = stripped.substring(pos, end);
      if (chunk) parts.push({ text: chunk, bold: bold, italic: italic, underline: underline });
      pos = end;
    } else {
      // Tag
      var tagEnd = stripped.indexOf('>', pos);
      if (tagEnd === -1) { pos++; continue; }
      var tag = stripped.substring(pos + 1, tagEnd).trim().toLowerCase();
      var isClose = tag[0] === '/';
      if (isClose) tag = tag.substring(1).trim();
      if (tag === 'strong' || tag === 'b') bold = !isClose;
      else if (tag === 'em' || tag === 'i') italic = !isClose;
      else if (tag === 'u') underline = !isClose;
      pos = tagEnd + 1;
    }
  }
  return parts;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6B: INSERÇÃO DE SEÇÕES (FORMATO ANTIGO — compatibilidade)
// ═══════════════════════════════════════════════════════════════════════════════

function inserirSecao(body, secao, primeiraSecao, debug) {
  try {
    var tipo = (secao.tipo || 'body').toLowerCase();
    var titulo = secao.titulo || null;
    var conteudo = secao.conteudo || '';

    if (!primeiraSecao) {
      var espaco = body.appendParagraph('');
      espaco.setSpacingBefore(0);
      espaco.setSpacingAfter(0);
      espaco.editAsText().setFontSize(6);
    }

    switch (tipo) {
      case 'enderecamento':
        var linhasEnderec = conteudo.split('\n');
        for (var i = 0; i < linhasEnderec.length; i++) {
          var pe = body.appendParagraph(linhasEnderec[i]);
          pe.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
          aplicarEstiloCorpo(pe);
          pe.editAsText().setBold(true);
        }
        break;

      case 'jurisprudencia':
        if (titulo) {
          var pjt = body.appendParagraph(titulo);
          pjt.setAlignment(DocumentApp.HorizontalAlignment.LEFT);
          aplicarEstiloCorpo(pjt);
          pjt.editAsText().setBold(true);
          var espJuris = body.appendParagraph('');
          espJuris.editAsText().setFontSize(6);
        }
        var linhasJuris = conteudo.split('\n');
        for (var j = 0; j < linhasJuris.length; j++) {
          if (linhasJuris[j].trim() === '') continue;
          var pj = body.appendParagraph(linhasJuris[j]);
          pj.setAlignment(DocumentApp.HorizontalAlignment.JUSTIFY);
          pj.setIndentFirstLine(0);
          pj.setIndentStart(113.4);
          pj.editAsText().setFontFamily('Arial').setFontSize(11).setItalic(true);
          pj.setSpacingBefore(0);
          pj.setSpacingAfter(0);
        }
        break;

      case 'fecho':
        var linhasFecho = conteudo.split('\n');
        for (var k = 0; k < linhasFecho.length; k++) {
          var pf = body.appendParagraph(linhasFecho[k]);
          pf.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
          aplicarEstiloCorpo(pf);
        }
        break;

      case 'assinatura':
        var espAss = body.appendParagraph('');
        espAss.editAsText().setFontSize(6);
        var linhasAss = conteudo.split('\n');
        for (var a = 0; a < linhasAss.length; a++) {
          var pa = body.appendParagraph(linhasAss[a]);
          pa.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
          aplicarEstiloCorpo(pa);
          if (a === 0 && linhasAss[a].trim() !== '') pa.editAsText().setBold(true);
        }
        break;

      case 'titulo_secao':
        var pt = body.appendParagraph(conteudo);
        pt.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
        aplicarEstiloCorpo(pt);
        pt.editAsText().setBold(true);
        break;

      case 'pedidos_lista':
        if (titulo) {
          var ppl = body.appendParagraph(titulo);
          ppl.setAlignment(DocumentApp.HorizontalAlignment.LEFT);
          aplicarEstiloCorpo(ppl);
          ppl.editAsText().setBold(true);
          var espPL = body.appendParagraph('');
          espPL.editAsText().setFontSize(6);
        }
        var linhasPL = conteudo.split('\n');
        var itemNum = 1;
        for (var n = 0; n < linhasPL.length; n++) {
          if (linhasPL[n].trim() === '') continue;
          var linhaSemNum = linhasPL[n].replace(/^[\sa-z\d]+[\.\)]\s*/i, '');
          var pli = body.appendListItem(itemNum + '. ' + linhaSemNum);
          pli.setAlignment(DocumentApp.HorizontalAlignment.JUSTIFY);
          aplicarEstiloCorpo(pli);
          itemNum++;
        }
        break;

      default:
        if (titulo) {
          var pts = body.appendParagraph(titulo);
          pts.setAlignment(DocumentApp.HorizontalAlignment.LEFT);
          aplicarEstiloCorpo(pts);
          pts.editAsText().setBold(true);
          var espTitulo = body.appendParagraph('');
          espTitulo.editAsText().setFontSize(6);
        }
        var linhasBody = conteudo.split('\n');
        var prevWasEmpty = false;
        for (var l = 0; l < linhasBody.length; l++) {
          var linha = linhasBody[l];
          if (linha.trim() === '') {
            if (prevWasEmpty) {
              var pvd = body.appendParagraph('');
              pvd.editAsText().setFontSize(12);
            } else {
              var pv = body.appendParagraph('');
              pv.editAsText().setFontSize(6);
            }
            prevWasEmpty = true;
            continue;
          }
          prevWasEmpty = false;
          var pb = body.appendParagraph(linha);
          pb.setAlignment(DocumentApp.HorizontalAlignment.JUSTIFY);
          aplicarEstiloCorpo(pb);
        }
        break;
    }

    if (debug) Logger.log('[DEBUG] Seção inserida: ' + tipo);
    return true;
  } catch (e) {
    Logger.log('[ERROR] inserirSecao(' + (secao.tipo || '?') + '): ' + e.message);
    return false;
  }
}

function aplicarEstiloCorpo(paragrafo) {
  paragrafo.editAsText().setFontFamily('Arial').setFontSize(12);
  paragrafo.setLineSpacing(1.5);
  paragrafo.setSpacingBefore(0);
  paragrafo.setSpacingAfter(0);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7: SUBSTITUIÇÃO DE TAGS {{dados}}
// ═══════════════════════════════════════════════════════════════════════════════

function normalizarTags(tagsRaw) {
  var tags = {};
  for (var k in tagsRaw) {
    if (!tagsRaw.hasOwnProperty(k)) continue;
    var chave = k.replace(/^\{\{|\}\}$/g, '').trim();
    tags[chave] = tagsRaw[k];
  }
  return tags;
}

function replaceTagsInSection(section, tags, tagStats) {
  for (var tagName in tags) {
    if (!tags.hasOwnProperty(tagName)) continue;
    var valor = tags[tagName];
    var valorStr = (valor != null) ? String(valor) : '';
    var patterns = ['\\{\\{' + escapeRegex(tagName) + '\\}\\}'];
    if (tagName.indexOf('_') !== -1) {
      patterns.push('\\{\\{' + escapeRegex(tagName.replace(/_/g, '.')) + '\\}\\}');
    }
    for (var p = 0; p < patterns.length; p++) {
      var searchResult = section.findText(patterns[p]);
      var safety = 0;
      while (searchResult && safety < 200) {
        var elem = searchResult.getElement().asText();
        var start = searchResult.getStartOffset();
        var end = searchResult.getEndOffsetInclusive();
        var attrs = captureTextAttributes(elem, start);
        elem.deleteText(start, end);
        if (valorStr.length > 0) {
          elem.insertText(start, valorStr);
          var newEnd = start + valorStr.length - 1;
          if (newEnd >= start) applyTextAttributes(elem, start, newEnd, attrs);
        }
        tagStats.substituidas++;
        searchResult = section.findText(patterns[p]);
        safety++;
      }
    }
  }
}

function captureTextAttributes(elem, offset) {
  return {
    bold: elem.isBold(offset), italic: elem.isItalic(offset),
    underline: elem.isUnderline(offset), fontSize: elem.getFontSize(offset),
    fontFamily: elem.getFontFamily(offset), foregroundColor: elem.getForegroundColor(offset)
  };
}

function applyTextAttributes(elem, start, end, attrs) {
  if (attrs.bold !== null) elem.setBold(start, end, attrs.bold);
  if (attrs.italic !== null) elem.setItalic(start, end, attrs.italic);
  if (attrs.underline !== null) elem.setUnderline(start, end, attrs.underline);
  if (attrs.fontSize) elem.setFontSize(start, end, attrs.fontSize);
  if (attrs.fontFamily) elem.setFontFamily(start, end, attrs.fontFamily);
  if (attrs.foregroundColor) elem.setForegroundColor(start, end, attrs.foregroundColor);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8: LIMPEZA DE TAGS RESIDUAIS
// ═══════════════════════════════════════════════════════════════════════════════

function cleanResidualTags(doc, tagStats) {
  var body = doc.getBody();
  var pattern = '\\{\\{[^}]+\\}\\}';
  var searchResult = body.findText(pattern);
  var safety = 0;
  while (searchResult && safety < 500) {
    var elem = searchResult.getElement().asText();
    var start = searchResult.getStartOffset();
    var end = searchResult.getEndOffsetInclusive();
    var tagText = elem.getText().substring(start, end + 1);
    var replacement = '[REVISAR: ' + tagText + ']';
    elem.deleteText(start, end);
    elem.insertText(start, replacement);
    if (replacement.length > 0) {
      elem.setForegroundColor(start, start + replacement.length - 1, '#CC0000');
    }
    tagStats.residuais_marcadas++;
    if (!tagStats.nao_encontradas) tagStats.nao_encontradas = [];
    tagStats.nao_encontradas.push(tagText);
    searchResult = body.findText(pattern);
    safety++;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 9: IDEMPOTÊNCIA (CACHE)
// ═══════════════════════════════════════════════════════════════════════════════

var _duplicateCache = {};

function generateIdempotencyKey(seed) {
  if (!seed) return 'no_key_' + new Date().getTime();
  return 'idem_' + String(seed).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 60);
}

function checkDuplicate(key) {
  if (!key) return null;
  var cached = _duplicateCache[key];
  if (cached && (new Date().getTime() - cached.timestamp) < 120000) return cached.result;
  // Cache de script properties (cross-instance)
  try {
    var props = PropertiesService.getScriptProperties();
    var val = props.getProperty(key);
    if (val) {
      var parsed = JSON.parse(val);
      if ((new Date().getTime() - (parsed._ts || 0)) < 120000) return parsed.result;
    }
  } catch(e) {}
  return null;
}

function saveDuplicateKey(key, result) {
  if (!key) return;
  _duplicateCache[key] = { result: result, timestamp: new Date().getTime() };
  try {
    var props = PropertiesService.getScriptProperties();
    props.setProperty(key, JSON.stringify({ result: result, _ts: new Date().getTime() }));
  } catch(e) {}
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 10: UTILITÁRIOS
// ═══════════════════════════════════════════════════════════════════════════════

function withRetry(fn, maxRetries, delayMs) {
  var attempts = 0;
  while (attempts <= maxRetries) {
    try {
      return fn();
    } catch (e) {
      attempts++;
      if (attempts > maxRetries) return { success: false, error_code: 'RETRY_EXHAUSTED', error_message: e.message };
      Utilities.sleep(delayMs || 1000);
    }
  }
}

function escapeRegex(str) {
  return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 11: TESTE LOCAL (DEV)
// ═══════════════════════════════════════════════════════════════════════════════

function testeLocal() {
  var payload = {
    titulo_peticao: 'Petição Inicial — João Silva x Banco Test',
    blocos: [
      {
        tag_id: 'tag-001',
        tag_nome: 'Endereçamento',
        posicao: 1,
        bloco_id: 'bloco-001',
        titulo_secao: 'Endereçamento',
        conteudo_html: '<p><strong>EXMO. SR. DR. JUIZ DE DIREITO DA VARA CÍVEL DE PORTO ALEGRE/RS</strong></p>',
        confianca: 0.95
      },
      {
        tag_id: 'tag-002',
        tag_nome: 'Qualificação',
        posicao: 2,
        bloco_id: 'bloco-002',
        titulo_secao: 'I — DAS PARTES',
        conteudo_html: '<h2>I — DAS PARTES</h2><p>{{cliente_nome}}, brasileiro, CPF {{cliente_cpf}}, residente em {{cliente_endereco}}, vem respeitosamente à presença de Vossa Excelência propor a presente</p>',
        confianca: 0.90
      },
      {
        tag_id: 'tag-003',
        tag_nome: 'Fatos',
        posicao: 3,
        bloco_id: null,
        titulo_secao: 'II — DOS FATOS',
        conteudo_html: '<h2>II — DOS FATOS</h2><p>O autor foi surpreendido com <strong>negativação indevida</strong> em seu nome, sem qualquer relação jurídica com a empresa ré.</p><p>Tal situação causou ao autor <em>danos morais</em> de ordem grave, impedindo-o de obter crédito no mercado.</p>',
        confianca: 0.85
      }
    ],
    tags_substituicao: {
      cliente_nome: 'João Silva',
      cliente_cpf: '123.456.789-00',
      cliente_endereco: 'Rua Teste, 123 — Porto Alegre/RS'
    },
    processo: { historico_id: 'teste_' + new Date().getTime() },
    configuracoes: {
      fallback_to_root: true,
      debug: true
    }
  };

  var e = { postData: { contents: JSON.stringify(payload) } };
  var resp = doPost(e);
  Logger.log(resp.getContent());
}
