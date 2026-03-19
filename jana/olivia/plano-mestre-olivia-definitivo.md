# OlivIA v3 — Plano Mestre Definitivo v2.0

> Gerador de Petições 2.0 do MdFlow | v2.0 | 2026-03-18 | Gerado por JANA (Claude Code Opus 4.6)

**Status:** PLANEJAMENTO | **Projeto ID:** `48d9bfaa-206f-457c-95f6-36ed25e4162e` | **Versão:** 4

## Métricas Reais

| Métrica | Valor |
|---|---|
| Tabelas olivia_* | 22 |
| Tabelas Vazias | 6 |
| Modelos Petição | 329 |
| Jurisprudências | 1.353 |
| Tags (Perguntas) | 183 |
| Blocos de Texto | 1.244 |
| Taxa Sucesso | 26% (23/90) |
| published_at preenchidos | 0 |
| Tentativas Geração | 90 |
| Bugs P0/P1 | 8 |
| Gaps Identificados | 10 |
| Ideias OlivIA | 19 |
| Skills JARBAS | 12 |
| Playbooks | 9 |
| Tipos Petição | 10 |
| Áudios Transcritos | 10 |

---

## 2. Checklist de Contexto Absorvido

### Transcrições (10 áudios)
- [x] audio1.ogg — Abertura projeto (2.875 bytes)
- [x] audio2.ogg — Contexto completo (23.373 bytes)
- [x] audio3.ogg — Modo Agente tags/blocos (4.834 bytes)
- [x] audio4.ogg — Express backup, Agente principal (9.514 bytes)
- [x] audio5.ogg — Upload, drawer, anti-alucinação (26.054 bytes)
- [x] audio6.ogg — Relatório HTML, playbook auto (4.331 bytes)
- [x] audio7.ogg — SearchBox, painel, modal, versão (27.805 bytes)
- [x] audio8.ogg — Orquestração CC (14.287 bytes)
- [x] audio9.ogg — Contexto perdido (980 bytes)
- [x] audio10.ogg — Instrução final (2.056 bytes)

### Specs & Documentos (12 arquivos)
- [x] plano-mestre-olivia-v1.html (94KB)
- [x] plano-mestre-olivia-18-03.html (118KB)
- [x] SPEC_MODO_AGENTE.md (20KB)
- [x] SPEC-MODO-EXPRESS.md (24KB)
- [x] Spec Smart Blocks.txt (23KB)
- [~] Spec antiga.docx (131KB) — .docx parcial
- [x] GAS Smart blocks.txt v4.0 (20KB)
- [x] GAS express.js (40KB, 962 linhas)
- [~] Gas Antigo.docx (24KB) — .docx parcial
- [~] Petição errada.docx (11KB) — .docx parcial
- [x] PROMPT-CC-PLANO-DEFINITIVO.md (486 linhas)
- [x] FLUXO-CC-OLIVIA.html (31KB)

### Prints Analisados (19)
- [x] Modo Agente: 6 prints (Steps 1-4)
- [x] Modo Express: 4 prints (Steps 1-2)
- [x] Modo Smart Blocks: 4 arquivos (Steps 1-3)
- [x] Página /olivia: 5 prints (4 abas)

### Backend Investigado
- [x] 22 tabelas olivia_* — schema + contagem + samples
- [x] Tabelas auxiliares: processos, restrições, documentos
- [x] Projeto + 26 etapas verificadas (reorganizadas v2.0)
- [x] 9 FKs olivia_historico mapeadas
- [x] 4 workflows n8n exportados analisados
- [x] 12 skills JARBAS (Mac Mini SSH)
- [x] Frontend src/pages/olivia/ (~80 arquivos)

---

## 3. Visão Geral & Princípios Imutáveis

### Objetivo do Projeto

Reconstruir do ZERO o frontend da página `/olivia` do MdFlow — gerador de petições jurídicas para casos de restrição indevida de crédito (Serasa, SPC, Boa Vista, Quod, SCR/Registrato, RMC/RCC). O escritório Midas opera ~2.000 processos ativos com meta de 80-100 distribuições/dia.

A página OlivIA é o coração do pipeline: **/distribuição → OlivIA → /processos**. Sem OlivIA funcional, petições são feitas manualmente.

### Princípios Imutáveis

**IA NUNCA INVENTA**
- IA nunca inventa fundamentações jurídicas
- Sempre segue modelo de petição como esqueleto
- Sempre usa conhecimento interno (RAG + backend)
- Tags são tópicos obrigatórios — não pode pular
- Jurisprudências do estado do processo (prioridade) ou mais recente
- Se não tem dado, declara que não tem — NUNCA fabrica

**3 Camadas de Resiliência**
- **Modo Agente** — principal, 100% JARBAS, Claude Sonnet/Opus
- **Modo Express** — backup, 100% n8n, Claude Sonnet 4.6
- **Modo Smart Blocks** — backup mecânico, sem IA, Google Apps Script

Se JARBAS offline → Express (n8n). Se n8n offline → Smart Blocks (GAS).

### Estrutura da Página /olivia (nova)

| Aba | Descrição | Status |
|---|---|---|
| **Gerador de Petições** | Landing 3 modos + wizard multi-step + fila interna (substitui "Últimas Petições" e aba Fila) | Reconstruir |
| **Chat OlivIA** | Modal início (Livre vs Processo) + chat contextualizado + sugestões | Reconstruir |
| **Análise IA** | 100% JARBAS/JANA. Análise processo + análise decisão. Sem n8n. | Reconstruir |
| ~~Fila de Geração~~ | EXCLUÍDA — conceito migra para dentro do Gerador | Excluir |

> **REMOVIDOS:** VibeLaw Studio — excluído do projeto por decisão D-ARQ-06. Remover card da landing, componentes, routes, imports. Painéis contadores do topo da aba Gerador — excluídos.

---

## 4. Mapa Mental Consolidado

> Todas as decisões extraídas de 10 áudios + 12 specs + 19 prints + banco real. Áudio mais recente vence em conflito.

### Decisões de Arquitetura (12)

| ID | Decisão | Áudio | Status |
|---|---|---|---|
| D-ARQ-01 | Recriar frontend OlivIA do zero (todo o frontend) | 1 | FIRME |
| D-ARQ-02 | Spec central única para toda a página OlivIA | 1 | FIRME |
| D-ARQ-03 | Modo Express = 100% n8n (backup se JARBAS offline) | 4 | FIRME |
| D-ARQ-04 | Modo Agente = 100% JARBAS (principal, sem n8n) | 4 | FIRME |
| D-ARQ-05 | Smart Blocks = modo mecânico de backup (sem IA) | 4 | FIRME |
| D-ARQ-06 | VibeLaw Studio = EXCLUÍDO do projeto por enquanto | 4,6 | FIRME |
| D-ARQ-07 | Análise IA da página OlivIA = motor JARBAS (não n8n) | 2 | FIRME |
| D-ARQ-08 | Agente único de IA (análise + geração no mesmo agente) | 2,5 | FIRME |
| D-ARQ-09 | Spec em formato XML tags (não markdown) | 4,6 | FIRME |
| D-ARQ-10 | Cloud Code executa, JARBAS/JANA orquestra e revisa | 2,4 | FIRME |
| D-ARQ-11 | Step 1 unificado para todos os modos | 5 | FIRME |
| D-ARQ-12 | RAG Controller = plug and play (não implementar agora) | 6,7 | FIRME |

### Decisões de Frontend (15)

| ID | Decisão | Áudio |
|---|---|---|
| D-FE-01 | Searchbox processo: por CNJ ou nome cliente, cards com badges | 7 |
| D-FE-02 | Painel informações processo após seleção (restrições, advogado) | 7 |
| D-FE-03 | Modal cadastro rápido de processo (se não encontrado) | 7 |
| D-FE-04 | Upload provas: drawer lateral (>50% tela, direita) em vez de modal | 7 |
| D-FE-05 | Botão "Atualizar JARBAS" no drawer de upload (baixa docs do EPROC) | 7 |
| D-FE-06 | Seletor "Gerar relatório HTML" = botão Sim/Não (não boolean toggle) | 6 |
| D-FE-07 | Sistema de abas tipo Chrome para múltiplas petições simultâneas | 6 |
| D-FE-08 | Input texto + microfone (transcrição) em todos os modos IA | 5 |
| D-FE-09 | Sem seletor de playbook no Step 1 (IA seleciona automaticamente) | 6 |
| D-FE-10 | Seletor versão: exibir nome + versão + data (não só nome repetido) | 7 |
| D-FE-11 | Excluir componentes órfãos/em desuso após reconstrução | 4 |
| D-FE-12 | Sem seletor de advogado no Step 1 (já vinculado ao processo) | 7 |
| D-FE-13 | Modo Express: sem seletor de qualidade IA (fixo Sonnet 4.6) | 5 |
| D-FE-14 | Modo Agente: seletor Padrão (Sonnet) vs Avançado (Opus) | 5 |
| D-FE-15 | Validação ao avançar: verificar campos obrigatórios do modelo | 7 |

