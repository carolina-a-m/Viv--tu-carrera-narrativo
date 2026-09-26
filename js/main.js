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
  renderEvento,
  renderInicio,
  renderFinDeEventos,
  renderResultadoFinal,
  renderDebugEstado,
  renderCargandoIntervencionIA,
  actualizarNarrativaFinal,
  renderBotonConocerCarrera,
  renderPresentacionCarrera,
  renderCargandoCarreraPersonalizada,
  actualizarCarreraPersonalizada
} from './ui.js';

import {
  estadoInicial,
  registrarDecision,
  registrarEvento,
  setearBanderas,
  obtenerContextoSeguroIA
} from './estado.js';

import {
  siguienteEvento,
  elegirOpcion,
  elegirOpcionConsecuencia,
  iniciarCarrera
} from './motor.js';

import {
  calcularProgresoCarrera,
  calcularRendimiento
} from './metricas.js';

import {
  guardar,
  cargar,
  borrar
} from './storage.js';

import {
  calcularAfinidadCarrera
} from './afinidad.js';

let estado;
let eventos;
let facultades;
let conflictoActual = null;
let planCarreraActivo = null;


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


async function cargarPlanCarrera(carrera) {

  try {

    const resp =
      await fetch(`./data/${carrera}.json`);

    if (!resp.ok) {
      console.warn(
        `No se pudo cargar el plan de ${carrera}: HTTP ${resp.status} en ${resp.url}`
      );
      planCarreraActivo = null;
      return;
    }

    const datos =
      await resp.json();

    if (!Array.isArray(datos?.areas) || !Array.isArray(datos?.materias)) {
      console.warn(
        `El plan de ${carrera} no tiene "areas" ni "materias" como arrays.`
      );
      planCarreraActivo = null;
      return;
    }

    planCarreraActivo = datos;

  } catch (error) {

    console.warn(
      `No se pudo cargar el plan de ${carrera}:`,
      error.message
    );

    planCarreraActivo = null;

  }
}


async function cargarPresentacionCarrera(carrera) {

  try {

    const resp =
      await fetch(`./data/presentacion_${carrera}.json`);

    if (!resp.ok) return null;

    const datos =
      await resp.json();

    const gen = datos?.presentacionGeneral || {};

    return {
      queEsLaCarrera: gen.queEsLaCarrera || '',
      perfilEgresado: gen.perfilEgresado || '',
      ambitosDesempeno: Array.isArray(gen.ambitosDesempeno) ? gen.ambitosDesempeno : [],
      dimensionesFormacion: Array.isArray(datos?.dimensionesFormacion) ? datos.dimensionesFormacion : []
    };

  } catch (error) {

    console.warn(
      `No se pudo cargar la presentación de ${carrera}:`,
      error.message
    );

    return null;

  }
}


