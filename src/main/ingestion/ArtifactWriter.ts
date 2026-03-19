import { existsSync, readFileSync, writeFileSync, renameSync, copyFileSync } from 'fs'
import { join } from 'path'
import type { IngestionAIResult } from '../prompts/ingestion.prompt'

const SECTION = {
  resumo:    { open: '<!-- BLOCO GERENCIADO PELA IA — reescrito a cada ingestão -->',     close: '<!-- FIM DO BLOCO GERENCIADO -->' },
  acoes:     { open: '<!-- BLOCO GERENCIADO PELA IA — append de novos itens -->',          close: '<!-- FIM DO BLOCO GERENCIADO -->' },
  atencao:   { open: '<!-- BLOCO GERENCIADO PELA IA — append apenas -->',                  close: '<!-- FIM DO BLOCO GERENCIADO -->' },
  conquistas:{ open: '<!-- BLOCO GERENCIADO PELA IA — append apenas -->',                  close: '<!-- FIM DO BLOCO GERENCIADO -->' },
  temas:     { open: '<!-- BLOCO GERENCIADO PELA IA — lista deduplicada, substituída a cada ingestão -->', close: '<!-- FIM DO BLOCO GERENCIADO -->' },
  historico: { open: '<!-- BLOCO GERENCIADO PELA IA — append apenas, nunca reescrito -->', close: '<!-- FIM DO BLOCO GERENCIADO -->' },
}

/**
 * Writes the processed artifact .md file and updates perfil.md atomically.
 */
export class ArtifactWriter {
  private pessoasDir: string

  constructor(workspacePath: string) {
    this.pessoasDir = join(workspacePath, 'pessoas')
  }

  /**
   * Saves the artifact to pessoas/{slug}/historico/{date}-{slug}.md
   * with a formatted template (AI analysis + original content) and returns the file name.
   */
  writeArtifact(slug: string, result: IngestionAIResult, rawContent: string): string {
    const { tipo, data_artefato: date, resumo, acoes_comprometidas, pontos_de_atencao,
            elogios_e_conquistas, temas_detectados, motivo_indicador, indicador_saude } = result

    const fileName = `${date}-${slug}.md`
    const dest = join(this.pessoasDir, slug, 'historico', fileName)

    const lines: string[] = [
      `---`,
      `tipo: ${tipo}`,
      `data: ${date}`,
      `pessoa: ${slug}`,
      `saude: ${indicador_saude}`,
      `---`,
      ``,
      `# ${tipoLabel(tipo)} — ${slug} · ${date}`,
      ``,
      `## Resumo`,
      resumo,
      ``,
    ]

    if (acoes_comprometidas.length > 0) {
      lines.push(`## Ações Comprometidas`)
      acoes_comprometidas.forEach((a) => lines.push(`- [ ] ${a}`))
      lines.push(``)
    }

    if (pontos_de_atencao.length > 0) {
      lines.push(`## Pontos de Atenção`)
      pontos_de_atencao.forEach((p) => lines.push(`- ${p}`))
      lines.push(``)
    }

    if (elogios_e_conquistas.length > 0) {
      lines.push(`## Elogios e Conquistas`)
      elogios_e_conquistas.forEach((e) => lines.push(`- ${e}`))
      lines.push(``)
    }

    if (temas_detectados.length > 0) {
      lines.push(`## Temas`)
      temas_detectados.forEach((t) => lines.push(`- ${t}`))
      lines.push(``)
    }

    if (motivo_indicador) {
      lines.push(`## Indicador de Saúde`)
      lines.push(`**${indicador_saude}** — ${motivo_indicador}`)
      lines.push(``)
    }

    lines.push(`---`)
    lines.push(``)
    lines.push(`## Conteúdo Original`)
    lines.push(``)
    lines.push(rawContent.trim())

    writeFileSync(dest, lines.join('\n'), 'utf-8')
    return fileName
  }

  /**
   * Updates perfil.md for the given slug using the AI analysis result.
   * Atomic write: writes to perfil.md.tmp then renames.
   */
  updatePerfil(slug: string, result: IngestionAIResult, artifactFileName: string): void {
    const perfilPath = join(this.pessoasDir, slug, 'perfil.md')
    const tmpPath    = perfilPath + '.tmp'
    const bakPath    = perfilPath + '.bak'

    // Backup existing
    if (existsSync(perfilPath)) copyFileSync(perfilPath, bakPath)

    const existing = existsSync(perfilPath) ? readFileSync(perfilPath, 'utf-8') : null
    const now = new Date().toISOString()
    const today = now.slice(0, 10)

    let updated: string

    if (!existing) {
      updated = this.createPerfil(slug, result, artifactFileName, now, today)
    } else {
      updated = this.updateExistingPerfil(existing, result, artifactFileName, now, today)
    }

    writeFileSync(tmpPath, updated, 'utf-8')
    renameSync(tmpPath, perfilPath)
  }

  // ── Private helpers ───────────────────────────────────────────

