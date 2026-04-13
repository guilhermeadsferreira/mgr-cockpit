import type { NivelConfianca } from './constants'
import { TEMAS_TAXONOMY_TEXTO } from './constants'

export interface SinalTerceiroPromptParams {
  pessoaNome: string           // liderado sendo analisado
  pessoaCargo: string          // cargo do liderado
  perfilMdRaw: string | null   // perfil atual do liderado (contexto histórico)
  fonteNome: string            // quem reportou (ex: "Rômulo")
  fonteRelacao: string         // "par" | "gestor" | "stakeholder"
  artifactContent: string      // conteudo da reuniao
  artifactData: string         // YYYY-MM-DD
  contextoMencao: string       // contexto extraido no Pass 1
  today: string
}

export type SinalTerceiroCategoria = 'feedback' | 'concern' | 'elogio' | 'decisao' | 'contexto'

export interface SinalTerceiroResult {
  relevante: boolean
  resumo_sinal: string
  categoria: SinalTerceiroCategoria
  temas: string[]
  impacto_potencial: string | null
  sugestao_devolutiva: string | null
  confianca: NivelConfianca
}

export function buildSinalTerceiroPrompt(params: SinalTerceiroPromptParams): string {
  const {
    pessoaNome, pessoaCargo, perfilMdRaw, fonteNome, fonteRelacao,
    artifactContent, artifactData, contextoMencao, today,
  } = params

  return `Voce e o assistente de um gestor de tecnologia. Sua tarefa e analisar o que foi REPORTADO sobre um liderado por um terceiro (${fonteRelacao}) durante uma reuniao.

IMPORTANTE: Isto NAO e observacao direta do gestor — e um relato de terceiro. Calibre a confianca de acordo.

Data atual: ${today}
Data da reuniao: ${artifactData}
Pessoa analisada: ${pessoaNome} (${pessoaCargo})
Fonte do relato: ${fonteNome} (${fonteRelacao})

## Contexto extraido da reuniao sobre ${pessoaNome}
<contexto_mencao>
${contextoMencao}
</contexto_mencao>

## Conteudo completo da reuniao (para contexto adicional)
<reuniao>
${artifactContent}
</reuniao>

${perfilMdRaw ? `## Perfil historico de ${pessoaNome} (para calibrar se este sinal confirma, contradiz ou adiciona informacao nova)\n<perfil>\n${perfilMdRaw}\n</perfil>` : `Nenhum perfil historico disponivel para ${pessoaNome}. Este e o primeiro sinal.`}

## Sua tarefa

Analise o que foi reportado sobre ${pessoaNome} por ${fonteNome} e retorne APENAS um JSON valido (sem texto antes ou depois) com a estrutura abaixo.

Regras obrigatorias:
- "relevante": boolean. Se a mencao foi superficial ou tangencial ("falamos do ${pessoaNome} rapidamente", apenas citou o nome sem contexto acionavel), retorne false. Se ha informacao substantiva sobre comportamento, desempenho, skills ou situacao da pessoa, retorne true.
- Se "relevante" for false: os demais campos podem ser strings vazias ou null. Retorne o JSON minimo.
- Se "relevante" for true:
  - "resumo_sinal": 2-3 frases descrevendo o que foi reportado sobre ${pessoaNome}. Escreva em portugues brasileiro correto e profissional. Nao copie texto garbled da transcricao.
  - "categoria": uma de "feedback" (avaliacao de desempenho/comportamento), "concern" (preocupacao/risco), "elogio" (reconhecimento positivo), "decisao" (decisao que afeta a pessoa) ou "contexto" (informacao de contexto sem julgamento).
  - "temas": array de temas relacionados. ${TEMAS_TAXONOMY_TEXTO}
  - "impacto_potencial": 1 frase sobre algo acionavel que o gestor pode fazer com essa informacao, ou null se nao ha acao clara.
  - "sugestao_devolutiva": uma frase que o gestor pode usar no proximo 1:1 com ${pessoaNome} para dar a devolutiva de forma natural (ex: "O ${fonteNome} mencionou que... o que voce acha?"). Null se a informacao nao merece devolutiva direta.
  - "confianca": "media" por padrao (relato de terceiro). "alta" APENAS se houver dados concretos (metricas, exemplos especificos, fatos verificaveis). "baixa" se o relato e vago, de segunda mao, ou opinativo sem evidencia.

JSON esperado:
{
  "relevante": true,
  "resumo_sinal": "string",
  "categoria": "feedback|concern|elogio|decisao|contexto",
  "temas": ["string"],
  "impacto_potencial": "string ou null",
  "sugestao_devolutiva": "string ou null",
  "confianca": "alta|media|baixa"
}`
}
