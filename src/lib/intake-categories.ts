/**
 * Category questions (Hims-style): the first thing the assessment asks, before
 * the shared eligibility and health steps (intakeSchema.buildAssessmentSteps).
 * Each category asks the few questions the prescriber and the recommendation
 * (lib/recommend) need; guided photos (hair, skin) and lab files are left for
 * the portal after checkout (MEDIA_STEPS). Modelled on the standard telehealth
 * questionnaires (symptom first, then safety, then history), in our own words.
 *
 * DRAFT for Dr. Elder's review: wording and knockouts are clinical decisions.
 * Edit here; the wizard, the server check and the prescriber view all read
 * this file.
 *
 * Answers are stored in the intake answers JSON under each field id. Photos
 * and files are stored as storage paths: { slot, path }[] for photo-upload,
 * string[] for file-upload.
 */
import type { Cond, Option, Step } from './intakeSchema';

export type CategoryKey = 'longevity' | 'sexual-health' | 'hormones' | 'hair' | 'skin';

const YES_NO: Option[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];
const YES_NO_UNSURE: Option[] = [...YES_NO, { value: 'unsure', label: "I'm not sure" }];

/** Home category of every product in the lineup. */
export const PRODUCT_CATEGORY: Record<string, CategoryKey> = {
  'nad-plus': 'longevity',
  glutathione: 'longevity',
  'nad-nasal': 'longevity',
  'mic-b12': 'longevity',
  'methylene-blue': 'longevity',
  'pt-141': 'sexual-health',
  'sildenafil-tadalafil': 'sexual-health',
  sildenafil: 'sexual-health',
  oxytocin: 'sexual-health',
  enclomiphene: 'hormones',
  'hrt-cream': 'hormones',
  'fin-min-capsule': 'hair',
  'fin-min-foam': 'hair',
  'min-12-fin': 'hair',
  'fin-min-tret': 'hair',
  finasteride: 'hair',
  'oral-minoxidil': 'hair',
  spironolactone: 'hair',
  tretinoin: 'skin',
  'glow-cream': 'skin',
  'clear-skin-cream': 'skin',
  brightening: 'skin',
  'even-tone-cream': 'skin',
  'hq-free': 'skin',
  'clear-skin-capsules': 'skin',
};

export const CATEGORY_LABEL: Record<CategoryKey, string> = {
  longevity: 'Longevity',
  'sexual-health': 'Sexual health',
  hormones: 'Hormones',
  hair: 'Hair',
  skin: 'Skin',
};

const INJECTABLE = new Set(['nad-plus', 'glutathione', 'mic-b12', 'pt-141']);
export const PDE5 = new Set(['sildenafil', 'sildenafil-tadalafil']);
const DESIRE = new Set(['pt-141', 'oxytocin']);

const MALE: Cond = { field: 'sex', values: ['m', 'intersex'] };
const FEMALE: Cond = { field: 'sex', values: ['f', 'intersex'] };

/**
 * Sex assigned at birth, asked first where the questions depend on it
 * (hormones, sexual health). Same answer id as the about-you step, so it is
 * asked once: the assessment drops the later copy.
 */
const sexStep = (key: string): Step => ({
  id: `cat-${key}-sex`,
  eyebrow: 'ABOUT YOU',
  heading: 'What sex were you assigned at birth?',
  fields: [
    {
      id: 'sex',
      type: 'pill-grid',
      label: '',
      required: true,
      options: [
        { value: 'm', label: 'Male' },
        { value: 'f', label: 'Female' },
        { value: 'intersex', label: 'Intersex' },
      ],
    },
  ],
});

/* ----------------------------------------------------------------------- */
/*  Longevity                                                               */
/* ----------------------------------------------------------------------- */

const LONGEVITY_GOALS: Step = {
  id: 'cat-longevity-goals',
  eyebrow: 'YOUR GOALS',
  heading: 'What would you like support with?',
  body: 'Pick all that apply. It helps your physician choose the right plan.',
  fields: [
    {
      id: 'lng_goals',
      type: 'multi-select',
      label: '',
      required: true,
      options: [
        { value: 'energy', label: 'Everyday energy' },
        { value: 'recovery', label: 'Recovery after activity' },
        { value: 'ageing', label: 'Healthy ageing' },
        { value: 'focus', label: 'Focus and mental energy' },
        { value: 'other', label: 'Something else' },
      ],
    },
    {
      id: 'lng_supplements',
      type: 'text-long',
      label: 'Supplements you take now (optional)',
      placeholder: 'e.g. Vitamin D 2,000 IU daily',
    },
  ],
};

