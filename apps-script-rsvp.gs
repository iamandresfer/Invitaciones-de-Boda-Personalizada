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
// DISPATCH
// ==========================================

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action || "rsvp";

    if (action === "rsvp") return handleRsvp(data);
    if (action === "saveInvitados") return handleSaveInvitados(data);

    return ContentService
      .createTextOutput(JSON.stringify({ error: "Unknown action: " + action }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || "getInvitados";

    if (action === "getInvitados") return handleGetInvitados();
    if (action === "getRespuestas") return handleGetRespuestas();

    return handleGetInvitados();

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================
// RSVP
// ==========================================

function handleRsvp(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Respuestas");
  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: "Sheet 'Respuestas' not found" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var estado = (parseInt(data.cuposConfirmados) > 0) ? "Confirmado" : "Pendiente";

  sheet.appendRow([
    new Date(),
    data.nombre || "",
    data.cuposAsignados || 0,
    data.cuposConfirmados || 0,
    data.mensaje || "",
    estado
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleGetRespuestas() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Respuestas");
  var data = sheet.getDataRange().getValues();
  var headers = data.shift();

  var result = [];
  for (var i = 0; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = data[i][j];
    }
    result.push(obj);
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// INVITADOS (CRUD + auto-commit)
// ==========================================

function handleGetInvitados() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Invitados");
  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify([]))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return ContentService
      .createTextOutput(JSON.stringify([]))
      .setMimeType(ContentService.MimeType.JSON);
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

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleSaveInvitados(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Invitados");
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet("Invitados");
    sheet.appendRow(["nombre", "cupos", "slug", "activo"]);
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

  // Auto-commit CSV a GitHub
  var commitResult = commitCsvToGitHub(invitados);

  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      count: invitados.length,
      github: commitResult
    }))
    .setMimeType(ContentService.MimeType.JSON);
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
