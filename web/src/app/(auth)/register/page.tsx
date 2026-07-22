import type { Metadata } from 'next';

import { AuthShell } from '@/components/auth/AuthShell';
import { RegisterForm } from '@/components/auth/RegisterForm';

export const metadata: Metadata = {
  title: "Create an account — Abby's Table",
  description: 'Join the table: save your boxes, personalisations and delivery details.',
};

export default function RegisterPage() {
  return (
    <AuthShell
      eyebrow="Join the table"
      title="Pull up a chair."
      accent="Cooked from scratch, in small batches."
      points={['No MSG, no bouillon', 'No refined sugars', 'No seed oils']}
    >
      <RegisterForm />
    </AuthShell>
  );
}
