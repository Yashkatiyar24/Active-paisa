/* ==========================================================================
   Activ Paisa — application flow
   Demo build: no data leaves the browser. See TODO markers for the API seams.
   ========================================================================== */

(function (AP) {
  'use strict';

  var STEP = AP.STEP, RULES = AP.RULES, PATTERNS = AP.PATTERNS, TIMING = AP.TIMING;

  /* ---------- DOM helpers ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;   // textContent — never innerHTML
    return node;
  }

  var inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
  function money(n) { return '₹' + inr.format(Math.round(n)); }
  function digitsOnly(s) { return String(s).replace(/\D/g, ''); }

  /* ---------- State ---------- */
  var state = { step: STEP.MOBILE, data: {}, resendId: null };

  /* ==========================================================================
     Toasts
     ========================================================================== */
  var toastHost = $('#toasts');

  function toast(message, type) {
    var node = el('div', 'toast' + (type ? ' ' + type : ''), message);
    toastHost.appendChild(node);
    setTimeout(function () {
      node.classList.add('is-out');
      node.addEventListener('animationend', function () { node.remove(); });
    }, TIMING.toastLife);
  }

  /* ==========================================================================
     Validation
     ========================================================================== */
  function fieldOf(input) { return input.closest('.field'); }

  function setError(input, message) {
    var field = fieldOf(input);
    if (!field) return false;
    field.classList.add('has-error');
    var err = $('.error', field);
    if (err) err.textContent = message;
    input.setAttribute('aria-invalid', 'true');
    return false;
  }

  function clearError(input) {
    var field = fieldOf(input);
    if (!field) return true;
    field.classList.remove('has-error');
    var err = $('.error', field);
    if (err) err.textContent = '';
    input.removeAttribute('aria-invalid');
    return true;
  }

  function ageFrom(dobString) {
    var dob = new Date(dobString);
    if (isNaN(dob.getTime())) return NaN;
    var today = new Date();
    var age = today.getFullYear() - dob.getFullYear();
    var m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age;
  }

  /* Each validator returns true, or calls setError and returns false. */
  var validators = {
    mobile: function (input) {
      var v = digitsOnly(input.value);
      if (!v) return setError(input, 'Please enter your mobile number.');
      if (v.length !== 10) return setError(input, 'Mobile number must be 10 digits.');
      if (!PATTERNS.mobile.test(v)) return setError(input, 'Enter a valid Indian mobile number starting with 6-9.');
      return clearError(input);
    },

    consent: function (input) {
      if (!input.checked) return setError(input, 'Please accept the Terms and Privacy Policy to continue.');
      return clearError(input);
    },

    gender: function (input) {
      var picked = $('input[name="gender"]:checked');
      if (!picked) return setError(input, 'Please select your gender.');
      return clearError(input);
    },

    dob: function (input) {
      if (!input.value) return setError(input, 'Please enter your date of birth.');
      var age = ageFrom(input.value);
      if (isNaN(age)) return setError(input, 'Enter a valid date.');
      if (age < RULES.minAge) return setError(input, 'You must be at least ' + RULES.minAge + ' years old to apply.');
      if (age > RULES.maxAge) return setError(input, 'Applicants must be under ' + RULES.maxAge + ' years old.');
      return clearError(input);
    },

    email: function (input) {
      var v = input.value.trim();
      if (!v) return setError(input, 'Please enter your email address.');
      if (v.length > 254 || !PATTERNS.email.test(v)) return setError(input, 'Enter a valid email address.');
      return clearError(input);
    },

    pincode: function (input) {
      var v = digitsOnly(input.value);
      if (!v) return setError(input, 'Please enter your pincode.');
      if (!PATTERNS.pincode.test(v)) return setError(input, 'Enter a valid 6-digit pincode.');
      return clearError(input);
    },

    pan: function (input) {
      var v = input.value.trim().toUpperCase();
      if (!v) return setError(input, 'Please enter your PAN.');
      if (!PATTERNS.pan.test(v)) return setError(input, 'Enter a valid PAN, e.g. ABCDE1234F.');
      return clearError(input);
    },

    employment: function (input) {
      var picked = $('input[name="employment"]:checked');
      if (!picked) return setError(input, 'Please select your employment type.');
      return clearError(input);
    },

    company: function (input) {
      var v = input.value.trim();
      if (!v) return setError(input, 'Please enter your company name.');
      if (v.length < 2) return setError(input, 'Company name is too short.');
      if (!PATTERNS.company.test(v)) return setError(input, 'Company name contains unsupported characters.');
      return clearError(input);
    },

    income: function (input) {
      var v = digitsOnly(input.value);
      if (!v) return setError(input, 'Please enter your monthly income.');
      var n = parseInt(v, 10);
      if (n < RULES.minMonthlyIncome) {
        return setError(input, 'Minimum monthly income is ' + money(RULES.minMonthlyIncome) + '.');
      }
      if (n > 10000000) return setError(input, 'Please enter a realistic monthly income.');
      return clearError(input);
    },

    household: function (input) {
      var v = digitsOnly(input.value);
      if (!v) return setError(input, 'Please enter your annual household income.');
      var n = parseInt(v, 10);
      if (n < RULES.minHouseholdIncome) {
        return setError(input, 'Minimum annual household income is ' + money(RULES.minHouseholdIncome) + '.');
      }
      var monthly = parseInt(digitsOnly($('#income').value) || '0', 10);
      if (monthly && n < monthly * 12) {
        return setError(input, 'Household income cannot be less than your own annual income.');
      }
      if (n > 1000000000) return setError(input, 'Please enter a realistic household income.');
      return clearError(input);
    },

    declResident: function (input) {
      if (!input.checked) return setError(input, 'Please confirm this declaration to continue.');
      return clearError(input);
    },

    declIndustry: function (input) {
      if (!input.checked) return setError(input, 'Please confirm this declaration to continue.');
      return clearError(input);
    }
  };

  /* Validate every named control in a form. Returns true only if all pass. */
  function validateForm(form) {
    var ok = true;
    var firstBad = null;
    $$('[name]', form).forEach(function (input) {
      // radios: validate once, on the first of the group
      if (input.type === 'radio' && $('input[name="' + input.name + '"]', form) !== input) return;
      var fn = validators[input.name];
      if (!fn) return;
      if (!fn(input)) {
        ok = false;
        if (!firstBad) firstBad = input;
      }
    });
    if (firstBad) {
      firstBad.focus();
      toast('Some fields need another look.', 'error');
    }
    return ok;
  }

  /* Re-validate a field once it has already errored, so the message clears live. */
  function bindLiveValidation(form) {
    $$('[name]', form).forEach(function (input) {
      var fn = validators[input.name];
      if (!fn) return;
      var evt = (input.type === 'radio' || input.type === 'checkbox' || input.type === 'date') ? 'change' : 'blur';
      input.addEventListener(evt, function () { fn(input); });
      input.addEventListener('input', function () {
        var field = fieldOf(input);
        if (field && field.classList.contains('has-error')) fn(input);
      });
    });
  }

  /* ==========================================================================
     Input masking
     ========================================================================== */
  function maskNumeric(input, maxLen) {
    input.addEventListener('input', function () {
      var v = digitsOnly(input.value);
      if (maxLen) v = v.slice(0, maxLen);
      input.value = v;
    });
  }

  function maskMoney(input) {
    input.addEventListener('input', function () {
      var v = digitsOnly(input.value).slice(0, 9);
      input.value = v ? inr.format(parseInt(v, 10)) : '';
    });
  }

  /* ==========================================================================
     Step navigation
     ========================================================================== */
  var stepperShell = $('#stepper');
  var stepperList = $('#stepperList');

  var SVG_NS = 'http://www.w3.org/2000/svg';

  function checkMark() {
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    var path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', 'M5 12.5l4.5 4.5L19 7.5');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#fff');
    path.setAttribute('stroke-width', '3');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(path);
    return svg;
  }

  AP.STEPPER.forEach(function (label) {
    var li = el('li');
    var node = el('span', 'node');
    node.appendChild(checkMark());
    li.appendChild(node);
    li.appendChild(el('span', null, label));
    stepperList.appendChild(li);
  });

  function renderStepper() {
    var node = AP.STEPPER_NODE[state.step];
    var showing = node !== undefined;
    stepperShell.hidden = !showing;
    if (!showing) return;

    $$('li', stepperList).forEach(function (li, idx) {
      li.classList.toggle('is-done', idx < node);
      li.classList.toggle('is-current', idx === node);
      if (idx === node) li.setAttribute('aria-current', 'step');
      else li.removeAttribute('aria-current');
    });
  }

  function goTo(step) {
    state.step = step;
    $$('.step', $('#applyCard')).forEach(function (section) {
      section.hidden = Number(section.dataset.step) !== step;
    });
    renderStepper();

    var active = $('.step[data-step="' + step + '"]');
    // prefer the first real input over any inline button (e.g. OTP's "Change")
    var focusable = active && ($('input:not([type="hidden"])', active) || $('button', active));
    if (focusable) focusable.focus({ preventScroll: true });

    window.scrollTo(0, 0);
  }

  /* Async submit with a loading state on the button. */
  function withLoading(button, delay, done) {
    var label = button.textContent;
    button.classList.add('is-loading');
    button.disabled = true;
    button.textContent = '';
    setTimeout(function () {
      button.classList.remove('is-loading');
      button.disabled = false;
      button.textContent = label;
      done();
    }, delay);
  }

  /* ==========================================================================
     Step 1 — Mobile
     ========================================================================== */
  var formMobile = $('#formMobile');
  maskNumeric($('#mobile'), 10);
  bindLiveValidation(formMobile);

  formMobile.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validateForm(formMobile)) return;

    state.data.mobile = digitsOnly($('#mobile').value);
    withLoading($('button[type="submit"]', formMobile), TIMING.submitDelay, function () {
      // TODO: ask the backend to send the real OTP here.
      goTo(STEP.OTP);
      startOtp();
    });
  });

  /* ==========================================================================
     Step 2 — Basic details
     ========================================================================== */
  var formBasic = $('#formBasic');
  maskNumeric($('#pincode'), 6);
  bindLiveValidation(formBasic);

  $('#pan').addEventListener('input', function () {
    this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
  });

  // Cap the date picker to the eligible age window.
  (function boundDob() {
    var dob = $('#dob');
    var today = new Date();
    var max = new Date(today.getFullYear() - RULES.minAge, today.getMonth(), today.getDate());
    var min = new Date(today.getFullYear() - RULES.maxAge, today.getMonth(), today.getDate());
    dob.max = max.toISOString().slice(0, 10);
    dob.min = min.toISOString().slice(0, 10);
  })();

  formBasic.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validateForm(formBasic)) return;

    var picked = $('input[name="gender"]:checked');
    state.data.gender = picked ? picked.value : '';
    state.data.dob = $('#dob').value;
    state.data.email = $('#email').value.trim();
    state.data.pincode = digitsOnly($('#pincode').value);
    state.data.pan = $('#pan').value.trim().toUpperCase();

    withLoading($('button[type="submit"]', formBasic), TIMING.submitDelay, function () {
      goTo(STEP.EMPLOYMENT);
    });
  });

  /* ==========================================================================
     Step 3 — Employment
     ========================================================================== */
  var formEmployment = $('#formEmployment');
  maskMoney($('#income'));
  maskMoney($('#household'));
  bindLiveValidation(formEmployment);

  // Self-employed applicants name a business, not an employer.
  $$('input[name="employment"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      var self = radio.value === 'Self-employed' && radio.checked;
      $('#companyLabel').textContent = self ? 'Business Name*' : 'Company Name*';
    });
  });

  formEmployment.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validateForm(formEmployment)) return;

    var picked = $('input[name="employment"]:checked');
    state.data.employment = picked ? picked.value : '';
    state.data.company = $('#company').value.trim();
    state.data.income = parseInt(digitsOnly($('#income').value), 10);
    state.data.household = parseInt(digitsOnly($('#household').value), 10);

    withLoading($('button[type="submit"]', formEmployment), TIMING.submitDelay, function () {
      // TODO: POST the completed application here.
      goTo(STEP.OFFERS);
      loadOffers();
    });
  });

  /* ==========================================================================
     Step 4 — OTP
     ========================================================================== */
  var otpBoxes = $$('#otpInputs input');
  var resendBtn = $('#resendBtn');
  var resendTimer = $('#resendTimer');
  var formOtp = $('#formOtp');

  otpBoxes.forEach(function (box, i) {
    box.addEventListener('input', function () {
      box.value = digitsOnly(box.value).slice(0, 1);
      if (box.value && i < otpBoxes.length - 1) otpBoxes[i + 1].focus();
      var field = fieldOf(box);
      if (field && field.classList.contains('has-error')) clearError(box);
    });

    box.addEventListener('keydown', function (e) {
      if (e.key === 'Backspace' && !box.value && i > 0) { otpBoxes[i - 1].focus(); }
      if (e.key === 'ArrowLeft' && i > 0) { e.preventDefault(); otpBoxes[i - 1].focus(); }
      if (e.key === 'ArrowRight' && i < otpBoxes.length - 1) { e.preventDefault(); otpBoxes[i + 1].focus(); }
    });

    box.addEventListener('paste', function (e) {
      e.preventDefault();
      var chars = digitsOnly((e.clipboardData || window.clipboardData).getData('text')).slice(0, RULES.otpLength);
      chars.split('').forEach(function (c, k) { if (otpBoxes[k]) otpBoxes[k].value = c; });
      var next = Math.min(chars.length, otpBoxes.length - 1);
      otpBoxes[next].focus();
    });
  });

  function startOtp() {
    var m = state.data.mobile || '';
    $('#otpTarget').textContent = m ? '+91 ' + m.slice(0, 2) + 'XXXXX' + m.slice(-3) : 'your mobile';
    otpBoxes.forEach(function (b) { b.value = ''; });
    clearError(otpBoxes[0]);
    countdown();
    toast('Demo build — any 6 digits will get you through.');
  }

  function countdown() {
    clearInterval(state.resendId);
    var left = TIMING.resendSeconds;
    resendBtn.disabled = true;
    resendTimer.textContent = 'in ' + left + 's';

    state.resendId = setInterval(function () {
      left--;
      if (left <= 0) {
        clearInterval(state.resendId);
        resendBtn.disabled = false;
        resendTimer.textContent = '';
      } else {
        resendTimer.textContent = 'in ' + left + 's';
      }
    }, 1000);
  }

  resendBtn.addEventListener('click', function () {
    // TODO: call the resend-OTP endpoint.
    countdown();
    otpBoxes.forEach(function (b) { b.value = ''; });
    otpBoxes[0].focus();
    toast('Fresh code on its way.', 'success');
  });

  formOtp.addEventListener('submit', function (e) {
    e.preventDefault();
    var code = otpBoxes.map(function (b) { return b.value; }).join('');

    if (code.length !== RULES.otpLength) {
      setError(otpBoxes[0], 'Please enter all ' + RULES.otpLength + ' digits.');
      toast('That code is incomplete.', 'error');
      return;
    }
    clearError(otpBoxes[0]);

    // TODO: verify the code server-side. Any 6 digits pass in this demo build.
    withLoading($('button[type="submit"]', formOtp), TIMING.submitDelay, function () {
      clearInterval(state.resendId);
      toast('Number confirmed.', 'success');
      goTo(STEP.BASIC);
    });
  });

  /* ==========================================================================
     Step 5 — Offers
     ========================================================================== */
  var offersHost = $('#offers');

  function emi(principal, annualRate, months) {
    var r = annualRate / 12 / 100;
    var f = Math.pow(1 + r, months);
    return principal * r * f / (f - 1);
  }

  /* Eligible amount, rounded down to the nearest ₹50,000 and clamped to the
     partner's ceiling. Illustrative only — the real figure comes from the lender. */
  function amountFor(offer) {
    var raw = (state.data.income || 0) * offer.multiple;
    var rounded = Math.floor(raw / 50000) * 50000;
    return Math.max(50000, Math.min(rounded, offer.cap));
  }

  function skeleton() {
    var card = el('div', 'skeleton');
    card.appendChild(el('div', 'sk-line w-60'));
    card.appendChild(el('div', 'sk-line w-40'));
    card.appendChild(el('div', 'sk-line tall'));
    return card;
  }

  function offerCard(offer) {
    var amount = amountFor(offer);
    var monthly = emi(amount, offer.rate, offer.tenure);

    var card = el('article', 'offer');

    var head = el('div', 'offer-head');
    head.appendChild(el('span', 'offer-badge', offer.badge));
    var titles = el('div');
    titles.appendChild(el('div', 'offer-name', offer.name));
    titles.appendChild(el('div', 'offer-tag', offer.tag));
    head.appendChild(titles);
    head.appendChild(el('span', 'offer-pill', offer.pill));
    card.appendChild(head);

    var figures = el('dl', 'offer-figures');
    [
      ['Loan amount', money(amount)],
      ['Interest rate', offer.rate.toFixed(2) + '% p.a.'],
      ['EMI', money(monthly) + '/mo']
    ].forEach(function (pair) {
      var box = el('div');
      box.appendChild(el('dt', null, pair[0]));
      box.appendChild(el('dd', null, pair[1]));
      figures.appendChild(box);
    });
    card.appendChild(figures);

    var apply = el('button', 'btn btn-primary btn-block', 'Apply');
    apply.type = 'button';
    apply.setAttribute('aria-label', 'Apply for ' + money(amount) + ' from ' + offer.name);
    apply.addEventListener('click', function () {
      withLoading(apply, TIMING.submitDelay, function () { finish(offer, amount, monthly); });
    });
    card.appendChild(apply);

    return card;
  }

  function loadOffers() {
    offersHost.textContent = '';
    $('#offersSub').textContent = 'Matching you with lenders…';
    for (var i = 0; i < 3; i++) offersHost.appendChild(skeleton());

    // TODO: replace the timeout with the real offers request.
    setTimeout(function () {
      offersHost.textContent = '';
      AP.OFFERS.forEach(function (offer) { offersHost.appendChild(offerCard(offer)); });
      $('#offersSub').textContent = AP.OFFERS.length + ' lenders have pre-approved you. Pick whichever suits you.';
      toast(AP.OFFERS.length + ' offers are ready for you.', 'success');
    }, TIMING.offersDelay);
  }

  function finish(offer, amount, monthly) {
    $('#successSub').textContent =
      'We have your request for ' + money(amount) + ' from ' + offer.name + ' at ' +
      offer.rate.toFixed(2) + '% p.a. — ' + money(monthly) + ' a month across ' +
      offer.tenure + ' months. The lender will be in touch shortly.';
    goTo(STEP.SUCCESS);
    toast('Application is in.', 'success');
  }

  /* ==========================================================================
     Navigation controls
     ========================================================================== */
  $$('[data-back]').forEach(function (btn) {
    btn.addEventListener('click', function () { goTo(Math.max(STEP.MOBILE, state.step - 1)); });
  });

  $$('[data-goto]').forEach(function (btn) {
    btn.addEventListener('click', function () { goTo(Number(btn.dataset.goto)); });
  });

  $('#restartBtn').addEventListener('click', function () {
    [formMobile, formBasic, formEmployment, formOtp].forEach(function (f) {
      f.reset();
      $$('.field', f).forEach(function (field) { field.classList.remove('has-error'); });
      $$('.error', f).forEach(function (e) { e.textContent = ''; });
    });
    state.data = {};
    clearInterval(state.resendId);
    goTo(STEP.MOBILE);
  });

  /* ==========================================================================
     Application view — a full-page takeover of the landing page
     ========================================================================== */
  var applyView = $('#applyView');
  var landingParts = [$('.site-header'), $('#main'), $('.site-footer')];

  function showApply(on) {
    landingParts.forEach(function (node) { node.hidden = on; });
    applyView.hidden = !on;
    document.body.classList.toggle('is-applying', on);
    window.scrollTo(0, 0);
  }

  function openApply() {
    showApply(true);
    var active = $('.step[data-step="' + state.step + '"]');
    var focusable = active && ($('input:not([type="hidden"])', active) || $('button', active));
    if (focusable) focusable.focus({ preventScroll: true });
  }

  $$('[data-open-apply]').forEach(function (btn) {
    btn.addEventListener('click', openApply);
  });

  $('#applyExit').addEventListener('click', function () {
    showApply(false);
    if (location.hash === '#apply') location.hash = '';
  });

  // Deep link: /#apply opens the flow directly.
  if (location.hash === '#apply') openApply();
  window.addEventListener('hashchange', function () {
    if (location.hash === '#apply') openApply();
  });

  /* ==========================================================================
     Hero odometer
     ========================================================================== */
  (function odometer() {
    var host = $('.odometer');
    if (!host) return;

    var digits = String(host.dataset.value || '').split('');
    host.textContent = '';

    digits.forEach(function (digit, i) {
      var col = el('span', 'odo-col');
      var list = el('span', 'odo-list');
      // two full 0-9 runs so the reel spins a lap before landing
      for (var n = 0; n < 20; n++) list.appendChild(el('span', 'odo-d', String(n % 10)));
      col.appendChild(list);
      host.appendChild(col);

      var target = 10 + Number(digit);   // land on the second run
      requestAnimationFrame(function () {
        setTimeout(function () {
          list.style.transform = 'translateY(-' + (target * 100 / 20) + '%)';
        }, 90 * i);
      });
    });
  })();

  /* ==========================================================================
     Carousels (native scroll-snap + arrow buttons)
     ========================================================================== */
  $$('[data-carousel]').forEach(function (root) {
    var track = $('[data-car-track]', root);
    var prev = $('[data-car-prev]', root);
    var next = $('[data-car-next]', root);

    function page() {
      var first = track.firstElementChild;
      return first ? first.getBoundingClientRect().width + 20 : track.clientWidth;
    }

    function sync() {
      var max = track.scrollWidth - track.clientWidth;
      prev.disabled = track.scrollLeft < 4;
      next.disabled = track.scrollLeft >= max - 4;
    }

    prev.addEventListener('click', function () { track.scrollLeft -= page(); });
    next.addEventListener('click', function () { track.scrollLeft += page(); });
    track.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();

    // Re-sync once cards are populated.
    new MutationObserver(sync).observe(track, { childList: true });
  });

  /* ==========================================================================
     Static content
     ========================================================================== */
  function partnerCard(p, tag) {
    var li = el('li', 'partner-card');
    li.appendChild(el('div', 'p-logo', p.badge));
    li.appendChild(el('h3', 'p-name', p.legal));
    li.appendChild(el('span', 'p-tag', 'Personal Loan'));

    var block = el('div', 'p-block');
    block.appendChild(el('div', 'p-role', tag));
    block.appendChild(el('strong', null, p.officer));
    block.appendChild(el('div', null, p.email));
    block.appendChild(el('div', null, p.phone));
    li.appendChild(block);

    var links = el('div', 'p-links');
    ['Privacy Policy', 'T&C', 'Grievance Redressal'].forEach(function (label) {
      var a = el('a', null, label);
      a.href = '#grievance';
      links.appendChild(a);
    });
    li.appendChild(links);

    return li;
  }

  (function renderPartners() {
    var host = $('#partnerTrack');
    AP.PARTNERS.forEach(function (p) { host.appendChild(partnerCard(p, 'Grievance Redressal')); });
  })();

  (function renderDla() {
    var host = $('#dlaGrid');
    AP.DLA_PARTNERS.forEach(function (p) {
      var card = partnerCard(p, 'Grievance Redressal');
      card.className = 'dla-card';
      host.appendChild(card);
    });
  })();

  (function renderReviews() {
    var host = $('#reviewTrack');
    AP.REVIEWS.forEach(function (r) {
      var li = el('li', 'review-card');
      li.appendChild(el('blockquote', null, r.text));
      var author = el('div', 'review-author');
      author.appendChild(el('span', 'p-logo', r.badge));
      var meta = el('div');
      meta.appendChild(el('strong', null, r.name));
      meta.appendChild(el('span', null, r.city));
      author.appendChild(meta);
      li.appendChild(author);
      host.appendChild(li);
    });
  })();

  /* ---------- Mobile menu ---------- */
  (function menu() {
    var btn = $('#menuBtn');
    var nav = $('#headerNav');
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      nav.classList.toggle('is-open', !open);
    });
  })();

  $('#year').textContent = String(new Date().getFullYear());

  renderStepper();
})(AP);
