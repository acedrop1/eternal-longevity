'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface AddressPick {
  line1: string;
  city: string;
  state: string;
  zip: string;
}

export interface Suggestion {
  id: string;
  text: string;
  /** Resolve to a full address. One network call, made only on selection. */
  resolve: () => Promise<AddressPick | null>;
}

/* Minimal shapes for the bits of the Places library we touch. */
interface PlacesLib {
  AutocompleteSuggestion: {
    fetchAutocompleteSuggestions(req: Record<string, unknown>): Promise<{
      suggestions: {
        placePrediction: {
          placeId: string;
          text: { toString(): string };
          toPlace(): {
            fetchFields(req: { fields: string[] }): Promise<unknown>;
            addressComponents?: {
              types: string[];
              longText: string;
              shortText: string;
            }[];
          };
        } | null;
      }[];
    }>;
  };
  AutocompleteSessionToken: new () => unknown;
}

declare global {
  interface Window {
    google?: {
      maps?: {
        importLibrary?: (name: string) => Promise<unknown>;
      };
    };
  }
}

const SCRIPT_ID = 'gmaps-places';
const CALLBACK = '__elMapsReady';

/**
 * Load the Maps JS API and hand back the Places library.
 *
 * Uses Google's own callback parameter rather than the script's load event.
 * `onload` fires when the bootstrap file arrives, which is before
 * `google.maps` is populated — so reading `importLibrary` there found
 * undefined and the whole thing failed silently as "library unavailable".
 */
function loadPlaces(apiKey: string): Promise<PlacesLib | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);

  const w = window as unknown as Record<string, unknown>;

  const grab = async (): Promise<PlacesLib | null> => {
    const maps = window.google?.maps as
      | (Record<string, unknown> & {
          importLibrary?: (n: string) => Promise<unknown>;
        })
      | undefined;
    if (!maps) return null;
    // Loaded with libraries=places, so it is usually already on the namespace.
    if (maps.places) return maps.places as PlacesLib;
    try {
      return ((await maps.importLibrary?.('places')) as PlacesLib) ?? null;
    } catch (err) {
      console.error('[places] importLibrary failed', err);
      return null;
    }
  };

  if (document.getElementById(SCRIPT_ID)) {
    // Already requested by an earlier mount — wait for the same callback.
    return new Promise((resolve) => {
      const done = () => void grab().then(resolve);
      if (window.google?.maps) done();
      else {
        const prev = w[CALLBACK] as (() => void) | undefined;
        w[CALLBACK] = () => {
          prev?.();
          done();
        };
      }
    });
  }

  return new Promise((resolve) => {
    w[CALLBACK] = () => void grab().then(resolve);

    const el = document.createElement('script');
    el.id = SCRIPT_ID;
    el.async = true;
    el.src =
      'https://maps.googleapis.com/maps/api/js' +
      `?key=${encodeURIComponent(apiKey)}` +
      '&libraries=places&v=weekly' +
      `&callback=${CALLBACK}`;
    el.onerror = () => {
      console.error('[places] script blocked or failed to load', el.src);
      resolve(null);
    };
    document.head.appendChild(el);

    // Google logs its own named errors (ApiNotActivatedMapError,
    // RefererNotAllowedMapError) and never calls back. Do not hang on it.
    window.setTimeout(() => resolve(null), 10_000);
  });
}

function pickFrom(
  components: { types: string[]; longText: string; shortText: string }[],
): AddressPick {
  const get = (type: string, short = false) => {
    const c = components.find((x) => x.types.includes(type));
    return c ? (short ? c.shortText : c.longText) : '';
  };
  const number = get('street_number');
  const route = get('route');
  return {
    line1: [number, route].filter(Boolean).join(' '),
    city:
      get('locality') ||
      get('sublocality_level_1') ||
      get('postal_town') ||
      get('administrative_area_level_3'),
    state: get('administrative_area_level_1', true),
    zip: get('postal_code'),
  };
}

/**
 * Street-address suggestions from Google Places.
 *
 * Uses the Autocomplete Data API and renders our own list rather than Google's
 * widget, because the widget cannot be made to match a black-and-gold checkout
 * and a checkout that looks borrowed is a checkout people abandon.
 *
 * Silent when no key is configured: the field stays an ordinary text input and
 * the ZIP still fills the city, so nothing regresses if the key is removed or
 * the script is blocked.
 */
export function usePlacesAutocomplete(apiKey: string | undefined) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const libRef = useRef<PlacesLib | null>(null);
  const apiKeyRef = useRef<string | undefined>(apiKey);
  apiKeyRef.current = apiKey;
  const tokenRef = useRef<unknown>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (!apiKey) return;
    let alive = true;
    void loadPlaces(apiKey).then((lib) => {
      if (!alive) return;
      libRef.current = lib;
      if (!lib) console.error('[places] library unavailable');
    });
    return () => {
      alive = false;
    };
  }, [apiKey]);

  const search = useCallback(
    async (input: string) => {
      const lib = libRef.current;
      if (!lib && apiKeyRef.current) {
        console.warn('[places] not ready yet — still loading, or failed above');
      }
      if (!lib || input.trim().length < 3) {
        setSuggestions([]);
        return;
      }
      // A session groups keystrokes with the one detail lookup that follows,
      // so a whole address costs one request rather than one per character.
      tokenRef.current ??= new lib.AutocompleteSessionToken();

      const mine = ++seq.current;
      try {
        const { suggestions: raw } =
          await lib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input,
            sessionToken: tokenRef.current,
            includedRegionCodes: ['us'],
          });
        if (mine !== seq.current) return; // a later keystroke already won

        setSuggestions(
          raw
            .map((s) => s.placePrediction)
            .filter((p): p is NonNullable<typeof p> => Boolean(p))
            .slice(0, 5)
            .map((p) => ({
              id: p.placeId,
              text: p.text.toString(),
              resolve: async () => {
                try {
                  const place = p.toPlace();
                  await place.fetchFields({ fields: ['addressComponents'] });
                  tokenRef.current = null; // session ends with the detail call
                  return place.addressComponents
                    ? pickFrom(place.addressComponents)
                    : null;
                } catch {
                  return null;
                }
              },
            })),
        );
      } catch (err) {
        console.error('[places] fetchAutocompleteSuggestions failed', err);
        setSuggestions([]);
      }
    },
    [],
  );

  const clear = useCallback(() => setSuggestions([]), []);

  return { suggestions, search, clear, enabled: Boolean(apiKey) };
}
