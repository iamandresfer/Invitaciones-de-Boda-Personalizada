/* ========================================
   Wedding Invitation – Main JS
   ======================================== */

var RSVP_URL = "https://script.google.com/macros/s/AKfycbwp9Jm5Ux3qO5twqV3Ka1sXvZ-TLz-rLHy2HxQstrxJHyZwMcAXyPn88I0tKQpRIqtWSQ/exec";

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

  var btnGoogle = document.getElementById("btn-google-calendar");
  if (btnGoogle) btnGoogle.href = gcalUrl;

  var btnIcs = document.getElementById("btn-ics-download");
  if (btnIcs) {
    btnIcs.addEventListener("click", function () {
      downloadIcs(startDate, endDate, location, details);
    });
  }
}

function formatGcalDate(dateStr, time) {
  var parts = dateStr.split("-");
  return parts.join("") + "T" + time.replace(/:/g, "");
}

function downloadIcs(startDate, endDate, location, details) {
  var dtStart = startDate.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, "$1$2$3T$4$5$6");
  var dtEnd = endDate.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, "$1$2$3T$4$5$6");

  var icsContent =
    "BEGIN:VCALENDAR\n" +
    "VERSION:2.0\n" +
    "PRODID:-//Boda Gloria y Juan//ES\n" +
    "BEGIN:VEVENT\n" +
    "DTSTART:" + dtStart + "\n" +
    "DTEND:" + dtEnd + "\n" +
    "SUMMARY:Boda Gloria & Juan\n" +
    "DESCRIPTION:" + details.replace(/\n/g, "\\n") + "\n" +
    "LOCATION:" + location.replace(/,/g, "\\,") + "\n" +
    "END:VEVENT\n" +
    "END:VCALENDAR";

  var blob = new Blob([icsContent], {
    type: "text/calendar;charset=utf-8",
  });

  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "boda-gloria-y-juan.ics";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
    successEl.innerHTML = "Ya confirmaste tu asistencia. <a href='gracias.html' style='color:inherit;text-decoration:underline;'>Ver mensaje de agradecimiento</a>";
    successEl.style.display = "block";
    return;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var submitBtn = form.querySelector("button[type='submit']");
    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando...";

    var payload = {
      action: "rsvp",
      nombre: INVITADO.nombre,
      cuposAsignados: INVITADO.cupos,
      cuposConfirmados: parseInt(
        document.getElementById("rsvp-cupos").value,
        10
      ),
      mensaje: document.getElementById("rsvp-mensaje").value,
      slug: INVITADO.slug,
      fechaEnvio: new Date().toISOString(),
    };

    fetch(RSVP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function (resp) {
        if (!resp.ok) throw new Error("HTTP " + resp.status);
        return resp.json();
      })
      .then(function (data) {
        localStorage.setItem(getStorageKey(), JSON.stringify({
          nombre: INVITADO.nombre,
          cupos: payload.cuposConfirmados,
          fecha: payload.fechaEnvio,
        }));
        window.location.href = "gracias.html";
      })
      .catch(function (err) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Confirmar Asistencia";
        document.getElementById("rsvp-error").style.display = "block";
        setTimeout(function () {
          document.getElementById("rsvp-error").style.display = "none";
        }, 5000);
      });
  });
}