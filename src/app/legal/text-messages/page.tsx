import type { Metadata } from 'next';
import Link from 'next/link';
import { pageMeta } from '@/lib/seo';
import { LegalLayout } from '@/components/legal/LegalLayout';
import { BUSINESS_LEGAL_NAME, BUSINESS_ADDRESS, SUPPORT_EMAIL } from '@/lib/site';
import { CONSENT_ITEMS } from '@/lib/intakeSchema';

export const metadata: Metadata = pageMeta(
  '/legal/text-messages',
  'Text Messaging Terms',
  'How Eternal Longevity account text alerts work: how you opt in, what we send, how often, and how to stop.',
);

const FROM = '(877) 879-0450';
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
      effective="October 2026"
      lead={`Eternal Longevity Account Alerts is an optional text-message program for our patients. These terms explain how you opt in, what we send, how often, and how to stop.`}
      sections={[
        {
          heading: 'Program',
          paragraphs: [
            `Program name: Eternal Longevity Account Alerts, operated by ${BUSINESS_LEGAL_NAME}. Messages are sent from ${FROM}.`,
            'We send account and care notifications only: sign-in and verification codes, a notice that your care team has replied in your secure member portal, order and shipping updates, and notices about your account or payment. Messages never contain medication names or health details, and we do not send marketing or promotional messages through this program.',
          ],
        },
        {
          heading: 'How You Opt In',
          paragraphs: [
            'You opt in by ticking the optional, unticked box shown above on the final step of the online assessment, after entering your mobile number. Consent is not a condition of purchase or of receiving care. You can also turn alerts off at any time.',
          ],
        },
        {
          heading: 'Frequency and Cost',
          paragraphs: [
            'Message frequency varies with your account activity, typically a few messages a month. Message and data rates may apply, according to your mobile plan.',
          ],
        },
        {
          heading: 'Help and Stopping Messages',
          paragraphs: [
            `Reply STOP to any message to cancel. You will receive one confirmation and no further texts. Reply HELP for help, or email ${SUPPORT_EMAIL}. To opt back in, reply START.`,
            'Carriers are not liable for delayed or undelivered messages.',
          ],
        },
        {
          heading: 'Privacy',
          paragraphs: [
            'No mobile information will be shared with third parties or affiliates for marketing or promotional purposes. Text messaging opt-in data and consent are not shared with any third parties. Mobile numbers are shared only with the service providers that deliver our messages. See our Privacy Policy.',
          ],
        },
        {
          heading: 'Contact',
          paragraphs: [`${BUSINESS_LEGAL_NAME}, ${BUSINESS_ADDRESS}. Email ${SUPPORT_EMAIL}.`],
        },
      ]}
      related={[
        { label: 'Privacy Policy', href: '/legal/privacy' },
        { label: 'Terms of Service', href: '/legal/terms' },
      ]}
    >
      <OptInExample />
    </LegalLayout>
  );
}
