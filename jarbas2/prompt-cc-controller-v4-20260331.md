# Controller v4 — Reconstrução Total da Página /controller

## Contexto (Especificidade)

Projeto: **MdFlow LegalTech** — página /controller (cockpit do João para triagem de intimações judiciais).
Stack: React + TypeScript + Supabase + shadcn/ui + Tailwind CSS + Vite
Repositório: `~/beta-mdflow/`
Rota alvo: `/controller`
Diretório alvo: `~/beta-mdflow/src/pages/controller/`
Diretório a deletar: `~/beta-mdflow/src/pages/controller-v2/` (APÓS construção completa)

**Contexto de negócio:** O Midas (escritório de advocacia) tem ~5.800 processos ativos e recebe 300-600 intimações por ciclo de cron. O João (advogado) usa esta página para triagem diária. A IA (Cecília v2.3) classifica cada intimação com classe D/E/F/C/B/G antes de entregar ao controller. Performance é crítica.

**Usuário do sistema:** `jarbas` (MacBook Air M4)
**Dev server:** `http://localhost:5173`
**Credenciais de teste:**
- Email: `mdlab.equipe@gmail.com`
- Senha: `MdL1501@`
**Supabase org_id:** `55a0c7ba-1a23-4ae1-b69b-a13811324735`

---

## O que Existe Hoje (não apagar ainda)

Componentes v3 ativos (em `~/beta-mdflow/src/pages/controller/`):
- `index.tsx` — orquestrador principal com 8 abas
- `ControllerV3Intimacoes.tsx` — lista de intimações (usa `v_controller_intimacoes_completa`)
- `ControllerV3Drawer.tsx` — drawer principal com 6 abas confusas
- `ControllerV3DrawerHeader.tsx`, `ControllerV3DrawerFooter.tsx`
- `ControllerV3DrawerTabDocumentos.tsx`, `ControllerV3DrawerTabFinanceiro.tsx`, `ControllerV3DrawerTabProcesso.tsx`, `ControllerV3DrawerTabResumo.tsx`
- `ControllerV3FilterBar.tsx` — filtros (importa de controller-v2/types.ts — isso vai mudar)
- `ControllerV3IntimacaoRow.tsx` — card de intimação
- `ControllerV3BulkBar.tsx` — bulk actions (nunca funcionou)
- `ControllerSheetAtividade.tsx` — sheet de criar atividade (FUNCIONA — reutilizar)
- `ControllerSheetDocPendente.tsx` — sheet de solicitar documento (FUNCIONA — reutilizar)
- `ControllerDashboard.tsx` — dashboard (refazer)
- `ControllerMonitoramento.tsx` — monitoramento (refazer)
- `ControllerTreinamentoHub.tsx` — treinamento (refazer como Playbooks)
- `ControllerAtividades.tsx` — mover para Equipe+
- `ControllerDocumentos.tsx` — mover para Equipe+
- `ControllerEquipe.tsx` — mover para Equipe+
- `ControllerArquivados.tsx` — virar toggle na filter bar
- `types.ts` — atualizar com campos Cecília v2.3
- `controller_utils.ts` — manter
- `useControllerActions.ts` — manter

RPCs existentes que continuam sendo usados:
- `rpc_controller_batch_update_status` — update em lote de status
- `rpc_controller_criar_atividades_lote` — criar atividades em lote
- `rpc_controller_criar_atividade` — criar atividade individual
- `rpc_controller_cancelar_atividade`
- `rpc_controller_kpis` — KPIs do dashboard
- `rpc_controller_registrar_feedback_ia`
- `rpc_controller_ingestao_manual`

View que alimenta a lista: `v_controller_intimacoes_completa`

---

## Tarefa

Reconstruir a página /controller do zero, **substituindo** os componentes V3 pelos V4, seguindo a arquitetura descrita abaixo. Manter compatibilidade com todos os RPCs existentes. Não quebrar nada que já funciona.

**Executar em fases — reportar ao final de cada fase:**

---

## FASE 0 — Preparação e Verificação

Antes de qualquer código:

1. Verificar se os campos abaixo existem na view `v_controller_intimacoes_completa`:
   - `classe_cecilia` (text)
   - `confianca_ia` (numeric)
   - `tribunal` (text) — extraído do CNJ ou campo direto
   - `responsavel` (text)
   - `motivo_ia` (text)
   - `cnj` (text) — alias de `numero_cnj` se necessário

2. Se algum campo estiver faltando, gerar o SQL de ALTER VIEW para adicioná-los. **Não executar a migration automaticamente — incluir no relatório para aprovação manual.**

