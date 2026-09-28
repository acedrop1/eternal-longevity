/**
 * Single source of truth for the intake wizard.
 *
 * Steps are configured as data; the wizard component reads this schema to
 * render inputs, validate answers, and decide which step comes next.
 *
 * DESIGN PRINCIPLE: as few steps as possible, pills over typing wherever
 * possible. Anything not strictly needed for routing or the safety screen is
 * deferred to the member portal after the order is placed.
 */

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
  | 'optional-upload';

export type Option = { value: string; label: string; hint?: string };

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
};

const YES_NO: Option[] = [
  { value: 'no', label: 'No' },
  { value: 'yes', label: 'Yes' },
];

export const STEPS: Step[] = [
  // -------------------------------------------------------------
  // 0. STATE — first, so nobody outside the service area fills anything in.
  // Any state we do not serve is a knockout (see KNOCKOUT_MESSAGES.out_of_state).
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
  // 1. ABOUT YOU — name, DOB, phone, ZIP, sex. Nothing else belongs here.
  // -------------------------------------------------------------
  {
    id: 'about',
    eyebrow: '01 / ABOUT YOU',
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
        label: 'Date of birth',
        required: true,
        // Age is computed from the date; under 18 fires the knockout.
        knockoutOn: { values: ['under18'], key: 'under18' },
      },
      {
        id: 'phone',
        type: 'text-short',
        half: true,
        label: 'Mobile number',
        placeholder: '(201) 555-0100',
        required: true,
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
  // 3. EMAIL CAPTURE
  // -------------------------------------------------------------
  {
    id: 'email-capture',
    eyebrow: '02 / STAY IN TOUCH',
    heading: 'Where should we reach you?',
    body: "If you don't finish today, we'll save your progress.",
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
export function productScreeningStep(product: {
  name: string;
  contraindications: string[];
}): Step {
  return {
    id: 'product-screen',
    eyebrow: `SAFETY SCREEN · ${product.name.toUpperCase()}`,
    heading: `A few questions specific to ${product.name}.`,
    body: `These are the conditions that would make ${product.name} unsafe for you. Answer honestly — this is the screen that protects you.`,
    fields: [
      {
        id: 'product_contraindications',
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
      label: 'If yes — which, and what happened',
      placeholder: 'e.g. Penicillin — hives',
    },
  ],
};







/**
 * Assemble the intake for this visitor.
 *
 * The base wizard stays as-is; clinical depth is added around it. A visitor
 * who arrived from a product gets that product's own contraindication screen.
 * Order is deliberate: every medical question comes before checkout, so
 * nobody is charged and then disqualified.
 */
export type IntakeProduct = {
  id: string;
  name: string;
  contraindications: string[];
};

/**
 * Two-phase intake, matching the telehealth pattern underwriters expect:
 *
 *   PRE  — the short pre-checkout profile: goals, demographics, body,
 *          consents, account. Enough to open the account and place the order.
 *   VISIT — the clinical portion, completed inside the portal after checkout
 *          ("Complete your visit"). Nothing is prescribed until it's done.
 */
const VISIT_TOPLEVEL_IDS = new Set(['health']);

export function buildPreSteps(): Step[] {
  return STEPS.filter((s) => !VISIT_TOPLEVEL_IDS.has(s.id));
}

export function buildVisitSteps(product?: IntakeProduct): Step[] {
  const out: Step[] = STEPS.filter((s) => VISIT_TOPLEVEL_IDS.has(s.id));
  // Safety knockouts → history → meds → the product's own contraindications.
  // Symptoms, prior-treatment and "any questions" were cut: none changed a
  // decision, and the member can message the prescriber from the portal.
  out.push(CONDITIONS_STEP, MEDS_STEP);
  if (product?.contraindications?.length) out.push(productScreeningStep(product));
  return out;
}
