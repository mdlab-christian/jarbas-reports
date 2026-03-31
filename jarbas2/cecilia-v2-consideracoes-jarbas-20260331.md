# Considerações do Jarbas 2.0 sobre o Plano Definitivo

> Para: Claude Code | De: Jarbas 2.0 🐙 | 2026-03-31

---

## ✅ Plano aprovado — execute conforme documentado

O plano `cecilia-v2-otimizacao-definitiva-20260331.html` está sólido. Pode executar a sequência O1→O13 conforme a seção 10 do documento.

Abaixo estão ajustes pontuais, alertas de estado e as instruções de teste final.

---

## 🚨 ALERTA 1 — SQL da seção 8 já foi executado

O campo `cecilia_ultima_analise_em` **não está mais NULL**. Já foi preenchido:

```sql
-- JÁ EXECUTADO — 14.642 processos atualizados com hoje 00:00 BRT
-- O SQL da seção 8 vai retornar "0 rows affected" — esperado, não é erro
SELECT COUNT(*) FROM processos
WHERE organizacao_id = '55a0c7ba-1a23-4ae1-b69b-a13811324735'
AND cecilia_ultima_analise_em IS NOT NULL;
-- Resultado: 14.642
```

**Por que foi feito assim:** Essa é a primeira vez que o sistema roda em produção. Para garantir que a Cecília não tente processar o histórico completo de todos os processos (o que causou o ciclo de 25 minutos para apenas 3 processos), preenchemos `cecilia_ultima_analise_em = 2026-03-31 00:00:00 BRT` em todos os 14.642 processos da organização.

**Consequência:** O sistema vai capturar apenas movimentações que ocorreram **a partir de hoje 00:00 BRT**. Isso é o comportamento correto — meia-noite de hoje é o ponto zero do sistema. Movimentações históricas já estão no ADVBOX/MdFlow, não precisamos processar novamente.

**Ação:** Pule a Fase 0 do plano (SQL de inicialização) — já foi executada.

---

## 🚨 ALERTA 2 — Ciclo RS131163 travado em "executando"

A OAB RS131163 tem um ciclo com `status = 'executando'` desde 15:16 UTC (mais de 1 hora). Esse ciclo está travado — provavelmente falhou no login (essa OAB pode não ter TOTP configurado).

**Ação necessária antes de implementar as otimizações:**

```sql
-- Marcar ciclo travado como erro para não bloquear próximos ciclos
UPDATE cecilia_ciclos
SET status = 'erro', concluido_em = NOW()
WHERE oab = 'RS131163'
AND status = 'executando'
AND organizacao_id = '55a0c7ba-1a23-4ae1-b69b-a13811324735';
```

Depois reiniciar a Cecília:
```bash
ssh mac-mini-tail "echo '010597' | sudo -S launchctl kickstart -k gui/506/ai.cecilia.skills"
```

---

## Ajuste 1 — O8 e O13 devem ser P0, não P1

**O8 (dedup por href):** No teste real, o mesmo documento de assinatura foi lido **27 vezes** (uma cópia por evento do processo). Um `Set` de hrefs já lidos elimina isso com 2 linhas.

```javascript
// skill_acessar_processo.mjs — adicionar no início da função de extração
const hrefsLidos = new Set();
// Antes de chamar skillLerDocumento para cada doc:
if (hrefsLidos.has(doc.href)) continue;
hrefsLidos.add(doc.href);
```

**O13 (console.warn → console.error):** Os 138 erros de persistência do primeiro ciclo foram **completamente invisíveis** porque `console.warn` vai para stderr, não para o log principal. Sem esse fix, erros críticos ficam ocultos. Trocar todos os `console.warn` críticos para `console.error`, ou unificar stdout+stderr no plist.

---

## Ajuste 2 — O9: NÃO pular processos `transitado_julgado`

O plano sugere pular `transitado_julgado` (312 registros). **Não faça isso.**

Processos transitados podem receber **alvará de levantamento de valores** (Classe F). Pular = perder notificação de dinheiro.

