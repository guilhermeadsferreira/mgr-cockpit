import { describe, expect, it } from 'vitest'
import { migrateProfileContent, validateProfileStructure, CURRENT_SCHEMA_VERSION } from './ProfileMigration'

const MINIMAL_V6_PROFILE = `---
slug: maria-silva
schema_version: ${CURRENT_SCHEMA_VERSION}
ultima_atualizacao: "2026-04-01T10:00:00.000Z"
ultima_ingestao: "2026-04-01"
total_artefatos: 5
saude: "verde"
tendencia_emocional: estavel
nota_tendencia: null
ultimo_followup_acoes: null
---

## Resumo Evolutivo
<!-- BLOCO GERENCIADO PELA IA — reescrito a cada ingestão -->
Maria está se desenvolvendo bem.
<!-- FIM BLOCO RESUMO -->

## Ações Pendentes
<!-- BLOCO GERENCIADO PELA IA — append de novos itens -->
<!-- FIM BLOCO ACOES -->

## Pontos de Atenção Ativos
<!-- BLOCO GERENCIADO PELA IA — append apenas -->
<!-- FIM BLOCO ATENCAO -->

## Conquistas e Elogios
<!-- BLOCO GERENCIADO PELA IA — append apenas (conquistas) -->
<!-- FIM BLOCO CONQUISTAS -->

## Temas Recorrentes
<!-- BLOCO GERENCIADO PELA IA — lista deduplicada, substituída a cada ingestão -->
<!-- FIM BLOCO TEMAS -->

## Histórico de Artefatos
<!-- BLOCO GERENCIADO PELA IA — append apenas, nunca reescrito -->
- 2026-04-01 | 1on1 | [2026-04-01-maria-silva.md](../historico/2026-04-01-maria-silva.md)
<!-- FIM BLOCO HISTORICO -->

## Histórico de Saúde
<!-- BLOCO GERENCIADO PELA IA — append apenas (histórico de saúde) -->
- 2026-04-01 | verde | Engajada e produtiva
<!-- FIM BLOCO SAUDE -->

## Insights de 1:1
<!-- BLOCO GERENCIADO PELA IA — append apenas (insights 1on1) -->
<!-- FIM BLOCO INSIGHTS_1ON1 -->

## Sinais de Terceiros
<!-- BLOCO GERENCIADO PELA IA — append apenas (sinais terceiros) -->
<!-- FIM BLOCO SINAIS_TERCEIROS -->
`

describe('validateProfileStructure', () => {
  it('valida perfil v6 completo', () => {
    const result = validateProfileStructure(MINIMAL_V6_PROFILE)
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('rejeita conteúdo sem frontmatter', () => {
    const result = validateProfileStructure('# Sem frontmatter\nConteúdo qualquer')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('frontmatter ausente ou malformado')
  })

  it('detecta slug ausente', () => {
    const noSlug = MINIMAL_V6_PROFILE.replace('slug: maria-silva\n', '')
    const result = validateProfileStructure(noSlug)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('campo slug ausente no frontmatter')
  })

  it('detecta seção HISTORICO ausente', () => {
    const noHistorico = MINIMAL_V6_PROFILE.replace('<!-- FIM BLOCO HISTORICO -->', '')
    const result = validateProfileStructure(noHistorico)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('seção obrigatória ausente: FIM BLOCO HISTORICO')
  })
})

describe('migrateProfileContent', () => {
  it('não altera perfil já na versão atual', () => {
    const result = migrateProfileContent(MINIMAL_V6_PROFILE)
    expect(result).toBe(MINIMAL_V6_PROFILE)
  })

  it('migra v4 → v6 adicionando campos e seções', () => {
    const v4Profile = `---
slug: joao-silva
schema_version: 4
ultima_atualizacao: "2026-01-01"
saude: "verde"
---

## Resumo Evolutivo
<!-- BLOCO GERENCIADO PELA IA — reescrito a cada ingestão -->
João está bem.
<!-- FIM BLOCO RESUMO -->

## Histórico de Artefatos
<!-- BLOCO GERENCIADO PELA IA — append apenas, nunca reescrito -->
- 2026-01-01 | 1on1
<!-- FIM BLOCO HISTORICO -->
`
    const result = migrateProfileContent(v4Profile)
    expect(result).toContain(`schema_version: ${CURRENT_SCHEMA_VERSION}`)
    expect(result).toContain('tendencia_emocional:')
    expect(result).toContain('## Insights de 1:1')
    expect(result).toContain('## Sinais de Terceiros')
    expect(result).toContain('## Histórico de Saúde')
  })

  it('preserva conteúdo original se migração produz resultado inválido', () => {
    // Simula um perfil com frontmatter mas sem nenhuma seção obrigatória
    // A migração vai tentar adicionar campos mas o resultado ainda não terá HISTORICO
    const brokenProfile = `---
slug: broken
schema_version: 1
---

Texto sem seções.
`
    const result = migrateProfileContent(brokenProfile)
    // Should return original because post-validation fails (no FIM BLOCO HISTORICO)
    expect(result).toBe(brokenProfile)
  })

  it('migra v1 → v6 removendo acoes_pendentes_count', () => {
    const v1Profile = `---
slug: ana-costa
schema_version: 1
acoes_pendentes_count: 3
saude: "amarelo"
---

## Resumo Evolutivo
<!-- BLOCO GERENCIADO PELA IA — reescrito a cada ingestão -->
Ana está com dificuldades.
<!-- FIM BLOCO RESUMO -->

## Histórico de Artefatos
<!-- BLOCO GERENCIADO PELA IA — append apenas, nunca reescrito -->
<!-- FIM BLOCO HISTORICO -->
`
    const result = migrateProfileContent(v1Profile)
    expect(result).not.toContain('acoes_pendentes_count')
    expect(result).toContain(`schema_version: ${CURRENT_SCHEMA_VERSION}`)
  })
})
