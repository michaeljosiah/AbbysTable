import type { Metadata } from 'next';
import Link from 'next/link';
import { unstable_rethrow } from 'next/navigation';
import { GiftResend } from '@/components/account/GiftResend';
import a from '@/components/account/Account.module.css';
import { getMySentGiftCards, type SentGiftCards } from '@/lib/aonik/sentGifts';
import { requireSignedIn, redirectToLogin } from '@/lib/auth/guard';
import { SessionExpiredError } from '@/lib/auth/server';
import { accountDate, readBenefitsPage } from '@/lib/account/benefits';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Gift cards — Abby’s Table' };
const STATUS: Record<string, string> = {
  Pending: 'Pending',
  Ready: 'Preparing',
  Sending: 'Sending',
  Enclosed: 'Enclosed',
  Scheduled: 'Scheduled',
  Sent: 'Sent',
  Posted: 'Posted',
  Failed: 'Delivery failed',
  Cancelled: 'Cancelled',
  Queued: 'Queued',
  Dispatching: 'Sending',
  Delivered: 'Delivered',
};
export default async function GiftsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const page = readBenefitsPage((await searchParams).page),
    href = `/account/gifts?page=${page}`;
  await requireSignedIn(href);
  let gifts: SentGiftCards | undefined;
  try {
    gifts = await getMySentGiftCards(page);
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof SessionExpiredError) redirectToLogin(href);
  }
  return (
    <section className={a.section} aria-labelledby="ac-h-gifts">
      <h2 className={a.h2} id="ac-h-gifts">
        Gift cards
      </h2>
      <p className={a.sub}>
        Gift cards you’ve sent. Gift boxes are listed in{' '}
        <Link
          href="/account/orders"
          className={a.textLink}
          style={{ minHeight: 0, display: 'inline' }}
        >
          Orders
        </Link>
        .
      </p>
      {!gifts ? (
        <div className={a.notice}>
          <p className={a.p}>
            We couldn’t load your gift cards. Please try again later.
          </p>
          <Link href={href} className={a.textLink}>
            Try again
          </Link>
        </div>
      ) : !gifts.items.length ? (
        <div className={a.empty}>
          <p className={a.p}>You haven’t sent a gift card yet.</p>
          <Link href="/gifting" className={a.pill}>
            Send a gift
          </Link>
        </div>
      ) : (
        <div className={a.list}>
          {gifts.items.map((g) => {
            const post = g.deliveryMethod === 'Post';
            const date = post
              ? g.postingDate
              : (g.lastSentAtUtc ?? g.sendAtUtc);
            return (
              <article
                className={a.card}
                key={g.deliveryId}
                aria-labelledby={`gift-${g.deliveryId}`}
              >
                <div className={a.ordTop}>
                  <span className={a.ordNo}>
                    {post
                      ? 'By post'
                      : g.deliveryMethod === 'InBox'
                        ? 'In your box'
                        : 'By email'}
                  </span>
                  <span
                    className={a.status}
                    data-k={
                      ['Sent', 'Posted', 'Enclosed', 'Delivered'].includes(
                        g.status,
                      )
                        ? 'done'
                        : undefined
                    }
                  >
                    {STATUS[g.status] ?? 'Status unavailable'}
                  </span>
                </div>
                <div className={a.ordBody}>
                  <h3 className={a.cardTitle} id={`gift-${g.deliveryId}`}>
                    {new Intl.NumberFormat('en-GB', {
                      style: 'currency',
                      currency: g.currency,
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    }).format(g.faceValue)}{' '}
                    gift card
                  </h3>
                  <p className={a.p}>To {g.recipientName}</p>
                  <p className={a.smallP}>
                    {[
                      date ? accountDate(date) : null,
                      g.maskedRecipientEmail,
                      g.maskedCode,
                      g.expiresAtUtc
                        ? `Expires ${accountDate(g.expiresAtUtc)}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                {g.canResend && !post ? <GiftResend id={g.deliveryId} /> : null}
                {post ? (
                  <div className={a.actions}>
                    <Link href="/contact" className={a.textLink}>
                      <span>Not arrived? Contact us</span>
                      <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
      {gifts && gifts.totalCount > gifts.pageSize ? (
        <nav className={a.paging} aria-label="Gift card pages">
          {gifts.page > 1 ? (
            <Link href={`/account/gifts?page=${gifts.page - 1}`}>Previous</Link>
          ) : null}
          <span>Page {gifts.page}</span>
          {gifts.page * gifts.pageSize < gifts.totalCount ? (
            <Link href={`/account/gifts?page=${gifts.page + 1}`}>Next</Link>
          ) : null}
        </nav>
      ) : null}
      <div className={a.card} style={{ display: 'grid', gap: 6 }}>
        <p className={a.p}>
          <b style={{ color: 'var(--green-forest)', fontWeight: 600 }}>
            Received a gift card?
          </b>{' '}
          Enter its code at checkout.
        </p>
        <Link href="/gifting" className={a.textLink}>
          <span>Send another gift</span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
