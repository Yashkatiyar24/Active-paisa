/* ==========================================================================
   Activ Paisa — Admin page shared helpers
   Small utilities shared by every page controller.
   ========================================================================== */

var APX = (function () {
  'use strict';
  var UI = APUI, Store = APStore;

  function opt(value, label, selected) {
    var o = document.createElement('option');
    o.value = value == null ? '' : value;
    o.textContent = label;
    o.selected = !!selected;
    return o;
  }
  function link(label, href) {
    var a = UI.h('a', 'ci-link', label);
    a.href = href || '#';
    return a;
  }
  function btnLink(label, href, style, glyph) {
    var a = UI.h('a', 'btn ' + (style || 'btn-ghost') + ' btn-sm');
    a.href = href || '#';
    if (glyph) a.appendChild(UI.icon(glyph, 15));
    a.appendChild(UI.h('span', null, label));
    return a;
  }
  function field(label, input) {
    var fe = UI.h('div', 'field');
    fe.appendChild(UI.h('label', null, label));
    fe.appendChild(input);
    fe.appendChild(UI.h('p', 'error', ''));
    return fe;
  }
function countPill(n, noun) {
    noun = noun || ' applications';
    return UI.h('span', 'a-count-pill', String(n) + (n === 1 ? noun.replace(/s$/, '') : noun));
  }
  function executives(enabledOnly) {
    return Store.users().filter(function (u) {
      var isTeam = u.role === 'sales_executive' || u.role === 'sales_manager' || u.role === 'admin';
      return isTeam && (!enabledOnly || u.enabled);
    });
  }
function appUrl(id) { return 'application.html?id=' + encodeURIComponent(id); }
  function shortLoan(label) {
    if (!label) return '\u2014';
    if (/Loan Against/.test(label)) return 'Loan vs Property';
    return String(label).replace(/\s+Loan$/, '');
  }

  /* ---------- card ---------- */
  function card(title, right, extraClass) {
    var card = UI.h('div', 'a-card' + (extraClass ? ' ' + extraClass : ''));
    var head = UI.h('div', 'a-card-head');
    head.appendChild(UI.h('h3', 'a-card-title', title));
    if (right) head.appendChild(right);
    card.appendChild(head);
    return card;
  }
  function bodyFor(card) {
    var b = UI.h('div', 'a-card-body');
    card.appendChild(b);
    return b;
  }

  /* ---------- charts ---------- */
  function colours() {
    var dark = document.documentElement.getAttribute('data-admin-theme') === 'dark';
    return {
      bar: dark ? 'rgba(12,110,110,.95)' : 'rgba(12,110,110,.85)',
      grid: dark ? 'rgba(148,163,184,.16)' : 'rgba(100,116,139,.14)',
      ink: dark ? 'rgba(226,232,240,.92)' : 'rgba(71,85,105,.92)',
      palette: ['#0C6E6E', '#D97706', '#2563EB', '#7C3AED', '#BE185D']
    };
  }
  function canvas(host, w, h) {
    var c = document.createElement('canvas');
    c.width = w || 460;
    c.height = h || 220;
    host.appendChild(c);
    return c.getContext('2d');
  }
  function drawBar(host, buckets) {
    var ctx = canvas(host);
    var g = colours();
    var max = 1;
    buckets.forEach(function (b) { if (b.n > max) max = b.n; });
    var left = 40, right = 8, top = 22, bottom = 30;
    var bw = (ctx.canvas.width - left - right) / Math.max(buckets.length, 1);
    ctx.font = '11px Inter, sans-serif';
    /* horizontal gridlines */
    ctx.strokeStyle = g.grid;
    ctx.lineWidth = 1;
    for (var k = 0; k <= 4; k++) {
      var y = top + ((ctx.canvas.height - top - bottom) / 4) * k;
      ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(ctx.canvas.width - right, y); ctx.stroke();
    }
    buckets.forEach(function (b, i) {
      var h = (b.n / max) * (ctx.canvas.height - top - bottom);
      var x = left + i * bw + bw * 0.24;
      var w = Math.max(6, bw * 0.52);
      ctx.fillStyle = g.bar;
      ctx.fillRect(x, ctx.canvas.height - bottom - h, w, h);
      ctx.fillStyle = g.ink;
      ctx.textAlign = 'center';
      ctx.fillText(b.label, x + w / 2, ctx.canvas.height - bottom + 16);
      if (b.n) ctx.fillText(String(b.n), x + w / 2, ctx.canvas.height - bottom - h - 5);
    });
    ctx.textAlign = 'left';
  }
  function drawDisbursed(host, buckets) {
    var ctx = canvas(host);
    var g = colours();
    var max = 1;
    buckets.forEach(function (b) { if (b.applications > max) max = b.applications; });
    var maxD = 1;
    buckets.forEach(function (b) { if (b.disbursed > maxD) maxD = b.disbursed; });
    var left = 40, right = 8, top = 22, bottom = 30;
    var bw = (ctx.canvas.width - left - right) / Math.max(buckets.length, 1);
    ctx.font = '11px Inter, sans-serif';
    ctx.strokeStyle = g.grid;
    ctx.lineWidth = 1;
    for (var k = 0; k <= 4; k++) {
      var y = top + ((ctx.canvas.height - top - bottom) / 4) * k;
      ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(ctx.canvas.width - right, y); ctx.stroke();
    }
    buckets.forEach(function (b, i) {
      var x = left + i * bw;
      var w = Math.max(6, bw * 0.34);
      /* applications bar */
      var h = (b.applications / max) * (ctx.canvas.height - top - bottom);
      ctx.fillStyle = g.bar;
      ctx.fillRect(x, ctx.canvas.height - bottom - h, w, h);
      /* disbursed bar (secondary) */
      var h2 = (b.disbursed / maxD) * (ctx.canvas.height - top - bottom);
      ctx.fillStyle = g.palette[1];
      ctx.fillRect(x + w + 2, ctx.canvas.height - bottom - h2, w, h2);
      ctx.fillStyle = g.ink;
      ctx.textAlign = 'center';
      ctx.fillText(b.label, x + w + 1, ctx.canvas.height - bottom + 16);
      if (b.applications) ctx.fillText(String(b.applications), x + w / 2, ctx.canvas.height - bottom - h - 5);
      if (b.disbursed) ctx.fillText(compactNum(b.disbursed), x + w + 2 + w / 2, ctx.canvas.height - bottom - h2 - 5);
    });
    ctx.textAlign = 'left';
  }

  function drawDonut(host, items) {
    var ctx = canvas(host, 460, 210);
    var g = colours();
    var total = 0;
    items.forEach(function (x) { total += x.count; });
    var cx = 76, cy = 105, R = 58;
    var start = -Math.PI / 2;
    items.forEach(function (x, i) {
      if (!x.count) return;
      var ang = (x.count / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, start, start + ang);
      ctx.closePath();
      ctx.fillStyle = g.palette[i % g.palette.length];
      ctx.fill();
      start += ang;
    });
    ctx.fillStyle = document.documentElement.getAttribute('data-admin-theme') === 'dark' ? '#0f172a' : '#fff';
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = g.ink;
    ctx.font = '700 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(total), cx, cy + 5);
    /* legend */
    ctx.font = '12px Inter, sans-serif';
    var lx = cx + R + 26, ly = 40;
    items.forEach(function (x, i) {
      ctx.fillStyle = g.palette[i % g.palette.length];
      ctx.fillRect(lx, ly - 10, 11, 11);
      ctx.fillStyle = g.ink;
      ctx.textAlign = 'left';
      ctx.fillText(x.label + '  \u00B7 ' + x.count, lx + 17, ly + 1);
      ly += 28;
    });
    ctx.textAlign = 'left';
  }
  function totalOf(items) {
    return items.reduce(function (s, x) { return s + x.count; }, 0);
  }
  function compactNum(n) {
    if (n >= 10000000) return (n / 10000000).toFixed(1).replace(/\.0$/, '') + 'Cr';
    if (n >= 100000) return (n / 100000).toFixed(1).replace(/\.0$/, '') + 'L';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(n);
  }

  return {
    opt: opt, link: link, btnLink: btnLink, field: field,
    countPill: countPill, executives: executives, appUrl: appUrl, shortLoan: shortLoan,
    card: card, bodyFor: bodyFor,
    colours: colours, drawBar: drawBar, drawDonut: drawDonut, drawDisbursed: drawDisbursed, totalOf: totalOf
  };
})();