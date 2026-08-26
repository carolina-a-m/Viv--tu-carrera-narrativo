// calcular-rangos.mjs
// Recorre todos los eventos_<carrera>.json + eventos-transversales.json
// y suma los "efectos" posibles por variable, para estimar el rango
// real que puede alcanzar cada una en un playthrough.
//
// Esto da un rango TEÓRICO (si se eligiera siempre la opción que más
// suma/resta esa variable), no un promedio de partida real. Sirve
// como techo/piso de calibración, no como valor exacto.
//
// Uso: node scripts/calcular-rangos.mjs

import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');

function listarArchivosDeEventos() {
  return readdirSync(DATA_DIR).filter(
    (nombre) =>
      nombre.startsWith('eventos_') || nombre === 'eventos-transversales.json'
  );
}

function acumular(objeto, totales, alertasAleatorias, origenArchivo) {
  if (!objeto || typeof objeto !== 'object') return;

  if (objeto.efectos && typeof objeto.efectos === 'object') {
    for (const [variable, delta] of Object.entries(objeto.efectos)) {
      if (typeof delta !== 'number') continue;
      if (!totales[variable]) totales[variable] = { max: 0, min: 0, apariciones: 0 };
      if (delta > 0) totales[variable].max += delta;
      if (delta < 0) totales[variable].min += delta;
      totales[variable].apariciones += 1;
    }
  }

  if (objeto.resultadoAleatorio && objeto.resultadoAleatorio.variable) {
    alertasAleatorias.push({
      archivo: origenArchivo,
      id: objeto.id || '(sin id)',
      variable: objeto.resultadoAleatorio.variable
    });
  }

  for (const valor of Object.values(objeto)) {
    if (Array.isArray(valor)) {
      valor.forEach((item) => acumular(item, totales, alertasAleatorias, origenArchivo));
    } else if (valor && typeof valor === 'object') {
      acumular(valor, totales, alertasAleatorias, origenArchivo);
    }
  }
}

function main() {
  const totales = {};
  const alertasAleatorias = [];

  for (const archivo of listarArchivosDeEventos()) {
    const ruta = join(DATA_DIR, archivo);
    const contenido = JSON.parse(readFileSync(ruta, 'utf-8'));
    if (!Array.isArray(contenido)) continue;
    contenido.forEach((evento) => acumular(evento, totales, alertasAleatorias, archivo));
  }

  console.log('--- Rangos teóricos por variable (min/max acumulado) ---\n');
  for (const [variable, datos] of Object.entries(totales)) {
    console.log(
      `${variable}: min=${datos.min}  max=${datos.max}  (aparece en ${datos.apariciones} opciones)`
    );
  }

  if (alertasAleatorias.length > 0) {
    console.log('\n--- Atención: eventos con resultadoAleatorio (no incluidos en la suma) ---\n');
    alertasAleatorias.forEach((a) =>
      console.log(`${a.archivo} → ${a.id} afecta "${a.variable}" de forma probabilística`)
    );
  }

  console.log('\n--- Objeto listo para pegar en config-variables.js (falta sumar el valor inicial de estado.js) ---\n');
  console.log('export const RANGOS_VARIABLES = {');
  for (const [variable, datos] of Object.entries(totales)) {
    console.log(`  ${variable}: { min: ${datos.min}, max: ${datos.max} },`);
  }
  console.log('};');
}

main();