### Decisões de Backend (6)

| ID | Decisão | Áudio |
|---|---|---|
| D-BE-01 | Criar campo `categoria_empresa_id` em processos | 7 |
| D-BE-02 | Criar tabela `olivia_agente_contexto` (memória Claude entre calls) | 6 |
| D-BE-03 | Criar bucket `olivia-reports` no Supabase Storage | 6 |
| D-BE-04 | Relatórios HTML salvos no Supabase (não GitHub) | 6 |
| D-BE-05 | Manter hierarquia: modelo_petição → tags → blocos_texto → jurisprudências | 3,5,7 |
| D-BE-06 | Verificar importação completa do backend antigo | 4 |

### Features Mencionadas

| Feature | Áudio | Prioridade |
|---|---|---|
| Modo Petição Livre (seletor "usar modelo" ou não, input texto livre + upload) | 5,6 | P2 |
| Geração em lote (selecionar múltiplos processos) | ideias | P2 |
| Relatório HTML completo (análise provas, cruzamento dados, jurimetria) | 5,7 | P1 |
| RAG Controller (jurimetria por juiz, teses que funcionam por comarca) | 6,7 | P2 |
| Chat OlivIA drawer (pedir alterações na petição, mas SÓ consulta) | 4,7 | P1 |
| Protocolar petição via JARBAS (gerar PDF + protocolar EPROC) | ideias | P2 |

---

## 5. Arquitetura de Resiliência

### Fluxo de Fallback: 3 Camadas

```
Modo Agente → Modo Express → Smart Blocks
(JARBAS+Claude)  (n8n+Sonnet)   (GAS+Templates)
```

| Característica | Modo Agente | Modo Express | Smart Blocks |
|---|---|---|---|
| Motor | JARBAS (Mac Mini) | n8n (Railway) | Google Apps Script |
| IA | Claude Sonnet/Opus | Claude Sonnet 4.6 | Nenhuma |
| Qualidade | Alta (personalizável) | Média-alta (fixo Sonnet) | Mecânica (template) |
| Velocidade | ~2-5 min | ~1-3 min | ~30s |
| Dependência | JARBAS online | n8n online | GAS online |
| Steps | 1-6 | 1-5 | 1-3 |
| Upload docs | Sim (Step 1) | Sim (Step 1) | Não |
| Análise IA | Sim (profunda) | Sim (perguntas dinâmicas) | Não |
| Relatório HTML | Sim (toggle) | Não | Não |
| Status Atual | **P0 FK quebrada** | **P0 fetch() n8n** | **P1 versões** |

### Fluxo Geral de Geração

```
Step 1 → Upload → Análise IA → Estrutura → Revisão → Geração
(Identificação)  (Provas/Docs)  (Triagem)    (Outline)   (Rascunho)  (Google Doc)
```

---

## 6. Step 1 Unificado — Spec Completa

Step 1 é IDÊNTICO para todos os modos, com variações pontuais documentadas abaixo.

### 6.1 SearchBox Processo

**Comportamento:**
- Busca por **número CNJ** (formato: NNNNNNN-DD.AAAA.J.TR.OOOO) OU **nome do cliente**
- Debounce 300ms, mínimo 2 caracteres
- Resultados em cards com: CNJ (JetBrains Mono), nome cliente, empresa ré, status, advogado
- Badges de status: ativo, em_recurso, sentenciado_favoravel, etc.
- Se não encontrado: botão "Cadastrar novo processo" abre modal de cadastro rápido
- Query: `processos` filtrado por `organizacao_id`, `deleted_at IS NULL`, busca unaccent

**Modal Cadastro Rápido:**
- Campos: numero_cnj, cliente (searchbox), empresa (searchbox), advogado (auto-preenchido), tipo_processo, estado
- Cria processo com `status='rascunho'`, `etapa_distribuicao='peticao'`
- Após criar, seleciona automaticamente no SearchBox

### 6.2 Painel Informações do Processo

**Tipo EMPRESA (restrição única):**

| Campo | Source |
|---|---|
| Valor Restrição | `processos.restricao_valor` |
| Código Contrato | `processos.restricao_contrato` |
| Data Restrição | `processos.restricao_data` |
| Órgão Restritivo | `processos.restricao_orgao_nome` |
| Empresa Ré | `processos.reu_nome` ou `empresas.nome` |
| Advogado | `processos.advogado_nome_oab` |
| Comarca | `processos.cidade_distribuicao` |

**Tipo ÓRGÃO (múltiplas restrições):**

Tabela `processos_restricoes` com múltiplas linhas:

| Campo | Source |
|---|---|
| Órgão Nome | `processos_restricoes.orgao_nome` |
| Valor | `processos_restricoes.valor` |
| Data | `processos_restricoes.data_restricao` |
| Contrato | `processos_restricoes.contrato` |
| Tipo | `processos_restricoes.tipo` |
| Origem | `processos_restricoes.origem` |

Média 4 restrições, max 20+. Exibir em tabela scrollable.

**Referência visual:** Painel do Smart Blocks Step 1 atual é o melhor — recriar inspirado nele.

### 6.3 Seletores

**Tipo de Petição** — Select com 10 opções de `olivia_tipos_peticao`:

| Nome | Código | Ordem |
|---|---|---|
| Emenda Processual | `emenda_processual` | 1 |
| Manifestação | `manifestacao` | 2 |
| Réplica | `replica` | 3 |
| Apelação | `apelacao` | 4 |
| Contrarrazões | `contrarrazoes` | 5 |
| Agravo de Instrumento | `agravo_instrumento` | 6 |
| Petição Simples | `peticao_simples` | 7 |
| Cumprimento de Sentença | `cumprimento_sentenca` | 8 |
| Alegações Finais | `alegacoes_finais` | 9 |
| Expedição de Alvará | `expedicao_alvara` | 10 |

**Modelo de Petição** — Filtrado por: `tipo_peticao_id` + `categoria_empresa_id` (quando processo tiver categoria). Source: `olivia_modelos_grupo` (177 grupos).

**Versão — FIX OBRIGATÓRIO**

> **BUG ATUAL:** Seletor mostra nome do modelo repetido 3x ("Instituição Financeira - Cartão de Crédito").
> **FIX:** Exibir `"V${versao} · ${nome} · ${format(created_at, 'dd/MM')}"`. Source: `olivia_modelos_peticao` WHERE `modelo_grupo_id = X AND ativo = true`.
> **DESCOBERTA CRÍTICA:** `published_at = NULL` em TODOS os 329 modelos. Erro "Modelo sem versão publicada" causado por query que filtra `published_at IS NOT NULL`. **FIX:** Ignorar `published_at` e usar `ativo = true` como critério, OU popular `published_at = now()` em todos os 329 modelos.

### 6.4 Upload de Documentos/Provas (Drawer)

- **Layout:** Drawer lateral direita, >50% largura da tela (D-FE-04)
- **Trigger:** Botão "Adicionar Documentos" no Step 1
- **Conteúdo:** Lista de `processos_documentos` do processo + área drag-and-drop upload
- **Botão "Atualizar JARBAS":** Chama JARBAS para baixar documentos do EPROC para o Drive (D-FE-05)
- **Categorias:** Comprovante restrição, SMS, Email, Correspondência, Contestação, Laudo, Outros
- **Apenas nos modos Express e Agente** — Smart Blocks não tem upload

### 6.5 Variações por Modo

| Elemento | Smart Blocks | Express | Agente |
|---|---|---|---|
| Upload Docs | Não | Sim (drawer) | Sim (drawer) |
| Qualidade IA | N/A | Fixo Sonnet 4.6 | Seletor: Padrão (Sonnet) / Avançado (Opus) |
| Gerar Relatório HTML | Não | Não | Sim/Não (botão) |
| Playbook | N/A | Auto (IA seleciona) | Auto (IA seleciona) |
| Advogado | Sempre do processo (D-FE-12) — sem seletor separado | | |

### 6.6 Validação ao Avançar

- Processo selecionado (obrigatório)
- Tipo de petição selecionado (obrigatório)
- Modelo de petição selecionado (obrigatório)
- Versão selecionada (obrigatório)
- Versão com `conteudo_template` não vazio (233/329 tem, 96 com Drive 403)
- Se modo IA: pelo menos 1 documento uploaded OU confirmação "gerar sem documentos"

