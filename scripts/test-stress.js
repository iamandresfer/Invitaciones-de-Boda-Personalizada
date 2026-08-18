#!/usr/bin/env node

/**
 * STRESS TEST — Verifica todo el flujo del sistema de invitaciones
 * Ejecutar: node scripts/test-stress.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CSV_PATH = path.join(ROOT, "invitados.csv");
const OUTPUT_DIR = path.join(ROOT, "invitacion");
const TEMPLATE_PATH = path.join(ROOT, "src", "template.html");

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log("  OK " + msg);
  } else {
    failed++;
    console.log("  FAIL " + msg);
  }
}

// =============================================
// 1. CSV PARSING
// =============================================
console.log("\n=== 1. CSV PARSING ===");

function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    let values = [];
    let current = "";
    let inQuotes = false;
    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];
      if (char === '"') { inQuotes = !inQuotes; }
      else if (char === "," && !inQuotes) { values.push(current.trim()); current = ""; }
      else { current += char; }
    }
    values.push(current.trim());
    const row = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ""; });
    rows.push(row);
  }
  return rows;
}

const csv1 = "nombre,cupos,slug\nAndrés Aldeán,2,andres-aldean\nEduardo Gutiérrez,3,eduardo-gutierrez\nAriel Torres,2,ariel-torres";
const guests1 = parseCSV(csv1);
assert(guests1.length === 3, "CSV con 3 invitados parsea correctamente");
assert(guests1[0].nombre === "Andrés Aldeán", "Nombre con acentos se preserva");
assert(guests1[0].cupos === "2", "Cupos se leen como string del CSV");
assert(guests1[0].slug === "andres-aldean", "Slug se preserva");

const csv2 = "nombre,cupos,slug\nMaria Jose,1,maria-jose\n\"Perez, Juan\",4,perez-juan";
const guests2 = parseCSV(csv2);
assert(guests2.length === 2, "CSV con nombre entre comas parsea correctamente");
assert(guests2[1].nombre === "Perez, Juan", "Nombre con coma entre comillas se preserva");
assert(guests2[1].cupos === "4", "Cupos correctos con nombre entre comas");

const csv3 = "nombre,cupos,slug\n,1,";
const guests3 = parseCSV(csv3);
assert(guests3.length === 1, "CSV con nombre vacio se parsea");
assert(guests3[0].nombre === "", "Nombre vacio es string vacio");
assert(guests3[0].slug === "", "Slug vacio es string vacio");

// =============================================
// 2. SLUG GENERATION
// =============================================
console.log("\n=== 2. SLUG GENERATION ===");

function toSlug(text) {
  return text.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

assert(toSlug("Andrés Aldeán") === "andres-aldean", "Slug: acentos removidos");
assert(toSlug("Eduardo Gutiérrez") === "eduardo-gutierrez", "Slug: tilde removida");
assert(toSlug("Maria Jose") === "maria-jose", "Slug: espacio a guion");
assert(toSlug("  Juan  Perez  ") === "juan-perez", "Slug: espacios extra removidos");
assert(toSlug("Ana-María López") === "ana-maria-lopez", "Slug: guion existente preservado");
assert(toSlug("") === "", "Slug: string vacio");
assert(toSlug("123") === "123", "Slug: numeros se preservan");
assert(toSlug("Café & Co.") === "cafe-co", "Slug: caracteres especiales removidos");

// =============================================
// 3. GENERATOR
// =============================================
console.log("\n=== 3. GENERATOR ===");

const template = fs.readFileSync(TEMPLATE_PATH, "utf-8");
assert(template.includes("{{NOMBRE}}"), "Template tiene placeholder NOMBRE");
assert(template.includes("{{CUPOS}}"), "Template tiene placeholder CUPOS");
assert(template.includes("{{SLUG}}"), "Template tiene placeholder SLUG");
assert(template.includes("{{CUPOS_OPTIONS}}"), "Template tiene placeholder CUPOS_OPTIONS");
assert(template.includes('src="main.js"') || template.includes('src="main.js?'), "Template referencia main.js");

// Simulate generation with cuposOptions
function cuposOptions(cupos) {
  var html = "";
  var n = parseInt(cupos);
  for (var i = 1; i <= n; i++) {
    html += '<option value="' + i + '">' + i + " " + (i === 1 ? "cupo" : "cupos") + "</option>\n";
  }
  return html;
}

const testGuest = { nombre: "Test Guest", cupos: "3", slug: "test-guest" };
let html = template
  .replace(/\{\{NOMBRE\}\}/g, testGuest.nombre)
  .replace(/\{\{CUPOS\}\}/g, testGuest.cupos)
  .replace(/\{\{SLUG\}\}/g, testGuest.slug)
  .replace(/\{\{CUPOS_OPTIONS\}\}/g, cuposOptions(testGuest.cupos))
  .replace(/href="styles\.css(\?[^"]*)?"/g, 'href="../src/styles.css$1"')
  .replace(/src="main\.js(\?[^"]*)?"/g, 'src="../src/main.js$1"');

assert(html.includes("Test Guest"), "Generator reemplaza NOMBRE");
assert(html.includes('value="Test Guest"'), "Generator pone nombre en input RSVP");
assert(html.includes('3 cupos'), "Generator genera opciones de cupos correctas");
assert(html.includes("../src/main.js"), "Generator pone path relativo correcto para main.js");
assert(html.includes("../src/styles.css"), "Generator pone path relativo correcto para styles.css");
assert(!html.includes("{{NOMBRE}}"), "No quedan placeholders sin reemplazar");

// =============================================
// 4. RSVP DEDUP LOGIC (simulated)
// =============================================
console.log("\n=== 4. RSVP DEDUP ===");

function simulateRsvpDedup(existingRsvps, newRsvp) {
  const idx = existingRsvps.findIndex(
    r => r.nombre.toLowerCase() === newRsvp.nombre.toLowerCase()
  );
  if (idx !== -1) {
    existingRsvps[idx] = newRsvp;
    return { action: "updated", list: existingRsvps };
  }
  existingRsvps.push(newRsvp);
  return { action: "appended", list: existingRsvps };
}

let rsvps = [];
let result;

result = simulateRsvpDedup(rsvps, { nombre: "Andres", cupos: 2 });
assert(result.action === "appended", "Primer RSVP: se agrega");
assert(result.list.length === 1, "Lista tiene 1 elemento");

result = simulateRsvpDedup(rsvps, { nombre: "Andres", cupos: 1 });
assert(result.action === "updated", "Segundo RSVP mismo nombre: se actualiza");
assert(result.list.length === 1, "Lista sigue teniendo 1 elemento");
assert(result.list[0].cupos === 1, "Cupos se actualizo a 1");

result = simulateRsvpDedup(rsvps, { nombre: "Eduardo", cupos: 3 });
assert(result.action === "appended", "RSVP diferente nombre: se agrega");
assert(result.list.length === 2, "Lista tiene 2 elementos");

result = simulateRsvpDedup(rsvps, { nombre: "andres", cupos: 2 });
assert(result.action === "updated", "Dedup case-insensitive funciona");
assert(result.list.length === 2, "Lista sigue teniendo 2 elementos");

// =============================================
// 5. STATS CALCULATION
// =============================================
console.log("\n=== 5. STATS ===");

function calcStats(respuestas) {
  let total = respuestas.length;
  let confirmados = 0, cupos = 0;
  for (let r of respuestas) {
    if (r.Estado === "Confirmado") confirmados++;
    cupos += parseInt(r["Cupos Confirmados"]) || 0;
  }
  return { total, confirmados, pendientes: total - confirmados, cupos };
}

let stats = calcStats([
  { Nombre: "Andres", Estado: "Confirmado", "Cupos Confirmados": 2 },
  { Nombre: "Eduardo", Estado: "Confirmado", "Cupos Confirmados": 3 },
  { Nombre: "Ariel", Estado: "Pendiente", "Cupos Confirmados": 0 },
]);
assert(stats.total === 3, "Stats: total = 3");
assert(stats.confirmados === 2, "Stats: confirmados = 2");
assert(stats.pendientes === 1, "Stats: pendientes = 1");
assert(stats.cupos === 5, "Stats: cupos = 2+3 = 5");

stats = calcStats([]);
assert(stats.total === 0, "Stats vacio: total = 0");
assert(stats.confirmados === 0, "Stats vacio: confirmados = 0");

// =============================================
// 6. CLEAN RSVPS LOGIC (simulated)
// =============================================
console.log("\n=== 6. CLEAN RSVPS ===");

function simulateCleanRsvps(activeNames, rsvps) {
  const activeSet = {};
  for (let name of activeNames) {
    activeSet[name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")] = true;
  }
  return rsvps.filter(r => {
    const name = (r.Nombre || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return !!activeSet[name];
  });
}

let cleaned = simulateCleanRsvps(
  ["Andres", "Eduardo"],
  [
    { Nombre: "Andres", Estado: "Confirmado" },
    { Nombre: "Ariel", Estado: "Confirmado" },
    { Nombre: "Eduardo", Estado: "Pendiente" },
  ]
);
assert(cleaned.length === 2, "Clean: Ariel eliminado (no esta en activos)");
assert(cleaned[0].Nombre === "Andres", "Clean: Andres se mantiene");
assert(cleaned[1].Nombre === "Eduardo", "Clean: Eduardo se mantiene");

cleaned = simulateCleanRsvps([], [{ Nombre: "Andres", Estado: "Confirmado" }]);
assert(cleaned.length === 0, "Clean: sin activos, todos eliminados");

// =============================================
// 7. INVITATION HTML INTEGRITY
// =============================================
console.log("\n=== 7. INVITATION HTML ===");

const invPath = path.join(OUTPUT_DIR, "andres-aldean.html");
const invHtml = fs.readFileSync(invPath, "utf-8");
assert(invHtml.includes("<!DOCTYPE html>"), "HTML es documento valido");
assert(invHtml.includes('href="../src/styles.css"'), "CSS path correcto");
assert(invHtml.includes('src="../src/main.js?v=2"'), "JS path correcto con cache bust");
assert(invHtml.includes("Andrés Aldeán"), "Nombre del invitado en HTML");
assert(invHtml.includes('value="2"'), "Cupos preseleccionados en RSVP");
assert(invHtml.includes("rsvp-debug-log"), "Debug overlay presente");
assert(invHtml.includes("INVITADO"), "Variable INVITADO definida");
assert(invHtml.includes("andres-aldean"), "Slug en HTML");
assert(!invHtml.includes("TU_URL_DE_APPS_SCRIPT"), "No hay placeholder URL");

// =============================================
// SUMMARY
// =============================================
console.log("\n==========================================");
console.log("RESULTADOS: " + passed + " passed, " + failed + " failed");
console.log("==========================================");

if (failed > 0) {
  process.exit(1);
}
