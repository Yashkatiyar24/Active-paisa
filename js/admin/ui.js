/* ==========================================================================
   Activ Paisa — Admin UI components
   Shared building blocks for the portal: icons, avatars, chips, page shells,
   tables helpers, dropdowns, modals, toasts and CSV / Excel export.
   Depends on APCore (DOM/format helpers) and APStore.
   ========================================================================== */

var APUI = (function () {
  'use strict';

  var C = APCore;

  /* ---------- tiny element helper ---------- */
  function h(tag, cls, children) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (children != null) append(node, children);
    return node;
  }
  function append(node, children) {
    if (typeof children === 'string' || typeof children === 'number') {
      node.textContent = children;
      return;
    }
    if (children && children.nodeType) { node.appendChild(children); return; }
    if (Array.isArray(children)) children.forEach(function (c) { c && node.appendChild(c); });
  }
  function arr(n) {
    var out = [];
    for (var i = 0; i < n; i++) out.push(null);
    return out;
  }

  /* ------------------------------------------------------------------ icons
     Minimal stroke set; kept small so a page never carries unused glyphs. */
  var ICON_PATHS = {
    dashboard: ['M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6v-9h-6v9zm0-16v5h6V4h-6z'],
    apps: ['M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z'],
    customers: ['M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-4 0-8 2-8 5v2h16v-2c0-3-4-5-8-5z'],
    docs: ['M6 2h9l5 5v15H6zM15 2v5h5zM9 12h6M9 16h6'],
    execs: ['M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM4 21c0-3 3-5 9-5s9 2 9 5'],
    reports: ['M3 21h18M6 17h3v-4H6zM10 17h3V7h-3zM14 17h3V3h-3z'],
    bell: ['M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2zm6-6v-5a6 6 0 0 0-4-5.6V5a2 2 0 1 0-4 0v.4A6 6 0 0 0 6 11v5l-2 2v1h16v-1z'],
    settings: ['M12 8a4 4 0 1 0 4 4 4 4 0 0 0-4-4zm9 4a9 9 0 0 0-.1-1l2-1.6-2-3.4-2.3 1a9 9 0 0 0-1.7-1L16.5 3h-4l-.5 2.5a9 9 0 0 0-1.7 1L8 5.5 6 8.9l2 1.6a9 9 0 0 0 0 2l-2 1.6 2 3.4 2.3-1a8.9 8.9 0 0 0 1.7 1l.5 2.5h4l.3-2.5a8.9 8.9 0 0 0 1.7-1l2.3 1 2-3.4-2-1.6a9 9 0 0 0 .1-1z'],
    search: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm10 2-4.5-4.5'],
    plus: ['M12 5v14M5 12h14'],
    download: ['M12 3v12m0 0 4-4m-4 4-4-4M4 21h16'],
    chevronDown: ['M6 9l6 6 6-6'],
    chevronRight: ['M9 6l6 6-6 6'],
    chevronUp: ['M6 15l6-6 6 6'],
    check: ['M5 12.5l4.5 4.5L19 7.5'],
    x: ['M6 6l12 12M18 6L6 18'],
    filter: ['M3 5h18l-7 8v6l-4-2v-4z'],
    eye: ['M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7zm11 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
    arrowsUpDown: ['M7 4v16m0 0 3-3m-3 3-3-3M17 20V4m0 0 3 3m-3-3-3 3'],
    logout: ['M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 7l5 5-5 5M3 12h12'],
    shield: ['M12 3 4 6v5c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6zM8 12l3 3 5-6'],
    rupee: ['M6 3h12M6 8h12M6 3c6 0 6 5 0 5m0 0c0 0-2 4-2 6 0 2 2 3 4 3 3 0 4 0 7 4'],
    clock: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zm0-16v6l4 3'],
    user: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c0-3 3-6 8-6s8 3 8 6'],
    phone: ['M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.7.4 1.5.7 2.2a2 2 0 0 1-.4 2.1l-1.3 1.3a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.7.3 1.5.6 2.2.7a2 2 0 0 1 1.7 2z'],
    mail: ['M4 6h16v12H4zM4 6l8 7 8-7'],
    pin: ['M12 22s8-5.2 8-13a8 8 0 0 0-16 0c0 7.8 8 13 8 13zm0-11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z'],
    calendar: ['M4 5h16v16H4zM8 2v6m8-6v6M4 11h16'],
    building: ['M3 21h18M5 21V5l8-2v18m6 0V9l-6-2v14M9 8h2m-2 4h2m-2 4h2'],
    receipt: ['M5 2h14v20l-3-2-2 2-2-2-2 2-2-2-3 2zM8 8h8M8 12h8M8 16h5'],
    logout: ['M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4 4-4M3 12h13'],
    grid: ['M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z'],
    zap: ['M13 2 3 14h7l-1 8 10-12h-7z'],
    briefcase: ['M4 7h16v14H4zM10 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M4 12h16'],
    refresh: ['M20 8A8 8 0 0 0 5.7 5.7L4 7m0-4v4h4m-4 6a8 8 0 0 0 14.3 2.3L20 17m0 4v-4h-4'],
    sun: ['M12 1v2m0 18v2M4.2 4.2l1.4 1.4m12.8 12.8 1.4 1.4M1 12h2m18 0h2M4.2 19.8 5.6 18.4m12.8-12.8 1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z'],
    moon: ['M20 12.5A8 8 0 0 1 11.5 4a8 8 0 1 0 8.5 8.5z'],
    sliders: ['M4 6h9m5 0h2M4 12h4m5 0h8M4 18h12m2 0h2M15 4v4M7 12v4M18 16v4'],
    image: ['M4 4h16v16H4zM4 9l5-5 4 4 3-3 4 4M15.5 8a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z'],
    call: ['M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.7.4 1.5.7 2.2a2 2 0 0 1-.4 2.1l-1.3 1.3a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.7.3 1.5.6 2.2.7a2 2 0 0 1 1.7 2z'],
    message: ['M21 11.5a8.5 8.5 0 0 1-12.4 7.5L3 21l2-5.6A8.5 8.5 0 1 1 21 11.5z'],
    print: ['M5 5V2h14v3M3 8h18v8h-3v6H6v-6H3zM8 17h8'],
    edit: ['M4 20h4L19 9l-4-4L4 16zM13 6l4 4'],
    upload: ['M12 16V5m0 0 4 4m-4-4-4 4M4 21h16']
  };

  function icon(name, size) {
    var paths = ICON_PATHS[name] || ICON_PATHS.grid;
    return C.svg('0 0 24 24', paths.map(function (d) {
      return { d: d, fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
    }), size || 18);
  }

  /* ------------------------------------------------------------------ avatar */
  function initials(name) {
    if (!name) return '?';
    var parts = String(name).trim().split(/\s+/);
    return (parts[0][0] || '') + (parts[1] ? parts[1][0] : '').toUpperCase();
  }
  function avatar(name, size, color) {
    var node = h('span', 'a-avatar');
    if (size) node.style.width = size + 'px', node.style.height = size + 'px';
    node.style.background = color || inkColor(name);
    node.textContent = initials(name);
    node.setAttribute('aria-hidden', 'true');
    return node;
  }
  function inkColor(name) {
    var hues = ['#0C6E6E', '#7C3AED', '#2563EB', '#D97706', '#0891B2', '#DC2626', '#0D3B45', '#B45309', '#4338CA', '#047857'];
    var n = 0;
    for (var i = 0; i < name.length; i++) n = (n * 31 + name.charCodeAt(i)) >>> 0;
    return hues[n % hues.length];
  }

  /* ------------------------------------------------------------------ status */
  function chip(status) {
    var meta = APStore.STATUS_MAP[status] || { id: status, label: status, tone: 'info' };
    var node = h('span', 'a-chip a-chip-' + meta.tone, meta.label);
    return node;
  }
  function roleBadge(role) {
    var meta = APStore.ROLES[role] || { label: role };
    return h('span', 'a-role', meta.label);
  }

  /* ------------------------------------------------------------------ time */
  function fmtDate(msOrIso) {
    var d = new Date(msOrIso);
    if (isNaN(d)) return '\u2014';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function fmtDateTime(msOrIso) {
    var d = new Date(msOrIso);
    if (isNaN(d)) return '\u2014';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' +
      d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }
  function timeAgo(msOrIso) {
    var then = new Date(msOrIso).getTime();
    if (!then) return '';
    var diff = Date.now() - then;
    var min = Math.floor(diff / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return min + 'm ago';
    var hrs = Math.floor(min / 60);
    if (hrs < 24) return hrs + 'h ago';
    var days = Math.floor(hrs / 24);
    if (days < 30) return days + 'd ago';
    return fmtDate(msOrIso);
  }
  function rupees(n) {
    return APStore.formatMoney ? APStore.formatMoney(n) : ('\u20B9' + n);
  }
  function emi(amount, months) {
    var r = 0.125 / 12;
    var f = Math.pow(1 + r, months);
    return amount * r * f / (f - 1);
  }

  /* ------------------------------------------------------------------ nav */
  function clickRow(tr, app) {
    tr.classList.add('is-clickable');
    tr.addEventListener('click', function (e) {
      if (e.target.closest('input, select, a, button, label')) return;
      location.href = 'application.html?id=' + encodeURIComponent(app.id);
    });
  }

  function emptyState(iconName, title, sub, action) {
    var wrap = h('div', 'a-empty');
    wrap.appendChild(h('span', 'a-empty-icon', '')).appendChild(icon(iconName, 34));
    wrap.appendChild(h('p', 'a-empty-title', title));
    if (sub) wrap.appendChild(h('p', 'a-empty-sub', sub));
    if (action) wrap.appendChild(action);
    return wrap;
  }

  /* ------------------------------------------------------------------ dropdown */
  function dropdown(trigger, buildMenu, onSelect) {
    /* closes any open sibling first; one menu at a time */
    closeAllMenus();
    var id = 'menu' + Math.random().toString(36).slice(2);
    var menuRoot = h('div', 'a-menu');
    menuRoot.id = id;
    menuRoot.dataset.open = '1';
    document.body.appendChild(menuRoot);
    buildMenu(menuRoot);
    positionMenu(menuRoot, trigger);
    menuRoot.addEventListener('click', function (e) {
      var item = e.target.closest('[data-action]');
      if (!item) return;
      e.preventDefault();
      closeMenu(menuRoot);
      if (onSelect) onSelect(item.dataset.action, item);
    });
    function outside(e) {
      if (!menuRoot.contains(e.target) && !trigger.contains(e.target)) closeMenu(menuRoot);
    }
    setTimeout(function () { document.addEventListener('click', outside); }, 0);
    return menuRoot;
  }
  function positionMenu(menu, trigger) {
    var r = trigger.getBoundingClientRect();
    var m = menu.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.left = Math.max(8, Math.min(r.left + r.width - 220, window.innerWidth - 228)) + 'px';
    menu.style.top = (r.bottom > window.innerHeight - 320 ? r.top - m.height : r.bottom) + 'px';
  }
  function menuItem(label, action, opts) {
    opts = opts || {};
    var node = h('button', 'a-menu-item' + (opts.danger ? ' is-danger' : ''), label);
    node.dataset.action = action;
    if (opts.icon) node.appendChild(icon(opts.icon, 16));
    return node;
  }
  function closeAllMenus() {
    [].forEach.call(document.querySelectorAll('.a-menu'), closeMenu);
  }
  function closeMenu(node) {
    if (node) node.remove();
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAllMenus(); });
  }

  /* ------------------------------------------------------------------ modal */
  function modal(opts) {
    var backdrop = h('div', 'a-modal-backdrop');
    backdrop.addEventListener('mousedown', function (e) { if (e.target === backdrop) close(); });
    var panel = h('div', 'a-modal');
    var head = h('div', 'a-modal-head');
    head.appendChild(h('h3', 'a-modal-title', opts.title || ''));
    var closeBtn = h('button', 'a-modal-x');
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.appendChild(icon('x', 18));
    closeBtn.addEventListener('click', close);
    head.appendChild(closeBtn);
    panel.appendChild(head);
    var body = h('div', 'a-modal-body');
    panel.appendChild(body);
    backdrop.appendChild(panel);
    document.body.appendChild(backdrop);

    var lastFocus = document.activeElement;
    function onKey(e) { if (e.key === 'Escape') close(); }
    window.addEventListener('keydown', onKey);
    function close() {
      window.removeEventListener('keydown', onKey);
      backdrop.remove();
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    return { body: body, close: close };
  }

  /* ------------------------------------------------------------------ confirm */
  function confirmDialog(opts, onYes) {
    var back = h('div', 'a-confirm-backdrop');
    back.addEventListener('mousedown', function (e) { if (e.target === back) back.remove(); });
    var card = h('div', 'a-kcard');
    var ic = h('span', 'a-kicon' + (opts.danger ? ' is-danger' : ''));
    ic.appendChild(icon(opts.icon || 'check', 24));
    card.appendChild(ic);
    card.appendChild(h('h3', 'a-ktitle', opts.title));
    if (opts.body) card.appendChild(h('p', 'a-kbody', opts.body));
    var acts = h('div', 'a-kactions');
    var cancel = h('button', 'btn btn-ghost btn-sm', opts.cancel || 'Cancel');
    var yes = h('button', 'btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + ' btn-sm');
    yes.textContent = opts.confirm || 'Confirm';
    cancel.addEventListener('click', function () { back.remove(); });
    yes.addEventListener('click', function () { back.remove(); onYes(); });
    acts.appendChild(cancel);
    acts.appendChild(yes);
    card.appendChild(acts);
    back.appendChild(card);
    document.body.appendChild(back);
  }

  /* ------------------------------------------------------------------ toast */
  function toast(message, type) {
    var host = document.getElementById('a-toasts');
    if (!host) return;
    var node = h('div', 'toast' + (type ? ' ' + type : ''), message);
    host.appendChild(node);
    setTimeout(function () {
      node.classList.add('is-out');
      var done = false;
      var cleanup = function () { if (!done) { done = true; node.remove(); } };
      node.addEventListener('animationend', cleanup);
      setTimeout(cleanup, 500);
    }, 3600);
  }

  /* ------------------------------------------------------------------ export */
  function escapeCSV(v) {
    if (v == null) return '';
    var s = String(v);
    if (/[",\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  }
  function download(filename, text, mime) {
    var blob = new Blob([text], { type: mime + ';charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 100);
  }
  function toCSV(headers, rows) {
    var lines = rows.map(function (r) {
      return headers.map(function (col, i) {
        var v = r[i];
        if (col.indexOf('%') === 0) v = String(v).replace(/\u20B9/g, '');
        return escapeCSV(v);
      }).join(',');
    });
    return '\uFEFF' + [headers.join(',')].concat(lines).join('\n');
  }

  /* ------------------------------------------------------------------ stepper */
  function stepper(status) {
    var flow = APStore.STATUS_FLOW;
    var idx = flow.findIndex(function (s) { return s.id === status; });
    var wrap = h('ol', 'a-stepper');
    flow.forEach(function (s, i) {
      var li = h('li');
      li.className = (i < idx ? 'is-done' : i === idx ? 'is-current' : '');
      li.appendChild(icon('check', 13));
      li.appendChild(h('span', null, s.label));
      wrap.appendChild(li);
    });
    return wrap;
  }

  /* ------------------------------------------------------------------ pager */
  function pager(total, page, perPage, onChange) {
    var pages = Math.max(1, Math.ceil(total / perPage));
    if (pages <= 1) return null;
    var wrap = h('div', 'a-pager');
    var prev = h('button', 'a-page-btn', '\u2039');
    prev.disabled = page <= 1;
    prev.addEventListener('click', function () { if (!prev.disabled) onChange(page - 1); });
    var next = h('button', 'a-page-btn', '\u203A');
    next.disabled = page >= pages;
    next.addEventListener('click', function () { if (!next.disabled) onChange(page + 1); });
    wrap.appendChild(prev);
    var start = Math.max(1, page - 2), end = Math.min(pages, start + 4);
    start = Math.max(1, end - 4);
    for (var i = start; i <= end; i++) {
      (function (n) {
        var b = h('button', 'a-page-btn' + (n === page ? ' is-active' : ''), String(n));
        b.addEventListener('click', function () { onChange(n); });
        wrap.appendChild(b);
      })(i);
    }
    wrap.appendChild(next);
    return wrap;
  }

  /* ------------------------------------------------------------------ stat card */
  function kpi(title, value, sub, delta, deltaUp) {
    var card = h('div', 'a-kpi');
    card.appendChild(h('p', 'a-kpi-label', title));
    card.appendChild(h('p', 'a-kpi-value', value));
    if (sub) {
      var subRow = h('div', 'a-kpi-sub');
      if (delta != null) {
        var d = h('span', 'a-delta' + (deltaUp == null ? '' : deltaUp ? ' is-up' : ' is-down'));
        d.textContent = (deltaUp ? '\u2191 ' : '\u2193 ') + delta;
        subRow.appendChild(d);
      }
      subRow.appendChild(h('span', null, sub));
      card.appendChild(subRow);
    }
    return card;
  }

  function section(title, right, className) {
    var head = h('div', 'a-card-head');
    head.appendChild(h('h3', 'a-card-title', title));
    if (right) head.appendChild(right);
    var card = h('div', 'a-card' + (className ? ' ' + className : ''));
    card.appendChild(head);
    return card;
  }
  function cardBody(card) {
    return h('div', 'a-card-body');
  }

  return {
    h: h, append: append, icon: icon,
    initials: initials, avatar: avatar,
    chip: chip, roleBadge: roleBadge,
    fmtDate: fmtDate, fmtDateTime: fmtDateTime, timeAgo: timeAgo, rupees: rupees, emi: emi,
    clickRow: clickRow, emptyState: emptyState,
    dropdown: dropdown, menuItem: menuItem, modal: modal, confirmDialog: confirmDialog,
    toast: toast,
    toCSV: toCSV, download: download,
    stepper: stepper, pager: pager, kpi: kpi, section: section, cardBody: cardBody
  };
})();