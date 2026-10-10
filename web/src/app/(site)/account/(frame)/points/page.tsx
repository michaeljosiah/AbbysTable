import type { Metadata } from 'next';
import Link from 'next/link';
import { unstable_rethrow } from 'next/navigation';
import { PointsBalance } from '@/components/account/PointsBalance';
import { PointsCalculator } from '@/components/account/PointsCalculator';
import a from '@/components/account/Account.module.css';
import s from '@/components/account/Benefits.module.css';
import { getAonikClient } from '@/lib/aonik/client';
import {
  getMyLoyaltyBalance,
  getMyLoyaltyHistory,
  type LoyaltyBalance,
  type LoyaltyHistory,
} from '@/lib/aonik/loyalty';
import { requireSignedIn, redirectToLogin } from '@/lib/auth/guard';
import { SessionExpiredError } from '@/lib/auth/server';
import {
  accountDate,
  pointsTitle,
  readBenefitsPage,
} from '@/lib/account/benefits';
import { formatPrice } from '@/lib/format';
import type { BoxPricing } from '@/lib/aonik/types';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Points — Abby’s Table' };
export default async function PointsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const page = readBenefitsPage((await searchParams).page),
    href = `/account/points?page=${page}`;
  await requireSignedIn(href);
  let balance: LoyaltyBalance | undefined,
    history: LoyaltyHistory | undefined,
    pricing: BoxPricing | undefined;
  const results = await Promise.allSettled([
    getMyLoyaltyBalance(),
    getMyLoyaltyHistory(page),
    getAonikClient().then((client) => client.getBoxPricing()),
  ]);
  for (const result of results)
    if (result.status === 'rejected') {
      unstable_rethrow(result.reason);
      if (result.reason instanceof SessionExpiredError) redirectToLogin(href);
    }
  if (results[0].status === 'fulfilled') balance = results[0].value;
  if (results[1].status === 'fulfilled') history = results[1].value;
  if (results[2].status === 'fulfilled') pricing = results[2].value;
  return (
    <section className={a.section} aria-labelledby="ac-h-points">
      <h2 className={a.h2} id="ac-h-points">
        Points
      </h2>
      {balance ? (
        <PointsBalance balance={balance} />
      ) : (
        <div className={a.notice}>
          <p className={a.p}>
            We couldn’t load your points balance. Please try again later.
          </p>
          <Link className={a.textLink} href={href}>
            Try again
          </Link>
        </div>
      )}
      <div className={a.card}>
        <h3 className={a.cardTitle} style={{ marginBottom: 16 }}>
          How points work
        </h3>
        <ol className={s.how}>
          <li>
            <span className={s.howN} aria-hidden="true">
              1
            </span>
            <span>
              <span className={s.howT}>Earn 2 points for every £1 spent</span>
              <span className={s.howD}>
                Earn points on dishes, Signature upgrades, extras and gift cards
                you buy. Delivery and personalised greeting cards don’t earn
                points.
              </span>
            </span>
          </li>
          <li>
            <span className={s.howN} aria-hidden="true">
              2
            </span>
            <span>
              <span className={s.howT}>100 points = £1 off</span>
              <span className={s.howD}>
                Use your points towards up to 20% of an order. There’s no
                minimum amount to redeem, and your points never expire.
              </span>
            </span>
          </li>
          <li>
            <span className={s.howN} aria-hidden="true">
              3
            </span>
            <span>
              <span className={s.howT}>Use your points at checkout</span>
              <span className={s.howD}>
                Your points are added once your order is confirmed, ready to use
                next time. If an order is cancelled or refunded, the points
                earned on the refunded amount will be adjusted accordingly.
              </span>
            </span>
          </li>
        </ol>
      </div>
      {balance && pricing ? (
        <PointsCalculator
          pricing={pricing}
          available={balance.availablePoints}
        />
      ) : null}
      <h3 className={a.h3}>History</h3>
      {history ? (
        history.items.length ? (
          <ul className={s.hist}>
            {history.items.map((h) => (
              <li key={h.id}>
                <span className={s.histT}>{pointsTitle(h.kind)}</span>
                <span className={s.histV}>
                  {h.points > 0 ? '+' : h.points < 0 ? '−' : ''}
                  {Math.abs(h.points).toLocaleString('en-GB')}{' '}
                  <small>· {formatPrice(Math.abs(h.points))}</small>
                </span>
                <span className={s.histD}>{accountDate(h.occurredAtUtc)}</span>
                <span className={s.histR}>
                  Balance {h.runningBalancePoints.toLocaleString('en-GB')}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className={a.empty}>
            <p className={a.p}>Your points history will appear here.</p>
          </div>
        )
      ) : (
        <p className={a.p}>
          We couldn’t load your points history. Please try again later.
        </p>
      )}
      {history && history.totalCount > history.pageSize ? (
        <nav className={a.paging} aria-label="Points history pages">
          {history.page > 1 ? (
            <Link href={`/account/points?page=${history.page - 1}`}>
              Previous
            </Link>
          ) : null}
          <span>Page {history.page}</span>
          {history.page * history.pageSize < history.totalCount ? (
            <Link href={`/account/points?page=${history.page + 1}`}>Next</Link>
          ) : null}
        </nav>
      ) : null}
    </section>
  );
}
