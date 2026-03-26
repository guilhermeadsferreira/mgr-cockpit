# Pulse Cockpit v2 — Briefing Final de Revisão Completa

> Revisão de sistema inteiro. Baseado em entrevista com o gestor (usuário real),
> análise do OVERVIEW.md (v2026-03-26), diagnóstico de problemas observados em uso,
> e caso real de validação (1:1 Henrique/Guilherme).
>
> **Estado atual:** ~20 artefatos ingeridos, <1 mês de uso real, próximo ciclo de
> avaliação será o primeiro teste do relatório de ciclo.
>
> **Estratégia de migração:** reprocessar tudo do zero com prompts novos. Backup
> completo do workspace disponível. Artefatos originais precisam ser localizados
> (inbox/processados/ está vazio — verificar se os originais estão em historico/ 
> das pessoas ou no backup externo).
>
> **Objetivo deste documento:** Referência para o Claude Code varrer o projeto real,
> refinar o plano e implementar. O Claude Code deve ler este briefing + o código
> completo e devolver: (1) o que é viável como está, (2) o que precisa de ajuste,
> (3) plano de implementação arquivo por arquivo.

---

## PARTE A — O QUE O GESTOR PRECISA

### A1. Pesquisa com o usuário — síntese

**Visibilidade do time:**
- Quer saber: pessoas travadas, entregas travadas, oportunidades de feedback, clima
- Descobre tarde demais: entregas atrasadas, liderados com dificuldade técnica, gente no piloto automático
- Responde "como está o time" de memória — sem dados estruturados
- Tem pessoas no time que não sabe como estão em qualidade, entregas, comunicação

**Decisões sobre pessoas:**
- Para decidir feedback/promoção/realocação falta: histórico de feedbacks com exemplos, linha do tempo de entregas, visão de forças/gaps, sinais de terceiros
- Para "essa pessoa está pronta para o próximo nível" precisa: evidências de entregas com impacto, feedback de pares/TL, histórico de evolução, clareza sobre gaps
- Sinais de intervenção: queda de engajamento em cerimônias, ações não cumpridas repetidamente, feedback negativo de pares/TL acumulando
- Já perdeu gente sem ver os sinais a tempo

**O 1:1 especificamente:**
- Antes quer: ações pendentes do liderado, sinais de terceiros, PDI/carreira
- Depois quer: compromissos registrados, sinais de alerta, estado atualizado
- Só responde "fulano está evoluindo?" para 2-3 pessoas — resto é feeling

**Padrões e tendências:**
- Indicadores de degradação: mesmos pontos sem resolução, queda de qualidade técnica, redução de participação
- Valor ao abrir o app: dashboard de saúde, alertas de padrões negativos, briefing pré-1:1

### A2. 7 necessidades do gestor → mapeamento no sistema

| # | Necessidade | Existe? | Gap |
|---|-------------|---------|-----|
| 1 | Estado atual por pessoa, estruturado | Parcial — frontmatter tem saude/sinal_evolucao | Falta tendência temporal, ciclos de ações, correlação |
| 2 | Rastreamento de compromissos com ciclo de vida | Sim — actions.yaml | Falta follow-up automático, detecção de abandono |
| 3 | Correlação entre fontes | Não | Artefatos processados isoladamente |
| 4 | Detecção de padrões temporais | Parcial — alerta_estagnacao pontual | Falta análise de tendência longitudinal |
| 5 | Briefing pré-1:1 automático | Parcial — pauta existe | Falta ações com contexto, sinais de terceiros, PDI |
| 6 | Evidências para decisões de carreira | Parcial — relatório de ciclo existe | Falta insights estruturados, correlações, tendência |
| 7 | Alerta antecipado de risco | Parcial — painel de riscos | Falta risco composto, ações abandonadas, tendência |

---

## PARTE B — DIAGNÓSTICO COMPLETO

### B1. Cadeia causal

