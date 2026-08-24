// ui.js
// Este archivo solo se ocupa de mostrar la experiencia.
// No decide qué evento viene después.
// No aplica efectos al estado.
// No conoce las reglas de precondiciones.
// Recibe datos y callbacks desde main.js.

const ASSETS = 'assets/decision/';

const ICONO_GENERICO = '📌';
const DESCRIPCION_GENERICA = 'Elegí cómo actuar frente a esta situación.';

const HITOS = [
  { icono: ASSETS + 'icono-personas.svg' },
  { icono: ASSETS + 'icono-libro.svg' },
  { icono: ASSETS + 'icono-datos.svg' },
  { icono: ASSETS + 'icono-globo.svg', opaco: true }
];


function renderEvento(evento, onElegir, estado) {
  const contenedor = document.getElementById('juego');
  if (!contenedor) return;

  contenedor.innerHTML = '';

  contenedor.appendChild(crearLogoHorizontal());

  const bloque = document.createElement('div');
  bloque.className = 'decision-bloque';

  if (estado) {
    const personaje = document.createElement('div');
    personaje.className = 'decision-personaje';
    personaje.appendChild(crearHeaderJugador(estado));
    personaje.appendChild(crearPanelIndicadores(estado));
    bloque.appendChild(personaje);
  }

  const narrativaGrupo = document.createElement('div');
  narrativaGrupo.className = 'decision-narrativa-grupo';

  const narrativa = document.createElement('div');
  narrativa.className = 'decision-narrativa';
  const narrativaBloque = document.createElement('div');
  narrativaBloque.className = 'decision-narrativa-bloque';
  if (evento.contexto) {
    narrativaBloque.innerHTML += `<p class="decision-narrativa-titulo">${evento.contexto}</p>`;
  }
  narrativaBloque.innerHTML += `<p class="decision-narrativa-texto">${(evento.icono ? evento.icono + ' ' : '') + evento.texto}</p>`;
  narrativa.appendChild(narrativaBloque);
  narrativaGrupo.appendChild(narrativa);

  const opciones = document.createElement('div');
  opciones.className = 'decision-elecciones';
  evento.opciones.forEach((opcion) => {
    opciones.appendChild(crearBoxOpcion(opcion, () => {
      opciones.querySelectorAll('button').forEach(b => { b.disabled = true; });
      onElegir(opcion);
    }));
  });
  narrativaGrupo.appendChild(opciones);

  bloque.appendChild(narrativaGrupo);
  contenedor.appendChild(bloque);
}


function crearLogoHorizontal() {
  const div = document.createElement('div');
  div.className = 'decision-logo';
  div.innerHTML = `<img src="${ASSETS}logo-horizontal.svg" alt="Viví tu carrera">`;
  return div;
}


const LOGOS_FACULTAD_HEADER = {
  fcpolit: 'facu-fcpolit.svg',
  farpd: 'facu-farpd.svg',
  fcm: 'facu-fcm.svg',
  fceye: 'facu-fceye.svg'
};

function crearHeaderJugador(resumen) {
  const fila = document.createElement('div');
  fila.className = 'decision-personaje-fila';

  const datos = document.createElement('div');
  datos.className = 'decision-personaje-datos';
  datos.innerHTML = `
    <p class="decision-personaje-nombre">${resumen.nombre || ''}</p>
    <div class="decision-personaje-meta"><span>${resumen.carreraNombre || ''}</span></div>
  `;
  fila.appendChild(datos);

  const logoFacu = LOGOS_FACULTAD_HEADER[resumen.facultadId] || 'facu-fcpolit.svg';

  const unrFacu = document.createElement('div');
  unrFacu.className = 'decision-unr-facu';
  unrFacu.innerHTML = `
    <div class="decision-logo-unr">
  <img src="${ASSETS}unr-base.svg" alt="UNR" style="width:100%;height:100%;">
  <img class="capa capa-1" src="${ASSETS}unr-vector1.svg" alt="">
  <img class="capa capa-2" src="${ASSETS}unr-vector2.svg" alt="">
  <img class="capa capa-3" src="${ASSETS}unr-vector3.svg" alt="">
</div>
    <div class="decision-logos-facu">
      <img src="${ASSETS}${logoFacu}" alt="${resumen.facultadId || ''}">
    </div>
  `;
  fila.appendChild(unrFacu);

  return fila;
}


