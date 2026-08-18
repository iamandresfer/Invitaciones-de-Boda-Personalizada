/* ========================================
   Wedding Invitation – Main JS
   ======================================== */

var RSVP_URL = "https://script.google.com/macros/s/AKfycbzN51e8vD_TvOsesZYJRr7EPawt9Q_TP7ksfjZaFG_wIeZMu6helJ4Gdicjy6iUJGYp/exec";

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

    var cuposVal = parseInt(document.getElementById("rsvp-cupos").value, 10);

    var payload = {
      action: "rsvp",
      nombre: INVITADO.nombre,
      cuposAsignados: INVITADO.cupos,
      cuposConfirmados: cuposVal,
      slug: INVITADO.slug,
      fechaEnvio: new Date().toISOString(),
    };

    log("Enviando RSVP: " + INVITADO.nombre + " (" + cuposVal + " cupos)");
    log("URL: " + RSVP_URL);
    log("Payload: " + JSON.stringify(payload));

    fetch(RSVP_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload),
    })
      .then(function (resp) {
        log("Response HTTP " + resp.status + " | type: " + resp.type);
        if (resp.type === "opaque") {
          log("Respuesta opaca (CORS) - continuando de todas formas");
          return { success: true };
        }
        if (!resp.ok) throw new Error("HTTP " + resp.status);
        return resp.json();
      })
      .then(function (data) {
        log("Respuesta: " + JSON.stringify(data));
        if (data && data.error) {
          throw new Error(data.error + (data.details ? " - " + data.details : ""));
        }
        log("RSVP exitoso! Guardando en localStorage...");
        localStorage.setItem(getStorageKey(), JSON.stringify({
          nombre: INVITADO.nombre,
          cupos: payload.cuposConfirmados,
          fecha: payload.fechaEnvio,
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