const LONGEVITY_INJECTION = (product: boolean): Step => ({
  id: 'cat-longevity-injection',
  eyebrow: 'HOW YOU TAKE IT',
  heading: product ? 'This one is a small injection under the skin.' : 'Some of these are a small injection under the skin.',
  body: 'A short, fine needle, similar to what people use for vitamins. Your care team shows you how.',
  fields: [
    {
      id: 'lng_injection_comfort',
      type: 'single-select',
      label: 'How do you feel about that?',
      required: true,
      options: [
        { value: 'yes', label: "I'm comfortable with it" },
        { value: 'help', label: "I'd like guidance first" },
        { value: 'no', label: "I'd prefer something without a needle" },
      ],
      flagOn: ['help', 'no'],
    },
  ],
});

const METHYLENE_BLUE: Step = {
  id: 'cat-longevity-mb',
  eyebrow: 'SAFETY · METHYLENE BLUE',
  heading: 'Two questions about medicines you take.',
  fields: [
    {
      id: 'lng_mb_serotonergic',
      type: 'pill-grid',
      label: 'Do you take an antidepressant or other serotonergic medicine (SSRI, SNRI, MAOI, tramadol, triptans)?',
      required: true,
      options: YES_NO,
      flagOn: ['yes'],
    },
    {
      id: 'lng_mb_g6pd',
      type: 'pill-grid',
      label: 'Have you ever been told you have G6PD deficiency?',
      required: true,
      options: YES_NO_UNSURE,
      flagOn: ['yes', 'unsure'],
    },
  ],
};

/* ----------------------------------------------------------------------- */
/*  Sexual health                                                           */
/* ----------------------------------------------------------------------- */

const PERFORMANCE: Cond = { field: 'sx_focus', values: ['performance', 'both'] };

const SEXUAL_FOCUS: Step = {
  id: 'cat-sexual-focus',
  eyebrow: 'YOUR GOALS',
  heading: 'What would you like help with?',
  fields: [
    {
      id: 'sx_focus',
      type: 'single-select',
      label: '',
      required: true,
      options: [
        { value: 'performance', label: 'Performance', hint: 'Getting or keeping an erection' },
        { value: 'desire', label: 'Desire', hint: 'Interest in sex and arousal' },
        { value: 'both', label: 'Both' },
      ],
    },
  ],
};

/** Erections: men, when a PDE5 product is in play or performance is the goal. */
const SEXUAL_ED = (pde5: boolean): Step => ({
  id: 'cat-sexual-ed',
  eyebrow: 'ABOUT YOU',
  showIf: pde5 ? MALE : [MALE, PERFORMANCE],
  heading: 'Tell us what you have noticed.',
  body: 'Honest answers help your physician choose the right medicine and dose.',
  fields: [
    {
      id: 'sx_ed_frequency',
      type: 'single-select',
      label: 'How often can you get and keep an erection firm enough for sex?',
      required: true,
      options: [
        { value: 'always', label: 'Always or almost always' },
        { value: 'usually', label: 'Most of the time' },
        { value: 'sometimes', label: 'About half the time' },
        { value: 'rarely', label: 'Rarely' },
        { value: 'never', label: 'Never' },
      ],
    },
    {
      id: 'sx_ed_onset',
      type: 'single-select',
      label: 'How did it start?',
      required: true,
      options: [
        { value: 'gradual', label: 'Gradually, over time' },
        { value: 'sudden', label: 'Suddenly' },
        { value: 'situational', label: 'Only in some situations or with some partners' },
      ],
      flagOn: ['sudden'],
    },
    {
      id: 'sx_ed_morning',
      type: 'single-select',
      label: 'Do you still get erections in the morning or when you wake up?',
      required: true,
      options: [
        { value: 'yes', label: 'Yes, regularly' },
        { value: 'sometimes', label: 'Sometimes' },
        { value: 'no', label: 'No' },
      ],
    },
    {
      id: 'sx_ed_other',
      type: 'multi-select',
      label: 'Any of these as well? (optional)',
      options: [
        { value: 'early', label: 'Finishing sooner than I would like' },
        { value: 'desire', label: 'Lower desire than usual' },
        { value: 'pain', label: 'Pain or a curve during erections' },
      ],
      flagOn: ['pain'],
    },
  ],
});