```
RAIZ: Prompt genérico extrai mal
├── Ações: responsável errado, descrições vagas, sem contexto
│   ├── actions.yaml herda dados ruins
│   ├── Pauta não consegue mencionar ações pendentes específicas
│   └── Follow-up impossível (ação não faz sentido isolada)
├── Resumos rasos (não capturam decisões e alinhamentos)
│   ├── Perfil acumula resumos evolutivos genéricos
│   ├── Relatório de ciclo terá narrativa frágil
│   └── Gestor não confia → usa memória em vez do sistema
├── Sem extração de contexto qualitativo
│   ├── Pauta sem contexto de PDI/carreira
│   ├── Relatório de ciclo sem evidências de desenvolvimento
│   └── Insights de alinhamento se perdem entre 1:1s
└── Compromissos tácitos ignorados
    └── Ações do liderado subextraídas → accountability quebrada

RAIZ: Pass de Cerimônia gera dados genéricos
├── Skills genéricas ("boa comunicação") → perfil acumula ruído
├── Não cruza com perfil → sinais desconectados do contexto de desenvolvimento
└── Feedback sem impacto → conquistas e pontos de atenção sem valor real

RAIZ: Sem follow-up entre artefatos
├── Ações acumulam sem resolução nem detecção de abandono
├── Cada artefato é uma ilha → sem inteligência longitudinal
└── Gestor não sabe o que cobrar → perde confiança no sistema
```

### B2. Problemas por módulo

#### PROMPT GENÉRICO (Pass 1/2)
| Problema | Severidade |
|----------|-----------|
| Ações com responsável errado (gestor vs liderado trocados) | Crítico |
| Descrições de ações vagas, dependem de contexto da reunião | Crítico |
| Resumos rasos — "discutiram vários temas" sem dizer QUAIS | Importante |
| Sem captura de compromissos tácitos ("aham"/"total") | Crítico |
| Sem follow-up de ações anteriores | Crítico |
| Sem extração de contexto qualitativo (carreira, PDI, alinhamentos) | Importante |
| Sem correlação entre fontes | Importante |

#### PASS DE CERIMÔNIA
| Problema | Severidade |
|----------|-----------|
| Soft/hard skills genéricas sem evidência concreta | Importante |
| Não recebe perfil da pessoa → não cruza com contexto existente | Importante |
| Feedback positivo/negativo impreciso, sem impacto descrito | Importante |

#### ACTIONS
| Problema | Severidade | Causa raiz |
|----------|-----------|-----------|
| Descrições vagas sem contexto | Crítico | Prompt genérico |
| Responsável errado | Crítico | Prompt genérico |
| Sem ciclo de vida automatizado entre artefatos | Importante | Sem follow-up no prompt |

#### PAUTA DE 1:1
| Problema | Severidade | Causa raiz |
|----------|-----------|-----------|
| Não menciona ações pendentes específicas | Importante | Actions com dados ruins |
| Falta contexto de PDI/carreira | Importante | PDI não serializado de forma útil |

#### PERFIL VIVO
| Problema | Severidade |
|----------|-----------|
| Acumula dados de baixa qualidade (reflexo da ingestão) | Crítico |
| Sem seção de insights qualitativos de 1:1 | Importante |
| Sem rastreamento de tendência emocional | Importante |
| Sem seção de sinais de terceiros correlacionáveis | Importante |

#### RELATÓRIO DE CICLO
| Problema | Severidade |
|----------|-----------|
| Ainda não testado — próximo ciclo é o primeiro | Risco |
| Vai consumir dados de baixa qualidade se ingestão não melhorar | Crítico |
| Sem insights de 1:1 estruturados para narrar evolução | Importante |
| Sem correlações de fontes para evidências fortes | Importante |

#### MÓDULO EU
| Problema | Severidade |
|----------|-----------|
| acoes_gestor extraídas não alimentam DemandaRegistry | Melhoria |
| Autoavaliação não consome insights de 1:1 nem tendências | Melhoria |

---

## PARTE C — SOLUÇÕES POR MÓDULO

### C1. Prompt Genérico (Pass 1/2) — Refinamento de instruções

**Não mudar o schema de saída.** Apenas refinar as instruções para melhorar qualidade.

#### C1.1 Ações — responsável e descrição

Instrução refinada:
> Para cada ação comprometida:
> - `responsavel`: a pessoa que VAI EXECUTAR, não quem pediu. Se o gestor pede e o liderado aceita, responsável é o liderado. Se o gestor diz "eu vou fazer X", responsável é o gestor.
> - `owner`: "gestor" se o usuário do sistema vai executar, "liderado" se é a pessoa_principal, "terceiro" se é outra pessoa.
> - `descricao`: compreensível por alguém que não participou da reunião. Padrão: O QUE fazer + SOBRE O QUÊ + PARA QUÊ.
>   - Ruim: "Resolver o problema" / "Ver aquilo que conversamos"
>   - Bom: "Investigar causa raiz da lentidão no endpoint /auth e propor solução"
>   - Bom: "Alinhar com time de plataforma sobre migração do Kafka antes do planning"
> - Se ambíguo quem é o responsável, atribua a quem demonstrou maior ownership na conversa.

