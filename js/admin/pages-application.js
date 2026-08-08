/* ==========================================================================
   Admin — Application detail
   ========================================================================== */

(function () {
  'use strict';

  var UI = APAdmin.UI, Store = APAdmin.Store, X = APX;
  var host = null, id = null, app = null;

function uiColor(name) {
    var hues = ['#0C6E6E', '#7C3AED', '#2563EB', '#D97706', '#0891B2', '#DC2626', '#0D3B45', '#B45309', '#4338CA', '#047857'];
    var n = 0;
    for (var i = 0; i < String(name).length; i++) n = (n * 31 + String(name).charCodeAt(i)) >>> 0;
    return hues[n % hues.length];
  }

  function money(value) {
    if (value === undefined || value === null || value === '') return '\u2014';
    var n = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
    return isNaN(n) ? '\u2014' : UI.rupees(n);
  }

  function paint() {
    if (!host) return;
    host.textContent = '';
    app = Store.getApplication(id);

    if (!app) {
      host.appendChild(UI.emptyState('apps', 'Application not found',
        'It may have been deleted from this workspace.',
        X.btnLink('Back to applications', 'applications.html')));
      return;
    }

    host.appendChild(headerBar());

    var grid = UI.h('div', 'a-detail-grid');
    var left = UI.h('div', 'a-detail-left');
    left.appendChild(customerCard());
    left.appendChild(loanCard());
    left.appendChild(docsCard());
    grid.appendChild(left);

    var right = UI.h('div', 'a-detail-right');
    right.appendChild(statusCard());
    right.appendChild(assignCard());
    right.appendChild(timelineCard());
    right.appendChild(notesCard());
    grid.appendChild(right);

    host.appendChild(grid);
  }

function backLink() {
    var a = UI.h('a', 'a-back-link');
    a.href = 'applications.html';
    a.appendChild(UI.icon('chevronRight', 15));
    a.appendChild(UI.h('span', null, 'Applications'));
    return a;
  }

  function headerBar() {
    var bar = UI.h('div', 'a-detail-head');
    bar.appendChild(backLink());
    var row = UI.h('div', 'a-detail-id');
    row.appendChild(UI.h('h2', null, app.ref));
    row.appendChild(UI.chip(app.status));
    bar.appendChild(row);

    var meta = UI.h('div', 'a-detail-meta');
    meta.appendChild(UI.h('span', null, app.customer.name));
    meta.appendChild(UI.h('span', null, ' \u00B7 ' + app.loanLabel));
    meta.appendChild(UI.h('span', null, ' \u00B7 ' + UI.rupees(app.amount)));
    meta.appendChild(UI.h('span', null, '\u00B7 created ' + UI.fmtDate(app.created)));
    bar.appendChild(meta);
    bar.appendChild(actionBar());
    return bar;
  }

  function actionBar() {
    var c = app.customer || {};
    var bar = UI.h('div', 'a-detail-actions');
    var phone = c.phone || '';

    if (Store.can('edit_status')) {
      bar.appendChild(iconBtn('Call', 'call', phone ? 'tel:' + phone : null));
      bar.appendChild(iconBtn('Email', 'mail', c.email ? 'mailto:' + c.email : null));
      bar.appendChild(iconBtn('WhatsApp', 'message', phone ? 'https://wa.me/91' + phone : null));
      bar.appendChild(iconBtn('Download', 'download', null, downloadApp));
      bar.appendChild(iconBtn('Print', 'print', null, function () { window.print(); }));
    }
    return bar;
  }

  function iconBtn(label, glyph, href, onClick) {
    var a = UI.h('button', 'a-icon-btn a-act-btn');
    a.title = label;
    a.appendChild(UI.icon(glyph, 16));
    a.appendChild(UI.h('span', null, label));
    if (href) a.addEventListener('click', function () { window.open(href, '_blank'); });
    else if (onClick) a.addEventListener('click', onClick);
    return a;
  }

  function downloadApp() {
    var lines = [app.ref, (app.customer.name || ''), (app.customer.phone || ''), app.loanLabel,
      UI.rupees(app.amount), 'Status: ' + app.status, 'Created: ' + UI.fmtDate(app.created)];
    UI.download('application-' + app.ref + '.txt', lines.join('\n') + '\n\n' + (app.reference_number || app.application_number || ''), 'text/plain');
    UI.toast('Application downloaded.', 'success');
  }

  function statCard(title, kv) {
    var card = X.card(title);
    var body = X.bodyFor(card);
    var dl = UI.h('dl', 'a-dl');
    kv.forEach(function (p) {
      dl.appendChild(UI.h('dt', null, p[0]));
      dl.appendChild(UI.h('dd', null, p[1]));
    });
    body.appendChild(dl);
    return card;
  }

  function customerCard() {
    var c = app.customer || {};
    var card = X.card('Customer');
    var b = X.bodyFor(card);
    var row = UI.h('div', 'a-cust-row');
    row.appendChild(UI.avatar(c.name || '?', 44, uiColor(c.name || '?')));
    var info = UI.h('div', null);
    info.appendChild(UI.h('strong', null, c.name || '\u2014'));
    info.appendChild(UI.h('span', 'a-cust-sub', c.occupation || 'Customer'));
    row.appendChild(info);
    b.appendChild(row);
    var dl = UI.h('dl', 'a-dl');
    [['Mobile', c.phone || '\u2014'],
     ['Email', c.email || '\u2014'],
     ['PAN', c.pan || '\u2014'],
     ['DOB', c.dob || '\u2014'],
     ['Gender', c.gender || '\u2014'],
     ['City', c.city || '\u2014'],
     ['Pincode', c.pincode || '\u2014'],
     ['Employment', c.employment || '\u2014'],
     ['Company', c.company || '\u2014'],
     ['Monthly income', money(c.income)],
     ['Household income', money(c.household)],
     ['Entity type', c.entityType || '\u2014'],
     ['Business vintage', c.vintage || '\u2014'],
     ['GSTIN', c.gstin || '\u2014'],
     ['Address', c.address || '\u2014']].forEach(function (p) {
      dl.appendChild(UI.h('dt', null, p[0]));
      dl.appendChild(UI.h('dd', null, p[1]));
    });
    b.appendChild(dl);
    return card;
  }

  function loanCard() {
    var ten = app.tenureMonths || 1;
    return statCard('Loan details', [
      ['Loan type', app.loanLabel],
      ['Amount requested', UI.rupees(app.amount)],
      ['Tenure', app.tenureMonths + ' months'],
      ['Est. monthly payment', UI.rupees(UI.emi(app.amount, ten))],
      ['Source', app.source],
      ['Created', UI.fmtDate(app.created)]
    ]);
  }

  function docsCard() {
    var list = app.docs || [];
    var card = X.card('Documents', X.countPill(list.length, ' document'));
    var b = X.bodyFor(card);
    if (!list.length) {
      b.appendChild(UI.h('p', 'a-muted', 'No documents uploaded yet.'));
      return card;
    }
    var rows = UI.h('div', 'a-docs');
    list.forEach(function (d) {
      var row = UI.h('div', 'a-doc');
      var ic = UI.h('span', 'a-doc-ic');
      ic.appendChild(UI.icon(/\.pdf$/i.test(d.name) ? 'docs' : 'image', 18));
      row.appendChild(ic);
      var mid = UI.h('div', 'a-doc-mid');
      mid.appendChild(UI.h('strong', null, d.label || d.name));
      mid.appendChild(UI.h('span', null, d.name + ' \u00B7 ' + d.size));
      row.appendChild(mid);
      var dlBtn = UI.h('button', 'a-doc-dl');
      dlBtn.title = 'Download';
      dlBtn.appendChild(UI.icon('download', 16));
      dlBtn.addEventListener('click', function () {
        UI.download(d.name, app.ref + '\n' + (d.label || d.name) + '\n' + (d.hint || '') + '\n\nPlaceholder document.',
          'text/plain');
      });
      row.appendChild(dlBtn);
      rows.appendChild(row);
    });
    b.appendChild(rows);
    return card;
  }

  function statusCard() {
    var card = X.card('Status');
    var body = X.bodyFor(card);
    body.appendChild(UI.stepper(app.status));

    var meta = Store.STATUS_MAP[app.status];
    if (meta && (meta.id === 'rejected' || meta.id === 'closed')) {
      body.appendChild(UI.h('p', 'a-muted a-status-note', 'This application is ' + meta.label.toLowerCase() + '.'));
    }

    if (!Store.can('edit_status')) {
      body.appendChild(UI.h('p', 'a-muted', 'You have view-only access to status updates.'));
    } else {
      var sel = UI.h('select');
      sel.appendChild(X.opt('', 'Mark as\u2026'));
      Store.nextStatuses(app.status).forEach(function (s) { sel.appendChild(X.opt(s.id, s.label)); });
      body.appendChild(sel);
      var save = UI.h('button', 'btn btn-primary btn-sm', 'Update status');
      save.type = 'button';
      save.addEventListener('click', function () {
        if (!sel.value) { UI.toast('Choose a status first.', 'error'); return; }
        Store.setStatus(app.id, sel.value);
        UI.toast('Moved to ' + Store.STATUS_MAP[sel.value].label + '.', 'success');
        paint();
      });
      body.appendChild(save);
    }
    return card;
  }

  function assignCard() {
    var card = X.card('Assigned owner');
    var body = X.bodyFor(card);
    var row = UI.h('div', 'a-assign-row');
    var sel = UI.h('select');
    sel.appendChild(X.opt('', 'Unassign'));
    X.executives(false).forEach(function (u) {
      sel.appendChild(X.opt(u.id, u.name, u.name === app.executive));
    });
    row.appendChild(sel);
    if (Store.can('assign')) {
      var save = UI.h('button', 'btn btn-ghost btn-sm', app.executive ? 'Reassign' : 'Assign');
      save.type = 'button';
      save.addEventListener('click', function () {
        Store.setAssignee(app.id, sel.value || '');
        UI.toast('Owner updated.', 'success');
        paint();
      });
      row.appendChild(save);
    }
    body.appendChild(row);
    return card;
  }

  function timelineCard() {
    var card = X.card('Timeline');
    var body = X.bodyFor(card);
    var t = app.timeline || [];
    if (!t.length) { body.appendChild(UI.h('p', 'a-muted', 'No timeline events yet.')); return card; }
    var list = UI.h('ul', 'a-timeline');
    t.slice(0, 14).forEach(function (ev) {
      var li = UI.h('li', null);
      var dot = UI.h('span', 'a-tl-dot');
      dot.appendChild(UI.icon('check', 11));
      li.appendChild(dot);
      var wrap = UI.h('div', null);
      wrap.appendChild(UI.h('span', 'a-tl-text', ev.text));
      wrap.appendChild(UI.h('span', 'a-tl-at', UI.timeAgo(ev.at) + (ev.by ? ' \u00B7 by ' + ev.by : '')));
      li.appendChild(wrap);
      list.appendChild(li);
    });
    body.appendChild(list);
    return card;
  }

  function notesCard() {
    var addBtn = null;
    if (Store.can('notes')) {
      addBtn = UI.h('button', 'linklike', '+ Add');
      addBtn.type = 'button';
      addBtn.addEventListener('click', promptNote);
    }
    var card = X.card('Internal notes', addBtn);
    var body = X.bodyFor(card);
    var notes = app.notes || [];
    if (!notes.length) { body.appendChild(UI.h('p', 'a-muted', 'No internal notes yet.')); return card; }
    var list = UI.h('div', 'a-notes');
    notes.forEach(function (n) {
      var item = UI.h('div', 'a-note');
      var who = n.by || 'Team';
      item.appendChild(UI.avatar(who, 26, uiColor(who)));
      var w = UI.h('div', null);
      w.appendChild(UI.h('span', 'a-note-meta', who + ' \u00B7 ' + UI.timeAgo(n.at)));
      w.appendChild(UI.h('p', null, n.text));
      item.appendChild(w);
      list.appendChild(item);
    });
    body.appendChild(list);
    return card;
  }

  function promptNote() {
    if (!Store.can('notes')) return;
    var m = UI.modal({ title: 'Add internal note' });
    var ta = document.createElement('textarea');
    ta.className = 'a-ta';
    ta.rows = 4;
    ta.placeholder = 'What happened on this application?';
    m.body.appendChild(ta);
    var actions = UI.h('div', 'a-form-actions');
    var cancel = UI.h('button', 'btn btn-ghost btn-sm', 'Cancel');
    var save = UI.h('button', 'btn btn-primary btn-sm', 'Save note');
    cancel.addEventListener('click', m.close);
    save.addEventListener('click', function () {
      if (!ta.value.trim()) return;
      Store.addNote(app.id, ta.value.trim());
      UI.toast('Note added.', 'success');
      m.close();
      paint();
    });
    actions.appendChild(cancel);
    actions.appendChild(save);
    m.body.appendChild(actions);
    setTimeout(function () { ta.focus(); }, 30);
  }

  APAdmin.register('application', function (hostEl) {
    host = hostEl;
    var m = location.search.match(/[?&]id=([^&]+)/);
    id = m ? decodeURIComponent(m[1]) : null;
    if (!id) { host.appendChild(UI.emptyState('apps', 'No application selected', '', X.btnLink('Back', 'applications.html'))); return; }
    paint();
  });
})();