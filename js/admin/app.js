/* ==========================================================================
   Activ Paisa — Admin shell
   Route guard, sidebar + topbar shell, dark theme, and page bootstrap.
   Each /admin page reveals one controller through APAdmin.register().
   ========================================================================== */

var APAdmin = (function () {
  'use strict';

  var Store = APStore, UI = APUI, C = APCore;

  var THEME_KEY = 'ap_admin_theme';

  /* ---------- route table: page -> { title, subtitle, glyph, requires, group } */
  var ROUTES = {
    dashboard:     { title: 'Dashboard',      subtitle: 'At-a-glance view of your loan business',      glyph: 'dashboard', requires: ['view'],     group: 'Overview' },
    reports:       { title: 'Reports',        subtitle: 'Totals, funnel and loan mix',                  glyph: 'reports',   requires: ['view_all'], group: 'Overview' },
    notifications: { title: 'Notifications',  subtitle: 'Alerts from the team and the pipeline',        glyph: 'bell',      requires: ['view'],     group: 'Overview' },
    applications:  { title: 'Applications',   subtitle: 'Every application — filter, update, export',    glyph: 'apps',      requires: ['view'],     group: 'Applications' },
    application:   { title: 'Application',    subtitle: 'One application, end to end',                    glyph: 'apps',      requires: ['view'],     group: 'Applications' },
    customers:     { title: 'Customers',      subtitle: 'People who have come to us',                   glyph: 'users',     requires: ['view_all'], group: 'Applications' },
    documents:     { title: 'Document centre', subtitle: 'Everything uploaded across applications',     glyph: 'docs',      requires: ['view'],     group: 'Applications' },
    executives:    { title: 'Executives',     subtitle: 'Your sales team and their access roles',       glyph: 'briefcase', requires: ['users'],    group: 'Team' },
    settings:      { title: 'Settings',       subtitle: 'Profile, workspace and data options',          glyph: 'sliders',   requires: ['settings'], group: 'Admin' }
  };
  /* insertion order of nav groups */
  var ORDER = ['dashboard', 'reports', 'notifications', 'applications', 'customers', 'documents', 'executives', 'settings'];

  var pages = {};
  function register(name, fn) { pages[name] = fn; }

  function pageFromUrl() {
    var file = location.pathname.split('/').pop() || '';
    return file.replace(/\.html$/, '');
  }

  /* Turn the current file path into its logical route name.
     The file name IS the route (including the special 'login' page);
     unknown files are handled by the boot guard, not normalised here. */
  function currentPage() {
    var p = pageFromUrl();
    return p && ROUTES[p] ? p : p || 'dashboard';
  }

  /* ---------- theme ---------- */
  function theme() {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  }
  function applyTheme(mode) {
    if (mode === 'dark') document.documentElement.setAttribute('data-admin-theme', 'dark');
    else document.documentElement.removeAttribute('data-admin-theme');
  }
  function setTheme(mode) {
    localStorage.setItem(THEME_KEY, mode);
    applyTheme(mode);
  }

  /* ---------- boot ---------- */
  function boot() {
    Store.read();
    applyTheme(theme());

    var page = currentPage();
    var me = Store.currentUser();

    if (page === 'login') {
      if (me) { location.replace('dashboard.html'); return; }
      var root = document.getElementById('root');
      root.textContent = '';
      if (pages.login) pages.login(root);
      return;
    }

    if (!me) { location.replace('login.html'); return; }

    var route = ROUTES[page];
    if (!route || !route.requires.every(function (p) { return Store.can(p); })) {
      window.location.href = 'dashboard.html';
      return;
    }

    /* Restore scroll position for this page */
    var scrollKey = 'ap_admin_scroll_' + page;
    var savedScroll = sessionStorage.getItem(scrollKey);
    if (savedScroll) {
      try { var s = JSON.parse(savedScroll); if (s.page === page) savedScroll = s.y; } catch (e) {}
    }

    /* Render shell + skeleton immediately, then hydrate */
    renderShellWithSkeleton(page);

    /* Hydrate content from cache instantly, then background refresh */
    hydratePage(page, savedScroll);

    /* Listen for beforeunload to save scroll */
    window.addEventListener('beforeunload', function () {
      var content = document.querySelector('.a-content');
      if (content) {
        sessionStorage.setItem(scrollKey, JSON.stringify({ page: page, y: content.scrollTop }));
      }
    });
  }

  function renderShellWithSkeleton(page) {
    var root = document.getElementById('root');
    if (!root) return;
    root.textContent = '';

    var layout = UI.h('div', 'a-shell');
    layout.appendChild(sidebar(page));
    layout.appendChild(main(page));
    root.appendChild(layout);

    /* Show skeleton in content area while hydrating */
    var content = document.querySelector('.a-content');
    if (content) {
      content.innerHTML = '';
      content.appendChild(pageSkeleton());
      content.classList.add('a-content-fade-in');
    }
  }

  function pageSkeleton() {
    var wrap = UI.h('div', 'a-skeleton-wrap');
    wrap.appendChild(skeletonRow('a-skeleton-title'));
    wrap.appendChild(skeletonRow('a-skeleton-card'));
    wrap.appendChild(skeletonRow('a-skeleton-card'));
    wrap.appendChild(skeletonRow('a-skeleton-card'));
    return wrap;
  }

  function skeletonRow(className) {
    var row = UI.h('div', className);
    row.style.animation = 'skeleton-pulse 1.2s ease-in-out infinite';
    return row;
  }

  function hydratePage(page, savedScroll) {
    var host = document.querySelector('.a-content') || document.getElementById('root');
    if (!host) return;

    /* If we have cached data, render immediately */
    if (Store.cacheLoaded && Store.cacheApps && Store.cacheApps.length) {
      renderPageContent(page, host, savedScroll);
      Store.load().then(function () {
        Store.connect();
      }).catch(function () {});
      return;
    }

    /* Otherwise load and render */
    showLoadingInContent(host);
    Store.load().then(function () {
      renderPageContent(page, host, savedScroll);
      Store.connect();
    }).catch(function (e) {
      if (e === 'Not signed in') { location.replace('login.html'); return; }
      host.innerHTML = '';
      host.appendChild(UI.emptyState('apps', 'Could not load data',
        String((e && e.message) || e), UI.h('button', 'btn btn-ghost btn-sm', 'Retry')));
    });
  }

  function renderPageContent(page, host, savedScroll) {
    host.innerHTML = '';
    if (pages[page]) {
      try { pages[page](host); } catch (e) { console.error('Page failed:', page, e); }
    }
    host.classList.add('a-content-fade-in');

    /* Restore scroll position after paint */
    if (savedScroll) {
      requestAnimationFrame(function () {
        host.scrollTop = parseInt(savedScroll, 10) || 0;
      });
    }
  }

  function showLoadingInContent(host) {
    host.innerHTML = '';
    host.appendChild(pageSkeleton());
  }

  /* ---------- shell ---------- */
  function renderShell(page) {
    var root = document.getElementById('root');
    if (!root) return;
    root.textContent = '';

    var layout = UI.h('div', 'a-shell');
    layout.appendChild(sidebar(page));
    layout.appendChild(main(page));
    root.appendChild(layout);
  }

  function main(page) {
    var wrap = UI.h('div', 'a-main');
    wrap.appendChild(topbar(page));
    wrap.appendChild(UI.h('div', 'a-content', ''));
    return wrap;
  }

  function sidebar(page) {
    var me = Store.currentUser();
    var aside = UI.h('aside', 'a-sidebar');

    var brand = UI.h('div', 'a-side-brand');
    var logo = document.createElement('img');
    logo.src = '../assets/brand/logo.png';
    logo.alt = 'Activ Paisa';
    logo.className = 'a-brand-logo';
    brand.appendChild(logo);
    var brandText = UI.h('div', null, '');
    brandText.appendChild(UI.h('strong', null, 'Activ Paisa'));
    brandText.appendChild(UI.h('span', 'a-side-brand-sub', 'Admin portal'));
    brand.appendChild(brandText);
    aside.appendChild(brand);

    if (me) {
      var who = UI.h('div', 'a-side-user');
      who.appendChild(UI.avatar(me.name, 34, me.color));
      var whoInfo = UI.h('div', 'a-side-user-info');
      whoInfo.appendChild(UI.h('span', 'a-side-user-name', me.name));
      whoInfo.appendChild(UI.h('span', 'a-role', (Store.ROLES[me.role] || {}).label || me.role));
      who.appendChild(whoInfo);
      aside.appendChild(who);
    }

    var groups = {};
    ORDER.forEach(function (p) {
      var g = ROUTES[p].group;
      (groups[g] = groups[g] || []).push(p);
    });

    var nav = UI.h('nav', 'a-nav');
    Object.keys(groups).forEach(function (g) {
      nav.appendChild(UI.h('p', 'a-nav-label', g));
      var ul = UI.h('ul', null);
      groups[g].forEach(function (p) {
        var allowed = ROUTES[p].requires.every(function (perm) { return Store.can(perm); });
        var li = UI.h('li', 'a-nav-item' + (p === page ? ' is-active' : '') + (allowed ? '' : ' is-hidden'));
        var a = UI.h('a', 'a-nav-link');
        a.href = p + '.html';
        a.appendChild(UI.icon(ROUTES[p].glyph, 17));
        a.appendChild(UI.h('span', null, ROUTES[p].title));
        li.appendChild(a);
        if (p === 'notifications') li.appendChild(unreadDot());
        ul.appendChild(li);
      });
      nav.appendChild(ul);
    });
    aside.appendChild(nav);

    var foot = UI.h('div', 'a-side-foot');
    var out = UI.h('button', 'a-nav-link');
    out.appendChild(UI.icon('logout', 17));
    out.appendChild(UI.h('span', null, 'Sign out'));
    out.addEventListener('click', function () { Store.logout(); location.href = 'login.html'; });
    foot.appendChild(out);
    aside.appendChild(foot);

    return aside;
  }
  function unreadDot() {
    var n = Store.unreadCount();
    var dot = UI.h('span', 'a-side-dot');
    dot.textContent = n || '';
    return dot;
  }

  function topbar(page) {
    var route = ROUTES[page];
    var bar = UI.h('header', 'a-topbar');

    var burger = UI.h('button', 'a-burger');
    burger.setAttribute('aria-label', 'Toggle navigation');
    burger.innerHTML = '<span></span><span></span><span></span>';
    burger.addEventListener('click', function () {
      document.body.classList.toggle('a-nav-open');
    });
    bar.appendChild(burger);

    var title = UI.h('div', 'a-top-h');
    title.appendChild(UI.h('h1', null, route.title));
    title.appendChild(UI.h('p', null, route.subtitle));
    bar.appendChild(title);

    var right = UI.h('div', 'a-top-right');
    right.appendChild(globalSearch());
    right.appendChild(themeToggle());
    right.appendChild(bell());
    right.appendChild(userMenu());
    bar.appendChild(right);
    return bar;
  }

  function globalSearch() {
    var wrap = UI.h('div', 'a-gsearch');
    var ic = UI.h('span', 'a-gsearch-ic');
    ic.appendChild(UI.icon('search', 15));
    wrap.appendChild(ic);
    var input = UI.h('input');
    input.type = 'search';
    input.placeholder = 'Search applications, customers\u2026';
    wrap.appendChild(input);
    var menu = null, box = null;
    var deb = null;
    input.addEventListener('input', function () {
      clearTimeout(deb);
      var q = input.value.trim();
      if (!q) { if (box) { box.remove(); box = null; } return; }
      deb = setTimeout(function () {
        Store.globalSearch(q).then(function (res) {
          showResults(q, res);
        }).catch(function () {});
      }, 200);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { if (box) { box.remove(); box = null; } input.blur(); }
    });
    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) { if (box) { box.remove(); box = null; } }
    });
    return wrap;

    function row(kind, iconGlyph, title, sub, href) {
      var a = UI.h('a', 'a-gs-row');
      a.href = href;
      a.appendChild(UI.icon(iconGlyph, 16));
      var t = UI.h('div', null);
      t.appendChild(UI.h('strong', null, title));
      t.appendChild(UI.h('span', null, sub));
      a.appendChild(t);
      return a;
    }
    function showResults(q, res) {
      if (box) box.remove();
      box = UI.h('div', 'a-gs-menu');
      var any = false;
      (res.customers || []).slice(0, 5).forEach(function (c) {
        any = true;
        box.appendChild(row('customer', 'user', c.name || c.mobile || c.email,
          c.mobile || c.email, 'customers.html'));
      });
      (res.applications || []).slice(0, 8).forEach(function (a) {
        any = true;
        box.appendChild(row('application', 'apps', (a.name || 'Customer') + ' \u00B7 ' + a.ref,
          'Status: ' + a.status, 'application.html?id=' + encodeURIComponent(a.id)));
      });
      (res.executives || []).slice(0, 3).forEach(function (e) {
        any = true;
        box.appendChild(row('executive', 'briefcase', e.name, e.email, 'executives.html'));
      });
      if (!any) {
        var none = UI.h('p', 'a-gs-empty', 'No results for \u201C' + q + '\u201D');
        box.appendChild(none);
      }
      wrap.appendChild(box);
    }
  }

  function themeToggle() {
    var btn = UI.h('button', 'a-icon-btn');
    btn.title = 'Toggle theme';
    function paint() {
      btn.textContent = '';
      btn.appendChild(UI.icon(theme() === 'dark' ? 'moon' : 'sun', 18));
    }
    paint();
    btn.addEventListener('click', function () {
      setTheme(theme() === 'dark' ? 'light' : 'dark');
      paint();
    });
    return btn;
  }
  function bell() {
    var btn = UI.h('button', 'a-icon-btn a-bell');
    btn.title = 'Notifications';
    var dot = UI.h('span', 'a-bell-dot', '');
    btn.appendChild(UI.icon('bell', 18));
    btn.appendChild(dot);

    btn.addEventListener('click', function () {
      UI.dropdown(btn, function (root) {
        var list = Store.notifications();
        if (!list.length) {
          root.appendChild(UI.h('p', 'a-menu-empty', 'No notifications yet.'));
          return;
        }
        list.slice(0, 6).forEach(function (n) {
          var item = UI.h('button', 'a-notif-item' + (n.read ? '' : ' is-unread'));
          var meta = UI.h('span', 'a-notif-t');
          meta.appendChild(UI.h('strong', null, n.title));
          meta.appendChild(UI.h('span', null, UI.timeAgo(n.at)));
          item.appendChild(meta);
          item.appendChild(UI.h('span', 'a-notif-b', n.body));
          item.dataset.action = 'open:' + n.id + ':' + (n.application_id || '');
          root.appendChild(item);
        });
        root.appendChild(UI.menuItem('Mark all read', 'mark-all'));
      }, function (action) {
        if (action === 'mark-all') { Store.markAllRead(); paintCount(); }
        else {
          var parts = action.split(':');
          var id = parts[1];
          var appId = parts[2];
          if (id) { Store.markRead(id); paintCount(); }
          if (appId) location.href = 'application.html?id=' + encodeURIComponent(appId);
        }
      });
    });
    function paintCount() {
      var n = Store.unreadCount();
      dot.textContent = n || '';
      dot.style.display = n ? 'grid' : 'none';
    }
    paintCount();
    return btn;
  }
  function userMenu() {
    var me = Store.currentUser();
    var btn = UI.h('button', 'a-user-btn');
    btn.appendChild(UI.avatar(me.name, 30, me.color));
    btn.appendChild(UI.icon('chevronDown', 14));
    btn.addEventListener('click', function () {
      UI.dropdown(btn, function (root) {
        var head = UI.h('div', 'a-menu-head');
        head.appendChild(UI.h('strong', null, me.name));
        head.appendChild(UI.h('span', null, (Store.ROLES[me.role] || {}).label));
        root.appendChild(head);
        root.appendChild(UI.menuItem('Settings', 'settings'));
        root.appendChild(UI.menuItem('Sign out', 'logout', { icon: 'logout' }));
      }, function (action) {
        if (action === 'logout') { Store.logout(); location.href = 'login.html'; }
        if (action === 'settings') location.href = 'settings.html';
      });
    });
    return btn;
  }

  /* ---------- redirect helper for controllers ---------- */
  function go(page) { location.href = page + '.html'; }

  return {
    ROUTES: ROUTES,
    pages: pages, register: register,
    boot: boot, currentPage: currentPage, routePage: pageFromUrl,
    theme: theme, setTheme: setTheme,
    can: function (p) { return Store.can(p); },
    me: function () { return Store.currentUser(); },
    go: go,
    /* single source of truth for page controllers */
    UI: UI, C: C, Store: Store
  };
})();