function crearPanelIndicadores(resumen) {
  const panel = document.createElement('div');
  panel.className = 'decision-panel';
  panel.id = 'panel-stats';

  const datos = document.createElement('div');
  datos.className = 'decision-panel-datos';

  const filaStats = document.createElement('div');
  filaStats.className = 'decision-stats-fila';

  const promedio = document.createElement('div');
  promedio.className = 'decision-promedio';
  promedio.innerHTML = `
    <img src="${ASSETS}gauge-promedio.svg" alt="">
    <div class="decision-promedio-valor">
      <div class="decision-promedio-num">
        <strong>${(resumen.interes ?? 0).toFixed(1)}</strong>
        <span>Interes</span>
      </div>
      <div class="decision-promedio-caret"><img src="${ASSETS}caret-up.svg" alt=""></div>
    </div>
  `;
  filaStats.appendChild(promedio);

  const competencias = document.createElement('div');
  competencias.className = 'decision-competencias';
  const filaComp = document.createElement('div');
  filaComp.className = 'decision-competencias-fila';

  const variables = resumen.variables || {};
  const etiquetas = { dinero: 'Dinero', energia: 'Energía', confianza: 'Confianza', exploracion: 'Exploración' };

  Object.keys(etiquetas).forEach((clave) => {
    const valor = variables[clave] ?? 0;
    const gauge = valor >= 60 ? 'gauge-75.svg' : 'gauge-50.svg';
    const item = document.createElement('div');
    item.className = 'decision-competencia';
    item.innerHTML = `
      <div class="decision-competencia-valor">
        <img src="${ASSETS}${gauge}" alt="">
        <span>${valor}</span>
      </div>
      <p class="decision-competencia-label">${etiquetas[clave]}</p>
    `;
    filaComp.appendChild(item);
  });

  competencias.appendChild(filaComp);
  filaStats.appendChild(competencias);
  datos.appendChild(filaStats);

  const objetivos = document.createElement('div');
  objetivos.className = 'decision-objetivos';
  const barraWrap = document.createElement('div');
  barraWrap.className = 'decision-barra-wrap';
  barraWrap.innerHTML = `<div class="decision-barra-fondo"></div>`;
  const barraProgreso = document.createElement('div');
  barraProgreso.className = 'decision-barra-progreso';
  barraProgreso.style.width = `${resumen.progreso ?? 0}%`;
  barraWrap.querySelector('.decision-barra-fondo').appendChild(barraProgreso);
  objetivos.appendChild(barraWrap);

  const hitos = document.createElement('div');
  hitos.className = 'decision-hitos';
  HITOS.forEach(h => {
    const hito = document.createElement('div');
    hito.className = 'decision-hito' + (h.opaco ? ' opaco' : '');
    hito.innerHTML = `
      <div class="decision-hito-linea"></div>
      <div class="decision-hito-icono"><img src="${h.icono}" alt=""></div>
    `;
    hitos.appendChild(hito);
  });
  objetivos.appendChild(hitos);
  datos.appendChild(objetivos);

  panel.appendChild(datos);

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'decision-colapsar';
  toggle.setAttribute('aria-label', 'Mostrar/ocultar estadísticas');
  toggle.innerHTML = `<div class="decision-colapsar-icono"><img src="${ASSETS}caret-down.svg" alt=""></div>`;
  toggle.addEventListener('click', () => {
    toggle.classList.toggle('abierto');
  });
  panel.appendChild(toggle);

  return panel;
}