/** Desire: women, a desire product, or desire as the goal. */
const SEXUAL_DESIRE = (desire: boolean): Step => ({
  id: 'cat-sexual-desire',
  eyebrow: 'ABOUT YOU',
  showIfAny: desire ? undefined : [{ field: 'sex', values: ['f'] }, { field: 'sx_focus', values: ['desire', 'both'] }],
  heading: 'Tell us what you have noticed.',
  fields: [
    {
      id: 'sx_desire_level',
      type: 'single-select',
      label: 'How would you describe your interest in sex lately?',
      required: true,
      options: [
        { value: 'lower', label: 'Lower than it used to be' },
        { value: 'much_lower', label: 'Much lower, and it bothers me' },
        { value: 'unchanged', label: 'About the same, I want more support' },
      ],
    },
    {
      id: 'sx_desire_since',
      type: 'single-select',
      label: 'How long has it been this way?',
      required: true,
      options: [
        { value: 'lt6m', label: 'Less than 6 months' },
        { value: '6to24m', label: '6 months to 2 years' },
        { value: 'gt2y', label: 'More than 2 years' },
      ],
    },
    {
      id: 'sx_desire_changes',
      type: 'multi-select',
      label: 'Anything change around the same time? (optional)',
      options: [
        { value: 'stress', label: 'More stress' },
        { value: 'meds', label: 'New medicine' },
        { value: 'relationship', label: 'Relationship changes' },
        { value: 'birth', label: 'Pregnancy or a new baby' },
        { value: 'none', label: 'Nothing I can think of' },
      ],
      flagOn: ['meds'],
    },
  ],
});

/** Nitrates and alpha-blockers matter only when a PDE5 product is in play or could be recommended. */
const SEXUAL_HEART = (pde5: boolean): Step => ({
  id: 'cat-sexual-heart',
  eyebrow: 'HEART HEALTH',
  heading: 'A few questions about your heart and blood pressure.',
  body: 'These medicines can affect blood pressure, so your physician checks this first.',
  fields: [
    {
      id: 'sx_cardiac_event',
      type: 'pill-grid',
      label: 'In the last 6 months, have you had a heart attack or a stroke?',
      required: true,
      options: YES_NO,
      flagOn: ['yes'],
    },
    {
      id: 'sx_exertion',
      type: 'pill-grid',
      label: 'Do you get chest pain, shortness of breath or feel faint with light activity, like climbing two flights of stairs or during sex?',
      required: true,
      options: YES_NO,
      flagOn: ['yes'],
    },
    {
      id: 'sx_bp',
      type: 'single-select',
      label: 'What is your blood pressure usually like?',
      required: true,
      options: [
        { value: 'normal', label: 'Normal' },
        { value: 'high_treated', label: 'High, and I take medicine for it' },
        { value: 'high_untreated', label: 'High, not treated' },
        { value: 'low', label: 'Low, or I get dizzy when I stand up' },
        { value: 'unknown', label: "I don't know" },
      ],
      flagOn: ['high_untreated', 'low', 'unknown'],
    },
    {
      id: 'sx_bp_checked',
      type: 'single-select',
      label: 'When was your blood pressure last checked?',
      required: true,
      options: [
        { value: 'lt1y', label: 'Within the last year' },
        { value: '1to3y', label: '1 to 3 years ago' },
        { value: 'gt3y', label: 'More than 3 years ago, or never' },
      ],
      flagOn: ['gt3y'],
    },
    {
      id: 'sx_nitrates',
      type: 'pill-grid',
      label: 'Do you use nitrates (such as nitroglycerin or isosorbide) or "poppers"?',
      required: true,
      options: YES_NO,
      knockoutOn: { values: ['yes'], key: 'nitrates' },
      showIf: pde5 ? MALE : [MALE, PERFORMANCE],
    },
    {
      id: 'sx_alpha',
      type: 'pill-grid',
      label: 'Do you take medicine for blood pressure or the prostate, such as tamsulosin, doxazosin or terazosin?',
      required: true,
      options: YES_NO,
      flagOn: ['yes'],
      showIf: pde5 ? MALE : [MALE, PERFORMANCE],
    },
  ],
});

