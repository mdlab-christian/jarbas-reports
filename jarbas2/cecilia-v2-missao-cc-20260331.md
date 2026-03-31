# 🎛️ Cecília v2 — Missão Claude Code: Lapidação Final + Captura Antecipada
> Gerado por: Jarbas 2.0 🐙 | Data: 2026-03-31 | Para: Claude Code (contexto limpo)
> **Antes de qualquer execução: gere um HTML de plano para aprovação do Christian.**

---

## 🧠 Contexto Completo — O que você precisa saber

### Quem você é neste contexto
Você é Claude Code rodando no MacBook Air M4 do Christian Paz (usuário: `christian`).
Você tem acesso ao Mac Mini M4 via `ssh mac-mini-tail` (ou `ssh mac-mini`).
A Cecília roda no Mac Mini como usuário `cecilia` (UID 506).
Todas as operações na Cecília devem usar: `ssh mac-mini-tail "echo '010597' | sudo -S su - cecilia -c 'CMD'"` ou `ssh mac-mini-tail "echo '010597' | sudo -S CMD"`.

### O que foi construído (Claude Code fez isso em sessão anterior)
A **Cecília v2.0** é um sistema de monitoramento de intimações EPROC completamente reconstruído.
Substituiu um sistema OpenClaw instável por Node.js puro, independente e autônomo.

**Stack:**
- Runtime: `/Users/cecilia/cecilia-skills/src/start.mjs` (Node.js puro, `--max-old-space-size=4096`)
- LaunchAgent: `ai.cecilia.skills` (ativo, KeepAlive, guid/506)
- Banco: Supabase `qdivfairxhdihaqqypgb` (org_id: `55a0c7ba-1a23-4ae1-b69b-a13811324735`)
- Browser: Playwright Chromium (pool de 5)
- IA: Claude Sonnet 4.6 + vault Obsidian (`/Users/cecilia/cecilia-vault/02-PLAYBOOKS/`)
- Crons internos (node-cron): 00h, 12h, 18h BRT

**15 skills:**
```
skill_login_eproc.mjs         — login state machine 12 estados, cache sessão Supabase
skill_gerar_planilha.mjs      — baixar XLS via click no painel (v2.3, mantém sessão)
skill_processar_planilha.mjs  — parse XLS → filtro 3 camadas → lista movimentações
skill_acessar_processo.mjs    — abrir processo no EPROC
skill_ler_documento.mjs       — 5 níveis fallback: DOM→iframe→PDF→Vision→alerta manual
skill_analisar_ia.mjs         — Claude Sonnet 4.6 + vault 14 arquivos + batch 10
skill_notificacoes.mjs        — templates Telegram + dedup 24h + routing
skill_orquestrador.mjs        — ciclo completo: 6 etapas, retry 2x, circuit breaker
skill_analise_intimacoes_bulk.mjs
skill_analise_juridica_processo.mjs
skill_cecilia_rag_controller.mjs
skill_eproc_cnj.mjs
```

**Tabelas Supabase criadas:**
- `cecilia_ciclos` — registro de cada execução por OAB
- `cecilia_intimacoes` — intimações classificadas (A-G)
- `cecilia_notificacoes` — log de notificações enviadas
- `cecilia_session_cache` — cache de sessões EPROC
- `cecilia_erros` — log de erros por skill
- `jarbas_tarefas` — fila de tarefas (interface de comando)
- `jarbas_accounts` — credenciais das 5 OABs

**5 OABs configuradas:**
| Login | Tribunal | Status atual |
|---|---|---|
| RS116571 | TJRS | ✅ ativo, 0 falhas |
| RS131163 | TJRS | ✅ ativo, 0 falhas (Heloísa — pode não ter TOTP) |
| SC074025 | TJSC | ✅ ativo, 0 falhas |
| SC075466 | TJSC | ✅ ativo, 0 falhas |
| SP535101 | TJSP | ✅ ativo, 0 falhas |

**Taxonomia de classificação A-G (João Victor — controller humano):**
- A = Irrelevante (DJE, publicação, remessa, concluso, pauta) → zero custo IA
- B = Ciência com Renúncia (intimação ré, despacho genérico, saneador sem acolhimento)
- C = Providência Documental (juntar docs AJG, extratos, emenda documental)
- D = Providência Jurídica Simples (réplica, contrarrazões, manifestação)
- E = Providência Estratégica (sentença improcedente, multa má-fé, perícia nomeada)
- F = Recebimento de Valores (depósito judicial, SISBAJUD, alvará)
- G = Encerramento (desistência homologada, extinção sem custas)

