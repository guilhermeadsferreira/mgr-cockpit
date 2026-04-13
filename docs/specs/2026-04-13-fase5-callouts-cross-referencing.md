# Fase 5 — Callouts no MarkdownPreview + Tags de Fonte na Pauta

**Data:** 2026-04-13
**Gaps endereçados:** G4 (UI achata inteligência sofisticada)
**Branch:** `fix/fundacao-qualidade` (continuação)

---

## Parte 1: Callouts no MarkdownPreview

### Objetivo

O `MarkdownPreview` renderiza todo markdown como texto uniforme. Alertas críticos, reconhecimentos e sinais de baixa confiança têm o mesmo peso visual. Adicionar estilização contextual baseada nos padrões que já existem no output dos prompts.

### Regras de detecção

| Padrão detectado no heading | Estilo aplicado |
|---|---|
| Contém `⚠️` ou `Alerta` | `border-left: 3px solid var(--warning)` + background amarelo sutil |
| Contém `🔴` ou `Crítico` | `border-left: 3px solid var(--danger)` + background vermelho sutil |
| Contém `Reconhecimento` ou `✅` | `border-left: 3px solid var(--success)` + background verde sutil |
| `<li>` contém `(baixa confiança)` | Itálico + opacidade 0.65 (já existe) |

### Implementação

- Custom renderer para `h2`/`h3` no `ReactMarkdown` via prop `components`
- O heading wrapper recebe uma CSS class baseada no padrão detectado (`callout-warning`, `callout-danger`, `callout-success`)
- Itens (`<li>`, `<p>`) dentro da section herdam estilo via CSS descendant selectors
- Sem estado React — puramente className + CSS
- Cores usam CSS variables para respeitar o tema do app

### Arquivos alterados

- `src/renderer/src/components/MarkdownPreview.tsx` — custom renderers para h2/h3 com detecção
- CSS inline ou arquivo de estilos complementar (decidir na implementação se justifica arquivo separado)

---

## Parte 2: Tags de Fonte na Pauta

### Objetivo

Cada item da pauta gerada indica a sua origem (ação vencida, insight de 1:1, PDI, etc.) via badge visual. O gestor vê de relance de onde vem cada sugestão sem precisar navegar ao perfil.

### Schema atualizado

**Antes:**
```json
{
  "follow_ups": ["string"],
  "temas": ["string"],
  "perguntas_sugeridas": ["string"],
  "alertas": ["string"],
  "reconhecimentos": ["string"]
}
```

**Depois:**
```json
{
  "follow_ups": [{ "text": "string", "fonte": "string" }],
  "temas": [{ "text": "string", "fonte": "string" }],
  "perguntas_sugeridas": [{ "text": "string", "fonte": "string" }],
  "alertas": [{ "text": "string", "fonte": "string" }],
  "reconhecimentos": [{ "text": "string", "fonte": "string" }]
}
```

### Valores de `fonte`

| Fonte | Badge renderizado | Cor |
|---|---|---|
| `acao_vencida` | Acao vencida | laranja |
| `acao_gestor` | Gestor | azul |
| `insight_1on1` | Insight | roxo |
| `sinal_terceiro` | Sinal de par | teal |
| `pdi` | PDI | indigo |
| `dados_externos` | Jira/GitHub | cinza |
| `tema_recorrente` | Recorrente | amber |
| `delta` | Mudanca recente | verde |

### Backward-compatibility

- O parser aceita ambos os formatos: se item e `string`, renderiza sem badge. Se e `{text, fonte}`, renderiza com badge.
- Pautas ja geradas em disco (.md) nao sao afetadas.
- O badge e salvo no markdown como prefixo textual `[Badge]` para ser legivel em qualquer editor.

### Fluxo de implementacao

1. **`agenda.prompt.ts`** — atualizar instrucoes do JSON para incluir campo `fonte` com valores possiveis
2. **`AgendaAIResult`** (tipo em agenda.prompt.ts) — atualizar interface para aceitar `string | {text, fonte}`
3. **`renderAgendaMarkdown`** — renderizar badge inline no markdown (ex: `- [PDI] Discutir objetivo X...`)
4. **`MarkdownPreview.tsx`** — detectar padrao `[Badge]` no inicio de `<li>` e renderizar como `<span>` estilizado com cor correspondente

### Instrucao adicional no prompt

Adicionar ao bloco de regras:
```
- Cada item DEVE incluir campo "fonte" indicando a origem principal da sugestao.
  Valores validos: acao_vencida, acao_gestor, insight_1on1, sinal_terceiro, pdi, dados_externos, tema_recorrente, delta.
  Se nao ha fonte clara, use "tema_recorrente".
```

---

## Decisoes de design

1. **Deteccao automatica (nao syntax especial)** — evita mudancas nos prompts para callouts. Os padroes ja existem.
2. **Badge textual no .md** — pautas sao write-once em disco e legiveis em qualquer editor. O badge `[PDI]` e universal.
3. **Backward-compatible** — pautas antigas sem `fonte` continuam renderizando normalmente.
4. **Sem links navegaveis (por enquanto)** — o badge comunica a origem sem fricao. Navegacao pode ser adicionada no futuro em cima do campo `fonte` ja existente.

---

## Riscos

| Risco | Mitigacao |
|---|---|
| IA nao preenche `fonte` consistentemente | Parser trata ausencia como sem badge; valor default `tema_recorrente` na instrucao |
| Callout detection falso positivo (emoji em contexto diferente) | Deteccao apenas em headings h2/h3, nao no corpo |
| Mudanca no schema quebra pautas em geracao | Tipo union `string | {text, fonte}` garante backward-compat |
