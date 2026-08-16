// scripts/structure.js
// Etapa 2: estructuración CON IA (Gemini), acotada.
// Lee el texto crudo que dejó scripts/scrape.js en data/raw/*.txt,
// se lo pasa a Gemini con un prompt cerrado (extraer, nunca inventar)
// y valida el JSON resultante. Si no valida, NO se escribe nada:
// data/becas-live.json queda como estaba (último JSON bueno).

import { readdir, readFile, writeFile } from "node:fs/promises";

const DIR_RAW = new URL("../data/raw/", import.meta.url);
const RUTA_SALIDA = new URL("../data/becas-live.json", import.meta.url);

const MODELO = "gemini-3.5-flash-lite";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`;

// Esquema que le pedimos a Gemini que respete (además de validarlo
// nosotros mismos después, por las dudas).
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    becas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          nombre: { type: "string" },
          fecha_limite: { type: "string", nullable: true },
          resumen: { type: "string" },
          link: { type: "string", nullable: true },
        },
        required: ["nombre", "resumen", "fecha_limite", "link"],
      },
    },
  },
  required: ["becas"],
};

const PROMPT_SISTEMA = `Sos un extractor de datos, no un redactor.

Se te va a dar texto crudo extraído de páginas oficiales de becas de la
Universidad Nacional de Rosario (UNR). Tu única tarea es identificar
becas o convocatorias mencionadas en ese texto y devolver, para cada
una: nombre, fecha_limite, resumen y link.

REGLAS ESTRICTAS:
1. Nunca inventes ni completes datos que no estén explícitos en el
   texto. Si un dato no aparece, el campo va en null.
2. No uses conocimiento previo sobre la UNR ni sobre becas en general.
   Trabajá solo con lo que está en el texto que te paso.
3. "fecha_limite": solo si el texto menciona una fecha límite o de
   cierre de inscripción explícita. Formato libre tal como aparece en
   el texto (no la reformules a otro formato).
4. "resumen": máximo 2 frases, parafraseando el texto (no copiar
   literal), describiendo de qué se trata la beca.
5. "link": solo si hay una URL explícita asociada a esa beca en el
   texto. Si no hay, null.
6. Si el texto no menciona ninguna beca o convocatoria concreta,
   devolvé { "becas": [] }.
7. Respondé SOLO el JSON, sin texto adicional, sin markdown, sin
   bloques de código.`;

async function leerTextoCrudo() {
  let archivos;
  try {
    archivos = await readdir(DIR_RAW);
  } catch {
    throw new Error(
      `No existe ${DIR_RAW.pathname} — corré scripts/scrape.js primero.`
    );
  }

  const txts = archivos.filter((f) => f.endsWith(".txt"));
  if (txts.length === 0) {
    throw new Error("data/raw/ no tiene archivos .txt para estructurar.");
  }

  const partes = [];
  for (const archivo of txts) {
    const contenido = await readFile(new URL(archivo, DIR_RAW), "utf-8");
    partes.push(`--- Fuente: ${archivo} ---\n${contenido}`);
  }
  return partes.join("\n\n");
}

async function llamarGemini(textoCrudo) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Falta la variable de entorno GEMINI_API_KEY.");
  }

  const body = {
    system_instruction: {
      parts: [{ text: PROMPT_SISTEMA }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: textoCrudo }],
      },
    ],
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

// Gemini a veces devuelve un dominio tal como aparece en el texto
// visible (ej. "becas.unr.edu.ar", sin protocolo) porque el texto
// crudo no incluye los atributos href, solo el texto plano. Esto no
// es "inventar": el dominio SÍ está en el texto, solo le falta el
// prefijo. Lo normalizamos antes de validar en vez de rechazarlo.
const PATRON_DOMINIO = /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i;

function normalizarLinks(json) {
  if (!Array.isArray(json?.becas)) return json;

  for (const beca of json.becas) {
    if (typeof beca.link !== "string") continue;

    const link = beca.link.trim();

    if (link === "") {
      beca.link = null;
    } else if (!/^https?:\/\//.test(link) && PATRON_DOMINIO.test(link)) {
      beca.link = `https://${link}`;
    } else {
      beca.link = link;
    }
  }

  return json;
}

// Validación propia, independiente de que Gemini haya respetado el
// responseSchema o no. Esto es lo que decide si se publica o no.
function validar(json) {
  if (typeof json !== "object" || json === null) {
    return "La raíz no es un objeto.";
  }
  if (!Array.isArray(json.becas)) {
    return "Falta el campo 'becas' o no es un array.";
  }

  for (let i = 0; i < json.becas.length; i++) {
    const beca = json.becas[i];
    const ctx = `becas[${i}]`;

    if (typeof beca !== "object" || beca === null) {
      return `${ctx} no es un objeto.`;
    }
    if (typeof beca.nombre !== "string" || beca.nombre.trim() === "") {
      return `${ctx}.nombre falta o está vacío.`;
    }
    if (typeof beca.resumen !== "string" || beca.resumen.trim() === "") {
      return `${ctx}.resumen falta o está vacío.`;
    }
    if (beca.fecha_limite !== null && typeof beca.fecha_limite !== "string") {
      return `${ctx}.fecha_limite debe ser string o null.`;
    }
    if (beca.link !== null && typeof beca.link !== "string") {
      return `${ctx}.link debe ser string o null.`;
    }
    if (beca.link !== null && !/^https?:\/\//.test(beca.link)) {
      return `${ctx}.link no parece una URL válida.`;
    }
  }

  return null; // sin errores
}

async function main() {
  const textoCrudo = await leerTextoCrudo();
  const textoRespuesta = await llamarGemini(textoCrudo);

  let json;
  try {
    json = JSON.parse(textoRespuesta);
  } catch (err) {
    console.error("Gemini no devolvió JSON válido:");
    console.error(textoRespuesta);
    console.error("No se publica. Se mantiene el último data/becas-live.json bueno.");
    process.exit(1);
  }

  const error = validar(normalizarLinks(json));
  if (error) {
    console.error(`JSON estructurado inválido: ${error}`);
    console.error(JSON.stringify(json, null, 2));
    console.error("No se publica. Se mantiene el último data/becas-live.json bueno.");
    process.exit(1);
  }

  const salida = {
    actualizado: new Date().toISOString(),
    becas: json.becas,
  };

  await writeFile(RUTA_SALIDA, JSON.stringify(salida, null, 2) + "\n", "utf-8");
  console.log(`OK. Se publicaron ${json.becas.length} becas en data/becas-live.json`);
}

main().catch((err) => {
  console.error("Error inesperado en structure.js:", err.message);
  process.exit(1);
});
