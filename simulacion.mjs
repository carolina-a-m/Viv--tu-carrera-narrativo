// simulacion.mjs — no forma parte del juego, es solo para probar el motor.
import { estadoInicial } from './js/estado.js';
import { siguienteEvento, elegirOpcion } from './js/motor.js';
import fs from 'fs';

const eventos = JSON.parse(fs.readFileSync('./data/events.json', 'utf-8'));

function jugarPartida() {
  const estado = estadoInicial(); // carreraActiva se asigna sola, como en el juego real
  const log = [];

  for (let turno = 0; turno < 30; turno++) {
    const evento = siguienteEvento(eventos, estado);
    if (!evento) {
      log.push(`Turno ${turno}: SIN EVENTOS DISPONIBLES (fin natural o callejón sin salida)`);
      break;
    }
    const opcion = evento.opciones[Math.floor(Math.random() * evento.opciones.length)];
    elegirOpcion(estado, evento, opcion);
    log.push(`Turno ${turno}: ${evento.id} -> "${opcion.texto}"`);
  }

  return { estadoFinal: estado, log };
}

let huboCallejonTemprano = false;

for (let i = 0; i < 10; i++) {
  const { estadoFinal, log } = jugarPartida();
  const terminoEnEventos = log.filter(l => !l.includes('SIN EVENTOS')).length;
  console.log(`\n=== Partida corrida=${i} — carrera asignada=${estadoFinal.carreraActiva} — eventos vistos: ${terminoEnEventos} ===`);
  console.log(log.join('\n'));
  if (terminoEnEventos < 4) {
    huboCallejonTemprano = true;
    console.log('!!! ALERTA: se quedó sin eventos muy temprano !!!');
  }
  console.log('Variables finales:', estadoFinal.variables);
  console.log('Banderas finales:', Object.keys(estadoFinal.banderas));
}

console.log('\n\nResultado: ' + (huboCallejonTemprano ? 'HAY callejones sin salida tempranos, revisar precondiciones' : 'Todas las partidas alcanzaron varios turnos sin quedarse trabadas temprano'));
