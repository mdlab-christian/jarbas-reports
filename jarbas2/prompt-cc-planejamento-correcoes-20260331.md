# Missão: Planejamento das Correções — Cecília v2

> Para: Claude Code | De: Jarbas 2.0 🐙 + Christian | 2026-03-31
> **⚠️ MODO ESTRITO: SÓ PLANEJAMENTO — não alterar nenhum arquivo .mjs, .ts, .tsx, .sql ou config**
> **Você deve APENAS ler, analisar e escrever no HTML de saída. Zero execução de código.**

---

## Contexto do Projeto

**Cecília v2** é um sistema Node.js autônomo no Mac Mini que monitora ~5.800 processos judiciais no EPROC (TJRS, TJSC, TJSP) para o escritório MP Advocacia. O pipeline:

1. Login EPROC por OAB (5 OABs: RS116571, RS131163, SC074025, SC075466, SP535101)
2. Gera XLS de movimentações recentes
3. Filtra processos com eventos novos desde `cecilia_ultima_analise_em`
4. Acessa cada processo no EPROC, extrai eventos e documentos
5. Classifica com Haiku 4.5 (triagem A-G) + Sonnet 4.6 (decisões D/E/F)
6. Persiste em tabela `intimacoes` no Supabase
7. Controller MdFlow (`/controller`) mostra para o João Victor tratar

**Runtime:** `/Users/cecilia/cecilia-skills/src/start.mjs` (Mac Mini, usuário `cecilia`, LaunchAgent `ai.cecilia.skills`)

---

## O Que Aconteceu

Rodamos o primeiro teste E2E real. Resultado: sistema acessa processos, lê documentos, chama IA, persiste no banco. Funciona na essência, mas com qualidade inaceitável. De 158 intimações geradas:

- **85/158 (54%)** são Classe A — não deveriam estar no banco
- **51/158 (32%)** são fallback D por falha de parsing JSON do Haiku
- **44/158 (28%)** sem processo_id (órfãs)
- **137 erros** no Playwright (race conditions)
- **SC074025 (TJSC)** não gerou XLS — seletor CSS errado (botão existe, código não acha)

---

## Arquivos para Você Ler (todos no Mac Mini)

```
/Users/cecilia/cecilia-skills/src/skills/skill_processar_planilha.mjs   ← XLS + filtros
/Users/cecilia/cecilia-skills/src/skills/skill_orquestrador.mjs          ← loop principal
/Users/cecilia/cecilia-skills/src/skills/skill_analisar_ia.mjs           ← Haiku + Sonnet
/Users/cecilia/cecilia-skills/src/skills/skill_acessar_processo.mjs      ← Playwright
/Users/cecilia/cecilia-skills/src/skills/skill_gerar_planilha.mjs        ← gera XLS EPROC
/Users/cecilia/cecilia-skills/src/lib/eproc-utils.mjs                    ← RUIDO_PATTERNS, pré-class
/Users/cecilia/cecilia-skills/src/lib/supabase.mjs                       ← cliente Supabase
```

---

## Análises de Referência (ler antes de planejar)

Leia os dois HTMLs abaixo para entender o diagnóstico completo antes de montar o plano:

```
https://mdlab-christian.github.io/jarbas-reports/jarbas2/cecilia-v2-relatorio-e2e-20260331.html
```
*(seu próprio relatório E2E — já atualizado com análise do Jarbas)*

```
https://mdlab-christian.github.io/jarbas-reports/jarbas2/cecilia-v2-plano-execucao-20260331.html
```
*(plano de execução do Jarbas — métricas reais, 8 pendências detalhadas com pseudocódigo)*

---

## As 8 Correções a Planejar

Para cada correção abaixo, você deve:
1. **Ler o arquivo real** no Mac Mini
2. **Identificar exatamente** onde está o bug (linha, função, lógica)
3. **Escrever o plano** com: arquivo, função afetada, mudança proposta, pseudocódigo se necessário, riscos

