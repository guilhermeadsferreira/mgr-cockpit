# PRD_TECH — Pulse Cockpit

> Documento vivo — atualizar a cada mudança de stack, arquitetura, schema ou convenção técnica relevante.

**Criado em:** 2026-03-18
**Status:** V1 completa · bugs pós-V1 corrigidos · V2 planejada
**Última atualização:** 2026-03-19

---

## Stack

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| Runtime | Electron + Node.js 20 | Desktop nativo, acesso a FS, sem servidor |
| UI | React 18 + TypeScript | Ecossistema maduro, tipagem forte |
| Estilo | Tailwind CSS + shadcn/ui | Produtividade alta, dark mode fácil |
| IA | Claude Code CLI (`claude -p`) | Usa subscription do usuário — **sem API key** |
| Armazenamento | Sistema de arquivos (Markdown + YAML) | Transparente, portável, editável, versionável |
| File watching | chokidar | Watch robusto de diretórios no Electron |
| PDF parsing | pdf-parse | Extrai texto de PDFs simples |
| YAML | js-yaml | Parse/stringify de config.yaml |
| Build tool | electron-vite | Dev server + build orquestrado (main, preload, renderer) |
| Build/package | electron-builder | Empacotamento para macOS (dmg) |

> **IMPORTANTE:** A IA é invocada via `child_process.spawn('claude', ['-p', prompt])` no Main Process.
> Nunca usar Anthropic API ou API key. O usuário deve ter o Claude Code CLI instalado e autenticado localmente.

---

## Arquitetura

```
Main Process (Node.js)
├── index.ts — BrowserWindow, lifecycle, todos os IPC handlers (em um único arquivo)
├── ingestion/
│   ├── FileWatcher — chokidar, monitora inbox/
│   ├── IngestionPipeline — orquestra fila sequencial
│   ├── FileReader — lê .md/.txt/.pdf
│   ├── ClaudeRunner — spawn do CLI headless + retry + parse JSON
│   └── ArtifactWriter — escreve artefato e atualiza perfil.md
├── registry/
│   ├── PersonRegistry — CRUD de pessoas (config.yaml, perfil.md, historico/, pautas/)
│   ├── DetectedRegistry — pessoas detectadas nos artefatos ainda não cadastradas
│   └── SettingsManager — ~/.pulsecockpit/settings.json
├── prompts/ — funções puras: recebem contexto, retornam string do prompt
│   ├── ingestion.prompt.ts
│   ├── agenda.prompt.ts
│   └── cycle.prompt.ts
└── workspace/
    └── WorkspaceSetup — cria estrutura de pastas do workspace

Renderer Process (React)
├── App.tsx — RouterProvider + Layout shell
├── router.tsx — history stack simples (sem react-router)
├── views/
│   ├── DashboardView — grid de cards (suporta prop `relacao`: liderado/par/gestor)
│   ├── InboxView — drop zone + fila de processamento
│   ├── PersonView — cockpit individual (perfil, artefatos, pautas, relatório)
│   ├── PersonFormView — formulário de cadastro/edição de pessoa
│   ├── CycleReportView — seletor período + geração + exibição (a mover para PersonView em V2)
│   ├── SettingsView — workspace, Claude CLI, notificações
│   └── SetupView — tela de verificação do ambiente (primeira abertura)
├── components/
│   ├── Sidebar.tsx — nav principal + footer do gestor
│   ├── Layout.tsx — wrapper com sidebar fixa
│   └── MarkdownPreview.tsx — renderização de markdown com react-markdown
└── lib/utils.ts — labelNivel, labelRelacao, etc.

IPC Bridge (preload/index.ts)
└── contextBridge → window.api (ping, settings, people, artifacts, detected, ingestion, ai, shell)
```

---

## Estrutura de Arquivos do Projeto

