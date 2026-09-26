// ui.js
// Este archivo solo se ocupa de mostrar la experiencia.
// No decide qué evento viene después.
// No aplica efectos al estado.
// No conoce las reglas de precondiciones.
// Recibe datos y callbacks desde main.js.

const ASSETS = 'assets/decision/';

const ICONO_GENERICO = '📌';
const DESCRIPCION_GENERICA = 'Seguir avanzando.';

const HITOS = [
  { icono: ASSETS + 'icono-personas.svg' },
  { icono: ASSETS + 'icono-libro.svg' },
  { icono: ASSETS + 'icono-datos.svg' },
  { icono: ASSETS + 'icono-maletin.svg', opaco: true }
];


import { RANGOS_VISUALES } from './config-variables.js';
import { porcentajeVisual, esPorcentajeCritico, esCritico, presentacionIndicador } from './metricas.js';

// Único diccionario de nombres: lo usan el panel y los chips de efecto.
const ETIQUETAS = {
  vocacion: 'Vocación',
  estabilidad: 'Estabilidad',
  energia: 'Energía',
  confianza: 'Confianza',
  exploracion: 'Exploración',
  dedicacion: 'Dedicación',
  rendimiento: 'Rendimiento',
  progreso: 'Progreso'
};

const COLOR_NORMAL = 'var(--verde)';
const COLOR_CRITICO = 'var(--rojo)';

// Estado del panel de estadísticas: solo cambia por click manual del usuario.
let panelExpandido = false;

// Último estado dibujado del panel (valores internos y presentación).
// Sirve para animar los arcos desde ahí hasta el valor nuevo.
let ultimoPanel = null;

function crearArcoGauge(porcentaje, grosor = 6, color = COLOR_NORMAL, destino = null) {
  const limitar = (p) => Math.min(100, Math.max(0, p));
  const pct = limitar(porcentaje);
  const trazo = 'M 5 50 A 45 45 0 0 1 95 50';
  const datosDestino = destino
    ? `data-pct="${limitar(destino.porcentaje)}" data-color="${destino.color}"`
    : '';
  return `
    <svg viewBox="0 0 100 55" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <path d="${trazo}" fill="none" stroke="#707070" stroke-width="${grosor}" stroke-linecap="round" />
      <path class="arco-relleno" pathLength="100" d="${trazo}" fill="none" stroke-width="${grosor}" stroke-linecap="round" style="stroke:${color}; stroke-dasharray:${pct} 100; opacity:${pct > 0 ? 1 : 0};" ${datosDestino} />
    </svg>
  `;
}

function animarArcos(panel) {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    panel.querySelectorAll('.arco-relleno[data-pct]').forEach((arco) => {
      const pct = Number(arco.dataset.pct);
      arco.style.strokeDasharray = `${pct} 100`;
      arco.style.stroke = arco.dataset.color;
      arco.style.opacity = pct > 0 ? 1 : 0;
    });
  }));
}

function crearDeltaFlotante(cambio) {
  if (!cambio) return '';
  const valor = Number(cambio.toFixed(1));
  const texto = Number.isInteger(valor) ? valor : valor.toFixed(1);
  return `<span class="delta-flotante ${valor > 0 ? 'positivo' : 'negativo'}">${valor > 0 ? '+' : ''}${texto}</span>`;
}

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
  if (evento.generadoPorIA && evento.fuenteUrl) {
    narrativaBloque.appendChild(crearFuenteIA(evento.fuenteTitulo, evento.fuenteUrl));
  }
    if (evento.recurso) {
    narrativaBloque.appendChild(crearFichaRecurso(evento.recurso));
  }
  if (evento.recursoSecundario) {
    narrativaBloque.appendChild(crearFichaRecurso(evento.recursoSecundario));
  }
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

