/**
 * Copy for the emailed secure link's page. "Link no longer valid" is the
 * design's, verbatim (design: Link Expired); the other states are ours and
 * await sign-off. ONE message for expired and used.
 */
export const ACCESS_COPY = {
  title: "Secure link — Abby's Table",
  eyebrow: 'Secure link',
  login: 'Log in',
  checking: 'Checking your link…',
  gone: {
    heading: 'This link is no longer valid.',
    lede: 'For your security, this link has expired or has already been used.',
    send: 'Send a new link',
    sentHeading: 'Check your email',
    sentBody:
      'If this link belongs to an account, we’ve sent a new one. It can take a few minutes, so check your junk folder too.',
    sendFailed: 'We couldn’t send that just now. Please try again in a moment.',
    sendUnavailable: 'New links aren’t available yet. Please contact us and we’ll help.',
  },
  /** The link is good, but finishing set-up here needs the identity provider's sign-up hand-off. */
  ready: {
    heading: 'Your link is ready.',
    lede: 'We can’t finish setting up your account from this page yet. Your order is not affected.',
    contact: 'Contact us',
  },
  failed: {
    heading: 'We couldn’t check this link.',
    lede: 'Your link is unchanged. Please try again in a moment.',
    retry: 'Try again',
  },
  unavailable: {
    heading: 'Account links aren’t available yet.',
    lede: 'Nothing was checked or changed. Please contact us if you need a hand.',
  },
} as const;
