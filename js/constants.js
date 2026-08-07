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
     Lender names confirmed by the business as existing partners.

     Grievance contacts are intentionally left as placeholders: each lender
     names its own officer in the partnership agreement, and a borrower has to
     be able to actually reach that person. Inventing one would put a name that
     does not exist against a regulated institution.

     `logo` is optional — drop the lender's own file into
     assets/brand/partners/ and set the path, otherwise a neutral initials
     tile stands in. We do not draw approximations of a lender's mark. */
  var TBD = { officer: 'To be published', email: 'To be published', phone: 'To be published' };

  function lender(initials, name, legal, extra) {
    var row = { initials: initials, name: name, legal: legal,
                officer: TBD.officer, email: TBD.email, phone: TBD.phone, pending: true };
    if (extra) for (var k in extra) row[k] = extra[k];
    return row;
  }

  var PARTNERS = [
    lender('ES', 'EarlySalary',        'EarlySalary Services Private Limited'),
    lender('AB', 'Aditya Birla',       'Aditya Birla Capital Limited'),
    lender('LT', 'L&T Finance',        'L&T Finance Limited'),
    lender('BX', 'Bhanix Finance',     'Bhanix Finance and Investment Limited'),
    lender('SC', 'Si Creva',           'Si Creva Capital Service Private Limited'),
    lender('BJ', 'Bajaj Finserv',      'Bajaj Finserv Limited'),
    lender('IC', 'InCred',             'InCred Financial Services Limited'),
    lender('PF', 'Poonawalla Fincorp', 'Poonawalla Fincorp Limited'),
    lender('KB', 'KrazyBee',           'KrazyBee Services Limited'),
    lender('HB', 'HDFC Bank',          'HDFC Bank Limited'),
    lender('CS', 'Credit Saison',      'Credit Saison India Private Limited'),
    lender('OL', 'Olyv',               'Olyv'),
    lender('ZY', 'Zype',               'Zype'),
    lender('FP', 'FatakPay',           'FatakPay'),
    lender('RF', 'Ramfincorp',         'Ramfincorp')
  ];

  /* ---------- Digital lending partners ---------- */
  var DLA_PARTNERS = [
    lender('DT', 'Dreamplug', 'Dreamplug Technologies Private Limited'),
    lender('MV', 'Moneyview', 'Moneyview Limited')
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
