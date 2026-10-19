/**
 * The optional marketing program's wording and choices. Pure: no server
 * imports, so the /subscribe form renders the same words the server stores.
 *
 * The disclosures are the brief's exact text. Change a word and bump the
 * version: the ledger (marketing_consent_events) stores both with every opt-in.
 */
export const CONSENT_VERSION = 'v1-2026-10';

export const SMS_DISCLOSURE =
  'By checking this box and selecting Subscribe, I electronically sign and agree to receive recurring marketing text messages from Eternal Longevity LLC at the mobile number I provided, including messages sent using an automatic telephone dialing system. Consent is not a condition of purchase, assessment, treatment or other services. Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for help. See SMS Terms and Privacy Policy.';

export const EMAIL_DISCLOSURE =
  'I agree to receive marketing emails from Eternal Longevity LLC, including updates and offers. I can unsubscribe at any time using the link in any marketing email. Consent is optional and is not required to receive care. See Privacy Policy.';

/** The texts confirmation, word for word from the brief. Sent before any promotion. */
export const SMS_CONFIRM_TEXT =
  'Eternal Longevity: Reply YES to confirm your request for recurring marketing texts. Msg frequency varies; msg & data rates may apply. STOP to opt out; HELP for help.';

/** Golden rule: SMS marketing is offered only once the program is provisioned. */
export const smsMarketingEnabled = () => process.env.NEXT_PUBLIC_SMS_MARKETING === '1';

export const SERVICE_STATES = [
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NY', label: 'New York' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'MI', label: 'Michigan' },
] as const;

export const PRIVACY_REQUEST_TYPES = [
  { value: 'access', label: 'Access my information' },
  { value: 'correction', label: 'Correct my information' },
  { value: 'deletion', label: 'Delete my information' },
  { value: 'copy', label: 'A copy of my information' },
  { value: 'consent_withdrawal', label: 'Withdraw consent' },
  { value: 'ad_opt_out', label: 'Opt out of advertising' },
  { value: 'appeal', label: 'Appeal a decision' },
  { value: 'agent', label: 'I’m an authorized agent' },
] as const;

export type PrivacyRequestValue = (typeof PRIVACY_REQUEST_TYPES)[number]['value'];
