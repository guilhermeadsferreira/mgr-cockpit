import { useState, useEffect } from 'react'
import { Plus, Check, Trash2, Pencil, X } from 'lucide-react'
import type { Demanda, DemandaOrigem, DemandaStatus } from '../types/ipc'

const ORIGENS: DemandaOrigem[] = ['Líder', 'Liderado', 'Par', 'Eu']

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(d: string): string {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function daysSince(d: string): number {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000)
}

function daysUntil(d: string): number {
  const todayMs = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00').getTime()
  return Math.floor((new Date(d + 'T00:00:00').getTime() - todayMs) / 86_400_000)
}

function daysUntilEndOfWeek(): number {
  const day = new Date().getDay() // 0=Dom, 1=Seg, ..., 6=Sáb
  const daysSinceMonday = day === 0 ? 6 : day - 1
  return 6 - daysSinceMonday // dias até domingo (fim da semana ISO)
}

function deadlineBadge(prazo: string): { label: string; color: string; bg: string; border: string } {
  const diff = daysUntil(prazo)
  const endOfWeek = daysUntilEndOfWeek()
  if (diff < 0)              return { label: 'Vencida',        color: 'var(--red)',            bg: 'rgba(184,64,64,0.12)',   border: 'rgba(184,64,64,0.3)' }
  if (diff === 0)            return { label: 'Hoje',            color: '#e8873a',               bg: 'rgba(232,135,58,0.12)',  border: 'rgba(232,135,58,0.35)' }
  if (diff === 1)            return { label: 'Amanhã',          color: 'var(--accent)',         bg: 'var(--accent-dim)',      border: 'rgba(192,135,58,0.3)' }
  if (diff <= endOfWeek)     return { label: 'Esta semana',     color: 'var(--accent)',         bg: 'var(--accent-dim)',      border: 'rgba(192,135,58,0.25)' }
  if (diff <= endOfWeek + 7) return { label: 'Semana que vem',  color: '#9db87c',               bg: 'rgba(157,184,124,0.1)', border: 'rgba(157,184,124,0.3)' }
  if (diff <= 30)            return { label: 'Este mês',        color: 'var(--text-secondary)', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.1)' }
  return                            { label: formatDate(prazo),  color: 'var(--text-muted)',     bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.08)' }
}

