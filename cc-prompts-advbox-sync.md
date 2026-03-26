# Claude Code — Prompts Advbox Sync
> Gerado por BETO · 2026-03-26
> Objetivo: zero intimações sem processo, sem cliente e sem parte contrária no Advbox

---

## PROMPT 1 — Pareamento Retroativo (583 processos sem advbox_id)

```
Você está no servidor JARBAS (Mac Mini M4). Diretório de trabalho: ~/jarbas/scripts/

OBJETIVO: Criar e rodar o script de pareamento retroativo para associar os 583 processos distribuídos desde 10/03/2026 que ainda não têm advbox_id no Supabase.

CONTEXTO:
- Stack: Node.js 20+ com ESM (import/export), dotenv, @supabase/supabase-js, fetch nativo
- .env em ~/jarbas/.env com: ADVBOX_API_TOKEN, SUPABASE_URL, SUPABASE_KEY
- Script de referência para rate limit: ~/jarbas/scripts/advbox-backfill-parte-contraria.mjs
- API Base: https://app.advbox.com.br/api/v1
- Headers obrigatórios: Authorization: Bearer TOKEN, X-Requested-With: XMLHttpRequest, User-Agent: Mozilla/5.0, Accept: application/json
- Rate limit: 2.500ms entre requests, se 429 aguardar 65s e retry

TAREFA:
Criar ~/jarbas/scripts/advbox-pareamento-retroativo.mjs que:

1. Busca no Supabase todos os processos sem advbox_id:
   SELECT id, numero_processo, created_at, empresa_re, cliente_nome, organizacao_id
   FROM processos
   WHERE advbox_id IS NULL
     AND numero_processo IS NOT NULL
     AND created_at >= '2026-03-10'
   ORDER BY created_at DESC
   -- deve retornar ~583 registros

2. Para cada processo:
   a. Tenta encontrar no Advbox: GET /lawsuits?process_number={CNJ}
   b. Se ENCONTRADO: UPDATE processos SET advbox_id = {id}, advbox_sincronizado_em = NOW() WHERE id = '{uuid}'
   c. Se NÃO ENCONTRADO: criar no Advbox via POST /lawsuits (ver estrutura abaixo) e depois UPDATE processos SET advbox_id

3. Estrutura do POST /lawsuits (campos mínimos obrigatórios):
   - Primeiro chamar GET /settings para obter: users_id (Christian = joao@perinottipazadvogados.com), customers_origins_id, lawsuit_types_id, lawsuit_steps_id
   - Campos: process_number (CNJ), folder (número processo), users_id, customers_origins_id, lawsuit_types_id, lawsuit_steps_id
   - Associar cliente via customers: buscar por CPF/nome do cliente no Advbox

4. Log de progresso linha a linha:
   [123/583] ✅ Pareado CNJ 1234-56.2026.8.21.7000 → advbox_id=99999
   [124/583] ➕ Criado no Advbox CNJ 1234-56.2026.8.21.7000 → advbox_id=99998
   [125/583] ❌ Erro: {mensagem}

5. Ao final: relatório resumido com total pareados, criados, erros e duração

6. Suportar: node advbox-pareamento-retroativo.mjs [--dry-run] [--limit=50] [--offset=0]

RESTRIÇÕES:
- Não modificar nenhum outro arquivo
- Não fazer DELETE ou UPDATE em massa sem --dry-run primeiro
- Testar com --dry-run --limit=5 antes de rodar completo
- Se advbox_id já existir no Advbox mas não no banco → apenas atualizar o banco (nunca criar duplicata no Advbox)
```

---

## PROMPT 2 — Backfill Parte Contrária (intimações sem empresa ré)

