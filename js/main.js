// main.js
// Punto de entrada de la aplicación.
// Coordina estado, motor, almacenamiento y UI.
//
// ARQUITECTURA:
//
// eventos_<carrera>.json
//     ↓
// trayectoria principal (depende de la carrera activa)
//
// eventos-transversales.json
//     ↓
// acontecimientos secundarios (comunes a todas las carreras)
//
// motor.js decide cuál corresponde mostrar, y si una opción
// dispara una consecuencia diferida (evento.consecuencia).
//
// main.js solamente carga los datos y coordina el flujo,
// incluyendo la recarga de eventos si la carrera activa
// cambia durante la partida (deriva).
//
// IMPORTANTE:
// Los eventos transversales NO reemplazan la progresión principal.
// Solamente pueden aparecer entre etapas.

import { estadoInicial } from './estado.js';

import {
  siguienteEvento,
  elegirOpcion,
  iniciarCarrera
} from './motor.js';

import {
  guardar,
  cargar,
  borrar
} from './storage.js';

import {
  renderEvento,
  renderConsecuencia,
  renderInicio,
  renderFinDeEventos,
  renderDebugEstado
} from './ui.js';


let estado;
let eventos;
let eventosTransversales;
let facultades;


// ------------------------------------------------------------
// CARGA DE EVENTOS POR CARRERA
// ------------------------------------------------------------
//
// Cada carrera tiene su propio archivo de eventos principales:
//
//   data/eventos_politica.json
//   data/eventos_computacion.json
//   ...
//
// El valor de "carrera" tiene que coincidir con el id usado en
// careers.json y con el campo "carrera" de cada evento.
//
// ------------------------------------------------------------

async function cargarEventosCarrera(carrera) {

  const respEventos =
    await fetch(
      `./data/eventos_${carrera}.json`
    );


  if (!respEventos.ok) {
    throw new Error(
      `No se pudo cargar eventos_${carrera}.json`
    );
  }


  const eventosCargados =
    await respEventos.json();


  if (!Array.isArray(eventosCargados)) {

    throw new Error(
      `eventos_${carrera}.json no contiene un array de eventos.`
    );

  }


  eventos =
    eventosCargados;


  console.log(
    `Eventos principales cargados (${carrera}): ${eventos.length}`
  );

}


// ------------------------------------------------------------
// MOSTRAR ERROR DE CARGA
// ------------------------------------------------------------

function mostrarErrorCarga(error) {

  console.error(
    'Error al cargar los datos del juego:',
    error
  );


  const juego =
    document.getElementById('juego');


  if (juego) {

    juego.innerHTML = `

      <p>
        No se pudieron cargar los datos del juego.
      </p>

      <p>
        ${error.message}
      </p>

      <p>
        Revisá que el proyecto esté siendo ejecutado
        desde un servidor local y que los archivos JSON
        estén ubicados correctamente.
      </p>

    `;

  }
}


// ------------------------------------------------------------
// INICIO
// ------------------------------------------------------------

async function iniciar() {

  try {

    const [
      respTransversales,
      respFacultades
    ] = await Promise.all([

      fetch('./data/eventos-transversales.json'),

      fetch('./data/careers.json')

    ]);


    // ----------------------------------------------------------
    // VALIDAR CARGA
    // ----------------------------------------------------------

    if (!respTransversales.ok) {
      throw new Error(
        'No se pudo cargar eventos-transversales.json'
      );
    }

    if (!respFacultades.ok) {
      throw new Error(
        'No se pudo cargar careers.json'
      );
    }


    // ----------------------------------------------------------
    // LEER JSON
    // ----------------------------------------------------------

    eventosTransversales =
      await respTransversales.json();

    facultades =
      await respFacultades.json();


    // ----------------------------------------------------------
    // VALIDACIÓN BÁSICA
    // ----------------------------------------------------------

    if (!Array.isArray(eventosTransversales)) {

      throw new Error(
        'eventos-transversales.json no contiene un array de eventos.'
      );

    }

    if (!Array.isArray(facultades)) {

      throw new Error(
        'careers.json no contiene un array de facultades.'
      );

    }


    console.log(
      `Eventos transversales cargados: ${eventosTransversales.length}`
    );


  } catch (error) {

    mostrarErrorCarga(error);

    return;
  }


  // ----------------------------------------------------------
  // PARTIDA GUARDADA
  // ----------------------------------------------------------

  const partidaGuardada =
    cargar();


  if (partidaGuardada) {

    estado =
      partidaGuardada;


    try {

      await cargarEventosCarrera(
        estado.carreraActiva
      );

    } catch (error) {

      mostrarErrorCarga(error);

      return;
    }


    ocultarInicio();

    mostrarSiguiente();

    return;
  }


  // ----------------------------------------------------------
  // NUEVA PARTIDA
  // ----------------------------------------------------------

  renderInicio(
    facultades,

    async ({ nombre, carrera }) => {

      estado =
        estadoInicial();


      estado.nombre =
        nombre;


      // --------------------------------------------------------
      // CARRERA INICIAL
      // --------------------------------------------------------
      //
      // La carrera elegida se convierte en la trayectoria
      // activa inicial.
      //
      // No significa que sea una decisión definitiva.
      //

      iniciarCarrera(
        estado,
        carrera
      );


      try {

        await cargarEventosCarrera(
          carrera
        );

      } catch (error) {

        mostrarErrorCarga(error);

        return;
      }


      guardar(
        estado
      );


      ocultarInicio();

      mostrarSiguiente();

    }
  );
}


