/* ========================================
   Wedding Invitation – Main JS
   ======================================== */

var SUPABASE_URL = 'https://qtnfqejnmzikiobhmkmv.supabase.co';
var SUPABASE_ANON_KEY = 'sb_publishable_oQyw9kcdT9Y7RM0vis2dTg_J472rlDV';
var SUPABASE_REST = SUPABASE_URL + '/rest/v1';
var RSVP_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
  'Content-Type': 'application/json',
  Prefer: 'return=representation'
};

var _logs = [];
function log(msg) {
  var ts = new Date().toLocaleTimeString();
  _logs.push(ts + " " + msg);
  console.log("[RSVP]", msg);
  var el = document.getElementById("rsvp-debug-log");
  if (el) {
    el.innerHTML = _logs.map(function(l) { return "<div>" + l + "</div>"; }).join("");
    el.scrollTop = el.scrollHeight;
  }
}

document.addEventListener("DOMContentLoaded", function () {
  initCountdown();
  initFadeIn();
  initCalendar();
  initRsvp();
});

/* ---------- Countdown ---------- */

function initCountdown() {
  var target = new Date(EVENTO_FECHA + "T16:00:00").getTime();
  var $days = document.getElementById("days");
  var $hours = document.getElementById("hours");
  var $minutes = document.getElementById("minutes");
  var $seconds = document.getElementById("seconds");

  function tick() {
    var now = Date.now();
    var diff = target - now;

    if (diff <= 0) {
      $days.textContent = "0";
      $hours.textContent = "0";
      $minutes.textContent = "0";
      $seconds.textContent = "0";
      return;
    }

    var d = Math.floor(diff / 86400000);
    var h = Math.floor((diff % 86400000) / 3600000);
    var m = Math.floor((diff % 3600000) / 60000);
    var s = Math.floor((diff % 60000) / 1000);

    $days.textContent = d;
    $hours.textContent = h;
    $minutes.textContent = m;
    $seconds.textContent = s;
  }

  tick();
  setInterval(tick, 1000);
}

/* ---------- Fade-In (IntersectionObserver) ---------- */

function initFadeIn() {
  var elements = document.querySelectorAll(".fade-in");
  if (!elements.length) return;

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var index = Array.prototype.indexOf.call(elements, el);
        var delay = index * 100;

        setTimeout(function () {
          el.classList.add("visible");
        }, delay);

        observer.unobserve(el);
      });
    },
    { threshold: 0.1 }
  );

  elements.forEach(function (el) {
    observer.observe(el);
  });
}

/* ---------- Calendar ---------- */

function initCalendar() {
  var startDate = formatGcalDate(EVENTO_FECHA, "16:00:00");
  var endDate = formatGcalDate(EVENTO_FECHA, "20:00:00");

  var location =
    "{{CEREMONIA_LUGAR}} - {{RECEPCION_LUGAR}}";
  var details = "Boda de Gloria & Juan - 8 de Noviembre, 2026";

  var gcalUrl =
    "https://calendar.google.com/calendar/render?action=TEMPLATE" +
    "&text=Boda+Gloria+%26+Juan" +
    "&dates=" + startDate + "/" + endDate +
    "&location=" + encodeURIComponent(location) +
    "&details=" + encodeURIComponent(details);

  var btnCal = document.getElementById("btn-reservar-fecha");
  if (btnCal) btnCal.href = gcalUrl;
}

function formatGcalDate(dateStr, time) {
  var parts = dateStr.split("-");
  return parts.join("") + "T" + time.replace(/:/g, "");
}

/* ---------- RSVP ---------- */

function getStorageKey() {
  return "boda_rsvp_" + (INVITADO ? INVITADO.slug : "");
}

function initRsvp() {
  var form = document.getElementById("rsvp-form");
  if (!form) return;

  var alreadyConfirmed = localStorage.getItem(getStorageKey());

  if (alreadyConfirmed) {
    form.style.display = "none";
    var successEl = document.getElementById("rsvp-success");
    successEl.innerHTML = "Ya confirmaste tu asistencia. <a href='../gracias.html' style='color:inherit;text-decoration:underline;'>Ver mensaje de agradecimiento</a>";
    successEl.style.display = "block";
    log("Invitado ya confirmo anteriormente");
    return;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    if (form.dataset.submitting === "true") return;
    form.dataset.submitting = "true";

    var submitBtn = form.querySelector("button[type='submit']");
    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando...";

        var cuposVal = parseInt(document.getElementById("rsvp-adicionales").value, 10);

        log("Enviando RSVP: " + INVITADO.nombre + " (+" + cuposVal + " accompanyantes)");
        log("Supabase: " + SUPABASE_REST);

        // Step 1: Get invitado ID by slug
        fetch(SUPABASE_REST + '/invitados?slug=eq.' + INVITADO.slug + '&select=id', {
          headers: RSVP_HEADERS
        })
          .then(function(resp) {
            if (!resp.ok) throw new Error("Error al buscar invitado: HTTP " + resp.status);
            return resp.json();
          })
          .then(function(rows) {
            if (!rows || !rows.length) throw new Error("Invitado no encontrado en la base de datos");
            var invitadoId = rows[0].id;
            log("Invitado ID: " + invitadoId);

            // Step 2: Upsert RSVP response
            var payload = {
              invitado_id: invitadoId,
              nombre: INVITADO.nombre,
              adicionales_asignados: INVITADO.adicionales,
              adicionales_confirmados: cuposVal,
              estado: cuposVal > 0 ? "Confirmado" : "No asiste"
            };
            log("Payload: " + JSON.stringify(payload));

            return fetch(SUPABASE_REST + '/respuestas', {
              method: 'POST',
              headers: Object.assign({}, RSVP_HEADERS, { Prefer: 'resolution=merge-duplicates,return=representation' }),
              body: JSON.stringify(payload)
            });
      })
      .then(function(resp) {
        log("Response HTTP " + resp.status);
        if (!resp.ok) throw new Error("HTTP " + resp.status);
        return resp.json();
      })
      .then(function(data) {
        log("Respuesta: " + JSON.stringify(data));
        log("RSVP exitoso! Guardando en localStorage...");
        localStorage.setItem(getStorageKey(), JSON.stringify({
          nombre: INVITADO.nombre,
          adicionales: cuposVal,
          fecha: fechaEnvio,
        }));
        log("Redirigiendo a gracias.html...");
        window.location.href = "../gracias.html";
      })
      .catch(function (err) {
        log("ERROR: " + err.message);
        log("Stack: " + (err.stack || "N/A"));
        form.dataset.submitting = "false";
        submitBtn.disabled = false;
        submitBtn.textContent = "Confirmar Asistencia";
        var errEl = document.getElementById("rsvp-error");
        errEl.textContent = "Error: " + err.message;
        errEl.style.display = "block";
        setTimeout(function () { errEl.style.display = "none"; }, 8000);
      });
  });
}