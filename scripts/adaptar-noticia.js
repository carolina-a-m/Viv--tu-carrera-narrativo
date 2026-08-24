// scripts/adaptar-noticia.js
// Etapa 2b: adaptación CON IA (Gemini), acotada.
//
// Lee data/tema-semanal.json (la noticia real ya elegida y
// categorizada en la etapa anterior), trae el texto completo del
// artículo desde fuente_url, y le pide a Gemini que lo resuma /
// adapte al tono narrativo del juego.
//
// REGLAS DEL PROMPT (no negociables):
// - Puede parafrasear QUÉ pasó (hechos, reclamos, medidas).
// - NO puede inventar posturas, motivaciones u opiniones que no
//   estén explícitas en el texto.
// - NO puede fabricar declaraciones textuales nuevas (comillas)
//   que no estén en el original.
// - Los nombres reales de actores (sindicatos, funcionarios,
//   organismos) se mantienen tal cual aparecen — esto es una
//   noticia real resumida, no ficción con nombre puesto.
//
// La fuente (fuente_titulo + fuente_url) viaja siempre junto al
// resumen adaptado, para que el jugador pueda verificarla.

import { readFile, writeFile } from "node:fs/promises";
import * as cheerio from "cheerio";

const RUTA_TEMA = new URL("../data/tema-semanal.json", import.meta.url);
const RUTA_SALIDA = new URL("../data/conflicto-actual.json", import.meta.url);

const MODELO = "gemini-3.5-flash-lite";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`;

// Límite razonable de texto de artículo a mandarle a Gemini.
const LIMITE_CARACTERES_ARTICULO = 6000;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    resumen_adaptado: { type: "string" },
  },
  required: ["resumen_adaptado"],
};

function construirPrompt(fuenteTitulo, textoArticulo) {
  return `Sos un editor que adapta una noticia real al tono narrativo
de un juego educativo para estudiantes universitarios. No sos
periodista de ese medio: solo adaptás lo que ya está publicado.

ENFOQUE DEL RESUMEN:
Este resumen se usa como disparador de una escena donde estudiantes
analizan un caso real que tiene, según el enunciado de la escena,
"cada grupo involucrado sosteniendo una versión diferente de lo que
está pasando". Por eso el resumen tiene que dejar explícito, dentro
de lo que el artículo permite:
- quiénes son las partes en tensión,
- qué versión o postura sostiene cada una (incluso si una parte
  simplemente niega o rechaza lo que dice la otra),
- que el asunto sigue sin resolverse (hay algo pendiente: una
  investigación en curso, una decisión judicial no tomada, una
  negociación abierta).
El resumen NO debe describir un hecho ya cerrado o unilateral (un
fallo firme, un anuncio ya implementado sin reacción en contra) como
si fuera el foco: si el artículo elegido es de ese tipo, priorizá
igual mencionar cualquier reacción, objeción o disputa que el texto
mencione, aunque sea secundaria en la nota original.

REGLAS ESTRICTAS:
1. Podés parafrasear QUÉ pasó (hechos, reclamos, medidas, decisiones).
   Nunca copies oraciones textuales del artículo.
2. NUNCA inventes posturas, motivaciones, opiniones o intenciones que
   no estén explícitas en el texto. Si el artículo no dice por qué
   alguien actuó de determinada manera, vos tampoco lo digas.
3. NUNCA pongas una frase entre comillas que no esté, tal cual, en el
   artículo original. No fabriques declaraciones nuevas.
4. Mantené los nombres reales de actores (sindicatos, funcionarios,
   organismos, empresas) tal como aparecen en el texto. No los
   reemplaces ni los inventes.
5. Extensión: 3 a 5 oraciones. Tiene que poder leerse como el
   contexto breve de una escena de juego, no como una nota
   periodística completa.
6. Respondé SOLO el JSON con "resumen_adaptado". Nada de texto
   adicional, nada de markdown.

Título original: ${fuenteTitulo}

