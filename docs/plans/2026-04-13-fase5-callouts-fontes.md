# Fase 5 — Callouts + Tags de Fonte — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar callouts visuais ao MarkdownPreview e tags de fonte por item nas pautas geradas.

**Architecture:** Duas mudanças independentes — (1) custom renderers no ReactMarkdown para estilizar headings/seções por contexto semântico, (2) atualização do schema da pauta para incluir campo `fonte` por item, com rendering de badge no markdown.

**Tech Stack:** React, ReactMarkdown, TypeScript, CSS variables do tema existente.

---

## File Map

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `src/renderer/src/components/MarkdownPreview.tsx` | Modificar | Custom renderers h2/h3 + badge renderer em li |
| `src/renderer/src/index.css` | Modificar | CSS para callout sections e badges |
| `src/main/prompts/agenda.prompt.ts` | Modificar | Schema JSON com `fonte`, interface, renderer |
| `src/main/index.ts` | Sem mudança | Já usa `AgendaAIResult` e `renderAgendaMarkdown` — backward-compat |

---

## Task 1: Callouts no MarkdownPreview

**Files:**
- Modify: `src/renderer/src/components/MarkdownPreview.tsx`
- Modify: `src/renderer/src/index.css`

- [ ] **Step 1: Adicionar CSS classes para callout sections**

Adicionar ao final de `src/renderer/src/index.css`, após as regras `.md-preview` existentes:

```css
/* ── Callout sections ─────────────────── */
.md-preview .callout-warning {
  border-left: 3px solid var(--amber);
  background: var(--amber-dim);
  border-radius: var(--r-sm);
  padding: 8px 12px;
  margin: 8px 0;
}

.md-preview .callout-danger {
  border-left: 3px solid var(--red);
  background: var(--red-dim);
  border-radius: var(--r-sm);
  padding: 8px 12px;
  margin: 8px 0;
}

.md-preview .callout-success {
  border-left: 3px solid var(--green);
  background: var(--green-dim);
  border-radius: var(--r-sm);
  padding: 8px 12px;
  margin: 8px 0;
}

.md-preview .callout-warning h2,
.md-preview .callout-warning h3,
.md-preview .callout-danger h2,
.md-preview .callout-danger h3,
.md-preview .callout-success h2,
.md-preview .callout-success h3 {
  margin-top: 0;
}
```

- [ ] **Step 2: Implementar custom renderers no MarkdownPreview**

Reescrever `src/renderer/src/components/MarkdownPreview.tsx`:

