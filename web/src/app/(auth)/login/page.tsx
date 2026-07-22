import type { Metadata } from 'next';

import { AuthShell } from '@/components/auth/AuthShell';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: "Sign in — Abby's Table",
  description: 'Sign in to manage your boxes, personalisations and deliveries.',
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  // Where to land afterwards, when something bounced the customer here. The
  // action re-validates it — an absolute URL would be an open redirect.
  const params = await searchParams;
  const raw = params.next;
  const next = Array.isArray(raw) ? raw[0] : raw;

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="The table is set."
      accent="Heat, eat, live well."
      points={['No MSG, no bouillon', 'No refined sugars', 'No seed oils']}
    >
      <LoginForm next={next} />
    </AuthShell>
  );
}
