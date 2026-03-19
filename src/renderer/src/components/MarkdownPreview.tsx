import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Props {
  content: string
  maxHeight?: number
}

export function MarkdownPreview({ content, maxHeight }: Props) {
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
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}
