import { runClaudePrompt } from './ClaudeRunner'
import { buildGeminiPreprocessingPrompt, parseGeminiResponse } from '../prompts/gemini-preprocessing.prompt'
import { Logger } from '../logging/Logger'

const log = Logger.getInstance().child('HaikuPreprocessor')

export interface PreprocessResult {
  success: boolean
  cleanedText: string
  originalLength: number
  cleanedLength: number
  reductionPercent: number
  metadata?: {
    date?: string
    participants: string[]
    durationMinutes?: number
  }
  error?: string
}

/**
 * Pre-processes a transcript using Claude Haiku via the CLI.
 * Always uses 'light' mode (noise removal only, no thematic reorganization)
 * to preserve chronological flow and interpersonal dynamics.
 *
 * Advantages over Gemini:
 * - No external API key needed (uses existing Claude CLI subscription)
 * - Same model family as the main analysis (semantic consistency)
 * - Light mode preserves signals that full mode would compress away
 */
export async function preprocessWithHaiku(
  claudeBinPath: string,
  rawTranscript: string,
  timeoutMs = 90_000,
): Promise<PreprocessResult> {
  const originalLength = rawTranscript.length

  // Safety limit: truncate extreme inputs to avoid Haiku timeouts
  const MAX_INPUT_LENGTH = 100_000
  const truncatedText = rawTranscript.length > MAX_INPUT_LENGTH
    ? rawTranscript.slice(0, MAX_INPUT_LENGTH) + '\n\n[... texto truncado por limite de tamanho ...]'
    : rawTranscript

  if (truncatedText.length < rawTranscript.length) {
    log.warn('texto truncado para pre-processamento', { original: rawTranscript.length, truncated: truncatedText.length })
  }

  // Always use 'light' mode — preserves chronological flow and emotional tone
  // The main Claude analysis (Pass 1/2) is the one that should interpret and organize
  const prompt = buildGeminiPreprocessingPrompt(truncatedText, 'light')

  try {
    const result = await runClaudePrompt(claudeBinPath, prompt, timeoutMs, 1, 'haiku')

    if (!result.success || !result.rawOutput) {
      return {
        success: false,
        cleanedText: rawTranscript,
        originalLength,
        cleanedLength: originalLength,
        reductionPercent: 0,
        error: result.error ?? 'Haiku retornou resposta vazia',
      }
    }

    // Reuse the existing Gemini response parser (same JSON schema)
    const parsed = parseGeminiResponse(result.rawOutput)

    if (!parsed) {
      log.warn('falha ao parsear resposta do Haiku', { rawLength: result.rawOutput.length })
      return {
        success: false,
        cleanedText: rawTranscript,
        originalLength,
        cleanedLength: originalLength,
        reductionPercent: 0,
        error: 'Falha ao parsear resposta do Haiku (JSON invalido)',
      }
    }

    const cleanedLength = parsed.texto_limpo.length
    const reductionPercent = originalLength > 0
      ? ((originalLength - cleanedLength) / originalLength) * 100
      : 0

    log.info('pre-processamento Haiku OK', {
      originalLength,
      cleanedLength,
      economy: reductionPercent.toFixed(1) + '%',
    })

    return {
      success: true,
      cleanedText: parsed.texto_limpo,
      originalLength,
      cleanedLength,
      reductionPercent,
      metadata: {
        date: parsed.metadados.data_reuniao,
        participants: parsed.metadados.participantes,
        durationMinutes: parsed.metadados.duracao_minutos,
      },
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    log.error('erro no pre-processamento Haiku', { error: message })
    return {
      success: false,
      cleanedText: rawTranscript,
      originalLength,
      cleanedLength: originalLength,
      reductionPercent: 0,
      error: message,
    }
  }
}