3. Verificar se `classe_cecilia` e `confianca_ia` existem na tabela `intimacoes` (não só na view).

4. Verificar se existe a RPC `rpc_controller_v2_kpis` ou só `rpc_controller_kpis` — usar a existente.

5. Verificar se a rota `/controller-v2` existe no router (`~/beta-mdflow/src/App.tsx` ou similar).

Reportar o resultado desta fase antes de continuar.

---

## FASE 1 — Types + View SQL (foundation)

### 1.1 Atualizar `types.ts`

Adicionar campos Cecília v2.3 ao `IntimacaoRow` existente:

```typescript
// Campos Cecília v2.3 — adicionar ao IntimacaoRow existente
classe_cecilia: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | null;
confianca_ia: number | null;        // 0.0 a 1.0
tribunal: 'TJRS' | 'TJSC' | 'TJSP' | null;
responsavel: string | null;          // nome do advogado sugerido
motivo_ia: string | null;            // justificativa da classificação
```

Também criar tipos auxiliares:
```typescript
export type ClasseCecilia = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
export type StatusPrazo = 'vencido' | 'hoje' | 'critico' | 'atencao' | 'normal' | 'sem_prazo';
export type TribunalCode = 'TJRS' | 'TJSC' | 'TJSP';
```

### 1.2 Criar `controller_utils.ts` — funções auxiliares

Adicionar (ou criar se não existir) as funções:

```typescript
// Extrair tribunal do CNJ (formato: XXXXXXX-XX.XXXX.X.XX.XXXX)
export function extractTribunal(cnj: string): TribunalCode | null {
  // CNJ TJRS: termina em .8.21.
  // CNJ TJSC: termina em .8.24.
  // CNJ TJSP: termina em .8.26.
  if (cnj.includes('.8.21.')) return 'TJRS';
  if (cnj.includes('.8.24.')) return 'TJSC';
  if (cnj.includes('.8.26.')) return 'TJSP';
  return null;
}

// Gerar URL EPROC por tribunal
export function eprocUrl(cnj: string, tribunal?: TribunalCode | null): string {
  const trib = tribunal ?? extractTribunal(cnj);
  const cnj_raw = cnj.replace(/[.\-]/g, '');
  const bases: Record<string, string> = {
    TJRS: 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=',
    TJSC: 'https://eproc1g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=',
    TJSP: 'https://esaj.tjsp.jus.br/cpopg/show.do?processo.codigo=',
  };
  return trib ? `${bases[trib]}${cnj_raw}` : '#';
}

// Cor semântica por classe Cecília
export function classeColor(classe: ClasseCecilia | null): { bg: string; text: string; label: string } {
  const map: Record<ClasseCecilia, { bg: string; text: string; label: string }> = {
    E: { bg: 'bg-emerald-900/40', text: 'text-emerald-300', label: 'E — Estratégica' },
    F: { bg: 'bg-red-900/40',     text: 'text-red-300',     label: 'F — SISBAJUD' },
    D: { bg: 'bg-blue-900/40',    text: 'text-blue-300',    label: 'D — Decisão' },
    C: { bg: 'bg-teal-900/40',    text: 'text-teal-300',    label: 'C — Operacional' },
    B: { bg: 'bg-violet-900/40',  text: 'text-violet-300',  label: 'B — Ciência' },
    G: { bg: 'bg-slate-800/60',   text: 'text-slate-300',   label: 'G — Encerramento' },
    A: { bg: 'bg-slate-900/40',   text: 'text-slate-500',   label: 'A — Ruído' },
  };
  return classe ? map[classe] : { bg: 'bg-slate-900/40', text: 'text-slate-500', label: '—' };
}

// Status visual do prazo
export function prazoStatus(dias: number | null): StatusPrazo {
  if (dias === null) return 'sem_prazo';
  if (dias < 0) return 'vencido';
  if (dias === 0) return 'hoje';
  if (dias <= 3) return 'critico';
  if (dias <= 7) return 'atencao';
  return 'normal';
}
```

### 1.3 SQL para a view (gerar para aprovação manual)

Verificar se os campos Cecília estão na view `v_controller_intimacoes_completa`. Se não estiverem, gerar o SQL:

```sql
-- Exemplo do que adicionar ao SELECT da view (adaptar conforme DDL real):
i.classe_cecilia,
i.confianca_ia,
i.tribunal,
i.responsavel,
i.motivo_ia
```

