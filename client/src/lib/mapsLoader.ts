// client/src/lib/mapsLoader.ts
import { Loader } from "@googlemaps/js-api-loader";

let cachedKey: string | undefined;
let googlePromise: Promise<typeof google> | null = null;

export function setMapsKey(key: string) {
  cachedKey = key;
}

/** Loads Google Maps exactly once, with the libs you use (places + marker). */
export async function getGoogle(): Promise<typeof google> {
  // already on window?
  if (window.google?.maps) return window.google as any;

  if (!googlePromise) {
    const apiKey = cachedKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) throw new Error("Google Maps API key is missing");

    const loader = new Loader({
      apiKey,
      version: "weekly",
      libraries: ["places", "marker"],
      // Optional: preload a Map ID if you have one configured in Google Cloud
      // mapIds: import.meta.env.VITE_GOOGLE_MAP_ID ? [import.meta.env.VITE_GOOGLE_MAP_ID] : undefined,
    } as any);

    googlePromise = loader.load().then(() => window.google as any);
  }
  return googlePromise;
}