```tsx
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ReactNode } from 'react'
import { useState } from 'react'

interface Props {
  content: string
  maxHeight?: number
}

function getCalloutClass(text: string): string | null {
  if (/⚠️|[Aa]lerta/.test(text)) return 'callout-warning'
  if (/🔴|[Cc]rítico/.test(text)) return 'callout-danger'
  if (/[Rr]econhecimento|✅/.test(text)) return 'callout-success'
  return null
}

const FONTE_COLORS: Record<string, { bg: string; color: string }> = {
  'Ação vencida': { bg: 'var(--amber-dim)', color: 'var(--amber)' },
  'Gestor':       { bg: 'var(--blue-dim)', color: 'var(--blue)' },
  'Insight':      { bg: 'rgba(128, 90, 200, 0.12)', color: '#9B6FD4' },
  'Sinal de par': { bg: 'rgba(56, 178, 172, 0.12)', color: '#38B2AC' },
  'PDI':          { bg: 'rgba(99, 102, 241, 0.12)', color: '#6366F1' },
  'Jira/GitHub':  { bg: 'var(--surface-3)', color: 'var(--text-secondary)' },
  'Recorrente':   { bg: 'var(--amber-dim)', color: 'var(--yellow)' },
  'Mudança':      { bg: 'var(--green-dim)', color: 'var(--green)' },
}

const FONTE_MAP: Record<string, string> = {
  acao_vencida: 'Ação vencida',
  acao_gestor: 'Gestor',
  insight_1on1: 'Insight',
  sinal_terceiro: 'Sinal de par',
  pdi: 'PDI',
  dados_externos: 'Jira/GitHub',
  tema_recorrente: 'Recorrente',
  delta: 'Mudança',
}

function FonteBadge({ tag }: { tag: string }) {
  const label = FONTE_MAP[tag] || tag
  const style = FONTE_COLORS[label] || FONTE_COLORS['Recorrente']!
  return (
    <span style={{
      display: 'inline-block',
      fontSize: 10,
      fontWeight: 600,
      padding: '1px 6px',
      borderRadius: 3,
      background: style.bg,
      color: style.color,
      marginRight: 6,
      verticalAlign: 'middle',
    }}>
      {label}
    </span>
  )
}

function LiRenderer({ children, ...props }: { children?: ReactNode; [key: string]: unknown }) {
  const text = typeof children === 'string' ? children : Array.isArray(children) ? children.map(c => typeof c === 'string' ? c : '').join('') : ''
  const isLowConfidence = text.includes('(baixa confiança)')

  // Detect [Badge] prefix pattern
  const badgeMatch = text.match(/^\[([^\]]+)\]\s*/)
  const fonte = badgeMatch ? badgeMatch[1] : null
  const cleanChildren = fonte && typeof children === 'string'
    ? children.replace(/^\[([^\]]+)\]\s*/, '')
    : children

  return (
    <li {...props} style={isLowConfidence ? { opacity: 0.65, fontStyle: 'italic' } : undefined}>
      {fonte && <FonteBadge tag={fonte} />}
      {cleanChildren}
    </li>
  )
}

export function MarkdownPreview({ content, maxHeight }: Props) {
  const [currentCallout, setCurrentCallout] = useState<string | null>(null)

  function HeadingRenderer(level: 2 | 3) {
    return function Heading({ children, ...props }: { children?: ReactNode; [key: string]: unknown }) {
      const text = typeof children === 'string' ? children : Array.isArray(children) ? children.map(c => typeof c === 'string' ? c : '').join('') : ''
      const calloutClass = getCalloutClass(text)
      const Tag = level === 2 ? 'h2' : 'h3'

      if (calloutClass) {
        // Wrap heading + following content in callout div
        setCurrentCallout(calloutClass)
        return (
          <div className={calloutClass}>
            <Tag {...props}>{children}</Tag>
          </div>
        )
      }

      setCurrentCallout(null)
      return <Tag {...props}>{children}</Tag>
    }
  }

  return (
    <div
      className="md-preview"
      style={{
        fontSize: 13,
        lineHeight: 1.75,
        color: 'var(--text-secondary)',
        fontFamily: 'var(--font)',
        overflowY: maxHeight ? 'auto' : undefined,
        maxHeight,
      }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ li: LiRenderer }}>{content}</ReactMarkdown>
    </div>
  )
}
```

**Nota:** A abordagem com `useState` para callout context dentro do renderer tem limitações (ReactMarkdown renderiza de uma vez). Uma abordagem mais robusta é pré-processar o markdown para wrapping. Ver Step 3.

- [ ] **Step 3: Abordagem correta — pré-processar markdown para callout wrapping**

O ReactMarkdown não garante ordem de renderização para usar state. A abordagem correta é transformar o conteúdo antes de passar ao ReactMarkdown, envolvendo seções de alerta em divs:

Reescrever `MarkdownPreview.tsx` com a abordagem final:

