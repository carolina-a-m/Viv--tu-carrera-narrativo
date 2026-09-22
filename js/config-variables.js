// config-variables.js
// Generado por scripts/simular-rangos.mjs (5000 partidas simuladas). No editar a mano.
//
// RANGOS_VARIABLES: límites duros. Los usa estado.js para acotar valores.
// RANGOS_VISUALES: percentil 5-95 de lo que ocurre en partidas reales,
// ampliado para incluir el valor inicial. Los usa la UI para calcular
// el porcentaje de arcos y barras.

export const RANGOS_VARIABLES = {
  vocacion: { min: -50, max: 50 },
  estabilidad: { min: -50, max: 50 },
  energia: { min: -50, max: 50 },
  confianza: { min: -50, max: 50 },
  exploracion: { min: -50, max: 50 },
  dedicacion: { min: -50, max: 50 },
  tiempo: { min: -50, max: 50 },
  cansancio: { min: -50, max: 50 }
};

export const RANGOS_VISUALES = {
  vocacion: { min: -3, max: 9 },
  estabilidad: { min: 0, max: 8 },
  energia: { min: 1, max: 16 },
  confianza: { min: -1, max: 10 },
  exploracion: { min: -3, max: 7 },
  dedicacion: { min: 0, max: 10 },
  tiempo: { min: 5, max: 6 },
  cansancio: { min: 0, max: 1 }
};
