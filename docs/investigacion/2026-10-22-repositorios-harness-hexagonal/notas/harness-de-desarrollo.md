# Harness de desarrollo con agentes de código: estado del arte (oct-2026) y verificación de `wshobson/agents` y `msitarzewski/agency-agents`

Nota de investigación para el redactor del informe. Fecha de corte: 22-oct-2026. Las métricas de GitHub (estrellas, forks, fechas) se obtuvieron con la API de GitHub (`gh api repos/...`) el 22-oct-2026; se citan con la URL del repositorio. Contexto del repo del proyecto, verificado localmente: no existe `CLAUDE.md` ni `AGENTS.md` en la raíz, `.claude/` contiene solo `settings.local.json` y el CI tiene un único workflow, `.github/workflows/verificaciones.yml`. La fuente Gemini FG-04 (`docs/fuentes/gemini/FG-04-estado-del-arte-repositorios.md`) marca el ciclo "Harness Actor-Crítico + Doble Salida" como `[ABIERTO]` (no adoptado) y ambos repos como `[VIGENTE]` solo como herramienta de desarrollo.

## 1. ¿Existen `wshobson/agents` y `msitarzewski/agency-agents`, y qué contienen realmente frente a lo que afirmó Gemini?

### Takeaway
Los dos repos existen, tienen licencia MIT y están muy activos (último push el 19-oct-2026). Sin embargo, son cosas distintas. `wshobson/agents` es un **marketplace de plugins** multi-harness con agentes, skills y comandos separados, progressive disclosure explícita, una tabla de 4 niveles de modelo (alias estáticos, no enrutamiento dinámico) y `plugin-eval`, cuya única capa no experimental es un lint estático. `agency-agents` es un **catálogo de más de 230 personas** en Markdown que se copian a `~/.claude/agents/`. Incluye "Brand Guardian", "Reality Checker" y "Evidence Collector", pero no tiene secciones literales "Must Do / Never Do", y su "memory" es prosa de personalidad, no memoria persistente.

