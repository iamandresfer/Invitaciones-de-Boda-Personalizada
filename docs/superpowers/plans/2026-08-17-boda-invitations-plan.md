# Invitaciones Digitales Boda - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a premium static wedding invitation site with personalized URLs for 40-60 guests, Google Apps Script RSVP, and a discreet admin panel.

**Architecture:** Static HTML generated per guest from a template + CSV. Each file is self-contained (inline CSS/JS). Deploy to Vercel free tier. Google Apps Script handles RSVP writes to Google Sheet.

**Tech Stack:** HTML, CSS (vanilla), JavaScript (vanilla), Node.js (generator script), Google Apps Script, Vercel

## Global Constraints

- Mobile-first design (99% traffic from WhatsApp on mobile)
- Safari iOS compatibility required
- No frameworks - vanilla HTML/CSS/JS only
- Google Fonts: Cormorant Garamond (headings), Inter (body), Great Vibes (accents)
- Color palette: #FAFAF8 (bg), #2C2C2C (text), #6B6B6B (secondary), #C9A96E (gold), #3B4334 (olive)
- Zero hosting cost (Vercel free tier)
- All event data centralized in config.js

---

## File Structure

```
/
├── src/
│   ├── template.html          # HTML template with {{placeholders}}
│   ├── styles.css             # All styles
│   ├── main.js                # Countdown, fade-ins, RSVP, calendar
│   └── assets/images/         # Placeholder images
├── scripts/
│   └── generar-invitaciones.js # Node script: CSV → HTML files
├── invitacion/                # Generated output (one per guest)
├── admin.html                 # Discreet admin panel
├── apps-script-rsvp.gs        # Google Apps Script code
├── invitados.csv              # Guest list
├── config.js                  # Event configuration
├── package.json               # Scripts only, no deps
├── vercel.json                # Vercel config
└── README.md
```

---

### Task 1: Project Scaffolding + Config

**Files:**
- Create: `package.json`
- Create: `config.js`
- Create: `invitados.csv`
- Create: `src/assets/images/` (directory)

**Interfaces:**
- Consumes: None (first task)
- Produces: `EVENTO` config object, sample CSV data

- [ ] **Step 1: Create package.json**

```json
{
  "name": "boda-gloria-y-juan",
  "version": "1.0.0",
  "description": "Invitaciones digitales para la boda de Gloria Valarezo y Juan Navas",
  "scripts": {
    "generar": "node scripts/generar-invitaciones.js",
    "preview": "npx serve ."
  },
  "private": true
}
```

- [ ] **Step 2: Create config.js**

```javascript
const EVENTO = {
  novios: "Gloria Valarezo & Juan Navas",
  fecha: "2026-11-08",
  hora: "16:00",
  ceremonia: {
    lugar: "Iglesia de Santo Domingo",
    direccion: "Santo Domingo, Ecuador",
    googleMapsUrl: "https://maps.google.com/?q=Santo+Domingo+Ecuador"
  },
  recepcion: {
    lugar: "Salon de Eventos",
    direccion: "Santo Domingo, Ecuador",
    googleMapsUrl: "https://maps.google.com/?q=Santo+Domingo+Ecuador"
  },
  dressCode: "Formal / Elegante",
  mensajeNovios: "Los novios le invitan a usted a compartir un momento especial en nuestras vidas.",
  urlBase: "https://gloria-y-juan.vercel.app",
  rsvpEndpoint: "TU_URL_DE_APPS_SCRIPT_WEB_APP_AQUI"
};

if (typeof module !== "undefined") module.exports = EVENTO;
```

- [ ] **Step 3: Create invitados.csv**

```csv
nombre,cupos,slug
"Carlos Navas",2,carlos-navas
"Maria Lopez",1,maria-lopez
"Roberto y Ana Silva",3,roberto-y-ana-silva
"Patricia Mera",1,patricia-mera
```

- [ ] **Step 4: Create directories**

```bash
mkdir -p src/assets/images scripts invitacion
```

- [ ] **Step 5: Commit**

```bash
git init
git add package.json config.js invitados.csv
git commit -m "feat: project scaffolding with config and sample CSV"
```

---

### Task 2: HTML Template

**Files:**
- Create: `src/template.html`

**Interfaces:**
- Consumes: `EVENTO` config (values injected by generator)
- Produces: Template with `{{PLACEHOLDER}}` tokens for generator

- [ ] **Step 1: Create template.html**

Full HTML template with all 8 sections using placeholders: `{{NOMBRE}}`, `{{CUPOS}}`, `{{SLUG}}`, `{{OG_TITLE}}`, `{{OG_DESC}}`, `{{OG_IMAGE}}`, `{{OG_URL}}`, `{{FECHA_ISO}}`, `{{HORA_DISPLAY}}`, `{{HORA}}`, `{{HORA_RECEPCION}}`, `{{CEREMONIA_LUGAR}}`, `{{CEREMONIA_MAPS}}`, `{{RECEPCION_LUGAR}}`, `{{RECEPCION_MAPS}}`, `{{DRESS_CODE}}`, `{{MENSAJE_NOVIOS}}`, `{{CUPOS_OPTIONS}}`.

