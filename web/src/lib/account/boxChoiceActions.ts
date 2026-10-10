'use server';
import { redirect } from 'next/navigation';
import { chooseSignedInBox } from '@/lib/cart/server';
import { requireSignedIn } from '@/lib/auth/guard';
import { safePostAuthPath } from '@/lib/auth/redirect';
export async function chooseBoxAction(form: FormData): Promise<never> {
  const next = safePostAuthPath(String(form.get('next') ?? ''));
  await requireSignedIn(`/account/box-choice?next=${encodeURIComponent(next)}`);
  const decision = form.get('decision');
  if (decision !== 'KeepGuest' && decision !== 'UseSaved')
    redirect('/account/box-choice');
  const outcome = await chooseSignedInBox(decision);
  redirect(
    outcome === 'chosen'
      ? next
      : `/account/box-choice?next=${encodeURIComponent(next)}&state=${outcome}`,
  );
}
