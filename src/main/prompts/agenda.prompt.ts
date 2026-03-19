export interface AgendaPromptParams {
  configYaml:        string
  perfilMd:          string
  today:             string
  pautasAnteriores?: Array<{ date: string; content: string }>
}

export function buildAgendaPrompt(params: AgendaPromptParams): string {
  const { configYaml, perfilMd, today, pautasAnteriores = [] } = params

  const pautasSection = pautasAnteriores.length > 0
    ? `\n## Histórico de pautas anteriores\n${pautasAnteriores.map(p => `### Pauta de ${p.date}\n${p.content}`).join('\n\n')}\n`
    : ''

  return `Você é o assistente de um gestor de tecnologia. Gere uma pauta estruturada para o próximo 1:1.

Data atual: ${today}

## Configuração da pessoa
\`\`\`yaml
${configYaml}
\`\`\`

## Perfil vivo atual
${perfilMd}
${pautasSection}
## Sua tarefa

Com base no perfil acumulado${pautasAnteriores.length > 0 ? ', no histórico de pautas anteriores' : ''} e nas boas práticas de gestão, gere uma pauta completa e estruturada para o próximo 1:1. Retorne APENAS um JSON válido (sem texto antes ou depois):

{
  "follow_ups": ["string"],
  "temas": ["string"],
  "perguntas_sugeridas": ["string"],
  "alertas": ["string"],
  "reconhecimentos": ["string"]
}

Regras:
- "follow_ups": ações em aberto e acordos das pautas anteriores que precisam de acompanhamento. Seja específico e mencione o contexto.
- "temas": assuntos recorrentes, pontos de atenção ou evolução de carreira que merecem discussão aprofundada. Priorize pelo impacto.
- "perguntas_sugeridas": 4 a 6 perguntas abertas, específicas e contextualizadas para esta pessoa. Inclua perguntas sobre bem-estar, desafios técnicos, relacionamentos com o time e desenvolvimento profissional. NUNCA use perguntas genéricas — baseie-se no perfil real.
- "alertas": pontos críticos que o gestor DEVE abordar (bloqueios, conflitos, risco de desengajamento, deadlines críticos). Array vazio se não houver urgências.
- "reconhecimentos": conquistas e elogios recentes que merecem ser reconhecidos explicitamente na conversa. Reconhecimento público fortalece o vínculo. Array vazio se não houver.`
}

export interface AgendaAIResult {
  follow_ups:          string[]
  temas:               string[]
  perguntas_sugeridas: string[]
  alertas:             string[]
  reconhecimentos:     string[]
}

export function renderAgendaMarkdown(nome: string, date: string, result: AgendaAIResult): string {
  const lines: string[] = [
    `# Pauta 1:1 — ${nome}`,
    ``,
    `**Data:** ${date}`,
    ``,
  ]

  if (result.alertas.length > 0) {
    lines.push(`## ⚠️ Alertas`)
    result.alertas.forEach(a => lines.push(`- ${a}`))
    lines.push(``)
  }

  if (result.reconhecimentos && result.reconhecimentos.length > 0) {
    lines.push(`## Reconhecimentos`)
    result.reconhecimentos.forEach(r => lines.push(`- ${r}`))
    lines.push(``)
  }

  if (result.follow_ups.length > 0) {
    lines.push(`## Follow-ups`)
    result.follow_ups.forEach(f => lines.push(`- [ ] ${f}`))
    lines.push(``)
  }

  if (result.temas.length > 0) {
    lines.push(`## Temas`)
    result.temas.forEach(t => lines.push(`- ${t}`))
    lines.push(``)
  }

  if (result.perguntas_sugeridas.length > 0) {
    lines.push(`## Perguntas sugeridas`)
    result.perguntas_sugeridas.forEach(p => lines.push(`- ${p}`))
    lines.push(``)
  }

  return lines.join('\n')
}
