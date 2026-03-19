import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, FileText, CalendarDays, Pencil, ExternalLink, RefreshCw, Loader2 } from 'lucide-react'
import { useRouter } from '../router'
import type { PersonConfig, PerfilData, ArtifactMeta, PautaMeta, AgendaResult } from '../types/ipc'
import { MarkdownPreview } from '../components/MarkdownPreview'
import { labelNivel, labelRelacao, labelSaude, labelTipo } from '../lib/utils'

// Styles declared at module top level so all sub-components can access them safely
const styles = {
  backBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    fontSize: 12, color: 'var(--text-secondary)',
    background: 'none', border: 'none', cursor: 'pointer',
    marginBottom: 6, padding: '4px 0', fontFamily: 'var(--font)',
  } as React.CSSProperties,
  pageTitle: {
    fontFamily: 'var(--font)',
    fontSize: 24, fontWeight: 700,
    color: 'var(--text-primary)', letterSpacing: '-0.025em', lineHeight: 1.1,
  } as React.CSSProperties,
  btnPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 14px', borderRadius: 6, border: 'none',
    background: 'var(--accent)', color: '#09090c',
    fontSize: 13, fontFamily: 'var(--font)', fontWeight: 600, cursor: 'pointer',
  } as React.CSSProperties,
  btnSecondary: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 12px', borderRadius: 6,
    background: 'var(--surface-2)', color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    fontSize: 13, fontFamily: 'var(--font)', fontWeight: 500, cursor: 'pointer',
  } as React.CSSProperties,
  btnIcon: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, borderRadius: 6,
    background: 'var(--surface-2)', color: 'var(--text-secondary)',
    border: '1px solid var(--border)', cursor: 'pointer',
  } as React.CSSProperties,
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const parts = iso.split('-')
  if (parts.length !== 3) return iso
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

