# Invitaciones Digitales - Boda Gloria Valarezo & Juan Navas

Sitio de invitaciones digitales personalizadas para la boda. Cada invitado recibe una URL unica con su nombre integrado en el diseno.

## Inicio Rapido

```bash
# Generar invitaciones desde el CSV
npm run generar

# Previsualizar localmente
npx serve .
```

## Estructura del Proyecto

```
/
├── src/
│   ├── template.html          # Plantilla HTML con placeholders
│   ├── styles.css             # Estilos principales
│   └── main.js                # Countdown, fade-ins, RSVP, calendario
├── scripts/
│   └── generar-invitaciones.js # Genera HTMLs desde CSV
├── invitacion/                # HTMLs generados (uno por invitado)
├── admin.html                 # Panel de control para novios
├── apps-script-rsvp.gs        # Codigo para Google Apps Script
├── invitados.csv              # Lista de invitados
├── config.js                  # Datos del evento (fecha, hora, lugares)
├── package.json
├── vercel.json
└── README.md
```

## Generar Invitaciones

1. Editar `invitados.csv` con la lista real de invitados:

```csv
nombre,cupos,slug
"Carlos Navas",2,carlos-navas
"Maria Lopez",1,maria-lopez
```

2. Editar `config.js` con los datos reales del evento (fecha, hora, lugares)

3. Ejecutar:
```bash
npm run generar
```

4. Los archivos se generan en `/invitacion/`

## Deploy en Vercel

1. Subir el codigo a un repositorio de GitHub
2. Crear cuenta gratis en [vercel.com](https://vercel.com)
3. Importar el repositorio
4. Vercel detecta automaticamente el proyecto estatico
5. Deploy automatico en cada push
6. URL: `https://tu-proyecto.vercel.app`

## Configurar RSVP (Google Apps Script) — DADO DE BAJA

> **IMPORTANTE (ago 2026):** El flujo RSVP por Google Sheets fue reemplazado por
> **Supabase REST** (`invitacion.html` + `admin.html`). Si tenias un despliegue
> activo de Apps Script, eliminalo en Google Apps Script > Tu proyecto >
> Desplegar > Gestionar implementaciones > Archivar/Eliminar, para evitar dos
> fuentes de verdad. Los pasos originales se conservan abajo solo como referencia.

1. Crear un Google Sheet nuevo
2. Crear una hoja llamada "Respuestas"
3. Ir a Extensiones > Apps Script
4. Pegar el codigo de `apps-script-rsvp.gs`
5. Guardar (Ctrl+S)
6. Desplegar > Nuevo despliegue:
   - Tipo: Aplicacion web
   - Ejecutar como: Tu cuenta
   - Quien tiene acceso: Cualquier persona
7. Copiar la URL del despliegue
8. Pegar en `config.js` -> `rsvpEndpoint`
9. Pegar en `admin.html` -> `DATA_URL`
10. En Google Sheet, Compartir > "Cualquier persona con el enlace puede ver"

## Panel de Admin

1. Abrir `/admin.html` en el navegador
2. Contrasena por defecto: `gloria2026`
3. Cambiar la contrasena en `admin.html` -> `PASSWORD`
4. Cambiar la URL del endpoint en `admin.html` -> `DATA_URL`

## Datos Pendientes

Antes de generar las invitaciones finales, actualizar en `config.js`:
- Fecha exacta del evento
- Hora de la ceremonia
- Lugares (ceremonia y recepcion) con direcciones reales
- URLs de Google Maps
- Mensaje personal de los novios
- URLs de fotos (placeholder actual: gradient color)

## Formato del CSV

| Columna | Tipo | Ejemplo | Descripcion |
|---------|------|---------|-------------|
| nombre | texto | Carlos Navas | Nombre completo del invitado |
| cupos | numero | 2 | Cupos asignados |
| slug | texto | carlos-navas | Identificador URL (sin espacios ni tildes) |
