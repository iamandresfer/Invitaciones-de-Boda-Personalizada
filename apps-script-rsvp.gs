/**
 * Google Apps Script para Boda Gloria & Juan
 * Maneja: RSVP (Respuestas) + Gestión de Invitados
 *
 * INSTRUCCIONES:
 * 1. Crear un Google Sheet nuevo
 * 2. Crear DOS hojas:
 *    - "Respuestas" columnas A-F: Fecha | Nombre | Cupos Asignados | Cupos Confirmados | Mensaje | Estado
 *    - "Invitados" columnas A-D: nombre | cupos | slug | activo
 * 3. Ir a Extensiones > Apps Script
 * 4. Pegar este codigo
 * 5. Guardar (Ctrl+S)
 * 6. Desplegar > Nuevo despliegue
 *    - Tipo: Aplicacion web
 *    - Ejecutar como: Yo (tu cuenta)
 *    - Quien tiene acceso: Cualquier persona
 * 7. Copiar la URL del despliegue y pegarla en:
 *    - config.js > rsvpEndpoint
 *    - admin.html > DATA_URL
 * 8. En el Google Sheet, Compartir > "Cualquier persona con el enlace puede ver"
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action || "rsvp";

    if (action === "rsvp") {
      return handleRsvp(data);
    } else if (action === "saveInvitados") {
      return handleSaveInvitados(data);
    } else if (action === "addInvitado") {
      return handleAddInvitado(data);
    } else if (action === "updateInvitado") {
      return handleUpdateInvitado(data);
    } else if (action === "deleteInvitado") {
      return handleDeleteInvitado(data);
    }

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

    if (action === "getInvitados") {
      return handleGetInvitados();
    } else if (action === "getRespuestas") {
      return handleGetRespuestas();
    }

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
// INVITADOS (CRUD)
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
      inv.slug || "",
      inv.activo !== false ? "true" : "false"
    ]);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ success: true, count: invitados.length }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleAddInvitado(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Invitados");
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet("Invitados");
    sheet.appendRow(["nombre", "cupos", "slug", "activo"]);
  }

  sheet.appendRow([
    data.nombre || "",
    data.cupos || 1,
    data.slug || "",
    "true"
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleUpdateInvitado(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Invitados");
  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: "Sheet 'Invitados' not found" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var row = data._row;
  if (!row || row < 2) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: "Invalid row" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  sheet.getRange(row, 1).setValue(data.nombre || "");
  sheet.getRange(row, 2).setValue(data.cupos || 1);
  sheet.getRange(row, 3).setValue(data.slug || "");
  sheet.getRange(row, 4).setValue(data.activo !== false ? "true" : "false");

  return ContentService
    .createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleDeleteInvitado(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Invitados");
  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: "Sheet 'Invitados' not found" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var row = data._row;
  if (!row || row < 2) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: "Invalid row" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  sheet.deleteRow(row);

  return ContentService
    .createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
