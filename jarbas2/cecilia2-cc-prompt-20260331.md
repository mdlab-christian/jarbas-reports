# Cecília 2.0 — Reconstrução Completa (Worker EPROC)
> Prompt para Claude Code | Gerado por Jarbas 2.0 | 31/03/2026

---

## Contexto do Projeto

**Quem é a Cecília:** agente OpenClaw rodando no Mac Mini M4 como usuário `cecilia`
(porta 18793). Monitora movimentações processuais no EPROC (RS/SC/SP) para o
escritório MP Advocacia (~5.800 processos, 5 OABs). Tem LaunchAgent próprio.

**Problema atual:** sistema atual quebrado — conteúdo de documentos sempre null,
skills duplicadas/conflitantes, navegação sem hash de sessão. Reconstruir do zero.

**E2E já validado ao vivo no Mac Mini (31/03/2026):**
- Login RS116571: ✅ sessionHash capturado
- TOTP: ✅ lib totp.mjs funcional
- XLS baixado: ✅ 7692 bytes via gerarExcel()
- 26 processos na lista confirmados

---

## Stack e Caminhos

- **Mac Mini (SSH):** `ssh mac-mini-tail`
- **Usuário cecilia UID:** 506
- **Skills dir:** `/Users/cecilia/cecilia-skills/src/skills/`
- **Libs dir:** `/Users/cecilia/cecilia-skills/src/lib/`
- **Archive dir:** `/Users/cecilia/cecilia-skills/src/skills-archive/` (criar se não existe)
- **Credenciais no Mac Mini:** `/Users/cecilia/.env`
- **Node:** `/opt/homebrew/bin/node`
- **Playwright browsers:** `/Users/cecilia/.playwright-browsers`

**Variáveis de ambiente (disponíveis em `~/.env` no MacBook Air):**
- `SUPABASE_URL`, `SUPABASE_KEY` — banco MdFlow
- `SUPABASE_ACCESS_TOKEN` — Supabase Management API
- `ANTHROPIC_API_KEY` — análise IA
- `TELEGRAM_BOT_TOKEN` — notificações

**Supabase Projeto:** `qdivfairxhdihaqqypgb`
**Org ID Midas:** `55a0c7ba-1a23-4ae1-b69b-a13811324735`

---

## Padrão de Execução no Mac Mini (CRÍTICO)

**Único padrão que funciona para Playwright como cecilia:**

```bash
ssh mac-mini-tail 'echo "010597" | sudo -S launchctl asuser 506 /bin/bash -c \
  "export PATH=/opt/homebrew/bin:\$PATH; \
   export HOME=/Users/cecilia; \
   export PLAYWRIGHT_BROWSERS_PATH=/Users/cecilia/.playwright-browsers; \
   nohup node /Users/cecilia/cecilia-skills/src/skills/script.mjs \
   > /tmp/script.log 2>&1 &"'
# Aguardar ~70s, depois ler:
ssh mac-mini-tail 'cat /tmp/script.log'
```

**Por que:** `launchctl asuser 506` executa como root com `HOME=/Users/jarbas` por
padrão. Precisa setar `HOME=/Users/cecilia` explicitamente. Stdout não propaga —
usar `appendFileSync` para logs.

**Upload de script para o Mac Mini:**
```bash
cat > /tmp/script.mjs << 'SCRIPT'
[conteúdo]
SCRIPT
scp /tmp/script.mjs mac-mini-tail:/tmp/script.mjs
ssh mac-mini-tail 'sudo cp /tmp/script.mjs /Users/cecilia/cecilia-skills/src/skills/script.mjs \
  && sudo chown cecilia:staff /Users/cecilia/cecilia-skills/src/skills/script.mjs'
```

---

## Tarefa — 8 Etapas em Sequência

> **Executar em ordem.** Validar checkpoint antes de avançar. Se falhar: parar e reportar.

---

### Etapa 1 — Pré-requisitos (SSH direto, sem Playwright)

**1a. Reset circuit breakers:**

```bash
source ~/.env
curl -s -X POST \
  "https://api.supabase.com/v1/projects/qdivfairxhdihaqqypgb/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "UPDATE jarbas_accounts SET ativo=true, login_falhas_consecutivas=0, ultimo_erro=null, monitoramento_ativo=true WHERE organizacao_id='\''55a0c7ba-1a23-4ae1-b69b-a13811324735'\''"
  }' | jq
```

