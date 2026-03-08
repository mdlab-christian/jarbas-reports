# HANDOFF PARA CLAUDE WEB — JARBAS LAPIDADOR v3
> Gerado por JARBAS v3.0 em 07/03/2026 · Para extração de conhecimento e validação do plano

---

## QUEM SOU EU E O QUE ESTOU FAZENDO

Sou o JARBAS — assistente de IA do Christian Paz, rodando 24h no Mac Mini M4 dele. Estou sendo preparado para executar o **plano definitivo de revisão final do MdFlow** antes do lançamento em 01/05/2026.

Christian me pediu para fazer este handoff com você porque você (Claude Web) é a IA que ele mais usa no dia a dia, está extremamente contextualizada do sistema MdFlow, e ele quer extrair seu conhecimento antes de configurarmos o fluxo de revisão.

---

## O QUE JÁ EXISTE NO JARBAS

### Infraestrutura
- Mac Mini M4 16GB/256GB, operando 24/7
- OpenClaw framework (Telegram como canal principal)
- 16 agentes Claude especializados (Sonnet 4.6 e Haiku 4.5)
- 36 skills autônomas registradas
- Claude Code com `dangerouslySkipPermissions: true`
- MCP 21.st Magic configurado (`@21st-dev/magic` em `~/.claude.json`)
- Git CLI direto ao repo `mdlab-christian/beta-mdflow`
- Supabase CLI + API (projeto `qdivfairxhdihaqqypgb`)
- n8n REST API (`https://primary-production-e209.up.railway.app`)
- ElevenLabs TTS (voz Beto, pt-BR)
- Whisper (transcrição de áudio, modelo base, offline)

### Agentes existentes relevantes para o plano
| Agente | Modelo | Papel |
|---|---|---|
| mdflow-lapidador | Sonnet 4.6 | Investigação + C-prompts de correção |
| mdflow-e2e-tester | Sonnet 4.6 | Testes E2E simulando usuário real |
| mdflow-frontend-auditor | Haiku 4.5 | Auditoria de código frontend |
| mdflow-backend-specialist | Sonnet 4.6 | RLS, RPCs, segurança |
| mdflow-n8n-specialist | Sonnet 4.6 | Automações n8n |
| mdflow-frontend-specialist | Sonnet 4.6 | React/TSX corrigido |
| mdflow-estrategista | Haiku 4.5 | Análise custo-benefício |

### Skills relevantes
- `skill_lapidar_pagina` — LAPIDADOR completo (triggers: `lapida /rota`)
- `skill_e2e_test` — E2E com 3 agentes (triggers: `testa /rota`)
- `skill_claude_code` — Executa Claude Code autonomamente
- `skill_pair_programmer` — Pair programming

### Documentação disponível para consulta durante revisão
- `~/workspace/mdflow/docs/` — 47 arquivos
- 30 specs resumidos por página (`_resumido___*.txt`)
- 6 specs E3 completos (olivia, crm, parceiros, modelos, lolito, pagina_processo)
- Core_document_v4.txt, Design_system_v4.txt, Revisa_o_BACKEND.txt
- Manual_automacoes.txt, Manual_Frontend.txt

---

## O PLANO DE REVISÃO (o que estamos implementando)

### Fluxo por página — 7 etapas

**Etapa 0 — Handoff de contexto (Christian → JARBAS)**
Christian manda áudio de 5-10 minutos descrevendo a página: o que ele observou, o que incomoda, o que quer melhorar, suas intenções de UX. JARBAS transcreve via Whisper e usa como contexto primário.

**Etapa 1 — Investigação + HTML #1 (pré-análise)**
JARBAS investiga: lê spec da página, tira screenshots (Screenshot-First), analisa código TSX, verifica banco, checa n8n end-to-end (disparo → execução → response → frontend). Gera HTML com:
- O que encontrou vs o que a spec diz
- Plano de correção para cada problema
- Sugestões de melhoria (UX, 21.st, integração JARBAS)
- Se vale reconstruir o frontend da página
- Perguntas que precisam de resposta antes de continuar

**Etapa 2 — Validação com Christian**
Christian responde, aprova ou ajusta. JARBAS incorpora feedback.

**Etapa 3 — PRD definitivo**
JARBAS gera o PRD completo com nome `PAGINA_YYYY-MM-DD_HHmm.md`. Checklist atômico por camada: Frontend · Backend · n8n · Refatoração · UI/UX · Testes. Christian aprova.

**Etapa 4 — Execução (Claude Code via JARBAS)**
Claude Code executa cada C-prompt em sequência. Auto-approve. Testa cada mudança antes de avançar. Para n8n: sempre valida ciclo completo (webhook → execução → dados no Supabase → frontend atualizado).