```
Você está no servidor JARBAS (Mac Mini M4). Diretório de trabalho: ~/jarbas/scripts/

OBJETIVO: Garantir que 100% das intimações no Advbox tenham parte contrária (empresa ré) cadastrada. Processos no Advbox sem parte contrária precisam ter a empresa ré associada vinda do MdFlow (Supabase).

CONTEXTO:
- Script de referência: ~/jarbas/scripts/advbox-backfill-parte-contraria.mjs (leia antes de começar)
- Script adicional de referência: ~/jarbas/scripts/advbox-fix-empresa-aliases.mjs
- .env em ~/jarbas/.env: ADVBOX_API_TOKEN, SUPABASE_URL, SUPABASE_KEY
- Rate limit: 2.500ms entre requests, 429 → aguardar 65s

TAREFA:
Criar ~/jarbas/scripts/advbox-sync-parte-contraria.mjs que execute as 3 fases em sequência:

FASE 1 — Processos com advbox_id mas sem empresa_re no MdFlow:
  SELECT p.id, p.numero_processo, p.advbox_id, p.empresa_re
  FROM processos p
  WHERE p.advbox_id IS NOT NULL AND (p.empresa_re IS NULL OR p.empresa_re = '')
  
  Para cada: GET /lawsuits/{advbox_id} → extrair customers[] → filtrar tipo="PARTE CONTRÁRIA" ou "REU" → UPDATE processos SET empresa_re = customer.name

FASE 2 — Processos com empresa_re no MdFlow mas sem parte contrária no Advbox:
  SELECT p.id, p.numero_processo, p.advbox_id, p.empresa_re, e.cnpj
  FROM processos p
  LEFT JOIN empresas e ON e.nome = p.empresa_re
  WHERE p.advbox_id IS NOT NULL AND p.empresa_re IS NOT NULL AND p.empresa_re != ''
  
  Para cada:
  a. Buscar customer no Advbox: GET /customers?identification={CNPJ} ou GET /customers?name={nome}
  b. Se não existe → POST /customers para criar
  c. Vincular ao lawsuit: PUT /lawsuits/{advbox_id} com customers array incluindo o novo customer

FASE 3 — Relatório de intimações ainda problemáticas:
  Chamar GET /last_movements?per_page=500 e identificar intimações sem lawsuit associado
  Log final com counts por fase

ARGS suportados: --dry-run --limit=50 --fase=1|2|3|todas

RESTRIÇÕES:
- Ler o script de referência advbox-backfill-parte-contraria.mjs para reusar as funções advboxReq, getLawsuitByCNJ, getCustomerByCNPJ, getCustomerByName
- Não criar duplicatas: sempre verificar se customer já existe antes de POST
- Testar --dry-run --limit=10 --fase=1 primeiro
```

---

## PROMPT 3 — Autocadastro Automático pós-distribuição (n8n)

```
Você está no servidor JARBAS (Mac Mini M4). Diretório de trabalho: ~/jarbas/

OBJETIVO: Criar workflow n8n que cadastra automaticamente no Advbox qualquer processo novo distribuído no MdFlow, sem modificar o workflow N8N-DIST-MANUAL existente.

CONTEXTO:
- n8n URL: https://primary-production-e209.up.railway.app
- n8n API: Bearer token em ~/jarbas/.env como N8N_API_KEY
- Supabase projeto: qdivfairxhdihaqqypgb
- NÃO modificar o N8N-DIST-MANUAL (está em produção)
- Referência de estrutura de workflow n8n: ver workflows existentes via API

TAREFA:
Criar o script ~/jarbas/scripts/create-n8n-advbox-workflow.mjs que via API do n8n:

1. Crie o workflow "N8N-ADVBOX-POST-DIST" com os seguintes nodes:

   NODE 1 — Webhook Trigger:
   - Método POST, path: /advbox-post-dist
   - Recebe: { processo_id, numero_cnj, empresa_re, cliente_nome, cliente_cpf }

   NODE 2 — Buscar dados completos no Supabase:
   - HTTP Request para: https://qdivfairxhdihaqqypgb.supabase.co/rest/v1/processos?id=eq.{{processo_id}}&select=*
   - Header: apikey + Authorization Bearer com SUPABASE_KEY

   NODE 3 — Verificar se já existe no Advbox:
   - HTTP Request: GET https://app.advbox.com.br/api/v1/lawsuits?process_number={{numero_cnj}}
   - Headers: Authorization Bearer ADVBOX_TOKEN, X-Requested-With: XMLHttpRequest

   NODE 4 — IF: já existe?
   - Se SIM → Branch "Atualizar advbox_id no banco"
   - Se NÃO → Branch "Criar no Advbox"

   NODE 5a — Criar no Advbox:
   - POST /lawsuits com dados mínimos

   NODE 5b — Salvar advbox_id no Supabase:
   - PATCH processos SET advbox_id, advbox_sincronizado_em

   NODE 6 — Notify on error (Telegram):
   - Se qualquer step falhar → POST para Telegram bot com mensagem de erro

2. Ativar o workflow após criar
3. Imprimir a URL do webhook gerado

4. Separadamente, criar script ~/jarbas/scripts/advbox-fire-and-forget.mjs que:
   - Recebe como argumento --processo-id=UUID
   - Faz POST para o webhook acima com os dados do processo
   - Retorna imediatamente sem aguardar resposta (fire-and-forget)
   - Pode ser chamado como step final em outros scripts

RESTRIÇÕES:
- Verificar se N8N-ADVBOX-POST-DIST já existe antes de criar (evitar duplicata)
- Retry 3x no Advbox antes de notificar erro
- Usar Wait node de 2.5s entre chamadas Advbox
```

