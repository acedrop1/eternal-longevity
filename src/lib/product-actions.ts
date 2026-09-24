'use server';

/**
 * Admin → Products: save a product, upload its photo.
 *
 * Every change is admin-only, validated here (not trusted from the form),
 * written to the catalogue store (lib/catalog) and recorded in the audit
 * trail field by field. Going live is the compliance gate, so it also
 * requires the facts a product page must show: a photo, a price, side
 * effects and contraindications.
 */
import { revalidatePath } from 'next/cache';
import { promises as fs } from 'fs';
import path from 'path';
import { getSession } from './auth-server';
import { recordAudit } from './prescriber';
import { DELIVERY_LABEL, type DeliveryForm, type ShopCategory, type ShopProduct } from './shopProducts';
import { PRODUCT_STATUSES, catalogStore, getCatalogProduct, writeRow, type ProductStatus } from './catalog';
import { createSupabaseAdminClient } from './supabase/admin';

export interface ProductInput {
  id: string;
  isNew: boolean;
  status: ProductStatus;
  name: string;
  tagline: string;
  category: ShopCategory;
  delivery: DeliveryForm;
  cycleLength: string;
  shortDescription: string;
  longDescription: string;
  bestFor: string;
  benefits: string[];
  whatsIncluded: string[];
  sideEffects: string[];
  contraindications: string[];
  pricing: { monthly: number; quarterly: number; annual: number };
  image: string;
  popular: boolean;
  fdaApproved: boolean;
}

export interface ProductResult {
  ok: boolean;
  message: string;
  id?: string;
}

const CATEGORIES: ShopCategory[] = ['recovery', 'growth', 'metabolic', 'cognitive', 'sexual', 'longevity', 'immune', 'skin-hair'];
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function cleanList(xs: unknown, max = 12): string[] | null {
  if (!Array.isArray(xs)) return null;
  const out = xs.map((x) => String(x).trim()).filter(Boolean);
  if (out.length > max || out.some((x) => x.length > 240)) return null;
  return out;
}

const price = (n: unknown) => (Number.isInteger(n) && (n as number) > 0 && (n as number) <= 10000 ? (n as number) : null);