```tsx
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ReactNode } from 'react'

interface Props {
  content: string
  maxHeight?: number
}

const CALLOUT_PATTERNS: Array<{ regex: RegExp; className: string }> = [
  { regex: /⚠️|[Aa]lerta/, className: 'callout-warning' },
  { regex: /🔴|[Cc]rítico/, className: 'callout-danger' },
  { regex: /[Rr]econhecimento|✅/, className: 'callout-success' },
]

function classifyHeading(line: string): string | null {
  for (const { regex, className } of CALLOUT_PATTERNS) {
    if (regex.test(line)) return className
  }
  return null
}

/**
 * Pre-processes markdown to wrap callout sections in <div class="callout-*">
 * A callout starts at a heading (## or ###) that matches a pattern
 * and ends at the next heading of same or higher level, or end of content.
 */
function wrapCalloutSections(md: string): string {
  const lines = md.split('\n')
  const result: string[] = []
  let inCallout: string | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const isHeading = /^#{2,3}\s/.test(line)

    if (isHeading) {
      // Close previous callout if open
      if (inCallout) {
        result.push('</div>')
        inCallout = null
      }

      const calloutClass = classifyHeading(line)
      if (calloutClass) {
        result.push(`<div class="${calloutClass}">`)
        inCallout = calloutClass
      }
    }

    result.push(line)
  }

  // Close trailing callout
  if (inCallout) {
    result.push('</div>')
  }

  return result.join('\n')
}

const FONTE_COLORS: Record<string, { bg: string; color: string }> = {
  'Ação vencida': { bg: 'var(--amber-dim)', color: 'var(--amber)' },
  'Gestor':       { bg: 'var(--blue-dim)', color: 'var(--blue)' },
  'Insight':      { bg: 'rgba(128, 90, 200, 0.12)', color: '#9B6FD4' },
  'Sinal de par': { bg: 'rgba(56, 178, 172, 0.12)', color: '#38B2AC' },
  'PDI':          { bg: 'rgba(99, 102, 241, 0.12)', color: '#6366F1' },
  'Jira/GitHub':  { bg: 'var(--surface-3)', color: 'var(--text-secondary)' },
  'Recorrente':   { bg: 'var(--amber-dim)', color: 'var(--yellow)' },
  'Mudança':      { bg: 'var(--green-dim)', color: 'var(--green)' },
}

const FONTE_MAP: Record<string, string> = {
  acao_vencida: 'Ação vencida',
  acao_gestor: 'Gestor',
  insight_1on1: 'Insight',
  sinal_terceiro: 'Sinal de par',
  pdi: 'PDI',
  dados_externos: 'Jira/GitHub',
  tema_recorrente: 'Recorrente',
  delta: 'Mudança',
}

function FonteBadge({ label }: { label: string }) {
  const style = FONTE_COLORS[label] || FONTE_COLORS['Recorrente']!
  return (
    <span style={{
      display: 'inline-block',
      fontSize: 10,
      fontWeight: 600,
      padding: '1px 6px',
      borderRadius: 3,
      background: style.bg,
      color: style.color,
      marginRight: 6,
      verticalAlign: 'middle',
    }}>
      {label}
    </span>
  )
}

function LiRenderer({ children, ...props }: { children?: ReactNode; [key: string]: unknown }) {
  // Flatten children to text for pattern detection
  const flatText = typeof children === 'string'
    ? children
    : Array.isArray(children)
      ? children.map(c => typeof c === 'string' ? c : '').join('')
      : ''

  const isLowConfidence = flatText.includes('(baixa confiança)')

  // Detect [fonte_tag] prefix pattern in li text
  const badgeMatch = flatText.match(/^\[([a-z_]+)\]\s*/)
  if (badgeMatch) {
    const tag = badgeMatch[1]
    const label = FONTE_MAP[tag] || tag

    // Remove the badge prefix from displayed children
    const cleanText = typeof children === 'string'
      ? children.replace(/^\[[a-z_]+\]\s*/, '')
      : children

    return (
      <li {...props} style={isLowConfidence ? { opacity: 0.65, fontStyle: 'italic' } : undefined}>
        <FonteBadge label={label} />
        {cleanText}
      </li>
    )
  }

  return (
    <li {...props} style={isLowConfidence ? { opacity: 0.65, fontStyle: 'italic' } : undefined}>
      {children}
    </li>
  )
}

export function MarkdownPreview({ content, maxHeight }: Props) {
  const processed = wrapCalloutSections(content)

  return (
    <div
      className="md-preview"
      style={{
        fontSize: 13,
        lineHeight: 1.75,
        color: 'var(--text-secondary)',
        fontFamily: 'var(--font)',
        overflowY: maxHeight ? 'auto' : undefined,
        maxHeight,
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{ li: LiRenderer }}
        allowedElements={undefined}
      >
        {processed}
      </ReactMarkdown>
    </div>
  )
}
```

