export interface IngestionPromptParams {
  teamRegistry: string         // serializeForPrompt() output
  perfilMdRaw: string | null   // current perfil.md content or null if first ingestion
  artifactContent: string      // file content (possibly truncated)
  today: string                // ISO date YYYY-MM-DD
}

export function buildIngestionPrompt(params: IngestionPromptParams): string {
  const { teamRegistry, perfilMdRaw, artifactContent, today } = params

  return `Você é o assistente de um gestor de tecnologia analisando artefatos de reuniões e interações com seu time.

Data atual: ${today}

## Time do gestor
${teamRegistry}

## Perfil atual da pessoa (perfil.md)
${perfilMdRaw
  ? `<perfil_atual>\n${perfilMdRaw}\n</perfil_atual>`
  : 'Nenhum perfil ainda. Esta é a primeira ingestão.'}

## Artefato a processar
<artefato>
${artifactContent}
</artefato>

## Sua tarefa

Analise o artefato e retorne APENAS um JSON válido (sem texto antes ou depois) com a estrutura abaixo.

Regras obrigatórias:
- "tipo": um de "1on1", "reuniao", "daily", "planning", "retro", "feedback", "outro"
- "data_artefato": data da reunião/evento no formato YYYY-MM-DD (extrair do conteúdo ou usar data atual)
- "pessoas_identificadas": slugs das pessoas do time cadastrado que PARTICIPARAM DIRETAMENTE do evento (estavam presentes). NÃO inclua pessoas apenas mencionadas durante a conversa ("o Pedro disse que...", "vamos falar com a Ana"). Regras por tipo:
  - 1on1: máximo 1 pessoa (o liderado — o gestor é o usuário do sistema e não entra aqui)
  - reuniao/planning/retro/daily: apenas participantes presentes, não mencionados
  - feedback/outro: a pessoa que recebeu o feedback ou é o sujeito do artefato
- "pessoa_principal": a pessoa SOBRE QUEM este artefato é mais relevante para o gestor. Para 1:1 é sempre o liderado presente. Para reuniões com múltiplos participantes, a pessoa cujo desenvolvimento é mais central (ou null se for evento coletivo sem foco individual claro). Use o slug do time cadastrado se disponível, senão o slug de novas_pessoas_detectadas.
- "novas_pessoas_detectadas": array de {"nome": "Nome Completo", "slug": "nome-sobrenome"} com pessoas que PARTICIPARAM do evento mas NÃO estão no time cadastrado. Mesma regra: participantes, não mencionados. Para 1:1: o liderado se não cadastrado. Gere o slug em lowercase com hifens (ex: "Antonio Silva" → "antonio-silva"). Array vazio se não houver.
- "resumo": 2–3 frases resumindo o que aconteceu
- "acoes_comprometidas": array de strings, cada uma sendo uma ação pendente com responsável e prazo se mencionado
- "pontos_de_atencao": array de strings com riscos, bloqueios ou preocupações identificadas (pode ser vazio)
- "elogios_e_conquistas": array de strings com elogios ou conquistas mencionadas (pode ser vazio)
- "temas_detectados": array de strings com temas recorrentes identificados (ex: "desenvolvimento técnico", "comunicação")
- "resumo_evolutivo": parágrafo narrativo de 4–6 frases integrando o histórico anterior (do perfil) com as novas informações deste artefato. Se não há histórico, escreva a narrativa baseada apenas no artefato.
- "temas_atualizados": array com os temas recorrentes COMPLETO e deduplicado, mesclando os temas anteriores (do perfil) com os novos detectados neste artefato
- "indicador_saude": "verde" | "amarelo" | "vermelho" — baseado no que foi observado
- "motivo_indicador": 1 frase explicando o indicador de saúde

JSON esperado:
{
  "tipo": "string",
  "data_artefato": "YYYY-MM-DD",
  "pessoas_identificadas": ["slug"],
  "novas_pessoas_detectadas": [{"nome": "string", "slug": "string"}],
  "pessoa_principal": "slug ou null",
  "resumo": "string",
  "acoes_comprometidas": ["string"],
  "pontos_de_atencao": ["string"],
  "elogios_e_conquistas": ["string"],
  "temas_detectados": ["string"],
  "resumo_evolutivo": "string",
  "temas_atualizados": ["string"],
  "indicador_saude": "verde|amarelo|vermelho",
  "motivo_indicador": "string"
}`
}

export interface IngestionAIResult {
  tipo: string
  data_artefato: string
  pessoas_identificadas: string[]
  novas_pessoas_detectadas: Array<{ nome: string; slug: string }>
  pessoa_principal: string | null
  resumo: string
  acoes_comprometidas: string[]
  pontos_de_atencao: string[]
  elogios_e_conquistas: string[]
  temas_detectados: string[]
  resumo_evolutivo: string
  temas_atualizados: string[]
  indicador_saude: 'verde' | 'amarelo' | 'vermelho'
  motivo_indicador: string
}
