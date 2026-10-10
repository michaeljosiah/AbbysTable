import type { Metadata } from 'next';

import { AuthPage } from '@/components/auth/AuthPage';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: "Log in — Abby's Table",
  description: 'Log in to your Abby’s Table account.',
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Log in (#33). Inside the site chrome like every rebuilt page, and it does not
 * redirect a signed-in visitor away: "Log in" in the header becomes "My
 * Account" once there is a session, so nothing sends them here, and one who
 * arrives by a saved link can still sign in as someone else.
 */
export default async function LoginPage({ searchParams }: PageProps) {
  // Where to land afterwards, when something bounced the customer here. The
  // action re-validates it — an absolute URL would be an open redirect.
  const params = await searchParams;
  const raw = params.next;
  const next = Array.isArray(raw) ? raw[0] : raw;

  return (
    <AuthPage title="Welcome back" lede="Log in to your Abby’s Table account.">
      <LoginForm next={next} />
    </AuthPage>
  );
}
