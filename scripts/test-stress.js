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
// 5. STATS CALCULATION (cross-reference)
// =============================================
console.log("\n=== 5. STATS ===");

function normalize(str) {
  return (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function mergeData(invitados, respuestas) {
  var rsvpMap = {};
  for (var i = 0; i < respuestas.length; i++) {
    var key = normalize(respuestas[i].Nombre);
    rsvpMap[key] = respuestas[i];
  }
  var merged = [];
  for (var j = 0; j < invitados.length; j++) {
    var inv = invitados[j];
    var rsvp = rsvpMap[normalize(inv.nombre)];
    merged.push({
      nombre: inv.nombre || "",
      cupos: inv.cupos || 1,
      cuposConfirmados: rsvp ? (parseInt(rsvp["Cupos Confirmados"]) || 0) : 0,
      estado: rsvp ? (rsvp.Estado || "Pendiente") : "Pendiente",
      mensaje: rsvp ? (rsvp.Mensaje || "-") : "-"
    });
  }
  return merged;
}

function calcStats(invitados, respuestas) {
  var merged = mergeData(invitados, respuestas);
  var totalInv = invitados.length;
  var totalCupos = 0;
  for (var i = 0; i < invitados.length; i++) {
    totalCupos += parseInt(invitados[i].cupos) || 0;
  }
  var confirmadas = 0, pendientes = 0, noAsistenCupos = 0;
  for (var j = 0; j < merged.length; j++) {
    var m = merged[j];
    if (m.estado === "Confirmado") {
      confirmadas += m.cuposConfirmados;
    } else if (m.estado === "No asiste") {
      noAsistenCupos += m.cupos;
    } else {
      pendientes++;
    }
  }
  return { totalInv, totalCupos, esperadas: totalCupos - noAsistenCupos, confirmadas, pendientes, noAsisten: noAsistenCupos, merged };
}

let stats;

// Case 1: 2 invitados, 1 confirmed, 1 pending
stats = calcStats(
  [
    { nombre: "Andres", cupos: 2 },
    { nombre: "Eduardo", cupos: 3 },
  ],
  [
    { Nombre: "Andres", Estado: "Confirmado", "Cupos Confirmados": 2, Mensaje: "Nos vemos" },
  ]
);
assert(stats.totalInv === 2, "Stats: 2 invitaciones");
assert(stats.totalCupos === 5, "Stats: 5 personas en cupos totales");
assert(stats.esperadas === 5, "Stats: 5 personas esperadas (nadie declina)");
assert(stats.confirmadas === 2, "Stats: 2 personas confirmadas (solo Andres)");
assert(stats.pendientes === 1, "Stats: 1 pendiente (Eduardo)");
assert(stats.noAsisten === 0, "Stats: 0 no asisten");
assert(stats.merged.length === 2, "Stats: merged tiene 2 registros");
assert(stats.merged[0].estado === "Confirmado", "Stats: Andres confirmado");
assert(stats.merged[1].estado === "Pendiente", "Stats: Eduardo pendiente");

// Case 2: partial confirmation - Andres confirms only 1 of 2 cupos
stats = calcStats(
  [
    { nombre: "Andres", cupos: 2 },
    { nombre: "Eduardo", cupos: 3 },
  ],
  [
    { Nombre: "Andres", Estado: "Confirmado", "Cupos Confirmados": 1, Mensaje: "" },
    { Nombre: "Eduardo", Estado: "No asiste", "Cupos Confirmados": 0, Mensaje: "No puedo" },
  ]
);
assert(stats.totalCupos === 5, "Stats parcial: 5 cupos totales");
assert(stats.esperadas === 2, "Stats parcial: 2 esperadas (Eduardo declina, 5-3=2)");
assert(stats.confirmadas === 1, "Stats parcial: Andres confirma solo 1");
assert(stats.pendientes === 0, "Stats parcial: 0 pendientes (ambos respondieron)");
assert(stats.noAsisten === 3, "Stats parcial: Eduardo no asiste, 3 cupos");

// Case 3: deleted guest removes cupos from count
stats = calcStats(
  [
    { nombre: "Andres", cupos: 2 },
  ],
  [
    { Nombre: "Andres", Estado: "Confirmado", "Cupos Confirmados": 2 },
    { Nombre: "Eduardo", Estado: "Confirmado", "Cupos Confirmados": 3 },
  ]
);
assert(stats.totalInv === 1, "Stats delete: 1 invitacion (Eduardo borrado)");
assert(stats.totalCupos === 2, "Stats delete: solo 2 cupos totales");
assert(stats.esperadas === 2, "Stats delete: 2 esperadas");
assert(stats.confirmadas === 2, "Stats delete: 2 confirmadas (solo Andres)");
assert(stats.merged.length === 1, "Stats delete: merged solo tiene Andres");
assert(stats.merged[0].nombre === "Andres", "Stats delete: Andres en merged");

// Case 4: empty
stats = calcStats([], []);
assert(stats.totalInv === 0, "Stats vacio: 0 invitaciones");
assert(stats.totalCupos === 0, "Stats vacio: 0 cupos totales");
assert(stats.esperadas === 0, "Stats vacio: 0 esperadas");
assert(stats.confirmadas === 0, "Stats vacio: 0 confirmadas");
assert(stats.pendientes === 0, "Stats vacio: 0 pendientes");

// Case 5: RSVP name normalization (accents)
stats = calcStats(
  [{ nombre: "Andrés Aldeán", cupos: 2 }],
  [{ Nombre: "Andres Aldean", Estado: "Confirmado", "Cupos Confirmados": 2 }]
);
assert(stats.confirmadas === 2, "Stats normalize: nombre con/.sin tildes matchea");
assert(stats.merged[0].estado === "Confirmado", "Stats normalize: estado correcto");

// Case 6: toggle Confirmado -> No asiste reduces esperadas
stats = calcStats(
  [
    { nombre: "Andres", cupos: 2 },
    { nombre: "Luis", cupos: 3 },
  ],
  [
    { Nombre: "Andres", Estado: "Confirmado", "Cupos Confirmados": 2 },
    { Nombre: "Luis", Estado: "No asiste", "Cupos Confirmados": 0 },
  ]
);
assert(stats.esperadas === 2, "Toggle: Luis No asiste -> esperadas = 5-3 = 2");
assert(stats.confirmadas === 2, "Toggle: Andres sigue confirmado");
assert(stats.noAsisten === 3, "Toggle: Luis 3 cupos no asisten");
assert(stats.pendientes === 0, "Toggle: 0 pendientes");

// Case 7: toggle No asiste -> Confirmado restaura esperadas
stats = calcStats(
  [
    { nombre: "Andres", cupos: 2 },
    { nombre: "Luis", cupos: 3 },
  ],
  [
    { Nombre: "Andres", Estado: "Confirmado", "Cupos Confirmados": 2 },
    { Nombre: "Luis", Estado: "Confirmado", "Cupos Confirmados": 3 },
  ]
);
assert(stats.esperadas === 5, "Reactivar: Luis vuelve -> esperadas = 5");
assert(stats.confirmadas === 5, "Reactivar: ambos confirmados = 2+3");

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
