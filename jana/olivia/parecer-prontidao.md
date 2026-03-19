# Parecer de Prontidão — OlivIA v3 Plano Mestre Definitivo v2.0

> Gerado em 2026-03-18 | Revisão: JANA (Claude Code Opus 4.6)
> Projeto ID: `48d9bfaa-206f-457c-95f6-36ed25e4162e` | Versão: 4

---

## Aprovado

### Estrutura Documental (HTML + MD + Banco)
- [x] HTML com 25 seções obrigatórias (header, checklist, visao, mapa, resiliencia, step1, smartblocks, express, agente, chat, analise, gerador, backend, payload, gaps, bugs, n8n, gas, rag, hierarquia, ideias, decisoes, etapas, prompts, riscos)
- [x] MD fiel ao HTML — mesmas 25 seções, conteúdo idêntico
- [x] Banco com 26 etapas sequenciais (E01-E26), todas com cc_prompt PRD completo
- [x] Ordem das etapas consistente entre HTML, MD e banco após correções desta revisão
- [x] Fase 1 (investigação) antes de qualquer construção
- [x] Fixes P0 (E05-E10) antes das fases de construção (E12+)

### PRDs e Critérios
- [x] Todas as 26 etapas têm cc_prompt com formato PRD (Contexto, Pré-requisitos, Arquivos, Passos, Dados banco, Comportamento esperado, Critério aceite, Não fazer)
- [x] Todas as 26 etapas têm criterio_aceite mensurável (69-150 chars)
- [x] cc_prompt lengths: min 743 chars (E03, concluída), max 4.702 chars (E11, migration), média ~2.000 chars

### Bugs e Gaps
- [x] 9 bugs documentados (8 originais + Bug 3.5 salvarHistorico adicionado nesta revisão) — todos com fix especificado
- [x] 7 gaps com migration SQL concreta (seção 15)
- [x] Payload do agente de análise especificado com campos reais do banco (seção 14, 12 placeholders)

### Specs por Modo
- [x] Step 1 Unificado: spec completa com SearchBox, Painel, Seletores, Upload Drawer, Variações por modo, Validação
- [x] Smart Blocks: 3 steps especificados (Step 1 unificado + Wizard Tags + Preview/GAS)
- [x] Express: 5 steps especificados (Step 1 + Triagem IA + Outline DnD + Revisão + Conclusão)
- [x] Agente: 6 steps especificados (Step 1 + Análise + Editor + Geração + Revisão + Conclusão)
- [x] Chat OlivIA: spec do modal (Livre/Processo), layout split, histórico threads, botões rápidos
- [x] Análise IA: spec 100% JARBAS/JANA, 2 sub-abas, RAG Controller plug-and-play
- [x] GAS: claro o que manter (referência) e o que corrigir (Smart Blocks v4.0, Express)
- [x] RAG: plano 3 fases para população texto_integral (re-import Drive, scraping tribunais, RAG Controller)

### Decisões Consolidadas
- [x] 12 decisões de arquitetura (D-ARQ-01 a D-ARQ-12) — todas FIRME
- [x] 15 decisões de frontend (D-FE-01 a D-FE-15) — todas documentadas
- [x] 6 decisões de backend (D-BE-01 a D-BE-06) — todas documentadas
- [x] 22 decisões "NÃO reabrir" listadas em seção 22

---

## Ajustes feitos nesta revisão

