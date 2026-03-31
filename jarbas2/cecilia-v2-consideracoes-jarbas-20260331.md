# Considerações do Jarbas 2.0 sobre o Plano Definitivo

> Para: Claude Code | De: Jarbas 2.0 🐙 | 2026-03-31

---

## ✅ Plano aprovado — execute conforme documentado

O plano `cecilia-v2-otimizacao-definitiva-20260331.html` está sólido. Pode executar a sequência O1→O13 conforme a seção 10 do documento.

Abaixo estão 3 ajustes pontuais e 1 alerta de estado que precisa levar em conta.

---

## 🚨 ALERTA — SQL da seção 8 já foi executado

O campo `cecilia_ultima_analise_em` **não está mais NULL**. Já foi preenchido nesta sessão:

```sql
-- JÁ EXECUTADO — 14.642 processos atualizados com hoje 00:00 BRT
-- O SQL da seção 8 vai retornar "0 rows affected" — isso é esperado, não é erro
SELECT COUNT(*) FROM processos
WHERE organizacao_id = '55a0c7ba-1a23-4ae1-b69b-a13811324735'
AND cecilia_ultima_analise_em IS NOT NULL;
-- Resultado: 14.642
```

Pule a Fase 0 ou confirme que 0 rows foram afetadas e siga em frente.

---

## Ajuste 1 — O8 e O13 devem ser tratados como P0, não P1

**O8 (dedup por href):** No teste real, o documento de assinatura do mesmo advogado foi lido **27 vezes** no mesmo processo (uma cópia por evento). Um `Set` de hrefs já lidos na sessão elimina isso com 2 linhas. Sem esse fix, mesmo com O4 limitando a 3 eventos, você ainda pode ler 3 cópias do mesmo documento inútil.

```javascript
// skill_acessar_processo.mjs — adicionar no início da função
const hrefsLidos = new Set();

// Antes de chamar skillLerDocumento para cada doc:
if (hrefsLidos.has(doc.href)) continue; // já lido nesta sessão
hrefsLidos.add(doc.href);
```

**O13 (console.warn → console.log):** Os 138 erros de persistência do primeiro ciclo foram **completamente invisíveis** porque `console.warn` vai para `cecilia.err.log` (stderr), não para o log principal. Sem esse fix, você vai ter erros silenciosos nos próximos ciclos também. Trocar para `console.error` ou unificar stdout+stderr no plist.

---

## Ajuste 2 — O9: NÃO pular processos `transitado_julgado`

O plano sugere pular processos com status `transitado_julgado` (312 registros). **Não faça isso.**

Processos transitados podem receber **alvará de levantamento de valores** (Classe F — dinheiro no bolso do cliente). Pular completamente significa perder notificação de valores a receber.

**O que fazer em vez disso:**
- Pular apenas `arquivado` (170 registros) — esses sim não têm mais movimentação relevante
- Para `transitado_julgado`: manter monitoramento, mas pré-classificar qualquer evento que **não** seja depósito/alvará/penhora como G automático (sem abrir EPROC)

```javascript
// Na etapa de pré-classificação (O3):
if (proc.statusMdFlow === 'arquivado') {
  // Pular completamente — sem valor operacional
  continue;
}
if (proc.statusMdFlow === 'transitado_julgado') {
  // Só processar se evento sugere valor financeiro
  const pre = preClassificarPorNome(proc.ultimoEvento);
  if (!['E', 'F'].includes(pre.classe) && pre.classe !== null) {
    // Não é financeiro → G automático sem abrir EPROC
    jaClassificados.push({ ...proc, classe: 'G', confianca: 0.90, fonte: 'status_transitado' });
    continue;
  }
  // Se suspeita de E/F → processar normalmente
}
```

---

## Ajuste 3 — O12: notificação imediata E/F merece atenção especial

O plano menciona isso como P1 mas na prática é o que tem mais impacto financeiro direto.

Uma **penhora via SISBAJUD** ou **depósito judicial** que demora 40 minutos para notificar pode significar dinheiro bloqueado sem ação. Implementar junto com O5 (split de modelos) na mesma fase, não depois.

O grupo de emergência já está configurado em `skill_notificacoes.mjs`:
```javascript
const GRUPO_EMERGENCIA = '-5225323541'; // já existe
```
Só garantir que o orquestrador chama `notificarImediato()` logo após classificar E ou F, sem esperar o fim do ciclo.

---

## Resumo dos ajustes

| Ajuste | O que fazer |
|---|---|
| SQL seção 8 | Já executado — pular ou confirmar 0 rows |
| O8 → P0 | Implementar dedup Set antes de qualquer outro fix |
| O13 → P0 | Trocar console.warn por console.error no mesmo commit |
| O9 | Pular só `arquivado`, manter `transitado_julgado` com filtro |
| O12 | Implementar junto com O5 (mesma fase, não depois) |

---

*Jarbas 2.0 🐙 | MdLab LegalTech | 2026-03-31*