function crearBoxOpcion(opcion, onClick) {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'decision-eleccion';

  const cuerpo = document.createElement('div');
  cuerpo.className = 'decision-eleccion-cuerpo';

  const cabecera = document.createElement('div');
  cabecera.className = 'decision-eleccion-cabecera';
  const icono = opcion.icono || ICONO_GENERICO;
  cabecera.innerHTML = `<p class="decision-eleccion-titulo">${icono} ${opcion.texto}</p>`;
  if (opcion.badge) {
    cabecera.innerHTML += `<span class="decision-eleccion-badge">${opcion.badge}</span>`;
  }
  cuerpo.appendChild(cabecera);

  const desc = document.createElement('p');
  desc.className = 'decision-eleccion-desc';
  desc.textContent = opcion.descripcion || DESCRIPCION_GENERICA;
  cuerpo.appendChild(desc);

  boton.appendChild(cuerpo);

  const footer = document.createElement('div');
  footer.className = 'decision-eleccion-footer';

  const mods = document.createElement('div');
  mods.className = 'decision-eleccion-mods';
  const etiquetasEfecto = { dinero: 'Dinero', energia: 'Energía', confianza: 'Confianza', exploracion: 'Exploración', progreso: 'Progreso' };
  const efectos = opcion.efectos || {};
  Object.keys(efectos).forEach((clave) => {
    const valor = efectos[clave];
    if (!valor) return;
    const mod = document.createElement('div');
    mod.className = 'decision-mod ' + (valor > 0 ? 'positivo' : 'negativo');
    mod.innerHTML = `<strong>${valor > 0 ? '+' : ''}${valor}</strong><span>${etiquetasEfecto[clave] || clave}</span>`;
    mods.appendChild(mod);
  });
  footer.appendChild(mods);

  footer.innerHTML += `<div class="decision-eleccion-flecha"><img src="${ASSETS}chevron-right.svg" alt=""></div>`;
  boton.appendChild(footer);

  boton.addEventListener('click', onClick);

  return boton;
}


function renderConsecuencia(consecuencia, onContinuar, onElegirOpcion) {
  const contenedor = document.getElementById('juego');
  if (!contenedor) return;
  contenedor.innerHTML = '';

  const texto = document.createElement('p');
  texto.className = 'consecuencia-texto';
  texto.textContent = consecuencia.texto;
  contenedor.appendChild(texto);

  if (consecuencia.recurso) contenedor.appendChild(crearFichaRecurso(consecuencia.recurso));
  if (consecuencia.recursoSecundario) contenedor.appendChild(crearFichaRecurso(consecuencia.recursoSecundario));

  if (Array.isArray(consecuencia.opciones) && consecuencia.opciones.length > 0) {
    const opciones = document.createElement('div');
    opciones.className = 'opciones';

    consecuencia.opciones.forEach((opcion) => {
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'opcion';
      boton.textContent = opcion.texto;
      boton.addEventListener('click', () => {
        opciones.querySelectorAll('button').forEach(b => { b.disabled = true; });
        onElegirOpcion(opcion);
      });
      opciones.appendChild(boton);
    });

    contenedor.appendChild(opciones);
    return;
  }

  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'continuar';
  boton.textContent = 'Continuar';
  boton.addEventListener('click', () => {
    boton.disabled = true;
    onContinuar();
  });
  contenedor.appendChild(boton);
}


function renderResultadoOpcion(resultado, onContinuar) {
  const contenedor = document.getElementById('juego');
  if (!contenedor) return;
  contenedor.innerHTML = '';

  const texto = document.createElement('p');
  texto.className = 'resultado-opcion-texto';
  texto.textContent = resultado.texto;
  contenedor.appendChild(texto);

  if (resultado.recurso) contenedor.appendChild(crearFichaRecurso(resultado.recurso));
  if (resultado.recursoSecundario) contenedor.appendChild(crearFichaRecurso(resultado.recursoSecundario));

  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'continuar';
  boton.textContent = 'Continuar';
  boton.addEventListener('click', () => {
    boton.disabled = true;
    onContinuar();
  });
  contenedor.appendChild(boton);
}


function renderIntervencionIA(texto, onContinuar) {
  const contenedor = document.getElementById('juego');
  if (!contenedor) return;
  contenedor.innerHTML = '';

  const parrafo = document.createElement('p');
  parrafo.className = 'intervencion-ia-texto';
  parrafo.textContent = texto;
  contenedor.appendChild(parrafo);

  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'continuar';
  boton.textContent = 'Continuar';
  boton.addEventListener('click', () => {
    boton.disabled = true;
    onContinuar();
  });
  contenedor.appendChild(boton);
}