**NÃO executar — incluir no relatório.**

---

## FASE 2 — Nova Filter Bar (ControllerV4FilterBar.tsx)

Criar `~/beta-mdflow/src/pages/controller/ControllerV4FilterBar.tsx`.

### Interface de filtros

```typescript
export interface ControllerV4Filters {
  search: string;
  status: string[];           // nova, lida, processada, ignorada
  advogado_ids: string[];     // puxar de tabela advogados com JOIN em intimacoes ativas
  tribunal: TribunalCode | 'todos';
  classe_cecilia: ClasseCecilia[] | [];  // filtro multi-select
  mostrar_arquivados: boolean;           // toggle — substitui aba Arquivados
  sort: 'padrao' | 'data_recente' | 'parte_az';
  // filtros removidos: ia_status, excluir_pauta_julgamento, excluir_djen, mostrar_irrelevantes
}

export const CONTROLLER_V4_FILTERS_DEFAULT: ControllerV4Filters = {
  search: '',
  status: [],
  advogado_ids: [],
  tribunal: 'todos',
  classe_cecilia: [],
  mostrar_arquivados: false,
  sort: 'padrao',
};
```

### UX da Filter Bar

Layout: `flex flex-wrap gap-2 items-center p-3 border-b border-border bg-background/50`

Componentes da linha:
1. **Search box** — `Input` com ícone Search, debounce 300ms, limpa com X
2. **Status** — `Select` com multi-check (nova/lida/processada/ignorada) — similar ao atual
3. **Advogado** — `Popover` com checkboxes — query dinâmica:
   ```typescript
   // Só advogados com intimações pendentes da org
   .from('advogados')
   .select('id, nome, oab')
   .eq('organizacao_id', orgId)
   // JOINear com intimacoes para filtrar só os com intimações ativas
   ```
4. **Tribunal** — `Select`: Todos / TJRS / TJSC / TJSP
5. **Classe** — `Popover` com checkboxes D/E/F/C/G (B e A não aparecem aqui)
6. **Arquivados** — `Button` toggle simples: "Mostrar arquivados" com ícone Archive
7. **Ordenação** — `Select`: Padrão / Mais recente / A-Z
8. **Total** — texto `"{n} intimações"` alinhado à direita

Chips de filtros ativos abaixo da linha principal — clicáveis para remover filtro individual.

---

## FASE 3 — Cards de Intimação (ControllerV4IntimacaoRow.tsx)

Criar `~/beta-mdflow/src/pages/controller/ControllerV4IntimacaoRow.tsx`.

### Anatomia do card

```
[checkbox] [dot urgência] [CNJ mono] [badge classe] [badge prazo]
           [Nome do cliente — negrito]
           [Empresa ré · Tribunal · OAB advogado]
           [🤖 Evento/ação IA · confiança]          [data · responsável sugerido]

           [ações hover: ↗ EPROC  ⚡ urgente  🗄 arquivar]
```

### Regras visuais

- **Checkbox:** esquerda, `h-4 w-4`, só visível quando bulk mode ativo ou no hover
- **Dot urgência:** `h-2 w-2 rounded-full` — vermelho se urgente, amarelo se importante, invisível se nenhum
- **CNJ:** `font-mono text-xs text-blue-300` — click copia para clipboard com toast "CNJ copiado"
- **Badge classe:** `classeColor(classe_cecilia)` — bordado compacto `text-[10px] px-1.5 py-0.5`
- **Badge prazo:** cor por `prazoStatus(dias_ate_prazo)`:
  - vencido/hoje: `bg-red-900/40 text-red-300`
  - crítico (≤3d): `bg-amber-900/40 text-amber-300`
  - atenção (≤7d): `bg-yellow-900/40 text-yellow-300`
  - normal: `bg-slate-800 text-slate-400`
  - sem_prazo: escondido
- **Card selecionado:** `ring-1 ring-primary bg-primary/5`
- **Card com drawer aberto:** `bg-muted/30 border-l-2 border-primary`
- **Height:** consistente ~72px para virtualização funcionar

### Hover actions (aparecem no hover, alinhados à direita)

```tsx
<div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
  <Button size="icon" variant="ghost" onClick={() => window.open(eprocUrl(cnj, tribunal))}>
    <ExternalLink className="h-3.5 w-3.5" />
  </Button>
  <Button size="icon" variant="ghost" onClick={toggleUrgente}>
    <Zap className={cn("h-3.5 w-3.5", urgente && "fill-amber-400 text-amber-400")} />
  </Button>
  <Button size="icon" variant="ghost" onClick={onArquivar}>
    <Archive className="h-3.5 w-3.5" />
  </Button>
</div>
```

