# Proxima Nova font files go here

The site is configured to use Proxima Nova as the primary type system. Until you have the licensed font files, the site falls back to **Mulish** (a free, near-identical geometric sans loaded from Google Fonts).

## To switch to real Proxima Nova

1. Get the license from Adobe Fonts (Typekit) or Fonts.com — Proxima Nova is owned by Mark Simonson and is a commercial font.
2. Drop the .woff2 files into this folder using these exact filenames so the @font-face rules in `src/app/globals.css` pick them up automatically:

```
ProximaNova-Light.woff2        (300)
ProximaNova-Regular.woff2      (400)
ProximaNova-Semibold.woff2     (600)
ProximaNova-Bold.woff2         (700)
ProximaNova-Extrabold.woff2    (800)
```

3. Reload — that's it. The CSS variable `--font-proxima` will resolve to the local files and override the Mulish fallback.

## Why we're not loading from Adobe Fonts CDN

Adobe Fonts requires a kit ID and a `<link>` to their CDN. Once we have your Adobe Fonts kit ID, we can switch from the local-files approach to the CDN approach in `src/app/layout.tsx`. Either approach works — local files are slightly faster and don't depend on Adobe's CDN being reachable.

## Why Mulish as the fallback

Mulish (formerly Muli) is the closest free-licensed match to Proxima Nova — same geometric construction, similar x-height, near-identical proportions. The site will look very close to its final state during development.