export function PersonView() {
  const { params, navigate, goBack } = useRouter()
  const [person,        setPerson]        = useState<PersonConfig | null>(null)
  const [perfil,        setPerfil]        = useState<PerfilData | null>(null)
  const [artifacts,     setArtifacts]     = useState<ArtifactMeta[]>([])
  const [pautas,        setPautas]        = useState<PautaMeta[]>([])
  const [activeTab,     setActiveTab]     = useState<'perfil' | 'artefatos' | 'pautas'>('perfil')
  const [generatingAgenda, setGeneratingAgenda] = useState(false)
  const [agendaError,   setAgendaError]   = useState<string | null>(null)

  const loadPerfil = useCallback(async (slug: string) => {
    const [p, a] = await Promise.all([
      window.api.people.getPerfil(slug),
      window.api.artifacts.list(slug),
    ])
    setPerfil(p)
    setArtifacts(a)
  }, [])

  const loadPautas = useCallback(async (slug: string) => {
    const p = await window.api.people.listPautas(slug)
    setPautas(p)
  }, [])

  useEffect(() => {
    window.api.people.get(params.slug).then(setPerson)
    loadPerfil(params.slug)
    loadPautas(params.slug)
  }, [params.slug, loadPerfil, loadPautas])

  // Refresh on ingestion completed
  useEffect(() => {
    window.api.ingestion.onCompleted(() => loadPerfil(params.slug))
    return () => window.api.ingestion.removeListeners()
  }, [params.slug, loadPerfil])

  async function handleGenerateAgenda() {
    if (!person) return
    setGeneratingAgenda(true)
    setAgendaError(null)
    try {
      const res = await window.api.ai.generateAgenda(person.slug) as AgendaResult
      if (res.success) {
        await loadPautas(person.slug)
        setActiveTab('pautas')
      } else {
        setAgendaError(res.error ?? 'Erro desconhecido.')
      }
    } catch (e: unknown) {
      setAgendaError(e instanceof Error ? e.message : 'Erro ao gerar pauta.')
    } finally {
      setGeneratingAgenda(false)
    }
  }

  if (!person) {
    return <div style={{ padding: '40px', color: 'var(--text-muted)', fontSize: 13 }}>Carregando…</div>
  }

  const fm = perfil?.frontmatter
  const saude = fm?.saude ?? null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '28px 40px 22px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      }}>
        <div>
          <button onClick={goBack} style={styles.backBtn}><ArrowLeft size={12} /> Time</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={styles.pageTitle}>{person.nome}</h1>
            {saude && <HealthDot saude={saude} />}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <Badge>{labelNivel(person.nivel)}</Badge>
            <Badge>{labelRelacao(person.relacao)}</Badge>
            {person.squad && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{person.squad}</span>}
            {fm?.total_artefatos != null && (
              <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {fm.total_artefatos} artefato{fm.total_artefatos !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => loadPerfil(params.slug)} style={styles.btnSecondary}>
            <RefreshCw size={12} />
          </button>
          <button onClick={() => navigate('person-form', { slug: person.slug })} style={styles.btnSecondary}>
            <Pencil size={12} /> Editar
          </button>
          <button
            onClick={handleGenerateAgenda}
            disabled={generatingAgenda || !perfil}
            style={{
              ...styles.btnSecondary,
              opacity: (!perfil) ? 0.45 : 1,
              cursor: (!perfil) ? 'not-allowed' : 'pointer',
            }}
          >
            {generatingAgenda ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <CalendarDays size={12} />}
            {generatingAgenda ? 'Gerando…' : 'Gerar pauta'}
          </button>
          <button
            onClick={() => navigate('cycle-report', { slug: person.slug })}
            style={styles.btnPrimary}
          >
            <FileText size={12} /> Relatório de Ciclo
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 40px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '268px 1fr', gap: 22 }}>

            {/* Left sidebar */}
            <div>
              <InfoCard title="Identificação">
                <InfoRow label="Cargo"   value={person.cargo} />
                <InfoRow label="Nível"   value={labelNivel(person.nivel)} />
                {person.area  && <InfoRow label="Área"   value={person.area} />}
                {person.squad && <InfoRow label="Squad"  value={person.squad} />}
                <InfoRow label="Relação" value={labelRelacao(person.relacao)} />
              </InfoCard>

              <InfoCard title="1:1">
                <InfoRow label="Frequência"  value={`${person.frequencia_1on1_dias} dias`} />
                <InfoRow label="Promoção"    value={person.em_processo_promocao ? 'Ativo' : 'Não ativo'} />
                {fm?.ultimo_1on1 && <InfoRow label="Último 1:1" value={fmtDate(fm.ultimo_1on1)} mono />}
                {person.inicio_na_funcao && <InfoRow label="Na função desde" value={fmtDate(person.inicio_na_funcao)} mono />}
              </InfoCard>

              {fm && (
                <InfoCard title="Saúde">
                  <InfoRow label="Indicador"      value={fm.saude ? labelSaude(fm.saude) : '—'} />
                  <InfoRow label="Ações pendentes" value={String(fm.acoes_pendentes_count ?? 0)} />
                  <InfoRow label="Total artefatos" value={String(fm.total_artefatos ?? 0)} />
                </InfoCard>
              )}

              {person.notas_manuais && (
                <InfoCard title="Notas do gestor">
                  <p style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {person.notas_manuais}
                  </p>
                </InfoCard>
              )}
            </div>

            {/* Right content */}
            <div>
              {/* Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 22 }}>
                {(['perfil', 'artefatos', 'pautas'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      padding: '9px 18px',
                      fontSize: 13.5,
                      fontWeight: activeTab === tab ? 500 : 400,
                      color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
                      background: 'none', border: 'none',
                      borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                      marginBottom: -1, cursor: 'pointer',
                      fontFamily: 'var(--font)',
                    }}
                  >
                    {tab === 'perfil' ? 'Perfil vivo' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                    {tab === 'artefatos' && artifacts.length > 0 && (
                      <span style={{ marginLeft: 6, fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {artifacts.length}
                      </span>
                    )}
                    {tab === 'pautas' && pautas.length > 0 && (
                      <span style={{ marginLeft: 6, fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {pautas.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {agendaError && (
                <div style={{
                  marginBottom: 16, padding: '10px 14px', borderRadius: 6,
                  background: 'var(--red-dim)', border: '1px solid rgba(184,64,64,0.3)',
                  fontSize: 12.5, color: 'var(--red)',
                }}>
                  {agendaError}
                </div>
              )}
              {activeTab === 'perfil'    && <PerfilTab perfil={perfil} />}
              {activeTab === 'artefatos' && <ArtifactsTab artifacts={artifacts} />}
              {activeTab === 'pautas'    && <PautasTab pautas={pautas} onGenerate={handleGenerateAgenda} generating={generatingAgenda} hasPerfil={!!perfil} />}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

// ── Perfil tab ─────────────────────────────────────────────────────────────────

function PerfilTab({ perfil }: { perfil: PerfilData | null }) {
  if (!perfil) {
    return (
      <PlaceholderTab
        icon={<FileText size={28} />}
        title="Perfil vivo"
        desc="Disponível após a primeira ingestão de artefato. Arraste um arquivo para o Inbox para começar."
        fase="Aguardando ingestão"
      />
    )
  }

  // Parse sections from raw markdown
  const sections = parsePerfilSections(perfil.raw)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {sections.resumo && (
        <PerfilSection title="Resumo Evolutivo">
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
            {sections.resumo}
          </p>
        </PerfilSection>
      )}

      {sections.acoes.length > 0 && (
        <PerfilSection title={`Ações Pendentes (${sections.acoes.filter(a => a.pending).length})`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {sections.acoes.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '4px 0' }}>
                <span style={{
                  marginTop: 3, width: 12, height: 12, border: '1.5px solid var(--border)',
                  borderRadius: 3, flexShrink: 0,
                  background: a.pending ? 'transparent' : 'var(--accent)',
                }} />
                <span style={{ fontSize: 12.5, color: a.pending ? 'var(--text-primary)' : 'var(--text-muted)', textDecoration: a.pending ? 'none' : 'line-through' }}>
                  {a.text}
                </span>
              </div>
            ))}
          </div>
        </PerfilSection>
      )}

      {sections.atencao.length > 0 && (
        <PerfilSection title="Pontos de Atenção">
          {sections.atencao.map((item, i) => (
            <DatedItem key={i} text={item} />
          ))}
        </PerfilSection>
      )}

      {sections.conquistas.length > 0 && (
        <PerfilSection title="Conquistas e Elogios">
          {sections.conquistas.map((item, i) => (
            <DatedItem key={i} text={item} />
          ))}
        </PerfilSection>
      )}

      {sections.temas.length > 0 && (
        <PerfilSection title="Temas Recorrentes">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {sections.temas.map((t, i) => (
              <span key={i} style={{
                fontSize: 11, padding: '3px 9px', borderRadius: 20,
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
              }}>
                {t}
              </span>
            ))}
          </div>
        </PerfilSection>
      )}
    </div>
  )
}

// ── Artifacts tab ──────────────────────────────────────────────────────────────

function ArtifactsTab({ artifacts }: { artifacts: ArtifactMeta[] }) {
  if (artifacts.length === 0) {
    return (
      <PlaceholderTab
        icon={<FileText size={28} />}
        title="Artefatos"
        desc="Nenhum artefato processado ainda."
        fase="Aguardando ingestão"
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {artifacts.map((a, i) => <ArtifactCard key={i} artifact={a} />)}
    </div>
  )
}

function ArtifactCard({ artifact: a }: { artifact: ArtifactMeta }) {
  const [expanded, setExpanded] = useState(false)
  const [content,  setContent]  = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)

  async function toggle() {
    if (!expanded && content === null) {
      setLoading(true)
      const raw = await window.api.artifacts.read(a.path)
      // Strip YAML frontmatter for display
      setContent(raw.replace(/^---\n[\s\S]*?\n---\n\n?/, '').trim())
      setLoading(false)
    }
    setExpanded((v) => !v)
  }

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 6, overflow: 'hidden',
    }}>
      {/* Header row */}
      <div
        onClick={toggle}
        style={{
          padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 12,
          cursor: 'pointer',
          background: expanded ? 'var(--surface-2)' : 'transparent',
          transition: 'background 0.12s',
        }}
      >
        <span style={{
          fontSize: 9, fontWeight: 600, letterSpacing: '0.07em',
          textTransform: 'uppercase' as const,
          padding: '2px 6px', borderRadius: 20,
          background: 'var(--surface-3)', border: '1px solid var(--border)',
          color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {labelTipo(a.tipo)}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {fmtDate(a.date)}
        </span>
        <span style={{ flex: 1, fontSize: 12.5, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {a.fileName}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {loading && <Loader2 size={12} style={{ color: 'var(--text-muted)', animation: 'spin 1s linear infinite' }} />}
          <button
            onClick={(e) => { e.stopPropagation(); window.api.shell.open(a.path) }}
            style={{ ...styles.btnIcon, width: 24, height: 24 }}
            title="Abrir no editor"
          >
            <ExternalLink size={11} />
          </button>
          <span style={{
            fontSize: 10, color: 'var(--text-muted)', transform: expanded ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s', display: 'flex',
          }}>
            ▾
          </span>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && content !== null && (
        <div style={{
          padding: '16px 18px',
          borderTop: '1px solid var(--border-subtle)',
        }}>
          <MarkdownPreview content={content} maxHeight={480} />
        </div>
      )}
    </div>
  )
}

// ── Pautas tab ─────────────────────────────────────────────────────────────────

function PautasTab({
  pautas, onGenerate, generating, hasPerfil,
}: {
  pautas:     PautaMeta[]
  onGenerate: () => void
  generating: boolean
  hasPerfil:  boolean
}) {
  if (pautas.length === 0) {
    return (
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6,
        padding: '48px 32px', textAlign: 'center',
      }}>
        <div style={{ color: 'var(--text-muted)', marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
          <CalendarDays size={28} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
          Nenhuma pauta gerada
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
          {hasPerfil
            ? 'Clique em "Gerar pauta" para criar a pauta do próximo 1:1.'
            : 'Ingira um artefato primeiro para que o perfil vivo esteja disponível.'}
        </div>
        {hasPerfil && (
          <button onClick={onGenerate} disabled={generating} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 6,
            background: 'var(--accent)', color: '#09090c',
            border: 'none', fontSize: 13, fontWeight: 600, cursor: generating ? 'wait' : 'pointer',
          }}>
            {generating
              ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Gerando…</>
              : <><CalendarDays size={12} /> Gerar pauta</>}
          </button>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {pautas.map((p, i) => <PautaCard key={i} pauta={p} />)}
    </div>
  )
}

function PautaCard({ pauta: p }: { pauta: PautaMeta }) {
  const [expanded, setExpanded] = useState(false)
  const [content,  setContent]  = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)

  async function toggle() {
    if (!expanded && content === null) {
      setLoading(true)
      const raw = await window.api.artifacts.read(p.path)
      setContent(raw)
      setLoading(false)
    }
    setExpanded((v) => !v)
  }

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 6, overflow: 'hidden',
    }}>
      <div
        onClick={toggle}
        style={{
          padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
          cursor: 'pointer',
          background: expanded ? 'var(--surface-2)' : 'transparent',
          transition: 'background 0.12s',
        }}
      >
        <CalendarDays size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {fmtDate(p.date)}
        </span>
        <span style={{ flex: 1, fontSize: 12.5, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p.fileName}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {loading && <Loader2 size={12} style={{ color: 'var(--text-muted)', animation: 'spin 1s linear infinite' }} />}
          <button
            onClick={(e) => { e.stopPropagation(); window.api.shell.open(p.path) }}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 24, height: 24, borderRadius: 6,
              background: 'var(--surface-2)', color: 'var(--text-secondary)',
              border: '1px solid var(--border)', cursor: 'pointer', flexShrink: 0,
            }}
            title="Abrir no editor"
          >
            <ExternalLink size={11} />
          </button>
          <span style={{
            fontSize: 10, color: 'var(--text-muted)',
            transform: expanded ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s', display: 'flex',
          }}>▾</span>
        </div>
      </div>
      {expanded && content !== null && (
        <div style={{ padding: '16px 18px', borderTop: '1px solid var(--border-subtle)' }}>
          <MarkdownPreview content={content} maxHeight={560} />
        </div>
      )}
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function stripMd(s: string): string {
  return s.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').trim()
}