### Agrupamento por data

Usar `ControllerV3IntimacaoGroup.tsx` existente como referência. Grupos:
- "Hoje" — intimações de hoje
- "Ontem"
- "Esta semana"
- "Mais antigas" — tudo anterior

Separador visual: `<div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide bg-muted/30">`

---

## FASE 4 — Virtualização da Lista (ControllerV4Intimacoes.tsx)

Criar `~/beta-mdflow/src/pages/controller/ControllerV4Intimacoes.tsx`.

Usar `@tanstack/react-virtual` para virtualizar. Se não estiver instalado:
```bash
cd ~/beta-mdflow && npm install @tanstack/react-virtual
```

### Lógica de carga

```typescript
// Paginação de 50 em 50 via infinite scroll
const PAGE_SIZE = 50;

// Query base — manter filtro de classe B e A sempre aplicado
.from('v_controller_intimacoes_completa')
.not('classe_cecilia', 'in', '("A","B")')  // filtrar ruído e ciência
.order('data_intimacao', { ascending: false })
.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
```

### Virtualização

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const rowVirtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 72,        // altura estimada do card
  overscan: 10,                   // renderizar 10 items extras fora da viewport
});
```

Sentinel para infinite scroll: `IntersectionObserver` no último item visível → carrega próxima página.

### Skeleton de loading

Durante `isFetching`: mostrar 5 cards skeleton com `animate-pulse`.

---

## FASE 5 — Cards Contadores (ControllerV4KPIs.tsx)

Criar `~/beta-mdflow/src/pages/controller/ControllerV4KPIs.tsx`.

4 cards clicáveis — reusando `rpc_controller_kpis`:

```typescript
interface KpiCard {
  label: string;
  value: number;
  icon: LucideIcon;
  color: string;
  onClick: () => void;  // aplica filtro na lista
}

const cards: KpiCard[] = [
  { label: 'Não lidas', value: kpis.novas, icon: Bell, color: 'text-blue-400', onClick: () => setFilter({status: ['nova']}) },
  { label: 'Urgentes', value: kpis.urgentes, icon: Zap, color: 'text-red-400', onClick: () => setFilter({urgente: true}) },
  { label: 'Vencem hoje', value: kpis.vencem_hoje, icon: Clock, color: 'text-amber-400', onClick: () => setFilter({prazo: 'hoje'}) },
  { label: 'Estratégicas E/F', value: kpis.estrategicas, icon: Star, color: 'text-emerald-400', onClick: () => setFilter({classe: ['E','F']}) },
];
```

**Layout:** `grid grid-cols-4 gap-3` — número grande 28px + label abaixo + ícone à direita.

**Counter na aba:** corrigir de `99+` para `{count > 9999 ? '9k+' : count.toLocaleString('pt-BR')}`.

---

## FASE 6 — Drawer v4 (ControllerV4Drawer.tsx)

Criar `~/beta-mdflow/src/pages/controller/ControllerV4Drawer.tsx`.

### Estrutura geral

```tsx
<Sheet open={open} onOpenChange={onClose}>
  <SheetContent
    side="right"
    style={{ width: drawerWidth }}  // persistido em localStorage('v4_drawer_width')
    className="flex flex-col p-0 gap-0"
  >
    <DrawerHeader />           {/* header fixo */}
    <Tabs className="flex-1 flex flex-col min-h-0">
      <TabsList />             {/* 4 abas */}
      <TabsContent />          {/* conteúdo scrollável */}
    </Tabs>
    <DrawerFooter />           {/* footer fixo com ações */}
  </SheetContent>