---

## 7. Modo Smart Blocks — Spec Completa

> **Status:** P1 — Versões duplicadas + olivia_flow vazia + olivia_modelo_juris vazia

### 7.1 Step 1 — Identificação (base unificada)

Idêntico ao Step 1 Unificado (seção 6), sem upload de documentos e sem qualidade IA.

**Referência:** O painel de informações do processo do Smart Blocks atual é o MELHOR de todos — usar como referência visual para o Step 1 unificado.

### 7.2 Step 2 — Wizard de Tags

**Conceito:** Wizard sequencial onde cada step = 1 tag (pergunta) com opções de blocos de texto (respostas). Baseado na versão selecionada no Step 1.

**Fluxo:**
1. Carregar tags do modelo via `olivia_modelo_tags` WHERE `modelo_id = versao_selecionada.id` ORDER BY `ordem`
2. Para cada tag: exibir nome da tag (pergunta) + blocos de texto disponíveis (filtrados por `tag_ids` contendo o `tag.id`)
3. Usuário seleciona 1 bloco por tag (obrigatória) ou pula (se `selecao_obrigatoria = false`)
4. Se tag com `multipla_selecao = true`: permitir selecionar N blocos
5. NÃO permitir criar bloco personalizado (decisão Christian)
6. Wizard sequencial: tag 1 → tag 2 → ... → tag N → avançar para Step 3

**Seções (olivia_tags_secao):**

| ID | Nome | Ordem |
|---|---|---|
| `f9105bb6-...` | introdução | 0 |
| `06f1e1cc-...` | fundamentação | 1 |
| `f1426f75-...` | conclusão | 2 |

Tags agrupadas por seção para exibir headers no wizard (Introdução, Fundamentação, Conclusão).

**Dados reais:**
- **183 tags** disponíveis (todos `ativo = true`)
- **1.244 blocos de texto** vinculados via `tag_ids[]`
- **508 vinculações** modelo↔tag em `olivia_modelo_tags`

### 7.3 Step 3 — Preview & Geração

**Fluxo:**
1. Montar payload com: modelo selecionado + tags/blocos selecionados + dados do processo
2. Enviar para Google Apps Script (GAS Smart Blocks)
3. GAS executa: getModelo → substituirBlocos → substituirJuris → substituirPlaceholders → formatarDoc
4. Retorna Google Doc URL
5. Exibir preview da petição + link para Google Doc + botão download

> **BUG ATUAL:** Petição gerada com conteúdo errado. Causa: tags não substituídas corretamente — blocos de texto genéricos em vez de específicos da versão selecionada.
> **Agravante 1:** `olivia_modelo_juris` VAZIA — jurisprudências não inseridas automaticamente.
> **Agravante 2:** `olivia_flow` VAZIA — wizard de tags não segue fluxo correto.

### 7.4 Estratégia de População olivia_flow

Popular `olivia_flow` a partir da lógica do GAS Smart Blocks v4.0:

1. Para cada `olivia_modelos_grupo` ativo: carregar `olivia_modelo_tags` ordenadas por `ordem`
2. Agrupar tags por `secao_id` (introdução → fundamentação → conclusão)
3. Gerar JSONB `flow` com estrutura: `[{secao_id, secao_nome, tags: [{tag_id, tag_nome, ordem, obrigatoria}]}]`
4. INSERT em `olivia_flow` com `flow_ativo = true`, `validation_status = 'valid'`

```sql
-- Script de população olivia_flow
INSERT INTO olivia_flow (organizacao_id, modelo_grupo_id, flow, flow_ativo, validation_status)
SELECT
  mg.organizacao_id,
  mg.id as modelo_grupo_id,
  jsonb_agg(
    jsonb_build_object(
      'tag_id', mt.tag_id,
      'tag_nome', t.nome,
      'secao_id', t.secao_id,
      'ordem', mt.ordem,
      'obrigatoria', mt.obrigatoria
    ) ORDER BY COALESCE(t.secao_id::text, 'zzz'), mt.ordem
  ) as flow,
  true as flow_ativo,
  'valid' as validation_status
FROM olivia_modelos_grupo mg
JOIN olivia_modelo_tags mt ON mt.modelo_id = mg.id
JOIN olivia_tags t ON t.id = mt.tag_id
WHERE mg.deleted_at IS NULL
GROUP BY mg.organizacao_id, mg.id;
```

---

## 8. Modo Express — Spec Completa

> **Status:** P0 — fetch() is not defined em 10 Code nodes n8n + published_at NULL em 329 modelos

### 8.1 Step 1 — Identificação (base unificada)

Idêntico ao Step 1 Unificado (seção 6), COM upload de documentos (drawer), SEM seletor qualidade IA (fixo Sonnet 4.6).

**Timing:** Disparo do workflow Análise IA DEPOIS do clique em "Avançar" (não ao carregar o step).

### 8.2 Step 2 — Análise IA + Triagem

**Fluxo:**
1. Ao avançar do Step 1: INSERT em `olivia_historico` com status PENDENTE, modo EXPRESS, motor n8n
2. Disparar webhook n8n com payload completo (ver seção 14 — Payload Agente)
3. Agente Claude analisa: documentos uploadados + dados backend do processo + restrições + empresa
4. Agente gera perguntas dinâmicas em JSON baseadas na análise (NÃO perguntas genéricas pré-definidas)
5. Frontend exibe perguntas com inputs de resposta (texto + microfone)
6. Respostas alimentam o agente para Step 3

**Perguntas Dinâmicas:**

```json
{
  "perguntas": [
    {"id": "uuid", "texto": "O contrato foi assinado presencialmente?", "tipo": "sim_nao", "obrigatoria": true},
    {"id": "uuid", "texto": "Descreva como tomou conhecimento da restrição", "tipo": "texto_livre", "obrigatoria": true},
    {"id": "uuid", "texto": "Possui comprovante de pagamento?", "tipo": "sim_nao_upload", "obrigatoria": false}
  ]
}
```

### 8.3 Step 3 — Editor Outline Drag-and-Drop

**RECONSTRUÍDO DO ZERO:**
- **Remover:** Seletor de "empresa ré" (já vem vinculada ao processo — redundante)
- Lista de tags/seções draggable (@dnd-kit)
- Cada tag: título + incluir/excluir toggle + observações livres + botão microfone
- Tags carregadas via `olivia_modelo_tags` do modelo selecionado
- Agrupadas por seção (introdução, fundamentação, conclusão)
- Reordenação altera a ordem da petição final

### 8.4 Step 4 — Revisão do Rascunho

- Exibir rascunho da petição gerado pelo agente
- Editor read-only com highlight de seções
- Botão "Aprovar e Gerar" → cria Google Doc final
- Botão "Voltar para Outline" → volta ao Step 3 para ajustes

### 8.5 Step 5 — Conclusão

- Google Doc URL + botão "Abrir no Google Docs"
- Botão "Download PDF"
- Score revisor (se disponível)
- Tempo de geração
- Botão "Gerar outra" → volta ao Step 1 em nova aba

### 8.6 Fix fetch() N8N — 15 Code nodes afetados

> **CONFIRMADO:** Workflow Express (`MN5kuLDzuIrIpufm`) tem 10 Code nodes usando fetch(). Workflow Smart Blocks (`hyGajjic2kZBVGvW`) tem 5 Code nodes usando fetch(). Workflow Análise IA (`8ntAvTGMhCfrlfRt`) tem 0 — LIMPO.

**Express — 10 nodes com fetch():**

| Node | Uso do fetch() | Fix |
|---|---|---|
| `A1-Validate` | Teste de disponibilidade fetch | Remover teste, usar $helpers.httpRequest() |
| `A3b-GerarIA` | fetch('https://api.anthropic.com/v1/messages') | Substituir por HTTP Request node nativo |
| `B-ProgressStart` | fetch Supabase REST (UPDATE historico) | $helpers.httpRequest() ou Supabase node |
| `B2-BuscarContexto` | 2x fetch Supabase REST (SELECT) | $helpers.httpRequest() |
| `B3-MontarPrompt` | fetch Supabase REST (UPDATE) | $helpers.httpRequest() |
| `B4-ChamarRedator` | fetch Anthropic API | HTTP Request node |
| `B5-ParseRedator` | fetch Supabase REST (UPDATE) | $helpers.httpRequest() |
| `B7-Revisor` | 3x fetch (Supabase + Anthropic) | Split em HTTP Request nodes |
| `B8-Salvar` | fetch Supabase REST (UPDATE) | $helpers.httpRequest() |
| `B8.5-CriarDoc` | fetch Supabase REST (UPDATE) | $helpers.httpRequest() |
| `ErrorHandler` | fetch Supabase REST (UPDATE erro) | $helpers.httpRequest() |

