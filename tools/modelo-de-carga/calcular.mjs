#!/usr/bin/env node
// Modelo de carga único (AUD-11).
// Lee arquitectura/modelo-de-carga.json y las capacidades de arquitectura/grafo-operacional.json,
// calcula cada escenario y escribe:
//   - arquitectura/modelo-de-carga.resultados.json
//   - docs/modelo-de-carga.md
// Uso:
//   node tools/modelo-de-carga/calcular.mjs              escribe los dos archivos
//   node tools/modelo-de-carga/calcular.mjs --check      no escribe; falla si los archivos no coinciden con el cálculo
//   node tools/modelo-de-carga/calcular.mjs --estricto   además falla si un nodo de infraestructura queda en zona crítica

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const RUTA_MODELO = resolve(RAIZ, "arquitectura/modelo-de-carga.json");
const RUTA_GRAFO = resolve(RAIZ, "arquitectura/grafo-operacional.json");
const RUTA_RESULTADOS = resolve(RAIZ, "arquitectura/modelo-de-carga.resultados.json");
const RUTA_REPORTE = resolve(RAIZ, "docs/modelo-de-carga.md");

const leerJson = (ruta) => JSON.parse(readFileSync(ruta, "utf8"));
const modelo = leerJson(RUTA_MODELO);
const grafo = leerJson(RUTA_GRAFO);

const ESCENARIOS = Object.keys(modelo.escenarios);
const PICOS = ["normal", "evento"];
const limite = (clave) => modelo.limites_externos[clave].valor;
const RHO_OBJETIVO = limite("rho_alerta");

// Cuatro cifras significativas en el JSON: suficiente precisión sin ruido de coma flotante.
const redondear = (n) => (Number.isFinite(n) && n !== 0 ? Number(n.toPrecision(4)) : n);
const fmt = new Intl.NumberFormat("es-CO", { maximumSignificantDigits: 3 });
const num = (n) => (Number.isFinite(n) ? fmt.format(n) : "—");

// null = el parámetro no aplica al escenario; un valor ausente es un error del modelo.
function parametrosDe(escenario) {
  const p = {};
  for (const [nombre, def] of Object.entries(modelo.parametros)) {
    const valor = def.valores[escenario];
    if (valor !== null && typeof valor !== "number") throw new Error(`Falta ${nombre} en el escenario ${escenario}`);
    p[nombre] = valor;
  }
  return p;
}

const fijaConcurrencia = (p) => p.concurrentes_objetivo !== null;

// Tasas en la hora pico. m = 1 en el pico normal y factor_pico_evento en el pico de evento.
// Escenarios derivados: la carga sale de los usuarios registrados. Escenario de capacidad: sale de las sesiones fijadas.
function tasasPico(p, m) {
  let concurrentes, pedidosHoraPico, otrosEventosS;
  if (fijaConcurrencia(p)) {
    concurrentes = p.concurrentes_objetivo * m;
    const sesionesHora = (concurrentes * 3600) / p.duracion_sesion_s; // ley de Little, despejada
    pedidosHoraPico = sesionesHora * p.pedidos_por_sesion;
    otrosEventosS = (sesionesHora * (p.otros_eventos_por_dau / p.sesiones_por_dau)) / 3600;
  } else {
    const dau = p.usuarios_registrados * p.fraccion_mau * p.fraccion_dau_de_mau;
    const llegadasSesionesS = (dau * p.sesiones_por_dau * p.fraccion_sesiones_hora_pico * m) / 3600;
    concurrentes = llegadasSesionesS * p.duracion_sesion_s; // ley de Little
    pedidosHoraPico = ((p.usuarios_registrados * p.fraccion_mau * p.pedidos_por_mau_mes) / 30) * p.fraccion_pedidos_hora_pico * m;
    otrosEventosS = (dau * p.otros_eventos_por_dau * p.fraccion_sesiones_hora_pico * m) / 3600;
  }
  const apiS = concurrentes * p.solicitudes_api_por_usuario_activo_s;
  const eventosPedidoS = (pedidosHoraPico * p.eventos_por_pedido) / 3600;
  const eventosNegocioS = eventosPedidoS + otrosEventosS;
  const pedidosMarcaTopS = (pedidosHoraPico * p.fraccion_pedidos_marca_mas_activa) / 3600;
  const turnosAgenteS = concurrentes * p.fraccion_activos_conversando * p.turnos_por_conversacion_s;
  return {
    concurrentes,
    api_s: apiS,
    catalogo_s: apiS * p.fraccion_api_catalogo,
    pedidos_hora_pico: pedidosHoraPico,
    pedidos_s: pedidosHoraPico / 3600,
    pedidos_abiertos: (pedidosHoraPico / 3600) * p.duracion_pedido_s, // ley de Little
    lecturas_catalogo_base_s: apiS * p.fraccion_api_catalogo * p.fraccion_api_a_base,
    redis_s: apiS * p.comandos_redis_por_solicitud_api,
    redis_p13_s: eventosNegocioS * p.comandos_redis_por_evento_p13, // vectores Π y carga por marca (P13 → D4)
    lecturas_base_p13_s: eventosNegocioS * p.lecturas_base_por_evento_p13, // lecturas de P13 en D1 (E69)
    eventos_pedido_s: eventosPedidoS,
    eventos_negocio_s: eventosNegocioS,
    telegram_s: (pedidosHoraPico * p.mensajes_telegram_por_pedido) / 3600,
    pedidos_marca_top_s: pedidosMarcaTopS,
    telegram_chat_top_s: pedidosMarcaTopS * p.mensajes_telegram_por_pedido,
    turnos_agente_s: turnosAgenteS,
    llamadas_modelo_s: turnosAgenteS * p.llamadas_modelo_por_turno,
    base_ops_s:
      apiS * p.fraccion_api_a_base +
      eventosNegocioS * p.escrituras_base_por_evento +
      turnosAgenteS * p.escrituras_estado_agente_por_turno + // puntos de control de los agentes (ADR-0002)
      eventosNegocioS * p.lecturas_base_por_evento_p13, // lecturas de P13 en D1 (E69)
  };
}

