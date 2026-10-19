import type { Metadata } from 'next';
import Link from 'next/link';
import { pageMeta } from '@/lib/seo';
import { LegalLayout } from '@/components/legal/LegalLayout';
import { IDENTITY } from '../identity';

export const metadata: Metadata = pageMeta(
  '/legal/privacy',
  'Privacy Policy',
  'How Eternal Longevity LLC collects, uses, discloses and protects personal and health information, and how to make a privacy request.',
);

// Same look as LegalLayout's string sections; this page needs links, a table and a fixed anchor.
const a = 'text-ink underline decoration-ink/30 underline-offset-[3px] transition-colors hover:decoration-ink';
const EMAIL = 'support@etlongevity.com';
const Mail = () => <a href={`mailto:${EMAIL}`} className={a}>{EMAIL}</a>;
const RequestLink = () => <Link href="/privacy-request" className={a}>/privacy-request</Link>;
const Choices = () => <Link href="/legal/cookies#cookie-choices" className={a}>Privacy Choices</Link>;
const Prefs = () => <Link href="/marketing-preferences" className={a}>Marketing Preferences</Link>;

function Section({ id, heading, children }: { id: string; heading: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-[170px] pt-10 md:pt-14">
      <h2 className="text-[26px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink [text-wrap:balance] md:text-[30px]">
        {heading}
      </h2>
      <div className="mt-4 space-y-4 text-[16px] leading-[1.75] text-ink/80">{children}</div>
    </section>
  );
}