#### C1.2 Resumos — profundidade

Instrução refinada:
> O resumo deve responder 3 perguntas:
> 1. Por que essa reunião aconteceu? (contexto/gatilho)
> 2. O que foi DECIDIDO ou ALINHADO? (não "discutido" — o que MUDOU)
> 3. O que muda depois dessa reunião? (ações, direção, entendimento novo)
>
> Nunca: "foram discutidos vários temas". Sempre: QUAIS temas, QUAL decisão, QUAL impacto.

#### C1.3 Pontos de atenção — especificidade

Instrução refinada:
> Padrão: [O QUÊ] + [EVIDÊNCIA] + [IMPACTO POTENCIAL].
> - Ruim: "Comunicação precisa melhorar"
> - Bom: "PRs chegando para revisão com erros críticos (confirmado pelo TL), sobrecarregando seniors"

### C2. Pass de Cerimônia — Melhorias

#### C2.1 Skills com evidência concreta

Instrução refinada:
> Descreva O QUE A PESSOA FEZ, não uma label.
> - Ruim: `["boa comunicação"]`
> - Bom: `["Explicou impacto do incidente para stakeholders não-técnicos de forma clara durante o warroom"]`
>
> Se participação insuficiente para gerar skill concreta, retorne array vazio.

#### C2.2 Cruzamento com perfil

**Mudança estrutural:** Injetar perfil compacto da pessoa no Pass de Cerimônia.

Conteúdo do perfil compacto: frontmatter + pontos de atenção ativos + temas recorrentes + últimas 3 entradas do histórico de saúde. NÃO o perfil inteiro (performance).

Instrução adicional:
> A pessoa tem os seguintes pontos de atenção conhecidos: {PONTOS_ATENCAO}
> Se você observar evidência de melhoria ou piora em algum desses pontos, registre explicitamente.
> Temas recorrentes da pessoa: {TEMAS}. Conecte observações a esses temas quando aplicável.

**Questão para o Claude Code:** `buildCerimoniaSinalPrompt()` recebe perfil hoje? Se não, qual a assinatura atual e como adicionar o perfil compacto?

#### C2.3 Feedback com impacto

Instrução refinada:
> Padrão: [QUEM] + [FEZ O QUÊ] + [IMPACTO].
> - Ruim: `["Bom trabalho"]`
> - Bom: `["Identificou edge case no fluxo de pagamento durante planning que evitaria bug em produção"]`

### C3. Pass de 1:1 — Novo prompt especializado

#### Padrão arquitetural
Segue o padrão do Pass de Cerimônia: prompt separado, roda após Pass 1/2, schema próprio, validação própria.

```
Pipeline para 1:1:
  Pass 1 → Pass 2 (se aplicável) → Pass 1on1
```

Novo arquivo: `prompts/1on1-deep.prompt.ts`

#### Contexto injetado

```
{DATA_ULTIMO_1ON1}
{DIAS_DESDE_ULTIMO_1ON1}
{ACOES_ABERTAS_LIDERADO}    — actions.yaml, owner=liderado, status=open, com contexto
{ACOES_ABERTAS_GESTOR}      — actions.yaml, owner=gestor, status=open
{SINAIS_TERCEIROS}           — pontos de atenção + sinais de cerimônia sobre esta pessoa
{PDI_ATUAL}                  — PDI do config.yaml serializado
{HISTORICO_SAUDE_RECENTE}    — últimas 5 entradas do histórico de saúde
```

#### Schema: `OneOnOneResult`

