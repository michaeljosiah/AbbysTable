import type { Metadata } from 'next';

import { AuthShell } from '@/components/auth/AuthShell';
import { RegisterForm } from '@/components/auth/RegisterForm';

export const metadata: Metadata = {
  title: "Create an account — Abby's Table",
  description: 'Join the table: save your boxes, personalisations and delivery details.',
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function RegisterPage({ searchParams }: PageProps) {
  // Where to land afterwards, when something bounced the customer here. The
  // action re-validates it — an absolute URL would be an open redirect.
  const params = await searchParams;
  const raw = params.next;
  const next = Array.isArray(raw) ? raw[0] : raw;

  return (
    <AuthShell
      eyebrow="Join the table"
      title="Pull up a chair."
      accent="Cooked from scratch, in small batches."
      points={['No MSG, no bouillon', 'No refined sugars', 'No seed oils']}
    >
      <RegisterForm next={next} />
    </AuthShell>
  );
}
