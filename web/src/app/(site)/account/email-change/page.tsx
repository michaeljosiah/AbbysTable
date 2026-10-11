import { EmailChange } from '@/components/account/EmailChange';
import a from '@/components/account/Account.module.css';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Confirm your email address',
  referrer: 'no-referrer' as const,
  robots: { index: false, follow: false },
};
export default function EmailChangePage() {
  return (
    <div
      className={a.inner}
      style={{ maxWidth: 680, paddingTop: 36, paddingBottom: 64 }}
    >
      <EmailChange />
    </div>
  );
}
