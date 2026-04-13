# Sinais Indiretos & Peer Meetings — Design Spec

**Data:** 2026-04-09
**Status:** Aprovado
**Branch:** fix/fundacao-qualidade

---

## Problema

O pipeline de ingestão tem modelo binário: artefato é SOBRE uma pessoa (individual) ou SOBRE um grupo (coletivo). Reuniões com pares/gestores criam um terceiro padrão: reunião COM uma pessoa que gera inteligência SOBRE outras pessoas (liderados discutidos).

Hoje, ao ingerir um 1:1 com um par (ex: BP tech), o pipeline:
1. Extrai liderados mencionados como "participantes" (violando a regra do prompt)
2. Pode setar `pessoa_principal` como o gestor (que não está no registry) → pending
3. Não tem caminho para rotear inteligência sobre liderados discutidos aos seus perfis
4. Não oferece escape hatch quando o item trava em "Aguardando Cadastro"

## Decisões de design

- **Artefato fica no perfil do par** (pessoa_principal = o par), não em `_coletivo`
- **Abordagem prompt-first** com mínima mudança no pipeline
- **Orquestração reutiliza** o padrão de batches/locks do `runCerimoniaSignalsForPeople`
- **Prompt de sinal indireto é separado** do cerimonia-sinal (framings fundamentalmente diferentes)

## Contexto: o que já existe

- Seção `## Sinais de Terceiros` no `perfil.md` — já consumida pelo 1:1 deep pass
- `correlacoes_terceiros` no output do deep pass — fecha o loop quando liderado confirma/nega
- `runCerimoniaSignalsForPeople` — orquestração de análise per-person com batches e locks
- Campo `relacao` no `config.yaml` — distingue liderado/par/gestor/stakeholder
- `fuzzyRemapSlugs` — resolução de nomes por primeiro nome

---

## 1. Prompt de Ingestão — Refinamento

### Arquivo: `src/main/prompts/ingestion.prompt.ts`

### Novo campo no output

```typescript
// Adicionar ao IngestionAIResult
pessoas_mencionadas_relevantes: Array<{
  slug: string        // slug do liderado mencionado (lowercase com hifens)
  nome: string        // nome completo
  contexto: string    // resumo do que foi discutido sobre essa pessoa (1-2 frases)
}>
```

### Novas regras no prompt

1. **Orientação para reuniões com par/gestor/stakeholder:**
   - "Quando o interlocutor NÃO é um liderado direto (é par, gestor ou stakeholder), as pessoas do time discutidas durante a conversa são `pessoas_mencionadas_relevantes`, NÃO `pessoas_identificadas`."
   - "Para 1:1 com par: `pessoa_principal` é o par. Os liderados discutidos vão em `pessoas_mencionadas_relevantes` com contexto do que foi dito sobre cada um."

2. **Proteção do gestor:**
   - "O gestor (${managerName}) NUNCA deve ser `pessoa_principal` nem entrar em `pessoas_identificadas`. Ele é o usuário do sistema."

3. **Classificação de 1:1:**
   - "Quando são duas pessoas (gestor + alguém), classificar como `1on1`. A relação do interlocutor (liderado/par/gestor) determina o framing, não o tipo."

### Tipo TypeScript

```typescript
// Em types/ipc.ts ou onde IngestionAIResult é definido
interface PessoaMencionada {
  slug: string
  nome: string
  contexto: string
}

// Adicionar ao IngestionAIResult existente
pessoas_mencionadas_relevantes?: PessoaMencionada[]
```

---

## 2. Novo Prompt — Sinal Indireto

### Arquivo: `src/main/prompts/sinal-terceiro.prompt.ts` (novo)

### Interface de input

```typescript
interface SinalTerceiroPromptParams {
  pessoaNome: string           // liderado sendo analisado
  pessoaCargo: string          // cargo do liderado
  perfilMdRaw: string | null   // perfil atual do liderado (contexto histórico)
  fonteNome: string            // quem reportou (ex: "Rômulo")
  fonteRelacao: string         // "par" | "gestor" | "stakeholder"
  artifactContent: string      // conteúdo da reunião
  artifactData: string         // YYYY-MM-DD
  contextoMencao: string       // contexto extraído no Pass 1
  today: string
}
```

### Interface de output

```typescript
interface SinalTerceiroResult {
  relevante: boolean              // false se a menção foi superficial
  resumo_sinal: string            // 2-3 frases: o que foi reportado
  categoria: 'feedback' | 'concern' | 'elogio' | 'decisao' | 'contexto'
  temas: string[]                 // temas relacionados
  impacto_potencial: string | null  // algo acionável
  sugestao_devolutiva: string | null // sugestão pro gestor no próximo 1:1
  confianca: 'alta' | 'media' | 'baixa'
}
```

