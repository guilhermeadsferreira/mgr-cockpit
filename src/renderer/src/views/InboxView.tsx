import { useState, useEffect, useCallback } from 'react'
import { Inbox, FolderOpen, CheckCircle2, XCircle, Loader2, Clock, RefreshCw, UserPlus, PauseCircle, ArrowRight, AlertTriangle } from 'lucide-react'
import { useRouter } from '../router'
import type { QueueItem } from '../types/ipc'
import { labelTipo } from '../lib/utils'

export function InboxView() {
  const { navigate }              = useRouter()
  const [queue, setQueue]         = useState<QueueItem[]>([])
  const [isDragging, setDragging] = useState(false)
  const [dropError, setDropError] = useState<string | null>(null)
  const [workspacePath, setWorkspacePath] = useState<string>('')

  useEffect(() => {
    window.api.settings.load().then((s) => setWorkspacePath(s.workspacePath))
  }, [])

  const refreshQueue = useCallback(async () => {
    const q = await window.api.ingestion.getQueue()
    setQueue(q)
  }, [])

  useEffect(() => {
    refreshQueue()
    window.api.ingestion.onStarted(() => refreshQueue())
    window.api.ingestion.onCompleted(() => refreshQueue())
    window.api.ingestion.onFailed(() => refreshQueue())
    const interval = setInterval(refreshQueue, 3_000)
    return () => {
      window.api.ingestion.removeListeners()
      clearInterval(interval)
    }
  }, [refreshQueue])

  function handleOpenInbox() {
    if (!workspacePath) return
    window.api.shell.open(workspacePath + '/inbox')
  }

  async function handleProcessAsCollective(itemId: string) {
    await window.api.ingestion.processAsCollective(itemId)
    refreshQueue()
  }

  useEffect(() => {
    const zone = document.getElementById('inbox-drop-zone')
    if (!zone) return

    function onDragOver(e: DragEvent) {
      e.preventDefault(); e.stopPropagation()
      setDragging(true)
    }
    function onDragLeave(e: DragEvent) {
      if (zone.contains(e.relatedTarget as Node)) return
      e.preventDefault(); e.stopPropagation()
      setDragging(false)
    }
    async function onDrop(e: DragEvent) {
      e.preventDefault(); e.stopPropagation()
      setDragging(false)
      setDropError(null)
      const files = Array.from(e.dataTransfer?.files ?? [])
      const unsupported: string[] = []
      for (const file of files) {
        const filePath = window.api.getFilePath(file)
        const supported = /\.(md|txt|pdf)$/i.test(file.name)
        if (filePath && supported) {
          await window.api.ingestion.enqueue(filePath)
        } else if (filePath) {
          unsupported.push(file.name)
        }
      }
      if (unsupported.length > 0) {
        setDropError(`Formato não suportado: ${unsupported.join(', ')}. Use .md, .txt ou .pdf`)
      }
      await refreshQueue()
    }

    zone.addEventListener('dragover',  onDragOver)
    zone.addEventListener('dragleave', onDragLeave)
    zone.addEventListener('drop',      onDrop)
    return () => {
      zone.removeEventListener('dragover',  onDragOver)
      zone.removeEventListener('dragleave', onDragLeave)
      zone.removeEventListener('drop',      onDrop)
    }
  }, [refreshQueue])

  const processing = queue.filter((i) => i.status === 'queued' || i.status === 'processing')
  const pending    = queue.filter((i) => i.status === 'pending')
  const done       = queue.filter((i) => i.status === 'done')
  const errors     = queue.filter((i) => i.status === 'error')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header */}
      <div style={{
        padding: '28px 40px 22px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      }}>
        <div>
          <div style={styles.eyebrow}>Ingestão</div>
          <h1 style={styles.pageTitle}>Inbox</h1>
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4 }}>
            Arraste artefatos ou coloque arquivos na pasta inbox para processar
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={refreshQueue} style={styles.btnSecondary}>
            <RefreshCw size={12} /> Atualizar
          </button>
          <button onClick={handleOpenInbox} style={styles.btnSecondary} disabled={!workspacePath}>
            <FolderOpen size={12} /> Abrir pasta inbox
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 40px' }}>
        <div style={{ maxWidth: 720 }}>

          {/* Drop zone */}
          <div
            id="inbox-drop-zone"
            style={{
              position: 'relative',
              borderRadius: 10,
              padding: '40px 24px',
              textAlign: 'center',
              background: isDragging
                ? 'rgba(192, 135, 58, 0.06)'
                : 'var(--surface)',
              border: `1.5px dashed ${isDragging ? 'var(--accent)' : 'var(--border)'}`,
              transition: 'all 0.18s ease',
              marginBottom: 32,
              cursor: 'default',
            }}
          >
            {/* Subtle corner accents */}
            {['top-left','top-right','bottom-left','bottom-right'].map((pos) => {
              const [v, h] = pos.split('-')
              return (
                <span key={pos} style={{
                  position: 'absolute',
                  [v]: -1, [h]: -1,
                  width: 12, height: 12,
                  borderTop:    v === 'top'    ? `2px solid ${isDragging ? 'var(--accent)' : 'var(--border)'}` : 'none',
                  borderBottom: v === 'bottom' ? `2px solid ${isDragging ? 'var(--accent)' : 'var(--border)'}` : 'none',
                  borderLeft:   h === 'left'   ? `2px solid ${isDragging ? 'var(--accent)' : 'var(--border)'}` : 'none',
                  borderRight:  h === 'right'  ? `2px solid ${isDragging ? 'var(--accent)' : 'var(--border)'}` : 'none',
                  transition: 'border-color 0.18s ease',
                }} />
              )
            })}

            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: isDragging ? 'var(--accent-dim)' : 'var(--surface-2)',
              border: `1px solid ${isDragging ? 'rgba(192,135,58,0.3)' : 'var(--border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px',
              transition: 'all 0.18s ease',
            }}>
              <Inbox size={18} style={{ color: isDragging ? 'var(--accent)' : 'var(--text-muted)', transition: 'color 0.18s ease' }} />
            </div>

            <div style={{
              fontSize: 14, fontWeight: 500,
              color: isDragging ? 'var(--accent)' : 'var(--text-primary)',
              marginBottom: 6, transition: 'color 0.18s ease',
            }}>
              {isDragging ? 'Solte para processar' : 'Arraste arquivos aqui'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.01em' }}>
              .md .txt .pdf · Notas de 1:1, reuniões, dailies, planning, retro
            </div>
          </div>

          {dropError && (
            <div style={{
              padding: '10px 14px', borderRadius: 6, marginBottom: 16,
              background: 'rgba(184,64,64,0.08)', border: '1px solid rgba(184,64,64,0.2)',
              fontSize: 12.5, color: 'var(--red)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <XCircle size={13} style={{ flexShrink: 0 }} />
              {dropError}
            </div>
          )}

          {/* Queue sections */}
          {processing.length > 0 && (
            <QueueSection title="Processando" count={processing.length} accent="processing">
              {processing.map((item) => <QueueCard key={item.id} item={item} onRegister={(slug, nome) => navigate('person-form', { prefillSlug: slug, prefillNome: nome })} />)}
            </QueueSection>
          )}

          {pending.length > 0 && (
            <QueueSection title="Aguardando cadastro" count={pending.length} accent="pending">
              {pending.map((item) => <QueueCard key={item.id} item={item} onRegister={(slug, nome) => navigate('person-form', { prefillSlug: slug, prefillNome: nome })} onProcessAsCollective={handleProcessAsCollective} />)}
            </QueueSection>
          )}

          {errors.length > 0 && (
            <QueueSection title="Erros" count={errors.length} accent="error">
              {errors.map((item) => <QueueCard key={item.id} item={item} onRegister={(slug, nome) => navigate('person-form', { prefillSlug: slug, prefillNome: nome })} />)}
            </QueueSection>
          )}

          {done.length > 0 && (
            <QueueSection title="Processados" count={done.length} accent="done">
              {done.map((item) => <QueueCard key={item.id} item={item} onRegister={(slug, nome) => navigate('person-form', { prefillSlug: slug, prefillNome: nome })} />)}
            </QueueSection>
          )}

          {queue.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '48px 0',
              fontSize: 12.5, color: 'var(--text-muted)',
              fontStyle: 'italic',
            }}>
              Nenhum artefato processado ainda nesta sessão
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

// ── Queue Section ──────────────────────────────────────────────────────────────

type Accent = 'processing' | 'pending' | 'error' | 'done'

const ACCENT_COLOR: Record<Accent, string> = {
  processing: 'var(--accent)',
  pending:    'var(--yellow)',
  error:      'var(--red)',
  done:       'var(--green)',
}

function QueueSection({ title, count, accent, children }: {
  title:    string
  count:    number
  accent:   Accent
  children: React.ReactNode
}) {
  const color = ACCENT_COLOR[accent]
  return (
    <div style={{ marginBottom: 24 }}>
      {/* Section label */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: color, flexShrink: 0,
          boxShadow: accent === 'processing' ? `0 0 6px ${color}` : 'none',
        }} />
        <span style={{
          fontSize: 10, fontWeight: 600, letterSpacing: '0.1em',
          textTransform: 'uppercase' as const, color: 'var(--text-muted)',
        }}>
          {title}
        </span>
        <span style={{
          fontSize: 10, fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)', opacity: 0.6,
        }}>
          {count}
        </span>
      </div>

      {/* Cards list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {children}
      </div>
    </div>
  )
}

// ── Queue Card ─────────────────────────────────────────────────────────────────

function QueueCard({ item, onRegister, onProcessAsCollective }: { item: QueueItem; onRegister: (slug: string, nome: string) => void; onProcessAsCollective?: (itemId: string) => void }) {
  const statusMeta = {
    queued:     { icon: <Clock size={12} />,    color: 'var(--text-muted)',   label: 'Na fila' },
    processing: { icon: <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />, color: 'var(--accent)', label: 'Processando' },
    done:       { icon: <CheckCircle2 size={12} />, color: 'var(--green)',    label: 'Concluído' },
    pending:    { icon: <PauseCircle size={12} />,  color: 'var(--yellow)',   label: 'Pendente' },
    error:      { icon: <XCircle size={12} />,  color: 'var(--red)',          label: 'Erro' },
  }[item.status]

  // Strip timestamp clutter from filename for display
  const displayName = item.fileName
    .replace(/\.(md|txt|pdf)$/i, '')
    .replace(/_/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()

  const duration = item.finishedAt && item.startedAt
    ? `${((item.finishedAt - item.startedAt) / 1000).toFixed(0)}s`
    : null

  const registeredPeople = (item.pessoasIdentificadas ?? []).filter(
    (s) => !(item.naoCadastradas ?? []).includes(s)
  )

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      overflow: 'hidden',
    }}>
      {/* Top row */}
      <div style={{
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: (item.summary || item.error || (item.naoCadastradas?.length ?? 0) > 0 || registeredPeople.length > 0)
          ? '1px solid var(--border-subtle)'
          : 'none',
      }}>
        {/* Status icon */}
        <span style={{ color: statusMeta.color, flexShrink: 0, display: 'flex' }}>
          {statusMeta.icon}
        </span>

        {/* Filename */}
        <span style={{
          flex: 1, minWidth: 0,
          fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }} title={item.fileName}>
          {displayName}
        </span>

        {/* Right-side metadata row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {item.tipo && (
            <span style={{
              fontSize: 9, fontWeight: 600, letterSpacing: '0.07em',
              textTransform: 'uppercase' as const,
              padding: '2px 7px', borderRadius: 20,
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              color: 'var(--text-muted)',
            }}>
              {labelTipo(item.tipo)}
            </span>
          )}
          {item.personSlug && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 10.5, color: 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)',
            }}>
              <ArrowRight size={9} style={{ color: 'var(--text-muted)' }} />
              {item.personSlug}
            </span>
          )}
          {duration && (
            <span style={{
              fontSize: 9.5, fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
            }}>
              {duration}
            </span>
          )}
        </div>
      </div>

      {/* Body: summary, truncation warning, or error */}
      {(item.summary || item.error || item.truncated) && (
        <div style={{
          padding: '10px 16px 10px 38px',
          borderBottom: ((item.naoCadastradas?.length ?? 0) > 0 || registeredPeople.length > 0)
            ? '1px solid var(--border-subtle)'
            : 'none',
        }}>
          {item.truncated && (
            <p style={{
              fontSize: 11.5, color: 'var(--yellow, #d4a843)', lineHeight: 1.5,
              margin: '0 0 6px 0',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <AlertTriangle size={11} style={{ flexShrink: 0 }} />
              Artefato truncado — apenas os primeiros 50KB foram processados
            </p>
          )}
          {item.summary && (
            <p style={{
              fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6,
              margin: 0,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical' as const,
              overflow: 'hidden',
            }}>
              {item.summary}
            </p>
          )}
          {item.error && (
            <p style={{
              fontSize: 12, color: 'var(--red)', lineHeight: 1.6, margin: 0,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical' as const,
              overflow: 'hidden',
            }}>
              {item.error}
            </p>
          )}
        </div>
      )}

      {/* Escape hatch for pending items */}
      {item.status === 'pending' && onProcessAsCollective && (
        <div style={{ padding: '6px 16px 6px 38px' }}>
          <button
            onClick={() => onProcessAsCollective(item.id)}
            style={{
              fontSize: 11, padding: '5px 12px', borderRadius: 6,
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              color: 'var(--text-secondary)', cursor: 'pointer',
              transition: 'background 0.12s ease',
            }}
          >
            Prosseguir sem cadastrar
          </button>
        </div>
      )}

      {/* Footer: people */}
      {((item.naoCadastradas?.length ?? 0) > 0 || registeredPeople.length > 0) && (
        <div style={{
          padding: '8px 16px 8px 38px',
          display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6,
        }}>
          {/* Unregistered — actionable */}
          {(item.naoCadastradas ?? []).map((slug) => {
            const nome = item.novasNomes?.[slug] || slug
            const isBlockingPrincipal = item.status === 'pending' && item.personSlug === slug
            return (
              <button
                key={slug}
                onClick={() => onRegister(slug, nome)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: 10.5, padding: '3px 8px', borderRadius: 20,
                  background: isBlockingPrincipal ? 'rgba(220,60,60,0.10)' : 'rgba(192,135,58,0.08)',
                  border: isBlockingPrincipal ? '1px solid rgba(220,60,60,0.35)' : '1px solid rgba(192,135,58,0.25)',
                  color: isBlockingPrincipal ? 'var(--red, #dc3c3c)' : 'var(--accent)', cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                  transition: 'background 0.12s ease',
                }}
              >
                <UserPlus size={9} /> {nome}
              </button>
            )
          })}

          {/* Registered people */}
          {registeredPeople.length > 0 && (
            <>
              {(item.naoCadastradas?.length ?? 0) > 0 && registeredPeople.length > 0 && (
                <span style={{ width: 1, height: 12, background: 'var(--border)', flexShrink: 0 }} />
              )}
              {registeredPeople.map((slug) => (
                <span key={slug} style={{
                  fontSize: 10.5, padding: '3px 8px', borderRadius: 20,
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)',
                }}>
                  {slug}
                </span>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = {
  eyebrow: {
    fontSize: 10, fontWeight: 600,
    letterSpacing: '0.1em', textTransform: 'uppercase' as const,
    color: 'var(--text-muted)', marginBottom: 4,
  },
  pageTitle: {
    fontFamily: 'var(--font)',
    fontSize: 24, fontWeight: 700,
    color: 'var(--text-primary)', letterSpacing: '-0.025em', lineHeight: 1.1,
  } as React.CSSProperties,
  btnSecondary: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 12px', borderRadius: 6,
    background: 'var(--surface-2)', color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    fontSize: 12, fontFamily: 'var(--font)', fontWeight: 500, cursor: 'pointer',
  } as React.CSSProperties,
}