**1b. Criar diretório archive:**

```bash
ssh mac-mini-tail 'sudo mkdir -p /Users/cecilia/cecilia-skills/src/skills-archive \
  && sudo chown cecilia:staff /Users/cecilia/cecilia-skills/src/skills-archive'
```

**1c. Mover skills legadas para archive:**

Listar tudo em `/Users/cecilia/cecilia-skills/src/skills/` e mover TUDO para `skills-archive/`, EXCETO:
- `totp.mjs` → mover para `src/lib/totp.mjs` se não estiver lá
- `skill_analise_intimacoes_bulk.mjs`
- `skill_analise_juridica_processo.mjs`
- `skill_cecilia_rag_controller.mjs`

Criar `/Users/cecilia/cecilia-skills/src/skills-archive/README.md` com lista do que foi arquivado.

**1d. Criar 4 tabelas novas no Supabase:**

```sql
-- cecilia_ciclos
CREATE TABLE IF NOT EXISTS cecilia_ciclos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  oab text NOT NULL,
  tribunal text,
  ciclo_horario text,
  iniciado_em timestamptz DEFAULT now(),
  concluido_em timestamptz,
  status text DEFAULT 'executando',
  desde_timestamp timestamptz,
  processos_verificados int DEFAULT 0,
  processos_com_movimentacao int DEFAULT 0,
  processos_analisados int DEFAULT 0,
  erros_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- cecilia_notificacoes
CREATE TABLE IF NOT EXISTS cecilia_notificacoes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ciclo_id uuid REFERENCES cecilia_ciclos(id),
  cnj text,
  tipo text,
  conteudo text,
  destinatario text,
  enviado_em timestamptz DEFAULT now(),
  telegram_msg_id text
);

-- cecilia_erros
CREATE TABLE IF NOT EXISTS cecilia_erros (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ciclo_id uuid REFERENCES cecilia_ciclos(id),
  cnj text,
  etapa text,
  nivel_fallback int DEFAULT 1,
  erro_msg text,
  resolvido boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- cecilia_session_cache
CREATE TABLE IF NOT EXISTS cecilia_session_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  oab text UNIQUE,
  session_hash text,
  expires_at timestamptz,
  updated_at timestamptz DEFAULT now()
);
```

**1e. ADD COLUMN nas tabelas existentes:**

```sql
ALTER TABLE processos_movimentacoes
  ADD COLUMN IF NOT EXISTS ciclo_id uuid,
  ADD COLUMN IF NOT EXISTS oab text,
  ADD COLUMN IF NOT EXISTS ia_classe text,
  ADD COLUMN IF NOT EXISTS ia_responsavel text,
  ADD COLUMN IF NOT EXISTS ia_prazo_sugerido text,
  ADD COLUMN IF NOT EXISTS ia_confianca float,
  ADD COLUMN IF NOT EXISTS ia_justificativa text,
  ADD COLUMN IF NOT EXISTS href_processo text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS texto_documento text;

ALTER TABLE processos
  ADD COLUMN IF NOT EXISTS cecilia_ultima_analise_em timestamptz,
  ADD COLUMN IF NOT EXISTS cecilia_ciclos_sem_movimento int DEFAULT 0;
```

**✅ Checkpoint 1:** Supabase tem 4 tabelas novas. 5 OABs com `ativo=true`.

---

### Etapa 2 — Libs Compartilhadas

Criar em `/Users/cecilia/cecilia-skills/src/lib/`:

**`eproc-utils.mjs`:**

```javascript
export function buildUrl(baseUrl, acao, sessionHash, params = {}) {
  const p = new URLSearchParams({ acao, hash: sessionHash, ...params });
  return `${baseUrl}?${p}`;
}

export function isSessionExpired(str) {
  return ['Sessão encerrada', 'hash inválido', 'Posição do hash',
    'usuario_logar', 'keycloak-eks.tjrs.jus.br'].some(s => str.includes(s));
}

export function extractHash(url) {
  return url.match(/[?&]hash=([a-f0-9]+)/)?.[1] ?? null;
}

export const BASE_URLS = {
  RS: 'https://eproc1g.tjrs.jus.br/eproc/controlador.php',
  SC: 'https://eproc2g.tjsc.jus.br/eproc/controlador.php',
  SP: 'https://eproc.tjsp.jus.br/eproc/controlador.php',
};

export function getTribunal(oab) {
  if (oab.startsWith('RS')) return 'RS';
  if (oab.startsWith('SC')) return 'SC';
  return 'SP';
}
```

