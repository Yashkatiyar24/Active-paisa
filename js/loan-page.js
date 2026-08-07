/* ==========================================================================
   Activ Paisa — loan product page
   Calculators, comparison, document checklist and the multi-step application.
   Landing copy lives in the HTML so it is indexable; this file owns the
   interactive parts only.
   ========================================================================== */

var APLoan = (function () {
  'use strict';

  var C = APCore;
  var $ = C.$, $$ = C.$$, el = C.el;

  var SUBMIT_MS = 900;
  var OFFER_MS = 1500;
  var RESEND_S = 30;
  var MAX_FILE_MB = 5;
  var ACCEPT = ['image/jpeg', 'image/png', 'application/pdf'];

  var state = { step: 0, data: {}, files: {}, resendId: null, product: null };

  /* ==========================================================================
     EMI calculator
     ========================================================================== */
  function initCalculator(p) {
    var host = $('#emiCalc');
    if (!host) return;
    var cfg = p.calc;

    var amount = $('#calcAmount', host);
    var rate = $('#calcRate', host);
    var tenure = $('#calcTenure', host);

    amount.min = cfg.min; amount.max = cfg.max; amount.step = cfg.step; amount.value = cfg.start;
    rate.min = cfg.rateMin; rate.max = cfg.rateMax; rate.step = 0.05; rate.value = cfg.rate;
    tenure.min = cfg.tenureMin; tenure.max = cfg.tenureMax; tenure.step = 12; tenure.value = cfg.tenure;

    function paint() {
      var a = Number(amount.value), r = Number(rate.value), t = Number(tenure.value);
      var s = C.schedule(a, r, t);

      $('#calcAmountOut', host).textContent = C.money(a);
      $('#calcRateOut', host).textContent = r.toFixed(2) + '% p.a.';
      $('#calcTenureOut', host).textContent = t >= 24 ? (t / 12) + ' years' : t + ' months';

      $('#calcEmi', host).textContent = C.money(s.emi);
      $('#calcInterest', host).textContent = C.money(s.interest);
      $('#calcTotal', host).textContent = C.money(s.total);

      // split bar: principal against interest
      var pct = s.total ? (s.principal / s.total) * 100 : 0;
      var bar = $('#calcSplit', host);
      bar.style.setProperty('--principal', pct.toFixed(1) + '%');
      bar.setAttribute('aria-label',
        'Principal ' + C.money(s.principal) + ', interest ' + C.money(s.interest));

      [amount, rate, tenure].forEach(function (input) {
        var span = (input.value - input.min) / (input.max - input.min) * 100;
        input.style.setProperty('--fill', span.toFixed(1) + '%');
      });
    }

    [amount, rate, tenure].forEach(function (input) {
      input.addEventListener('input', paint);
    });
    paint();
  }

  /* ==========================================================================
     Eligibility calculator
     ========================================================================== */
  function initEligibility(p) {
    var host = $('#eligCalc');
    if (!host) return;
    var cfg = p.eligibility;

    var income = $('#eligIncome', host);
    var obligations = $('#eligObligations', host);
    C.maskMoney(income); C.maskMoney(obligations);

    $('#eligIncomeLabel', host).textContent = cfg.incomeLabel;

    function paint() {
      var inc = parseInt(C.digitsOnly(income.value), 10) || 0;
      var obl = parseInt(C.digitsOnly(obligations.value), 10) || 0;
      var out = $('#eligResult', host);
      var amountOut = $('#eligAmount', host);
      var noteOut = $('#eligNote', host);

      if (inc < cfg.minIncome) {
        out.classList.remove('is-ready');
        amountOut.textContent = '—';
        noteOut.textContent = inc
          ? 'Lenders on our panel look for at least ' + C.money(cfg.minIncome) + '.'
          : 'Enter your figure to see an indicative amount.';
        return;
      }

      var principal = C.affordablePrincipal(inc, obl, cfg.rate, cfg.tenure, cfg.foir);
      principal = Math.max(0, Math.min(principal, p.calc.max));
      principal = Math.floor(principal / 50000) * 50000;

      out.classList.add('is-ready');
      amountOut.textContent = principal > 0 ? C.money(principal) : '—';
      noteOut.textContent = principal > 0
        ? 'Indicative only, at ' + cfg.rate + '% over ' + (cfg.tenure / 12) +
          ' years. The lender decides the final figure.'
        : 'Your existing EMIs use up the income a lender can count.';
    }

    [income, obligations].forEach(function (i) { i.addEventListener('input', paint); });
    paint();
  }

  /* ==========================================================================
     Comparison cards
     ========================================================================== */
  function renderCompare(p) {
    var host = $('#compareGrid');
    if (!host) return;
    var principal = p.calc.start;

    p.compare.forEach(function (opt, i) {
      var s = C.schedule(principal, opt.rate, opt.tenure);
      var card = el('li', 'cmp-card' + (opt.featured ? ' is-featured' : ''));
      card.setAttribute('data-reveal', '');
      card.dataset.revealDelay = String(i * 80);

      if (opt.featured) card.appendChild(el('span', 'cmp-flag', 'Most chosen'));
      card.appendChild(el('h3', 'cmp-name', opt.name));
      card.appendChild(el('p', 'cmp-rate', opt.rate.toFixed(2) + '% p.a.'));

      var big = el('div', 'cmp-emi');
      big.appendChild(el('span', 'cmp-emi-value', C.money(s.emi)));
      big.appendChild(el('span', 'cmp-emi-label', 'per month'));
      card.appendChild(big);

      var dl = el('dl', 'cmp-rows');
      [['On a loan of', C.money(principal)],
       ['Total interest', C.money(s.interest)],
       ['Total repayable', C.money(s.total)]].forEach(function (row) {
        var d = el('div');
        d.appendChild(el('dt', null, row[0]));
        d.appendChild(el('dd', null, row[1]));
        dl.appendChild(d);
      });
      card.appendChild(dl);
      card.appendChild(el('p', 'cmp-note', opt.note));
      host.appendChild(card);
    });
  }

  /* ==========================================================================
     Document checklist
     ========================================================================== */
  function renderDocs(p) {
    var host = $('#docList');
    if (!host) return;
    p.documents.forEach(function (doc, i) {
      var li = el('li', 'doc-row');
      li.setAttribute('data-reveal', '');
      li.dataset.revealDelay = String(i * 60);
      li.appendChild(C.svg('0 0 24 24', [{
        d: 'M5 12.5l4.5 4.5L19 7.5', fill: 'none', stroke: 'currentColor',
        'stroke-width': '2.4', 'stroke-linecap': 'round', 'stroke-linejoin': 'round'
      }], 20));
      var body = el('div');
      body.appendChild(el('strong', null, doc.label));
      body.appendChild(el('span', null, doc.hint));
      li.appendChild(body);
      host.appendChild(li);
    });
  }

  /* ==========================================================================
     Sticky apply bar — appears once the hero CTA scrolls away
     ========================================================================== */
  function initStickyCta() {
    var bar = $('#stickyCta');
    var anchor = $('#heroCta');
    if (!bar || !anchor || !('IntersectionObserver' in window)) return;

    new IntersectionObserver(function (entries) {
      bar.classList.toggle('is-visible', !entries[0].isIntersecting);
    }, { rootMargin: '-80px 0px 0px 0px' }).observe(anchor);
  }

  /* ==========================================================================
     Field builder
     ========================================================================== */
  function makeField(f) {
    var wrap = el('div', 'field outlined' + (f.span === 2 ? ' span-2' : ''));
    var id = 'f_' + f.name;

    if (f.type === 'choice') {
      wrap.className = 'field' + (f.span === 2 ? ' span-2' : '');
      var fs = el('fieldset');
      fs.appendChild(el('legend', null, f.label));
      var row = el('div', 'choice-row');
      row.setAttribute('role', 'radiogroup');
      f.options.forEach(function (opt) {
        var label = el('label', 'choice');
        var input = el('input');
        input.type = 'radio'; input.name = f.name; input.value = opt;
        var face = el('span', 'choice-face');
        face.appendChild(el('span', 'choice-label', opt));
        face.appendChild(el('span', 'choice-dot'));
        label.appendChild(input); label.appendChild(face);
        row.appendChild(label);
      });
      fs.appendChild(row);
      fs.appendChild(el('p', 'error'));
      wrap.appendChild(fs);
      return wrap;
    }

    var label = el('label', null, f.label);
    label.htmlFor = id;
    wrap.appendChild(label);

    var control;
    if (f.type === 'select') {
      control = el('select');
      control.appendChild(el('option', null, 'Select'));
      $$('option', control)[0].value = '';
      f.options.forEach(function (opt) {
        var o = el('option', null, opt);
        o.value = opt;
        control.appendChild(o);
      });
    } else {
      control = el('input');
      control.type = f.type === 'date' ? 'date' : f.type === 'email' ? 'email' : 'text';
      if (f.type === 'money' || f.type === 'pincode') control.inputMode = 'numeric';
    }
    control.id = id;
    control.name = f.name;
    control.setAttribute('aria-describedby', id + '_err');

    if (f.type === 'money') {
      wrap.classList.add('has-rupee');
      wrap.appendChild(el('span', 'rupee-prefix', '₹'));
    }

    wrap.appendChild(control);
    var err = el('p', 'error');
    err.id = id + '_err';
    err.setAttribute('role', 'alert');
    wrap.appendChild(err);

    if (f.type === 'money')   C.maskMoney(control);
    if (f.type === 'pincode') C.maskNumeric(control, 6);
    if (f.type === 'pan')     C.maskUpper(control, 10);
    if (f.type === 'gstin')   C.maskUpper(control, 15);

    if (f.type === 'date') {
      var today = new Date();
      control.max = new Date(today.getFullYear() - 21, today.getMonth(), today.getDate())
        .toISOString().slice(0, 10);
      control.min = new Date(today.getFullYear() - 70, today.getMonth(), today.getDate())
        .toISOString().slice(0, 10);
    }
    return wrap;
  }

  /* ---------- Validation rules ---------- */
  var RULES = {
    required: function (v, input, f) {
      if (!v) return 'Please choose ' + f.label.toLowerCase() + '.';
      return '';
    },
    name: function (v) {
      if (!v) return 'This field is required.';
      if (!C.PATTERNS.name.test(v)) return 'Use letters, spaces, apostrophes and hyphens only.';
      return '';
    },
    org: function (v) {
      if (!v) return 'This field is required.';
      if (v.length < 3) return 'That looks too short.';
      if (!C.PATTERNS.org.test(v)) return 'Contains unsupported characters.';
      return '';
    },
    email: function (v) {
      if (!v) return 'Please enter your email address.';
      if (v.length > 254 || !C.PATTERNS.email.test(v)) return 'Enter a valid email address.';
      return '';
    },
    pan: function (v) {
      if (!v) return 'Please enter the PAN.';
      if (!C.PATTERNS.pan.test(v)) return 'Enter a valid PAN, e.g. ABCDE1234F.';
      return '';
    },
    pincode: function (v) {
      if (!v) return 'Please enter the pincode.';
      if (!C.PATTERNS.pincode.test(v)) return 'Enter a valid 6-digit pincode.';
      return '';
    },
    dob: function (v) {
      if (!v) return 'Please enter the date of birth.';
      var age = C.ageFrom(v);
      if (isNaN(age)) return 'Enter a valid date.';
      if (age < 21) return 'Applicants must be at least 21.';
      if (age > 70) return 'Applicants must be under 70.';
      return '';
    },
    amount: function (v) {
      var n = parseInt(C.digitsOnly(v), 10);
      var cfg = state.product.calc;
      if (!n) return 'Please enter the amount you need.';
      if (n < cfg.min) return 'Minimum is ' + C.money(cfg.min) + '.';
      if (n > cfg.max) return 'Maximum is ' + C.money(cfg.max) + '.';
      return '';
    },
    income: function (v) {
      var n = parseInt(C.digitsOnly(v), 10);
      if (!n) return 'Please enter your monthly income.';
      if (n < 15000) return 'Minimum considered is ' + C.money(15000) + '.';
      if (n > 100000000) return 'Please enter a realistic figure.';
      return '';
    },
    turnover: function (v) {
      var n = parseInt(C.digitsOnly(v), 10);
      if (!n) return 'Please enter your monthly turnover.';
      if (n < 50000) return 'Minimum considered is ' + C.money(50000) + '.';
      return '';
    },
    propertyValue: function (v) {
      var n = parseInt(C.digitsOnly(v), 10);
      if (!n) return 'Please enter the property value.';
      if (n < 500000) return 'Enter the full property value.';
      return '';
    },
    household: function (v) {
      var n = parseInt(C.digitsOnly(v), 10);
      if (!n) return 'Please enter your annual household income.';
      if (n < 100000) return 'Minimum considered is ' + C.money(100000) + '.';
      // read the live field: income is only committed to state once its step submits
      var incomeField = $('[name="income"]');
      var own = incomeField ? parseInt(C.digitsOnly(incomeField.value), 10) : 0;
      if (own && n < own * 12) return 'Household income cannot be below your own annual income.';
      return '';
    },
    mustCheck: function (v) {
      return v ? '' : 'Please confirm this declaration to continue.';
    },
    obligationsOptional: function () { return ''; },
    gstinOptional: function (v) {
      if (!v) return '';
      if (!C.PATTERNS.gstin.test(v)) return 'Enter a valid 15-character GSTIN, or leave blank.';
      return '';
    }
  };

  function readValue(form, f) {
    if (f.type === 'checkbox') {
      // .value is "on" whether or not it is ticked, so read the state
      var box = $('[name="' + f.name + '"]', form);
      return box && box.checked ? 'yes' : '';
    }
    if (f.type === 'choice') {
      var picked = $('input[name="' + f.name + '"]:checked', form);
      return picked ? picked.value : '';
    }
    var node = $('[name="' + f.name + '"]', form);
    return node ? node.value.trim() : '';
  }

  function anchorFor(form, f) {
    return f.type === 'choice'
      ? $('input[name="' + f.name + '"]', form)
      : $('[name="' + f.name + '"]', form);
  }

  function validateStep(form, fields) {
    var ok = true, firstBad = null;
    fields.forEach(function (f) {
      var input = anchorFor(form, f);
      if (!input) return;
      var msg = (RULES[f.rule] || RULES.required)(readValue(form, f), input, f);
      if (msg) {
        C.setError(input, msg);
        ok = false;
        if (!firstBad) firstBad = input;
      } else {
        C.clearError(input);
      }
    });
    if (firstBad) {
      firstBad.focus();
      C.toast('Some fields need another look.', 'error');
    }
    return ok;
  }

  function bindLive(form, fields) {
    fields.forEach(function (f) {
      var input = anchorFor(form, f);
      if (!input) return;
      var evt = (f.type === 'choice' || f.type === 'select' || f.type === 'date') ? 'change' : 'blur';
      var run = function () {
        var msg = (RULES[f.rule] || RULES.required)(readValue(form, f), input, f);
        if (msg) C.setError(input, msg); else C.clearError(input);
      };
      input.addEventListener(evt, run);
      input.addEventListener('input', function () {
        var fld = C.fieldOf(input);
        if (fld && fld.classList.contains('has-error')) run();
      });
    });
  }

  /* ==========================================================================
     Document upload — drag, drop or browse. Files stay in memory.
     ========================================================================== */
  function makeDropZone(doc) {
    var wrap = el('div', 'drop');
    wrap.dataset.doc = doc.id;

    var zone = el('div', 'drop-zone');
    zone.tabIndex = 0;
    zone.setAttribute('role', 'button');
    zone.setAttribute('aria-label', 'Upload ' + doc.label);

    var input = el('input');
    input.type = 'file';
    input.accept = '.jpg,.jpeg,.png,.pdf';
    input.className = 'sr-only';
    input.id = 'file_' + doc.id;

    var head = el('div', 'drop-head');
    head.appendChild(el('strong', null, doc.label));
    head.appendChild(el('span', 'drop-hint', doc.hint));

    var cue = el('div', 'drop-cue');
    cue.appendChild(C.svg('0 0 24 24', [
      { d: 'M12 16V4m0 0L8 8m4-4 4 4', fill: 'none', stroke: 'currentColor',
        'stroke-width': '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
      { d: 'M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2', fill: 'none', stroke: 'currentColor',
        'stroke-width': '1.8', 'stroke-linecap': 'round' }
    ], 22));
    cue.appendChild(el('span', null, 'Drag a file here, or browse'));

    zone.appendChild(head);
    zone.appendChild(cue);

    var chosen = el('div', 'drop-file');
    chosen.hidden = true;

    var err = el('p', 'error');
    err.setAttribute('role', 'alert');

    function reject(msg) {
      err.textContent = msg;
      wrap.classList.add('has-error');
    }

    function accept(file) {
      err.textContent = '';
      wrap.classList.remove('has-error');
      if (ACCEPT.indexOf(file.type) === -1) return reject('Use a JPG, PNG or PDF.');
      if (file.size > MAX_FILE_MB * 1024 * 1024) return reject('Keep it under ' + MAX_FILE_MB + ' MB.');

      state.files[doc.id] = file;
      chosen.textContent = '';
      chosen.appendChild(el('span', 'drop-name', file.name));
      chosen.appendChild(el('span', 'drop-size', (file.size / 1024 / 1024).toFixed(2) + ' MB'));
      var remove = el('button', 'drop-remove', 'Remove');
      remove.type = 'button';
      remove.addEventListener('click', function () {
        delete state.files[doc.id];
        chosen.hidden = true;
        zone.hidden = false;
        input.value = '';
        wrap.classList.remove('is-filled');
      });
      chosen.appendChild(remove);
      chosen.hidden = false;
      zone.hidden = true;
      wrap.classList.add('is-filled');
      C.toast(doc.label + ' attached.', 'success');
    }

    zone.addEventListener('click', function () { input.click(); });
    zone.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
    });
    input.addEventListener('change', function () {
      if (input.files && input.files[0]) accept(input.files[0]);
    });

    ['dragenter', 'dragover'].forEach(function (evt) {
      zone.addEventListener(evt, function (e) {
        e.preventDefault();
        zone.classList.add('is-over');
      });
    });
    ['dragleave', 'drop'].forEach(function (evt) {
      zone.addEventListener(evt, function (e) {
        e.preventDefault();
        zone.classList.remove('is-over');
      });
    });
    zone.addEventListener('drop', function (e) {
      var dt = e.dataTransfer;
      if (dt && dt.files && dt.files[0]) accept(dt.files[0]);
    });

    wrap.appendChild(zone);
    wrap.appendChild(input);
    wrap.appendChild(chosen);
    wrap.appendChild(err);
    return wrap;
  }

  /* ==========================================================================
     Application flow
     ========================================================================== */
  function initApply(p) {
    var view = $('#applyView');
    var card = $('#applyCard');
    if (!view || !card) return;

    var steps = APProducts.stepsFor(p);
    var landing = [$('.site-header'), $('#main'), $('.site-footer')];
    var panels = [];

    /* ---- progress ----
       Products that declare `stepper` get the node-and-line indicator; the rest
       keep the thin bar, which copes with a longer step list. */
    var progressHost = $('#flowProgress');
    var panelIds = [];
    var useNodes = !!p.stepper;
    var nodeList = null;

    if (useNodes) {
      progressHost.textContent = '';
      var shell = el('div', 'stepper-shell');
      nodeList = el('ol', 'stepper');
      p.stepper.forEach(function (label) {
        var li = el('li');
        var node = el('span', 'node');
        node.appendChild(C.svg('0 0 24 24', [{
          d: 'M5 12.5l4.5 4.5L19 7.5', fill: 'none', stroke: '#fff',
          'stroke-width': '3', 'stroke-linecap': 'round', 'stroke-linejoin': 'round'
        }]));
        li.appendChild(node);
        li.appendChild(el('span', null, label));
        nodeList.appendChild(li);
      });
      shell.appendChild(nodeList);
      progressHost.appendChild(shell);
    }

    var barFill = useNodes ? null : $('#flowFill');
    var barList = useNodes ? null : $('#flowSteps');
    var labels = [];
    if (!useNodes) {
      steps.forEach(function (s) {
        if (labels.indexOf(s.label) === -1) labels.push(s.label);
      });
      labels.forEach(function (label) { barList.appendChild(el('li', null, label)); });
    }

    function paintProgress() {
      if (useNodes) {
        var id = panelIds[state.step];
        var node = p.stepperNode[id];
        $$('li', nodeList).forEach(function (li, i) {
          li.classList.toggle('is-done', i < node);
          li.classList.toggle('is-current', i === node);
          if (i === node) li.setAttribute('aria-current', 'step');
          else li.removeAttribute('aria-current');
        });
        return;
      }
      var current = steps[Math.min(state.step, steps.length - 1)];
      var idx = labels.indexOf(current.label);
      barFill.style.width = ((idx + 1) / labels.length * 100) + '%';
      $('#flowBar').setAttribute('aria-valuenow', String(idx + 1));
      $$('li', barList).forEach(function (li, i) {
        li.classList.toggle('is-done', i < idx);
        li.classList.toggle('is-current', i === idx);
      });
    }

    function goTo(i) {
      state.step = i;
      panels.forEach(function (panel, n) { panel.hidden = n !== i; });
      var onNode = useNodes ? p.stepperNode[panelIds[i]] !== undefined : i < steps.length;
      progressHost.hidden = !onNode;
      if (onNode) paintProgress();
      var active = panels[i];
      var focusable = active && ($('input:not([type=hidden]):not(.sr-only)', active) || $('button', active));
      if (focusable) focusable.focus({ preventScroll: true });
      window.scrollTo(0, 0);
    }

    /* ---- build each step ---- */
    steps.forEach(function (step, i) {
      var panel = el('section', 'flow-step');
      panel.hidden = i !== 0;
      panel.dataset.step = String(i);

      panel.appendChild(el('h2', step.quietTitle ? 'sr-only' : 'flow-title', step.title));
      if (step.sub) panel.appendChild(el('p', 'flow-sub', step.sub));

      var form = el('form');
      form.noValidate = true;
      form.id = 'form_' + step.id;

      if (step.id === 'mobile') {
        var mf = el('div', 'field');
        var ml = el('label', null, 'Mobile number');
        ml.htmlFor = 'flowMobile';
        mf.appendChild(ml);
        var wrapM = el('div', 'input-wrap has-prefix');
        wrapM.appendChild(el('span', 'prefix', '+91'));
        var mi = el('input');
        mi.type = 'tel'; mi.id = 'flowMobile'; mi.name = 'mobile';
        mi.inputMode = 'numeric'; mi.maxLength = 10;
        mi.placeholder = '10-digit mobile number';
        wrapM.appendChild(mi);
        mf.appendChild(wrapM);
        mf.appendChild(el('p', 'error'));
        form.appendChild(mf);
        C.maskNumeric(mi, 10);

        var cf = el('div', 'field consent-row');
        var cb = el('input');
        cb.type = 'checkbox'; cb.id = 'flowConsent'; cb.className = 'tick-box';
        var cl = el('label', null,
          'I agree to the Terms and Privacy Policy, and to being contacted about this application.');
        cl.htmlFor = 'flowConsent';
        cf.appendChild(cb); cf.appendChild(cl); cf.appendChild(el('p', 'error'));
        form.appendChild(cf);

      } else if (step.id === 'otp') {
        var of = el('div', 'field');
        var ol = el('label', 'sr-only', 'Enter the 6 digit code');
        ol.htmlFor = 'otp0';
        of.appendChild(ol);
        var boxes = el('div', 'otp-inputs');
        boxes.id = 'flowOtp';
        for (var n = 0; n < 6; n++) {
          var box = el('input');
          box.type = 'text'; box.id = 'otp' + n; box.maxLength = 1;
          box.inputMode = 'numeric';
          box.setAttribute('aria-label', 'Digit ' + (n + 1));
          if (n === 0) box.autocomplete = 'one-time-code';
          boxes.appendChild(box);
        }
        of.appendChild(boxes);
        of.appendChild(el('p', 'error'));
        form.appendChild(of);

        var resend = el('p', 'resend');
        var rb = el('button', 'linklike', 'Resend code');
        rb.type = 'button'; rb.id = 'flowResend'; rb.disabled = true;
        resend.appendChild(rb);
        resend.appendChild(el('span', null, ''));
        $$('span', resend)[0].id = 'flowTimer';
        form.appendChild(resend);

      } else if (step.id === 'documents') {
        var grid = el('div', 'drop-grid');
        p.documents.forEach(function (doc) { grid.appendChild(makeDropZone(doc)); });
        form.appendChild(grid);
        form.appendChild(el('p', 'fineprint',
          'Demo build — files stay in your browser and are not uploaded anywhere.'));

      } else if (step.id === 'review') {
        var summary = el('div', 'review-list');
        summary.id = 'flowReview';
        form.appendChild(summary);

      } else {
        var grid2 = el('div', 'form-grid');
        step.fields.forEach(function (f) { grid2.appendChild(makeField(f)); });
        form.appendChild(grid2);
      }

      if (step.declarations) {
        var decls = el('div', 'declarations');
        [['declResident',
          'I accept the Privacy Policy and Terms and Conditions of Activ Paisa and its Partners, ' +
          'and declare that I reside in India and am not a politically exposed person.'],
         ['declIndustry',
          'I declare that neither my employer\u2019s industry nor my own role appears on the ' +
          'restricted list.']
        ].forEach(function (pair) {
          var row = el('div', 'field consent-row');
          var box = el('input');
          box.type = 'checkbox'; box.id = 'f_' + pair[0]; box.name = pair[0]; box.className = 'tick-box';
          var lab = el('label', null, pair[1]);
          lab.htmlFor = box.id;
          row.appendChild(box); row.appendChild(lab); row.appendChild(el('p', 'error'));
          decls.appendChild(row);
        });
        form.appendChild(decls);
      }

      var actions = el('div', 'actions actions-center');
      if (i > 0) {
        var back = el('button', 'btn btn-ghost', 'Back');
        back.type = 'button';
        back.addEventListener('click', function () { goTo(Math.max(0, state.step - 1)); });
        actions.appendChild(back);
      }
      var next = el('button', 'btn btn-primary btn-wide',
        step.submitLabel ? step.submitLabel :
        step.id === 'review' ? 'Submit application' :
        step.id === 'otp' ? 'Verify OTP' : 'Continue');
      next.type = 'submit';
      actions.appendChild(next);
      form.appendChild(actions);

      panel.appendChild(form);
      card.appendChild(panel);
      panels.push(panel);
      panelIds.push(step.id);

      if (step.declarations) {
        step.fields = step.fields.concat([
          { name: 'declResident', type: 'checkbox', rule: 'mustCheck', label: 'this declaration' },
          { name: 'declIndustry', type: 'checkbox', rule: 'mustCheck', label: 'this declaration' }
        ]);
      }
      if (step.fields && step.fields.length) bindLive(form, step.fields);

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        handleSubmit(step, form, next, i);
      });
    });

    /* ---- offers panel (only products that return offers) ---- */
    var offersIndex = -1;
    if (p.offers) {
      var op = el('section', 'flow-step');
      op.hidden = true;
      op.appendChild(el('h2', 'flow-title', 'Offers you qualify for'));
      var osub = el('p', 'flow-sub', '');
      osub.id = 'flowOffersSub';
      op.appendChild(osub);
      var ohost = el('div', 'offers');
      ohost.id = 'flowOffers';
      ohost.setAttribute('aria-live', 'polite');
      op.appendChild(ohost);
      card.appendChild(op);
      panels.push(op);
      panelIds.push('offers');
      offersIndex = panels.length - 1;
    }

    function skeleton() {
      var sk = el('div', 'skeleton');
      sk.appendChild(el('div', 'sk-line w-60'));
      sk.appendChild(el('div', 'sk-line w-40'));
      sk.appendChild(el('div', 'sk-line tall'));
      return sk;
    }

    /* Illustrative sizing from declared income, clamped to the lender ceiling. */
    function amountFor(offer) {
      var income = parseInt(C.digitsOnly(state.data.income || '0'), 10);
      var raw = income * offer.multiple;
      return Math.max(50000, Math.min(Math.floor(raw / 50000) * 50000, offer.cap));
    }

    function offerCard(offer) {
      var amount = amountFor(offer);
      var monthly = C.emi(amount, offer.rate, offer.tenure);

      var cardEl = el('article', 'offer');
      var head = el('div', 'offer-head');
      var mark = el('span', 'offer-badge');
      mark.appendChild(C.img(offer.logo, '', 30));
      head.appendChild(mark);
      var titles = el('div');
      titles.appendChild(el('div', 'offer-name', offer.name));
      titles.appendChild(el('div', 'offer-tag', offer.tag));
      head.appendChild(titles);
      head.appendChild(el('span', 'offer-pill', offer.pill));
      cardEl.appendChild(head);

      var figures = el('dl', 'offer-figures');
      [['Loan amount', C.money(amount)],
       ['Interest rate', offer.rate.toFixed(2) + '% p.a.'],
       ['EMI', C.money(monthly) + '/mo']].forEach(function (pair) {
        var box = el('div');
        box.appendChild(el('dt', null, pair[0]));
        box.appendChild(el('dd', null, pair[1]));
        figures.appendChild(box);
      });
      cardEl.appendChild(figures);

      var apply = el('button', 'btn btn-primary btn-block', 'Apply');
      apply.type = 'button';
      apply.setAttribute('aria-label', 'Apply for ' + C.money(amount) + ' from ' + offer.name);
      apply.addEventListener('click', function () {
        C.withLoading(apply, SUBMIT_MS, function () {
          $('#flowDoneSub').textContent =
            'Your request for ' + C.money(amount) + ' from ' + offer.name + ' at ' +
            offer.rate.toFixed(2) + '% p.a. — ' + C.money(monthly) + ' a month across ' +
            offer.tenure + ' months — is with the lender. They will be in touch shortly.';
          stampReference();
          goTo(panels.length - 1);
          C.toast('Application submitted.', 'success');
        });
      });
      cardEl.appendChild(apply);
      return cardEl;
    }

    function loadOffers() {
      var host = $('#flowOffers');
      host.textContent = '';
      $('#flowOffersSub').textContent = 'Matching you with lenders…';
      for (var n = 0; n < p.offers.length; n++) host.appendChild(skeleton());

      // TODO: replace with the live offers request
      setTimeout(function () {
        host.textContent = '';
        p.offers.forEach(function (o) { host.appendChild(offerCard(o)); });
        $('#flowOffersSub').textContent =
          p.offers.length + ' lenders have pre-approved you. Pick whichever suits you.';
        C.toast(p.offers.length + ' offers are ready for you.', 'success');
      }, OFFER_MS);
    }

    /* ---- success panel ---- */
    var done = el('section', 'flow-step flow-done');
    done.hidden = true;
    var mark = el('div', 'success-mark');
    mark.appendChild(C.svg('0 0 52 52', [
      { tag: 'circle', cx: '26', cy: '26', r: '24' },
      { d: 'M14 27l8 8 16-16' }
    ]));
    done.appendChild(mark);
    done.appendChild(el('h2', 'flow-title', 'Application submitted'));

    // the thing the applicant actually wants to know: when they will hear back
    var callout = el('div', 'done-callout');
    var ring = el('span', 'ring');
    ring.appendChild(C.svg('0 0 24 24', [
      { tag: 'circle', cx: '12', cy: '12', r: '9', fill: 'none',
        stroke: 'currentColor', 'stroke-width': '1.9' },
      { d: 'M12 7v5.5l3.5 2', fill: 'none', stroke: 'currentColor',
        'stroke-width': '1.9', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }
    ], 20));
    callout.appendChild(ring);
    var calloutText = el('div');
    calloutText.appendChild(el('strong', null, 'Our agent will call you within 24 hours'));
    calloutText.appendChild(el('span', null, 'On the mobile number you just verified'));
    callout.appendChild(calloutText);
    done.appendChild(callout);

    var sub = el('p', 'flow-sub', '');
    sub.id = 'flowDoneSub';
    done.appendChild(sub);

    var next = el('ol', 'done-next');
    [['Verification call', 'A partner lender confirms your details and documents.'],
     ['Sanction letter', 'Read the rate, processing fee and total repayment before accepting.'],
     ['Disbursal', 'Funds reach your account once the lender completes its checks.']
    ].forEach(function (row, i) {
      var li = el('li');
      li.appendChild(el('span', 'n', String(i + 1)));
      var body = el('div');
      body.appendChild(el('strong', null, row[0]));
      body.appendChild(el('span', null, row[1]));
      li.appendChild(body);
      next.appendChild(li);
    });
    done.appendChild(next);

    var ref = el('p', 'done-ref');
    ref.appendChild(document.createTextNode('Reference '));
    var refCode = el('code', null, '');
    refCode.id = 'flowRef';
    ref.appendChild(refCode);
    done.appendChild(ref);

    var again = el('button', 'btn btn-ghost', 'Back to ' + p.name.toLowerCase() + 's');
    again.type = 'button';
    again.addEventListener('click', function () { showApply(false); });
    done.appendChild(again);
    card.appendChild(done);
    panels.push(done);
    panelIds.push('done');

    /* Short, human-readable handle for the applicant to quote on the phone. */
    function stampReference() {
      var tail = (state.data.mobile || '0000').slice(-4);
      var stamp = Date.now().toString(36).slice(-4).toUpperCase();
      $('#flowRef').textContent = 'AP-' + tail + '-' + stamp;
    }

    /* ---- OTP behaviour ---- */
    var otpBoxes = $$('#flowOtp input');
    otpBoxes.forEach(function (box, i) {
      box.addEventListener('input', function () {
        box.value = C.digitsOnly(box.value).slice(0, 1);
        if (box.value && i < otpBoxes.length - 1) otpBoxes[i + 1].focus();
        C.clearError(otpBoxes[0]);
      });
      box.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace' && !box.value && i > 0) otpBoxes[i - 1].focus();
        if (e.key === 'ArrowLeft' && i > 0) { e.preventDefault(); otpBoxes[i - 1].focus(); }
        if (e.key === 'ArrowRight' && i < otpBoxes.length - 1) { e.preventDefault(); otpBoxes[i + 1].focus(); }
      });
      box.addEventListener('paste', function (e) {
        e.preventDefault();
        var chars = C.digitsOnly((e.clipboardData || window.clipboardData).getData('text')).slice(0, 6);
        chars.split('').forEach(function (ch, k) { if (otpBoxes[k]) otpBoxes[k].value = ch; });
        otpBoxes[Math.min(chars.length, 5)].focus();
      });
    });

    function countdown() {
      clearInterval(state.resendId);
      var left = RESEND_S;
      var btn = $('#flowResend'), timer = $('#flowTimer');
      btn.disabled = true;
      timer.textContent = 'in ' + left + 's';
      state.resendId = setInterval(function () {
        left--;
        if (left <= 0) {
          clearInterval(state.resendId);
          btn.disabled = false;
          timer.textContent = '';
        } else timer.textContent = 'in ' + left + 's';
      }, 1000);
    }
    $('#flowResend').addEventListener('click', function () {
      countdown();
      otpBoxes.forEach(function (b) { b.value = ''; });
      otpBoxes[0].focus();
      C.toast('A new code is on its way.', 'success');
    });

    /* ---- review rendering ---- */
    function paintReview() {
      var host = $('#flowReview');
      host.textContent = '';
      steps.forEach(function (s) {
        if (!s.fields || !s.fields.length) return;
        var block = el('div', 'review-block');
        block.appendChild(el('h3', null, s.title));
        var dl = el('dl');
        s.fields.forEach(function (f) {
          var v = state.data[f.name];
          if (!v) return;
          var row = el('div');
          row.appendChild(el('dt', null, f.label));
          row.appendChild(el('dd', null, f.type === 'money' ? C.money(parseInt(C.digitsOnly(v), 10)) : v));
          dl.appendChild(row);
        });
        block.appendChild(dl);
        host.appendChild(block);
      });

      var names = Object.keys(state.files);
      var docBlock = el('div', 'review-block');
      docBlock.appendChild(el('h3', null, 'Documents'));
      var list = el('ul', 'review-files');
      if (!names.length) {
        list.appendChild(el('li', 'is-empty', 'None attached'));
      } else {
        names.forEach(function (id) {
          var doc = p.documents.filter(function (d) { return d.id === id; })[0];
          list.appendChild(el('li', null, (doc ? doc.label : id) + ' — ' + state.files[id].name));
        });
      }
      docBlock.appendChild(list);
      host.appendChild(docBlock);
    }

    /* ---- step submit ---- */
    function handleSubmit(step, form, button, index) {
      if (step.id === 'mobile') {
        var mi = $('#flowMobile'), cb = $('#flowConsent');
        var v = C.digitsOnly(mi.value);
        var ok = true;
        if (!C.PATTERNS.mobile.test(v)) {
          C.setError(mi, v ? 'Enter a valid Indian mobile number starting 6-9.' : 'Please enter your mobile number.');
          ok = false;
        } else C.clearError(mi);
        if (!cb.checked) { C.setError(cb, 'Please accept the terms to continue.'); ok = false; }
        else C.clearError(cb);
        if (!ok) return C.toast('Some fields need another look.', 'error');

        state.data.mobile = v;
        return C.withLoading(button, SUBMIT_MS, function () {
          goTo(index + 1);
          countdown();
          C.toast('Demo build — any 6 digits will work.');
        });
      }

      if (step.id === 'otp') {
        var code = otpBoxes.map(function (b) { return b.value; }).join('');
        if (code.length !== 6) {
          C.setError(otpBoxes[0], 'Please enter all 6 digits.');
          return C.toast('That code is incomplete.', 'error');
        }
        C.clearError(otpBoxes[0]);
        return C.withLoading(button, SUBMIT_MS, function () {
          clearInterval(state.resendId);
          C.toast('Number confirmed.', 'success');
          goTo(index + 1);
        });
      }

      if (step.id === 'documents') {
        return C.withLoading(button, SUBMIT_MS, function () {
          paintReview();
          goTo(index + 1);
        });
      }

      if (step.id === 'review') {
        return C.withLoading(button, SUBMIT_MS, function () {
          if (offersIndex > -1) {
            goTo(offersIndex);
            loadOffers();
            return;
          }
          $('#flowDoneSub').textContent =
            'Your ' + p.name.toLowerCase() + ' application is with our team. Here is what happens next.';
          stampReference();
          goTo(panels.length - 1);
          C.toast('Application submitted.', 'success');
        });
      }

      if (!validateStep(form, step.fields)) return;
      step.fields.forEach(function (f) { state.data[f.name] = readValue(form, f); });
      C.withLoading(button, SUBMIT_MS, function () {
        goTo(index + 1);
        // on a short flow the last form step lands straight on the offers panel
        if (index + 1 === offersIndex) loadOffers();
      });
    }

    /* ---- view toggle ---- */
    function showApply(on) {
      landing.forEach(function (n) { if (n) n.hidden = on; });
      view.hidden = !on;
      document.body.classList.toggle('is-applying', on);
      window.scrollTo(0, 0);
      if (on) goTo(state.step);
    }

    $$('[data-open-apply]').forEach(function (btn) {
      btn.addEventListener('click', function () { showApply(true); });
    });
    $('#applyExit').addEventListener('click', function () { showApply(false); });

    if (location.hash === '#apply') showApply(true);
    window.addEventListener('hashchange', function () {
      if (location.hash === '#apply') showApply(true);
    });
  }

  /* ==========================================================================
     Boot
     ========================================================================== */
  function init(product) {
    state.product = product;
    C.odometer();
    initCalculator(product);
    initEligibility(product);
    renderCompare(product);
    renderDocs(product);
    initStickyCta();
    initApply(product);
    C.initAccordion();
    C.initCarousels();
    C.initMenu();
    C.stampYear();
    C.initReveal();
  }

  return { init: init, RULES: RULES };
})();
