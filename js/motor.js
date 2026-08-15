// motor.js
//
// Motor de progresión narrativa.
//
// PRINCIPIO:
//
// El contenido define QUÉ ocurre.
// El estado define CÓMO llega el jugador.
// El motor define CUÁNDO puede ocurrir.
//
// TRAYECTORIA PRINCIPAL:
//
// 10 → inicio
// 20 → profundización del trabajo
// 30 → actividad universitaria
// 40 → primer parcial
// 50 → mitad de año
// 60 → exploración
// 70 → pasantía
// 80 → oportunidad laboral
// 90 → consecuencias
// 100+ → final
//
// EVENTOS TRANSVERSALES:
//
// Son acontecimientos secundarios.
// Nunca modifican "orden".
// Nunca reemplazan una etapa principal.
// Nunca pueden hacer retroceder la historia.

import {
  aplicarEfectos,
  setearBanderas,
  aplicarIntereses,
  marcarExploracion,
  registrarCarreraActiva,
  registrarEvento,
  registrarTransversalProcesado,
  transversalYaProcesado
} from './estado.js';


// ============================================================
// VENTANAS TRANSVERSALES
// ============================================================

const VENTANAS_TRANSVERSALES = {

  politica: {

    inicio: { desde: 10, hasta: 20 },
    actividad: { desde: 30, hasta: 40 },
    parcial: { desde: 40, hasta: 50 },
    mitad: { desde: 50, hasta: 60 },
    exploracion: { desde: 60, hasta: 70 },
    pasantia: { desde: 70, hasta: 80 },
    oportunidad: { desde: 80, hasta: 90 },
    consecuencias: { desde: 90, hasta: 100 },
    final: { desde: 100, hasta: Infinity }

  },

  _default: {

    inicio: { desde: 10, hasta: 20 },
    actividad: { desde: 30, hasta: 40 },
    parcial: { desde: 40, hasta: 50 },
    mitad: { desde: 50, hasta: 60 },
    exploracion: { desde: 60, hasta: 70 },
    pasantia: { desde: 70, hasta: 80 },
    oportunidad: { desde: 80, hasta: 90 },
    consecuencias: { desde: 90, hasta: 100 },
    final: { desde: 100, hasta: Infinity }

  }

};


// ============================================================
// PRECONDICIONES
// ============================================================

function cumplePrecondiciones(
  evento,
  estado
) {

  const req =
    evento.requiere || {};


  if (req.banderas) {

    for (const bandera of req.banderas) {

      if (!estado.banderas[bandera]) {
        return false;
      }

    }

  }


  if (req.banderas_no) {

    for (const bandera of req.banderas_no) {

      if (estado.banderas[bandera]) {
        return false;
      }

    }

  }


  if (req.variables) {

    for (
      const [variable, rango]
      of Object.entries(req.variables)
    ) {

      const valor =
        estado.variables[variable];

      if (valor === undefined) {
        return false;
      }

      if (
        rango.min !== undefined &&
        valor < rango.min
      ) {
        return false;
      }

      if (
        rango.max !== undefined &&
        valor > rango.max
      ) {
        return false;
      }

    }

  }


  if (req.intereses) {

    for (
      const [interes, rango]
      of Object.entries(req.intereses)
    ) {

      const valor =
        estado.intereses[interes] ?? 0;

      if (
        rango.min !== undefined &&
        valor < rango.min
      ) {
        return false;
      }

      if (
        rango.max !== undefined &&
        valor > rango.max
      ) {
        return false;
      }

    }

  }


  if (
    evento.carrera &&
    evento.carrera !== 'generico'
  ) {

    if (
      evento.carrera !==
      estado.carreraActiva
    ) {
      return false;
    }

  }


  if (req.turno) {

    if (
      req.turno.min !== undefined &&
      estado.turno < req.turno.min
    ) {
      return false;
    }

    if (
      req.turno.max !== undefined &&
      estado.turno > req.turno.max
    ) {
      return false;
    }

  }


  if (
    evento.id &&
    estado.eventosVistos.includes(
      evento.id
    )
  ) {
    return false;
  }


  return true;
}


