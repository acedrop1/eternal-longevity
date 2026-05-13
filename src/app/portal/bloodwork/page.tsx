import { redirect } from 'next/navigation';

/**
 * Bloodwork upload is no longer a portal feature.
 * Any visit to /portal/bloodwork sends the user back to the dashboard.
 */
export default function BloodworkRedirect() {
  redirect('/portal');
}
