/* ==========================================================================
   Activ Paisa — application constants
   Plain script (no ES modules) so the site also runs from file:// without a server.
   ========================================================================== */

var AP = (function () {
  'use strict';

  /* ---------- Brand ---------- */
  var BRAND = {
    name: 'Activ Paisa',
    supportEmail: 'support@activpaisa.com',
    supportPhone: '1800 000 000'
  };

  /* ---------- Flow ---------- */
  var STEPS = ['Mobile', 'Details', 'Income', 'Verify', 'Offers'];

  var STEP = { MOBILE: 0, BASIC: 1, EMPLOYMENT: 2, OTP: 3, OFFERS: 4, SUCCESS: 5 };

  /* ---------- Timings (ms) ---------- */
  var TIMING = {
    submitDelay: 900,   // simulated network latency
    offersDelay: 1400,  // simulated offer fetch
    resendSeconds: 30,
    toastLife: 4000
  };

  /* ---------- Eligibility rules ---------- */
  var RULES = {
    minAge: 21,
    maxAge: 60,
    minMonthlyIncome: 15000,
    minHouseholdIncome: 100000,
    otpLength: 6
  };

  /* ---------- Validation patterns ---------- */
  var PATTERNS = {
    mobile: /^[6-9]\d{9}$/,
    pan: /^[A-Z]{5}[0-9]{4}[A-Z]$/,
    email: /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/,
    pincode: /^[1-9]\d{5}$/,
    company: /^[A-Za-z0-9][A-Za-z0-9 .,&()'-]{1,79}$/,
    digits: /^\d+$/
  };

  /* ---------- Offer catalogue ----------
     Placeholder partners. Amounts are illustrative and recalculated against the
     applicant's declared income in app.js.
     TODO: replace with live offers from the lending partner API. */
  var OFFERS = [
    { id: 'bp1', name: 'Bank Partner 1', tag: 'NBFC · Personal Loan', badge: 'B1',
      rate: 10.99, tenure: 36, multiple: 12, cap: 1500000, pill: 'Lowest EMI' },
    { id: 'bp2', name: 'Bank Partner 2', tag: 'Bank · Personal Loan', badge: 'B2',
      rate: 12.50, tenure: 24, multiple: 15, cap: 2000000, pill: 'Instant disbursal' },
    { id: 'bp3', name: 'Bank Partner 3', tag: 'NBFC · Personal Loan', badge: 'B3',
      rate: 14.25, tenure: 48, multiple: 18, cap: 1000000, pill: 'Highest amount' }
  ];

  /* ---------- Marketing content ---------- */
  var PARTNERS = [
    { badge: 'B1', name: 'Bank Partner 1', note: 'Personal loans from ₹50,000 to ₹15,00,000' },
    { badge: 'B2', name: 'Bank Partner 2', note: 'Tenures from 12 to 48 months' },
    { badge: 'B3', name: 'Bank Partner 3', note: 'Interest starting at 10.99% p.a.' }
  ];

  /* TODO: replace with real, consented customer testimonials before launch. */
  var REVIEWS = [
    { badge: 'AS', name: 'A. Sharma', city: 'Pune',
      text: 'The entire application took under ten minutes and I never had to upload a single document. The offer I picked was disbursed the same day.' },
    { badge: 'R M', name: 'R. Mehta', city: 'Bengaluru',
      text: 'I compared three offers side by side and chose the one with the EMI that fit my budget. No hidden charges anywhere in the process.' },
    { badge: 'PK', name: 'P. Kulkarni', city: 'Mumbai',
      text: 'Applied on my phone during a lunch break. The OTP verification was instant and the approval came through before I got back to my desk.' }
  ];

  return {
    BRAND: BRAND, STEPS: STEPS, STEP: STEP, TIMING: TIMING,
    RULES: RULES, PATTERNS: PATTERNS, OFFERS: OFFERS,
    PARTNERS: PARTNERS, REVIEWS: REVIEWS
  };
})();