  private createPerfil(
    slug: string,
    result: IngestionAIResult,
    artifactFileName: string,
    now: string,
    today: string,
  ): string {
    const acoesLines   = result.acoes_comprometidas.map((a) => `- [ ] ${a}`).join('\n') || '- [ ] (sem ações comprometidas)'
    const atencaoLines = result.pontos_de_atencao.map((p) => `- **${today}:** ${p}`).join('\n') || ''
    const elogioLines  = result.elogios_e_conquistas.map((e) => `- **${today}:** ${e}`).join('\n') || ''
    const temasLines   = result.temas_atualizados.map((t) => `- ${t}`).join('\n') || ''

    // Count pending actions
    const pendingCount = result.acoes_comprometidas.length

    return `---
slug: "${slug}"
schema_version: 1
ultima_atualizacao: "${now}"
total_artefatos: 1
ultimo_1on1: ${result.tipo === '1on1' ? `"${result.data_artefato}"` : 'null'}
acoes_pendentes_count: ${pendingCount}
alertas_ativos: []
saude: "${result.indicador_saude}"
---

# Perfil Vivo — ${slug}

## Resumo Evolutivo
${SECTION.resumo.open}
${result.resumo_evolutivo}
${SECTION.resumo.close}

## Ações Pendentes
${SECTION.acoes.open}
${acoesLines}
${SECTION.acoes.close}

## Pontos de Atenção Ativos
${SECTION.atencao.open}
${atencaoLines}
${SECTION.atencao.close}

## Conquistas e Elogios
${SECTION.conquistas.open}
${elogioLines}
${SECTION.conquistas.close}

## Temas Recorrentes
${SECTION.temas.open}
${temasLines}
${SECTION.temas.close}

## Histórico de Artefatos
${SECTION.historico.open}
- ${result.data_artefato} | ${result.tipo} | [${artifactFileName}](../historico/${artifactFileName})
${SECTION.historico.close}
`
  }

  private updateExistingPerfil(
    existing: string,
    result: IngestionAIResult,
    artifactFileName: string,
    now: string,
    today: string,
  ): string {
    // 1. Update frontmatter
    let updated = this.updateFrontmatter(existing, result, now)

    // 2. Replace Resumo Evolutivo (full replace)
    updated = this.replaceBlock(updated, 'resumo_evolutivo', result.resumo_evolutivo)

    // 3. Append Ações Pendentes
    if (result.acoes_comprometidas.length > 0) {
      const newLines = result.acoes_comprometidas.map((a) => `- [ ] ${a}`).join('\n')
      updated = this.appendToBlock(updated, 'acoes', newLines)
    }

    // 4. Append Pontos de Atenção
    if (result.pontos_de_atencao.length > 0) {
      const newLines = result.pontos_de_atencao.map((p) => `- **${today}:** ${p}`).join('\n')
      updated = this.appendToBlock(updated, 'atencao', newLines)
    }

    // 5. Append Conquistas e Elogios
    if (result.elogios_e_conquistas.length > 0) {
      const newLines = result.elogios_e_conquistas.map((e) => `- **${today}:** ${e}`).join('\n')
      updated = this.appendToBlock(updated, 'conquistas', newLines)
    }

    // 6. Replace Temas Recorrentes (deduped list)
    const temasLines = result.temas_atualizados.map((t) => `- ${t}`).join('\n')
    updated = this.replaceBlock(updated, 'temas', temasLines)

    // 7. Append Histórico de Artefatos
    const histLine = `- ${result.data_artefato} | ${result.tipo} | [${artifactFileName}](../historico/${artifactFileName})`
    updated = this.appendToBlock(updated, 'historico', histLine)

    return updated
  }

  private updateFrontmatter(content: string, result: IngestionAIResult, now: string): string {
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
    if (!fmMatch) return content

    let fm = fmMatch[1]

    // ultima_atualizacao
    fm = fm.replace(/ultima_atualizacao:.*/, `ultima_atualizacao: "${now}"`)

    // total_artefatos: increment
    fm = fm.replace(/total_artefatos:\s*(\d+)/, (_, n) => `total_artefatos: ${parseInt(n) + 1}`)

    // ultimo_1on1: only update if this artifact is a 1on1
    if (result.tipo === '1on1') {
      fm = fm.replace(/ultimo_1on1:.*/, `ultimo_1on1: "${result.data_artefato}"`)
    }

    // saude
    fm = fm.replace(/saude:.*/, `saude: "${result.indicador_saude}"`)

    // acoes_pendentes_count: recalculate from block
    const acoesBlock = this.extractBlock(content, 'acoes')
    const pending = (acoesBlock.match(/- \[ \]/g) || []).length + result.acoes_comprometidas.length
    fm = fm.replace(/acoes_pendentes_count:\s*\d+/, `acoes_pendentes_count: ${pending}`)

    return content.replace(/^---\n[\s\S]*?\n---/, `---\n${fm}\n---`)
  }

  private replaceBlock(content: string, blockKey: keyof typeof SECTION, newBody: string): string {
    const { open, close } = SECTION[blockKey]
    const escaped = {
      open:  open.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      close: close.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    }

    const re = new RegExp(`(${escaped.open}\n)[\\s\\S]*?(\n${escaped.close})`)
    if (re.test(content)) {
      return content.replace(re, `$1${newBody}$2`)
    }
    return content
  }

  private appendToBlock(content: string, blockKey: keyof typeof SECTION, newLines: string): string {
    const { close } = SECTION[blockKey]
    const escapedClose = close.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`(\n${escapedClose})`)
    if (re.test(content)) {
      return content.replace(re, `\n${newLines}$1`)
    }
    return content
  }

  private extractBlock(content: string, blockKey: keyof typeof SECTION): string {
    const { open, close } = SECTION[blockKey]
    const escaped = {
      open:  open.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      close: close.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    }
    const re = new RegExp(`${escaped.open}\n([\\s\\S]*?)\n${escaped.close}`)
    const m = content.match(re)
    return m ? m[1] : ''
  }
}

function tipoLabel(tipo: string): string {
  const map: Record<string, string> = {
    '1on1':     '1:1',
    'reuniao':  'Reunião',
    'daily':    'Daily',
    'planning': 'Planning',
    'retro':    'Retro',
    'feedback': 'Feedback',
    'outro':    'Artefato',
  }
  return map[tipo] ?? tipo
}