**`human-delays.mjs`:**

```javascript
export const humanDelay = (min = 800, max = 2500) =>
  new Promise(r => setTimeout(r, min + Math.random() * (max - min)));

export const shortDelay = () => humanDelay(300, 800);
export const longDelay = () => humanDelay(5 * 60 * 1000, 5 * 60 * 1000 + 30000);
// longDelay = ~5min entre OABs
```

Verificar que `totp.mjs` está em `src/lib/`. Deve exportar `generateTOTP(secret)`.

**✅ Checkpoint 2:** Importar `generateTOTP`, chamar com `'HEZDAMZQGRRDQZBRMY4WKYRZHA4GGYRR'`. Resultado: 6 dígitos.

---

### Etapa 3 — `skill_login_eproc.mjs` v2

Criar em `/Users/cecilia/cecilia-skills/src/skills/skill_login_eproc.mjs`

**Fluxo obrigatório (cada passo validado ao vivo no Mac Mini):**

```javascript
import { chromium } from 'playwright';
import { generateTOTP } from '../lib/totp.mjs';
import { extractHash, BASE_URLS, getTribunal } from '../lib/eproc-utils.mjs';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = Object.fromEntries(
  fs.readFileSync('/Users/cecilia/.env', 'utf8')
    .split('\n').filter(l => l.includes('='))
    .map(l => l.split('=').map(s => s.trim()))
);
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);

export async function loginEproc({ oab }) {
  // 1. Verificar cache (TTL 14min)
  const { data: cache } = await supabase
    .from('cecilia_session_cache')
    .select('session_hash, expires_at')
    .eq('oab', oab)
    .single();

  // 2. Buscar credenciais
  const { data: conta } = await supabase
    .from('jarbas_accounts')
    .select('login, senha, totp_secret')
    .eq('login', oab)
    .eq('organizacao_id', '55a0c7ba-1a23-4ae1-b69b-a13811324735')
    .single();

  const tribunal = getTribunal(oab);
  const baseExterno = BASE_URLS[tribunal].replace('controlador.php', 'externo_controlador.php');
  const loginUrl = `${baseExterno}?acao=usuario_logar`;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ downloadsPath: '/tmp/cecilia-downloads' });
  const page = await context.newPage();

  await page.goto(loginUrl);
  await page.waitForLoadState('domcontentloaded');

  // 3. Username
  await page.fill('#username', conta.login);

  // 4. Senha via NATIVE SETTER — NÃO usar fill() nem keyboard.type()
  await page.evaluate((s) => {
    const el = document.querySelector('#password');
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, s);
    ['input', 'change'].forEach(ev =>
      el.dispatchEvent(new Event(ev, { bubbles: true })));
  }, conta.senha);

  // 5. Submit
  await page.locator('#kc-login').click();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);

  // 6. TOTP condicional
  const hasOtp = await page.locator('input[name=otp]').isVisible().catch(() => false);
  if (hasOtp) {
    const totp = generateTOTP(conta.totp_secret);
    await page.fill('input[name=otp]', totp);
    await page.locator('#kc-login').click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(5000);
  }

  // 7. Aguardar redirect SSO (pode demorar — loop 8x 2s)
  for (let i = 0; i < 8; i++) {
    const url = page.url();
    if (!url.includes('entrar_sso') && !url.includes('keycloak')) break;
    await page.waitForTimeout(2000);
  }

  // 8. Selecionar perfil ADVOGADO-TITULAR (são <tr>, não <a>)
  const hasTitular = await page.locator('text=ADVOGADO-TITULAR')
    .first().isVisible().catch(() => false);
  if (hasTitular) {
    await page.locator('text=ADVOGADO-TITULAR').first().click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
  } else {
    const hasAdv = await page.locator('text=ADVOGADO').first().isVisible().catch(() => false);
    if (hasAdv) {
      await page.locator('text=ADVOGADO').first().click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);
    }
  }

  // 9. Capturar sessionHash
  const sessionHash = extractHash(page.url());
  if (!sessionHash) throw new Error('sessionHash não capturado após login');

  // 10. Salvar cache
  await supabase.from('cecilia_session_cache').upsert({
    oab,
    session_hash: sessionHash,
    expires_at: new Date(Date.now() + 14 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'oab' });

  return { page, context, browser, sessionHash, oab };
}

export async function ensureValidSession({ page, oab, sessionHash }) {
  const url = page.url();
  if (url.includes('keycloak') || url.includes('usuario_logar') || url.includes('entrar_sso')) {
    await page.context().browser().close().catch(() => {});
    return loginEproc({ oab });
  }
  return { page, sessionHash, oab };
}
```

