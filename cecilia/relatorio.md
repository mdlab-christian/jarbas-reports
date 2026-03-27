# Relatório E2E Cecília — 27/03/2026
> Gerado em: 27/03/2026, 04:49:22 | Duração: 55s

## Resumo

| Métrica | Valor |
|---------|-------|
| OABs testadas | 3 |
| Logins OK | ✅ 3 |
| Logins com falha | ❌ 0 |
| Processos coletados | 0 |
| Intimações inseridas | 0 |
| Issues críticos | 🔴 0 |
| Issues altos | 🟠 0 |
| Issues médios | 🟡 0 |

---

## Resultados por OAB

### SC074025 (TJSC)
- **Login:** ✅ OK
- **Tempo de login:** 13584ms
- ⚠️ Nenhum processo coletado

### SP535101 (TJSP)
- **Login:** ✅ OK
- **Tempo de login:** 11175ms
- ⚠️ Nenhum processo coletado

### RS116571 (TJRS)
- **Login:** ✅ OK
- **Tempo de login:** 11806ms
- ⚠️ Nenhum processo coletado

---

## Issues Encontrados

### 🟢 [BAIXO] Nenhum processo encontrado para SC074025
**Sugestão:** Verificar se conta tem processos ativos

### 🟢 [BAIXO] Nenhum processo encontrado para SP535101
**Sugestão:** Verificar se conta tem processos ativos

### 🟢 [BAIXO] Nenhum processo encontrado para RS116571
**Sugestão:** Verificar se conta tem processos ativos

---

## Screenshots Capturadas

- `001-login-SC074025-01-initial.png` — Página inicial login TJSC
- `002-login-SC074025-02-after-submit.png` — Após submit
- `003-login-SC074025-03-totp.png` — Após TOTP
- `004-login-SC074025-04-perfil.png` — Após seleção de perfil
- `005-login-SC074025-05-logado.png` — Logado com sucesso
- `006-list-SC074025-01-lista.png` — Lista de processos com movimentação
- `007-result-SC074025-final.png` — 0 processos coletados
- `008-login-SP535101-01-initial.png` — Página inicial login TJSP
- `009-login-SP535101-02-after-submit.png` — Após submit
- `010-login-SP535101-03-totp.png` — Após TOTP
- `011-login-SP535101-05-logado.png` — Logado com sucesso
- `012-list-SP535101-01-lista.png` — Lista de processos com movimentação
- `013-result-SP535101-final.png` — 0 processos coletados
- `014-login-RS116571-01-initial.png` — Página inicial login TJRS
- `015-login-RS116571-02-after-submit.png` — Após submit
- `016-login-RS116571-03-totp.png` — Após TOTP
- `017-login-RS116571-04-perfil.png` — Após seleção de perfil
- `018-login-RS116571-05-logado.png` — Logado com sucesso
- `019-list-RS116571-01-lista.png` — Lista de processos com movimentação
- `020-result-RS116571-final.png` — 0 processos coletados

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