```
mgr-cockpit/
├── package.json
├── electron.vite.config.ts          # electron-vite (main + preload + renderer)
├── electron-builder.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── tsconfig.web.json
│
├── src/
│   ├── main/
│   │   ├── index.ts                 # BrowserWindow, lifecycle, TODOS os IPC handlers
│   │   ├── ingestion/
│   │   │   ├── FileWatcher.ts
│   │   │   ├── IngestionPipeline.ts
│   │   │   ├── FileReader.ts
│   │   │   ├── ClaudeRunner.ts
│   │   │   └── ArtifactWriter.ts
│   │   ├── registry/
│   │   │   ├── PersonRegistry.ts
│   │   │   ├── DetectedRegistry.ts  # pessoas detectadas nos artefatos, não cadastradas
│   │   │   └── SettingsManager.ts
│   │   ├── prompts/
│   │   │   ├── ingestion.prompt.ts
│   │   │   ├── agenda.prompt.ts
│   │   │   └── cycle.prompt.ts
│   │   └── workspace/
│   │       └── WorkspaceSetup.ts
│   │
│   ├── preload/
│   │   └── index.ts                 # contextBridge — window.api
│   │
│   └── renderer/
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── router.tsx           # history stack simples (sem react-router)
│           ├── types/
│           │   ├── ipc.ts           # tipos compartilhados main/renderer
│           │   └── global.d.ts      # tipagem de window.api
│           ├── views/
│           │   ├── DashboardView.tsx    # suporta prop relacao: liderado | par | gestor
│           │   ├── InboxView.tsx
│           │   ├── PersonView.tsx
│           │   ├── PersonFormView.tsx
│           │   ├── CycleReportView.tsx
│           │   ├── SettingsView.tsx
│           │   └── SetupView.tsx        # verificação de ambiente (primeira abertura)
│           ├── components/
│           │   ├── Sidebar.tsx
│           │   ├── Layout.tsx
│           │   └── MarkdownPreview.tsx
│           └── lib/
│               └── utils.ts
```

> **Nota:** não há pasta `ipc/`, `hooks/` nem arquivos `types/person.ts` / `types/artifact.ts`. A estrutura do PRD original era a intenção inicial — o que foi implementado diferiu por razões pragmáticas.

---

## Modelagem de Dados

### Workspace (~Pulse Cockpit/)

```
~/Pulse Cockpit/
  inbox/                     ← drop zone monitorada pelo FileWatcher
  artefatos/
    1on1/
    reuniao/
    daily/
    planning/
    retro/
  pessoas/
    {slug}/
      config.yaml            ← configuração manual (quem é, cargo, relação)
      perfil.md              ← cockpit vivo (atualizado pela IA a cada ingestão)
      historico/             ← artefatos vinculados a essa pessoa
      pautas/                ← pautas de 1:1 geradas
  exports/                   ← relatórios de ciclo gerados
```

### config.yaml (por pessoa)

```yaml
# Versão do schema — para migrações futuras
schema_version: 1

# Identificação
nome: "Maria Silva"
slug: "maria-silva"               # kebab-case, gerado automaticamente, imutável

# Cargo e nível
cargo: "Engenheira de Software"
nivel: "senior"                   # junior | pleno | senior | staff | principal | manager
area: "Plataforma"
squad: "Core Infrastructure"
relacao: "liderado"               # liderado | par | gestor | stakeholder

# Histórico na função
inicio_na_funcao: "2024-06-01"
inicio_na_empresa: "2022-03-15"

# 1:1
frequencia_1on1_dias: 14

# Desenvolvimento
em_processo_promocao: false
objetivo_cargo_alvo: "staff"      # null se não aplicável

# PDI
pdi:
  - objetivo: "Melhorar comunicação com stakeholders"
    status: "em_andamento"        # nao_iniciado | em_andamento | concluido
    prazo: "2026-06-30"

# Contexto manual do gestor
notas_manuais: |
  Está passando por mudança de time desde fevereiro.

# Alertas (gerenciado pelo app)
alerta_ativo: false
motivo_alerta: null

# Metadata (gerenciado pelo app — não editar manualmente)
criado_em: "2026-03-18T10:00:00Z"
atualizado_em: "2026-03-18T10:00:00Z"
```

Campos obrigatórios: `nome`, `slug`, `cargo`, `nivel`, `relacao`. Todos os demais têm defaults.

### perfil.md (cockpit vivo por pessoa)

O `perfil.md` usa frontmatter YAML para campos lidos pelo app (dashboard) e seções Markdown com âncoras para manipulação pelo ArtifactWriter.

