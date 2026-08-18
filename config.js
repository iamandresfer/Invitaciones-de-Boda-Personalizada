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
  heroImage: "src/assets/images/hero.jpg",
  detailImage: "src/assets/images/detail.jpg",
  urlBase: "https://gloria-y-juan.vercel.app",
  rsvpEndpoint: "https://qtnfqejnmzikiobhmkmv.supabase.co/rest/v1/respuestas"
};

if (typeof module !== "undefined") module.exports = EVENTO;
