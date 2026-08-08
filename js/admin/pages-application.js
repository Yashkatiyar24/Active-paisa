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
    var editBtn = UI.h('button', 'a-icon-btn');
    editBtn.title = 'Edit customer';
    editBtn.appendChild(UI.icon('edit', 14));
    editBtn.addEventListener('click', function () { editCustomer(c); });
    var card = X.card('Customer', Store.can('edit_status') ? editBtn : null);
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
    var editBtn = UI.h('button', 'a-icon-btn');
    editBtn.title = 'Edit loan details';
    editBtn.appendChild(UI.icon('edit', 14));
    editBtn.addEventListener('click', function () { editLoan(); });
    var kv = [
      ['Loan type', app.loanLabel],
      ['Amount requested', UI.rupees(app.amount)],
      ['Tenure', (app.tenureMonths || 0) + ' months'],
      ['Est. monthly payment', UI.rupees(UI.emi(app.amount, ten))]
    ];
    if (app.loanId === 'home') {
      kv.push(['Property city', app.propertyCity || '\u2014']);
      kv.push(['Property value', UI.rupees(app.propertyValue || 0)]);
      kv.push(['Purpose', app.purpose || '\u2014']);
      kv.push(['Monthly obligations', UI.rupees(app.monthlyObligations || 0)]);
    } else if (app.purpose) {
      kv.push(['Purpose', app.purpose]);
    }
    kv.push(['Source', app.source || '\u2014']);
    kv.push(['Created', UI.fmtDate(app.created)]);
    if (app.rejectionReason) kv.push(['Rejection reason', app.rejectionReason]);
    var card = statCard('Loan details', kv);
    var head = card.querySelector('.a-card-head');
    if (head && Store.can('edit_status')) {
      var wrap = UI.h('div', 'a-card-head-right');
      wrap.appendChild(editBtn);
      head.appendChild(wrap);
    }
    return card;
  }

  function docsCard() {
    var list = app.docs || [];
    var uploadBtn = null;
    if (Store.can('edit_status')) {
      uploadBtn = UI.h('button', 'a-icon-btn');
      uploadBtn.title = 'Upload document';
      uploadBtn.appendChild(UI.icon('upload', 14));
      uploadBtn.addEventListener('click', function () { uploadModal(); });
    }
    var card = X.card('Documents', X.countPill(list.length, ' document'));
    var b = X.bodyFor(card);
    if (!list.length) {
      b.appendChild(UI.h('p', 'a-muted', 'No documents uploaded yet'));
      if (uploadBtn) {
        var up0 = UI.h('button', 'btn btn-ghost btn-sm');
        up0.appendChild(UI.icon('upload', 14));
        up0.appendChild(UI.h('span', null, 'Upload document'));
        up0.addEventListener('click', function () { uploadModal(); });
        b.appendChild(up0);
      }
    }
    var rows = UI.h('div', 'a-docs');
    list.forEach(function (d) {
      var row = UI.h('div', 'a-doc');
      var ic = UI.h('span', 'a-doc-ic');
      ic.appendChild(UI.icon(/\.pdf$/i.test(d.name) ? 'docs' : 'image', 18));
      row.appendChild(ic);
      var mid = UI.h('div', 'a-doc-mid');
      mid.appendChild(UI.h('strong', null, d.label || d.name));
      mid.appendChild(UI.h('span', null, d.name + ' \u00B7 ' + (d.size || '') + ' \u00B7 ' + (d.uploadedBy || '') + ' \u00B7 ' + UI.timeAgo(d.at)));
      mid.appendChild(UI.chip(d.status === 'verified' ? 'approved' : (d.status === 'rejected' ? 'rejected' : (d.status === 'new' ? 'new' : d.status || 'new'))));
      row.appendChild(mid);
      var tools = UI.h('div', 'a-doc-tools');
      var dlBtn = UI.h('button', 'a-doc-dl');
      dlBtn.title = 'Download';
      dlBtn.appendChild(UI.icon('download', 16));
      dlBtn.addEventListener('click', function () {
        Store.downloadDocument(d).catch(function (err) { UI.toast(err.message || 'Download failed.', 'error'); });
      });
      tools.appendChild(dlBtn);
      if (Store.can('edit_status')) {
        if (d.status !== 'verified') {
          var vBtn = UI.h('button', 'a-doc-dl');
          vBtn.title = 'Verify';
          vBtn.appendChild(UI.icon('check', 16));
          vBtn.addEventListener('click', function () {
            Store.updateDocument(d.id, 'verified').then(function (r) {
              if (!r.ok) { UI.toast(r.error || 'Could not verify.', 'error'); return; }
              UI.toast('Document verified.', 'success');
              refresh();
            });
          });
          tools.appendChild(vBtn);
        }
        if (d.status !== 'rejected') {
          var rBtn = UI.h('button', 'a-doc-dl');
          rBtn.title = 'Reject';
          rBtn.appendChild(UI.icon('x', 16));
          rBtn.addEventListener('click', function () {
            Store.updateDocument(d.id, 'rejected').then(function (r) {
              if (!r.ok) { UI.toast(r.error || 'Could not reject.', 'error'); return; }
              UI.toast('Document rejected.', 'success');
              refresh();
            });
          });
          tools.appendChild(rBtn);
        }
      }
      row.appendChild(tools);
      rows.appendChild(row);
    });
    b.appendChild(rows);
    if (uploadBtn) {
      var actions = UI.h('div', 'a-doc-actions');
      var upBtn = UI.h('button', 'btn btn-ghost btn-sm');
      upBtn.appendChild(UI.icon('upload', 14));
      upBtn.appendChild(UI.h('span', null, 'Upload document'));
      upBtn.addEventListener('click', function () { uploadModal(); });
      actions.appendChild(upBtn);
      b.appendChild(actions);
    }
    return card;
  }

  function uploadModal() {
    var m = UI.modal({ title: 'Upload document' });
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf,image/png,image/jpeg';
    var labelIn = UI.h('input');
    labelIn.placeholder = 'Label (e.g. Bank statement, PAN card)';
    m.body.appendChild(X.field('Document file', input));
    m.body.appendChild(X.field('Label', labelIn));
    var actions = UI.h('div', 'a-form-actions');
    var cancel = UI.h('button', 'btn btn-ghost btn-sm', 'Cancel');
    var save = UI.h('button', 'btn btn-primary btn-sm', 'Upload');
    cancel.addEventListener('click', m.close);
    save.addEventListener('click', function () {
      if (!input.files || !input.files.length) { UI.toast('Choose a file first.', 'error'); return; }
      var file = input.files[0];
      if (file.size > 10 * 1024 * 1024) { UI.toast('File too large (max 10 MB).', 'error'); return; }
      save.disabled = true;
      save.textContent = 'Uploading\u2026';
      Store.uploadDocument(app.id, file, labelIn.value.trim() || 'Document').then(function (r) {
        if (!r.ok) { UI.toast(r.error || 'Upload failed.', 'error'); return; }
        UI.toast('Document uploaded.', 'success');
        m.close();
        refresh();
      }).catch(function (err) { UI.toast((err && err.message) || 'Upload failed.', 'error'); save.disabled = false; });
    });
    actions.appendChild(cancel);
    actions.appendChild(save);
    m.body.appendChild(actions);
  }

  function refresh() {
    Store.refreshApplication(app.id).then(function (serial) {
      app = serial;
      paint();
    }).catch(function () {});
  }

  function editCustomer(c) {
    var EMP = ['', 'Salaried', 'Self-employed', 'Business Owner', 'Freelancer', 'Retired', 'Unemployed'];
    var m = UI.modal({ title: 'Edit customer' });
    var f = UI.h('form', 'a-form-grid');
    f.noValidate = true;
    var nameI = UI.h('input'); nameI.value = c.name || '';
    var mobileI = UI.h('input'); mobileI.value = c.phone || '';
    var emailI = UI.h('input'); emailI.type = 'email'; emailI.value = c.email || '';
    var panI = UI.h('input'); panI.value = c.pan || '';
    var dobI = UI.h('input'); dobI.value = c.dob || '';
    var genderI = UI.h('select');
    ['', 'Male', 'Female', 'Other'].forEach(function (g) { genderI.appendChild(X.opt(g, g || 'Gender\u2026')); });
    genderI.value = c.gender || '';
    var cityI = UI.h('input'); cityI.value = c.city || '';
    var stateI = UI.h('input'); stateI.value = c.state || '';
    var pinI = UI.h('input'); pinI.value = c.pincode || '';
    var addressI = UI.h('textarea'); addressI.rows = 2; addressI.value = c.address || '';
    var empI = UI.h('select');
    EMP.forEach(function (e) { empI.appendChild(X.opt(e, e || 'Employment\u2026')); });
    empI.value = c.employment || '';
    var companyI = UI.h('input'); companyI.value = c.company || '';
    var incomeI = UI.h('input'); incomeI.type = 'number'; incomeI.value = c.income || '';
    var householdI = UI.h('input'); householdI.type = 'number'; householdI.value = c.household || '';
    var entityI = UI.h('input'); entityI.value = c.entityType || '';
    var vintageI = UI.h('input'); vintageI.value = c.vintage || '';
    var gstinI = UI.h('input'); gstinI.value = c.gstin || '';
    [
      ['Full name', nameI], ['Mobile', mobileI], ['Email', emailI], ['PAN', panI],
      ['Date of birth', dobI], ['Gender', genderI], ['City', cityI], ['State', stateI],
      ['Pincode', pinI], ['Address', addressI], ['Employment', empI], ['Company', companyI],
      ['Monthly income', incomeI], ['Annual household income', householdI],
      ['Entity type', entityI], ['Business vintage', vintageI], ['GSTIN', gstinI]
    ].forEach(function (p) { f.appendChild(X.field(p[0], p[1])); });
    m.body.appendChild(f);
    var actions = UI.h('div', 'a-form-actions');
    var cancel = UI.h('button', 'btn btn-ghost btn-sm', 'Cancel');
    var save = UI.h('button', 'btn btn-primary btn-sm', 'Save changes');
    cancel.addEventListener('click', m.close);
    save.addEventListener('click', function () {
      var payload = {
        name: nameI.value.trim() || null,
        mobile: mobileI.value.trim() || null,
        email: emailI.value.trim() || null,
        pan: panI.value.trim() || null,
        dob: dobI.value.trim() || null,
        gender: genderI.value || null,
        city: cityI.value.trim() || null,
        state: stateI.value.trim() || null,
        pincode: pinI.value.trim() || null,
        address: addressI.value.trim() || null,
        employment: empI.value || null,
        company: companyI.value.trim() || null,
        income: incomeI.value ? parseInt(incomeI.value, 10) : null,
        household: householdI.value ? parseInt(householdI.value, 10) : null,
        entityType: entityI.value.trim() || null,
        vintage: vintageI.value.trim() || null,
        gstin: gstinI.value.trim() || null
      };
      save.disabled = true;
      save.textContent = 'Saving\u2026';
      Store.updateCustomer(app.id, payload).then(function (r) {
        if (!r.ok) { UI.toast(r.error || 'Could not save.', 'error'); save.disabled = false; return; }
        UI.toast('Customer updated.', 'success');
        m.close();
        refresh();
      });
    });
    actions.appendChild(cancel);
    actions.appendChild(save);
    m.body.appendChild(actions);
  }

  function editLoan() {
    var m = UI.modal({ title: 'Edit loan details' });
    var f = UI.h('form', 'a-form-grid');
    f.noValidate = true;
    var typeI = UI.h('select');
    Store.LOAN_TYPES.forEach(function (lt) { typeI.appendChild(X.opt(lt.id, lt.label)); });
    typeI.value = app.loanId || 'personal';
    var amountI = UI.h('input'); amountI.type = 'number'; amountI.value = app.amount || '';
    var tenureI = UI.h('input'); tenureI.type = 'number'; tenureI.value = app.tenureMonths || '';
    var purposeI = UI.h('input'); purposeI.value = app.purpose || '';
    var cityI = null, valI = null, obI = null;
    f.appendChild(X.field('Loan type', typeI));
    f.appendChild(X.field('Amount', amountI));
    f.appendChild(X.field('Tenure (months)', tenureI));
    f.appendChild(X.field('Purpose', purposeI));
    if (app.loanId === 'home') {
      cityI = UI.h('input'); cityI.value = app.propertyCity || '';
      valI = UI.h('input'); valI.type = 'number'; valI.value = app.propertyValue || '';
      obI = UI.h('input'); obI.type = 'number'; obI.value = app.monthlyObligations || '';
      f.appendChild(X.field('Property city', cityI));
      f.appendChild(X.field('Property value', valI));
      f.appendChild(X.field('Monthly obligations', obI));
    }
    m.body.appendChild(f);
    var actions = UI.h('div', 'a-form-actions');
    var cancel = UI.h('button', 'btn btn-ghost btn-sm', 'Cancel');
    var save = UI.h('button', 'btn btn-primary btn-sm', 'Save changes');
    cancel.addEventListener('click', m.close);
    save.addEventListener('click', function () {
      var payload = {
        loan_type: typeI.value,
        amount: amountI.value ? parseInt(amountI.value, 10) : null,
        tenure_months: tenureI.value ? parseInt(tenureI.value, 10) : null,
        purpose: purposeI.value.trim() || null
      };
      if (cityI && valI && obI) {
        payload.property_city = cityI.value.trim() || null;
        payload.property_value = valI.value ? parseInt(valI.value, 10) : null;
        payload.monthly_obligations = obI.value ? parseInt(obI.value, 10) : null;
      }
      save.disabled = true;
      save.textContent = 'Saving\u2026';
      Store.updateLoan(app.id, payload).then(function (r) {
        if (!r.ok) { UI.toast(r.error || 'Could not save.', 'error'); save.disabled = false; return; }
        UI.toast('Loan updated.', 'success');
        m.close();
        refresh();
      });
    });
    actions.appendChild(cancel);
    actions.appendChild(save);
    m.body.appendChild(actions);
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