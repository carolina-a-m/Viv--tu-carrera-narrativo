// metricas.js
// Métricas derivadas: se calculan a partir del estado, no se guardan en él.

import { RANGOS_VISUALES } from './config-variables.js';
import { obtenerOrdenActual } from './motor.js';
import { estadoInicial } from './estado.js';

// Una variable está en estado crítico cuando llega a 0 o menos.
// Excepción: si 0 es su valor de partida (vocación y exploración),
// solo es crítica por debajo de 0.
const UMBRAL_CRITICO_PCT = 0;

// Rendimiento es un porcentaje derivado (arranca cerca del 35%):
// es crítico por debajo de este umbral.
const UMBRAL_CRITICO_RENDIMIENTO_PCT = 30;

const VARIABLES_CON_ESTADO_CRITICO = [
  'vocacion', 'estabilidad', 'energia', 'confianza', 'exploracion'
];

const VALORES_INICIALES = estadoInicial().variables;

// Peso de cada variable en el rendimiento (suman 1).
const PESOS_RENDIMIENTO = {
  dedicacion: 0.20,
  energia: 0.35,
  confianza: 0.30,
  vocacion: 0.15
};

function porcentajeVisual(clave, valor) {
  const rango = RANGOS_VISUALES[clave];
  if (!rango || rango.max === rango.min) return 0;
  const pct = ((valor - rango.min) / (rango.max - rango.min)) * 100;
  return Math.min(100, Math.max(0, pct));
}

// Se usa para el rendimiento, que es un porcentaje derivado.
function esPorcentajeCritico(pct) {
  return pct <= UMBRAL_CRITICO_RENDIMIENTO_PCT;
}

function esCritico(clave, valor) {
  return (
    VARIABLES_CON_ESTADO_CRITICO.includes(clave) &&
    valor <= UMBRAL_CRITICO_PCT &&
    valor !== VALORES_INICIALES[clave]
  );
}

function calcularRendimiento(estado) {
  let total = 0;
  for (const [clave, peso] of Object.entries(PESOS_RENDIMIENTO)) {
    total += peso * porcentajeVisual(clave, estado.variables[clave] ?? 0);
  }
  return Math.round(total);
}

// Etapas obligatorias: órdenes donde al menos un evento no es omitible
// (mismo criterio que usa el motor para no trabarse).
function etapasObligatorias(eventos, estado) {
  const porOrden = new Map();

  for (const evento of eventos) {
    if (typeof evento.orden !== 'number') continue;
    if (
      evento.carrera &&
      evento.carrera !== 'generico' &&
      evento.carrera !== estado.carreraActiva
    ) continue;

    const obligatorio = evento.omitirSiNoCumple !== true;
    porOrden.set(
      evento.orden,
      (porOrden.get(evento.orden) ?? false) || obligatorio
    );
  }

  return [...porOrden.entries()]
    .filter(([, obligatorio]) => obligatorio)
    .map(([orden]) => orden)
    .sort((a, b) => a - b);
}

function calcularProgresoCarrera(eventos, estado) {
  const etapas = etapasObligatorias(eventos, estado);
  if (etapas.length === 0) return 0;

  const orden = obtenerOrdenActual(eventos, estado);
  const paso = 100 / etapas.length;

  let completadas = 0;
  while (completadas < etapas.length && etapas[completadas] <= orden) {
    completadas++;
  }

  if (completadas >= etapas.length) return 100;

  const anterior = completadas === 0 ? 0 : etapas[completadas - 1];
  const siguiente = etapas[completadas];
  const fraccion =
    orden > anterior ? (orden - anterior) / (siguiente - anterior) : 0;

  return Math.round(Math.min(100, (completadas + fraccion) * paso));
}

// ------------------------------------------------------------
// REPRESENTACIÓN PARA EL JUGADOR
// ------------------------------------------------------------
// El valor interno no se modifica: esto solo decide qué se muestra.
// Todo indicador arranca en 0 y con el arco vacío y neutro.
// - Si sube respecto de su valor inicial, el arco se llena y
//   el color aparece hacia el verde.
// - Si baja, el arco se llena hacia el rojo a medida que se
//   acerca al umbral crítico.
// - Si es crítico, arco completo en rojo.

const COLOR_NEUTRO = '#707070';

function mezclarColor(color, porcentaje) {
  const peso = Math.round(35 + (porcentaje * 65) / 100);
  return `color-mix(in srgb, ${color} ${peso}%, ${COLOR_NEUTRO})`;
}

function presentacionIndicador(clave, valor) {
  const base = VALORES_INICIALES[clave] ?? 0;
  const rango = RANGOS_VISUALES[clave];
  const maximo = rango ? rango.max : base + 1;
  const delta = valor - base;

  let porcentaje = 0;
  let color = COLOR_NEUTRO;

  if (esCritico(clave, valor)) {
    porcentaje = 100;
    color = 'var(--rojo)';
  } else if (delta > 0) {
    const tramo = maximo - base;
    porcentaje = tramo > 0 ? Math.min(100, (delta / tramo) * 100) : 100;
    color = mezclarColor('var(--verde)', porcentaje);
  } else if (delta < 0) {
    const puntoCritico = base === 0 ? -1 : UMBRAL_CRITICO_PCT;
    const tramo = base - puntoCritico;
    porcentaje = Math.min(100, (-delta / tramo) * 100);
    color = mezclarColor('var(--rojo)', porcentaje);
  }

  return { delta, porcentaje, color };
}

export {
  UMBRAL_CRITICO_PCT,
  porcentajeVisual,
  esPorcentajeCritico,
  esCritico,
  presentacionIndicador,
  calcularRendimiento,
  calcularProgresoCarrera
};