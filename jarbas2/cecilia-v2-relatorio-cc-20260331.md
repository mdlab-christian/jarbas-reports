# Missão: Relatório HTML Completo do Ciclo E2E — Cecília v2

> Para: Claude Code | De: Jarbas 2.0 🐙 | 2026-03-31
> Objetivo: Gerar relatório HTML detalhado do ciclo de monitoramento para análise e otimização

---

## O que você precisa gerar

Um arquivo HTML completo em `/Users/christian/jarbas-reports/jarbas2/cecilia-v2-relatorio-e2e-YYYYMMDD.html` com o relatório do ciclo de teste E2E que você acabou de rodar (ou está rodando), documentando **cada etapa, cada clique, cada decisão** do sistema.

O Jarbas 2.0 vai analisar esse HTML para identificar gargalos, erros e oportunidades de otimização.

---

## Estrutura obrigatória do HTML

### Seção 1 — Resumo Executivo
- Timestamp início e fim do ciclo
- OABs processadas e resultado de cada uma (concluído/falhou/pulou)
- Total de processos analisados vs total no XLS vs total filtrados
- Total de intimações geradas por classe (A, B, C, D, E, F, G)
- Custo total estimado (Haiku + Sonnet + Vision)
- Tempo total e tempo por OAB

### Seção 2 — Timeline de Cada OAB (expandível por OAB)
Para cada OAB (RS116571, RS131163, SC074025, SC075466, SP535101), documentar:

**2.1 Login EPROC**
- Timestamp do início do login
- Qual URL foi acessada
- Qual usuário/senha tentou
- Resultado: sucesso ou falha (com mensagem de erro se falhou)
- Tempo gasto no login

**2.2 Geração do XLS**
- Timestamp
- URL da página de relatório
- Parâmetros usados (data inicial, data final, tipo de relatório)
- Total de linhas no XLS gerado
- Tempo gasto

**2.3 Processamento do XLS**
- Total de processos no XLS
- Filtros aplicados e quantos foram removidos por cada filtro:
  - `cecilia_ultima_analise_em` (data de corte = meia-noite de hoje BRT)
  - Status `arquivado` (skip total)
  - Status `transitado_julgado` sem movimentação financeira (skip com log)
  - Pré-classificação O3 como Classe A (sem EPROC)
- Total restante que precisou de acesso ao EPROC

**2.4 Acesso ao EPROC — Processo a Processo**
Para **cada processo** acessado, registrar:
- CNJ
- Empresa/Réu
- Timestamp de início e fim
- Método de navegação usado (busca por CNJ limpo / URL direta / fallback)
- Total de eventos encontrados no DOM
- Total de eventos **dentro do range de data** (desde meia-noite BRT)
  - ⚠️ Se eventos fora do range estão sendo analisados → MARCAR COMO BUG
- Para cada evento dentro do range:
  - Texto do evento
  - Data do evento
  - Tem documento vinculado? (sim/não)
  - Documento foi lido? (sim/não/skip)
  - Motivo do skip se não lido (assinatura? href duplicado? tamanho?)
  - Level do fallback usado (L1/L2/L3/L4/L5)
  - Texto extraído (primeiros 200 chars)
  - Pré-classificação automática (O3) se aplicou
- Tempo total no processo

**2.5 Análise IA**
- Modelo usado: Haiku ou Sonnet (e por que escalou ou não)
- Tokens input / output
- Custo estimado
- Resultado: classe, responsável, ação, confiança, justificativa
- Tempo de resposta da API

**2.6 Persistência**
- Inseriu em `intimacoes`? (sim/não)
- Motivo se não inseriu (duplicata por signature_hash? erro?)
- `processo_id` resolvido? (sim/não — null = processo não encontrado no MdFlow por CNJ)
- Campos chave salvos: classe_cecilia, responsavel, urgente, ia_acao_recomendada

### Seção 3 — Bugs e Anomalias Detectadas
Lista de qualquer comportamento inesperado, com:
- Descrição do problema
- CNJ afetado (se aplicável)
- Arquivo e linha onde ocorreu
- Impacto (crítico/alto/médio/baixo)
- Sugestão de fix

**Bugs conhecidos a confirmar:**
- ⚠️ BUG-1: Sistema analisando movimentações anteriores à data de corte (meia-noite de hoje BRT) — confirmar se está filtrando corretamente por `cecilia_ultima_analise_em`
- ⚠️ BUG-2: Processos sendo analisados mesmo sendo polo ré — verificar se `polo_representado` está sendo consultado
- ⚠️ BUG-3: `maxEventos` estava em 3 — confirmar que foi corrigido para 50

### Seção 4 — Análise de Qualidade das Classificações
Tabela com todas as intimações geradas:
| CNJ | Réu/Empresa | Evento | Classe | Confiança | Responsável | Ação sugerida | Tempo (s) | Modelo |

Estatísticas:
- % por classe (A/B/C/D/E/F/G)
- % com responsável definido vs "null"
- % com ação específica vs genérica ("verificar prazo..." = RUIM)
- % com confiança > 0.70

### Seção 5 — Performance e Gargalos
- Gráfico de tempo por etapa (login / XLS / por processo EPROC / IA / persistência)
- Top 5 processos mais lentos e por quê
- Etapas que consumiram >80% do tempo
- Quantas re-tentativas de login foram necessárias
- Quantos timeouts ou erros de sessão