// Volúmenes mensuales; no aplican al escenario de capacidad, que describe un pico y no un mes.
function volumenesMes(p) {
  if (fijaConcurrencia(p)) return null;
  const mau = p.usuarios_registrados * p.fraccion_mau;
  const dau = mau * p.fraccion_dau_de_mau;
  const pedidosMes = mau * p.pedidos_por_mau_mes;
  const eventosMes = pedidosMes * p.eventos_por_pedido + dau * p.otros_eventos_por_dau * 30;
  const crecimientoGb = (eventosMes * p.bytes_por_evento) / 1e9;
  const solicitudesApiMes = dau * p.sesiones_por_dau * p.duracion_sesion_s * p.solicitudes_api_por_usuario_activo_s * 30;
  const comandosRedisMes = solicitudesApiMes * p.comandos_redis_por_solicitud_api + eventosMes * p.comandos_redis_por_evento_p13;
  const excedenteRedis = Math.max(0, comandosRedisMes - limite("upstash_comandos_gratis_mes"));
  return {
    mau,
    dau,
    pedidos_mes: pedidosMes,
    pedidos_dia: pedidosMes / 30,
    eventos_mes: eventosMes,
    crecimiento_eventos_gb_mes: crecimientoGb,
    meses_hasta_llenar_disco_incluido: limite("supabase_disco_incluido_gb") / crecimientoGb,
    turnos_agente_mes: mau * p.turnos_agente_por_mau_mes,
    solicitudes_api_mes: solicitudesApiMes,
    comandos_redis_mes: comandosRedisMes,
    costo_upstash_usd_mes: (excedenteRedis / 100000) * limite("upstash_usd_por_100k_comandos"),
    salida_cdn_gb_mes: (mau * p.mb_activos_por_mau_mes) / 1000,
    lecturas_cdn_mes: mau * p.solicitudes_cdn_por_mau_mes,
  };
}

// Costo de una llamada al modelo del agente del usuario (Claude Haiku 5.5). La escritura de caché se omite:
// ocurre una vez por prefijo cada pocos minutos y es despreciable frente al volumen.
const costoPorLlamada = (p) =>
  (p.tokens_entrada_por_llamada * (1 - p.fraccion_entrada_cacheada) * limite("haiku_usd_mtok_entrada") +
    p.tokens_entrada_por_llamada * p.fraccion_entrada_cacheada * limite("haiku_usd_mtok_lectura_cache") +
    p.tokens_salida_por_llamada * limite("haiku_usd_mtok_salida")) /
  1e6;

