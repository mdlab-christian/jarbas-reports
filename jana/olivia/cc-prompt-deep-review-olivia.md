# Prompt — Claude Code: Deep Review + Lapidação OlivIA 2.0
> Gerado por JANA 🦊 em 2026-03-22 para execução via Claude Code no terminal
> Projeto: `/Users/jarbas/beta-mdflow` (frontend React/TypeScript)
> Skills OlivIA: `/Users/Shared/olivia-skills/` (Node.js .mjs)

---

## CONTEXTO DO PROJETO

Você está trabalhando no projeto **OlivIA 2.0** — um gerador de petições jurídicas da MdLab LegalTech.

**Stack:**
- Frontend: React 18 + TypeScript + Vite + shadcn/ui + Tailwind + Framer Motion + @dnd-kit + @tanstack/react-query
- Backend: Supabase (PostgreSQL + RLS + Edge Functions)
- Motor IA: OliviaMDBot (Node.js skills em `/Users/Shared/olivia-skills/`, servidor na porta 19100)
- Design System: Warm Charcoal v5 (tokens CSS — ZERO hardcode de cor)

**Arquivos de referência obrigatórios — LEIA ANTES DE QUALQUER COISA:**
1. `~/mdlab-vault/01_projetos/olivia/` — PRD completo (frontend.md, backend.md, frontend-ux-addendum.md, gap-analysis.md)
2. `~/mdlab-vault/` — design system, convenções, regras gerais do MdFlow
3. `/Users/Shared/olivia-skills/` — 9 skills do motor OlivIA
4. `/Users/Shared/olivia-server/server.mjs` — servidor orquestrador
5. `~/beta-mdflow/src/pages/olivia/` — todo o frontend OlivIA

Se não encontrar os arquivos acima, tente:
- `~/Desktop/olivia v3/Projeto/projeto-olivia/prd/`
- `~/jarbas-network/shared/KNOWLEDGE.md`

---

## MISSÃO

Realizar **deep review completo** do projeto OlivIA 2.0 comparando:
1. O que está implementado no código
2. O que o PRD especifica
3. O que está no MDLab Vault (diretrizes, design system, regras)

**E corrigir TODOS os bugs P0/P1 encontrados durante a review**, gerando relatório HTML completo no final.

---

## BUGS CONHECIDOS — CORRIJA OBRIGATORIAMENTE

### 🔴 P0-1: SeletorModelo não filtra por categoria_empresa_id

**Arquivo:** `src/pages/olivia/components/gerador/steps/identificacao/SeletorModelo.tsx`

**Problema:** A query atual não filtra por `categoria_empresa_id` da empresa do processo. O PRD (seção 3.5) especifica:
```sql
AND (mg.categoria_empresa_id = $categoria_empresa_id OR mg.categoria_empresa_id IS NULL)
```

**Fix:** 
- Adicionar prop `categoriaEmpresaId: string | null` ao componente
- Adicionar filtro na query Supabase: `.or(`categoria_empresa_id.eq.${categoriaEmpresaId},categoria_empresa_id.is.null`)` (só quando `categoriaEmpresaId` não for null)
- `OliviaGeradorExpress.tsx` (linha ~268) deve passar `categoriaEmpresaId={processo?.categoria_empresa_id ?? null}`

O campo `categoria_empresa_id` já está disponível em `ProcessoSelecionado.categoria_empresa_id` (vem do join com `empresas.categoria_id`).

---

### 🔴 P0-2: Download falha — bucket privado, precisa signed URL

**Problema:** Bucket `olivia-peticoes` é privado. URLs públicas retornam 404.

**Arquivo servidor:** `/Users/Shared/olivia-server/server.mjs`

**Fix — adicionar rota `POST /olivia/sign-url`:**
```javascript
if (req.method === 'POST' && path === '/olivia/sign-url') {
  const { storage_path, expires_in = 900 } = body; // 15min default
  if (!storage_path) return json(res, 400, { ok: false, error: 'storage_path obrigatorio' });
  // Chamar Supabase Storage sign API
  const env = lerEnv();
  const signUrl = `${env.SUPABASE_URL}/storage/v1/object/sign/olivia-peticoes/${storage_path}`;
  // POST para Supabase com expiresIn
  // Retornar { ok: true, signed_url: "..." }
}
```

