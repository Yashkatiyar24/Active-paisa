/* ==========================================================================
   Activ Paisa — shared core
   DOM helpers, formatting, validation, money maths and the widgets used by
   every loan product. Plain script (no modules) so pages still open on file://
   ========================================================================== */

var APCore = (function () {
  'use strict';

  /* ---------- DOM ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;   // textContent — never innerHTML
    return node;
  }

  function img(src, alt, size) {
    var node = document.createElement('img');
    node.src = src;
    node.alt = alt || '';
    if (size) { node.width = size; node.height = size; }
    node.loading = 'lazy';
    node.decoding = 'async';
    return node;
  }

  var SVG_NS = 'http://www.w3.org/2000/svg';
  function svg(viewBox, paths, size) {
    var node = document.createElementNS(SVG_NS, 'svg');
    node.setAttribute('viewBox', viewBox);
    node.setAttribute('aria-hidden', 'true');
    if (size) { node.setAttribute('width', size); node.setAttribute('height', size); }
    paths.forEach(function (spec) {
      var path = document.createElementNS(SVG_NS, spec.tag || 'path');
      Object.keys(spec).forEach(function (k) {
        if (k !== 'tag') path.setAttribute(k, spec[k]);
      });
      node.appendChild(path);
    });
    return node;
  }

  /* ---------- Formatting ---------- */
  var inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
  function money(n) { return '₹' + inr.format(Math.round(n)); }
  function group(n) { return inr.format(n); }
  function digitsOnly(s) { return String(s).replace(/\D/g, ''); }

  /* Indian short form — 1250000 -> "12.5 L", 25000000 -> "2.5 Cr" */
  function shortMoney(n) {
    if (n >= 10000000) return '₹' + (n / 10000000).toFixed(n % 10000000 ? 2 : 0).replace(/\.00$/, '') + ' Cr';
    if (n >= 100000)   return '₹' + (n / 100000).toFixed(n % 100000 ? 1 : 0).replace(/\.0$/, '') + ' L';
    if (n >= 1000)     return '₹' + (n / 1000).toFixed(0) + 'K';
    return money(n);
  }

  /* ---------- Money maths ---------- */
  function emi(principal, annualRate, months) {
    if (!principal || !months) return 0;
    var r = annualRate / 12 / 100;
    if (r === 0) return principal / months;
    var f = Math.pow(1 + r, months);
    return principal * r * f / (f - 1);
  }

  function schedule(principal, annualRate, months) {
    var monthly = emi(principal, annualRate, months);
    var total = monthly * months;
    return {
      emi: monthly,
      total: total,
      interest: total - principal,
      principal: principal
    };
  }

  /* Largest principal whose EMI fits the affordable slice of monthly income. */
  function affordablePrincipal(monthlyIncome, existingEmi, annualRate, months, foirPct) {
    var capacity = (monthlyIncome * (foirPct / 100)) - (existingEmi || 0);
    if (capacity <= 0) return 0;
    var r = annualRate / 12 / 100;
    if (r === 0) return capacity * months;
    var f = Math.pow(1 + r, months);
    return capacity * (f - 1) / (r * f);
  }

  /* ---------- Validation ---------- */
  var PATTERNS = {
    mobile:  /^[6-9]\d{9}$/,
    pan:     /^[A-Z]{5}[0-9]{4}[A-Z]$/,
    email:   /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/,
    pincode: /^[1-9]\d{5}$/,
    gstin:   /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/,
    name:    /^[A-Za-z][A-Za-z .'-]{1,59}$/,
    org:     /^[A-Za-z0-9][A-Za-z0-9 .,&()'\/-]{1,79}$/
  };

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

  /* ---------- Input masks ---------- */
  function maskNumeric(input, maxLen) {
    input.addEventListener('input', function () {
      var v = digitsOnly(input.value);
      input.value = maxLen ? v.slice(0, maxLen) : v;
    });
  }

  function maskMoney(input, maxDigits) {
    input.addEventListener('input', function () {
      var v = digitsOnly(input.value).slice(0, maxDigits || 9);
      input.value = v ? inr.format(parseInt(v, 10)) : '';
    });
  }

  function maskUpper(input, maxLen) {
    input.addEventListener('input', function () {
      input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, maxLen);
    });
  }

  /* ---------- Toasts ---------- */
  var TOAST_LIFE = 4000;
  function toast(message, type) {
    var host = $('#toasts');
    if (!host) return;
    var node = el('div', 'toast' + (type ? ' ' + type : ''), message);
    host.appendChild(node);
    setTimeout(function () {
      node.classList.add('is-out');
      node.addEventListener('animationend', function () { node.remove(); });
    }, TOAST_LIFE);
  }

  /* ---------- Reveal on scroll ----------
     The motion vocabulary a JS animation library would give us, done with a
     class toggle and a CSS transition. Honours reduced-motion by revealing
     everything immediately. */
  function initReveal(root) {
    var targets = $$('[data-reveal]', root || document);
    if (!targets.length) return;

    var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (still || !('IntersectionObserver' in window)) {
      targets.forEach(function (n) { n.classList.add('is-in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var node = entry.target;
        // stagger siblings so a row of cards arrives in sequence
        var delay = Number(node.dataset.revealDelay || 0);
        setTimeout(function () { node.classList.add('is-in'); }, delay);
        io.unobserve(node);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });

    targets.forEach(function (n) { io.observe(n); });
  }

  /* Give each child of a group an increasing reveal delay. */
  function stagger(container, stepMs) {
    $$('[data-reveal]', container).forEach(function (n, i) {
      n.dataset.revealDelay = String(i * (stepMs || 70));
    });
  }

  /* ---------- Carousel ---------- */
  var AUTOPLAY_MS = 3200;

  function initCarousel(root) {
    var track = $('[data-car-track]', root);
    var prev = $('[data-car-prev]', root);
    var next = $('[data-car-next]', root);
    var pause = $('[data-car-pause]', root);
    var auto = root.hasAttribute('data-autoscroll');
    var timer = null, hovered = false;
    var stoppedByUser = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function step() {
      var first = track.firstElementChild;
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return first ? first.getBoundingClientRect().width + gap : track.clientWidth;
    }

    function rewind(by) {
      track.style.scrollBehavior = 'auto';
      track.scrollLeft += by;
      track.style.scrollBehavior = '';
    }

    function advance(dir) {
      var half = track.scrollWidth / 2;
      if (auto && half > 0) {
        if (dir > 0 && track.scrollLeft >= half - 2) rewind(-half);
        else if (dir < 0 && track.scrollLeft <= 2) rewind(half);
      }
      track.scrollLeft += dir * step();
    }

    function sync() {
      if (auto || !prev || !next) return;
      var max = track.scrollWidth - track.clientWidth;
      prev.disabled = track.scrollLeft < 4;
      next.disabled = track.scrollLeft >= max - 4;
    }

    if (prev) prev.addEventListener('click', function () { advance(-1); });
    if (next) next.addEventListener('click', function () { advance(1); });
    track.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);

    if (!auto) {
      sync();
      new MutationObserver(sync).observe(track, { childList: true });
      return null;
    }

    function refresh() {
      var run = !stoppedByUser && !hovered;
      root.classList.toggle('is-paused', !run);
      if (run && !timer) timer = setInterval(function () { advance(1); }, AUTOPLAY_MS);
      if (!run && timer) { clearInterval(timer); timer = null; }
    }

    root.addEventListener('mouseenter', function () { hovered = true; refresh(); });
    root.addEventListener('mouseleave', function () { hovered = false; refresh(); });
    root.addEventListener('focusin', function () { hovered = true; refresh(); });
    root.addEventListener('focusout', function () { hovered = false; refresh(); });

    if (pause) {
      pause.addEventListener('click', function () {
        stoppedByUser = !stoppedByUser;
        pause.setAttribute('aria-label', stoppedByUser ? 'Play the carousel' : 'Pause the carousel');
        hovered = false;
        refresh();
      });
    }
    return { start: refresh };
  }

  function makeSeamless(track) {
    $$(':scope > *', track).forEach(function (item) {
      var clone = item.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      $$('a, button', clone).forEach(function (n) { n.setAttribute('tabindex', '-1'); });
      track.appendChild(clone);
    });
  }

  function initCarousels(root) {
    $$('[data-carousel]', root || document).forEach(function (car) {
      var track = $('[data-car-track]', car);
      if (car.hasAttribute('data-autoscroll') && track.children.length) makeSeamless(track);
      var api = initCarousel(car);
      if (api) api.start();
    });
  }

  /* ---------- Accordion (FAQ) ---------- */
  function initAccordion(root) {
    $$('[data-accordion]', root || document).forEach(function (group) {
      $$('[data-acc-trigger]', group).forEach(function (trigger) {
        trigger.addEventListener('click', function () {
          var item = trigger.closest('[data-acc-item]');
          var open = item.classList.contains('is-open');
          // single-open behaviour reads better for FAQ than many panels at once
          $$('[data-acc-item]', group).forEach(function (other) {
            other.classList.remove('is-open');
            $('[data-acc-trigger]', other).setAttribute('aria-expanded', 'false');
          });
          if (!open) {
            item.classList.add('is-open');
            trigger.setAttribute('aria-expanded', 'true');
          }
        });
      });
    });
  }

  /* ---------- Loading button ---------- */
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

  /* ---------- Hero odometer ----------
     Spins each reel a full lap before landing on its digit. */
  function odometer(root) {
    var host = $('.odometer', root || document);
    if (!host) return;
    var digits = String(host.dataset.value || '').split('');
    host.textContent = '';

    digits.forEach(function (digit, i) {
      var col = el('span', 'odo-col');
      var list = el('span', 'odo-list');
      for (var n = 0; n < 20; n++) list.appendChild(el('span', 'odo-d', String(n % 10)));
      col.appendChild(list);
      host.appendChild(col);

      var target = 10 + Number(digit);
      requestAnimationFrame(function () {
        setTimeout(function () {
          list.style.transform = 'translateY(-' + (target * 100 / 20) + '%)';
        }, 90 * i);
      });
    });
  }

  /* ---------- Mobile menu ---------- */
  function initMenu() {
    var btn = $('#menuBtn');
    var nav = $('#headerNav');
    if (!btn || !nav) return;
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      nav.classList.toggle('is-open', !open);
    });
  }

  function stampYear() {
    var y = $('#year');
    if (y) y.textContent = String(new Date().getFullYear());
  }

  return {
    $: $, $$: $$, el: el, img: img, svg: svg,
    money: money, group: group, shortMoney: shortMoney, digitsOnly: digitsOnly, inr: inr,
    emi: emi, schedule: schedule, affordablePrincipal: affordablePrincipal,
    PATTERNS: PATTERNS, fieldOf: fieldOf, setError: setError, clearError: clearError, ageFrom: ageFrom,
    maskNumeric: maskNumeric, maskMoney: maskMoney, maskUpper: maskUpper,
    toast: toast, withLoading: withLoading,
    initReveal: initReveal, stagger: stagger,
    initCarousel: initCarousel, initCarousels: initCarousels, makeSeamless: makeSeamless,
    initAccordion: initAccordion, initMenu: initMenu, stampYear: stampYear,
    odometer: odometer
  };
})();