```typescript
interface OneOnOneResult {
  // === Follow-up de ações anteriores ===
  followup_acoes: {
    acao_original: string;       // texto da ação como está no actions.yaml
    acao_id: string;             // id da ação
    status: "cumprida" | "em_andamento" | "nao_mencionada" | "abandonada";
    evidencia: string | null;
  }[];

  // === Novas ações do liderado ===
  acoes_liderado: {
    descricao: string;           // acionável, autônoma, português correto
    tipo: "tarefa_explicita" | "compromisso_informal" | "mudanca_processo" | "pdi";
    prazo_iso: string | null;
    origem_pauta: "liderado" | "gestor" | "terceiro";
    terceiro_nome: string | null;
    contexto: string;            // onde na conversa surgiu (gestor valida)
  }[];

  // === Novas ações do gestor ===
  acoes_gestor: {
    descricao: string;
    prazo_iso: string | null;
  }[];

  // === Insights qualitativos ===
  insights_1on1: {
    categoria: "carreira" | "pdi" | "expectativas" | "feedback_dado"
      | "feedback_recebido" | "relacionamento" | "pessoal" | "processo";
    conteudo: string;            // auto-contido, legível daqui a 3 meses
    relevancia: "alta" | "media";
    acao_implicita: string | null;
  }[];

  // === Sugestões do gestor aceitas ===
  sugestoes_gestor: {
    descricao: string;
    resposta_liderado: "aceitou_explicito" | "aceitou_tacito" | "resistiu" | "ficou_em_aberto";
    gerar_acao: boolean;
  }[];

  // === Correlação com sinais de terceiros ===
  correlacoes_terceiros: {
    sinal_original: string;
    fonte: string;
    confirmado_pelo_liderado: boolean;
    contexto_confirmacao: string | null;
  }[];

  // === Tendência emocional ===
  tendencia_emocional: "estavel" | "melhorando" | "deteriorando" | "novo_sinal";
  nota_tendencia: string;

  // === PDI update ===
  pdi_update: {
    houve_mencao_pdi: boolean;
    objetivos_mencionados: string[];
    novo_objetivo_sugerido: string | null;
    progresso_observado: string | null;
  };

  // === Resumo executivo para Qulture Rocks ===
  resumo_executivo_rh: string;
  // Parágrafo + bullets de ações + próximos passos.
  // Formato pronto para colar no Qulture Rocks.
  // Tom: profissional, objetivo, sem jargão interno do app.
  // Gerado automaticamente, sem chamada extra ao Claude.
}
```

#### Instruções-chave do prompt

**Compromissos tácitos:**
> "Quando o gestor fizer sugestão e o liderado responder afirmativamente ('total', 'aham', 'é', 'faz sentido', 'pode ser') sem rejeitar, trate como compromisso tácito. Registre em `sugestoes_gestor` com `aceitou_tacito` e `gerar_acao: true`. Gere ação correspondente em `acoes_liderado` com `origem_pauta: 'gestor'`."

**Follow-up obrigatório:**
> "Para CADA ação em {ACOES_ABERTAS_LIDERADO} e {ACOES_ABERTAS_GESTOR}, determine status. Se não mencionada, marque `nao_mencionada`. Não invente evidência."

**Contexto qualitativo:**
> "Capture momentos de alinhamento que não são ações: carreira, expectativas, feedback informal, preocupações pessoais, mudanças de processo. Cada insight legível por alguém que não leu a transcrição, daqui a 3 meses."

**Correlação com terceiros:**
> "Compare conteúdo do 1:1 com {SINAIS_TERCEIROS}. Se liderado confirmar, endossar ou contradizer qualquer sinal, registre. Convergência de fontes é o sinal mais forte."

**Mudança de comportamento:**
> "Se compromisso envolve mudança de hábito/processo ('rever processo de code review'), use `tipo: 'mudanca_processo'`. Não é tarefa pontual — é observável ao longo do tempo."

**Tendência emocional:**
> "Compare sentimento e engajamento deste 1:1 com {HISTORICO_SAUDE_RECENTE}. Padrão de piora em 2+ registros → `deteriorando`. Sinal sem precedente → `novo_sinal`."

**Resumo executivo para RH (Qulture Rocks):**
> "Gere um campo `resumo_executivo_rh` com formato pronto para colar numa ferramenta de RH. Estrutura:
> - Parágrafo de abertura (2-3 frases): o que foi tratado no 1:1, contexto geral
> - Ações combinadas (bullets): compromissos do liderado e do gestor, com responsável explícito
> - Próximos passos (bullets): o que será acompanhado até o próximo 1:1
>
> Tom: profissional e objetivo. Sem jargão interno do app. Sem indicadores de saúde ou sentimento (isso é dado interno do gestor, não vai para o RH). Não inclua insights sensíveis de carreira/pessoal — apenas o que é apropriado para registro formal."

### C4. Perfil Vivo — Evolução para schema v4

**Princípio:** NÃO reescrever seções existentes. Adicionar novas seções e campos no frontmatter.

#### Novas seções:

```markdown
## Insights de 1:1
<!-- Populada pelo Pass de 1:1. Cada entrada auto-contida. -->
**2026-03-26:** [carreira] Expressou interesse em arquitetura. Gestor alinhou
que depende de ownership técnico no projeto atual. *(alta)*

**2026-03-26:** [feedback_dado] Gestor sugeriu rever processo de dev com IA
após confirmação de problemas nas PRs. Liderado aceitou tacitamente. *(alta)*

## Sinais de Terceiros
<!-- Populada pelo Pass de Cerimônia e correlações do Pass de 1:1 -->
**2026-03-21 (daily) — Antonio (TL):** PRs com erros críticos chegando para
revisão com frequência.
  → **Confirmado pelo liderado em 1:1 de 2026-03-26**
```

#### Novos campos no frontmatter (schema v4):
```yaml
schema_version: 4
# ... todos os campos v3 mantidos ...
tendencia_emocional: "deteriorando"          # novo
nota_tendencia: "Segundo 1:1 com ansiedade"  # novo
ultimo_followup_acoes: "2026-03-26"          # novo
```

#### Schema migration v3 → v4:
- Adiciona campos novos com defaults seguros (null/vazio)
- Cria seções "Insights de 1:1" e "Sinais de Terceiros" vazias no body
- Idempotente, segue padrão de ProfileMigration.ts

### C5. ActionRegistry — Extensões

#### Novos campos opcionais no actions.yaml:
```yaml
- id: "2026-03-26-henrique-0"
  # ... campos existentes mantidos ...
  tipo: "compromisso_informal"    # novo: tarefa_explicita | compromisso_informal | mudanca_processo | pdi
  origem_pauta: "gestor"          # novo: liderado | gestor | terceiro
  contexto: "Gestor sugeriu rever processo de dev com IA"  # novo
  ciclos_sem_mencao: 0            # novo: incrementado por followup_acoes
```

#### Novas operações:
- `getOpenByPersonAndOwner(slug, owner?)` — para serializar no Pass de 1:1
- `updateFromFollowup(followupAcoes[])` — batch update status + ciclos_sem_mencao
- `createFrom1on1Result(result, slug)` — cria ações do Pass de 1:1 + converte sugestões aceitas

#### Ciclo de vida:
```
aberta → cumprida (via followup)
       → em_andamento (via followup)
       → abandonada (via followup explícito)
       → nao_mencionada (1x) → nao_mencionada (2x) → gera alerta automático
```

### C6. Pauta de 1:1 — Enriquecimento

Contexto adicional a injetar no prompt de `ai:generate-agenda`:
```
{ACOES_PENDENTES_COM_CONTEXTO}       — ações com campo contexto e tipo
{ACOES_RISCO_ABANDONO}               — ciclos_sem_mencao >= 2
{ACOES_GESTOR_PENDENTES}             — owner=gestor (accountability reversa)
{INSIGHTS_RECENTES}                  — últimos 5 insights de 1:1
{SINAIS_TERCEIROS_NAO_EXPLORADOS}    — sinais sem menção em 1:1 subsequente
{PDI_ESTRUTURADO}                    — PDI do config.yaml com status
```

Instrução adicional:
> "Use DESCRIÇÃO COMPLETA e CONTEXTO das ações, não só texto resumido. Ações com risco de abandono (2+ ciclos) são prioridade. Sinais de terceiros não explorados geram perguntas de validação. Ações do gestor pendentes vão em seção 'Prestar contas'. Insights de carreira/PDI conectam com perguntas sugeridas."

### C7. Pauta com o Gestor (roll-up)

Contexto adicional:
```
{TENDENCIAS_EMOCIONAIS}       — pessoas com tendência deteriorando
{CORRELACOES_CONFIRMADAS}     — sinais de terceiro confirmados (evidência forte)
{ACOES_GESTOR_PENDENTES}      — promessas do gestor não cumpridas
{RISCOS_COMPOSTOS}            — pessoas com múltiplos sinais negativos
```

### C8. Relatório de Ciclo — Enriquecimento

Contexto adicional:
```
{INSIGHTS_1ON1_DO_PERIODO}      — todos os insights de 1:1 do período
{CORRELACOES_DO_PERIODO}        — sinais com confirmações cruzadas
{FOLLOWUP_HISTORICO}            — ações cumpridas vs abandonadas no período
{TENDENCIA_EMOCIONAL_PERIODO}   — evolução do sentimento
{PDI_EVOLUCAO}                  — status PDI início vs fim do período
```