**Fix no frontend** — `StepConclusao` ou onde estiverem os botões de download:
- Antes de abrir URL do arquivo, chamar `callWebhook('olivia/sign-url', { storage_path })` → obter signed URL → `window.open(signedUrl)`

**Alternativa mais simples:** Tornar o bucket `olivia-peticoes` público no Supabase (só leitura, sem listagem). Verificar se isso atende requisitos de segurança.

---

### 🔴 P0-3: Score revisor sempre 0 — campo errado

**Arquivo servidor:** `/Users/Shared/olivia-server/server.mjs` (seção S6, ~linha 203)

**Problema:** Servidor passa `peticao_html: peticaoResult.peticao_html` para o revisor, mas a skill `olivia-revisor.mjs` espera o campo `peticao_express`.

**Fix:**
```javascript
// ANTES (bug):
const revisaoResult = await revisor({
  historico_id, organizacao_id,
  peticao_html: peticaoResult.peticao_html,  // ← ERRADO
  tipo_peticao_id, modelo_id,
});

// DEPOIS (fix):
const revisaoResult = await revisor({
  historico_id, organizacao_id,
  peticao_express: peticaoResult.peticao_texto,  // ← CORRETO
  peticao_base_smartblocks: smartBlocksBase?.peticao_base || '',
  analise_provas: analiseProvas || {},
  tipo_peticao_id, modelo_id,
});
```

---

### 🟡 P1-1: Busca por nome do cliente não funciona

**Arquivo:** `src/pages/olivia/hooks/useOliviaProcessoBusca.ts`

**Problema:** Query atual usa `.or('numero_cnj.ilike.%X%,reu_nome.ilike.%X%')` — busca pelo nome da empresa ré, não pelo nome do cliente.

**Fix:** Mudar para buscar em `clientes.nome`:
```typescript
.or(`numero_cnj.ilike.%${debouncedSearch}%,clientes.nome.ilike.%${debouncedSearch}%`)
```
O join com `clientes(nome)` já está na query. Verificar se Supabase aceita `clientes.nome.ilike` no `.or()` — se não aceitar, usar RPC.

---

### 🟡 P1-2: texto_gerado NULL no banco

**Arquivo servidor:** `/Users/Shared/olivia-server/server.mjs`

**Problema:** Após S5 (gera-peticao), `texto_gerado` não é salvo no `olivia_historico`.

**Fix:** Após chamar `gera-peticao`, adicionar update:
```javascript
if (historico_id && peticaoResult.peticao_texto) {
  await supabaseUpdate(env, 'olivia_historico', historico_id, {
    texto_gerado: peticaoResult.peticao_texto,
  });
}
```

---

### 🟡 P1-3: Label SeletorVersao mostra nome duplicado

**Arquivo:** `src/pages/olivia/components/gerador/steps/identificacao/SeletorVersao.tsx`

**Fix:** Label deve ser `V${versao} · ${nome} · ${format(parseISO(created_at), 'dd/MM')}` em vez do nome repetido.

---

### 🟡 P1-4: Botão "Reclame Aqui" — remover por enquanto

**Arquivo:** Qualquer arquivo no Step 3 (estrutura/outline) que renderiza a opção Reclame Aqui.

**Fix:** Remover o toggle/checkbox/campo de Reclame Aqui do Step 3. Deixar apenas as seções da petição. Pode ser reintroduzido futuramente.

---

## REVIEW COMPLETO — O QUE VERIFICAR

### 1. Página `/olivia` — index.tsx
- [ ] Tabs corretas: Gerador | Análise IA | Chat OlivIA
- [ ] Lazy loading funcionando
- [ ] Header "Modo OlivIA ✦" presente
- [ ] Sem menção a "JARBAS" na UI (é interno)
- [ ] Sem métricas de tokens/custo visíveis para usuário

### 2. Step 1 — Identificação
Comparar com PRD seção 3.1-3.9. Verificar:
- [ ] SearchBox: busca por CNJ e por nome do cliente
- [ ] Painel informações: tipo empresa vs tipo órgão
- [ ] SeletorTipoPeticao: 10 tipos, filtrado por `ativo = true` e `ordem`
- [ ] SeletorModelo: filtrado por tipo_peticao + categoria_empresa (P0-1 acima)
- [ ] SeletorVersao: label correto "V3 · nome · dd/MM" (P1-3 acima)
- [ ] UploadDrawer: abre, lista docs existentes, upload manual funciona
- [ ] canAdvance: processo + tipo + modelo + versão obrigatórios
- [ ] `categoria_empresa_id` propagado pelo wizard state

