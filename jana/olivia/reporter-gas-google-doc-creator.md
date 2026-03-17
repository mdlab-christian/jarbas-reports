# Reporter — GAS: Google Doc Creator (MdFlow · OlivIA)

> **Módulo:** Google Apps Script — Google Doc Creator  
> **Versão final:** v4.0  
> **Data:** 2026-03-16  
> **Gerado por:** JANA 🦊 (MacBook Air M4)  
> **Status geral:** ✅ Deploy OK — Aprovado para produção

---

## 1. Contexto Geral

Este relatório documenta o desenvolvimento e evolução do **Google Apps Script (GAS)** responsável pela criação de petições jurídicas em Google Docs dentro do sistema OlivIA (MdLab LegalTech).

O GAS é o componente final da pipeline de geração de petições: recebe os dados montados pelo n8n (ou pelo JARBAS diretamente), cria o documento, aplica formatação, e devolve a URL do Google Doc pronto para o advogado.

### URL de Deploy (Web App)
```
https://script.google.com/macros/s/AKfycbzoyKbDmSdDH2BBrbZLoUHY05lInLCec5ERn_Ec4jxB_DHSCsgz0g6E--aZz0AljCnq/exec
```
- **Permissão:** Execute as Me · Anyone with link
- **Domínio:** perinottipazadvogados.com
- **Health check:** GET retorna `{"success":true,"version":"4.0"}`

---

## 2. Histórico de Versões — Decisões Arquiteturais

### GAS Antigo (v1.x — em produção antes desta conversa)
- **Abordagem:** copia modelo de petição (Google Doc) → substitui placeholders com conteúdo de outros Google Docs (blocos de texto + jurisprudências) → preserva formatação original
- **Problema:** usava API deprecada (`addFile/removeFile`), sem retry, sem idempotência, `console.log` em vez de `Logger.log`
- **Status:** funcional em produção, mas frágil

### GAS v3.2 (desenvolvido no início desta conversa)
- **Abordagem diferente:** recebe seções de texto já geradas pela IA em memória → cria doc do zero com formatação ABNT
- **Decisão:** **descartada** após Christian esclarecer que a abordagem correta é manter a lógica do antigo (blocos do Drive preservam formatação)
- **Motivo do descarte:** o GAS não deve gerar conteúdo — o n8n/Claude gera. O GAS deve apenas copiar+montar com formatação preservada dos docs-fonte

### GAS v4.0 (versão final adotada)
- **Abordagem:** idêntica ao antigo — copia modelo + substitui blocos de Google Docs
- **Melhorias em relação ao antigo:**
  - `moveTo()` em vez de `addFile/removeFile` (API atual)
  - `Logger.log` em vez de `console.log` (correto no Apps Script)
  - Retry automático (3x com backoff) nas operações de Drive
  - Idempotência por `numero_processo + modelo_id` (janela 60s, expira em 2min)
  - Substituição de `{{tags}}` de dados após os blocos (body + header + footer)
  - Tags não encontradas → `[REVISAR: tag]` vermelho bold no doc
  - Pasta destino por **ID** em vez de path string
  - Guard para teste no editor (`doPost` sem `e` → mensagem clara)
  - Resposta enriquecida com estatísticas completas

---

## 3. Arquitetura e Lógica

### Fluxo de execução do GAS v4.0

```
POST recebido
    ↓
1. Validação do payload
    ↓
2. Check idempotência (numero_processo + modelo_id, 60s)
    ↓
3. makeCopy() do modelo Google Doc
    ↓
4. moveTo() para pasta destino (com retry)
    ↓
5. Substituição de blocos (sort DESC por ordem → de baixo pra cima)
   └── Para cada bloco:
       ├── findText(placeholder) no body
       ├── DocumentApp.openById(google_doc_id) do bloco
       ├── copiarConteudoFormatado() — copia elemento por elemento
       └── Remove parágrafo vazio pós-substituição
    ↓
6. Substituição de jurisprudências (mesma lógica, sem ordem)
    ↓
7. replaceTagsInSection(body + header + footer, tags_substituicao)
   └── preserva bold/italic/fonte/cor do texto original
    ↓
8. cleanResidualTags() → {{tags}} restantes viram [REVISAR: x] vermelho
    ↓
9. doc.saveAndClose()
    ↓
10. Salva cache idempotência
    ↓
11. Return JSON com URL + estatísticas
```

