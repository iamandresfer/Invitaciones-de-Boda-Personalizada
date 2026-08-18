#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const EVENTO = require("../config.js");

const ROOT = path.resolve(__dirname, "..");
const CSV_PATH = path.join(ROOT, "invitados.csv");
const TEMPLATE_PATH = path.join(ROOT, "src", "template.html");
const OUTPUT_DIR = path.join(ROOT, "invitacion");

function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map(function(h) { return h.trim().replace(/"/g, ""); });
  const rows = [];

  for (var i = 1; i < lines.length; i++) {
    var values = [];
    var current = "";
    var inQuotes = false;

    for (var j = 0; j < lines[i].length; j++) {
      var char = lines[i][j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    var row = {};
    headers.forEach(function(h, idx) {
      row[h] = values[idx] || "";
    });
    rows.push(row);
  }

  return rows;
}

function adicionalesOptions(adicionales) {
  var html = '<option value="0">Solo yo</option>\n';
  var n = parseInt(adicionales) || 0;
  for (var i = 1; i <= n; i++) {
    var selected = i === n ? ' selected' : "";
    html += '<option value="' + i + '"' + selected + '>' + i + " " + (i === 1 ? "acompañante" : "acompañantes") + "</option>\n";
  }
  return html;
}

function main() {
  var csvText = fs.readFileSync(CSV_PATH, "utf-8");
  var template = fs.readFileSync(TEMPLATE_PATH, "utf-8");
  var guests = parseCSV(csvText);

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  var created = 0, skipped = 0, updated = 0;

  console.log("Procesando " + guests.length + " invitaciones...\n");

  guests.forEach(function(guest) {
    var nombre = guest.nombre;
    var adicionales = guest.adicionales;
    var slug = guest.slug;
    if (!slug) { console.log("  SKIP sin slug: " + nombre); return; }

    var outPath = path.join(OUTPUT_DIR, slug + ".html");
    var exists = fs.existsSync(outPath);

    var horaParts = EVENTO.hora.split(":");
    var horaNum = parseInt(horaParts[0]);
    var horaDisplay = (horaNum > 12 ? horaNum - 12 : horaNum) + ":" + horaParts[1] + " pm";
    var horaRecepcion = String(horaNum + 1).padStart(2, "0") + ":" + horaParts[1];

    var html = template
      .replace(/\{\{NOMBRE\}\}/g, nombre)
      .replace(/\{\{ADICIONALES\}\}/g, adicionales)
      .replace(/\{\{SLUG\}\}/g, slug)
      .replace(/\{\{ADICIONALES_OPTIONS\}\}/g, adicionalesOptions(adicionales))
      .replace(/\{\{FECHA_ISO\}\}/g, EVENTO.fecha)
      .replace(/\{\{HORA_DISPLAY\}\}/g, horaDisplay)
      .replace(/\{\{HORA\}\}/g, EVENTO.hora)
      .replace(/\{\{HORA_RECEPCION\}\}/g, horaRecepcion)
      .replace(/\{\{CEREMONIA_LUGAR\}\}/g, EVENTO.ceremonia.lugar)
      .replace(/\{\{CEREMONIA_MAPS\}\}/g, EVENTO.ceremonia.googleMapsUrl)
      .replace(/\{\{RECEPCION_LUGAR\}\}/g, EVENTO.recepcion.lugar)
      .replace(/\{\{RECEPCION_MAPS\}\}/g, EVENTO.recepcion.googleMapsUrl)
      .replace(/\{\{DRESS_CODE\}\}/g, EVENTO.dressCode)
      .replace(/\{\{MENSAJE_NOVIOS\}\}/g, EVENTO.mensajeNovios)
      .replace(/\{\{OG_TITLE\}\}/g, "Gloria & Juan te invitan, " + nombre)
      .replace(/\{\{OG_DESC\}\}/g, "Estas invitado a nuestra boda. " + EVENTO.fecha + " - " + EVENTO.ceremonia.direccion)
      .replace(/\{\{OG_IMAGE\}\}/g, EVENTO.urlBase + "/assets/images/og-preview.jpg")
      .replace(/\{\{OG_URL\}\}/g, EVENTO.urlBase + "/invitacion/" + slug + ".html");

    html = html
      .replace(/href="styles\.css(\?[^"]*)?"/g, 'href="../src/styles.css$1"')
      .replace(/src="main\.js(\?[^"]*)?"/g, 'src="../src/main.js$1"');

    fs.writeFileSync(outPath, html, "utf-8");

    if (exists) {
      updated++;
      console.log("  UPD " + slug + ".html (" + nombre + ", " + adicionales + " adicionales)");
    } else {
      created++;
      console.log("  NEW " + slug + ".html (" + nombre + ", " + adicionales + " adicionales)");
    }
  });

  console.log("\nListo! " + created + " nuevas, " + updated + " actualizadas, " + skipped + " saltadas");
  console.log("Total: " + guests.length + " invitaciones en /invitacion/");
}

main();
