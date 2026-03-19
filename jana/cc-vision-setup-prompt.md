# CC Vision Setup — Prompt de Self-Setup
> Cole este prompt inteiro no Claude Code no terminal, dentro de ~/beta-mdflow

---

Você vai se auto-configurar para ter capacidade de **análise visual (Vision) integrada nos testes E2E**. Siga cada passo em ordem. Não pule etapas. Confirme ao final de cada fase.

---

## FASE 1 — Criar skill vision-analyzer

Crie o arquivo `~/beta-mdflow/.claude/skills/vision-analyzer/analyze.mjs` com exatamente este conteúdo:

```javascript
#!/usr/bin/env node
/**
 * Vision Analyzer — MdFlow E2E
 * Analisa screenshots usando Anthropic Vision API
 * Uso: node analyze.mjs --image /tmp/e2e.png --context "descrição" --expect "o que deve aparecer"
 */

import { readFileSync } from 'fs';
import { parseArgs } from 'util';

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    image:   { type: 'string' },
    context: { type: 'string', default: 'Página do MdFlow' },
    expect:  { type: 'string', default: 'Página carregada corretamente sem erros visíveis' },
    model:   { type: 'string', default: 'claude-sonnet-4-6' },
  }
});

if (!values.image) {
  console.error(JSON.stringify({ error: 'Forneça --image <path>' }));
  process.exit(1);
}

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error(JSON.stringify({ error: 'ANTHROPIC_API_KEY não encontrada no ambiente' }));
  process.exit(1);
}

// Lê e converte imagem para base64
let imageData, mediaType;
try {
  const buf = readFileSync(values.image);
  imageData = buf.toString('base64');
  const ext = values.image.split('.').pop().toLowerCase();
  mediaType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
} catch (e) {
  console.error(JSON.stringify({ error: `Não foi possível ler a imagem: ${e.message}` }));
  process.exit(1);
}

const systemPrompt = `Você é um auditor visual especialista no MdFlow (SaaS jurídico Warm Charcoal dark theme).
Analise screenshots de páginas do MdFlow e retorne APENAS um JSON válido, sem markdown, sem texto extra.

Formato obrigatório:
{
  "score": <0-10>,
  "verdict": "APROVADO" | "REPROVADO" | "PARCIAL",
  "issues": ["lista de problemas encontrados — vazio se nenhum"],
  "positives": ["o que está correto"],
  "summary": "resumo em 1 frase"
}

Critérios de avaliação:
- 9-10: Tudo conforme esperado, zero problemas visuais
- 7-8: Funcional mas com pequenos desvios
- 5-6: Funciona mas com problemas notáveis de UI
- 3-4: Elementos importantes faltando ou quebrados
- 0-2: Página inacessível, crash, tela em branco

Verifique especialmente:
- Layout sem sobreposição de elementos
- Modais/drawers abrindo corretamente
- Toasts visíveis após ações
- Formulários com campos legíveis
- Ausência de erros de console visíveis na tela
- Dark theme Warm Charcoal aplicado corretamente`;

const userPrompt = `Contexto: ${values.context}
Expectativa: ${values.expect}

Analise esta screenshot e retorne o JSON de avaliação.`;

// Chama Anthropic API
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    model: values.model,
    max_tokens: 512,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageData } },
        { type: 'text', text: userPrompt }
      ]
    }]
  })
});

if (!response.ok) {
  const err = await response.text();
  console.error(JSON.stringify({ error: `API error ${response.status}: ${err}` }));
  process.exit(1);
}

const data = await response.json();
const raw = data.content?.[0]?.text ?? '{}';

// Parse e output
try {
  const result = JSON.parse(raw);
  console.log(JSON.stringify(result, null, 2));
  // Exit code 1 se reprovado (para CC detectar falha)
  if (result.verdict === 'REPROVADO') process.exit(1);
} catch {
  // Se não parsear, retorna raw para debug
  console.log(raw);
}
```

Depois de criar o arquivo, execute:
```bash
chmod +x ~/beta-mdflow/.claude/skills/vision-analyzer/analyze.mjs
```

Verifique que o arquivo existe e tem conteúdo. Confirme: `ls -la ~/beta-mdflow/.claude/skills/vision-analyzer/`

---

## FASE 2 — Testar a skill de vision

Carregue as variáveis de ambiente e rode um teste básico:

```bash
# Carregar credenciais
export $(grep -v '^#' ~/jarbas/.env | xargs)

# Tirar screenshot de teste da homepage do MdFlow
node -e "
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('http://192.168.0.4:5173/login');
  await page.fill('input[type=email]', process.env.MDFLOW_TEST_EMAIL);
  await page.fill('input[type=password]', process.env.MDFLOW_TEST_PASSWORD);
  await page.click('button[type=submit]');
  await page.waitForURL('**/*', { timeout: 10000 });
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: '/tmp/vision_smoke_test.png', fullPage: true });
  console.log('Screenshot salvo: /tmp/vision_smoke_test.png');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
" 2>&1

# Analisar com Vision
node ~/beta-mdflow/.claude/skills/vision-analyzer/analyze.mjs \
  --image /tmp/vision_smoke_test.png \
  --context "Página após login no MdFlow" \
  --expect "Dashboard ou página inicial carregada, sidebar visível, dark theme Warm Charcoal"
```