// Demanda sobre la API de IA en el pico de evento y nivel mínimo de cuenta que la cubre con la utilización objetivo.
function apiIa(p, pico, mes) {
  const llamadasMin = pico.llamadas_modelo_s * 60;
  const itpm = llamadasMin * p.tokens_entrada_por_llamada * (1 - p.fraccion_entrada_cacheada); // la caché no cuenta
  const otpm = llamadasMin * p.tokens_salida_por_llamada;
  const costoLlamada = costoPorLlamada(p);
  const costoMes = mes ? mes.turnos_agente_mes * p.llamadas_modelo_por_turno * costoLlamada : null;
  const cabe = (n) =>
    llamadasMin <= n.rpm * RHO_OBJETIVO &&
    itpm <= n.itpm * RHO_OBJETIVO &&
    otpm <= n.otpm * RHO_OBJETIVO &&
    (costoMes === null || costoMes <= n.tope_gasto_usd_mes * RHO_OBJETIVO);
  return {
    llamadas_min_pico_evento: llamadasMin,
    itpm_sin_cache_pico_evento: itpm,
    otpm_pico_evento: otpm,
    costo_usd_por_llamada: costoLlamada,
    costo_usd_mes: costoMes,
    costo_usd_hora_pico_evento: pico.llamadas_modelo_s * 3600 * costoLlamada,
    nivel_minimo_anthropic: limite("anthropic_niveles_haiku_5_5").find(cabe)?.nivel ?? "Personalizado",
  };
}

// Capacidad μ de un nodo según cómo la declara el grafo:
//   mu_por_s                     valor fijo
//   mu_por_replica + servicio    capacidad por réplica × réplicas del servicio en servicios_de_despliegue
//   nivel_anthropic              el menor de los tres límites del nivel (llamadas, tokens de entrada sin caché y de salida)
function capacidadNodo(id, p) {
  const nodo = grafo.nodos.find((n) => n.id === id);
  const c = nodo?.capacidad;
  if (!c) throw new Error(`El nodo ${id} no tiene capacidad en el grafo`);
  if (typeof c.mu_por_s === "number") return { mu: c.mu_por_s, nombre: nodo.nombre };
  if (typeof c.mu_por_replica === "number") {
    const servicio = grafo.servicios_de_despliegue?.[c.servicio];
    if (typeof servicio?.replicas !== "number") throw new Error(`El nodo ${id} usa el servicio ${c.servicio}, que no tiene réplicas en servicios_de_despliegue`);
    return { mu: c.mu_por_replica * servicio.replicas, nombre: nodo.nombre, servicio: c.servicio, mu_por_replica: c.mu_por_replica, replicas: servicio.replicas };
  }
  if (c.nivel_anthropic) {
    const n = limite("anthropic_niveles_haiku_5_5").find((x) => x.nivel === c.nivel_anthropic);
    if (!n) throw new Error(`El nodo ${id} declara un nivel de Anthropic desconocido: ${c.nivel_anthropic}`);
    const mu = Math.min(
      n.rpm / 60,
      n.itpm / (60 * p.tokens_entrada_por_llamada * (1 - p.fraccion_entrada_cacheada)),
      n.otpm / (60 * p.tokens_salida_por_llamada),
    );
    return { mu, nombre: nodo.nombre, nivel_anthropic: c.nivel_anthropic };
  }
  throw new Error(`El nodo ${id} no declara su capacidad con mu_por_s, mu_por_replica ni nivel_anthropic`);
}

function estadoRho(rho) {
  if (rho >= 1) return "saturado";
  if (rho >= limite("rho_critico")) return "crítico";
  if (rho >= limite("rho_alerta")) return "alerta";
  return "ok";
}

