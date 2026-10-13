import { completeAccountSetup } from '@/lib/auth/accountSetup';
import { clearBoxChoice } from '@/lib/cart/adoptionChoice';
import { adoptBoxCart } from '@/lib/cart/server';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const outcome = await completeAccountSetup(new URL(request.url).searchParams);
  let destination = '/account/setup-result?status=' + outcome;
  if (outcome === 'complete') {
    await clearBoxChoice();
    const adopted = await adoptBoxCart();
    destination = adopted === 'choice-required' ? '/account/box-choice?next=%2Faccount' : '/account';
  }
  return new Response(null, {
    status: 303,
    headers: {
      Location: destination, 'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
