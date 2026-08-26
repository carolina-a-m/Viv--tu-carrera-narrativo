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
    
    // Procedencia de cada bandera activa: indica si la "funcion"
    // del evento que la seteó está habilitada para la IA.
    procedenciaBanderas: {},

    // Decisiones tomadas, con marca de seguridad heredada del
    // evento de origen. Reemplaza a decisionesTexto.
    decisiones: [],

    // Cantidad total de decisiones tomadas.
    turno: 0,

    // ----------------------------------------------------------
    // CONTROL DE EVENTOS TRANSVERSALES
    // ----------------------------------------------------------
    //
    // Guarda, por carrera, qué ventanas ya tuvieron una
    // oportunidad transversal.
    //
    // Ejemplo:
    //
    // { politica: ["inicio", "actividad"], medicina: ["inicio"] }
    //
    // Esto evita que la misma ventana, dentro de la misma
    // carrera, dispare acontecimientos secundarios indefinidamente
    // — sin bloquear esas mismas ventanas en otra carrera.
    //
    transversalesProcesados: {}
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

// ------------------------------------------------------------
// FRONTERA IA: FUNCIONES NARRATIVAS SEGURAS
// ------------------------------------------------------------
//
// Lista blanca. Todo lo que no esté acá queda excluido por
// defecto del contexto que recibe la IA, incluidos eventos
// transversales nuevos aún no clasificados.
//
// Los eventos principales (no transversales) son seguros por
// definición: son la trayectoria pública del juego.
//
const FUNCIONES_SEGURAS_IA = new Set([
  // vacío por ahora. Agregar acá la "funcion" de un transversal
  // SOLO si su contenido puede analizarse sin riesgo narrativo.
]);

function esFuncionSeguraParaIA(funcion, tipoEvento) {

  if (tipoEvento !== 'transversal') {
    return true;
  }

  return FUNCIONES_SEGURAS_IA.has(funcion);
}

function setearBanderas(estado, banderas = [], origen = null) {
  for (const bandera of banderas) {

    const grupo = obtenerGrupoDeBandera(estado, bandera);

    if (grupo) {
      for (const otra of grupo) {
        if (otra !== bandera) {
          delete estado.banderas[otra];
          delete estado.procedenciaBanderas[otra];
        }
      }
    }

    estado.banderas[bandera] = true;

    if (origen) {
      estado.procedenciaBanderas[bandera] =
        esFuncionSeguraParaIA(origen.funcion, origen.tipo);
    }
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

function registrarDecision(estado, texto, origen, intereses = {}) {

  if (!texto) return;

  estado.decisiones.push({
    texto,
    intereses,
    segura: esFuncionSeguraParaIA(origen?.funcion, origen?.tipo)
  });
}


function obtenerContextoSeguroIA(estado) {

  const banderasSeguras =
    Object.entries(estado.procedenciaBanderas)
      .filter(([, segura]) => segura)
      .map(([bandera]) => bandera)
      .filter(bandera => estado.banderas[bandera]);

  const decisionesSeguras =
    (estado.decisiones || [])
      .filter(decision => decision.segura)
      .map(decision => ({
        texto: decision.texto,
        intereses: decision.intereses || {}
      }));

  return { banderasSeguras, decisionesSeguras };
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

  const carrera =
    estado.carreraActiva;

  if (!carrera) return;

  if (!estado.transversalesProcesados[carrera]) {
    estado.transversalesProcesados[carrera] = [];
  }

  if (
    !estado.transversalesProcesados[carrera].includes(
      ventana
    )
  ) {

    estado.transversalesProcesados[carrera].push(
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

  const carrera =
    estado.carreraActiva;

  if (!carrera) {
    return false;
  }

  const procesadas =
    estado.transversalesProcesados[carrera];

  if (!procesadas) {
    return false;
  }

  return procesadas.includes(
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
  transversalYaProcesado,
  registrarDecision,
  obtenerContextoSeguroIA
};