**Smart Blocks — 5 nodes com fetch():**

| Node | Uso do fetch() | Fix |
|---|---|---|
| `A1b-CriarHistorico` | fetch Supabase REST (INSERT) | $helpers.httpRequest() |
| `B1-BuscarProcesso` | fetch Supabase REST (SELECT) | $helpers.httpRequest() |
| `B3-BuscarJuris` | fetch Supabase REST (SELECT) | $helpers.httpRequest() |
| `C1-MontarPayloadGAS` | fetch Supabase REST (UPDATE) | $helpers.httpRequest() |
| `E1-SalvarErroGlobal` | fetch Supabase REST (UPDATE erro) | $helpers.httpRequest() |

---

## 9. Modo Agente — Spec Completa

> **Status:** P0 — FK olivia_historico_modelo_id_fkey + endpoint inexistente + ORG_ID hardcoded

### 9.1 Step 1 — Identificação (base unificada)

Idêntico ao Step 1 Unificado (seção 6), COM upload de documentos (drawer), COM seletor qualidade IA (Padrão/Avançado), COM toggle "Gerar Relatório HTML".

### 9.2 Step 2 — Análise IA Profunda

**Upload de documentos SAI do Step 2 → movido para Step 1** (D-FE drawer lateral).

- Ao avançar do Step 1: JARBAS inicia análise profunda
- Conecta RAG OlivIA + dados backend + documentos uploaded
- Gera relatório de análise com: fatos identificados, restrições mapeadas, teses aplicáveis
- Exibe resultado enquanto gera perguntas de triagem
- Frontend faz polling em `olivia_historico.progresso` (JSONB array de steps)

### 9.3 Step 3 — Editor Rascunho + Chat Drawer

> **Step 3 atual NÃO funciona.** Reconstruir como editor real.

- Rich text editor com rascunho gerado internamente (Smart Blocks como referência base)
- Chat OlivIA em drawer/sidebar lateral com sugestões de alteração
- Sugestões com highlight aceitar/rejeitar (chat só consulta, D-ARQ decisão)
- Painel jurimetria RAG Controller plug and play (interface pronta, sem dados ainda)

### 9.4 Step 4 — Geração com JARBAS

> **ERRO ATUAL:** "Falha ao criar historico: insert or update on table 'olivia_historico' violates foreign key constraint 'olivia_historico_modelo_id_fkey'"
> **CAUSA RAIZ:** `olivia_historico.modelo_id` FK → `olivia_modelos_grupo(id)`. Frontend passa `olivia_modelos_peticao.id` em vez de `olivia_modelos_grupo.id`.
> **FIX:** Frontend deve passar `modelo_grupo_id` (do modelo_peticao selecionado) no campo `modelo_id`.

**Fluxo correto:**
1. CREATE `olivia_historico` com: modelo_id = `modelo_grupo.id`, versao_id = `versao.id`, status = 'PENDENTE'
2. POST /olivia/gerar-modo-agente para JARBAS (endpoint a criar: `skill_olivia_agente_v3.mjs`)
3. JARBAS: UPDATE status = 'EM_PROGRESSO', gera petição com Claude, cria Google Doc
4. UPDATE status = 'SUCESSO', preenche `google_doc_url`, `texto_gerado`, `custo_usd`
5. Se toggle relatório: dispara `skill_olivia_relatorio.mjs` assíncrono

### 9.5 Step 5 — Revisão Final

- Preview da petição gerada
- Score do revisor (se `skip_revisor = false`)
- Botões: "Abrir Google Doc", "Download PDF", "Editar no Editor"

### 9.6 Step 6 — Conclusão & Relatório

- Google Doc URL + PDF URL
- Link para relatório HTML (se gerado) — salvo em bucket `olivia-reports`
- Métricas: tokens usados, custo USD, tempo geração, modelo usado
- Feedback: campo "nota do advogado" (1-10) + comentário livre

---

## 10. Chat OlivIA — Spec Nova

### Modal de Início (obrigatório antes de iniciar chat)

**Chat Livre:**
- Sem contexto de processo. Chat geral com OlivIA sobre questões jurídicas.
- Thread tipo: `CHAT`, `processo_id = NULL`

**Informar Processo:**
- SearchBox para selecionar processo. Chat inicia contextualizado com dados do processo, restrições, documentos.
- Thread tipo: `CHAT`, `processo_id = UUID`

### UX do Chat (repensada)

- Layout split: 60% editor (se veio de petição) + 40% chat
- Se Chat Livre: 100% chat
- Sugestões de mudança no editor com highlight aceitar/rejeitar
- Histórico preservado por sessão (thread_id)
- Campo input: texto + botão microfone (transcrição Whisper)
- Botões rápidos: "Resuma o caso", "Teses aplicáveis", "Jurisprudência relevante"

### Dados reais
- 28 threads existentes, 122 mensagens
- Status: ATIVA, ARQUIVADA, EXCLUIDA

---

## 11. Análise IA — Spec Nova (100% JARBAS/JANA)

### Migrar motor de n8n para JARBAS (D-ARQ-07)

Toda a aba de Análise IA passa a rodar 100% no JARBAS/JANA, sem n8n como intermediário.

### Sub-abas

| Sub-aba | Função | Motor |
|---|---|---|
| Analisar Processo | Upload peças + campo contexto + microfone → análise completa do caso | JARBAS skill_olivia_analise.mjs |
| Analisar Decisão | Upload decisão/sentença → análise para recurso | JARBAS skill_olivia_analista_sentenca.mjs |

### Histórico
**51 análises** já executadas em `olivia_analises`. Exibir histórico com filtros por tipo e status.

### Conexão RAG Controller (plug and play)
Interface `olivia_historico.rag_controller_context` (JSONB). Quando RAG Controller estiver populado, análise automaticamente inclui: taxa de sucesso por juiz, teses que funcionam por comarca.

---

## 12. Aba Gerador — Fila Otimizada

### Nova estrutura (substitui "Últimas Petições" e aba Fila excluída)
- **SEM painéis contadores no topo** (decisão Christian)
- Landing com 3 cards de modo (Express, Agente, Smart Blocks)
- Abaixo dos cards: **Fila de Geração interna** com polling 5s

### Fila Interna

| Coluna | Source |
|---|---|
| CNJ | `processos.numero_cnj` (JOIN, NÃO "Petição avulsa") |
| Cliente | `processos.cliente_nome` |
| Modo | Badge: SMART_BLOCKS → "Smart Blocks", EXPRESS → "Express", JARBAS → "Agente" |
| Status | Visual: PENDENTE (amarelo), EM_PROGRESSO (azul pulsante), SUCESSO (verde), ERRO (vermelho) |
| Tempo | `tempo_geracao_ms` formatado ou elapsed desde created_at |
| Ações | Abrir Doc (se SUCESSO) \| Relatório HTML (se disponível) \| Retry (se ERRO) |

### Sistema de Abas Multi-petição (tipo Chrome)
- WizardTabBar acima do wizard
- Múltiplas petições simultâneas em modos e steps diferentes
- Persistência de estado por aba (useState ou zustand)
- Dirty-state guard ao fechar aba com dados não salvos
- Nova aba: "+" ao lado das existentes

---

## 13. Backend — 22 Tabelas olivia_*

### 13.1 olivia_historico (TABELA CENTRAL)

**90 rows** | **46 colunas** | Status: 37 ABANDONADO, 17 SUCESSO, 28 ERRO, 2 PENDENTE

