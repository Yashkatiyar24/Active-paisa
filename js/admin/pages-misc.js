/* ==========================================================================
   Admin — Customers, Documents, Executives, Reports, Notifications, Settings
   ========================================================================== */

(function () {
  'use strict';
  var UI = APAdmin.UI, Store = APAdmin.Store, X = APX, C = APAdmin.C;

  function uiColor(name) {
    var hues = ['#0C6E6E', '#7C3AED', '#2563EB', '#D97706', '#0891B2', '#DC2626', '#0D3B45', '#B45309', '#4338CA', '#047857'];
    var n = 0;
    for (var i = 0; i < String(name).length; i++) n = (n * 31 + String(name).charCodeAt(i)) >>> 0;
    return hues[n % hues.length];
  }
  function td(children) {
    var d = document.createElement('td');
    if (children instanceof Node) d.appendChild(children);
    else d.textContent = children == null ? '' : children;
    return d;
  }
  function tableHeadT(cols) {
    var trc = document.createElement('tr');
    cols.forEach(function (label) {
      var e = document.createElement('th');
      e.appendChild(UI.h('span', 'a-th-label', label));
      trc.appendChild(e);
    });
    return trc;
  }

  /* ======================================================================
     CUSTOMERS
     ====================================================================== */
  APAdmin.register('customers', function (host) {
    var state = { q: '', page: 1, per: 50 };

    function paint() {
      host.textContent = '';
      var head = UI.h('div', 'a-section-head');
      head.appendChild(UI.h('h2', null, 'Customers'));
      head.appendChild(UI.h('span', 'a-count-pill', '\u2026'));
      host.appendChild(head);

      var card = X.card('All customers');
      var body = X.bodyFor(card);
      body.appendChild(UI.h('p', 'a-muted', 'Loading\u2026'));
      host.appendChild(card);

      Store.customers({ search: state.q, page: state.page, per_page: state.per }).then(function (res) {
        var customers = res.items || [];
        host.textContent = '';
        head = UI.h('div', 'a-section-head');
        head.appendChild(UI.h('h2', null, 'Customers'));
        head.appendChild(X.countPill(res.total || 0, ' customers'));
        host.appendChild(head);

        var bar = UI.h('div', 'a-filters');
        var search = UI.h('div', 'a-search');
        search.appendChild(UI.icon('search', 16));
        var si = UI.h('input');
        si.type = 'search'; si.placeholder = 'Search name, mobile, email, PAN\u2026';
        search.appendChild(si);
        var deb = null;
        si.addEventListener('input', function () {
          clearTimeout(deb);
          deb = setTimeout(function () { state.q = si.value.trim(); state.page = 1; paint(); }, 220);
        });
        bar.appendChild(search);
        host.appendChild(bar);

        var card = X.card('All customers');
        var b2 = X.bodyFor(card);
        if (!customers.length) {
          b2.appendChild(UI.emptyState('users', state.q ? 'No customers match' : 'No customers yet',
            state.q ? 'Try a different search.' : 'Customers appear as soon as applications come in.'));
          host.appendChild(card);
          return;
        }
        var t = UI.h('table', 'a-table');
        var thead = document.createElement('thead');
        thead.appendChild(tableHeadT(['Customer', 'Mobile', 'Applications', 'Total value', 'State', 'Joined']));
        t.appendChild(thead);
        var tbody = document.createElement('tbody');
        customers.forEach(function (c) {
          var tr = document.createElement('tr');
          var who = UI.h('div', 'a-who');
          who.appendChild(UI.avatar(c.name || c.phone || '?', 32, uiColor(c.name || c.phone || '?')));
          var wt = UI.h('div', 'a-who-text');
          wt.appendChild(UI.h('strong', null, c.name || '\u2014'));
          wt.appendChild(UI.h('span', null, (c.email || '').toLowerCase()));
          who.appendChild(wt);
          tr.appendChild(td(who));
          tr.appendChild(td(c.phone || '\u2014'));
          tr.appendChild(td(String(c.apps || 0)));
          tr.appendChild(td(UI.rupees(c.totalValue || 0)));
          tr.appendChild(td(c.state || '\u2014'));
          tr.appendChild(td(c.created ? UI.timeAgo(c.created) : '\u2014'));
          tr.classList.add('is-clickable');
          tr.addEventListener('click', function () { customerModal(c); });
          tbody.appendChild(tr);
        });
        t.appendChild(tbody);
        b2.appendChild(t);
        host.appendChild(card);
      }).catch(function (err) {
        host.textContent = '';
        var card = X.card('All customers');
        var body = X.bodyFor(card);
        body.appendChild(UI.emptyState('users', 'Could not load customers', String((err && err.message) || err)));
        host.appendChild(card);
      });
    }
    paint();
  });

  function customerModal(c) {
    var m = UI.modal({ title: String(c.name || '') || 'Customer' });
    var b = m.body;
    b.appendChild(UI.h('p', 'a-muted', ((c.email || '').toLowerCase()) + (c.phone ? ' \u00B7 ' + c.phone : '')));
    b.appendChild(UI.h('p', 'a-muted', ((c.state ? 'State: ' + c.state : '') + (c.city ? ' \u00B7 City: ' + c.city : ''))));
    b.appendChild(UI.h('p', 'a-muted', 'Loading applications\u2026'));
    Store.customer(c.id).then(function (full) {
      b.textContent = '';
      b.appendChild(UI.h('p', 'a-muted', ((full.email || '').toLowerCase()) + (full.phone ? ' \u00B7 ' + full.phone : '') + (full.pan ? ' \u00B7 PAN ' + full.pan : '') + (full.state ? ' \u00B7 ' + full.state : '')));
      var apps = full.applications || [];
      if (!apps.length) { b.appendChild(UI.h('p', 'a-muted', 'No applications yet.')); return; }
      var list = UI.h('div', 'a-feed');
      apps.slice(0, 20).forEach(function (a) { list.appendChild(appRowLink(a)); });
      b.appendChild(list);
    }).catch(function () {
      b.appendChild(UI.h('p', 'a-muted', 'Could not load applications.'));
    });
  }
  function appRowLink(a) {
    var row = UI.h('a', 'a-feed-row');
    row.href = X.appUrl(a.id);
    row.appendChild(UI.avatar(a.customer.name, 30, uiColor(a.customer.name)));
    var mid = UI.h('div', 'a-feed-mid');
    mid.appendChild(UI.h('strong', null, a.loanLabel));
    mid.appendChild(UI.h('span', null, UI.rupees(a.amount) + ' \u00B7 ' + UI.fmtDate(a.created)));
    row.appendChild(mid);
    row.appendChild(UI.chip(a.status));
    return row;
  }

  /* ======================================================================
     DOCUMENTS
     ====================================================================== */
  APAdmin.register('documents', function (host) {
    var all = [];
    var state = { q: '', status: '' };
    Store.listApplications().forEach(function (a) {
      (a.docs || []).forEach(function (d) { all.push({ doc: d, app: a }); });
    });

    function paint() {
      host.textContent = '';
      var list = all.filter(function (r) {
        var ok = true;
        if (state.q) {
          var hay = (r.doc.name + ' ' + (r.doc.label || '') + ' ' + r.app.ref + ' ' + (r.app.customer.name || '')).toLowerCase();
          ok = hay.indexOf(state.q) !== -1;
        }
        if (ok && state.status) ok = r.app.status === state.status;
        return ok;
      });

      var head = UI.h('div', 'a-section-head');
      head.appendChild(UI.h('h2', null, 'Document centre'));
      head.appendChild(X.countPill(list.length, ' documents'));
      host.appendChild(head);

      var bar = UI.h('div', 'a-filters');
      var search = UI.h('div', 'a-search');
      search.appendChild(UI.icon('search', 16));
      var si = UI.h('input');
      si.type = 'search'; si.placeholder = 'Search documents\u2026';
      search.appendChild(si);
      var deb = null;
      si.addEventListener('input', function () {
        clearTimeout(deb);
        deb = setTimeout(function () { state.q = si.value.trim().toLowerCase(); paint(); }, 220);
      });
      bar.appendChild(search);
      var statusSel = UI.h('select');
      statusSel.appendChild(X.opt('', 'All application statuses'));
      Store.STATUS_FLOW.concat(Store.TERMINAL).forEach(function (s) { statusSel.appendChild(X.opt(s.id, s.label)); });
      statusSel.addEventListener('change', function () { state.status = statusSel.value; paint(); });
      bar.appendChild(statusSel);
      host.appendChild(bar);

      var card = X.card('All documents');
      var body = X.bodyFor(card);
      if (!list.length) {
        body.appendChild(UI.emptyState('docs', 'No documents match', 'Try a different search or filter.'));
        host.appendChild(card);
        return;
      }
      var t = UI.h('table', 'a-table');
      var thead = document.createElement('thead');
      thead.appendChild(tableHeadT(['Document', 'Application', 'Customer', 'Size', 'Status', '']));
      t.appendChild(thead);
      var tbody = document.createElement('tbody');
      list.slice(0, 60).forEach(function (r) {
        var tr = document.createElement('tr');
        var pair = UI.h('div', 'a-who');
        pair.appendChild(UI.h('span', 'a-doc-ic', UI.icon(/\.pdf$/i.test(r.doc.name) ? 'docs' : 'image', 15)));
        var pt = UI.h('div', 'a-who-text');
        pt.appendChild(UI.h('strong', null, r.doc.label || r.doc.name));
        pt.appendChild(UI.h('span', null, (r.doc.uploadedBy ? r.doc.uploadedBy + ' \u00B7 ' : '') + UI.timeAgo(r.doc.at)));
        pair.appendChild(pt);
        tr.appendChild(td(pair));
        var refLink = UI.h('a', 'ci-link', r.app.ref);
        refLink.href = X.appUrl(r.app.id);
        tr.appendChild(td(refLink));
        tr.appendChild(td(r.app.customer.name || ''));
        tr.appendChild(td(r.doc.size || '\u2014'));
        tr.appendChild(td(UI.chip(r.doc.status === 'verified' ? 'approved' : (r.doc.status === 'rejected' ? 'rejected' : ('new')))));
        var tools = UI.h('div', 'a-doc-tools');
        var dl = UI.h('button', 'a-icon-btn');
        dl.appendChild(UI.icon('download', 15));
        dl.addEventListener('click', function () {
          Store.downloadDocument(r.doc).catch(function (err) { UI.toast(err.message || 'Download failed.', 'error'); });
        });
        tools.appendChild(dl);
        if (Store.can('edit_status') && r.doc.status !== 'verified') {
          var v = UI.h('button', 'a-icon-btn');
          v.appendChild(UI.icon('check', 15));
          v.title = 'Verify';
          v.addEventListener('click', function () {
            Store.updateDocument(r.doc.id, 'verified').then(function (res) {
              if (!res.ok) { UI.toast(res.error || 'Could not verify.', 'error'); return; }
              UI.toast('Document verified.', 'success');
              Store.refreshApplication(r.app.id).then(function () { paint(); });
            });
          });
          tools.appendChild(v);
        }
        if (Store.can('edit_status') && r.doc.status !== 'rejected') {
          var rx = UI.h('button', 'a-icon-btn');
          rx.appendChild(UI.icon('x', 15));
          rx.title = 'Reject';
          rx.addEventListener('click', function () {
            Store.updateDocument(r.doc.id, 'rejected').then(function (res) {
              if (!res.ok) { UI.toast(res.error || 'Could not reject.', 'error'); return; }
              UI.toast('Document rejected.', 'success');
              Store.refreshApplication(r.app.id).then(function () { paint(); });
            });
          });
          tools.appendChild(rx);
        }
        tr.appendChild(td(tools));
        tbody.appendChild(tr);
      });
      if (list.length > 60) {
        var more = document.createElement('tr');
        var moreTd = document.createElement('td');
        moreTd.colSpan = 6;
        moreTd.appendChild(UI.h('p', 'a-muted', 'Showing first 60 \u2014 refine your search.'));
        more.appendChild(moreTd);
        tbody.appendChild(more);
      }
      t.appendChild(tbody);
      body.appendChild(t);
      host.appendChild(card);
    }
    paint();
  });

  /* ======================================================================
     EXECUTIVES
     ====================================================================== */
  APAdmin.register('executives', function (host) {
    function paint() {
      host.textContent = '';
      var users = Store.users();
      var apps = Store.listApplications();
      var head = UI.h('div', 'a-section-head');
      head.appendChild(UI.h('h2', null, 'Executives'));
      head.appendChild(X.countPill(users.length, ' team members'));
      if (Store.can('users')) {
        var add = UI.h('button', 'btn btn-primary btn-sm');
        add.appendChild(UI.icon('plus', 15));
        add.appendChild(UI.h('span', null, 'Add member'));
        add.addEventListener('click', addMember);
        head.appendChild(add);
      }
      host.appendChild(head);

      var card = X.card('Executives & access');
      var body = X.bodyFor(card);
      var t = UI.h('table', 'a-table');
      var thead = document.createElement('thead');
      thead.appendChild(tableHeadT(['Member', 'Role', 'Applications', 'Status', '']));
      t.appendChild(thead);
      var tbody = document.createElement('tbody');
      users.forEach(function (u) {
        var tr = document.createElement('tr');
        var who = UI.h('div', 'a-who');
        who.appendChild(UI.avatar(u.name, 32, u.color || uiColor(u.name)));
        var wt = UI.h('div', 'a-who-text');
        wt.appendChild(UI.h('strong', null, u.name));
        wt.appendChild(UI.h('span', null, u.email));
        who.appendChild(wt);
        tr.appendChild(td(who));
        tr.appendChild(td(UI.roleBadge(u.role)));
        tr.appendChild(td(String(apps.filter(function (a) { return a.executive === u.name; }).length)));
        tr.appendChild(td(u.enabled ? UI.h('span', 'a-enabled', 'Active') : UI.h('span', 'a-disabled', 'Disabled')));
        if (Store.can('users')) {
          var ctl = UI.h('button', 'a-icon-btn');
          ctl.title = u.enabled ? 'Disable account' : 'Enable account';
          ctl.appendChild(UI.icon(u.enabled ? 'shield' : 'user', 16));
          ctl.addEventListener('click', function () {
            var me = Store.currentUser();
            if (!me) { location.replace('login.html'); return; }
            if (u.id === me.id) { UI.toast('You cannot disable your own account.', 'error'); return; }
            Store.setUserEnabled(u.id, !u.enabled);
            paint();
          });
          tr.appendChild(td(ctl));
        } else {
          tr.appendChild(td(''));
        }
        tbody.appendChild(tr);
      });
      t.appendChild(tbody);
      body.appendChild(t);
      host.appendChild(card);
    }

    function addMember() {
      var m = UI.modal({ title: 'Add team member' });
      var b = m.body;
      var f = UI.h('form', 'a-form-grid');
      f.noValidate = true;
      var name = UI.h('input'); name.placeholder = 'Full name';
      var email = UI.h('input'); email.type = 'email'; email.placeholder = 'name@company.com';
      var role = UI.h('select');
      Object.keys(Store.ROLES).forEach(function (r) { role.appendChild(X.opt(r, Store.ROLES[r].label)); });
      f.appendChild(X.field('Full name', name));
      f.appendChild(X.field('Email', email));
      f.appendChild(X.field('Role', role));
      b.appendChild(f);
      var actions = UI.h('div', 'a-form-actions');
      var cancel = UI.h('button', 'btn btn-ghost btn-sm', 'Cancel');
      var save = UI.h('button', 'btn btn-primary btn-sm', 'Add member');
      cancel.addEventListener('click', m.close);
      save.addEventListener('click', function () {
        if (!name.value.trim() || !/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email.value)) {
          UI.toast('Enter a name and a valid email.', 'error');
          return;
        }
        Store.addUser({ name: name.value.trim(), email: email.value.toLowerCase(), role: role.value, enabled: true })
          .then(function (res) {
            if (!res.ok) { UI.toast(res.error || 'Could not add member.', 'error'); return; }
            UI.toast('Member added.', 'success');
            m.close();
            paint();
          }).catch(function (err) {
            UI.toast((err && err.message) || 'Could not add member.', 'error');
          });
      });
      actions.appendChild(cancel);
      actions.appendChild(save);
      b.appendChild(actions);
    }
    paint();
  });

  /* ======================================================================
     REPORTS
     ====================================================================== */
  APAdmin.register('reports', function (host) {
    var period = 'month';

    function paint() {
      host.textContent = '';
      host.appendChild(UI.h('h2', 'a-page-title', 'Reports'));
      var head = UI.h('div', 'a-section-head');
      head.appendChild(UI.h('p', 'a-muted', 'Loading\u2026'));
      host.appendChild(head);

      Store.reports(period).then(function (r) {
        host.textContent = '';
        var head = UI.h('div', 'a-section-head');
        head.appendChild(UI.h('h2', null, 'Reports'));
        var sel = UI.h('select');
        [['month', 'Last 12 months'], ['week', 'Last 8 weeks'], ['day', 'Last 14 days']].forEach(function (p) {
          sel.appendChild(X.opt(p[0], p[1]));
        });
        sel.value = period;
        sel.addEventListener('change', function () { period = sel.value; paint(); });
        var selWrap = UI.h('div', 'a-filter-right');
        selWrap.appendChild(sel);
        head.appendChild(selWrap);
        host.appendChild(head);

        var kpis = UI.h('div', 'a-kpi-grid');
        kpis.appendChild(UI.kpi('Total applications', String(r.total)));
        kpis.appendChild(UI.kpi('Conversion rate', r.conversionRate + '%', 'approved \u00F7 total'));
        kpis.appendChild(UI.kpi('Rejection rate', r.rejectionRate + '%', 'of all applications'));
        var funnelMap = {};
        (r.funnel || []).forEach(function (f) { funnelMap[f.id] = f.count; });
        kpis.appendChild(UI.kpi('In pipeline', String(r.total - (funnelMap.rejected || 0) - (funnelMap.closed || 0))));
        host.appendChild(kpis);

        var charts = UI.h('div', 'a-chart-grid');
        var barCard = X.card('Applications vs disbursed value');
        var barBody = X.bodyFor(barCard);
        var barHost = UI.h('div', 'a-canvas-box');
        barBody.appendChild(barHost);
        charts.appendChild(barCard);
        var donutCard = X.card('Share by loan type');
        var dBody = X.bodyFor(donutCard);
        var dHost = UI.h('div', 'a-canvas-box');
        dBody.appendChild(dHost);
        charts.appendChild(donutCard);
        host.appendChild(charts);

        X.drawDisbursed(barHost, r.revenue || []);
        X.drawDonut(dHost, (r.distribution || []).filter(function (x) { return x.count > 0; }));

        /* funnel table */
        var fcard = X.card('Status funnel');
        var fb = X.bodyFor(fcard);
        var ft = UI.h('table', 'a-table');
        var fthead = document.createElement('thead');
        fthead.appendChild(tableHeadT(['Status', 'Applications', 'Share']));
        ft.appendChild(fthead);
        var ftb = document.createElement('tbody');
        (r.funnel || []).forEach(function (f) {
          var tr = document.createElement('tr');
          tr.appendChild(td(Store.STATUS_MAP[f.id] ? Store.STATUS_MAP[f.id].label : f.id));
          tr.appendChild(td(String(f.count)));
          tr.appendChild(td((r.total ? Math.round(f.count / r.total * 100) : 0) + '%'));
          ftb.appendChild(tr);
        });
        ft.appendChild(ftb);
        fb.appendChild(ft);
        host.appendChild(fcard);

        /* executive perf */
        var ecard = X.card('Executive performance', exportBtn(r));
        var eb = X.bodyFor(ecard);
        var et = UI.h('table', 'a-table');
        var ethead = document.createElement('thead');
        ethead.appendChild(tableHeadT(['Executive', 'Applications', 'Loan value', 'Active']));
        et.appendChild(ethead);
        var etb = document.createElement('tbody');
        (r.executives || []).forEach(function (e) {
          var tr = document.createElement('tr');
          var who = UI.h('div', 'a-who');
          who.appendChild(UI.avatar(e.name, 28, uiColor(e.name)));
          who.appendChild(UI.h('strong', null, e.name));
          tr.appendChild(td(who));
          tr.appendChild(td(String(e.applications)));
          tr.appendChild(td(UI.rupees(e.value)));
          tr.appendChild(td(e.active ? UI.h('span', 'a-enabled', 'Active') : UI.h('span', 'a-disabled', 'Disabled')));
          etb.appendChild(tr);
        });
        et.appendChild(etb);
        eb.appendChild(et);
        host.appendChild(ecard);
      }).catch(function (err) {
        host.textContent = '';
        host.appendChild(UI.emptyState('reports', 'Could not load reports', String((err && err.message) || err)));
      });
    }

    function exportBtn(r) {
      var btn = UI.h('button', 'a-icon-btn');
      btn.title = 'Export CSV';
      btn.appendChild(UI.icon('download', 16));
      btn.addEventListener('click', function () {
        var rows = (r.executives || []).map(function (e) {
          return [e.name, e.applications, e.value, e.active ? 'Active' : 'Disabled'];
        });
        UI.download('report-' + new Date().toISOString().slice(0, 10) + '.csv',
          UI.toCSV(['Executive', 'Applications', 'Loan value', 'Active'], rows), 'text/csv');
        UI.toast('Report exported.', 'success');
      });
      return btn;
    }
    paint();
  });

  /* ======================================================================
     NOTIFICATIONS
     ====================================================================== */
  APAdmin.register('notifications', function (host) {
    var state = { refreshing: false };

    function paint() {
      host.textContent = '';
      var list = Store.notifications();
      var unread = list.filter(function (n) { return !n.read; }).length;

      var head = UI.h('div', 'a-section-head');
      head.appendChild(UI.h('h2', null, 'Notifications'));
      var pill = X.countPill(unread, ' unread');
      pill.classList.add('a-pill-unread');
      head.appendChild(pill);
      var refreshBtn = UI.h('button', 'a-icon-btn a-refresh-btn');
      refreshBtn.title = 'Refresh';
      refreshBtn.appendChild(UI.icon('refresh', 17));
      refreshBtn.addEventListener('click', function () { refresh(); });
      head.appendChild(refreshBtn);
      host.appendChild(head);

      var card = X.card('All notifications');
      var body = X.bodyFor(card);

      if (!list.length) {
        body.appendChild(emptyStateWithRefresh());
        host.appendChild(card);
        return;
      }

      var rows = UI.h('div', 'a-notif-list');
      list.forEach(function (n) {
        rows.appendChild(notificationCard(n));
      });
      body.appendChild(rows);

      if (unread) {
        var markAll = UI.h('button', 'btn btn-ghost btn-sm a-mark-all-btn', 'Mark all read');
        markAll.addEventListener('click', function () {
          Store.markAllRead();
          paint();
        });
        body.appendChild(markAll);
      }
      host.appendChild(card);
    }

    function refresh() {
      if (state.refreshing) return;
      state.refreshing = true;
      var refreshBtn = host.querySelector('.a-refresh-btn');
      if (refreshBtn) refreshBtn.classList.add('spinning');
      Store.load().then(function () { paint(); }).catch(function () {}).finally(function () {
        state.refreshing = false;
        if (refreshBtn) refreshBtn.classList.remove('spinning');
      });
    }

    function emptyStateWithRefresh() {
      var wrap = UI.h('div', 'a-empty a-empty-centered');
      wrap.appendChild(UI.h('span', 'a-empty-icon', '')).appendChild(UI.icon('bell', 48));
      wrap.appendChild(UI.h('p', 'a-empty-title', 'No notifications yet'));
      wrap.appendChild(UI.h('p', 'a-empty-sub', 'Alerts for new applications, status changes, and team activity will appear here.'));
      var btn = UI.h('button', 'btn btn-primary btn-sm', 'Refresh');
      btn.appendChild(UI.icon('refresh', 15));
      btn.addEventListener('click', function () { refresh(); });
      wrap.appendChild(btn);
      return wrap;
    }

    function notificationCard(n) {
      var item = UI.h('button', 'a-notif-item' + (n.read ? '' : ' is-unread'));
      item.dataset.appId = n.application_id || '';

      var iconWrap = UI.h('div', 'a-notif-icon');
      iconWrap.appendChild(UI.icon(kindGlyph(n.kind), 20));
      item.appendChild(iconWrap);

      var content = UI.h('div', 'a-notif-content');
      var header = UI.h('div', 'a-notif-header');
      header.appendChild(UI.h('strong', null, n.title));
      header.appendChild(UI.h('span', 'a-notif-at', UI.timeAgo(n.at)));
      content.appendChild(header);
      content.appendChild(UI.h('p', 'a-notif-body', n.body));
      item.appendChild(content);

      var actions = UI.h('div', 'a-notif-actions');
      if (!n.read) {
        var markRead = UI.h('button', 'a-icon-btn a-notif-markread');
        markRead.title = 'Mark as read';
        markRead.setAttribute('aria-label', 'Mark as read');
        markRead.appendChild(UI.icon('check', 15));
        markRead.addEventListener('click', function (e) {
          e.stopPropagation();
          Store.markRead(n.id);
          paint();
        });
        actions.appendChild(markRead);
      }
      if (n.application_id) {
        var open = UI.h('button', 'a-icon-btn a-notif-open');
        open.title = 'Open application';
        open.setAttribute('aria-label', 'Open application');
        open.appendChild(UI.icon('chevronRight', 15));
        open.addEventListener('click', function (e) {
          e.stopPropagation();
          location.href = 'application.html?id=' + encodeURIComponent(n.application_id);
        });
        actions.appendChild(open);
      }
      item.appendChild(actions);

      item.addEventListener('click', function () {
        if (n.application_id) location.href = 'application.html?id=' + encodeURIComponent(n.application_id);
      });

      return item;
    }

    function kindGlyph(k) { return { app: 'apps', new_application: 'apps', status: 'check', note: 'mail', assign: 'user' }[k] || 'bell'; }

    paint();
  });

  /* ======================================================================
     SETTINGS
     ====================================================================== */
  APAdmin.register('settings', function (host) {
    var me = Store.currentUser();
    host.textContent = '';
    host.appendChild(UI.h('h2', 'a-page-title', 'Settings'));
    var grid = UI.h('div', 'a-settings-grid');

    var profile = X.card('Profile');
    var pb = X.bodyFor(profile);
    var row = UI.h('div', 'a-cust-row');
    row.appendChild(UI.avatar(me.name, 48, me.color));
    var info = UI.h('div', null);
    info.appendChild(UI.h('strong', null, me.name));
    info.appendChild(UI.h('span', 'a-cust-sub', (Store.ROLES[me.role] || {}).label + ' \u00B7 ' + me.email));
    row.appendChild(info);
    pb.appendChild(row);
    grid.appendChild(profile);

    var look = X.card('Appearance');
    var lb = X.bodyFor(look);
    var themeBtn = UI.h('button', 'btn btn-ghost btn-sm', 'Switch to ' + (APAdmin.theme() === 'dark' ? 'light' : 'dark') + ' theme');
    themeBtn.addEventListener('click', function () {
      APAdmin.setTheme(APAdmin.theme() === 'dark' ? 'light' : 'dark');
      themeBtn.textContent = 'Switch to ' + (APAdmin.theme() === 'dark' ? 'light' : 'dark') + ' theme';
    });
    lb.appendChild(themeBtn);
    grid.appendChild(look);

    var data = X.card('Data source');
    var db = X.bodyFor(data);
    var status = UI.h('p', null, 'PostgreSQL');
    db.appendChild(status);
    db.appendChild(UI.h('p', 'a-muted', 'The admin portal reads and writes applications directly from the PostgreSQL database via the Activ Paisa API.'));
    grid.appendChild(data);

    var about = X.card('About');
    var ab = X.bodyFor(about);
    ab.appendChild(UI.h('p', null, 'Activ Paisa Admin \u2014 ' + new Date().getFullYear()));
    ab.appendChild(UI.h('p', 'a-muted', 'CRM for every loan application. Data lives in PostgreSQL.'));
    grid.appendChild(about);

    host.appendChild(grid);
  });
})();