// ------------------------------------------------------------
// RUTAS DE ASSETS REALES (bajados con descargar_assets.bat)
// ------------------------------------------------------------

const ASSETS = 'assets/decision/';

const HITOS = [
  { icono: ASSETS + 'hito-grupo.svg', linea: ASSETS + 'hito-linea.svg' },
  { icono: ASSETS + 'hito-libro.svg', linea: ASSETS + 'hito-linea.svg' },
  { icono: ASSETS + 'hito-datos.svg', linea: ASSETS + 'hito-linea.svg' },
  { icono: ASSETS + 'hito-globo.svg', linea: ASSETS + 'hito-linea-2.svg' }
];


function crearLogoHorizontal() {
  const img = document.createElement('img');
  img.className = 'logo-horizontal';
  img.src = ASSETS + 'logo-horizontal.svg';
  img.alt = 'Viví tu carrera';
  return img;
}


// ------------------------------------------------------------
// HEADER JUGADOR
// ------------------------------------------------------------
//
// Nota: el logo de facultad hoy se muestra como texto corto
// (código de facultad) porque en Figma es un ícono compuesto
// de varios fragmentos superpuestos por facultad (ver el
// index.html de selección inicial). Para reemplazarlo por el
// logo real hace falta que el diseñador exporte un único SVG
// por facultad — no es un bloqueo de arquitectura, es un asset
// pendiente.
// ------------------------------------------------------------

// ------------------------------------------------------------
// FRAGMENTOS DE LOGO POR FACULTAD
// (mismos assets que ya existen en assets/facultades/, usados
// en la pantalla inicial — acá se reusan a tamaño de header)
// ------------------------------------------------------------

const FRAGMENTOS_FACULTAD = {
  fcpolit: {
    tipo: 'fila',
    archivos: [
      'fcpolit-1.svg', 'fcpolit-2.svg', 'fcpolit-3.svg',
      'fcpolit-4.svg', 'fcpolit-5.svg', 'fcpolit-6.svg', 'fcpolit-7.svg'
    ]
  },
  farpd: {
    tipo: 'superpuesto',
    archivos: [
      { src: 'farpd-1.svg', style: 'inset: 4.59% 33.48% 2.71% 14.74%;' },
      { src: 'farpd-2.svg', style: 'inset: 5.28% 80.2% 2.71% 0.01%;' },
      { src: 'farpd-3.svg', style: 'inset: 4.59% -0.02% 1.79% 71.68%;' },
      { src: 'farpd-4.svg', style: 'inset: 57.96% 21.57% -27.36% 58.9%;' }
    ]
  },
  fcm: {
    tipo: 'superpuesto',
    archivos: [
      { src: 'medicina-1.svg', style: 'inset: 2.36% 0% 2.21% 57.91%;' },
      { src: 'medicina-2.svg', style: 'inset: 0% 45.21% 0% 27.12%;' },
      { src: 'medicina-3.svg', style: 'inset: 2.36% 74.7% 2.21% 0%;' }
    ]
  },
  fceye: {
    tipo: 'superpuesto',
    archivos: [
      { src: 'fceye-1.svg', style: 'inset: 18.95% 83.19% 10.1% 0%;' },
      { src: 'fceye-2.svg', style: 'inset: 18.18% 58.88% 8.84% 18.35%;' },
      { src: 'fceye-3.svg', style: 'inset: 18.95% 39.92% 10.1% 43.27%;' },
      { src: 'fceye-4.svg', style: 'inset: 18.95% 0% 10.1% 83.19%;' },
      { src: 'fceye-5.svg', style: 'inset: 39.29% 19.11% -13.64% 61.06%;' }
    ]
  }
};

function crearLogoFacultad(facultadId) {
  const datos = FRAGMENTOS_FACULTAD[facultadId];
  if (!datos) return null;

  const contenedor = document.createElement('div');
  contenedor.className = 'logo-facu-compuesto';

  if (datos.tipo === 'fila') {
    contenedor.classList.add('logo-facu-fila');
    datos.archivos.forEach(archivo => {
      const img = document.createElement('img');
      img.src = 'assets/facultades/' + archivo;
      img.alt = '';
      contenedor.appendChild(img);
    });
  } else {
    contenedor.classList.add('logo-facu-superpuesto');
    datos.archivos.forEach(({ src, style }) => {
      const img = document.createElement('img');
      img.src = 'assets/facultades/' + src;
      img.alt = '';
      img.style.cssText = style;
      contenedor.appendChild(img);
    });
  }

  return contenedor;
}


// ------------------------------------------------------------
// HEADER JUGADOR
// ------------------------------------------------------------

function crearHeaderJugador(resumen) {
  const header = document.createElement('div');
  header.className = 'jugador-header';

  const datos = document.createElement('div');
  datos.className = 'jugador-datos';

  const nombre = document.createElement('h2');
  nombre.textContent = resumen.nombre || '';
  datos.appendChild(nombre);

  const filaMeta = document.createElement('div');
  filaMeta.className = 'fila-meta';

  const carrera = document.createElement('span');
  carrera.textContent = resumen.carreraNombre || '';
  filaMeta.appendChild(carrera);

  datos.appendChild(filaMeta);
  header.appendChild(datos);

  const logoBox = document.createElement('div');
  logoBox.className = 'jugador-logo-facu';

  const logoUnr = document.createElement('img');
  logoUnr.className = 'logo-unr';
  logoUnr.src = ASSETS + 'logo-unr-base.svg';
  logoUnr.alt = 'UNR';
  logoBox.appendChild(logoUnr);

  const logoFacultad = crearLogoFacultad(resumen.facultadId);
  if (logoFacultad) {
    logoBox.appendChild(logoFacultad);
  }

  header.appendChild(logoBox);

  return header;
}


