# Jarbas 2.0 → Claude Code — Contexto Completo
> Gerado em: 30/03/2026, 23:50:06 (America/Sao_Paulo)
> **Projeto sendo migrado:** Cecília 2.0 — Worker EPROC

---

## 1. Identidade do Agente

- **Nome:** Jarbas 2.0 🐙
- **Hardware:** MacBook Air M4 16GB / 228GB
- **Usuário macOS:** `christian`
- **Porta OpenClaw:** 18790
- **Modelo:** claude-sonnet-4-6
- **Papel:** CTO e Master Bot de Christian Paz. Supervisor de toda a rede (OlivIA, Cecília, Beto, Jarbinhas, JANA).
- **Substitui:** JANA (legado) e JARBAS antigo.

---

## 2. Ferramentas e Acesso

### SSH — Rede de Agentes
```bash
ssh mac-mini-tail "cmd"         # Mac Mini — Tailscale (PREFERIDO)
ssh mac-mini "cmd"              # Mac Mini — LAN (pode ter timeout)
ssh mac-mini-tail "sudo cmd"    # Admin no Mac Mini (senha: 010597)
```

### Usuários no Mac Mini
| Usuário | UID | Papel |
|---|---|---|
| cecilia | 506 | Monitora EPROC (5 OABs) |
| olivia | — | Jurídico + intimações |
| beto | — | Agente do Gustavo |
| jarbas | — | JARBAS legado (n8n ativo) |

### Playwright no Mac Mini (como cecilia)
```bash
# Único padrão que funciona:
ssh mac-mini-tail 'echo "010597" | sudo -S launchctl asuser 506 /bin/bash -c \
  "export PATH=/opt/homebrew/bin:\$PATH; \
   export HOME=/Users/cecilia; \
   export PLAYWRIGHT_BROWSERS_PATH=/Users/cecilia/.playwright-browsers; \
   nohup node /Users/cecilia/cecilia-skills/src/skills/script.mjs \
   > /tmp/script.log 2>&1 &"'
# Aguardar ~70s e ler: ssh mac-mini-tail 'cat /tmp/script.log'
# IMPORTANTE: stdout não propaga via launchctl — usar appendFileSync para logs
```

### Upload de arquivo para Mac Mini
```bash
cat > /tmp/script.mjs << 'SCRIPT'
[conteúdo]
SCRIPT
scp /tmp/script.mjs mac-mini-tail:/tmp/script.mjs
ssh mac-mini-tail 'sudo cp /tmp/script.mjs /Users/cecilia/cecilia-skills/src/skills/script.mjs \
  && sudo chown cecilia:staff /Users/cecilia/cecilia-skills/src/skills/script.mjs'
```

### Supabase
```bash
source ~/.env
# Query via Management API:
curl -s -X POST \
  "https://api.supabase.com/v1/projects/qdivfairxhdihaqqypgb/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT * FROM tabela LIMIT 5"}' | jq
```
- **Projeto:** `qdivfairxhdihaqqypgb`
- **Org ID Midas:** `55a0c7ba-1a23-4ae1-b69b-a13811324735`

### n8n
```bash
source ~/.env
# Listar workflows:
curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" "$N8N_BASE_URL/api/v1/workflows" | jq '.data[] | {id, name, active}'
```
- **URL:** https://primary-production-e209.up.railway.app

### GitHub Pages (relatórios HTML)
```bash
cd ~/jarbas-reports
git add jarbas2/arquivo.html
git commit -m "descrição"
git push
# URL: https://mdlab-christian.github.io/jarbas-reports/jarbas2/arquivo.html
```

---

## 3. Credenciais (paths — não valores)

Arquivo principal: `~/.env` no MacBook Air (`/Users/christian/.env`)
Arquivo Cecília: `/Users/cecilia/.env` no Mac Mini

```bash
# Variáveis disponíveis:
SUPABASE_URL                # URL do projeto Supabase
SUPABASE_KEY                # service_role key
SUPABASE_ACCESS_TOKEN       # Management API token
ANTHROPIC_API_KEY           # Claude API
OPENAI_API_KEY              # Whisper / GPT
GEMINI_API_KEY              # Gemini
N8N_API_KEY                 # n8n REST API
N8N_BASE_URL                # https://primary-production-e209.up.railway.app
TELEGRAM_BOT_TOKEN          # Bot Jarbas 2.0
MDFLOW_TEST_EMAIL           # mdlab.equipe@gmail.com
MDFLOW_TEST_PASSWORD        # senha teste MdFlow
ORG_ID                      # 55a0c7ba-1a23-4ae1-b69b-a13811324735 (Midas)
```

