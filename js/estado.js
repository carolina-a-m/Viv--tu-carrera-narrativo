// estado.js
// Único dueño del estado del jugador.
// Nadie más muta este objeto directamente.

const ESQUEMA_VERSION = 3;


function estadoInicial() {
  return {
    esquemaVersion: ESQUEMA_VERSION,

    nombre: null,

    // Carrera que el jugador está explorando actualmente.
    carreraActiva: null,

    variables: {
      interes_disciplina: 0,
      dinero: 5,
      energia: 5,
      confianza: 5,
      exploracion: 0,
      progreso: 0,
      rendimiento: 0,
      tiempo: 5,
      cansancio: 0
    },

    // Señales narrativas y decisiones importantes.
    banderas: {},

    // Señales acumuladas de intereses.
    intereses: {
      tecnico: 0,
      social: 0,
      investigacion: 0,
      organizacion: 0,
      territorio: 0,
      creativo: 0,
      salud: 0,
      comunicacion: 0,
      politica: 0
    },

    // Carreras exploradas durante la partida.
    carrerasExploradas: [],

    // Eventos ya vistos.
    eventosVistos: [],

    // Cantidad total de decisiones tomadas.
    turno: 0,

    // ----------------------------------------------------------
    // CONTROL DE EVENTOS TRANSVERSALES
    // ----------------------------------------------------------
    //
    // Guarda qué etapas ya tuvieron una oportunidad transversal.
    //
    // Ejemplo:
    //
    // ["inicio", "actividad"]
    //
    // Esto evita que la misma etapa dispare acontecimientos
    // secundarios indefinidamente.
    //
    transversalesProcesados: []
  };
}


function aplicarEfectos(estado, efectos = {}) {
  for (const [variable, delta] of Object.entries(efectos)) {

    if (!(variable in estado.variables)) {
      console.warn(
        `Efecto sobre variable desconocida: ${variable}`
      );
      continue;
    }

    estado.variables[variable] += delta;
  }
}

const GRUPOS_EXCLUYENTES = {
  politica: {
    postura_oportunidad_laboral: [
      'priorizo_estudio',
      'acepto_oportunidad',
      'intento_combinar'
    ],
    postura_carrera: [
      'retoma_politica',
      'duda_carrera'
    ]
  },
  _default: {}
};

function obtenerGrupoDeBandera(estado, bandera) {
  const tabla =
    GRUPOS_EXCLUYENTES[estado.carreraActiva] ||
    GRUPOS_EXCLUYENTES._default;

  for (const banderas of Object.values(tabla)) {
    if (banderas.includes(bandera)) {
      return banderas;
    }
  }

  return null;
}

function setearBanderas(estado, banderas = []) {
  for (const bandera of banderas) {

    const grupo = obtenerGrupoDeBandera(estado, bandera);

    if (grupo) {
      for (const otra of grupo) {
        if (otra !== bandera) {
          delete estado.banderas[otra];
        }
      }
    }

    estado.banderas[bandera] = true;
  }
}


function aplicarIntereses(estado, intereses = {}) {
  for (const [interes, delta] of Object.entries(intereses)) {

    if (!(interes in estado.intereses)) {
      console.warn(
        `Interés desconocido: ${interes}`
      );
      continue;
    }

    estado.intereses[interes] += delta;
  }
}


function marcarExploracion(estado, carreraId) {
  if (!carreraId) return;

  const existente =
    estado.carrerasExploradas.find(
      carrera => carrera.id === carreraId
    );

  if (existente) {

    existente.interes_acumulado += 1;

  } else {

    estado.carrerasExploradas.push({
      id: carreraId,
      interes_acumulado: 1
    });

  }
}


function registrarCarreraActiva(
  estado,
  carreraId
) {
  if (!carreraId) return;

  estado.carreraActiva =
    carreraId;

  marcarExploracion(
    estado,
    carreraId
  );
}


function registrarEvento(
  estado,
  eventoId
) {

  if (
    !estado.eventosVistos.includes(eventoId)
  ) {

    estado.eventosVistos.push(
      eventoId
    );

  }

  estado.turno += 1;
}


// ------------------------------------------------------------
// TRANSVERSALES
// ------------------------------------------------------------

function registrarTransversalProcesado(
  estado,
  ventana
) {

  if (!ventana) return;

  if (
    !estado.transversalesProcesados.includes(
      ventana
    )
  ) {

    estado.transversalesProcesados.push(
      ventana
    );

  }
}


function transversalYaProcesado(
  estado,
  ventana
) {

  if (!ventana) {
    return false;
  }

  return estado.transversalesProcesados.includes(
    ventana
  );
}


export {
  ESQUEMA_VERSION,
  estadoInicial,
  aplicarEfectos,
  setearBanderas,
  aplicarIntereses,
  marcarExploracion,
  registrarCarreraActiva,
  registrarEvento,
  registrarTransversalProcesado,
  transversalYaProcesado
};