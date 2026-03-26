# PROMPT — Claude Code CRM Master v3
> Gerado por JARBAS em 20/03/2026 a partir de 5 áudios de revisão manual de Gustavo Paz

---

## CONTEXTO GERAL

Você tem o HTML completo do Plano Master v2 em:
`~/jarbas-reports/crm-plano-master-v2-2026-03-20.html`

Este prompt traz as **considerações manuais de revisão** feitas por Gustavo Paz via áudio, que **prevalecem sobre qualquer revisão automática anterior**. Seu trabalho é:

1. **Gerar um HTML atualizado (Plano Master v3)** incorporando todas as decisões abaixo
2. **Dividir a execução em prompts separados**, organizados por dependência e paralelismo
3. **Definir quantos terminais são necessários** e em que ordem rodar
4. **Criar um orquestrador principal** (Terminal 0) que sabe tudo e no final valida, testa e gera relatório de fechamento

---

## DECISÕES DE ÁUDIO — CONSOLIDADAS

### 🗂️ CRM Kanban

| Item | Decisão |
|---|---|
| Coluna "Documentos Pendentes" | **REMOVER** — não vai existir |
| Badge "Processável" nos cards | **REMOVER** — não queremos |
| Coluna "Aguardando Documentos" | **MANTER** |

### 📁 Sistema de Documentos (Aba Docs — Redesign Central)

Esta é a feature de maior impacto. Rege CRM Drawer, Cliente Drawer, Página Cliente.

**Upload:**
- Arrastar documento → vai direto para as pastas **sem botão de confirmação**
- Cada documento tem botão de **URL** → abre em nova aba

**Upload central (topo):**
- Vai para TODAS as pastas/restrições

**Upload dentro de pasta:**
- Vai APENAS para aquela restrição
- Feedback visual: pasta fica **tom verde** + setinha/indicador de confirmação

**Botões geradores no topo:**
- **Gerar Procuração** + **Gerar Contratos** — dois botões separados (não parecer upload)
- Geram para TODAS as restrições processáveis de uma vez
- Só aparecem quando `temCliente = true`
- **Sem** botão "Gerar Contrato" dentro de cada pasta individual

