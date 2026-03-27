# 🎛️ Plano de Lapidação — CECILIA
> Gerado por JARBAS (Mac Mini) em 2026-03-27  
> Para execução pelo **Jarbas 2.0** (MacBook Air)  
> Aprovado por Christian Paz

---

## 🗺️ CONTEXTO GERAL

### O que é a CECILIA
A CECILIA é um agente OpenClaw rodando no **Mac Mini M4** (usuário `cecilia`), porta **18793**.  
Especialista em monitoramento EPROC para o escritório MP Advocacia (Perinotti Paz Advogados).  
Acessa TJRS, TJSC e TJSP via 5 OABs cadastradas.

### Arquitetura atual
```
Mac Mini M4 (jarbas@mac-mini)
├── /Users/jarbas/jarbas/src/skills/     ← skills Node.js compartilhadas (JARBAS + CECILIA)
│   ├── skill_login_eproc.mjs            ← login SSO Keycloak (tem bug)
│   ├── skill_listar_processos_eproc.mjs ← listagem de processos
│   ├── skill_navegador_eproc.mjs        ← scraping de movimentações
│   ├── skill_captura_intimacoes.mjs     ← captura + classificação A-G
│   ├── skill_monitorar.mjs              ← monitoramento manual
│   ├── skill_monitorar_cron.mjs         ← orquestrador (cron não configurado)
│   ├── skill_analise_visual_eproc.mjs   ← análise visual lote
│   ├── skill_analise_intimacoes_bulk.mjs← análise em lote
│   ├── skill_eproc_cnj.mjs              ← consulta por CNJ
│   ├── skill_clayton_visual_fallback.mjs← vision fallback 3 camadas
│   ├── skill_treinar_sessao.mjs         ← bridge regras (JARBAS — não Cecília)
│   ├── skill_cecilia_treino_joao.mjs    ← LEGADO — remover
│   ├── skill_olivia_*.mjs               ← São da OlivIA — não da Cecília
│   └── ... (+40 outras skills do JARBAS)
│
├── /Users/jarbas/.openclaw/workspace-cecilia/   ← workspace OpenClaw da Cecília
│   ├── SOUL.md              ← identidade
│   ├── MEMORY.md            ← ESTÁ VAZIO — precisa criar
│   ├── TOOLS.md             ← infraestrutura
│   ├── USER.md              ← está vazio (template padrão)
│   ├── PLAYBOOK-CONTROLLER.md ← regras de análise de intimações
│   ├── skills/eproc-monitor/SKILL.md ← treinamento EPROC
│   └── memory/
│       ├── 2026-03-26.md    ← histórico sessão 26/03
│       └── 2026-03-27.md    ← histórico sessão 27/03
│
├── ~/cecilia-vault/          ← Obsidian vault da Cecília
│   ├── 06-LOG-APRENDIZADO/treinamentos-joao.md
│   └── 08-IDEIAS/
│       ├── README.md
│       └── ideias-pendentes.md
│
└── ~/jarbas/cecilia-e2e-v2.mjs   ← script E2E testado (50 proc, funcionou)
```

### Supabase
- **Projeto:** `qdivfairxhdihaqqypgb` (MdFlow)
- **API:** `POST https://api.supabase.com/v1/projects/qdivfairxhdihaqqypgb/database/query`
- **Auth:** `Bearer sbp_38632a902ee36a28bfb42396bed19a667cffaead`
- **Tabelas relevantes:**
  - `jarbas_accounts` — credenciais das 5 OABs (login, senha, TOTP)
  - `intimacoes` — intimações capturadas (id, cnj, tipo, ia_acao_recomendada, ia_risco_nivel)
  - `controller_regras_operacionais` — 61 regras do João
  - `ai_prompts` — prompts (tem `CECÍLIA_CLASSIFICADOR` criado)
  - `ideias_joao` — ideias registradas pelo João

---

## 🔴 FASE 1 — Imediato (EXECUTAR AGORA)

### 1.1 Corrigir bug do login EPROC (P0)

**Arquivo:** `/Users/jarbas/jarbas/src/skills/skill_login_eproc.mjs`

