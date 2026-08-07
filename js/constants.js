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

  /* ---------- Flow ----------
     Screen order: mobile → OTP → basic details → income details → offer.
     Mobile and OTP sit ahead of the stepper, so only the last three screens
     map onto a stepper node. */
  var STEP = { MOBILE: 0, OTP: 1, BASIC: 2, EMPLOYMENT: 3, OFFERS: 4, SUCCESS: 5 };

  var STEPPER = ['Basic Details', 'Income Details', 'Approved Offer'];

  var STEPPER_NODE = {};
  STEPPER_NODE[STEP.BASIC] = 0;
  STEPPER_NODE[STEP.EMPLOYMENT] = 1;
  STEPPER_NODE[STEP.OFFERS] = 2;
  STEPPER_NODE[STEP.SUCCESS] = 2;

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
    { id: 'bp1', logo: 'assets/brand/partners/p1.svg', name: 'Bank Partner 1', tag: 'NBFC · Personal Loan', badge: 'B1',
      rate: 10.99, tenure: 36, multiple: 12, cap: 1500000, pill: 'Lowest EMI' },
    { id: 'bp2', logo: 'assets/brand/partners/p2.svg', name: 'Bank Partner 2', tag: 'Bank · Personal Loan', badge: 'B2',
      rate: 12.50, tenure: 24, multiple: 15, cap: 2000000, pill: 'Instant disbursal' },
    { id: 'bp3', logo: 'assets/brand/partners/p3.svg', name: 'Bank Partner 3', tag: 'NBFC · Personal Loan', badge: 'B3',
      rate: 14.25, tenure: 48, multiple: 18, cap: 1000000, pill: 'Highest amount' }
  ];

  /* ---------- Lending partners ----------
     Placeholder entries. Grievance contacts use the reserved example.com domain
     so nothing here can route to a real person.
     TODO: replace with each lender's real regulatory disclosure before launch. */
  var PARTNERS = [
    { badge: 'B1', logo: 'assets/brand/partners/p1.svg', name: 'Bank Partner 1', legal: 'Bank Partner 1 Finance Limited',
      officer: 'Grievance Officer', email: 'grievance@bankpartner1.example', phone: '1800 000 001' },
    { badge: 'B2', logo: 'assets/brand/partners/p2.svg', name: 'Bank Partner 2', legal: 'Bank Partner 2 Capital Limited',
      officer: 'Grievance Officer', email: 'grievance@bankpartner2.example', phone: '1800 000 002' },
    { badge: 'B3', logo: 'assets/brand/partners/p3.svg', name: 'Bank Partner 3', legal: 'Bank Partner 3 Financial Services Limited',
      officer: 'Grievance Officer', email: 'grievance@bankpartner3.example', phone: '1800 000 003' },
    { badge: 'B4', logo: 'assets/brand/partners/p4.svg', name: 'Bank Partner 4', legal: 'Bank Partner 4 Fincorp Limited',
      officer: 'Grievance Officer', email: 'grievance@bankpartner4.example', phone: '1800 000 004' },
    { badge: 'B5', logo: 'assets/brand/partners/p5.svg', name: 'Bank Partner 5', legal: 'Bank Partner 5 Services Limited',
      officer: 'Grievance Officer', email: 'grievance@bankpartner5.example', phone: '1800 000 005' },
    { badge: 'B6', logo: 'assets/brand/partners/p6.svg', name: 'Bank Partner 6', legal: 'Bank Partner 6 Bank Limited',
      officer: 'Grievance Officer', email: 'grievance@bankpartner6.example', phone: '1800 000 006' }
  ];

  /* ---------- Digital lending partners ---------- */
  var DLA_PARTNERS = [
    { badge: 'D1', logo: 'assets/brand/partners/dla1.svg', name: 'Digital Partner 1', legal: 'Digital Partner 1 Technologies Private Limited',
      officer: 'Nodal Officer', email: 'nodal@digitalpartner1.example', phone: '1800 000 011' },
    { badge: 'D2', logo: 'assets/brand/partners/dla2.svg', name: 'Digital Partner 2', legal: 'Digital Partner 2 Limited',
      officer: 'Nodal Officer', email: 'nodal@digitalpartner2.example', phone: '1800 000 012' }
  ];

  /* TODO: replace with real, consented customer testimonials before launch. */
  var REVIEWS = [
    { badge: 'AS', avatar: 'assets/brand/avatars/a1.svg', name: 'A. Sharma', city: 'Pune',
      text: 'The entire application took under ten minutes and I never had to upload a single document. The offer I picked was disbursed the same day.' },
    { badge: 'R M', avatar: 'assets/brand/avatars/a2.svg', name: 'R. Mehta', city: 'Bengaluru',
      text: 'I compared three offers side by side and chose the one with the EMI that fit my budget. No hidden charges anywhere in the process.' },
    { badge: 'PK', avatar: 'assets/brand/avatars/a3.svg', name: 'P. Kulkarni', city: 'Mumbai',
      text: 'Applied on my phone during a lunch break. The OTP verification was instant and the approval came through before I got back to my desk.' }
  ];

  return {
    BRAND: BRAND, STEP: STEP, STEPPER: STEPPER, STEPPER_NODE: STEPPER_NODE, TIMING: TIMING,
    RULES: RULES, PATTERNS: PATTERNS, OFFERS: OFFERS,
    PARTNERS: PARTNERS, DLA_PARTNERS: DLA_PARTNERS, REVIEWS: REVIEWS
  };
})();
