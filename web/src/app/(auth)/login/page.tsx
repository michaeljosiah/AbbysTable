import type { Metadata } from 'next';

import { AuthShell } from '@/components/auth/AuthShell';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: "Sign in — Abby's Table",
  description: 'Sign in to manage your boxes, personalisations and deliveries.',
};

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Welcome back"
      title="The table is set."
      accent="Heat, eat, live well."
      points={['No MSG, no bouillon', 'No refined sugars', 'No seed oils']}
    >
      <LoginForm />
    </AuthShell>
  );
}
