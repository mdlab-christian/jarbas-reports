# OlivIA — Novo Modo Agente: Contexto Completo + Plano
> Gerado por JANA 🦊 | MacBook Air M4 | 2026-03-17
> Para inicializar nova conversa de idealização e implementação

---

## 1. O Que É o Modo Agente (visão de produto)

O **Modo Agente** é o modo de geração de petições **mais poderoso** da OlivIA.

- **Não depende de n8n** — tudo roda como skill Node.js diretamente na JANA ou JARBAS
- **Motor de IA:** Claude direto (SDK Anthropic) — sem intermediário
- **Diferencial:** contexto jurídico rico, anti-fingerprint, revisor integrado, análise inline de provas
- **Output:** DOCX + PDF + HTML + Google Doc (via GAS)
- **Performance atual:** 43/43 SUCESSO, zero falhas em produção

**Objetivo desta refatoração:**
Reconstruir o wizard do Modo Agente do zero, elevando UX + capacidade técnica, unificando o que funciona no Express com o motor do Agente.

---

## 2. Estado Atual do Modo Agente

### Frontend
- **Arquivo:** `~/beta-mdflow/src/pages/olivia/components/gerador/OliviaGeradorJarbas.tsx` (551 linhas)
- **Steps atuais:** 3 steps (Identificação → Briefing → Conclusão)
- **Limitações:** wizard simples, sem análise de provas integrada visualmente, sem triagem rica, sem progress granular

### Backend (Skill)
- **Arquivo:** `~/jarbas/src/skills/skill_olivia_gerar_peticao.mjs` (1825 linhas!) no JARBAS (Mac Mini)
- **Motor principal:** `claude --agent olivia-juridico` (Claude Code agent) com fallback SDK streaming
- **Revisor:** loop automático — score < 9.0 → regenera (max 2x)
- **Anti-fingerprint:** seed baseado no CNJ → 4 camadas de variação (conectivos, tratamentos, abertura de fatos)
- **Análise de provas inline (GAP-05):** baixa PDFs do Supabase Storage → extrai base64 → mini-análise Sonnet → injecta no prompt
- **Tipos de documento detectados:** peticao_inicial, replica, apelacao, alegacoes_finais, cumprimento, manifestacao
- **RAG:** busca exemplos aprovados do histórico (score ≥ 8.0 + feedback "aprovei")
- **Style guide:** carregado do banco (jarbas_style_guide)
- **System prompt:** carregado do banco (ai_agents_config.agent_key = 'olivia_peticao')
- **Playbooks:** carrega por tipo de réu (bureau, bancário, FIDC, telecom, energia, varejo)
- **Google Doc:** via GAS após geração
- **DOCX:** via endpoint /olivia/docx-converter

### Hooks relevantes (frontend)
- `useOliviaJarbas` — estado da geração, polling de progresso
- `useWizardTabs` — estado central do wizard
- `buildProcessoContext` — monta contexto rico do processo

---

## 3. Como Funciona o Modo Express (referência para o novo Agente)

O Express é o motor via **n8n** (workflow `prod-olivia-express`, ID: `8yeCpY5EaEP5XQ9e`).

### Wizard Express (5 steps)
1. **Step 1 — Identificação:** processo + tipo de petição + modelo_grupo + versão + advogado
2. **Step 2 — Triagem:** perguntas geradas pela IA com pré-fill automático (confiança ≥ 0.7); layout 2 colunas com preview da petição base
3. **Step 3 — Revisão:** editor rico + MicrophoneButton em instrucoes_finais; autosave 30s
4. **Step 4 — Geração:** callWebhook → polling olivia_historico → ProgressSubsteps visual
5. **Step 5 — Conclusão:** score, modelo, tokens, custo, tempo + RelatorioCasoAccordion (fortes/fracos/riscos/chance de sucesso)

### Pipeline Express via n8n
```
B1-Validate → B-Respond202 (async)
B2-BuscarContexto → busca processo + triagem + modelos + blocos_resolvidos do Supabase
B3-MontarPrompt → monta prompt completo com peticao_base + regra juris + relatorio
B4-ChamarRedator → Claude (prompt caching, anthropic-beta: prompt-caching-2024-07-31)
B5-ParseRedator → parse JSON: blocos[], relatorio_processo, titulo_peticao
B6-IF Skip → pula revisor se score alto
B7-Revisor → Claude revisa, retorna score + criticas + partes_reescrever
B8-Salvar → PATCH olivia_historico com peticao_html + score + meta.relatorio_processo
B9-AppsScript → POST GAS para criar Google Doc (com redirect 302 handling)
B10-UpdateGoogleDocUrl → PATCH historico com google_doc_url
```

