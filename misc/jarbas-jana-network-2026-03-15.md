# JARBAS + Jana OS — Network Architecture
**Data:** 2026-03-15 | **Autor:** JARBAS v2.6.0

---

## Contexto

Este documento descreve a arquitetura de dois computadores trabalhando em conjunto para automação jurídica e operacional do escritório MP Advocacia (MdLab LegalTech). O sistema foi construído ao longo de semanas e está em produção ativa.

**Pergunta para você (Claude):** Ao final, avalie sinceramente se essa arquitetura faz sentido, se está funcionando bem, se tem buracos, e se justificou a compra do segundo computador (MacBook Air).

---

## As duas máquinas

### Mac Mini M4 — "JARBAS" (servidor principal)
- **Hardware:** Apple Mac Mini M4, 16GB RAM, 256GB SSD
- **Papel:** Servidor de produção 24/7 — nunca dorme
- **IP Tailscale:** `100.78.173.81`
- **O que roda aqui:**
  - JARBAS (Node.js, 86 skills registradas)
  - OpenClaw gateway (bridge Telegram → Claude Sonnet 4.6)
  - Task consumer com 4 workers paralelos
  - Cérebro Documental (processa 8.600+ processos judiciais 24/7 via EPROC)
  - Webhook server (OlivIA, n8n callbacks)
  - Heartbeat monitor (a cada 60s)

### MacBook Air — "Jana" (worker/watchdog)
- **Hardware:** MacBook Air (ARM), 16GB RAM, 256GB SSD
- **Papel:** Worker paralelo + watchdog do Mac Mini
- **IP Tailscale:** `100.101.208.82`
- **O que está instalado:**
  - Node.js v25.8.1
  - Claude Code 2.1.76
  - OpenClaw 2026.3.13
  - beta-mdflow clonado (`/Users/jarbas/beta-mdflow`)
  - JARBAS backend (`/Users/jarbas/jarbas/src/`)
  - `.env` completo com todas as credenciais (Supabase, n8n, Anthropic, OpenAI, etc.)
  - 30 agentes Claude especializados (`~/.claude/agents/`)
  - Script `~/bin/jarbas-rescue.sh`

---

## Rede entre as máquinas

Ambas estão conectadas via **Tailscale** (VPN mesh P2P). Isso significa:
- Comunicam diretamente mesmo em redes diferentes (casa, escritório, 4G)
- Latência ~5-10ms
- Autenticação por chave SSH (sem senha)

### Direção do SSH
- ✅ **Mini → Air:** `ssh jarbas@100.101.208.82` — o Mini acessa a Jana para delegar tarefas
- ✅ **Air → Mini:** `ssh jarbas@100.78.173.81` — a Jana acessa o Mini para monitorar/resgatar

A autenticação do GitHub foi configurada hoje com chave SSH própria na Jana (sem depender do agente do Mini).

---

## O mecanismo de Rescue

### Problema que resolve
Quando o JARBAS trava (processo morto, gateway caído, Chromiums zumbis consumindo RAM), o Telegram para de responder. Christian precisaria abrir um terminal manualmente para reiniciar.

### Como funciona o `/rescue`
Christian digita `/rescue full` no Telegram. O que acontece:

```
Telegram → OpenClaw → JARBAS (Mini) recebe o comando
JARBAS executa skill_acesso_remoto.mjs com acao='rescue'
skill faz SSH da Jana → Mini:
  ~/bin/jarbas-rescue.sh full
    1. pkill -f 'src/start.mjs'     # mata JARBAS
    2. pkill -f 'Google Chrome for Testing'  # mata Chromiums zumbis
    3. openclaw gateway restart      # reinicia o gateway
    4. npm start                     # sobe o JARBAS novamente
```

**Ironia:** O JARBAS aciona a Jana para que ela ressuscite o próprio JARBAS. Se o Mini estiver completamente morto, isso não funciona — mas cobre 90% dos cenários de travamento (processo morto, não hardware morto).

