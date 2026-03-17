# Reporter — Módulo Smart Blocks (OlivIA)
> Gerado por JANA 🦊 em 2026-03-17 | Conversa: [JN] Smart blocks

---

## 1. Contexto Geral

O **Smart Blocks** é um dos modos de geração de petições da OlivIA.
Ao contrário do Modo Express (Claude gera o texto do zero) e do Modo Manual (o usuário monta bloco a bloco manualmente), o Smart Blocks:

- Permite ao usuário **selecionar blocos de texto pré-cadastrados** (tabela `olivia_blocos_texto`)
- Associa esses blocos a um **processo jurídico, advogado e modelo de petição**
- Dispara um **workflow n8n assíncrono** que monta o documento final no Google Docs via JARBAS (Google Apps Script)
- Retorna o link do Google Doc pronto para o advogado revisar/baixar

O módulo foi desenvolvido ao longo de múltiplas sessões de 16–17/03/2026 e está **funcional em dev**, com integração completa ao workflow n8n.

---

## 2. Workflows N8n Envolvidos

### Workflow Principal: `final-olivia-smartblocks`
| Campo | Valor |
|---|---|
| **ID** | `hyGajjic2kZBVGvW` |
| **Nome** | `final-olivia-smartblocks` |
| **Status** | ✅ Ativo |
| **Endpoint** | `POST {N8N_WEBHOOK_URL}/olivia/gerar-manual` |
| **Autenticação** | Header `mdflow: MdL1501@` |
| **Modo** | Assíncrono — responde 202 imediatamente, processa em background |

#### Nós do Workflow:

| Nó | ID interno | Tipo | Função |
|---|---|---|---|
| WH-SmartBlocks | `webhook` | Webhook | Recebe POST do frontend |
| A1-Validate | `validate` | Code | Valida campos obrigatórios: `request_id`, `organizacao_id`, `actor_user_id`, `blocos_ids` |
| A1b-CriarHistorico | `a1b-criar-historico` | Code | Cria (ou reutiliza) registro em `olivia_historico` com `status=PROCESSANDO` |
| A1c-MergeHistorico | `a1c-merge-historico` | Code | Merge do `historico_id` no payload validado |
| A-Respond202 | `respond202` | RespondToWebhook | Responde 202 imediatamente ao frontend (não bloqueia) |
| B1-BuscarProcesso | `b1-processo` | Code | Busca dados do processo se `processo_id` presente |
| B1b-BuscarAdvogado | `b1b-advogado` | HTTP Request | Busca advogado no Supabase (`/rest/v1/advogados`) |
| B1c-BuscarCliente | `b1c-cliente` | HTTP Request | Busca cliente no Supabase (`/rest/v1/clientes`) |
| B1d-BuscarEmpresa | `b1d-empresa` | HTTP Request | Busca empresa no Supabase (`/rest/v1/empresas`) |
| B1e-BuscarModelo | `b1e-modelo` | HTTP Request | Busca modelo no Supabase (`/rest/v1/olivia_modelos_peticao`) |
| B2-BuscarBlocos | `b2-blocos` | HTTP Request | Busca blocos no Supabase (`/rest/v1/olivia_blocos_texto`) |
| B2b-AgregaBlocos | `b2b-agregador` | Code | Agrega todos os blocos em um único item |
| B3-BuscarJuris | `b3-juris` | Code | Busca jurisprudências — condicional (só se `jurisprudencias_ids` não vazio) |
| B-MergeAll | `b-merge-all` | Merge | Une dados de B1, B2, B3 |
| C1-MontarPayloadGAS | `c1-montar` | Code | Monta payload para JARBAS: `titulo_documento`, `google_folder_id`, `peticao_html`, `modelo.google_doc_id` |
| C2-ChamarJARBAS | `c2-gas` | HTTP Request | POST para `https://jarbas.jarbas-mdlab.com/olivia/criar-doc` (Google Apps Script via JARBAS) |
| C3-CheckGAS | `c3-check` | If | Verifica se JARBAS retornou sucesso |
| D1-SalvarSucesso | `d1-sucesso` | HTTP Request | PATCH `olivia_historico` → `status=SUCESSO`, salva `google_doc_url` |
| D2-SalvarErroGAS | `d2-erro` | HTTP Request | PATCH `olivia_historico` → `status=ERRO` (falha no GAS) |
| E-ErrorTrigger | `err-trigger` | ErrorTrigger | Captura erros globais não tratados |
| E1-SalvarErroGlobal | `err-handler` | Code | PATCH `olivia_historico` → `status=ERRO` com detalhes do nó que falhou |