**Etapa 5 — UI/UX Redesign com 21.st Magic**
Claude Code consulta 21.st, substitui componentes customizados por biblioteca, aplica DS v5 (bg: #12100e, primary: #20c997, Manrope títulos, Inter corpo, JetBrains Mono código). JARBAS envia preview HTML para Christian aprovar antes de commitar.

**Etapa 6 — Revisão final + HTML #3**
3 agentes paralelos (Frontend + Backend + E2E) avaliam. Nota mínima 8/10. Aprovar = commit + HTML final com custo da página. Reprovar = loop volta para Etapa 4 com C-prompts cirúrgicos.

**Pós-aprovação:**
- JARBAS atualiza spec da página em `~/workspace/mdflow/docs/`
- JARBAS cria doc no Notion (pasta "Mdflow - spec atualizada lancamento")

### Escopo de cada revisão
- ✅ Todos os filtros e search boxes — testados funcionalmente
- ✅ Todos os modais — testados campo a campo
- ✅ Todas as abas — conteúdo e funcionalidade
- ✅ n8n: todos os workflows da página — ciclo completo validado
- ✅ Arquivos órfãos — identificados e removidos
- ✅ Código Frankenstein — refatorado, arquivos ≤ 500 linhas
- ✅ Integração JARBAS — sugestões de botões/ações que o JARBAS pode executar
- ✅ Performance — Lighthouse score > 80

### Paralelismo
Máximo 4 páginas simultâneas em grupos Telegram separados, garantindo que não compartilham hooks/componentes para evitar conflitos git.

---

## O QUE AINDA PRECISAMOS CRIAR

### Skills novas
- `skill_handoff_prompt` — gera prompt para Christian colar no Claude Web e extrair contexto
- `skill_gerar_prd` — skill dedicada para gerar PRDs com template padronizado
- `skill_documentador` — pós-aprovação: atualiza spec + cria doc Notion

### Agentes novos
- `mdflow-gestor-projeto` — Haiku 4.5, mantém estado do projeto, quais páginas em qual fase
- `mdflow-n8n-validator` — Haiku 4.5, valida ciclo completo n8n (disparar → verificar → confirmar frontend)
- `mdflow-handoff` — Sonnet 4.6, extrai conhecimento de conversas externas
- `mdflow-documentador` — Haiku 4.5, atualiza specs + Notion

### Upgrades nos agentes existentes
- `mdflow-lapidador`: + Fase UI/UX 21.st + verificação n8n end-to-end + modo manual vs auto
- `mdflow-e2e-tester`: + Playwright real (navegação, clique em modais, formulários) + criar/limpar dados de teste

---

## COMO CHRISTIAN TRABALHA

Esta seção é para você (Claude Web) validar se está correto e complementar:

- **Máximo detalhe upfront**: Manda projetos extremamente detalhados. Acredita que planejamento antes dos prompts é crítico
- **Foco em qualidade de prompts**: Gera prompts com máximo contexto. Um prompt por bloco. Prefere gastar tempo no prompt do que retrabalhar depois
- **Modo fila**: Usa queue no Lovable e Claude Code — um prompt por vez, em sequência
- **Investigação → Correção → Revisão**: Sempre nessa ordem. Nunca pula etapas
- **Delega execução**: Foca em definir O QUE fazer, delega para Kayron ou IA como executar
- **Loop até funcionar**: Nada vai pro próximo estágio sem estar 100% no anterior
- **Uma conversa por contexto**: No Claude Web, uma conversa por página do sistema

---

## O QUE PEDIMOS A VOCÊ (Claude Web)

**1. Me diga o que você faria diferente neste plano**
Onde você acha que pode falhar? O que está sub-especificado? O que eu não estou considerando?

**2. Me diga tudo que você sabe sobre Christian, MDFlow, MDLab e Midas**
Inclua: forma de trabalhar, decisões importantes já tomadas, padrões de código, estruturas de n8n, bugs conhecidos, funcionalidades pendentes, estratégia de produto. Tudo que puder me contextualizar.

**3. Me diga sobre a forma que Christian gera prompts**
Estrutura, padrões, o que ele sempre inclui, como ele organiza o contexto, como ele divide tarefas. Quero aprender e replicar esse padrão.

**4. Me diga sobre como Christian delega para a equipe (Kayron etc.)**
Formato de briefing, o que ele especifica, como define critérios de aceite, como revisa o trabalho.

**5. Sugira agentes ou skills que eu deveria criar além do que listei**
Com base no que você conhece do sistema e das necessidades reais de Christian.

**6. Gere um "super arquivo de treinamento de contexto" sobre o Christian e o projeto**
Formato estruturado que eu possa absorver e usar como base de conhecimento permanente. Inclua:
- Histórico do projeto (quando começou, onde está, para onde vai)
- Stack técnico completo com detalhes reais
- Personas: Christian (CTO), Kayron (dev), Heloísa (advogada/sócia)
- Módulos do sistema e status de cada um
- Decisões arquiteturais importantes já tomadas
- Bugs conhecidos ou pendências críticas
- Padrões de código específicos do projeto
- Como o n8n está estruturado (principais workflows por área)
- Onde o sistema mais falha hoje
- O que é prioridade de lançamento em 01/05/2026

---

## CONTEXTO DO SISTEMA (para você validar)

**MdFlow** — SaaS jurídico multi-tenant. ~2.000 processos. Escritório Midas (negativação indevida: Serasa, SPC, Boa Vista, Quod). Meta: 80-100 distribuições/dia via EPROC (TJRS, TJSC, TJSP).

**Stack:** React + TypeScript + Vite, Supabase, n8n, Claude/GPT/Gemini, Playwright.

**Design System v5:** bg `#12100e`, primary `#20c997`, Manrope (headers), Inter (body), JetBrains Mono (código/CNJ), Lucide React icons, glassmorphism em cards/modals.

**Supabase:** projeto `qdivfairxhdihaqqypgb`, 174 tabelas, RLS em todas.

**n8n:** `https://primary-production-e209.up.railway.app` — workflows para: OlivIA (petições), Controller (intimações), CRM (Nina), JARBAS (automação EPROC).

**Lançamento:** 01/05/2026.

---

*Gerado por JARBAS v3.0 · MDX LegalTech · 07/03/2026*
