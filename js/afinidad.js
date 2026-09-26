// afinidad.js
// Cruce determinístico entre los intereses del jugador y el plan de estudios
// de su carrera. Es una función pura, sin IA: decide QUÉ áreas son relevantes
// para este jugador. La IA (Worker) solo redacta la devolución a partir de
// este resultado ya decidido.

const CANTIDAD_AREAS_ELEGIDAS = 3;

function calcularScoreArea(area, interesesRankeados) {
  return interesesRankeados.reduce((score, interes) => {
    return area.etiquetas.includes(interes.nombre)
      ? score + interes.valor
      : score;
  }, 0);
}

function contarEtiquetasCompartidas(area, interesesRankeados) {
  const nombresIntereses = interesesRankeados.map(i => i.nombre);
  return area.etiquetas.filter(e => nombresIntereses.includes(e)).length;
}

function anioPromedioArea(area, materias) {
  const materiasDelArea = materias.filter(m =>
    area.materiasRelacionadas.includes(m.id)
  );
  if (materiasDelArea.length === 0) return Infinity;
  const suma = materiasDelArea.reduce((acc, m) => acc + m.anio, 0);
  return suma / materiasDelArea.length;
}

// Desempate: 1) score más alto, 2) más etiquetas distintas en común,
// 3) año promedio más bajo (más temprano y "accionable" en la carrera).
function ordenarAreasPorAfinidad(areas, materias, interesesRankeados) {
  return [...areas]
    .map(area => ({
      area,
      score: calcularScoreArea(area, interesesRankeados),
      etiquetasCompartidas: contarEtiquetasCompartidas(area, interesesRankeados),
      anioPromedio: anioPromedioArea(area, materias)
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.etiquetasCompartidas !== a.etiquetasCompartidas) {
        return b.etiquetasCompartidas - a.etiquetasCompartidas;
      }
      return a.anioPromedio - b.anioPromedio;
    });
}

function curarMateriasDeArea(area, materias) {
  return materias
    .filter(m => area.materiasRelacionadas.includes(m.id))
    .map(m => ({
      nombre: m.nombre,
      descripcionBreve: m.descripcionBreve,
      ejesTematicos: m.ejesTemáticos,
      link: m.link || null
    }));
}

// Punto de entrada. datosCarrera es el JSON completo de politica.json
// (con .areas y .materias). interesesRankeados es el mismo array que ya
// arma construirResumenTrayectoria en main.js: [{ nombre, valor }, ...].
export function calcularAfinidadCarrera(
  datosCarrera,
  interesesRankeados,
  cantidad = CANTIDAD_AREAS_ELEGIDAS
) {
  if (
    !datosCarrera ||
    !Array.isArray(datosCarrera.areas) ||
    !Array.isArray(datosCarrera.materias)
  ) {
    return [];
  }

  if (!Array.isArray(interesesRankeados) || interesesRankeados.length === 0) {
    return [];
  }

  const areasOrdenadas = ordenarAreasPorAfinidad(
    datosCarrera.areas,
    datosCarrera.materias,
    interesesRankeados
  );

  return areasOrdenadas
    .filter(({ score }) => score > 0)
    .slice(0, cantidad)
    .map(({ area, score }) => ({
      id: area.id,
      nombre: area.nombre,
      descripcion: area.descripcion,
      score,
      materias: curarMateriasDeArea(area, datosCarrera.materias)
    }));
}