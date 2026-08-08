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
    function paint() {
      host.textContent = '';
      var map = {};
      Store.listApplications().forEach(function (a) {
        var name = a.customer.name || 'Unknown';
        map[name] = map[name] || { name: name, email: a.customer.email, phone: a.customer.phone, apps: 0, amount: 0, last: 0 };
        var c = map[name];
        c.apps++;
        c.amount += a.amount;
        if (a.created > c.last) c.last = a.created;
      });
      var customers = Object.keys(map).map(function (k) { return map[k]; }).sort(function (x, y) { return y.last - x.last; });

      var head = UI.h('div', 'a-section-head');
      head.appendChild(UI.h('h2', null, 'Customers'));
      head.appendChild(X.countPill(customers.length, ' customers'));
      host.appendChild(head);

      var card = X.card('All customers');
      var body = X.bodyFor(card);
      if (!customers.length) {
        body.appendChild(UI.emptyState('users', 'No customers yet', 'Customers appear as soon as applications come in.'));
        host.appendChild(card);
        return;
      }
      var t = UI.h('table', 'a-table');
      var thead = document.createElement('thead');
      thead.appendChild(tableHeadT(['Customer', 'Mobile', 'Applications', 'Total value', 'Last activity']));
      t.appendChild(thead);
      var tbody = document.createElement('tbody');
      customers.forEach(function (c) {
        var tr = document.createElement('tr');
        var who = UI.h('div', 'a-who');
        who.appendChild(UI.avatar(c.name, 32, uiColor(c.name)));
        var wt = UI.h('div', 'a-who-text');
        wt.appendChild(UI.h('strong', null, c.name));
        wt.appendChild(UI.h('span', null, (c.email || '').toLowerCase()));
        who.appendChild(wt);
        tr.appendChild(td(who));
        tr.appendChild(td(c.phone || '\u2014'));
        tr.appendChild(td(String(c.apps)));
        tr.appendChild(td(UI.rupees(c.amount)));
        tr.appendChild(td(UI.timeAgo(c.last)));
        tr.classList.add('is-clickable');
        tr.addEventListener('click', function () { customerModal(c); });
        tbody.appendChild(tr);
      });
      t.appendChild(tbody);
      body.appendChild(t);
      host.appendChild(card);
    }
    paint();
  });

  function customerModal(c) {
    var m = UI.modal({ title: c.name });
    var b = m.body;
    b.appendChild(UI.h('p', 'a-muted', ((c.email || '').toLowerCase()) + (c.phone ? ' \u00B7 ' + c.phone : '')));
    var apps = Store.listApplications().filter(function (a) { return (a.customer.name || '') === c.name; });
    var list = UI.h('div', 'a-feed');
    apps.forEach(function (a) {
      list.appendChild(appRowLink(a));
    });
    b.appendChild(list);
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
        pair.appendChild(UI.h('strong', null, r.doc.label || r.doc.name));
        tr.appendChild(td(pair));
        var refLink = UI.h('a', 'ci-link', r.app.ref);
        refLink.href = X.appUrl(r.app.id);
        tr.appendChild(td(refLink));
        tr.appendChild(td(r.app.customer.name || ''));
        tr.appendChild(td(r.doc.size || '\u2014'));
        tr.appendChild(td(UI.chip(r.app.status)));
        var dl = UI.h('button', 'a-icon-btn');
        dl.appendChild(UI.icon('download', 15));
        dl.addEventListener('click', function () {
          UI.download(r.doc.name, r.app.ref + '\n' + (r.doc.label || r.doc.name) + '\n\nPlaceholder document.', 'text/plain');
        });
        tr.appendChild(td(dl));
        tbody.appendChild(tr);
      });
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
            if (u.id === Store.currentUser().id) { UI.toast('You cannot disable your own account.', 'error'); return; }
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
    var st = Store.stats();

    var kpis = UI.h('div', 'a-kpi-grid');
    kpis.appendChild(UI.kpi('Total applications', String(st.total)));
    kpis.appendChild(UI.kpi('Disbursed value', UI.rupees(st.totalDisbursed), st.disbursed + ' loans paid out'));
    kpis.appendChild(UI.kpi('Rejected', String(st.rejected || 0), pct(st, 'rejected') + '% of all applications'));
    kpis.appendChild(UI.kpi('This month', String(st.monthApps), 'new applications'));
    host.appendChild(kpis);
    function pct(st2, key) {
      var n = st2[key] || 0;
      return st2.total ? Math.round(n / st2.total * 100) : 0;
    }

    var charts = UI.h('div', 'a-chart-grid');
    var barCard = X.card('Applications \u00B7 last 12 months');
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

    /* enrichment: totals per loan */
    var loanStats = {};
    Store.listApplications().forEach(function (a) {
      loanStats[a.loanId] = loanStats[a.loanId] || { n: 0, total: 0, disbursed: 0 };
      loanStats[a.loanId].n++;
      loanStats[a.loanId].total += a.amount;
      if (a.status === 'disbursed') loanStats[a.loanId].disbursed++;
    });

    var card = X.card('Loan mix', exportBtn());
    var body = X.bodyFor(card);
    var t = UI.h('table', 'a-table');
    var thead = document.createElement('thead');
    thead.appendChild(tableHeadT(['Loan type', 'Applications', 'Total requested', 'Av.value', 'Disbursed']));
    t.appendChild(thead);
    var tbody = document.createElement('tbody');
    Store.LOAN_TYPES.forEach(function (lt) {
      var s = loanStats[lt.id] || { n: 0, total: 0, disbursed: 0 };
      var tr = document.createElement('tr');
      tr.appendChild(td(lt.label));
      tr.appendChild(td(String(s.n)));
      tr.appendChild(td(UI.rupees(s.total)));
      tr.appendChild(td(s.n ? UI.rupees(s.total / s.n) : '\u2014'));
      tr.appendChild(td(String(s.disbursed)));
      tbody.appendChild(tr);
    });
    t.appendChild(tbody);
    body.appendChild(t);
    host.appendChild(card);

    X.drawBar(barHost, Store.byMonth(12));
    X.drawDonut(dHost, Store.byLoanType());

    function exportBtn() {
      if (!Store.can('export')) return null;
      var btn = UI.h('button', 'a-icon-btn');
      btn.title = 'Export CSV';
      btn.appendChild(UI.icon('download', 16));
      btn.addEventListener('click', function () {
        var rows = Store.LOAN_TYPES.map(function (lt) {
          var s = loanStats[lt.id] || { n: 0, total: 0, disbursed: 0 };
          return [lt.label, s.n, s.total, s.n ? Math.round(s.total / s.n) : 0, s.disbursed];
        });
        UI.download('report-' + new Date().toISOString().slice(0, 10) + '.csv',
          UI.toCSV(['Loan type', 'Applications', 'Total requested', 'Avg value', 'Disbursed'], rows), 'text/csv');
        UI.toast('Report exported.', 'success');
      });
      return btn;
    }
  });

  /* ======================================================================
     NOTIFICATIONS
     ====================================================================== */
  APAdmin.register('notifications', function (host) {
    function paint() {
      host.textContent = '';
      var list = Store.notifications();
      var unread = list.filter(function (n) { return !n.read; }).length;
      var head = UI.h('div', 'a-section-head');
      head.appendChild(UI.h('h2', null, 'Notifications'));
      head.appendChild(X.countPill(unread, ' unread'));
      host.appendChild(head);

      var card = X.card('All notifications');
      var body = X.bodyFor(card);
      if (!list.length) {
        body.appendChild(UI.emptyState('bell', 'Nothing yet', 'Alerts for new applications and status changes appear here.'));
        host.appendChild(card);
        return;
      }
      var rows = UI.h('div', 'a-notif-list');
      list.forEach(function (n) {
        var item = UI.h('div', 'a-notif-item' + (n.read ? '' : ' is-unread'));
        item.appendChild(UI.icon(kindGlyph(n.kind), 18));
        var wrap = UI.h('div', null);
        wrap.appendChild(UI.h('strong', null, n.title));
        wrap.appendChild(UI.h('p', null, n.body));
        wrap.appendChild(UI.h('span', 'a-notif-at', UI.timeAgo(n.at)));
        item.appendChild(wrap);
        item.addEventListener('click', function () {
          Store.markRead(n.id);
          paint();
        });
        rows.appendChild(item);
      });
      body.appendChild(rows);
      var markAll = UI.h('button', 'btn btn-ghost btn-sm', 'Mark all read');
      markAll.addEventListener('click', function () {
        Store.markAllRead();
        paint();
      });
      body.appendChild(markAll);
      host.appendChild(card);
    }
    function kindGlyph(k) { return { app: 'apps', status: 'check', note: 'mail', assign: 'user' }[k] || 'bell'; }
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