### Framing do prompt

- "Analise o que foi REPORTADO sobre ${pessoaNome} por ${fonteNome} (${fonteRelacao})."
- "Isto NÃO é observação direta — é relato de terceiro. Calibre confiança para 'media' por padrão, 'alta' apenas se houver dados concretos (métricas, exemplos específicos)."
- "Se a menção for superficial ('falamos do Carlos rapidamente'), retorne `relevante: false`."
- "O campo `sugestao_devolutiva` deve dar ao gestor uma frase para usar no próximo 1:1 ('O Rômulo mencionou que... o que você acha?')."
- Se `perfilMdRaw` disponível: "Considere o perfil histórico para calibrar se este sinal confirma, contradiz ou adiciona informação nova."

### Validação

Função `validateSinalTerceiroResult(data)` seguindo o padrão de `validateCerimoniaSinalResult`:
- `relevante` deve ser boolean
- Se `relevante === true`: `resumo_sinal` não vazio, `categoria` no enum, `confianca` no enum
- Se `relevante === false`: demais campos podem ser vazios/null

---

## 3. Pipeline — Detecção e Roteamento

### Arquivo: `src/main/ingestion/IngestionPipeline.ts`

### Mudança no `processItem` (após sync individual)

```typescript
// Após syncItemToPerson + ExternalDataPass + run1on1DeepPass (existentes)
// Nova condição: se pessoa_principal é par/gestor/stakeholder, rodar sinais indiretos

if (principal && registry.get(principal)) {
  const pessoaConfig = registry.get(principal)!
  const relacao = pessoaConfig.relacao ?? 'liderado'

  // ... sync existente ...

  // NOVO: sinais indiretos para liderados mencionados
  if (['par', 'gestor', 'stakeholder'].includes(relacao)) {
    const mencionados = aiResult.pessoas_mencionadas_relevantes ?? []
    const mencionadosCadastrados = this.resolveMencionados(mencionados, registry)

    if (mencionadosCadastrados.length > 0) {
      this.runSinaisTerceiros(
        mencionadosCadastrados, aiResult, text, claudeBinPath, registry,
        pessoaConfig.nome, relacao
      ).catch(err => this.log.warn('sinais terceiros falhou', { error: ... }))
    }
  }
}
```

### Novo método `resolveMencionados`

Resolve slugs de `pessoas_mencionadas_relevantes` para pessoas cadastradas:
1. Tenta match exato no registry
2. Se falha, tenta fuzzy match (first name, apelidos)
3. Filtra non-person words
4. Filtra manager slug
5. Retorna array de `{ slug, nome, contexto }` resolvidos

### Novo método `runSinaisTerceiros`

Reutiliza o padrão de `runCerimoniaSignalsForPeople`:

```typescript
private async runSinaisTerceiros(
  mencionados: Array<{ slug: string; nome: string; contexto: string }>,
  aiResult: IngestionAIResult,
  artifactContent: string,
  claudeBinPath: string,
  registry: PersonRegistry,
  fonteNome: string,
  fonteRelacao: string,
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10)
  const settings = SettingsManager.load()

  for (let i = 0; i < mencionados.length; i += MAX_CONCURRENT) {
    const batch = mencionados.slice(i, i + MAX_CONCURRENT)
    await Promise.all(
      batch.map(async ({ slug, nome, contexto }) => {
        const pessoa = registry.get(slug)
        if (!pessoa) return

        const perfilData = registry.getPerfil(slug)
        const prompt = buildSinalTerceiroPrompt({
          pessoaNome: pessoa.nome,
          pessoaCargo: pessoa.cargo,
          perfilMdRaw: perfilData?.raw ?? null,
          fonteNome,
          fonteRelacao,
          artifactContent,
          artifactData: aiResult.data_artefato,
          contextoMencao: contexto,
          today,
        })

        const result = await runWithProvider('sinalTerceiro', settings, prompt, {
          claudeBinPath,
          claudeTimeoutMs: 60_000,
          openRouterTimeoutMs: 60_000,
        })

        if (!result.success || !result.data) return

        const validation = validateSinalTerceiroResult(result.data)
        if (!validation.valid) return

        const sinal = result.data as SinalTerceiroResult
        if (!sinal.relevante) {
          this.log.info('sinal terceiro irrelevante, skip', { slug })
          return
        }

        const release = await this.acquirePersonLock(slug)
        try {
          const writer = new ArtifactWriter(this.workspacePath)
          writer.appendSinalTerceiro(slug, sinal, fonteNome, fonteRelacao, aiResult.data_artefato)
          this.log.info('sinal terceiro aplicado', { slug, fonte: fonteNome, categoria: sinal.categoria })
        } finally {
          release()
        }

        this.notifyRenderer('ingestion:sinal-terceiro-aplicado', {
          personSlug: slug, fonte: fonteNome, categoria: sinal.categoria,
        })
      })
    )
  }
}
```