// ============================================================
// REQUISITOS SUELTOS (sin evento completo)
// ============================================================
//
// Reutiliza cumplePrecondiciones para evaluar un bloque
// "requiere" que no pertenece a un evento con id propio,
// como el de evento.consecuencia.
//
// ============================================================

function cumpleRequisitos(
  requiere,
  estado
) {

  return cumplePrecondiciones(
    { requiere },
    estado
  );
}


// ============================================================
// ORDEN PRINCIPAL
// ============================================================

function obtenerOrdenActual(
  eventos,
  estado
) {

  let ordenActual = 0;

  for (const evento of eventos) {

    if (
      estado.eventosVistos.includes(
        evento.id
      ) &&
      typeof evento.orden === 'number' &&
      (
        !evento.carrera ||
        evento.carrera === 'generico' ||
        evento.carrera === estado.carreraActiva
      )
    ) {

      ordenActual =
        Math.max(
          ordenActual,
          evento.orden
        );

    }

  }

  return ordenActual;

}


// ============================================================
// SIGUIENTE ORDEN
// ============================================================

function obtenerSiguienteOrden(
  eventos,
  estado
) {

  const ordenActual =
    obtenerOrdenActual(
      eventos,
      estado
    );

  const ordenes = [
    ...new Set(
      eventos
        .filter(
          evento =>
            typeof evento.orden === 'number' &&
            (
              !evento.carrera ||
              evento.carrera === 'generico' ||
              evento.carrera === estado.carreraActiva
            )
        )
        .map(
          evento => evento.orden
        )
    )
  ];

  ordenes.sort(
    (a, b) => a - b
  );

  return (
    ordenes.find(
      orden =>
        orden > ordenActual
    ) ?? null
  );

}


// ============================================================
// ESPECIFICIDAD
// ============================================================

function especificidadEvento(
  evento
) {

  const req =
    evento.requiere || {};

  let puntuacion = 0;

  if (req.banderas) {
    puntuacion +=
      req.banderas.length * 3;
  }

  if (req.banderas_no) {
    puntuacion +=
      req.banderas_no.length * 2;
  }

  if (req.variables) {
    puntuacion +=
      Object.keys(
        req.variables
      ).length * 2;
  }

  if (req.intereses) {
    puntuacion +=
      Object.keys(
        req.intereses
      ).length * 2;
  }

  if (req.turno) {
    puntuacion += 1;
  }

  return puntuacion;
}


// ============================================================
// EVENTO PRINCIPAL
// ============================================================

function siguienteEventoPrincipal(
  eventos,
  estado
) {

  const ordenActual =
    obtenerOrdenActual(
      eventos,
      estado
    );

  const ordenes = [
    ...new Set(
      eventos
        .filter(
          evento =>
            typeof evento.orden === 'number'
        )
        .map(
          evento => evento.orden
        )
    )
  ];

  ordenes.sort(
    (a, b) => a - b
  );


  for (const orden of ordenes) {

    if (orden <= ordenActual) {
      continue;
    }


    const candidatos =
      eventos.filter(evento => {

        if (
          evento.orden !==
          orden
        ) {
          return false;
        }

        if (
          evento.tipo ===
          'transversal'
        ) {
          return false;
        }

        return cumplePrecondiciones(
          evento,
          estado
        );

      });


    if (candidatos.length > 0) {

candidatos.sort(
        (a, b) => {

          const diff =
            especificidadEvento(b) -
            especificidadEvento(a);

          if (diff !== 0) {
            return diff;
          }

          return (
            (b.prioridad ?? 0) -
            (a.prioridad ?? 0)
          );

        }
      );

      return candidatos[0];

    }


    const eventosDeEstaOrden =
      eventos.filter(evento =>
        evento.orden === orden &&
        evento.tipo !== 'transversal'
      );


    const sePuedeOmitir =
      eventosDeEstaOrden.length > 0 &&
      eventosDeEstaOrden.every(
        evento =>
          evento.omitirSiNoCumple === true
      );


    if (!sePuedeOmitir) {

      console.warn(
        `No existe un evento válido para la etapa ${orden}.`
      );

      return null;

    }

  }


  return null;
}