- [ ] **Step 4: Verificar que o app compila**

Run: `cd /Users/guilhermeaugusto/Documents/workspace-projects/pulse-cockpit && npx tsc --noEmit --project tsconfig.web.json 2>&1 | head -20`

Se não existir `tsconfig.web.json`, usar: `npx tsc --noEmit`

Expected: 0 errors (ou apenas erros pré-existentes não relacionados)

- [ ] **Step 5: Testar visualmente**

Run: `npm run dev` (ou `npm start`)

Abrir o app, navegar para uma pessoa com pauta gerada. Verificar:
- Seção `## ⚠️ Alertas` tem borda lateral amber + background sutil
- Seção `## Reconhecimentos` tem borda verde + background sutil
- Itens com `(baixa confiança)` continuam em itálico com opacidade reduzida

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/components/MarkdownPreview.tsx src/renderer/src/index.css
git commit -m "feat(ui): callouts visuais no MarkdownPreview por contexto semântico"
```

---

## Task 2: Schema de fonte no prompt de pauta

**Files:**
- Modify: `src/main/prompts/agenda.prompt.ts`

- [ ] **Step 1: Atualizar a interface AgendaAIResult**

Em `src/main/prompts/agenda.prompt.ts`, substituir a interface:

```typescript
export type AgendaFonte = 'acao_vencida' | 'acao_gestor' | 'insight_1on1' | 'sinal_terceiro' | 'pdi' | 'dados_externos' | 'tema_recorrente' | 'delta'

export interface AgendaItemWithFonte {
  text: string
  fonte: AgendaFonte
}

export type AgendaItem = string | AgendaItemWithFonte

export interface AgendaAIResult {
  follow_ups:          AgendaItem[]
  temas:               AgendaItem[]
  perguntas_sugeridas: AgendaItem[]
  alertas:             AgendaItem[]
  outros_alertas?:     AgendaItem[]
  reconhecimentos:     AgendaItem[]
}
```

- [ ] **Step 2: Atualizar o JSON de output no prompt**

Na função `buildAgendaPrompt`, substituir o bloco de JSON esperado:

De:
```
{
  "follow_ups": ["string"],
  "temas": ["string"],
  "perguntas_sugeridas": ["string"],
  "alertas": ["string"],
  "outros_alertas": ["string"],
  "reconhecimentos": ["string"]
}
```

Para:
```
{
  "follow_ups": [{ "text": "string", "fonte": "acao_vencida|acao_gestor|insight_1on1|sinal_terceiro|pdi|dados_externos|tema_recorrente|delta" }],
  "temas": [{ "text": "string", "fonte": "..." }],
  "perguntas_sugeridas": [{ "text": "string", "fonte": "..." }],
  "alertas": [{ "text": "string", "fonte": "..." }],
  "outros_alertas": [{ "text": "string", "fonte": "..." }],
  "reconhecimentos": [{ "text": "string", "fonte": "..." }]
}
```

- [ ] **Step 3: Adicionar regra de fonte nas instruções do prompt**

Ao final do bloco de "Regras:", adicionar:

```
- Cada item DEVE incluir campo "fonte" indicando a origem principal da sugestão. Valores válidos: acao_vencida, acao_gestor, insight_1on1, sinal_terceiro, pdi, dados_externos, tema_recorrente, delta. Use o mais específico possível. Se não há fonte clara, use "tema_recorrente".
```

- [ ] **Step 4: Atualizar renderAgendaMarkdown para aceitar novo schema**

Substituir a função `renderAgendaMarkdown`:

```typescript
function itemText(item: AgendaItem): string {
  if (typeof item === 'string') return item
  const tag = item.fonte || 'tema_recorrente'
  return `[${tag}] ${item.text}`
}

