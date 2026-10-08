// avatar.js
//
// Pantalla de elección de avatar: dos tarjetas altas tipo acordeón.
// La elegida se expande y las otras se comprimen. Abajo, la opción
// personalizada (bloqueada) como banda.
// Hereda el logo y el header del juego (ui.js); no los redibuja.
//
// No toca el motor ni el estado: solo muestra y avisa, vía callback,
// qué avatar se eligió.

import {
  crearLogoHorizontal,
  crearHeaderJugador
} from './ui.js';

const RUTA_CSS = './css/avatar.css';

// "encuadre" = object-position del recorte propio de esta pantalla
// (x% y%). Ajustalo por avatar para centrar a la persona.
const AVATARES = [
  {
    id: 'avatar_2',
    imagen: './assets/avatar/avatar-2.png',
    encuadre: '35% 50%',
    alt: 'Escena de estudiantes conversando en una mesa de trabajo'
  },
  {
    id: 'avatar_1',
    imagen: './assets/avatar/avatar-1.png',
    encuadre: '50% 30%',
    alt: 'Retrato de estudiante pensando en un aula'
  }
];

const TEXTO_PERSONALIZADO = 'Creá tu avatar personalizado';
const TEXTO_PROXIMAMENTE = '🔒 Próximamente';

const SILUETA = `
  <svg class="avatar-custom-silueta" viewBox="0 0 120 112" aria-hidden="true">
    <defs>
      <linearGradient id="avGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.22" />
        <stop offset="1" stop-color="#ffffff" stop-opacity="0.02" />
      </linearGradient>
    </defs>

    <circle class="avatar-custom-anillo" cx="60" cy="56" r="46" />
    <circle class="avatar-custom-orbita" pathLength="100" cx="60" cy="56" r="46" />

    <path class="avatar-custom-cuerpo" d="M24 112 C24 88 40 78 60 78 C80 78 96 88 96 112 Z" />
    <circle class="avatar-custom-cabeza" cx="60" cy="50" r="16" />
  </svg>
`;


function cargarEstilos() {

  if (document.querySelector('link[data-avatar-css]')) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = RUTA_CSS;
    link.dataset.avatarCss = '';
    link.onload = resolve;
    link.onerror = resolve;

    document.head.appendChild(link);

  });

}


function movimientoReducido() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}


function animar(elemento, fotogramas, opciones) {

  if (!elemento || !elemento.animate || movimientoReducido()) {
    return;
  }

  elemento.animate(fotogramas, opciones);

}


function sacudir(elemento) {

  animar(
    elemento,
    [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-5px)' },
      { transform: 'translateX(5px)' },
      { transform: 'translateX(0)' }
    ],
    { duration: 350, easing: 'ease', composite: 'add' }
  );

}


function crearLaminaFoto(avatar, indice) {

  const lamina = document.createElement('button');

  lamina.type = 'button';
  lamina.className = 'avatar-lamina avatar-foto';
  lamina.dataset.avatar = avatar.id;
  lamina.setAttribute('role', 'radio');
  lamina.setAttribute('aria-checked', 'false');
  lamina.setAttribute('aria-label', avatar.alt);
  lamina.style.setProperty('--av-delay', `${0.1 + indice * 0.14}s`);
  lamina.style.setProperty('--encuadre', avatar.encuadre || '50% 50%');

  lamina.innerHTML = `
    <img src="${avatar.imagen}" alt="">
    <span class="avatar-aro"></span>
    <span class="avatar-marca">✓ Elegido</span>
    <span class="avatar-flash"></span>
  `;

  return lamina;

}


function crearLaminaPersonalizada(indice) {

  const lamina = document.createElement('button');

  lamina.type = 'button';
  lamina.className = 'avatar-lamina avatar-custom';
  lamina.style.setProperty('--av-delay', `${0.1 + indice * 0.14}s`);

  lamina.innerHTML = `
    ${SILUETA}
    <span class="avatar-custom-texto">
      <span class="avatar-custom-titulo" aria-live="polite">${TEXTO_PERSONALIZADO}</span>
      <span class="badge-ia"><span class="varita-ia">🪄</span> Con IA</span>
    </span>
  `;

  return lamina;

}