| Coluna | Tipo | Nullable | Default | Descrição |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `organizacao_id` | uuid | NO | - | FK organizacoes |
| `user_id` | uuid | YES | - | FK users |
| `processo_id` | uuid | YES | - | FK processos |
| `tipo_peticao_id` | uuid | YES | - | FK olivia_tipos_peticao |
| `modelo_id` | uuid | YES | - | **FK olivia_modelos_grupo** (NÃO petição!) |
| `versao_id` | uuid | YES | - | FK olivia_versoes |
| `advogado_id` | uuid | YES | - | FK advogados |
| `cliente_id` | uuid | YES | - | FK clientes |
| `analise_id` | uuid | YES | - | FK olivia_analises |
| `status` | text | YES | 'PENDENTE' | PENDENTE\|EM_PROGRESSO\|SUCESSO\|ERRO\|ABANDONADO |
| `modo` | text | YES | - | SMART_BLOCKS\|EXPRESS\|IA_ASSISTIDA\|JARBAS |
| `motor` | text | YES | 'n8n' | n8n\|smart-blocks\|jarbas |
| `qualidade_ia` | text | YES | 'padrao' | padrao\|avancado |
| `google_doc_url` | text | YES | - | URL do Google Doc gerado |
| `google_doc_id` | text | YES | - | ID do Google Doc |
| `texto_gerado` | text | YES | - | Texto completo da petição |
| `peticao_html` | text | YES | - | HTML da petição |
| `revisao` | text | YES | - | Texto da revisão |
| `score_revisor` | numeric | YES | - | Nota do revisor IA (0-10) |
| `aprovado_revisor` | boolean | YES | - | Aprovado pelo revisor |
| `skip_revisor` | boolean | YES | false | Pular revisão |
| `progresso` | jsonb | YES | '[]' | Array de steps do progresso |
| `tokens_usados` | integer | YES | - | Total tokens |
| `custo_usd` | numeric | YES | - | Custo em USD |
| `custo_estimado_usd` | numeric | YES | - | Custo estimado |
| `tempo_geracao_ms` | integer | YES | - | Tempo em ms |
| `error_message` | text | YES | - | Mensagem de erro |
| `modelo_usado` | text | YES | - | Nome do modelo Claude |
| `agente_usado` | text | YES | - | Agente IA usado |
| `pdf_url` | text | YES | - | URL do PDF |
| `pdf_path` | text | YES | - | Path do PDF no storage |
| `url_publica` | text | YES | - | URL pública de visualização |
| `run_id` | text | YES | - | ID da execução n8n |
| `request_id` | text | YES | - | ID do request webhook |
| `meta` | jsonb | YES | '{}' | Metadados extras |
| `tipo_peticao_label` | text | YES | - | Label denormalized |
| `comarca` | text | YES | - | Comarca denormalized |
| `tipo_reu` | text | YES | - | Tipo do réu |
| `contestacao_url` | text | YES | - | URL da contestação |
| `documentos_reu_urls` | jsonb | YES | '[]' | URLs docs réu |
| `structural_template_id` | uuid | YES | - | FK structural_templates |
| `feedback_advogado` | text | YES | - | Feedback do advogado |
| `created_at` | timestamptz | NO | now() | |
| `updated_at` | timestamptz | NO | now() | |
| `finished_at` | timestamptz | YES | - | Quando terminou |

**9 Foreign Keys:**

| Constraint | Coluna | Referência |
|---|---|---|
| olivia_historico_organizacao_id_fkey | organizacao_id | organizacoes(id) |
| olivia_historico_user_id_fkey | user_id | users(id) |
| olivia_historico_processo_id_fkey | processo_id | processos(id) |
| olivia_historico_tipo_peticao_id_fkey | tipo_peticao_id | olivia_tipos_peticao(id) |
| **olivia_historico_modelo_id_fkey** | **modelo_id** | **olivia_modelos_grupo(id)** |
| olivia_historico_versao_id_fkey | versao_id | olivia_versoes(id) |
| olivia_historico_advogado_id_fkey | advogado_id | advogados(id) |
| olivia_historico_cliente_id_fkey | cliente_id | clientes(id) |
| olivia_historico_analise_id_fkey | analise_id | olivia_analises(id) |

### 13.2 Resumo das 22 Tabelas

| Tabela | Rows | Cols | Status | Obs |
|---|---|---|---|---|
| `olivia_historico` | 90 | 46 | P0 FK | Tabela central. 26% sucesso |
| `olivia_historico_gerador` | 0 | 23 | VAZIA | Nunca usada — candidata a remoção |
| `olivia_analises` | 51 | 18 | OK | Análises executadas |
| `olivia_blocos_texto` | 1.244 | 16 | OK | Importados com conteúdo |
| `olivia_tags` | 183 | 11 | OK | Tags = perguntas |
| `olivia_tags_secao` | 3 | 6 | OK | introdução, fundamentação, conclusão |
| `olivia_modelos_grupo` | 177 | 14 | OK | Grupos de modelos |
| `olivia_modelos_peticao` | 329 | 23 | published_at=NULL | 329 modelos, 0 published |
| `olivia_modelo_tags` | 508 | 7 | OK | Vinculação modelo↔tag |
| `olivia_modelo_juris` | 0 | 8 | VAZIA P1 | Vinculação modelo↔juris NÃO importada |
| `olivia_jurisprudencias` | 1.353 | 21 | 99% sem texto | 1.338/1.353 sem texto_integral |
| `olivia_jurisprudencias_assunto` | 480 | 7 | OK | Assuntos de juris |
| `olivia_jurisprudencias_config` | 0 | 17 | VAZIA | Config scraping — futuro |
| `olivia_messages` | 122 | 17 | OK | Mensagens chat |
| `olivia_threads` | 28 | 20 | OK | Threads de conversa |
| `olivia_tipos_peticao` | 10 | 13 | OK | 10 tipos ativos |
| `olivia_tipos_prova` | 0 | 12 | VAZIA P2 | Precisa seed |
| `olivia_versoes` | 329 | 10 | OK | 1:1 com modelos_peticao |
| `olivia_playbooks` | 9 | 22 | OK | 8 published + 1 draft |
| `olivia_placeholders_registry` | 12 | 9 | OK | 12 placeholders registrados |
| `olivia_structural_templates` | 0 | 15 | VAZIA | Templates estruturais — futuro |
| `olivia_flow` | 0 | 10 | VAZIA P1 | Flows wizard — precisa popular |

---

## 14. Payload do Agente de Análise

### Campos exatos a enviar ao agente (n8n ou JARBAS)

| Tabela | Campo | Tipo | Descrição |
|---|---|---|---|
| **processos** | numero_cnj | text | CNJ do processo |
| | tipo_processo | text | empresa\|orgao |
| | status | text | Status processual |
| | restricao_valor | numeric | Valor da restrição (empresa) |
| | restricao_contrato | text | Código contrato |
| | restricao_data | date | Data da restrição |
| | restricao_orgao_nome | text | Órgão restritivo |
| | reu_nome | text | Nome empresa ré |
| | cidade_distribuicao | text | Comarca |
| | objeto | text | Objeto da ação |
| | grau | smallint | 1o ou 2o grau |
| **processos_restricoes** | orgao_nome | text | Nome do órgão |
| | valor | numeric | Valor da restrição |
| | data_restricao | date | Data |
| | contrato | text | Código contrato |
| | tipo | integer | Tipo da restrição |
| | origem | text | Origem |
| **processos_documentos** | nome | text | Nome do documento |
| | tipo | text | Tipo (contestação, contrato...) |
| | arquivo_url | text | URL para download |
| | texto_extraido | text | Texto OCR/extraído |
| **clientes** | nome | text | Nome completo |
| | cpf | text | CPF (LGPD: redacted em logs) |
| **empresas** | nome | text | Nome da empresa |
| | categoria (via empresas_categorias) | text | Categoria: IF, Lojas, Telefonia, etc. |
| **advogados** | nome (via users) | text | Nome do advogado |
| | oab | text | Código OAB + UF |

### 12 Placeholders Registrados

| Placeholder | Label | Tipo | Source |
|---|---|---|---|
| `{{advogado_enderecamento}}` | Endereço do Advogado | text | users.endereco |
| `{{advogado_nome}}` | Nome do Advogado | text | users.nome |
| `{{advogado_oab}}` | OAB do Advogado | text | users.oab |
| `{{advogado_oab_codigo}}` | Código OAB | text | advogados.oab |
| `{{comarca}}` | Comarca | text | processos.comarca |
| `{{cpf_cliente}}` | CPF do Cliente | text | clientes.cpf |
| `{{data_distribuicao}}` | Data de Distribuição | date | processos.data_distribuicao |
| `{{nome_cliente}}` | Nome do Cliente | text | clientes.nome |
| `{{nome_empresa}}` | Nome da Empresa Ré | text | empresas.nome |
| `{{numero_cnj}}` | Número CNJ | text | processos.numero_cnj |
| `{{valor_causa}}` | Valor da Causa | currency | processos.valor_causa |
| `{{vara}}` | Vara/Juízo | text | processos.vara |

---

## 15. Gaps & Migrations — SQL Concreto

### Gap 1: processos.categoria_empresa_id NÃO existe — P0

```sql
ALTER TABLE processos ADD COLUMN categoria_empresa_id UUID REFERENCES empresas_categorias(id);
CREATE INDEX idx_processos_categoria ON processos(categoria_empresa_id);
COMMENT ON COLUMN processos.categoria_empresa_id IS 'Categoria da empresa ré: IF, Lojas, Telefonia, etc.';
```