function calcular() {
  const escenarios = {};
  for (const e of ESCENARIOS) {
    const p = parametrosDe(e);
    const picos = { normal: tasasPico(p, 1), evento: tasasPico(p, p.factor_pico_evento) };
    const utilizacion = modelo.mapa_de_capacidad.map(({ nodo, tipo, carga }) => {
      const { mu, ...cap } = capacidadNodo(nodo, p);
      const fila = { nodo, tipo, carga, mu_por_s: mu, ...cap };
      for (const pico of PICOS) {
        fila[`lambda_${pico}`] = picos[pico][carga];
        fila[`rho_${pico}`] = picos[pico][carga] / mu;
      }
      // Capacidad necesaria para que el pico de evento quede en la utilización objetivo.
      fila.mu_requerida = fila.lambda_evento / RHO_OBJETIVO;
      fila.veces_a_escalar = fila.mu_requerida / mu;
      if (cap.mu_por_replica) fila.replicas_necesarias = Math.max(1, Math.ceil(fila.mu_requerida / cap.mu_por_replica));
      fila.estado = estadoRho(fila.rho_evento);
      return fila;
    });
    // Réplicas que necesita cada servicio: las de su nodo más exigido.
    const servicios = Object.fromEntries(
      Object.entries(grafo.servicios_de_despliegue ?? {})
        .filter(([, s]) => typeof s?.replicas === "number")
        .map(([nombre, s]) => {
          const necesarias = utilizacion.filter((u) => u.servicio === nombre).map((u) => u.replicas_necesarias);
          return [nombre, { replicas_provistas: s.replicas, replicas_necesarias: Math.max(1, ...necesarias) }];
        }),
    );
    // Tasa de cada arista mapeada: una magnitud de la hora pico por un factor estructural.
    const aristas = (modelo.mapa_de_aristas ?? []).map(({ arista, carga, factor = 1 }) => {
      const a = grafo.aristas.find((x) => x.id === arista);
      if (!a) throw new Error(`La arista ${arista} del modelo no existe en el grafo`);
      if (typeof picos.normal[carga] !== "number") throw new Error(`La carga ${carga} de la arista ${arista} no existe en el modelo`);
      return { arista, origen: a.origen, destino: a.destino, carga, factor, tasa_normal_s: picos.normal[carga] * factor, tasa_evento_s: picos.evento[carga] * factor };
    });
    const limites = [
      { limite: "Telegram, mensajes por segundo en total", valor: limite("telegram_mensajes_s_total"), carga: "telegram_s" },
      { limite: "Telegram, mensajes por segundo al chat de la marca más activa", valor: limite("telegram_mensajes_s_por_chat"), carga: "telegram_chat_top_s" },
      { limite: "Techo de eventos por segundo (INV_01, por medir)", valor: limite("techo_eventos_s"), carga: "eventos_negocio_s" },
    ].map((l) => {
      const fila = { ...l };
      for (const pico of PICOS) fila[`uso_${pico}`] = picos[pico][l.carga] / l.valor;
      fila.estado = estadoRho(fila.uso_evento);
      return fila;
    });
    const mes = volumenesMes(p);
    escenarios[e] = { picos, mes, ia: apiIa(p, picos.evento, mes), utilizacion, servicios, aristas, limites };
  }
  return escenarios;
}

// Recorre el objeto y redondea todos los números para que el JSON sea estable.
const estabilizar = (v) =>
  Array.isArray(v) ? v.map(estabilizar)
  : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, estabilizar(x)]))
  : typeof v === "number" ? redondear(v)
  : v;

function generarResultados(escenarios) {
  return JSON.stringify(
    {
      documento: "Resultados del modelo de carga",
      generado_por: "tools/modelo-de-carga/calcular.mjs — no editar a mano",
      modelo: `${modelo.documento} v${modelo.version} (${modelo.fecha})`,
      grafo: `grafo-operacional v${grafo.version}`,
      rho_objetivo: RHO_OBJETIVO,
      escenarios: estabilizar(escenarios),
    },
    null,
    2,
  ) + "\n";
}

const tabla = (encabezado, filas) =>
  [`| ${encabezado.join(" | ")} |`, `|${encabezado.map(() => "---").join("|")}|`, ...filas.map((f) => `| ${f.join(" | ")} |`)].join("\n");

const nombreEsc = (e) => modelo.escenarios[e].nombre;
const estadoParam = (def, e) => (typeof def.estado === "string" ? def.estado : def.estado[e]);
const ORDEN_ESTADOS = ["saturado", "crítico", "alerta", "ok"];
const peorEstado = (filas) => ORDEN_ESTADOS.find((s) => filas.some((f) => f.estado === s));

