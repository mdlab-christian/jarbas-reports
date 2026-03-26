# CC Prompt Master — Advbox Full Sync
> Para rodar no Claude Code direto, sem intervenção humana.
> Diretório: ~/jarbas/scripts/

---

## PROMPT MASTER (cole inteiro no Claude Code)

```
Você vai executar uma missão completa de sincronização Advbox ↔ MdFlow.
Siga os passos em ordem. Não pare entre eles. Resolva erros antes de avançar.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTEXTO GERAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Diretório de trabalho: ~/jarbas/scripts/
Scripts criados: advbox-pareamento-retroativo.mjs, advbox-sync-parte-contraria.mjs,
                 create-n8n-advbox-workflow.mjs, advbox-fire-and-forget.mjs, advbox-auditoria-final.mjs

O .env com credenciais está no JARBAS (servidor remoto 100.78.173.81, user jarbas).
Você vai buscar as credenciais via SSH e criar um .env local antes de rodar qualquer script.

API Advbox:
  Base: https://app.advbox.com.br/api/v1
  Headers obrigatórios: Authorization: Bearer TOKEN, X-Requested-With: XMLHttpRequest,
                        User-Agent: Mozilla/5.0, Accept: application/json
  Rate limit: 2500ms entre requests. Se 429 → aguardar 65s e retry.

Supabase:
  Projeto: qdivfairxhdihaqqypgb
  URL: https://qdivfairxhdihaqqypgb.supabase.co

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PASSO 0 — SETUP: Buscar credenciais e preparar ambiente
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Via SSH, leia as credenciais do JARBAS:
   ssh jarbas@100.78.173.81 "cat ~/jarbas/.env | grep -E 'ADVBOX_API_TOKEN|SUPABASE_URL|SUPABASE_KEY|N8N_API_KEY|N8N_BASE_URL|TELEGRAM_BOT_TOKEN|TELEGRAM_CHAT_ID'"

2. Crie o arquivo ~/jarbas/scripts/.env com as variáveis obtidas (mesmos valores exatos).
   Adicione também: SUPABASE_URL=https://qdivfairxhdihaqqypgb.supabase.co

3. Verifique se os node_modules necessários estão disponíveis:
   - @supabase/supabase-js → se não houver em ~/jarbas/, procure em ~/beta-mdflow/node_modules/
   - dotenv

   Se ~/jarbas/scripts/ não tiver node_modules:
     cd ~/jarbas/scripts && npm init -y && npm install @supabase/supabase-js dotenv

4. Confirme que o ADVBOX_API_TOKEN está ativo:
   Rode: node -e "
     import('dotenv/config');
     const r = await fetch('https://app.advbox.com.br/api/v1/settings', {
       headers: {
         'Authorization': 'Bearer ' + process.env.ADVBOX_API_TOKEN,
         'X-Requested-With': 'XMLHttpRequest',
         'User-Agent': 'Mozilla/5.0',
         'Accept': 'application/json'
       }
     });
     console.log('Status:', r.status);
   " --input-type=module
   
   Se retornar 403: o token expirou. Faça login via Playwright no Advbox
   (joao@perinottipazadvogados.com / Joao1234@) e capture o novo Bearer token
   interceptando requests, depois atualize o .env.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PASSO 1 — PAREAMENTO RETROATIVO (583 processos)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

cd ~/jarbas/scripts/

Antes de rodar, leia o script para entender a estrutura e corrija se necessário:
- Confirme que carrega .env do diretório correto (~/jarbas/scripts/.env)
- Confirme que o dotenv path está resolvendo certo

Execução:
  node advbox-pareamento-retroativo.mjs --dry-run --limit=5
  → Analise o output. Se tudo OK:
  node advbox-pareamento-retroativo.mjs --limit=50
  → Se sem erros:
  node advbox-pareamento-retroativo.mjs
  → Aguarde conclusão completa.

Critério de sucesso: log mostra "✅ Pareado" ou "➕ Criado" para a maioria dos processos.
Erros aceitáveis: processos com CNJ inválido ou sem número serão pulados.
NÃO avance se houver erros de credencial ou de conexão.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PASSO 2 — BACKFILL PARTE CONTRÁRIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  node advbox-sync-parte-contraria.mjs --dry-run --limit=10 --fase=1
  → Analise. Se OK:
  node advbox-sync-parte-contraria.mjs --fase=todas
  → Aguarde conclusão completa.

Critério de sucesso: as 3 fases concluem sem erro fatal.
Fase 1: preenche empresa_re no Supabase a partir do Advbox
Fase 2: cadastra empresa ré no Advbox para processos que só têm no MdFlow
Fase 3: relatório de intimações ainda problemáticas

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PASSO 3 — CRIAR WORKFLOW N8N (autocadastro futuro)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  node create-n8n-advbox-workflow.mjs

Critério de sucesso: imprime URL do webhook gerado e "Workflow ativado".
Se o workflow N8N-ADVBOX-POST-DIST já existir: não recriar, apenas imprimir a URL.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PASSO 4 — AUDITORIA FINAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  node advbox-auditoria-final.mjs

Critério de sucesso:
- Gera HTML de relatório
- Publica no GitHub Pages (mdlab-christian/jarbas-reports)
- Envia link via Telegram

Para publicar no GitHub: o script usa ~/jarbas/scripts/publish-report.mjs.
Verifique se existe: ls ~/jarbas/scripts/publish-report.mjs
Se não existir, publique manualmente:
  cp {arquivo-html} ~/jarbas-reports/advbox-auditoria-final.html
  cd ~/jarbas-reports && git add . && git commit -m "auditoria advbox final" && git push

Para push funcionar, use o token GH:
  gh auth token  → pegar token
  git remote set-url origin https://x-access-token:{TOKEN}@github.com/mdlab-christian/jarbas-reports.git
  git push
  git remote set-url origin https://github.com/mdlab-christian/jarbas-reports.git

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AO FINAL: Envie mensagem via Telegram com o resumo
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Envie para TELEGRAM_CHAT_ID (variável do .env):

POST https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage
{
  "chat_id": "{TELEGRAM_CHAT_ID}",
  "text": "✅ Advbox Sync concluído!\n\n📊 Pareados: X\n➕ Criados no Advbox: X\n🏢 Partes contrárias preenchidas: X\n⚡ Workflow n8n: {URL}\n📄 Relatório: https://mdlab-christian.github.io/jarbas-reports/advbox-auditoria-final.html",
  "parse_mode": "Markdown"
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGRAS GERAIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Se um script tiver bug: corrija-o antes de rodar
- Se dotenv path errado: corrija o import { config } from 'dotenv'; config({ path: '...' })
- Se node_modules faltando: instale antes de rodar
- Nunca faça DELETE ou DROP no banco
- Nunca faça git push --force
- Rate limit do Advbox: respeite os 2500ms entre requests
- Se o token Advbox expirar durante a execução: renovar via Playwright e continuar do ponto onde parou usando --offset=N
```