**Bug:** O campo senha no Keycloak é `type="hidden"` inicialmente, o script não consegue fazer `fill`. Fix identificado:

**Localizar onde está o preenchimento da senha e substituir:**
```javascript
// ANTES (qualquer variação de querySelector/type/fill no campo senha):
await page.type('#password', senha)
// ou:
await page.fill('#password', senha)

// DEPOIS (usar name attribute que é mais estável):
await page.fill('[name=password]', senha)
// também adicionar espera antes:
await page.waitForSelector('[name=password]', { state: 'attached' })
await page.fill('[name=password]', senha)
```

**Como testar:**
```bash
cd ~/jarbas && node -e "
import('./src/lib/accounts-loader.mjs').then(async ({loadAccounts}) => {
  const { loginEproc } = await import('./src/skills/skill_login_eproc.mjs');
  const accounts = await loadAccounts();
  const account = accounts.find(a => a.login_eproc.toUpperCase() === 'RS116571');
  const { success, page, browser } = await loginEproc(account);
  console.log('Login:', success ? '✅ OK' : '❌ FALHOU');
  await browser.close();
});
"
```

---

### 1.2 Remover legados e duplicados

**Atenção:** Todas as skills ficam em `/Users/jarbas/jarbas/src/skills/` — NÃO há pasta `herdadas/` separada. O plano original mencionava `herdadas/` como conceitual (skills herdadas do JARBAS que a Cecília usa mas não deveria). As skills listadas abaixo pertencem ao JARBAS e não à Cecília diretamente, mas algumas são legados que podem ser removidos.

#### Verificar e MOVER para `legacy/` (não deletar ainda):

```bash
mkdir -p ~/jarbas/src/skills/legacy/
# Legado confirmado:
mv ~/jarbas/src/skills/skill_cecilia_treino_joao.mjs ~/jarbas/src/skills/legacy/

# VERIFICAR se existem antes de mover (podem não estar lá):
ls ~/jarbas/src/skills/ | grep -E "olivia_agente_v1|clayton_visual_fallback"
# Se existirem, mover skill_clayton_visual_fallback.mjs para legacy
# NÃO mover olivia_* — são da OlivIA e ainda em uso
```

#### Verificar duplicados REAIS no start.mjs do JARBAS:

O risco é o JARBAS registrar a mesma skill duas vezes. Verificar:
```bash
grep -n "analise_intimacoes_bulk\|analise_visual_eproc\|eproc_cnj\|monitorar\|captura_intimacoes" ~/jarbas/start.mjs
```

Se alguma aparecer duplicada → remover uma das entradas de `start.mjs`.

---

### 1.3 Unificar login EPROC

**Objetivo:** Criar `~/jarbas/src/lib/eproc-login.mjs` como fonte única (wrapper do skill_login_eproc.mjs).

**Criar o arquivo:**
```javascript
// ~/jarbas/src/lib/eproc-login.mjs
// Wrapper unificado para login EPROC
// Todas as skills devem importar daqui, não diretamente de skill_login_eproc.mjs

export { loginEproc } from '../skills/skill_login_eproc.mjs';
```

**Depois verificar quais skills importam login diretamente e atualizar para usar o lib:**
```bash
grep -rn "skill_login_eproc" ~/jarbas/src/skills/*.mjs | grep "import"
```

---

### 1.4 Corrigir constraint `ia_risco_nivel`

**Problema:** O campo `ia_risco_nivel` na tabela `intimacoes` tem um CHECK constraint que não aceita o valor `'info'`. O E2E v2 tentou inserir `'info'` e quebrou.

**Fix SQL via Supabase API:**
```bash
curl -s -X POST \
  "https://api.supabase.com/v1/projects/qdivfairxhdihaqqypgb/database/query" \
  -H "Authorization: Bearer sbp_38632a902ee36a28bfb42396bed19a667cffaead" \
  -H "Content-Type: application/json" \
  -d '{"query": "ALTER TABLE intimacoes DROP CONSTRAINT IF EXISTS intimacoes_ia_risco_nivel_check; ALTER TABLE intimacoes ADD CONSTRAINT intimacoes_ia_risco_nivel_check CHECK (ia_risco_nivel IN ('"'"'critico'"'"', '"'"'alto'"'"', '"'"'medio'"'"', '"'"'baixo'"'"', '"'"'info'"'"'));"}'
```

