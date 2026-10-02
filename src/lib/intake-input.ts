/**
 * What the server accepts from the browser in an intake. Pure, so it can be
 * checked in isolation; intake-actions and assessment-drafts call it.
 */
import { isCategoryKey, type Step } from '@/lib/intakeSchema';
import { ALL_CATEGORY_STEPS, PRODUCT_CATEGORY } from '@/lib/intake-categories';

/**
 * Answers only the server writes. Any of these sent by the browser could mark
 * a product as assessed, skip a photo request, or claim uploads are done.
 */
export const SERVER_ANSWER_KEYS = [
  'visitProductIds',
  'assessedProductIds',
  'requestedProductId',
  'requestedProduct',
  'photosRequested',
  'mediaCompletedAt',
  'visitCompletedAt',
] as const;

const MEDIA_FIELD_IDS = ALL_CATEGORY_STEPS.flatMap((s) => s.fields)
  .filter((f) => f.type === 'photo-upload' || f.type === 'file-upload')
  .map((f) => f.id);

/**
 * An assessment's answers from the browser: server-owned keys removed, and
 * every photo / file answer removed (the assessment asks for none; uploads
 * come later, in the portal). Mutates and returns `answers`.
 */
export function assessmentInput(answers: Record<string, unknown>): Record<string, unknown> {
  for (const k of [...SERVER_ANSWER_KEYS, ...MEDIA_FIELD_IDS]) delete answers[k];
  return answers;
}

/**
 * A portal visit's answers from the browser: only the questions this visit
 * asks. Everything else — server keys, identity, consents, uploads for steps
 * not in this visit — is dropped. Upload paths are checked by visitProblem.
 */
export function visitInput(answers: Record<string, unknown>, steps: Step[]): Record<string, unknown> {
  const asked = new Set(steps.flatMap((s) => s.fields.map((f) => f.id)));
  return Object.fromEntries(Object.entries(answers).filter(([k]) => asked.has(k)));
}

/** A draft's entry point: a product we sell, a category, or 'general'. */
export function draftEntryValid(entry: unknown): entry is string {
  return (
    typeof entry === 'string' &&
    (entry === 'general' || isCategoryKey(entry) || Object.prototype.hasOwnProperty.call(PRODUCT_CATEGORY, entry))
  );
}