</Sheet>
```

**Largura persistente:**
```typescript
const [drawerWidth, setDrawerWidth] = useState(() =>
  localStorage.getItem('v4_drawer_width') ?? '28rem'
);
// Salvar quando usuário redimensionar (resize handle)
```

### Header do Drawer

```tsx
<div className="p-4 border-b border-border space-y-2">
  {/* Linha 1: CNJ + badges */}
  <div className="flex items-center gap-2 flex-wrap">
    <button
      onClick={() => copyToClipboard(cnj)}
      className="font-mono text-xs text-blue-300 hover:text-blue-200"
    >
      {cnj}
    </button>
    <Badge className="text-[10px]">{tribunal}</Badge>
    <Badge className={classeColor(classe_cecilia).bg + ' ' + classeColor(classe_cecilia).text + ' text-[10px]'}>
      {classe_cecilia}
    </Badge>
    {confianca_ia && (
      <span className="text-[10px] text-muted-foreground ml-auto">
        conf. {(confianca_ia * 100).toFixed(0)}%
      </span>
    )}
  </div>

  {/* Linha 2: Nome do cliente */}
  <div className="font-semibold text-sm">{cliente_nome}</div>
  <div className="text-xs text-muted-foreground">{empresa_nome} · {advogado_oab}</div>

  {/* Linha 3: Toggles + EPROC */}
  <div className="flex items-center gap-2">
    {/* Toggle urgente — PILL (não switch) */}
    <button
      onClick={() => toggleFlag('urgente')}
      className={cn(
        "h-7 px-3 rounded-full text-xs font-semibold border transition-all",
        urgente
          ? "bg-red-900/40 border-red-700 text-red-300"
          : "bg-transparent border-border text-muted-foreground hover:border-red-700/50"
      )}
    >
      ⚡ {urgente ? 'Urgente' : 'Urgente'}
    </button>

    {/* Toggle importante */}
    <button
      onClick={() => toggleFlag('importante')}
      className={cn(
        "h-7 px-3 rounded-full text-xs font-semibold border transition-all",
        importante
          ? "bg-amber-900/40 border-amber-700 text-amber-300"
          : "bg-transparent border-border text-muted-foreground hover:border-amber-700/50"
      )}
    >
      ★ {importante ? 'Importante' : 'Importante'}
    </button>

    {/* Abrir no EPROC */}
    <Button
      size="sm"
      variant="outline"
      className="ml-auto h-7 text-xs"
      onClick={() => window.open(eprocUrl(cnj, tribunal), '_blank')}
    >
      <ExternalLink className="h-3 w-3 mr-1" />
      EPROC
    </Button>
  </div>
</div>
```

### 4 Abas do Drawer

**Aba 1 — Intimação** (default)

Conteúdo:
```
[Card ação recomendada — destaque verde/vermelho dependendo da classe]
[Resumo IA — texto]
[Botão "Ver despacho completo" → Sheet secundário com conteudo_completo]
[Timeline de movimentações do processo — via historico_processo ou payload_raw]
```

Card ação recomendada:
```tsx
<div className="rounded-lg border p-3 bg-emerald-950/30 border-emerald-800/40">
  <div className="text-[10px] font-semibold text-emerald-400 uppercase mb-1">🎯 Ação Recomendada</div>
  <div className="font-semibold text-sm">{analise_ia?.acao_recomendada ?? '—'}</div>
  {prazo && <div className="text-xs text-muted-foreground mt-1">Prazo: {prazo} · {responsavel}</div>}
</div>
```

**Aba 2 — Processo**

Seções (collapsible dentro da aba):
1. **Processo** — dados básicos: vara, juiz, data distribuição, valor causa, AJG
2. **Cliente** — nome, CPF, contato (via tabela clientes)
3. **Jurimetria** — perfil do juiz, histórico de decisões favoráveis, adv. da ré
4. **Processos Relacionados** — lista compacta de outros processos do mesmo cliente

Usar `ControllerV3DrawerTabProcesso.tsx` existente como base e expandir.

**Aba 3 — Docs**

Reusar `ControllerV3DrawerTabDocumentos.tsx` existente — sem mudanças.

**Aba 4 — Chat IA**

```typescript
// Thread por CNJ — persistida via tabela controller_chat_threads
// Backend: webhook n8n POST /controller/chat
// Payload: { cnj, organizacao_id, message, context: { resumo_ia, analise_ia, processo } }

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}
```

UI: interface de chat simples. Input na base. Mensagens empilhando. Loading state com dots animados.

Query para buscar histórico:
```typescript
.from('controller_chat_threads')
.select('messages')
.eq('cnj', intimacao.cnj)
.eq('organizacao_id', orgId)
.single()
```

Se a tabela não existir, criar migration:
```sql
CREATE TABLE IF NOT EXISTS controller_chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id uuid REFERENCES organizacoes(id),
  cnj text NOT NULL,
  messages jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organizacao_id, cnj)
);
ALTER TABLE controller_chat_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON controller_chat_threads
  FOR ALL USING (organizacao_id = (SELECT organizacao_id FROM perfis WHERE id = auth.uid()));