---

### 1.5 Criar/atualizar MEMORY.md da Cecília

**O arquivo `/Users/jarbas/.openclaw/workspace-cecilia/MEMORY.md` está VAZIO.**

Criar com o conteúdo essencial baseado no histórico das sessões:

```markdown
# CECILIA — Memória Operacional v1.0
> Atualizado: 2026-03-27 (lapidação JARBAS 2.0)

## Identidade
Sou a CECILIA ⚖️ — agente de monitoramento EPROC do escritório MP Advocacia.
Mac Mini M4. Grupo Telegram: -5108958349 (João Victor).
Notificações sistema: -5184596601.

## Skills (paths reais)
Todos os scripts estão em `~/jarbas/src/skills/`.
Lib compartilhada: `~/jarbas/src/lib/`
Script E2E testado: `~/jarbas/cecilia-e2e-v2.mjs`

## Estado do banco (2026-03-27)
- 14.642 processos cadastrados
- 7.184 processos_monitoramento ativos
- 5 OABs ativas: RS116571, RS131163, SC074025, SC075466, SP535101
- 0 intimações no controller (limpo)
- Tabela `ideias_joao` criada com campos: status, autor, categoria, impacto, complexidade
- `CECÍLIA_CLASSIFICADOR` em ai_prompts (prompt próprio, v1)

## Bugs P1 conhecidos
- [FIXAR] skill_login_eproc.mjs — campo senha hidden no Keycloak: usar `page.fill('[name=password]', senha)`
- [FIXAR] cecilia-e2e-v2.mjs — sempre setar ia_acao_recomendada ao inserir (não deixar null)
- [FIXAR] constraint ia_risco_nivel não aceita 'info' → mapear para 'baixo' ou adicionar à constraint

## Vault Obsidian
Path: `~/cecilia-vault/`
- `06-LOG-APRENDIZADO/treinamentos-joao.md` — treinamentos confirmados
- `08-IDEIAS/ideias-pendentes.md` — ideias do João

## Classificação de intimações (A-G)
A=Irrelevante | B=Ciência+Renúncia | C=Documental | D=Providência Jurídica
E=Estratégica | F=Recebimento Valores | G=Encerramento
61 regras ativas na tabela controller_regras_operacionais.

## Decisões ativas
- D-001: Nunca usar áudio TTS a não ser que João ou Christian pedir explicitamente
- D-002: Relatórios = bullets simples, sem tabelas markdown no Telegram
- D-003: Toda mensagem do João = registrar no vault + Supabase se for treino/ideia
- D-004: Branding = "MdLab" / "Sistema de Monitoramento Jurídico" (não mencionar nome do escritório)

## Equipe do escritório (para roteamento de atividades)
| Pessoa | Papel | Recebe |
|---|---|---|
| João Victor | Controller | alvarás, ciência, triagem, ideias |
| Christian Paz | Sócio CTO | sentenças procedentes, estratégico |
| Dra. Heloísa | Advogada Sênior | improcedentes, recursos |
| Dra. Stephanie | Advogada | bancos/financeiras |
| Leonardo | Advogado | Boa Vista, Mercado Pago |
| Marcelo/Yuri/Cairon | Jurídico | lojas, telefonia, energia |
| João Pedro/Carlos Daniel | Atendimento | documentos do cliente |
```

---

### 1.6 Corrigir E2E para sempre setar ia_acao_recomendada

**Arquivo:** `~/jarbas/cecilia-e2e-v2.mjs`

Localizar onde insere na tabela `intimacoes` e garantir que `ia_acao_recomendada` é sempre preenchido:

