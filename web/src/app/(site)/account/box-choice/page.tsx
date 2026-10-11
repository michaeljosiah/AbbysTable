import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireSignedIn } from '@/lib/auth/guard';
import { loginPathFor, safePostAuthPath } from '@/lib/auth/redirect';
import { readBoxChoice } from '@/lib/cart/adoptionChoice';
import { chooseBoxAction } from '@/lib/account/boxChoiceActions';
import a from '@/components/account/Account.module.css';
export const dynamic = 'force-dynamic';
export default async function BoxChoicePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = await searchParams,
    next = safePostAuthPath(typeof p.next === 'string' ? p.next : '');
  await requireSignedIn(`/account/box-choice?next=${encodeURIComponent(next)}`);
  const choice = await readBoxChoice();
  if (!choice) redirect(next);
  return (
    <div
      className={a.inner}
      style={{ paddingTop: 36, paddingBottom: 64, maxWidth: 680 }}
    >
      <section className={a.card} aria-labelledby="box-choice-h">
        <h1 id="box-choice-h" className={a.h2}>
          Choose your box
        </h1>
        <p className={a.p}>
          You already have another box saved to your account. Which would you
          like to continue?
        </p>
        {p.state ? (
          <p className={a.problem} role="status">
            {p.state === 'refresh'
              ? 'Your saved boxes changed. Sign in again to refresh the choice; your current box has been kept.'
              : p.state === 'stale'
                ? 'Your boxes changed in another window. Please check them and choose again.'
                : 'We couldn’t save your choice. Please try again.'}
          </p>
        ) : null}
        {p.state === 'refresh' ? (
          <Link href={loginPathFor(next)} className={a.pill}>
            Sign in again
          </Link>
        ) : (
          <form action={chooseBoxAction} className={a.form}>
            <input type="hidden" name="next" value={next} />
            <div>
              <p className={a.p}>
                <b>This box</b> · {choice.guest.boxSize ?? 'Custom'} dishes ·{' '}
                {choice.guest.lineCount} selections
              </p>
              <button
                type="submit"
                name="decision"
                value="KeepGuest"
                className={a.pill}
              >
                Keep this box
              </button>
            </div>
            <div>
              <p className={a.p}>
                <b>Saved box</b> · {choice.saved.boxSize ?? 'Custom'} dishes ·{' '}
                {choice.saved.lineCount} selections
              </p>
              <button
                type="submit"
                name="decision"
                value="UseSaved"
                className={`${a.pill} ${a.pillOutline}`}
              >
                Use saved box
              </button>
            </div>
          </form>
        )}
        <Link href={next} className={a.textLink}>
          Decide later →
        </Link>
      </section>
    </div>
  );
}