---

## 3. Arquitetura e Lógica Implementada

### Fluxo Completo End-to-End

```
Usuário (Browser) → Frontend React → n8n Webhook → JARBAS (GAS) → Google Docs
                                           ↓
                                    olivia_historico (Supabase)
                                           ↑
                              Frontend polling (3s) → exibe link
```

### Detalhamento do Fluxo Frontend

1. **Step 1 — Identificação** (`SmartBlocksStep1Identificacao`)
   - Seleção de processo (busca por CNJ ou nome do cliente)
   - Seleção de tipo de petição (`olivia_tipos_peticao`)
   - Seleção de modelo (`olivia_modelos_grupo`, filtrado por tipo + categoria empresa)
   - Seleção de versão (`olivia_modelos_peticao` publicadas do grupo selecionado)
   - Seleção de advogado responsável

2. **Step 2 — Seleção de Blocos** (`SmartBlocksStep2Blocos` via `ManualStep2Conteudo`)
   - Exibe blocos de texto do banco agrupados por tag
   - Checkbox por bloco (sem drag-and-drop — spec §32)
   - Preview inline via Sheet lateral
   - Seleção de jurisprudências (opcional)
   - Campo de instruções finais livres

3. **Step 3 — Gerar** (`SmartBlocksStep3Gerar`)
   - Resumo do que será gerado
   - Botão "Gerar Documento"
   - Ao clicar:
     - INSERT em `olivia_historico` com `status=PENDENTE` (constraint do banco)
     - POST para n8n `olivia/gerar-manual`
     - n8n responde 202
     - Polling a cada 3s em `olivia_historico` (máx 2min)
     - Status `SUCESSO` → exibe link Google Doc
     - Status `ERRO` → mensagem de erro + botão "Tentar novamente"

### Recovery Banner (D6)
- Ao selecionar um processo, verifica se existe geração anterior com `status=SUCESSO` em `olivia_historico`
- Se existir, exibe banner com data + link do doc anterior
- Botão "Retomar" → vai direto para Step 3 com o resultado anterior
- Botão "Ignorar" → descarta o banner

### Dirty State Guard (§12.4)
- Se houver blocos selecionados e o usuário tentar sair antes de gerar, exibe `AlertDialog` de confirmação
- `beforeunload` também acionado para fechar aba/navegar fora

---

## 4. Arquivos Criados / Modificados

### Frontend (`~/beta-mdflow/src/`)

| Arquivo | Status | Descrição |
|---|---|---|
| `pages/olivia/components/gerador/OliviaGeradorSmartBlocks.tsx` | ✅ Modificado | Orquestrador principal — wizard de 3 steps, recovery D6, dirty state, integração n8n via `callWebhook` |
| `pages/olivia/components/gerador/smart-blocks/SmartBlocksStep1Identificacao.tsx` | ✅ Modificado | Step 1 — seleção de processo, tipo, modelo, versão, advogado; painel de informações do processo |
| `pages/olivia/components/gerador/smart-blocks/SmartBlocksStep2Blocos.tsx` | ✅ Modificado | Step 2 — seleção de blocos (checkbox, sem drag), preview sheet, jurisprudências |
| `hooks/olivia/useSmartBlocks.ts` | ⚠️ Legado | Hook antigo que chama a edge function `olivia-smart-blocks` — **não mais usado** pelo wizard principal (substituído pelo `callWebhook` direto) |
| `lib/webhook.ts` | ✅ Usado | Helper `callWebhook` — POST para n8n com timeout, trata 202 assíncrono |

### Edge Function Supabase (`~/beta-mdflow/supabase/functions/`)

| Arquivo | Status | Descrição |
|---|---|---|
| `olivia-smart-blocks/index.ts` | ⚠️ Legado/Obsoleto | Edge function que busca blocos e substitui placeholders localmente — **NÃO conectada ao n8n**. Não é mais chamada pelo fluxo principal. Pode ser removida ou arquivada. |

### Conhecimento Compartilhado (`~/jarbas-network/shared/`)

| Arquivo | Status | Descrição |
|---|---|---|
| `workflow-ids.md` | ✅ Criado | Mapa de IDs de workflows n8n — Smart Blocks: `hyGajjic2kZBVGvW` |

### Auth Context (`~/beta-mdflow/src/contexts/`)