Carregar no script:
```javascript
import { readFileSync } from 'fs';
const env = Object.fromEntries(
  readFileSync('/Users/christian/.env', 'utf8')   // ou /Users/cecilia/.env no Mac Mini
    .split('\n').filter(l => l.includes('='))
    .map(l => l.split('=').map(s => s.trim()))
);
```

---

## 4. Skills Disponíveis (OpenClaw)

- **21st-dev**: Busca e gera componentes UI/UX de alta qualidade via 21st.dev Magic MCP antes de implementar do zero
- **apple-notes**: Manage Apple Notes via the `memo` CLI on macOS (create, view, edit, delete, search, move, and export
- **apple-reminders**: Manage Apple Reminders via the `remindctl` CLI on macOS (list, add, edit, complete, delete). Support
- **cc-paralelo**: Paraleliza tarefas entre JANA e JARBAS via Claude Code quando a tarefa cruza domínios (frontend + ba
- **cc-prompt-gen**: Gera prompts estruturados para Claude Code com contexto completo (stack, arquivos, critérios de suce
- **cost-report**: Track OpenClaw usage costs and provide detailed reports by date and model. Supports daily, weekly, a
- **distribuicao-master**: Coordenador principal de todas as distribuições EPROC — roteia para a skill OAB específica (RS/SC/SP
- **frontend**: Guia de desenvolvimento frontend com React, Next.js e Tailwind CSS — landing pages, dashboards, form
- **gerenciador-projetos**: Gerencia projetos e ideias da JARBAS Network — criação, planejamento, execução em loop, acompanhamen
- **git-essentials**: Referência completa de comandos Git para controle de versão, branching e colaboração. Cobre staging,
- **ideias**: Captura ideias avulsas e salva no banco jana_ideias do Supabase com título, descrição, categoria, au
- **jarbas-tasks**: Enfileira tarefas no JARBAS via fila jarbas_tarefas. Use quando: "cc: [prompt]" (executar Claude Cod
- **kb-collector**: Coleta e salva YouTube, URLs e texto no Obsidian com transcrição automática e sumarização por IA. Su
- **mdflow**: Consultar o banco de dados do MdFlow (Supabase) — processos, clientes, movimentações, tarefas e KPIs
- **migrar-cc**: Gera um arquivo .md completo e autocontido para transferir contexto do Jarbas 2.0 ao Claude Code. O 
- **model-usage**: Use CodexBar CLI local cost usage to summarize per-model usage for Codex or Claude, including the cu
- **n8n-monitor**: Monitora operacionalmente o N8N via Docker — verifica status de containers, lê logs recentes, checa 
- **obsidian**: Work with Obsidian vaults (plain Markdown notes) and automate via obsidian-cli. homepage: https://he
- **openai-whisper-api**: Transcribe audio via OpenAI Audio Transcriptions API (Whisper). homepage: https://platform.openai.co
- **page-ideas**: Registra, lista, aprova e resolve ideias de melhoria para páginas do MdFlow (features, agentes, auto
- **pdf-extract**: Extrai texto de arquivos PDF para processamento por LLMs usando pdftotext (poppler-utils). Suporta e
- **pdf-ocr**: PDF扫描件转Word文档。支持中文OCR识别，自动裁掉页眉页脚，保留插图，彩色章节封面页保留为图片。使用百度OCR API（免费额度1000次/月）。当用户要求把扫描PDF转成文字/Word时触发。
- **playwright**: Automação de browser e web scraping com Playwright. Preenche formulários, tira screenshots, extrai d
- **reconstrucao-pagina**: Reconstrução completa de página MdFlow do zero — Lapidação Turbo v1.0. Use quando: página com score 
- **security-audit**: Comprehensive security auditing for Clawdbot deployments. Scans for exposed credentials, open ports,
- **self-improving**: "Self-reflection + Self-criticism + Self-learning + Self-organizing memory. Agent evaluates its own 
- **session-logs**: Search and analyze your own session logs (older/parent conversations) using jq.
- **sonoscli**: Control Sonos speakers (discover/status/play/volume/group). homepage: https://sonoscli.sh
- **spec**: Gera SPECs completas e autocontidas para projetos MdFlow — absorve contexto (áudios, mensagens, repo
- **summarize**: Sumariza URLs, arquivos locais e vídeos YouTube via CLI summarize. Suporta PDFs, imagens, áudio e pá
- **supabase-ops**: Gerencia operações Supabase e PostgreSQL: migrations, geração de tipos TypeScript, RLS policies e ed
- **system-resource-monitor**: Monitor de recursos do sistema — CPU load (1/5/15 min), RAM, Swap e disco. Otimizado para OpenClaw, 

---

## 5. Projetos em Andamento

---
tags: [jarbas2, projetos, ativo]
atualizado: 2026-03-26
---

# Projetos Ativos — Jarbas 2.0

> Atualizar após cada sessão de trabalho.

## 🔴 Bloqueado / Pendente

| Projeto | Etapa atual | Próxima ação |
|---|---|---|
| **Setup Jarbas 2.0** | Passo 5/12 | Instalar OpenClaw porta 18790 |

## 🟡 Em Andamento

| Projeto | Última atividade | Status |
|---|---|---|
| **MdFlow CRM** | 2026-03-26 | Em evolução contínua |
| **OlivIA v3** | 2026-03-26 | Geração de relatórios HTML implementada |
| **Cecília Controller** | 2026-03-26 | Online, pipeline automático ativo |

## 🟢 Operacional (monitorar)

| Sistema | Status | Onde |
|---|---|---|
| n8n workflows | Rodando | Mac Mini |
| OlivIA server | Rodando | Mac Mini (porta 19100) |
| Cecília controller | Rodando | Mac Mini (launchd) |
| JARBAS legado | Ativo | Mac Mini (porta 18789) |

---

_Atualizar sempre que um projeto muda de status._


---

## 6. Regras P0 e Anti-patterns

### Confirmar SEMPRE (P0)
- DELETE em produção
- `git push --force`
- Migrations irreversíveis
- Ações que afetam clientes do Midas (~5.800 processos)
- Matar agentes em produção

### Executar direto (não-P0)
- Bug fix óbvio, edições de config, tarefas sem ambiguidade

### Anti-patterns (NUNCA fazer)
- Hardcodar credenciais — tudo via .env com chmod 600
- Usar `keyboard.type()` para senhas com caracteres especiais no Keycloak (usar native setter)
- Fazer 2 sessões Playwright simultâneas para mesma OAB EPROC
- Construir URLs EPROC manualmente sem hash de sessão
- Fire and forget em processos críticos — sempre aguardar resultado
- `sudo tee` para criar arquivos (cria vazio) — usar `sudo python3 -c "open(...).write(...)"`

### Delays anti-bot
- Entre processos EPROC: 800–2500ms (`humanDelay`)
- Entre OABs: 5 minutos (`longDelay`)

---

## 7. Comandos Prontos

### Rodar skill no Mac Mini como cecilia
```bash
ssh mac-mini-tail 'echo "010597" | sudo -S launchctl asuser 506 /bin/bash -c \
  "export PATH=/opt/homebrew/bin:\$PATH HOME=/Users/cecilia \
   PLAYWRIGHT_BROWSERS_PATH=/Users/cecilia/.playwright-browsers; \
   nohup node /Users/cecilia/cecilia-skills/src/skills/SCRIPT.mjs > /tmp/SCRIPT.log 2>&1 &"'
sleep 80 && ssh mac-mini-tail 'cat /tmp/SCRIPT.log'
```

### Query Supabase via curl
```bash
source ~/.env && curl -s -X POST \
  "https://api.supabase.com/v1/projects/qdivfairxhdihaqqypgb/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"QUERY_AQUI"}' | jq
```

### Publicar HTML no GitHub Pages
```bash
cd ~/jarbas-reports && git add jarbas2/ && git commit -m "msg" && git push
```

### Reiniciar agente no Mac Mini
```bash
# Cecília (UID 506):
ssh mac-mini-tail 'echo "010597" | sudo -S launchctl kickstart -k gui/506/ai.cecilia.skills'
# OlivIA:
ssh mac-mini-tail 'echo "010597" | sudo -S -u olivia launchctl kickstart -k gui/$(id -u olivia)/ai.olivia.gateway'
```

---

## 8. Contexto Atual

### Memória recente
### 2026-03-30.md
coding launchctl)

### HTML Definitivo Unificado Publicado

**Arquivo:** `cecilia2-projeto-definitivo-20260330.html` (commit `105080a`)
**URL:** https://mdlab-christian.github.io/jarbas-reports/jarbas2/cecilia2-projeto-definitivo-20260330.html

**Conteúdo do HTML unificado:**
1. E2E validado ao vivo (resultados completos)
2. Arquitetura (worker único, 3 ciclos/dia, timeline)
3. Backend (4 tabelas novas, 2 alterações, SQL reset circuit breakers)
4. Fluxo corrigido (GAP XLS sem href resolvido: busca CNJ via campo pesquisa)
5. 8 skills (mapa completo)
6. Regras João (taxonomia A-G, R_JV01–R_JV05)
7. Gaps mapeados + soluções
8. Arquivos .md (o que criar)
9. 9 etapas com checkpoints
10. 7 Prompts CC copiáveis e self-contained

### Decisões Definitivas desta Sessão

| Decisão | Detalhe |
|---|---|
| URL lista movimentações | `relatorio_processo_procurador_listar&ord_ultimas_movimentacoes=S&...&hash={sessionHash}` |
| gerarExcel() | `Promise.all([waitForEvent('download'), evaluate(()=>gerarExcel())])` |
| Senha Keycloak | Native setter (NÃO keyboard.type, NÃO fill()) |
| TOTP | Condicional — isVisible() com timeout |
| Redirect SSO | Loop 8x 2s aguardando sair de entrar_sso |
| Perfil | `locator('text=ADVOGADO-TITULAR').first().click()` |
| XLS sem href | Buscar CNJ via `#inpPesquisarProcesso` para capturar href do DOM |
| Hash doc | Cada documento tem hash próprio — nunca usar sessionHash para docs |
| Grupo notificações | -5184596601 |
| Delay entre processos | 800–2500ms humanDelay |
| Pausa entre OABs | 5min |
| Cache sessão | cecilia_session_cache TTL 14min |

### Estado Final — Pronto para Execução

| Item | Status |
|---|---|
| E2E RS116571 | ✅ Completo e validado |
| HTML projeto definitivo | ✅ Publicado |
| 7 Prompts CC | ✅ Prontos no HTML |
| 4 OABs circuit breaker | ⏳ Resetar na Etapa 1 |
| RS131163 (Heloísa) | ⏳ Credenciais ausentes — perguntar Christian |
| Migrations (4 tabelas) | ⏳ Etapa 1 |
| Execução (modo 1/2/3) | ⏳ Christian define quando quer começar |


### Pendências abertas
# Pendências — Jarbas 2.0
> Última atualização: 2026-03-27 22:00 GMT-3 (consolidação automática)

---

## 🔴 P0 — Urgente

- [ ] **Resetar circuit breaker OABs (exceto RS116571)** — RS116571 já reativada. Demais (RS131163, SC075466, SC074025, SP535101): reativar APÓS fix funcionar no RS116571. SQL: `UPDATE jarbas_accounts SET ativo=true, login_falhas_consecutivas=0, ultimo_erro=null, monitoramento_ativo=true WHERE organizacao_id='55a0c7ba-1a23-4ae1-b69b-a13811324735'`
- [ ] **Instalar Playwright/Chromium no usuário cecilia do Mac Mini** — Chromium instalado mas crasha via sudo (SIGTRAP/Gatekeeper). Solução: rodar via LaunchAgent da cecilia, não sudo interativo. `PLAYWRIGHT_BROWSERS_PATH=/Users/cecilia/.playwright-browsers`
- [ ] **Confirmar/criar consumer `analise_profunda`** em task-consumer da Cecília — tarefas desse tipo acumulam em `pendente` sem handler
- [ ] **61 clientes ADVBOX errados** — API ADVBOX não suporta trocar customer via PUT (confirmado 60 tentativas). Decisão pendent


## Contexto Extra
--projeto

---

## 9. Formato de Relatório (ao finalizar)

Após completar qualquer tarefa, reportar:

### ✅ O que foi feito
- [arquivo/ação]: [o que mudou e por quê]

### 📁 Arquivos criados/modificados
- [paths completos]

### 🧪 Como testar
- [passos exatos]

### ⚠️ O que precisa revisão manual
- [lista]

### ❌ O que não foi feito (e por quê)
- [se algo ficou de fora]

### ⏭️ Próximo passo sugerido
- [o que fazer depois]