const SEXUAL_USE: Step = {
  id: 'cat-sexual-use',
  eyebrow: 'HOW YOU PLAN TO USE IT',
  heading: 'A little about how you would use it.',
  fields: [
    {
      id: 'sx_frequency',
      type: 'single-select',
      label: 'How often do you expect to use it?',
      required: true,
      options: [
        { value: 'few_month', label: 'A few times a month' },
        { value: 'weekly', label: 'About once a week' },
        { value: 'several_week', label: 'Several times a week' },
      ],
    },
    {
      id: 'sx_prior',
      type: 'pill-grid',
      label: 'Have you used a prescription for this before?',
      required: true,
      options: YES_NO,
    },
    {
      id: 'sx_prior_detail',
      type: 'text-long',
      label: 'Which one, what dose, and how did it work for you?',
      placeholder: 'e.g. Sildenafil 50 mg, worked but gave me a headache',
      showIf: { field: 'sx_prior', values: ['yes'] },
    },
    {
      id: 'sx_recreational',
      type: 'pill-grid',
      label: 'Do you use recreational drugs such as cocaine or MDMA?',
      required: true,
      options: YES_NO,
      flagOn: ['yes'],
    },
  ],
};

/* ----------------------------------------------------------------------- */
/*  Hormones                                                                */
/* ----------------------------------------------------------------------- */

const HORMONES_MEN: Step = {
  id: 'cat-hormones-men',
  eyebrow: 'ABOUT YOU',
  showIf: MALE,
  heading: 'Tell us what you have noticed.',
  fields: [
    {
      id: 'hm_symptoms',
      type: 'multi-select',
      label: 'What would you like support with?',
      required: true,
      options: [
        { value: 'energy', label: 'Energy' },
        { value: 'drive', label: 'Sex drive' },
        { value: 'mood', label: 'Mood or motivation' },
        { value: 'strength', label: 'Strength and recovery' },
        { value: 'fertility', label: 'Fertility' },
      ],
    },
    {
      id: 'hm_trt',
      type: 'pill-grid',
      label: 'Do you currently use testosterone or another hormone?',
      required: true,
      options: YES_NO,
      flagOn: ['yes'],
    },
    {
      id: 'hm_fertility',
      type: 'pill-grid',
      label: 'Are you hoping to have children in the next year or two?',
      required: true,
      options: YES_NO,
    },
  ],
};

const HORMONES_MEN_HEALTH: Step = {
  id: 'cat-hormones-men-health',
  eyebrow: 'HEALTH AND LABS',
  showIf: MALE,
  heading: 'A few safety questions.',
  body: "No recent blood test? That's fine. Your physician may ask for one before prescribing.",
  fields: [
    {
      id: 'hm_history',
      type: 'multi-select',
      label: 'Have you ever had any of these?',
      required: true,
      options: [
        { value: 'clot', label: 'A blood clot' },
        { value: 'liver', label: 'Liver disease' },
        { value: 'vision', label: 'Vision problems from a medicine' },
        { value: 'prostate', label: 'Prostate cancer' },
        { value: 'none', label: 'None of these' },
      ],
      flagOn: ['clot', 'liver', 'vision', 'prostate'],
    },
    {
      id: 'hm_labs_recent',
      type: 'pill-grid',
      label: 'Have you had a testosterone blood test in the last 6 months?',
      required: true,
      options: YES_NO,
    },
  ],
};

/** After checkout, in the portal: the results they said they have. Optional. */
const HORMONES_LABS: Step = {
  id: 'cat-hormones-labs',
  eyebrow: 'LAB RESULTS',
  heading: 'Your recent lab results.',
  body: 'Optional. If you have your testosterone results to hand, your physician can use them in the review.',
  showIf: [MALE, { field: 'hm_labs_recent', values: ['yes'] }],
  fields: [
    {
      id: 'hm_labs_files',
      type: 'file-upload',
      label: 'Upload your results (optional)',
      accept: 'application/pdf,image/*',
    },
  ],
};