```markdown
---
slug: "maria-silva"
nome: "Maria Silva"
schema_version: 1
ultima_atualizacao: "2026-03-18T14:30:00Z"
total_artefatos: 7
ultimo_1on1: "2026-03-15"
acoes_pendentes_count: 3
alertas_ativos: []
saude: "verde"                    # verde | amarelo | vermelho
---

# Perfil Vivo — Maria Silva

## Resumo Evolutivo
<!-- BLOCO GERENCIADO PELA IA — reescrito a cada ingestão -->
...narrativa acumulada...
<!-- FIM DO BLOCO GERENCIADO -->

## Ações Pendentes
<!-- BLOCO GERENCIADO PELA IA — append de novos itens -->
- [ ] Apresentar proposta de observabilidade — comprometido em 2026-03-15
<!-- FIM DO BLOCO GERENCIADO -->

## Pontos de Atenção Ativos
<!-- BLOCO GERENCIADO PELA IA — append apenas -->
- **2026-03-15:** Sobrecarga percebida com acúmulo de responsabilidades
<!-- FIM DO BLOCO GERENCIADO -->

## Conquistas e Elogios
<!-- BLOCO GERENCIADO PELA IA — append apenas -->
- **2026-03-10:** Elogio do CTO pela apresentação de resultados do Q4
<!-- FIM DO BLOCO GERENCIADO -->

## Temas Recorrentes
<!-- BLOCO GERENCIADO PELA IA — lista deduplicada, substituída a cada ingestão -->
- Desenvolvimento técnico (trilha staff)
- Comunicação com stakeholders
<!-- FIM DO BLOCO GERENCIADO -->

## Histórico de Artefatos
<!-- BLOCO GERENCIADO PELA IA — append apenas, nunca reescrito -->
- 2026-03-18 | 1on1 | [2026-03-18-maria-silva.md](../historico/2026-03-18-maria-silva.md)
<!-- FIM DO BLOCO GERENCIADO -->
```

**Regras de atualização por seção:**

| Seção | Estratégia |
|-------|-----------|
| Resumo Evolutivo | Substituição completa do bloco |
| Ações Pendentes | Append de novos itens (gestor marca `[x]` manualmente) |
| Pontos de Atenção | Append apenas |
| Conquistas e Elogios | Append apenas |
| Temas Recorrentes | IA recebe lista atual → devolve atualizada e deduplicada → substitui bloco |
| Histórico de Artefatos | Append apenas, jamais modificado |

Os comentários `<!-- BLOCO GERENCIADO -->` são âncoras que o ArtifactWriter usa via regex para localizar e manipular seções sem parsear Markdown completo.

**Escrita atômica:** ArtifactWriter escreve em `perfil.md.tmp` → `fs.rename` → mantém `perfil.md.bak` como backup.

---

## IPC Channels

### Contrato geral

- Channels `renderer → main`: `ipcMain.handle` (retorna Promise)
- Channels `main → renderer`: `mainWindow.webContents.send`
- Todos os tipos de payload exportados de `src/renderer/types/ipc.ts` (único arquivo compartilhado entre processos)

### Channels

| Channel | Direção | Descrição |
|---------|---------|-----------|
| `ipc:ping` | renderer → main | Health check do IPC bridge |
| `settings:load` | renderer → main | Carrega AppSettings |
| `settings:save` | renderer → main | Persiste AppSettings |
| `settings:detect-claude` | renderer → main | Roda `zsh -l -c "which claude"` |
| `settings:setup-workspace` | renderer → main | Cria pastas + reinicia FileWatcher |
| `settings:select-folder` | renderer → main | Abre dialog nativo de pasta |
| `people:list` | renderer → main | Lista todas as pessoas |
| `people:get` | renderer → main | Retorna uma pessoa por slug |
| `people:save` | renderer → main | Cria ou atualiza config.yaml |
| `people:delete` | renderer → main | Remove pessoa |
| `people:get-perfil` | renderer → main | Lê perfil.md com frontmatter parseado |
| `people:list-pautas` | renderer → main | Lista pautas de uma pessoa |
| `artifacts:list` | renderer → main | Lista artefatos de uma pessoa |
| `artifacts:read` | renderer → main | Lê conteúdo de um artefato por path |
| `detected:list` | renderer → main | Lista pessoas detectadas não cadastradas |
| `detected:dismiss` | renderer → main | Descarta uma pessoa detectada |
| `ingestion:queue` | renderer → main | Retorna fila atual do FileWatcher |
| `ingestion:enqueue` | renderer → main | Enfileira arquivo manualmente |
| `ai:test` | renderer → main | Testa o Claude CLI com prompt simples |
| `ai:generate-agenda` | renderer → main | Gera pauta de 1:1 |
| `ai:cycle-report` | renderer → main | Relatório de ciclo/avaliação |
| `shell:open` | renderer → main | Abre arquivo no editor externo |
| `ingestion:started` | main → renderer | Arquivo entrou na fila |
| `ingestion:completed` | main → renderer | Ingestão concluída com resultado |
| `ingestion:failed` | main → renderer | Erro no processamento |

