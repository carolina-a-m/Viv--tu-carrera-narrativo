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


import {
  estadoInicial,
  registrarDecision,
  obtenerContextoSeguroIA
} from './estado.js';

import {
  siguienteEvento,
  elegirOpcion,
  elegirOpcionConsecuencia,
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
  renderResultadoOpcion,
  renderInicio,
  renderFinDeEventos,
  renderDebugEstado,
  renderIntervencionIA
} from './ui.js';

let estado;
let eventos;
let eventosTransversales;
let facultades;
let conflictoActual = null;


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

async function cargarConflictoActual() {

  try {

    const resp =
      await fetch('./data/conflicto-actual.json');

    if (!resp.ok) return;

    const datos =
      await resp.json();

    if (
      typeof datos?.resumen_adaptado === 'string' &&
      datos.resumen_adaptado.trim() !== ''
    ) {
      conflictoActual = datos;
    }

  } catch (error) {

    console.warn(
      'No se pudo cargar conflicto-actual.json:',
      error.message
    );

  }
}


function aplicarConflictoATexto(texto) {

  const MARCADOR = '{{CONFLICTO_RESUMEN}}';

  if (!texto || !texto.includes(MARCADOR)) {
    return texto;
  }

  const relleno =
    conflictoActual
      ? `${conflictoActual.resumen_adaptado} (Fuente: ${conflictoActual.fuente_titulo})`
      : 'Una medida reciente generó reclamos de distintos sectores.';

  return texto.replaceAll(MARCADOR, relleno);
}

function construirResumenJugador(estado, facultades) {

  const facultad = facultades.find(f =>
    f.carreras.some(c => c.id === estado.carreraActiva)
  );

  const carrera = facultad?.carreras.find(
    c => c.id === estado.carreraActiva
  );

  return {
    nombre: estado.nombre,
    facultadId: facultad?.id || null,
    carreraNombre: carrera?.nombre || '',
    interes: estado.variables.interes_disciplina,
    progreso: estado.variables.progreso,
    variables: estado.variables
  };
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

    await cargarConflictoActual();


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
    mostrarReiniciar();

    mostrarSiguiente();

    return;
  }


  // ----------------------------------------------------------
  // NUEVA PARTIDA
  // ----------------------------------------------------------

