# FG-08 — Texto original del mensaje del 2026-10-27

Texto literal del mensaje con el que el usuario tomó las decisiones y encargó la tarea que resume [FG-08](FG-08-planetario-core-01.md), y de sus respuestas a las cuatro preguntas de la sesión. No se edita: es la evidencia de las decisiones, no una regla.

Cada texto va entre una línea `~~~~markdown` y una línea `~~~~`. La huella se calcula sobre ese texto sin el salto de línea que precede al cierre, con finales de línea LF (`.gitattributes`). `tools/validar-arquitectura/validar.mjs` (regla F3) la comprueba en cada pull request.

| Bloque | Contenido | SHA-256 del texto guardado aquí | SHA-256 del original recibido |
|---|---|---|---|
| T1 | Mensaje del usuario, adjunto como archivo de texto el 2026-10-27 a las 17:14 (hora de Bogotá) | `daf242d6f1174421aadc507ff26c5cd2074c7d7c9ab1342a11ff80ab4d45256a` | `4d93dd717aaa2ccf4c552ef97ef5f9af4fa1648c4296a3450b130db7c0f0ed70` (con finales de línea CRLF) |
| D2 | Las cuatro preguntas que Claude hizo en modo plan, con la opción que eligió el usuario y la descripción que vio | `e183250c6427a703c9d2fb576fad733f1e2adb6b539632a9a065a59e63c4117a` | Respuestas en la interfaz de la sesión; no hay archivo |

## T1

~~~~markdown
Partimos de `main` tras la fusión del PR #13 (`kernel 1.7.0-DURABLE-KERNEL`, `grafo 0.9`, `modelo_de_carga 0.6`).

Como propietario del proyecto:
1. **Ratifico oficialmente el merge del PR #13 en `main`** y apruebo las dos listas de parámetros que ya se cumplen en `main`.
2. **Resuelvo `PEN-17` (Conexiones directas en el pico de 10.000 sesiones):**
   - Elijo la combinación de **Modo Transacción en Supavisor (puerto 6543, `prepare: false`) para `SlaveReadDatabasePort` (lecturas de una sola consulta sin estado de sesión)** + **pools acotados en Modo Sesión (puerto 5432) exclusivamente para `MasterWriteDatabasePort` y `PostgresSaver`**, de modo que las conexiones directas al motor PostgreSQL 17 en el pico de 10.000 sesiones queden `< 60` (dentro del tope de cómputo Micro de `ADR-0001`), dejando la ampliación de cómputo sujeta únicamente a la prueba de carga de `PEN-14`.
3. **Resuelvo `PEN-16`:** ratifico los supuestos `S1`–`S12` y `S14`–`S17` documentados en `AGENTS.md` y `docs/agentes/*`.

---

### Tarea de Ingeniería: Nodo `PLANETARIO-CORE-01` (Frontera Hexagonal Pura + `ADR-0003` `VerificadorDePagos` + `INV_06`/`INV_07`)

Crea una rama `feat/planetario-core-01-hexagono` desde `main` y construye el primer nodo de código del monorepo cumpliendo estrictamente `AGENTS.md §4` y `§5`:

#### 1. Actualización rápida de `PEN-17` y `PEN-16` en `arquitectura/kernel-durable.json` y `arquitectura/modelo-de-carga.json`
- Registra la decisión de `PEN-17` (lecturas por `SlaveReadDatabasePort` en modo transacción de Supavisor + escrituras en modo sesión con conexiones directas `< 60` en el pico) y marca `PEN-16` como ratificado.

#### 2. Paquete `@planetario/contracts` (`packages/contracts`)
Implementa los esquemas JSON (validados con `Ajv 8`) y sus tipos TypeScript sin ninguna dependencia de infraestructura (`INV_06`):
- **`galaxies-and-catalog.schema.json`:** las 9 Galaxias (9 comunas urbanas de Popayán), jerarquía de búsqueda (`interés -> subcategoría -> tipo de oferta -> producto -> variantes`) y separación entre `Líder del nicho` (planeta central) y `Mejor evaluado`[cite: 3, 4].
- **`order-state-machine.schema.json`:** pedido de **una sola marca** (sin carrito combinado), las modalidades de compra (`domicilio`, `recogida_en_establecimiento`, `pedido_anticipado`, más solicitud de `servicio`), y los estados de `P4` aprobados en `ADR-0003`: `creado -> cobro_emitido -> pagado -> aceptado -> en_camino -> entregado -> evaluado`, más `cobro_vencido`, `cancelado`, `reembolsado` y `pago_informado` (este último exclusivo de la contingencia manual)[cite: 2, 3].
- **`decision-vector-pi.schema.json`:** contrato del vector `Π` publicado por `P13` en `D4` (separando bloque público para `P3`/`P7` del bloque interno según `R04`/`S12`).
- Script `npm run verify:contracts` que compila y valida todos los esquemas con pruebas unitarias.

#### 3. Paquete `@planetario/ports` (`packages/ports`)
Define exclusivamente interfaces puras inyectables (`INV_06` e `INV_07`):
- **`ClockPort` e `IdGeneratorPort` (`S1`):** inyección de tiempo y generación de `UUIDv7` e idempotencia (`INV_02`).
- **`MasterWriteDatabasePort` y `SlaveReadDatabasePort` (`INV_07`):** segregación CQRS donde las lecturas que deciden mutaciones corren en `MasterWriteDatabasePort` (`S2`).
- **`EventLedgerPort` (`INV_01`, `INV_02`, `rule_03`):** firma de `appendCanonicalEvent` exigiendo metadatos obligatorios (`actor`, `agente`, `version_contrato`, `modelo`, `turno`).
- **`VerificadorDePagos` (`ADR-0003`):** puerto con las 3 operaciones exactas aprobadas en `ADR-0003`:
  1. `emitirCobro(entrada: { pedidoId, marcaId, montoCop, llaveIdempotencia }) -> { referenciaCobro, qrPayload, venceEn }`
  2. `consultarCobro(entrada: { marcaId, referenciaCobro }) -> { estado: 'pendiente' | 'pagado' | 'vencido' | 'rechazado', montoCop }`
  3. `validarNotificacion(entrada: { marcaId, encabezados, cuerpoCrudo }) -> { valida: true, eventoProveedorId, referenciaCobro, montoCop, estado } | { valida: false, motivoRechazo: 'firma_invalida' | 'monto_distinto' | 'marca_distinta' | 'formato_invalido' }`