### Comandos disponíveis via Telegram
| Comando | O que faz |
|---------|-----------|
| `/rescue status` | Ver processos, gateway, últimas 5 tarefas |
| `/rescue restart` | Reiniciar JARBAS sem matar gateway |
| `/rescue kill` | Matar JARBAS + Chromiums travados |
| `/rescue gateway` | Reiniciar só o OpenClaw |
| `/rescue full` | Rescue completo (kill + gateway + restart) |
| `/rescue logs` | Últimas linhas do log |

---

## O Cérebro Documental

Para contextualizar a carga do sistema: o JARBAS está rodando um pipeline chamado "Cérebro Documental" que:

1. A cada 10 minutos, verifica processos judiciais pendentes de análise
2. Loga no EPROC (sistema judicial) usando Playwright/Chromium
3. Navega cada processo, extrai movimentações e documentos
4. Baixa PDFs relevantes, extrai texto, analisa com IA (Claude)
5. Salva jurimetria no Supabase

**Volume atual:** TJRS=6.375 + TJSC=715 + TJSP=1.542 = **8.632 processos pendentes**

Esse pipeline roda 24/7 no Mini e consome bastante RAM (Chromium por OAB aberta). Por isso faz sentido ter a Jana livre para tarefas de desenvolvimento.

### Circuit Breaker (implementado hoje)
Descobrimos que o circuit breaker do Cérebro era em memória — ao reiniciar o JARBAS, ele resetava e voltava a tentar contas com credenciais inválidas em loop. Corrigimos hoje: estado agora persiste no Supabase (`jarbas_config`).

---

## O que foi feito hoje (2026-03-15)

| Problema | Diagnóstico | Fix |
|----------|-------------|-----|
| Tabela `jarbas_gastos_ia` inexistente | Migration nunca aplicada | Criada via Management API |
| Circuit breaker resetava no restart | Estado em memória volátil | Migrado para `jarbas_config` no Supabase |
| SC074025 em loop de erros (16x) | Conta desativada, cron ignorava | Removida do `CEREBRO_OABS` temporariamente |
| Tarefas travadas em `em_andamento` | SIGTERM no restart não limpava | Marcadas como erro pelo immune system |
| Jana sem acesso ao GitHub | Chave SSH não cadastrada | Chave adicionada via `gh ssh-key add` |
| Jana não conseguia resgatar o Mini | SSH Air→Mini não testado | Configurado + script rescue + comando `/rescue` |

---

## Stack completo

| Componente | Tecnologia |
|------------|------------|
| Backend JARBAS | Node.js ESM, 86 skills |
| Mensageria | Telegram → OpenClaw → Claude Sonnet 4.6 |
| Banco de dados | Supabase (PostgreSQL) — `qdivfairxhdihaqqypgb` |
| Automação judicial | Playwright + Chromium (EPROC TJRS/TJSC/TJSP) |
| Workflows | n8n (Railway) |
| Frontend | React + TypeScript + Vite (beta-mdflow) |
| Rede | Tailscale VPN mesh |
| IA | Claude Sonnet 4.6 (chat), Claude Code 2.1.76 (dev), Gemini (vídeo), GPT-4o (Whisper) |
| Relatórios | GitHub Pages (`mdlab-christian/jarbas-reports`) |

---

## Pergunta para você

Agora que você entende a arquitetura, avalie:

1. **Faz sentido ter dois computadores?** O Mini é servidor 24/7, o Air é worker/watchdog. Vale o custo?
2. **O mecanismo de rescue é robusto?** Tem pontos cegos óbvios?
3. **O circuit breaker no Supabase é a abordagem certa?** Alternativas melhores?
4. **Tem algo que você faria diferente?** Arquitetura, segurança, monitoramento?
5. **Avaliação geral:** esse setup está maduro ou ainda é muito frágil para produção real?

Seja direto e crítico — o objetivo é melhorar, não validar.