### Cited Findings
**`wshobson/agents`: metadatos**
- Existe, es público y no está archivado. Licencia MIT, creado el 24-jul-2025, último push el 19-oct-2026. Tiene unas 41.553 estrellas, 4.406 forks y 6 issues/PR abiertos. Descripción: "Multi-harness agentic plugin marketplace for Claude Code, Codex, Cursor, OpenCode, GitHub Copilot, Google Antigravity, and Pi" — [GitHub API / repo](https://github.com/wshobson/agents)
- Actividad: 56 commits desde el 1-sep-2026. Los últimos son correcciones de documentación y de `developer-essentials` (p. ej. "warn before reset --hard", 15-oct-2026) — [commits](https://github.com/wshobson/agents/commits)
- Contenido según el README: "94 plugins, including 92 local plugins and 2 external entries", con 202 agentes, 185 skills y 105 comandos en el código fuente local — [README](https://github.com/wshobson/agents)

**`wshobson/agents`: instalación en Claude Code**
- Se instala como marketplace de plugins: `/plugin marketplace add wshobson/agents` y luego `/plugin install python-development@claude-code-workflows`. Después se invocan comandos con espacio de nombres del plugin (`/python-development:python-scaffold ...`). También soporta Codex CLI, Cursor, OpenCode, Antigravity, Copilot y Pi — [README](https://github.com/wshobson/agents)

**`wshobson/agents`: separación de componentes ("Agent ≠ Skill ≠ Orchestrator")**
- El repo define tres tipos de componente: **Agents**, descritos como "domain experts" con frontmatter `model: fable|opus|sonnet|haiku|inherit` y `tools:` opcional; **Skills**, descritas como "modular knowledge with progressive disclosure", con `references/` y `assets/`; y **Commands** (slash commands) — [ARCHITECTURE.md](https://github.com/wshobson/agents/blob/main/ARCHITECTURE.md)
- La distinción de Gemini es, por tanto, parcialmente correcta. El tercer tipo formal es "command", no "orchestrator". La orquestación aparece como plugins concretos: `agent-orchestration`, `full-stack-orchestration`, `conductor` y `agent-teams` — [plugins/](https://github.com/wshobson/agents/tree/main/plugins)

**`wshobson/agents`: progressive disclosure (confirmado)**
- Invariante 5 de su arquitectura: "Progressive disclosure all the way down. Context files (`AGENTS.md`, `CLAUDE.md`, etc.) cap at ~150 lines. Skill bodies cap at ~8 KB… Detail is loaded on demand, not pre-injected" — [ARCHITECTURE.md](https://github.com/wshobson/agents/blob/main/ARCHITECTURE.md)
- El repo declara que sigue el patrón de "harness engineering" de OpenAI. Tiene un único `AGENTS.md` canónico, con `CLAUDE.md` como symlink, y "Mechanical enforcement with remediation hints" — [ARCHITECTURE.md](https://github.com/wshobson/agents/blob/main/ARCHITECTURE.md)

**`wshobson/agents`: modelos en "cuatro niveles" (confirmado, pero estático)**
- La tabla "Model tiers" es: 1 Opus (arquitectura, seguridad, code review, código de producción); 2 `inherit` (el usuario elige); 3 Sonnet (docs, testing, debugging); 4 Haiku (operaciones rápidas, SEO, despliegue). Los adaptadores traducen estos alias a los IDs de modelo de cada herramienta — [ARCHITECTURE.md](https://github.com/wshobson/agents/blob/main/ARCHITECTURE.md)

**`wshobson/agents`: `plugin-eval` (existe, alcance limitado)**
- Tiene tres capas: lint estático (sin llamadas a modelo), juez LLM (4 llamadas) y Monte Carlo (51 o 101 llamadas). Produce una puntuación 0–100 y badges de Bronze a Platinum. Admite `--threshold` para usarlo como gate de CI — [docs/plugin-eval.md](https://github.com/wshobson/agents/blob/main/docs/plugin-eval.md)
- Advertencia del propio repo: "The LLM judge and Monte Carlo layers are experimental, not validated against human labels". El informe semanal de CI solo ejecuta el lint estático (`--depth quick`), así que los badges por plugin "reflect the lint only" — [docs/plugin-eval.md](https://github.com/wshobson/agents/blob/main/docs/plugin-eval.md)
- Validación del repo: `make generate-all`, `make validate STRICT=1` y `make garden` — [README](https://github.com/wshobson/agents)

**`wshobson/agents`: plugins relevantes para el stack del proyecto (por nombre de directorio)**
- `javascript-typescript` (agentes `javascript-pro.md` y `typescript-pro.md`), `backend-development`, `database-design`, `database-migrations`, `c4-architecture`, `comprehensive-review` (agentes `architect-review.md`, `code-reviewer.md`, `security-auditor.md`), `tdd-workflows`, `unit-testing`, `git-pr-workflows`, `review-agent-governance`, `block-no-verify`, `payment-processing` y `game-development` — [plugins/](https://github.com/wshobson/agents/tree/main/plugins)
- No se identificó ningún plugin específico de Three.js ni de PostgreSQL por nombre — [plugins/](https://github.com/wshobson/agents/tree/main/plugins)

**`msitarzewski/agency-agents`: metadatos**
- Existe y es MIT. Creado el 13-oct-2025, último push el 19-oct-2026. Tiene unas 163.220 estrellas y 26.336 forks. La API reporta 169 issues + PR abiertos; la página muestra 26 issues y 143 PR — [GitHub API / repo](https://github.com/msitarzewski/agency-agents)
- Muy activo: al menos 100 commits desde el 1-sep-2026, en su mayoría merges de lotes de contenido ("content-batch5-6") — [commits](https://github.com/msitarzewski/agency-agents/commits)

**`msitarzewski/agency-agents`: contenido**
- El README anuncia "230+ Specialized Agents" en 18 divisiones: Engineering, Design, Testing, Security, Spatial Computing, GIS, Finance, etc. — [README](https://github.com/msitarzewski/agency-agents)
- La división Engineering incluye `engineering-software-architect.md`, `engineering-backend-architect.md`, `engineering-code-reviewer.md`, `engineering-database-optimizer.md`, `engineering-minimal-change-engineer.md` y `engineering-multi-agent-systems-architect.md` — [engineering/](https://github.com/msitarzewski/agency-agents/tree/main/engineering)
- Plantilla de cada agente: frontmatter (name, description, color), "Identity & Memory", "Core Mission", "Critical Rules", "Technical Deliverables", "Workflow Process" y "Success Metrics" — [README / Contributing](https://github.com/msitarzewski/agency-agents)

**`msitarzewski/agency-agents`: roles citados por Gemini**
- "Brand Guardian" existe en la división Design (`design/design-brand-guardian.md`, unos 11,6 KB). Es un estratega de marca: brand foundation, identidad visual y voz. No es un validador técnico — [design-brand-guardian.md](https://github.com/msitarzewski/agency-agents/blob/main/design/design-brand-guardian.md)
- "Reality Checker" (`testing/testing-reality-checker.md`, unos 10,9 KB) y "Evidence Collector" existen en la división Testing. El Reality Checker tiene "Default to 'NEEDS WORK'" e instrucciones como "Cross-check every claim against actual files, screenshots, and test-results.json — never take a report at face value" — [testing-reality-checker.md](https://github.com/msitarzewski/agency-agents/blob/main/testing/testing-reality-checker.md)
- El "Mandatory Process" del Reality Checker supone un stack concreto: "Verify what was actually built (Laravel or Simple stack)". También invoca `./qa-playwright-capture.sh http://localhost:8000 ...`. La búsqueda de código del repo solo devolvió los `.md` que mencionan ese script; no se localizó el script en sí (búsqueda no concluyente) — [testing-reality-checker.md](https://github.com/msitarzewski/agency-agents/blob/main/testing/testing-reality-checker.md)
- Las reglas aparecen como "🚨 Critical Rules You Must Follow", con viñetas "Never…". No existe una sección literal "Must Do / Never Do" — [testing-reality-checker.md](https://github.com/msitarzewski/agency-agents/blob/main/testing/testing-reality-checker.md)
- Los frontmatter de Reality Checker y Brand Guardian solo traen `name`, `description`, `color`, `emoji` y `vibe`, sin `tools` ni `model` — [testing-reality-checker.md](https://github.com/msitarzewski/agency-agents/blob/main/testing/testing-reality-checker.md), [design-brand-guardian.md](https://github.com/msitarzewski/agency-agents/blob/main/design/design-brand-guardian.md)

**`msitarzewski/agency-agents`: instalación en Claude Code**
- `./scripts/install.sh --tool claude-code` copia los agentes "directly from the repo into `~/.claude/agents/`" sin conversión. Admite filtros (`--division engineering,security`) y `--dry-run`. También se puede copiar a mano (`cp engineering/*.md ~/.claude/agents/`). Soporta además Copilot, Gemini CLI, Cursor, Aider, Codex y otros, y existe una app de escritorio "Agency Agents" — [README](https://github.com/msitarzewski/agency-agents)

**Riesgos documentados por Anthropic que aplican a ambos repos**
- Riesgo de seguridad de plugins: "A Claude Code plugin you install can execute arbitrary code on your machine with your user privileges". Hooks, monitores y servidores MCP corren fuera del sandbox. Con auto-update activado, "the files you reviewed can change on disk". Un marketplace como `claude-code-workflows` (el de wshobson) es "third-party" — [Plugin security and trust](https://code.claude.com/docs/en/plugins/security.md)
- Riesgo de saturación de prompts: si las descripciones de los subagentes no integrados superan 15.000 tokens en conjunto, Claude Code muestra una advertencia al inicio — [Create custom subagents](https://code.claude.com/docs/en/sub-agents)

### Inferences
- **Lo que Gemini acertó:** existencia, progressive disclosure, niveles de modelo, `plugin-eval` y los tres roles. **Lo que exageró:**
  - El "enrutamiento de modelos" es una asignación fija por agente, no un router.
  - `plugin-eval` es en la práctica un linter de estructura. No mide si un agente ayuda.
  - "Must Do / Never Do" no es literal.
  - "Brand Guardian" es un rol de marketing y diseño, no un guardián de invariantes de marca en código.
  - La "memoria" de agency-agents es una sección de prosa. No equivale al campo `memory:` de subagentes de Claude Code.
- **Instalar agency-agents en bloque es arriesgado:** 230+ archivos en `~/.claude/agents/` probablemente sumarían muchas descripciones y podrían acercarse al umbral de 15k tokens. Además, sin `tools:` esos agentes no quedan limitados a solo lectura. La copia selectiva y adaptada es más segura.
- El Reality Checker está escrito para un stack web genérico (Laravel, localhost:8000, capturas). Para este proyecto (TS hexagonal, kernel JSON, budgets 3D) sirve como **inspiración de tono** ("NEEDS WORK por defecto", "evidencia antes que afirmaciones"), no como agente listo para usar.
- `wshobson/agents` es más ingenierizado: adaptadores, validación, `AGENTS.md` de unas 150 líneas, cambios con PR. Pero es un marketplace de terceros con auto-update. Conviene fijar un commit o copiar ("vendorizar") solo los archivos útiles, respetando la atribución MIT.

### Gaps
- No se identificaron las "2 external entries" del marketplace de wshobson ni sus licencias.
- No se midió el tamaño agregado real de las descripciones de agency-agents. La estimación de saturación es inferencia.
- No se encontraron evaluaciones independientes de calidad de ninguno de los dos catálogos. Las estrellas miden popularidad, no eficacia.

## 2. ¿Qué dicen las fuentes primarias 2025–2026 sobre cómo organizar agentes de código, y qué evidencia hay sobre bucles constructor/revisor, revisión independiente y gates de test/eval?

### Takeaway
Las fuentes primarias convergen en un núcleo pequeño:
- un archivo de contexto corto que funciona como **mapa**;
- conocimiento versionado en el repo como sistema de registro;
- especificación antes de implementar;
- **verificación ejecutable** (tests, build, validadores) como condición de "terminado";
- reglas de arquitectura aplicadas **mecánicamente** (linters o tests estructurales con mensajes de remediación);
- un **revisor en contexto fresco**, separado del que escribe.

La evidencia a favor de separar generador y evaluador es real pero cualitativa (Anthropic) y costosa: unas 20 veces más en un experimento. Los propios autores advierten que cada pieza del harness envejece a medida que mejoran los modelos.

### Cited Findings
**Anthropic: Claude Code best practices (docs vigentes)**
- La restricción central es el contexto: "Claude's context window fills up fast, and performance degrades as it fills" — [Best practices](https://code.claude.com/docs/en/best-practices)
- La práctica n.º 1 es dar a Claude una forma de verificar su trabajo: "Give Claude a check it can run: tests, a build, a screenshot". Hay cuatro grados de gate: en el prompt, `/goal`, un **Stop hook** determinista que "blocks the turn from ending until it passes", y un subagente verificador "so the agent doing the work isn't the one grading it" — [Best practices](https://code.claude.com/docs/en/best-practices)
- Flujo recomendado: explorar → planificar (plan mode) → implementar → commit. Para tareas mayores, dejar que Claude entreviste al usuario y escriba `SPEC.md`, y luego ejecutar en una sesión nueva. Las mejores specs "name the files and interfaces involved, state what is out of scope, and end with an end-to-end verification step" — [Best practices](https://code.claude.com/docs/en/best-practices)
- CLAUDE.md debe ser corto: "Bloated CLAUDE.md files cause Claude to ignore your actual instructions!". Hay que incluir decisiones arquitectónicas propias y comandos, y excluir lo que se infiere del código. Los hooks son "deterministic and guarantee the action happens", a diferencia de CLAUDE.md, que es "advisory" — [Best practices](https://code.claude.com/docs/en/best-practices)
- Patrón Writer/Reviewer: "A fresh context improves code review since Claude won't be biased toward code it just wrote" — [Best practices](https://code.claude.com/docs/en/best-practices)
- Paso de revisión adversarial: un subagente revisa el diff contra el plan. Advertencia explícita: "A reviewer prompted to find gaps will usually report some, even when the work is sound… Chasing every finding leads to over-engineering". Por eso se recomienda limitar el revisor a gaps de corrección o de requisitos — [Best practices](https://code.claude.com/docs/en/best-practices)
- Escalado: sesiones paralelas en **git worktrees**; `/batch` reparte un cambio entre 5 y 30 subagentes, cada uno en su worktree; "Agent teams" es experimental y está desactivado por defecto — [Best practices](https://code.claude.com/docs/en/best-practices)

**Anthropic: "Effective harnesses for long-running agents" (26-nov-2025, Justin Young)**
- Hay dos agentes que solo difieren en el prompt inicial: un *initializer* (crea `init.sh`, un log de progreso `claude-progress.txt`, el commit inicial y una lista de más de 200 features en **JSON**, todas en estado fallido) y un *coding agent* que avanza **una feature por sesión** — [Anthropic Engineering](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- Se eligió JSON porque el modelo es menos propenso a alterarlo indebidamente que un Markdown. Los agentes solo pueden cambiar el campo `passes`: "It is unacceptable to remove or edit tests" — [Anthropic Engineering](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- Modos de fallo observados: declarar victoria prematura; marcar como "passing" tras solo tests unitarios o `curl`. Probar E2E con automatización de navegador (Puppeteer MCP) "as a human user would" mejoró los resultados — [Anthropic Engineering](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- Sobre multi-agente, los autores consideran que no está claro si conviene un solo agente generalista o varios. Plantean como hipótesis que agentes especializados (QA, testing, limpieza) "could do an even better job" — [Anthropic Engineering](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)

**Anthropic: "Harness design for long-running application development" (24-mar-2026, Prithvi Rajasekaran)**
- Arquitectura **planner / generator / evaluator**, inspirada en GANs. El evaluator usa Playwright MCP para probar la app corriendo — [Anthropic Engineering](https://www.anthropic.com/engineering/harness-design-long-running-apps)
- Evidencia clave a favor del crítico separado: "agents reliably skew positive when grading their own work". Además, "tuning a standalone evaluator to be skeptical turns out to be far more tractable" que volver autocrítico al generador. La calibración se hizo con ejemplos few-shot y leyendo los logs del evaluador en varias rondas — [Anthropic Engineering](https://www.anthropic.com/engineering/harness-design-long-running-apps)
- "Sprint contracts": antes de cada sprint, generador y evaluador negocian qué se construye y cómo se verifica, comunicándose por archivos. El sprint 3 tuvo 27 criterios — [Anthropic Engineering](https://www.anthropic.com/engineering/harness-design-long-running-apps)
- Coste: ejecución en solitario de 20 min y unos 9 USD, frente al harness completo de 6 h y unos 200 USD ("over 20x more expensive"), con una diferencia de calidad "immediately apparent". La versión V2 con Opus 4.6 costó 3 h 50 min y 124,70 USD — [Anthropic Engineering](https://www.anthropic.com/engineering/harness-design-long-running-apps)
- Con Opus 4.6 se eliminaron los sprints y el evaluador pasó a una sola pasada al final. Se mantuvo el planner, porque sin él el generador infra-dimensionaba el alcance. Lección: "every component in a harness encodes an assumption about what the model can't do on its own". Esas suposiciones deben ponerse a prueba y eliminarse cuando dejan de ser necesarias — [Anthropic Engineering](https://www.anthropic.com/engineering/harness-design-long-running-apps)

**OpenAI: "Harness engineering: leveraging Codex in an agent-first world" (11-feb-2026, Ryan Lopopolo)**
- Cifras: en 5 meses, "on the order of a million lines of code" y unas 1.500 PR, con 3 ingenieros (luego 7), lo que da 3,5 PR por ingeniero y día. Los autores estiman haberlo hecho en "about 1/10th the time"; los humanos no escribieron código directamente — [OpenAI](https://openai.com/index/harness-engineering/)
- `AGENTS.md` como **índice**: "instead of treating AGENTS.md as the encyclopedia, we treat it as the table of contents". Tiene "roughly 100 lines" y el conocimiento vive en `docs/` como "system of record". Linters y jobs de CI validan que la base de conocimiento esté al día y enlazada. Un agente de "doc-gardening" abre PR de corrección — [OpenAI](https://openai.com/index/harness-engineering/)
- Arquitectura por capas fijas por dominio (Types → Config → Repo → Service → Runtime → UI), con aspectos transversales vía "Providers", aplicada "mechanically via custom linters… and structural tests". Los mensajes de error de los lints "inject remediation instructions into agent context" — [OpenAI](https://openai.com/index/harness-engineering/)
- Revisión agente-a-agente: Codex revisa sus cambios y pide revisiones a otros agentes en un bucle "until all agent reviewers are satisfied (effectively this is a Ralph Wiggum Loop)". "Humans may review pull requests, but aren't required to" — [OpenAI](https://openai.com/index/harness-engineering/)
- Política de merge con "minimal blocking merge gates". Los autores la condicionan: "This would be irresponsible in a low-throughput environment" — [OpenAI](https://openai.com/index/harness-engineering/)
- Entropía: el equipo dedicaba los viernes (20 % de la semana) a limpiar "AI slop". Lo sustituyeron por "golden principles" codificados y limpieza recurrente. Pendiente según los autores: "how architectural coherence evolves over years in a fully agent-generated system" — [OpenAI](https://openai.com/index/harness-engineering/)
- Legibilidad de la app: "we made the app bootable per git worktree, so Codex could launch and drive one instance per change" — [OpenAI](https://openai.com/index/harness-engineering/)

**Convención AGENTS.md**
- "A simple, open format for guiding coding agents", custodiado por la Agentic AI Foundation bajo la Linux Foundation y usado por "over 60k open-source projects". En monorepos manda el archivo más cercano en el árbol — [agents.md](https://agents.md/)
- Claude Code lee `AGENTS.md` desde la v2.1.277 si no hay `CLAUDE.md`. Si existen ambos, solo lee `CLAUDE.md`, salvo que este importe `AGENTS.md` — [How Claude remembers your project](https://code.claude.com/docs/en/memory)
- Recomendación de tamaño: "target under 200 lines per CLAUDE.md file". Los imports no reducen el coste de contexto. `.claude/rules/` con `paths:` carga reglas solo al tocar archivos coincidentes — [How Claude remembers your project](https://code.claude.com/docs/en/memory)

**Spec-driven development: GitHub spec-kit**
- Unas 142.452 estrellas, MIT, push el 22-oct-2026 — [GitHub API / spec-kit](https://github.com/github/spec-kit)
- Comandos que lista la página: `/speckit-constitution`, `/speckit-specify`, `/speckit-plan`, `/speckit-tasks`, `/speckit-implement` y `/speckit-converge`. Requiere Python 3.11+ y `uv`; se instala con `uv tool install specify-cli`. Ofrece extensiones y presets, con la advertencia de que el catálogo no está auditado. Los ejemplos usan Copilot — [spec-kit README](https://github.com/github/spec-kit)

**Spec-driven development: Kiro**
- Specs en tres archivos: `requirements.md` (o `bugfix.md`), `design.md` y `tasks.md`. Las tareas se ejecutan en "waves" según un grafo de dependencias. Variantes Requirements-First y Design-First, y "Quick Spec" sin puertas de aprobación — [Kiro docs](https://kiro.dev/docs/specs/)

**Spec-driven development: BMAD-METHOD**
- MIT (con marcas registradas) y unas 54.451 estrellas — [GitHub API / BMAD](https://github.com/bmad-code-org/BMAD-METHOD)
- Línea estable v6.12 (`npx bmad-method install`) y v7 en "preview alpha" con "breaking changes expected"; la v7 se distribuye también como plugin de Claude Code — [BMAD README](https://github.com/bmad-code-org/BMAD-METHOD)

**Evidencia empírica de productividad (fuentes secundarias)**
- El RCT de METR de 2025 (16 desarrolladores expertos, 246 tareas) halló que con IA tardaban un 19 % más, aunque ellos percibían ir un 20 % más rápido — [resumen secundario](https://blog.codercops.com/blog/ai-coding-productivity-2x-not-10x-metr-2026)
- En 2026, METR habría calificado sus nuevos datos como señal poco fiable por sesgo de selección: los desarrolladores no quieren trabajar sin IA — [resumen secundario](https://birchtree.me/blog/an-update-from-the-study-that-said-devs-were-actually-slower-with-coding-agents/). No se verificó contra metr.org.

### Inferences
- **El "Harness Actor-Crítico" de Gemini se corresponde casi uno a uno con el planner/generator/evaluator de Anthropic** y con el writer/reviewer de las best practices. La idea es sólida y está respaldada por fuente primaria.
- Las mismas fuentes primarias añaden tres matices que Gemini no recoge:
  - el crítico debe estar acotado a corrección y requisitos para no inducir sobre-ingeniería;
  - el coste se multiplica;
  - el bucle debe adelgazarse cuando el modelo ya no lo necesita.
- **No hay fuente primaria que respalde la "cápsula didáctica" como práctica de construcción.** Lo más cercano son los estilos de salida oficiales `explanatory-output-style` y `learning-output-style` del marketplace oficial (ver §4), que se activan bajo demanda. La "evidencia antes que afirmación" sí está respaldada: "show evidence rather than asserting success".
- El caso de OpenAI (alto throughput, gates mínimos, revisión solo por agentes) **no es trasladable** a un equipo muy pequeño con congelación el 29-nov y aprobación humana de ADRs. Sí son trasladables las ideas de un AGENTS.md índice de unas 100 líneas, docs como sistema de registro y lints estructurales con mensajes de remediación.
- La evidencia cuantitativa sobre productividad de agentes es débil o discutida. Los argumentos a favor de un harness son cualitativos y vienen de los propios proveedores, que tienen interés comercial.

### Gaps
- No se investigó el **GitHub Copilot coding agent** ni su revisión. Tampoco las convenciones de **Aider** más allá de que lee `AGENTS.md` vía `.aider.conf.yml`; su repo tiene el último push en mayo de 2026 ([GitHub API / aider](https://github.com/Aider-AI/aider)).
- No se confirmó si Kiro usa notación EARS: la página de specs no la menciona.
- No se obtuvo el post primario de METR de 2026 ni la encuesta de mayo-2026.
- No se encontraron estudios controlados independientes que midan la mejora de calidad de un crítico separado frente a la autorrevisión en codebases reales. Lo de Anthropic es un experimento propio, no un benchmark.

## 3. ¿Cómo convertir el repo de arquitectura-como-datos (kernel JSON + validadores de CI + ADRs) en el guardarraíl de los agentes?

### Takeaway
Claude Code ofrece las tres palancas que el proyecto necesita:
- **hooks deterministas**: `PostToolUse` sobre ediciones del kernel JSON para validar al instante, y `Stop` o `PreToolUse` como puertas;
- **subagentes revisores de solo lectura** (`tools: Read, Grep, Glob` o `disallowedTools: Write, Edit`, o `permissionMode: plan`), en contexto fresco;
- **contexto corto** (CLAUDE.md o AGENTS.md como mapa del kernel y del índice de ADRs, más `.claude/rules/` por rutas).

El CI existente sigue siendo la puerta final. Los hooks solo adelantan el feedback.

### Cited Findings
**Hooks: semántica de bloqueo**
- `exit 2` es "blocking error". En `PreToolUse` bloquea la llamada y pasa stderr a Claude. En `Stop`/`SubagentStop` impide terminar y la conversación continúa. En `PostToolUse` la herramienta ya se ejecutó y stderr llega como aviso. `exit 1` no bloquea — [Hooks reference](https://code.claude.com/docs/en/hooks)
- El matcher `"Edit|Write"` permite filtrar por herramienta, y el `if` por handler, por ruta (`"if": "Edit(*.ts)"`). Pero el filtrado con `if` es "best-effort" y no sirve para imponer políticas duras, que deben ir al sistema de permisos — [Hooks reference](https://code.claude.com/docs/en/hooks)
- Tipos de hook: `command`, `http`, `mcp_tool`, `prompt` (evaluación LLM de un turno) y `agent` (subagente con Read/Grep/Glob; "Experimental") — [Hooks reference](https://code.claude.com/docs/en/hooks)
- Se configuran en `.claude/settings.json` (versionable), en plugins o en el frontmatter de skills y subagentes — [Hooks reference](https://code.claude.com/docs/en/hooks)

**Hooks: riesgos operativos**
- Los hooks son "Fail-open by default": si fallan o expiran, la acción continúa. `"onFailure": "block"` (v2.1.295+) cambia ese comportamiento — [Hooks reference](https://code.claude.com/docs/en/hooks)
- Los hooks de proyecto requieren aceptar el diálogo de confianza del workspace — [Hooks reference](https://code.claude.com/docs/en/hooks)
- Las sesiones en la nube no leen `~/.claude/settings.json` local — [Hooks reference](https://code.claude.com/docs/en/hooks)

**CLAUDE.md es contexto, no control**
- Las instrucciones se tratan "as context, not enforced configuration. To block an action regardless of what Claude decides, use a PreToolUse hook" — [How Claude remembers your project](https://code.claude.com/docs/en/memory)

**Subagentes revisores**
- Para un revisor de solo lectura: `tools: Read, Grep, Glob`, o `disallowedTools: Write, Edit`, o `permissionMode: plan` — [Create custom subagents](https://code.claude.com/docs/en/sub-agents)
- Otros campos útiles: `model`, `maxTurns`, `skills` (se inyectan completos), `hooks` propios, `memory` (`project`), `isolation: worktree` y `effort` — [Create custom subagents](https://code.claude.com/docs/en/sub-agents)
- Los subagentes de plugin ignoran `hooks`, `mcpServers` y `permissionMode` — [Create custom subagents](https://code.claude.com/docs/en/sub-agents)
- Los subagentes "start with a fresh context", así que el prompt de delegación debe llevar el contexto necesario. Los de `.claude/agents/` (proyecto) tienen prioridad sobre los de usuario y de plugin — [Create custom subagents](https://code.claude.com/docs/en/sub-agents)

**Revisión integrada en Claude Code**
- `/code-review` revisa el diff en un subagente fresco. Existe "ultrareview" multi-agente en la nube y Code Review en PR de GitHub (planes Team/Enterprise, configurable con `REVIEW.md`). También hay GitHub Actions para responder a `@claude` — [Índice de docs de Claude Code](https://code.claude.com/docs/llms.txt)

**Precedentes de "arquitectura como datos aplicada mecánicamente"**
- OpenAI codifica las capas y las aristas permitidas como linters y tests estructurales con mensajes de remediación — [OpenAI](https://openai.com/index/harness-engineering/)
- wshobson aplica "Mechanical enforcement with remediation hints" en `make validate` y `make garden` — [ARCHITECTURE.md](https://github.com/wshobson/agents/blob/main/ARCHITECTURE.md)
- Anthropic usa una lista de features en JSON que el agente solo puede marcar como pasada, nunca editar ni borrar — [Anthropic Engineering](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)

### Inferences
- **El kernel JSON y su validador ya son el "Crítico determinista"** que el ciclo de Gemini intenta crear con un LLM. La palanca de mayor retorno y menor coste probablemente sea conectar ese validador existente a hooks en tres puntos:
  - `PostToolUse` con matcher `Edit|Write`, que devuelve el error del validador al agente al instante;
  - `Stop`, que no deja cerrar el turno con el kernel inválido;
  - CI como puerta final.
- Siguiendo a OpenAI, conviene que los mensajes del validador incluyan la **remediación** ("qué cambiar"), no solo el error.
- **Disciplina de ADRs:** como las ADRs solo las aprueba el usuario, un hook `PreToolUse` que devuelva `ask` o `deny` al editar ADRs aceptadas, o el propio kernel, convertiría esa regla en mecanismo. Otra opción son reglas `deny` en permisos, que la doc recomienda para políticas duras frente a `if`. Trade-off: más fricción en sesiones legítimas.
- **Crítico LLM de solo lectura:** un subagente de proyecto (`.claude/agents/critico-arquitectura.md`) con `tools: Read, Grep, Glob` y prompt acotado a invariantes del kernel, presupuestos 3D y alcance de la ADR. Debe pedírsele explícitamente "solo gaps de corrección o requisitos" para evitar el sobre-hallazgo documentado. Si necesita ejecutar el validador, darle `Bash` rompe el "solo lectura" estricto. Alternativa: que el validador lo corra el hook y el crítico solo lea la salida.
- Riesgos específicos del entorno (Windows con PowerShell y Git Bash), inferidos:
  - los hooks `command` deben ser portables o invocar `node`/`npx` directamente;
  - el fail-open por defecto puede ocultar un validador roto, por lo que conviene `onFailure: block` en el hook crítico, si la versión instalada lo soporta.
- **Un AGENTS.md o CLAUDE.md índice** (unas 100–150 líneas, al estilo OpenAI/wshobson) que apunte a `arquitectura/`, al índice de ADRs y a los comandos de validación cubriría el hueco actual: el repo no tiene ninguno. `.claude/rules/` con `paths:` puede cargar reglas del dominio 3D o de pagos solo cuando se tocan esos paquetes.

### Gaps
- No se verificó la versión de Claude Code instalada en la máquina del usuario, que determina si existe `onFailure`. Tampoco el tiempo de ejecución del validador del proyecto: un validador lento en `PostToolUse` frena cada edición.
- No se encontró una fuente primaria que documente específicamente "ADR + agentes" como patrón. La recomendación es una extrapolación.

## 4. ¿Hay colecciones curadas y mantenidas de subagentes/skills (TypeScript backend, PostgreSQL, Three.js, revisión de arquitectura) mejores que las dos citadas?

### Takeaway
Para revisión y flujo de trabajo, la opción con menos riesgo es el **marketplace oficial de Anthropic** (`claude-plugins-official`, Apache-2.0, de nivel "official"): incluye `code-review`, `pr-review-toolkit`, `feature-dev`, `typescript-lsp`, `hookify`, `security-guidance`, `claude-md-management` y los estilos explanatory y learning. Para dominios concretos hay colecciones comunitarias activas: VoltAgent para TS/Postgres/architect-reviewer y CloudAI-X/threejs-skills para Three.js. Ninguna está auditada para este stack.

### Cited Findings
**Marketplace oficial de Anthropic**
- `anthropics/claude-plugins-official`: unas 43.855 estrellas, Apache-2.0, push el 22-oct-2026, "Official, Anthropic-managed directory". Plugins: `code-review`, `pr-review-toolkit`, `feature-dev`, `typescript-lsp`, `hookify`, `security-guidance`, `claude-security`, `claude-md-management`, `code-simplifier`, `ralph-loop`, `skill-creator`, `plugin-dev`, `explanatory-output-style` y `learning-output-style` — [GitHub API / claude-plugins-official](https://github.com/anthropics/claude-plugins-official)
- `claude-plugins-official` es un nombre del nivel oficial. Claude Code solo acepta nombres oficiales si la fuente está en `github.com/anthropics/`. El catálogo comunitario fija la mayoría de plugins a un SHA de commit — [Plugin security and trust](https://code.claude.com/docs/en/plugins/security.md)

**Evals oficiales de plugins y skills**
- `claude plugin eval` ejecuta cada caso 3 veces por defecto y compara contra una **línea base sin plugin**. Graders: `regex`, `tool_used`, `tool_order`, `file_exists` (gratuitos), `llm` y `baseline` (con juez). Puede usarse como gate de CI con `--threshold` — [Test plugins with evals](https://code.claude.com/docs/en/plugin-evals.md)
- Es más riguroso que el `plugin-eval` de wshobson porque mide comportamiento frente a una línea base. Coste: aproximadamente casos × ejecuciones × 2 ejecuciones de agente — [Test plugins with evals](https://code.claude.com/docs/en/plugin-evals.md)

**Colecciones comunitarias generales**
- `VoltAgent/awesome-claude-code-subagents`: unas 25.951 estrellas, MIT, push el 11-oct-2026. Incluye `typescript-pro`, `node-specialist`, `postgres-pro`, `architect-reviewer`, `code-reviewer` y `microservices-architect` — [GitHub API / VoltAgent](https://github.com/VoltAgent/awesome-claude-code-subagents)
- `obra/superpowers`: unas 303.660 estrellas, MIT, push el 21-oct-2026, "An agentic skills framework & software development methodology". No se revisó su contenido — [GitHub API / superpowers](https://github.com/obra/superpowers)
- `hesreallyhim/awesome-claude-code`: lista curada de recursos, unas 56.259 estrellas — [GitHub API](https://github.com/hesreallyhim/awesome-claude-code)
- `anthropics/skills`: repositorio público de Agent Skills, unas 183.006 estrellas, sin licencia SPDX detectada — [GitHub API](https://github.com/anthropics/skills)

**Colecciones de dominio (Three.js, PostgreSQL)**
- `CloudAI-X/threejs-skills`: unas 3.683 estrellas, MIT, push el 19-oct-2026. Skills como threejs-fundamentals, lighting y loaders — [GitHub API](https://github.com/CloudAI-X/threejs-skills); descripción en [resultado de búsqueda](https://github.com/cloudai-x/threejs-skills)
- `Impertio-Studio/Three.js-Claude-Skill-Package` (antes OpenAEC-Foundation): 23 estrellas, MIT, último push el 8-jul-2026. Ofrece "24 deterministic skills" para WebGL, WebGPU, R3F, Drei y física — [GitHub API](https://github.com/OpenAEC-Foundation/Three.js-Claude-Skill-Package)
- `supabase/agent-skills`: unas 2.908 estrellas, MIT. Solo es relevante si se usa Supabase — [GitHub API](https://github.com/supabase/agent-skills)
- `vercel-labs/agent-skills`: unas 32.832 estrellas — [GitHub API](https://github.com/vercel-labs/agent-skills)

### Inferences
- Para un **crítico de arquitectura**, ningún catálogo conoce el kernel JSON del proyecto. Un subagente propio y corto, que referencie el kernel y las ADRs, probablemente supera a cualquier "architect-reviewer" genérico (VoltAgent, wshobson `comprehensive-review` o agency-agents `software-architect`). Los genéricos sirven como plantilla de partida.
- **TypeScript:** el plugin oficial `typescript-lsp` da navegación de símbolos y detección de errores tras cada edición, que la doc recomienda para lenguajes tipados. Probablemente aporte más que un prompt "typescript-pro".
- **Three.js:** CloudAI-X tiene tracción y actividad. El paquete de Impertio es más amplio pero apenas tiene adopción. Ambos deben revisarse frente a la versión de three.js y los presupuestos 3D del proyecto antes de usarse.
- **PostgreSQL:** `postgres-pro` (VoltAgent) y `database-design`/`database-migrations` (wshobson) son prompts genéricos. Su valor depende de que se adapten a las convenciones del puerto o adaptador hexagonal del proyecto.

### Gaps
- No se leyó el contenido de VoltAgent, superpowers ni CloudAI-X agente por agente. No se evaluó su calidad, solo metadatos y nombres.
- No se encontró ninguna colección específica de "architecture-as-data" ni de validación de ADRs con agentes.

## 5. ¿Qué opciones vale la pena adoptar en el proceso de construcción hacia el MVP (congelación 29-nov-2026, lanzamiento 10-dic-2026), con sus trade-offs?

### Takeaway
Las fuentes favorecen un **harness mínimo y determinista**: contexto índice, hooks que corren los validadores existentes, un crítico de solo lectura acotado y revisión fresca por PR. Esto es preferible a importar metodologías pesadas o catálogos masivos a cinco semanas de la congelación. El ciclo Actor-Crítico completo de Gemini es defendible como patrón, pero su coste y su mantenimiento deben justificarse por tarea, según la lección "cada componente codifica una suposición". Todas las opciones siguientes son propuestas; la decisión es del usuario vía ADR.

### Cited Findings
- **Fundamento de la opción A (harness nativo mínimo):**
  - verificación ejecutable como primera práctica y Stop hook como gate determinista — [Best practices](https://code.claude.com/docs/en/best-practices)
  - hooks deterministas frente a CLAUDE.md, que es solo consultivo — [Best practices](https://code.claude.com/docs/en/best-practices)
  - CLAUDE.md por debajo de 200 líneas — [Memory](https://code.claude.com/docs/en/memory)
  - AGENTS.md de unas 100 líneas como índice — [OpenAI](https://openai.com/index/harness-engineering/)
- **Fundamento de la opción B (ciclo Actor-Crítico completo):**
  - crítico separado "far more tractable" que la autocrítica — [Anthropic](https://www.anthropic.com/engineering/harness-design-long-running-apps)
  - coste más de 20 veces mayor en un experimento — [Anthropic](https://www.anthropic.com/engineering/harness-design-long-running-apps)
  - riesgo de sobre-ingeniería por críticos que siempre encuentran algo — [Best practices](https://code.claude.com/docs/en/best-practices)
- **Fundamento de la opción C (spec-kit, BMAD o Kiro):** BMAD v7 está en alpha con "breaking changes expected" — [BMAD](https://github.com/bmad-code-org/BMAD-METHOD). El catálogo de extensiones de spec-kit "not audits or endorsements" — [spec-kit](https://github.com/github/spec-kit)
- **Fundamento de la opción D (catálogos de terceros):** los plugins ejecutan código arbitrario y el auto-update cambia archivos ya revisados — [Plugin security](https://code.claude.com/docs/en/plugins/security.md). Hay advertencia por más de 15k tokens de descripciones de subagentes — [Subagents](https://code.claude.com/docs/en/sub-agents)
- **Paralelismo:** worktrees y `/batch` — [Best practices](https://code.claude.com/docs/en/best-practices). La app arrancable por worktree permite probar cada cambio aislado — [OpenAI](https://openai.com/index/harness-engineering/)

### Inferences
**Opción A: harness nativo mínimo (bajo coste, alto encaje)**
- Componentes:
  - un `AGENTS.md` (o `CLAUDE.md`) índice de 100–150 líneas, con mapa del kernel, comandos de validación, regla "las ADR solo las aprueba el usuario" y enlaces a `docs/`;
  - `.claude/settings.json` versionado con hook `PostToolUse` (validador del kernel en ediciones de `arquitectura/**`) y hook `Stop` (typecheck + validadores);
  - un subagente `critico` de solo lectura;
  - uso de `/code-review` antes de abrir la PR.
- Pros: reutiliza el CI y los esquemas existentes, es determinista y tiene coste de tokens marginal.
- Contras: horas de configuración; hooks fail-open por defecto; posible lentitud si el validador es pesado; fricción en Windows con los scripts de hook.

**Opción B: "Actor-Crítico + Doble Salida" completo, a diario**
- Pros: es el patrón con más respaldo cualitativo (Anthropic), y un "sprint contract" escrito encaja con specs basadas en JSON Schema y puertos.
- Contras:
  - multiplica el coste y el tiempo;
  - exige calibrar al crítico (leer sus logs, ejemplos few-shot);
  - la "cápsula didáctica" no tiene respaldo primario como práctica de construcción y consume tokens en cada ciclo.
- Variante más barata: el crítico solo en PR que tocan el kernel, pagos o presupuestos 3D, y la cápsula bajo demanda vía `learning-output-style` o `explanatory-output-style`.
- Matiz de Anthropic: con modelos recientes, un evaluador de **una sola pasada al final** sustituyó a la evaluación por sprint.

**Opción C: metodología SDD externa (spec-kit, BMAD, Kiro)**
- Pros: estructura spec → plan → tareas probada y comunidad grande.
- Contras: duplica artefactos que el proyecto ya tiene (kernel JSON, grafo operacional, ADRs); curva de aprendizaje; BMAD v7 es inestable; Kiro es otro IDE.
- Riesgo alto de churn antes del 29-nov. Encaje probable: tomar ideas (constitución ≈ invariantes del kernel; `tasks.md` por "waves"), no la herramienta.

**Opción D: catálogos `wshobson/agents` y `agency-agents`**
- Pros: plantillas listas; wshobson es bien estructurado y tiene licencia MIT.
- Contras:
  - es un marketplace de terceros con auto-update y posibles hooks propios;
  - los prompts genéricos no conocen el kernel;
  - la instalación masiva de agency-agents arriesga saturación y agentes sin restricción de herramientas;
  - el Reality Checker está atado a Laravel y localhost:8000.
- Forma de menor riesgo: copiar 2–4 archivos concretos a `.claude/agents/` del repo, adaptarlos al kernel, fijarlos al commit de origen y conservar la atribución MIT. Candidatos: `comprehensive-review/architect-review`, `typescript-pro`, el tono del Reality Checker. Mantener ambos repos como "herramienta de desarrollo" encaja con la clasificación del registro.

**Opción E: paralelismo con worktrees**
- Pros: 2–3 sesiones paralelas (p. ej. backend de pagos y escena 3D) sin colisiones.
- Contras: con un equipo muy pequeño, el cuello de botella es la revisión humana de ADRs y PR, no la generación (OpenAI identificó "human QA capacity" como cuello de botella). Más sesiones no acelerarían si la aprobación es secuencial.

**Evals de skills propias**
- Si el proyecto crea skills (p. ej. "validar presupuesto 3D"), `claude plugin eval` con línea base mide si aportan algo. Coste: llamadas de modelo por caso. Antes del MVP probablemente solo compensa para skills críticas.

### Gaps
- No hay datos del proyecto sobre tiempos del validador, frecuencia de PR o gasto de tokens actual para estimar el coste real de las opciones A o B.
- No se encontró evidencia comparativa publicada de A frente a B en equipos de 1–3 personas. La elección depende de pruebas piloto del propio proyecto.
- El cronograma de BMAD v7 (ETA indicado: 16-oct-2026) no se verificó tras esa fecha.