### window.api (preload)

```typescript
window.api = {
  ping: () => Promise<{ ok: boolean; ts: number }>,
  settings: { load, save, detectClaude, setupWorkspace, selectFolder },
  people:   { list, get, save, delete, getPerfil, listPautas },
  artifacts:{ list, read },
  detected: { list, dismiss },
  ingestion:{ queue, enqueue, onStarted, onCompleted, onFailed, removeListeners },
  ai:       { test, generateAgenda, cycleReport },
  shell:    { open },
}
```

---

## ClaudeRunner — Especificação Técnica

```typescript
spawn(claudeBin, ['-p', prompt], {
  env: { ...process.env },
  timeout: timeoutMs,
})
```

**Fluxo:**
1. Acumula stdout em buffer
2. Ao `close`: se `code !== 0` → lança erro com stderr
3. Tenta `JSON.parse(stdout.trim())`
4. Se falhar: tenta extrair JSON de bloco de código via regex ` ```json\n...\n``` `
5. Se ainda falhar: conta como erro para retry

**Parâmetros:**
- Timeout ingestão: 90s
- Timeout relatório de ciclo: 120s
- Max retries: 2 (backoff linear: `attempt * 2000ms`)

**Detecção do binário:**
- `SettingsManager.detectClaudeBin()` tenta `zsh -l -c "which claude"` (login shell), com fallback para `bash -l`
- Login shell necessário: app empacotado (.dmg) não herda o PATH do terminal (`.zshrc`/`.bashrc` não são carregados)
- Armazena **path absoluto** em `settings.json` (ex: `/usr/local/bin/claude`)
- Nunca depende do PATH em runtime — crítico para app empacotado (dmg)
- Settings UI expõe o path detectado e permite override manual

**FileReader:** trunca conteúdo a 50.000 caracteres com aviso ao usuário para evitar timeouts.

---

## Prompts — Estrutura

### ingestion.prompt.ts

Contexto injetado: People Registry serializado + perfil.md atual da pessoa + conteúdo do artefato.

Retorna JSON com: `tipo`, `data_artefato`, `pessoas_identificadas`, `pessoa_principal`, `resumo`, `acoes_comprometidas`, `pontos_de_atencao`, `elogios_e_conquistas`, `temas_detectados`, `resumo_evolutivo`, `temas_atualizados`, `indicador_saude`, `motivo_indicador`.

### agenda.prompt.ts

Contexto: `config.yaml` da pessoa + `perfil.md` completo.

Retorna JSON com seções: follow-ups de ações, temas a aprofundar, perguntas sugeridas, alertas do gestor.

Exportado como Markdown em `pessoas/{slug}/pautas/YYYY-MM-DD-pauta.md`.

### cycle.prompt.ts

Contexto: `config.yaml` + `perfil.md` + todos os artefatos do período (do mais antigo ao mais recente).

Retorna JSON com: `linha_do_tempo`, `entregas_e_conquistas`, `padroes_de_comportamento`, `evolucao_frente_ao_cargo`, `pontos_de_desenvolvimento`, `conclusao_para_calibracao`, `flag_promovibilidade`.

Exportado como Markdown em `exports/YYYY-MM-DD-{slug}-ciclo.md`.

---

## Plano de Implementação V1

### Fases e dependências

| Fase | Dias | Complexidade | Gate de entrada |
|------|------|--------------|-----------------|
| Fase 0 — Setup técnico | 3 | Baixa | — |
| Fase 1 — Fundação | 4–5 | Baixa-Média | Fase 0 completa + PoC ClaudeRunner validado |
| Fase 2 — Ingestão + Perfil Vivo + Dashboard | 10–12 | Alta | Fase 1 completa |
| Fase 3 — Norte estrela (pauta + relatório) | 7–8 | Média | Fase 2 completa |
| **Total** | **24–28** | | |