### Análise de Provas (workflow `OLIVIA-ANALISE-V4`, ID: `8ntAvTGMhCfrlfRt`)
- Disparada antes do Step 2 quando modelo_tem_tags=true
- Triple fallback: PDF nativo → Gemini 2.0 Flash Vision → Mistral OCR Latest
- RAG: OpenAI embeddings + fn_rag_search (busca vetorial no banco)
- Modelo final: Claude Opus 4-6
- Retorna: analise_tags[], peticao_base.blocos_resolvidos[]
- **Bug P0 conhecido:** dados de restrição (restricao_orgao_nome, restricao_valor) não injetados no prompt

### O que funciona bem no Express
- Triagem inteligente com pré-fill por confiança — reduce fricção
- Layout 2 colunas no Step 2 (preview + perguntas)
- MicrophoneButton em campos de instrução
- processo_context rico (30+ campos) enviado ao Claude
- RelatorioCasoAccordion na conclusão
- Prompt caching (reduz custo ~80% em re-gerações)
- relatorio_processo (visão geral + fortes/fracos + riscos + chance de sucesso)

---

## 4. Diferenças Arquiteturais: Express vs Agente

| Aspecto | Express (n8n) | Agente (skill) |
|---|---|---|
| Motor de orquestração | n8n Railway | Skill Node.js direta |
| Motor de IA | Claude Sonnet (Redator) + Sonnet (Revisor) | Claude Code Agent + fallback SDK |
| Análise de provas | Workflow separado (ANALISE-V4) | Inline na skill (GAP-05) |
| Anti-fingerprint | Não | Sim (seed CNJ, 4 camadas) |
| Loop revisor | 1 revisão (B6-IF Skip se score alto) | Loop até score ≥ 9.0 (max 2x) |
| Progresso em tempo real | Polling olivia_historico (3s) | Polling jarbas_tarefas.meta |
| GAS para Google Doc | Sim (B9-AppsScript) | Sim (mesma lógica) |
| Execução | Async (202 + polling) | Async (tarefas + polling) |
| Onde roda | Railway (n8n cloud) | Mac Mini / MacBook Air M4 |

---

## 5. Proposta: Novo Modo Agente (v2.0)

### Visão
Unificar o **melhor do Express** (UX rica, triagem inteligente, análise de provas) com o **motor do Agente** (skill direta, anti-fingerprint, loop revisor).

**Executor:** JANA (MacBook Air M4) como primário — JARBAS (Mac Mini) como fallback.
**Motivo JANA primeiro:** JARBAS está caindo com frequência; JANA está mais estável.

### Wizard novo (proposto — 4 steps)

```
Step 1 — Identificação (igual ao Express)
  ├── Seleção de processo (busca CNJ ou nome do cliente)
  ├── Tipo de petição + grupo de modelos + versão
  ├── Advogado responsável
  └── Se modelo_tem_tags → disparar análise inline (não workflow separado)

Step 2 — Análise & Triagem (NOVO — fusão do Express Step 2 + análise de provas)
  ├── Upload de documentos (PDFs — max 50 arquivos / 100MB cada)
  ├── Progresso da análise inline (JANA/JARBAS analisando diretamente)
  ├── Triagem inteligente com pré-fill (confiança ≥ 0.7)
  ├── Layout 2 colunas: preview petição base ← → perguntas restantes
  ├── MicrophoneButton em perguntas texto + instrucoes_adicionais
  └── Instruções livres do advogado

Step 3 — Revisão Opcional (igual ao Express Step 3)
  ├── Editor rico da petição base (se houver)
  ├── Instrucoes_finais com MicrophoneButton
  └── Autosave 30s

Step 4 — Geração + Conclusão (UNIFICADO — sem step separado de espera)
  ├── Botão "Gerar com IA"
  ├── Progress em tempo real (SSE ou polling granular):
  │    10% → Iniciando
  │    30% → Montando contexto
  │    60% → Redigindo petição (Claude)
  │    85% → Revisando (score loop)
  │    95% → Gerando Google Doc
  │   100% → Concluído
  ├── Resultado: Google Doc link + DOCX download + score
  └── RelatorioCasoAccordion (fortes/fracos/riscos/chance de sucesso)
```

