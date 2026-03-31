# Missão: Atualizar o Relatório E2E com Análise do Jarbas 2.0

> Para: Claude Code | De: Jarbas 2.0 🐙 + Christian | 2026-03-31
> **MODO: SÓ PLANEJAMENTO — não executar nenhuma correção de código**
> **REGRA CENTRAL: não tocar em nenhum arquivo .mjs, .ts, .tsx, SQL ou config**
> **A única coisa que você deve fazer é atualizar o HTML abaixo**

---

## Tarefa

Você gerou um relatório E2E em:
```
~/jarbas-reports/jarbas2/cecilia-v2-relatorio-e2e-20260331.html
```

O Jarbas 2.0 analisou o mesmo teste E2E de forma independente — leu o código das skills diretamente via SSH no Mac Mini, consultou os dados reais do Supabase, e gerou seu próprio brainstorm. Ele encontrou problemas adicionais e tem análises que complementam e às vezes divergem do seu relatório.

**Sua missão:** Ler o brainstorm do Jarbas, absorver todas as análises, e **atualizar o HTML que você mesmo gerou** (`cecilia-v2-relatorio-e2e-20260331.html`) com tudo que falta. O objetivo é ter **um único documento consolidado e definitivo** — sem criar novos arquivos.

---

## Fonte 1 — Seu próprio relatório (já publicado)
```
https://mdlab-christian.github.io/jarbas-reports/jarbas2/cecilia-v2-relatorio-e2e-20260331.html
```

## Fonte 2 — Brainstorm do Jarbas 2.0 (analisar e incorporar)
```
https://mdlab-christian.github.io/jarbas-reports/jarbas2/cecilia-v2-brainstorm-v2-20260331.html
```

## Fonte 3 — Plano de execução definitivo do Jarbas (contexto adicional)
```
https://mdlab-christian.github.io/jarbas-reports/jarbas2/cecilia-v2-plano-execucao-20260331.html
```

---

## Dados Reais do Banco (Supabase — consultados pelo Jarbas)

Use esses dados para garantir que o HTML bate com a realidade:

### Ciclos E2E executados hoje
| OAB | Status | Verificados | Analisados | Custo IA | Tempo |
|-----|--------|------------|-----------|---------|-------|
| RS116571 | concluído | 5 | 47 | $0.1336 | 8.4 min |
| RS131163 | concluído | 1.122 | 115 | $0.2309 | 17.6 min |
| SC074025 | falhou | 0 | 392 | $0.8717 | 69.2 min |
| SC075466 | não rodou | — | — | — | — |
| SP535101 | não rodou | — | — | — | — |

> ⚠️ RS116571 mostra `processos_analisados=47` mas XLS tinha 5. Campo conta eventos, não processos — bug de métrica.

### Distribuição das 158 intimações no banco
| Classe | Qtd | % | Obs |
|--------|-----|---|-----|
| A | 85 | 54% | **Não deveriam estar no banco** |
| D | 53 | 34% | Maioria confiança 0.3 = fallback |
| B | 15 | 9% | Ciência renúncia |
| E | 2 | 1% | Urgentes |
| G | 3 | 2% | Transitado em julgado |

### Modelos IA usados (dados reais)
- Haiku: 245 registros com confiança=0.3 (fallback) + 185 com confiança alta
- Sonnet: 27 registros com confiança=0.3 (escalou mas também falhou)
- **Confiança 0.3 = Haiku/Sonnet retornou JSON inválido → parseJsonArray() retornou [] → fallback D**

### Erros Playwright (real)
- `Target page, context or browser has been closed`: **104x**
- `Execution context was destroyed`: **33x**
- Total: **137 erros** — 100% não resolvidos (campo `resolvido=false`)

### Custo/processo (calculado pelo Jarbas)
- Média: **$0.0022/processo** (R$0,01)
- Tempo médio: **10.3s/processo**
- Projeção produção (2 ciclos/dia, 300 proc): **~$40/mês**
- Com pré-classificação via tabela de regras: **~$28/mês estimado**

---

## O Que Adicionar/Corrigir no Seu HTML