### Por que processar blocos de baixo pra cima?
Ao substituir um placeholder, os índices dos elementos do documento mudam. Processando da maior `ordem` para a menor (de baixo pra cima), os índices dos elementos acima ainda não foram afetados, garantindo que todos os placeholders sejam encontrados corretamente.

### Preservação de formatação
A função `copiarConteudoFormatado()` usa `.copy()` nativo do Apps Script em cada elemento (parágrafo, tabela, lista), que preserva toda a formatação original do doc-fonte. Isso é a principal razão para manter a abordagem "copia de docs do Drive" em vez de "gera texto em memória".

---

## 4. Payload de Entrada (Estrutura Completa)

```json
{
  "modelo": {
    "google_doc_id": "ID_DO_MODELO"         // OBRIGATÓRIO
  },
  "blocos": [
    {
      "ordem": 1,                            // OBRIGATÓRIO
      "placeholder": "{{enderecamento}}",   // OBRIGATÓRIO
      "google_doc_id": "ID_BLOCO"           // OBRIGATÓRIO
    }
  ],
  "jurisprudencias": [
    {
      "placeholder": "{{juris_stj_01}}",    // OBRIGATÓRIO
      "google_doc_id": "ID_JURIS"           // OBRIGATÓRIO
    }
  ],
  "tags_substituicao": {
    "cliente_nome": "João Silva",
    "comarca": "Porto Alegre/RS",
    "data_hoje": "16 de março de 2026"
    // ... qualquer chave/valor
  },
  "processo": {
    "numero": "0001234-56.2026.8.21.0001"   // para idempotência
  },
  "configuracoes": {
    "nome_arquivo": "Petição — João Silva",
    "pasta_destino_id": "ID_PASTA_DRIVE",
    "fallback_to_root": false,
    "debug": false
  }
}
```

### Resposta de sucesso
```json
{
  "success": true,
  "google_doc_id": "1aBcDe...",
  "google_doc_url": "https://docs.google.com/document/d/1aBcDe.../edit",
  "nome_arquivo": "Petição — João Silva",
  "estatisticas": {
    "blocos_substituidos": 3,
    "blocos_nao_encontrados": [],
    "jurisprudencias_substituidas": 1,
    "jurisprudencias_nao_encontradas": [],
    "tags_substituidas": 14,
    "tags_nao_encontradas": [],
    "tags_residuais_marcadas": 0,
    "tempo_processamento_ms": 5840
  },
  "from_cache": false
}
```

---

## 5. Arquivos Criados/Modificados

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `/tmp/gas_v40_mdflow.js` | JS (Apps Script) | Script v4.0 final — cópia local |
| `~/jarbas-reports/jana/olivia/gas-v40-mdflow.txt` | TXT | Script v4.0 publicado para deploy |
| `~/jarbas-reports/jana/olivia/gas-v40-referencia-n8n-2026-03-16.html` | HTML | Referência completa para workflows n8n |
| `~/jarbas-reports/jana/olivia/gas-v32-referencia-conversas-n8n.html` | HTML | Referência v3.2 (descartada — usar v4.0) |
| `/tmp/gas_test.js` | JS | Versão v3.2 (descartada) |
| `/tmp/gas_antigo.txt` | TXT | Script antigo original para referência |
| `/tmp/gas_novo.txt` | TXT | Script v3.1 que chegou com a conversa |
| `/tmp/report_gas.html` | HTML | Report análise antigo vs novo (intermediário) |

### URLs Públicas
- **Script v4.0 (TXT para deploy):**  
  https://mdlab-christian.github.io/jarbas-reports/jana/olivia/gas-v40-mdflow.txt