- **`TelegramBrandPort` (`R03`):** despacho hacia el comercio en Telegram restringido a la vista filtrada de la marca.

#### 4. Paquete `@planetario/domain` (`packages/domain`) + Adaptador Simulado de `VerificadorDePagos`
Implementa las funciones puras del núcleo (cero `Date.now()`, `Math.random()`, `crypto.randomUUID()`, `pg`, `fastify`, `grammy`, `ioredis` ni `three`):
- **`policy-gate-omega.ts` (`rule_01`):** evaluación por transacción de `Ω(u,m,t) ∈ {0,1}` (aislamiento multi-marca, prohibición de confirmación/pago por agentes y cortafuegos de visibilidad).
- **`order-state-machine.ts` (`P4` + `R10` + `ADR-0003`):** transiciones deterministas del pedido. Verifica `R10`: un pedido solo pasa a `pagado` mediante notificación validada por `VerificadorDePagos`, consulta autenticada aprobada o, en modo contingencia manual, confirmación firmada por el actor humano responsable de la marca desde `pago_informado`[cite: 2].
- **`brand-visibility-firewall.ts` (`R03` / `R04`):** proyecta para la marca en Telegram únicamente nombre, celular, dirección (exclusivamente si la modalidad es `domicilio`) y los ítems de esa marca.
- **`reputation-and-relevance.ts` (`P9` + `ADR-0004` + `rule_02`):** cálculo del Índice de Relevancia quincenal sobre ventana de 90 días (calificación 40 % + compras 30 % + flujo 20 % + sedes 10 %), promedio bayesiano de `ADR-0004` para marcas nuevas y amortiguación continua `Θ_s(L_m) = min(1, max(0, (1 - L_m) / 0.10))`[cite: 2].
- **Simulador determinista de `VerificadorDePagos` (para pruebas de `ADR-0003` y maqueta):** prueba y certifica todos los casos de `Cómo se confirma` de `ADR-0003` (rechazo por firma inválida, monto distinto o marca distinta, e idempotencia ante eventos repetidos)[cite: 2].

#### 5. Guardián Hexagonal (`npm run verify:hexagon`) y Suite Integral (`npm run test:integral`)
- Crea `tools/verificar-hexagono/verificar.mjs` que inspecciona el AST/imports de `packages/contracts`, `packages/ports` y `packages/domain` y falla si existe cualquier importación prohibida por `AGENTS.md §4.1` (`INV_06`) o violación de dirección (`contracts -> ∅`, `ports -> contracts`, `domain -> ports, contracts`).
- Conecta en `package.json` los comandos del DoD (`AGENTS.md §5`), ejecuta todas las verificaciones en verde, pasa el subagente `critico-adversario` hasta obtener `APROBADO`, abre/fusiona el PR hacia `main` y entrégame únicamente los **dos bloques del Protocolo de Doble Salida (`AGENTS.md §6`)**.
~~~~

## D2

~~~~markdown
Pregunta 1 · PEN-17
PEN-17: el pool size de Supavisor (P) aplica por cada combinación de usuario, base y modo, así que las directas en el pico son hasta 2P + 20 reservadas. Para quedar en < 60, P ≤ 19, y todos los pools en modo sesión de las 11 réplicas deben sumar ≤ 19 (1 conexión de escritura por réplica). ¿Cómo lo cierro?
Opción elegida: P = 19 y pools de 1 (Recomendado)
Descripción de la opción: Escritura 1 por réplica y PostgresSaver 1 en worker y agentes: 18 en sesión, 19 en transacción, 20 reservadas = 57. La prueba de carga lo confirma (PEN-14).

Pregunta 2 · Índice
El Índice de Relevancia (40/30/20/10) no tiene definida en ningún documento la normalización de compras, flujo y sedes. ¿Qué implemento en reputation-and-relevance.ts?
Opción elegida: Solo lo ya decidido
Descripción de la opción: Calificación bayesiana, Θ_s y la ponderación sobre componentes ya normalizados, sin elegir la normalización; queda un pendiente nuevo.

Pregunta 3 · Nicho
El catálogo jerárquico es interés → subcategoría → tipo de oferta → producto → variantes, pero ningún documento dice en qué nivel vive el nicho (el sistema con su Líder y el cupo de ADR-0004). ¿Cuál es?
Opción elegida: Subcategoría (Recomendado)
Descripción de la opción: Por ejemplo, Comida → Hamburguesas: cada subcategoría es un nicho por galaxia.

Pregunta 4 · TypeScript
Para los tipos TypeScript, ¿agrego typescript 6.0.3 como devDependency de la raíz (no de packages/*)? Sirve para comprobar los tipos con tsc --noEmit y para que verify:hexagon lea el AST real de las importaciones.
Opción elegida: Sí, typescript 6.0.3 (Recomendado)
Descripción de la opción: Versión de abril de 2026, sin binarios nativos y con la API de compilador que necesita el guardián. TS 7 todavía no expone esa API estable.
~~~~