function crearFuenteIA(titulo, url) {
  const ficha = crearFichaRecurso({
    nombre: `${titulo || url} ↗️`,
    link: url
  });
  ficha.classList.add('ficha-fuente-ia');

  const etiqueta = document.createElement('p');
  etiqueta.className = 'fuente-ia-etiqueta';
  etiqueta.innerHTML = `<span class="varita-ia">🪄</span> Texto generado con IA a partir de una noticia real`;
  ficha.prepend(etiqueta);

  return ficha;
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


function crearPanelIndicadores(resumen, opciones = {}) {
  const panel = document.createElement('div');
  panel.className = 'decision-panel' + (opciones.final ? ' final' : '');
  panel.id = 'panel-stats';

  const datos = document.createElement('div');
  datos.className = 'decision-panel-datos';

  const filaStats = document.createElement('div');
  filaStats.className = 'decision-stats-fila';

  const promedio = document.createElement('div');
  promedio.className = 'decision-promedio';
    const previo = ultimoPanel;
  const actual = { valores: {}, pres: {} };
  const leerIndicador = (clave, valor) => {
    const pres = presentacionIndicador(clave, valor);
    const valorPrevio = previo?.valores[clave];
    const antes = previo?.pres[clave] || pres;
    const cambio = valorPrevio === undefined ? 0 : valor - valorPrevio;
    actual.valores[clave] = valor;
    actual.pres[clave] = pres;
    return { pres, antes, cambio };
  };

  const vocacion = leerIndicador('vocacion', resumen.vocacion ?? 0);
  const presVocacion = vocacion.pres;
  promedio.innerHTML = `
    <div class="decision-promedio-arco">${crearArcoGauge(vocacion.antes.porcentaje, 4, vocacion.antes.color, presVocacion)}</div>
    ${crearDeltaFlotante(vocacion.cambio)}
    <div class="decision-promedio-valor">
      <div class="decision-promedio-num">
        <strong>${presVocacion.delta.toFixed(1)}</strong>
        <span>${ETIQUETAS.vocacion}</span>
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
  const clavesCompetencias = ['estabilidad', 'energia', 'confianza', 'exploracion'];

  

  clavesCompetencias.forEach((clave) => {
        const ind = leerIndicador(clave, variables[clave] ?? 0);
    const pres = ind.pres;
    const item = document.createElement('div');
    item.className = 'decision-competencia';
        item.innerHTML = `
      <div class="decision-competencia-valor">
        <div class="decision-competencia-arco">${crearArcoGauge(ind.antes.porcentaje, 6, ind.antes.color, pres)}</div>
        ${crearDeltaFlotante(ind.cambio)}
        <span class="decision-competencia-num">${pres.delta}</span>
      </div>
      <p class="decision-competencia-label">${ETIQUETAS[clave]}</p>
    `;
    filaComp.appendChild(item);
  });

  competencias.appendChild(filaComp);
  filaStats.appendChild(competencias);
  datos.appendChild(filaStats);

  const parametros = document.createElement('div');
  parametros.className = 'decision-parametros';
    const configParametros = [
    { label: ETIQUETAS.rendimiento, pct: variables.rendimiento ?? 0, critico: true },
    { label: ETIQUETAS.dedicacion, pct: porcentajeVisual('dedicacion', variables.dedicacion ?? 0), critico: false }
  ];
  configParametros.forEach(({ label, pct, critico }) => {
    const valor = Math.round(Math.min(100, Math.max(0, pct)));
    const estilo = critico && esPorcentajeCritico(valor)
      ? `width:${valor}%; background:${COLOR_CRITICO}`
      : `width:${valor}%`;
    const item = document.createElement('div');
    item.className = 'decision-parametro';
    item.innerHTML = `
      <p class="decision-parametro-label">${label}</p>
      <div class="decision-parametro-track">
        <div class="decision-parametro-progreso" style="${estilo}"></div>
      </div>
      <p class="decision-parametro-porcentaje">${valor}%</p>
    `;
    parametros.appendChild(item);
  });
  datos.appendChild(parametros);

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
  const totalHitos = HITOS.length;
  HITOS.forEach((h, index) => {
    const umbral = ((index + 1) / (totalHitos + 1)) * 100;
    const activo = (resumen.progreso ?? 0) >= umbral;
    const hito = document.createElement('div');
    hito.className = 'decision-hito' + (h.opaco ? ' opaco' : '') + (activo ? ' activo' : '');
    hito.innerHTML = `
      <div class="decision-hito-linea"></div>
      <div class="decision-hito-icono" style="-webkit-mask-image:url('${h.icono}'); mask-image:url('${h.icono}');"></div>
    `;
    hitos.appendChild(hito);
  });
  objetivos.appendChild(hitos);
  datos.appendChild(objetivos);

  panel.appendChild(datos);

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'decision-colapsar' + (panelExpandido ? ' abierto' : '');
  toggle.setAttribute('aria-label', 'Mostrar/ocultar estadísticas');
  toggle.innerHTML = `<div class="decision-colapsar-icono"><img src="${ASSETS}caret-down.svg" alt=""></div>`;
  if (panelExpandido) panel.classList.add('expandido');
  toggle.addEventListener('click', () => {
    panelExpandido = !panelExpandido;
    toggle.classList.toggle('abierto', panelExpandido);
    panel.classList.toggle('expandido', panelExpandido);
  });
  panel.appendChild(toggle);

  ultimoPanel = actual;
  animarArcos(panel);

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
  cabecera.innerHTML = `<p class="decision-eleccion-titulo">${icono} ${opcion.texto || ''}</p>`;
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
    const efectos = opcion.efectos || {};
  Object.keys(efectos).forEach((clave) => {
    const valor = efectos[clave];
    if (!valor) return;
    const mod = document.createElement('div');
    mod.className = 'decision-mod ' + (valor > 0 ? 'positivo' : 'negativo');
    mod.innerHTML = `<strong>${valor > 0 ? '+' : ''}${valor}</strong><span>${ETIQUETAS[clave] || clave}</span>`;
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

function renderCargandoIntervencionIA() {
  const contenedor = document.getElementById('juego');
  if (!contenedor) return;
  contenedor.innerHTML = '';

  const parrafo = document.createElement('p');
  parrafo.className = 'intervencion-ia-cargando';
  parrafo.innerHTML = '<span class="intervencion-ia-cargando-texto">Analizando tu recorrido con IA</span> <span class="emoji-carga">🪄</span>';
  contenedor.appendChild(parrafo);
}


function crearFichaRecurso(recurso) {
  const ficha = document.createElement('div');
  ficha.className = 'ficha-recurso';

  if (recurso.link) {
    const nombre = document.createElement('a');
    nombre.className = 'ficha-recurso-nombre';
    nombre.href = recurso.link;
    nombre.target = '_blank';
    nombre.rel = 'noopener noreferrer';
    nombre.textContent = recurso.nombre;
    ficha.appendChild(nombre);
  } else {
    const nombre = document.createElement('a');
nombre.className = 'ficha-recurso-nombre';
nombre.href = recurso.link;
nombre.target = '_blank';
nombre.rel = 'noopener noreferrer';
nombre.innerHTML = `${recurso.nombre} <span class="recurso-flecha">🔗</span>`;
ficha.appendChild(nombre);
  }

  if (recurso.descripcion) {
    const descripcion = document.createElement('p');
    descripcion.className = 'ficha-recurso-descripcion';
    descripcion.textContent = recurso.descripcion;
    ficha.appendChild(descripcion);
  }

  return ficha;
}

const ASSETS_FACULTADES = 'assets/facultades/';
const CARRERAS_NO_DISPONIBLES = ['arquitectura', 'economia'];
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
  ultimoPanel = null;
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

  const avisoNombre = document.createElement('p');
  avisoNombre.className = 'aviso-nombre';
  avisoNombre.setAttribute('role', 'alert');
  avisoNombre.textContent = '✍️ Escribí tu nombre para comenzar';
  contenedor.appendChild(avisoNombre);

  function mostrarAvisoNombre() {
    avisoNombre.classList.add('visible');
    inputNombre.classList.remove('invalido');
    void inputNombre.offsetWidth;
    inputNombre.classList.add('invalido');
    inputNombre.focus();
  }

  inputNombre.addEventListener('input', () => {
    avisoNombre.classList.remove('visible');
    inputNombre.classList.remove('invalido');
  });

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
  if (CARRERAS_NO_DISPONIBLES.includes(carrera.id)) {
  boton.classList.add('no-disponible');
  boton.disabled = true;
}

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

    if (!nombre) {
      mostrarAvisoNombre();
      return;
    }

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

function renderResultadoFinal(resumen, narrativa = {}) {
  const contenedor = document.getElementById('juego');
  if (!contenedor) return;
  contenedor.innerHTML = '';

  contenedor.appendChild(crearLogoHorizontal());

  const bloque = document.createElement('div');
  bloque.className = 'decision-bloque';

  const personaje = document.createElement('div');
  personaje.className = 'decision-personaje';
  personaje.appendChild(crearHeaderJugador(resumen));
  personaje.appendChild(crearPanelIndicadores(resumen, { final: true }));
  bloque.appendChild(personaje);

const narrativaGrupo = document.createElement('div');
narrativaGrupo.className = 'decision-narrativa-grupo';

const caja = document.createElement('div');
caja.className = 'decision-eleccion decision-resultado-final';
caja.id = 'resultado-final-caja';

caja.innerHTML = narrativa.cargando
  ? `<div class="decision-eleccion-cuerpo">
        <p class="decision-eleccion-desc intervencion-ia-cargando"><span class="intervencion-ia-cargando-texto">Analizando tu recorrido con IA</span> <span class="emoji-carga">🪄</span></p>
             </div>`
  : `<div class="decision-eleccion-cuerpo">
       ${narrativa.contexto ? `<p class="decision-eleccion-titulo">${narrativa.contexto}</p>` : ''}
       <p class="decision-eleccion-desc">${narrativa.texto || ''}</p>
     </div>`;

narrativaGrupo.appendChild(caja);
bloque.appendChild(narrativaGrupo);

contenedor.appendChild(bloque);
}

function renderDebugEstado(estado) {
  const debug = document.getElementById('debug');
  if (!debug) return;
  debug.textContent = JSON.stringify(estado, null, 2);
}

function actualizarNarrativaFinal(contexto, texto) {
  const caja = document.getElementById('resultado-final-caja');
  if (!caja) return;

  caja.innerHTML = `<div class="decision-eleccion-cuerpo">
    ${contexto ? `<p class="decision-eleccion-titulo">${contexto}</p>` : ''}
    <p class="decision-eleccion-desc">${texto || ''}</p>
  </div>`;
}


function renderBotonConocerCarrera(onClick) {
  const contenedor = document.getElementById('juego');
  if (!contenedor) return;

  const opciones = document.createElement('div');
  opciones.className = 'decision-elecciones';
  opciones.appendChild(crearBoxOpcion(
    {
      icono: '🎓',
      texto: 'Conocer la carrera desde tus intereses',
      descripcion: 'Ver cómo tu recorrido se conecta con la carrera que elegiste.',
      efectos: {}
    },
    () => {
      opciones.remove();
      onClick();
    }
  ));
  contenedor.appendChild(opciones);
}


function renderPresentacionCarrera(presentacion, host) {
  const contenedor = host || document.getElementById('juego');
  if (!contenedor || !presentacion) return;

  const wrap = document.createElement('div');
  wrap.className = 'presentacion-carrera';

  wrap.innerHTML = `
    <p class="presentacion-titulo pc-anim" style="--pc-delay:0s">🎓 Así es la carrera</p>
    <p class="presentacion-texto pc-anim" style="--pc-delay:0.12s">${presentacion.queEsLaCarrera || ''}</p>
    <div class="presentacion-perfil pc-anim" style="--pc-delay:0.24s">
      <p class="presentacion-subtitulo">Perfil de quien egresa</p>
      <p class="presentacion-texto">${presentacion.perfilEgresado || ''}</p>
    </div>
  `;

  if (Array.isArray(presentacion.ambitosDesempeno) && presentacion.ambitosDesempeno.length > 0) {

    const bloqueAmbitos = document.createElement('div');
    bloqueAmbitos.className = 'presentacion-ambitos pc-anim';
    bloqueAmbitos.style.setProperty('--pc-delay', '0.36s');
    bloqueAmbitos.innerHTML = `<p class="presentacion-subtitulo">Dónde te podés desempeñar</p>`;

    const track = document.createElement('div');
    track.className = 'pc-carrusel';

    presentacion.ambitosDesempeno.forEach((ambito, i) => {
      const pill = document.createElement('div');
      pill.className = 'pc-pill';
      pill.style.setProperty('--pc-pill-delay', `${0.45 + i * 0.08}s`);
      pill.textContent = ambito;
      track.appendChild(pill);
    });

    const puntos = document.createElement('div');
    puntos.className = 'pc-puntos';
    presentacion.ambitosDesempeno.forEach((_, i) => {
      const punto = document.createElement('span');
      punto.className = 'pc-punto' + (i === 0 ? ' activo' : '');
      puntos.appendChild(punto);
    });

    const actualizarPuntos = () => {
      const maxScroll = Math.max(1, track.scrollWidth - track.clientWidth);
      const ratio = track.scrollLeft / maxScroll;
      const indice = Math.round(ratio * (presentacion.ambitosDesempeno.length - 1));
      puntos.querySelectorAll('.pc-punto').forEach((p, i) => {
        p.classList.toggle('activo', i === indice);
      });
    };

    track.addEventListener('scroll', actualizarPuntos);

    // Arrastre con mouse: el scroll nativo con gesto ya cubre touch y
    // trackpad, pero un mouse con rueda simple no tiene forma de mover
    // un contenedor horizontal sin esto.
    let arrastrando = false;
    let origenX = 0;
    let scrollInicial = 0;

    track.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      arrastrando = true;
      track.classList.add('pc-arrastrando');
      origenX = e.clientX;
      scrollInicial = track.scrollLeft;
      track.setPointerCapture(e.pointerId);
    });

    track.addEventListener('pointermove', (e) => {
      if (!arrastrando || e.pointerType !== 'mouse') return;
      track.scrollLeft = scrollInicial - (e.clientX - origenX);
    });

    const terminarArrastre = (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      arrastrando = false;
      track.classList.remove('pc-arrastrando');
    };

    track.addEventListener('pointerup', terminarArrastre);
    track.addEventListener('pointercancel', terminarArrastre);

    // Rueda de mouse tradicional (vertical) traducida a scroll horizontal.
    track.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        track.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    }, { passive: false });

    bloqueAmbitos.appendChild(track);
    bloqueAmbitos.appendChild(puntos);
    wrap.appendChild(bloqueAmbitos);
  }

  if (Array.isArray(presentacion.dimensionesFormacion) && presentacion.dimensionesFormacion.length > 0) {

    const bloqueDim = document.createElement('div');
    bloqueDim.className = 'presentacion-dimensiones pc-anim';
    bloqueDim.style.setProperty('--pc-delay', '0.5s');
    bloqueDim.innerHTML = `<p class="presentacion-subtitulo presentacion-subtitulo-tenue">También vas a formarte en</p>`;

    const nube = document.createElement('div');
    nube.className = 'pc-nube';
    presentacion.dimensionesFormacion.forEach((d) => {
      const chip = document.createElement('span');
      chip.className = 'pc-chip';
      chip.textContent = d.nombre;
      if (d.descripcion) chip.title = d.descripcion;
      nube.appendChild(chip);
    });

    bloqueDim.appendChild(nube);
    wrap.appendChild(bloqueDim);
  }

  contenedor.appendChild(wrap);
}


function renderCargandoCarreraPersonalizada() {
  const contenedor = document.getElementById('juego');
  if (!contenedor) return;

  const bloque = document.createElement('div');
  bloque.className = 'presentacion-carrera';
  bloque.id = 'carrera-personalizada-caja';
  bloque.innerHTML = `
    <p class="presentacion-subtitulo presentacion-subtitulo-ia intervencion-ia-cargando pc-anim" style="--pc-delay:0s">
      <span class="intervencion-ia-cargando-texto">Cruzando tu recorrido con las materias de la carrera</span> <span class="emoji-carga">🪄</span>
    </p>
  `;
  contenedor.appendChild(bloque);
}


function actualizarCarreraPersonalizada(texto) {
  const caja = document.getElementById('carrera-personalizada-caja');
  if (!caja) return;

  caja.innerHTML = `
    <p class="presentacion-subtitulo presentacion-subtitulo-ia pc-anim" style="--pc-delay:0s"><span class="varita-ia">🪄</span> Lo que encontramos en tu recorrido</p>
    <p class="presentacion-texto pc-anim" style="--pc-delay:0.12s">${texto || ''}</p>
  `;
}


export {
  renderEvento,
  renderConsecuencia,
  renderResultadoFinal,
  renderResultadoOpcion,
  renderInicio,
  renderFinDeEventos,
  renderCargandoIntervencionIA,
  renderDebugEstado,
  actualizarNarrativaFinal,
  renderBotonConocerCarrera,
  renderPresentacionCarrera,
  renderCargandoCarreraPersonalizada,
  actualizarCarreraPersonalizada
};