export function MyDemandsView() {
  const [demandas, setDemandas]           = useState<Demanda[]>([])
  const [activeTab, setActiveTab]         = useState<'open' | 'done'>('open')
  const [showForm, setShowForm]           = useState(false)
  const [editing, setEditing]             = useState<Demanda | null>(null)
  const [markingDone, setMarkingDone]     = useState<string | null>(null)   // id of demanda being marked done
  const [addToCiclo, setAddToCiclo]       = useState(false)
  const [deleting, setDeleting]           = useState<string | null>(null)   // id pending confirmation

  const [formDesc, setFormDesc]     = useState('')
  const [formOrigem, setFormOrigem] = useState<DemandaOrigem>('Eu')
  const [formPrazo, setFormPrazo]   = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const list = await window.api.eu.listDemandas() as Demanda[]
    setDemandas(list)
  }

  function notify() {
    window.dispatchEvent(new Event('demandas:changed'))
  }

  function openNew() {
    setEditing(null)
    setFormDesc('')
    setFormOrigem('Eu')
    setFormPrazo('')
    setShowForm(true)
  }

  function openEdit(d: Demanda) {
    setEditing(d)
    setFormDesc(d.descricao)
    setFormOrigem(d.origem)
    setFormPrazo(d.prazo ?? '')
    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false)
    setEditing(null)
    setFormDesc('')
    setFormOrigem('Eu')
    setFormPrazo('')
  }

  async function submitForm() {
    if (!formDesc.trim()) return
    const t = today()
    const prazo = formPrazo || null
    const demanda: Demanda = editing
      ? { ...editing, descricao: formDesc.trim(), origem: formOrigem, prazo, atualizadoEm: t }
      : { id: genId(), descricao: formDesc.trim(), origem: formOrigem, prazo, criadoEm: t, atualizadoEm: t, status: 'open' }
    await window.api.eu.saveDemanda(demanda)
    await load()
    notify()
    cancelForm()
  }

  async function confirmMarkDone(id: string) {
    await window.api.eu.updateDemandaStatus(id, 'done' as DemandaStatus, addToCiclo)
    await load()
    notify()
    setMarkingDone(null)
    setAddToCiclo(false)
  }

  async function confirmDelete(id: string) {
    await window.api.eu.deleteDemanda(id)
    await load()
    notify()
    setDeleting(null)
  }

  const open = demandas
    .filter((d) => d.status === 'open')
    .sort((a, b) => {
      if (a.prazo && b.prazo) return a.prazo.localeCompare(b.prazo)
      if (a.prazo) return -1
      if (b.prazo) return 1
      return a.atualizadoEm.localeCompare(b.atualizadoEm)
    })

  const done = demandas
    .filter((d) => d.status === 'done')
    .sort((a, b) => (b.concluidoEm ?? '').localeCompare(a.concluidoEm ?? ''))

  const list = activeTab === 'open' ? open : done

  const origemColor: Record<DemandaOrigem, string> = {
    'Líder':    'var(--accent)',
    'Liderado': 'var(--green)',
    'Par':      '#7c9fc4',
    'Eu':       'var(--text-muted)',
  }

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20, borderBottom: '1px solid var(--border-subtle)' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0 }}>
          {(['open', 'done'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              style={{
                padding: '7px 14px', borderRadius: 0, fontSize: 12.5,
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === t ? '2px solid var(--accent)' : '2px solid transparent',
                color: activeTab === t ? 'var(--text-primary)' : 'var(--text-muted)',
                cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: activeTab === t ? 600 : 400,
                marginBottom: -1,
              }}
            >
              {t === 'open' ? `Abertas (${open.length})` : `Concluídas (${done.length})`}
            </button>
          ))}
        </div>
        {/* New button */}
        <button
          onClick={openNew}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 6, fontSize: 12.5, fontWeight: 500,
            background: 'var(--accent-dim)', border: '1px solid rgba(192,135,58,0.3)',
            color: 'var(--accent)', cursor: 'pointer', fontFamily: 'var(--font)',
            marginBottom: 8,
          }}
        >
          <Plus size={13} /> Nova demanda
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          borderRadius: 8, padding: 16, marginBottom: 16,
        }}>
          <textarea
            autoFocus
            value={formDesc}
            onChange={(e) => setFormDesc(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitForm() }}
            placeholder="Descreva a demanda..."
            rows={3}
            style={{
              width: '100%', resize: 'vertical', padding: '8px 10px',
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 6, color: 'var(--text-primary)', fontSize: 13,
              fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Origem</label>
            <select
              value={formOrigem}
              onChange={(e) => setFormOrigem(e.target.value as DemandaOrigem)}
              style={{
                padding: '4px 8px', borderRadius: 6, fontSize: 12.5,
                background: 'var(--surface)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', fontFamily: 'var(--font)', cursor: 'pointer',
              }}
            >
              {ORIGENS.map((o) => <option key={o}>{o}</option>)}
            </select>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 6 }}>Prazo</label>
            <input
              type="date"
              value={formPrazo}
              onChange={(e) => setFormPrazo(e.target.value)}
              style={{
                padding: '4px 8px', borderRadius: 6, fontSize: 12.5,
                background: 'var(--surface)', border: '1px solid var(--border)',
                color: formPrazo ? 'var(--text-primary)' : 'var(--text-muted)',
                fontFamily: 'var(--font)', cursor: 'pointer',
              }}
            />
            {formPrazo && (
              <button
                onClick={() => setFormPrazo('')}
                title="Limpar prazo"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0 2px', fontSize: 12 }}
              >
                ×
              </button>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button onClick={cancelForm} style={btnSecondary}>Cancelar</button>
              <button onClick={submitForm} style={btnPrimary} disabled={!formDesc.trim()}>
                {editing ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: 13 }}>
          {activeTab === 'open' ? 'Nenhuma demanda aberta.' : 'Nenhuma demanda concluída ainda.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.map((d) => (
            <div
              key={d.id}
              style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '12px 14px',
                display: 'flex', alignItems: 'flex-start', gap: 12,
                opacity: d.status === 'done' ? 0.65 : 1,
              }}
            >
              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13.5, color: 'var(--text-primary)', lineHeight: 1.45,
                  textDecoration: d.status === 'done' ? 'line-through' : 'none',
                }}>
                  {d.descricao}
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: 10.5, fontFamily: 'var(--font-mono)',
                    color: origemColor[d.origem],
                    background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${origemColor[d.origem]}33`,
                    borderRadius: 4, padding: '1px 6px',
                  }}>
                    {d.origem}
                  </span>
                  {d.status === 'open' && d.prazo && (() => {
                    const badge = deadlineBadge(d.prazo)
                    return (
                      <span style={{
                        fontSize: 10.5, fontFamily: 'var(--font-mono)',
                        color: badge.color, background: badge.bg,
                        border: `1px solid ${badge.border}`,
                        borderRadius: 4, padding: '1px 6px',
                        fontWeight: 500,
                      }}>
                        {badge.label}
                      </span>
                    )
                  })()}
                  {d.status === 'open' ? (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      há {daysSince(d.atualizadoEm)}d sem atualização
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      concluída em {formatDate(d.concluidoEm ?? d.atualizadoEm)}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              {d.status === 'open' && (
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {deleting === d.id ? (
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Excluir?</span>
                      <button onClick={() => confirmDelete(d.id)} style={btnDanger}>Sim</button>
                      <button onClick={() => setDeleting(null)} style={btnSecondary}>Não</button>
                    </div>
                  ) : markingDone === d.id ? (
                    <div style={{
                      display: 'flex', gap: 8, alignItems: 'center',
                      background: 'var(--surface-2)', border: '1px solid var(--border)',
                      borderRadius: 6, padding: '6px 10px',
                    }}>
                      <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={addToCiclo}
                          onChange={(e) => setAddToCiclo(e.target.checked)}
                          style={{ cursor: 'pointer' }}
                        />
                        Adicionar ao Meu Ciclo
                      </label>
                      <button onClick={() => confirmMarkDone(d.id)} style={btnPrimary}>Confirmar</button>
                      <button onClick={() => { setMarkingDone(null); setAddToCiclo(false) }} style={btnSecondary}>
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <IconBtn title="Marcar como concluída" onClick={() => setMarkingDone(d.id)}>
                        <Check size={13} />
                      </IconBtn>
                      <IconBtn title="Editar" onClick={() => openEdit(d)}>
                        <Pencil size={13} />
                      </IconBtn>
                      <IconBtn title="Excluir" onClick={() => setDeleting(d.id)}>
                        <Trash2 size={13} />
                      </IconBtn>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function IconBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28, borderRadius: 6,
        background: 'transparent', border: '1px solid transparent',
        color: 'var(--text-muted)', cursor: 'pointer',
        transition: 'background 0.12s, color 0.12s, border-color 0.12s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--surface-2)'
        e.currentTarget.style.color = 'var(--text-primary)'
        e.currentTarget.style.borderColor = 'var(--border)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color = 'var(--text-muted)'
        e.currentTarget.style.borderColor = 'transparent'
      }}
    >
      {children}
    </button>
  )
}

const btnPrimary: React.CSSProperties = {
  padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
  background: 'var(--accent-dim)', border: '1px solid rgba(192,135,58,0.3)',
  color: 'var(--accent)', cursor: 'pointer', fontFamily: 'var(--font)',
}

const btnSecondary: React.CSSProperties = {
  padding: '4px 12px', borderRadius: 6, fontSize: 12,
  background: 'transparent', border: '1px solid var(--border)',
  color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font)',
}

const btnDanger: React.CSSProperties = {
  padding: '4px 12px', borderRadius: 6, fontSize: 12,
  background: 'rgba(184,64,64,0.1)', border: '1px solid rgba(184,64,64,0.3)',
  color: 'var(--red)', cursor: 'pointer', fontFamily: 'var(--font)',
}
