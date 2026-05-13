'use server';

import { redirect } from 'next/navigation';
import { DEMO_USERS } from './auth';
import { clearSession, setSession } from './auth-server';

/** Form-action signature: FormData → redirect. */
export async function loginAction(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');

  const user = DEMO_USERS.find(
    (u) => u.email.toLowerCase() === email && u.password === password
  );

  if (!user) {
    redirect('/login?error=invalid');
  }

  await setSession(user.role);
  redirect(user.redirectTo);
}

export async function logoutAction(): Promise<void> {
  await clearSession();
  redirect('/login');
}
