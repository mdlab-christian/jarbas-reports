# Missão: Migrar o Cérebro Jurídico da OlivIA

## Setup
- Você roda no MacBook Air. Toda execução é via `ssh mac-mini "cmd"`.
- Scripts prontos em: `/tmp/olivia-scripts/` no Mac Mini
- Node/credenciais no Mac Mini: `source ~/.nvm/nvm.sh && cd ~/jarbas && source .env`
- Supabase projeto: `qdivfairxhdihaqqypgb`
- Org Midas: `55a0c7ba-1a23-4ae1-b69b-a13811324735`
- Vault destino: `/Users/Shared/olivia-vault/` (pasta compartilhada macOS — sem sudo)
- Bucket destino: `olivia-modelos` (privado)

## Como executar cada etapa

```bash
# Padrão para rodar qualquer script no Mac Mini:
ssh mac-mini "source ~/.nvm/nvm.sh 2>/dev/null; cd ~/jarbas && node --env-file=.env /tmp/olivia-scripts/SCRIPT.mjs 2>&1 | tee /tmp/log-ETAPA.log"

# Verificar log:
ssh mac-mini "tail -50 /tmp/log-ETAPA.log"

# Ver erros:
ssh mac-mini "cat /tmp/erros-migracao.log 2>/dev/null || echo 'sem erros'"
```

## Etapas — executar em ordem

### Etapa A — Setup (~10min) — FAZER PRIMEIRO
```bash
ssh mac-mini "bash /tmp/olivia-scripts/setup-cerebro.sh"
```
Critério de sucesso: bucket criado + vault criado + Drive export HTTP 200.
Se Drive retornar diferente de 200: corrigir o token antes de continuar.

### Etapa B — Modelos (~3h)
```bash
ssh mac-mini "source ~/.nvm/nvm.sh 2>/dev/null; cd ~/jarbas && nohup node --env-file=.env /tmp/olivia-scripts/etapa-b-modelos.mjs > /tmp/log-b-modelos.log 2>&1 &"
ssh mac-mini "echo PID: $!"
```

### Etapa C — Blocos (~2h) — pode rodar junto com B
```bash
ssh mac-mini "source ~/.nvm/nvm.sh 2>/dev/null; cd ~/jarbas && nohup node --env-file=.env /tmp/olivia-scripts/etapa-c-blocos.mjs > /tmp/log-c-blocos.log 2>&1 &"
```

### Etapa D — Jurisprudências (~2h) — pode rodar junto com B e C
```bash
ssh mac-mini "source ~/.nvm/nvm.sh 2>/dev/null; cd ~/jarbas && nohup node --env-file=.env /tmp/olivia-scripts/etapa-d-juris.mjs > /tmp/log-d-juris.log 2>&1 &"
```

### Etapa E — Tags (~5min) — após B+C+D concluídos
```bash
ssh mac-mini "source ~/.nvm/nvm.sh 2>/dev/null; cd ~/jarbas && node --env-file=.env /tmp/olivia-scripts/etapa-e-tags.mjs 2>&1 | tee /tmp/log-e-tags.log"
```

### Etapa F — Playbooks (~30min) — após B+C+D concluídos
```bash
ssh mac-mini "source ~/.nvm/nvm.sh 2>/dev/null; cd ~/jarbas && node --env-file=.env /tmp/olivia-scripts/etapa-f-playbooks.mjs 2>&1 | tee /tmp/log-f-playbooks.log"
```

### Etapa G — RAG Rebuild (~45min) — ÚLTIMA etapa
```bash
ssh mac-mini "source ~/.nvm/nvm.sh 2>/dev/null; cd ~/jarbas && node --env-file=.env /tmp/olivia-scripts/etapa-g-rag.mjs 2>&1 | tee /tmp/log-g-rag.log"
```

## Regras de erro

- Se script retornar erro de `Cannot find module '@supabase/supabase-js'`:
  ```bash
  ssh mac-mini "cd ~/jarbas && npm install @supabase/supabase-js"
  ```
  Então reexecutar o script.

- Se Drive export falhar sistematicamente (todos 403):
  ```bash
  ssh mac-mini "source ~/jarbas/.env && curl -s -X POST 'https://oauth2.googleapis.com/token' -d 'client_id='$GOOGLE_CLIENT_ID'&client_secret='$GOOGLE_CLIENT_SECRET'&refresh_token='$GOOGLE_REFRESH_TOKEN'&grant_type=refresh_token' | python3 -c 'import sys,json; print(json.load(sys.stdin))'"
  ```
  Se retornar `error: invalid_grant` — o refresh_token expirou. Notificar Christian.

- Se bucket já existir (erro 409): ignorar, continuar.

- Se script travar sem output por mais de 5min:
  ```bash
  ssh mac-mini "ps aux | grep etapa"
  ssh mac-mini "tail -5 /tmp/log-ETAPA.log"
  ```
  Se processo morreu: reexecutar a partir do ponto que parou (upsert:true no bucket — arquivos já enviados são sobrescritos ok).

- Erros 429 (rate limit Drive): já tratados nos scripts (retry 10s). Se persistir — adicionar `await sleep(2000)` no loop e reexecutar.

## Monitorar progresso

```bash
# Ver todos os logs de uma vez:
ssh mac-mini "tail -5 /tmp/log-b-modelos.log /tmp/log-c-blocos.log /tmp/log-d-juris.log 2>/dev/null"

# Verificar se processos ainda rodam:
ssh mac-mini "ps aux | grep 'etapa-[bcd]' | grep -v grep"

# Contar arquivos no bucket (via Supabase API):
ssh mac-mini "source ~/jarbas/.env && curl -s 'https://qdivfairxhdihaqqypgb.supabase.co/storage/v1/object/list/olivia-modelos' -H 'Authorization: Bearer '\$SUPABASE_KEY -d '{\"prefix\":\"modelos/\",\"limit\":1,\"offset\":0}' -H 'Content-Type: application/json' | python3 -c 'import sys,json; d=json.load(sys.stdin); print(type(d), len(d) if isinstance(d,list) else d)'"
```

## Notificações Telegram

Os scripts já enviam heartbeat a cada 2min e notificação de conclusão via bot do JARBAS para o Christian (ID: 1307075495). Você não precisa fazer nada além de monitorar os logs quando quiser.

## Relatório final

Ao concluir a Etapa G, gerar relatório:
```bash
ssh mac-mini "cat > /Users/Shared/olivia-vault/RELATORIO.md << 'EOF'
# Relatório Migração OlivIA — $(date +%Y-%m-%d)

## Status por etapa
$(tail -3 /tmp/log-b-modelos.log 2>/dev/null)
$(tail -3 /tmp/log-c-blocos.log 2>/dev/null)
$(tail -3 /tmp/log-d-juris.log 2>/dev/null)
$(tail -3 /tmp/log-e-tags.log 2>/dev/null)
$(tail -3 /tmp/log-f-playbooks.log 2>/dev/null)
$(tail -3 /tmp/log-g-rag.log 2>/dev/null)

## Erros encontrados
$(cat /tmp/erros-migracao.log 2>/dev/null || echo 'Nenhum erro registrado')
EOF"
ssh mac-mini "cat /Users/Shared/olivia-vault/RELATORIO.md"
```