renderInicio(
  facultades,

  async ({ nombre, facultadId, carreraId }) => {

    estado =
      estadoInicial();


    estado.nombre =
      nombre;


    iniciarCarrera(
      estado,
      carreraId
    );


    try {

      await cargarEventosCarrera(
        carreraId
      );

    } catch (error) {

      mostrarErrorCarga(error);

      return;
    }


    guardar(
      estado
    );
 

    ocultarInicio();
    mostrarReiniciar();

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
  
  const manejarEleccion = async (opcion) => {

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


            registrarDecision(
        estado,
        opcion.texto,
        { funcion: evento.funcion, tipo: evento.tipo }
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

            const mostrarConsecuenciaSiHay = () => {

        if (
          resultado &&
          resultado.consecuencia
        ) {

          const manejarOpcionConsecuencia = (opcionConsecuencia) => {

              const resultadoConsecuencia =
              elegirOpcionConsecuencia(
                estado,
                opcionConsecuencia,
                evento
              );

            guardar(
              estado
            );

            const continuarOMostrarSiguienteNivel = () => {

              if (
                resultadoConsecuencia &&
                resultadoConsecuencia.consecuencia
              ) {

                renderConsecuencia(
                  resultadoConsecuencia.consecuencia,
                  continuar,
                  manejarOpcionConsecuencia
                );

              } else {

                continuar();

              }

            };

            if (
              resultadoConsecuencia &&
              resultadoConsecuencia.resultadoOpcion
            ) {

              renderResultadoOpcion(
                resultadoConsecuencia.resultadoOpcion,
                continuarOMostrarSiguienteNivel
              );

            } else {

              continuarOMostrarSiguienteNivel();

            }

          };

          renderConsecuencia(
            resultado.consecuencia,
            continuar,
            manejarOpcionConsecuencia
          );

        } else {

          continuar();

        }

      };


      // --------------------------------------------------------
      // RESULTADO DE OPCIÓN
      // --------------------------------------------------------
      //
      // Si la opción elegida tiene una respuesta narrativa
      // inmediata propia (ver motor.js / evaluarResultadoOpcion),
      // la mostramos antes de evaluar la consecuencia diferida.
      //

      if (
        resultado &&
        resultado.resultadoOpcion
      ) {

        renderResultadoOpcion(
          resultado.resultadoOpcion,
          mostrarConsecuenciaSiHay
        );

      } else {

        mostrarConsecuenciaSiHay();

      }

  };


  // ----------------------------------------------------------
  // INTERVENCIÓN DE IA (única vez, punto fijo del recorrido)
  // ----------------------------------------------------------

const ORDEN_FINAL = 110;

if (
  evento.orden === ORDEN_FINAL &&
  !estado.banderas.intervencion_ia_vista
  ) {

    estado.banderas.intervencion_ia_vista = true;

    pedirIntervencionIA(estado).then((texto) => {

      renderIntervencionIA(
        texto || '...',
        () => renderEvento({ ...evento, texto: aplicarConflictoATexto(evento.texto) }, manejarEleccion, construirResumenJugador(estado, facultades))
      );

    });

  } else {

    renderEvento({ ...evento, texto: aplicarConflictoATexto(evento.texto) }, manejarEleccion, construirResumenJugador(estado, facultades))

  }


  renderDebugEstado(
    estado
  );
}


// ------------------------------------------------------------
// INTERVENCIÓN DE IA — LLAMADA AL WORKER
// ------------------------------------------------------------

const URL_INTERVENCION_IA =
  'https://intervencion-ia.vivitucarrera.workers.dev';


const VARIABLES_NO_NARRATIVAS = ['progreso', 'tiempo', 'rendimiento'];

function construirResumenTrayectoria(estado) {

  const { banderasSeguras, decisionesSeguras } =
    obtenerContextoSeguroIA(estado);

  const interesesRankeados = Object.entries(estado.intereses || {})
    .filter(([nombre]) => nombre !== 'tecnico')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([nombre, valor]) => ({ nombre, valor }));

  const variablesNarrativas = Object.fromEntries(
    Object.entries(estado.variables || {})
      .filter(([nombre]) => !VARIABLES_NO_NARRATIVAS.includes(nombre))
  );

  return {
    carrerasExploradas: estado.carrerasExploradas || [],
    banderas: banderasSeguras,
    interesesRankeados,
    variables: variablesNarrativas,
    decisionesTexto: decisionesSeguras
  };

}

  async function pedirIntervencionIA(estado) {

  const caminoOrigen =
    estado.banderas.camino_actores ? 'actores' :
    estado.banderas.camino_investigacion ? 'investigacion' :
    estado.banderas.camino_datos ? 'datos' :
    'desconocido';

  try {

    const respuesta = await fetch(URL_INTERVENCION_IA, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        nombreJugador: estado.nombre,
        caminoOrigen,
        resumenTrayectoria: construirResumenTrayectoria(estado)
      })
    });

    if (!respuesta.ok) return null;

    const datos = await respuesta.json();

    return datos.texto || null;

  } catch {

    return null;

  }
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

function mostrarReiniciar() {
  const boton = document.getElementById('reiniciar');
  if (boton) boton.style.display = 'flex';
}

// ------------------------------------------------------------
// REINICIAR
// ------------------------------------------------------------

const botonReiniciar =
  document.getElementById('reiniciar');

if (botonReiniciar) {

  // Oculto mientras estamos en la pantalla de inicio
  botonReiniciar.style.display = 'none';

  botonReiniciar.addEventListener(
    'click',
    () => {

      botonReiniciar.style.display = 'none';

      borrar();

      estado = null;

      mostrarInicio();

      const juego =
        document.getElementById('juego');

      if (juego) {
        juego.innerHTML = '';
      }

      const debug =
        document.getElementById('debug');

      if (debug) {
        debug.textContent = '';
      }

      iniciar();
    }
  );
}


// ------------------------------------------------------------
// ARRANCAR
// ------------------------------------------------------------

iniciar();
