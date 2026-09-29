/**
 * Plain-language "how it helps" line under the product name on the product
 * page (Hims-style). What it is, how it supports, how you take it. Modest
 * "supports" wording only: no condition names, no promises, no brand names.
 * Kept out of shopProducts so the product page doesn't pull the whole
 * catalogue into the browser bundle.
 * Products without an entry fall back to their shortDescription.
 */
export const EXPLAINER: Record<string, string> = {
  'nad-plus':
    'NAD+ is a molecule every cell uses to turn food into energy, and levels naturally fall with age. A small injection under the skin supports healthy energy levels and healthy ageing.',
  glutathione:
    "Glutathione is your body's main antioxidant, a small peptide that supports cells through everyday stress. You take it as a quick injection under the skin.",
  'pt-141':
    'PT-141 is a peptide that supports healthy desire by acting in the brain rather than on blood flow, for men and women. You use it as needed, with a small injection ahead of time.',
  'nad-nasal':
    'The same NAD+ as our injection in a nasal spray, supporting healthy energy levels and healthy ageing with no needles. Your physician sets how often you use it.',
  'mic-b12':
    'Vitamin B12 plus methionine, inositol and choline, nutrients that support healthy energy levels and nerve function. You take it as one quick injection.',
  'methylene-blue':
    'A low-dose capsule, studied for how it supports energy production in brain cells. Prescribed off-label to support healthy focus, taken once a day.',
  'sildenafil-tadalafil':
    'Two medicines that support sexual performance in one troche that dissolves under the tongue: sildenafil works quickly and tadalafil lasts longer. Taken as needed, and both work with arousal, not on their own.',
  sildenafil:
    "Sildenafil supports sexual performance by supporting healthy blood flow when you're aroused. Take it as needed, about an hour before sex.",
  oxytocin:
    'Oxytocin is the hormone your body releases with touch and closeness. This dissolving tablet is prescribed off-label to support intimacy and connection.',
  enclomiphene:
    'For men, enclomiphene supports healthy testosterone levels by signalling the body to make more of its own rather than replacing it. One capsule a day, with lab checks along the way.',
  'hrt-cream':
    'Estradiol and progesterone in one cream you apply to the skin, to support hormonal balance for women in midlife. Your physician sets and monitors the dose.',
  'fin-min-capsule':
    'One daily capsule for men with finasteride, which lowers DHT, and minoxidil, which supports healthy hair growth. Together they support a fuller-looking head of hair with consistent daily use.',
  'fin-min-foam':
    "The same two ingredients in a scalp foam, for men who'd rather skip a pill. Finasteride lowers DHT at the follicle and minoxidil supports healthy hair growth.",
  'min-12-fin':
    "A stronger scalp foam for men: 12% minoxidil, more than the 5% sold in stores, plus finasteride. Often prescribed when standard minoxidil isn't enough, to support fuller-looking hair.",
  'fin-min-tret':
    'Finasteride and minoxidil in a scalp foam for men, with a little tretinoin that may help your scalp absorb the minoxidil. Used daily to support a fuller-looking head of hair.',
  finasteride:
    'A once-daily tablet for men that lowers DHT, a hormone that affects hair follicles over time. It supports a fuller-looking head of hair with consistent daily use.',
  'oral-minoxidil':
    'A low-dose tablet form of minoxidil, the ingredient in our scalp foams, prescribed off-label for men and women. Taken once a day, it supports thicker, fuller-looking hair.',
  spironolactone:
    'For women, spironolactone balances androgens, hormones that affect hair and skin. One capsule a day, prescribed off-label to support fuller-looking hair and clear-looking skin.',
  tretinoin:
    'A prescription retinoid that supports healthy skin renewal. Used at night, it supports smoother texture and a more even-looking tone over time.',
  'glow-cream':
    'Tretinoin, hyaluronic acid and vitamin C in one night cream. Tretinoin supports skin renewal, hyaluronic acid hydrates and vitamin C brightens, for smoother, more even-looking skin.',
  'clear-skin-cream':
    'Tretinoin, which helps keep pores clear, and clindamycin, a topical antibiotic, in one cream that supports a clear complexion. Use it once a day across the whole area.',
  brightening:
    'Hydroquinone 4% with vitamin C, to support a brighter, more even-looking complexion. Hydroquinone slows pigment where you apply it, and vitamin C adds brightness.',
  'even-tone-cream':
    'A stronger formula for an even-looking tone: hydroquinone 8% for pigment, tretinoin for skin renewal and a mild steroid to keep skin comfortable. Used in short courses under your physician.',
  'hq-free':
    'Kojic acid, vitamin C and hyaluronic acid, to support a brighter, more even-looking tone without hydroquinone. A gentle option for sensitive skin or between hydroquinone courses.',
  'clear-skin-capsules':
    'Doxycycline 50 mg, a daily capsule that supports a clear, calm-looking complexion. Prescribed off-label at a low dose.',
};