### 3. Step 2 — Triagem IA
- [ ] Loading animation enquanto aguarda análise
- [ ] Supabase Realtime escutando `perguntas_geradas` em `olivia_historico`
- [ ] Quando 0 perguntas: card de análise concluída (não só "Nenhuma pergunta. Avançando.")
- [ ] Perguntas dinâmicas: PerguntaSimNao, PerguntaTexto, PerguntaDinamica funcionais

### 4. Step 3 — Estrutura
- [ ] Tags agrupadas por seção (olivia_tags_secao: Introdução/Fundamentação/Conclusão)
- [ ] Headers de seção visíveis separando grupos
- [ ] Items obrigatórios com lock visual (cadeado + não podem ser excluídos)
- [ ] Campo observações com mic button
- [ ] Remover "Reclame Aqui" (P1-4)
- [ ] `outline` com observacoes_ia enviado corretamente ao payload de geração

### 5. Step 4 — Geração/Revisão
- [ ] Progress bar com mensagens contextuais por etapa
- [ ] `texto_gerado` salvo no historico (P1-2)
- [ ] Score revisor correto (P0-3)
- [ ] Botão "Aprovar rascunho" claramente visível

### 6. Step 5 — Conclusão
- [ ] Download .docx e .pdf via signed URL (P0-2)
- [ ] Score revisor exibido corretamente
- [ ] Avaliação 1-5 (feedback_advogado salvo no banco)
- [ ] Botão "Nova Petição" resetando o wizard
- [ ] SEM métricas de tokens/custo visíveis

### 7. Aba Análise IA — RECONSTRUIR
A implementação atual em `OliviaAnaliseUnificada.tsx` usa `callWebhook` para JARBAS — mas deve usar OliviaMDBot. Verificar:
- [ ] 2 sub-abas: "Analisar Processo" e "Analisar Decisão"
- [ ] Upload drag-and-drop funcional
- [ ] Campo contexto adicional (textarea + mic)
- [ ] Botão "Analisar" chama OlivIA (não JARBAS) via `callWebhook('olivia/analisar', ...)`
- [ ] Resultado em cards colapsáveis por seção
- [ ] Histórico de análises (tabela paginada com 51 análises existentes)
- [ ] SearchBox processo funcional
- [ ] Se componentes órfãos na pasta `analise/` → deletar

### 8. Aba Chat OlivIA — RECONSTRUIR
A implementação atual em `OliviaChatPage.tsx` tem estrutura básica mas incompleta:
- [ ] Modal de início: "Chat Livre" vs "Com Processo" (CardModal com 2 opções)
- [ ] "Com Processo": SearchBox para selecionar processo → contextualiza chat
- [ ] Timeline de mensagens com bubbles (já tem base)
- [ ] Sidebar com threads históricas (28 threads no banco)
- [ ] Sugestões rápidas contextuais: "Resumir processo", "Pontos de recurso", "Jurisprudência similar", "Estratégia recursal"
- [ ] Chat via `callWebhook('olivia/chat', { thread_id, processo_id, mensagem })`
- [ ] Criar thread se não existir: INSERT em `olivia_threads`
- [ ] Salvar mensagens em `olivia_messages`
- [ ] Se componentes órfãos na pasta `chat/` → deletar

### 9. Skills OlivIA — Verificar funcionamento
- `/Users/Shared/olivia-skills/olivia-smartblocks.mjs`: deve buscar tags reais de `olivia_modelo_tags` pelo `modelo_id`, não retornar mock quando sem tags configuradas
- `/Users/Shared/olivia-skills/olivia-busca-juris.mjs`: export usa `buscaJuris` (diferente das demais que usam `executar`) — normalizar para `executar` E manter `buscaJuris` como alias
- `/Users/Shared/olivia-skills/olivia-gera-perguntas.mjs`: quando sem tags, deve gerar perguntas básicas por tipo de petição via Claude (não retornar mock 0 perguntas)