### Gap 2: published_at NULL em TODOS os 329 modelos — P0

```sql
-- Opção A: Popular published_at (recomendada)
UPDATE olivia_modelos_peticao SET published_at = created_at, published_by_id = '5fe9f43f-6a88-485c-9689-be486f645ba2' WHERE ativo = true AND published_at IS NULL;

-- Opção B: Mudar query para ignorar published_at e usar ativo = true
-- (aplicar no frontend: WHERE modelo_grupo_id = X AND ativo = true)
```

### Gap 3: olivia_modelo_juris VAZIA (0 rows) — P1

```sql
-- Importar vinculações modelo↔jurisprudência do backend antigo
-- Estrutura: modelo_grupo_id + juris_id + assunto_id + advogado_id
-- Script de importação a criar baseado nos dados do GAS antigo
```

### Gap 4: olivia_flow VAZIA (0 rows) — P1

```sql
-- Popular flows a partir de olivia_modelo_tags (ver seção 7.4)
INSERT INTO olivia_flow (organizacao_id, modelo_grupo_id, flow, flow_ativo, validation_status)
SELECT mg.organizacao_id, mg.id,
  jsonb_agg(jsonb_build_object(
    'tag_id', mt.tag_id, 'tag_nome', t.nome, 'secao_id', t.secao_id,
    'ordem', mt.ordem, 'obrigatoria', mt.obrigatoria
  ) ORDER BY COALESCE(t.secao_id::text, 'zzz'), mt.ordem),
  true, 'valid'
FROM olivia_modelos_grupo mg
JOIN olivia_modelo_tags mt ON mt.modelo_id = mg.id
JOIN olivia_tags t ON t.id = mt.tag_id
WHERE mg.deleted_at IS NULL
GROUP BY mg.organizacao_id, mg.id;
```

### Gap 5: texto_integral 99% vazio (1.338/1.353) — P1

```sql
-- Verificação
SELECT COUNT(*) as total,
  COUNT(*) FILTER (WHERE texto_integral IS NOT NULL AND texto_integral != '') as com_texto
FROM olivia_jurisprudencias;
-- Resultado: total=1353, com_texto=15

-- Fix: Re-importar via rclone com permissões corretas do Drive
-- Script: migrar_modelos_rclone.mjs (já criado)
```

### Gap 6: olivia_tipos_prova VAZIA — P2

```sql
INSERT INTO olivia_tipos_prova (organizacao_id, nome, categoria, nivel_impugnacao, tipo_reu, peso_relevancia, ativo)
VALUES
('55a0c7ba-1a23-4ae1-b69b-a13811324735', 'Comprovante de Restrição', 'documental', 'alto', NULL, 10, true),
('55a0c7ba-1a23-4ae1-b69b-a13811324735', 'SMS de Cobrança', 'comunicacao', 'medio', NULL, 7, true),
('55a0c7ba-1a23-4ae1-b69b-a13811324735', 'Email de Cobrança', 'comunicacao', 'medio', NULL, 7, true),
('55a0c7ba-1a23-4ae1-b69b-a13811324735', 'Correspondência', 'comunicacao', 'medio', NULL, 6, true),
('55a0c7ba-1a23-4ae1-b69b-a13811324735', 'Contestação', 'processual', 'alto', NULL, 9, true),
('55a0c7ba-1a23-4ae1-b69b-a13811324735', 'Laudo Pericial', 'tecnico', 'alto', NULL, 10, true),
('55a0c7ba-1a23-4ae1-b69b-a13811324735', 'Contrato', 'documental', 'alto', NULL, 8, true),
('55a0c7ba-1a23-4ae1-b69b-a13811324735', 'Extrato Bancário', 'documental', 'medio', NULL, 7, true),
('55a0c7ba-1a23-4ae1-b69b-a13811324735', 'Print de Tela', 'digital', 'baixo', NULL, 5, true),
('55a0c7ba-1a23-4ae1-b69b-a13811324735', 'Procuração', 'processual', 'alto', NULL, 8, true);
```

### Gap 7: olivia_agente_contexto NÃO existe — P2

```sql
CREATE TABLE olivia_agente_contexto (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organizacao_id UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  historico_id UUID NOT NULL REFERENCES olivia_historico(id) ON DELETE CASCADE,
  step TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('system','user','assistant')),
  content TEXT NOT NULL,
  tokens INTEGER,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX ON olivia_agente_contexto(organizacao_id);
CREATE INDEX ON olivia_agente_contexto(historico_id);
ALTER TABLE olivia_agente_contexto ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON olivia_agente_contexto USING (organizacao_id = public.get_org_id());
```

---

## 16. Diagnóstico de Bugs

### Bug 1: fetch() is not defined no n8n — P0

| Campo | Detalhe |
|---|---|
| Workflows afetados | Express (10 nodes) + Smart Blocks (5 nodes) |
| Node que falhou | `B-ProgressStart` (Express, Execution 122965) |
| Erro | `ReferenceError: fetch is not defined [line 4]` |
| Causa | n8n Task Runner isola Code nodes — `fetch()`, `URL` class e `https` module NÃO disponível |
| Fix | Substituir `fetch()` por `$helpers.httpRequest()` em todos os 15 Code nodes, OU converter para HTTP Request nodes nativos |
| Impacto | Modo Express e Smart Blocks completamente inoperantes via n8n |

### Bug 2: FK olivia_historico_modelo_id_fkey — P0

| Campo | Detalhe |
|---|---|
| Erro | "insert or update on table 'olivia_historico' violates foreign key constraint 'olivia_historico_modelo_id_fkey'" |
| Causa | FK `modelo_id` → `olivia_modelos_grupo(id)`. Frontend passa `olivia_modelos_peticao.id` |
| Fix frontend | Ao inserir em olivia_historico, usar `modelo_peticao.modelo_grupo_id` no campo `modelo_id` |
| Fix JARBAS | Mesmo fix em `skill_olivia_agente_v2.mjs` |

### Bug 3: "Modelo sem versão publicada" (falso positivo) — P0

| Campo | Detalhe |
|---|---|
| Erro | "Modelo sem versão publicada — não é possível avançar" |
| Causa | `published_at = NULL` em TODOS os 329 modelos |
| Fix (banco) | `UPDATE olivia_modelos_peticao SET published_at = created_at WHERE ativo = true` |
| Fix (frontend) | Mudar query para usar `ativo = true` em vez de `published_at IS NOT NULL` |

### Bug 3.5: salvarHistorico faz INSERT em vez de UPDATE — P1

| Campo | Detalhe |
|---|---|
| Erro | olivia_historico recebe INSERTs duplicados em vez de UPDATE no registro existente |
| Causa | Função salvarHistorico no frontend sempre faz INSERT, nunca UPDATE. Contribui para 37 registros ABANDONADO (41%) |
| Fix | Step 1 "Avançar" = INSERT (status PENDENTE). Steps subsequentes = UPDATE no historico_id existente. Propagar historico_id entre steps |
| Etapa banco | E07 |

### Bug 4: Seletor versões exibe nomes duplicados — P1

| Campo | Detalhe |
|---|---|
| Erro visual | 3 opções idênticas "Instituição Financeira - Cartão de Crédito" |
| Causa | Query exibe `modelos_peticao.nome` (igual ao grupo) em vez de `versao` (int) |
| Fix | Label: `"V${versao} · ${nome} · ${format(created_at, 'dd/MM')}"` |

### Bug 5: ORG_ID hardcoded no skill agente — P1

| Campo | Detalhe |
|---|---|
| Arquivo | `~/jarbas/src/skills/skill_olivia_agente_v2.mjs` (Mac Mini, linha 16) |
| Código | `const ORG_ID = process.env.ORG_ID;` |
| Fix | `const ORG_ID = params.organizacao_id \|\| process.env.ORG_ID;` |

### Bug 6: Petição Smart Blocks com conteúdo errado — P1

| Campo | Detalhe |
|---|---|
| Causa | olivia_modelo_tags sem vinculação correta + olivia_modelo_juris VAZIA + olivia_flow VAZIA |
| Fix | Popular olivia_flow (Gap 4) + importar olivia_modelo_juris (Gap 3) + corrigir seletor versão (Bug 4) |

### Bug 7: Fila mostra "Petição avulsa" — P1

| Campo | Detalhe |
|---|---|
| Causa | Query não faz JOIN com processos ou processo_id NULL |
| Fix | JOIN `processos` ON `olivia_historico.processo_id = processos.id`, exibir `numero_cnj` |