function crearFichaRecurso(recurso) {
  const ficha = document.createElement('div');
  ficha.className = 'ficha-recurso';

  const nombre = document.createElement('strong');
  nombre.className = 'ficha-recurso-nombre';
  nombre.textContent = recurso.nombre;
  ficha.appendChild(nombre);

  if (recurso.descripcion) {
    const descripcion = document.createElement('p');
    descripcion.className = 'ficha-recurso-descripcion';
    descripcion.textContent = recurso.descripcion;
    ficha.appendChild(descripcion);
  }

  if (recurso.link) {
    const link = document.createElement('a');
    link.className = 'ficha-recurso-link';
    link.href = recurso.link;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Más información';
    ficha.appendChild(link);
  }

  return ficha;
}

const ASSETS_FACULTADES = 'assets/facultades/';
const ICONOS_FACULTAD = {
  fcpolit: { prefix: 'fcpolit', tipo: 'fila', count: 7 },
  farpd: {
    prefix: 'farpd', tipo: 'superpuesto',
    insets: ['4.59% 33.48% 2.71% 14.74%', '5.28% 80.2% 2.71% 0.01%', '4.59% -0.02% 1.79% 71.68%', '57.96% 21.57% -27.36% 58.9%']
  },
  fcm: {
    prefix: 'medicina', tipo: 'superpuesto', claseExtra: 'medicina',
    insets: ['2.36% 0% 2.21% 57.91%', '0% 45.21% 0% 27.12%', '2.36% 74.7% 2.21% 0%']
  },
  fceye: {
    prefix: 'fceye', tipo: 'superpuesto',
    insets: ['18.95% 83.19% 10.1% 0%', '18.18% 58.88% 8.84% 18.35%', '18.95% 39.92% 10.1% 43.27%', '18.95% 0% 10.1% 83.19%', '39.29% 19.11% -13.64% 61.06%']
  }
};

function crearIconoFacultad(facultadId) {
  const cfg = ICONOS_FACULTAD[facultadId];
  const wrap = document.createElement('div');

  if (!cfg) {
    wrap.className = 'icono-facultad';
    return wrap;
  }

  if (cfg.tipo === 'fila') {
    wrap.className = 'icono-facultad icono-fcpolit';
    for (let i = 1; i <= cfg.count; i++) {
      wrap.innerHTML += `<img src="${ASSETS_FACULTADES}${cfg.prefix}-${i}.svg" alt="">`;
    }
  } else {
    wrap.className = 'icono-facultad icono-superpuesto';
    cfg.insets.forEach((inset, idx) => {
      wrap.innerHTML += `<img src="${ASSETS_FACULTADES}${cfg.prefix}-${idx + 1}.svg" alt="" style="inset:${inset}; width:auto; height:auto;">`;
    });
  }

  return wrap;
}