Texto del artículo:
${textoArticulo}`;
}

function limpiarTexto(texto) {
  return (texto || "").replace(/\s+/g, " ").trim();
}

function extraerTextoArticulo(html) {
  const $ = cheerio.load(html);

  $("script, style, noscript, nav, footer, header, svg, aside").remove();

  const bloques = [];
  $("h1, h2, h3, h4, p, li").each((_, el) => {
    const texto = limpiarTexto($(el).text());
    if (texto) bloques.push(texto);
  });

  if (bloques.length === 0) {
    return limpiarTexto($("body").text());
  }

  return bloques.join("\n").slice(0, LIMITE_CARACTERES_ARTICULO);
}

async function traerArticulo(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; ViviTuCarreraBot/1.0; +https://github.com/carolina-a-m/Viv--tu-carrera-narrativo)",
    },
  });

  if (!res.ok) {
    throw new Error(
      `No se pudo traer el artículo (status ${res.status} ${res.statusText})`
    );
  }

  const html = await res.text();
  const texto = extraerTextoArticulo(html);

  if (!texto) {
    throw new Error("El artículo no tiene texto extraíble.");
  }

  return texto;
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

// Validación propia. Cotas de longitud generosas pero reales: nada
// vacío, nada sospechosamente largo (indicio de que copió el
// artículo entero en vez de resumirlo).
function validar(json) {
  if (typeof json !== "object" || json === null) {
    return "La raíz no es un objeto.";
  }

  const resumen = json.resumen_adaptado;

  if (typeof resumen !== "string" || resumen.trim() === "") {
    return "'resumen_adaptado' falta o está vacío.";
  }

  if (resumen.trim().length < 40) {
    return "'resumen_adaptado' es sospechosamente corto (<40 caracteres).";
  }

  if (resumen.trim().length > 1200) {
    return "'resumen_adaptado' es sospechosamente largo (>1200 caracteres) — puede no ser un resumen.";
  }

  return null;
}

async function main() {
  let tema;

  try {
    const contenido = await readFile(RUTA_TEMA, "utf-8");
    tema = JSON.parse(contenido);
  } catch {
    throw new Error(
      "No se pudo leer data/tema-semanal.json — corré scripts/categorizar-tema.js primero."
    );
  }

  if (!tema.fuente_url || !tema.fuente_titulo) {
    throw new Error("data/tema-semanal.json no tiene fuente_url o fuente_titulo.");
  }

  const textoArticulo = await traerArticulo(tema.fuente_url);
  const prompt = construirPrompt(tema.fuente_titulo, textoArticulo);
  const textoRespuesta = await llamarGemini(prompt);

  let json;
  try {
    json = JSON.parse(textoRespuesta);
  } catch {
    console.error("Gemini no devolvió JSON válido:");
    console.error(textoRespuesta);
    console.error("No se publica. Se mantiene el último data/conflicto-actual.json bueno.");
    process.exit(1);
  }

  const error = validar(json);
  if (error) {
    console.error(`Respuesta inválida: ${error}`);
    console.error(JSON.stringify(json, null, 2));
    console.error("No se publica. Se mantiene el último data/conflicto-actual.json bueno.");
    process.exit(1);
  }

  const salida = {
    categoria: tema.categoria,
    fecha: tema.fecha,
    fuente_titulo: tema.fuente_titulo,
    fuente_url: tema.fuente_url,
    resumen_adaptado: json.resumen_adaptado.trim(),
    actualizado: new Date().toISOString(),
  };

  await writeFile(RUTA_SALIDA, JSON.stringify(salida, null, 2) + "\n", "utf-8");
  console.log("OK. Conflicto actual publicado en data/conflicto-actual.json:");
  console.log(`  categoría: ${salida.categoria}`);
  console.log(`  fuente: ${salida.fuente_titulo}`);
  console.log(`  resumen: ${salida.resumen_adaptado}`);
}

main().catch((err) => {
  console.error("Error en adaptar-noticia.js:", err.message);
  process.exit(1);
});
