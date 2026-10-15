import 'server-only';
import {
  abandonedCartEmail,
  approvedPayNowEmail,
  chargeFailedInternalEmail,
  checkinEmail,
  checkinFollowUpInternalEmail,
  dailyReportEmail,
  deliveredEmail,
  followupEmail,
  intakeClosedByTeamEmail,
  intakeNeedsInfoEmail,
  intakeReceivedTeamEmail,
  newVisitForDoctorEmail,
  noticeEmail,
  orderCancelledByTeamEmail,
  orderConfirmationEmail,
  orderReceivedEmail,
  passwordResetEmail,
  planNeedsReviewEmail,
  readyToPlaceEmail,
  refundedEmail,
  renewalFailedMemberEmail,
  renewalFailedTeamEmail,
  shippedEmail,
  unfinishedVisitEmail,
  visitCompleteEmail,
  welcomeEmail,
} from '@/lib/email';
import { SITE_URL } from '@/lib/site';

/*
 * Admin → Emails: every branded email the site sends, built by the same
 * functions the site uses (so a preview is exactly what goes out), with
 * sample data. A few short notices are written inline where they're sent;
 * those entries repeat their wording here and say where it lives.
 */

export type Audience = 'Patient' | 'Admin team' | 'Dr. Elder' | 'Account & security';

export interface TemplateEntry {
  id: string;
  audience: Audience;
  name: string;
  /** When it goes out, in plain words. */
  when: string;
  build: () => { subject: string; html: string };
}

const P = { firstName: 'Sam' };
const REF = '100421';
const ITEMS = [{ name: 'Finasteride + Minoxidil', qty: 1, amount: 66000 }];
const U = `${SITE_URL}/portal`;

const notice = (subject: string, n: Parameters<typeof noticeEmail>[0]) => () => ({ subject, html: noticeEmail(n) });