### Bug 8: Modos inconsistentes na Fila — P1

| Campo | Detalhe |
|---|---|
| Erro | Badges mostram "Manual" e "IA Assistida" em vez de nomes corretos |
| Fix | Map: SMART_BLOCKS → "Smart Blocks", EXPRESS → "Express", IA_ASSISTIDA → "Express", JARBAS → "Agente" |

---

## 17. Workflows N8N

| Workflow | ID | Nodes | fetch() | Status |
|---|---|---|---|---|
| final-olivia-express | `MN5kuLDzuIrIpufm` | 16 | 10 nodes | INOPERANTE |
| final-olivia-smartblocks | `hyGajjic2kZBVGvW` | 21 | 5 nodes | INOPERANTE |
| Gerador 2.0 Empresa/Órgão | - | 41 | 0 | LEGADO |
| OLIVIA-ANALISE-V4 | `8ntAvTGMhCfrlfRt` | 50 | 0 | LIMPO |
| WH-OLIVIA-GERAR-DOC-V3 | `dGw50wQ4xjdsjR3n` | 17 | - | ATIVO |
| WH-OLIVIA-TRIAGEM | `AvmF07YPjxXvM2H0` | - | - | ATIVO |
| WH-OLIVIA-RECURSO | `2Yvg36Bzfss7g5KQ` | - | - | STUBS |

### GAS IDs (Google Apps Script)

| GAS | Deployment ID | Status |
|---|---|---|
| GAS Antigo (referência lógica) | `AKfycbyNw1hVq...wVuZIg` | VALIDADO |
| GAS Smart Blocks v4.0 | `AKfycbzoyKbDm...ljCnq` | BUGS |
| GAS Express | `AKfycbzLGb-U5...182kc` | DEPENDE n8n |

---

## 18. Google Apps Script — Estado por Modo

| GAS | Modo | Manter? | Notas |
|---|---|---|---|
| GAS Antigo | Referência | Manter como referência | Lógica de geração validada com milhares de petições reais. Hierarquia correta: tipo_peticao → modelo_grupo → versão → tags → blocos |
| GAS Smart Blocks v4.0 | Smart Blocks | Corrigir | Fluxo: getModelo → substituirBlocos → substituirJuris → substituirPlaceholders → formatarDoc. Bugs na substituição de blocos |
| GAS Express | Express | Manter se n8n corrigido | Comunicação com n8n via fetch (962 linhas). Depende do fix fetch() no n8n |

**Decisão: Replicar como Skills JARBAS?**
D-AUT-03: Smart Blocks + Express replicados como skills JARBAS (se viável). Avaliação pendente após correção dos bugs. Prioridade P2.

---

## 19. RAG & Jurisprudências

### Estado Real

| Métrica | Valor |
|---|---|
| Jurisprudências totais | 1.353 |
| Sem texto_integral | 99% |
| Com texto completo | 15 |
| Assuntos cadastrados | 480 |

### Plano de População texto_integral

1. **Fase 1:** Re-executar `migrar_modelos_rclone.mjs` com permissões Drive corretas (96 arquivos com 403)
2. **Fase 2:** Para jurisprudências sem Google Doc: criar skill JARBAS de scraping dos tribunais (usar `olivia_jurisprudencias_config`)
3. **Fase 3:** RAG Controller plug and play — quando texto_integral estiver populado, análise automaticamente inclui jurimetria

### RAG Controller (futuro — plug and play)

- Separado do RAG jurídico OlivIA
- Foco: taxa de sucesso por juiz, teses que funcionam por comarca
- Interface via `olivia_historico.rag_controller_context` (JSONB) — já pronto
- D-ARQ-12: NÃO implementar agora — apenas deixar arquitetura pronta

---

## 20. Hierarquia Tags & Blocos — Regras Completas

### Estrutura

```
olivia_tipos_peticao (10)                 # Réplica, Apelação, etc.
  └── olivia_modelos_grupo (177)          # Agrupamento por empresa/tipo
       ├── olivia_modelos_peticao (329)   # Versões do modelo (V1, V2, V3)
       │    └── conteudo_template         # Esqueleto HTML da petição
       ├── olivia_modelo_tags (508)       # Quais tags este modelo usa
       │    └── olivia_tags (183)         # Tag = PERGUNTA
       │         ├── secao_id → olivia_tags_secao (3: intro, fund, conclusão)
       │         └── tag_ids[] ← olivia_blocos_texto (1.244)  # Bloco = RESPOSTA
       └── olivia_modelo_juris (0!)       # Vinculação modelo↔jurisprudência
            └── olivia_jurisprudencias (1.353)
                 └── assunto_id → olivia_jurisprudencias_assunto (480)
```

### Regras

- **Tag = Pergunta.** Ex: "BV - E-mail", "Estrutura probatória inicial", "Dano Moral"
- **Bloco = Resposta.** Texto que será inserido na petição quando a tag é selecionada
- Cada bloco tem `tag_ids[]` (array de UUIDs) indicando a quais tags pertence
- Cada bloco tem `categoria_empresa_id` para filtrar por tipo de empresa
- Jurisprudências vinculadas por `assunto_id` + `estado` (priorizar estado do processo)
- Fluxo GAS: modelo_template → para cada tag: buscar bloco selecionado → substituir placeholder da tag pelo conteúdo do bloco → inserir jurisprudências do assunto → substituir placeholders de dados

### 10 Categorias de Empresa

| Nome | ID (parcial) |
|---|---|
| Cessão | `3b1015e1-...` |
| Energia Elétrica | `6c67927b-...` |
| Ensino | `ce8b3247-...` |
| Instituições Financeiras | `1bf519a7-...` |
| Lojas | `7c878456-...` |
| Mercado Livre | `97ef9f16-...` |
| Órgão Restritivo | `9ad0321f-...` |
| Prestação de Serviços | `b7175f17-...` |
| Revendedor Cosméticos | `81ef081e-...` |
| Telefonia e Internet | `b4cbc785-...` |

---

## 21. Ideias Pendentes (19 jana_ideias)

| Título | Prioridade | Status |
|---|---|---|
| P0 — FK violation olivia_historico_modelo_id_fkey | P1 | pendente |
| P0 — Endpoint /olivia/gerar-modo-agente não existe | P1 | pendente |
| P0 — salvarHistorico faz INSERT em vez de UPDATE | P1 | pendente |
| P0 — Modelo sem versão publicada falso positivo | P1 | pendente |
| Reformular Step 3 Modo Agente como editor real | P1 | pendente |
| Criar skill_olivia_agente_v3.mjs | P1 | pendente |
| Criar skill_olivia_relatorio.mjs | P1 | pendente |
| Reorganizar estrutura de abas /olivia | P1 | pendente |
| Recriar Chat OlivIA com modal de início | P1 | pendente |
| Reformular Step 3 Express editor outline | P2 | pendente |
| Sistema de abas tipo Chrome todos os modos | P1 | pendente |
| Criar tabela olivia_agente_contexto | P2 | pendente |
| Criar bucket olivia-reports | P2 | pendente |
| Criar Modo Petição Livre | P2 | pendente |
| Arquitetura RAG Controller plug and play | P2 | pendente |
| Investigar importação backend antigo vs novo | P1 | pendente |
| Fix ORG_ID hardcoded no skill_olivia_agente_v2.mjs | P1 | pendente |
| Criar testes E2E Playwright todos os modos | P2 | pendente |
| Seletor versão: exibir nome + versão + data | P1 | pendente |

---

## 22. Decisões Tomadas (NÃO reabrir)

- Sem VibeLaw por enquanto (D-ARQ-06)
- Sem seletor de playbook no Step 1 (D-FE-09) — IA seleciona automaticamente
- Sem seletor de advogado separado (D-FE-12) — vem do processo
- Modo Express = só n8n + Sonnet 4.6 (D-FE-13) — sem Opus no Express
- Opus fica exclusivo do Modo Agente (D-FE-14)
- Reconstruir do zero (D-ARQ-01) — não patch
- Excluir componentes não usados (D-FE-11) após reconstrução
- Git pull antes de alterar
- API keys hardcoded no n8n por ora (D-AUT-04)
- IA NUNCA inventa fundamentações
- Step 1 unificado para todos os modos (D-ARQ-11)
- RAG Controller plug and play (D-ARQ-12) — não implementar agora
- Spec em formato XML tags (D-ARQ-09)
- Cloud Code executa, JARBAS/JANA orquestra (D-ARQ-10)
- Fila de Geração excluída como aba — conceito migra para dentro do Gerador
- Sem painéis contadores no topo da aba Gerador