**✅ Checkpoint 3:** Testar com `oab='RS116571'`. Log deve mostrar `sessionHash` (32 chars hex). Verificar em `cecilia_session_cache`.

---

### Etapa 4 — `skill_gerar_planilha.mjs` + `skill_processar_planilha.mjs`

**`skill_gerar_planilha.mjs`:**

```javascript
import path from 'path';
import fs from 'fs';

export async function gerarPlanilha({ page, sessionHash, oab, outDir = '/tmp/cecilia-downloads' }) {
  fs.mkdirSync(outDir, { recursive: true });

  // URL confirmada ao vivo
  const listUrl = `https://eproc1g.tjrs.jus.br/eproc/controlador.php` +
    `?acao=relatorio_processo_procurador_listar` +
    `&ord_ultimas_movimentacoes=S` +
    `&acao_origem=painel_adv_listar` +
    `&acao_retorno=painel_adv_listar` +
    `&hash=${sessionHash}`;

  await page.goto(listUrl);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);

  const hasGerar = await page.evaluate(() => typeof gerarExcel !== 'undefined');
  if (!hasGerar) throw new Error('gerarExcel não disponível — sessão pode ter expirado');

  // Interceptar download ANTES de acionar
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    page.evaluate(() => gerarExcel()),
  ]);

  const xlsPath = path.join(outDir, `movs_${oab}_${Date.now()}.xls`);
  await download.saveAs(xlsPath);

  const size = fs.statSync(xlsPath).size;
  if (size < 1000) throw new Error(`XLS muito pequeno: ${size} bytes`);

  return { xlsPath, size };
}
```

**`skill_processar_planilha.mjs`:**

```javascript
import * as XLSX from 'xlsx'; // npm install xlsx

