import { useState, useEffect, useCallback } from 'react'
import { UserPlus, Pencil, ChevronRight, X, UserCheck } from 'lucide-react'
import { useRouter } from '../router'
import type { PersonConfig, PerfilFrontmatter, DetectedPerson } from '../types/ipc'
import { labelNivel, labelRelacao } from '../lib/utils'

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function DashboardView() {
  const { navigate } = useRouter()
  const [people,   setPeople]   = useState<PersonConfig[]>([])
  const [perfis,   setPerfis]   = useState<Record<string, Partial<PerfilFrontmatter>>>({})
  const [detected, setDetected] = useState<DetectedPerson[]>([])
  const [loading,  setLoading]  = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [list, det] = await Promise.all([
      window.api.people.list(),
      window.api.detected.list(),
    ])
    setPeople(list)
    // Filter out any detected people who are now registered
    const registeredSlugs = new Set(list.map((p) => p.slug))
    setDetected(det.filter((d) => !registeredSlugs.has(d.slug)))
    setLoading(false)

    // Load perfil frontmatter for each person in parallel
    const results = await Promise.all(
      list.map(async (p) => {
        const perfil = await window.api.people.getPerfil(p.slug)
        return [p.slug, perfil?.frontmatter ?? {}] as const
      })
    )
    setPerfis(Object.fromEntries(results))
  }, [])

  async function handleDismissDetected(slug: string) {
    await window.api.detected.dismiss(slug)
    setDetected((d) => d.filter((p) => p.slug !== slug))
  }

  useEffect(() => {
    load()
    // Refresh after ingestion (new detected people may have been added)
    window.api.ingestion.onCompleted(() => load())
    return () => window.api.ingestion.removeListeners()
  }, [load])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '28px 40px 22px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      }}>
        <div>
          <div style={styles.eyebrow}>Visão geral</div>
          <h1 style={styles.pageTitle}>Seu time</h1>
          <div style={styles.pageSub}>
            {loading ? '…' : `${people.length} ${people.length === 1 ? 'pessoa' : 'pessoas'}`}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
          <button onClick={() => navigate('person-form')} style={styles.btnPrimary}>
            <UserPlus size={13} />
            Adicionar pessoa
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {([
              { color: 'var(--green)',            label: 'Saudável' },
              { color: 'var(--yellow, #d4a843)',  label: 'Atenção' },
              { color: 'var(--red)',              label: 'Risco' },
              { color: 'var(--surface-3)',        label: 'Sem dados' },
            ] as const).map(({ color, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '28px 40px', flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Carregando…</div>
        ) : (
          <>
            {/* Registered team */}
            {people.length === 0 && detected.length === 0 ? (
              <EmptyState onAdd={() => navigate('person-form')} />
            ) : people.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 10,
              }}>
                {people.map((p) => (
                  <PersonCard
                    key={p.slug}
                    person={p}
                    perfil={perfis[p.slug] ?? {}}
                    onViewCockpit={() => navigate('person', { slug: p.slug })}
                    onEdit={() => navigate('person-form', { slug: p.slug })}
                  />
                ))}
              </div>
            ) : null}

            {/* Detected (unregistered) people */}
            {detected.length > 0 && (
              <div style={{ marginTop: people.length > 0 ? 32 : 0 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
                }}>
                  <div style={{
                    fontSize: 10, fontWeight: 600, letterSpacing: '0.1em',
                    textTransform: 'uppercase' as const, color: 'var(--text-muted)',
                  }}>
                    Detectadas nos artefatos
                  </div>
                  <span style={{
                    fontSize: 10, padding: '1px 6px', borderRadius: 20,
                    background: 'rgba(192,135,58,0.1)', border: '1px solid rgba(192,135,58,0.25)',
                    color: 'var(--accent)', fontFamily: 'var(--font-mono)',
                  }}>
                    {detected.length}
                  </span>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>
                    — pessoas mencionadas nos artefatos, mas ainda não no time
                  </div>
                </div>
                <div style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 'var(--r)', overflow: 'hidden',
                }}>
                  {detected.map((p, i) => (
                    <DetectedRow
                      key={p.slug}
                      person={p}
                      isLast={i === detected.length - 1}
                      onRegister={() => navigate('person-form', { prefillSlug: p.slug, prefillNome: p.nome })}
                      onDismiss={() => handleDismissDetected(p.slug)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function PersonCard({
  person,
  perfil,
  onViewCockpit,
  onEdit,
}: {
  person: PersonConfig
  perfil: Partial<PerfilFrontmatter>
  onViewCockpit: () => void
  onEdit: () => void
}) {
  const [hovered, setHovered] = useState(false)

  const healthColor = {
    verde:    'var(--green)',
    amarelo:  'var(--yellow, #d4a843)',
    vermelho: 'var(--red)',
  }[perfil.saude ?? ''] ?? 'var(--surface-3)'

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'var(--surface-2)' : 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r)',
        overflow: 'hidden',
        position: 'relative',
        transition: 'all 0.18s ease',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? '0 8px 28px rgba(0,0,0,0.4)' : 'none',
        cursor: 'default',
      }}
    >
      {/* Left border — health indicator */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: 3, height: '100%',
        background: healthColor,
        transition: 'background 0.3s ease',
      }} />

      {/* Card header */}
      <div style={{ padding: '14px 14px 12px 18px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            {person.nome}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            {person.cargo}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            <LevelBadge nivel={person.nivel} />
            {person.squad && (
              <span style={{
                fontSize: 10, fontFamily: 'var(--font-mono)',
                color: 'var(--text-muted)', padding: '2px 6px',
                background: 'var(--surface-2)', border: '1px solid var(--border-subtle)',
                borderRadius: 3,
              }}>
                # {person.squad}
              </span>
            )}
          </div>
        </div>
        <RelacaoBadge relacao={person.relacao} />
      </div>

      {/* Stats row */}
      {perfil.total_artefatos != null && (
        <div style={{ padding: '6px 18px 8px', display: 'flex', gap: 14 }}>
          <Stat label="artefatos" value={String(perfil.total_artefatos)} />
          {perfil.acoes_pendentes_count != null && perfil.acoes_pendentes_count > 0 && (
            <Stat label="ações" value={String(perfil.acoes_pendentes_count)} alert />
          )}
          {perfil.ultimo_1on1 && <Stat label="último 1:1" value={fmtDate(perfil.ultimo_1on1)} mono />}
        </div>
      )}

      <div style={{ height: 1, background: 'var(--border-subtle)', margin: '0 14px 0 18px' }} />

      {/* Actions */}
      <div style={{ padding: '9px 14px 11px 18px', display: 'flex', gap: 6 }}>
        <button onClick={onViewCockpit} style={{ ...styles.btnGhost, flex: 1 }}>
          <ChevronRight size={12} />
          Ver cockpit
        </button>
        <button onClick={onEdit} style={{ ...styles.btnSecondary, flex: 1 }}>
          <Pencil size={12} />
          Editar
        </button>
      </div>
    </div>
  )
}

function Stat({ label, value, mono, alert }: { label: string; value: string; mono?: boolean; alert?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <span style={{
        fontSize: mono ? 10 : 11.5, fontWeight: 600,
        color: alert ? 'var(--red)' : 'var(--text-primary)',
        fontFamily: mono ? 'var(--font-mono)' : undefined,
      }}>
        {value}
      </span>
      <span style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
        {label}
      </span>
    </div>
  )
}

function LevelBadge({ nivel }: { nivel: string }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 20,
      background: 'var(--blue-dim, rgba(64,128,168,0.12))',
      color: 'var(--blue)',
      border: '1px solid rgba(64,128,168,0.2)',
    }}>
      {labelNivel(nivel)}
    </span>
  )
}

