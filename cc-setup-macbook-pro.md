# SETUP AUTOMÁTICO — Claude Code MacBook Pro (Christian)

Você é o Claude Code rodando no MacBook Pro do Christian Paz (CTO da MdLab).
Sua missão: configurar este ambiente completo, executando cada etapa em sequência via Bash.
Não peça confirmação entre etapas — execute tudo de uma vez e reporte o resultado ao final.
Se algum passo falhar, registre o erro e continue para o próximo.

---

## CONTEXTO

Você vai se conectar via SSH a duas máquinas da JARBAS Network para copiar as configurações:
- **JANA** (MacBook Air M4): `jarbas@100.101.208.82` (Tailscale) ou `jarbas@192.168.15.80` (rede local)
- **JARBAS** (Mac Mini M4): `jarbas@100.78.173.81` (Tailscale) ou acesso local

As credenciais SSH usam a chave padrão do sistema. Se não tiver chave, use a rede local.

---

## ETAPA 1 — Verificar pré-requisitos

```bash
echo "=== Node.js ===" && node --version
echo "=== npm ===" && npm --version
echo "=== Claude Code ===" && claude --version
echo "=== gh CLI ===" && gh --version 2>/dev/null || echo "gh não instalado — instalar depois"
```

---

## ETAPA 2 — Criar estrutura de pastas

```bash
mkdir -p ~/.claude/agents
mkdir -p ~/.claude/skills
mkdir -p ~/.claude/plugins
mkdir -p ~/workspace
mkdir -p ~/mdlab-vault
mkdir -p ~/mdlab-dev
echo "✅ Estrutura criada"
```

---

## ETAPA 3 — Copiar agentes da JANA via SSH

Tente primeiro via Tailscale (100.101.208.82), se falhar tente rede local (192.168.15.80):

```bash
JANA_HOST="jarbas@100.101.208.82"
# Testar conexão:
ssh -o ConnectTimeout=5 -o BatchMode=yes $JANA_HOST "echo ok" 2>/dev/null
if [ $? -ne 0 ]; then
  JANA_HOST="jarbas@192.168.15.80"
  echo "Tailscale falhou, usando rede local: $JANA_HOST"
fi

# Copiar agentes:
scp -o StrictHostKeyChecking=no -r $JANA_HOST:~/.claude/agents/\* ~/.claude/agents/
echo "Agentes copiados: $(ls ~/.claude/agents/ | wc -l | tr -d ' ')"
```

---

## ETAPA 4 — Copiar skills da JANA via SSH

```bash
JANA_HOST="jarbas@100.101.208.82"
ssh -o ConnectTimeout=5 -o BatchMode=yes $JANA_HOST "echo ok" 2>/dev/null || JANA_HOST="jarbas@192.168.15.80"

scp -o StrictHostKeyChecking=no -r $JANA_HOST:~/.claude/skills/\* ~/.claude/skills/
echo "Skills copiadas: $(ls ~/.claude/skills/ | wc -l | tr -d ' ')"
```

---

## ETAPA 5 — Copiar CLAUDE.md da JANA

```bash
JANA_HOST="jarbas@100.101.208.82"
ssh -o ConnectTimeout=5 -o BatchMode=yes $JANA_HOST "echo ok" 2>/dev/null || JANA_HOST="jarbas@192.168.15.80"

scp -o StrictHostKeyChecking=no $JANA_HOST:~/.claude/CLAUDE.md ~/.claude/CLAUDE.md
echo "CLAUDE.md copiado"
```

---

## ETAPA 6 — Criar settings.json

```bash
cat > ~/.claude/settings.json << 'SETTINGS'
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  },
  "model": "claude-sonnet-4-6",
  "enabledPlugins": {
    "feature-dev@claude-plugins-official": true
  },
  "skipDangerousModePermissionPrompt": true,
  "dangerouslySkipPermissions": true
}
SETTINGS
echo "✅ settings.json criado"
```

---

## ETAPA 7 — Copiar .env da JANA (API keys)

```bash
JANA_HOST="jarbas@100.101.208.82"
ssh -o ConnectTimeout=5 -o BatchMode=yes $JANA_HOST "echo ok" 2>/dev/null || JANA_HOST="jarbas@192.168.15.80"

# Copiar .env do JARBAS (que fica na JANA via sync):
ssh $JANA_HOST "cat ~/jarbas/.env 2>/dev/null || cat ~/.env 2>/dev/null" > ~/mdlab-dev/.env
echo "✅ .env copiado para ~/mdlab-dev/.env"
echo "Chaves encontradas: $(grep -c '=' ~/mdlab-dev/.env)"
```

---

## ETAPA 8 — Configurar MCPs no ~/.claude.json

Leia as API keys necessárias e configure os MCPs:

```bash
# Ler keys do .env:
N8N_KEY=$(grep "^N8N_API_KEY=" ~/mdlab-dev/.env | cut -d= -f2)
TWENTY_FIRST_KEY=$(grep "^TWENTY_FIRST_API_KEY=" ~/mdlab-dev/.env | cut -d= -f2)

# Verificar se ~/.claude.json existe:
if [ ! -f ~/.claude.json ]; then
  echo '{}' > ~/.claude.json
fi

# Usar node para adicionar mcpServers sem sobrescrever o resto:
node -e "
const fs = require('fs');
const cfg = JSON.parse(fs.readFileSync(process.env.HOME + '/.claude.json', 'utf8'));
cfg.mcpServers = {
  'n8n-mcp': {
    'type': 'stdio',
    'command': 'npx',
    'args': ['-y', 'n8n-mcp'],
    'env': {
      'N8N_API_URL': 'https://primary-production-e209.up.railway.app/api/v1',
      'N8N_API_KEY': process.env.N8N_KEY || ''
    }
  },
  'magic': {
    'type': 'stdio',
    'command': 'npx',
    'args': ['-y', '@21st-dev/magic@latest'],
    'env': {
      'API_KEY': process.env.TWENTY_FIRST_KEY || ''
    }
  }
};
fs.writeFileSync(process.env.HOME + '/.claude.json', JSON.stringify(cfg, null, 2));
console.log('✅ MCPs configurados');
" 
```

---

## ETAPA 9 — Clonar repositórios

```bash
# beta-mdflow:
if [ ! -d ~/workspace/beta-mdflow ]; then
  cd ~/workspace
  git clone git@github.com:mdlab-christian/beta-mdflow.git 2>/dev/null \
    || git clone https://github.com/mdlab-christian/beta-mdflow.git
  cd beta-mdflow && npm install --silent
  echo "✅ beta-mdflow clonado"
else
  echo "beta-mdflow já existe — pulando clone, fazendo git pull"
  cd ~/workspace/beta-mdflow && git pull
fi

# mdlab-vault:
if [ ! -d ~/mdlab-vault/.git ]; then
  git clone git@github.com:mdlab-christian/mdlab-vault.git ~/mdlab-vault 2>/dev/null \
    || git clone https://github.com/mdlab-christian/mdlab-vault.git ~/mdlab-vault
  echo "✅ mdlab-vault clonado"
else
  echo "mdlab-vault já existe"
fi
```

---

## ETAPA 10 — Ajustar CLAUDE.md para MacBook Pro

```bash
# Substituir linha de identidade no CLAUDE.md:
sed -i '' 's/Claude Code rodando no.*/Claude Code rodando no MacBook Pro do Christian (MdLab LegalTech)./' ~/.claude/CLAUDE.md
sed -i '' 's/Mac Mini M4/MacBook Pro/' ~/.claude/CLAUDE.md
sed -i '' 's/MacBook Air M4 do JARBAS/MacBook Pro do Christian/' ~/.claude/CLAUDE.md

# Ajustar path do .env se necessário:
sed -i '' 's|~/jarbas/\.env|~/mdlab-dev/.env|g' ~/.claude/CLAUDE.md

echo "✅ CLAUDE.md ajustado"
```

---

## ETAPA 11 — Instalar GitHub CLI (se não tiver)

```bash
if ! command -v gh &>/dev/null; then
  brew install gh
  echo "✅ gh instalado"
else
  echo "gh já instalado: $(gh --version | head -1)"
fi
```

---

## ETAPA 12 — Verificação final

```bash
echo ""
echo "========================================="
echo "     RESULTADO DO SETUP"
echo "========================================="
echo ""
echo "📦 Claude Code: $(claude --version 2>/dev/null || echo 'não encontrado')"
echo "🤖 Agentes: $(ls ~/.claude/agents/ 2>/dev/null | wc -l | tr -d ' ') arquivos"
echo "🛠️  Skills: $(ls ~/.claude/skills/ 2>/dev/null | wc -l | tr -d ' ') itens"
echo "📄 CLAUDE.md: $([ -f ~/.claude/CLAUDE.md ] && echo 'presente' || echo 'ausente')"
echo "⚙️  settings.json: $([ -f ~/.claude/settings.json ] && echo 'presente' || echo 'ausente')"
echo "🔑 .env: $([ -f ~/mdlab-dev/.env ] && echo "$(grep -c '=' ~/mdlab-dev/.env) chaves" || echo 'ausente')"
echo "🗂️  MCPs: $(node -e "const c=require(process.env.HOME+'/.claude.json'); console.log(Object.keys(c.mcpServers||{}).join(', '))" 2>/dev/null || echo 'verificar manualmente')"
echo "📁 beta-mdflow: $([ -d ~/workspace/beta-mdflow ] && echo 'presente' || echo 'ausente')"
echo "📚 mdlab-vault: $([ -d ~/mdlab-vault ] && echo 'presente' || echo 'ausente')"
echo ""
echo "========================================="
echo "✅ Setup concluído! Rode: cd ~/workspace/beta-mdflow && claude"
echo "========================================="
```

---

## RELATÓRIO FINAL

Após executar todas as etapas acima, apresente:

1. Lista de etapas concluídas com ✅ ou ❌
2. Número de agentes copiados
3. Chaves de API encontradas (apenas os nomes, não os valores)
4. Qualquer erro que precise de atenção manual
5. Próximo comando que o Christian deve rodar para abrir o CC no projeto

Se o SSH falhou em todas as tentativas, instrua o Christian a:
- Conectar o MacBook Pro na mesma rede Wi-Fi da JANA/JARBAS
- Ou ativar o Tailscale no MacBook Pro (tailscale.com/download)
- Depois rodar este setup novamente