**Design dos cards de pasta:**
- Nome da empresa: destaque principal (fonte maior/mais chamativa)
- Número do contrato, órgão restritivo, outros dados: fonte menor/cor secundária
- **Cor da pasta:** APENAS empresa **Boa Vista** = amarelo (#fbbf24); demais = cores padrão
  - Remover a seção de "paleta por bureau" — era só Boa Vista empresa mesmo
- Pastas ordenadas **alfanumericamente** (1, 2, 3, A, B, C…)
- Exemplo Boa Vista: mostrar apenas o **valor**, sem contrato/data/órgão

**Comportamento:**
- Drag & drop funciona também no card em **modo lista** → arquivo entra direto na pasta
- Dentro da pasta: ver docs, editar nome, baixar
- Restrições **não processáveis**: ficam só na aba Restrições, NÃO geram pasta
- Somente restrições processáveis aparecem como pastas

**Replicação:**
- Lógica de pastas idêntica em: Drawer CRM, Drawer Cliente, Página Cliente, Drawer Agendados, Drawer Processo (sem botões geradores no processo)
- Pastas **vinculadas entre contextos**: upload/geração em um lugar atualiza nos demais (cliente, processo, etc.)

---

### 📤 Drawer Agendados / Aguardando Distribuição

**Problema principal:** Drawer "Aguardando Distribuição" está ERRADO. Deve ser igual ao Drawer dos Agendados. Criar componente reutilizável baseado no Drawer dos Agendados e replicar para o Aguardando Distribuição.

**Correções no Drawer dos Agendados (template):**

**Dados:** OK

**Restrições Vinculadas:**
- Adicionar órgão restritivo
- Adicionar número do contrato
- **NÃO permitir editar** a restrição vinculada

**Movimentações:**
- Apenas movimentações do CRM (pré-distribuição), não pós-processo

**Documentos:**
- Apenas 2 botões: **Gerar Comprovante de Restrição** + **Gerar Petição Inicial**
- Remover: Procuração, Contratos de Honorários
- Quando gera petição inicial ou comprovante → documento fica salvo na pasta do processo
- Pasta da restrição (igual ao design CRM)

**Card "Outros Processos":**
- Adicionar: valor da causa, número do contrato, órgão restritivo

---

### 🏠 Drawer Cliente

**Dados Pessoais:**
- Mostrar tudo cadastrado no CRM (endereço + dados)
- NÃO replicar todos os dados da Página Cliente — manter só dados pessoais no drawer

**Restrições:**
- Igual ao CRM pós-correções
- **NÃO permitir adicionar restrição** — essa etapa já passou

**Jurídico (Processos vinculados):**
- Card: número do processo + empresa ré
- Badge "Não Distribuído" com cor diferente se não distribuído
- Botão copiar URL do processo (leva direto para a página do processo)

**Documentos:**
- Exatamente igual ao CRM (pastas por restrição, upload, etc.)

**Histórico:**
- Todo o histórico: CRM → Distribuição → etapas pós-distribuição

**Nova aba: Documentos Pendentes**
- Aba dedicada para documentos pendentes pós-processo
- Aparece tanto no Drawer Cliente quanto na Página Cliente

---

### 📄 Página Cliente

**Dados:** aprovado como está. Estado civil e nacionalidade podem ter.
Dados extras ficam SÓ na página cliente, não replicar no drawer.

**Documentos:**
- Igual ao CRM (crítico)
- Adicionar aba **Documentos Pendentes**
- Nos cards de restrição: adicionar número do processo (diferença do drawer)

**Processos:** mesma lógica do drawer

**Financeiro:** aba invisível para quem não tem acesso

**Relatório PDF:** não precisa funcionar — não planejado ainda

**Botão "Criar/Novo Processo":** remover

---

### ⚖️ Drawer Processo

**Dados:**
- Valor da causa + valor da restrição → visíveis para todos (sem restrição de permissão)
- Card empresa ré → remover; nome da empresa fica na Restrição Principal
- Restrição Principal → adicionar: data, nome, tipo (comprador), todos os dados
  - Remover aba separada de Restrições (consolidada em Dados)
- Vara, comarca/cidade, juiz → adicionar em Dados (preenchidos após distribuição)
- Advogado responsável → mover para Dados do Processo; remover de onde está (aba Docs)
- Número do processo duplicado 3x → manter apenas o da linha de baixo, remover os dois do cabeçalho

**Movimentações:** manter tudo que já foi planejado

**Decisões:** vínculo com página Decisões — OK

**Documentos:**
- Manter documentos manuais existentes
- Adicionar lógica de pastas por restrição (igual drawer Agendados)
- Remover todos os botões geradores: Petição Inicial, Contratos, Procuração, Comprovante
- Remover advogado responsável daqui (vai para Dados)

**Aba Restrições:** remover

---

### 📄 Página Processo

- Mesmas mudanças do Drawer Processo
- Vara, comarca/cidade, juiz
- Remover card empresa ré
- Restrição Principal completa (nome, data, tipo, todos os dados)
- Documentos: mesma lógica do drawer
- Aba Restrições: remover
- Audiências: vínculo com página Audiências — OK
- Drawer e Página Processo devem ser **conectados** (mesmas queries)
- Remover "Criar Processo / Novo Processo"

---

## O QUE VOCÊ DEVE GERAR

### 1. HTML Plano Master v3

Gere um HTML atualizado (`crm-plano-master-v3-2026-03-20.html`) com:
- Todas as decisões de áudio acima incorporadas
- Seção de prioridades atualizada (remover o que foi cancelado, marcar o que mudou)
- Tabela de botões geradores por contexto (atualizada)
- Seção "Sistema de Documentos v2" com o novo comportamento
- Status de cada módulo: CRM Kanban, Docs, Drawer Dist, Drawer Cliente, Página Cliente, Drawer Processo, Página Processo
- **Manter** o estilo visual do v2 (Design System: #12100e, teal #20c997)

### 2. Prompts de Execução Separados

Divida a implementação em prompts separados. Para cada prompt:
- Dê um título claro
- Liste os arquivos que serão modificados
- Indique dependências (precisa do prompt X antes)
- Estime o tamanho (XS/S/M/L/XL)
- Marque se pode rodar em paralelo

Você pode criar quantos prompts quiser. Organize da forma que achar melhor — pode ser por página, por feature, ou por camada (banco → componente → página). O que importa é que:
- Prompts independentes sejam claramente identificados como "pode rodar em paralelo"
- Prompts com dependências indiquem o que precisa vir antes
- Cada prompt seja autocontido (com contexto suficiente para executar)

### 3. Terminal 0 — Orquestrador Principal

Crie um prompt especial para o Terminal 0 (orquestrador). Ele deve:
- Ter todo o contexto do que está sendo feito
- Saber quais terminais existem e em que ordem rodar
- Após todos os outros terminais finalizarem: executar validação end-to-end
  - Verificar se cada feature foi implementada
  - Verificar se o código compilou sem erros
  - Testar o fluxo: CRM → Documentos → Distribuição → Processo → Cliente
  - Listar o que ficou pendente ou com erro
  - Gerar relatório final em HTML mostrando: o que foi feito, o que passou, o que falhou
- Ficar em loop de validação até tudo estar OK ou identificar bloqueios humanos

---

## REGRAS DE EXECUÇÃO

- Se houver **decisão crítica** sem informação suficiente → interromper e perguntar antes de continuar
- **Commits** ao final de cada terminal concluído (não commitar a cada arquivo)
- O Terminal 0 só gera o relatório final após receber confirmação de que todos os outros terminais rodaram
- Se algo no plano contradizer o código real → sinalizar e perguntar (não assumir)

---

## OUTPUT ESPERADO

1. `~/jarbas-reports/crm-plano-master-v3-2026-03-20.html` — HTML do plano atualizado
2. Dentro do HTML v3: seção com todos os prompts de execução formatados e numerados
3. Terminal 0 identificado claramente como "ORQUESTRADOR — rodar por último"

Salve o HTML em `~/jarbas-reports/` e faça git push ao final.