```

Webhook n8n: `${N8N_BASE_URL}/webhook/controller-chat` (criar o webhook no n8n depois — por enquanto, endpoint placeholder que retorna "Estou processando...").

### Footer do Drawer (fixo)

```tsx
<div className="p-3 border-t border-border bg-muted/10 flex gap-2">
  {/* CTA Principal */}
  <Button
    className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white"
    onClick={() => onOpenAtividade(intimacao)}
  >
    <Plus className="h-4 w-4 mr-1.5" />
    Criar Atividade
  </Button>

  {/* Solicitar Documento */}
  <Button variant="outline" size="icon" onClick={() => onSolicitarDoc(intimacao)}>
    <Paperclip className="h-4 w-4" />
  </Button>

  {/* Menu secundário */}
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onClick={() => updateStatus('processada')}>✓ Marcar processada (P)</DropdownMenuItem>
      <DropdownMenuItem onClick={() => updateStatus('ignorada')}>Ignorar (I)</DropdownMenuItem>
      <DropdownMenuItem onClick={() => updateStatus('arquivada')}>Arquivar</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={reprocessarIA}>🤖 Reprocessar IA</DropdownMenuItem>
      {classe_cecilia === 'B' && (
        <DropdownMenuItem onClick={cienciaRenuncia}>Ciência com Renúncia</DropdownMenuItem>
      )}
    </DropdownMenuContent>
  </DropdownMenu>
</div>
```

Atalhos: `A` = criar atividade, `P` = processar, `I` = ignorar (manter os existentes).

---

## FASE 7 — Bulk Mode (ControllerV4BulkBar.tsx)

Criar `~/beta-mdflow/src/pages/controller/ControllerV4BulkBar.tsx`.

### Ativação

Checkbox em cada `ControllerV4IntimacaoRow`. Checkbox "Selecionar todos visíveis" no header da lista.

### Bulk Bar

Barra fixa no bottom (`position: fixed; bottom: 0; left: 0; right: 0`). Aparece com `animate-in slide-in-from-bottom` quando `selectedIds.length > 0`.

```tsx
<div className={cn(
  "fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur",
  "p-3 flex items-center gap-3",
  "translate-y-full transition-transform",
  selectedIds.length > 0 && "translate-y-0"
)}>
  <span className="text-sm font-semibold">{selectedIds.length} selecionadas</span>

  <Button size="sm" onClick={handleProcessar}>✓ Processar</Button>
  <Button size="sm" variant="outline" onClick={handleIgnorar}>Ignorar</Button>
  <Button size="sm" variant="outline" onClick={handleArquivar}>Arquivar</Button>
  <Button size="sm" variant="outline" onClick={handleCriarAtividades}>Criar Atividades</Button>
  <Button size="sm" variant="outline" onClick={handleReprocessarIA}>Reprocessar IA</Button>

  <Button variant="ghost" size="sm" className="ml-auto" onClick={clearSelection}>
    <X className="h-4 w-4" /> Desmarcar
  </Button>