---

## PROMPT 4 — Auditoria Final + Relatório HTML

```
Você está no servidor JARBAS (Mac Mini M4). Diretório de trabalho: ~/jarbas/scripts/

OBJETIVO: Após rodar os scripts de pareamento e backfill, gerar relatório completo auditando o estado de sincronização Advbox ↔ MdFlow.

CONTEXTO:
- Script de referência: ~/jarbas/src/skills/skill_validar_advbox.mjs
- Script publish-report: ~/jarbas/scripts/publish-report.mjs (publica em mdlab-christian/jarbas-reports)
- Supabase: SUPABASE_URL, SUPABASE_KEY em ~/jarbas/.env

TAREFA:
Criar ~/jarbas/scripts/advbox-auditoria-final.mjs que:

1. Consulta Supabase:
   - Total processos ativos
   - Processos COM advbox_id (pareados)
   - Processos SEM advbox_id (não sincronizados)
   - Processos com advbox_id mas sem empresa_re
   - Processos sem advbox_id distribuídos após 10/03

2. Consulta Advbox:
   - Total de lawsuits ativos (GET /lawsuits?per_page=1 para pegar count)
   - Intimações recentes sem processo associado: GET /last_movements
   - Settings para confirmar token válido

3. Gera relatório HTML em ~/jarbas/reports/advbox-auditoria-{data}.html com:
   - Cards de status (verde/amarelo/vermelho)
   - Tabela de processos ainda sem sync (top 50)
   - Tabela de intimações sem processo/parte contrária
   - Histórico de execução dos scripts (se houver log)

4. Publica no GitHub Pages via ~/jarbas/scripts/publish-report.mjs

5. Envia link do relatório via Telegram (usar variável TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID do .env)

RESTRIÇÕES:
- Não modificar dados, apenas leitura
- Se alguma consulta falhar, incluir no relatório como "Erro ao obter dados"
- Relatório deve ser legível mesmo offline (CSS inline)
```

---

## Ordem de execução recomendada

1. **PROMPT 1** — Pareamento retroativo (resolver os 583 sem advbox_id)
   ```bash
   node advbox-pareamento-retroativo.mjs --dry-run --limit=5   # testar
   node advbox-pareamento-retroativo.mjs --limit=100           # lote inicial
   node advbox-pareamento-retroativo.mjs                       # completo
   ```

2. **PROMPT 2** — Backfill parte contrária
   ```bash
   node advbox-sync-parte-contraria.mjs --dry-run --limit=10 --fase=1
   node advbox-sync-parte-contraria.mjs --fase=todas
   ```

3. **PROMPT 3** — Autocadastro automático (n8n) — rodar uma vez
   ```bash
   node create-n8n-advbox-workflow.mjs
   ```

4. **PROMPT 4** — Auditoria final
   ```bash
   node advbox-auditoria-final.mjs
   ```

---
*Scripts ficam em ~/jarbas/scripts/ no JARBAS (100.78.173.81)*