**Vault Obsidian da Cecília:** `/Users/cecilia/cecilia-vault/02-PLAYBOOKS/`
- 14 arquivos carregados atualmente no system prompt da IA
- Inclui: taxonomia-intimacoes.md, regras-operacionais.md, eventos-ruido.md, treinamento-2026-03-27-joao-v1.md (R_JV01-06 mais recentes), sisbajud-urgente.md, equipe-responsaveis.md, matriz-roteamento.md, fases-do-processo.md, pericia-desistencia.md, ajg-por-estado.md, gatilho-intimacao.md, fluxos-operacionais.md, joao-treinamento-completo.md, usuarios-futuros.md

**Arquitetura de comunicação:**
```
Cecília OpenClaw (comandos naturais do João/Christian)
  → INSERT jarbas_tarefas (Supabase)
  → task-consumer.mjs (polling 10s)
  → Pipeline v2 (6 etapas, Node.js puro)
  → cecilia_intimacoes (resultado)
  → Telegram (notificação João)
```
O Node.js v2 é 100% autônomo. OpenClaw é apenas interface de comando via Supabase.

---

## 🔴 Problemas Confirmados que Precisam de Fix

### P0-1 — Circuit breaker sem reset automático
**Situação atual em `accounts-loader.mjs`:**
- Ao atingir MAX_LOGIN_FAILURES (5): desativa OAB no Supabase + notifica Telegram
- **Não há mecanismo de reset automático** — fica desativada até intervenção manual SQL
- **Risco real:** EPROC ficar 30 minutos fora durante ciclo → todas as 5 OABs desativadas → ciclos seguintes com 0 contas → silêncio total, intimações perdidas

**Fix necessário:**
```javascript
// accounts-loader.mjs — adicionar campo circuit_reset_at
// Ao desativar OAB: gravar circuit_reset_at = now + backoff_ms
// Backoff: 1ª desativação = 15min, 2ª = 30min, 3ª = 1h, 4ª+ = alerta humano
// Ao iniciar ciclo: checar se circuit_reset_at < now → resetar automaticamente + notify reset
// Novo campo em jarbas_accounts: circuit_reset_at TIMESTAMPTZ, circuit_deactivations INT DEFAULT 0
```

### P0-2 — Silêncio total em falha de ciclo
**Situação atual:** se `loadAccounts()` retorna 0 contas (todas circuit-broken), o orquestrador simplesmente não executa — sem nenhuma notificação.
**Fix:** ao detectar 0 contas ativas → notificar imediatamente com causa + timestamp do último ciclo bem-sucedido.

### P1-1 — Cache de sessão TTL muito curto
**Situação atual:** TTL = 14 minutos em `cecilia_session_cache`.
**Risco:** 5 OABs processando sequencialmente → ao chegar na 4ª OAB (20-25 minutos depois) → sessão da 1ª expirou → relogin desnecessário (e potencialmente falha).
**Fix:** Aumentar TTL para 25 minutos + implementar renovação preventiva quando TTL restante < 5 minutos.

### P1-2 — Responsáveis sugeridos podem ser nomes inválidos
**Situação atual:** A IA pode inventar nomes para `responsavel_sugerido_nome` se não souber a lista exata.
**Fix:** Adicionar ao system prompt (em `skill_analisar_ia.mjs`) a lista explícita de responsáveis válidos. O arquivo `equipe-responsaveis.md` já está no vault — garantir que os nomes estejam claramente listados no prompt com instrução: "NUNCA inventar nome fora desta lista. Se não souber, retornar null."

### P1-3 — Formato XLS por tribunal não validado para SC e SP
**Situação atual:** O parser da planilha foi desenvolvido e testado com RS116571 (TJRS). TJSC e TJSP podem ter cabeçalhos diferentes na planilha gerada pelo EPROC.
**Ação necessária:** Investigar o código de `skill_processar_planilha.mjs` e verificar se há tratamento diferenciado por tribunal. Se não houver, adicionar.

### P1-4 — Filtro de polo pode descartar processos legítimos
**Situação atual:** Polo passivo (réu) → Classe B automático (sem análise IA).
**Risco:** Casos onde a OAB aparece como polo passivo técnico mas somos advogados do autor.
**Ação:** Investigar a lógica exata de detecção de polo em `skill_processar_planilha.mjs`. Documentar claramente. Se o risco for real, refinar ou desativar o filtro automático de polo.

### P2-1 — Sem monitoramento de custo IA por ciclo
**Situação atual:** tokens consumidos por ciclo não são registrados.
**Fix:** Capturar `usage.input_tokens + usage.output_tokens` da resposta Claude API e registrar em tabela `cecilia_custo_ia` (criar se não existir: ciclo_id, oab, tokens_input, tokens_output, custo_estimado, created_at).

---

## 🧹 Limpeza Necessária

