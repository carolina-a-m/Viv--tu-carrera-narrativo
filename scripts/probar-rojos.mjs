// scripts/probar-rojos.mjs
// Uso (desde la raíz del proyecto): node scripts/probar-rojos.mjs [partidas]

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
const importar = (archivo) =>
  import(pathToFileURL(path.join(carpetaJs, archivo)).href);

const { estadoInicial } = await importar('estado.js');
const {
  siguienteEvento,
  elegirOpcion,
  elegirOpcionConsecuencia,
  iniciarCarrera
} = await importar('motor.js');
const {
  esCritico,
  esPorcentajeCritico,
  calcularRendimiento
} = await importar('metricas.js');

const PARTIDAS = Number(process.argv[2]) || 5000;
const CARRERA = 'politica';
const MAX_PASOS = 300;

const OBJETIVO_AZAR_MIN = 10;
const OBJETIVO_AZAR_MAX = 25;
const OBJETIVO_CASTIGADOR_MIN = 60;

const VARIABLES = ['vocacion', 'estabilidad', 'energia', 'confianza', 'exploracion'];
const TODAS = [...VARIABLES, 'rendimiento'];

// Mismos pesos que metricas.js
const PESOS_RENDIMIENTO = { dedicacion: 0.20, energia: 0.35, confianza: 0.30, vocacion: 0.15 };

const eventos = JSON.parse(fs.readFileSync(rutaEventos, 'utf8'));

const azar = (lista) => lista[Math.floor(Math.random() * lista.length)];

function puntaje(perfil, opcion) {
  const e = opcion.efectos || {};
  if (perfil === 'rendimiento') {
    return Object.entries(PESOS_RENDIMIENTO)
      .reduce((total, [clave, peso]) => total + peso * (e[clave] ?? 0), 0);
  }
  return e[perfil] ?? 0;
}

function elegir(perfil, opciones) {
  if (perfil === 'azar') return azar(opciones);
  const minimo = Math.min(...opciones.map((o) => puntaje(perfil, o)));
  return azar(opciones.filter((o) => puntaje(perfil, o) === minimo));
}

function enRojo(estado) {
  const rojas = new Set(
    VARIABLES.filter((v) => esCritico(v, estado.variables[v]))
  );
  if (esPorcentajeCritico(calcularRendimiento(estado))) rojas.add('rendimiento');
  return rojas;
}

function jugarPartida(perfil) {
  const estado = estadoInicial();
  iniciarCarrera(estado, CARRERA);

  const alguna = new Set();
  const pasos = Object.fromEntries(TODAS.map((v) => [v, 0]));

  const medir = () => {
    for (const v of enRojo(estado)) {
      alguna.add(v);
      pasos[v] += 1;
    }
  };

  for (let paso = 0; paso < MAX_PASOS; paso++) {
    const evento = siguienteEvento(eventos, estado);
    if (!evento || !evento.opciones?.length) break;

    const { consecuencia } = elegirOpcion(estado, evento, elegir(perfil, evento.opciones));
    medir();

    let actual = consecuencia;
    while (actual?.opciones?.length) {
      const r = elegirOpcionConsecuencia(estado, elegir(perfil, actual.opciones), evento);
      medir();
      actual = r.consecuencia;
    }
  }

  return { alguna, pasos, final: enRojo(estado) };
}

function simular(perfil) {
  const acumulado = Object.fromEntries(
    TODAS.map((v) => [v, { alguna: 0, final: 0, pasos: 0 }])
  );

  for (let i = 0; i < PARTIDAS; i++) {
    const r = jugarPartida(perfil);
    for (const v of TODAS) {
      if (r.alguna.has(v)) acumulado[v].alguna += 1;
      if (r.final.has(v)) acumulado[v].final += 1;
      acumulado[v].pasos += r.pasos[v];
    }
  }

  return Object.fromEntries(
    TODAS.map((v) => [v, {
      alguna: (acumulado[v].alguna / PARTIDAS) * 100,
      final: (acumulado[v].final / PARTIDAS) * 100,
      pasos: acumulado[v].pasos / PARTIDAS
    }])
  );
}

const fmt = (n) => n.toFixed(0).padStart(3) + '%';

const resAzar = simular('azar');

console.log(`\n${PARTIDAS} partidas por perfil`);
console.log(`Objetivo: azar ${OBJETIVO_AZAR_MIN}-${OBJETIVO_AZAR_MAX}% | castigador > ${OBJETIVO_CASTIGADOR_MIN}%\n`);
console.log(
  'variable'.padEnd(14) +
  'AZAR alguna/final/pasos'.padEnd(28) +
  'CASTIGADOR alguna/final/pasos'.padEnd(34) +
  'diagnóstico'
);

for (const v of TODAS) {
  const resCastigador = simular(v)[v];
  const a = resAzar[v];

  const avisos = [];
  if (a.alguna < OBJETIVO_AZAR_MIN) avisos.push('azar: casi nunca se pone roja');
  if (a.alguna > OBJETIVO_AZAR_MAX) avisos.push('azar: se pone roja demasiado');
  if (resCastigador.alguna < OBJETIVO_CASTIGADOR_MIN) avisos.push('castigador: no alcanza a ponerla roja');

  console.log(
    v.padEnd(14) +
    `${fmt(a.alguna)} ${fmt(a.final)} ${a.pasos.toFixed(1).padStart(5)}`.padEnd(28) +
    `${fmt(resCastigador.alguna)} ${fmt(resCastigador.final)} ${resCastigador.pasos.toFixed(1).padStart(5)}`.padEnd(34) +
    (avisos.length ? '⚠ ' + avisos.join(' | ') : 'ok')
  );
}

// ------------------------------------------------------------
// DÓNDE TOCAR: deltas de cada variable en los datos
// ------------------------------------------------------------

function recorrer(obj, idEvento, salida) {
  if (!obj || typeof obj !== 'object') return;
  const id = obj.id ?? idEvento;

  if (obj.efectos && typeof obj.efectos === 'object') {
    for (const [v, d] of Object.entries(obj.efectos)) {
      if (typeof d === 'number') salida.push({ v, d, id, texto: obj.texto });
    }
  }

  for (const valor of Object.values(obj)) {
    if (Array.isArray(valor)) valor.forEach((item) => recorrer(item, id, salida));
    else if (valor && typeof valor === 'object') recorrer(valor, id, salida);
  }
}

const deltas = [];
eventos.forEach((e) => recorrer(e, e.id, deltas));

console.log('\n--- Deltas en los datos (dónde tocar) ---\n');

for (const v of VARIABLES) {
  const propios = deltas.filter((x) => x.v === v);
  const negativos = propios.filter((x) => x.d < 0).sort((a, b) => a.d - b.d);
  const positivos = propios.filter((x) => x.d > 0);

  console.log(`${v}: ${negativos.length} negativos, ${positivos.length} positivos`);
  if (negativos.length === 0) {
    console.log('   ⚠ sin deltas negativos: no puede deteriorarse');
  }
  negativos.slice(0, 3).forEach((x) =>
    console.log(`   ${x.d}  ${x.id}  (${x.texto ?? ''})`)
  );
}

console.log('\nrendimiento: derivado (dedicación, energía, confianza y vocación); se ajusta tocando esas variables.');