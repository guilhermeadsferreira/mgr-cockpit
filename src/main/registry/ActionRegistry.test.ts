import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { mkdirSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { ActionRegistry } from './ActionRegistry'

const TEST_WORKSPACE = join(__dirname, '__test_workspace__')
const SLUG = 'maria-silva'

function ensurePersonDir() {
  const dir = join(TEST_WORKSPACE, 'pessoas', SLUG)
  mkdirSync(dir, { recursive: true })
}

beforeEach(() => {
  ensurePersonDir()
})

afterEach(() => {
  if (existsSync(TEST_WORKSPACE)) {
    rmSync(TEST_WORKSPACE, { recursive: true })
  }
})

describe('ActionRegistry', () => {
  it('list retorna array vazio quando não existe actions.yaml', () => {
    const reg = new ActionRegistry(TEST_WORKSPACE)
    expect(reg.list(SLUG)).toEqual([])
  })

  it('save + list persiste ação corretamente', () => {
    const reg = new ActionRegistry(TEST_WORKSPACE)
    reg.save({
      id: 'test-001',
      personSlug: SLUG,
      texto: 'Maria: implementar auth até 2026-04-15',
      descricao: 'Implementar auth',
      owner: 'liderado',
      status: 'open',
      criadoEm: '2026-04-01',
      fonteArtefato: '2026-04-01-maria.md',
      statusHistory: [],
    })

    const actions = reg.list(SLUG)
    expect(actions).toHaveLength(1)
    expect(actions[0].id).toBe('test-001')
    expect(actions[0].descricao).toBe('Implementar auth')
  })

  it('save atualiza ação existente por ID', () => {
    const reg = new ActionRegistry(TEST_WORKSPACE)
    const action = {
      id: 'test-002',
      personSlug: SLUG,
      texto: 'Maria: revisar docs',
      descricao: 'Revisar docs',
      owner: 'liderado' as const,
      status: 'open' as const,
      criadoEm: '2026-04-01',
      statusHistory: [],
    }
    reg.save(action)
    reg.save({ ...action, status: 'done' })

    const actions = reg.list(SLUG)
    expect(actions).toHaveLength(1)
    expect(actions[0].status).toBe('done')
  })

  it('delete remove ação por ID', () => {
    const reg = new ActionRegistry(TEST_WORKSPACE)
    reg.save({
      id: 'test-003',
      personSlug: SLUG,
      texto: 'Ação a remover',
      descricao: 'Ação a remover',
      owner: 'gestor',
      status: 'open',
      criadoEm: '2026-04-01',
      statusHistory: [],
    })
    expect(reg.list(SLUG)).toHaveLength(1)

    reg.delete(SLUG, 'test-003')
    expect(reg.list(SLUG)).toHaveLength(0)
  })

  it('updateStatus muda status e adiciona ao audit trail', () => {
    const reg = new ActionRegistry(TEST_WORKSPACE)
    reg.save({
      id: 'test-004',
      personSlug: SLUG,
      texto: 'Ação para fechar',
      descricao: 'Ação para fechar',
      owner: 'liderado',
      status: 'open',
      criadoEm: '2026-04-01',
      statusHistory: [],
    })

    reg.updateStatus(SLUG, 'test-004', 'done')

    const actions = reg.list(SLUG)
    expect(actions[0].status).toBe('done')
    expect(actions[0].concluidoEm).toBeTruthy()
    expect(actions[0].statusHistory).toHaveLength(1)
    expect(actions[0].statusHistory![0].status).toBe('done')
    expect(actions[0].statusHistory![0].source).toBe('manual')
  })

  it('list deduplicata ações com mesmo ID', () => {
    const reg = new ActionRegistry(TEST_WORKSPACE)
    const action = {
      id: 'dup-001',
      personSlug: SLUG,
      texto: 'Ação duplicada',
      descricao: 'Ação duplicada',
      owner: 'liderado' as const,
      status: 'open' as const,
      criadoEm: '2026-04-01',
      statusHistory: [],
    }
    // Save twice to simulate dedup scenario
    reg.save(action)
    reg.save({ ...action, id: 'dup-002' })
    reg.save({ ...action, id: 'dup-001' }) // same ID, should update not duplicate

    const actions = reg.list(SLUG)
    expect(actions).toHaveLength(2)
    expect(actions.filter(a => a.id === 'dup-001')).toHaveLength(1)
  })

  it('getOpenByOwner filtra por owner', () => {
    const reg = new ActionRegistry(TEST_WORKSPACE)
    reg.save({ id: 'g-001', personSlug: SLUG, texto: 'Gestor', descricao: 'Gestor', owner: 'gestor', status: 'open', criadoEm: '2026-04-01', statusHistory: [] })
    reg.save({ id: 'l-001', personSlug: SLUG, texto: 'Liderado', descricao: 'Liderado', owner: 'liderado', status: 'open', criadoEm: '2026-04-01', statusHistory: [] })
    reg.save({ id: 'l-002', personSlug: SLUG, texto: 'Liderado done', descricao: 'Liderado done', owner: 'liderado', status: 'done', criadoEm: '2026-04-01', statusHistory: [] })

    expect(reg.getOpenByOwner(SLUG, 'gestor')).toHaveLength(1)
    expect(reg.getOpenByOwner(SLUG, 'liderado')).toHaveLength(1)
    expect(reg.getOpenByOwner(SLUG)).toHaveLength(2) // all open
  })

  it('getEscalations detecta ações do gestor pendentes > threshold', () => {
    const reg = new ActionRegistry(TEST_WORKSPACE)
    const oldDate = new Date(Date.now() - 20 * 86_400_000).toISOString().slice(0, 10)
    reg.save({
      id: 'esc-001',
      personSlug: SLUG,
      texto: 'Gestor: agendar feedback',
      descricao: 'Agendar feedback',
      owner: 'gestor',
      status: 'open',
      criadoEm: oldDate,
      fonteArtefato: 'source.md',
      statusHistory: [],
    })

    const escalations = reg.getEscalations(SLUG, 14)
    expect(escalations).toHaveLength(1)
    expect(escalations[0].diasPendente).toBeGreaterThanOrEqual(14)
  })
})
