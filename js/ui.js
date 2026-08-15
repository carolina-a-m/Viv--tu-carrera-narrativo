// ui.js
// Este archivo solo se ocupa de mostrar la experiencia.
// No decide qué evento viene después.
// No aplica efectos al estado.
// No conoce las reglas de precondiciones.
// Recibe datos y callbacks desde main.js.


function renderEvento(evento, onElegir) {
  const contenedor = document.getElementById('juego');

  if (!contenedor) return;

  contenedor.innerHTML = '';


  // ----------------------------------------------------------
  // CONTEXTO DEL EVENTO
  // ----------------------------------------------------------

  if (evento.contexto) {
    const contexto = document.createElement('p');

    contexto.className = 'evento-contexto';

    contexto.textContent = evento.contexto;

    contenedor.appendChild(contexto);
  }


  // ----------------------------------------------------------
  // TEXTO PRINCIPAL
  // ----------------------------------------------------------

  const texto = document.createElement('p');

  texto.className = 'evento-texto';

  texto.textContent = evento.texto;

  contenedor.appendChild(texto);


  // ----------------------------------------------------------
  // OPCIONES
  // ----------------------------------------------------------

  const opciones = document.createElement('div');

  opciones.className = 'opciones';

  evento.opciones.forEach((opcion) => {

    const boton = document.createElement('button');

    boton.type = 'button';

    boton.className = 'opcion';

    boton.textContent = opcion.texto;

    boton.addEventListener('click', () => {

      // Evita múltiples elecciones mientras se procesa
      // la decisión.
      opciones
        .querySelectorAll('button')
        .forEach(b => {
          b.disabled = true;
        });

      onElegir(opcion);
    });

    opciones.appendChild(boton);
  });

  contenedor.appendChild(opciones);
}


// ------------------------------------------------------------
// CONSECUENCIA DIFERIDA
// ------------------------------------------------------------
//
// Pantalla intermedia que se muestra cuando la opción elegida
// dispara evento.consecuencia (ver motor.js / evaluarConsecuencia).
//
// No es un evento con opciones: es un remate narrativo de UN
// solo botón, para que la consecuencia de la decisión sea
// visible antes de seguir avanzando.
//
// ------------------------------------------------------------

