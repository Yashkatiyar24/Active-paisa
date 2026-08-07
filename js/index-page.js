/* ==========================================================================
   Activ Paisa — personal loan landing extras
   The sections unique to this page: hero odometer, lending partners, digital
   lending partners and reviews. Calculators, comparison, checklist and the
   application flow all come from APLoan.
   ========================================================================== */

(function (C, AP) {
  'use strict';

  var $ = C.$, el = C.el;

  /* ---------- Hero odometer ---------- */
  function odometer() {
    var host = $('.odometer');
    if (!host) return;
    var digits = String(host.dataset.value || '').split('');
    host.textContent = '';

    digits.forEach(function (digit, i) {
      var col = el('span', 'odo-col');
      var list = el('span', 'odo-list');
      // two full runs so the reel spins a lap before landing
      for (var n = 0; n < 20; n++) list.appendChild(el('span', 'odo-d', String(n % 10)));
      col.appendChild(list);
      host.appendChild(col);

      var target = 10 + Number(digit);
      requestAnimationFrame(function () {
        setTimeout(function () {
          list.style.transform = 'translateY(-' + (target * 100 / 20) + '%)';
        }, 90 * i);
      });
    });
  }

  /* ---------- Partner cards ---------- */
  function partnerCard(p, tag) {
    var li = el('li', 'partner-card');

    // a lender's own file when supplied, otherwise a neutral initials tile
    var tile = el('div', 'p-logo' + (p.logo ? '' : ' is-initials'));
    if (p.logo) tile.appendChild(C.img(p.logo, p.name + ' logo', 44));
    else tile.appendChild(el('span', null, p.initials));
    li.appendChild(tile);

    li.appendChild(el('h3', 'p-name', p.legal));
    li.appendChild(el('span', 'p-tag', 'Personal Loan'));

    var links = el('div', 'p-links');
    [['Privacy Policy', '#privacy'], ['T&C', '#terms']].forEach(function (pair) {
      var a = el('a', null, pair[0]);
      a.href = pair[1];
      links.appendChild(a);
    });
    li.appendChild(links);

    var g = el('a', 'p-grievance', tag);
    g.href = '#grievance';
    li.appendChild(g);
    return li;
  }

  function renderPartners() {
    var host = $('#partnerTrack');
    if (host) AP.PARTNERS.forEach(function (p) {
      host.appendChild(partnerCard(p, 'Grievance Redressal'));
    });
  }

  function renderDla() {
    var host = $('#dlaGrid');
    if (host) AP.DLA_PARTNERS.forEach(function (p) {
      var card = partnerCard(p, 'Grievance Redressal');
      card.className = 'dla-card';
      host.appendChild(card);
    });
  }

  function renderReviews() {
    var host = $('#reviewTrack');
    if (!host) return;
    AP.REVIEWS.forEach(function (r) {
      var li = el('li', 'review-card');
      li.appendChild(el('span', 'quote-rule'));
      li.appendChild(el('blockquote', null, r.text));

      var author = el('div', 'review-author');
      var face = el('span', 'avatar');
      face.appendChild(C.img(r.avatar, '', 44));
      author.appendChild(face);
      var meta = el('div');
      meta.appendChild(el('strong', null, r.name));
      meta.appendChild(el('span', null, r.city));
      author.appendChild(meta);
      li.appendChild(author);
      host.appendChild(li);
    });
  }

  /* Landing content first, so the carousels APLoan starts have cards to clone. */
  odometer();
  renderPartners();
  renderDla();
  renderReviews();

  APLoan.init(APProducts.PERSONAL);
})(APCore, AP);
