// scripts/scrape.js
// Etapa 1: scraping SIN IA.
// Trae el HTML de cada URL, extrae el texto visible y lo guarda en
// data/raw/<slug>.txt. No interpreta ni estructura nada: eso lo hace
// scripts/structure.js (etapa 2) con Gemini.

import { writeFile, mkdir } from "node:fs/promises";
import * as cheerio from "cheerio";

const FUENTES = [
  {
    slug: "becas-estudiantiles",
    url: "https://unr.edu.ar/becas-estudiantiles/",
  },
  {
    slug: "bienestar-universitario",
    url: "https://unr.edu.ar/area-de-bienestar-universitario/",
  },
  {
    slug: "inscripcion-becas-2026",
    url: "https://unr.edu.ar/inscripcion-a-las-becas-2026/",
  },
];

const DIR_SALIDA = new URL("../data/raw/", import.meta.url);

// Convierte el HTML de la página en texto plano legible:
// saca <script>/<style>/<nav>/<footer>, junta el texto de los
// bloques de contenido y colapsa espacios en blanco.
function extraerTexto(html) {
  const $ = cheerio.load(html);

  $("script, style, noscript, nav, footer, header, svg").remove();

  const bloques = [];
  $("h1, h2, h3, h4, p, li, td, th").each((_, el) => {
    const texto = $(el).text().replace(/\s+/g, " ").trim();
    if (texto) bloques.push(texto);
  });

  // Fallback: si la página no tiene esas etiquetas, usar el body entero.
  if (bloques.length === 0) {
    return $("body").text().replace(/\s+/g, " ").trim();
  }

  return bloques.join("\n");
}

async function scrapearUna(fuente) {
  const res = await fetch(fuente.url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; ViviTuCarreraBot/1.0; +https://github.com/carolina-a-m/Viv--tu-carrera-narrativo)",
    },
  });

  if (!res.ok) {
    throw new Error(
      `No se pudo traer ${fuente.url} (status ${res.status} ${res.statusText})`
    );
  }

  const html = await res.text();
  const texto = extraerTexto(html);

  if (!texto) {
    throw new Error(`Texto vacío al extraer ${fuente.url}`);
  }

  return texto;
}

async function main() {
  await mkdir(DIR_SALIDA, { recursive: true });

  const resultados = await Promise.allSettled(
    FUENTES.map((fuente) => scrapearUna(fuente))
  );

  let huboError = false;

  for (let i = 0; i < FUENTES.length; i++) {
    const fuente = FUENTES[i];
    const resultado = resultados[i];

    if (resultado.status === "fulfilled") {
      const rutaSalida = new URL(`${fuente.slug}.txt`, DIR_SALIDA);
      await writeFile(rutaSalida, resultado.value, "utf-8");
      console.log(`OK  ${fuente.slug} (${resultado.value.length} caracteres)`);
    } else {
      huboError = true;
      console.error(`ERROR  ${fuente.slug}: ${resultado.reason.message}`);
    }
  }

  // Si TODAS las fuentes fallaron, cortamos con error para que el
  // workflow no siga a la etapa de estructuración con datos vacíos.
  // Si falló solo alguna, seguimos: la etapa 2/3 va a trabajar con
  // las fuentes que sí se pudieron traer, y la validación final
  // decide si publica o mantiene el último JSON bueno.
  const fallaronTodas = resultados.every((r) => r.status === "rejected");
  if (fallaronTodas) {
    console.error("Fallaron todas las fuentes. Abortando.");
    process.exit(1);
  }

  if (huboError) {
    console.warn("Alguna fuente falló, se continúa con las que sí se trajeron.");
  }
}

main().catch((err) => {
  console.error("Error inesperado en scrape.js:", err);
  process.exit(1);
});
