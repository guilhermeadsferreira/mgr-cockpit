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
  acao_vencida:   'Ação vencida',
  acao_gestor:    'Gestor',
  insight_1on1:   'Insight',
  sinal_terceiro: 'Sinal de par',
  pdi:            'PDI',
  dados_externos: 'Jira/GitHub',
  tema_recorrente:'Recorrente',
  delta:          'Mudança',
}

function FonteBadge({ label }: { label: string }) {
  const style = FONTE_COLORS[label] ?? FONTE_COLORS['Recorrente']!
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
  const flatText = typeof children === 'string'
    ? children
    : Array.isArray(children)
      ? children.map(c => typeof c === 'string' ? c : '').join('')
      : ''

  const isLowConfidence = flatText.includes('(baixa confiança)')

  const badgeMatch = flatText.match(/^\[([a-z_]+)\]\s*/)
  if (badgeMatch) {
    const tag = badgeMatch[1]
    const label = FONTE_MAP[tag] ?? tag

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
      >
        {processed}
      </ReactMarkdown>
    </div>
  )
}
