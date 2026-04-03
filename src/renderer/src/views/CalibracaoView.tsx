import { useState, useEffect } from 'react'
import { Scale, Loader2, ExternalLink } from 'lucide-react'
import { useRouter } from '../router'
import type { PersonConfig, PerfilFrontmatter, CycleReportResult } from '../types/ipc'
import { labelNivel } from '../lib/utils'

type PersonStatus =
  | { state: 'idle' }
  | { state: 'running' }
  | { state: 'done'; result: CycleReportResult }
  | { state: 'error'; message: string }

export function CalibracaoView() {
  const { navigate } = useRouter()

  const [periodoInicio, setPeriodoInicio] = useState(
    new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10)
  )
  const [periodoFim, setPeriodoFim] = useState(
    new Date().toISOString().slice(0, 10)
  )

  const [liderados, setLiderados] = useState<PersonConfig[]>([])
  const [perfisMap, setPerfisMap] = useState<Map<string, Partial<PerfilFrontmatter>>>(new Map())
  const [statusMap, setStatusMap] = useState<Map<string, PersonStatus>>(new Map())
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    window.api.people.list().then(async (all) => {
      const lids = all.filter((p) => p.relacao === 'liderado')
      setLiderados(lids)
      const perfils = await Promise.all(
        lids.map((p) =>
          window.api.people.getPerfil(p.slug).then((r) => [p.slug, r?.frontmatter ?? {}] as const)
        )
      )
      setPerfisMap(new Map(perfils))
    })
  }, [])

  async function handleGenerate() {
    if (isGenerating || liderados.length === 0) return
    setIsGenerating(true)

    const initial = new Map<string, PersonStatus>()
    liderados.forEach((p) => initial.set(p.slug, { state: 'running' }))
    setStatusMap(initial)

    await Promise.allSettled(
      liderados.map(async (p) => {
        try {
          const result = await window.api.ai.cycleReport({
            personSlug: p.slug,
            periodoInicio,
            periodoFim,
          }) as CycleReportResult
          setStatusMap((prev) => {
            const next = new Map(prev)
            next.set(
              p.slug,
              result.success
                ? { state: 'done', result }
                : { state: 'error', message: result.error ?? 'Erro desconhecido' }
            )
            return next
          })
        } catch (e) {
          setStatusMap((prev) => {
            const next = new Map(prev)
            next.set(p.slug, { state: 'error', message: e instanceof Error ? e.message : String(e) })
            return next
          })
        }
      })
    )

    setIsGenerating(false)
  }

  const doneCount = [...statusMap.values()].filter((s) => s.state === 'done' || s.state === 'error').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '28px 40px 22px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      }}>
        <div>
          <div style={styles.eyebrow}>Avaliação</div>
          <h1 style={styles.pageTitle}>Calibração do time</h1>
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4 }}>
            {liderados.length} liderado{liderados.length !== 1 ? 's' : ''} — gera relatório de ciclo para todos em paralelo
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="date"
            value={periodoInicio}
            onChange={(e) => setPeriodoInicio(e.target.value)}
            disabled={isGenerating}
            style={styles.input}
          />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>até</span>
          <input
            type="date"
            value={periodoFim}
            onChange={(e) => setPeriodoFim(e.target.value)}
            disabled={isGenerating}
            style={styles.input}
          />
          <button
            onClick={handleGenerate}
            disabled={isGenerating || liderados.length === 0}
            style={{
              ...styles.btnPrimary,
              opacity: liderados.length === 0 ? 0.45 : 1,
              cursor: isGenerating || liderados.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            {isGenerating ? (
              <>
                <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                Gerando… ({doneCount}/{liderados.length})
              </>
            ) : (
              <>
                <Scale size={13} />
                Gerar relatórios
              </>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 40px' }}>
        {liderados.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 40px',
            color: 'var(--text-muted)', fontSize: 14,
          }}>
            Nenhum liderado cadastrado. Adicione pessoas com relação "liderado" primeiro.
          </div>
        ) : (
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 6, overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Pessoa', 'Nível', 'Saúde', 'Promotável', 'Conclusão', ''].map((col) => (
                    <th
                      key={col}
                      style={{
                        padding: '10px 14px', textAlign: 'left',
                        fontSize: 10, fontWeight: 600, letterSpacing: '0.1em',
                        textTransform: 'uppercase', color: 'var(--text-muted)',
                        background: 'var(--surface-2)',
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {liderados.map((p) => {
                  const status = statusMap.get(p.slug) ?? { state: 'idle' as const }
                  const perfil = perfisMap.get(p.slug)
                  const isError = status.state === 'error'

                  return (
                    <tr
                      key={p.slug}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        background: isError ? 'rgba(184,64,64,0.04)' : 'transparent',
                      }}
                    >
                      {/* Pessoa */}
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.nome}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.cargo}</div>
                      </td>

                      {/* Nível */}
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 20,
                          background: 'var(--blue-dim, rgba(64,128,168,0.12))',
                          color: 'var(--blue)', border: '1px solid rgba(64,128,168,0.2)',
                        }}>
                          {labelNivel(p.nivel)}
                        </span>
                      </td>

                      {/* Saúde */}
                      <td style={{ padding: '10px 14px' }}>
                        {perfil?.saude ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{
                              width: 8, height: 8, borderRadius: '50%',
                              background: perfil.saude === 'verde' ? 'var(--green)'
                                : perfil.saude === 'amarelo' ? 'var(--yellow, #d4a843)'
                                : 'var(--red)',
                            }} />
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                              {perfil.tendencia_emocional === 'deteriorando' ? '↓'
                                : perfil.tendencia_emocional === 'melhorando' ? '↑' : '→'}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                        )}
                      </td>

                      {/* Promotável */}
                      <td style={{ padding: '10px 14px' }}>
                        {status.state === 'idle' && (
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                        )}
                        {status.state === 'running' && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontSize: 11, color: 'var(--text-muted)',
                          }}>
                            <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />
                            gerando…
                          </span>
                        )}
                        {status.state === 'done' && status.result.result && (() => {
                          const flag = status.result.result.flag_promovibilidade
                          const color = flag === 'sim' ? 'var(--green)' : flag === 'nao' ? 'var(--red)' : 'var(--yellow, #d4a843)'
                          const label = flag === 'sim' ? 'Sim' : flag === 'nao' ? 'Não' : 'Avaliar'
                          return (
                            <span style={{
                              fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                              background: `color-mix(in srgb, ${color} 12%, transparent)`,
                              border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
                              color,
                            }}>
                              {label}
                            </span>
                          )
                        })()}
                        {status.state === 'error' && (
                          <span
                            title={status.message}
                            style={{
                              fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                              background: 'rgba(184,64,64,0.1)', border: '1px solid rgba(184,64,64,0.3)',
                              color: 'var(--red)', cursor: 'help',
                            }}
                          >
                            erro
                          </span>
                        )}
                      </td>

                      {/* Conclusão */}
                      <td style={{ padding: '10px 14px', maxWidth: 400 }}>
                        {status.state === 'done' && status.result.result && (
                          <div style={{
                            fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5,
                            display: '-webkit-box', WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical', overflow: 'hidden',
                          }}>
                            {status.result.result.conclusao_para_calibracao}
                          </div>
                        )}
                      </td>

                      {/* Ação */}
                      <td style={{ padding: '10px 14px' }}>
                        {status.state === 'done' && (
                          <button
                            onClick={() => navigate('person', { slug: p.slug, tab: 'ciclo' })}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '4px 10px', borderRadius: 5,
                              background: 'var(--surface-2)', color: 'var(--text-secondary)',
                              border: '1px solid var(--border)',
                              fontSize: 11, fontFamily: 'var(--font)', cursor: 'pointer',
                            }}
                          >
                            <ExternalLink size={10} />
                            Ver completo
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

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
    margin: 0,
  } as React.CSSProperties,
  input: {
    background: 'var(--surface-2)', border: '1px solid var(--border)',
    borderRadius: 6, padding: '8px 12px',
    fontFamily: 'var(--font-mono)', fontSize: 12,
    color: 'var(--text-primary)', outline: 'none',
  } as React.CSSProperties,
  btnPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 14px', borderRadius: 6, border: 'none',
    background: 'var(--accent)', color: '#09090c',
    fontSize: 13, fontFamily: 'var(--font)', fontWeight: 600, cursor: 'pointer',
  } as React.CSSProperties,
}
