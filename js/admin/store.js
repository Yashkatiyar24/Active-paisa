/* ==========================================================================
   Activ Paisa — Admin data layer (PostgreSQL-backed)
   A thin client for the Activ Paisa API. Keeps the same synchronous
   interface the page controllers were built against — they read from an
   in-memory cache that is kept fresh by load() and real-time events.
   ========================================================================== */

var APStore = (function () {
  'use strict';

  var API = '/api/v1';
  var SESSION_KEY = 'ap_admin_session';
  var CACHE_KEY = 'ap_admin_cache_v1';
  var READ_KEY = 'ap_admin_read';
  var THEME_KEY = 'ap_admin_theme';

  /* ---------- reference data (mirrors the API /meta contract) ---------- */
  var LOAN_TYPES = [
    { id: 'personal', label: 'Personal Loan',           min: 50000,   max: 1500000 },
    { id: 'business', label: 'Business Loan',           min: 200000,  max: 5000000 },
    { id: 'home',     label: 'Home Loan',               min: 1500000, max: 20000000 },
    { id: 'lap',      label: 'Loan Against Property',   min: 2500000, max: 25000000 }
  ];
  var LOAN_MAP = {};
  LOAN_TYPES.forEach(function (t) { LOAN_MAP[t.id] = t; });

  var STATUS_FLOW = [
    { id: 'new',           label: 'New',                 tone: 'info' },
    { id: 'contacted',     label: 'Contacted',           tone: 'info' },
    { id: 'docs_pending',  label: 'Documents Pending',   tone: 'warn' },
    { id: 'docs_received', label: 'Documents Received',  tone: 'info' },
    { id: 'under_review',  label: 'Under Review',        tone: 'info' },
    { id: 'approved',      label: 'Approved',            tone: 'success' },
    { id: 'disbursed',     label: 'Disbursed',           tone: 'success' }
  ];
  var TERMINAL = [
    { id: 'rejected', label: 'Rejected', tone: 'danger' },
    { id: 'closed',   label: 'Closed',   tone: 'danger' }
  ];
  var STATUS_MAP = {};
  STATUS_FLOW.concat(TERMINAL).forEach(function (s) { STATUS_MAP[s.id] = s; });

  var ROLES = {
    super_admin:     { label: 'Super Admin',     rank: 5 },
    admin:           { label: 'Admin',           rank: 4 },
    sales_manager:   { label: 'Sales Manager',   rank: 3 },
    sales_executive: { label: 'Sales Executive', rank: 2 },
    viewer:          { label: 'Viewer',          rank: 1 }
  };

  var PERMISSIONS = {
    view:        { super_admin: 1, admin: 1, sales_manager: 1, sales_executive: 1, viewer: 1 },
    view_all:    { super_admin: 1, admin: 1, sales_manager: 1, viewer: 1 },
    edit_status: { super_admin: 1, admin: 1, sales_manager: 1, sales_executive: 1 },
    approve:     { super_admin: 1, admin: 1, sales_manager: 1 },
    assign:      { super_admin: 1, admin: 1, sales_manager: 1, sales_executive: 1 },
    users:       { super_admin: 1, admin: 1 },
    notes:       { super_admin: 1, admin: 1, sales_manager: 1, sales_executive: 1 },
    export:      { super_admin: 1, admin: 1, sales_manager: 1, viewer: 1 },
    database:    { super_admin: 1, admin: 1 },
    settings:    { super_admin: 1 }
  };
  var VIEW_SCOPE = {
    super_admin: 'all', admin: 'all', sales_manager: 'all', viewer: 'all',
    sales_executive: 'assigned'
  };

  /* ---------- local cache ---------- */
  var cache = {
    apps: [],        // serialized loan applications
    users: [],       // executives
    dash: null,      // dashboard analytics payload
    notifs: [],
    loaded: false
  };

  /* Restore the in-memory cache from sessionStorage so navigating between
     admin pages is instant (no re-fetch on every tab switch). Data stays
     fresh via background refresh, SSE events and filter re-fetch. */
  (function hydrateCache() {
    try {
      var raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return;
      var saved = JSON.parse(raw);
      if (!saved || saved.loaded !== true) return;
      var s = session();
      if (saved.userId && s && s.user && String(saved.userId) !== String(s.user.id)) return;
      cache.apps = saved.apps || [];
      cache.users = saved.users || [];
      cache.dash = saved.dash || null;
      cache.notifs = saved.notifs || [];
      cache.loaded = true;
    } catch (e) { /* ignore corrupt cache */ }
  })();

  function persistCache() {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        userId: (currentUser() || {}).id || null,
        apps: cache.apps,
        users: cache.users,
        dash: cache.dash,
        notifs: cache.notifs,
        loaded: cache.loaded
      }));
    } catch (e) { /* quota or private mode — ignore */ }
  }

  var listeners = [];
  function subscribe(fn) {
    listeners.push(fn);
    return function () { listeners = listeners.filter(function (f) { return f !== fn; }); };
  }
  function changed() { listeners.slice().forEach(function (fn) { try { fn(); } catch (e) {} }); }

  function toast(msg, kind) {
    try {
      if (typeof UI !== 'undefined' && UI.toast) UI.toast(msg, kind);
      else if (typeof APUI !== 'undefined' && APUI.toast) APUI.toast(msg, kind);
    } catch (e) {}
  }

  /* ---------- session ---------- */
  function session() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
    catch (e) { return null; }
  }
  function saveSession(s) {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  }
  function currentUser() {
    var s = session();
    if (!s || !s.user) return null;
    if (s.exp && Date.now() > s.exp) { saveSession(null); return null; }
    return s.user;
  }

  /* ---------- HTTP helper ---------- */
  function request(method, path, body, opts) {
    var init = {
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };
    var s = session();
    if (s && s.token) init.headers['Authorization'] = 'Bearer ' + s.token;
    if (body !== undefined && body !== null) {
      if (typeof FormData !== 'undefined' && body instanceof FormData) init.body = body;
      else init.body = JSON.stringify(body);
    }
    if (opts && opts.noJson) delete init.headers['Content-Type'];
    return fetch(API + path, init).then(function (res) {
      if (res.status === 401) {
        saveSession(null);
        changed();
      }
      if (res.status >= 400) {
        return res.json().then(function (j) {
          var e = new Error((j && j.detail) || ('HTTP ' + res.status));
          e.status = res.status;
          throw e;
        });
      }
      if (opts && opts.raw) return res;
      return res.status === 204 ? null : res.json();
    });
  }

  /* ---------- auth ---------- */
  function login(email, password) {
    return request('POST', '/auth/login', { email: email, password: password }).then(function (res) {
      saveSession({
        token: res.token,
        user: res.user,
        exp: null
      });
      sessionStorage.removeItem(CACHE_KEY);
      cache.apps = []; cache.users = []; cache.dash = null; cache.notifs = []; cache.loaded = false;
      cache.loaded = false;
      return { ok: true };
    }).catch(function (err) {
      var msg = err.status === 401 ? 'No account matches that email and password.' : (err.message || 'Sign in failed.');
      return { ok: false, error: msg };
    });
  }
  function logout() {
    saveSession(null);
    cache.apps = []; cache.users = []; cache.dash = null; cache.notifs = []; cache.loaded = false;
    try { sessionStorage.removeItem(CACHE_KEY); } catch (e) {}
    changed();
  }

  /* ---------- data loading ---------- */
  var boot = null;
  function load() {
    if (!currentUser()) return Promise.reject(new Error('Not signed in'));
    if (cache.loaded) {
      refetchLater();
      return Promise.resolve(cache);
    }
    if (boot) return boot;
    boot = Promise.all([
      request('GET', '/applications?per_page=500'),
      request('GET', '/executives'),
      request('GET', '/dashboard'),
      request('GET', '/notifications?limit=50')
    ]).then(function (results) {
      cache.apps = (results[0] && results[0].items) || [];
      cache.users = results[1] || [];
      cache.dash = results[2] || {};
      cache.notifs = results[3] || [];
      cache.loaded = true;
      persistCache();
      changed();
      boot = null;
      return cache;
    }).catch(function (e) { boot = null; throw e; });
    return boot;
  }

  /* Background refresh once after a tick so tab switches are instant but
     data is still re-synced shortly after load. */
  var refreshQueued = false;
  function refetchLater() {
    if (refreshQueued) return;
    refreshQueued = true;
    setTimeout(function () {
      refreshQueued = false;
      var had = cache.loaded;
      cache.loaded = false;
      load().then(function () {
        persistCache();
        changed();
      }).catch(function () {
        cache.loaded = had;
      });
    }, 1500);
  }

  /* ---------- role helpers ---------- */
  function can(perm) {
    var u = currentUser();
    if (!u) return false;
    return !!(PERMISSIONS[perm] && PERMISSIONS[perm][u.role]);
  }
  function scope() { return VIEW_SCOPE[(currentUser() || { role: 'viewer' }).role] || 'assigned'; }

  /* Statuses allowed from `current` (pipeline order + role gates). */
  function nextStatuses(current) {
    var out = [];
    var open = false;
    STATUS_FLOW.forEach(function (s) {
      if (open) out.push(s);
      if (s.id === current) open = true;
    });
    if (['approved', 'disbursed'].indexOf(current) > -1) out.push(STATUS_MAP.closed);
    if (can('approve')) out.push(STATUS_MAP.rejected);
    return out;
  }

  /* ---------- applications ---------- */
  function visible(list) {
    var stage = scope();
    if (stage === 'all') return list;
    var u = currentUser();
    return list.filter(function (a) { return !u || a.executive === u.name; });
  }
  function listApplications() {
    return visible(cache.apps.slice()).sort(function (a, b) { return b.created - a.created; });
  }
  function getApplication(id) {
    return cache.apps.find(function (a) { return String(a.id) === String(id); }) || null;
  }

  function insertApplication(app) {
    /* optimistic insert for the portal's manual-intake form */
    var optimistic = Object.assign({}, app, { ref: app.ref || 'AP-...' });
    cache.apps.unshift(optimistic);
    return request('POST', '/applications', {
      name: (app.customer && app.customer.name) || '',
      phone: (app.customer && app.customer.phone) || '',
      email: (app.customer && app.customer.email) || '',
      amount: app.amount || 0,
      loan_type: app.loanId || 'personal',
      loan_label: app.loanLabel,
      tenure_months: app.tenureMonths || 36,
      employment: (app.customer && app.customer.occupation) || ''
    }).then(function (serialized) {
      cache.apps = cache.apps.filter(function (a) { return a !== optimistic; });
      cache.apps.unshift(serialized);
      changed();
      return { ok: true };
    }).catch(function (err) {
      cache.apps = cache.apps.filter(function (a) { return a !== optimistic; });
      changed();
      return { ok: false, error: err.message };
    });
  }

  function setStatus(id, statusId, note) {
    var app = getApplication(id);
    if (!app) return { ok: false, error: 'Application not found.' };
    var oldStatus = app.status;
    app.status = statusId;
    app.updated = Date.now();
    changed();
    request('PATCH', '/applications/' + app.id + '/status', { status: statusId, note: note || null })
      .then(function (serial) { replaceInCache(serial); changed(); })
      .catch(function (err) {
        app.status = oldStatus;
        changed();
        toast('Status not saved: ' + err.message, 'error');
      });
    return { ok: true };
  }

  function setAssignee(id, executiveId) {
    var app = getApplication(id);
    if (!app) return { ok: false, error: 'Application not found.' };
    var prevId = String(app.executiveId || '');
    var exec = cache.users.find(function (u) { return String(u.id) === String(executiveId); });
    app.executive = exec ? exec.name : '';
    app.executiveId = executiveId ? Number(executiveId) : null;
    app.updated = Date.now();
    changed();
    request('PATCH', '/applications/' + app.id + '/assign', { executive_id: executiveId ? Number(executiveId) : null })
      .then(function (serial) { replaceInCache(serial); changed(); })
      .catch(function (err) {
        app.executive = cache.users.find(function (u) { return String(u.id) === prevId; }) ? cache.users.find(function (u) { return String(u.id) === prevId; }).name : '';
        app.executiveId = prevId ? Number(prevId) : null;
        changed();
        toast('Assignment not saved: ' + err.message, 'error');
      });
    return { ok: true };
  }

  function addNote(id, text) {
    var app = getApplication(id);
    if (!app) return { ok: false, error: 'Application not found.' };
    var note = { id: 'tmp' + Date.now(), text: text, at: Date.now(), by: (currentUser() || {}).name || 'Admin' };
    app.notes = app.notes || [];
    app.notes.unshift(note);
    app.updated = Date.now();
    changed();
    request('POST', '/applications/' + app.id + '/notes', { text: text })
      .then(function (serialNote) {
        app.notes = app.notes.filter(function (n) { return n !== note; });
        app.notes.unshift(serialNote);
        changed();
      })
      .catch(function (err) {
        app.notes = app.notes.filter(function (n) { return n !== note; });
        changed();
        toast('Note not saved: ' + err.message, 'error');
      });
    return { ok: true };
  }

  function replaceInCache(serial) {
    if (!serial || !serial.id) return;
    cache.apps = cache.apps.map(function (a) {
      return String(a.id) === String(serial.id) ? serial : a;
    });
  }

  /* ---------- executives ---------- */
  function users() { return cache.users.slice(); }
  function addUser(u) {
    var optimistic = { id: 'tmp' + Date.now(), name: u.name, email: u.email, role: u.role, color: '#0C6E6E', enabled: true, apps: 0 };
    cache.users.unshift(optimistic);
    changed();
    return request('POST', '/executives', { name: u.name, email: u.email, role: u.role })
      .then(function (serial) {
        cache.users = cache.users.filter(function (x) { return x !== optimistic; });
        cache.users.unshift(serial);
        changed();
        return { ok: true };
      })
      .catch(function (err) {
        cache.users = cache.users.filter(function (x) { return x !== optimistic; });
        changed();
        return { ok: false, error: err.message };
      });
  }
  function setUserEnabled(id, enabled) {
    var u = cache.users.find(function (x) { return String(x.id) === String(id); });
    if (!u) return;
    u.enabled = enabled;
    changed();
    request('PATCH', '/executives/' + id, { enabled: enabled })
      .then(function (serial) { replaceUser(serial); changed(); })
      .catch(function () { u.enabled = !enabled; changed(); });
  }
  function replaceUser(serial) {
    cache.users = cache.users.map(function (x) {
      return String(x.id) === String(serial.id) ? serial : x;
    });
  }

  /* ---------- notifications ---------- */
  /* Read state is stored on the server (Notification.read). The local
     read-set is only a fast fallback for optimistic UI while the API call
     settles. */
  function readSet() {
    try { return new Set(JSON.parse(localStorage.getItem(READ_KEY) || '[]')); }
    catch (e) { return new Set(); }
  }
  function saveReadSet(s) { localStorage.setItem(READ_KEY, JSON.stringify(Array.from(s))); }
  function notifications() {
    return cache.notifs.map(function (n) { return Object.assign({}, n); });
  }
  function unreadCount() {
    return cache.notifs.filter(function (n) { return !n.read; }).length;
  }
  function markRead(id) {
    cache.notifs = cache.notifs.map(function (n) {
      if (String(n.id) === String(id)) {
        n.read = true;
        var s = readSet(); s.add(String(id)); saveReadSet(s);
      }
      return n;
    });
    changed();
    request('POST', '/notifications/' + id + '/read', {})
      .then(function () { changed(); })
      .catch(function () {});
  }
  function markAllRead() {
    cache.notifs.forEach(function (n) { n.read = true; saveReadSet(new Set(cache.notifs.map(function (x) { return String(x.id); }))); });
    changed();
    request('POST', '/notifications/read-all', {})
      .catch(function () {});
  }

  /* ---------- customers ---------- */
  function customers(params) {
    var q = [];
    var search = (params && params.search) || '';
    var page = (params && params.page) || 1;
    var perPage = (params && params.per_page) || 50;
    if (search) q.push('search=' + encodeURIComponent(search));
    q.push('page=' + page);
    q.push('per_page=' + perPage);
    return request('GET', '/customers?' + q.join('&'));
  }
  function customer(id) {
    return request('GET', '/customers/' + id);
  }
  function globalSearch(q) {
    return request('GET', '/search?q=' + encodeURIComponent(q) + '&limit=20');
  }

  /* ---------- application editing (customer / loan) ---------- */
  function updateCustomer(appId, data) {
    return request('PATCH', '/applications/' + appId + '/customer', data).then(function (serial) {
      replaceInCache(serial);
      changed();
      return { ok: true };
    }).catch(function (err) { return { ok: false, error: err.message }; });
  }
  function updateLoan(appId, data) {
    return request('PATCH', '/applications/' + appId + '/loan', data).then(function (serial) {
      replaceInCache(serial);
      changed();
      return { ok: true };
    }).catch(function (err) { return { ok: false, error: err.message }; });
  }

  /* ---------- documents ---------- */
  function downloadDocument(doc) {
    return request('GET', '/documents/' + doc.id + '/download', undefined, { noJson: true, raw: true })
      .then(function (res) {
        var cd = (res.headers.get('content-disposition') || '');
        var name = doc.name || decodeURIComponent(((cd.split('filename="')[1] || '').replace(/"/g, '')) || 'document');
        return res.blob().then(function (blob) {
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url; a.download = name;
          document.body.appendChild(a); a.click();
          setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 400);
        });
      });
  }
  function uploadDocument(appId, file, label) {
    var fd = new FormData();
    fd.append('file', file);
    fd.append('label', label || 'Document');
    return request('POST', '/applications/' + appId + '/documents', fd, { noJson: true })
      .then(function (serial) {
        var app = getApplication(appId);
        if (app) {
          app.docs = app.docs || [];
          app.docs.unshift(serial);
          replaceInCache(app);
          changed();
        }
        return { ok: true };
      })
      .catch(function (err) { return { ok: false, error: err.message }; });
  }
  function updateDocument(docId, status) {
    return request('PATCH', '/documents/' + docId, { status: status })
      .then(function (serial) {
        cache.apps = cache.apps.map(function (a) {
          if (!a.docs) return a;
          a.docs = a.docs.map(function (d) { return String(d.id) === String(docId) ? serial : d; });
          return a;
        });
        changed();
        return { ok: true };
      })
      .catch(function (err) { return { ok: false, error: err.message }; });
  }

  /* ---------- reports ---------- */
  function reports(period) {
    return request('GET', '/reports?period=' + (period || 'month'));
  }
  function refreshApplication(id) {
    return request('GET', '/applications/' + id).then(function (serial) {
      replaceInCache(serial);
      changed();
      return serial;
    });
  }

  /* ---------- stats (from dashboard analytics) ---------- */
  function stats() {
    var d = cache.dash || {};
    return {
      total: d.total || 0,
      today: d.today || 0,
      active: d.active || 0,
      needsAction: d.needsAction || 0,
      monthApps: d.monthApps || 0,
      totalRequested: d.totalRequested || 0,
      totalDisbursed: d.totalDisbursed || 0,
      disbursed: d.disbursed || 0,
      approved: d.approved || 0,
      rejected: d.rejected || 0,
      assigned: d.assigned || 0,
      unassigned: d.unassigned || 0,
      conversionRate: d.conversionRate || 0,
      avgProcessingDays: d.avgProcessingDays || 0
    };
  }
  function byMonth() {
    return (cache.dash && cache.dash.byMonth) || [];
  }
  function byLoanType() {
    return (cache.dash && cache.dash.byLoanType) || LOAN_TYPES.map(function (t) { return { id: t.id, label: t.label, count: 0 }; });
  }

  function formatMoney(n) {
    var f = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
    return '\u20B9' + f.format(Math.round(n));
  }

  /* ---------- real-time ---------- */
  var es = null;
  function connect() {
    if (es || !currentUser()) return;
    try {
      es = new EventSource(API + '/stream/events');
      es.onmessage = function (ev) {
        var data = null;
        try { data = JSON.parse(ev.data); } catch (e) {}
        if (!data) return;
        load().then(function () {
          if (data.type === 'application.created') {
            if (typeof UI !== 'undefined' && UI.toast) {
              toast('New application ' + (data.reference_number || '') + ' received', 'success');
            }
          }
        });
      };
      es.onerror = function () {
        es.close();
        es = null;
        setTimeout(connect, 5000);
      };
    } catch (e) { es = null; }
  }
  function disconnect() {
    if (es) { es.close(); es = null; }
  }

  /* ---------- read/reset kept for interface parity ---------- */
  function read() { return { key: 2, apps: cache.apps, users: cache.users }; }
  function save() { return true; }
  function reset() {
    /* destructive reset is disabled — Postgres is the source of truth */
    return load();
  }
  function activity() { return cache.notifs.slice(); }

  return {
    NS: 'ap_api_v2',
    SEED_USERS: [],
    LOAN_TYPES: LOAN_TYPES, LOAN_MAP: LOAN_MAP,
    STATUS_FLOW: STATUS_FLOW, TERMINAL: TERMINAL, STATUS_MAP: STATUS_MAP,
    ROLES: ROLES,
    read: read, save: save, subscribe: subscribe,
    reset: reset, activity: activity,
    login: login, logout: logout, session: session, currentUser: currentUser,
    can: can, scope: scope,
    listApplications: listApplications, getApplication: getApplication, visible: visible,
    nextStatuses: nextStatuses,
    insertApplication: insertApplication, setStatus: setStatus, setAssignee: setAssignee, addNote: addNote,
    updateCustomer: updateCustomer, updateLoan: updateLoan,
    users: users, addUser: addUser, setUserEnabled: setUserEnabled,
    notifications: notifications, unreadCount: unreadCount, markAllRead: markAllRead, markRead: markRead,
    customers: customers, customer: customer, globalSearch: globalSearch,
    downloadDocument: downloadDocument, uploadDocument: uploadDocument, updateDocument: updateDocument,
    reports: reports, refreshApplication: refreshApplication,
    stats: stats, byMonth: byMonth, byLoanType: byLoanType,
    formatMoney: formatMoney,
    load, connect: connect, disconnect: disconnect
  };
})();