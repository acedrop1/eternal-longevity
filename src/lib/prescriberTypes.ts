/**
 * Shapes and constants shared with the browser.
 *
 * Kept apart from `prescriber.ts` because that reaches the database and is
 * server-only; the edit form needs the credential list and the record type, and
 * importing them from there dragged the admin client into a client bundle.
 */

export interface PrescriberRecord {
  id: string | null;
  name: string;
  credential: string;
  /** "Bader Elder, DO" — what appears on a prescription and on the site. */
  display: string;
  npi: string;
  licenseState: string;
  licenseNumber: string;
  licenseExpires: string;
  email: string;
  phone: string;
}

export const CREDENTIALS = ['MD', 'DO', 'NP', 'PA', 'PharmD'] as const;
