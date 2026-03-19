import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Gera slug kebab-case a partir do nome */
export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Formata data ISO (YYYY-MM-DD) para dd/mm/yyyy */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const parts = iso.split('-')
  if (parts.length !== 3) return iso
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

/** Formata data ISO para exibição */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/** Dias desde uma data ISO */
export function daysSince(iso: string): number {
  const diff = Date.now() - new Date(iso).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

/** Nível legível */
export function labelNivel(v: string): string {
  return ({ junior: 'Junior', pleno: 'Pleno', senior: 'Sênior', staff: 'Staff', principal: 'Principal', manager: 'Gerente' } as Record<string, string>)[v] ?? capitalize(v)
}

/** Relação legível */
export function labelRelacao(v: string): string {
  return ({ liderado: 'Liderado', par: 'Par', gestor: 'Gestor', stakeholder: 'Stakeholder' } as Record<string, string>)[v] ?? capitalize(v)
}

/** Saúde legível */
export function labelSaude(v: string): string {
  return ({ verde: 'Verde', amarelo: 'Amarelo', vermelho: 'Vermelho' } as Record<string, string>)[v] ?? capitalize(v)
}

/** Tipo de artefato legível */
export function labelTipo(v: string): string {
  return ({ '1on1': '1:1', reuniao: 'Reunião', daily: 'Daily', planning: 'Planning', retro: 'Retro', feedback: 'Feedback', outro: 'Outro' } as Record<string, string>)[v] ?? capitalize(v)
}

function capitalize(v: string): string {
  return v ? v.charAt(0).toUpperCase() + v.slice(1) : v
}
