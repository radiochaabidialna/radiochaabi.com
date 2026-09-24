/**
 * Radio Chaabi — force heroes /music/img_hero/radiochaabi_* par section
 */
(function (w, d) {
  'use strict';

  var BASE = '/music/img_hero/';
  var FILES = {
    home: 'radiochaabi_accueil_1920x600.jpg',
    accueil: 'radiochaabi_accueil_1920x600.jpg',
    artistes: 'radiochaabi_artistes_1920x600.jpg',
    artiste: 'radiochaabi_artistes_1920x600.jpg',
    chansons: 'radiochaabi_chansons_1920x600.jpg',
    chanson: 'radiochaabi_chansons_1920x600.jpg',
    emissions: 'radiochaabi_emissions_1920x600.jpg',
    emission: 'radiochaabi_emissions_1920x600.jpg',
    interviews: 'radiochaabi_interviews_1920x600.jpg',
    interview: 'radiochaabi_interviews_1920x600.jpg',
    bouqalla: 'radiochaabi_bouqalla_1920x600.png',
    commentaires: 'radiochaabi_commentaires_1920x600.jpg',
    commentaire: 'radiochaabi_commentaires_1920x600.jpg',
    contacts: 'radiochaabi_contacts_1920x600.jpg',
    contact: 'radiochaabi_contacts_1920x600.jpg',
    dedicaces: 'dedicaces_20-09-26.png',
    memoire: 'radiochaabi_memoire_du_chaabi_1920x600.jpg',
    qacidate: 'radiochaabi_qacidate_1920x600.jpg',
    qacidates: 'radiochaabi_qacidate_1920x600.jpg',
    onair: 'radiochaabi_emissions_1920x600.jpg',
    radio: 'radiochaabi_accueil_1920x600.jpg'
  };

  var TITLE_RULES = [
    [/artiste|artist|فنان/i, 'artistes'],
    [/chanson|song|أغني/i, 'chansons'],
    [/émission|emission|show|برنامج/i, 'emissions'],
    [/interview|حوار/i, 'interviews'],
    [/bouqalla|بوقال/i, 'bouqalla'],
    [/comment/i, 'commentaires'],
    [/contact/i, 'contacts'],
    [/m[eé]moire|تراث|patrimoine/i, 'memoire'],
    [/qacidat|قصيد/i, 'qacidates'],
    [/antenne|on\s*air|مباشر/i, 'onair']
  ];

  var lastKey = '';
  var lastApplied = '';

  function urlFor(key) {
    var f = FILES[key];
    return f ? BASE + f : null;
  }

  function detectKey() {
    var titleEl = d.getElementById('list-title');
    var t = titleEl ? (titleEl.textContent || '') : '';
    for (var i = 0; i < TITLE_RULES.length; i++) {
      if (TITLE_RULES[i][0].test(t)) return TITLE_RULES[i][1];
    }
    var low = t.toLowerCase();
    for (var k in FILES) {
      if (k.length > 3 && low.indexOf(k) !== -1) return k;
    }
    /* boutons nav actifs */
    var active = d.querySelector(
      'button[aria-current="page"][onclick*="navigateTo"], a[aria-current="page"]'
    );
    if (active) {
      var oc = active.getAttribute('onclick') || '';
      var m = oc.match(/navigateTo\s*\(\s*['"]([^'"]+)['"]/);
      if (m && FILES[m[1]]) return m[1];
    }
    /* hash */
    var h = (w.location.hash || '').replace(/^#\/?/, '').split(/[/?]/)[0].toLowerCase();
    if (FILES[h]) return h;
    return null;
  }

  function paint(el, url) {
    if (!el || !url) return;
    var img = 'url("' + url + '")';
    /* style inline + important via setProperty */
    el.style.setProperty('background-image', img, 'important');
    el.style.setProperty('background-size', 'cover', 'important');
    el.style.setProperty('background-position', 'center center', 'important');
    el.style.setProperty('background-repeat', 'no-repeat', 'important');
    /* aussi attribut style brut si l'app lit outerHTML */
    try {
      el.style.backgroundImage = img;
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'center center';
    } catch (e) {}
  }

  function apply(key) {
    if (!key || !FILES[key]) return;
    var url = urlFor(key);
    var bg = d.getElementById('section-hero-bg');
    var wrap = d.getElementById('section-hero');
    if (bg) paint(bg, url);
    if (wrap) {
      wrap.setAttribute('data-hero-section', key);
      /* certains thèmes mettent le fond sur le parent */
      if (!bg) paint(wrap, url);
    }
    lastKey = key;
    lastApplied = url;
  }

  function needsFix(el) {
    if (!el) return true;
    var bi = (el.style && el.style.backgroundImage) || '';
    var cs = '';
    try { cs = w.getComputedStyle(el).backgroundImage || ''; } catch (e) {}
    var all = bi + ' ' + cs;
    if (!all || all === 'none') return true;
    if (all.indexOf('radiochaabi_') !== -1) return false;
    if (all.indexOf('/music/img_hero/') !== -1) return false;
    /* ancienne image ou autre */
    return true;
  }

  function tick() {
    var wrap = d.getElementById('section-hero');
    if (!wrap) return;
    var visible =
      wrap.style.display !== 'none' &&
      !wrap.classList.contains('hidden') &&
      wrap.getAttribute('aria-hidden') !== 'true';
    /* même si display:none au début, on prépare */
    var key = detectKey();
    if (!key) key = lastKey;
    if (!key) return;

    var bg = d.getElementById('section-hero-bg');
    if (needsFix(bg) || lastKey !== key || needsFix(wrap)) {
      apply(key);
    }
  }

  function setHome() {
    var el = d.querySelector('section.hero-bg, .hero-bg.hero-casbah, .hero-bg');
    if (!el) return;
    var url = urlFor('home');
    var g =
      'linear-gradient(180deg,rgba(7,9,13,.18) 0%,rgba(7,9,13,.45) 100%),url("' +
      url +
      '")';
    el.style.setProperty('background-image', g, 'important');
    el.style.setProperty('background-size', 'cover', 'important');
  }

  function patchNav() {
    if (typeof w.navigateTo !== 'function' || w.navigateTo.__rcHero2) return;
    var orig = w.navigateTo;
    w.navigateTo = function (view) {
      var key = (view || '').toString().toLowerCase();
      if (FILES[key]) {
        lastKey = key;
        apply(key);
      }
      var r = orig.apply(this, arguments);
      setTimeout(tick, 20);
      setTimeout(tick, 100);
      setTimeout(tick, 300);
      setTimeout(tick, 800);
      return r;
    };
    w.navigateTo.__rcHero2 = true;
  }

  function observe() {
    var bg = d.getElementById('section-hero-bg');
    if (bg && !bg.__rcHeroMo) {
      bg.__rcHeroMo = true;
      new MutationObserver(function () {
        if (needsFix(bg)) tick();
      }).observe(bg, { attributes: true, attributeFilter: ['style', 'class'] });
    }
    var title = d.getElementById('list-title');
    if (title && !title.__rcHeroMo) {
      title.__rcHeroMo = true;
      new MutationObserver(function () {
        tick();
      }).observe(title, { childList: true, characterData: true, subtree: true });
    }
  }

  function boot() {
    setHome();
    patchNav();
    observe();
    tick();
  }

  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', boot);
  else boot();
  w.addEventListener('load', function () {
    boot();
    setTimeout(boot, 500);
  });
  /* boucle de secours : l'app réécrit souvent le background après navigateTo */
  setInterval(function () {
    patchNav();
    observe();
    tick();
  }, 400);
})(window, document);
