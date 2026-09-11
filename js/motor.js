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
// EVENTOS CONDICIONADOS:
//
// Son acontecimientos secundarios que declaran rangoOrden en vez
// de orden fijo. Pueden aparecer en cualquier punto de ese rango,
// sujetos a su "requiere" (igual que cualquier otro evento).
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
  registrarRangoProcesado,
  rangoYaProcesado,
  actualizarPermiteTransversal
} from './estado.js';


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
// RESULTADO ALEATORIO EN PARCIAL
// ============================================================

function resolverResultadoAleatorio(
  estado,
  config,
  origen = null
) {

  if (!config) {
    return null;
  }

  const valor =
    estado.variables[config.variable] ?? 0;

  const base =
    config.probabilidadBase ?? 0.5;

  const incremento =
    config.incrementoPorPunto ?? 0;

  let probabilidad =
    base + (valor * incremento);

  probabilidad =
    Math.max(0, Math.min(1, probabilidad));

  const exito =
    Math.random() < probabilidad;

  setearBanderas(
    estado,
    [exito ? config.banderaExito : config.banderaFracaso],
    origen
  );

  return exito;
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
// EVENTO PRINCIPAL (orden fijo)
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
        evento.orden === orden
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
// CANDIDATOS CONDICIONADOS
// ============================================================

function obtenerCandidatosCondicionados(
  eventos,
  estado
) {

  const ordenActual =
    obtenerOrdenActual(
      eventos,
      estado
    );

  if (ordenActual <= 0) {
    return [];
  }

  if (estado.permiteTransversal === false) {
    return [];
  }

  return eventos.filter(evento => {

    if (!evento.rangoOrden) {
      return false;
    }

    if (
      estado.eventosVistos.includes(
        evento.id
      )
    ) {
      return false;
    }

    const [desde, hasta] = evento.rangoOrden;

    if (
      ordenActual < desde ||
      ordenActual >= hasta
    ) {
      return false;
    }

    if (
      rangoYaProcesado(
        estado,
        evento.rangoOrden
      )
    ) {
      return false;
    }

    return cumplePrecondiciones(
      evento,
      estado
    );

  });
}


// ============================================================
// SIGUIENTE CONDICIONADO
// ============================================================
//
// Regla: máximo un evento condicionado por rango, por partida.
// Una vez que aparece uno, ese rango queda procesado y no vuelve
// a competir dentro de la misma partida.
//
// ============================================================

function siguienteEventoCondicionado(
  eventos,
  estado
) {

  const candidatos =
    obtenerCandidatosCondicionados(
      eventos,
      estado
    );

  if (candidatos.length === 0) {
    return null;
  }

  candidatos.sort(
    (a, b) =>
      especificidadEvento(b) -
      especificidadEvento(a)
  );

  return candidatos[0];
}


// ============================================================
// SIGUIENTE EVENTO
// ============================================================

function siguienteEvento(
  eventos,
  estado
) {

  const condicionado =
    siguienteEventoCondicionado(
      eventos,
      estado
    );

  if (condicionado) {
    return condicionado;
  }

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

function evaluarConsecuencia(
  estado,
  fuenteConsecuencia,
  origen = null
) {

  const consecuencia =
    fuenteConsecuencia.consecuencia;

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


  const origenFinal =
    origen ||
    { funcion: fuenteConsecuencia.funcion };

  setearBanderas(
    estado,
    consecuencia.banderaSet || [],
    origenFinal
  );


  return {
    contexto: consecuencia.contexto || null,
    texto: consecuencia.texto,
    recurso: fuenteConsecuencia.recurso || null,
    recursoSecundario:
      fuenteConsecuencia.recurso_secundario || null,
    opciones: consecuencia.opciones || null
  };
  }

// ============================================================
// RESULTADO DE OPCIÓN
// ============================================================

function evaluarResultadoOpcion(
  opcion
) {

  if (!opcion || !opcion.resultado) {
    return null;
  }

  return {
    texto: opcion.resultado.texto,
    recurso: opcion.resultado.recurso || null,
    recursoSecundario:
      opcion.resultado.recurso_secundario || null
  };
}

// ============================================================
// OPCIÓN DE CONSECUENCIA
// ============================================================

function elegirOpcionConsecuencia(
  estado,
  opcion,
  eventoOrigen = null
) {

  if (!opcion) {
    return { estado, resultadoOpcion: null, consecuencia: null };
  }

  const origen =
    eventoOrigen
      ? { funcion: eventoOrigen.funcion }
      : null;

  aplicarEfectos(
    estado,
    opcion.efectos || {}
  );

  setearBanderas(
    estado,
    opcion.banderaSet || [],
    origen
  );

  const resultadoOpcion =
    evaluarResultadoOpcion(
      opcion
    );

  const consecuencia =
    evaluarConsecuencia(
      estado,
      opcion,
      origen
    );

  return { estado, resultadoOpcion, consecuencia };
}

// ============================================================
// DECISIÓN
// ============================================================

function elegirOpcion(
  estado,
  evento,
  opcion
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
    opcion.banderaSet || [],
    { funcion: evento.funcion }
  );


  aplicarIntereses(
    estado,
    opcion.intereses || {}
  );


  const permiteTransversal =
    opcion.permiteTransversal !== undefined
      ? opcion.permiteTransversal
      : (
          evento.permiteTransversal !== undefined
            ? evento.permiteTransversal
            : true
        );

  actualizarPermiteTransversal(
    estado,
    permiteTransversal
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

  if (opcion.resultadoAleatorio) {

    resolverResultadoAleatorio(
      estado,
      opcion.resultadoAleatorio,
      { funcion: evento.funcion }
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
  // REGISTRAR RANGO CONDICIONADO
  // ----------------------------------------------------------

  if (evento.rangoOrden) {

    registrarRangoProcesado(
      estado,
      evento.rangoOrden
    );

  }


  // ----------------------------------------------------------
  // CONSECUENCIA DIFERIDA
  // ----------------------------------------------------------

  const consecuencia =
    evaluarConsecuencia(
      estado,
      evento
    );

  const resultadoOpcion =
    evaluarResultadoOpcion(
      opcion
    );


  return { estado, consecuencia, resultadoOpcion };
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


function obtenerEstadoCondicionados(
  eventos,
  estado
) {

  const ordenActual =
    obtenerOrdenActual(
      eventos,
      estado
    );


  const candidatos =
    obtenerCandidatosCondicionados(
      eventos,
      estado
    );


  const disponibles =
    candidatos.map(
      evento => evento.id
    );


  const vistos =
    eventos
      .filter(evento =>
        evento.rangoOrden &&
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
    rangosCondicionadosProcesados:
      estado.rangosCondicionadosProcesados || {}
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

  siguienteEventoCondicionado,

  elegirOpcion,

  evaluarConsecuencia,

  evaluarResultadoOpcion,

  elegirOpcionConsecuencia,

  iniciarCarrera,

  cambiarTrayectoria,

  hayEvidenciaDeDeriva,

  obtenerInteresesDominantes,

  puedeAparecerDeriva,

  obtenerOrdenActual,

  obtenerSiguienteOrden,

  obtenerProgresoNarrativo,

  obtenerEstadoCondicionados,

  resolverResultadoAleatorio,

};