### 10. Regras Gerais — Verificar em todo o código
- [ ] ZERO hardcode de cor (grep `#[0-9a-fA-F]{6}` no código .tsx)
- [ ] staleTime: 30_000 em TODOS os hooks useQuery
- [ ] organizacao_id em TODAS as queries Supabase
- [ ] deleted_at IS NULL em todas as queries (exceto tabelas sem essa coluna)
- [ ] Sem `console.log` em código de produção
- [ ] Sem imports de ícones de outras libs (só lucide-react)
- [ ] Max 400 linhas por arquivo .tsx

---

## INSTRUÇÕES DE EXECUÇÃO

1. **Primeiro**: Ler todos os arquivos de referência (PRD, vault, skills, servidor)
2. **Segundo**: Fazer survey completo do código atual (cada arquivo .tsx em /olivia/, cada .mjs em /olivia-skills/)
3. **Terceiro**: Aplicar os fixes P0 e P1 listados acima
4. **Quarto**: Aplicar melhorias do review completo (seções 1-10)
5. **Quinto**: Reconstruir Análise IA e Chat OlivIA conforme especificações
6. **Sexto**: Verificar TypeScript sem erros (`npx tsc --noEmit`)
7. **Sétimo**: Sincronizar via SCP para Mac Mini: `scp -r /Users/jarbas/beta-mdflow/src/pages/olivia/ mac-mini:/Users/jarbas/beta-mdflow/src/pages/olivia/`
8. **Oitavo**: Gerar relatório HTML completo em `~/jarbas-reports/jana/olivia/cc-report-lapidacao-YYYYMMDD.html` com:
   - O que foi corrigido (lista completa)
   - O que não foi possível corrigir e por quê
   - Bugs novos encontrados durante a review
   - Score por dimensão (Funcionalidade / UI-UX / Aderência PRD / Qualidade conteúdo)
   - Próximos passos recomendados

---

## REGRAS ANTI-ALUCINAÇÃO

- Nunca inventar campos de banco — verificar schema real via queries SQL se necessário
- Nunca usar `fetch()` diretamente em skills .mjs — sempre `require('https')`
- Nunca remover `components/smart-blocks/` ou `hooks/useSmartBlocks*.ts`
- Nunca mencionar "JARBAS" na UI visível ao usuário
- Nunca mostrar tokens/custo/métricas internas na UI
- Design System v5 Warm Charcoal — tokens CSS, ZERO hardcodes de cor

---

## CONTEXTO ADICIONAL — Para consultar se precisar

**Supabase project:** `qdivfairxhdihaqqypgb`
**Org Midas:** `55a0c7ba-1a23-4ae1-b69b-a13811324735`
**Servidor OlivIA:** `https://olivia.jarbas-mdlab.com` (porta 19100, token `olivia-gateway-token-2026`)
**Processo de teste:** `5013705-44.2025.8.21.0001` (ID: `00891b6f-258e-4778-a8c1-915624242912`)
**Categoria empresa NU PAGAMENTOS:** `1bf519a7-85e7-4679-84c5-514aa88b914a`

**Tabelas principais:**
- `olivia_historico` (tabela central — 46 cols)
- `olivia_modelos_grupo` (177 rows, tem `categoria_empresa_id` e `status` — não `ativo`)
- `olivia_modelos_peticao` (329 rows, tem `ativo` e `versao`)
- `olivia_modelo_tags` (508 vinculações modelo↔tag)
- `olivia_tags` (183 tags)
- `olivia_tags_secao` (3: Introdução/Fundamentação/Conclusão)
- `olivia_blocos_texto` (1.244 blocos)
- `olivia_tipos_peticao` (10 tipos, tem `ativo` e `ordem_exibicao`)
- `olivia_threads` (28 threads) + `olivia_messages` (122 mensagens)
- `processo_documentos` — usa `storage_url` (não `arquivo_url`), não tem `deleted_at`

**Schema olivia_modelos_grupo:** id, organizacao_id, tipo_peticao_id, nome, descricao, active_version_id, **status** (não `ativo`!), modo_alcance, created_by_id, created_at, updated_at, deleted_at, tags_ids, categoria_empresa_id

**Bucket storage:** `olivia-peticoes` (privado) — usar signed URL para download

---

Boa sorte. Gere o relatório HTML no caminho: `~/jarbas-reports/jana/olivia/cc-report-lapidacao-20260322.html`
