/**
 * Element ids shared by the server-rendered document and its client
 * navigation. A plain module (not 'use client') so both sides can import the
 * values.
 */

/** The page h1. "Back to top" links point here, and focus returns here. */
export const LEGAL_TOP_ID = 'top';

/** The grouped index — the one `nav` every presentation of it shares. */
export const LEGAL_INDEX_ID = 'legal-index';
