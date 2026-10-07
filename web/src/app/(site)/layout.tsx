import { SiteChrome } from '@/components/layout/SiteChrome';

/** Marketing chrome: announcement bar, header, footer. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <SiteChrome>{children}</SiteChrome>;
}