function generarReporte(r) {
  const L = [];
  const todas = ESCENARIOS.flatMap((e) => r[e].utilizacion.map((u) => ({ e, ...u })));
  const ref = modelo.referencias_previas.grafo_v0_3;
  const cap = r.capacidad.picos.normal;
  const infraCriticos = r.capacidad.utilizacion.filter((u) => u.tipo === "infraestructura" && u.rho_evento >= limite("rho_critico"));

  L.push("# Modelo de carga — resultados", "");
  L.push(`> Generado por \`tools/modelo-de-carga/calcular.mjs\` desde \`arquitectura/modelo-de-carga.json\` (v${modelo.version}) y \`arquitectura/grafo-operacional.json\` (v${grafo.version}). No se edita a mano: se cambian los parámetros y se vuelve a ejecutar.`, "");
  L.push(
    `El requisito es sostener **${num(cap.concurrentes)} sesiones simultáneas**. Con las capacidades actuales del grafo v${grafo.version}, ` +
      (infraCriticos.length
        ? `${infraCriticos.length} nodos de infraestructura quedan en zona crítica o saturados en ese pico (${infraCriticos.map((u) => u.nodo).join(", ")}); el plan de capacidad dice cuánto hay que escalar cada uno. `
        : "ningún nodo de infraestructura queda en zona crítica en ese pico. ") +
      `Como referencia, el uso esperado es de ${num(r.mvp.picos.normal.concurrentes)} sesiones simultáneas en una hora pico normal del MVP, ${num(r.mvp.picos.evento.concurrentes)} el día de lanzamiento y ${num(r.diseno.picos.normal.concurrentes)} en el escenario de diseño.`,
    "",
  );

  L.push("## Lectura", "");
  L.push(`- En el pico de capacidad la integral de eventos recibe ${num(cap.eventos_negocio_s)} eventos de negocio por segundo, el ${num((cap.eventos_negocio_s / limite("techo_eventos_s")) * 100)} % del techo de ~${num(limite("techo_eventos_s"))} por segundo de INV_01 (por medir en PEN-09). El registro de eventos no es el cuello de botella.`);
  if (infraCriticos.length) {
    const mayor = [...infraCriticos].sort((a, b) => b.veces_a_escalar - a.veces_a_escalar)[0];
    L.push(`- Lo que más hay que escalar es ${mayor.nodo}, ${mayor.nombre}: ${num(mayor.veces_a_escalar)} veces su capacidad actual. ${modelo.mapa_de_capacidad.find((m) => m.nodo === mayor.nodo).palanca}`);
  }
  const externos = r.capacidad.utilizacion.filter((u) => u.tipo === "externo" && u.rho_evento >= limite("rho_alerta"));
  for (const u of externos) {
    L.push(`- ${u.nodo}, ${u.nombre}, depende de un proveedor: necesita ${num(u.mu_requerida)} por segundo frente a ${num(u.mu_por_s)} supuestos hoy. ${modelo.mapa_de_capacidad.find((m) => m.nodo === u.nodo).palanca}`);
  }
  const humanos = todas.filter((u) => u.tipo === "humano").sort((a, b) => b.rho_evento - a.rho_evento)[0];
  if (humanos && humanos.rho_evento >= limite("rho_alerta")) {
    L.push(`- El límite humano aparece antes que el técnico: la marca más activa acepta pedidos a mano en Telegram (${num(humanos.mu_por_s * 60)} por minuto) y en el escenario ${nombreEsc(humanos.e)} recibiría ${num(humanos.rho_evento)} veces los pedidos que puede atender. La protección es la pausa automática al superar 15 pedidos pendientes (R06, T10).`);
  }
  L.push(`- En el pico de capacidad hay ${num(cap.pedidos_abiertos)} pedidos abiertos a la vez, cada uno con una conexión de aviso en vivo al comprador (E63).`);
  const iaCap = r.capacidad.ia;
  L.push(`- El pico de capacidad hace ${num(iaCap.llamadas_min_pico_evento)} llamadas por minuto a la API de IA y exige como mínimo el nivel **${iaCap.nivel_minimo_anthropic}** de la cuenta de Anthropic; una hora así cuesta unos US$${num(iaCap.costo_usd_hora_pico_evento)}. Una cuenta nueva empieza en un nivel menor: el aumento se solicita antes del lanzamiento oficial.`);
  const disco = ESCENARIOS.filter((e) => r[e].mes).map((e) => ({ e, meses: r[e].mes.meses_hasta_llenar_disco_incluido })).sort((a, b) => a.meses - b.meses)[0];
  if (disco && disco.meses < 24) {
    L.push(`- En el escenario ${nombreEsc(disco.e)}, los eventos llenan los ${num(limite("supabase_disco_incluido_gb"))} GB incluidos en Supabase Pro en ${num(disco.meses)} meses; desde ahí, US$${num(limite("supabase_usd_por_gb_extra"))} por GB al mes.`);
  }
  for (const e of ESCENARIOS) {
    if (r[e].mes && r[e].mes.costo_upstash_usd_mes > limite("upstash_plan_fijo_usd_mes")) {
      L.push(`- En el escenario ${nombreEsc(e)}, Upstash por uso costaría US$${num(r[e].mes.costo_upstash_usd_mes)} al mes; por encima de US$${num(limite("upstash_plan_fijo_usd_mes"))} conviene evaluar su plan fijo.`);
    }
  }
  const listaReplicas = (e) => Object.entries(r[e].servicios).map(([s, v]) => `${v.replicas_necesarias} de \`${s}\``).join(", ");
  if (Object.keys(r.capacidad.servicios).length) {
    L.push(`- Réplicas necesarias en el pico de capacidad: ${listaReplicas("capacidad")}. En el MVP alcanzan ${listaReplicas("mvp")}.`);
  }
  L.push("");

  L.push("## Escenarios", "");
  L.push(
    tabla(
      ["Escenario", "Periodo", "Usuarios registrados", "Sesiones simultáneas fijadas", "Marcas", "Descripción"],
      ESCENARIOS.map((e) => {
        const s = modelo.escenarios[e];
        return [s.nombre, s.periodo, num(modelo.parametros.usuarios_registrados.valores[e]), num(modelo.parametros.concurrentes_objetivo.valores[e]), s.marcas, s.descripcion];
      }),
    ),
    "",
  );

  L.push("## Tasas en la hora pico", "");
  L.push("Pico normal y, entre paréntesis, pico de evento. En el escenario de capacidad los dos coinciden: el requisito ya es el pico.", "");
  const filasPico = [
    ["Sesiones simultáneas", "concurrentes"],
    ["Solicitudes a la API por segundo", "api_s"],
    ["Pedidos en la hora pico", "pedidos_hora_pico"],
    ["Pedidos abiertos (conexiones de aviso en vivo)", "pedidos_abiertos"],
    ["Eventos de negocio por segundo", "eventos_negocio_s"],
    ["Mensajes de Telegram por segundo", "telegram_s"],
    ["Turnos del agente por segundo", "turnos_agente_s"],
    ["Llamadas a la API de IA por segundo", "llamadas_modelo_s"],
    ["Operaciones en la base por segundo", "base_ops_s"],
  ];
  L.push(tabla(["Magnitud", ...ESCENARIOS.map(nombreEsc)], filasPico.map(([t, k]) => [t, ...ESCENARIOS.map((e) => `${num(r[e].picos.normal[k])} (${num(r[e].picos.evento[k])})`)])), "");

  L.push("## Plan de capacidad", "");
  L.push(`Capacidad μ que necesita cada nodo para que el pico de evento más alto de los tres escenarios quede en ρ = ${num(RHO_OBJETIVO)}, frente a la μ actual del grafo v${grafo.version}. Solo se listan los nodos que hay que escalar.`, "");
  const plan = modelo.mapa_de_capacidad
    .map((m, i) => {
      const peor = ESCENARIOS.map((e) => ({ e, ...r[e].utilizacion[i] })).sort((a, b) => b.mu_requerida - a.mu_requerida)[0];
      return { ...m, ...peor };
    })
    .filter((f) => f.veces_a_escalar > 1)
    .sort((a, b) => b.veces_a_escalar - a.veces_a_escalar);
  L.push(
    plan.length
      ? tabla(
          ["Nodo", "Tipo", "Escenario", "Carga en el pico por segundo", "μ actual", "μ requerida", "Veces", "Cómo se escala"],
          plan.map((f) => [`${f.nodo} ${f.nombre}`, f.tipo, nombreEsc(f.e), num(f.lambda_evento), num(f.mu_por_s), num(f.mu_requerida), num(f.veces_a_escalar), f.palanca]),
        )
      : "Ningún nodo necesita escalar.",
    "",
  );

  const nombresServicios = Object.keys(r.capacidad.servicios);
  if (nombresServicios.length) {
    L.push("## Réplicas por servicio", "");
    L.push(`Réplicas que necesita cada servicio para que todos sus nodos queden en ρ ≤ ${num(RHO_OBJETIVO)} en el pico de evento, frente a las provistas en \`servicios_de_despliegue\` del grafo v${grafo.version}. La capacidad de cada nodo es su capacidad por réplica por las réplicas provistas.`, "");
    L.push(
      tabla(
        ["Servicio", "Réplicas provistas", ...ESCENARIOS.map((e) => `Necesarias: ${nombreEsc(e)}`)],
        nombresServicios.map((s) => [`\`${s}\``, num(r.capacidad.servicios[s].replicas_provistas), ...ESCENARIOS.map((e) => num(r[e].servicios[s].replicas_necesarias))]),
      ),
      "",
    );
  }

  L.push("## API de IA", "");
  L.push(`Agente del usuario con Claude Haiku 5.5. Demanda en el pico de evento, costos y nivel mínimo de cuenta de Anthropic que la cubre con utilización ${num(RHO_OBJETIVO)} en llamadas, tokens y tope de gasto mensual. Los tokens leídos de caché no cuentan para el límite de entrada.`, "");
  const filasIa = [
    ["Llamadas al modelo por minuto", "llamadas_min_pico_evento"],
    ["Tokens de entrada sin caché por minuto", "itpm_sin_cache_pico_evento"],
    ["Tokens de salida por minuto", "otpm_pico_evento"],
    ["Costo por llamada (US$)", "costo_usd_por_llamada"],
    ["Costo de la IA al mes (US$)", "costo_usd_mes"],
    ["Costo de una hora en el pico de evento (US$)", "costo_usd_hora_pico_evento"],
    ["Nivel mínimo de cuenta de Anthropic", "nivel_minimo_anthropic"],
  ];
  L.push(tabla(["Magnitud", ...ESCENARIOS.map(nombreEsc)], filasIa.map(([t, k]) => [t, ...ESCENARIOS.map((e) => (typeof r[e].ia[k] === "string" ? r[e].ia[k] : num(r[e].ia[k])))])), "");

  L.push("## Utilización de los nodos del grafo", "");
  L.push(`Utilización ρ = carga / capacidad actual del nodo (μ en el grafo v${grafo.version}). Alerta desde ${num(limite("rho_alerta"))}, crítico desde ${num(limite("rho_critico"))} (T01). Pico normal y, entre paréntesis, pico de evento; el estado corresponde al pico de evento.`, "");
  L.push(
    tabla(
      ["Nodo", "Tipo", "μ por segundo", ...ESCENARIOS.map(nombreEsc), "Estado más alto"],
      r.mvp.utilizacion.map((u0, i) => {
        const filas = ESCENARIOS.map((e) => r[e].utilizacion[i]);
        return [`${u0.nodo} ${u0.nombre}`, u0.tipo, num(u0.mu_por_s), ...filas.map((f) => `${num(f.rho_normal)} (${num(f.rho_evento)})`), peorEstado(filas)];
      }),
    ),
    "",
  );

  L.push("## Volúmenes mensuales", "");
  L.push("El escenario de capacidad describe un pico, no un mes, y no tiene volúmenes mensuales.", "");
  const filasMes = [
    ["Usuarios activos en el mes (MAU)", "mau"],
    ["Usuarios activos por día (DAU)", "dau"],
    ["Pedidos al mes", "pedidos_mes"],
    ["Eventos al mes en planetario_events", "eventos_mes"],
    ["Crecimiento de planetario_events (GB al mes)", "crecimiento_eventos_gb_mes"],
    ["Meses hasta llenar los 8 GB incluidos en Supabase Pro (solo eventos)", "meses_hasta_llenar_disco_incluido"],
    ["Turnos del agente al mes", "turnos_agente_mes"],
    ["Comandos de Redis al mes", "comandos_redis_mes"],
    ["Costo de Upstash por encima del nivel gratuito (US$ al mes)", "costo_upstash_usd_mes"],
    ["Salida del CDN (GB al mes)", "salida_cdn_gb_mes"],
    ["Lecturas al CDN al mes", "lecturas_cdn_mes"],
  ];
  const conMes = ESCENARIOS.filter((e) => r[e].mes);
  L.push(tabla(["Magnitud", ...conMes.map(nombreEsc)], filasMes.map(([t, k]) => [t, ...conMes.map((e) => num(r[e].mes[k]))])), "");

  L.push("## Límites externos", "");
  L.push(tabla(["Límite", "Valor", ...ESCENARIOS.map(nombreEsc)], r.mvp.limites.map((l, i) => [l.limite, num(l.valor), ...ESCENARIOS.map((e) => `${num(r[e].limites[i].uso_normal)} (${num(r[e].limites[i].uso_evento)})`)])), "");
  L.push("Fracción del límite usada en el pico normal y, entre paréntesis, en el pico de evento.", "");

  if (r.mvp.aristas.length) {
    L.push("## Tasas por arista", "");
    L.push(`Tasa en la hora pico de cada arista del grafo v${grafo.version} que lleva carga en tiempo de ejecución, por segundo: pico normal y, entre paréntesis, pico de evento. El factor es estructural (por ejemplo, tres botones por pedido).`, "");
    L.push(
      tabla(
        ["Arista", "Origen → destino", "Magnitud", "Factor", ...ESCENARIOS.map(nombreEsc)],
        r.mvp.aristas.map((a0, i) => [a0.arista, `${a0.origen} → ${a0.destino}`, a0.carga, num(a0.factor), ...ESCENARIOS.map((e) => `${num(r[e].aristas[i].tasa_normal_s)} (${num(r[e].aristas[i].tasa_evento_s)})`)]),
      ),
      "",
    );
    const mapeadas = new Set(r.mvp.aristas.map((a) => a.arista));
    const sinTasa = grafo.aristas.filter((a) => !mapeadas.has(a.id)).map((a) => a.id);
    L.push(`Sin tasa modelada (${sinTasa.length}): ${sinTasa.join(", ")}. Son aristas de control y gobierno, de construcción, del cliente, de Noticias, de telemetría o de fase 2; su tasa se agrega al modelo cuando haga falta dimensionarlas.`, "");
  }

  L.push("## Comparación con los supuestos anteriores", "");
  const gem = modelo.referencias_previas.gemini_fg03;
  L.push(
    tabla(
      ["Magnitud", `Grafo v${ref.version} (supuestos_pico)`, "Gemini (FG-03)", ...ESCENARIOS.map(nombreEsc)],
      [
        ["Sesiones simultáneas en pico", num(ref.concurrentes_pico), `${num(gem.concurrentes_pico[0])} a ${num(gem.concurrentes_pico[1])}`, ...ESCENARIOS.map((e) => num(r[e].picos.normal.concurrentes))],
        ["Pedidos en la hora pico", num(ref.pedidos_hora_pico), "—", ...ESCENARIOS.map((e) => num(r[e].picos.normal.pedidos_hora_pico))],
        ["Eventos de negocio por segundo", num(ref.eventos_negocio_s), `${num(gem.eventos_negocio_s[0])} a ${num(gem.eventos_negocio_s[1])}`, ...ESCENARIOS.map((e) => num(r[e].picos.normal.eventos_negocio_s))],
        ["Solicitudes a la API por segundo", num(ref.api_s), `${num(gem.lecturas_s[0])} a ${num(gem.lecturas_s[1])} (lecturas)`, ...ESCENARIOS.map((e) => num(r[e].picos.normal.api_s))],
      ],
    ),
    "",
  );
  L.push(`Los supuestos_pico del grafo v${ref.version} ponían ${num(ref.pedidos_hora_pico)} pedidos en la hora pico y ${num(ref.pedidos_mes)} pedidos al mes (${num(ref.pedidos_mes / 30)} por día): la hora pico tenía más pedidos que el día entero. Este modelo los reemplazó y deriva las dos cifras de las mismas definiciones.`, "");

  L.push("## Por definir", "");
  const abiertos = [
    ...ESCENARIOS.filter((e) => /por definir/.test(modelo.escenarios[e].marcas)).map((e) => `- **Marcas** en ${nombreEsc(e)}: ${modelo.escenarios[e].marcas}. No cambia las tasas del sistema; solo la carga por marca, que usa fraccion_pedidos_marca_mas_activa.`),
    ...ESCENARIOS.flatMap((e) =>
      Object.entries(modelo.parametros).filter(([, d]) => d.valores[e] !== null && estadoParam(d, e) === "por_confirmar").map(([n, d]) => `- **${n}** en ${nombreEsc(e)}: ${num(d.valores[e])} ${d.unidad}. ${d.origen}`),
    ),
  ];
  L.push(...(abiertos.length ? abiertos : ["- Nada."]), "");

  L.push("## Supuestos que se calibran con la telemetría del MVP", "");
  for (const [n, d] of Object.entries(modelo.parametros)) {
    if (ESCENARIOS.some((e) => d.valores[e] !== null && estadoParam(d, e) === "supuesto")) L.push(`- **${n}** (${d.unidad}): ${d.como_se_mide}`);
  }
  L.push("");
  return L.join("\n");
}

