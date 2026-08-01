/**
 * The legal entity behind FleetView — single source of truth.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  REGISTERED is false until the Delaware Certificate of Formation is filed
 *  and stamped. While it is false, no entity claim renders anywhere on the
 *  site.
 *
 *  Do not flip it early. Stating that a company is "a Delaware limited
 *  liability company" before formation is a false statement of corporate
 *  status, and using "LLC" in a name that isn't registered is unlawful in
 *  a number of states. The credibility this is meant to create is precisely
 *  what evaporates when someone checks the Delaware register and finds
 *  nothing there.
 *
 *  To go live once the certificate is back:
 *    1. set REGISTERED to true
 *    2. fill fileNumber and formed from the stamped certificate
 *    3. set legal.terms / legal.privacy to the live URLs (leave them empty
 *       and the links simply won't render — an entity line with dead legal
 *       links looks worse than no links)
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Flip this to true once the Certificate of Formation is stamped.
 * This is the real switch — the one that affects what the public sees.
 */
const ENTITY_FORMED = false;

/**
 * Preview escape hatch. `npm run build:entity-preview` sets this and writes to
 * a separate folder, so you can see exactly how the entity sections look
 * without touching the real build or making any public claim.
 */
const PREVIEWING = import.meta.env.VITE_ENTITY_PREVIEW === '1';

export const REGISTERED = ENTITY_FORMED || PREVIEWING;

export const COMPANY = {
  name: 'Orbital LLC',
  entityType: 'limited liability company',
  state: 'Delaware',                        // used in the prose sentence
  jurisdiction: 'Delaware, United States',  // used in the details table

  // From the stamped Certificate of Formation.
  fileNumber: '',        // from the stamped certificate — leave empty until you have it
  formed: '13 May 2026',

  // Company website. Empty string = link is not rendered.
  site: 'https://starfleetapp.github.io/orbital', // e.g. 'https://orbital-llc.com'

  // Public legal pages. Empty string = link is not rendered.
  legal: {
    terms: 'https://starfleetapp.github.io/orbital/terms.html', // e.g. 'https://orbital-llc.com/terms.html'
    privacy: 'https://starfleetapp.github.io/orbital/privacy.html', // e.g. 'https://orbital-llc.com/privacy.html'
  },
};

/** One-line entity statement, or null when not yet registered. */
export function entityLine() {
  if (!REGISTERED) return null;
  return `${COMPANY.name}, a ${COMPANY.state} ${COMPANY.entityType}`;
}

/** Legal links that actually have URLs. Empty array renders nothing. */
export function legalLinks() {
  if (!REGISTERED) return [];
  return [
    ['Terms', COMPANY.legal.terms],
    ['Privacy', COMPANY.legal.privacy],
  ].filter(([, href]) => Boolean(href));
}