</div>
```

Ações usam RPCs existentes:
- Processar/Ignorar/Arquivar → `rpc_controller_batch_update_status`
- Criar atividades → `rpc_controller_criar_atividades_lote`
- Reprocessar IA → webhook n8n (usar endpoint existente se disponível, senão skip)

Confirmação para arquivar/ignorar em lote:
```tsx
<AlertDialog> antes de executar — "Arquivar X intimações?"
```

---

## FASE 8 — Aba Equipe+ (ControllerEquipePlus.tsx)

Criar `~/beta-mdflow/src/pages/controller/ControllerEquipePlus.tsx`.

3 sub-seções via Tabs internos:

**Sub-seção Atividades:**
- Reusar `ControllerAtividades.tsx` existente como base
- Adicionar filtro por advogado e status
- Mostrar prazo em destaque

**Sub-seção Documentos Pendentes:**
- Reusar `ControllerDocumentos.tsx` existente como base
- Adicionar: dias sem impulsionar + última mensagem enviada

**Sub-seção Equipe:**
- Reusar `ControllerEquipe.tsx` existente
- Adicionar: throughput do dia por advogado

Visível para **todos** (remover `{isGestor &&}` guard).

---

## FASE 9 — Dashboard v4 (ControllerDashboard.tsx — refazer)

**Não criar novo arquivo — refazer o existente `ControllerDashboard.tsx`.**

Layout:
```
[4 KPI cards: processadas hoje / distribuições / prazo crítico / taxa resolução 7d]
[Gráfico barras: intimações por dia 7 dias — usando recharts (já está no projeto)]
[Gráfico donut: distribuição por classe D/E/F/C/G]
[Gráfico barras horizontal: throughput por advogado]
[Timeline de prazos da semana]
```

Reusar `rpc_controller_kpis` — adicionar campos se necessário (não executar migration sem aprovação).

Cache React Query: `staleTime: 5 * 60 * 1000` (5 minutos).

Visível para **todos**.

---

## FASE 10 — Monitoramento v4 (ControllerMonitoramento.tsx — refazer)

**Não criar novo arquivo — refazer o existente.**

Layout:
```
[Status por OAB: RS116571 / SC074025 / SC101023 / SP535101]
[Último ciclo: data + duração + processos verificados + intimações encontradas]
[Erros recentes: últimos 10]
[Enriquecimento: % campos preenchidos (vara, juiz, adv_reu)]
```

Fontes:
- Se existir tabela `cecilia_ciclos` → usar. Se não → mostrar placeholder "Aguardando dados do sistema de monitoramento".
- Se existir tabela `cecilia_erros` → usar. Senão → placeholder.

Verificar antes de fazer query — não falhar silenciosamente.

---

## FASE 11 — Playbooks v4 (ControllerTreinamentoHub.tsx — refazer como Playbooks)

**Não criar novo arquivo — refazer o existente `ControllerTreinamentoHub.tsx`.**

### v1 simplificada

1. **Lista de playbooks ativos:**
   - Buscar de `cecilia_playbooks` se existir. Se não existir → criar tabela:
   ```sql
   CREATE TABLE IF NOT EXISTS cecilia_playbooks (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     organizacao_id uuid REFERENCES organizacoes(id),
     nome text NOT NULL,
     conteudo_md text NOT NULL,
     ativo boolean DEFAULT true,
     created_at timestamptz DEFAULT now(),
     updated_at timestamptz DEFAULT now()
   );
   ALTER TABLE cecilia_playbooks ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "org_isolation" ON cecilia_playbooks
     FOR ALL USING (organizacao_id = (SELECT organizacao_id FROM perfis WHERE id = auth.uid()));
   ```
   - Inserir seeds iniciais: Taxonomia de Intimações, Regras João, Padrões de Ruído, Matriz de Roteamento.

2. **Editor de playbook:**
   - Textarea com `font-mono text-sm` para editar Markdown
   - Botão "Salvar" → UPDATE em `cecilia_playbooks`
   - Preview Markdown simples (usar `react-markdown` se disponível, senão `<pre>`)

3. **Padrões novos detectados:**
   - Buscar de `cecilia_padroes_novos` se existir. Se não → criar:
   ```sql
   CREATE TABLE IF NOT EXISTS cecilia_padroes_novos (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     organizacao_id uuid REFERENCES organizacoes(id),
     evento text NOT NULL,
     frequencia int DEFAULT 1,
     exemplos jsonb DEFAULT '[]'::jsonb,
     classificacao text,           -- preenchido pelo João
     resolvido_em timestamptz,
     created_at timestamptz DEFAULT now()
   );
   ```
   - Lista: "Evento X apareceu Y vezes — classificar como: [D/E/F/C/B/ruído]"
   - Botão classificar → UPDATE classificacao + resolvido_em

4. **Box de treinamento rápido:**
   - Input: "Ensinar padrão: [texto]"
   - Botão "Enviar" → POST para webhook n8n (placeholder por enquanto)

Badge na aba: count de `cecilia_padroes_novos` onde `resolvido_em IS NULL`.

---

## FASE 12 — Novo index.tsx (Orquestrador)

**Substituir** o `index.tsx` existente com nova estrutura de 6 abas:

```tsx
type TabName = 'intimacoes' | 'equipe' | 'dashboard' | 'monitoramento' | 'playbooks';

// 6 abas (sem isGestor guard — todas visíveis)
const TABS = [
  { value: 'intimacoes', label: 'Intimações', icon: Bell },
  { value: 'equipe',     label: 'Equipe+',    icon: Users },
  { value: 'dashboard',  label: 'Dashboard',  icon: BarChart3 },
  { value: 'monitoramento', label: 'Monitor', icon: Bot },
  { value: 'playbooks',  label: 'Playbooks',  icon: GraduationCap },
];
```

Counter da aba Intimações:
```tsx
// ANTES:
{count > 99 ? '99+' : count}

