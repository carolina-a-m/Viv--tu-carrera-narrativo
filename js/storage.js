// storage.js

import { ESQUEMA_VERSION } from './estado.js';


const CLAVE = 'vivi-tu-carrera:partida';


function guardar(estado) {
  try {
    localStorage.setItem(
      CLAVE,
      JSON.stringify(estado)
    );
  } catch (e) {
    console.warn(
      'No se pudo guardar la partida:',
      e
    );
  }
}


function cargar() {
  try {
    const crudo = localStorage.getItem(CLAVE);

    if (!crudo) {
      return null;
    }

    const estado = JSON.parse(crudo);

    // Si el modelo de datos cambió, descartamos la partida
    // anterior en lugar de intentar utilizar un estado
    // incompatible.
    if (
      estado.esquemaVersion !== ESQUEMA_VERSION
    ) {
      return null;
    }

    return estado;

  } catch (e) {
    console.warn(
      'No se pudo cargar la partida guardada:',
      e
    );

    return null;
  }
}


function borrar() {
  try {
    localStorage.removeItem(CLAVE);
  } catch (e) {
    console.warn(
      'No se pudo borrar la partida:',
      e
    );
  }
}


export {
  guardar,
  cargar,
  borrar
};