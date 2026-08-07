/* ==========================================================================
   Activ Paisa — loan product definitions
   One object per product drives its landing page, calculators and application
   flow, so a new product is a config entry rather than a new page of code.
   ========================================================================== */

var APProducts = (function () {
  'use strict';

  /* Shared application steps. `when` narrows a step to certain products. */
  var STEP_LIBRARY = {
    mobile:   { id: 'mobile',   label: 'Verify',    title: 'Start your application',
                sub: 'We only need your mobile number to begin.' },
    otp:      { id: 'otp',      label: 'Verify',    title: 'Confirm it’s you',
                sub: 'Enter the 6-digit code we sent you.' },
    personal: { id: 'personal', label: 'Personal',  title: 'Personal details',
                sub: 'As they appear on your PAN.' },
    address:  { id: 'address',  label: 'Address',   title: 'Current address',
                sub: 'Where you live today.' },
    profile:  { id: 'profile',  label: 'Profile',   title: 'Your profile',
                sub: 'This decides which lenders can consider you.' },
    loan:     { id: 'loan',     label: 'Loan',      title: 'Loan requirement',
                sub: 'Tell us what you need and for how long.' },
    documents:{ id: 'documents',label: 'Documents', title: 'Upload documents',
                sub: 'Clear photos or PDFs, up to 5 MB each.' },
    review:   { id: 'review',   label: 'Review',    title: 'Review and submit',
                sub: 'Check everything before it goes to the lender.' },

    /* short flow: identity and income, then a confirmation — no offers shown */
    basic:    { id: 'basic',    label: 'Basic Details',
                title: 'A few details to find your best offer', sub: '' },
    income:   { id: 'income',   label: 'Income Details', title: 'Income details',
                sub: '', quietTitle: true }
  };

  var ORDER = ['mobile', 'otp', 'personal', 'address', 'profile', 'loan', 'documents', 'review'];

  /* ---------- Field sets ---------- */
  function personalFields() {
    return [
      { name: 'fullName', label: 'Full name (as on PAN)', type: 'text', rule: 'name', span: 2 },
      { name: 'dob',      label: 'Date of birth',         type: 'date', rule: 'dob' },
      { name: 'pan',      label: 'PAN',                   type: 'pan',  rule: 'pan' },
      { name: 'email',    label: 'Email address',         type: 'email', rule: 'email' },
      { name: 'gender',   label: 'Gender',                type: 'choice', rule: 'required',
        options: ['Male', 'Female', 'Other'] }
    ];
  }

  function basicFields() {
    return [
      { name: 'gender',  label: 'Gender', type: 'choice', rule: 'required', span: 2,
        options: ['Male', 'Female'] },
      { name: 'email',   label: 'Email Address*', type: 'email', rule: 'email', span: 2 },
      { name: 'dob',     label: 'DOB (DD/MM/YYYY)*', type: 'date', rule: 'dob', span: 2 },
      { name: 'pincode', label: 'Pincode*', type: 'pincode', rule: 'pincode', span: 2 },
      { name: 'pan',     label: 'PAN*', type: 'pan', rule: 'pan', span: 2 }
    ];
  }

  function addressFields() {
    return [
      { name: 'addressLine', label: 'Address',      type: 'text', rule: 'org', span: 2 },
      { name: 'city',        label: 'City',         type: 'text', rule: 'name' },
      { name: 'pincode',     label: 'Pincode',      type: 'pincode', rule: 'pincode' },
      { name: 'residence',   label: 'Residence type', type: 'choice', rule: 'required', span: 2,
        options: ['Owned', 'Rented', 'Family owned'] }
    ];
  }

  /* ---------- Business loan ---------- */
  var BUSINESS = {
    id: 'business',
    slug: 'business-loan',
    name: 'Business Loan',
    eyebrow: 'Working capital, without the wait',
    heading: 'Business loans up to',
    amountLabel: '₹50 Lakhs',
    sub: 'Unsecured funding for growth, stock and cash flow — decided in days, not weeks.',
    highlights: [
      ['Loan range',    '₹50,000 – ₹50 Lakhs'],
      ['Interest from', '14% p.a.'],
      ['Tenure',        '12 to 60 months'],
      ['Collateral',    'Not required']
    ],
    calc: { min: 50000, max: 5000000, step: 50000, start: 1500000,
            rateMin: 14, rateMax: 26, rate: 16.5,
            tenureMin: 12, tenureMax: 60, tenure: 36 },
    eligibility: { foir: 55, rate: 16.5, tenure: 36, minIncome: 50000,
                   incomeLabel: 'Average monthly turnover' },
    benefits: [
      ['Unsecured', 'No property or machinery pledged. Your assets stay yours.'],
      ['Flexible drawdown', 'Take what you need now and come back for the rest later.'],
      ['Decisions in days', 'Most applications get an answer within 48 working hours.'],
      ['Prepay without penalty', 'Clear the balance early on most partner products at no extra cost.'],
      ['Books, not just bureau', 'Lenders read your bank statements and GST filings, not only your score.'],
      ['One application', 'Compare several lenders from a single form.']
    ],
    criteria: [
      ['Business vintage', 'At least 24 months of continuous operation'],
      ['Annual turnover', '₹10 Lakhs and above'],
      ['Applicant age', '23 to 65 years at maturity'],
      ['Entity type', 'Proprietorship, partnership, LLP or private limited'],
      ['Filings', 'GST registered where turnover requires it'],
      ['Credit history', 'No active default; score of 700+ preferred']
    ],
    documents: [
      { id: 'pan',   label: 'Business PAN',           hint: 'PAN of the entity, or your own if a proprietorship' },
      { id: 'kyc',   label: 'Proprietor KYC',         hint: 'Aadhaar or passport, both sides' },
      { id: 'bank',  label: 'Bank statements',        hint: 'Last 12 months, current account, PDF' },
      { id: 'gst',   label: 'GST returns',            hint: 'Last 4 quarters, if registered' },
      { id: 'proof', label: 'Business proof',         hint: 'Registration certificate, Udyam or shop licence' }
    ],
    profileFields: [
      { name: 'businessName', label: 'Registered business name', type: 'text', rule: 'org', span: 2 },
      { name: 'entityType',   label: 'Entity type', type: 'select', rule: 'required',
        options: ['Proprietorship', 'Partnership', 'LLP', 'Private Limited'] },
      { name: 'vintage',      label: 'Years in business', type: 'select', rule: 'required',
        options: ['Under 2 years', '2 to 5 years', '5 to 10 years', 'Over 10 years'] },
      { name: 'turnover',     label: 'Average monthly turnover', type: 'money', rule: 'turnover' },
      { name: 'gstin',        label: 'GSTIN (optional)', type: 'gstin', rule: 'gstinOptional' }
    ],
    faq: [
      ['Do I need to pledge collateral?',
       'No. Every product we source is unsecured, so nothing of yours is charged to the lender. That does mean the interest rate sits above a secured loan, because the lender is carrying more risk.'],
      ['How long does a decision take?',
       'Most applications get an answer within 48 working hours once your bank statements are in. Incomplete documents are the usual reason it takes longer.'],
      ['Will applying affect my credit score?',
       'Seeing your indicative offers does not. A hard enquiry is only raised when you accept an offer and the lender formally underwrites it.'],
      ['Can I repay early?',
       'On most partner products, yes, without a penalty after the first few instalments. The exact terms are in the sanction letter — read that section before you sign.'],
      ['My business is under two years old. Any options?',
       'Vintage under 24 months narrows the panel considerably. It is worth applying, but expect fewer offers and a higher rate.'],
      ['What if my GST filings are behind?',
       'Lenders read filings as a signal of how the business is run. Bring them up to date first; it materially improves the offers you see.']
    ],
    reviews: [
      ['Restocked ahead of the season without touching our overdraft. The statement upload was the only fiddly part and support walked us through it.', 'Retail, Surat'],
      ['We compared four offers side by side. Picking on total cost rather than headline rate saved us a meaningful amount over three years.', 'Logistics, Pune'],
      ['Sanctioned in two days. What I valued was being told plainly which documents were missing instead of a vague rejection.', 'Manufacturing, Coimbatore']
    ],
    compare: [
      { name: 'Short term', tenure: 12, rate: 14.0, note: 'Lowest total interest, highest instalment' },
      { name: 'Balanced',   tenure: 36, rate: 16.5, note: 'Most commonly chosen', featured: true },
      { name: 'Long term',  tenure: 60, rate: 19.0, note: 'Easiest monthly load, most interest paid' }
    ]
  };

  /* ---------- Home loan ---------- */
  var HOME = {
    id: 'home',
    slug: 'home-loan',
    name: 'Home Loan',
    eyebrow: 'For the place you are going to live in',
    heading: 'Home loans up to',
    amountLabel: '₹5 Crores',
    sub: 'Long tenures, competitive rates and a balance transfer if you are already paying too much.',
    highlights: [
      ['Loan range',    '₹5 Lakhs – ₹5 Crores'],
      ['Interest from', '8.35% p.a.'],
      ['Tenure',        'Up to 30 years'],
      ['Funding',       'Up to 90% of property value']
    ],
    calc: { min: 500000, max: 50000000, step: 100000, start: 5000000,
            rateMin: 8.35, rateMax: 12, rate: 8.85,
            tenureMin: 60, tenureMax: 360, tenure: 240 },
    eligibility: { foir: 50, rate: 8.85, tenure: 240, minIncome: 25000,
                   incomeLabel: 'Net monthly income' },
    benefits: [
      ['Tenure up to 30 years', 'Spread the cost far enough that the instalment fits your salary.'],
      ['Up to 90% funding', 'Lower deposit needed on eligible properties.'],
      ['Balance transfer', 'Move an existing loan across and stop overpaying on an old rate.'],
      ['Top-up available', 'Borrow against the equity you have already built.'],
      ['Joint applications', 'Add a co-applicant to raise the amount you qualify for.'],
      ['Tax relief', 'Interest and principal both attract deductions under the Income Tax Act.']
    ],
    criteria: [
      ['Applicant age', '21 to 65 years at maturity'],
      ['Employment', '2 years salaried, or 3 years self-employed'],
      ['Net monthly income', '₹25,000 and above'],
      ['Credit score', '700 and above preferred'],
      ['Property', 'Clear, marketable title with approved plans'],
      ['Own contribution', 'From 10% of property value']
    ],
    documents: [
      { id: 'kyc',      label: 'Identity and address', hint: 'PAN plus Aadhaar, passport or voter ID' },
      { id: 'income',   label: 'Income proof',         hint: 'Three payslips, or two years of ITR if self-employed' },
      { id: 'bank',     label: 'Bank statements',      hint: 'Last 6 months of your salary account' },
      { id: 'property', label: 'Property papers',      hint: 'Sale agreement, title deed, approved plan' },
      { id: 'existing', label: 'Existing loan statement', hint: 'Only for a balance transfer' }
    ],
    profileFields: [
      { name: 'employment', label: 'Employment type', type: 'choice', rule: 'required', span: 2,
        options: ['Salaried', 'Self-employed'] },
      { name: 'employer',   label: 'Employer or business name', type: 'text', rule: 'org', span: 2 },
      { name: 'income',     label: 'Net monthly income', type: 'money', rule: 'income' },
      { name: 'obligations',label: 'Existing EMIs per month', type: 'money', rule: 'obligationsOptional' }
    ],
    loanExtraFields: [
      { name: 'propertyCity',  label: 'Property city', type: 'text', rule: 'name' },
      { name: 'propertyValue', label: 'Estimated property value', type: 'money', rule: 'propertyValue' },
      { name: 'purpose',       label: 'Purpose', type: 'select', rule: 'required', span: 2,
        options: ['Buying a ready property', 'Buying under construction', 'Construction on own plot',
                  'Balance transfer', 'Top-up on existing loan'] }
    ],
    faq: [
      ['How much can I actually borrow?',
       'Two ceilings apply and the lower one wins: a share of the property value, and what your income supports once existing EMIs are counted. The eligibility calculator on this page works out the second.'],
      ['What is the deposit?',
       'Usually from 10% of property value, rising for higher amounts or under-construction property. Registration and stamp duty sit outside the loan and are paid by you.'],
      ['Fixed or floating rate?',
       'Most home loans in India are floating and move with the lender’s benchmark. Fixed is available on some products and costs more at the outset in return for certainty.'],
      ['Is a balance transfer worth it?',
       'It depends on how much tenure is left and the processing fee to move. With several years remaining and a rate gap above roughly half a percent, it usually is. We can model both before you commit.'],
      ['Can I add a co-applicant?',
       'Yes, and it often raises the sanctioned amount because both incomes count. A co-applicant is equally liable for repayment, so agree that clearly first.'],
      ['What are the tax benefits?',
       'Interest and principal both attract deductions under the Income Tax Act, with limits that depend on whether you occupy the property. Confirm your own position with a tax adviser — we do not give tax advice.']
    ],
    reviews: [
      ['The eligibility figure here matched the sanction almost exactly, so there was no unpleasant surprise at the end.', 'Salaried, Bengaluru'],
      ['Moved an old loan across and cut the rate meaningfully. Being shown the fee against the saving made the decision easy.', 'Balance transfer, Hyderabad'],
      ['Self-employed applications usually mean endless paperwork. The checklist told me exactly what to bring up front.', 'Self-employed, Jaipur']
    ],
    compare: [
      { name: '10 years', tenure: 120, rate: 8.60, note: 'Least interest overall, largest instalment' },
      { name: '20 years', tenure: 240, rate: 8.85, note: 'Most commonly chosen', featured: true },
      { name: '30 years', tenure: 360, rate: 9.15, note: 'Smallest instalment, most interest paid' }
    ]
  };

  /* ---------- Personal loan ---------- */
  var PERSONAL = {
    id: 'personal',
    slug: 'index',
    name: 'Personal Loan',
    /* mobile and OTP sit ahead of the stepper; confirmation is its final node */
    flow: ['mobile', 'otp', 'basic', 'income'],
    stepper: ['Basic Details', 'Income Details', 'Confirmation'],
    stepperNode: { basic: 0, income: 1, done: 2 },
    calc: { min: 50000, max: 5000000, step: 25000, start: 800000,
            rateMin: 9.99, rateMax: 24, rate: 12.5,
            tenureMin: 12, tenureMax: 60, tenure: 36 },
    eligibility: { foir: 50, rate: 12.5, tenure: 36, minIncome: 15000,
                   incomeLabel: 'Net monthly income' },
    documents: [
      { id: 'pan',    label: 'PAN card',         hint: 'A clear photo of the card itself' },
      { id: 'kyc',    label: 'Address proof',    hint: 'Aadhaar, passport or voter ID, both sides' },
      { id: 'salary', label: 'Salary slips',     hint: 'Your last 3 months' },
      { id: 'bank',   label: 'Bank statements',  hint: 'Last 6 months of your salary account' }
    ],
    incomeFields: [
      { name: 'employment', label: 'How you earn', type: 'choice', rule: 'required', span: 2,
        options: ['Salaried', 'Self-employed'] },
      { name: 'company',    label: 'Company Name*', type: 'text', rule: 'org', span: 2 },
      { name: 'income',     label: 'Monthly Income*', type: 'money', rule: 'income', span: 2 },
      { name: 'household',  label: 'Annual Household Income*', type: 'money', rule: 'household', span: 2 }
    ],
    compare: [
      { name: '12 months', tenure: 12, rate: 10.99, note: 'Least interest, largest instalment' },
      { name: '36 months', tenure: 36, rate: 12.50, note: 'Most commonly chosen', featured: true },
      { name: '60 months', tenure: 60, rate: 14.25, note: 'Smallest instalment, most interest paid' }
    ]
  };

  /* Assemble the step list for a product. `flow` overrides the default order. */
  function stepsFor(product) {
    return (product.flow || ORDER).map(function (id) {
      var base = STEP_LIBRARY[id];
      var step = { id: base.id, label: base.label, title: base.title, sub: base.sub, fields: [] };
      step.quietTitle = !!base.quietTitle;
      if (id === 'personal') step.fields = personalFields();
      if (id === 'basic') {
        step.fields = basicFields();
        step.submitLabel = 'Proceed';
      }
      if (id === 'address')  step.fields = addressFields();
      if (id === 'profile')  step.fields = product.profileFields.slice();
      if (id === 'income') {
        step.fields = product.incomeFields.slice();
        step.declarations = true;      // residency and restricted-industry
        step.submitLabel = 'Get Offer Now';
      }
      if (id === 'loan') {
        step.fields = [
          { name: 'amount', label: 'Amount required', type: 'money', rule: 'amount' },
          { name: 'tenure', label: 'Preferred tenure', type: 'select', rule: 'required',
            options: product.id === 'home'
              ? ['10 years', '15 years', '20 years', '25 years', '30 years']
              : ['12 months', '24 months', '36 months', '48 months', '60 months'] }
        ].concat(product.loanExtraFields || []);
      }
      return step;
    });
  }

  return {
    BUSINESS: BUSINESS,
    HOME: HOME,
    stepsFor: stepsFor,
    PERSONAL: PERSONAL,
    byId: function (id) {
      if (id === 'home') return HOME;
      if (id === 'personal') return PERSONAL;
      return BUSINESS;
    }
  };
})();