### Correção 1 — Validação de evento no XLS
**Arquivo:** `skill_processar_planilha.mjs`
**Problema:** `ultimoEvento` às vezes captura assunto do processo ("Indenização por dano moral, DIREITO CIVIL") ou JavaScript da página, em vez do evento processual.
**O que fazer:** 
- Logar `rows[0]` (header) e `rows[startIdx]` (primeira linha de dados) para cada tribunal no início
- Adicionar validação: evento com JS (`function`, `window.`, `if (`), nome de juiz, ou padrão de assunto → skip com log
- Identificar se o `col.evento` está mapeando o índice certo para cada tribunal

### Correção 2 — parseJsonArray frágil contamina batch inteiro
**Arquivo:** `skill_analisar_ia.mjs`
**Problema:** Quando Haiku retorna JSON inválido (texto extra, markdown, etc.), `parseJsonArray()` retorna `[]` e TODOS os processos do batch recebem fallback `{classe:'D', confianca:0.3}`. Um erro contamina N processos.
**O que fazer:**
- Localizar a função `parseJsonArray()` (ou equivalente) e entender como ela falha
- Planejar `parseJsonArrayRobusto()` com 3 tentativas: parse direto → extrair `[...]` do texto → extrair objetos `{...}` individuais
- Quando batch falha parcialmente (< 50% classificados) → planejar retry individual em vez de fallback em massa
- Fallback final deve ser `skip` (não inserir), não `classe:'D'`

### Correção 3 — Classe A sendo inserida no banco
**Arquivo:** `skill_orquestrador.mjs`
**Problema:** O orquestrador persiste TODAS as classificações, incluindo A. Classe A = irrelevante = não deve existir no banco.
**O que fazer:**
- Localizar onde `persistirIntimacao()` é chamada no loop
- Planejar filtro `if (resultado.classe === 'A') continue` antes da persistência
- Garantir que `cecilia_ultima_analise_em` é atualizado mesmo para processos descartados (para não reprocessar)
- Decidir se Classe B também deve ser filtrada (João decide no controller)

### Correção 4 — RUIDO_PATTERNS incompleto
**Arquivo:** `eproc-utils.mjs`
**Problema:** Padrões faltantes. "Conclusos para decisão/despacho" (13 registros), "Publicado no DJEN", "Disponibilizado no DJEN", "Audiência cancelada" passando pelo filtro.
**O que fazer:**
- Ler o array `RUIDO_PATTERNS` atual
- Listar todos os padrões faltantes que aparecem nos dados reais do banco
- Propor o array expandido completo
- Verificar se os PRE_CLASS_A patterns também cobrem os mesmos casos

### Correção 5 — TJSC seletor CSS errado para "Gerar Planilha"
**Arquivo:** `skill_gerar_planilha.mjs` + `eproc-utils.mjs`
**Problema:** O botão "Gerar Planilha" existe no TJSC (Christian confirmou), mas o seletor CSS usado é específico do TJRS e não encontra no TJSC. Resultado: SC074025 falha sem processar nada.
**O que fazer:**
- Ler como o `skill_gerar_planilha.mjs` localiza e clica no botão hoje
- Ler o `TRIBUNAL_CONFIG` em `eproc-utils.mjs`
- Planejar `TRIBUNAL_SELECTORS` com seletores CSS específicos por tribunal (TJRS, TJSC, TJSP)
- Planejar fallback: se seletor CSS falhar → tentar `page.getByText('Gerar')` → screenshot de debug antes de lançar erro

### Correção 6 — Race conditions no Playwright
**Arquivo:** `skill_acessar_processo.mjs`
**Problema:** 104x "Target page closed" + 33x "Execution context destroyed". Sem `page.isClosed()` check e sem `waitForLoadState('networkidle')` antes de `page.evaluate()`.
**O que fazer:**
- Ler todas as chamadas `page.evaluate()` no arquivo
- Planejar wrapper `safeEvaluate(page, fn, args, retries=2)` com:
  - `page.isClosed()` check antes
  - `waitForLoadState('domcontentloaded')` antes de evaluate
  - try/catch com retry (800ms backoff)