export function renderAgendaMarkdown(nome: string, date: string, result: AgendaAIResult): string {
  const lines: string[] = [
    `# Pauta 1:1 — ${nome}`,
    ``,
    `**Data:** ${date}`,
    ``,
  ]

  if (result.alertas.length > 0) {
    lines.push(`## ⚠️ Alertas`)
    result.alertas.forEach(a => lines.push(`- ${itemText(a)}`))
    lines.push(``)
  }

  if (result.outros_alertas && result.outros_alertas.length > 0) {
    lines.push(`### Outros alertas`)
    result.outros_alertas.forEach(a => lines.push(`- ${itemText(a)}`))
    lines.push(``)
  }

  if (result.reconhecimentos && result.reconhecimentos.length > 0) {
    lines.push(`## ✅ Reconhecimentos`)
    result.reconhecimentos.forEach(r => lines.push(`- ${itemText(r)}`))
    lines.push(``)
  }

  if (result.follow_ups.length > 0) {
    lines.push(`## Follow-ups`)
    result.follow_ups.forEach(f => lines.push(`- [ ] ${itemText(f)}`))
    lines.push(``)
  }

  if (result.temas.length > 0) {
    lines.push(`## Temas`)
    result.temas.forEach(t => lines.push(`- ${itemText(t)}`))
    lines.push(``)
  }

  if (result.perguntas_sugeridas.length > 0) {
    lines.push(`## Perguntas sugeridas`)
    result.perguntas_sugeridas.forEach(p => lines.push(`- ${itemText(p)}`))
    lines.push(``)
  }

  return lines.join('\n')
}
```

**Nota:** O heading de Reconhecimentos mudou de `## Reconhecimentos` para `## ✅ Reconhecimentos` para ativar o callout verde.

- [ ] **Step 5: Verificar que compila**

Run: `npx tsc --noEmit`

Expected: 0 errors novos. O `index.ts:256` usa `result.data as AgendaAIResult` — a union type `AgendaItem` é backward-compatible.

- [ ] **Step 6: Commit**

```bash
git add src/main/prompts/agenda.prompt.ts
git commit -m "feat(agenda): schema de fonte por item na pauta gerada"
```

---

## Task 3: Teste end-to-end visual

- [ ] **Step 1: Iniciar o app**

Run: `npm run dev` (ou `npm start`)

- [ ] **Step 2: Gerar uma pauta nova**

Navegar para qualquer pessoa com perfil populado > Preparar 1:1 > Gerar pauta.

Verificar:
- A pauta renderizada mostra badges coloridos antes dos itens (PDI, Insight, Ação vencida, etc.)
- A seção `## ⚠️ Alertas` tem callout amarelo com borda lateral
- A seção `## ✅ Reconhecimentos` tem callout verde
- Itens com `(baixa confiança)` mantêm estilo anterior

- [ ] **Step 3: Verificar backward-compat com pauta existente**

Navegar para uma pessoa que já tem pautas antigas (sem campo `fonte`). Verificar:
- A pauta antiga renderiza normalmente sem badges (sem `[tag]` prefix)
- Os callouts de heading funcionam independente (⚠️ no heading já existia)

- [ ] **Step 4: Commit final se necessário ajuste**

```bash
git add -A
git commit -m "fix(ui): ajustes de rendering callouts e badges"
```

---

## Ordem de execução

```
Task 1 (callouts) → Task 2 (schema fonte) → Task 3 (teste e2e)
```

Task 1 e Task 2 são tecnicamente independentes (tocam arquivos diferentes) mas Task 2 depende do `LiRenderer` com badge pattern do Task 1. Executar em sequência.
