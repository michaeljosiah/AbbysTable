import { aonikAuthedFetch } from '@/lib/auth/server';
export interface SentGiftCard {
  deliveryId: string;
  orderId: string;
  deliveryMethod: string;
  faceValue: number;
  currency: string;
  recipientName: string;
  maskedRecipientEmail: string | null;
  sendAtUtc: string | null;
  postingDate: string | null;
  status: string;
  lastSentAtUtc: string | null;
  maskedCode: string;
  expiresAtUtc: string | null;
  canResend: boolean;
}
export interface SentGiftCards {
  items: SentGiftCard[];
  totalCount: number;
  page: number;
  pageSize: number;
}
export function getMySentGiftCards(page = 1): Promise<SentGiftCards> {
  return aonikAuthedFetch(
    `/commerce/storefront/gift-cards?page=${page}&pageSize=20`,
    { forbiddenKeepsSession: true },
  );
}
export async function resendMyGiftCard(id: string): Promise<void> {
  await aonikAuthedFetch(
    `/commerce/storefront/gift-cards/${encodeURIComponent(id)}/resend`,
    { method: 'POST', ignoreBody: true, forbiddenKeepsSession: true },
  );
}