### Seção 6 — Custo Detalhado
- Custo por OAB
- Custo por modelo (Haiku / Sonnet / Vision)
- Comparativo: custo real vs estimativa de $19/mês
- Projeção para 30 dias com base no ciclo atual

### Seção 7 — Checklist de Validação
Para cada item, marcar ✅ OK, ⚠️ PARCIAL, ou ❌ FALHOU:

- [ ] Pipeline completou sem travar
- [ ] Login bem-sucedido em todas as OABs (ou falha documentada)
- [ ] XLS gerado com dados do dia
- [ ] Filtro por data funcionando (APENAS eventos desde meia-noite BRT = `cecilia_ultima_analise_em`)
- [ ] Processos arquivados pulados
- [ ] Processos de polo ré filtrados (campo `polo_representado`)
- [ ] maxEventos = 50 (não 3)
- [ ] Documentos de assinatura filtrados (não foram para a IA)
- [ ] Dedup de href funcionando (mesmo documento não lido 2x)
- [ ] Schema `_analista_raw` correto em todas as intimações
- [ ] Intimações aparecendo no /controller do MdFlow
- [ ] Notificação Telegram enviada para E/F
- [ ] `cecilia_ultima_analise_em` atualizado após processamento
- [ ] Custo dentro do esperado

---

## Arquivos para incluir no relatório

Incluir **conteúdo completo** dos seguintes arquivos no HTML (em seção de código expansível):
- `/Users/cecilia/cecilia-skills/src/skill_orquestrador.mjs`
- `/Users/cecilia/cecilia-skills/src/skill_acessar_processo.mjs`
- `/Users/cecilia/cecilia-skills/src/skill_processar_planilha.mjs`
- `/Users/cecilia/cecilia-skills/src/eproc-utils.mjs`
- `/Users/cecilia/cecilia-skills/src/skill_analisar_ia.mjs` (primeiros 200 linhas — system prompt)

E os últimos 200 linhas do log:
```
ssh mac-mini-tail "sudo -u cecilia tail -200 /Users/cecilia/cecilia-skills/logs/cecilia.log"
```

---

## Regras do relatório

1. **HTML com design dark** — igual ao padrão dos outros relatórios (fundo #0d0f18, texto #e2e8f0)
2. **Tabelas colapsáveis** para dados volumosos (processo a processo)
3. **Marcar em vermelho** qualquer anomalia, bug ou comportamento inesperado
4. **Ser honesto** — se algo falhou, documentar claramente. Não suavizar.
5. **Publicar no GitHub Pages** após gerar: `cd ~/jarbas-reports && git add . && git commit -m "relatório E2E cecilia" && git push`
6. **Enviar o link** para o Jarbas 2.0 analisar: `https://mdlab-christian.github.io/jarbas-reports/jarbas2/cecilia-v2-relatorio-e2e-YYYYMMDD.html`

---

## Contexto adicional — Regras de negócio críticas a validar

**Regra fundamental (parte autora como padrão):**
O escritório representa **quase sempre a parte autora** (cliente negativado indevidamente). Como regra padrão:
- Intimações direcionadas à **parte autora** (nosso cliente) → analisar
- Intimações direcionadas à **parte ré** (banco, Boa Vista, etc.) → descartar (Classe A ou B)
- Exceção: cumprimento de sentença onde o escritório pode ser exequente

**Filtro de data OBRIGATÓRIO:**
A data de corte é `cecilia_ultima_analise_em` por processo. Está setada como meia-noite de hoje (2026-03-31 00:00 BRT = 03:00 UTC). O sistema deve analisar **SOMENTE** eventos com data >= essa timestamp. Qualquer evento anterior deve ser ignorado completamente, mesmo que apareça no XLS ou no DOM do processo.

Se o sistema estiver analisando eventos de datas anteriores → **BUG crítico** — documentar e corrigir.

**Documentos que devem ser lidos:**
- ✅ Decisões judiciais (sentença, despacho, acórdão, decisão interlocutória)
- ✅ Intimações com prazo em aberto para a parte que representamos
- ✅ Documentos de execução/cumprimento com valor financeiro
- ❌ Assinaturas de advogado
- ❌ Certidões de publicação (DJE/DJM)
- ❌ Documentos de partes que não representamos

---

## Referências para contexto

- Avaliação crítica atual: `https://mdlab-christian.github.io/jarbas-reports/jarbas2/cecilia-v2-avaliacao-critica-20260331.html`
- Plano definitivo: `https://mdlab-christian.github.io/jarbas-reports/jarbas2/cecilia-v2-plano-definitivo-20260331.html`
- Deep review CC: `https://mdlab-christian.github.io/jarbas-reports/jarbas2/cecilia-deep-review-20260331.html`
- Supabase projeto: `qdivfairxhdihaqqypgb` | Org ID Midas: `55a0c7ba-1a23-4ae1-b69b-a13811324735`
- Runtime Cecília: `/Users/cecilia/cecilia-skills/src/start.mjs` (Mac Mini, user: cecilia)
- Logs: `/Users/cecilia/cecilia-skills/logs/cecilia.log`

---

*Jarbas 2.0 🐙 | 2026-03-31 | Missão para Claude Code — relatório E2E completo*
