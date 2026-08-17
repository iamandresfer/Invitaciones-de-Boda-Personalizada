/**
 * Google Apps Script para RSVP de Boda Gloria & Juan
 *
 * INSTRUCCIONES:
 * 1. Crear un Google Sheet nuevo
 * 2. Crear una hoja llamada "Respuestas"
 * 3. En las columnas A-F, poner: Fecha | Nombre | Cupos Asignados | Cupos Confirmados | Mensaje | Estado
 * 4. Ir a Extensiones > Apps Script
 * 5. Pegar este codigo
 * 6. Guardar (Ctrl+S)
 * 7. Desplegar > Nuevo despliegue
 *    - Tipo: Aplicacion web
 *    - Ejecutar como: Yo (tu cuenta)
 *    - Quien tiene acceso: Cualquier persona
 * 8. Copiar la URL del despliegue y pegarla en:
 *    - config.js > rsvpEndpoint
 *    - admin.html > DATA_URL
 * 9. En el Google Sheet, ir a Compartir > Cambiar a "Cualquier persona con el enlace puede ver"
 *    (necesario para que el admin pueda leer los datos)
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
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

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
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

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