function RelacaoBadge({ relacao }: { relacao: string }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 20,
      background: 'var(--surface-2)', color: 'var(--text-secondary)',
      border: '1px solid var(--border)', whiteSpace: 'nowrap',
    }}>
      {labelRelacao(relacao)}
    </span>
  )
}

function DetectedRow({
  person, isLast, onRegister, onDismiss,
}: {
  person: DetectedPerson
  isLast: boolean
  onRegister: () => void
  onDismiss: () => void
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 16px',
      borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
            {person.nome || person.slug}
          </span>
          <span style={{
            fontSize: 10, fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)', padding: '1px 5px',
            background: 'var(--surface-2)', borderRadius: 3,
          }}>
            {person.slug}
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          {person.mentionCount}× mencionada
          {person.sourceFiles.length > 0 && ` · ${person.sourceFiles[person.sourceFiles.length - 1]}`}
        </div>
      </div>
      <button onClick={onRegister} style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '5px 10px', borderRadius: 5, border: 'none',
        background: 'rgba(192,135,58,0.12)', color: 'var(--accent)',
        fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
        fontFamily: 'var(--font)',
      }}>
        <UserCheck size={11} /> Adicionar ao time
      </button>
      <button onClick={onDismiss} style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 24, height: 24, borderRadius: 5, border: '1px solid var(--border)',
        background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer',
        flexShrink: 0,
      }}>
        <X size={11} />
      </button>
    </div>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 40px' }}>
      <div style={{
        fontFamily: 'var(--font)',
        fontSize: 22, fontWeight: 600,
        color: 'var(--text-secondary)', marginBottom: 8, letterSpacing: '-0.02em',
      }}>
        Time vazio
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.6 }}>
        Adicione manualmente ou jogue artefatos no Inbox —<br />o Claude detectará as pessoas automaticamente.
      </div>
      <button onClick={onAdd} style={styles.btnPrimary}>
        <UserPlus size={13} />
        Adicionar pessoa manualmente
      </button>
    </div>
  )
}

// ─── Shared styles ────────────────────────────────────────────
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
  },
  pageSub: { fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4 },
  btnPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 14px', borderRadius: 'var(--r)', border: 'none',
    background: 'var(--accent)', color: '#09090c',
    fontSize: 13, fontFamily: 'var(--font)', fontWeight: 600,
    cursor: 'pointer',
  } as React.CSSProperties,
  btnSecondary: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '6px 10px', borderRadius: 'var(--r-sm)',
    background: 'var(--surface-2)', color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    fontSize: 12, fontFamily: 'var(--font)', fontWeight: 500,
    cursor: 'pointer', justifyContent: 'center' as const,
  } as React.CSSProperties,
  btnGhost: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '6px 10px', borderRadius: 'var(--r-sm)',
    background: 'transparent', color: 'var(--text-secondary)',
    border: '1px solid transparent',
    fontSize: 12, fontFamily: 'var(--font)', fontWeight: 500,
    cursor: 'pointer', justifyContent: 'center' as const,
  } as React.CSSProperties,
}