- **Referência n8n (HTML):**  
  https://mdlab-christian.github.io/jarbas-reports/jana/olivia/gas-v40-referencia-n8n-2026-03-16.html

---

## 6. Estado Atual

### ✅ Funcional
- Web App deployado e respondendo (GET health check: OK)
- Script v4.0 com lógica validada contra o antigo
- `makeCopy()` + substituição de blocos com formatação preservada
- Substituição de jurisprudências
- Substituição de `{{tags}}` em body + header + footer
- Retry automático, idempotência, resposta enriquecida
- Referência completa para n8n gerada

### ⚠️ Pendente / A Validar
- **Teste real end-to-end:** o script foi deployado mas não foi testado com um payload real (com Google Doc IDs reais de modelos e blocos do banco). Precisa de um teste via curl ou n8n com IDs reais antes de ir para produção.
- **Mapeamento payload JARBAS → GAS:** confirmar que `skill_olivia_gerar_peticao` no JARBAS monta o payload no formato v4.0 (campo `modelo`, `blocos[]`, `jurisprudencias[]`, `tags_substituicao`, `configuracoes`)
- **Construção dos workflows n8n:** os workflows que vão chamar o GAS ainda não foram criados — são o próximo passo (razão deste reporter)

### ❌ Bugs / Riscos
- **Bug do editor:** ao clicar "Run" no `doPost` pelo editor do Apps Script (sem payload real), dava erro `Cannot read properties of undefined (reading 'postData')`. **Corrigido no v4.0** com guard que retorna mensagem clara.
- **Imagens inline:** não são copiadas dos docs-fonte (limitação da API Google Docs). Se algum bloco tem imagem, ela é perdida silenciosamente.
- **Numeração de páginas:** `{PAGE}` e `{PAGES}` não funcionam via API — limitação do Google. Deve ser adicionada manualmente pelo advogado se necessário.

---

## 7. Integrações

### Google Drive / Google Docs
- O script roda como Web App com a conta do Google do domínio `perinottipazadvogados.com`
- Precisa ter acesso (pelo menos Viewer) nos docs de modelo, blocos e jurisprudências
- Precisa ter acesso (pelo menos Editor) nas pastas de destino
- IDs dos docs vêm do banco Supabase (`olivia_modelos_peticao.google_doc_id`, `olivia_blocos_texto.google_doc_id`, `olivia_jurisprudencias.google_doc_id`)

### Supabase (MdFlow)
- **Projeto:** `qdivfairxhdihaqqypgb`
- **Tabelas relevantes:**
  - `olivia_modelos_peticao` → `google_doc_id` do modelo
  - `olivia_blocos_texto` → `google_doc_id` de cada bloco
  - `olivia_jurisprudencias` → `google_doc_id` de cada jurisprudência
  - `olivia_historico` → onde a URL do doc gerado é salva (modo `SMART_BLOCKS` ou `EXPRESS`)

### JARBAS (Mac Mini M4)
- **Endpoint:** `POST https://jarbas.jarbas-mdlab.com/olivia/criar-doc`
- **Local:** `http://localhost:3012/olivia/criar-doc`
- O JARBAS recebe o payload do n8n ou do Smart Blocks (frontend), monta a chamada ao GAS, e devolve a URL do doc
- Skill relevante: `skill_olivia_gerar_peticao`

### n8n (Railway)
- **URL:** `https://primary-production-e209.up.railway.app`
- **Workflow principal que usa o GAS:** `prod-olivia-express` (ID: `8yeCpY5EaEP5XQ9e`)
- **Fluxo Smart Blocks:** `N8N-OLIVIA-GERAR-MANUAL` (ID: `efUURhKmLOvKBxWp`) — Smart Blocks usa Edge Function diretamente, este workflow é bypass

### Frontend (MdFlow)
- **Smart Blocks Step 3** (`SmartBlocksStep3Gerar`) — chama JARBAS `/olivia/criar-doc` com modelo + blocos selecionados
- O resultado (URL do Google Doc) é exibido ao advogado e salvo em `olivia_historico`