export const EMAIL_TEMPLATES: TemplateEntry[] = [
  // --- Patient, in the order of their journey ---
  { id: 'lead-1', audience: 'Patient', name: 'Finish your assessment (1 of 3)', when: 'Left their email in the assessment but made no account: about 1 hour, then 1 and 3 days later.', build: () => followupEmail({ stage: 'lead', step: 0, firstName: 'Sam', url: `${SITE_URL}/start` }) },
  { id: 'plan-1', audience: 'Patient', name: 'Your plan is ready (1 of 3)', when: 'Finished the assessment but didn’t check out: about 2 hours, then 1 and 3 days later.', build: () => followupEmail({ stage: 'plan', step: 0, firstName: 'Sam', url: `${SITE_URL}/checkout` }) },
  { id: 'cart', audience: 'Patient', name: 'Still thinking it over? (cart)', when: 'A returning member left something in their cart for a day (once).', build: () => abandonedCartEmail({ ...P, items: [{ name: 'Finasteride + Minoxidil', cadence: '12 month plan' }], cartUrl: `${SITE_URL}/checkout` }) },
  { id: 'order-received', audience: 'Patient', name: 'We’ve got your order', when: 'Only for an order that doesn’t need the health questions (rare). Normally their one order email is “Thanks, Dr. Elder is reviewing”.', build: () => orderReceivedEmail({ ...P, orderNumber: REF, items: ITEMS, shipping: 2000, discount: 2000, total: 66000, healthQuestions: false }) },
  { id: 'visit-reminder', audience: 'Patient', name: 'Your order is waiting on a few health questions', when: 'Ordered but didn’t answer the health questions: up to 3 (about 2 hours, 1 day, 3 days).', build: () => unfinishedVisitEmail({ ...P, visitUrl: `${U}/visit` }) },
  { id: 'visit-complete', audience: 'Patient', name: 'Thanks, Dr. Elder is reviewing your order', when: 'Their one email at order time: right after they answer the health questions (after paying).', build: () => visitCompleteEmail({ ...P, ordered: true, orders: [{ ref: REF, totalCents: 68000 }] }) },
  { id: 'prescriber-message', audience: 'Patient', name: 'You have a message from your prescriber', when: 'Dr. Elder asks a question, asks for photos, or declines. (Wording lives in lib/orders-db.ts.)', build: notice('You have a message from your prescriber', { eyebrow: 'Your care team', heading: 'You have a message from your prescriber', body: 'Sign in to read it and reply. We keep it in your portal rather than in email, for your privacy.', cta: { label: 'Read it in your portal', href: `${U}/messages?thread=doctor` } }) },
  { id: 'needs-info', audience: 'Patient', name: 'One more thing before your review', when: 'Admin asks the patient for more information on their assessment.', build: () => intakeNeedsInfoEmail({ ...P, portalUrl: `${U}/messages?thread=support`, inThread: true, note: '' }) },
  { id: 'pay-now', audience: 'Patient', name: 'You’re approved. One quick step on payment', when: 'Approved, but the card failed or there’s no card on file (then 2 reminders).', build: () => approvedPayNowEmail({ ...P, orderNumber: REF, total: 68000, payUrl: `${SITE_URL}/pay/sample` }) },
  { id: 'confirmed', audience: 'Patient', name: 'You’re all set: order confirmed (receipt)', when: 'Payment goes through after approval.', build: () => orderConfirmationEmail({ ...P, orderNumber: REF, items: ITEMS, shipping: 2000, discount: 2000, total: 66000 }) },
  { id: 'shipped', audience: 'Patient', name: 'It’s on its way (shipped)', when: 'The pharmacy ships it (tracking added).', build: () => shippedEmail({ ...P, orderRef: REF, carrier: 'UPS', tracking: '1Z999AA10123456784' }) },
  { id: 'delivered', audience: 'Patient', name: 'It’s here (delivered)', when: 'The carrier marks it delivered.', build: () => deliveredEmail({ ...P, orderRef: REF }) },
  { id: 'care-message', audience: 'Patient', name: 'You have a new message from your care team', when: 'The team or Dr. Elder replies in their messages. (Wording lives in lib/messages-db.ts.)', build: notice('You have a new message from your care team', { eyebrow: 'Messages', heading: 'You have a new message from your care team', body: 'Sign in to read it and reply. We keep messages in your portal rather than in email, for your privacy.', cta: { label: 'Read it in your portal', href: `${U}/messages` } }) },
  { id: 'checkin', audience: 'Patient', name: 'How’s it going? (30-day check-in)', when: '30 days after their first delivery or refill.', build: () => checkinEmail({ ...P, checkinUrl: `${SITE_URL}/checkin/sample` }) },
  { id: 'renew', audience: 'Patient', name: 'Your plan is ready to renew', when: 'Their prescription ran its term, so the next refill needs a quick review.', build: () => planNeedsReviewEmail({ ...P, productName: 'Finasteride + Minoxidil', portalUrl: U }) },
  { id: 'renewal-failed', audience: 'Patient', name: 'Your refill payment didn’t go through', when: 'A renewal charge is declined.', build: () => renewalFailedMemberEmail({ ...P, productName: 'Finasteride + Minoxidil' }) },
  { id: 'refund', audience: 'Patient', name: 'Your refund is on its way', when: 'An order is refunded (declined, cancelled, or by admin).', build: () => refundedEmail({ ...P, orderNumber: REF, amount: 68000, full: true }) },
  { id: 'cancelled', audience: 'Patient', name: 'We cancelled your order', when: 'Admin cancels an order.', build: () => orderCancelledByTeamEmail({ ...P, orderNumber: REF, reason: 'Sample reason.', refunded: true }) },
  { id: 'intake-closed', audience: 'Patient', name: 'About your visit (closed)', when: 'Admin closes their assessment.', build: () => intakeClosedByTeamEmail({ ...P, reason: 'Sample reason.' }) },

  // --- Admin team inbox ---
  { id: 'team-intake', audience: 'Admin team', name: 'New intake to review', when: 'A new assessment is finished.', build: () => intakeReceivedTeamEmail('case_sample', 'sam@example.com', 'Sam Sample') },
  { id: 'team-order-placed', audience: 'Admin team', name: 'New order placed', when: 'Any order is placed (it waits on the health questions). (Wording lives in lib/release-to-doctor.ts.)', build: notice(`New order placed — Order #${REF}`, { eyebrow: 'New order', heading: 'Sam Sample placed an order', body: 'It is waiting on their health questions (asked right after checkout). It goes to the prescriber the moment they finish. Nothing is charged until he signs.', rows: [['Order', `Order #${REF}`], ['Member', 'Sam Sample']], cta: { label: 'Open orders', href: `${SITE_URL}/portal/admin/fulfillment` } }) },
  { id: 'team-order-review', audience: 'Admin team', name: 'New order for review (with Dr. Elder)', when: 'The patient answered the health questions and the order went to Dr. Elder.', build: notice(`New order for review — Order #${REF}`, { eyebrow: 'New order', heading: 'Sam Sample placed an order', body: 'They finished their health questions, so it is with the prescriber now. Nothing is charged until he signs.', rows: [['Order', `Order #${REF}`], ['Member', 'Sam Sample']], cta: { label: 'Open orders', href: `${SITE_URL}/portal/admin/fulfillment` } }) },
  { id: 'team-charge-failed', audience: 'Admin team', name: 'Charge failed on a signed order', when: 'Dr. Elder approved but the card was declined.', build: () => chargeFailedInternalEmail({ orderNumber: REF, memberName: 'Sam Sample', memberEmail: 'sam@example.com', amount: 68000, reason: 'Card declined' }) },
  { id: 'team-ready', audience: 'Admin team', name: 'Ready to place (pharmacy)', when: 'A paid order needs to be placed with the pharmacy by hand.', build: () => readyToPlaceEmail({ orderRef: REF, patientName: 'Sam Sample', items: 'Finasteride + Minoxidil', refill: false, portalUrl: `${SITE_URL}/portal/admin/fulfillment` }) },
  { id: 'team-renewal-failed', audience: 'Admin team', name: 'Refill not charged', when: 'A renewal charge failed (Dr. Elder gets it too).', build: () => renewalFailedTeamEmail({ patientName: 'Sam Sample', patientEmail: 'sam@example.com', productName: 'Finasteride + Minoxidil', amountCents: 33000, reason: 'Card declined' }) },
  { id: 'team-checkin', audience: 'Admin team', name: 'Check-in needs a follow-up', when: 'A patient gives a low rating or leaves a comment at their check-in.', build: () => checkinFollowUpInternalEmail({ memberName: 'Sam Sample', memberEmail: 'sam@example.com', productName: 'Finasteride + Minoxidil', kind: 'first', rating: 2, comment: 'Sample comment.', adminUrl: `${SITE_URL}/portal/admin/checkins` }) },
  { id: 'team-daily', audience: 'Admin team', name: 'Daily report', when: 'Every night (Dr. Elder gets it too).', build: () => dailyReportEmail({ dateLabel: 'Wednesday, 15 October 2026', signups: 4, intakes: 3, orders: 2, revenueCents: 136000, prescriptionsSigned: 1, shipmentsSent: 1, pendingIntakes: 1, pendingFulfillment: 0, awaitingTracking: 1, trackingLate: 0, refillsTomorrow: 0, pausedPlans: 0 }) },

  // --- Dr. Elder ---
  { id: 'dr-visit', audience: 'Dr. Elder', name: 'Visit ready for review (also a text)', when: 'An order is ready for him: only after the patient answers the health questions.', build: () => newVisitForDoctorEmail({ firstName: 'Bader', memberName: 'Sam Sample', orderNumber: REF, queueUrl: `${SITE_URL}/portal/doctor` }) },
  { id: 'dr-reply', audience: 'Dr. Elder', name: 'New patient reply (also a text)', when: 'A patient writes to him. (Wording lives in lib/messages-db.ts.)', build: notice('New patient reply', { eyebrow: 'Patient messages', heading: 'A patient replied.', body: 'Open the portal to read it and reply.', cta: { label: 'Open messages', href: `${SITE_URL}/portal/doctor/messages` } }) },

  // --- Account & security ---
  { id: 'reset', audience: 'Account & security', name: 'Reset your password', when: 'Someone asks for a password reset (or admin sends one).', build: () => passwordResetEmail(`${SITE_URL}/auth/reset?sample`) },
  { id: 'staff-welcome', audience: 'Account & security', name: 'Your account is ready (staff)', when: 'Admin creates a staff or member account.', build: () => welcomeEmail({ fullName: 'Sam Sample', email: 'sam@example.com', setPasswordUrl: `${SITE_URL}/auth/reset?sample`, role: 'doctor' }) },
  { id: 'code', audience: 'Account & security', name: 'Sign-in code', when: 'Two-step sign-in. (Wording lives in lib/mfa.ts.)', build: notice('482913 is your Eternal Longevity sign-in code', { eyebrow: 'Sign-in code', heading: 'Your code is 482913', body: 'Hi Sam — enter this to finish signing in. It expires in 10 minutes.', footnote: 'If you did not just try to sign in, someone has your password. Reply to this email and we will lock the account.' }) },
  { id: 'device', audience: 'Account & security', name: 'New sign-in (staff)', when: 'A staff account signs in from a new device. (Wording lives in lib/device-alert.ts.)', build: notice('New sign-in to your Eternal Longevity account', { eyebrow: 'Security', heading: 'A new device signed in', body: 'Someone signed in to your admin account from a device we have not seen before.', cta: { label: 'Change your password', href: `${SITE_URL}/forgot-password` } }) },
];

