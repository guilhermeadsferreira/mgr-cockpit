/**
 * Prompt para análise com IA do Board de Sustentação.
 * Recebe um snapshot do board e gera insights acionáveis para o gestor.
 */

import type { SupportBoardSnapshot } from '../../renderer/src/types/ipc'

export function buildSustentacaoPrompt(snapshot: SupportBoardSnapshot): string {
  const ticketsStr = snapshot.ticketsEmBreach.map((t) => {
    const comments =
      t.recentComments.length > 0
        ? t.recentComments.map((c) => `    - [${c.author}]: ${c.body.slice(0, 200)}`).join('\n')
        : '    (sem comentários)'

    return `- ${t.key}: ${t.summary}
  Tipo: ${t.type} | Assignee: ${t.assignee ?? 'sem assignee'} | Idade: ${t.ageDias}d | Status: ${t.status}
  Comentários recentes:
${comments}`
  }).join('\n\n')

  const tiposStr = snapshot.topTipos.map((t) => `${t.tipo}: ${t.count}`).join(', ')

  const temasStr = (snapshot.topTemas ?? []).length > 0
    ? snapshot.topTemas!.map((t) => `${t.tema}: ${t.count} (ex: ${t.exemplos.join(', ')})`).join('\n')
    : ''

  const alertasStr = (snapshot.alertas ?? []).length > 0
    ? snapshot.alertas.map((a) => {
        if (a.summary) {
          const commentNote = a.lastComment ? ` | Último comentário: "${a.lastComment.body.slice(0, 150)}" (${a.lastComment.author})` : ''
          return `- [${a.severidade.toUpperCase()}] ${a.ticketKey}: ${a.summary} (${a.status ?? '?'}, ${a.assignee ?? 'sem assignee'})${commentNote}`
        }
        return `- [${a.severidade.toUpperCase()}] ${a.mensagem}`
      }).join('\n')
    : '(nenhum alerta)'

  const inOutStr = (snapshot.inOutSemanal ?? []).length > 0
    ? snapshot.inOutSemanal.slice(-4).map((e) => `Sem ${e.semana}: entrada=${e.in}, saída=${e.out}, saldo=${e.in - e.out > 0 ? '+' : ''}${e.in - e.out}`).join('\n')
    : '(sem dados)'

  return `Você é um analista de engenharia de software. Analise os tickets de sustentação abaixo e gere insights acionáveis para o gestor.

## Contexto do Board de Sustentação

- Tickets abertos: ${snapshot.ticketsAbertos}
- Fechados nos últimos 30 dias: ${snapshot.ticketsFechadosUltimos30d}
- Distribuição por tipo Jira: ${tiposStr}
${temasStr ? `\n### Temas detectados (por análise de sumários)\n${temasStr}\n` : ''}
### Alertas ativos (${snapshot.alertas?.length ?? 0})
${alertasStr}

### Vazão semanal (últimas 4 semanas)
${inOutStr}

### Tickets em breach de SLA (${snapshot.ticketsEmBreach.length} total)

${ticketsStr || '(nenhum ticket em breach)'}

## Instruções

Gere uma análise estruturada com as seguintes seções:

### Padrões Recorrentes
Liste os 2-4 TEMAS de problema mais frequentes (use os temas detectados acima, não tipos Jira genéricos como "Task" ou "Bug"). Para cada um: tema + frequência + impacto + tendência (crescendo, estável, reduzindo) quando possível inferir da vazão.

### Oportunidades de Automação
Liste 2-3 categorias de tickets que poderiam ser resolvidas sem intervenção humana, com sugestão concreta de automação (ex: "tickets de reset de senha → self-service portal").

### Causa Raiz Provável
Para os temas mais frequentes, identifique a causa raiz técnica ou de processo mais provável com base nos títulos, comentários e alertas ativos.

### Tendência do Backlog
Analise a vazão semanal e diagnostique se o backlog está crescendo, estável ou diminuindo. Identifique semanas atípicas e possíveis causas.

### Sugestões de Redução de SLA
Liste 2-3 mudanças concretas de processo ou triagem que poderiam reduzir o tempo de resolução, priorizando os temas com mais tickets aging.

Seja direto e específico. Evite generalidades. Baseie-se apenas nos dados fornecidos.`
}