const COLLECT: [string, string][] = [
  ['Identity and contact', 'Name, contact information, age or birth information, state and shipping address that you provide when using the service or contacting us.'],
  ['Health information', 'Assessment answers, health history, medications, allergies, photographs you submit for care, treatment requests, prescribing decisions and clinical messages. We receive this from you and authorized care and fulfillment partners as needed.'],
  ['Account and payment', 'Login and security information, order and billing records, payment status and limited card information. Our payment processor handles full payment credentials.'],
  ['Marketing choices', 'Email and mobile number, selected channels, consent evidence, preferences, confirmation and opt-out records that you provide or generate through those choices.'],
  ['Technical information', 'IP address, browser and device information, security logs and limited page or interaction information. Optional advertising and analytics collection follows the choices described below.'],
];

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      effective="October 19, 2026"
      lead={IDENTITY}
      sections={[]}
      related={[
        { label: 'Cookie Notice', href: '/legal/cookies' },
        { label: 'Text Messaging Terms', href: '/legal/text-messages' },
        { label: 'Privacy request', href: '/privacy-request' },
        { label: 'Marketing Preferences', href: '/marketing-preferences' },
        { label: 'Terms of Service', href: '/legal/terms' },
        { label: 'Telehealth Informed Consent', href: '/legal/consent' },
      ]}
    >
      <div className="max-w-[68ch] border-t border-ink/10 pb-10 md:pb-14">
        <Section id="who-we-are-and-what-this-policy-covers" heading="Who we are and what this policy covers">
          <p>
            Eternal Longevity LLC operates etlongevity.com and the online care service described on this website. This
            policy explains how we collect, use, disclose and protect personal information when you visit, subscribe to
            marketing, complete an assessment, obtain services or contact us. Our service is for adults 18 and older in
            New Jersey, New York, Pennsylvania and Michigan.
          </p>
          <p>
            Our prescriber and dispensing pharmacy may have separate legal privacy obligations. When a clinical Notice of
            Privacy Practices applies, that notice explains the use and disclosure of protected health information. This
            website policy does not replace a required clinical notice or authorization.
          </p>
        </Section>

        <Section id="information-we-collect" heading="Information we collect">
          <div className="overflow-hidden rounded-inner ring-1 ring-ink/10">
            <table className="w-full text-left text-[15px] leading-[1.6]">
              <thead className="bg-milk text-[13px] font-medium text-ink/70">
                <tr>
                  <th scope="col" className="w-[34%] px-3 py-2.5 md:px-4">Category</th>
                  <th scope="col" className="px-3 py-2.5 md:px-4">Examples and sources</th>
                </tr>
              </thead>
              <tbody>
                {COLLECT.map(([cat, ex]) => (
                  <tr key={cat} className="border-t border-ink/10 align-top">
                    <th scope="row" className="px-3 py-3 font-semibold text-ink md:px-4">{cat}</th>
                    <td className="px-3 py-3 md:px-4">{ex}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="why-we-use-information" heading="Why we use information">
          <p>
            We use information to evaluate and provide care, communicate with you, support prescribing and pharmacy
            fulfillment, process payments, maintain records, protect accounts, prevent fraud, answer requests and comply
            with legal duties. We use marketing contact information to send the optional communications you choose. We use
            permitted technical information to operate the website and measure general marketing activity under the
            controls described in this policy.
          </p>
          <p>
            We collect only information reasonably needed for these purposes. A new incompatible use of sensitive
            information requires the consent or other lawful basis applicable to that use. We do not make final prescribing
            decisions solely through automated processing; clinical decisions remain with the licensed prescriber.
          </p>
        </Section>

        <Section id="health-information" heading="Health information privacy">
          <p>
            Health information includes assessment responses, symptoms, medical history, medications, photographs submitted
            for care, treatment requests, prescriptions, medical communications and information that reasonably reveals a
            health condition or treatment. We use it for the care, payment, fulfillment, security and required
            recordkeeping purposes described above.
          </p>
          <p>
            We do not sell or license health information. We do not provide assessment answers, diagnoses, prescriptions,
            treatment selections, medical messages or patient lists to Meta, TikTok, Google or other advertising platforms.
            We do not use health information to create advertising audiences. Cookie consent is not authorization to
            disclose health information for advertising.
          </p>
          <p>
            We obtain sensitive-data consent when required and keep it separate from optional marketing and advertising
            choices. Withdrawing optional marketing or tracking consent does not affect access to care. Withdrawing
            information needed to provide a service may prevent us from continuing that service; we will explain the
            effect. Required clinical, financial, security and legal records may still need to be retained.
          </p>
        </Section>

        <Section id="who-receives-information" heading="Who receives information">
          <p>
            We disclose information as needed to the prescriber and licensed dispensing pharmacy; payment, shipping,
            hosting, security, customer support and communication providers working on our behalf; and other recipients
            required by law or needed to protect legal rights and safety. We limit disclosures to the purpose involved and
            require appropriate contractual safeguards from service providers. Clinical vendors receive the additional
            agreements required for their actual role.
          </p>
          <p>
            Our payment processor is Frame Payments, which saves your card and processes payments. At checkout, Google
            Places suggests addresses as you type your shipping address; Google receives what you type in that field, not
            your health information.
          </p>
          <p>
            Advertising and analytics providers receive only the permitted public-page information described below after
            the applicable choice. They do not receive the clinical information or marketing contact lists prohibited
            above. A corporate transaction does not remove the privacy obligations and restrictions attached to
            information. We do not authorize a successor or affiliate to reuse marketing consent for unrelated senders.
          </p>
        </Section>

        <Section id="optional-advertising-and-analytics" heading="Optional advertising and analytics">
          <p>
            On specifically reviewed general marketing pages, and only after you opt in, we use Meta, TikTok and Google
            tools to measure visits and interactions. These tools may receive limited browser, device, IP address and
            permitted public-page interaction information. They do not run on treatment-specific or product pages,
            subscription or preference forms, assessments, checkout, payment, sign-in, account or patient-care pages.
          </p>
          <p>
            Certain disclosures of non-health information through advertising technologies may be treated as targeted
            advertising or a sale under applicable privacy laws even without a cash payment. You can decline or withdraw
            optional tracking through <Choices />. We honor Global Privacy Control as a decline of optional advertising and
            analytics. We do not sell sensitive health data or use it for health-based targeting. See the{' '}
            <Link href="/legal/cookies" className={a}>Cookie Notice</Link> for the tools and controls actually in use.
          </p>
        </Section>

        <Section id="email-and-text-marketing" heading="Email and text marketing">
          <p>
            Marketing email and SMS are optional and use separate enrollment choices. We send marketing under Eternal
            Longevity LLC using the channel choices you make. Unsubscribe from marketing email through its unsubscribe link
            or <Prefs />. Stop marketing texts by replying STOP or making another reasonable withdrawal request. You may
            also contact <Mail />.
          </p>
          <p>
            We do not sell, rent or disclose mobile numbers, SMS marketing opt-in information or text-message consent to
            affiliates or other third parties for their own marketing or promotional purposes. Providers may process this
            information solely to operate and support our messaging program, subject to contractual use limits. They do not
            acquire permission to market their own services to you. No mobile information will be shared with third
            parties or affiliates for marketing or promotional purposes. Text messaging originator opt-in data and consent
            will not be shared with any third parties.
          </p>
          <p>
            We maintain separate permissions for care, security and account communications. A marketing opt-out does not
            itself cancel treatment or all necessary service messages. We honor a broader communications request according
            to its scope and applicable rules. Do not send medical details by marketing SMS or email; use the secure care
            channel. See our <Link href="/legal/text-messages" className={a}>Text Messaging Terms</Link>.
          </p>
        </Section>

        <Section id="retention-and-security" heading="Retention and security">
          <p>
            We retain information only as long as reasonably needed for the purpose collected, required records, fraud
            prevention, disputes and legal obligations. The period varies by the record and applicable clinical, financial
            and legal requirements. Medical and order records are kept for as long as the law requires, typically at least
            seven years from your last order. We keep minimum consent and suppression evidence to demonstrate and honor
            your choices. We delete or de-identify information when retention is no longer needed, including through our
            vendor processes.
          </p>
          <p>
            We use appropriate administrative, technical and physical safeguards, including access controls and protection
            of information in transit and storage. No system can guarantee absolute security. We investigate incidents and
            provide notices required by applicable law. We do not request medical information in ordinary marketing forms.
          </p>
        </Section>

        <Section id="privacy-rights-and-requests" heading="Privacy rights and requests">
          <p>
            We offer users in New Jersey, New York, Pennsylvania and Michigan access, correction, deletion, a portable copy,
            consent withdrawal and advertising opt-out requests through <RequestLink /> or <Mail />. State legal rights and
            exceptions vary; our common process does not reduce additional rights available under applicable law. We do not
            use personal information for profiling that makes solely automated decisions with legal or similarly
            significant effects.
          </p>
          <p>
            We verify access, correction, deletion and copy requests using information reasonably needed to protect the
            requester. Advertising opt-outs do not require an account or identity verification. We explain any lawful
            retention exception or other reason we cannot fully fulfill a request. Exercising privacy choices will not
            result in unlawful discrimination or loss of care merely for declining marketing or optional tracking.
          </p>
          <p>
            You may use an authorized agent for an opt-out request where permitted by law. We may confirm the agent’s
            authority without imposing identity verification on an advertising opt-out. Use <RequestLink /> or <Mail /> and
            identify the request as an authorized-agent request.
          </p>
        </Section>

        <Section id="response-and-appeal-process" heading="Response and appeal process">
          <p>
            We respond to privacy requests within 45 days. When a permitted extension is needed, we notify you within the
            initial period, explain why and extend for no more than 45 additional days. You can appeal a denied request
            through the appeal option at <RequestLink /> or by emailing <Mail /> with Privacy Appeal in the subject. We
            respond to an appeal within 45 days and explain the outcome.
          </p>
          <p>
            For an unresolved appeal, we provide a way to contact the New Jersey Division of Consumer Affairs or another
            regulator appropriate to your residence and request. We act on consent withdrawal as soon as practicable and
            within 15 days where that rule applies. Marketing suppression and optional tracking withdrawal are implemented
            promptly through their direct controls.
          </p>
        </Section>

        <Section id="children-and-external-services" heading="Children and external services">
          <p>
            Our service and marketing subscriptions are intended for adults 18 and older. We do not knowingly enroll
            children or provide services to minors through this website. Contact us if a minor has submitted information.
            External sites and independently operated services have their own privacy notices; our links do not authorize
            them to receive information beyond what is disclosed and permitted.
          </p>
        </Section>

        <Section id="changes-and-contact" heading="Changes and contact">
          <p>
            We identify the effective version of this policy on the website and describe material changes. For material
            data-use changes, we provide at least 14 days of email and posted notice before they take effect, consistent
            with our existing notice commitment. We obtain any new consent required before a new use begins; continuing to
            browse does not substitute for required sensitive-data consent.
          </p>
          <p>
            Questions or privacy requests: <Mail />; <a href="tel:+12123444247" className={a}>(212) 344-4247</a>; Privacy
            Officer, Eternal Longevity LLC, 825 Riverview Drive, Floor 2, Totowa, NJ 07512. <Choices /> controls optional
            tracking. <Prefs /> controls promotional email and SMS. Clinical questions belong in the secure care channel.
          </p>
        </Section>
      </div>
    </LegalLayout>
  );
}