Key structural elements:
- Hero: full-screen with overlay, "Gloria & Juan te invitan", guest name
- Countdown: 4 columns (days, hours, minutes, seconds)
- RSVP form: name input (pre-filled), cupos select, message textarea
- Script tag at bottom exposing `INVITADO` and `EVENTO_FECHA` globals

- [ ] **Step 2: Verify template loads in browser**

- [ ] **Step 3: Commit**

```bash
git add src/template.html
git commit -m "feat: HTML template with all sections and placeholders"
```

---

### Task 3: CSS Styles

**Files:**
- Create: `src/styles.css`

**Interfaces:**
- Consumes: HTML structure from template.html
- Produces: Complete visual styling

- [ ] **Step 1: Create styles.css**

Complete CSS including:
- Reset and CSS variables for palette
- Hero: full-screen, gradient background, overlay, centered content
- Sections: 80px padding, centered container (600px max)
- Typography: Cormorant for headings, Inter for body, Great Vibes for ampersand
- Countdown: flexbox grid with large numbers
- Form inputs: clean borders, gold focus state
- Buttons: olive primary, outlined secondary
- Fade-in animation class
- Mobile responsive (480px breakpoint)

- [ ] **Step 2: Open template.html in browser and verify visual**

- [ ] **Step 3: Commit**

```bash
git add src/styles.css
git commit -m "feat: complete CSS with editorial design, responsive, animations"
```

---

### Task 4: JavaScript - Countdown + Fade-ins

**Files:**
- Create: `src/main.js`

**Interfaces:**
- Consumes: `EVENTO_FECHA` global from template, `.fade-in` CSS class
- Produces: Live countdown, scroll-triggered fade-ins

- [ ] **Step 1: Create main.js**

Countdown function (updates every second) + IntersectionObserver fade-in with staggered delay.

- [ ] **Step 2: Test in browser**

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git commit -m "feat: countdown timer and scroll fade-in animations"
```

---

### Task 5: Calendar Functionality

**Files:**
- Modify: `src/main.js`

**Interfaces:**
- Consumes: `EVENTO` config values
- Produces: Google Calendar redirect, .ics file download

- [ ] **Step 1: Add calendar functions to main.js**

Google Calendar link + ICS blob download via temporary anchor element.

- [ ] **Step 2: Test calendar buttons**

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git commit -m "feat: Google Calendar link and .ics download functionality"
```

---

### Task 6: RSVP Form + Apps Script

**Files:**
- Modify: `src/main.js`
- Create: `apps-script-rsvp.gs`

**Interfaces:**
- Consumes: `EVENTO.rsvpEndpoint`, `INVITADO` global
- Produces: Form submission, success/error UI

- [ ] **Step 1: Add RSVP handler to main.js**

Form submit handler with fetch POST, success/error display.

- [ ] **Step 2: Create apps-script-rsvp.gs**

doPost (append row), doGet (return JSON), sheet columns.

- [ ] **Step 3: Commit**

```bash
git add src/main.js apps-script-rsvp.gs
git commit -m "feat: RSVP form handler and Google Apps Script code"
```

---

### Task 7: Generator Script

**Files:**
- Create: `scripts/generar-invitaciones.js`

**Interfaces:**
- Consumes: `invitados.csv`, `src/template.html`, `config.js`
- Produces: `invitacion/[slug].html` for each guest

- [ ] **Step 1: Create generar-invitaciones.js**

CSV parser, template replacement, relative path fixing, cupos options generator.

- [ ] **Step 2: Run the generator**

- [ ] **Step 3: Open generated file in browser**

- [ ] **Step 4: Commit**

```bash
git add scripts/generar-invitaciones.js invitacion/
git commit -m "feat: generator script produces personalized HTML per guest"
```

---

### Task 8: Admin Panel

**Files:**
- Create: `admin.html`

**Interfaces:**
- Consumes: Apps Script doGet() endpoint
- Produces: Filterable table with counters

- [ ] **Step 1: Create admin.html**

Password overlay, stats cards, search/filter, sortable table.

- [ ] **Step 2: Commit**

```bash
git add admin.html
git commit -m "feat: discreet admin panel with password, filters, and stats"
```

---

### Task 9: Vercel Config + README

**Files:**
- Create: `vercel.json`
- Create: `README.md`
- Create: `src/assets/images/og-preview.jpg`

**Interfaces:**
- Consumes: All previous tasks
- Produces: Deploy-ready configuration

- [ ] **Step 1: Create vercel.json**

- [ ] **Step 2: Create README.md**

- [ ] **Step 3: Create OG image placeholder**

- [ ] **Step 4: Commit**

```bash
git add vercel.json README.md src/assets/images/og-preview.jpg
git commit -m "feat: Vercel config, OG image placeholder, and README"
```

---

### Task 10: Integration Test

- [ ] **Step 1: Run generator and start server**
- [ ] **Step 2: Manual verification checklist**
- [ ] **Step 3: Final commit**
