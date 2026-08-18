/**
 * Google Apps Script para Boda Gloria & Juan
 * Maneja: RSVP + Invitados + Auto-commit a GitHub
 *
 * INSTRUCCIONES:
 * 1. Crear Google Sheet con hojas "Respuestas" e "Invitados"
 * 2. Extensiones > Apps Script > Pegar este codigo
 * 3. Guardar (Ctrl+S)
 * 4. Ejecutar setupGithub() una vez para configurar el token de GitHub
 * 5. Desplegar > Nuevo despliegue > Aplicacion web > Cualquier persona
 * 6. Pegar URL del despliegue en admin.html > DATA_URL
 */

// ==========================================
// SETUP (ejecutar una sola vez)
// ==========================================

function setupGithub() {
  var props = PropertiesService.getScriptProperties();
  props.setProperty("GITHUB_TOKEN", "PEGA_TU_TOKEN_AQUI");
  props.setProperty("GITHUB_REPO", "iamandresfer/Invitaciones-de-Boda-Personalizada");
  props.setProperty("GITHUB_BRANCH", "main");
  Logger.log("Configuracion guardada. Verificar con getGithubConfig()");
}

function getGithubConfig() {
  var props = PropertiesService.getScriptProperties();
  return {
    token: props.getProperty("GITHUB_TOKEN"),
    repo: props.getProperty("GITHUB_REPO"),
    branch: props.getProperty("GITHUB_BRANCH") || "main"
  };
}

// ==========================================
// HELPERS
// ==========================================

function ensureSheet(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  }
  return sheet;
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function errorResponse(message, details) {
  Logger.log("ERROR: " + message + " | " + (details || ""));
  return jsonResponse({ success: false, error: message, details: details || "" });
}

// ==========================================
// DISPATCH
// ==========================================

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      Logger.log("doPost ejecutado sin request HTTP. Usa GET/POST desde el navegador.");
      return jsonResponse({ error: "No HTTP request data. Deploy as web app and access from browser." });
    }
    Logger.log("doPost received: " + e.postData.contents);
    var data = JSON.parse(e.postData.contents);
    var action = data.action || "rsvp";

    if (action === "rsvp") return handleRsvp(data);
    if (action === "saveInvitados") return handleSaveInvitados(data);
    if (action === "deleteRsvp") return handleDeleteRsvp(data);
    if (action === "updateEstado") return handleUpdateEstado(data);

    return errorResponse("Unknown action", action);

  } catch (error) {
    Logger.log("doPost error: " + error.toString());
    return errorResponse("Server error", error.toString());
  }
}

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || "getInvitados";

    if (action === "getInvitados") return handleGetInvitados();
    if (action === "getRespuestas") return handleGetRespuestas();

    return handleGetInvitados();

  } catch (error) {
    Logger.log("doGet error: " + error.toString());
    return errorResponse("Server error", error.toString());
  }
}

// ==========================================
// RSVP
// ==========================================

function handleRsvp(rsvp) {
  Logger.log("RSVP data: " + JSON.stringify(rsvp));

  var sheet = ensureSheet("Respuestas", [
    "Fecha", "Nombre", "Cupos Asignados", "Cupos Confirmados", "Mensaje", "Estado"
  ]);

  var estado = (parseInt(rsvp.cuposConfirmados) > 0) ? "Confirmado" : "Pendiente";
  var newRow = [
    new Date(),
    rsvp.nombre || "",
    rsvp.cuposAsignados || 0,
    rsvp.cuposConfirmados || 0,
    rsvp.mensaje || "",
    estado
  ];

  // Dedup: if same name already exists, update instead of append
  var rows = sheet.getDataRange().getValues();
  var headers = rows[0];
  var nombreIdx = headers.indexOf("Nombre");
  var found = false;
  if (nombreIdx !== -1) {
    for (var i = 1; i < rows.length; i++) {
      if ((rows[i][nombreIdx] || "").toString().toLowerCase() === (rsvp.nombre || "").toString().toLowerCase()) {
        sheet.getRange(i + 1, 1, 1, newRow.length).setValues([newRow]);
        found = true;
        Logger.log("RSVP actualizado: " + rsvp.nombre);
        break;
      }
    }
  }

  if (!found) {
    sheet.appendRow(newRow);
    Logger.log("RSVP nuevo: " + rsvp.nombre + " - " + estado);
  }

  return jsonResponse({ success: true, nombre: rsvp.nombre, estado: estado, updated: found });
}

