import type { Metadata } from 'next';

import { AuthPage } from '@/components/auth/AuthPage';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export const metadata: Metadata = {
  title: "Reset your password — Abby's Table",
  description: 'Get a link to choose a new Abby’s Table password.',
};

export default function ForgotPasswordPage() {
  return (
    <AuthPage
      title="Reset your password"
      lede="Enter the email address you use for Abby’s Table and we’ll send you a link to choose a new password."
    >
      <ForgotPasswordForm />
    </AuthPage>
  );
}