/** Every text message the site sends (Twilio). Exact wording from the code. */
export const SMS_TEMPLATES: { to: string; when: string; text: string; rule: string }[] = [
  { to: 'Patient', when: 'Their order ships', text: 'Your Eternal Longevity order Order #100421 has shipped. UPS tracking: 1Z999AA10123456784', rule: 'Only if they ticked the optional text box' },
  { to: 'Patient', when: 'The care team or Dr. Elder replies', text: `Eternal Longevity: you have a new message from your care team. Sign in to read it: ${SITE_URL}/portal/messages`, rule: 'Only if they ticked the optional text box' },
  { to: 'Dr. Elder', when: 'An order is ready for review', text: `Eternal Longevity: a visit is ready for review, Order #100421. ${SITE_URL}/portal/doctor`, rule: 'No patient name (texts are not covered by the BAA)' },
  { to: 'Dr. Elder', when: 'An order has waited over a day', text: `Eternal Longevity: 1 visit waited over a day for review. ${SITE_URL}/portal/doctor`, rule: 'At most once a day' },
  { to: 'Dr. Elder', when: 'A patient replies to him', text: `Eternal Longevity: a patient replied. ${SITE_URL}/portal/doctor/messages`, rule: 'At most every 15 minutes' },
  { to: 'Dr. Elder', when: 'Photos he asked for arrive', text: `Eternal Longevity: photos you requested have arrived. ${SITE_URL}/portal/doctor`, rule: '' },
];