async function renderSeleccionAvatar(contenedor, resumen, onConfirmar) {

  if (!contenedor) {
    return;
  }

  await cargarEstilos();

  contenedor.innerHTML = '';

  // --- Logo y header: los mismos del resto del juego ---

  contenedor.appendChild(crearLogoHorizontal());

  const bloque = document.createElement('div');
  bloque.className = 'decision-bloque';

  const personaje = document.createElement('div');
  personaje.className = 'decision-personaje';
  personaje.appendChild(crearHeaderJugador(resumen));
  bloque.appendChild(personaje);

  // --- Título ---

  const narrativaGrupo = document.createElement('div');
  narrativaGrupo.className = 'decision-narrativa-grupo avatar-narrativa';
  narrativaGrupo.innerHTML = `
    <div class="decision-narrativa">
      <div class="decision-narrativa-bloque">
        <p class="decision-narrativa-titulo">🪪 Elegí tu avatar</p>
        <p class="decision-narrativa-texto">Con esta imagen vas a recorrer la carrera.</p>
      </div>
    </div>
  `;
  bloque.appendChild(narrativaGrupo);

  // --- Escenario: fila de fotos (acordeón) + banda personalizada ---

  const escenario = document.createElement('div');
  escenario.className = 'avatar-escenario';
  escenario.setAttribute('role', 'radiogroup');
  escenario.setAttribute('aria-label', 'Avatares disponibles');

  const fila = document.createElement('div');
  fila.className = 'avatar-fila';

  const laminas = AVATARES.map(crearLaminaFoto);
  laminas.forEach((lamina) => fila.appendChild(lamina));
  escenario.appendChild(fila);

  const personalizada = crearLaminaPersonalizada(AVATARES.length);
  escenario.appendChild(personalizada);

  bloque.appendChild(escenario);

  // --- Confirmar ---

  const confirmar = document.createElement('button');
  confirmar.type = 'button';
  confirmar.className = 'boton-comenzar incompleto avatar-confirmar';
  confirmar.innerHTML = '<span>Continuar</span>';
  bloque.appendChild(confirmar);

  contenedor.appendChild(bloque);


  // --- Comportamiento ---

  let elegido = null;
  let confirmado = false;


  function elegir(id) {

    if (confirmado || id === elegido) {
      return;
    }

    elegido = id;

    escenario.classList.add('hay-seleccion');

    laminas.forEach((lamina) => {

      const activa = lamina.dataset.avatar === id;

      lamina.classList.toggle('seleccionada', activa);
      lamina.setAttribute('aria-checked', String(activa));

      if (activa) {

        animar(
          lamina.querySelector('.avatar-aro'),
          [
            { boxShadow: 'inset 0 0 0 0 rgba(205, 236, 25, 0)' },
            { boxShadow: 'inset 0 0 30px 3px rgba(205, 236, 25, 0.5)', offset: 0.4 },
            { boxShadow: 'inset 0 0 0 0 rgba(205, 236, 25, 0)' }
          ],
          { duration: 700, easing: 'ease-out' }
        );

      }

    });

    confirmar.classList.remove('incompleto');

  }


  laminas.forEach((lamina) => {
    lamina.addEventListener('click', () => elegir(lamina.dataset.avatar));
  });


  const tituloPersonalizada =
    personalizada.querySelector('.avatar-custom-titulo');

  let temporizadorTexto = null;

  personalizada.addEventListener('click', () => {

    if (confirmado) {
      return;
    }

    sacudir(personalizada);

    tituloPersonalizada.textContent = TEXTO_PROXIMAMENTE;

    clearTimeout(temporizadorTexto);

    temporizadorTexto = setTimeout(() => {
      tituloPersonalizada.textContent = TEXTO_PERSONALIZADO;
    }, 2200);

  });


  confirmar.addEventListener('click', () => {

    if (confirmado) {
      return;
    }

    if (!elegido) {
      sacudir(escenario);
      return;
    }

    confirmado = true;

    escenario.classList.add('confirmado');

    laminas.concat(personalizada).forEach((lamina) => {
      lamina.disabled = true;
    });

    const laminaElegida =
      laminas.find((lamina) => lamina.dataset.avatar === elegido);

    animar(
      laminaElegida.querySelector('.avatar-flash'),
      [
        { opacity: 0 },
        { opacity: 0.55, offset: 0.3 },
        { opacity: 0 }
      ],
      { duration: 420, easing: 'ease-out' }
    );

    setTimeout(
      () => onConfirmar(elegido),
      movimientoReducido() ? 0 : 750
    );

  });

}


export {
  renderSeleccionAvatar,
  AVATARES
};