export async function processarPlanilha({ xlsPath, ultimoCicloEm, oab }) {
  const workbook = XLSX.readFile(xlsPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  // Colunas confirmadas ao vivo:
  // [0]=CNJ [1]=Classe [2]=Autores [3]=Réu [4]=Localidade
  // [5]=Assunto [6]=Último Evento [7]=Data Evento [8]=Data Autuação [9]=Valor
  const dataRows = rows.slice(1).filter(r => r[0] && String(r[0]).length > 5);

  const RUIDO = [
    'djen', 'dje', 'djm', 'publicado no',
    'petição protocolada', 'petição eletrônica protocolada',
    'concluso', 'conclusos para',
    'certidão de', 'certidão expedida',
    'remetidos os autos', 'recebidos os autos',
    'decorrido o prazo', 'intimado(a) o(a) réu',
  ];

  const dataLimite = ultimoCicloEm
    ? new Date(ultimoCicloEm)
    : new Date(Date.now() - 24 * 60 * 60 * 1000);

  const processos = [];

  for (const r of dataRows) {
    const cnj = String(r[0] || '').trim();
    const evento = String(r[6] || '').toLowerCase();
    const dataStr = String(r[7] || '');

    if (!cnj) continue;
    if (RUIDO.some(ru => evento.includes(ru))) continue;

    let dataEvento = null;
    const match = dataStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (match) {
      dataEvento = new Date(`${match[3]}-${match[2]}-${match[1]}`);
      if (dataEvento < dataLimite) continue;
    }

    processos.push({
      cnj,
      classe: String(r[1] || ''),
      autores: String(r[2] || ''),
      reu: String(r[3] || ''),
      localidade: String(r[4] || ''),
      assunto: String(r[5] || ''),
      evento: String(r[6] || ''),
      dataEvento,
      dataStr,
      valorCausa: String(r[9] || ''),
      oab,
    });
  }

  console.log(`XLS: ${dataRows.length} total → ${processos.length} após filtros`);
  return processos;
}
```

**✅ Checkpoint 4:** XLS baixado > 5KB. Parse retorna array com `dataEvento` não nulo.

---

### Etapa 5 — `skill_acessar_processo.mjs` + `skill_ler_documento.mjs`

**`skill_acessar_processo.mjs`:**

```javascript
import { humanDelay } from '../lib/human-delays.mjs';

export async function acessarProcesso({ page, sessionHash, cnj, ultimaAnaliseEm }) {
  const cnjDigits = cnj.replace(/\D/g, '');

  // Buscar via campo de pesquisa (XLS não tem href de processo)
  const searchSelectors = [
    'input#inpPesquisarProcesso',
    'input[placeholder*="número do processo" i]',
    'input[name*="pesquisa" i]',
  ];

  let searched = false;
  for (const sel of searchSelectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible().catch(() => false)) {
      await el.fill(cnjDigits);
      await page.keyboard.press('Enter');
      await page.waitForLoadState('domcontentloaded');
      await humanDelay(1000, 2000);
      searched = true;
      break;
    }
  }

  if (!searched) {
    // Fallback URL direta
    const searchUrl = `https://eproc1g.tjrs.jus.br/eproc/controlador.php` +
      `?acao=processo_selecionar&num_processo=${cnjDigits}&hash=${sessionHash}`;
    await page.goto(searchUrl);
    await page.waitForLoadState('domcontentloaded');
    await humanDelay(1500, 2500);
  }

  // Se caiu em lista de resultados: clicar no primeiro
  if (page.url().includes('processo_listar')) {
    const firstResult = page.locator('a[href*="processo_selecionar"]').first();
    if (await firstResult.isVisible()) {
      await firstResult.click();
      await page.waitForLoadState('domcontentloaded');
      await humanDelay(1000, 2000);
    }
  }

  // Extrair eventos com documentos
  const dataLimite = ultimaAnaliseEm
    ? new Date(ultimaAnaliseEm)
    : new Date(Date.now() - 24 * 60 * 60 * 1000);

  const docLinks = await page.evaluate((limiteIso) => {
    const limite = new Date(limiteIso);
    const resultado = [];
    const linhas = document.querySelectorAll('table tr');

    for (const tr of linhas) {
      const tds = tr.querySelectorAll('td');
      if (tds.length < 2) continue;

      const dataTexto = tds[0]?.textContent?.trim() || '';
      const match = dataTexto.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (!match) continue;

      const dataEvento = new Date(`${match[3]}-${match[2]}-${match[1]}`);
      if (dataEvento < limite) continue;

      const docLink = tr.querySelector('a[href*="acessar_documento"]');
      if (!docLink) continue;

      resultado.push({
        data: dataTexto,
        descricao: tds[1]?.textContent?.trim() || '',
        docHref: docLink.getAttribute('href'),
      });
    }
    return resultado;
  }, dataLimite.toISOString());

  return docLinks;
}
```

**`skill_ler_documento.mjs`:**

```javascript
export async function lerDocumento({ page, docHref }) {
  const baseUrl = 'https://eproc1g.tjrs.jus.br/eproc/';
  const fullUrl = docHref.startsWith('http') ? docHref : baseUrl + docHref;

  await page.goto(fullUrl);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);

  // L1 — texto direto
  let texto = await page.evaluate(() => document.body.innerText).catch(() => '');
  if (texto && texto.length > 100) return { texto, fallbackLevel: 1 };

  // L2 — iframes
  for (const frame of page.frames()) {
    if (frame === page.mainFrame()) continue;
    const t = await frame.evaluate(() => document.body?.innerText || '').catch(() => '');
    if (t && t.length > 100) return { texto: t, fallbackLevel: 2 };
  }

  // L3 — pdf-parse
  try {
    const { default: pdf } = await import('pdf-parse');
    const buf = await page.evaluate(async () => {
      const r = await fetch(location.href);
      const ab = await r.arrayBuffer();
      return Array.from(new Uint8Array(ab));
    });
    const data = await pdf(Buffer.from(buf));
    if (data.text && data.text.length > 50) return { texto: data.text, fallbackLevel: 3 };
  } catch (_) {}

  // L4 — screenshot (para Vision posterior)
  try {
    const screenshotPath = `/tmp/cecilia-doc-${Date.now()}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    return { texto: null, fallbackLevel: 4, screenshotPath };
  } catch (_) {}

  // L5 — falha total
  return { texto: null, fallbackLevel: 5, erro: 'todos os fallbacks falharam' };
}
```

**✅ Checkpoint 5:** Testar com 3 CNJs reais. `texto != null` em pelo menos 2 dos 3.

---

### Etapa 6 — `skill_analisar_ia.mjs` + `skill_notificacoes.mjs`

**`skill_analisar_ia.mjs`:**

```javascript
import Anthropic from '@anthropic-ai/sdk';

const TAXONOMIA = `
Classifique cada movimentação processual em UMA classe:
A = Ação Imediata Urgente (penhora SISBAJUD, bloqueio conta, leilão)
B = Decisão com Prazo (impugnação, recurso, contestação com deadline)
C = Audiência/Perícia Agendada
D = Decisão Informativa (despacho simples, juntada)
E = Marco Processual (sentença, acórdão, trânsito em julgado)
F = Alvará/Levantamento (alvará expedido, depósito disponível)
G = Ruído — descartar (DJE, DJM, concluso, certidão, petição protocolada)

REGRAS CRÍTICAS (invioláveis):
- R1: Intimação polo RÉU → SEMPRE classe G
- R2: acao_recomendada NUNCA genérica. Sempre específica:
  Ex correto: "Comprovar JG — juntar extratos bancários, certidão IR, Detran digital, declaração inexistência bens imóveis"
  Ex ERRADO: "verificar prazo processual"
- R3: Usar texto_documento real, não só nome do evento
- R4: DJE/DJM → SEMPRE classe G
`;

export async function analisarIA({ processos, supabase, anthropicKey }) {
  const client = new Anthropic({ apiKey: anthropicKey });

  // Carregar playbooks do João (RAG)
  const { data: playbooks } = await supabase
    .from('controller_playbooks').select('conteudo').order('prioridade');
  const { data: regras } = await supabase
    .from('controller_regras_operacionais').select('descricao');

  const ragContext = [
    playbooks?.map(p => p.conteudo).join('\n\n') || '',
    regras?.map(r => r.descricao).join('\n') || '',
  ].join('\n\n---\n\n');

  // Filtro zero-custo
  const filtrados = processos.filter(p => {
    const ev = (p.evento || '').toLowerCase();
    const txt = (p.texto_documento || '').toLowerCase();
    if (ev.includes('dje') || ev.includes('djm')) return false;
    if (txt.includes('intimado') && txt.includes('réu')) return false;
    return true;
  });

  const resultados = [];

  // Batch de 10 por chamada
  for (let i = 0; i < filtrados.length; i += 10) {
    const batch = filtrados.slice(i, i + 10);

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2000,
      system: [
        {
          type: 'text',
          text: `${TAXONOMIA}\n\nContexto do escritório:\n${ragContext}`,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{
        role: 'user',
        content: `Analise e retorne APENAS JSON array válido:\n${JSON.stringify(
          batch.map(p => ({
            cnj: p.cnj,
            evento: p.evento,
            texto: p.texto_documento?.slice(0, 2000) || '(sem texto)',
            autores: p.autores,
            reu: p.reu,
          }))
        )}\n\nFormato: [{"cnj":"...","classe":"A-G","resumo":"...","acao_recomendada":"...","urgente":true/false}]`,
      }],
    });

    try {
      const parsed = JSON.parse(response.content[0].text);
      resultados.push(...parsed);
    } catch {
      batch.forEach(p => resultados.push({
        cnj: p.cnj, classe: 'D',
        resumo: 'Erro parse IA', acao_recomendada: 'Revisar manualmente',
      }));
    }
  }

  return resultados;
}
```

**`skill_notificacoes.mjs`:**

```javascript
export async function enviarNotificacoes({ analises, cicloId, oab, supabase, botToken }) {
  const GRUPO = '-5184596601';
  const EMERGENCIA = '-5225323541'; // Classes A e F também aqui

  const TEMPLATES = {
    A: a => `🚨 *URGENTE* — ${a.cnj}\n${a.resumo}\n*AÇÃO:* ${a.acao_recomendada}`,
    B: a => `⚠️ *PRAZO* — ${a.cnj}\n${a.resumo}\n*AÇÃO:* ${a.acao_recomendada}`,
    C: a => `📅 *AUDIÊNCIA* — ${a.cnj}\n${a.resumo}`,
    D: a => `📋 *INFO* — ${a.cnj}\n${a.resumo}`,
    E: a => `⚖️ *SENTENÇA* — ${a.cnj}\n${a.resumo}`,
    F: a => `💰 *ALVARÁ* — ${a.cnj}\n${a.resumo}\n*LEVANTAR IMEDIATAMENTE*`,
  };

  for (const analise of analises) {
    if (analise.classe === 'G') continue;

    // Deduplicação 24h
    const { data: dup } = await supabase
      .from('cecilia_notificacoes').select('id')
      .eq('cnj', analise.cnj)
      .gte('enviado_em', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .single();
    if (dup) continue;

    const template = TEMPLATES[analise.classe];
    if (!template) continue;
    const texto = template(analise);

    const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: GRUPO, text: texto, parse_mode: 'Markdown' }),
    }).then(r => r.json());

    if (['A', 'F'].includes(analise.classe)) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: EMERGENCIA, text: texto, parse_mode: 'Markdown' }),
      });
    }

    await supabase.from('cecilia_notificacoes').insert({
      ciclo_id: cicloId, cnj: analise.cnj, tipo: analise.classe,
      conteudo: texto, destinatario: GRUPO,
      telegram_msg_id: String(resp.result?.message_id || ''),
    });
  }

  // Relatório de ciclo
  const counts = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0 };
  analises.forEach(a => { if (counts[a.classe] !== undefined) counts[a.classe]++; });
  const hora = new Date().toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit',
  });

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: GRUPO,
      text: `✅ *Cecília — Ciclo ${hora} — OAB ${oab}*\n${analises.length} processos | Classes: A:${counts.A} B:${counts.B} C:${counts.C} D:${counts.D} E:${counts.E} F:${counts.F} G:${counts.G}`,
      parse_mode: 'Markdown',
    }),
  });
}
```

**✅ Checkpoint 6:** Analisar 5 processos reais. Classificações fazem sentido. Relatório chega em `-5184596601`.

---

### Etapa 7 — `skill_orquestrador.mjs`

```javascript
import { loginEproc, ensureValidSession } from './skill_login_eproc.mjs';
import { gerarPlanilha } from './skill_gerar_planilha.mjs';
import { processarPlanilha } from './skill_processar_planilha.mjs';
import { acessarProcesso } from './skill_acessar_processo.mjs';
import { lerDocumento } from './skill_ler_documento.mjs';
import { analisarIA } from './skill_analisar_ia.mjs';
import { enviarNotificacoes } from './skill_notificacoes.mjs';
import { humanDelay, longDelay } from '../lib/human-delays.mjs';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = Object.fromEntries(
  fs.readFileSync('/Users/cecilia/.env', 'utf8')
    .split('\n').filter(l => l.includes('='))
    .map(l => l.split('=').map(s => s.trim()))
);
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);

async function getUltimoCiclo(oab) {
  const { data } = await supabase
    .from('cecilia_ciclos').select('concluido_em')
    .eq('oab', oab).eq('status', 'concluido')
    .order('concluido_em', { ascending: false })
    .limit(1).single();
  return data?.concluido_em || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
}

export async function executarCiclo(oab) {
  const hora = new Date().getHours();
  const { data: ciclo } = await supabase.from('cecilia_ciclos').insert({
    oab,
    tribunal: oab.startsWith('RS') ? 'RS' : oab.startsWith('SC') ? 'SC' : 'SP',
    ciclo_horario: `${hora}h`,
    status: 'executando',
    desde_timestamp: await getUltimoCiclo(oab),
  }).select().single();

  let browser = null;
  try {
    // Login com retry 2x
    let loginData;
    for (let t = 1; t <= 2; t++) {
      try { loginData = await loginEproc({ oab }); break; }
      catch (e) {
        if (t === 2) throw e;
        await humanDelay(30000, 30000);
      }
    }

    const { page, sessionHash } = loginData;
    browser = loginData.browser;

    // Gerar + processar planilha
    const { xlsPath } = await gerarPlanilha({ page, sessionHash, oab });
    const processos = await processarPlanilha({
      xlsPath, ultimoCicloEm: ciclo.desde_timestamp, oab,
    });

    await supabase.from('cecilia_ciclos')
      .update({ processos_verificados: processos.length }).eq('id', ciclo.id);

    // Para cada processo: acessar + ler documentos
    const processosComDocs = [];
    for (const proc of processos) {
      await humanDelay(800, 2500);

      const s = await ensureValidSession({ page, oab, sessionHash });
      const eventos = await acessarProcesso({
        page: s.page, sessionHash: s.sessionHash,
        cnj: proc.cnj, ultimaAnaliseEm: ciclo.desde_timestamp,
      });

      for (const evento of eventos) {
        if (!evento.docHref) continue;
        const { texto, fallbackLevel } = await lerDocumento({
          page: s.page, docHref: evento.docHref,
        });

        await supabase.from('processos_movimentacoes').insert({
          cnj: proc.cnj, ciclo_id: ciclo.id, oab,
          ultimo_evento: evento.descricao,
          data_evento: evento.data,
          texto_documento: texto,
          href_processo: evento.docHref,
          status: texto ? 'pendente' : 'falha_documento',
        });

        if (texto) processosComDocs.push({
          ...proc, texto_documento: texto, evento: evento.descricao,
        });
      }
    }

    await supabase.from('cecilia_ciclos')
      .update({ processos_com_movimentacao: processosComDocs.length }).eq('id', ciclo.id);

    // Análise IA + atualizar Supabase
    const analises = await analisarIA({
      processos: processosComDocs, supabase,
      anthropicKey: env.ANTHROPIC_API_KEY,
    });

    for (const a of analises) {
      await supabase.from('processos_movimentacoes')
        .update({
          ia_classe: a.classe,
          ia_justificativa: a.resumo,
          ia_responsavel: a.acao_recomendada,
          status: 'analisado',
        })
        .eq('cnj', a.cnj).eq('ciclo_id', ciclo.id);
    }

    await supabase.from('cecilia_ciclos')
      .update({ processos_analisados: analises.length }).eq('id', ciclo.id);

    // Notificar
    await enviarNotificacoes({
      analises, cicloId: ciclo.id, oab,
      supabase, botToken: env.TELEGRAM_BOT_TOKEN,
    });

    await supabase.from('cecilia_ciclos')
      .update({ status: 'concluido', concluido_em: new Date().toISOString() })
      .eq('id', ciclo.id);

  } catch (err) {
    await supabase.from('cecilia_ciclos')
      .update({ status: 'falhou', concluido_em: new Date().toISOString() })
      .eq('id', ciclo.id);

    // Alertar Christian
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: '1307075495',
        text: `❌ Cecília — Ciclo ${oab} falhou: ${err.message}`,
      }),
    });

  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

export async function executarTodosCiclos() {
  const { data: contas } = await supabase
    .from('jarbas_accounts').select('login')
    .eq('ativo', true)
    .eq('organizacao_id', '55a0c7ba-1a23-4ae1-b69b-a13811324735');

  for (const { login: oab } of (contas || [])) {
    await executarCiclo(oab);
    await longDelay(); // ~5min entre OABs
  }
}

// Entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  executarTodosCiclos().catch(console.error);
}
```

**✅ Checkpoint 7:** Executar `executarCiclo('RS116571')`. Ciclo deve completar. Notificação recebida em `-5184596601`.

---

### Etapa 8 — Crons

**NÃO criar os crons.** Marcar como pendente no relatório.
Os crons serão criados pelo Jarbas 2.0 após ciclo validado.

---

## Regras de Execução

1. **Executar etapas EM ORDEM** — não pular.
2. **Testar checkpoint antes de avançar.** Se falhar: parar e reportar.
3. **Upload para Mac Mini:** usar `/tmp/ → sudo cp` (não scp direto para `/Users/cecilia/`)
4. **Logs:** sempre `appendFileSync` (stdout não propaga via launchctl)
5. **Nunca 2 sessões simultâneas** para a mesma OAB.
6. **Credenciais:** ler de `/Users/cecilia/.env` no Mac Mini.
7. **NUNCA deletar** arquivos em `skills-archive/` — apenas mover para lá.

---

## Formato do Relatório Final (obrigatório)

### ✅ Etapas Concluídas
- Etapa N: [o que foi feito + resultado do checkpoint]

### 📁 Arquivos Criados/Modificados no Mac Mini
- [path completo]: [o que contém]

### 🧪 Evidências dos Checkpoints
- Etapa N: [output real do teste]

### ❌ Etapas que Falharam
- Etapa N: [erro exato + contexto]

### ⏭️ Próximos Passos (para o Jarbas 2.0)
- [o que precisa ser feito após este CC]
