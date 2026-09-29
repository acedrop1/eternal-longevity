/**
 * Which product the assessment suggests, from the answers. Pure: the wizard
 * shows it, the server re-derives it to check what was picked, and
 * scratchpad/recommend.check.cjs pins the rules.
 *
 * DRAFT for Dr. Elder's review. This only decides what is offered; the
 * physician makes the final decision. Reasons quote the patient's own answers
 * and make no clinical claims.
 */
import { PRODUCT_CATEGORY, type CategoryKey } from './intake-categories';

export interface Recommendation {
  /** null only when nothing in the category is live. */
  primary: string | null;
  /** "Also a good fit". */
  alternative?: string;
  /** One line under the alternative. */
  reason?: string;
  /** Set when the product they started from was replaced by the primary. */
  switchedFrom?: string;
}

const MALE_ONLY = new Set([
  'sildenafil',
  'sildenafil-tadalafil',
  'enclomiphene',
  'fin-min-capsule',
  'fin-min-foam',
  'min-12-fin',
  'fin-min-tret',
  'finasteride',
]);
const FEMALE_ONLY = new Set(['hrt-cream', 'spironolactone']);

/** 'm' / 'f' when a product is prescribed for one sex only. */
export function sexOnly(id: string): 'm' | 'f' | null {
  return MALE_ONLY.has(id) ? 'm' : FEMALE_ONLY.has(id) ? 'f' : null;
}

function suits(id: string, sex: unknown): boolean {
  const only = sexOnly(id);
  return !only || (sex !== 'm' && sex !== 'f') || only === sex;
}

/** The rule's pick: `why` explains the primary when it is offered next to another product. */
type Pick = { primary: string; why: string; alternative?: string; reason?: string };

function rulePick(category: CategoryKey, a: Record<string, unknown>): Pick {
  const has = (k: string, v: string) => (Array.isArray(a[k]) ? (a[k] as unknown[]).includes(v) : a[k] === v);
  switch (category) {
    case 'longevity': {
      const needle = a.lng_injection_comfort === 'yes' || a.lng_injection_comfort === 'help';
      const nad = needle ? 'nad-plus' : 'nad-nasal';
      const recovery = has('lng_goals', 'recovery')
        ? { alternative: 'glutathione', reason: 'You mentioned recovery after activity.' }
        : {};
      if (has('lng_goals', 'focus')) return { primary: 'methylene-blue', why: 'You mentioned focus and mental energy.', ...recovery };
      return {
        primary: nad,
        why: needle ? 'You said you are comfortable with a small injection.' : 'You said you would prefer no needle.',
        ...recovery,
      };
    }
    case 'sexual-health': {
      if (a.sex === 'f') return { primary: 'pt-141', why: 'An option for desire.' };
      if (a.sx_focus === 'desire') return { primary: 'pt-141', why: 'You said desire is what you would like help with.' };
      const weekly = a.sx_frequency === 'weekly' || a.sx_frequency === 'several_week';
      if (a.sx_focus === 'both') {
        return { primary: 'sildenafil', why: 'Taken as needed, for performance.', alternative: 'pt-141', reason: 'You mentioned desire as well.' };
      }
      return {
        primary: 'sildenafil',
        why: 'Taken as needed, for performance.',
        ...(weekly ? { alternative: 'sildenafil-tadalafil', reason: 'You expect to use it weekly or more: two medicines in one.' } : {}),
      };
    }
    case 'hormones':
      return a.sex === 'f'
        ? { primary: 'hrt-cream', why: 'For women in midlife.' }
        : { primary: 'enclomiphene', why: 'For men.' };
    case 'hair':
      if (a.sex === 'f') {
        return { primary: 'spironolactone', why: 'For women.', alternative: 'oral-minoxidil', reason: 'A low-dose daily tablet, if you would like another option.' };
      }
      if (a.hr_format === 'foam') return { primary: 'fin-min-foam', why: 'You said you would prefer a scalp foam.' };
      if (a.hr_format === 'pill') return { primary: 'fin-min-capsule', why: 'Finasteride and minoxidil together, in one daily capsule.' };
      return {
        primary: 'fin-min-capsule',
        why: 'Finasteride and minoxidil together, in one daily capsule.',
        alternative: 'fin-min-foam',
        reason: 'Prefer a scalp foam to a daily capsule?',
      };
    case 'skin': {
      const goal = Array.isArray(a.sk_goals) ? a.sk_goals[0] : undefined;
      if (goal === 'blemishes') return { primary: 'clear-skin-cream', why: 'You said blemishes are your main concern.' };
      if (goal === 'tone') {
        if (a.sk_sensitive === 'yes') return { primary: 'hq-free', why: 'You said your skin reacts easily.' };
        if (a.sk_severity === 'severe') return { primary: 'even-tone-cream', why: 'You described it as severe.' };
        return { primary: 'brightening', why: 'You said uneven tone is your main concern.' };
      }
      if (goal === 'texture') {
        return {
          primary: 'glow-cream',
          why: 'You said texture is your main concern.',
          alternative: 'tretinoin',
          reason: 'Tretinoin on its own, if you would like a simpler routine.',
        };
      }
      if (goal === 'redness') return { primary: 'clear-skin-capsules', why: 'You said redness is your main concern.' };
      return { primary: 'glow-cream', why: 'You said dryness is your main concern.' };
    }
  }
}

/**
 * The recommendation for this category and these answers, among live
 * products only. A requested product (?product=) stays the primary unless it
 * isn't live or isn't prescribed for their sex; the rule's pick is then
 * offered as "Also a good fit" when it differs.
 */
export function recommend(input: {
  category: CategoryKey;
  answers: Record<string, unknown>;
  requested?: string;
  live: ReadonlySet<string>;
}): Recommendation {
  const { category, answers, requested, live } = input;
  const fits = (id?: string): id is string => !!id && live.has(id) && suits(id, answers.sex);
  const pick = rulePick(category, answers);
  // Rule's pick not live: the first live, suitable product in the category.
  const rulePrimary = fits(pick.primary)
    ? pick.primary
    : Object.keys(PRODUCT_CATEGORY).find((id) => PRODUCT_CATEGORY[id] === category && fits(id)) ?? null;
  const ruleAlt = fits(pick.alternative) && pick.alternative !== rulePrimary ? pick.alternative : undefined;
  const ruleReason = rulePrimary === pick.primary ? pick.reason : undefined;

  if (requested && fits(requested)) {
    if (rulePrimary && rulePrimary !== requested) {
      return { primary: requested, alternative: rulePrimary, reason: rulePrimary === pick.primary ? pick.why : undefined };
    }
    return ruleAlt && ruleAlt !== requested ? { primary: requested, alternative: ruleAlt, reason: ruleReason } : { primary: requested };
  }
  return {
    primary: rulePrimary,
    ...(ruleAlt ? { alternative: ruleAlt, reason: ruleReason } : {}),
    ...(requested && rulePrimary ? { switchedFrom: requested } : {}),
  };
}
