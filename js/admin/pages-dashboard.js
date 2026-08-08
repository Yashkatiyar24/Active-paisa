/* ==========================================================================
   Admin — Dashboard
   ========================================================================== */
APAdmin.register('dashboard', (function () {
  'use strict';
  var UI = APAdmin.UI, Store = APAdmin.Store, X = APX;

  function feedRow(a) {
    var row = UI.h('a', 'a-feed-row');
    row.href = X.appUrl(a.id);
    row.appendChild(UI.avatar(a.customer.name, 34, uiColor(a.customer.name)));
    var mid = UI.h('div', 'a-feed-mid');
    mid.appendChild(UI.h('strong', null, a.customer.name));
    mid.appendChild(UI.h('span', null, a.loanLabel + ' \u00B7 ' + UI.rupees(a.amount) + ' \u00B7 ' + UI.timeAgo(a.created)));
    row.appendChild(mid);
    row.appendChild(UI.chip(a.status));
    return row;
  }
  function uiColor(name) {
    var hues = ['#0C6E6E', '#7C3AED', '#2563EB', '#D97706', '#0891B2', '#DC2626', '#0D3B45', '#B45309', '#4338CA', '#047857'];
    var n = 0;
    for (var i = 0; i < String(name).length; i++) n = (n * 31 + String(name).charCodeAt(i)) >>> 0;
    return hues[n % hues.length];
  }

  return function (host) {
    var data = Store.stats();
    var mix = Store.byLoanType();
    var counts = {};
    mix.forEach(function (m) { counts[m.id] = m.count; });

    var kpis = UI.h('div', 'a-kpi-grid');
    kpis.appendChild(UI.kpi('Total applications', String(data.total), 'all-time through the site'));
    kpis.appendChild(UI.kpi("Today's applications", String(data.today), 'received today'));
    kpis.appendChild(UI.kpi('Awaiting action', String(data.needsAction), 'new or documents pending'));
    kpis.appendChild(UI.kpi('Value disbursed', UI.rupees(data.totalDisbursed), data.disbursed + ' loans paid out'));
    host.appendChild(kpis);

    var kpi2 = UI.h('div', 'a-kpi-grid');
    kpi2.appendChild(UI.kpi('Personal loans', String(counts.personal || 0)));
    kpi2.appendChild(UI.kpi('Business loans', String(counts.business || 0)));
    kpi2.appendChild(UI.kpi('Home loans', String(counts.home || 0)));
    kpi2.appendChild(UI.kpi('Pending', String(data.needsAction)));
    host.appendChild(kpi2);

    var kpi3 = UI.h('div', 'a-kpi-grid');
    kpi3.appendChild(UI.kpi('Approved', String(data.approved)));
    kpi3.appendChild(UI.kpi('Rejected', String(data.rejected)));
    kpi3.appendChild(UI.kpi('Under review', String(statusCount('under_review'))));
    kpi3.appendChild(UI.kpi('Disbursed', String(data.disbursed)));
    host.appendChild(kpi3);

    function statusCount(id) {
      var c = 0;
      Store.listApplications().forEach(function (a) { if (a.status === id) c++; });
      return c;
    }

    var charts = UI.h('div', 'a-chart-grid');
    var barCard = X.card('Applications \u00B7 last 12 months');
    var barBody = X.bodyFor(barCard);
    var barHost = UI.h('div', 'a-canvas-box');
    barBody.appendChild(barHost);
    charts.appendChild(barCard);

    var donutCard = X.card('Loan mix');
    var donutBody = X.bodyFor(donutCard);
    var donutHost = UI.h('div', 'a-canvas-box');
    donutBody.appendChild(donutHost);
    charts.appendChild(donutCard);
    host.appendChild(charts);

    var lower = UI.h('div', 'a-lower-grid');

    var recent = X.card('Recent applications', X.link('View all', 'applications.html'));
    var rb = X.bodyFor(recent);
    var feed = Store.listApplications().slice(0, 6);
    if (!feed.length) rb.appendChild(UI.emptyState('apps', 'No applications yet', 'Submissions from the website appear here automatically.'));
    else {
      var rows = UI.h('div', 'a-feed');
      feed.forEach(function (a) { rows.appendChild(feedRow(a)); });
      rb.appendChild(rows);
    }
    lower.appendChild(recent);

    var hot = X.card('Needs attention', X.link('Applications', 'applications.html?queue=attention'));
    var hb = X.bodyFor(hot);
    var list = Store.listApplications().filter(function (a) { return a.status === 'new' || a.status === 'docs_pending'; }).slice(0, 5);
    var ul = UI.h('ul', 'a-hotlist');
    if (!list.length) ul.appendChild(UI.h('li', 'a-hot-empty', 'Nothing needs attention right now.'));
    list.forEach(function (a) {
      var li = UI.h('li', null);
      var row = UI.h('a', 'a-hot-row');
      row.href = X.appUrl(a.id);
      row.appendChild(UI.avatar(a.customer.name, 28, ''));
      var info = UI.h('div', 'a-hot-info');
      info.appendChild(UI.h('span', 'a-hot-name', a.customer.name));
      info.appendChild(UI.h('span', 'a-hot-ref', a.loanLabel + ' \u00B7 ' + UI.rupees(a.amount)));
      row.appendChild(info);
      li.appendChild(row);
      li.appendChild(UI.chip(a.status));
      ul.appendChild(li);
    });
    hb.appendChild(ul);
    lower.appendChild(hot);

    var actCard = X.card('Recent activity');
    var ab = X.bodyFor(actCard);
    var acts = Store.notifications().slice(0, 5);
    var aList = UI.h('ul', 'a-actlist');
    if (!acts.length) aList.appendChild(UI.h('li', null, 'No activity yet.'));
    acts.forEach(function (n) {
      var li = UI.h('li', null);
      var dot = UI.h('span', 'a-act-dot' + (n.read ? '' : ' is-live'));
      dot.appendChild(UI.icon('clock', 13));
      li.appendChild(dot);
      var t = UI.h('div', null);
      t.appendChild(UI.h('strong', null, n.title));
      t.appendChild(UI.h('span', 'a-act-sub', n.body + ' \u00B7 ' + UI.timeAgo(n.at)));
      li.appendChild(t);
      aList.appendChild(li);
    });
    ab.appendChild(aList);
    lower.appendChild(actCard);
    host.appendChild(lower);

    X.drawBar(barHost, Store.byMonth(12));
    X.drawDonut(donutHost, Store.byLoanType());
  };
})());