```javascript
// ADICIONAR ao objeto de insert (antes do insert no Supabase):
const IA_ACAO_MAP = {
  prazo: 'Verificar prazo processual e adotar medida cabível',
  decisao: 'Analisar decisão judicial e verificar recurso cabível',
  citacao: 'Responder à citação no prazo legal',
  despacho: 'Cumprir despacho judicial',
  sentenca: 'Analisar sentença e verificar recurso cabível',
  default: 'Verificar movimentação e adotar medida cabível'
};

// Ao montar o objeto para insert:
ia_acao_recomendada: IA_ACAO_MAP[tipo_evento] || IA_ACAO_MAP.default,
ia_risco_nivel: nivel === 'info' ? 'baixo' : nivel, // mapear info → baixo
```

---

## 🟡 FASE 2 — Curto Prazo (3–7 dias)

### 2.1 Criar `skill_cecilia_orquestrador.mjs`

**Path:** `/Users/jarbas/jarbas/src/skills/skill_cecilia_orquestrador.mjs`

**Lógica de detecção (pseudocódigo):**
```javascript
// Prioridade de detecção:
// 1. Sessão /treinar ativa → acumular na sessão
// 2. Sessão /ideia ativa → acumular na sessão
// 3. CNJ detectado (regex) → skill_cecilia_cnj_razao
// 4. Palavras de regra: "quando", "sempre que", "toda vez" → sugerir /treinar
// 5. Palavras de melhoria: "queria", "seria legal", "falta" → sugerir /ideia
// 6. Pergunta operacional → Claude com vault context
// 7. Padrão não reconhecido → Claude livre

const CNJ_REGEX = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/;

export async function detectarIntencao(texto) {
  if (CNJ_REGEX.test(texto)) return { tipo: 'cnj', cnj: texto.match(CNJ_REGEX)[0] };
  
  const palavrasRegra = ['quando', 'sempre que', 'toda vez', 'cada vez'];
  if (palavrasRegra.some(p => texto.toLowerCase().includes(p))) return { tipo: 'treino' };
  
  const palavrasIdeia = ['queria', 'seria legal', 'falta', 'deveria'];
  if (palavrasIdeia.some(p => texto.toLowerCase().includes(p))) return { tipo: 'ideia' };
  
  return { tipo: 'pergunta' };
}
```

**Após criar:** atualizar o bot da Cecília para usar o orquestrador no handler de mensagens.

---

### 2.2 Cron de captura (4x/dia)

**Configurar no OpenClaw via cron tool:**

```json
{
  "schedule": { "kind": "cron", "expr": "0 7,12,18,0 * * *", "tz": "America/Sao_Paulo" },
  "payload": { "kind": "agentTurn", "message": "Executar captura de intimações para todas as OABs — skill_monitorar_cron.mjs" }
}
```

**Jitter:** adicionar `Math.floor(Math.random() * 600000)` ms de delay no início de cada execução para não bater no pico dos tribunais.

---

### 2.3 Validação das classes C e D com João

**Ação pendente:** enviar mensagem para João no grupo `-5108958349` perguntando se prefere:
- Manter C unificada (documental) e D unificada (providência jurídica)  
- OU subdividir: C1 (juntar docs pelo cliente) / C2 (manifestação sobre docs da ré), D1 (prazo 10d) / D2 (prazo 15d+)

**Recomendação atual (JARBAS):** manter A-G e usar as 61 regras para diferenciar o comportamento interno — evita quebrar o prompt.

---

### 2.4 Invalidar cache regras + vault juntos

Hoje o `skill_treinar_sessao.mjs` invalida vault separado das regras. Precisam ser invalidados juntos.

Localizar em `skill_treinar_sessao.mjs` e `skill_cecilia_vault_context.mjs` as funções de invalidação e garantir que são chamadas em conjunto após confirmação de treinamento.

---

## 🔵 FASE 3 — Médio Prazo (1–2 semanas)

### 3.1 `skill_cecilia_rag_controller.mjs`

- Gemini `text-embedding-004` + Supabase pgvector
- Indexar: vault, `treinamentos-joao.md`, feedbacks, playbook
- Injetar top-3 casos similares no classificador como few-shot

### 3.2 Dashboard de qualidade