### Limpar intimações antigas do controller MdFlow
A tabela `cecilia_intimacoes` tem dados do sistema legado (classificações com schema antigo, movimentações de antes de 21/03/2026). Esses dados estão aparecendo na página /controller e confundindo o João.

**Ação:** Limpar (ou arquivar) as intimações com schema incompatível com o v2. Critério sugerido:
- Intimações sem campo `_analista_raw` → schema antigo → mover para tabela `cecilia_intimacoes_legacy` ou deletar se aprovado pelo Christian
- Ou: truncar todas e recomeçar do zero (dados legados não têm valor operacional)

**⚠️ Confirmar com Christian antes de deletar: "posso limpar todas as intimações do sistema legado e começar do zero?"**

---

## ⚡ Captura Antecipada — Rodar Agora (Pós-Implementação dos Fixes)

Após implementar as mudanças acima, rodar um ciclo manual de captura completo cobrindo:
- **Todas as 5 OABs**: RS116571, RS131163, SC074025, SC075466, SP535101
- **Período**: meia-noite até agora (aprox. 00:00 → 11:00 BRT de hoje, 31/03/2026)
- **Objetivo**: ver em produção o sistema funcionando com todas as melhorias

**Como disparar:**
```javascript
// Inserir em jarbas_tarefas via Supabase ou diretamente no orquestrador
// Opção 1: INSERT direto
await supabase.from('jarbas_tarefas').insert({
  organizacao_id: '55a0c7ba-1a23-4ae1-b69b-a13811324735',
  tipo: 'ciclo_manual',
  params: {
    oabs: ['RS116571', 'RS131163', 'SC074025', 'SC075466', 'SP535101'],
    desde: '2026-03-31T03:00:00.000Z', // meia-noite BRT = 03:00 UTC
    ate: new Date().toISOString(),
    motivo: 'ciclo_antecipado_lapidacao'
  },
  status: 'pendente',
  created_at: new Date().toISOString()
});

// Opção 2: modificar temporariamente o orquestrador para ignorar horário e rodar
// Opção 3: chamar executarCiclo() diretamente com timestamp customizado
```

**Resultado esperado:**
- Logs no terminal do Mac Mini mostrando cada OAB processando
- Registros em `cecilia_ciclos` e `cecilia_intimacoes`
- Notificações Telegram para João com urgentes (Classe E/F) se houver
- Página /controller do MdFlow mostrando intimações classificadas do dia

---

## 💡 Melhorias Opcionais (você decide se implementa)

Estas são sugestões do Jarbas 2.0. Você pode adaptar, rejeitar ou melhorar conforme sua investigação:

### M1 — Health Endpoint HTTP
Adicionar `GET /health` na porta 19200 no start.mjs para o supervisor OpenClaw poder pingar:
```json
{ "status": "ok", "uptime": 3600, "lastCycle": "2026-03-31T12:00:00Z", "activeBrowsers": 2, "oabsAtivas": 5 }
```

### M2 — Campo `circuit_reset_at` em jarbas_accounts
Migration necessária para suportar o circuit breaker com reset automático.

### M3 — Tabela `cecilia_custo_ia`
Para rastrear custo por ciclo.
```sql
CREATE TABLE cecilia_custo_ia (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organizacao_id UUID,
  ciclo_id UUID REFERENCES cecilia_ciclos(id),
  oab TEXT,
  tokens_input INTEGER,
  tokens_output INTEGER,
  custo_estimado NUMERIC(10,6),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### M4 — Relatório de qualidade pós-ciclo
Após cada ciclo, logar no console um resumo estruturado:
```
✅ CICLO RS116571 concluído
   📊 45 movimentações → A=31 B=6 C=2 D=4 E=2 F=0 G=0
   💰 Custo IA: $0.042 (18 análises via IA, 27 zero-custo)
   ⚡ Urgentes: 2 (Classe E) → notificados
   ⏱️ Duração: 4m 32s