---

## 23. Etapas do Projeto — 26 Etapas (SSOT: banco projetos_etapas)

> **APLICADO NO BANCO em 2026-03-18.** 24 etapas originais reorganizadas + 2 novas inseridas = 26 etapas sequenciais. Cada etapa tem cc_prompt com PRD completo e criterio_aceite mensurável.

### FASE 1 — Investigação CC (E01-E04)

| Ordem | Título | Status |
|---|---|---|
| 1 | CC Investigação: Backend + Importação de Dados | CONCLUÍDO |
| 2 | CC Investigação: GAS + Workflows N8N | CONCLUÍDO |
| 3 | CC Revisão Crítica do Plano Mestre | CONCLUÍDO |
| 4 | CC Geração Índice Detalhado SPEC OlivIA | rascunho |

### FASE 2 — Fixes P0 (E05-E10)

| Ordem | Título | P |
|---|---|---|
| 5 | Fix fetch() is not defined no N8N (15 Code nodes) | P1 |
| 6 | Fix FK olivia_historico_modelo_id_fkey | P1 |
| 7 | Fix salvarHistorico INSERT→UPDATE | P1 |
| 8 | Fix ORG_ID hardcoded skill agente v2 | P2 |
| 9 | Fix versões duplicadas Smart Blocks (label seletor) | P2 |
| 10 | Fix query versão publicada (published_at NULL em 329 modelos) | P1 |

### FASE 3 — Migrations & Seeds (E11)

| Ordem | Título | P |
|---|---|---|
| 11 | Migration: categoria_empresa_id + bucket olivia-reports + olivia_agente_contexto + seeds (flow, tipos_prova) | P1 |

### FASE 4 — Reconstrução Frontend (E12-E22)

| Ordem | Título | Deps |
|---|---|---|
| 12 | Step 1 Unificado — SearchBox + Painel + Seletores + Upload | E05-E11 |
| 13 | Smart Blocks Step 2 — Wizard de Tags | E12 + olivia_flow |
| 14 | Smart Blocks Step 3 — Preview + Geração via GAS | E13 |
| 15 | Express Step 2 — Triagem IA (perguntas dinâmicas) | E12 + E05 |
| 16 | Express Step 3 — Editor Outline drag-and-drop | E15 |
| 17 | Express Steps 4-5 — Revisão Rascunho + Conclusão | E16 |
| 18 | Agente Steps 2-3 — Análise IA Profunda + Editor Rascunho | E12 + E06 |
| 19 | Agente Steps 4-6 — Geração + Revisão + Conclusão | E18 |
| 20 | Aba Análise IA — Reconstruir 100% JARBAS/JANA | — |
| 21 | Aba Chat OlivIA — Modal início + Chat contextualizado | — |
| 22 | Aba Gerador — Landing 3 modos + Fila Interna + WizardTabBar | E12 |

### FASE 5 — Cleanup & Extras (E23-E26)

| Ordem | Título | P |
|---|---|---|
| 23 | Cleanup: Remover VibeLaw Studio + Criar gerador.types.ts | P2 |
| 24 | Skill JARBAS: gerador relatório HTML caso | P2 |
| 25 | Petição Livre — frontend próprio | P3 |
| 26 | Testes E2E Playwright — todos os modos OlivIA | P3 |

---

## 24. Prompts CC por Etapa

### FASE 3 — Prompt 1: Fix published_at + query versão

```
Arquivo: src/pages/olivia/ (hooks de versão + componentes de seletor)
Banco: UPDATE olivia_modelos_peticao SET published_at = created_at WHERE ativo = true

Comando: Corrigir query de versão para usar ativo=true em vez de published_at IS NOT NULL.
Corrigir label do seletor: "V${versao} · ${nome} · ${format(created_at, 'dd/MM')}"

Critério de aceite: Seletor mostra versões distintas com V1/V2/V3. Nenhum erro "Modelo sem versão publicada".
```

### FASE 3 — Prompt 2: Fix FK modelo_id

```
Arquivo: src/pages/olivia/ (função que cria olivia_historico)
JARBAS: skill_olivia_agente_v2.mjs (Mac Mini)

Comando: Onde olivia_historico é criado, passar modelo_grupo_id (da versão selecionada via modelos_peticao.modelo_grupo_id)
em vez de modelos_peticao.id no campo modelo_id.

Critério de aceite: INSERT em olivia_historico não falha com FK constraint. Verificar com: SELECT * FROM olivia_historico ORDER BY created_at DESC LIMIT 1;
```

### FASE 3 — Prompt 3: Fix fetch() n8n (15 nodes)

```
Workflows: MN5kuLDzuIrIpufm (Express, 10 nodes) + hyGajjic2kZBVGvW (Smart Blocks, 5 nodes)
Método: Substituir TODAS as chamadas fetch() por $helpers.httpRequest() mantendo a mesma lógica.

Express — 10 nodes: A1-Validate, A3b-GerarIA, B-ProgressStart, B2-BuscarContexto,
  B3-MontarPrompt, B4-ChamarRedator, B5-ParseRedator, B7-Revisor, B8-Salvar, B8.5-CriarDoc, ErrorHandler

Smart Blocks — 5 nodes: A1b-CriarHistorico, B1-BuscarProcesso, B3-BuscarJuris,
  C1-MontarPayloadGAS, E1-SalvarErroGlobal

Critério de aceite: Executar workflow Express com pin data — nenhum ReferenceError: fetch is not defined.
```

---

## 25. Avaliação de Riscos (com dados reais)

| Risco | Impacto | Probabilidade | Dado Real | Mitigação |
|---|---|---|---|---|
| Taxa de sucesso 26% | CRÍTICO | 100% (observado) | 23/90 SUCESSO, 37 ABANDONADO, 28 ERRO | Fixes P0 na Fase 3 devem elevar para >70% |
| RAG 99% vazio | ALTO | 100% (confirmado) | 1.338/1.353 jurisprudências sem texto_integral | Re-import Drive + scraping tribunais (Fase 7) |
| FK quebrada modo Agente | BLOQUEANTE | 100% (confirmado) | modelo_id FK → modelos_grupo. Frontend passa modelos_peticao.id | Fix na Fase 3 |
| fetch() n8n inoperante | BLOQUEANTE | 100% (confirmado) | 15 Code nodes usando fetch() em 2 workflows | $helpers.httpRequest() em Fase 3 |
| published_at NULL em 329 modelos | BLOQUEANTE | 100% (confirmado) | 0/329 modelos com published_at preenchido | UPDATE published_at = created_at em Fase 3 |
| olivia_modelo_juris vazia | ALTO | 100% (confirmado) | 0 vinculações modelo↔jurisprudência | Import backend antigo em Fase 4 |
| olivia_flow vazia | ALTO | 100% (confirmado) | 0 flows de wizard | Popular a partir de modelo_tags em Fase 4 |
| 96 modelos sem conteúdo (Drive 403) | MÉDIO | 100% (confirmado) | 96/329 com erro de permissão Drive | Re-import com rclone token correto |
| JARBAS offline | MÉDIO | Eventual | Mac Mini depende de energia + Tailscale | Express (n8n) como fallback automático |
| Complexidade do frontend (~80 arquivos) | MÉDIO | Alta | 80+ arquivos .tsx/.ts em src/pages/olivia/ | Reconstruir do zero, excluir órfãos |

### Resumo de Viabilidade

**PROJETO VIÁVEL.** 3 bloqueios P0 identificados (FK, fetch, published_at) — todos com fix conhecido e rápido (Fase 3, ~1 dia). Base de dados majoritariamente importada (329 modelos, 183 tags, 1.244 blocos). Lacunas críticas (modelo_juris vazio, texto_integral vazio) não bloqueiam o Smart Blocks nem o fluxo principal. Modo Agente depende de JARBAS endpoint novo (skill_olivia_agente_v3.mjs).

**Estimativa de execução por fase:**
- Fase 1-2: CONCLUÍDO (esta sessão)
- Fase 3: Fixes P0 — crítico, fazer primeiro
- Fase 4: Migrations/seeds — rápido
- Fase 5: Reconstrução frontend — bulk do trabalho
- Fase 6: Abas auxiliares — paralelizável
- Fase 7: Polimento — pode ser incremental

---

> OlivIA v3 — Plano Mestre Definitivo v2.0 | 2026-03-18
> Gerado por JANA (Claude Code Opus 4.6) | MdLab LegalTech | JARBAS Network
> Dados reais: Supabase qdivfairxhdihaqqypgb | 10 áudios transcritos | 12 specs absorvidos | 19 prints analisados