| Arquivo | Status | Descrição |
|---|---|---|
| `auth_context.tsx` | ✅ Corrigido | **Bug de redirect pós-login** — `flushSync` adicionado para forçar commit do estado antes do `navigate('/homepage')`. Corrige loop de redirect `ProtectedRoute → /login?redirect=/homepage` |

---

## 5. Estado Atual

### ✅ Funcional
- Wizard completo: Step 1, Step 2, Step 3
- Integração com n8n: `callWebhook('olivia/gerar-manual')` funcionando
- Workflow n8n `hyGajjic2kZBVGvW` ativo no Railway
- Polling de `olivia_historico` para acompanhar resultado
- Recovery Banner D6 (geração anterior)
- Dirty state guard (§12.4)
- Bug de redirect pós-login corrigido via `flushSync`
- Step 1: painel de dados do processo enriquecido (campos de restrição para empresas)
- `workflow-ids.md` criado em `jarbas-network/shared/`

### ⏳ Pendente / Não testado
- **Teste E2E completo** do fluxo (o browser automatizado não conseguiu abrir dropdowns Radix em headless — não foi possível testar o fluxo completo via automação)
- Verificar se o JARBAS endpoint `https://jarbas.jarbas-mdlab.com/olivia/criar-doc` está respondendo corretamente
- Confirmar que o `google_doc_url` é salvo corretamente no `olivia_historico` pelo n8n no step D1
- Testar comportamento com `processo_id` ausente (petição avulsa)

### ⚠️ Bugs Conhecidos / Riscos
- **Edge function `olivia-smart-blocks` obsoleta** — ainda deployada no Supabase, pode confundir. Deve ser removida ou documentada como legado.
- **`useSmartBlocks` hook não usado** — pode ser removido para evitar confusão
- **`OliviaGeradorSmartBlocks.tsx.bak`** existe no repo — arquivo de backup que deve ser removido
- **Polling sem Realtime** — o polling é por intervalo (3s). Se o Supabase Realtime estiver disponível, seria mais eficiente usar subscription em `olivia_historico`
- **Timeout de 2min** no polling pode ser curto se o JARBAS/GAS demorar mais

---

## 6. Decisões Arquiteturais

| Decisão | Escolha | Motivo |
|---|---|---|
| Fluxo de geração | Assíncrono via n8n (202 + polling) | Evita timeout HTTP; geração pode demorar >60s |
| Criação do historico_id | Frontend insere antes de chamar n8n | Permite polling imediato; n8n usa o ID recebido |
| Substituição de placeholders | n8n (não edge function) | Workflow tem acesso a todos os dados do processo via joins Supabase |
| Step 2 sem drag | `disableDrag=true` no `ManualStep2Conteudo` | Spec §32 — Smart Blocks não tem reordenação |
| Versão obrigatória no Step 1 | `versao_id` no state | Spec §32 — modelo versionado é requisito |
| Recovery Banner | Query em `olivia_historico` por `processo_id` | UX: evita re-gerar documento que já existe para o mesmo processo |
| `callWebhook` direto | Substituiu chamada ao JARBAS/GAS direto | n8n é o orquestrador central; JARBAS é chamado pelo n8n, não pelo frontend |

---

## 7. Integrações com Outros Sistemas

### Supabase (banco MdFlow — `qdivfairxhdihaqqypgb`)

| Tabela | Operação | Quem faz |
|---|---|---|
| `olivia_historico` | INSERT (status=PENDENTE) | Frontend (Step 3) |
| `olivia_historico` | PATCH (status=SUCESSO/ERRO + google_doc_url) | n8n (D1/D2/E1) |
| `olivia_historico` | SELECT (polling) | Frontend (Step 3) |
| `olivia_blocos_texto` | SELECT (por IDs selecionados) | n8n (B2) |
| `olivia_tipos_peticao` | SELECT | Frontend (Step 1) |
| `olivia_modelos_grupo` | SELECT (filtrado por tipo + categoria) | Frontend (Step 1) |
| `olivia_modelos_peticao` | SELECT (versões publicadas do grupo) | Frontend (Step 1) |
| `processos` | SELECT (busca + dados do processo) | Frontend (Step 1) + n8n (B1) |
| `advogados` | SELECT | Frontend (Step 1) + n8n (B1b) |
| `clientes` | SELECT | n8n (B1c) |
| `empresas` | SELECT | n8n (B1d) |

### n8n (Railway — `https://primary-production-e209.up.railway.app`)
- Endpoint: `POST /webhook/olivia/gerar-manual`
- Autenticação: Header `mdflow: MdL1501@`
- Workflow ID: `hyGajjic2kZBVGvW`