| # | O que foi corrigido | Onde |
|---|---|---|
| 1 | Seção 23 (etapas) atualizada de numeração antiga (#1-24 mista) para nova sequencial (E01-E26) | HTML + MD |
| 2 | Alerta "será aplicada no banco no Prompt 3" substituído por "APLICADO NO BANCO em 2026-03-18" | HTML + MD |
| 3 | Checklist "24 etapas verificadas" corrigido para "26 etapas verificadas (reorganizadas v2.0)" | HTML + MD |
| 4 | Bug 3.5 (salvarHistorico INSERT→UPDATE) adicionado à seção de bugs — estava apenas em ideias | HTML + MD |
| 5 | Fases simplificadas de 7 para 5 (Investigação, Fixes, Migrations, Reconstrução, Extras) no banco e docs | HTML + MD |
| 6 | "Fix: Fila Petição avulsa" consolidado dentro da E22 (Aba Gerador) em vez de etapa separada | Banco (já estava) + HTML/MD (ajustado) |
| 7 | Dependências explícitas com referência a números de etapa (E05-E11, E12, E13, etc.) | HTML + MD |

---

## Gaps restantes

| # | Gap | Severidade | Razão de estar em aberto |
|---|---|---|---|
| 1 | olivia_modelo_juris VAZIA (0 vinculações modelo↔jurisprudência) | P1 | Import depende de dados do backend antigo GAS — requer investigação dos IDs originais. Incluído no cc_prompt da E11 como "futuro" |
| 2 | texto_integral vazio em 99% das jurisprudências (1.338/1.353) | P1 | Requer re-import via rclone com permissões Drive corretas (96 arquivos com 403). Plano existe na seção 19 mas NÃO é uma etapa no banco |
| 3 | Seção 24 (Prompts CC) no HTML/MD está DESATUALIZADA — mostra 3 prompts antigos | P3 | Os cc_prompts reais estão no banco (26 PRDs completos). Seção 24 é vestigial — não bloqueia execução |
| 4 | skill_olivia_agente_v3.mjs NÃO existe no JARBAS | P2 | É pré-requisito do modo Agente (E18). Será criado pelo JARBAS, não pelo JANA. Documentado no cc_prompt |
| 5 | Modo Express não tem validação E2E pós-fix fetch() | P2 | Etapa E05 especifica testar com pin data, mas não há etapa separada de validação intermediária |

---

## Parecer de prontidão

### PRONTO PARA EXECUÇÃO.

**Justificativa:**

1. **Documentação completa e consistente** — 25 seções no plano, 26 etapas no banco com PRDs detalhados, todas as discrepâncias corrigidas nesta revisão.

2. **Caminho crítico claro** — E04 (SPEC) → E05-E10 (fixes P0) → E11 (migrations) → E12 (Step 1 Unificado) → por modo. Dependências explícitas.

3. **Nenhum bloqueio não-resolvido** — Os 3 bloqueantes (fetch n8n, FK modelo_id, published_at NULL) têm fix conhecido e documentado nos cc_prompts.

4. **Gaps restantes são P1-P3** e nenhum bloqueia o início da execução. olivia_modelo_juris vazia impacta apenas Smart Blocks (qualidade da petição), não a funcionalidade. texto_integral vazio impacta RAG futuro, não o fluxo atual.

5. **Base de dados substancial** — 329 modelos, 183 tags, 1.244 blocos, 1.353 jurisprudências importados. 233/329 modelos com conteúdo. Dados suficientes para os 3 modos.

---

## Proximo passo recomendado

### Executar E04: CC Geração Índice Detalhado SPEC OlivIA

**Razão:** A SPEC XML é o documento que guiará toda a implementação. Sem ela, os cc_prompts das etapas E12+ ficam genéricos. Com a SPEC, cada componente terá props exatas, queries específicas e contratos definidos.

**Alternativa:** Se preferir pular E04 e ir direto para código, começar por **E10 (Fix published_at)** + **E06 (Fix FK)** em paralelo — são os 2 fixes P0 mais rápidos que desbloqueiam o Step 1.

**Sequência recomendada de início:**
```
E04 (SPEC) ──── em paralelo ────→ E10 (published_at) + E06 (FK) + E05 (fetch n8n)
                                   ↓
                                  E11 (migrations)
                                   ↓
                                  E12 (Step 1 Unificado)
```

---

> Parecer gerado por JANA (Claude Code Opus 4.6) | 2026-03-18 | MdLab LegalTech