const resultados = calcular();
const salidas = [
  [RUTA_RESULTADOS, generarResultados(resultados)],
  [RUTA_REPORTE, generarReporte(resultados)],
];
const criticosInfra = ESCENARIOS.flatMap((e) =>
  resultados[e].utilizacion.filter((u) => u.tipo === "infraestructura" && u.rho_evento >= limite("rho_critico")).map((u) => `${e}/${u.nodo} (ρ = ${num(u.rho_evento)})`),
);
const estricto = process.argv.includes("--estricto");

if (process.argv.includes("--check") || estricto) {
  const normalizar = (s) => s.replace(/\r\n/g, "\n");
  const distintos = salidas.filter(([ruta, texto]) => {
    try { return normalizar(readFileSync(ruta, "utf8")) !== texto; } catch { return true; }
  });
  for (const [ruta] of distintos) console.error(`Desactualizado: ${ruta}. Ejecute node tools/modelo-de-carga/calcular.mjs`);
  for (const c of criticosInfra) console[estricto ? "error" : "warn"](`Nodo de infraestructura en zona crítica: ${c}`);
  process.exit(distintos.length || (estricto && criticosInfra.length) ? 1 : 0);
}

for (const [ruta, texto] of salidas) writeFileSync(ruta, texto, "utf8");
console.log(`Escrito: ${RUTA_RESULTADOS}`);
console.log(`Escrito: ${RUTA_REPORTE}`);
if (criticosInfra.length) console.warn(`Nodos de infraestructura en zona crítica (ver el plan de capacidad): ${criticosInfra.join(", ")}`);
