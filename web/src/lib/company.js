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

export const REGISTERED = false;

export const COMPANY = {
  name: 'Orbital LLC',
  entityType: 'limited liability company',
  state: 'Delaware',                        // used in the prose sentence
  jurisdiction: 'Delaware, United States',  // used in the details table

  // From the stamped Certificate of Formation.
  fileNumber: '',        // e.g. '7654321'
  formed: '',            // e.g. '2026'

  // Public legal pages. Empty string = link is not rendered.
  legal: {
    terms: '',           // e.g. 'https://orbital-llc.com/terms.html'
    privacy: '',         // e.g. 'https://orbital-llc.com/privacy.html'
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
