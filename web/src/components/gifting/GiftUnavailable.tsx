import { StatusMessage } from '@/components/status/StatusMessage';

export function GiftUnavailable() {
  return <StatusMessage
    kind="notFound"
    mark="link"
    eyebrow="Gift cards"
    title="Gift-card purchasing is currently unavailable."
    lede="You can still choose dishes and send a food box."
    primary={{ label: 'Build a gift box', href: '/box?gift=1' }}
    secondary={{ label: 'Back to gifting', href: '/gifting' }}
  />;
}
