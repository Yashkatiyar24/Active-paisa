/* ==========================================================================
   Admin — Login (single admin, JWT)
   ========================================================================== */
APAdmin.register('login', (function () {
  'use strict';
  var UI = APAdmin.UI, C = APAdmin.C, Store = APAdmin.Store;

  return function (host) {
    if (Store.currentUser()) { location.replace('dashboard.html'); return; }

    host.classList.add('a-login');
    host.textContent = '';

    var left = UI.h('div', 'a-login-art');
    var brand = UI.h('div', 'a-login-brand');
    var logo = document.createElement('img');
    logo.src = '/assets/brand/logo-640.png';
    logo.alt = 'Activ Paisa';
    logo.className = 'a-brand-logo';
    brand.appendChild(logo);
    left.appendChild(brand);
    left.appendChild(UI.h('h2', null, 'One place for every loan application.'));
    left.appendChild(UI.h('p', 'a-login-copy',
      'Track leads, verify documents, move loans from New to Disbursed, and ' +
      'export the reports lenders ask for.'));

    var bullets = UI.h('ul', 'a-login-bullets');
    [
      ['apps', 'Every website submission lands here automatically'],
      ['shield', 'Secured by JWT authentication'],
      ['reports', 'CSV and Excel exports in one click']
    ].forEach(function (b) {
      var li = UI.h('li', null);
      li.appendChild(UI.icon(b[0], 18));
      li.appendChild(UI.h('span', null, b[1]));
      bullets.appendChild(li);
    });
    left.appendChild(bullets);
    left.appendChild(UI.h('div', 'a-login-foot', '\u00A9 ' + new Date().getFullYear() + ' Activ Paisa'));

    var right = UI.h('div', 'a-login-right');
    var card = UI.h('div', 'a-login-card');
    card.appendChild(UI.h('h1', null, 'Sign in'));
    card.appendChild(UI.h('p', 'a-login-hint', 'Authorised administrators only.'));

    var form = UI.h('form', 'a-login-form');
    form.noValidate = true;

    var em = UI.h('div', 'field');
    em.appendChild(UI.h('label', null, 'Email address'));
    var emInput = UI.h('input');
    emInput.type = 'email'; emInput.name = 'email'; emInput.placeholder = 'you@activpaisa.com'; emInput.autocomplete = 'username';
    em.appendChild(emInput);
    em.appendChild(UI.h('p', 'error'));
    form.appendChild(em);

    var pw = UI.h('div', 'field');
    pw.appendChild(UI.h('label', null, 'Password'));
    var pwInput = UI.h('input');
    pwInput.type = 'password'; pwInput.name = 'password'; pwInput.placeholder = 'Your password'; pwInput.autocomplete = 'current-password';
    pw.appendChild(pwInput);
    pw.appendChild(UI.h('p', 'error'));
    form.appendChild(pw);

    var errBox = UI.h('p', 'a-login-error');
    errBox.hidden = true;

    var submit = UI.h('button', 'btn btn-primary btn-block', 'Sign in');
    submit.type = 'submit';
    form.appendChild(submit);
    form.appendChild(errBox);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      errBox.hidden = true;
      var ok = true;
      if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(emInput.value)) { C.setError(emInput, 'Enter a valid email address.'); ok = false; } else C.clearError(emInput);
      if (!pwInput.value) { C.setError(pwInput, 'Enter your password.'); ok = false; } else C.clearError(pwInput);
      if (!ok) return;
      C.withLoading(submit, 900, function () {
        Store.login(emInput.value, pwInput.value).then(function (res) {
          if (!res.ok) {
            errBox.textContent = res.error;
            errBox.hidden = false;
            submit.disabled = false;
            return;
          }
          location.replace('dashboard.html');
        }).catch(function (e2) {
          errBox.textContent = (e2 && e2.message) || 'Sign in failed.';
          errBox.hidden = false;
          submit.disabled = false;
        });
      });
    });
    card.appendChild(form);

    right.appendChild(card);
    host.appendChild(left);
    host.appendChild(right);
  };
})());