// ============================================================
// VENTANA
// ============================================================

function obtenerNombreVentanaActual(
  evento,
  ordenActual,
  estado
) {

  if (!evento.ventana) {
    return null;
  }

  const ventanas =
    Array.isArray(evento.ventana)
      ? evento.ventana
      : [evento.ventana];


  for (const nombre of ventanas) {

    const tablaVentanas =
      VENTANAS_TRANSVERSALES[estado.carreraActiva] ||
      VENTANAS_TRANSVERSALES._default;

    const ventana =
      tablaVentanas[
        nombre
      ];

    if (!ventana) {
      continue;
    }

    if (
      ordenActual >= ventana.desde &&
      ordenActual < ventana.hasta
    ) {

      return nombre;

    }

  }

  return null;
}


// ============================================================
// VENTANA TRANSVERSAL
// ============================================================

function cumpleVentanaTransversal(
  evento,
  ordenActual,
  estado
) {

  return (
    obtenerNombreVentanaActual(
      evento,
      ordenActual,
      estado
    ) !== null
  );
}

function obtenerUltimoEventoPrincipal(eventosPrincipales, estado) {

  for (let i = estado.eventosVistos.length - 1; i >= 0; i--) {

    const evento = eventosPrincipales.find(
      e => e.id === estado.eventosVistos[i]
    );

    if (evento && typeof evento.orden === 'number') {
      return evento;
    }

  }

  return null;
}

// ============================================================
// CANDIDATOS TRANSVERSALES
// ============================================================

function obtenerCandidatosTransversales(
  eventosTransversales,
  eventosPrincipales,
  estado
) {

const ordenActual =
    obtenerOrdenActual(
      eventosPrincipales,
      estado
    );

  if (ordenActual <= 0) {
    return [];
  }

  const ultimoEvento =
    obtenerUltimoEventoPrincipal(eventosPrincipales, estado);

  if (ultimoEvento && ultimoEvento.permiteTransversal === false) {
    return [];
  }

  return eventosTransversales
    .filter(evento => {

      if (
        evento.tipo !==
        'transversal'
      ) {
        return false;
      }


      if (
        estado.eventosVistos.includes(
          evento.id
        )
      ) {
        return false;
      }


      if (
        !cumplePrecondiciones(
          evento,
          estado
        )
      ) {
        return false;
      }


      return cumpleVentanaTransversal(
        evento,
        ordenActual,
        estado
      );

    })
    .map(evento => ({

      evento,

      ventana:
        obtenerNombreVentanaActual(
          evento,
          ordenActual,
          estado
        )

    }))
    .filter(item =>
      !transversalYaProcesado(
        estado,
        item.ventana
      )
    );
}


// ============================================================
// SIGUIENTE TRANSVERSAL
// ============================================================
//
// Regla:
//
// Máximo UN transversal por ventana narrativa.
//
// Una vez que aparece uno:
//
// ventana → procesada
//
// Los demás transversales de esa misma ventana quedan para
// futuras partidas, pero no compiten dentro de la actual.
//
// ============================================================

function siguienteEventoTransversal(
  eventosTransversales,
  eventosPrincipales,
  estado
) {

  if (
    !Array.isArray(
      eventosTransversales
    ) ||
    eventosTransversales.length === 0
  ) {
    return null;
  }


  const candidatos =
    obtenerCandidatosTransversales(
      eventosTransversales,
      eventosPrincipales,
      estado
    );


  if (
    candidatos.length === 0
  ) {
    return null;
  }


  candidatos.sort(
    (a, b) =>
      especificidadEvento(
        b.evento
      ) -
      especificidadEvento(
        a.evento
      )
  );


  return candidatos[0].evento;
}


// ============================================================
// PUEDE APARECER TRANSVERSAL
// ============================================================