const HORMONES_WOMEN: Step = {
  id: 'cat-hormones-women',
  eyebrow: 'HORMONE HISTORY',
  showIf: FEMALE,
  heading: 'A few questions about your cycle and history.',
  fields: [
    {
      id: 'hw_cycle',
      type: 'single-select',
      label: 'When was your last period?',
      required: true,
      options: [
        { value: 'within_3m', label: 'Within the last 3 months' },
        { value: '3_12m', label: '3 to 12 months ago' },
        { value: 'over_12m', label: 'More than 12 months ago' },
        { value: 'hysterectomy', label: 'I had a hysterectomy' },
        { value: 'unsure', label: "I'm not sure" },
      ],
    },
    {
      id: 'hw_history',
      type: 'pill-grid',
      label: 'Have you ever had a blood clot, a stroke, breast or uterine cancer, or unexplained vaginal bleeding?',
      required: true,
      options: YES_NO,
      knockoutOn: { values: ['yes'], key: 'hrt_history' },
    },
    {
      id: 'hw_mammogram',
      type: 'pill-grid',
      label: 'Have you had a mammogram in the last 2 years?',
      required: true,
      options: YES_NO,
      flagOn: ['no'],
    },
    {
      id: 'hw_support',
      type: 'multi-select',
      label: 'What would you like support with? (optional)',
      options: [
        { value: 'sleep', label: 'Sleep' },
        { value: 'temperature', label: 'Temperature changes' },
        { value: 'mood', label: 'Mood' },
        { value: 'energy', label: 'Energy' },
        { value: 'intimacy', label: 'Intimacy' },
      ],
    },
  ],
};

/* ----------------------------------------------------------------------- */
/*  Hair                                                                    */
/* ----------------------------------------------------------------------- */

const HAIR_HISTORY: Step = {
  id: 'cat-hair-history',
  eyebrow: 'YOUR HAIR',
  heading: 'Tell us about your hair.',
  fields: [
    {
      id: 'hr_area',
      type: 'multi-select',
      label: 'Where are you noticing changes?',
      required: true,
      options: [
        { value: 'hairline', label: 'Hairline or temples' },
        { value: 'crown', label: 'Crown' },
        { value: 'part', label: 'Wider part line' },
        { value: 'overall', label: 'All over' },
        { value: 'patches', label: 'Round or patchy spots' },
      ],
      flagOn: ['patches'],
    },
    {
      id: 'hr_duration',
      type: 'single-select',
      label: 'When did you first notice it?',
      required: true,
      options: [
        { value: 'lt1', label: 'Less than a year ago' },
        { value: '1to3', label: '1 to 3 years ago' },
        { value: 'gt3', label: 'More than 3 years ago' },
      ],
    },
    {
      id: 'hr_pace',
      type: 'single-select',
      label: 'How quickly is it changing?',
      required: true,
      options: [
        { value: 'slow', label: 'Slowly' },
        { value: 'fast', label: 'Faster lately' },
        { value: 'sudden', label: 'A lot of shedding all at once' },
        { value: 'stable', label: "It isn't changing" },
      ],
      flagOn: ['sudden'],
    },
    {
      id: 'hr_family',
      type: 'pill-grid',
      label: 'Does it run in your family?',
      required: true,
      options: YES_NO_UNSURE,
    },
  ],
};

const HAIR_CONTEXT: Step = {
  id: 'cat-hair-context',
  eyebrow: 'YOUR HAIR',
  heading: 'A little more context.',
  fields: [
    {
      id: 'hr_recent',
      type: 'multi-select',
      label: 'In the last 6 months, have you had any of these?',
      required: true,
      options: [
        { value: 'illness', label: 'A major illness or high fever' },
        { value: 'surgery', label: 'Surgery' },
        { value: 'weight', label: 'Big weight change' },
        { value: 'stress', label: 'A very stressful time' },
        { value: 'baby', label: 'A baby' },
        { value: 'none', label: 'None of these' },
      ],
      flagOn: ['illness', 'surgery', 'weight', 'baby'],
    },
    {
      id: 'hr_scalp',
      type: 'pill-grid',
      label: 'Is your scalp itchy, flaky, red or sore?',
      required: true,
      options: YES_NO,
      flagOn: ['yes'],
    },
    {
      id: 'hr_tried',
      type: 'multi-select',
      label: 'Have you tried any of these?',
      required: true,
      options: [
        { value: 'minoxidil', label: 'Minoxidil' },
        { value: 'finasteride', label: 'Finasteride' },
        { value: 'supplements', label: 'Supplements' },
        { value: 'other', label: 'Something else' },
        { value: 'none', label: 'Nothing yet' },
      ],
    },
    {
      id: 'hr_tried_detail',
      type: 'text-long',
      label: 'What did you use, and how did it go? (optional)',
      showIf: { field: 'hr_tried', values: ['minoxidil', 'finasteride', 'supplements', 'other'] },
    },
    {
      id: 'hr_format',
      type: 'single-select',
      label: 'How would you prefer to take it?',
      required: true,
      options: [
        { value: 'pill', label: 'A daily pill' },
        { value: 'foam', label: 'A scalp foam' },
        { value: 'either', label: 'Either is fine' },
      ],
    },
  ],
};

