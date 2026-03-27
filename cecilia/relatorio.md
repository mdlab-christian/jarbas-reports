# Relatório E2E Cecília — 27/03/2026
> Gerado em: 27/03/2026, 04:38:28 | Duração: 51s

## Resumo

| Métrica | Valor |
|---------|-------|
| OABs testadas | 3 |
| Logins OK | ✅ 2 |
| Logins com falha | ❌ 1 |
| Processos coletados | 0 |
| Intimações inseridas | 0 |
| Issues críticos | 🔴 1 |
| Issues altos | 🟠 2 |
| Issues médios | 🟡 1 |

---

## Resultados por OAB

### SC074025 (TJSC)
- **Login:** ✅ OK
- **Tempo de login:** 8513ms
- ⚠️ Nenhum processo coletado

### SP535101 (TJSP)
- **Login:** ✅ OK
- **Tempo de login:** 6446ms
- ⚠️ Nenhum processo coletado

### RS116571 (TJRS)
- **Login:** ❌ FALHOU
- **Tempo de login:** 7076ms

---

## Issues Encontrados

### 🟡 [MEDIO] Não foi possível limpar tabela intimacoes: canceling statement due to statement timeout
**Sugestão:** Verificar permissões RLS

### 🟠 [ALTO] Tabela de processos não encontrada para SC074025
**Sugestão:** Verificar URL da lista ou seletor da tabela

### 🟢 [BAIXO] Nenhum processo encontrado para SC074025
**Sugestão:** Verificar se conta tem processos ativos

### 🟠 [ALTO] Tabela de processos não encontrada para SP535101
**Sugestão:** Verificar URL da lista ou seletor da tabela

### 🟢 [BAIXO] Nenhum processo encontrado para SP535101
**Sugestão:** Verificar se conta tem processos ativos

### 🔴 [CRITICO] Login falhou para RS116571: https://keycloak-eks.tjrs.jus.br/realms/eproc/login-actions/
**Sugestão:** Verificar credenciais

---

## Screenshots Capturadas

- `001-login-SC074025-01-initial.png` — Página inicial login TJSC
- `002-login-SC074025-02-after-submit.png` — Após submit
- `003-login-SC074025-05-logado.png` — Logado com sucesso
- `004-list-SC074025-01-lista.png` — Lista de processos com movimentação
- `005-list-SC074025-02-erro.png` — Tabela não encontrada
- `006-result-SC074025-final.png` — 0 processos coletados
- `007-login-SP535101-01-initial.png` — Página inicial login TJSP
- `008-login-SP535101-02-after-submit.png` — Após submit
- `009-login-SP535101-05-logado.png` — Logado com sucesso
- `010-list-SP535101-01-lista.png` — Lista de processos com movimentação
- `011-list-SP535101-02-erro.png` — Tabela não encontrada
- `012-result-SP535101-final.png` — 0 processos coletados
- `013-login-RS116571-01-initial.png` — Página inicial login TJRS
- `014-login-RS116571-02-after-submit.png` — Após submit
- `015-login-RS116571-05-erro.png` — ERRO no login

---

## Plano de Melhorias

### Navegação EPROC

1. **Jitter de login** — Adicionar delay aleatório (1-3s) entre abrir URL e preencher campos para evitar detecção de bot
2. **Reutilização de sessão** — Usar perfis Playwright persistentes por OAB para evitar re-login a cada ciclo
3. **Timeout adaptativo** — Aumentar timeout em horários de pico do EPROC (9h-11h, 14h-16h)
4. **Detecção de CAPTCHA** — Adicionar fallback visual (screenshot + análise IA) quando página travar
5. **Paginação inteligente** — Detectar número total de páginas antes de paginar para estimar duração

### Pipeline de Dados

6. **Deduplificação por CNJ+data** — Usar (cnj, data_evento) como chave única além do signature_hash
7. **Enriquecimento lazy** — Só buscar texto completo de intimações com keywords relevantes
8. **Priorização por data** — Ordenar fila de processamento por data_evento mais recente

### Observabilidade

9. **Métricas de timing** — Registrar tempo de cada etapa do login para detectar lentidão
10. **Screenshot on error** — Sempre capturar screenshot quando qualquer step falhar