function puedeAparecerTransversal(
  evento,
  eventosPrincipales,
  estado
) {

  if (
    !evento ||
    evento.tipo !==
    'transversal'
  ) {
    return false;
  }


  if (
    estado.eventosVistos.includes(
      evento.id
    )
  ) {
    return false;
  }


  const ordenActual =
    obtenerOrdenActual(
      eventosPrincipales,
      estado
    );


  const ventana =
    obtenerNombreVentanaActual(
      evento,
      ordenActual,
      estado
    );


  if (!ventana) {
    return false;
  }


  if (
    transversalYaProcesado(
      estado,
      ventana
    )
  ) {
    return false;
  }


  return cumplePrecondiciones(
    evento,
    estado
  );
}


// ============================================================
// SIGUIENTE EVENTO
// ============================================================

function siguienteEvento(
  eventos,
  estado,
  eventosTransversales = []
) {

  // ----------------------------------------------------------
  // TRANSVERSAL
  // ----------------------------------------------------------

  const transversal =
    siguienteEventoTransversal(
      eventosTransversales,
      eventos,
      estado
    );


  if (transversal) {

    return transversal;

  }


  // ----------------------------------------------------------
  // PRINCIPAL
  // ----------------------------------------------------------

  return siguienteEventoPrincipal(
    eventos,
    estado
  );
}


// ============================================================
// CARRERA
// ============================================================

function iniciarCarrera(
  estado,
  carreraId
) {

  if (!carreraId) {
    return estado;
  }

  registrarCarreraActiva(
    estado,
    carreraId
  );

  return estado;
}


// ============================================================
// DERIVA
// ============================================================

function hayEvidenciaDeDeriva(
  estado
) {

  const intereses =
    estado.intereses || {};

  return Object.entries(
    intereses
  )
    .some(
      ([, valor]) =>
        valor >= 3
    );
}


function obtenerInteresesDominantes(
  estado
) {

  return Object.entries(
    estado.intereses || {}
  )
    .filter(
      ([, valor]) =>
        valor > 0
    )
    .sort(
      (a, b) =>
        b[1] - a[1]
    );
}


// ============================================================
// CAMBIO DE TRAYECTORIA
// ============================================================

function cambiarTrayectoria(
  estado,
  nuevaCarrera
) {

  if (!nuevaCarrera) {
    return estado;
  }

  if (
    nuevaCarrera ===
    estado.carreraActiva
  ) {
    return estado;
  }

  estado.carreraActiva =
    nuevaCarrera;

  marcarExploracion(
    estado,
    nuevaCarrera
  );

  return estado;
}


// ============================================================
// CONSECUENCIA DIFERIDA
// ============================================================
//
// Algunos eventos (sobre todo transversales) tienen un bloque
// "consecuencia": un desenlace narrativo que se muestra
// inmediatamente después de resolver la opción elegida, si el
// estado resultante cumple su propio "requiere".
//
// No es un evento nuevo dentro de la trayectoria: no suma un
// "orden", no se guarda en eventosVistos, no compite por
// especificidad. Es un remate narrativo de UN evento puntual.
//
// ============================================================

function evaluarConsecuencia(
  estado,
  evento
) {

  const consecuencia =
    evento.consecuencia;

  if (!consecuencia) {
    return null;
  }


  const cumple =
    consecuencia.requiere
      ? cumpleRequisitos(
          consecuencia.requiere,
          estado
        )
      : true;


  if (!cumple) {
    return null;
  }


  aplicarEfectos(
    estado,
    consecuencia.efectos || {}
  );


  setearBanderas(
    estado,
    consecuencia.banderaSet || []
  );


  return {
    texto: consecuencia.texto,
    recurso: evento.recurso || null,
    recursoSecundario:
      evento.recurso_secundario || null
  };
}


// ============================================================
// DECISIÓN
// ============================================================