function renderConsecuencia(consecuencia, onContinuar) {
  const contenedor = document.getElementById('juego');

  if (!contenedor) return;

  contenedor.innerHTML = '';


  const texto = document.createElement('p');

  texto.className = 'consecuencia-texto';

  texto.textContent = consecuencia.texto;

  contenedor.appendChild(texto);


  if (consecuencia.recurso) {
    contenedor.appendChild(
      crearFichaRecurso(consecuencia.recurso)
    );
  }

  if (consecuencia.recursoSecundario) {
    contenedor.appendChild(
      crearFichaRecurso(consecuencia.recursoSecundario)
    );
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


// ------------------------------------------------------------
// FICHA DE RECURSO
// ------------------------------------------------------------
//
// Tarjeta informativa para un recurso institucional real
// (comedores, becas, orientación estudiantil, etc.).
//
// ------------------------------------------------------------

function crearFichaRecurso(recurso) {

  const ficha =
    document.createElement('div');

  ficha.className = 'ficha-recurso';


  const nombre =
    document.createElement('strong');

  nombre.className = 'ficha-recurso-nombre';

  nombre.textContent = recurso.nombre;

  ficha.appendChild(nombre);


  if (recurso.descripcion) {

    const descripcion =
      document.createElement('p');

    descripcion.className =
      'ficha-recurso-descripcion';

    descripcion.textContent =
      recurso.descripcion;

    ficha.appendChild(descripcion);

  }


  if (recurso.link) {

    const link =
      document.createElement('a');

    link.className = 'ficha-recurso-link';

    link.href = recurso.link;

    link.target = '_blank';

    link.rel = 'noopener noreferrer';

    link.textContent = 'Más información';

    ficha.appendChild(link);

  }


  return ficha;
}


// ------------------------------------------------------------
// INICIO
// ------------------------------------------------------------

function renderInicio(facultades, onEmpezar) {
  const contenedor = document.getElementById('inicio');

  if (!contenedor) return;

  contenedor.innerHTML = '';


  // ----------------------------------------------------------
  // INTRODUCCIÓN
  // ----------------------------------------------------------

  const gancho = document.createElement('h2');

  gancho.textContent =
    '¿Y si tu carrera todavía no estuviera decidida?';

  contenedor.appendChild(gancho);


  const narrativa = document.createElement('p');

  narrativa.textContent =
    'Terminaste la secundaria. Tenés algunas ideas. O ninguna. Vamos a ver qué pasa.';

  contenedor.appendChild(narrativa);


  // ----------------------------------------------------------
  // NOMBRE
  // ----------------------------------------------------------

  const labelNombre = document.createElement('label');

  labelNombre.textContent =
    '¿Cómo te llamamos en esta historia?';

  contenedor.appendChild(labelNombre);


  const inputNombre = document.createElement('input');

  inputNombre.type = 'text';

  inputNombre.placeholder = 'Tu nombre';

  inputNombre.autocomplete = 'off';

  contenedor.appendChild(inputNombre);


  // ----------------------------------------------------------
  // ELECCIÓN DE FACULTAD
  // ----------------------------------------------------------

  const labelFacultad = document.createElement('label');

  labelFacultad.textContent =
    '¿Por dónde arrancamos?';

  contenedor.appendChild(labelFacultad);


  const contFacultades = document.createElement('div');

  contFacultades.className = 'tarjetas';

  contenedor.appendChild(contFacultades);


  // ----------------------------------------------------------
  // ELECCIÓN DE CARRERA
  // ----------------------------------------------------------

  const labelCarrera = document.createElement('label');

  labelCarrera.textContent =
    '¿Qué querés probar primero?';

  labelCarrera.style.display = 'none';

  contenedor.appendChild(labelCarrera);


  const contCarreras = document.createElement('div');

  contCarreras.className = 'tarjetas';

  contenedor.appendChild(contCarreras);


  // ----------------------------------------------------------
  // BOTÓN
  // ----------------------------------------------------------

  const boton = document.createElement('button');

  boton.type = 'button';

  boton.textContent =
    'Empezar a explorar';

  boton.disabled = true;

  contenedor.appendChild(boton);


  let facultadElegida = null;

  let carreraElegida = null;


  function actualizarBoton() {
    boton.disabled = !(
      facultadElegida &&
      carreraElegida
    );
  }


  // ----------------------------------------------------------
  // CARRERAS
  // ----------------------------------------------------------

  function renderCarreras(facultad) {

    contCarreras.innerHTML = '';

    carreraElegida = null;

    labelCarrera.style.display = '';


    facultad.carreras.forEach(carrera => {

      const tarjeta =
        document.createElement('button');

      tarjeta.type = 'button';

      tarjeta.className = 'tarjeta';

      tarjeta.textContent = carrera.nombre;


      tarjeta.addEventListener(
        'click',
        () => {

          carreraElegida = carrera.id;

          contCarreras
            .querySelectorAll('.tarjeta')
            .forEach(c =>
              c.classList.remove('seleccionada')
            );

          tarjeta.classList.add('seleccionada');

          actualizarBoton();
        }
      );


      contCarreras.appendChild(tarjeta);
    });


    actualizarBoton();
  }


  // ----------------------------------------------------------
  // FACULTADES
  // ----------------------------------------------------------

  facultades.forEach(facultad => {

    const tarjeta =
      document.createElement('button');

    tarjeta.type = 'button';

    tarjeta.className = 'tarjeta';

    tarjeta.textContent = facultad.nombre;


    tarjeta.addEventListener(
      'click',
      () => {

        facultadElegida = facultad;

        carreraElegida = null;

        contFacultades
          .querySelectorAll('.tarjeta')
          .forEach(c =>
            c.classList.remove('seleccionada')
          );

        tarjeta.classList.add('seleccionada');

        renderCarreras(facultad);

        actualizarBoton();
      }
    );


    contFacultades.appendChild(tarjeta);
  });


  // ----------------------------------------------------------
  // COMENZAR
  // ----------------------------------------------------------

  boton.addEventListener(
    'click',
    () => {

      onEmpezar({
        nombre: inputNombre.value.trim() || null,
        carrera: carreraElegida
      });
    }
  );
}


// ------------------------------------------------------------
// FIN DE EVENTOS
// ------------------------------------------------------------

function renderFinDeEventos() {
  const contenedor =
    document.getElementById('juego');

  if (!contenedor) return;

  contenedor.innerHTML = '';


  const titulo =
    document.createElement('h2');

  titulo.textContent =
    'Por ahora, hasta acá llegaste.';

  contenedor.appendChild(titulo);


  const texto =
    document.createElement('p');

  texto.textContent =
    'Tu recorrido todavía puede seguir creciendo. Esta partida llegó al final del contenido disponible.';

  contenedor.appendChild(texto);
}


// ------------------------------------------------------------
// DEBUG
// ------------------------------------------------------------

function renderDebugEstado(estado) {
  const debug =
    document.getElementById('debug');

  if (!debug) return;

  debug.textContent =
    JSON.stringify(
      estado,
      null,
      2
    );
}


// ------------------------------------------------------------
// EXPORTS
// ------------------------------------------------------------

export {
  renderEvento,
  renderConsecuencia,
  renderInicio,
  renderFinDeEventos,
  renderDebugEstado
};
