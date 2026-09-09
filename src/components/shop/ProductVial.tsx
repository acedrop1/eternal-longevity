import type { ShopProduct } from '@/lib/shopProducts';
import { DELIVERY_LABEL } from '@/lib/shopProducts';

/**
 * The product, drawn.
 *
 * Every competitor in this category shows a labelled vial, because that is
 * what arrives in the box. We were showing a stock photograph with the product
 * name set over it, which reads as a mood board rather than a medication.
 *
 * Drawn rather than photographed so all nineteen SKUs stay identical in
 * lighting, crop and typography, a new SKU needs no asset, and the label stays
 * crisp at any size. The label carries the real dispensing detail — name,
 * strength, route, Rx-only — because that specificity is the whole effect.
 */

/** Strength lives inside the first whatsIncluded line, e.g. "(2 mg/mL, 5 mL vial)". */
function strengthOf(product: ShopProduct): { conc: string; fill: string } {
  const m = product.whatsIncluded[0]?.match(/\(([^)]+)\)/);
  const [conc, fill] = (m?.[1] ?? '').split(',').map((x) => x.trim());
  return { conc: conc ?? '', fill: fill ?? '5 mL vial' };
}

export function ProductVial({
  product,
  className = '',
}: {
  product: ShopProduct;
  className?: string;
}) {
  const { conc, fill } = strengthOf(product);
  const id = product.id;
  // Long names have to shrink or they run off the label.
  const nameSize = product.name.length > 15 ? 15 : product.name.length > 10 ? 19 : 24;

  return (
    <svg
      viewBox="0 0 320 400"
      className={className}
      role="img"
      aria-label={`${product.name} ${conc} vial`}
    >
      <defs>
        <linearGradient id={`glass-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.30" />
          <stop offset="18%" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="52%" stopColor="#ffffff" stopOpacity="0.03" />
          <stop offset="86%" stopColor="#ffffff" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.04" />
        </linearGradient>
        <linearGradient id={`crimp-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#8a8f96" />
          <stop offset="22%" stopColor="#e9edf1" />
          <stop offset="50%" stopColor="#b9bfc6" />
          <stop offset="78%" stopColor="#eef2f6" />
          <stop offset="100%" stopColor="#7f858c" />
        </linearGradient>
        <linearGradient id={`liquid-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.06" />
        </linearGradient>
      </defs>

      {/* shadow the vial sits in */}
      <ellipse cx="160" cy="366" rx="74" ry="9" fill="#000000" opacity="0.45" />

      {/* body */}
      <path
        d="M108 96 h104 a10 10 0 0 1 10 10 v232 a18 18 0 0 1 -18 18 h-88 a18 18 0 0 1 -18 -18 v-232 a10 10 0 0 1 10 -10 z"
        fill={`url(#glass-${id})`}
        stroke="#ffffff"
        strokeOpacity="0.22"
        strokeWidth="1.5"
      />
      {/* liquid */}
      <path
        d="M110 190 h100 v148 a16 16 0 0 1 -16 16 h-68 a16 16 0 0 1 -16 -16 z"
        fill={`url(#liquid-${id})`}
      />
      <line x1="110" y1="190" x2="210" y2="190" stroke="#ffffff" strokeOpacity="0.28" strokeWidth="1.5" />

      {/* neck + crimp cap */}
      <rect x="128" y="62" width="64" height="36" fill={`url(#glass-${id})`} stroke="#ffffff" strokeOpacity="0.2" strokeWidth="1.5" />
      <rect x="120" y="46" width="80" height="34" rx="4" fill={`url(#crimp-${id})`} />
      <rect x="132" y="30" width="56" height="20" rx="3" fill="#d5a850" />
      <rect x="132" y="30" width="56" height="7" rx="3" fill="#ffffff" opacity="0.25" />
      <line x1="120" y1="58" x2="200" y2="58" stroke="#000000" strokeOpacity="0.25" strokeWidth="1" />
      <line x1="120" y1="68" x2="200" y2="68" stroke="#000000" strokeOpacity="0.25" strokeWidth="1" />

      {/* label */}
      <rect x="100" y="152" width="120" height="150" rx="3" fill="#f5f1e8" />
      <rect x="100" y="152" width="120" height="5" fill="#d5a850" />

      <text x="110" y="176" fontSize="7.5" letterSpacing="1.6" fill="#8a8378" fontWeight="600">
        PRESCRIPTION
      </text>
      <line x1="110" y1="182" x2="210" y2="182" stroke="#d8d2c4" strokeWidth="1" />

      <text
        x="110"
        y={nameSize > 20 ? 208 : 204}
        fontSize={nameSize}
        fill="#14110c"
        fontWeight="700"
        letterSpacing="-0.4"
      >
        {product.name}
      </text>

      <text x="110" y={nameSize > 20 ? 224 : 220} fontSize="8.5" fill="#5c564c" letterSpacing="0.3">
        {conc}
      </text>
      <text x="110" y={nameSize > 20 ? 236 : 232} fontSize="8.5" fill="#5c564c" letterSpacing="0.3">
        {fill}
      </text>

      <line x1="110" y1="248" x2="210" y2="248" stroke="#d8d2c4" strokeWidth="1" />
      <text x="110" y="262" fontSize="8" fill="#14110c" fontWeight="600" letterSpacing="0.4">
        Rx only
      </text>
      <text x="110" y="274" fontSize="7.5" fill="#8a8378" letterSpacing="0.3">
        {DELIVERY_LABEL[product.delivery]}
      </text>
      <text x="110" y="286" fontSize="7.5" fill="#8a8378" letterSpacing="0.3">
        Dose as prescribed
      </text>

      <text x="210" y="296" fontSize="7" letterSpacing="1.4" fill="#a89f90" textAnchor="end" fontWeight="600">
        ETERNAL LONGEVITY
      </text>

      {/* highlight down the glass */}
      <rect x="118" y="104" width="7" height="240" rx="3.5" fill="#ffffff" opacity="0.16" />
    </svg>
  );
}
