// descargar-avatares.js
// Descarga las fotos de los avatares a assets/avatar/.
// Correrlo desde la carpeta raíz del repo (files):
//
//   node scripts/descargar-avatares.js

import { mkdir, writeFile } from 'node:fs/promises';

const AVATARES = [
  {
    archivo: 'assets/avatar/avatar-1.png',
    url: 'https://www.figma.com/api/mcp/asset/7f90929d-b6d8-4b6a-9165-72b170d996bb/924e3.png'
  },
  {
    archivo: 'assets/avatar/avatar-2.png',
    url: 'https://www.figma.com/api/mcp/asset/4eab7f8e-cf5d-4f6a-9092-e199af5c4946/a02ba.png'
  }
];

await mkdir('assets/avatar', { recursive: true });

for (const { archivo, url } of AVATARES) {

  const respuesta = await fetch(url);

  if (!respuesta.ok) {
    console.error(`Falló ${archivo}: HTTP ${respuesta.status}`);
    process.exitCode = 1;
    continue;
  }

  const buffer = Buffer.from(await respuesta.arrayBuffer());

  await writeFile(archivo, buffer);

  console.log(`OK ${archivo} (${buffer.length} bytes)`);

}