---

## 8. Decisões Arquiteturais

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Abordagem de geração | Copia modelo + substitui blocos de Drive | Preserva formatação 100% (jurisprudências precisam da formatação original) |
| v3.2 descartada | Sim | v3.2 gerava texto em memória — perde formatação dos blocos |
| Pasta destino | ID direto (`pasta_destino_id`) | Path string era frágil — ID é estável |
| Processamento de blocos | De baixo pra cima (DESC por ordem) | Evita quebrar índices do documento ao substituir |
| Idempotência | Por `numero_processo + modelo_id` | Evita criar docs duplicados em retry do n8n |
| Tags de dados | Substituídas DEPOIS dos blocos | Os próprios blocos podem conter `{{tags}}` que precisam ser substituídas no contexto final |
| Retry | 3x com backoff de 1.5s | Drive API é instável — retry resolve a maioria dos timeouts transientes |

---

## 9. Pontos de Atenção / Débitos Técnicos

### P1 — Teste end-to-end obrigatório antes de produção
O GAS v4.0 foi deployado mas não foi testado com IDs reais do banco. Antes de ligar o Smart Blocks ou os workflows n8n neste script, fazer um teste manual via curl com:
- Um `google_doc_id` real de modelo de petição do banco
- Um `google_doc_id` real de bloco de texto
- Um `google_doc_id` real de jurisprudência

### P2 — Confirmar payload do skill JARBAS
O `skill_olivia_gerar_peticao` no JARBAS provavelmente ainda usa o formato do script antigo. Precisa confirmar que o campo `modelo.google_doc_id` (não `modelo_doc_id`) está sendo enviado corretamente.

### P3 — Validar Google Doc IDs no banco
Diagnóstico anterior mostrou que alguns `google_doc_id` podem estar quebrados (docs deletados do Drive). Checar antes de escalar — um bloco com ID inválido vai fazer o GAS logar warning e pular a substituição (não falha o doc inteiro, mas o bloco fica como placeholder no texto).

### P4 — Timeout em petições longas
Petições com 8+ blocos grandes podem aproximar-se do limite de 6 min do Apps Script. Monitorar `tempo_processamento_ms` na resposta. Se recorrente, solução: dividir blocos grandes em menores.

### P5 — Autenticação da URL
A URL do Web App não tem autenticação — qualquer um com a URL pode criar documentos na conta Google. Manter a URL privada (não expor em frontend ou documentação pública).

---

## 10. Próximos Passos (Para as Conversas n8n)

1. **Criar workflow n8n para Smart Blocks** que busca modelo + blocos + juris do Supabase e chama o GAS
2. **Atualizar workflow `prod-olivia-express`** para usar o payload v4.0 do GAS via JARBAS
3. **Teste end-to-end** com petição real (modelo + 3-5 blocos + 1-2 jurisprudências + tags de processo)
4. **Mapear todos os placeholders** dos modelos de petição existentes (para garantir que os blocos têm os `placeholder` corretos)
5. **Adicionar campo `pasta_drive_id`** nos processos do Supabase (para que o n8n consiga enviar a pasta de destino correta por cliente/escritório)

---

## 11. Referências

| Recurso | URL / Caminho |
|---------|---------------|
| Script v4.0 (TXT para copiar no Apps Script) | https://mdlab-christian.github.io/jarbas-reports/jana/olivia/gas-v40-mdflow.txt |
| Referência completa para n8n (HTML) | https://mdlab-christian.github.io/jarbas-reports/jana/olivia/gas-v40-referencia-n8n-2026-03-16.html |
| Script antigo (referência) | `/tmp/gas_antigo.txt` |
| Script v3.2 descartado | `/tmp/gas_test.js` |
| Reporter (este arquivo) | `~/jarbas-reports/jana/olivia/reporter-gas-google-doc-creator.md` |

---

*Reporter gerado por JANA 🦊 · MdLab LegalTech · 2026-03-16 · MacBook Air M4*