function obtenerAfinidadCarreraActual(estado) {

  // Acá necesitamos el perfil de intereses COMPLETO del jugador
  // (todas las categorías, incluido "tecnico"), no el recorte a 3
  // categorías que arma construirResumenTrayectoria para el epílogo.
  const interesesCompletos = Object.entries(estado.intereses || {})
    .filter(([, valor]) => valor > 0)
    .map(([nombre, valor]) => ({ nombre, valor }));

  if (!planCarreraActivo) {
    console.warn('planCarreraActivo es null: no se cargó el plan de la carrera.');
  }

  if (interesesCompletos.length === 0) {
    console.warn('estado.intereses no tiene ningún valor > 0.', estado.intereses);
  }

  return calcularAfinidadCarrera(
    planCarreraActivo,
    interesesCompletos
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


const MARCADOR_CONFLICTO = '{{CONFLICTO_RESUMEN}}';

function eventoUsaConflicto(texto) {
  return Boolean(
    conflictoActual &&
    texto &&
    texto.includes(MARCADOR_CONFLICTO)
  );
}

function aplicarConflictoATexto(texto) {

  if (!texto || !texto.includes(MARCADOR_CONFLICTO)) {
    return texto;
  }

  const relleno =
    conflictoActual
      ? conflictoActual.resumen_adaptado
      : 'Una medida reciente generó reclamos de distintos sectores.';

  return texto.replaceAll(MARCADOR_CONFLICTO, relleno);
}

function construirResumenJugador(estado, facultades) {

  const facultad = facultades.find(f =>
    f.carreras.some(c => c.id === estado.carreraActiva)
  );

  const carrera = facultad?.carreras.find(
    c => c.id === estado.carreraActiva
  );

  const progreso = calcularProgresoCarrera(eventos, estado);
  const rendimiento = calcularRendimiento(estado);

  return {
    nombre: estado.nombre,
    facultadId: facultad?.id || null,
    carreraNombre: carrera?.nombre || '',
    vocacion: estado.variables.vocacion,
    progreso,
    rendimiento,
    variables: {
      ...estado.variables,
      progreso,
      rendimiento
    }
  };
}

function renderConsecuenciaComoEvento(consecuencia, onElegirOpcion) {

  const opciones =
    Array.isArray(consecuencia.opciones) && consecuencia.opciones.length > 0
      ? consecuencia.opciones
      : [{ icono: '➡️', texto: 'Continuar', efectos: {}, banderaSet: [] }];

  renderEvento(
    {
      contexto: consecuencia.contexto || null,
      texto: consecuencia.texto,
      recurso: consecuencia.recurso || null,
      recursoSecundario: consecuencia.recursoSecundario || null,
      opciones
    },
    onElegirOpcion,
    construirResumenJugador(estado, facultades)
  );
}

function renderResultadoOpcionComoEvento(resultado, onContinuar) {

  const opcionContinuar =
    resultado.opcion || {};

  renderEvento(
    {
      contexto: null,
      texto: resultado.texto,
      recurso: resultado.recurso || null,
      recursoSecundario: resultado.recursoSecundario || null,
      opciones: [{
        icono: opcionContinuar.icono || '➡️',
        texto: opcionContinuar.texto || 'Continuar',
        descripcion: opcionContinuar.descripcion,
        efectos: {},
        banderaSet: []
      }]
    },
    () => onContinuar(),
    construirResumenJugador(estado, facultades)
  );
}

// ------------------------------------------------------------
// INICIO
// ------------------------------------------------------------

async function iniciar() {

  try {

const respFacultades =
      await fetch('./data/careers.json');

    await cargarConflictoActual();


    // ----------------------------------------------------------
    // VALIDAR CARGA
    // ----------------------------------------------------------

    if (!respFacultades.ok) {
      throw new Error(
        'No se pudo cargar careers.json'
      );
    }


    // ----------------------------------------------------------
    // LEER JSON
    // ----------------------------------------------------------

    facultades =
      await respFacultades.json();


    // ----------------------------------------------------------
    // VALIDACIÓN BÁSICA
    // ----------------------------------------------------------

    if (!Array.isArray(facultades)) {

      throw new Error(
        'careers.json no contiene un array de facultades.'
      );

    }


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

    await cargarPlanCarrera(
      estado.carreraActiva
    );


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

    await cargarPlanCarrera(
      carreraId
    );


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
    !eventos
  ) {
    return;
  }


  // ----------------------------------------------------------
  // PEDIR SIGUIENTE EVENTO AL MOTOR
  // ----------------------------------------------------------

  const evento =
    siguienteEvento(
      eventos,
      estado
    );


  // ----------------------------------------------------------
  // FIN
  // ----------------------------------------------------------

  if (!evento) {

    renderResultadoFinal(
      construirResumenJugador(estado, facultades)
    );

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
  
      // --------------------------------------------------------
      // CARRERA ANTES DE APLICAR LA OPCIÓN
      // --------------------------------------------------------
      //
      // Si la opción elegida cambia la trayectoria activa
      // (opcion.cambiarCarrera), necesitamos recargar el
      // archivo de eventos de la nueva carrera antes de
      // seguir pidiéndole eventos al motor.
      //
  const manejarEleccion = async (opcion) => {

      const carreraAntes =
        estado.carreraActiva;


             const resultado =
        elegirOpcion(
          estado,
          evento,
          opcion
        );


                  if (evento.opciones.length > 1) {

        registrarDecision(
          estado,
          opcion.texto,
          { funcion: evento.funcion },
          opcion.intereses || {}
        );

      }

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

        await cargarPlanCarrera(
          estado.carreraActiva
        );

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

          renderConsecuenciaComoEvento(
                  resultadoConsecuencia.consecuencia,
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

              renderResultadoOpcionComoEvento(
                resultadoConsecuencia.resultadoOpcion,
                continuarOMostrarSiguienteNivel
              );

            } else {

              continuarOMostrarSiguienteNivel();

            }

          };

          renderConsecuenciaComoEvento(
            resultado.consecuencia,
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

        renderResultadoOpcionComoEvento(
          resultado.resultadoOpcion,
          mostrarConsecuenciaSiHay
        );

      } else {

        mostrarConsecuenciaSiHay();

      }

  };

  // ----------------------------------------------------------
  // FINAL DE LA PARTIDA (evento único de orden 110)
  // ----------------------------------------------------------

const ORDEN_FINAL = 110;

if (evento.orden === ORDEN_FINAL) {

  registrarEvento(estado, evento.id);
  guardar(estado);

  renderResultadoFinal(                     // pantalla final normal, con panel de stats, desde el arranque
    construirResumenJugador(estado, facultades),
    { cargando: true }
  );

  const botonReiniciar = document.getElementById('reiniciar');
  if (botonReiniciar) botonReiniciar.textContent = 'Jugar de nuevo';

  pedirIntervencionIA(estado).then((texto) => {

    actualizarNarrativaFinal(               // solo actualiza el texto dentro de la misma caja
      evento.contexto,
      texto || evento.texto
    );

    renderBotonConocerCarrera(async () => {

      // Sacar el bloque de "Tu trayectoria" y el panel de indicadores:
      // ya se mostraron en la pantalla anterior. El header se reutiliza
      // como parte del mismo bloque que "Así es la carrera", para que
      // todo se lea como una sola composición y no como pantallas sueltas.
      const cajaTrayectoria = document.getElementById('resultado-final-caja');
      const narrativaGrupo = cajaTrayectoria ? cajaTrayectoria.parentElement : null;
      if (cajaTrayectoria) cajaTrayectoria.remove();

      const panelStats = document.getElementById('panel-stats');
      if (panelStats) panelStats.remove();

      const bloque = document.querySelector('#juego .decision-bloque');
      if (bloque) bloque.classList.add('bloque-compacto');

      const presentacion =
        await cargarPresentacionCarrera(estado.carreraActiva);

      renderPresentacionCarrera(presentacion, narrativaGrupo);

      renderCargandoCarreraPersonalizada();

      const textoCarrera =
        await pedirCarreraPersonalizada(estado);

      actualizarCarreraPersonalizada(
        textoCarrera || 'No pudimos generar esta lectura en este momento.'
      );

    });

    renderDebugEstado(estado);

  });

  return;

}

else if (evento.id === 'politica_actividad_ia_disparador') {

  renderEvento(
    {
      contexto: '<span class="emoji-carga">🪄</span> Creando escenas personalizadas con IA',
      texto: 'El juego está tomando elementos de tu recorrido — tus decisiones, tus intereses — y construyendo con eso una serie de escenas pensadas especialmente para tu partida. Esto puede tardar unos segundos.',
      opciones: []
    },
    () => {},
    construirResumenJugador(estado, facultades)
  );

  pedirEscenaIA(estado, 'actividad_ia').then((escenaValidada) => {

    const eventoFinal = escenaValidada
      ? construirEventoEscenaIA(escenaValidada, 'actividad_ia', 55)
      : ACTIVIDAD_IA_FALLBACK;

    registrarEvento(estado, evento.id);
    guardar(estado);

    renderEvento(
      {
        contexto: eventoFinal.contexto,
        texto: eventoFinal.texto,
        opciones: eventoFinal.opciones
      },
      manejarEleccionEscenaIA(eventoFinal, 'actividad_ia_resuelta'),
      construirResumenJugador(estado, facultades)
    );

    renderDebugEstado(estado);

  });

  return;

}

else if (evento.id === 'politica_desafio_ia_disparador') {

  renderEvento(
    {
      contexto: evento.contexto,
      texto: evento.texto,
      opciones: []
    },
    () => {},
    construirResumenJugador(estado, facultades)
  );

  pedirEscenaIA(estado, 'desafio_ia').then((escenaValidada) => {

    const eventoFinal = escenaValidada
      ? construirEventoEscenaIA(escenaValidada, 'desafio_ia', 100.8)
      : DESAFIO_IA_FALLBACK;

    registrarEvento(estado, evento.id);
    guardar(estado);

    renderEvento(
      {
        contexto: eventoFinal.contexto,
        texto: eventoFinal.texto,
        opciones: eventoFinal.opciones
      },
      manejarEleccionEscenaIA(eventoFinal, 'desafio_ia_resuelta'),
      construirResumenJugador(estado, facultades)
    );

    renderDebugEstado(estado);

  });

  return;

}

else {
      const usaConflicto = eventoUsaConflicto(evento.texto);

      renderEvento(
    {
      contexto: evento.contexto,
      texto: aplicarConflictoATexto(evento.texto),
      opciones: evento.opciones,
      generadoPorIA: usaConflicto,
      fuenteTitulo: usaConflicto ? conflictoActual.fuente_titulo : null,
      fuenteUrl: usaConflicto ? conflictoActual.fuente_url : null
    },
    manejarEleccion,
    construirResumenJugador(estado, facultades)
  )

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


const VARIABLES_NO_NARRATIVAS = ['dedicacion', 'tiempo'];

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
// CARRERA PERSONALIZADA (cruce afinidad → IA)
// ------------------------------------------------------------

function normalizarNombreMateria(texto) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function convertirMateriasALinks(texto, areasAfines) {

  const materiasPorNombre = new Map();

  (areasAfines || []).forEach((area) => {
    (area.materias || []).forEach((materia) => {
      if (materia?.nombre) {
        materiasPorNombre.set(normalizarNombreMateria(materia.nombre), materia);
      }
    });
  });

  return texto.replace(/\*+([^*]+?)\*+/g, (coincidenciaCompleta, nombreDetectado) => {

    const materia =
      materiasPorNombre.get(normalizarNombreMateria(nombreDetectado));

    if (materia && materia.link) {
      return `<a class="ficha-recurso-nombre" style="font-size:inherit; font-weight:inherit;" href="${materia.link}" target="_blank" rel="noopener noreferrer">${materia.nombre} ↗️</a>`;
    }

    return nombreDetectado;

  });

}

async function pedirCarreraPersonalizada(estado) {

  const areasAfines =
    obtenerAfinidadCarreraActual(estado);

  if (!areasAfines || areasAfines.length === 0) {
    console.warn('Sin áreas afines calculadas: no se llegó a llamar a la IA.');
    return null;
  }

  try {

    const respuesta = await fetch(URL_INTERVENCION_IA, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: 'carrera_personalizada',
        nombreJugador: estado.nombre,
        areasAfines,
        resumenTrayectoria: construirResumenTrayectoria(estado)
      })
    });

    if (!respuesta.ok) return null;

    const datos = await respuesta.json();

    if (!datos.texto) return null;

    return convertirMateriasALinks(datos.texto, areasAfines);

  } catch {

    return null;

  }
}


// ------------------------------------------------------------
// ACTIVIDAD GENERADA POR IA (post-primer parcial)
// ------------------------------------------------------------

const VARIABLES_PERMITIDAS_EFECTOS_IA = [
  'vocacion', 'estabilidad', 'energia', 'confianza',
  'exploracion', 'dedicacion'
];

const EFECTO_IA_MIN = -5;
const EFECTO_IA_MAX = 5;

const ACTIVIDAD_IA_FALLBACK = {
  contexto: '🔍 Algo nuevo',
  texto: 'Te anotás en un taller optativo de la facultad. No tiene mucho que ver con lo que venías haciendo hasta ahora, pero te suma otra perspectiva.',
  opciones: [
    {
      icono: '➡️',
      texto: 'Seguir',
      descripcion: 'Seguir.',
      efectos: { exploracion: 1 },
      intereses: {},
      banderaSet: []
    }
  ]
};

const DESAFIO_IA_FALLBACK = {
  contexto: '💼 El nuevo equipo',
  texto: 'Tu primera semana a cargo no es lo que imaginabas: más reuniones, más decisiones chicas que antes no te tocaban. De a poco vas encontrando el ritmo.',
  opciones: [
    {
      icono: '➡️',
      texto: 'Seguir',
      descripcion: 'Seguir.',
      efectos: { estabilidad: 1 },
      intereses: {},
      banderaSet: []
    }
  ]
};

const PROFUNDIDAD_MAXIMA_ACTIVIDAD_IA = 3;

function validarEscenaIA(escena, profundidad = 1) {

  if (!escena || typeof escena !== 'object') return null;
  if (typeof escena.texto !== 'string') return null;
  if (escena.texto.length < 40 || escena.texto.length > 600) return null;

  if (!Array.isArray(escena.opciones)) return null;
  if (escena.opciones.length < 1 || escena.opciones.length > 4) return null;

  const opcionesValidadas = [];

  for (const opcion of escena.opciones) {

    if (typeof opcion.texto !== 'string') return null;
    if (opcion.texto.length < 1 || opcion.texto.length > 80) return null;

    const efectos = opcion.efectos || {};

    for (const [variable, valor] of Object.entries(efectos)) {

      if (!VARIABLES_PERMITIDAS_EFECTOS_IA.includes(variable)) return null;
      if (typeof valor !== 'number') return null;
      if (valor < EFECTO_IA_MIN || valor > EFECTO_IA_MAX) return null;

    }

    const opcionValidada = {
      icono: opcion.icono || '➡️',
      texto: opcion.texto,
      descripcion: opcion.descripcion || '',
      efectos
    };

    if (opcion.escena_siguiente) {

      if (profundidad >= PROFUNDIDAD_MAXIMA_ACTIVIDAD_IA) return null;

      const siguienteValidada = validarEscenaIA(opcion.escena_siguiente, profundidad + 1);

      if (!siguienteValidada) return null;

      opcionValidada.escena_siguiente = siguienteValidada;

    } else {

      if (typeof opcion.cierre !== 'string') return null;
      if (opcion.cierre.length < 10 || opcion.cierre.length > 400) return null;

      opcionValidada.cierre = opcion.cierre;

    }

    opcionesValidadas.push(opcionValidada);

  }

  return {
    contexto: typeof escena.contexto === 'string' ? escena.contexto : null,
    texto: escena.texto,
    opciones: opcionesValidadas
  };

}

function construirEscenaGenerada(escena) {

  return {
    contexto: escena.contexto,
    texto: escena.texto,
    opciones: escena.opciones.map((opcion) => {

      const opcionFinal = {
        icono: opcion.icono,
        texto: opcion.texto,
        descripcion: opcion.descripcion,
        efectos: opcion.efectos,
        banderaSet: []
      };

      if (opcion.escena_siguiente) {
        opcionFinal.consecuencia = construirEscenaGenerada(opcion.escena_siguiente);
      } else if (opcion.cierre) {
        opcionFinal.resultado = { texto: opcion.cierre };
      }

      return opcionFinal;

    })
  };

}

function construirEventoEscenaIA(escenaRaiz, prefijoId, orden) {

  if (!escenaRaiz) return null;

  const evento = construirEscenaGenerada(escenaRaiz);

  evento.id = prefijoId + '_' + Date.now();
  evento.carrera = estado.carreraActiva;
  evento.orden = orden;

  return evento;

}

async function pedirEscenaIA(estado, tipo) {

  try {

    const respuesta = await fetch(URL_INTERVENCION_IA, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo,
        nombreJugador: estado.nombre,
        resumenTrayectoria: construirResumenTrayectoria(estado)
      })
    });

    if (!respuesta.ok) return null;

    const datos = await respuesta.json();

    return validarEscenaIA(datos.escena);

  } catch {

    return null;

  }
}

function manejarEleccionEscenaIA(eventoRaiz, banderaFinal) {

  const manejarOpcion = (opcion) => {

    const resultado = elegirOpcionConsecuencia(estado, opcion, eventoRaiz);

    guardar(estado);

    const continuarOMostrarSiguienteNivel = () => {

      if (resultado && resultado.consecuencia) {

        renderConsecuenciaComoEvento(
          resultado.consecuencia,
          manejarOpcion
        );

      } else {

        setearBanderas(estado, [banderaFinal]);
        guardar(estado);
        mostrarSiguiente();

      }

    };

    if (resultado && resultado.resultadoOpcion) {

      renderResultadoOpcionComoEvento(
        resultado.resultadoOpcion,
        continuarOMostrarSiguienteNivel
      );

    } else {

      continuarOMostrarSiguienteNivel();

    }

  };

  return manejarOpcion;

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