### Skill nova: `skill_olivia_agente_v2.mjs`

Manter a base da skill atual mas adicionar:

1. **Análise de provas melhorada:**
   - Usar Vision nativa (Claude vision) em vez de só base64 truncado
   - Gemini Vision como fallback para PDFs muito grandes
   - Retornar analise_tags[] estruturadas (não só texto)

2. **Triagem integrada:**
   - A skill gera as perguntas de triagem (não depender de n8n WH-OLIVIA-TRIAGEM)
   - Retorna perguntas com confiança baseadas no contexto do processo

3. **Prompt caching:**
   - Usar `cache_control: { type: 'ephemeral' }` como o Express faz no B4-ChamarRedator
   - Reduz custo significativamente em re-gerações

4. **relatorio_processo no output:**
   - Salvar fortes/fracos/riscos/chance_sucesso no meta.relatorio_processo do olivia_historico (como Express)

5. **SSE streaming real-time:**
   - Em vez de polling, usar Server-Sent Events do endpoint JARBAS/JANA
   - Frontend recebe updates token a token (ou por etapa)

6. **Execução em JANA:**
   - Novo endpoint em JANA: `POST /olivia/gerar-agente` (porta 18789)
   - JARBAS como fallback se JANA estiver sobrecarregada

### Frontend: `OliviaGeradorAgente.tsx` (novo arquivo)

Reconstruir do zero:
- Herdar `WizardStepper` e `StepIdentificacao` (reutilizar do Express)
- Novo `StepAnaliseTriagem` — fusão de análise + triagem
- Novo `StepGeracaoAgente` — progress SSE + resultado integrado
- Remover `OliviaGeradorJarbas.tsx` legado após migração

---

## 6. Banco de Dados — Tabelas Relevantes

| Tabela | Uso |
|---|---|
| `olivia_historico` | Registro de cada geração (status, score, google_doc_url, meta JSONB) |
| `olivia_modelos_peticao` | 329 modelos com google_doc_id + instrucoes_ia |
| `olivia_modelos_grupo` | 177 grupos de modelos |
| `olivia_tipos_peticao` | 10 tipos (negativação, réplica, apelação...) |
| `olivia_blocos_texto` | 1244 blocos para Smart Blocks e triagem |
| `olivia_jurisprudencias` | 1353 jurisprudências |
| `olivia_analises` | Resultados da análise de provas |
| `olivia_playbooks` | 8 playbooks (Geral, Prescrita + 6 por empresa) |
| `processos` | Dados do processo: numero_cnj, reu_nome, objeto, ia_resumo, chance_sucesso_ia, restricao_* |
| `rag_documents` | 2903 docs indexados (embeddings) |
| `jarbas_tarefas` | Fila de tarefas JARBAS/JANA — progresso via meta JSONB |
| `ai_agents_config` | System prompts configuráveis por agent_key |
| `jarbas_style_guide` | Style guide do escritório por organização |

**IDs de referência:**
- Org MP Advocacia: `55a0c7ba-1a23-4ae1-b69b-a13811324735`
- Supabase: `qdivfairxhdihaqqypgb`
- GAS v4.0: `AKfycbzoyKbDmSdDH2BBrbZLoUHY05lInLCec5ERn_Ec4jxB_DHSCsgz0g6E--aZz0AljCnq`
- JANA endpoint: `https://jana.jarbas-mdlab.com` (ou porta 18789)
- JARBAS endpoint: `https://jarbas.jarbas-mdlab.com`
- n8n: `https://primary-production-e209.up.railway.app`

---

## 7. Considerações JANA sobre o Plano

### O que manter da skill atual
- `fetchContexto()` — excelente, busca tudo: processo + cliente + empresa + advogado + modelo + docs + movimentações + playbook + style guide + agentConfig
- `getVariacaoLayer()` — anti-fingerprint funcional, vale manter
- `detectarTipoDocumento()` — mapeamento tipo_peticao_id → tipo interno, confiável
- `TESES_REU` — base de conhecimento jurídico por tipo de réu, muito valiosa
- `buildPromptReplica()` / `buildPromptApelacao()` — prompts especializados
- `revisarPeticao()` — revisor com critérios estruturados, mantém qualidade