- Planejar reciclagem de browser a cada 50 processos
- Planejar `resolvido=true` no `cecilia_erros` quando retry funciona

### Correção 7 — Lookup de CNJ sem diagnóstico
**Arquivo:** `skill_orquestrador.mjs`
**Problema:** 44 intimações sem `processo_id`. Quando CNJ não é encontrado no MdFlow, falha silenciosamente sem log.
**O que fazer:**
- Localizar `batchLookupProcessoIds()` e onde o resultado é usado
- Planejar log explícito dos CNJs não encontrados (primeiros 5 para não poluir o log)
- Planejar normalização de CNJ: remover espaços, garantir formato `\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4}`
- **Não criar stub de processo** — só logar para investigação posterior

### Correção 8 — Controller Frontend
**Arquivo:** `ControllerV3Intimacoes.tsx` + `ControllerV3FilterBar.tsx`  
*(em `/Users/jarbas/beta-mdflow/src/pages/controller/`)*
**Problema:** Mesmo com fixes backend, Classe A pode aparecer se passar pelos filtros. Sem toggle "Excluir ruído". Sem indicador visual de confiança baixa.
**O que fazer:**
- Ler como o controller busca e filtra as intimações hoje
- Planejar filtro hard `classe_cecilia !== 'A'` no fetch ou na query
- Planejar toggle "Excluir ruído/concluso" default ON
- Planejar badge visual para confiança < 0.60 ("revisar")
- Planejar que só intimações com `ia_status='concluido'` aparecem

---

## Escopo Fora desta Missão (não planejar)

- ❌ Roteamento automático de atividades (tabela `cecilia_equipe`)
- ❌ Criação automática de tarefas em `atividades`
- ❌ Tabela `cecilia_decisao_regras`
- ❌ OpenAI como alternativa ao Haiku
- ❌ Qualquer mudança de schema de banco não listada acima

---

## Entregável

Um único arquivo HTML atualizado em:
```
~/jarbas-reports/jarbas2/cecilia-v2-relatorio-e2e-20260331.html
```

O HTML deve ter uma **nova seção "Plano Detalhado de Correções"** com:

Para cada uma das 8 correções:
- Arquivo e função afetada (com número de linha se possível)
- Diagnóstico: o que está errado exatamente
- Plano: o que mudar, pseudocódigo se necessário
- Risco: o que pode dar errado na implementação
- Critério de validação: como saber que funcionou

Além disso, atualizar/adicionar no HTML:
- Stats grid com dados reais (use os números desta missão)
- Correção da informação sobre TJSC (botão existe, seletor errado)
- SQL de limpeza antes do próximo E2E
- Critérios Go/No-Go para produção

**Estilo:** dark mode Jarbas 2.0 (fundo #0d0f18, accent #7c6dff, gradient no H1).

Após gerar:
```bash
cd ~/jarbas-reports && git add jarbas2/cecilia-v2-relatorio-e2e-20260331.html && git commit -m "html: relatorio e2e - plano detalhado 8 correcoes" && git push
```

Mandar o link:
```
https://mdlab-christian.github.io/jarbas-reports/jarbas2/cecilia-v2-relatorio-e2e-20260331.html
```

---

## Referências Adicionais

- **Supabase projeto:** `qdivfairxhdihaqqypgb`
- **Org Midas:** `55a0c7ba-1a23-4ae1-b69b-a13811324735`
- **Vault Cecília (playbooks):** `/Users/cecilia/cecilia-vault/02-PLAYBOOKS/`
- **Taxonomia A-G:** já carregada em `skill_analisar_ia.mjs` — ver constante `TAXONOMIA`
- **Credenciais:** `/Users/cecilia/cecilia-skills/.env` (não expor no HTML)

---

*Jarbas 2.0 🐙 | 2026-03-31 | Prompt de planejamento para Claude Code — leitura + análise + HTML*