const HAIR_PHOTOS: Step = {
  id: 'cat-hair-photos',
  eyebrow: 'PHOTOS',
  heading: 'Two quick photos.',
  body: 'Good light, dry hair, no hat. Only your care team sees these.',
  fields: [
    {
      id: 'hr_photos',
      type: 'photo-upload',
      label: '',
      required: true,
      slots: [
        { id: 'front', label: 'Front hairline', hint: 'Face the camera with your hair pulled back.', required: true },
        { id: 'top', label: 'Top of your head', hint: 'Hold the phone above your head, looking down.', required: true },
        { id: 'crown', label: 'Crown (optional)', hint: 'Use a mirror or ask someone to help.' },
      ],
    },
  ],
};

/* ----------------------------------------------------------------------- */
/*  Skin                                                                    */
/* ----------------------------------------------------------------------- */

const SKIN_PROFILE: Step = {
  id: 'cat-skin-profile',
  eyebrow: 'YOUR SKIN',
  heading: 'Tell us about your skin.',
  fields: [
    {
      id: 'sk_goals',
      type: 'multi-select',
      label: 'What would you most like to improve?',
      required: true,
      options: [
        { value: 'blemishes', label: 'Blemishes and clogged pores' },
        { value: 'tone', label: 'Uneven tone or dark marks' },
        { value: 'texture', label: 'Texture and fine lines' },
        { value: 'redness', label: 'Redness' },
        { value: 'hydration', label: 'Dryness' },
      ],
    },
    {
      id: 'sk_severity',
      type: 'single-select',
      label: 'How would you describe it right now?',
      required: true,
      options: [
        { value: 'mild', label: 'Mild' },
        { value: 'moderate', label: 'Moderate' },
        { value: 'severe', label: 'Severe, painful, or leaving scars' },
      ],
      flagOn: ['severe'],
    },
    {
      id: 'sk_type',
      type: 'single-select',
      label: 'Your skin type',
      required: true,
      options: [
        { value: 'oily', label: 'Oily' },
        { value: 'dry', label: 'Dry' },
        { value: 'combination', label: 'Combination' },
        { value: 'normal', label: 'Normal' },
      ],
    },
    {
      id: 'sk_sensitive',
      type: 'pill-grid',
      label: 'Does your skin react easily to new products?',
      required: true,
      options: YES_NO,
    },
  ],
};

const SKIN_ROUTINE: Step = {
  id: 'cat-skin-routine',
  eyebrow: 'YOUR ROUTINE',
  heading: 'What you use now.',
  fields: [
    {
      id: 'sk_sunscreen',
      type: 'single-select',
      label: 'How often do you wear sunscreen?',
      required: true,
      options: [
        { value: 'daily', label: 'Every day' },
        { value: 'sometimes', label: 'Sometimes' },
        { value: 'rarely', label: 'Rarely or never' },
      ],
      flagOn: ['rarely'],
    },
    {
      id: 'sk_prior',
      type: 'multi-select',
      label: 'Have you used any of these before?',
      required: true,
      options: [
        { value: 'retinoid', label: 'Tretinoin or another retinoid' },
        { value: 'hq', label: 'Hydroquinone' },
        { value: 'antibiotic', label: 'Antibiotic pills or creams for skin' },
        { value: 'isotretinoin', label: 'Isotretinoin, in the last 6 months' },
        { value: 'none', label: 'None of these' },
      ],
      flagOn: ['isotretinoin'],
    },
    {
      id: 'sk_prior_detail',
      type: 'text-long',
      label: 'What did you use, and how did your skin react? (optional)',
      placeholder: 'e.g. Tretinoin 0.025%, some peeling for 2 weeks',
      showIf: { field: 'sk_prior', values: ['retinoid', 'hq', 'antibiotic', 'isotretinoin'] },
    },
  ],
};

