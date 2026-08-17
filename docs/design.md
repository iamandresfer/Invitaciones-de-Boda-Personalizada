# Diseno: Invitaciones Digitales - Boda Gloria Valarezo & Juan Navas

## Resumen

Sitio de invitaciones digitales personalizadas para 40-60 invitados. Cada invitado recibe una URL unica con su nombre integrado en el diseno. Prioridad #1: estetica premium (diseno editorial, no plantilla generica). Prioridad #2: personalizacion por invitado.

## Decisiones Clave

- **Enfoque tecnico:** Estatico puro - un archivo .html por invitado, generado en build time
- **Deploy:** Vercel (plan gratuito, CDN automatico)
- **URLs:** /invitacion/[slug].html - limpias, sin query params
- **Admin:** Pagina /admin.html discreta, protegida con contrasena en cliente
- **Backend:** Ninguno - Google Apps Script Web App para RSVP

---

## Estructura del Proyecto

/
+-- src/
¦   +-- template.html
¦   +-- styles.css
¦   +-- main.js
¦   +-- assets/images/
+-- scripts/
¦   +-- generar-invitaciones.js
+-- invitacion/ (output)
+-- admin.html
+-- apps-script-rsvp.gs
+-- invitados.csv
+-- config.js
+-- README.md

---

## Configuracion Centralizada (config.js)

const EVENTO = {
  novios: 'Gloria Valarezo & Juan Navas',
  fecha: '2026-11-08',
  hora: '16:00',
  ceremonia: { lugar: '...', direccion: 'Santo Domingo, Ecuador' },
  recepcion: { lugar: '...', direccion: 'Santo Domingo, Ecuador' },
  dressCode: 'Formal / Elegante',
  mensajeNovios: 'Placeholder elegante...',
  urlBase: 'https://gloria-y-juan.vercel.app',
  rsvpEndpoint: 'TU_URL_DE_APPS_SCRIPT'
};

---

## Paleta de Colores

| Rol | Hex | Uso |
|-----|-----|-----|
| Fondo | #FAFAF8 | Body, secciones |
| Texto | #2C2C2C | Titulos, cuerpo |
| Texto secundario | #6B6B6B | Metadata |
| Dorado | #C9A96E | Separadores, bordes |
| Verde oliva | #3B4334 | Botones, acciones |

## Tipografia (Google Fonts)

- **Titulares:** Cormorant Garamond (serif editorial)
- **Cuerpo:** Inter (sans-serif limpia)
- **Acento:** Great Vibes (solo para elementos puntuales)

---

## Layout de la Invitacion

1. Hero (pantalla completa) - Foto placeholder + nombre del invitado
2. Fecha + Countdown en tiempo real
3. Mensaje de los Novios (placeholder)
4. Detalles del Evento (ceremonia + recepcion)
5. Codigo de Vestimenta
6. Calendario (Google Calendar + .ics)
7. RSVP (formulario POST a Apps Script)
8. Cierre con agradecimiento

---

## Funcionalidad Calendario

- Google Calendar: link directo con params
- Apple/Outlook: descarga .ics client-side

## RSVP

- Formulario ? POST a Google Apps Script Web App
- Apps Script appenda fila en Google Sheet
- Dashboard con fórmulas de resumen

## Admin

- URL discreta, contrasena simple en cliente
- Tabla filtrable/ordenable con contadores
- Lee via Apps Script endpoint GET

## OG Tags

Personalizados por invitado para preview en WhatsApp.

## Micro-animaciones

- Fade-in escalonado (Intersection Observer)
- Countdown con transiciones suaves
- Hover en botones

## Datos Pendientes

- Fecha exacta noviembre 2026
- Hora por confirmar
- Lugares por confirmar
- Fotos: placeholder genérico
- Texto novios: placeholder editable