// DEPOIS:
{count > 9999 ? '9k+' : count.toLocaleString('pt-BR')}
```

Persistência de aba ativa em URL (já funciona via searchParams — manter).

---

## FASE 13 — Limpeza

Após validação completa de todas as fases:

1. Verificar se algum arquivo novo importa de `/controller-v2/` — se sim, corrigir
2. Verificar se `/controller-v2` está no router (`App.tsx`) — remover a rota
3. Deletar o diretório `~/beta-mdflow/src/pages/controller-v2/`
4. Deletar componentes V3 que foram substituídos (os novos V4 os substituem completamente):
   - `ControllerV3Intimacoes.tsx` → substituído por `ControllerV4Intimacoes.tsx`
   - `ControllerV3IntimacaoRow.tsx` → substituído por `ControllerV4IntimacaoRow.tsx`
   - `ControllerV3FilterBar.tsx` → substituído por `ControllerV4FilterBar.tsx`
   - `ControllerV3Drawer.tsx` e tabs → substituídos por `ControllerV4Drawer.tsx`
   - `ControllerV3BulkBar.tsx` → substituído por `ControllerV4BulkBar.tsx`
   - `ControllerV3KPIs.tsx`, `ControllerV3KPIsEnhanced.tsx` → substituídos por `ControllerV4KPIs.tsx`

**NÃO deletar:**
- `ControllerSheetAtividade.tsx` — reutilizado
- `ControllerSheetDocPendente.tsx` — reutilizado
- `controller_utils.ts` — atualizado
- `useControllerActions.ts` — reutilizado
- `ControllerExportDialog.tsx` — reutilizado

---

## Regras de Arquitetura

- **TypeScript strict:** sem `any` — usar tipos explícitos em tudo
- **Sem hardcode de org_id:** sempre `useAuth().organizacao_id`
- **React Query:** usar para todas as queries — `staleTime` e `gcTime` definidos
- **Error boundaries:** cada componente de aba deve ter try/catch ou ErrorBoundary
- **Sem alterar banco sem aprovação:** se precisar de nova migration, incluir o SQL no relatório e NÃO executar
- **Não modificar arquivos fora do diretório `/controller/`** sem avisar
- **Se ambíguo → interpretar de forma mais conservadora e documentar**
- **Não adicionar features não especificadas** neste documento
- **shadcn/ui:** usar os componentes já instalados — não instalar UI libs novas além de `@tanstack/react-virtual`
- **Tailwind CSS:** sem CSS-in-JS ou styled-components — só classes Tailwind
- **Recharts:** já instalado no projeto — usar para gráficos (não instalar alternativas)

---

## Screenshots Obrigatórios (ao final)

```bash
cd ~/beta-mdflow && npm run dev &
sleep 8
node -e "
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.setViewportSize({ width: 1400, height: 900 });
  await p.goto('http://localhost:5173/login');
  await p.fill('[name=email]', 'mdlab.equipe@gmail.com');
  await p.fill('[name=password]', 'MdL1501@');
  await p.click('button[type=submit]');
  await p.waitForLoadState('networkidle');
  await p.goto('http://localhost:5173/controller');
  await p.waitForLoadState('networkidle');
  await p.screenshot({ path: '/tmp/controller-v4-lista.png', fullPage: false });
  // Clicar no primeiro card para abrir drawer
  await p.click('[data-testid=\"intimacao-row\"]:first-child');
  await p.waitForTimeout(1000);
  await p.screenshot({ path: '/tmp/controller-v4-drawer.png', fullPage: false });
  await b.close();
})();
"
```

Se Playwright não funcionar, tirar screenshot via browser manual e documentar.

---

## Formato do Relatório Final (obrigatório)

```markdown
## ✅ Controller v4 — Relatório de Execução

### Fases concluídas
- Fase 0 — Verificação: [resultado]
- Fase 1 — Types + View SQL: [resultado]
...

### Arquivos criados
- [path]: [descrição]

### Arquivos modificados
- [path]: [o que mudou]

### Arquivos deletados
- [path]: [confirmação de que não havia mais dependências]

### Migrations SQL pendentes (executar manualmente)
```sql
-- [SQL aqui]
```

### Como testar
1. `cd ~/beta-mdflow && npm run dev`
2. Acesse http://localhost:5173/controller
3. Verificar: [checklist]

### O que NÃO foi feito (e por quê)
- [item]: [motivo]

### Screenshots
- [paths]

### Alertas / Revisão manual necessária
- [lista]
```

---

## Estimativa

Estimativa: **3-5 horas** para as Fases 0-12. Fase 13 (limpeza) após validação humana.

**Executar em ordem (0 → 12 → 13 ao final).** Reportar ao fim de cada fase antes de continuar para a próxima.
