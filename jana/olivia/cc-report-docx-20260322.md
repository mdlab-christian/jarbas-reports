# OlivIA DOCX v5 — Formatacao Profissional

**Data:** 2026-03-22
**Executor:** JANA (MacBook Air M4)
**Sessao:** docx-generator v5

---

### O que foi feito

- **lib/docx-generator.mjs**: Novo modulo de geracao DOCX profissional usando npm `docx` (nao XML cru)
  - Parser de marcadores semanticos: `>>> JURIS ... <<< JURIS`, `>>> CITE ... <<< CITE`, `## Heading`
  - Heuristica para citacoes inline longas (aspas + >150 chars) -> estilo JURIS automatico
  - Estilos profissionais:
    - Normal: Times New Roman 12pt, recuo 1a linha 720twips (1.25cm), espacamento 1.5x
    - JURIS: Times New Roman 10pt italico, recuo 3cm esq+dir (1701 twips), espacamento simples
    - CITE: Times New Roman 11pt italico, recuo 2cm (1134 twips)
    - Heading1: Arial 14pt bold
    - Heading2: Arial 13pt bold
  - Header com advogado + OAB (JetBrains Mono) + CNJ
  - Footer com paginacao (pagina X / Y)
  - Margens profissionais: 3cm esq, 2cm dir/top/bottom
  - Deteccao de subtitulos juridicos em CAPS (DA, DO, DAS, DOS + palavras-chave)

- **olivia-cria-doc.mjs**: Refatorado para usar docx-generator.mjs
  - Removidas funcoes legadas: gerarDocx, gerarDocxSimples, sanitizarTexto (todas inline XML)
  - Removidas dependencias: PizZip, Docxtemplater
  - Import centralizado: `gerarDocxProfissional` e `sanitizarTexto` de ./lib/docx-generator.mjs
  - Chamada agora async (await gerarDocxProfissional)

### Arquivos modificados

- `/Users/Shared/olivia-skills/lib/docx-generator.mjs` (NOVO — 340 linhas)
- `/Users/Shared/olivia-skills/olivia-cria-doc.mjs` (EDITADO — removidas ~220 linhas legadas)

### Como testar

1. **Teste isolado do gerador:**
   ```bash
   node /Users/Shared/olivia-skills/lib/docx-generator.mjs
   # Gera /tmp/olivia-docx-test.docx (11.8 KB)
   ```

2. **Teste com peticao real (27.6K chars):**
   ```bash
   node /tmp/olivia-test-real.mjs
   # Gera /tmp/olivia-real-petition.docx (20.0 KB)
   ```

3. **Verificar no Word/LibreOffice:**
   - Abrir /tmp/olivia-real-petition.docx
   - Verificar: headings em Arial bold, paragrafos com recuo 1.25cm
   - Citacoes juridicas: 10pt italico com recuo 3cm bilateral
   - Header: advogado + OAB + CNJ
   - Footer: paginacao

4. **Teste E2E via servidor:**
   - Servidor rodando em localhost:3800
   - Pipeline completo com secoes_html -> DOCX profissional

### Resultados de teste

| Teste | Resultado | Detalhes |
|---|---|---|
| Self-test docx-generator | OK | 11.8 KB, formatacao correta |
| Peticao real 3c3bff6d | OK | 27.6K chars -> 20.0 KB DOCX |
| Deteccao headings ## | OK | 1 heading ## detectado |
| Deteccao CAPS headings | OK | 2 subtitulos CAPS detectados |
| Deteccao citacoes longas | OK | 5 citacoes inline detectadas |
| Import olivia-cria-doc | OK | Exports: [executar] |
| Server restart | OK | localhost:3800 healthy |

### Atencao

- olivia-formata-peticao.mjs NAO existe (nao havia conflito)
- Peticoes geradas ANTES do v5 usavam XML cru (PizZip) — formatacao generica
- Marcadores `>>> JURIS <<< JURIS` ainda nao sao inseridos pelo motor de geracao de peticoes
  - Heuristica de aspas longas cobre as citacoes inline existentes
  - Quando o motor passar a usar marcadores, o parser ja esta pronto

### Status

- [x] TAREFA 1: docx-generator.mjs criado e testado
- [x] TAREFA 2: olivia-cria-doc.mjs atualizado
- [x] TAREFA 3: Teste com peticao real
- [x] TAREFA 4: Verificacao de conflitos (nenhum encontrado)
