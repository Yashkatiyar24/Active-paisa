/* ==========================================================================
   Admin — Application detail  (v2 — refined enterprise layout)
   ========================================================================== */

(function () {
  'use strict';

  var UI = APAdmin.UI, Store = APAdmin.Store, X = APX;
  var host = null, id = null, app = null;

  /* ------------------------------------------------------------------ helpers */
  function uiColor(name) {
    var hues = ['#0C6E6E', '#7C3AED', '#2563EB', '#D97706', '#0891B2', '#DC2626', '#0D3B45', '#B45309', '#4338CA', '#047857'];
    var n = 0;
    for (var i = 0; i < String(name).length; i++) n = (n * 31 + String(name).charCodeAt(i)) >>> 0;
    return hues[n % hues.length];
  }

  function money(value) {
    if (value === undefined || value === null || value === '') return '';
    var n = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
    return isNaN(n) ? '' : UI.rupees(n);
  }

  function isEmpty(value) {
    return value === undefined || value === null || value === '' || value === '-' || value === '\u2014';
  }

  function displayText(value) {
    if (isEmpty(value)) return '';
    var text = String(value).trim();
    return text === '-' ? '' : text;
  }

  function addField(rows, label, value, formatter) {
    var out = formatter ? formatter(value) : displayText(value);
    if (!out || out === '\u2014') return;
    rows.push([label, out]);
  }

  function fieldList(rows) {
    if (!rows.length) return UI.h('p', 'a-muted', 'No details available.');
    var dl = UI.h('dl', 'a-dl');
    rows.forEach(function (pair) {
      dl.appendChild(UI.h('dt', null, pair[0]));
      dl.appendChild(UI.h('dd', null, pair[1]));
    });
    return dl;
  }

  function actionBtn(label, glyph, onClick, extraClass) {
    var btn = UI.h('button', 'a-act-btn' + (extraClass ? ' ' + extraClass : ''));
    btn.type = 'button';
    btn.appendChild(UI.icon(glyph, 15));
    btn.appendChild(UI.h('span', null, label));
    btn.addEventListener('click', onClick);
    return btn;
  }

  function joinMeta(parts) {
    return parts.filter(function (p) { return !!p; }).join(' \u00B7 ');
  }

  /* ------------------------------------------------------------------ download helpers */
  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 500);
  }

  function exportExcel() {
    var session = Store.session ? Store.session() : null;
    var headers = {};
    if (session && session.token) headers.Authorization = 'Bearer ' + session.token;
    fetch('/api/v1/export?fmt=xlsx&ids=' + encodeURIComponent(app.id), { headers: headers })
      .then(function (res) {
        if (!res.ok) return res.json().then(function (j) { throw new Error((j && j.detail) || 'Export failed.'); });
        return res.blob();
      })
      .then(function (blob) {
        downloadBlob(blob, 'application-' + app.ref + '.xlsx');
        UI.toast('Excel export downloaded.', 'success');
      })
      .catch(function (err) { UI.toast((err && err.message) || 'Export failed.', 'error'); });
  }

  function downloadPdf() {
    var win = window.open('', '_blank', 'width=1080,height=900');
    if (!win) { UI.toast('Allow pop-ups to download the PDF.', 'error'); return; }
    var c = app.customer || {};
    var rows = [];
    addField(rows, 'Reference', app.ref);
    addField(rows, 'Applicant', c.name);
    addField(rows, 'Mobile', c.phone);
    addField(rows, 'Loan type', app.loanLabel);
    addField(rows, 'Amount', UI.rupees(app.amount));
    addField(rows, 'Tenure', (app.tenureMonths || 0) + ' months');
    addField(rows, 'Status', Store.STATUS_MAP[app.status] ? Store.STATUS_MAP[app.status].label : app.status);
    addField(rows, 'Owner', app.executive || 'Unassigned');
    addField(rows, 'Created', UI.fmtDate(app.created));
    var detailRows = rows.map(function (pair) {
      return '<tr><th>' + pair[0] + '</th><td>' + pair[1] + '</td></tr>';
    }).join('');
    var doc = '<!doctype html><html><head><meta charset="utf-8"><title>' + app.ref + '</title>' +
      '<style>body{font:14px/1.5 Inter,Arial,sans-serif;color:#0f172a;margin:32px}h1{font-size:22px;margin:0 0 6px}p{margin:0 0 20px;color:#475569}table{width:100%;border-collapse:collapse}th,td{padding:10px 0;border-bottom:1px solid #e2e8f0;text-align:left;vertical-align:top}th{width:180px;color:#64748b;font-weight:600}</style></head><body>' +
      '<h1>Application ' + app.ref + '</h1><p>' + app.loanLabel + ' \u00B7 ' + UI.rupees(app.amount) + ' \u00B7 ' + UI.fmtDate(app.created) + '</p><table>' + detailRows + '</table></body></html>';
    win.document.open();
    win.document.write(doc);
    win.document.close();
    win.focus();
    win.onafterprint = function () { try { win.close(); } catch (e) {} };
    setTimeout(function () { try { win.print(); } catch (e) {} }, 350);
  }

  /* ------------------------------------------------------------------ refresh */
  function refresh() {
    Store.refreshApplication(app.id).then(function (serial) {
      app = serial;
      paint();
    }).catch(function () {});
  }

  /* ================================================================== HEADER */
  function headerBar() {
    var bar = UI.h('div', 'a-detail-head-v2');

    /* back link */
    var back = UI.h('a', 'a-back-link');
    back.href = 'applications.html';
    back.appendChild(UI.icon('chevronRight', 14));
    back.appendChild(UI.h('span', null, 'Applications'));
    bar.appendChild(back);

    /* title + status chip */
    var titleBlock = UI.h('div', 'a-detail-title-block');
    titleBlock.appendChild(UI.h('h2', null, app.ref));
    titleBlock.appendChild(UI.chip(app.status));

    /* subtitle row */
    var sub = UI.h('div', 'a-detail-subtitle');
    var c = app.customer || {};
    [c.name || '', app.loanLabel, UI.rupees(app.amount), 'created ' + UI.fmtDate(app.created)]
      .filter(Boolean)
      .forEach(function (s) { sub.appendChild(UI.h('span', null, s)); });
    titleBlock.appendChild(sub);
    bar.appendChild(titleBlock);

    /* action buttons */
    var actions = UI.h('div', 'a-detail-actions-v2');
    if (Store.can('assign')) {
      actions.appendChild(actionBtn('Assign', 'users', openAssignModal));
    }
    actions.appendChild(actionBtn('Download PDF', 'download', downloadPdf));
    if (Store.can('export')) {
      actions.appendChild(actionBtn('Export Excel', 'table', exportExcel));
    }
    bar.appendChild(actions);

    return bar;
  }

  /* ================================================================== OVERVIEW CARD (left, full-width top) */
  function overviewCard() {
    var c = app.customer || {};
    var card = X.card('Overview', null, 'a-detail-span-12');
    var body = X.bodyFor(card);

    /* pills row */
    var grid = UI.h('div', 'a-overview-grid');
    [
      ['\u20B9 Amount', UI.rupees(app.amount)],
      ['Tenure', (app.tenureMonths || 0) + ' mo'],
      ['Loan type', app.loanLabel],
      ['Owner', app.executive || 'Unassigned'],
      ['Source', app.source || ''],
      ['Applied', displayText(UI.fmtDate(app.created))]
    ].forEach(function (pair) {
      if (!pair[1]) return;
      var pill = UI.h('div', 'a-overview-pill');
      pill.appendChild(UI.h('span', 'a-overview-pill-label', pair[0]));
      pill.appendChild(UI.h('strong', null, pair[1]));
      grid.appendChild(pill);
    });
    body.appendChild(grid);

    /* quick metadata row */
    var rows = [];
    addField(rows, 'Reference', app.ref);
    addField(rows, 'Application no.', app.application_number);
    addField(rows, 'Last updated', UI.fmtDate(app.updated));
    if (!isEmpty(app.rejectionReason)) addField(rows, 'Rejection reason', app.rejectionReason);
    if (rows.length) body.appendChild(fieldList(rows));

    return card;
  }

  /* ================================================================== PERSONAL CARD */
  function personalCard() {
    var c = app.customer || {};
    var editBtn = null;
    if (Store.can('edit_status')) {
      editBtn = UI.h('button', 'a-icon-btn');
      editBtn.title = 'Edit customer';
      editBtn.appendChild(UI.icon('edit', 14));
      editBtn.addEventListener('click', function () { editCustomer(c); });
    }
    var card = X.card('Personal Details', editBtn);
    var body = X.bodyFor(card);

    /* avatar head */
    var head = UI.h('div', 'a-person-head');
    head.appendChild(UI.avatar(c.name || '?', 44, uiColor(c.name || '?')));
    var info = UI.h('div', 'a-person-meta');
    info.appendChild(UI.h('strong', null, c.name || 'Customer'));
    var subtitle = joinMeta([c.occupation, c.city, c.state]);
    if (subtitle) info.appendChild(UI.h('span', null, subtitle));
    head.appendChild(info);
    body.appendChild(head);

    var rows = [];
    addField(rows, 'Mobile', c.phone);
    addField(rows, 'Email', c.email);
    addField(rows, 'PAN', c.pan);
    addField(rows, 'Date of birth', c.dob);
    addField(rows, 'Gender', c.gender);
    addField(rows, 'City', c.city);
    addField(rows, 'State', c.state);
    addField(rows, 'Pincode', c.pincode);
    addField(rows, 'Address', c.address);
    body.appendChild(fieldList(rows));
    return card;
  }

  /* ================================================================== EMPLOYMENT / BUSINESS CARD */
  function employmentCard() {
    var c = app.customer || {};
    var rows = [];

    if (app.loanId === 'business') {
      addField(rows, 'Entity type', c.entityType);
      addField(rows, 'Business name', c.company);
      addField(rows, 'Employment type', c.employment);
      addField(rows, 'Monthly income', c.income, money);
      addField(rows, 'Annual household income', c.household, money);
      addField(rows, 'Business vintage', c.vintage);
      addField(rows, 'GSTIN', c.gstin);
      addField(rows, 'Purpose', app.purpose);
    } else if (app.loanId === 'home' || app.loanId === 'lap') {
      addField(rows, 'Employment type', c.employment);
      addField(rows, 'Company', c.company);
      addField(rows, 'Monthly income', c.income, money);
      addField(rows, 'Annual household income', c.household, money);
      addField(rows, 'Property city', app.propertyCity);
      addField(rows, 'Property value', app.propertyValue, money);
      addField(rows, 'Monthly obligations', app.monthlyObligations, money);
      addField(rows, 'Purpose', app.purpose);
    } else {
      addField(rows, 'Employment type', c.employment);
      addField(rows, 'Company', c.company);
      addField(rows, 'Monthly income', c.income, money);
      addField(rows, 'Annual household income', c.household, money);
      addField(rows, 'Purpose', app.purpose);
    }

    if (!rows.length) return null;

    var editBtn = null;
    if (Store.can('edit_status')) {
      editBtn = UI.h('button', 'a-icon-btn');
      editBtn.title = 'Edit loan details';
      editBtn.appendChild(UI.icon('edit', 14));
      editBtn.addEventListener('click', function () { editLoan(); });
    }
    var card = X.card('Employment / Business', editBtn);
    var body = X.bodyFor(card);
    body.appendChild(fieldList(rows));
    return card;
  }

  /* ================================================================== DOCUMENTS CARD */
  function docsCard() {
    var list = app.docs || [];
    var card = X.card('Documents', X.countPill(list.length, ' document'));
    var body = X.bodyFor(card);

    if (!list.length) {
      body.appendChild(UI.h('p', 'a-muted', 'No documents uploaded yet.'));
    }

    var rows = UI.h('div', 'a-docs');
    list.forEach(function (d) {
      var row = UI.h('div', 'a-doc');
      var ic = UI.h('span', 'a-doc-ic');
      ic.appendChild(UI.icon(/\.pdf$/i.test(d.name) ? 'docs' : 'image', 18));
      row.appendChild(ic);
      var mid = UI.h('div', 'a-doc-mid');
      mid.appendChild(UI.h('strong', null, d.label || d.name));
      var meta = [];
      if (d.name) meta.push(d.name);
      if (d.size) meta.push(Math.max(1, Math.round(d.size / 1024)) + ' KB');
      if (d.uploadedBy) meta.push(d.uploadedBy);
      if (d.at) meta.push(UI.timeAgo(d.at));
      if (meta.length) mid.appendChild(UI.h('span', null, meta.join(' \u00B7 ')));
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
    body.appendChild(rows);

    if (Store.can('edit_status')) {
      var act = UI.h('div', 'a-doc-actions');
      var upBtn = UI.h('button', 'btn btn-ghost btn-sm');
      upBtn.appendChild(UI.icon('upload', 14));
      upBtn.appendChild(UI.h('span', null, 'Upload document'));
      upBtn.addEventListener('click', function () { uploadModal(); });
      act.appendChild(upBtn);
      body.appendChild(act);
    }
    return card;
  }

  /* ================================================================== STATUS CARD (right column) */
  function statusProgressCard() {
    var card = X.card('Status & Progress');
    var body = X.bodyFor(card);

    /* --- vertical status pipeline --- */
    var flow = Store.STATUS_FLOW;
    var allStatuses = Store.STATUS_FLOW.concat(Store.TERMINAL || []);
    var currentMeta = Store.STATUS_MAP[app.status];
    var isTerminal = Store.TERMINAL && Store.TERMINAL.some(function (t) { return t.id === app.status; });
    var currentIdx = flow.findIndex(function (s) { return s.id === app.status; });

    var pipeline = UI.h('ol', 'a-status-pipeline');
    flow.forEach(function (s, i) {
      var li = UI.h('li');
      if (isTerminal || i < currentIdx) li.className = 'is-done';
      else if (i === currentIdx) li.className = 'is-current';

      var dot = UI.h('span', 'a-sp-dot');
      if (i < currentIdx || isTerminal) dot.appendChild(UI.icon('check', 11));
      li.appendChild(dot);

      var label = UI.h('div', 'a-sp-label');
      label.appendChild(UI.h('strong', null, s.label));
      li.appendChild(label);
      pipeline.appendChild(li);
    });

    /* if terminal, show it as a final entry */
    if (isTerminal && currentMeta) {
      var li = UI.h('li', 'is-current');
      var dot = UI.h('span', 'a-sp-dot');
      dot.appendChild(UI.icon(currentMeta.tone === 'danger' ? 'x' : 'check', 11));
      li.appendChild(dot);
      var label = UI.h('div', 'a-sp-label');
      label.appendChild(UI.h('strong', null, currentMeta.label));
      li.appendChild(label);
      pipeline.appendChild(li);
    }

    body.appendChild(pipeline);

    /* --- status update row (only for authorized users on non-closed apps) --- */
    if (Store.can('edit_status')) {
      var nextStatuses = Store.nextStatuses(app.status);
      if (nextStatuses && nextStatuses.length) {
        var row = UI.h('div', 'a-status-update-row');
        var sel = UI.h('select');
        sel.appendChild(X.opt('', 'Move to\u2026'));
        nextStatuses.forEach(function (s) { sel.appendChild(X.opt(s.id, s.label)); });
        row.appendChild(sel);
        var saveBtn = UI.h('button', 'btn btn-primary btn-sm', 'Update');
        saveBtn.type = 'button';
        saveBtn.addEventListener('click', function () {
          if (!sel.value) { UI.toast('Choose a status first.', 'error'); return; }
          Store.setStatus(app.id, sel.value);
          UI.toast('Moved to ' + Store.STATUS_MAP[sel.value].label + '.', 'success');
          refresh();
        });
        row.appendChild(saveBtn);
        body.appendChild(row);
      }
    }

    return card;
  }

  /* ================================================================== NOTES CARD (right column) */
  function notesCard() {
    var card = X.card('Internal Notes');
    var body = X.bodyFor(card);
    var notes = app.notes || [];

    if (!notes.length) {
      body.appendChild(UI.h('p', 'a-muted', 'No internal notes yet.'));
    }

    var list = UI.h('div', 'a-notes a-notes-compact');
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
    if (notes.length) body.appendChild(list);

    /* inline note form */
    if (Store.can('notes')) {
      var form = UI.h('div', 'a-inline-note-form');
      var ta = UI.h('textarea', 'a-note-ta');
      ta.rows = 3;
      ta.placeholder = 'Add an internal note\u2026';
      form.appendChild(ta);
      var actions = UI.h('div', 'a-note-actions');
      var saveNote = UI.h('button', 'btn btn-primary btn-sm', 'Save note');
      saveNote.type = 'button';
      saveNote.addEventListener('click', function () {
        var text = ta.value.trim();
        if (!text) { UI.toast('Note cannot be empty.', 'error'); return; }
        saveNote.disabled = true;
        Store.addNote(app.id, text);
        UI.toast('Note added.', 'success');
        ta.value = '';
        saveNote.disabled = false;
        refresh();
      });
      actions.appendChild(saveNote);
      form.appendChild(actions);
      body.appendChild(form);
    }

    return card;
  }

  /* ================================================================== TIMELINE CARD (left column) */
  function timelineCard() {
    var t = app.timeline || [];
    var card = X.card('Activity Timeline');
    var body = X.bodyFor(card);

    if (!t.length) {
      body.appendChild(UI.h('p', 'a-muted', 'No timeline events yet.'));
      return card;
    }

    var list = UI.h('div', 'a-tl-list');
    t.slice(0, 15).forEach(function (ev) {
      var item = UI.h('div', 'a-tl-item');
      var ic = UI.h('span', 'a-tl-ic');
      ic.appendChild(UI.icon('check', 11));
      item.appendChild(ic);
      var bodyEl = UI.h('div', 'a-tl-body');
      bodyEl.appendChild(UI.h('strong', null, ev.text));
      bodyEl.appendChild(UI.h('span', null, UI.timeAgo(ev.at) + (ev.by ? ' \u00B7 by ' + ev.by : '')));
      item.appendChild(bodyEl);
      list.appendChild(item);
    });
    body.appendChild(list);
    return card;
  }

  /* ================================================================== LAYOUT */
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

    /* header */
    host.appendChild(headerBar());

    /* content wrapper — old .a-detail-layout for full-width overview */
    var fullRow = UI.h('div', 'a-detail-layout');
    fullRow.appendChild(overviewCard()); /* span-12 full width */
    host.appendChild(fullRow);

    /* two-column grid */
    var grid = UI.h('div', 'a-detail-grid-v2');

    /* LEFT column */
    var left = UI.h('div', 'a-detail-left-v2');
    left.appendChild(personalCard());
    var empCard = employmentCard();
    if (empCard) left.appendChild(empCard);
    left.appendChild(docsCard());
    left.appendChild(timelineCard());
    grid.appendChild(left);

    /* RIGHT column */
    var right = UI.h('div', 'a-detail-right-v2');
    right.appendChild(statusProgressCard());
    right.appendChild(notesCard());
    grid.appendChild(right);

    host.appendChild(grid);
  }

  /* ================================================================== MODALS */
  function openAssignModal() {
    var m = UI.modal({ title: 'Assign executive' });
    var sel = UI.h('select');
    sel.appendChild(X.opt('', 'Unassign'));
    X.executives(false).forEach(function (u) {
      sel.appendChild(X.opt(u.id, u.name, u.name === app.executive));
    });
    m.body.appendChild(X.field('Executive', sel));
    var actions = UI.h('div', 'a-form-actions');
    var cancel = UI.h('button', 'btn btn-ghost btn-sm', 'Cancel');
    var save = UI.h('button', 'btn btn-primary btn-sm', 'Assign');
    cancel.addEventListener('click', m.close);
    save.addEventListener('click', function () {
      Store.setAssignee(app.id, sel.value || '');
      UI.toast('Owner updated.', 'success');
      m.close();
      refresh();
    });
    actions.appendChild(cancel);
    actions.appendChild(save);
    m.body.appendChild(actions);
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
        if (!r.ok) { UI.toast(r.error || 'Upload failed.', 'error'); save.disabled = false; save.textContent = 'Upload'; return; }
        UI.toast('Document uploaded.', 'success');
        m.close();
        refresh();
      }).catch(function (err) { UI.toast((err && err.message) || 'Upload failed.', 'error'); save.disabled = false; save.textContent = 'Upload'; });
    });
    actions.appendChild(cancel);
    actions.appendChild(save);
    m.body.appendChild(actions);
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

    /* show business fields only for business loan */
    var isBusiness = app.loanId === 'business';
    var fields = [
      ['Full name', nameI], ['Mobile', mobileI], ['Email', emailI], ['PAN', panI],
      ['Date of birth', dobI], ['Gender', genderI], ['City', cityI], ['State', stateI],
      ['Pincode', pinI], ['Address', addressI], ['Employment', empI], ['Company', companyI],
      ['Monthly income', incomeI], ['Annual household income', householdI]
    ];
    if (isBusiness) {
      fields.push(['Entity type', entityI], ['Business vintage', vintageI], ['GSTIN', gstinI]);
    }
    fields.forEach(function (p) { f.appendChild(X.field(p[0], p[1])); });
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
        entityType: isBusiness ? (entityI.value.trim() || null) : null,
        vintage: isBusiness ? (vintageI.value.trim() || null) : null,
        gstin: isBusiness ? (gstinI.value.trim() || null) : null
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
    if (app.loanId === 'home' || app.loanId === 'lap') {
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

  /* ================================================================== REGISTER */
  APAdmin.register('application', function (hostEl) {
    host = hostEl;
    var m = location.search.match(/[?&]id=([^&]+)/);
    id = m ? decodeURIComponent(m[1]) : null;
    if (!id) {
      host.appendChild(UI.emptyState('apps', 'No application selected', '', X.btnLink('Back', 'applications.html')));
      return;
    }
    paint();
  });
})();