Instruções adicionais:
> "Use insights de 1:1 como evidências primárias — cite datas. Na accountability, mostre proporção de ações cumpridas vs abandonadas. Na promovibilidade, cruze: conquistas + feedback de terceiros + PDI + tendência. Convergência de fontes é evidência forte. Pontos de desenvolvimento priorizados por múltiplas fontes."

### C8.5 Resumo Executivo para Qulture Rocks

#### O que é
Após ingestão de um artefato `tipo === "1on1"`, o sistema gera automaticamente um resumo executivo formatado para colar no Qulture Rocks (ferramenta de RH para registro de 1:1s).

#### Como funciona
- O campo `resumo_executivo_rh` é gerado pelo Pass de 1:1 como parte do `OneOnOneResult` — **sem chamada extra ao Claude**
- Formato: parágrafo de contexto + bullets de ações + próximos passos
- Tom profissional e objetivo — sem indicadores internos (saúde, sentimento, tendência) e sem insights sensíveis (carreira, pessoal)
- Armazenado junto com o artefato processado no `historico/` da pessoa

#### UX
- Gerado automaticamente após ingestão do 1:1 (sem interação do gestor)
- Na tela do artefato processado (ou na tela de perfil da pessoa), exibir o resumo com botão **"Copiar para Qulture Rocks"** que copia para o clipboard
- Opcionalmente: notificação pós-ingestão "1:1 com Henrique processado — resumo para QR pronto" com ação direta para copiar

#### Exemplo de output
```
Realizamos 1:1 focado em qualidade de entregas e processo de desenvolvimento.
Henrique reconheceu que PRs recentes tiveram erros identificados na revisão
pelos seniors, e alinhamos a necessidade de revisar seu processo de code review.

Ações combinadas:
• Henrique: Revisar processo de desenvolvimento com IA, criando checkpoints
  de qualidade antes de abrir PR
• Henrique: Alinhar com Antonio (TL) sobre padrões esperados nas PRs
• Gestor: Acompanhar evolução da qualidade nas próximas 2 sprints

Próximos passos:
• Acompanhar no próximo 1:1 se houve melhoria nas revisões de PR
• Validar com Antonio se percebeu mudança no processo
```

#### Privacidade
O resumo executivo é filtrado por design — NÃO inclui:
- Indicadores de saúde/sentimento (dados internos do gestor)
- Insights de carreira/pessoal/relacionamento (sensíveis)
- Tendência emocional
- Correlações com terceiros

Inclui apenas o que é apropriado para registro formal de RH.

### C9. Dashboard e Alertas — Novos gatilhos

| Gatilho novo | Fonte | Cálculo (runtime) |
|-------------|-------|-------------------|
| Ação com risco de abandono | actions.yaml | ciclos_sem_mencao >= 2, status open |
| Tendência emocional deteriorando | perfil.md frontmatter | tendencia_emocional === "deteriorando" |
| Sinal de terceiro não explorado | perfil.md Sinais de Terceiros | Sem menção em 1:1 subsequente |
| Promessa do gestor pendente | actions.yaml | owner=gestor, status=open, 14+ dias |
| Risco composto | Múltiplas fontes | 3+ sinais negativos simultâneos |

Todos calculados em runtime, seguindo padrão existente do TeamRiskPanel.

### C10. Módulo Eu — Conexões com dados novos

#### acoes_gestor → DemandaRegistry
Quando o Pass de 1:1 extrai `acoes_gestor`, além de criar no `ActionRegistry` da pessoa, criar entrada espelho no `DemandaRegistry` do gestor. Isso dá visibilidade ao gestor sobre suas próprias promessas.

**Questão para o Claude Code:** `DemandaRegistry` tem schema compatível com o de ações? Qual a diferença? É possível criar de forma automática sem duplicar lógica?

#### Autoavaliação com novos dados
O prompt `autoavaliacao.prompt.ts` deve consumir:
- Insights de 1:1 dados pelo gestor (categoria `feedback_dado`) — mostra padrão de como o gestor dá feedback
- Tendências emocionais do time — mostra se o gestor está atento à saúde do time
- Proporção de ações do gestor cumpridas vs pendentes — accountability

---

## PARTE D — ESTRATÉGIA DE MIGRAÇÃO

### D1. Contexto

- ~20 artefatos ingeridos
- Backup completo do workspace disponível
- Gestor aceita reprocessar tudo do zero
- `inbox/processados/` está vazio — os artefatos originais (transcrições brutas) precisam ser localizados

### D2. Localizar artefatos originais