### Fase 0 — Setup Técnico

**Gate crítico:** PoC do `claude -p` via spawn deve ser validado antes de avançar.

1. `package.json` com todas as dependências
2. `tsconfig.json` + `tsconfig.main.json` + `tsconfig.renderer.json` (targets diferentes: node20 vs. ESNext/DOM)
3. `vite.config.ts` (renderer) + `vite.main.config.ts` (main)
4. `electron-builder.config.ts` — macOS dmg
5. `src/main/index.ts` — BrowserWindow mínimo
6. `src/preload/index.ts` — contextBridge skeleton com todos os channels declarados
7. `WorkspaceSetup.ts` — cria `~/Pulse Cockpit/{inbox,artefatos/...,pessoas,exports}`
8. **PoC ClaudeRunner** — spawn, captura stdout, valida JSON parseável

### Fase 1 — Fundação

1. `SettingsManager` completo (detecção `claude`, persistência)
2. `SettingsView` — file picker nativo, teste de conexão
3. `PersonRegistry` — CRUD, slug generation, serialização para prompt
4. `PersonForm` + `DashboardView` básico

### Fase 2 — Ingestão + Perfil Vivo + Dashboard

1. `FileReader` — `.md`, `.txt`, `.pdf`
2. `ClaudeRunner` completo
3. `ingestion.prompt.ts`
4. `ArtifactWriter` — artefato + perfil.md com âncoras
5. `IngestionPipeline`
6. `FileWatcher` — chokidar com `awaitWriteFinish` + debounce
7. `InboxView` — drop zone + fila de status
8. `PersonView` + `DashboardView` completo

### Fase 3 — Norte Estrela

1. `agenda.prompt.ts` + handler + UI no PersonView + exportação
2. `cycle.prompt.ts` + handler + seletor período + UI + exportação

---

## Riscos Técnicos

| Risco | Prob. | Mitigação |
|-------|-------|-----------|
| ClaudeRunner retorna não-JSON | Alta | Fallback regex + retry com prompt mais restritivo |
| PATH diferente no app empacotado (dmg) | Alta | Path absoluto em settings.json — detectado na Fase 0 |
| Timeout em artefatos/contextos longos | Média | Truncar input em 50k chars + timeouts configuráveis |
| Corrupção do perfil.md em escrita | Baixa | Fila sequencial + escrita atômica + .bak |
| chokidar eventos duplicados no macOS | Baixa | `awaitWriteFinish: { stabilityThreshold: 2000 }` + debounce 5s por path |
| config.yaml corrompido por edição manual | Média | try/catch com erro descritivo + validação de campos mínimos |

---

## Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `PULSECOCKPIT_WORKSPACE` | Caminho base do workspace | `~/Pulse Cockpit` |
| `CLAUDE_BIN` | Caminho para o binário claude | auto-detect via `which claude` |

---

## Comandos

```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Lint
npm run lint

# Testes
npm test
```

*(Atualizar com os scripts reais após inicializar o projeto na Fase 0)*

---

## Convenções de Código

- Linguagem: TypeScript strict (`"strict": true`)
- Nomenclatura: `camelCase` para variáveis/funções, `PascalCase` para classes/componentes
- Slugs de pessoas: `kebab-case` (ex: `joao-silva`) — gerado via `normalize('NFD')` + replace
- Arquivos de artefato: `YYYY-MM-DD-{slug}.md`
- Arquivos de pauta: `YYYY-MM-DD-pauta.md`
- Arquivos de relatório de ciclo: `YYYY-MM-DD-{slug}-ciclo.md`
- IPC handlers: agrupados por domínio em arquivos separados (`people.handlers.ts`, etc.)
- Prompts: funções puras que recebem parâmetros e retornam string (sem side effects)

---

## Testes

- **Unit:** `ClaudeRunner` (mock do spawn), `FileReader`, `PersonRegistry` (mock do fs)
- **Integration:** pipeline de ingestão ponta a ponta com Claude real (requer `claude` no PATH)
- **E2E:** pendente decisão de framework (Playwright para Electron ou Spectron)