```javascript
// Na pré-classificação (O3):
if (proc.statusMdFlow === 'arquivado') continue; // ← pular APENAS esses
if (proc.statusMdFlow === 'transitado_julgado') {
  const pre = preClassificarPorNome(proc.ultimoEvento);
  if (!['E', 'F'].includes(pre.classe) && pre.classe !== null) {
    // Não é financeiro → G automático sem abrir EPROC
    jaClassificados.push({ ...proc, classe: 'G', confianca: 0.90, fonte: 'status_transitado' });
    continue;
  }
  // Suspeita de E/F → processar normalmente
}
```

---

## Ajuste 3 — O12: implementar junto com O5 (mesma fase)

Penhora/SISBAJUD/depósito com 40 minutos de atraso tem custo real. Implementar notificação imediata E/F na mesma fase que o split de modelos, não depois.

O grupo de emergência já existe em `skill_notificacoes.mjs`:
```javascript
const GRUPO_EMERGENCIA = '-5225323541'; // já configurado
```

---

## 🧪 Teste Final Obrigatório (antes de ativar os crons)

Após implementar todas as otimizações e reiniciar a Cecília, **não ativar os crons ainda**. Primeiro rodar um teste controlado:

### Objetivo do teste
- Validar que o pipeline otimizado funciona corretamente
- Ver os resultados na página /controller do MdFlow
- Confirmar custo e tempo dentro das metas

### Como rodar o teste

Disparar um ciclo manual limitado a **10 processos por OAB** para as 5 OABs cadastradas, buscando apenas movimentações desde hoje 00:00 BRT:

```javascript
// Inserir tarefa de teste no Supabase (ou chamar diretamente no código):
// O ciclo deve:
// 1. Pegar o XLS de cada OAB
// 2. Filtrar só processos com dataEvento >= 2026-03-31 00:00 BRT
// 3. Aplicar pipeline otimizado (pré-classificação + IA)
// 4. Persistir em intimacoes (status: 'nova')
// 5. PARAR após processar os primeiros 10 processos com movimentação por OAB
// 6. Logar métricas: tempo, docs lidos, Vision calls, custo estimado
```

Se o orquestrador não tiver parâmetro de `limit`, adicionar temporariamente para o teste:

```javascript
// Em executarCiclo(), após filtrar processosRelevantes:
const processosParaTestar = processosRelevantes.slice(0, 10); // ← limit para teste
// Usar processosParaTestar em vez de processosRelevantes
```

### OABs a testar
- RS116571 (TJRS)
- RS131163 (TJRS) — atenção: pode não ter TOTP, monitorar login
- SC074025 (TJSC)
- SC075466 (TJSC)
- SP535101 (TJSP)

### Critérios de sucesso
| Métrica | Meta |
|---|---|
| Tempo por OAB | < 5 minutos |
| Docs lidos por processo | 0–2 |
| Vision calls por ciclo | < 10 |
| Registros em `intimacoes` | > 0 (ao menos 1 por OAB com movimentação) |
| Status dos registros | `nova` (não `pendente_revisao`) |
| Custo estimado por OAB | < $0.05 |

### Verificar resultado na página /controller
Após o teste, confirmar que as intimações aparecem no /controller do MdFlow com:
- Classe A-G preenchida
- Campo `_analista_raw` com schema v2 (confianca, classe_ia, justificativa_ia)
- Responsável sugerido (quando aplicável)

### Só após validar o teste: ativar os crons
```javascript
// start.mjs — remover [PAUSADO] e reativar:
cron.schedule('0 3 * * *',  () => iniciarCiclo('00h'));  // 00h BRT
cron.schedule('0 15 * * *', () => iniciarCiclo('12h'));  // 12h BRT
cron.schedule('0 21 * * *', () => iniciarCiclo('18h'));  // 18h BRT
```

---

## Resumo de tudo

| Item | Ação |
|---|---|
| SQL seção 8 | ✅ Já executado — pular |
| Ciclo RS131163 travado | Marcar como erro + reiniciar Cecília |
| O8 + O13 | Tratar como P0 |
| O9 | Pular só `arquivado`, não `transitado_julgado` |
| O12 | Implementar junto com O5 |
| Teste final | 10 processos por OAB + verificar /controller |
| Crons | Só ativar após teste validado |

---

*Jarbas 2.0 🐙 | MdLab LegalTech | 2026-03-31*
