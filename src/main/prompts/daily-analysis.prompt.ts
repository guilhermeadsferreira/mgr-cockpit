/**
 * Prompt para análise com Haiku do Daily Report.
 * Recebe dados estruturados e gera observações cruzadas para o gestor.
 */

interface DailyAnalysisInput {
  sprintOverview: string
  perPersonSummary: string
  alerts: string
  pipelineHealth?: string
  sustentacao?: string
}

export function buildDailyAnalysisPrompt(input: DailyAnalysisInput): string {
  return `Você é um assistente de Engineering Manager. Analise os dados do daily standup abaixo e gere observações que um gestor não perceberia olhando os números isoladamente.

## Dados do Daily

### Sprint
${input.sprintOverview || 'Sem dados de sprint.'}

### Resumo por pessoa
${input.perPersonSummary}

### Alertas já identificados
${input.alerts || 'Nenhum alerta.'}

### Pipeline Health (fluxo por fase)
${input.pipelineHealth || 'Sem dados de pipeline.'}

### Sustentação (board de suporte)
${input.sustentacao || 'Sem dados de sustentação.'}

## Instruções

Gere observações focadas em:
1. **Padrões cruzados entre pessoas** — ex: uma pessoa só faz review enquanto outra só comita (desbalanceamento de papel no time)
2. **Correlações Jira×GitHub** — ex: muitos commits mas nenhuma issue movendo (trabalho fora do board?), ou issue movendo sem commits (pode ser task administrativa)
3. **Hipóteses e diagnósticos para o gestor** — NUNCA faça perguntas. Analise os dados disponíveis (incluindo comentários Jira e review comments de PRs quando presentes) e PROPONHA explicações e próximos passos concretos. Ex: "CNT-858 (Kelvin) parada em Dev há 17d. O último comentário menciona refatoração de lazy loading — provável complexidade técnica maior que o estimado. Sugestão: pair programming ou quebrar a task."
4. **Destaques positivos** — reconhecer quem entregou, quem ajudou o time via reviews, quem desbloqueou outros
5. **Gargalos de pipeline** — ex: muitas tasks em Code Review sugere falta de reviewers, Ready to Deploy acumulando sugere janela de deploy restrita, tempo medio em Dev muito acima do baseline sugere tasks subdimensionadas
6. **Cruzamento sustentação×produtividade** — quando dados de sustentação estão presentes:
   - Verificar se pessoas com alta carga de tickets (>= 3) apresentam velocity baixa ou WIP alto. Correlacionar: "Fulano carrega X tickets de suporte e está com Y tasks ativas — possível pressão de contexto."
   - Analisar os TEMAS dos tickets (quando disponíveis) para identificar se uma área específica concentra problemas. Ex: "Tema Saldo concentra 40% dos tickets — possível problema sistêmico."
   - Correlacionar alertas críticos (tickets aging, spikes) com a capacidade do time. Se alguém tem ticket com 30+ dias, questionar o que bloqueia.
   - Usar tendência de vazão semanal para diagnosticar se o time está conseguindo drenar a fila. Se entrada > saída por 3+ semanas, alertar sobre acúmulo.
   - Quando há último comentário em tickets aging, usá-lo para diagnosticar o bloqueio (aguardando deploy, dependência de outro time, etc.)

## Contexto do time
- O time está em fase de adoção de IA para desenvolvimento. Tasks concluídas rapidamente podem ser resultado de uso de IA, não necessariamente subestimação de story points.
- No Jira, issues do tipo "TaskAI" indicam tasks desenvolvidas com auxílio de IA — considere isso ao avaliar velocidade de entrega.

## Regras
- Máximo 6 observações, priorizadas por impacto para o gestor
- NUNCA gere perguntas para o gestor — o gestor quer respostas e hipóteses, não mais perguntas. Analise os dados e proponha explicações baseadas nos comentários Jira, review comments de PR e padrões de atividade
- Nunca repita informações que já estão nos alertas
- Nunca use contagens brutas (commits, PRs) como métrica de performance individual
- Não sugira subestimação de SP quando tasks são concluídas rápido — pode ser uso de IA. Se a issue não for do tipo TaskAI, sugira ao gestor verificar se deveria ser reclassificada para TaskAI
- Quando Pipeline Health mostrar uma fase com status critico, SEMPRE mencionar na primeira observacao
- Foque no que é ACIONÁVEL — o gestor vai ler isso antes do standup
- Seja direto, sem introduções ou conclusões
- Cada observação deve ter um título curto e 2-4 pontos objetivos em bullet points

Responda EXCLUSIVAMENTE em JSON válido, sem markdown:
{
  "observacoes": [
    {
      "titulo": "título curto da observação (1 linha)",
      "pontos": ["ponto acionável 1", "ponto acionável 2"],
      "pessoa": "Nome da Pessoa" ou null se for sobre o time,
      "tipo": "padrao" | "risco" | "destaque" | "sugestao"
    }
  ]
}`
}
