// PATH: client/src/lib/mapsLoader.ts
export function loadGoogleMaps() {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!key) {
    console.warn("VITE_GOOGLE_MAPS_API_KEY missing; map will not load");
    return;
  }
  if (document.getElementById("gmaps-js")) return;

  const s = document.createElement("script");
  s.id = "gmaps-js";
  s.async = true;
  s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
    key
  )}&libraries=places`;
  document.head.appendChild(s);
}