function renderInicio(facultades, onEmpezar) {
  const contenedor = document.getElementById('inicio');
  if (!contenedor) return;
  contenedor.innerHTML = '';

  contenedor.innerHTML = `
    <img class="logo" alt="Viví tu carrera" src="assets/logo.svg">
    <p class="titulo">¿Y si tu carrera todavía<br>no estuviera decidida?</p>
    <p class="subtitulo">Terminaste la secundaria. Tenés algunas ideas. O ninguna. Vamos a ver qué pasa</p>
  `;

  const inputNombre = document.createElement('input');
  inputNombre.className = 'input-nombre';
  inputNombre.type = 'text';
  inputNombre.placeholder = 'Tu nombre';
  inputNombre.autocomplete = 'off';
  contenedor.appendChild(inputNombre);

  const eleccionFacultades = document.createElement('div');
  eleccionFacultades.className = 'eleccion-facultades';

  const card = document.createElement('div');
  card.className = 'card';

  const cardPregunta = document.createElement('div');
  cardPregunta.className = 'card-pregunta';
  cardPregunta.innerHTML = `<p class="card-titulo">¿Por donde arrancamos?</p>`;

  const grilla = document.createElement('div');
  grilla.className = 'grilla-facultades';

  const seccionProbar = document.createElement('div');
  seccionProbar.className = 'seccion-probar';
  seccionProbar.innerHTML = `<p>¿Qué querés probar?</p>`;
  const filaBotonesProbar = document.createElement('div');
  filaBotonesProbar.className = 'fila-botones-probar';
  seccionProbar.appendChild(filaBotonesProbar);

  let facultadElegida = null;
  let carreraElegida = null;

  const botonComenzar = document.createElement('button');
  botonComenzar.type = 'button';
  botonComenzar.className = 'boton-comenzar';
  botonComenzar.disabled = true;
  botonComenzar.innerHTML = `
    <span>Comenzar</span>
  `;

  function actualizarBoton() {
    botonComenzar.disabled = !(facultadElegida && carreraElegida);
  }

  function renderCarreras(facultad) {
    filaBotonesProbar.innerHTML = '';
    carreraElegida = null;
    seccionProbar.classList.add('visible');
    if (!facultad.carreras || facultad.carreras.length === 0) {
  return;
}

facultad.carreras.forEach((carrera) => {
  const contenedorCarrera = document.createElement('div');
  contenedorCarrera.className = 'contenedor-carrera';

  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'boton-probar';
  boton.textContent = carrera.nombre;

  if (carrera.id === 'medicina') {
    const demo = document.createElement('span');
    demo.className = 'badge-demo';
    demo.textContent = '✦ DEMO';
    contenedorCarrera.appendChild(demo);
  }

  boton.addEventListener('click', () => {
    carreraElegida = carrera.id;
    filaBotonesProbar.querySelectorAll('.boton-probar').forEach(b => b.classList.remove('seleccionada'));
    boton.classList.add('seleccionada');
    actualizarBoton();
  });

  contenedorCarrera.appendChild(boton);

if (carrera.id === 'arquitectura' || carrera.id === 'economia') {
  const proximo = document.createElement('span');
  proximo.className = 'badge-proximamente';
  proximo.textContent = 'PRÓXIMAMENTE';
  contenedorCarrera.appendChild(proximo);
}

filaBotonesProbar.appendChild(contenedorCarrera);
});
}
  facultades.forEach((facultad, index) => {
    let fila;

    if (index % 2 === 0) {
      fila = document.createElement('div');
      fila.className = 'fila-facultades';
      grilla.appendChild(fila);
    } else {
      fila = grilla.lastElementChild;
    }

    const botonFacultad = document.createElement('button');
    botonFacultad.type = 'button';
    botonFacultad.className = 'boton-facultad';

    if (facultad.id === 'fcm') {
      botonFacultad.classList.add('medicina');
    }

    const icono = crearIconoFacultad(facultad.id);
    botonFacultad.appendChild(icono);

    const nombre = document.createElement('p');
    nombre.textContent = facultad.nombre;
    botonFacultad.appendChild(nombre);

    botonFacultad.addEventListener('click', () => {
      facultadElegida = facultad.id;

      grilla.querySelectorAll('.boton-facultad').forEach(b => {
        b.classList.remove('seleccionada');
      });

      botonFacultad.classList.add('seleccionada');

      renderCarreras(facultad);
      actualizarBoton();
    });

    fila.appendChild(botonFacultad);
  });

  cardPregunta.appendChild(grilla);
  cardPregunta.appendChild(seccionProbar);

  card.appendChild(cardPregunta);
  card.appendChild(botonComenzar);

  botonComenzar.addEventListener('click', () => {
    if (!facultadElegida || !carreraElegida) return;

    const nombre = inputNombre.value.trim();

    onEmpezar({
      nombre,
      facultadId: facultadElegida,
      carreraId: carreraElegida
    });
  });

  eleccionFacultades.appendChild(card);
  contenedor.appendChild(eleccionFacultades);
}


function renderFinDeEventos() {
  const contenedor = document.getElementById('juego');
  if (!contenedor) return;
  contenedor.innerHTML = '';

  const titulo = document.createElement('h2');
  titulo.textContent = 'Por ahora, hasta acá llegaste.';
  contenedor.appendChild(titulo);

  const texto = document.createElement('p');
  texto.textContent = 'Tu recorrido todavía puede seguir creciendo. Esta partida llegó al final del contenido disponible.';
  contenedor.appendChild(texto);
}


function renderDebugEstado(estado) {
  const debug = document.getElementById('debug');
  if (!debug) return;
  debug.textContent = JSON.stringify(estado, null, 2);
}


export {
  renderEvento,
  renderConsecuencia,
  renderResultadoOpcion,
  renderInicio,
  renderFinDeEventos,
  renderIntervencionIA,
  renderDebugEstado
};