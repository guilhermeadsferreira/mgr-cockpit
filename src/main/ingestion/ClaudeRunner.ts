import { spawn } from 'child_process'

export interface ClaudeRunnerResult {
  success: boolean
  data?: unknown
  rawOutput?: string
  error?: string
}

function ts(): string {
  return new Date().toTimeString().slice(0, 12) // HH:MM:SS.mmm
}

/**
 * Runs a prompt against the Claude Code CLI and returns parsed JSON.
 * Uses child_process.spawn — never the Anthropic API.
 */
export function runClaudePrompt(
  claudeBin: string,
  prompt: string,
  timeoutMs = 90_000,
  maxRetries = 1,
  model?: string,
): Promise<ClaudeRunnerResult> {
  return attemptRun(claudeBin, prompt, timeoutMs, 0, maxRetries, model)
}

async function attemptRun(
  claudeBin: string,
  prompt: string,
  timeoutMs: number,
  attempt: number,
  maxRetries: number,
  model?: string,
): Promise<ClaudeRunnerResult> {
  const result = await spawnOnce(claudeBin, prompt, timeoutMs, model)

  if (result.success) return result

  if (attempt < maxRetries) {
    // Exponential backoff with jitter: 2^attempt * 1s ± 50–100%, capped at 30s
    const base = Math.pow(2, attempt) * 1000
    const delay = Math.min(base * (0.5 + Math.random() * 0.5), 30_000)
    console.log(`[ClaudeRunner] ${ts()} retry ${attempt + 1}/${maxRetries} em ${Math.round(delay)}ms`)
    await new Promise((r) => setTimeout(r, delay))
    return attemptRun(claudeBin, prompt, timeoutMs, attempt + 1, maxRetries, model)
  }

  return result
}

function spawnOnce(
  claudeBin: string,
  prompt: string,
  timeoutMs: number,
  model?: string,
): Promise<ClaudeRunnerResult> {
  return new Promise((resolve) => {
    let stdout = ''
    let stderr = ''
    let settled = false
    const spawnedAt = Date.now()

    const args = [
      '-p', prompt,
      '--tools', '',               // sem ferramentas — geração de JSON puro
      '--no-session-persistence',  // não grava sessão em disco
      ...(model ? ['--model', model] : []),
    ]

    console.log(`[ClaudeRunner] ${ts()} spawn: ${claudeBin} -p "<prompt>" (${Buffer.byteLength(prompt, 'utf8')} bytes${model ? ` model=${model}` : ''})`)

    const proc = spawn(claudeBin, args, {
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'], // fecha stdin explicitamente
    })

    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      proc.kill()
      resolve({ success: false, error: `Timeout após ${timeoutMs / 1000}s` })
    }, timeoutMs)

    proc.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString() })
    proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString() })

    proc.on('close', (code) => {
      const elapsed = ((Date.now() - spawnedAt) / 1000).toFixed(1)
      clearTimeout(timer)
      if (settled) {
        console.log(`[ClaudeRunner] ${ts()} close ignored (already settled): code=${code} elapsed=${elapsed}s`)
        return
      }
      settled = true

      console.log(`[ClaudeRunner] ${ts()} close code=${code} stdout=${stdout.length}chars elapsed=${elapsed}s stderr=${stderr.slice(0, 100)}`)

      if (code !== 0) {
        resolve({
          success: false,
          error: stderr.trim() || `Processo encerrou com código ${code}`,
          rawOutput: stdout,
        })
        return
      }

      resolve(parseOutput(stdout))
    })

    proc.on('error', (err) => {
      const elapsed = ((Date.now() - spawnedAt) / 1000).toFixed(1)
      clearTimeout(timer)
      if (settled) return
      settled = true
      console.error(`[ClaudeRunner] ${ts()} spawn error: ${err.message} elapsed=${elapsed}s`)
      resolve({ success: false, error: err.message })
    })
  })
}

function parseOutput(raw: string): ClaudeRunnerResult {
  const text = raw.trim()

  // 1. Direct JSON parse
  try {
    const data = JSON.parse(text)
    return { success: true, data, rawOutput: text }
  } catch { /* try next */ }

  // 2. Extract JSON from markdown code fence ```json ... ```
  const fenceMatch = text.match(/```(?:json)?\s*\n([\s\S]+?)\n```/)
  if (fenceMatch) {
    try {
      const data = JSON.parse(fenceMatch[1].trim())
      return { success: true, data, rawOutput: text }
    } catch { /* fall through */ }
  }

  // 3. Find first { ... } block
  const braceMatch = text.match(/\{[\s\S]+\}/)
  if (braceMatch) {
    try {
      const data = JSON.parse(braceMatch[0])
      return { success: true, data, rawOutput: text }
    } catch { /* fall through */ }
  }

  return {
    success: false,
    error: 'Resposta não é JSON válido',
    rawOutput: text,
  }
}