Confirme o JSON retornado com score e verdict.

---

## FASE 3 — Atualizar settings.local.json com credenciais E2E

Leia o arquivo atual:
```bash
cat ~/beta-mdflow/.claude/settings.local.json
```

Adicione o bloco `env` com as credenciais de E2E. O arquivo deve ficar assim (preserve as permissions existentes e adicione o env):

```json
{
  "permissions": {
    "allow": [
      "Bash(cat:*)",
      "Bash(find:*)",
      "Skill(update-config)",
      "Bash(ls:*)",
      "WebSearch",
      "WebFetch(domain:github.com)",
      "Bash(npm install:*)",
      "Bash(agent-browser install:*)",
      "Bash(ssh mac-mini:*)",
      "Read(//Users/jarbas/.openclaw/**)",
      "WebFetch(domain:raw.githubusercontent.com)",
      "Bash(openclaw --version)",
      "Bash(claude --version)",
      "Bash(curl -sL https://raw.githubusercontent.com/vercel-labs/agent-browser/main/skills/agent-browser/SKILL.md)",
      "Bash(curl -sL https://api.github.com/repos/vercel-labs/agent-browser/contents/skills/agent-browser)",
      "Bash(python3 -c \"import sys,json; [print\\(f[''''name'''']\\) for f in json.load\\(sys.stdin\\) if isinstance\\(json.load\\(sys.stdin\\) if False else f, dict\\)]\")",
      "Bash(python3 -c \"import sys,json; data=json.load\\(sys.stdin\\); [print\\(x[''''name'''']\\) for x in data]\")",
      "Bash(curl -sL https://api.github.com/repos/vercel-labs/agent-browser/contents/skills/agent-browser/references)",
      "Bash(python3 -c \"import sys,json; [print\\(x[''''name'''']\\) for x in json.load\\(sys.stdin\\)]\")",
      "Bash(mkdir -p /Users/jarbas/beta-mdflow/.claude/skills/agent-browser/references /Users/jarbas/beta-mdflow/.claude/skills/agent-browser/templates)",
      "Bash(for f:*)",
      "Bash(do curl:*)",
      "Bash(\"/Users/jarbas/beta-mdflow/.claude/skills/agent-browser/references/$f\")",
      "Bash(done)",
      "Bash(env)",
      "Bash(agent-browser:*)",
      "Bash(unset ANTHROPIC_API_KEY)",
      "mcp__claude_ai_Supabase__execute_sql",
      "Bash(node ~/beta-mdflow/.claude/skills/vision-analyzer/analyze.mjs*)"
    ]
  },
  "env": {
    "MDFLOW_URL": "http://192.168.0.4:5173",
    "MDFLOW_TEST_EMAIL": "mdlab.equipe@gmail.com",
    "MDFLOW_TEST_PASSWORD": "MdL1501@",
    "MDFLOW_JARBAS_EMAIL": "christiandpazzz@gmail.com",
    "MDFLOW_JARBAS_PASSWORD": "Pp010597!",
    "MDFLOW_ORG_ID": "55a0c7ba-1a23-4ae1-b69b-a13811324735",
    "VISION_ANALYZER": "~/beta-mdflow/.claude/skills/vision-analyzer/analyze.mjs"
  }
}
```

**Atenção:** preserve todas as entradas `allow` já existentes — apenas adicione a linha `"Bash(node ~/beta-mdflow/.claude/skills/vision-analyzer/analyze.mjs*)"` e o bloco `env`.

---

## FASE 4 — Atualizar o agent mdflow-e2e-tester

Leia o agent atual:
```bash
cat ~/.claude/agents/mdflow-e2e-tester.md | head -20
```

Adicione esta seção logo após o bloco `## Constantes` (antes de `## ⚠️ REGRA CRÍTICA`):

```markdown
## Vision Analyzer — Análise Visual de Screenshots

Após **cada screenshot** em testes E2E, analise visualmente com:

```bash
node ~/beta-mdflow/.claude/skills/vision-analyzer/analyze.mjs \
  --image /tmp/e2e_ROTA_PASSO.png \
  --context "[Página /rota — descreva o estado atual da UI]" \
  --expect "[O que deve estar visível: modal aberto / form preenchido / toast exibido / etc]"
