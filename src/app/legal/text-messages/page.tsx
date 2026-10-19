import type { Metadata } from 'next';
import Link from 'next/link';
import { pageMeta } from '@/lib/seo';
import { LegalLayout, type LegalSection } from '@/components/legal/LegalLayout';
import { BUSINESS_LEGAL_NAME, BUSINESS_ADDRESS, SUPPORT_EMAIL } from '@/lib/site';
import { CONSENT_ITEMS } from '@/lib/intakeSchema';

export const metadata: Metadata = pageMeta(
  '/legal/text-messages',
  'Text Messaging Terms',
  'How Eternal Longevity text messages work: the account and care alerts program, and our separate marketing text program.',
);

const FROM = '(877) 879-0450';
// Marketing SMS is not live yet. Its terms publish only once the program works (brief's golden rule).
const MARKETING_ON = process.env.NEXT_PUBLIC_SMS_MARKETING === '1';
const MARKETING_FROM = process.env.NEXT_PUBLIC_SMS_SENDING_NUMBER?.trim();

const MARKETING_SECTIONS: LegalSection[] = MARKETING_ON
  ? [
      {
        heading: 'Marketing text messages',
        paragraphs: [
          ...(MARKETING_FROM ? [`Sending number: ${MARKETING_FROM}.`] : []),
          'Eternal Longevity LLC offers an optional recurring marketing text-message program with updates and offers. By completing the separate SMS consent process, you agree to receive marketing texts at the mobile number you provide, including messages sent using an automatic telephone dialing system. Consent is not a condition of purchase, assessment, treatment or other services. Message frequency varies. Message and data rates may apply. The program is for adults 18 and older.',
          `Reply STOP to stop marketing texts, or make another reasonable opt-out request through ${SUPPORT_EMAIL} or (212) 344-4247. Reply HELP for assistance. We honor marketing opt-outs promptly and may send one nonpromotional confirmation. Enrollment remains inactive until the program’s confirmation process is complete. Re-enrollment requires a fresh affirmative request.`,
          'Tell us when your number changes or you stop controlling it. You represent that you are the subscriber or authorized user of the number you enroll. Do not submit someone else’s number without authority. Mobile carriers are not liable for delayed or undelivered messages. Delivery depends on your network and provider availability.',
          'These marketing terms do not replace separate permissions for care or account messages. Marketing messages are not an emergency or clinical communication channel; do not send medical details in reply. Use the secure care channel for medical questions. Privacy Policy describes our handling of contact data and choices.',
          'We do not sell, rent or disclose mobile numbers or SMS marketing consent to affiliates or other third parties for their own marketing. Providers may use this information only to operate and support our program under contractual restrictions. Marketing Preferences lets you review your separate email and SMS choices.',
          'The messages you will receive when you confirm and when you opt out:',
        ],
        bullets: [
          'Eternal Longevity: Reply YES to confirm your request for recurring marketing texts. Msg frequency varies; msg & data rates may apply. STOP to opt out; HELP for help.',
          'Eternal Longevity: You are unsubscribed from marketing texts. No more marketing messages will be sent.',
        ],
      },
    ]
  : [
      {
        heading: 'Marketing text messages',
        paragraphs: [
          'We do not currently send marketing text messages. If we start, the program terms will appear here before enrollment opens.',
        ],
      },
    ];
const OPT_IN = CONSENT_ITEMS.find((c) => c.id === 'sms_alerts')!.label;

/** The exact opt-in a patient sees in the assessment (unticked by default). */
function OptInExample() {
  return (
    <div className="mb-12 max-w-[68ch] rounded-shell bg-milk p-5 md:p-7">
      <p className="text-[13px] font-medium text-ink/65">Where you opt in: the final step of the assessment at etlongevity.com/start</p>
      <div className="mt-4 rounded-inner bg-white p-5 ring-1 ring-ink/10">
        <label className="block text-[13px] font-semibold text-ink">Mobile phone number</label>
        <div className="mt-1.5 rounded-full bg-milk px-4 py-2.5 text-[14px] text-ink/45">(555) 123-4567</div>
        <div className="mt-5 flex gap-3">
          <span aria-hidden className="mt-0.5 h-5 w-5 shrink-0 rounded-[5px] border-[1.5px] border-ink/40 bg-white" />
          <p className="text-[13.5px] leading-relaxed text-ink/80">{OPT_IN}</p>
        </div>
        <p className="mt-4 text-[12.5px] text-ink/60">
          The box is never pre-ticked, and leaving it unticked does not affect your care or your order.{' '}
          <Link href="/legal/terms" className="underline underline-offset-[3px]">Terms of Service</Link> ·{' '}
          <Link href="/legal/privacy" className="underline underline-offset-[3px]">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}

export default function TextMessagesPage() {
  return (
    <LegalLayout
      title="Text Messaging Terms"
      effective="October 19, 2026"
      lead={`We keep account and care texts separate from marketing texts, each with its own permission. Eternal Longevity Account Alerts is an optional program for our patients; these terms explain how you opt in, what we send, how often, and how to stop. Marketing text messages are covered in their own section below.`}
      sections={[
        {
          heading: 'Account and care text messages',
          paragraphs: [
            `Program name: Eternal Longevity Account Alerts, operated by ${BUSINESS_LEGAL_NAME}. Messages are sent from ${FROM}.`,
            'We send account and care notifications only: sign-in and verification codes, a notice that your care team has replied in your secure member portal, order and shipping updates, and notices about your account or payment. Messages never contain medication names or health details, and we do not send marketing or promotional messages through this program.',
          ],
        },
        {
          heading: 'Account Alerts: How You Opt In',
          paragraphs: [
            'You opt in by ticking the optional, unticked box shown above on the final step of the online assessment, after entering your mobile number. Consent is not a condition of purchase or of receiving care. You can also turn alerts off at any time.',
          ],
        },
        {
          heading: 'Account Alerts: Frequency and Cost',
          paragraphs: [
            'Message frequency varies with your account activity, typically a few messages a month. Message and data rates may apply, according to your mobile plan.',
          ],
        },
        {
          heading: 'Account Alerts: Help and Stopping Messages',
          paragraphs: [
            `Reply STOP to any message to cancel. You will receive one confirmation and no further texts. Reply HELP for help, or email ${SUPPORT_EMAIL}. To opt back in, reply START.`,
            'Carriers are not liable for delayed or undelivered messages.',
          ],
        },
        {
          heading: 'Account Alerts: Privacy',
          paragraphs: [
            'No mobile information will be shared with third parties or affiliates for marketing or promotional purposes. Text messaging opt-in data and consent are not shared with any third parties. Mobile numbers are shared only with the service providers that deliver our messages. See our Privacy Policy.',
          ],
        },
        ...MARKETING_SECTIONS,
        {
          heading: 'Contact',
          paragraphs: [`${BUSINESS_LEGAL_NAME}, ${BUSINESS_ADDRESS}. Email ${SUPPORT_EMAIL}.`],
        },
      ]}
      related={[
        { label: 'Privacy Policy', href: '/legal/privacy' },
        { label: 'Terms of Service', href: '/legal/terms' },
        ...(MARKETING_ON ? [{ label: 'Marketing Preferences', href: '/marketing-preferences' }] : []),
      ]}
    >
      <OptInExample />
    </LegalLayout>
  );
}
