import { useState, useEffect } from 'react'
import type { AppSettings } from '../types/ipc'

type TestState = 'idle' | 'loading' | 'success' | 'error'

export function SetupView() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [ipcOk, setIpcOk] = useState<boolean | null>(null)
  const [testState, setTestState] = useState<TestState>('idle')
  const [testResult, setTestResult] = useState<ClaudeTestResult | null>(null)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    // Carrega settings
    window.api.settings.load().then(setSettings)

    // Testa IPC imediatamente (ping não usa claude)
    window.api.ping()
      .then(() => setIpcOk(true))
      .catch(() => setIpcOk(false))
  }, [])

  // Contador de segundos enquanto testa
  useEffect(() => {
    if (testState !== 'loading') { setElapsed(0); return }
    const id = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(id)
  }, [testState])

  async function handleTest() {
    setTestState('loading')
    setTestResult(null)
    try {
      const result = await window.api.ai.test()
      setTestResult(result)
      setTestState(result.success ? 'success' : 'error')
    } catch (err) {
      setTestResult({ success: false, error: String(err) })
      setTestState('error')
    }
  }

  const border = (color: string) => `1px solid ${color}`

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh',
      background: 'var(--bg)', padding: '0 32px',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 40 }}>
        <span style={{
          fontFamily: 'var(--font)',
          fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)',
        }}>
          MgrCockpit
        </span>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)',
          marginBottom: 4, flexShrink: 0,
        }} />
      </div>

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: 480,
        background: 'var(--surface)', border: border('var(--border)'),
        borderRadius: 8, overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: border('var(--border-subtle)') }}>
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
            Fase 0 — Setup técnico
          </p>
          <h2 style={{ fontFamily: 'var(--font)', fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Verificação do ambiente
          </h2>
        </div>

        {/* IPC status */}
        <div style={{ padding: '12px 24px', borderBottom: border('var(--border-subtle)'), display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            IPC Bridge
          </span>
          {ipcOk === null && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>verificando…</span>}
          {ipcOk === true  && <span style={{ fontSize: 11, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 5 }}><Dot color="var(--green)" /> OK</span>}
          {ipcOk === false && <span style={{ fontSize: 11, color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 5 }}><Dot color="var(--red)" /> Falhou</span>}
        </div>

        {/* Config rows */}
        <ConfigRow label="Workspace"   value={settings?.workspacePath ?? '…'} hint="Pasta de dados" />
        <ConfigRow
          label="Claude CLI"
          value={settings?.claudeBinPath || 'Não detectado'}
          hint="Binário detectado via which claude"
          danger={!settings?.claudeBinPath}
        />
        <ConfigRow label="Alerta 1:1"  value={settings ? `${settings.alert1on1Days} dias` : '…'} hint="Dias sem contato antes de alertar" />

        {/* Test button */}
        <div style={{ padding: '20px 24px', borderTop: border('var(--border-subtle)') }}>
          <button
            onClick={handleTest}
            disabled={testState === 'loading'}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '10px 16px', borderRadius: 6, border: 'none',
              background: testState === 'loading' ? 'var(--surface-3)' : 'var(--accent)',
              color: testState === 'loading' ? 'var(--text-secondary)' : '#09090c',
              fontSize: 13, fontFamily: 'var(--font)', fontWeight: 600,
              cursor: testState === 'loading' ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {testState === 'loading' ? (
              <>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'var(--accent)', display: 'inline-block',
                  animation: 'spin-pulse 1s ease-in-out infinite',
                }} />
                Aguardando Claude CLI… {elapsed > 0 && `(${elapsed}s)`}
              </>
            ) : (
              'Testar Claude Code CLI'
            )}
          </button>

          {/* Hint while loading */}
          {testState === 'loading' && (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>
              Pode levar até 30 segundos na primeira execução
            </p>
          )}

          {/* Result */}
          {testResult && (
            <div style={{
              marginTop: 14, borderRadius: 6, padding: '12px 14px',
              background: testResult.success ? 'rgba(58,154,101,0.08)' : 'rgba(184,64,64,0.08)',
              border: border(testResult.success ? 'rgba(58,154,101,0.2)' : 'rgba(184,64,64,0.2)'),
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Dot color={testResult.success ? 'var(--green)' : 'var(--red)'} glow />
                <span style={{ fontSize: 12, fontWeight: 600, color: testResult.success ? 'var(--green)' : 'var(--red)' }}>
                  {testResult.success ? 'Claude Code CLI funcionando!' : 'Erro'}
                </span>
              </div>
              <pre style={{
                fontFamily: 'var(--font-mono)', fontSize: 11,
                color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                margin: 0,
              }}>
                {testResult.success
                  ? JSON.stringify(testResult.data, null, 2)
                  : (testResult.error ?? '') + (testResult.rawOutput ? `\n\nOutput raw:\n${testResult.rawOutput.slice(0, 300)}` : '')}
              </pre>
            </div>
          )}
        </div>
      </div>

      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 20 }}>
        v0.1.0 · Fase 0
      </p>

      <style>{`
        @keyframes spin-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(0.7); }
        }
      `}</style>
    </div>
  )
}

function Dot({ color, glow }: { color: string; glow?: boolean }) {
  return (
    <span style={{
      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
      background: color,
      boxShadow: glow ? `0 0 6px ${color}` : undefined,
      display: 'inline-block',
    }} />
  )
}

function ConfigRow({ label, value, hint, danger }: {
  label: string; value: string; hint: string; danger?: boolean
}) {
  return (
    <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
      <div>
        <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>{label}</p>
        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{hint}</p>
      </div>
      <p style={{
        fontFamily: 'var(--font-mono)', fontSize: 11,
        color: danger ? 'var(--red)' : 'var(--text-secondary)',
        textAlign: 'right', wordBreak: 'break-all', maxWidth: '55%',
      }}>
        {value}
      </p>
    </div>
  )
}