**Questão para o Claude Code:** Onde estão os arquivos originais que foram ingeridos?

Possibilidades:
1. Em `pessoas/{slug}/historico/` — os arquivos .md processados contêm o texto do artefato?
2. O pipeline copia o arquivo original para algum lugar antes de processar?
3. Os arquivos estão no backup externo do gestor (fora do workspace)?

O Claude Code deve investigar o pipeline (`processItem()`, `FileReader`, `ArtifactWriter.writeArtifact()`) para entender se o conteúdo original é preservado em algum lugar.

### D3. Plano de migração

```
1. Backup completo do workspace atual
   cp -r "~/Pulse Cockpit" "~/Pulse Cockpit.backup.$(date +%Y%m%d)"

2. Preservar config.yaml de cada pessoa (cadastro, PDI, relação, etc.)
   — Estes NÃO mudam. São dados manuais do gestor.

3. Preservar DemandaRegistry e CicloRegistry do gestor
   — Dados do Módulo Eu que não dependem de ingestão.

4. Localizar artefatos originais (transcrições brutas)
   — Se estão em historico/ como .md processados, extrair o texto original
   — Se estão no backup externo, copiar para inbox/

5. Limpar dados gerados pela ingestão:
   — perfil.md de cada pessoa → resetar para template vazio com config preservada
   — actions.yaml de cada pessoa → limpar (ações serão recriadas)
   — historico/ de cada pessoa → limpar (serão recriados)
   — _coletivo/historico/ → limpar

6. Aplicar schema migration v3 → v4 no template de perfil vazio

7. Reingerir todos os artefatos originais em ordem cronológica
   — Importante: ordem cronológica para que o resumo evolutivo acumule corretamente
   — Pass 1 + Pass 2 + Pass de 1:1 (quando tipo=1on1) + Pass de Cerimônia (quando coletivo)

8. Validar: comparar perfis novos vs backup dos antigos
   — Qualidade das ações melhorou?
   — Resumos são mais específicos?
   — Insights de 1:1 apareceram?
   — Correlações de terceiros foram detectadas?
```

### D4. Ferramenta de reingestão

**Questão para o Claude Code:** Existe hoje alguma forma de reingerir artefatos em batch? Ou seria necessário criar um script/comando que:
1. Lista todos os artefatos originais em ordem cronológica
2. Para cada um, chama o pipeline como se fosse novo
3. Respeita o per-person lock e o max parallelism de 3

Se não existe, criar como utilitário interno (não precisa ser UI — pode ser script CLI).

---

## PARTE E — PLANO DE EXECUÇÃO

### Princípios
- Uma pessoa + Claude Code como copiloto
- Cada fase entrega valor usável
- Corrigir a fonte (ingestão) primeiro
- Horizonte: semanas
- Validação com caso real (1:1 Henrique) a cada fase

### Fase 1 — Refinar prompt genérico (2-3 dias)
**Valor:** todas as ingestões passam a ter ações, resumos e pontos com qualidade.

- [ ] Refinar instruções de `acoes_comprometidas` (responsável, descrição, owner)
- [ ] Refinar instrução de `resumo` (por que, o que decidiu, o que mudou)
- [ ] Refinar instrução de `pontos_de_atencao` (o quê + evidência + impacto)
- [ ] Testar com 3-5 artefatos reais — comparar antes vs depois

### Fase 2 — Pass de Cerimônia melhorado + Pass de 1:1 novo (5-7 dias)
**Valor:** cerimônias geram sinais concretos com contexto; 1:1s capturam tudo.

- [ ] Refinar prompt do Pass de Cerimônia (skills, cruzamento com perfil, feedback)
- [ ] Avaliar viabilidade de injetar perfil compacto no Pass de Cerimônia
- [ ] Criar `prompts/1on1-deep.prompt.ts` com schema `OneOnOneResult`
- [ ] Validação no `SchemaValidator`
- [ ] Chamada no pipeline após Pass 1/2 quando `tipo === "1on1"`
- [ ] Serializar contexto: ações abertas, sinais terceiros, PDI, histórico saúde

### Fase 3 — Perfil v4 + ActionRegistry + sync (4-6 dias)
**Valor:** perfil estruturado, ações com ciclo de vida, dados prontos para downstream.

- [ ] Schema migration v3 → v4
- [ ] Novas seções no perfil: "Insights de 1:1", "Sinais de Terceiros"
- [ ] `ArtifactWriter.update1on1Results()` — aplica OneOnOneResult
- [ ] Novos campos no actions.yaml
- [ ] `ActionRegistry.updateFromFollowup()` e `createFrom1on1Result()`
- [ ] Conexão: acoes_gestor → DemandaRegistry

