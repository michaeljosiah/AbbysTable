/**
 * Element ids the Contact page's server markup and its client controls share.
 * In a plain module: a constant exported from a 'use client' file reaches a
 * Server Component as a client reference, not as the string.
 */

/** The opening-hours block: the Phone card's disclosure controls it below 1024. */
export const HOURS_PANEL_ID = 'contact-hours';

/** The block's heading: "See opening hours" moves focus here from 1024. */
export const HOURS_HEADING_ID = 'contact-hours-heading';

/** The message form's column: the phone layout's "Send a message" card jumps here. */
export const SEND_ID = 'send';
