/**
 * Single source of truth for the intake wizard.
 *
 * Steps are configured as data; the wizard component reads this schema to
 * render inputs, validate answers, and decide which step comes next.
 *
 * DESIGN PRINCIPLE: as few steps as possible, pills over typing wherever
 * possible. Anything not strictly needed for routing or the safety screen is
 * deferred to the member portal after physician review.
 */

/** All US state abbreviations. Used for shipping address dropdowns. */
export const STATES_AVAILABLE = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

export type FieldType =
  | 'multi-select'
  | 'single-select'
  | 'pill-grid'
  | 'text-short'
  | 'text-long'
  | 'number'
  | 'slider'
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
  // 1. GOALS
  // -------------------------------------------------------------
  {
    id: 'goals',
    eyebrow: '01 / GOALS',
    heading: 'What are you focused on?',
    body: 'Pick everything that applies. Takes about a minute.',
    fields: [
      {
        id: 'goals',
        type: 'multi-select',
        label: '',
        required: true,
        options: [
          { value: 'recovery', label: 'Muscle growth & recovery' },
          { value: 'fat-loss', label: 'Fat loss / metabolic' },
          { value: 'energy', label: 'Energy & longevity' },
          { value: 'sleep', label: 'Sleep quality' },
          { value: 'sex', label: 'Sexual health / libido' },
          { value: 'cognition', label: 'Cognition & focus' },
          { value: 'joints', label: 'Joint & injury recovery' },
          { value: 'skin', label: 'Skin & aging' },
        ],
      },
    ],
  },

  // -------------------------------------------------------------
  // 2. ABOUT YOU (age + sex)
  // -------------------------------------------------------------
  {
    id: 'about',
    eyebrow: '02 / ABOUT YOU',
    heading: 'A few quick facts.',
    body: 'We use this to tailor your protocol options.',
    fields: [
      {
        id: 'age',
        type: 'pill-grid',
        label: 'Age range',
        required: true,
        options: [
          { value: 'under18', label: 'Under 18' },
          { value: '18-24', label: '18–24' },
          { value: '25-34', label: '25–34' },
          { value: '35-44', label: '35–44' },
          { value: '45-54', label: '45–54' },
          { value: '55-64', label: '55–64' },
          { value: '65+', label: '65+' },
        ],
        knockoutOn: { values: ['under18'], key: 'under18' },
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
    eyebrow: '03 / STAY IN TOUCH',
    heading: "We'll send your protocol here.",
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
  // 4. BODY (pill ranges. Physician confirms exact in portal)
  // -------------------------------------------------------------
  {
    id: 'body',
    eyebrow: '04 / BODY SNAPSHOT',
    heading: 'Roughly where do you land?',
    body: "Ranges are fine. Your physician confirms exact measurements in your portal review.",
    fields: [
      {
        id: 'height',
        type: 'pill-grid',
        label: 'Height',
        required: true,
        options: [
          { value: 'lt-54', label: "Under 5'4\"" },
          { value: '54-58', label: "5'4\" – 5'8\"" },
          { value: '58-60', label: "5'8\" – 6'0\"" },
          { value: '60-64', label: "6'0\" – 6'4\"" },
          { value: 'gt-64', label: "6'4\"+" },
        ],
      },
      {
        id: 'weight',
        type: 'pill-grid',
        label: 'Weight',
        required: true,
        options: [
          { value: 'lt-130', label: 'Under 130 lbs' },
          { value: '130-160', label: '130 – 160 lbs' },
          { value: '160-190', label: '160 – 190 lbs' },
          { value: '190-220', label: '190 – 220 lbs' },
          { value: '220-260', label: '220 – 260 lbs' },
          { value: 'gt-260', label: '260+ lbs' },
        ],
      },
    ],
  },

  // -------------------------------------------------------------
  // 5. LIFESTYLE (just the two that matter for routing)
  // -------------------------------------------------------------
  {
    id: 'lifestyle',
    eyebrow: '05 / LIFESTYLE',
    heading: 'How active are you?',
    fields: [
      {
        id: 'exercise',
        type: 'pill-grid',
        label: 'Exercise frequency',
        required: true,
        options: [
          { value: 'sedentary', label: 'Sedentary' },
          { value: '1-2', label: '1–2× / week' },
          { value: '3-4', label: '3–4× / week' },
          { value: '5+', label: '5+× / week' },
        ],
      },
      {
        id: 'sleep_quality',
        type: 'slider',
        label: 'Sleep quality (1–10)',
        required: true,
        min: 1,
        max: 10,
      },
    ],
  },

  // -------------------------------------------------------------
  // 6. HEALTH SCREEN (knockouts + flags + meds/allergies, one step)
  // -------------------------------------------------------------
  {
    id: 'health',
    eyebrow: '06 / HEALTH SCREEN',
    heading: 'A few important screening questions.',
    body: 'Honest answers protect you. Reviewed by a licensed physician.',
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
      {
        id: 'flags',
        type: 'multi-select',
        label: 'Any of the following? Select all that apply.',
        options: [
          { value: 'cardio', label: 'Cardiovascular event (heart attack, stroke, clot)' },
          { value: 't1d', label: 'Type 1 diabetes' },
          { value: 'autoimmune', label: 'Autoimmune condition' },
          { value: 'mental', label: 'Mental-health diagnosis' },
          { value: 'endocrine', label: 'Thyroid / pituitary disorder' },
          { value: 'surgery', label: 'Major surgery in the last 12 months' },
          { value: 'prior-peptides', label: 'Prior peptide / hormone use' },
          { value: 'none', label: 'None of the above' },
        ],
      },
      {
        id: 'notes',
        type: 'text-long',
        label: 'Medications, allergies, or anything else? (Optional)',
        placeholder: 'e.g. Lisinopril 10mg daily · Allergic to penicillin · BPC-157 for 3 months in 2024',
      },
    ],
  },

  // -------------------------------------------------------------
  // 7. CONSENTS. Disclaimer list + master ack + optional SMS/research
  // (Pattern adapted from competitor intake. Read, then confirm.)
  // -------------------------------------------------------------
  {
    id: 'consents',
    eyebrow: '07 / CONSENTS',
    heading: 'By submitting this form, I acknowledge:',
    body: "Take a moment to review the statements below. You'll confirm with the single acknowledgement at the bottom.",
    disclaimers: [
      'All information provided is accurate and complete to the best of my knowledge.',
      'I consent to have my intake reviewed by the Eternal Longevity clinical team for the purpose of evaluating my responses and providing personalized peptide recommendations based on my goals and health information.',
      'I understand that this review is for informational and educational purposes only and does not constitute medical advice, diagnosis, or prescription approval by a licensed provider unless and until a licensed physician signs my prescription.',
      'I understand that results from peptide therapy may vary, and I accept the potential risks associated with their use.',
      'I understand that I may be contacted for follow-up, clarification, or adjustments to my plan.',
      'I acknowledge that submitting this form does not guarantee that I will be eligible for peptide recommendations or treatment, and final eligibility will be determined at the discretion of licensed providers.',
      'I understand that my information will be handled in accordance with the Eternal Longevity Privacy Policy.',
      'I understand that my information will be handled in accordance with the Eternal Longevity Terms of Service and Telehealth Informed Consent.',
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
    eyebrow: '08 / CREATE ACCOUNT',
    heading: 'Last step. Set up your portal.',
    body: 'Your account is how you review the physician-signed protocol, verify ID, and check out securely.',
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

export const KNOCKOUT_MESSAGES: Record<string, { title: string; body: string }> = {
  under18: {
    title: 'Sorry. Our services are limited to adults 18+',
    body: "Our protocols require informed consent from an adult of legal age. If you're under 18, we recommend speaking with your primary physician about your goals.",
  },
  cancer: {
    title: "We can't approve this protocol right now",
    body: "Given your history, peptide therapy isn't appropriate without direct oncologist coordination. We recommend speaking with your primary care provider about your goals.",
  },
  pregnant: {
    title: "We can't approve this protocol right now",
    body: 'Peptide therapy is not safe during pregnancy or breastfeeding. We recommend speaking with your obstetric provider; you can come back when ready.',
  },
  organ: {
    title: "We can't approve this protocol right now",
    body: 'End-stage kidney or liver disease requires specialized supervision beyond what telehealth peptide therapy can safely provide. Please consult your primary specialist.',
  },
};

export const CONSENT_VERSION = '2026-05';

export const CONSENT_ITEMS = [
  {
    id: 'master_ack',
    required: true,
    label:
      'I have read and understood the above disclaimers. I consent to the collection and review of my information for the purpose of receiving peptide recommendations. I understand that this form does not constitute medical advice or create a provider–patient relationship until a licensed physician reviews and signs my protocol.',
  },
  {
    id: 'sms',
    required: false,
    label:
      'I agree to receive recurring promotional or informational SMS messages from Eternal Longevity at the number provided. Message frequency may vary. Message and data rates may apply. Reply HELP for help or STOP to cancel. Consent is not a condition of purchase.',
  },
  {
    id: 'research',
    required: false,
    label:
      'I consent to the use of my de-identified information for internal research, analytics, and product improvement purposes.',
  },
];