### Armazenar mencionados no QueueItem

```typescript
// Adicionar ao QueueItem
pessoasMencionadas?: PessoaMencionada[]
```

Popula em `processItem` após Parse 1, junto com `pessoasIdentificadas` e `naoCadastradas`.

---

## 4. ArtifactWriter — Escrita em Sinais de Terceiros

### Arquivo: `src/main/artifacts/ArtifactWriter.ts`

### Novo método

```typescript
appendSinalTerceiro(
  slug: string,
  sinal: SinalTerceiroResult,
  fonteNome: string,
  fonteRelacao: string,
  data: string, // YYYY-MM-DD
): void
```

### Formato de escrita

```markdown
- [2026-04-09] Via Rômulo (par): Carlos tem demonstrado ownership forte na 
  observabilidade com DataDog, mas o time de QA precisa de mais mentoria formal.
  Sugestão: perguntar como ele está se sentindo com a demanda de mentoria.
  {categoria: feedback, confianca: media}
```

### Comportamento

- **Append-only** — nunca reescreve sinais anteriores
- **Posição:** Se seção `## Sinais de Terceiros` não existe, criar entre `## Conquistas` e `## Histórico de Artefatos`
- **Dedup:** Se já existe sinal com mesma `data` + mesma `fonteNome` + mesmo `slug` → skip
- **Limite:** Máximo 20 sinais. Ao ultrapassar, remove o mais antigo (FIFO)
- **Escrita atômica:** Usa o padrão existente de `.tmp` + rename

---

## 5. UI — Escape Hatch para Pending Items

### Arquivo: `src/renderer/src/views/InboxView.tsx`

### 5.1 Botão "Prosseguir sem cadastrar"

No `QueueCard` de items com `status === 'pending'`, adicionar botão:

```
[Prosseguir sem cadastrar]
```

Ao clicar: chama IPC `ingestion:process-as-collective` com `{ itemId }`. O handler no main process:
1. Busca item pending pelo id
2. Usa `cachedAiResult` e `cachedText`
3. Roda `syncItemToCollective(item, claudeBinPath)`
4. Item passa de pending → done
5. Ações roteadas por responsável, sinais de cerimônia para participantes registrados

### 5.2 Distinção visual no QueueCard

Tags de pessoas no card pending:
- **Tag destaque (vermelho/accent forte):** `pessoa_principal` que está bloqueando — a causa do pending
- **Tags laranjas:** outras pessoas em `naoCadastradas` (informacional)
- **Tags cinzas:** pessoas registradas (já existe)

### 5.3 Filtrar gestor de `naoCadastradas`

No pipeline, ao montar `item.naoCadastradas`:

```typescript
item.naoCadastradas = [...new Set([...naoCadastradas, ...novas.map(p => p.slug)])]
  .filter(s => s !== managerSlug)
```

### Novo IPC channel

```typescript
// Em ipc.ts
'ingestion:process-as-collective': { itemId: string } → { success: boolean; error?: string }
```

Handler registrado no `IngestionPipeline` ou `FileWatcher`.

---

## 6. Fuzzy Matching — Melhorias

### Arquivo: `src/main/ingestion/IngestionPipeline.ts` (método `fuzzyRemapSlugs`)

### 6.1 Match por apelido/diminutivo

Tabela de apelidos comuns em PT-BR:

```typescript
const APELIDOS: Record<string, string[]> = {
  'edu':  ['eduardo'],
  'gabi': ['gabriela', 'gabriel'],
  'rafa': ['rafael', 'rafaela'],
  'fer':  ['fernando', 'fernanda'],
  'dani': ['daniel', 'daniela'],
  'ale':  ['alexandre', 'alessandra', 'alex'],
  'rod':  ['rodrigo'],
  'leo':  ['leonardo', 'leandro'],
  'bia':  ['beatriz'],
  'lu':   ['lucas', 'luciana', 'lucia'],
  'mari': ['mariana', 'maria'],
  'cris': ['cristiano', 'cristina'],
  'thi':  ['thiago'],
  'gui':  ['guilherme'],
  'bru':  ['bruno', 'bruna'],
  'vini':  ['vinicius'],
  'nath': ['nathalia', 'nathan'],
  'vic':  ['victor', 'victoria'],
}
```

No `resolve()`: se first-name não match direto, verificar se é apelido → expandir → tentar match. Se resolve para exatamente 1 pessoa → remap.