### ✅ Seções que você já tem (manter, pode refinar com dados acima)
- Hero + Stats Grid
- Issues #1 a #7
- Avaliação de modelos IA

### 🔴 O Que Está Faltando ou Incorreto (adicionar)

**1. Correção importante: Botão "Gerar Planilha" no TJSC**
Seu relatório disse que o botão não existe no TJSC. **Christian confirmou que existe, no mesmo lugar.** O problema é que seu seletor CSS é específico do TJRS e não encontra o botão no TJSC. Corrigir essa informação no relatório — não é ausência de funcionalidade, é seletor CSS errado.

**2. Issue novo: Classe A inserida no banco (85/158 = 54%)**
Esse issue não estava no seu relatório mas é o maior problema de qualidade. O orquestrador está persistindo Classe A no banco — classe A = irrelevante, nunca deveria aparecer no controller. Fix: filtrar `classe === 'A'` antes de `persistirIntimacao()`.

**3. Issue novo: parseJsonArray() frágil — contamina batch inteiro**
O root cause real do Haiku "falhar 32.3%" não é o modelo em si. É que quando o JSON retornado pelo Haiku é inválido (texto extra, formatação errada), o `parseJsonArray()` retorna `[]` e **todos os processos do batch** recebem o fallback D. Um erro de JSON contamina N processos de uma vez. Fix: `parseJsonArrayRobusto()` com 3 tentativas antes de desistir.

**4. Seção de Métricas Reais**
Adicionar tabela com dados reais dos ciclos (acima) — tempo por OAB, custo por OAB, custo/processo, projeções.

**5. Seção: Escopo Definido — O Que Fica e O Que Sai**
Christian decidiu:
- **Sai do escopo agora:** roteamento automático de atividades (tabela cecilia_equipe), criação automática de tarefas, tabela `cecilia_decisao_regras`, OpenAI como alternativa
- **Fica no escopo:** classificação IA (Haiku + Sonnet), filtros, controller mostrando D/E/F/G, notificação E/F

**6. Seção: Fluxo de Trabalho (par-programming)**
Adicionar seção explicando o fluxo acordado:
1. Jarbas planeja e gera prompt para CC
2. CC executa e gera relatório HTML
3. Christian manda HTML para o Jarbas
4. Jarbas analisa banco + código → go/no-go
5. Repete até produção

**7. Seção: SQL de Limpeza (executar antes do próximo E2E)**
```sql
-- Limpar intimações do teste E2E (dados com bugs)
DELETE FROM intimacoes
WHERE organizacao_id = '55a0c7ba-1a23-4ae1-b69b-a13811324735'
  AND fonte = 'cecilia_v2' AND created_at > '2026-03-31 00:00:00+00';

-- Limpar erros do teste
DELETE FROM cecilia_erros WHERE created_at > '2026-03-31 00:00:00+00';

-- Fechar ciclo travado SC074025
UPDATE cecilia_ciclos SET status = 'cancelado', concluido_em = NOW()
WHERE status = 'executando'
  AND organizacao_id = '55a0c7ba-1a23-4ae1-b69b-a13811324735';

-- Resetar cecilia_ultima_analise_em
UPDATE processos SET cecilia_ultima_analise_em = '2026-03-31 03:00:00+00'
WHERE organizacao_id = '55a0c7ba-1a23-4ae1-b69b-a13811324735';
```

**8. Seção: Plano de Execução por Fases (atualizar)**
Seu plano de fases estava bom. Atualizar com o escopo redefinido:

| Fase | O que fazer | Arquivos | Critério |
|------|------------|---------|---------|
| Fase 1 — P0 | Validar XLS (log header, filtrar JS/assunto), expandir RUIDO_PATTERNS | `skill_processar_planilha.mjs`, `eproc-utils.mjs` | Zero JS/assunto como tipo_evento |
| Fase 2 — P0 | parseJsonArrayRobusto(), não inserir Classe A, fallback = skip (não D) | `skill_analisar_ia.mjs`, `skill_orquestrador.mjs` | Zero classe A no banco, zero fallback D inútil |
| Fase 3 — P0 | Seletores por tribunal TJRS/TJSC/TJSP, fallback por texto, screenshot debug | `skill_gerar_planilha.mjs`, `eproc-utils.mjs` | SC074025 gera XLS corretamente |
| Fase 4 — P1 | safeEvaluate() com retry, isClosed() check, reciclar browser/50 proc | `skill_acessar_processo.mjs` | Erros Playwright < 10/ciclo |
| Fase 5 — P1 | Log CNJs não encontrados, normalizar formato CNJ | `skill_orquestrador.mjs` | Saber quais CNJs estão faltando no MdFlow |
| Fase 6 — P2 | Filtro Classe A hard no frontend, toggle "Excluir ruído" default ON | `ControllerV3*.tsx` | Controller mostra só D/E/F/G |

**9. Seção: Critérios Go/No-Go para Produção**
| Critério | Nível |
|---------|-------|
| Zero Classe A no banco após ciclo | P0 |
| Zero tipo_evento com JS | P0 |
| Zero "Conclusos" no controller | P0 |
| Haiku falha real < 5% | P0 |
| SC074025 processando | P0 |
| Erros Playwright < 10/ciclo 100 proc | P1 |
| Intimações órfãs < 5% | P1 |
| Controller mostra só D/E/F/G | P2 |

---

## Estrutura Final do HTML Atualizado

Manter a estrutura que você já tem, e adicionar/corrigir as seções acima. Ordem sugerida:

1. Hero (manter)
2. **[NOVO]** Escopo Definido — O Que Fica e O Que Sai
3. **[NOVO]** Métricas Reais (tabela de ciclos, custo/processo, projeções)
4. Executive Summary / Stats Grid (manter, atualizar números)
5. Issues P0 (manter + adicionar Issues novo Classe A e parseJsonArray)
6. Issues P1 (manter)
7. Issues P2 (manter)
8. **[CORRIGIR]** Nota sobre TJSC — botão existe, seletor errado
9. Avaliação de Modelos IA (manter)
10. **[NOVO]** Plano de Execução por Fases (tabela atualizada)
11. **[NOVO]** SQL de Limpeza
12. **[NOVO]** Critérios Go/No-Go
13. **[NOVO]** Fluxo de Par-Programming (Jarbas ↔ CC ↔ Christian)
14. Footer (manter)

---

## Regras do HTML

- Dark mode Jarbas 2.0: `--bg: #0d0f18`, `--accent: #7c6dff`
- Self-contained, zero CDN
- H1 com gradient obrigatório
- Marcar em vermelho todos os bugs e anomalias
- Tabelas colapsáveis para dados volumosos
- Ser honesto — se algo falhou ou está errado, documentar claramente

---

## Após Atualizar o HTML

```bash
cd ~/jarbas-reports && git add . && git commit -m "html: relatorio e2e atualizado com analise jarbas - issues + metricas reais" && git push
```

Link final (mesmo URL — só atualizar o conteúdo):
```
https://mdlab-christian.github.io/jarbas-reports/jarbas2/cecilia-v2-relatorio-e2e-20260331.html
```

Mandar o link para o Christian confirmar que está correto.

---

## Contexto do Projeto (para referência)

- **Cecília v2:** Node.js autônomo no Mac Mini, monitora processos EPROC 5 OABs
- **OABs:** RS116571, RS131163, SC074025, SC075466, SP535101
- **Skills:** `/Users/cecilia/cecilia-skills/src/skills/`
- **Supabase:** projeto `qdivfairxhdihaqqypgb`, org Midas `55a0c7ba-1a23-4ae1-b69b-a13811324735`
- **Objetivo:** monitorar 300+ processos/ciclo, 2x/dia, classificar D/E/F/G para o João no controller
- **Controller MdFlow:** `/controller` — João Victor vê e trata as intimações
- **Runtime:** `/Users/cecilia/cecilia-skills/src/start.mjs` (LaunchAgent `ai.cecilia.skills`)

---

*Jarbas 2.0 🐙 | 2026-03-31 | Prompt para Claude Code — atualizar HTML sem executar código*
