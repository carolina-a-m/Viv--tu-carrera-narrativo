// scripts/simular-rangos.mjs
// Uso (desde la raíz del proyecto): node scripts/simular-rangos.mjs [partidas]

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function buscar(nombre, carpeta = process.cwd()) {
  for (const entrada of fs.readdirSync(carpeta, { withFileTypes: true })) {
    if (entrada.name === 'node_modules' || entrada.name.startsWith('.')) continue;
    const ruta = path.join(carpeta, entrada.name);
    if (entrada.isDirectory()) {
      const encontrada = buscar(nombre, ruta);
      if (encontrada) return encontrada;
    } else if (entrada.name === nombre) {
      return ruta;
    }
  }
  return null;
}

const rutaEstado = buscar('estado.js');
const rutaEventos = buscar('eventos_politica.json');

if (!rutaEstado || !rutaEventos) {
  console.error('No se encontró estado.js o eventos_politica.json dentro de:', process.cwd());
  process.exit(1);
}

const carpetaJs = path.dirname(rutaEstado);
const rutaConfig = path.join(carpetaJs, 'config-variables.js');
const importar = (archivo) =>
  import(pathToFileURL(path.join(carpetaJs, archivo)).href);

const { estadoInicial } = await importar('estado.js');
const {
  siguienteEvento,
  elegirOpcion,
  elegirOpcionConsecuencia,
  iniciarCarrera
} = await importar('motor.js');
const PARTIDAS = Number(process.argv[2]) || 5000;
const CARRERA = 'politica';
const MAX_PASOS = 300;
const MIN_DISPERSION = 8;
const LIMITE_DURO = 50;
const PCT_INICIAL_MIN = 0.2;
const VARIABLES_VISIBLES = [
  'vocacion', 'estabilidad', 'energia',
  'confianza', 'exploracion', 'dedicacion'
];
const VARIABLES_CON_ESTADO_CRITICO = [
  'vocacion', 'estabilidad', 'energia',
  'confianza', 'exploracion'
];

const eventos = JSON.parse(fs.readFileSync(rutaEventos, 'utf8'));

const azar = (lista) => lista[Math.floor(Math.random() * lista.length)];

function registrar(estado, muestras) {
  for (const [clave, valor] of Object.entries(estado.variables)) {
    (muestras[clave] ??= []).push(valor);
  }
}

function jugarPartida(muestras) {
  const estado = estadoInicial();
  iniciarCarrera(estado, CARRERA);
  registrar(estado, muestras);

  for (let paso = 0; paso < MAX_PASOS; paso++) {
    const evento = siguienteEvento(eventos, estado);
    if (!evento || !evento.opciones?.length) break;

    const { consecuencia } = elegirOpcion(estado, evento, azar(evento.opciones));
    registrar(estado, muestras);

    let actual = consecuencia;
    while (actual?.opciones?.length) {
      const r = elegirOpcionConsecuencia(estado, azar(actual.opciones), evento);
      registrar(estado, muestras);
      actual = r.consecuencia;
    }
  }
}

function percentil(ordenado, p) {
  return ordenado[Math.min(ordenado.length - 1, Math.floor(p * ordenado.length))];
}

const muestras = {};
for (let i = 0; i < PARTIDAS; i++) jugarPartida(muestras);

const inicial = estadoInicial().variables;
const visuales = {};
const limites = {};

console.log(`\n${PARTIDAS} partidas simuladas\n`);
console.log('variable'.padEnd(22) + 'p5'.padEnd(8) + 'p95'.padEnd(8) + 'rango visual');

for (const clave of Object.keys(inicial)) {
  const datos = (muestras[clave] ?? [inicial[clave]]).sort((a, b) => a - b);
  const p5 = percentil(datos, 0.05);
  const p95 = percentil(datos, 0.95);
  const valorInicial = inicial[clave];

  let min = Math.min(p5, valorInicial);
  let max = Math.max(p95, valorInicial);

  // Variables con estado crítico: el rango baja 3 puntos por debajo del
  // valor inicial y el inicial nunca queda por debajo del 20% del arco,
  // así ningún arco arranca en rojo.
  if (VARIABLES_CON_ESTADO_CRITICO.includes(clave)) {
    min = Math.min(min, valorInicial - 3);
    if ((valorInicial - min) / (max - min) < PCT_INICIAL_MIN) {
      min = Math.floor(
        (valorInicial - PCT_INICIAL_MIN * max) / (1 - PCT_INICIAL_MIN)
      );
    }
  }

  if (max === min) max = min + 1;

  limites[clave] = { min: -LIMITE_DURO, max: LIMITE_DURO };
  visuales[clave] = { min, max };

  const aviso =
    VARIABLES_VISIBLES.includes(clave) && (max - min) < MIN_DISPERSION
      ? '  ⚠ poco margen: agregar deltas en eventos del tronco principal'
      : '';

  console.log(
    clave.padEnd(22) +
    String(p5).padEnd(8) +
    String(p95).padEnd(8) +
    `${min} … ${max}${aviso}`
  );
}

const linea = (obj) =>
  Object.entries(obj)
    .map(([k, r]) => `  ${k}: { min: ${r.min}, max: ${r.max} }`)
    .join(',\n');

const contenido = `// config-variables.js
// Generado por scripts/simular-rangos.mjs (${PARTIDAS} partidas simuladas). No editar a mano.
//
// RANGOS_VARIABLES: límites duros. Los usa estado.js para acotar valores.
// RANGOS_VISUALES: percentil 5-95 de lo que ocurre en partidas reales,
// ampliado para incluir el valor inicial. Los usa la UI para calcular
// el porcentaje de arcos y barras.

export const RANGOS_VARIABLES = {
${linea(limites)}
};

export const RANGOS_VISUALES = {
${linea(visuales)}
};
`;

fs.writeFileSync(rutaConfig, contenido);

console.log('\nconfig-variables.js actualizado.');