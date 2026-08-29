#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { execSync, spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const INPUT_DIR = path.join(ROOT, "src/assets/images");
const VIDEO_DIR = path.join(ROOT, "src/assets/video");
const WIDTHS = [400, 800, 1200];
const QUALITY = 82;

let sharp;
try {
  sharp = require("sharp");
} catch (e) {
  console.error("sharp no instalado. Ejecuta: npm install sharp");
  process.exit(1);
}

function hasFFmpeg() {
  const r = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
  return r.status === 0;
}

async function optimizeImages() {
  if (!fs.existsSync(INPUT_DIR)) {
    console.log("INPUT_DIR no existe:", INPUT_DIR);
    return;
  }
  const files = fs.readdirSync(INPUT_DIR).filter(f => /\.(jpg|jpeg|png)$/i.test(f) && !f.includes("-") );
  // Filtrar solo las usadas en la invitacion para no procesar todo si hay muchas
  const allowList = ["01.png","02.png","03.png","04.jpg","principal_hero.png","IMG_4963.jpg","IMG_5283.PNG","IMG_4072.jpg","IMG_4074.jpg","IMG_1505.jpg","IMG_3029.jpg","hero_nuevo.jpeg"];
  const toProcess = files.filter(f => allowList.includes(f));
  console.log(`Optimizando ${toProcess.length} imágenes: ${toProcess.join(", ")}`);
  for (const file of toProcess) {
    const input = path.join(INPUT_DIR, file);
    const base = path.parse(file).name;
    const ext = path.parse(file).ext;
    for (const w of WIDTHS) {
      const out = path.join(INPUT_DIR, `${base}-${w}w.webp`);
      try {
        await sharp(input).resize({ width: w, withoutEnlargement: true }).webp({ quality: QUALITY }).toFile(out);
        const stat = fs.statSync(out);
        console.log(`  ✓ ${base}-${w}w.webp (${(stat.size/1024).toFixed(0)} KB)`);
      } catch (e) {
        console.error(`  ✗ ${base}-${w}w.webp:`, e.message);
      }
    }
    // Full fallback webp sin resize
    try {
      const outFull = path.join(INPUT_DIR, `${base}.webp`);
      if (!fs.existsSync(outFull)) {
        await sharp(input).webp({ quality: QUALITY }).toFile(outFull);
        console.log(`  ✓ ${base}.webp`);
      }
    } catch (e) {}
  }
}

function optimizeVideo() {
  const mov = path.join(INPUT_DIR, "IMG_1390.MOV");
  if (!fs.existsSync(mov)) {
    console.log("No se encontró IMG_1390.MOV, omitiendo video");
    return;
  }
  if (!hasFFmpeg()) {
    console.log("ffmpeg no encontrado en PATH. Video no optimizado.");
    console.log("  Para optimizar video instala ffmpeg: https://ffmpeg.org/");
    console.log("  En Windows: winget install ffmpeg  o  choco install ffmpeg");
    console.log("  Luego ejecuta: ffmpeg -y -i src/assets/images/IMG_1390.MOV -c:v libx264 -preset slow -crf 23 -c:a aac -b:a 128k -movflags +faststart -vf \"scale='min(1920,iw)':-2\" src/assets/video/ceremonia.mp4");
    // Crear carpeta y poster fallback desde IMG_4963
    if (!fs.existsSync(VIDEO_DIR)) fs.mkdirSync(VIDEO_DIR, { recursive: true });
    // Si no hay video optimizado, el HTML usará poster jpg y el video no cargará (404) hasta que se genere
    return;
  }
  if (!fs.existsSync(VIDEO_DIR)) fs.mkdirSync(VIDEO_DIR, { recursive: true });
  const mp4 = path.join(VIDEO_DIR, "ceremonia.mp4");
  const poster = path.join(INPUT_DIR, "video-poster.webp");
  try {
    console.log("Generando poster...");
    execSync(`ffmpeg -y -i "${mov}" -vframes 1 -vf "scale=1200:-1" "${poster}"`, { stdio: "inherit" });
    console.log("  ✓ video-poster.webp");
  } catch (e) { console.error("  ✗ poster:", e.message); }
  try {
    console.log("Convirtiendo MP4 (H.264)...");
    execSync(`ffmpeg -y -i "${mov}" -c:v libx264 -preset slow -crf 23 -c:a aac -b:a 128k -movflags +faststart -vf "scale='min(1920,iw)':-2" "${mp4}"`, { stdio: "inherit" });
    const stat = fs.statSync(mp4);
    console.log(`  ✓ ceremonia.mp4 (${(stat.size/1024/1024).toFixed(1)} MB)`);
  } catch (e) { console.error("  ✗ mp4:", e.message); }
}

(async () => {
  await optimizeImages();
  optimizeVideo();
  console.log("\nOptimización completada. Imágenes WebP listas para carga responsiva.");
  console.log("Nota: El MOV original (89 MB) se mantiene. El MP4 optimizado se sirve si ffmpeg estuvo disponible.");
})();
