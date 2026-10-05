// Abby's Table — shared contact details.
//
// ONE source of truth for the WhatsApp number and the opening hours. Contact Us, the gift-card
// checkout and every checkout step read from here, so the pages can never disagree about how to
// reach us or whether anyone is there.
//
// PLACEHOLDER DATA — the number, the hours and the bank-holiday list are all unverified and must
// be confirmed before launch. Because they now live in one file, confirming them is one edit.

export const WHATSAPP_NUMBER = "+44 20 3875 1234";
export const WA_URL = "https://wa.me/442038751234";

// Local UK time, 24h. Index = Date.getDay() (0 = Sunday). null = closed all day.
export const HOURS = { 1: [9, 17], 2: [9, 17], 3: [9, 17], 4: [9, 17], 5: [9, 17], 6: [10, 14], 0: null };

export const HOURS_LABEL = "Mon–Fri 9am–5pm · Sat 10am–2pm · Sun closed";

// England & Wales. Dates are local calendar dates, not timestamps.
export const BANK_HOLIDAYS = [
  "2026-01-01", "2026-04-03", "2026-04-06", "2026-05-04", "2026-05-25",
  "2026-08-31", "2026-12-25", "2026-12-28",
];

// Built from LOCAL parts: toISOString() converts to UTC first and rolls the date over.
const iso = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");

export function isOpenNow(now) {
  const d = now || new Date();
  if (BANK_HOLIDAYS.indexOf(iso(d)) !== -1) return false;
  const win = HOURS[d.getDay()];
  if (!win) return false;
  const mins = d.getHours() * 60 + d.getMinutes();
  return mins >= win[0] * 60 && mins < win[1] * 60;
}

// Never promise a reply time while we are closed.
export function replyNote(now) {
  return isOpenNow(now)
    ? "Open now \u00B7 We usually reply within 4 hours"
    : "Closed now \u00B7 We\u2019ll reply when we reopen";
}