function handleDeleteRsvp(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Respuestas");
  if (!sheet || sheet.getLastRow() <= 1) {
    return jsonResponse({ success: true, deleted: 0 });
  }

  var rows = sheet.getDataRange().getValues();
  var headers = rows[0];
  var nombreIdx = headers.indexOf("Nombre");
  if (nombreIdx === -1) return jsonResponse({ success: true, deleted: 0 });

  var nombre = (data.nombre || "").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  var rowsToDelete = [];

  for (var i = rows.length - 1; i >= 1; i--) {
    var rowName = (rows[i][nombreIdx] || "").toString().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (rowName === nombre) {
      rowsToDelete.push(i + 1);
    }
  }

  for (var j = 0; j < rowsToDelete.length; j++) {
    sheet.deleteRow(rowsToDelete[j]);
  }

  Logger.log("Borrados " + rowsToDelete.length + " RSVPs de: " + data.nombre);
  return jsonResponse({ success: true, deleted: rowsToDelete.length });
}

function handleUpdateEstado(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Respuestas");
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet("Respuestas");
    sheet.appendRow(["Fecha", "Nombre", "Cupos Asignados", "Cupos Confirmados", "Mensaje", "Estado"]);
  }

  var nombre = data.nombre || "";
  var nuevoEstado = data.estado || "Pendiente";
  var rows = sheet.getDataRange().getValues();
  var headers = rows[0];
  var nombreIdx = headers.indexOf("Nombre");
  var estadoIdx = headers.indexOf("Estado");

  if (nombreIdx === -1 || estadoIdx === -1) {
    return jsonResponse({ success: false, error: "Columnas Nombre/Estado no encontradas" });
  }

  var searchName = nombre.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  var found = false;

  for (var i = 1; i < rows.length; i++) {
    var rowName = (rows[i][nombreIdx] || "").toString().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (rowName === searchName) {
      sheet.getRange(i + 1, estadoIdx + 1).setValue(nuevoEstado);
      found = true;
      Logger.log("Estado actualizado: " + nombre + " -> " + nuevoEstado);
      break;
    }
  }

  if (!found) {
    sheet.appendRow([new Date(), nombre, 0, 0, "", nuevoEstado]);
    Logger.log("RSVP creado desde panel: " + nombre + " -> " + nuevoEstado);
  }

  return jsonResponse({ success: true, nombre: nombre, estado: nuevoEstado, updated: found });
}

// ==========================================
// INVITADOS (CRUD + auto-commit)
// ==========================================

function handleGetInvitados() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Invitados");
  if (!sheet) {
    return jsonResponse([]);
  }

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return jsonResponse([]);
  }

  var headers = data.shift();
  var result = [];
  for (var i = 0; i < data.length; i++) {
    var obj = { _row: i + 2 };
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = data[i][j];
    }
    result.push(obj);
  }

  return jsonResponse(result);
}

function handleGetRespuestas() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Respuestas");
  if (!sheet) {
    Logger.log("Sheet 'Respuestas' no existe");
    return jsonResponse([]);
  }

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return jsonResponse([]);
  }

  var headers = data.shift();
  var result = [];
  for (var i = 0; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = data[i][j];
    }
    result.push(obj);
  }

  Logger.log("Respuestas encontradas: " + result.length);
  return jsonResponse(result);
}