function parsePerfilSections(raw: string) {
  function extractBlock(label: string): string {
    const re = new RegExp(`${escapeRe(label)}\n([\\s\\S]*?)\n<!-- FIM DO BLOCO GERENCIADO -->`)
    const m = raw.match(re)
    return m ? m[1].trim() : ''
  }

  const resumoRaw = extractBlock('<!-- BLOCO GERENCIADO PELA IA — reescrito a cada ingestão -->')

  const acoesRaw = extractBlock('<!-- BLOCO GERENCIADO PELA IA — append de novos itens -->')
  const acoes = acoesRaw
    .split('\n')
    .filter((l) => l.startsWith('- '))
    .map((l) => ({
      pending: l.startsWith('- [ ]'),
      text: stripMd(l.replace(/^- \[[ x]\] /, '').trim()),
    }))

  const atencaoRaw = extractBlock('<!-- BLOCO GERENCIADO PELA IA — append apenas -->')
  const atencao = atencaoRaw.split('\n').filter((l) => l.startsWith('- ')).map((l) => stripMd(l.slice(2).trim()))

  // Conquistas block is the second "append apenas" block
  const conquistasMatch = [...raw.matchAll(new RegExp(`${escapeRe('<!-- BLOCO GERENCIADO PELA IA — append apenas -->')}\\n([\\s\\S]*?)\\n<!-- FIM DO BLOCO GERENCIADO -->`, 'g'))]
  const conquistasRaw = conquistasMatch[1]?.[1]?.trim() ?? ''
  const conquistas = conquistasRaw.split('\n').filter((l) => l.startsWith('- ')).map((l) => stripMd(l.slice(2).trim()))

  const temasRaw = extractBlock('<!-- BLOCO GERENCIADO PELA IA — lista deduplicada, substituída a cada ingestão -->')
  const temas = temasRaw.split('\n').filter((l) => l.startsWith('- ')).map((l) => l.slice(2).trim())

  return { resumo: stripMd(resumoRaw), acoes, atencao, conquistas, temas }
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function DatedItem({ text }: { text: string }) {
  const match = text.match(/^(\d{4}-\d{2}-\d{2}):\s*(.*)$/)
  if (match) {
    return (
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '3px 0', lineHeight: 1.5 }}>
        <span style={{
          fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)',
          flexShrink: 0, paddingTop: 1,
        }}>
          {fmtDate(match[1])}
        </span>
        <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{match[2]}</span>
      </div>
    )
  }
  return (
    <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', padding: '3px 0', lineHeight: 1.5 }}>
      {text}
    </div>
  )
}

function PerfilSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 6, overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)',
        fontSize: 10, fontWeight: 600, letterSpacing: '0.1em',
        textTransform: 'uppercase' as const, color: 'var(--text-muted)',
      }}>
        {title}
      </div>
      <div style={{ padding: '14px 16px' }}>{children}</div>
    </div>
  )
}

function PlaceholderTab({ icon, title, desc, fase }: { icon: React.ReactNode; title: string; desc: string; fase: string }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6,
      padding: '48px 32px', textAlign: 'center',
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 12, display: 'flex', justifyContent: 'center' }}>{icon}</div>
      <div style={{ fontFamily: 'var(--font)', fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-secondary)', marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>{desc}</div>
      <span style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const,
        padding: '3px 8px', borderRadius: 20,
        background: 'var(--surface-2)', border: '1px solid var(--border)',
        color: 'var(--text-muted)',
      }}>
        {fase}
      </span>
    </div>
  )
}

function HealthDot({ saude }: { saude: string }) {
  const color = saude === 'verde' ? 'var(--green)' : saude === 'amarelo' ? 'var(--yellow, #d4a843)' : 'var(--red)'
  return (
    <span style={{
      width: 8, height: 8, borderRadius: '50%',
      background: color, display: 'inline-block',
      boxShadow: `0 0 6px ${color}`,
    }} title={`Saúde: ${saude}`} />
  )
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 6, overflow: 'hidden', marginBottom: 14,
    }}>
      <div style={{
        padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)',
        fontSize: 10, fontWeight: 600, letterSpacing: '0.1em',
        textTransform: 'uppercase' as const, color: 'var(--text-muted)',
      }}>
        {title}
      </div>
      <div>{children}</div>
    </div>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{
      padding: '9px 16px', display: 'flex', justifyContent: 'space-between',
      alignItems: 'center', borderBottom: '1px solid var(--border-subtle)',
    }}>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{
        fontSize: mono ? 11 : 12, fontWeight: 500, color: 'var(--text-primary)',
        fontFamily: mono ? 'JetBrains Mono, monospace' : undefined,
      }}>
        {value}
      </span>
    </div>
  )
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 20,
      background: 'var(--surface-2)', color: 'var(--text-secondary)',
      border: '1px solid var(--border)',
    }}>
      {children}
    </span>
  )
}