// ------------------------------------------------------------
// MOSTRAR EVENTO
// ------------------------------------------------------------
//
// Esta función NO decide qué tipo de evento corresponde.
//
// Se lo pregunta al motor.
//
// El motor puede devolver:
//
// 1. un evento transversal
// 2. un evento principal
// 3. null
//
// La distinción pertenece exclusivamente al motor.
//
// ------------------------------------------------------------

function mostrarSiguiente() {

  if (
    !estado ||
    !eventos ||
    !eventosTransversales
  ) {
    return;
  }


  // ----------------------------------------------------------
  // PEDIR SIGUIENTE EVENTO AL MOTOR
  // ----------------------------------------------------------

  const evento =
    siguienteEvento(
      eventos,
      estado,
      eventosTransversales
    );


  // ----------------------------------------------------------
  // FIN
  // ----------------------------------------------------------

  if (!evento) {

    renderFinDeEventos();

    renderDebugEstado(
      estado
    );

    return;
  }


  // ----------------------------------------------------------
  // EVENTO
  // ----------------------------------------------------------
  //
  // Para UI no importa si es principal o transversal.
  //
  // Ambos son acontecimientos narrativos con opciones.
  //

  renderEvento(
    evento,

    async (opcion) => {

      // --------------------------------------------------------
      // CARRERA ANTES DE APLICAR LA OPCIÓN
      // --------------------------------------------------------
      //
      // Si la opción elegida cambia la trayectoria activa
      // (opcion.cambiarCarrera), necesitamos recargar el
      // archivo de eventos de la nueva carrera antes de
      // seguir pidiéndole eventos al motor.
      //

      const carreraAntes =
        estado.carreraActiva;


      const resultado =
        elegirOpcion(
          estado,
          evento,
          opcion,
          eventos
        );


      if (
        estado.carreraActiva !==
        carreraAntes
      ) {

        try {

          await cargarEventosCarrera(
            estado.carreraActiva
          );

        } catch (error) {

          mostrarErrorCarga(error);

          return;
        }

      }


      guardar(
        estado
      );


      const continuar = () => {

        renderDebugEstado(
          estado
        );

        mostrarSiguiente();

      };


      // --------------------------------------------------------
      // CONSECUENCIA DIFERIDA
      // --------------------------------------------------------
      //
      // Si la opción elegida disparó una consecuencia (ver
      // motor.js / evaluarConsecuencia), la mostramos como
      // una pantalla intermedia antes de seguir avanzando.
      //

      if (
        resultado &&
        resultado.consecuencia
      ) {

        renderConsecuencia(
          resultado.consecuencia,
          continuar
        );

      } else {

        continuar();

      }

    }
  );


  renderDebugEstado(
    estado
  );
}


// ------------------------------------------------------------
// VISIBILIDAD DE PANTALLAS
// ------------------------------------------------------------

function ocultarInicio() {

  const inicio =
    document.getElementById('inicio');


  if (inicio) {

    inicio.style.display =
      'none';

  }
}


function mostrarInicio() {

  const inicio =
    document.getElementById('inicio');


  if (inicio) {

    inicio.style.display =
      '';

  }
}


// ------------------------------------------------------------
// REINICIAR
// ------------------------------------------------------------

const botonReiniciar =
  document.getElementById('reiniciar');


if (botonReiniciar) {

  botonReiniciar.addEventListener(
    'click',

    () => {

      borrar();


      estado =
        null;


      mostrarInicio();


      const juego =
        document.getElementById('juego');


      if (juego) {

        juego.innerHTML =
          '';

      }


      const debug =
        document.getElementById('debug');


      if (debug) {

        debug.textContent =
          '';

      }


      iniciar();

    }
  );

}


// ------------------------------------------------------------
// ARRANCAR
// ------------------------------------------------------------

iniciar();
