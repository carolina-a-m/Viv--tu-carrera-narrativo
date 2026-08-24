// scripts/categorizar-tema.js
// Etapa 2a: categorización CON IA (Gemini), acotada.
//
// Lee data/raw/politica-rss.json (noticias reales de la última
// semana) y le pide a Gemini que elija UNA de esas noticias y la
// encuadre en una categoría cerrada.
//
// Diseño deliberado para evitar alucinación: a Gemini le pedimos el
// ÍNDICE del ítem elegido, no que reescriba título/link/fecha. Esos
// tres datos los tomamos directo del array que ya scrapeamos — el
// modelo nunca tiene la posibilidad de inventar una fuente.
//
// Esta etapa NO genera ficción. Solo identifica: "esta semana el
// tema real más relevante es X, categoría Y". La generación de la
// escena ficticia es una etapa aparte (todavía no escrita).

import { readFile, writeFile } from "node:fs/promises";

const RUTA_ENTRADA = new URL("../data/raw/politica-rss.json", import.meta.url);
const RUTA_SALIDA = new URL("../data/tema-semanal.json", import.meta.url);

const MODELO = "gemini-3.5-flash-lite";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`;

const CATEGORIAS = [
  "transporte",
  "vivienda",
  "salud",
  "educación",
  "trabajo",
  "institucional",
  "seguridad",
];

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    indice: { type: "integer" },
    categoria: { type: "string", enum: CATEGORIAS },
    tema: { type: "string" },
  },
  required: ["indice", "categoria", "tema"],
};

function construirPrompt(items) {
  const listado = items
    .map(
      (item, i) =>
        `${i}. ${item.titulo}${item.resumen ? ` — ${item.resumen}` : ""}`
    )
    .join("\n");

  return `Sos un editor que selecciona UN caso real de conflictividad
político-social a partir de una lista de noticias. No opinás, no
inventás hechos, no agregás nada que no esté en la lista.

PARA QUÉ SE USA ESTO: el caso que elijas se le presenta a estudiantes
universitarios de primer año de Ciencia Política como disparador de
un análisis grupal. Tienen que poder identificar partes con intereses
o posturas distintas y discutir qué está en disputa. Por eso el
criterio no es "es una noticia política" ni "es reciente": es si HOY,
en el momento de la noticia, hay una tensión activa y sin resolver
entre partes con intereses distintos.

Categorías cerradas (tenés que usar EXACTAMENTE una de estas, tal
cual está escrita): ${CATEGORIAS.join(", ")}.

TEST para elegir: preguntate "¿un grupo de estudiantes podría dividirse
para argumentar a favor de una parte y en contra de la otra, sobre algo
que todavía no está resuelto?". Si la respuesta es sí, es un buen caso.
Si la noticia describe algo ya cerrado (una condena firme, un anuncio
ya implementado, un hecho consumado sin reacción activa en curso) o
sin partes enfrentadas identificables, la respuesta es no, aunque el
tema sea grave, político o de interés público.

Tarea:
1. Aplicá el test de arriba a las noticias de la lista y elegí la que
   mejor lo cumple. Si ninguna lo cumple con claridad, elegí la que
   más se acerque, priorizando siempre que haya partes identificables
   en tensión por sobre que el tema sea "importante".
2. Asignale la categoría cerrada que mejor la describe.
3. Escribí "tema": una frase corta (máximo 12 palabras) que resuma
   de qué trata el conflicto, en tus palabras, sin inventar datos
   que no estén en el título o el resumen de esa noticia.

Devolvé SOLO el JSON con: indice (el número de la lista), categoria,
tema. Nada de texto adicional.

Lista de noticias:
${listado}`;
}

async function llamarGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Falta la variable de entorno GEMINI_API_KEY.");
  }

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  };

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detalle = await res.text().catch(() => "");
    throw new Error(`Gemini respondió ${res.status}: ${detalle}`);
  }

  const data = await res.json();
  const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!texto) {
    throw new Error(
      `Respuesta de Gemini sin contenido utilizable: ${JSON.stringify(data)}`
    );
  }

  return texto;
}

// Validación propia: no confiamos ciegamente en que Gemini haya
// respetado el responseSchema.
function validar(json, cantidadItems) {
  if (typeof json !== "object" || json === null) {
    return "La raíz no es un objeto.";
  }

  if (!Number.isInteger(json.indice)) {
    return "'indice' falta o no es un entero.";
  }

  if (json.indice < 0 || json.indice >= cantidadItems) {
    return `'indice' (${json.indice}) fuera de rango (0-${cantidadItems - 1}).`;
  }

  if (!CATEGORIAS.includes(json.categoria)) {
    return `'categoria' (${json.categoria}) no es una de las categorías cerradas.`;
  }

  if (typeof json.tema !== "string" || json.tema.trim() === "") {
    return "'tema' falta o está vacío.";
  }

  return null;
}

async function main() {
  let items;

  try {
    const contenido = await readFile(RUTA_ENTRADA, "utf-8");
    items = JSON.parse(contenido);
  } catch {
    throw new Error(
      "No se pudo leer data/raw/politica-rss.json — corré scripts/scrape.js primero."
    );
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("data/raw/politica-rss.json está vacío o no es un array.");
  }

  const prompt = construirPrompt(items);
  const textoRespuesta = await llamarGemini(prompt);

  let json;
  try {
    json = JSON.parse(textoRespuesta);
  } catch {
    console.error("Gemini no devolvió JSON válido:");
    console.error(textoRespuesta);
    console.error("No se publica. Se mantiene el último data/tema-semanal.json bueno.");
    process.exit(1);
  }

  const error = validar(json, items.length);
  if (error) {
    console.error(`Respuesta inválida: ${error}`);
    console.error(JSON.stringify(json, null, 2));
    console.error("No se publica. Se mantiene el último data/tema-semanal.json bueno.");
    process.exit(1);
  }

  // fuente_titulo / fuente_url / fecha salen del ítem real elegido,
  // NUNCA de lo que devolvió Gemini.
  const itemElegido = items[json.indice];

  const salida = {
    tema: json.tema.trim(),
    categoria: json.categoria,
    fuente_titulo: itemElegido.titulo,
    fuente_url: itemElegido.link,
    fecha: itemElegido.fecha,
  };

  await writeFile(RUTA_SALIDA, JSON.stringify(salida, null, 2) + "\n", "utf-8");
  console.log(`OK. Tema semanal publicado en data/tema-semanal.json:`);
  console.log(`  categoría: ${salida.categoria}`);
  console.log(`  tema: ${salida.tema}`);
  console.log(`  fuente: ${salida.fuente_titulo}`);
}

main().catch((err) => {
  console.error("Error en categorizar-tema.js:", err.message);
  process.exit(1);
});
