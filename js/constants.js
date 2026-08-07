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

  /* ---------- Lending partners ----------
     Partner contact details are not published on the card. Each lender's own
     grievance route is reachable through its Grievance Redressal link, so
     nothing here has to stand in for details we do not hold.

     `logo` is optional — without one a neutral initials tile is used. */
  function lender(initials, name, legal, extra) {
    var row = { initials: initials, name: name, legal: legal };
    if (extra) for (var k in extra) row[k] = extra[k];
    return row;
  }

  var PARTNERS = [
    lender('ES', 'EarlySalary',        'EarlySalary Services Private Limited', { logo: 'assets/brand/partners/earlysalary.svg' }),
    lender('AB', 'Aditya Birla',       'Aditya Birla Capital Limited', { logo: 'assets/brand/partners/aditya-birla.svg' }),
    lender('LT', 'L&T Finance',        'L&T Finance Limited', { logo: 'assets/brand/partners/lt-finance.svg' }),
    lender('BX', 'Bhanix Finance',     'Bhanix Finance and Investment Limited', { logo: 'assets/brand/partners/bhanix.svg' }),
    lender('SC', 'Si Creva',           'Si Creva Capital Service Private Limited', { logo: 'assets/brand/partners/si-creva.svg' }),
    lender('BJ', 'Bajaj Finserv',      'Bajaj Finserv Limited', { logo: 'assets/brand/partners/bajaj-finserv.svg' }),
    lender('IC', 'InCred',             'InCred Financial Services Limited', { logo: 'assets/brand/partners/incred.svg' }),
    lender('PF', 'Poonawalla Fincorp', 'Poonawalla Fincorp Limited', { logo: 'assets/brand/partners/poonawalla.svg' }),
    lender('KB', 'KrazyBee',           'KrazyBee Services Limited', { logo: 'assets/brand/partners/krazybee.svg' }),
    lender('HB', 'HDFC Bank',          'HDFC Bank Limited', { logo: 'assets/brand/partners/hdfc-bank.svg' }),
    lender('CS', 'Credit Saison',      'Credit Saison India Private Limited', { logo: 'assets/brand/partners/credit-saison.svg' }),
    lender('OL', 'Olyv',               'Olyv', { logo: 'assets/brand/partners/olyv.png' }),
    lender('ZY', 'Zype',               'Zype', { logo: 'assets/brand/partners/zype.png' }),
    lender('FP', 'FatakPay',           'FatakPay', { logo: 'assets/brand/partners/fatakpay.svg' }),
    lender('RF', 'Ramfincorp',         'Ramfincorp', { logo: 'assets/brand/partners/ramfincorp.png' })
  ];

  /* ---------- Digital lending partners ---------- */
  var DLA_PARTNERS = [
    lender('DT', 'Dreamplug', 'Dreamplug Technologies Private Limited', { logo: 'assets/brand/partners/dreamplug.svg' }),
    lender('MV', 'Moneyview', 'Moneyview Limited', { logo: 'assets/brand/partners/moneyview.png' })
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
    BRAND: BRAND,
    PARTNERS: PARTNERS, DLA_PARTNERS: DLA_PARTNERS, REVIEWS: REVIEWS
  };
})();
