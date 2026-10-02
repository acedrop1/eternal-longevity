/**
 * Single source of truth for the intake wizard.
 *
 * Steps are configured as data; the wizard component reads this schema to
 * render inputs, validate answers, and decide which step comes next.
 *
 * DESIGN PRINCIPLE: one question per screen, pills over typing wherever
 * possible. Every question the prescriber needs is asked before checkout
 * (buildAssessmentSteps); only photos and lab files are left for the portal.
 */
import {
  CATEGORY_KNOCKOUTS,
  CATEGORY_LABEL,
  PRODUCT_CATEGORY,
  buildCategorySteps,
  categorySteps,
  type CategoryKey,
} from './intake-categories';
import { recommend, type Recommendation } from './recommend';

/**
 * States we can actually ship to — the single source of truth for the
 * geofence, the checkout dropdown, and the compliance page.
 *
 * Two things gate a state: a prescriber licensed there (medicine is practiced
 * where the patient is) and a pharmacy licensed to dispense there. Both must
 * be true: Dr. Elder must be licensed there, and the partner pharmacy must
 * hold a (non-resident) licence for it. Add or remove a state
 * here and every consumer follows: the first intake question, the server
 * intake + order geofences, checkout, saved addresses, and every piece of
 * site copy (SERVICE_AREA* in lib/site are derived from this list).
 */
export const SERVICEABLE_STATES = ['NJ', 'NY', 'PA', 'MI'];

/** Full names, for the state question, the checkout dropdown and prose. */
export const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan',
  MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana',
  NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota',
  OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia',
  WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

