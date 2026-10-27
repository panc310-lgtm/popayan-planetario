@AGENTS.md

## Claude Code

Este repositorio se rige por `AGENTS.md`, importado arriba. No dupliques reglas aquí: toda regla nueva va en `AGENTS.md`, para que también la lean Codex, Gemini CLI y Cursor.

Solo lo propio de Claude Code:

- **Crítico adversario:** antes de entregar, invoca el subagente `critico-adversario` (`.claude/agents/critico-adversario.md`) con la traza de la tarea, la lista de archivos cambiados y la salida de las verificaciones de la fase. Su veredicto va en el bloque `critico` de la telemetría.
- **Modo plan:** úsalo para cualquier cambio en `arquitectura/`, en `docs/adr/` o, desde la fase de código, en `packages/contracts`, `packages/ports`, `packages/domain` o en el registro de eventos.
- **Contexto:** carga los documentos de `docs/agentes/` solo cuando la tabla de AGENTS.md §2 lo indique; no los importes aquí.
