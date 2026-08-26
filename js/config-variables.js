// config-variables.js
// Rangos de cada variable del juego, usados para calcular
// el porcentaje que se muestra en los indicadores visuales
// (arcos, barras).
//
// Calculados a partir de estadoInicial() (estado.js) + el
// delta teórico acumulado de scripts/calcular-rangos.mjs sobre
// eventos_politica.json + eventos-transversales.json.
//
// Son techos/pisos teóricos (asumen tomar siempre la opción
// que más suma/resta), no un promedio real de partida — varios
// caminos son mutuamente excluyentes. Recalcular con el script
// cada vez que se agreguen carreras o se cierre el contenido
// narrativo.

export const RANGOS_VARIABLES = {
  interes_disciplina: { min: 0, max: 20 },
  dinero: { min: 4, max: 14 },
  energia: { min: -19, max: 14 },
  confianza: { min: 4, max: 49 },
  exploracion: { min: -1, max: 39 },
  progreso: { min: 0, max: 21 },
  rendimiento: { min: 0, max: 13 },
  tiempo: { min: -11, max: 11 },
  cansancio: { min: -2, max: 2 }
};