- % acerto por classe (A-G)
- % acerto por empresa ré
- % acerto por tribunal
- Gerar HTML e publicar em GitHub Pages

### 3.3 Agente Classificador com memória

- Substituir skill síncrona por agente com memória das últimas 50 classificações
- Modelo: `claude-sonnet-4-6`

---

## 📋 CHECKLIST DE EXECUÇÃO (Fase 1)

```
[ ] 1.1 Fix login EPROC (page.fill '[name=password]')
[ ] 1.2 Mover skill_cecilia_treino_joao.mjs para legacy/
[ ] 1.3 Criar src/lib/eproc-login.mjs wrapper
[ ] 1.4 Fix constraint ia_risco_nivel (adicionar 'info' ou mapear)
[ ] 1.5 Criar MEMORY.md completo para Cecília
[ ] 1.6 Fix cecilia-e2e-v2.mjs (ia_acao_recomendada sempre preenchido)
[ ] Testar E2E após fixes (50 processos RS116571)
[ ] Confirmar que intimações aparecem no Controller (filtro frontend)
```

---

## 🔑 CREDENCIAIS E ACESSO

```
Mac Mini (onde ficam os arquivos):
  SSH: jarbas@100.78.173.81 (Tailscale)
  ou:  jarbas@192.168.15.X (rede local)

Supabase:
  URL: https://qdivfairxhdihaqqypgb.supabase.co
  SUPABASE_ACCESS_TOKEN: sbp_38632a902ee36a28bfb42396bed19a667cffaead
  SUPABASE_KEY (service_role): eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkaXZmYWlyeGhkaWhhcXF5cGdiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTA3MzcwOCwiZXhwIjoyMDg2NjQ5NzA4fQ.zu_reCiKzCqLETOWxytYQmez1SIwFRDlOruzsLOpBeY

OpenClaw Cecília:
  Gateway: ws://localhost:18793 (porta local do Mac Mini)
  Workspace: /Users/jarbas/.openclaw/workspace-cecilia/
  Session key: agent:cecilia:main

Grupo Telegram Cecília (João Victor):
  chat_id: -5108958349

Grupo notificações sistema:
  chat_id: -5184596601
```

---

## ⚠️ REGRAS IMPORTANTES

1. **Nunca deletar** — mover para `legacy/` em vez de `rm`
2. **Antes de mexer em qualquer skill do JARBAS** — verificar se está registrada em `~/jarbas/start.mjs` e se afeta fluxos ativos
3. **Testes sempre em RS116571** — é a OAB de Christian, mais segura para testes
4. **Notificações do sistema** → grupo `-5184596601`, nunca no DM do Christian
5. **Branding** → sempre "MdLab" ou "Sistema de Monitoramento Jurídico", nunca citar nome do escritório

---

## 📎 ARQUIVOS DE REFERÊNCIA

| Arquivo | Path |
|---|---|
| SOUL.md Cecília | `/Users/jarbas/.openclaw/workspace-cecilia/SOUL.md` |
| PLAYBOOK Controller | `/Users/jarbas/.openclaw/workspace-cecilia/PLAYBOOK-CONTROLLER.md` |
| SKILL EPROC | `/Users/jarbas/.openclaw/workspace-cecilia/skills/eproc-monitor/SKILL.md` |
| Memória 27/03 | `/Users/jarbas/.openclaw/workspace-cecilia/memory/2026-03-27.md` |
| Script E2E | `~/jarbas/cecilia-e2e-v2.mjs` |
| Login EPROC | `~/jarbas/src/skills/skill_login_eproc.mjs` |
| Captura intimações | `~/jarbas/src/skills/skill_captura_intimacoes.mjs` |
| Orquestrador cron | `~/jarbas/src/skills/skill_monitorar_cron.mjs` |
| start.mjs (registro skills) | `~/jarbas/start.mjs` |

---

*Plano gerado por JARBAS (Mac Mini) em 2026-03-27 03:53 GMT-3*  
*Contexto absorvido: SOUL.md, TOOLS.md, PLAYBOOK, memory/2026-03-26, memory/2026-03-27*