### 6.2 Match por nome completo (desambiguação)

Se first-name é ambíguo (2+ pessoas), tentar resolver usando `participantes_nomes` ou `pessoas_mencionadas_relevantes[].nome`:
1. Claude gerou slug "carlos" (ambíguo)
2. Mas `participantes_nomes` contém "Carlos Mendes"
3. "carlos-mendes" está registrado → remap para "carlos-mendes"

### 6.3 Filtro de non-person words

```typescript
const NON_PERSON_WORDS = new Set([
  'fim', 'inicio', 'pausa', 'todos', 'time', 'equipe', 'geral',
  'empresa', 'cliente', 'projeto', 'sistema', 'produto', 'area',
])
```

Antes de adicionar a `naoCadastradas`, verificar se o slug inteiro é non-person word → skip.

---

## Fluxo completo após implementação

```
Gestor arrasta transcrição do 1:1 com Rômulo (par)
  ↓
Pass 1:
  tipo: "1on1"
  pessoa_principal: "romulo-di-lucca-negrelli-melo" (cadastrado, relação=par)
  pessoas_identificadas: ["romulo-di-lucca-negrelli-melo"]
  pessoas_mencionadas_relevantes: [
    { slug: "carlos-mendes", nome: "Carlos Mendes", contexto: "Ownership em observabilidade..." },
    { slug: "tales-silva", nome: "Tales Silva", contexto: "Mentoria de QA..." },
  ]
  ↓
Pass 2 (com perfil do Rômulo):
  Enriquece com contexto longitudinal da relação com o par
  ↓
syncItemToPerson → perfil do Rômulo atualizado (framing "par")
  ↓
relação === "par" → dispara runSinaisTerceiros (fire-and-forget):
  ↓
  Para Carlos Mendes:
    Prompt sinal-terceiro → "Rômulo reportou ownership forte em observabilidade..."
    → carlos/perfil.md ## Sinais de Terceiros (append)
  Para Tales Silva:
    Prompt sinal-terceiro → "Rômulo mencionou necessidade de mentoria formal em QA..."
    → tales/perfil.md ## Sinais de Terceiros (append)
  ↓
Próximo 1:1 com Carlos:
  Deep pass lê "Sinais de Terceiros" → sugere devolutiva
  → correlacoes_terceiros fecha o loop
```

---

## Arquivos afetados

| Arquivo | Tipo de mudança |
|---------|----------------|
| `src/main/prompts/ingestion.prompt.ts` | Editar — novo campo + regras para peer meetings |
| `src/main/prompts/sinal-terceiro.prompt.ts` | Criar — prompt de sinal indireto |
| `src/main/ingestion/IngestionPipeline.ts` | Editar — `resolveMencionados`, `runSinaisTerceiros`, filtro manager, QueueItem |
| `src/main/artifacts/ArtifactWriter.ts` | Editar — `appendSinalTerceiro` |
| `src/renderer/src/views/InboxView.tsx` | Editar — botão escape, distinção visual, filtro tags |
| `src/renderer/src/types/ipc.ts` | Editar — novo IPC channel, tipos |
| `src/main/ipc/` (handler relevante) | Editar — registrar handler `ingestion:process-as-collective` |

## Nota: 1:1 Deep Pass para pares

Ao classificar peer meetings como `tipo: "1on1"`, o pipeline existente dispara `run1on1DeepPass` para o par. O deep pass tem campos liderado-específicos (PDI, followup_acoes, auto_percepcao) que serão vazios/null para pares. Isso é aceitável — o prompt do deep pass recebe `pessoaRelacao` do config.yaml e calibra o framing. Campos não aplicáveis retornam vazios sem causar erros.

O `runSinaisTerceiros` roda em paralelo com o deep pass — ambos são fire-and-forget e não competem (o deep pass escreve no perfil do par, os sinais indiretos escrevem nos perfis dos liderados mencionados — pessoas diferentes, locks diferentes).

## Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| Claude continua extraindo menções como participantes | Nova regra explícita no prompt + campo separado `pessoas_mencionadas_relevantes` dá ao Claude vocabulário para expressar a diferença |
| Sinal indireto de baixa qualidade | Campo `relevante: boolean` permite skip. Confiança default "media". Deep pass do 1:1 subsequente valida |
| Regressão no Pass 1 para outros tipos | Mudanças são aditivas. Campo novo é opcional. Regras novas só ativam quando interlocutor não é liderado |
| Excesso de sinais no perfil | Limite de 20 sinais com FIFO. Dedup por data+fonte+slug |
| Custo de tokens (N chamadas Claude extras) | Fire-and-forget. Só roda para mencionados relevantes (não superficiais). Batch de MAX_CONCURRENT |