```

**Interprete o resultado:**
- score ≥ 8 + verdict APROVADO → passo visual OK, continue
- score 6-7 + verdict PARCIAL → registre o issue, continue mas sinalize no relatório
- score < 6 + verdict REPROVADO → PARE, o passo falhou visualmente

**Credenciais disponíveis via env:**
- `$MDFLOW_JARBAS_EMAIL` / `$MDFLOW_JARBAS_PASSWORD` — conta admin com dados reais do Midas
- `$MDFLOW_TEST_EMAIL` / `$MDFLOW_TEST_PASSWORD` — conta de teste padrão
- `$MDFLOW_URL` — URL local do MdFlow
- `$MDFLOW_ORG_ID` — org Midas para queries Supabase

**Quando usar qual conta:**
- Conta JARBAS (christiandpazzz@gmail.com): testes que precisam de dados reais, processos reais
- Conta TESTE (mdlab.equipe@gmail.com): testes destrutivos, criação de dados TESTE_*
```

---

## FASE 5 — Smoke test final completo

Execute um E2E smoke test completo na homepage usando a nova stack:

```bash
export $(grep -v '^#' ~/jarbas/.env | xargs)

# E2E com Vision integrado — homepage
node -e "
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });
  
  const results = [];
  
  const analyzeScreenshot = (imgPath, context, expect) => {
    try {
      const out = execSync(
        'node ~/beta-mdflow/.claude/skills/vision-analyzer/analyze.mjs' +
        ' --image ' + imgPath +
        ' --context \"' + context + '\"' +
        ' --expect \"' + expect + '\"',
        { env: process.env, encoding: 'utf8', timeout: 30000 }
      );
      return JSON.parse(out);
    } catch (e) {
      return { score: 0, verdict: 'REPROVADO', issues: [e.message], summary: 'Erro na análise' };
    }
  };
  
  // Passo 1: Login
  console.log('\\n[1/4] Testando login...');
  await page.goto(process.env.MDFLOW_URL + '/login');
  await page.fill('input[type=email]', process.env.MDFLOW_JARBAS_EMAIL);
  await page.fill('input[type=password]', process.env.MDFLOW_JARBAS_PASSWORD);
  await page.screenshot({ path: '/tmp/e2e_login.png', fullPage: true });
  const r1 = analyzeScreenshot('/tmp/e2e_login.png', 'Tela de login do MdFlow', 'Formulário de login visível com campos email e senha e botão de entrar');
  console.log('Vision score:', r1.score, '|', r1.verdict, '|', r1.summary);
  results.push({ step: 'Login form', ...r1 });
  
  // Passo 2: Após login
  await page.click('button[type=submit]');
  await page.waitForURL('**/*', { timeout: 15000 });
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: '/tmp/e2e_dashboard.png', fullPage: true });
  const r2 = analyzeScreenshot('/tmp/e2e_dashboard.png', 'Dashboard/homepage após login bem-sucedido', 'Sidebar visível, conteúdo da página carregado, dark theme Warm Charcoal, usuário logado');
  console.log('[2/4] Dashboard — Vision score:', r2.score, '|', r2.verdict, '|', r2.summary);
  results.push({ step: 'Dashboard', ...r2 });
  
  // Passo 3: Navegar para /processos
  console.log('[3/4] Navegando para /processos...');
  await page.goto(process.env.MDFLOW_URL + '/processos');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: '/tmp/e2e_processos.png', fullPage: true });
  const r3 = analyzeScreenshot('/tmp/e2e_processos.png', 'Página /processos do MdFlow', 'Tabela de processos visível, filtros disponíveis, botão Novo Processo');
  console.log('[3/4] Processos — Vision score:', r3.score, '|', r3.verdict, '|', r3.summary);
  results.push({ step: '/processos', ...r3 });
  
  // Passo 4: Console errors
  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  await page.reload();
  await page.waitForLoadState('networkidle');
  
  await browser.close();
  
  // Relatório final
  console.log('\\n' + '='.repeat(60));
  console.log('SMOKE TEST REPORT — Vision E2E');
  console.log('='.repeat(60));
  results.forEach(r => {
    const icon = r.verdict === 'APROVADO' ? '✅' : r.verdict === 'PARCIAL' ? '⚠️' : '❌';
    console.log(icon + ' ' + r.step + ' — Score: ' + r.score + '/10 — ' + r.summary);
    if (r.issues && r.issues.length > 0) {
      r.issues.forEach(i => console.log('   ⚠ ' + i));
    }
  });
  const avgScore = (results.reduce((s, r) => s + r.score, 0) / results.length).toFixed(1);
  console.log('\\nScore médio: ' + avgScore + '/10');
  console.log('Console errors: ' + consoleErrors.length);
  console.log('Veredicto final: ' + (avgScore >= 7 ? '✅ APROVADO' : '❌ REVISAR'));
  console.log('='.repeat(60));
  
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
" 2>&1
```

---

## FASE 6 — Confirmar e reportar

Após todas as fases, envie um resumo com:
1. ✅/❌ por fase
2. Score médio do smoke test
3. Quaisquer problemas encontrados
4. Caminho completo do script: `~/beta-mdflow/.claude/skills/vision-analyzer/analyze.mjs`

Se tudo passar, confirme: **"Vision E2E configurado com sucesso — score X/10"**

---

*Gerado por JANA 🦊 · 2026-03-18 · Para uso manual no terminal Claude Code*
