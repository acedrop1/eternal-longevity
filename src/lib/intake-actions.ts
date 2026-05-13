'use server';

/**
 * Receives a completed intake and "submits" it. In production this should:
 *   1. Validate against the schema server-side (don't trust client validation)
 *   2. Persist to the database
 *   3. Enqueue an email to the care team with a routable link
 *   4. Send an acknowledgement email to the patient
 *   5. Create a Stripe customer (no charge yet — payment happens in portal)
 *
 * For the demo: we log the submission and simulate a short network delay so
 * the wizard's "Submit intake" button shows a meaningful spinner.
 */

export interface IntakeSubmitResult {
  ok: boolean;
  /** Server-issued opaque ID we'd use for the welcome email + portal link. */
  caseId?: string;
  error?: string;
}

export async function submitIntakeAction(
  // Answers come from the wizard. We keep it untyped here because the wizard
  // stores Record<string, unknown> and we let the destination decide how to
  // normalize. In production, validate with Zod against intakeSchema.
  answers: Record<string, unknown>
): Promise<IntakeSubmitResult> {
  // Basic sanity check — make sure goals and email are present.
  if (!answers || typeof answers !== 'object') {
    return { ok: false, error: 'Missing payload.' };
  }
  const email = answers.email;
  if (typeof email !== 'string' || !email.includes('@')) {
    return { ok: false, error: 'A valid email is required.' };
  }

  // === BEGIN: stand-ins for real backend work (Phase 2) ===
  // TODO: validate full payload with Zod (against intakeSchema)
  // TODO: persist to Supabase `intakes` table (with RLS scoped to member id)
  // TODO: notify care team via Postmark (HIPAA BAA available)
  // TODO: send patient acknowledgement email via Postmark
  // TODO: createStripeCustomer({ email }) and store id on the member row
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log('[Intake submission]', JSON.stringify(answers, null, 2));
  }

  await new Promise((resolve) => setTimeout(resolve, 700));
  // === END ===

  const caseId = `case_${Math.random().toString(36).slice(2, 9)}`;
  return { ok: true, caseId };
}