```

---

## 📋 Protocolo de Execução

**Etapa 1 — Investigação (faça antes de qualquer mudança):**
1. Ler todos os arquivos relevantes: `start.mjs`, `skill_orquestrador.mjs`, `accounts-loader.mjs`, `skill_processar_planilha.mjs`, `skill_login_eproc.mjs`, `skill_analisar_ia.mjs`
2. Verificar schema atual de `jarbas_accounts` no Supabase (tem `circuit_reset_at`?)
3. Verificar dados em `cecilia_intimacoes` (quantos registros? qual schema?)
4. Verificar `skill_processar_planilha.mjs` — como detecta polo? há diferença por tribunal?
5. Avaliar cada problema e melhoria listada — você pode ajustar o plano

**Etapa 2 — Gerar HTML de plano:**
- Antes de executar qualquer mudança, gerar HTML completo com:
  - O que você vai fazer (e o que não vai fazer + por quê)
  - Migrations necessárias (com SQL exato)
  - Mudanças por arquivo (com diff resumido)
  - Sequência de execução
  - Possíveis riscos e mitigações
  - Como vai rodar a captura antecipada
- Publicar em `~/jarbas-reports/jarbas2/cecilia-v2-lapidacao-plano-cc-YYYYMMDD.html`
- Mandar link para o Christian aprovar

**Etapa 3 — Executar após aprovação:**
- Fazer as mudanças na ordem: migrations primeiro → código → restart Cecília → validar → captura

---

## 🔑 Acesso ao Sistema

```bash
# Ver logs em tempo real da Cecília
ssh mac-mini-tail "sudo tail -f /Users/cecilia/cecilia-skills/logs/cecilia.log"

# Ver status do processo
ssh mac-mini-tail "ps aux | grep start.mjs | grep -v grep"

# Reiniciar Cecília após mudanças
ssh mac-mini-tail "sudo launchctl kickstart -k gui/506/ai.cecilia.skills"

# Editar arquivo na Cecília
ssh mac-mini-tail "sudo nano /Users/cecilia/cecilia-skills/src/ARQUIVO.mjs"
# Ou via scp:
scp /tmp/arquivo.mjs mac-mini-tail:/tmp/ && ssh mac-mini-tail "sudo cp /tmp/arquivo.mjs /Users/cecilia/cecilia-skills/src/skills/arquivo.mjs && sudo chown cecilia:staff /Users/cecilia/cecilia-skills/src/skills/arquivo.mjs"

# Supabase — queries diretas
# PROJECT_ID: qdivfairxhdihaqqypgb
# URL: https://qdivfairxhdihaqqypgb.supabase.co
# SUPABASE_ACCESS_TOKEN está disponível em ~/.env

# Vault da Cecília (playbooks do João)
ssh mac-mini-tail "sudo ls /Users/cecilia/cecilia-vault/02-PLAYBOOKS/"

# Variáveis de ambiente da Cecília
ssh mac-mini-tail "sudo cat /Users/cecilia/.env"
```

---

## 📊 Estado Atual dos Sistemas (11:00 BRT 31/03/2026)

| Item | Status |
|---|---|
| start.mjs rodando | ✅ PID ativo, reiniciado às 10:57 |
| LaunchAgent ai.cecilia.skills | ✅ Ativo, KeepAlive |
| LaunchDaemon antigo (openclaw) | ✅ disabled — sem conflito |
| OpenClaw gateway cecilia | ✅ Rodando (sem crons EPROC) |
| 5 OABs ativas | ✅ Todas ativo=true, falhas=0 (resetado hoje) |
| Vault 14 arquivos | ✅ skill_analisar_ia.mjs v2.2 |
| Schema _analista_raw | ✅ Implementado em v2.2 |
| Circuit breaker reset automático | ❌ Não implementado |
| Alerta ciclo com 0 contas | ❌ Não implementado |
| Intimações legado no controller | ⚠️ Aparecendo, aguarda limpeza |
| Próximo ciclo automático | 🕐 15:00 UTC (12:00 BRT) |

---

## ✅ O que Está Funcionando Bem (não precisa mudar)

- **Pipeline de 6 etapas** — sólido, battle-tested
- **Login state machine** — 12 estados, re-login automático, funcional
- **Leitura de documento com 5 níveis de fallback** — resolve o problema raiz (lerDocumentoIframe falhava 100%)
- **Filtro zero-custo** — ~60% das movimentações descartadas antes de chamar IA (DJE, publicação, pauta)
- **Batch de 10 + cache de prompt 1h** — eficiente e econômico
- **Vault do João carregado** — taxonomia A-G completa com regras mais recentes
- **Tabelas Supabase** — schema bem projetado, funcional
- **Task-based architecture** — `jarbas_tarefas` como barramento de comunicação desacoplado
- **skill_gerar_planilha.mjs v2.3** — estratégia de CLICK mantém sessão (não quebra como page.goto)

---

## 🎯 Objetivo Final

Ao final desta missão, o sistema deve estar:
1. **100% funcional** em produção autônoma (3 ciclos/dia sem intervenção)
2. **Auto-recuperável** (circuit breaker com backoff, sem silêncio em falha)
3. **Transparente** (logs estruturados, custo rastreado, relatório diário)
4. **Com captura do dia** já executada e visível no controller do MdFlow

O Christian vai acompanhar via Telegram e via página /controller do MdFlow.

---

*Gerado por Jarbas 2.0 🐙 | 2026-03-31 11:00 BRT | MdLab LegalTech*