### JARBAS (Google Apps Script via domínio próprio)
- URL: `https://jarbas.jarbas-mdlab.com/olivia/criar-doc`
- Chamado pelo n8n (nó C2-ChamarJARBAS)
- Responsável por: criar Google Doc na pasta configurada, copiar template, substituir conteúdo, retornar URL

### Google Drive
- Pasta destino dos documentos: `1JTbKJqbmPzRTLlqRYZEZ5pNY-w8r1ALZ`
- Hardcoded no frontend como `GOOGLE_FOLDER_ID`

---

## 8. Pontos de Atenção / Riscos / Débitos Técnicos

### 🔴 P1 — Ação Necessária
1. **Testar fluxo E2E** em dev — confirmar que n8n chama JARBAS e google_doc_url é salvo
2. **Remover `OliviaGeradorSmartBlocks.tsx.bak`** do repo
3. **Edge function `olivia-smart-blocks`** — decidir: remover deploy ou manter como fallback documentado

### 🟡 P2 — Melhoria Recomendada
4. **Substituir polling por Realtime** — `supabase.channel().on('postgres_changes')` em `olivia_historico`
5. **`useSmartBlocks` hook** — remover ou adaptar para uso como utilitário de preview (não de geração)
6. **`GOOGLE_FOLDER_ID` hardcoded** — mover para config por organização (multi-tenant)
7. **Timeout do polling** — aumentar de 2min para 3-4min para cobrir GAS lento

### 🟢 P3 — Nice to Have
8. **Indicador de progresso** durante polling — atualmente só "Gerando..." sem feedback granular
9. **Modo avulso testado** — fluxo sem processo selecionado (campo opcional) não foi validado
10. **Testes automatizados** — os dropdowns Radix/Shadcn não abrem em Playwright headless — considerar testes com `@playwright/test` em modo headed ou usar `page.evaluate` para selecionar valores

---

## 9. Commits Relevantes (Histórico)

| Hash | Mensagem | Impacto |
|---|---|---|
| `29f94d95` | fix: P1 polling bug + Step2 bugs de tipo | Substituiu fluxo JARBAS direto por `callWebhook` n8n; corrigiu tipos em Step2 |
| `f7d4cf31` | fix: polling correto com historico_id no webhook | historico_id passado corretamente no payload n8n |
| `d3a8e1ec` | fix: status inicial PENDENTE | Constraint do banco requeria PENDENTE, não PROCESSANDO |
| `d9d7ad10` | fix: modelo_id→olivia_modelos_grupo, versao_id nullable | FK correta para grupo de modelos |
| `fcdaba1e` | merge: resolve conflict OliviaGeradorSmartBlocks | Resolução de conflito de merge |
| `973c6645` | chore: add workflow-ids.md | Registro do ID do workflow n8n |

---

## 10. Variáveis de Ambiente Relevantes

```env
VITE_N8N_WEBHOOK_URL=https://primary-production-e209.up.railway.app/webhook
VITE_N8N_WEBHOOK_SECRET=MdL1501@
```

---

*Reporter gerado por JANA 🦊 — 2026-03-17 | Para unificação na análise completa da OlivIA*

---

## 11. Correções Aplicadas em 2026-03-17 (Deep Review)

### Bugs corrigidos via código

| # | Arquivo | Bug | Fix |
|---|---|---|---|
| 1 | `OliviaGeradorSmartBlocks.tsx` | `status: 'PROCESSANDO'` — viola constraint do banco (só aceita PENDENTE/SUCESSO/ERRO/ABANDONADO) | → `'PENDENTE'` |
| 2 | `OliviaGeradorSmartBlocks.tsx` | `processo_id/modelo_id/versao_id/advogado_id` com fallback `''` (string vazia quebra validação UUID de FK no n8n) | → `null` |
| 3 | n8n nó `A1b-CriarHistorico` (workflow `hyGajjic2kZBVGvW`) | Mesmo bug PROCESSANDO no fallback do workflow (quando historico_id não vem no payload) | → `'PENDENTE'` (atualizado via API n8n) |

### Commits
- `8e897e6a` — `fix(olivia/smart-blocks): status PENDENTE + null para IDs opcionais no webhook payload`

### Observação sobre Step 2
O `SmartBlocksStep2Blocos.tsx` existe mas **não é usado** no wizard atual — o Step 2 usa `ManualStep2Conteudo` com `disableDrag=true` via adapter. O arquivo pode ser removido para evitar confusão, ou ser adotado como substituição futura do Step 2 (tem UX mais simples: lista com checkbox).