### O que melhorar
1. **Análise de provas:** o GAP-05 atual é limitado (trunca base64 em 4000 chars). Usar Claude Vision nativamente (imagens inline na mensagem) para PDFs escaneados
2. **Triagem:** não existe na skill atual — frontend chama o n8n WH-OLIVIA-TRIAGEM separado. Integrar na skill para eliminar dependência de n8n
3. **Progresso granular:** `updateProgresso()` existe mas é só 4 checkpoints. Expandir para 8-10 etapas
4. **SSE:** skill atual não faz streaming. Novo endpoint JANA com SSE permitiria progress token a token
5. **relatorio_processo:** o Express parseia `fortes/fracos/riscos/chance_sucesso` do output do Claude e salva no meta. Skill atual não faz isso — adicionar
6. **Prompt caching:** Express usa `cache_control: ephemeral` no system prompt → economy em re-gerações. Skill atual não usa — adicionar
7. **Análise estruturada de restrições:** skill busca a empresa mas não injeta `restricao_orgao_nome/valor/contrato` do processo no prompt. Adicionar esses campos

### Riscos a considerar
- Skill de 1825 linhas no JARBAS — refatorar vai requerer testes extensivos
- JARBAS caindo com frequência → JANA como primário é a decisão certa
- Timeout de 300s no execSync (Claude Code agent) pode ser problema em produção
- Imagens inline no Claude Vision têm limite de 20MB por imagem — PDFs jurídicos grandes precisam de paginação

### Sugestão de abordagem
1. **Criar nova skill** `skill_olivia_agente_v2.mjs` na JANA (não modificar a atual do JARBAS)
2. **Novo endpoint** na JANA: `POST /olivia/gerar-agente`
3. **Frontend** novo `OliviaGeradorAgente.tsx` com wizard 4 steps
4. **Testar em paralelo** com o Modo Agente legado (não substituir até validar)
5. **Após validação:** deprecar `OliviaGeradorJarbas.tsx` e `skill_olivia_gerar_peticao.mjs`

---

## 8. Arquivos de Referência

| Arquivo | Caminho | Descrição |
|---|---|---|
| Skill atual | `~/jarbas/src/skills/skill_olivia_gerar_peticao.mjs` (Mac Mini) | 1825 linhas — motor completo |
| Frontend legado | `~/beta-mdflow/src/pages/olivia/components/gerador/OliviaGeradorJarbas.tsx` | 551 linhas — wizard 3 steps |
| Hook JARBAS | `~/beta-mdflow/src/hooks/olivia/useOliviaJarbas.ts` | Estado da geração |
| Workflow Express | n8n ID: `8yeCpY5EaEP5XQ9e` | 16 nós, referência de arquitetura |
| Workflow Análise | n8n ID: `8ntAvTGMhCfrlfRt` | 48 nós, análise de provas |
| Master Review | https://mdlab-christian.github.io/jarbas-reports/jana/olivia/olivia-master-review-2026-03-17.html | Estado completo da OlivIA |
| Reporter Express | https://mdlab-christian.github.io/jarbas-reports/jana/olivia/reporter-modo-express.html | Detalhes do Express |
| Reporter Frontend | https://mdlab-christian.github.io/jarbas-reports/jana/olivia/reporter-frontend-olivia.html | Estado do frontend |

---

## 9. Próximas Etapas (para a nova conversa executar)

### Fase 1 — Idealização (sem código)
1. Revisar os arquivos de referência listados acima
2. Estudar os workflows n8n (IDs: 8yeCpY5EaEP5XQ9e e 8ntAvTGMhCfrlfRt) via API n8n
3. Ler a skill completa do JARBAS
4. Propor spec detalhada do wizard 4 steps
5. Propor arquitetura da skill v2.0

### Fase 2 — Implementação Frontend
1. Criar `OliviaGeradorAgente.tsx` (wizard 4 steps)
2. Criar `StepAnaliseTriagem.tsx` (novo)
3. Criar `StepGeracaoAgente.tsx` (novo — SSE progress)
4. Criar `useOliviaAgente.ts` (hook)

### Fase 3 — Implementação Backend
1. Criar `skill_olivia_agente_v2.mjs` na JANA
2. Adicionar endpoint `/olivia/gerar-agente` no start.mjs da JANA
3. Implementar SSE streaming
4. Integrar triagem na skill
5. Melhorar análise de provas (Vision nativo)

### Fase 4 — Testes E2E
1. Teste com processo real (org MP Advocacia)
2. Validar DOCX + Google Doc + score
3. Validar progresso em tempo real
4. Deprecar legado após validação

---

*Gerado por JANA 🦊 | MacBook Air M4 | JARBAS Network | MdLab LegalTech | 2026-03-17*
