/** React-free presentation of the real loyalty ledger; pence and points are integers. */
export function pointsMilestone(balance: number, seen = 0) {
  const mark = Math.floor(Math.max(0, balance) / 500);
  return {
    mark,
    reached: mark > seen,
    nextPence: (mark + 1) * 500,
    toGo: (mark + 1) * 500 - balance,
    percent: (balance % 500) / 5,
  };
}
export function pointsTitle(kind: string): string {
  return (
    (
      {
        Earn: 'Points earned',
        Earned: 'Points earned',
        Redeem: 'Points used',
        Redeemed: 'Points used',
        RefundEarn: 'Refund adjustment',
        RefundRedeem: 'Points returned',
        Adjust: 'Points adjusted',
        Adjustment: 'Points adjusted',
      } as Record<string, string>
    )[kind] ?? 'Points activity'
  );
}
export function readBenefitsPage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value && /^[1-9]\d{0,5}$/.test(value) ? Number(value) : 1;
}
export function accountDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/London',
  }).format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value));
}