function handleSaveInvitados(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Invitados");
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet("Invitados");
    sheet.appendRow(["nombre", "cupos", "slug"]);
  }

  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }

  var invitados = data.invitados || [];
  for (var i = 0; i < invitados.length; i++) {
    var inv = invitados[i];
    sheet.appendRow([
      inv.nombre || "",
      inv.cupos || 1,
      inv.slug || ""
    ]);
  }

  // Auto-borrar RSVPs de invitados que ya no existen
  var deletedRsvps = cleanRsvps(invitados);

  var commitResult = commitCsvToGitHub(invitados);

  return jsonResponse({
    success: true,
    count: invitados.length,
    deletedRsvps: deletedRsvps,
    github: commitResult
  });
}

// ==========================================
// CLEAN RSVPs
// ==========================================

function cleanRsvps(invitados) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Respuestas");
  if (!sheet || sheet.getLastRow() <= 1) return 0;

  // Build set of active guest names (lowercase, normalized)
  var activeNames = {};
  for (var i = 0; i < invitados.length; i++) {
    var name = (invitados[i].nombre || "").toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    activeNames[name] = true;
  }

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var nombreIdx = headers.indexOf("Nombre");
  if (nombreIdx === -1) return 0;

  // Find rows to delete (from bottom to top to avoid index shifting)
  var rowsToDelete = [];
  for (var r = data.length - 1; r >= 1; r--) {
    var rsvpName = (data[r][nombreIdx] || "").toString().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (!activeNames[rsvpName]) {
      rowsToDelete.push(r + 1); // sheet rows are 1-indexed
    }
  }

  for (var j = 0; j < rowsToDelete.length; j++) {
    sheet.deleteRow(rowsToDelete[j]);
  }

  if (rowsToDelete.length > 0) {
    Logger.log("Borrados " + rowsToDelete.length + " RSVPs de invitados eliminados");
  }
  return rowsToDelete.length;
}

// ==========================================
// GITHUB API
// ==========================================

function commitCsvToGitHub(invitados) {
  var config = getGithubConfig();
  if (!config.token || config.token === "PEGA_TU_TOKEN_AQUI") {
    return { skipped: true, reason: "GitHub token not configured" };
  }

  try {
    var csv = "nombre,cupos,slug\n";
    for (var i = 0; i < invitados.length; i++) {
      var inv = invitados[i];
      csv += csvEscape(inv.nombre) + "," + (inv.cupos || 1) + "," + csvEscape(inv.slug) + "\n";
    }

    var encoded = Utilities.base64Encode(csv);
    var message = "auto: actualizar lista de invitados (" + invitados.length + " guests)";
    var sha = getFileSHA(config, "invitados.csv");

    var body = {
      message: message,
      content: encoded,
      branch: config.branch
    };

    if (sha) {
      body.sha = sha;
    }

    var response = UrlFetchApp.fetch(
      "https://api.github.com/repos/" + config.repo + "/contents/invitados.csv",
      {
        method: "put",
        contentType: "application/json",
        headers: {
          "Authorization": "token " + config.token,
          "Accept": "application/vnd.github.v3+json",
          "User-Agent": "Boda-Gloria-Juan"
        },
        payload: JSON.stringify(body),
        muteHttpExceptions: true
      }
    );

    var result = JSON.parse(response.getContentText());

    if (response.getResponseCode() === 200 || response.getResponseCode() === 201) {
      return { success: true, commit: result.commit ? result.commit.sha : null };
    } else {
      return { success: false, error: result.message || "Unknown error" };
    }

  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getFileSHA(config, filePath) {
  try {
    var response = UrlFetchApp.fetch(
      "https://api.github.com/repos/" + config.repo + "/contents/" + filePath + "?ref=" + config.branch,
      {
        method: "get",
        headers: {
          "Authorization": "token " + config.token,
          "Accept": "application/vnd.github.v3+json",
          "User-Agent": "Boda-Gloria-Juan"
        },
        muteHttpExceptions: true
      }
    );

    if (response.getResponseCode() === 200) {
      var data = JSON.parse(response.getContentText());
      return data.sha;
    }
    return null;

  } catch (error) {
    return null;
  }
}

function csvEscape(value) {
  var str = String(value || "");
  if (str.indexOf(",") !== -1 || str.indexOf('"') !== -1 || str.indexOf("\n") !== -1) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}