### Fase 4 — Migração: reprocessar tudo (2-3 dias)
**Valor:** dados limpos desde o dia zero com qualidade dos novos prompts.

- [ ] Localizar artefatos originais
- [ ] Criar script de reingestão em batch (ordem cronológica)
- [ ] Backup + limpeza + reingestão
- [ ] Validação: comparar perfis novos vs antigos

### Fase 5 — Pauta enriquecida + alertas + relatório (4-6 dias)
**Valor:** pauta preparada, alertas inteligentes, relatório robusto para o fórum.

- [ ] Enriquecer prompt de `ai:generate-agenda`
- [ ] Enriquecer pauta com gestor (roll-up)
- [ ] Novos gatilhos no `TeamRiskPanel`
- [ ] Enriquecer prompt de relatório de ciclo
- [ ] Autoavaliação consumindo novos dados
- [ ] UI: insights e sinais na tela de perfil
- [ ] Teste end-to-end: ingerir → perfil → pauta → relatório

---

## PARTE F — INSTRUÇÕES PARA O CLAUDE CODE

### O que ler antes de implementar

1. **Pipeline de ingestão** — `processItem()`, fluxo completo, onde Pass de Cerimônia é chamado
2. **Todos os prompts:**
   - Prompt genérico (Pass 1/2)
   - `cerimonia-sinal.prompt.ts`
   - `agenda.prompt` (pauta 1:1)
   - `agenda-gestor.prompt` (pauta roll-up)
   - `cycle.prompt` (relatório de ciclo)
   - `gestor-ciclo.prompt.ts`
   - `autoavaliacao.prompt.ts`
   - `compression.prompt`
3. **ArtifactWriter** — `updatePerfil()`, `updatePerfilDeCerimonia()`, `writeArtifact()`
4. **ActionRegistry** — criação, atualização, consulta
5. **DemandaRegistry** — schema, como cria demandas
6. **ProfileMigration.ts** — padrão de migration
7. **SchemaValidator** — como adicionar validação
8. **serializeForPrompt()** — que dados são serializados
9. **TeamRiskPanel** — como gatilhos são calculados
10. **FileWatcher + inbox/processados/** — onde os originais vão após ingestão

### Perguntas que o Claude Code DEVE responder antes de começar

1. Onde estão os artefatos originais (transcrições brutas) após processamento?
2. O `processItem()` tem branch por tipo ou fluxo único?
3. O `buildCerimoniaSinalPrompt()` recebe perfil? Qual a assinatura?
4. O `ArtifactWriter.updatePerfilDeCerimonia()` cria seções novas ou só appenda?
5. O `ActionRegistry` tem método para buscar por owner?
6. O prompt de pauta já recebe actions.yaml? Em que formato?
7. O prompt de relatório de ciclo recebe que dados?
8. O `serializeForPrompt()` inclui PDI?
9. Qual o timeout do Claude CLI? 3 passes (1+2+1on1) cabem?
10. O `DemandaRegistry` é compatível com schema de ações para criar espelho automático?
11. Existe forma de reingerir artefatos em batch?

### Regras de implementação

- **Fase 1 primeiro, isolada.** Testar com artefatos reais antes de seguir.
- **Não alterar schema de saída do prompt genérico.** Refinar instruções apenas.
- **Pass de 1:1 é aditivo** — não substitui Pass 1/2.
- **Não alterar seções existentes do perfil.** Apenas adicionar novas.
- **Schema migration obrigatória** para mudanças no frontmatter.
- **Backward compatibility** no actions.yaml — campos novos opcionais.
- **Runtime, não disco** — não persistir dados derivados (padrão existente).
- **Testar com dados reais** a cada fase.
- **Ordem cronológica** na reingestão para resumo evolutivo correto.

### Validação — Caso Henrique a cada fase

| Fase | Verificar |
|------|-----------|
| 1 | Ações saem com responsável correto e descrição autônoma? |
| 2 | Compromisso tácito sobre processo de IA capturado? Correlação com Antonio? |
| 3 | Insight de carreira no perfil? Ação com ciclos_sem_mencao? |
| 4 | Dados reprocessados com qualidade superior aos antigos? |
| 5 | Pauta menciona ação pendente e sinal do Antonio? Relatório narra evolução? |