export async function saveProductAction(input: ProductInput): Promise<ProductResult> {
  const session = await getSession();
  if (!session || session.role !== 'admin') return { ok: false, message: 'Admin access is required.' };

  const id = String(input.id ?? '').trim().toLowerCase();
  if (!SLUG.test(id) || id.length > 40) {
    return { ok: false, message: 'The URL name uses lowercase letters, numbers and single dashes, e.g. "nad-plus".' };
  }
  const before = await getCatalogProduct(id);
  if (input.isNew && before) return { ok: false, message: `A product with the URL name "${id}" already exists.` };
  if (!input.isNew && !before) return { ok: false, message: 'That product no longer exists.' };

  if (!PRODUCT_STATUSES.includes(input.status)) return { ok: false, message: 'Pick a status.' };
  if (!CATEGORIES.includes(input.category)) return { ok: false, message: 'Pick a category.' };
  if (!(input.delivery in DELIVERY_LABEL)) return { ok: false, message: 'Pick a delivery form.' };

  const name = String(input.name ?? '').trim();
  if (!name || name.length > 60) return { ok: false, message: 'The name is required (60 characters max).' };

  const text = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
  const lists = {
    benefits: cleanList(input.benefits),
    whatsIncluded: cleanList(input.whatsIncluded),
    sideEffects: cleanList(input.sideEffects),
    contraindications: cleanList(input.contraindications),
  };
  if (Object.values(lists).some((l) => l === null)) {
    return { ok: false, message: 'Lists hold up to 12 lines of 240 characters each.' };
  }

  const pricing = {
    monthly: price(input.pricing?.monthly),
    quarterly: price(input.pricing?.quarterly),
    annual: price(input.pricing?.annual),
  };
  if (!pricing.monthly || !pricing.quarterly || !pricing.annual) {
    return { ok: false, message: 'Prices are whole dollars between $1 and $10,000.' };
  }

  const image = String(input.image ?? '').trim();
  if (image && !/^(\/(?!\/)|https:\/\/)/.test(image)) {
    return { ok: false, message: 'The photo must be an uploaded image or an https:// link.' };
  }

  // The gate: a live product must carry what its page and a certifier expect.
  if (input.status === 'live') {
    const missing = [
      !image && 'a photo',
      !text(input.shortDescription, 240) && 'a short description',
      !lists.sideEffects!.length && 'side effects',
      !lists.contraindications!.length && 'contraindications',
    ].filter(Boolean);
    if (missing.length) return { ok: false, message: `To go live, add ${missing.join(', ')}.` };
  }

  const data: Omit<ShopProduct, 'id'> = {
    name,
    tagline: text(input.tagline, 80),
    category: input.category,
    delivery: input.delivery,
    cycleLength: text(input.cycleLength, 40) || '12-week cycle',
    shortDescription: text(input.shortDescription, 240),
    longDescription: text(input.longDescription, 2000),
    bestFor: text(input.bestFor, 240),
    benefits: lists.benefits!,
    whatsIncluded: lists.whatsIncluded!,
    sideEffects: lists.sideEffects!,
    contraindications: lists.contraindications!,
    pricing: { monthly: pricing.monthly, quarterly: pricing.quarterly, annual: pricing.annual },
    image,
    // A photo set here is a product shot (shown full strength, no text over
    // it); an untouched photo keeps whatever treatment it had.
    shot: image && image !== before?.image ? true : before?.shot,
    swatch: before?.swatch ?? 'linear-gradient(180deg, #2a2a2a 0%, #000000 100%)',
    gallery: before?.gallery?.length ? [image, ...before.gallery.slice(1)] : [image],
    requiresReview: true,
    popular: Boolean(input.popular) || undefined,
    fdaApproved: Boolean(input.fdaApproved) || undefined,
  };

  try {
    await writeRow({
      id,
      status: input.status,
      data,
      updated_at: new Date().toISOString(),
      updated_by: session.name,
    });
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Could not save.' };
  }

  /*
   * One audit row per changed field. entity_id is a uuid column and product
   * ids are slugs, so the product goes in the field name instead.
   */
  const was = before;
  const join = (xs?: string[]) => (xs ?? []).join('\n');
  await recordAudit(
    (
      [
        ['Status', was ? was.status : null, input.status],
        ['Name', was?.name, data.name],
        ['Tagline', was?.tagline, data.tagline],
        ['Monthly price', was ? `$${was.pricing.monthly}` : null, `$${data.pricing.monthly}`],
        ['Quarterly price', was ? `$${was.pricing.quarterly}` : null, `$${data.pricing.quarterly}`],
        ['Annual price', was ? `$${was.pricing.annual}` : null, `$${data.pricing.annual}`],
        ['Photo', was?.image, data.image],
        ['Category', was?.category, data.category],
        ['Short description', was?.shortDescription, data.shortDescription],
        ['Description', was?.longDescription, data.longDescription],
        ['Side effects', join(was?.sideEffects), join(data.sideEffects)],
        ['Contraindications', join(was?.contraindications), join(data.contraindications)],
        ['What it does', join(was?.benefits), join(data.benefits)],
        ["What's included", join(was?.whatsIncluded), join(data.whatsIncluded)],
      ] as [string, string | null | undefined, string][]
    ).map(([field, oldValue, newValue]) => ({
      actorId: session.id,
      actorName: session.name,
      actorRole: 'admin',
      entity: 'product',
      entityId: null,
      field: `${id} · ${field}`,
      oldValue: oldValue ?? null,
      newValue: newValue || null,
    })),
  );

  // Every page that lists products reads the catalogue.
  revalidatePath('/', 'layout');
  return { ok: true, message: input.isNew ? 'Product created.' : 'Saved.', id };
}

const IMAGE_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Upload a product photo; returns the URL to store on the product. */
export async function uploadProductImageAction(form: FormData): Promise<ProductResult & { url?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'admin') return { ok: false, message: 'Admin access is required.' };

  const file = form.get('file');
  const id = String(form.get('id') ?? '').trim().toLowerCase();
  if (!(file instanceof File)) return { ok: false, message: 'Choose a photo.' };
  if (!SLUG.test(id)) return { ok: false, message: 'Set the URL name before uploading a photo.' };
  const ext = IMAGE_TYPES[file.type];
  if (!ext) return { ok: false, message: 'Use a JPG, PNG or WebP photo.' };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, message: 'Photos are 5 MB max.' };

  const name = `${id}-${Date.now()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const store = catalogStore();

  try {
    if (store === 'supabase') {
      const db = createSupabaseAdminClient();
      const { error } = await db.storage
        .from('product-images')
        .upload(name, bytes, { contentType: file.type, upsert: false });
      if (error) return { ok: false, message: error.message };
      const { data } = db.storage.from('product-images').getPublicUrl(name);
      return { ok: true, message: 'Uploaded.', url: data.publicUrl };
    }
    if (store === 'file') {
      // Local development only: served from /public like the other images.
      const dir = path.join(process.cwd(), 'public', 'uploads', 'products');
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, name), bytes);
      return { ok: true, message: 'Uploaded.', url: `/uploads/products/${name}` };
    }
    return { ok: false, message: 'Connect Supabase to upload photos.' };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Upload failed.' };
  }
}
