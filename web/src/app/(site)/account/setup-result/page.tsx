import { StatusMessage } from '@/components/status/StatusMessage';
import { CONTACT_HREF } from '@/lib/content/navigation';

export const metadata = { title: 'Account setup — Abby’s Table', robots: { index: false, follow: false } };
export default function Page() {
  return <StatusMessage
    kind="notFound" mark="link" eyebrow="Account setup"
    title="We couldn’t finish setting up your account."
    lede="Your order is not affected. Open your original setup email and try its link again. If it has expired, you can request a new link there. Use the same email address as your order and complete email verification."
    primary={{ label: 'Contact us', href: CONTACT_HREF }}
    secondary={{ label: 'Log in', href: '/login' }}
  />;
}