// ------------------------------------------------------------
// PANEL DE INDICADORES (componente único, expandido/contraído)
// ------------------------------------------------------------

function crearPanelIndicadores(resumen) {
  const panel = document.createElement('div');
  panel.className = 'panel-indicadores contraido';

  const filaSuperior = document.createElement('div');
  filaSuperior.className = 'panel-fila-superior';

  // Interés
  const interes = document.createElement('div');
  interes.className = 'panel-interes';
  interes.innerHTML = `
    <img class="gauge-fondo" src="${ASSETS}gauge-interes.svg" alt="">
    <div class="valor">
      <span class="numero">${(resumen.interes ?? 0).toFixed(1)}</span>
      <span class="etiqueta">Interes</span>
    </div>
    <img class="caret" src="${ASSETS}icono-caret-arriba.svg" alt="">
  `;
  filaSuperior.appendChild(interes);

  // Competencias (dinero, energia, confianza, exploracion)
  const competencias = document.createElement('div');
  competencias.className = 'panel-competencias';

  const variables = resumen.variables || {};
  const etiquetas = {
    dinero: 'Dinero',
    energia: 'Energía',
    confianza: 'Confianza',
    exploracion: 'Exploración'
  };
  // Energía usa el gauge "b" (Figma lo diferencia visualmente); el resto usa "a".
  const gaugePorClave = {
    dinero: 'gauge-competencia-a.svg',
    energia: 'gauge-competencia-b.svg',
    confianza: 'gauge-competencia-a.svg',
    exploracion: 'gauge-competencia-a.svg'
  };

  Object.keys(etiquetas).forEach((clave) => {
    const item = document.createElement('div');
    item.className = 'panel-competencia';
    item.innerHTML = `
      <div class="gauge-wrap">
        <img src="${ASSETS}${gaugePorClave[clave]}" alt="">
        <span class="valor-num">${variables[clave] ?? 0}</span>
      </div>
      <span class="etiqueta">${etiquetas[clave]}</span>
    `;
    competencias.appendChild(item);
  });

  filaSuperior.appendChild(competencias);
  panel.appendChild(filaSuperior);

  // Barra de progreso + hitos fijos
  const barraWrap = document.createElement('div');
  barraWrap.className = 'panel-barra-objetivos';

  const barraFondo = document.createElement('div');
  barraFondo.className = 'panel-barra-fondo';

  const barraProgreso = document.createElement('div');
  barraProgreso.className = 'panel-barra-progreso';
  barraProgreso.style.width = `${resumen.progreso ?? 0}%`;

  barraFondo.appendChild(barraProgreso);
  barraWrap.appendChild(barraFondo);

  const hitos = document.createElement('div');
  hitos.className = 'panel-hitos';
  HITOS.forEach(h => {
    const hito = document.createElement('div');
    hito.className = 'panel-hito';
    hito.innerHTML = `<div class="marca"></div><img src="${h.icono}" alt="">`;
    hitos.appendChild(hito);
  });
  barraWrap.appendChild(hitos);

  panel.appendChild(barraWrap);

  // Botón desplegar/contraer
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'panel-toggle';
  toggle.innerHTML = `<img src="${ASSETS}icono-caret-abajo.svg" alt="">`;
  toggle.addEventListener('click', () => {
    panel.classList.toggle('contraido');
  });
  panel.appendChild(toggle);

  return panel;
}


// ------------------------------------------------------------
// BOX DE OPCIÓN ("Elecciones 1")
// ------------------------------------------------------------
//
// opcion.badge (ej. "Raro") es condicional: en Figma solo
// aparece en algunas opciones, no en todas.
// ------------------------------------------------------------

function crearBoxOpcion(opcion, onClick) {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'opcion';

  const filaTitulo = document.createElement('div');
  filaTitulo.className = 'opcion-titulo-fila';

  const titulo = document.createElement('p');
  titulo.className = 'opcion-titulo';
  const icono = opcion.icono || ICONO_GENERICO;
  titulo.textContent = `${icono} ${opcion.texto}`;
  filaTitulo.appendChild(titulo);

  if (opcion.badge) {
    const badge = document.createElement('span');
    badge.className = 'opcion-badge';
    badge.textContent = opcion.badge;
    filaTitulo.appendChild(badge);
  }

  boton.appendChild(filaTitulo);

  const descripcion = document.createElement('p');
  descripcion.className = 'opcion-descripcion';
  descripcion.textContent = opcion.descripcion || DESCRIPCION_GENERICA;
  boton.appendChild(descripcion);

  const pie = document.createElement('div');
  pie.className = 'opcion-pie';

  const chips = document.createElement('div');
  chips.className = 'opcion-chips';

  const etiquetasEfecto = {
    dinero: 'Dinero',
    energia: 'Energía',
    confianza: 'Confianza',
    exploracion: 'Exploración',
    progreso: 'Progreso'
  };

  const efectos = opcion.efectos || {};
  Object.keys(efectos).forEach((clave) => {
    const valor = efectos[clave];
    if (!valor) return;

    const chip = document.createElement('span');
    chip.className = 'opcion-chip ' + (valor > 0 ? 'positivo' : 'negativo');
    chip.innerHTML = `
      <span class="num">${valor > 0 ? '+' : ''}${valor}</span>
      <span class="etq">${etiquetasEfecto[clave] || clave}</span>
    `;
    chips.appendChild(chip);
  });

  pie.appendChild(chips);

  const flecha = document.createElement('img');
  flecha.className = 'opcion-flecha';
  flecha.src = ASSETS + 'icono-chevron-derecha.svg';
  flecha.alt = '';
  pie.appendChild(flecha);

  boton.appendChild(pie);

  boton.addEventListener('click', onClick);

  return boton;
}
