/* ==========================================================================
   Admin — Applications
   Filters + search, sortable columns, pagination, multi-select bulk updates,
   CSV / Excel export, manual entry.
   ========================================================================== */

var APBulk = (function () {
  'use strict';
  var sel = {};
  return { set: function (o) { sel = o; }, get: function () { return sel; } };
})();

APAdmin.register('applications', (function () {
  'use strict';
  var UI = APAdmin.UI, Store = APAdmin.Store, C = APAdmin.C, X = APX;

  var host = null;
  var state = {
    page: 1, per: 10,
    q: '', status: '', loan: '', exec: '',
    order: 'date', dir: -1, queue: ''
  };

  /* honour ?queue=attention (dashboard shortcut) */
  (function () {
    var m = location.search.match(/queue=([a-z_]+)/);
    if (m) state.queue = m[1];
  })();

  function paint() {
    host.textContent = '';
    var list = applyFilters(Store.listApplications());
    var total = list.length;
    var pages = Math.max(1, Math.ceil(total / state.per));
    if (state.page > pages) state.page = pages;
    var slice = list.slice((state.page - 1) * state.per, state.page * state.per);

    host.appendChild(toolbar());
    var card = X.card('All applications', X.countPill(total));
    var body = X.bodyFor(card);
    if (!slice.length) {
      var clearBtn = UI.h('button', 'btn btn-ghost btn-sm', 'Clear filters');
      clearBtn.addEventListener('click', function () { reset(); });
      body.appendChild(UI.emptyState('apps', 'No applications match your filters',
        'Try clearing the search or adjusting the filters.', clearBtn));
    } else {
      body.appendChild(table(slice, total, pages));
    }
    host.appendChild(card);

    var sel = APBulk.get();
    if (Object.keys(sel).length && Store.can('edit_status')) host.appendChild(bulkBar());
  }

  function reset() {
    state.q = ''; state.status = ''; state.loan = ''; state.exec = ''; state.city = '';
    state.page = 1; state.order = 'date'; state.dir = -1; state.queue = '';
    if (history.replaceState) history.replaceState(null, null, 'applications.html');
    paint();
  }

  function applyFilters(list) {
    if (state.queue === 'attention') {
      list = list.filter(function (a) { return a.status === 'new' || a.status === 'docs_pending'; });
    }
    if (state.q) {
      list = list.filter(function (a) {
        var hay = (a.customer.name + ' ' + a.customer.phone + ' ' + a.customer.email + ' ' + a.ref + ' ' + a.loanLabel).toLowerCase();
        return hay.indexOf(state.q) !== -1;
      });
    }
    if (state.status) list = list.filter(function (a) { return a.status === state.status; });
    if (state.loan) list = list.filter(function (a) { return a.loanId === state.loan; });
    if (state.exec) list = list.filter(function (a) { return a.executive === state.exec; });
    if (state.city) list = list.filter(function (a) { return String(a.customer.city || '').toLowerCase() === String(state.city).toLowerCase(); });

    var k = state.order;
    return list.sort(function (a, b) {
      var va = k === 'name' ? a.customer.name.toLowerCase() : a[k];
      var vb = k === 'name' ? b.customer.name.toLowerCase() : b[k];
      if (typeof va === 'string') return va.localeCompare(vb) * state.dir;
      return (va > vb ? 1 : va < vb ? -1 : 0) * state.dir;
    });
  }

  function toolbar() {
    var bar = UI.h('div', 'a-filters');

    var search = UI.h('div', 'a-search');
    search.appendChild(UI.icon('search', 16));
    var si = UI.h('input');
    si.type = 'search';
    si.placeholder = 'Search name, phone, email\u2026';
    si.value = state.q;
    search.appendChild(si);
    var deb = null;
    si.addEventListener('input', function () {
      clearTimeout(deb);
      deb = setTimeout(function () { state.q = si.value.trim().toLowerCase(); state.page = 1; paint(); }, 260);
    });
    bar.appendChild(search);

    bar.appendChild(filterSelect('status'));
    bar.appendChild(filterSelect('loan'));
    bar.appendChild(filterSelect('exec'));
    bar.appendChild(filterSelect('city'));

    var res = UI.h('button', 'a-icon-btn');
    res.title = 'Reset filters';
    res.appendChild(UI.icon('refresh', 16));
    res.addEventListener('click', reset);
    bar.appendChild(res);

    if (Store.can('view_all')) {
      var add = UI.h('button', 'btn btn-primary btn-sm');
      add.appendChild(UI.icon('plus', 15));
      add.appendChild(UI.h('span', null, 'New application'));
      add.addEventListener('click', newApplication);
      bar.appendChild(add);
    }
    if (Store.can('export')) {
      var dl = UI.h('button', 'a-icon-btn');
      dl.title = 'Export current view';
      dl.appendChild(UI.icon('download', 17));
      dl.addEventListener('click', function () { exportMenu(dl); });
      bar.appendChild(dl);
    }
    return bar;
  }

  function filterSelect(kind) {
    var s = UI.h('select');
    if (kind === 'status') {
      s.appendChild(X.opt('', 'All statuses'));
      Store.STATUS_FLOW.concat(Store.TERMINAL).forEach(function (st) {
        s.appendChild(X.opt(st.id, st.label, state.status === st.id));
      });
      s.addEventListener('change', function () { state.status = s.value; state.page = 1; paint(); });
    }
    if (kind === 'loan') {
      s.appendChild(X.opt('', 'All loan types'));
      Store.LOAN_TYPES.forEach(function (t) { s.appendChild(X.opt(t.id, t.label, state.loan === t.id)); });
      s.addEventListener('change', function () { state.loan = s.value; state.page = 1; paint(); });
    }
    if (kind === 'exec') {
      s.appendChild(X.opt('', 'All owners'));
      X.executives(false).forEach(function (u) { s.appendChild(X.opt(u.name, u.name, state.exec === u.name)); });
      s.addEventListener('change', function () { state.exec = s.value; state.page = 1; paint(); });
    }
    if (kind === 'city') {
      s.appendChild(X.opt('', 'All cities'));
      var seen = {};
      Store.listApplications().forEach(function (a) {
        var c = a.customer.city;
        if (c && !seen[c]) { seen[c] = 1; s.appendChild(X.opt(c, c, state.city === c)); }
      });
      s.addEventListener('change', function () { state.city = s.value; state.page = 1; paint(); });
    }
    return s;
  }

  function table(slice, total, pages) {
    var wrap = UI.h('div', 'a-table-wrap');
    var table = UI.h('table', 'a-table');
    var thead = document.createElement('thead');
    var head = document.createElement('tr');

    head.appendChild(emptyTh());                 /* checkbox column */
    head.appendChild(thHeading('name', 'Applicant'));
    head.appendChild(thHeading('ref', 'Ref'));
    head.appendChild(thHeading('loan', 'Loan'));
    head.appendChild(thHeading('amount', 'Amount'));
    head.appendChild(thHeading('status', 'Status'));
    head.appendChild(thHeading('date', 'Created'));
    var ownerTh = document.createElement('th');
    ownerTh.appendChild(UI.h('span', 'a-th-label', 'Owner'));
    head.appendChild(ownerTh);

    thead.appendChild(head);
    table.appendChild(thead);

    var body = document.createElement('tbody');
    slice.forEach(function (a) { body.appendChild(row(a)); });
    table.appendChild(body);
    wrap.appendChild(table);

    var foot = UI.h('div', 'a-table-foot');
    var pager = UI.pager(total, state.page, state.per, function (n) { state.page = n; paint(); });
    if (pager) foot.appendChild(pager);
    wrap.appendChild(foot);
    return wrap;
  }

  function thHeading(key, label) {
    var td = document.createElement('th');
    td.appendChild(UI.h('span', 'a-th-label', label));
    var sortable = ['name', 'ref', 'amount', 'status', 'date', 'loan'].indexOf(key) > -1;
    if (sortable) {
      td.classList.add('is-sortable');
      if (state.order === key) td.appendChild(UI.icon(state.dir === -1 ? 'chevronDown' : 'chevronUp', 12));
      td.addEventListener('click', function () {
        if (state.order === key) state.dir *= -1; else { state.order = key; state.dir = -1; }
        paint();
      });
    }
    return td;
  }
  function emptyTh() { return document.createElement('th'); }

  function uiColor(name) {
    var hues = ['#0C6E6E', '#7C3AED', '#2563EB', '#D97706', '#0891B2', '#DC2626', '#0D3B45', '#B45309', '#4338CA', '#047857'];
    var n = 0;
    for (var i = 0; i < String(name).length; i++) n = (n * 31 + String(name).charCodeAt(i)) >>> 0;
    return hues[n % hues.length];
  }

  function cell(children) {
    var td = document.createElement('td');
    if (children instanceof Node) td.appendChild(children);
    else td.textContent = children;
    return td;
  }

  function row(a) {
    var tr = document.createElement('tr');
    var selected = APBulk.get();

    var cb = UI.h('input', 'a-row-check');
    cb.type = 'checkbox';
    cb.checked = !!selected[a.id];
    cb.setAttribute('aria-label', 'Select ' + a.customer.name);
    cb.addEventListener('change', function () {
      if (cb.checked) selected[a.id] = 1; else delete selected[a.id];
      paint();
    });
    tr.appendChild(cell(cb));

    var who = UI.h('div', 'a-who');
    who.appendChild(UI.avatar(a.customer.name, 32, uiColor(a.customer.name)));
    var names = UI.h('div', 'a-who-text');
    names.appendChild(UI.h('strong', null, a.customer.name));
    names.appendChild(UI.h('span', null, a.customer.email));
    who.appendChild(names);
    tr.appendChild(cell(who));

    tr.appendChild(cell(a.ref));
    tr.appendChild(cell(X.shortLoan(a.loanLabel)));
    tr.appendChild(cell(UI.rupees(a.amount)));
    tr.appendChild(cell(UI.chip(a.status)));
    tr.appendChild(cell(UI.fmtDate(a.created)));

    var own = UI.h('div', 'a-owner');
    if (a.executive) own.appendChild(UI.avatar(a.executive.split(' ')[0], 24, uiColor(a.executive)));
    else own.appendChild(UI.h('span', 'a-unassigned', 'Unassigned'));
    tr.appendChild(cell(own));

    tr.classList.add('is-clickable');
    tr.addEventListener('click', function (e) {
      if (e.target.closest('input')) return;
      location.href = X.appUrl(a.id);
    });
    return tr;
  }
  /* ---------- export ---------- */
  function exportMenu(trigger) {
    UI.dropdown(trigger, function (root) {
      root.appendChild(UI.menuItem('Download CSV', 'csv', { icon: 'download' }));
      root.appendChild(UI.menuItem('Download Excel', 'xlsx', { icon: 'download' }));
    }, function (action) {
      exportRows(action === 'xlsx');
    });
  }
  function exportRows(excel) {
    var qs = [];
    var selected = APBulk.get();
    var selIds = Object.keys(selected).filter(function (k) { return selected[k]; });
    if (selIds.length) qs.push('ids=' + encodeURIComponent(selIds.join(',')));
    if (!selIds.length) {
      if (state.q) qs.push('search=' + encodeURIComponent(state.q));
      if (state.status) qs.push('status=' + encodeURIComponent(state.status));
      if (state.loan) qs.push('loan_type=' + encodeURIComponent(state.loan));
      if (state.exec) qs.push('executive=' + encodeURIComponent(state.exec));
      if (state.city) qs.push('city=' + encodeURIComponent(state.city));
    }
    var url = '/api/v1/export?fmt=' + (excel ? 'xlsx' : 'csv') + (qs.length ? '&' + qs.join('&') : '');
    var s = Store.session();
    if (s && s.token) {
      fetch(url, { headers: { 'Authorization': 'Bearer ' + s.token } })
        .then(function (r) {
          if (!r.ok) return r.json().then(function (j) { throw new Error((j && j.detail) || 'Export failed'); });
          return r.blob();
        })
        .then(function (blob) {
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'applications-' + stamp() + (excel ? '.xlsx' : '.csv');
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 100);
          UI.toast(excel ? 'Excel export downloaded.' : 'CSV export downloaded.', 'success');
        })
        .catch(function (e) { UI.toast((e && e.message) || 'Export failed.', 'error'); });
    } else {
      UI.toast('Please sign in again.', 'error');
    }
  }
  function stamp() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  /* ---------- add ---------- */
  function newApplication() {
    var m = UI.modal({ title: 'Add application' });
    var b = m.body;
    var f = UI.h('form', 'a-form-grid');
    f.noValidate = true;

    var name = UI.h('input'); name.placeholder = 'Full name';
    var phone = UI.h('input'); phone.type = 'tel'; phone.maxLength = 10; phone.placeholder = '10-digit mobile';
    var email = UI.h('input'); email.type = 'email'; email.placeholder = 'name@example.com';
    var amount = UI.h('input'); amount.type = 'text'; amount.placeholder = '\u20B9 5,00,000';
    var loan = UI.h('select');
    Store.LOAN_TYPES.forEach(function (t) { loan.appendChild(X.opt(t.id, t.label, t.id === 'personal')); });
    var own = UI.h('select');
    own.appendChild(X.opt('', 'Unassigned'));
    X.executives(true).forEach(function (u) { own.appendChild(X.opt(u.name, u.name)); });

    f.appendChild(X.field('Customer name', name));
    f.appendChild(X.field('Mobile', phone));
    f.appendChild(X.field('Email', email));
    f.appendChild(X.field('Amount required', amount));
    f.appendChild(X.field('Loan type', loan));
    f.appendChild(X.field('Owner', own));
    b.appendChild(f);

    var actions = UI.h('div', 'a-form-actions');
    var cancel = UI.h('button', 'btn btn-ghost btn-sm', 'Cancel');
    var save = UI.h('button', 'btn btn-primary btn-sm', 'Create application');
    save.type = 'submit';
    cancel.addEventListener('click', m.close);
    actions.appendChild(cancel);
    actions.appendChild(save);
    f.appendChild(actions);

    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      if (!name.value.trim()) { C.setError(name, 'Enter the customer name.'); ok = false; } else C.clearError(name);
      if (!/^[6-9]\d{9}$/.test(phone.value)) { C.setError(phone, 'Enter a valid 10-digit mobile.'); ok = false; } else C.clearError(phone);
      if (email.value && !/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email.value)) { C.setError(email, 'Enter a valid email.'); ok = false; } else C.clearError(email);
      var amt = parseInt(amount.value.replace(/\D/g, ''), 10) || 0;
      if (amt < 1000) { C.setError(amount, 'Enter the amount required.'); ok = false; } else C.clearError(amount);
      if (!ok) return;

      var execUser = null;
      if (own.value) execUser = Store.users().filter(function (u) { return u.name === own.value; })[0];

      var app = {
        ref: '\u2026',
        created: Date.now(), updated: Date.now(),
        loanId: loan.value,
        loanLabel: (Store.LOAN_MAP[loan.value] || {}).label,
        amount: amt, tenureMonths: 36, status: 'new',
        executive: own.value || '', source: 'Manual entry',
        notes: [], docs: [],
        timeline: [{ at: Date.now(), text: 'Application created.', by: APAdmin.me().name }],
        customer: { name: name.value.trim(), phone: phone.value, email: email.value.toLowerCase(), city: '', occupation: '' }
      };
      Store.insertApplication(app).then(function (res) {
        if (res.ok) {
          UI.toast('Application created.', 'success');
          m.close();
          paint();
        } else {
          UI.toast(res.error || 'Could not create application.', 'error');
        }
      }).catch(function (err) {
        UI.toast((err && err.message) || 'Could not create application.', 'error');
      });
    });
  }

  /* ---------- bulk ---------- */
  function bulkBar() {
    var bar = UI.h('div', 'a-bulk');
    var select = UI.h('select');
    select.appendChild(X.opt('', 'Move selected to\u2026'));
    Store.STATUS_FLOW.concat(Store.TERMINAL).forEach(function (s) { select.appendChild(X.opt(s.id, s.label)); });
    var apply = UI.h('button', 'btn btn-primary btn-sm', 'Apply');
    var clear = UI.h('button', 'btn btn-ghost btn-sm', 'Clear');
    var count = Object.keys(APBulk.get()).length;

    bar.appendChild(UI.h('span', 'a-bulk-count', count + ' selected'));
    bar.appendChild(select);
    bar.appendChild(apply);
    bar.appendChild(clear);

    apply.addEventListener('click', function () {
      if (!select.value) return;
      UI.confirmDialog({
        title: 'Bulk update',
        body: 'Move ' + count + ' selected application(s) to "' + Store.STATUS_MAP[select.value].label + '"?',
        confirm: 'Update ' + count
      }, function () {
        Object.keys(APBulk.get()).forEach(function (id) {
          Store.setStatus(id, select.value, 'Batch update');
        });
        UI.toast('Moved ' + count + ' to ' + Store.STATUS_MAP[select.value].label + '.', 'success');
        clearSel();
      });
    });
    clear.addEventListener('click', clearSel);
    function clearSel() {
      Object.keys(APBulk.get()).forEach(function (id) { delete APBulk.get()[id]; });
      paint();
    }
    return bar;
  }

  return function (hostEl) {
    host = hostEl;
    paint();
  };
})());