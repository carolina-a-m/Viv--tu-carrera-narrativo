// scripts/scrape.js
// Etapa 1: scraping SIN IA.
// Trae el RSS de noticias de política (fuente nacional) y guarda,
// como texto crudo, los ítems de la última semana: título, resumen,
// fecha y link. No interpreta ni categoriza nada: eso lo hace
// scripts/structure.js (etapa 2) con Gemini.

import { writeFile, mkdir } from "node:fs/promises";
import * as cheerio from "cheerio";

const RSS_URL = "https://www.lanacion.com.ar/arc/outboundfeeds/rss/?outputType=xml";

const DIR_SALIDA = new URL("../data/raw/", import.meta.url);
const RUTA_SALIDA = new URL("politica-rss.json", DIR_SALIDA);

// Solo nos interesan noticias recientes: el workflow corre una vez
// por semana, así que tomamos la última semana de ítems.
const DIAS_VENTANA = 7;

function limpiarTexto(texto) {
  return (texto || "").replace(/\s+/g, " ").trim();
}

function parsearItems(xml) {
  const $ = cheerio.load(xml, { xmlMode: true });

  const items = [];

  $("item").each((_, el) => {
    const titulo = limpiarTexto($(el).find("title").first().text());
    const resumen = limpiarTexto($(el).find("description").first().text());
    const link = limpiarTexto($(el).find("link").first().text());
    const fechaTexto = limpiarTexto($(el).find("pubDate").first().text());

    if (!titulo) return;

    const fecha = fechaTexto ? new Date(fechaTexto) : null;

    items.push({
      titulo,
      resumen,
      link,
      fecha: fecha && !isNaN(fecha) ? fecha.toISOString() : null,
    });
  });

  return items;
}

function filtrarUltimaSemana(items) {
  const limite = Date.now() - DIAS_VENTANA * 24 * 60 * 60 * 1000;

  return items.filter((item) => {
    if (!item.fecha) return true; // sin fecha parseable: la dejamos pasar
    return new Date(item.fecha).getTime() >= limite;
  });
}

async function main() {
  const res = await fetch(RSS_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; ViviTuCarreraBot/1.0; +https://github.com/carolina-a-m/Viv--tu-carrera-narrativo)",
    },
  });

  if (!res.ok) {
    throw new Error(
      `No se pudo traer el RSS (status ${res.status} ${res.statusText})`
    );
  }

  const xml = await res.text();
  const itemsCompletos = parsearItems(xml);
  const items = itemsCompletos.filter((item) => item.link.includes("/politica/"));

  if (items.length === 0) {
    throw new Error("El RSS no devolvió ningún ítem parseable.");
  }

  let itemsRecientes = filtrarUltimaSemana(items);

  if (itemsRecientes.length === 0) {
    console.warn(
      `Ningún ítem cae dentro de la ventana de ${DIAS_VENTANA} días. Se usan todos los ítems disponibles.`
    );
    itemsRecientes = items;
  }

  await mkdir(DIR_SALIDA, { recursive: true });
  await writeFile(
    RUTA_SALIDA,
    JSON.stringify(itemsRecientes, null, 2),
    "utf-8"
  );

  console.log(
    `OK  ${itemsRecientes.length} ítems recientes guardados en data/raw/politica-rss.json`
  );
}

main().catch((err) => {
  console.error("Error en scrape.js:", err.message);
  process.exit(1);
});