/** 'New Jersey, New York, Pennsylvania and Michigan' (conj = 'and' | 'or'). */
export function serviceAreaProse(conj: 'and' | 'or'): string {
  const names = SERVICEABLE_STATES.map((s) => STATE_NAMES[s] ?? s);
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} ${conj} ${names.at(-1)}`;
}

/** All US state abbreviations. Billing addresses only — never shipping. */
export const STATES_AVAILABLE = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

export type FieldType =
  | 'date'
  | 'multi-select'
  | 'single-select'
  | 'pill-grid'
  | 'text-short'
  | 'text-long'
  | 'number'
  | 'slider'
  /** One slider in total inches; stores height_ft + height_in (see IntakeWizard). */
  | 'height'
  /** Native <select>; used for the state question. */
  | 'select'
  | 'email'
  | 'password'
  | 'consent-stack'
  | 'account-creation'
  | 'id-upload'
  | 'optional-upload'
  /** Guided photos (one per slot), taken or chosen on the device; stored privately for the prescriber. */
  | 'photo-upload'
  /** Documents such as lab results (PDF or image), optional unless required. */
  | 'file-upload'
  /** The recommended product and plan: { productId, cadence }. */
  | 'recommendation';

export type Option = { value: string; label: string; hint?: string; image?: string };

/** Shown when the answer `field` holds one of `values` (any answer in the assessment). */
export type Cond = { field: string; values: string[] };

export type Field = {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  options?: Option[];
  required?: boolean;
  /** Render at half width so two short fields share a row on a phone. */
  half?: boolean;
  min?: number;
  max?: number;
  /** For knockout: if the user picks one of these values, fire the named knockout */
  knockoutOn?: { values: string[]; key: string };
  /** Not a stop: these answers are highlighted for the prescriber as "Review". */
  flagOn?: string[];
  /** Only show (and only require) this field when every condition holds. */
  showIf?: Cond | Cond[];
  /** photo-upload: the shots to take, in order. `required` slots must be filled to continue. */
  slots?: { id: string; label: string; hint: string; required?: boolean }[];
  /** file-upload: accepted types, e.g. 'application/pdf,image/*'. */
  accept?: string;
};

export type Step = {
  id: string;
  /** What the user sees as the section eyebrow */
  eyebrow: string;
  /** Big question/heading */
  heading: string;
  /** Optional support copy */
  body?: string;
  /** Carrier-required SMS disclosure, rendered under the phone field. */
  smsDisclaimer?: string;
  /** Optional list of read-only acknowledgement statements shown above the
   *  fields. Used on the consents step for the legal disclaimer block. */
  disclaimers?: string[];
  /** Fields rendered on this step */
  fields: Field[];
  /** Optional: this step counts as the "email capture" pivot point */
  isEmailCapture?: boolean;
  /** Skip the step (and clear its answers) unless every condition holds. */
  showIf?: Cond | Cond[];
  /** ...and unless at least one of these holds. */
  showIfAny?: Cond[];
  /** A calm screen with no questions. */
  kind?: 'interstitial';
};

const YES_NO: Option[] = [
  { value: 'no', label: 'No' },
  { value: 'yes', label: 'Yes' },
];

export const STEPS: Step[] = [
  // -------------------------------------------------------------
  // EMAIL CAPTURE: after the category questions, so progress can be saved and
  // an existing account is caught before the personal details (IntakeWizard).
  // -------------------------------------------------------------
  {
    id: 'email-capture',
    eyebrow: '01 / STAY IN TOUCH',
    heading: 'Where should we reach you?',
    body: 'So we can save your progress.',
    isEmailCapture: true,
    fields: [
      {
        id: 'email',
        type: 'email',
        label: 'Email',
        placeholder: 'you@example.com',
        required: true,
      },
    ],
  },

  // -------------------------------------------------------------
  // STATE: first of the eligibility questions. Any state we do not serve is a
  // knockout (see KNOCKOUT_MESSAGES.out_of_state).
  // -------------------------------------------------------------
  {
    id: 'state',
    eyebrow: 'YOUR STATE',
    heading: 'Which state do you live in?',
    body: 'Our physician can only treat you in a state where he is licensed.',
    fields: [
      {
        id: 'state',
        type: 'select',
        label: 'State',
        placeholder: 'Choose your state',
        required: true,
        options: Object.entries(STATE_NAMES)
          .sort(([, a], [, b]) => a.localeCompare(b))
          .map(([value, label]) => ({ value, label })),
        knockoutOn: {
          values: Object.keys(STATE_NAMES).filter((s) => !SERVICEABLE_STATES.includes(s)),
          key: 'out_of_state',
        },
      },
    ],
  },

  // -------------------------------------------------------------
  // 2. ABOUT YOU — name, DOB, phone, ZIP, sex. Nothing else belongs here.
  // -------------------------------------------------------------
  {
    id: 'about',
    eyebrow: '02 / ABOUT YOU',
    heading: 'A few quick facts.',
    body: 'The prescriber uses this in his review.',
    smsDisclaimer:
      'By entering your phone number and continuing, you agree that Eternal Longevity may call or text you about your care and account: verifying your number, questions from your prescriber, order and shipping updates, and account security. These are not marketing messages. Marketing texts are sent only if you tick the separate, optional box later. Message and data rates may apply. Message frequency varies. Reply HELP for help or STOP to opt out.',
    fields: [
      {
        id: 'first_name',
        type: 'text-short',
        half: true,
        label: 'First name',
        placeholder: 'First name',
        required: true,
      },
      {
        id: 'last_name',
        type: 'text-short',
        half: true,
        label: 'Last name',
        placeholder: 'Last name',
        required: true,
      },
      {
        id: 'dob',
        type: 'date',
        half: true,
        label: 'Date of birth',
        required: true,
        // Age is computed from the date; under 18 fires the knockout.
        knockoutOn: { values: ['under18'], key: 'under18' },
      },
      {
        id: 'zip',
        type: 'text-short',
        half: true,
        label: 'ZIP code',
        placeholder: '07512',
        required: true,
      },
      {
        id: 'phone',
        type: 'text-short',
        label: 'Mobile number',
        placeholder: '(201) 555-0100',
        required: true,
      },
      {
        id: 'sex',
        type: 'pill-grid',
        label: 'Sex assigned at birth',
        required: true,
        options: [
          { value: 'm', label: 'Male' },
          { value: 'f', label: 'Female' },
          { value: 'intersex', label: 'Intersex' },
        ],
      },
    ],
  },

  // -------------------------------------------------------------
  // 4. BODY (pill ranges. Exact values confirmed in portal)
  // -------------------------------------------------------------
  {
    id: 'body',
    eyebrow: '03 / BODY SNAPSHOT',
    heading: 'Enter your height and weight.',
    body: 'The doctor uses this for dosing — exact numbers, not ranges.',
    fields: [
      {
        // Slider over total inches (4'0" to 7'6"). The answer is still stored
        // as height_ft + height_in, which is what the prescriber's review reads.
        id: 'height',
        type: 'height',
        label: 'Height',
        required: true,
        min: 48,
        max: 90,
      },
      {
        id: 'weight_lb',
        type: 'number',
        label: 'Weight (lbs)',
        placeholder: '180',
        required: true,
        min: 60,
        max: 700,
      },
    ],
  },

  // -------------------------------------------------------------
  // 6. HEALTH SCREEN (knockouts + flags + meds/allergies, one step)
  // -------------------------------------------------------------
  {
    id: 'health',
    eyebrow: '04 / HEALTH SCREEN',
    heading: 'A few important screening questions.',
    body: 'Honest answers protect you. The prescriber uses them to decide what is safe for you.',
    fields: [
      {
        id: 'cancer',
        type: 'pill-grid',
        label: 'Active cancer or treatment in the last 5 years?',
        required: true,
        options: YES_NO,
        knockoutOn: { values: ['yes'], key: 'cancer' },
      },
      {
        id: 'pregnant',
        type: 'pill-grid',
        label: 'Currently pregnant or breastfeeding?',
        required: true,
        options: [
          { value: 'no', label: 'No' },
          { value: 'yes', label: 'Yes' },
          { value: 'na', label: 'N/A' },
        ],
        knockoutOn: { values: ['yes'], key: 'pregnant' },
        // Not asked of men. Cond has no "not", so list everything else, including
        // no answer at all ('undefined'): the portal visit carries no sex, and
        // there it must still be asked.
        showIf: { field: 'sex', values: ['f', 'intersex', 'undefined', 'null', ''] },
      },
      {
        id: 'organ',
        type: 'pill-grid',
        label: 'End-stage kidney or liver disease?',
        required: true,
        options: YES_NO,
        knockoutOn: { values: ['yes'], key: 'organ' },
      },
    ],
  },


  // -------------------------------------------------------------
  // 7. CONSENTS. Disclaimer list + master ack + optional SMS/research
  // (Pattern adapted from competitor intake. Read, then confirm.)
  // -------------------------------------------------------------
  {
    id: 'consents',
    eyebrow: '06 / CONSENTS',
    heading: 'By submitting this form, I acknowledge:',
    body: "Take a moment to review the statements below. You'll confirm with the single acknowledgement at the bottom.",
    disclaimers: [
      'All information provided is accurate and complete to the best of my knowledge.',
      'I consent to have my information reviewed by the prescribing physician, who will decide whether to prescribe. He may decline or ask me for more information.',
      'I understand this is asynchronous telehealth, without a physical exam, and that it is not for emergencies. In an emergency I will call 911.',
      'I understand that compounded medications are not FDA-approved, that results vary, and that treatment carries risks, including side effects.',
      'I understand that I may be contacted for follow-up or clarification about my care or my order.',
      'I understand that no payment is taken when I submit this form. At checkout I save a card, which is charged only if the prescriber approves.',
      'I understand that submitting this form does not guarantee a prescription, and product availability may vary.',
      'I understand that my information will be handled in accordance with the Eternal Longevity Privacy Policy.',
      'I understand that my information will be handled in accordance with the Eternal Longevity Terms of Service.',
    ],
    fields: [
      {
        id: 'consents',
        type: 'consent-stack',
        label: '',
        required: true,
      },
    ],
  },

  // -------------------------------------------------------------
  // 8. ACCOUNT CREATION (gates the portal + checkout)
  // -------------------------------------------------------------
  {
    id: 'account',
    eyebrow: '07 / CREATE ACCOUNT',
    heading: 'Last step. Set up your portal.',
    body: 'Your account is how you track your order, message your care team, and check out securely. Your shipping address is collected at checkout.',
    fields: [
      {
        id: 'account',
        type: 'account-creation',
        label: '',
        required: true,
      },
    ],
  },
];

/** Password policy — shared by the field UI, wizard validation and server. */
export const PASSWORD_RULES: { id: string; label: string; test: (p: string) => boolean }[] = [
  { id: 'len', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { id: 'upper', label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { id: 'special', label: 'One special character (!@#$…)', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export function passwordValid(p: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(p));
}

export const KNOCKOUT_MESSAGES: Record<string, { title: string; body: string }> = {
  ...CATEGORY_KNOCKOUTS,
  out_of_state: {
    title: "We're not in your state yet",
    body: 'Our physician is licensed only in the states below for now. We hope to add more.',
  },
  under18: {
    title: 'You must be 18 or older',
    body: 'Our care is for adults only. Please speak with your own doctor about your health goals.',
  },
  cancer: {
    title: "We can't treat you online right now",
    body: 'With a recent cancer diagnosis or treatment, the treatments we offer need in-person oversight. Please speak with your oncologist or your own doctor.',
  },
  pregnant: {
    title: "We can't treat you online right now",
    body: 'The treatments we offer are not recommended during pregnancy or breastfeeding. Please speak with your own doctor. You are welcome to come back later.',
  },
  organ: {
    title: "We can't treat you online right now",
    body: 'Advanced kidney or liver disease needs care from a specialist who can monitor you in person. Please speak with your own doctor.',
  },
};

export const CONSENT_VERSION = '2026-09';

export const CONSENT_ITEMS = [
  {
    id: 'master_ack',
    required: true,
    label:
      'I have read and agree to the Telehealth Informed Consent (etlongevity.com/legal/consent) and the statements above, and I consent to receive care through telehealth.',
  },
  {
    id: 'sms',
    required: false,
    label:
      'Optional: I agree to receive recurring marketing text messages from Eternal Longevity at the number provided, which may be sent using automated technology. Consent is not a condition of purchase. Message frequency varies. Message and data rates may apply. Reply HELP for help or STOP to cancel.',
  },
  {
    id: 'research',
    required: false,
    label:
      'I consent to the use of my de-identified information for internal research, analytics, and product improvement purposes.',
  },
];

/* -------------------------------------------------------------------------- */
/*  Product-specific screening                                                */
/* -------------------------------------------------------------------------- */

/**
 * Build a screening step for the product the visitor started from.
 *
 * Each product carries its own contraindications, so the questions asked are
 * the ones that actually matter for that compound rather than a generic
 * catch-all — PT-141
 * asks about blood pressure. Answering "yes" is a knockout: the order stops
 * before it reaches the prescriber.
 */
export function productScreeningStep(
  product: {
    name: string;
    contraindications: string[];
  },
  /** Set for every screened product after the first, so each keeps its own answer. */
  suffix?: string,
): Step {
  return {
    id: suffix ? `product-screen-${suffix}` : 'product-screen',
    eyebrow: `SAFETY SCREEN · ${product.name.toUpperCase()}`,
    heading: `A few questions specific to ${product.name}.`,
    body: `These are the conditions that would make ${product.name} unsafe for you. Answer honestly — this is the screen that protects you.`,
    fields: [
      {
        id: suffix ? `${PRODUCT_SCREEN_FIELD}__${suffix}` : PRODUCT_SCREEN_FIELD,
        type: 'single-select',
        label: `Do any of the following apply to you?\n\n${product.contraindications
          .map((c) => `• ${c}`)
          .join('\n')}`,
        options: [
          { value: 'none', label: 'None of these apply' },
          { value: 'some', label: 'One or more applies' },
        ],
        required: true,
        knockoutOn: { values: ['some'], key: 'product_contraindication' },
      },
    ],
  };
}

/** Answer key of the first product's screen; later products add `__<productId>`. */
export const PRODUCT_SCREEN_FIELD = 'product_contraindications';

/** Knockout shown when a product-specific contraindication is reported. */
export const PRODUCT_KNOCKOUT = {
  title: "This product isn't a fit right now",
  body: 'Based on what you told us, this product may not be safe for you. Please talk to your own doctor. You are welcome to look at our other treatments.',
};

/* -------------------------------------------------------------------------- */
/*  Extended clinical questions                                               */
/* -------------------------------------------------------------------------- */

/**
 * Conditions screen. Mirrors the condition list a prescriber needs before
 * approving a compounded peptide. Reporting one is NOT a disqualifier — it
 * routes to the prescriber with context, which is why the helper text says so
 * explicitly.
 */
export const CONDITIONS_STEP: Step = {
  id: 'conditions',
  eyebrow: 'MEDICAL HISTORY',
  heading: 'Ever been diagnosed with any of these?',
  body: 'Ticking one does not disqualify you. It tells the prescriber what to weigh.',
  fields: [
    {
      id: 'conditions',
      type: 'multi-select',
      label: '',
      required: true,
      // The previous list was a GLP-1 screen — gallstones, NAFLD, SIADH — for
      // products no longer in the catalogue. These are the ones that actually
      // change a decision on a growth-axis, repair or immune peptide.
      options: [
        { value: 'cardio', label: 'Heart disease, heart attack, or stroke' },
        { value: 't1d', label: 'Type 1 diabetes' },
        { value: 'autoimmune', label: 'Autoimmune condition' },
        { value: 'endocrine', label: 'Thyroid or pituitary disorder' },
        { value: 'kidney_liver', label: 'Chronic kidney or liver disease' },
        { value: 'surgery', label: 'Major surgery in the last 12 months' },
        { value: 'none', label: 'None of these' },
      ],
    },
  ],
};


/** Medications and allergies, asked separately rather than as free text. */
export const MEDS_STEP: Step = {
  id: 'medications',
  eyebrow: 'MEDICATIONS & ALLERGIES',
  heading: 'What do you currently take?',
  body: 'Prescriptions, over-the-counter, supplements. Interactions matter.',
  fields: [
    {
      id: 'medications',
      type: 'text-long',
      label: 'Medications, herbals and supplements — with dose',
      placeholder: 'e.g. Lisinopril 10mg daily — blood pressure',
    },
    {
      id: 'allergies_any',
      type: 'pill-grid',
      label: 'Any drug allergies?',
      required: true,
      options: YES_NO,
    },
    {
      id: 'allergies_detail',
      type: 'text-long',
      label: 'Which, and what happened?',
      placeholder: 'e.g. Penicillin — hives',
      showIf: { field: 'allergies_any', values: ['yes'] },
    },
  ],
};







export type IntakeProduct = {
  id: string;
  name: string;
  contraindications: string[];
};

/* -------------------------------------------------------------------------- */
/*  The assessment (pre-checkout, Hims-style)                                 */
/* -------------------------------------------------------------------------- */

/** "What would you like help with?": only when /start has no ?product= or ?category=. */
export const GOAL_STEP: Step = {
  id: 'goal',
  eyebrow: 'YOUR GOAL',
  heading: 'What would you like help with?',
  fields: [
    {
      id: 'goal_category',
      type: 'single-select',
      label: '',
      required: true,
      options: [
        { value: 'longevity', label: CATEGORY_LABEL.longevity, hint: 'Energy and healthy ageing', image: '/brand/cat-longevity.jpg' },
        { value: 'sexual-health', label: CATEGORY_LABEL['sexual-health'], hint: 'Performance and desire', image: '/brand/cat-sexual.jpg' },
        { value: 'hormones', label: CATEGORY_LABEL.hormones, hint: 'For men and for women in midlife', image: '/brand/cat-hormones.jpg' },
        { value: 'hair', label: CATEGORY_LABEL.hair, hint: 'Thinning and hair loss', image: '/brand/cat-hair.jpg' },
        { value: 'skin', label: CATEGORY_LABEL.skin, hint: 'Blemishes, tone and texture', image: '/brand/cat-skin.jpg' },
      ],
    },
  ],
};

const GOOD_NEWS: Step = {
  id: 'good-news',
  eyebrow: 'NEXT',
  heading: 'Good news. A licensed physician can review your answers.',
  body: 'Next, see what your physician may prescribe and choose a plan.',
  kind: 'interstitial',
  fields: [],
};

const ALMOST_DONE: Step = {
  id: 'almost-done',
  eyebrow: 'NEXT',
  heading: 'Almost done.',
  body: 'Create your account so your physician can review.',
  kind: 'interstitial',
  fields: [],
};

/** Answer id of the recommendation screen: { productId, cadence }. */
export const PLAN_FIELD = 'plan_choice';

export const RECOMMEND_STEP: Step = {
  id: 'recommendation',
  eyebrow: 'YOUR TREATMENT',
  heading: 'Based on your answers, your physician may prescribe',
  fields: [{ id: PLAN_FIELD, type: 'recommendation', label: '', required: true }],
};

/** What /start knows before the first question. */
export interface AssessmentContext {
  /** ?product=: the product they started from. */
  productId?: string;
  /** ?category=: the category they started from. */
  category?: CategoryKey;
  /** Signed in: no email or password, and nothing already on file. */
  member?: boolean;
  /** Answer ids already on file for this member; never asked again. */
  known?: string[];
  /** Live products that can be recommended, by id. */
  catalog: Record<string, { name: string; contraindications: string[] }>;
}

export const isCategoryKey = (v: unknown): v is CategoryKey =>
  typeof v === 'string' && Object.prototype.hasOwnProperty.call(CATEGORY_LABEL, v);

export function assessmentCategory(ctx: AssessmentContext, answers: Record<string, unknown>): CategoryKey | undefined {
  if (ctx.category) return ctx.category;
  if (ctx.productId) return PRODUCT_CATEGORY[ctx.productId];
  return isCategoryKey(answers.goal_category) ? answers.goal_category : undefined;
}

export function recommendationFor(ctx: AssessmentContext, answers: Record<string, unknown>): Recommendation | null {
  const category = assessmentCategory(ctx, answers);
  if (!category) return null;
  return recommend({ category, answers, requested: ctx.productId, live: new Set(Object.keys(ctx.catalog)) });
}

/** The product picked on the recommendation screen: the primary unless they switched to the alternative. */
export function chosenProduct(rec: Recommendation | null, answers: Record<string, unknown>): string | null {
  const id = (answers[PLAN_FIELD] as { productId?: unknown } | undefined)?.productId;
  return rec && typeof id === 'string' && id === rec.alternative ? id : rec?.primary ?? null;
}

const MEDIA_TYPES: FieldType[] = ['photo-upload', 'file-upload'];

/**
 * Every pre-checkout screen for this visitor, in order. Steps still carry
 * their showIf; the wizard and the server both skip the ones that don't hold.
 *
 *   goal (no product/category) → category questions (no photos) → email →
 *   state → about you → body → health → conditions → medications →
 *   safety screen for the recommended product → "Good news" →
 *   recommendation → safety screen for the alternative, if they switched →
 *   consents → "Almost done" → account
 *
 * Every answer is asked once: a field that appears again (sex) or is on file
 * (a member's `known`) is dropped from the later step.
 */
export function buildAssessmentSteps(ctx: AssessmentContext, answers: Record<string, unknown>): Step[] {
  const category = assessmentCategory(ctx, answers);
  const rec = recommendationFor(ctx, answers);
  const chosen = chosenProduct(rec, answers);
  const step = (id: string) => STEPS.find((st) => st.id === id)!;
  const screen = (id: string | null): Step[] => {
    const p = id ? ctx.catalog[id] : undefined;
    return p?.contraindications.length ? [productScreeningStep(p, id!)] : [];
  };
  const all: Step[] = [
    ...(ctx.category || ctx.productId ? [] : [GOAL_STEP]),
    // State first, Hims-style: someone we can't treat finds out before answering anything else.
    step('state'),
    ...(category ? categorySteps(category, ctx.productId ? [ctx.productId] : []) : []).map((st) => ({
      ...st,
      fields: st.fields.filter((f) => !MEDIA_TYPES.includes(f.type)),
    })),
    ...(ctx.member ? [] : [step('email-capture')]),
    step('about'),
    step('body'),
    step('health'),
    CONDITIONS_STEP,
    MEDS_STEP,
    ...screen(rec?.primary ?? null),
    GOOD_NEWS,
    RECOMMEND_STEP,
    ...(chosen !== rec?.primary ? screen(chosen) : []),
    step('consents'),
    ...(ctx.member ? [] : [ALMOST_DONE, step('account')]),
  ];
  const seen = new Set(ctx.known ?? []);
  const out: Step[] = [];
  for (const st of all) {
    const fields = st.fields.filter((f) => !seen.has(f.id));
    fields.forEach((f) => seen.add(f.id));
    if (fields.length || st.kind) out.push({ ...st, fields });
  }
  return out;
}

/**
 * The clinical visit completed in the portal. LEGACY: members who signed up
 * before the assessment moved ahead of checkout still have one open
 * ('awaiting_visit'); everyone else only has photos/labs left (MEDIA_STEPS).
 */
const VISIT_TOPLEVEL_IDS = new Set(['health']);

export function buildVisitSteps(products: IntakeProduct[] = []): Step[] {
  const out: Step[] = STEPS.filter((s) => VISIT_TOPLEVEL_IDS.has(s.id));
  out.push(CONDITIONS_STEP, MEDS_STEP, ...buildCategorySteps(products.map((p) => p.id)));
  products
    .filter((p, i) => p.contraindications?.length && products.findIndex((q) => q.id === p.id) === i)
    .forEach((p, i) => out.push(productScreeningStep(p, i === 0 ? undefined : p.id)));
  return out;
}