const SKIN_PHOTOS: Step = {
  id: 'cat-skin-photos',
  eyebrow: 'PHOTOS',
  heading: 'Photos of your skin.',
  body: 'Clean face, no makeup, natural light. Only your care team sees these.',
  fields: [
    {
      id: 'sk_photos',
      type: 'photo-upload',
      label: '',
      required: true,
      slots: [
        { id: 'front', label: 'Front', hint: 'Face the camera straight on.', required: true },
        { id: 'left', label: 'Left side', hint: 'Turn your head to the right.', required: true },
        { id: 'right', label: 'Right side (optional)', hint: 'Turn your head to the left.' },
      ],
    },
  ],
};

/* ----------------------------------------------------------------------- */

/** Knockout keys added by these steps (the wizard shows these stop screens). */
export const CATEGORY_KNOCKOUTS: Record<string, { title: string; body: string }> = {
  nitrates: {
    title: "This medicine isn't safe with nitrates.",
    body: 'Taken together they can drop your blood pressure dangerously. Please talk to your own doctor about options. If you use nitrates only occasionally, message us and your physician can advise.',
  },
  hrt_history: {
    title: 'We need to see you in person for this one.',
    body: 'With that history, hormone therapy needs an in-person exam and your own doctor involved. Please speak with your doctor or gynecologist.',
  },
};

/**
 * One category's steps. `ids` are the products in play: empty for a category
 * start (?category= or the goal picker), which asks everything the
 * recommendation needs. Product-specific questions are decided here; the rest
 * hang on step/field `showIf` against the answers.
 */
export function categorySteps(cat: CategoryKey, ids: string[] = []): Step[] {
  const any = (set: Set<string>) => ids.some((id) => set.has(id));
  switch (cat) {
    case 'longevity': {
      // Injection comfort decides injection vs nasal, so ask it unless they came for a needle-free product.
      const needle = !ids.length || ids.some((id) => INJECTABLE.has(id) && PRODUCT_CATEGORY[id] === 'longevity');
      const mb = ids.includes('methylene-blue');
      return [
        LONGEVITY_GOALS,
        ...(needle ? [LONGEVITY_INJECTION(ids.length > 0)] : []),
        mb ? METHYLENE_BLUE : { ...METHYLENE_BLUE, showIf: { field: 'lng_goals', values: ['focus'] } },
      ];
    }
    case 'sexual-health':
      return [sexStep('sexual'), SEXUAL_FOCUS, SEXUAL_ED(any(PDE5)), SEXUAL_DESIRE(any(DESIRE)), SEXUAL_HEART(any(PDE5)), SEXUAL_USE];
    case 'hormones':
      return [sexStep('hormones'), HORMONES_MEN, HORMONES_MEN_HEALTH, HORMONES_LABS, HORMONES_WOMEN];
    case 'hair':
      return [HAIR_HISTORY, HAIR_CONTEXT, HAIR_PHOTOS];
    case 'skin':
      return [SKIN_PROFILE, SKIN_ROUTINE, SKIN_PHOTOS];
  }
}

/** The category steps for the products in this visit, in category order, without repeats. */
export function buildCategorySteps(productIds: string[]): Step[] {
  return (Object.keys(CATEGORY_LABEL) as CategoryKey[])
    .filter((cat) => productIds.some((id) => PRODUCT_CATEGORY[id] === cat))
    .flatMap((cat) => categorySteps(cat, productIds.filter((id) => PRODUCT_CATEGORY[id] === cat)));
}

/** Uploads, completed in the portal after checkout. */
export const MEDIA_STEPS: { step: Step; category: CategoryKey }[] = [
  { step: HAIR_PHOTOS, category: 'hair' },
  { step: SKIN_PHOTOS, category: 'skin' },
  { step: HORMONES_LABS, category: 'hormones' },
];

/** Every category step, for label lookups in the prescriber view. */
export const ALL_CATEGORY_STEPS: Step[] = [
  LONGEVITY_GOALS,
  LONGEVITY_INJECTION(true),
  METHYLENE_BLUE,
  SEXUAL_FOCUS,
  SEXUAL_ED(true),
  SEXUAL_DESIRE(true),
  SEXUAL_HEART(true),
  SEXUAL_USE,
  HORMONES_MEN,
  HORMONES_MEN_HEALTH,
  HORMONES_LABS,
  HORMONES_WOMEN,
  HAIR_HISTORY,
  HAIR_CONTEXT,
  HAIR_PHOTOS,
  SKIN_PROFILE,
  SKIN_ROUTINE,
  SKIN_PHOTOS,
];
