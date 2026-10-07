import { SiteChrome } from '@/components/layout/SiteChrome';

/** Marketing chrome: the v2 header, drawer and footer. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <SiteChrome>{children}</SiteChrome>;
}
