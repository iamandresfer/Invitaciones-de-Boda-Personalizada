#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const https = require("https");
const EVENTO = require("../config.js");

const ROOT = path.resolve(__dirname, "..");
const TEMPLATE_PATH = path.join(ROOT, "src", "template.html");
const OUTPUT_DIR = path.join(ROOT, "invitacion");

const SUPABASE_URL = "https://qtnfqejnmzikiobhmkmv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_oQyw9kcdT9Y7RM0vis2dTg_J472rlDV";

function fetchSupabase(endpoint) {
  return new Promise(function(resolve, reject) {
    var url = SUPABASE_URL + "/rest/v1/" + endpoint;
    var options = {
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": "Bearer " + SUPABASE_ANON_KEY
      }
    };
    https.get(url, options, function(res) {
      var data = "";
      res.on("data", function(chunk) { data += chunk; });
      res.on("end", function() {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error("Parse error: " + data.substring(0, 200))); }
      });
    }).on("error", reject);
  });
}

function toSlug(text) {
  return text
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
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
  var template = fs.readFileSync(TEMPLATE_PATH, "utf-8");

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log("Obteniendo invitados de Supabase...\n");

  fetchSupabase("invitados?select=id,nombre,adicionales,slug&order=created_at.desc")
    .then(function(guests) {
      var created = 0, updated = 0;

      console.log("Procesando " + guests.length + " invitaciones...\n");

      guests.forEach(function(guest) {
        var nombre = guest.nombre;
        var adicionales = guest.adicionales;
        var slug = guest.slug || toSlug(nombre);
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

      console.log("\nListo! " + created + " nuevas, " + updated + " actualizadas");
      console.log("Total: " + guests.length + " invitaciones en /invitacion/");
    })
    .catch(function(err) {
      console.error("Error al obtener invitados de Supabase:", err.message);
      process.exit(1);
    });
}

main();