function elegirOpcion(
  estado,
  evento,
  opcion,
  eventosPrincipales = []
) {

  if (!opcion) {
    return { estado, consecuencia: null };
  }


  aplicarEfectos(
    estado,
    opcion.efectos || {}
  );


  setearBanderas(
    estado,
    opcion.banderaSet || []
  );


  aplicarIntereses(
    estado,
    opcion.intereses || {}
  );


  if (
    evento.carrera &&
    evento.carrera !==
    'generico'
  ) {

    marcarExploracion(
      estado,
      evento.carrera
    );

  }


  if (
    opcion.cambiarCarrera
  ) {

    cambiarTrayectoria(
      estado,
      opcion.cambiarCarrera
    );

  }


  // ----------------------------------------------------------
  // REGISTRAR EVENTO
  // ----------------------------------------------------------

  registrarEvento(
    estado,
    evento.id
  );


  // ----------------------------------------------------------
  // REGISTRAR TRANSVERSAL
  // ----------------------------------------------------------
  //
  // El transversal no cambia el orden principal.
  //
  // Solamente marcamos que la ventana ya tuvo su acontecimiento.
  //

  if (
    evento.tipo ===
    'transversal'
  ) {

    const ventana =
      obtenerNombreVentanaActual(
        evento,
        obtenerOrdenActual(
          eventosPrincipales,
          estado
        ),
        estado
      );


    // Si no podemos determinarla por orden,
    // usamos la primera ventana declarada.
    const ventanaFinal =
      ventana ||
      (
        Array.isArray(
          evento.ventana
        )
          ? evento.ventana[0]
          : evento.ventana
      );


    registrarTransversalProcesado(
      estado,
      ventanaFinal
    );

  }


  // ----------------------------------------------------------
  // CONSECUENCIA DIFERIDA
  // ----------------------------------------------------------
  //
  // Se evalúa DESPUÉS de aplicar todo lo anterior, para que
  // pueda depender de banderas/variables recién actualizadas
  // por la opción elegida (ej. "busco_beneficios_unr").
  //

  const consecuencia =
    evaluarConsecuencia(
      estado,
      evento
    );


  return { estado, consecuencia };
}


// ============================================================
// DERIVA
// ============================================================

function puedeAparecerDeriva(
  estado
) {

  if (!estado.carreraActiva) {
    return false;
  }

  if (estado.turno < 3) {
    return false;
  }

  if (
    !hayEvidenciaDeDeriva(
      estado
    )
  ) {
    return false;
  }

  if (
    estado.banderas.deriva_ofrecida
  ) {
    return false;
  }

  return true;
}


// ============================================================
// DEBUG
// ============================================================

function obtenerProgresoNarrativo(
  eventos,
  estado
) {

  const ordenActual =
    obtenerOrdenActual(
      eventos,
      estado
    );

  const siguienteOrden =
    obtenerSiguienteOrden(
      eventos,
      estado
    );

  return {
    ordenActual,
    siguienteOrden
  };
}


function obtenerEstadoTransversales(
  eventosPrincipales,
  eventosTransversales,
  estado
) {

  const ordenActual =
    obtenerOrdenActual(
      eventosPrincipales,
      estado
    );


  const candidatos =
    obtenerCandidatosTransversales(
      eventosTransversales,
      eventosPrincipales,
      estado
    );


  const disponibles =
    candidatos.map(
      item => item.evento.id
    );


  const vistos =
    eventosTransversales
      .filter(evento =>
        estado.eventosVistos.includes(
          evento.id
        )
      )
      .map(
        evento => evento.id
      );


  return {
    ordenActual,
    disponibles,
    vistos,
    transversalesProcesados:
      estado.transversalesProcesados || []
  };
}


// ============================================================
// EXPORTS
// ============================================================

export {

  cumplePrecondiciones,

  cumpleRequisitos,

  siguienteEvento,

  siguienteEventoPrincipal,

  siguienteEventoTransversal,

  puedeAparecerTransversal,

  elegirOpcion,

  evaluarConsecuencia,

  iniciarCarrera,

  cambiarTrayectoria,

  hayEvidenciaDeDeriva,

  obtenerInteresesDominantes,

  puedeAparecerDeriva,

  obtenerOrdenActual,

  obtenerSiguienteOrden,

  obtenerProgresoNarrativo,

  obtenerEstadoTransversales

};
