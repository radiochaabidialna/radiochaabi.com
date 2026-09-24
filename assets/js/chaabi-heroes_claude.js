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
    memoire: 'radiochaabi_memoire_du_chaabi_1920x600.jpg',
    qacidate: 'qacidate.2026.webp',
    qacidates: 'qacidate.2026.webp',
    memoire_du_chaabi: 'radiochaabi_memoire_du_chaabi_1920x600.jpg',
    qacida: 'qacidate.2026.webp',
    onair: 'radiochaabi_emissions_1920x600.jpg',
    radio: 'radiochaabi_accueil_1920x600.jpg',
    /* Pas d'image dédiée pour les dédicaces : repli sur l'accueil.
       Quand radiochaabi_dedicaces_1920x600.jpg existera, remplacer ici. */
    dedicaces: 'radiochaabi_accueil_1920x600.jpg',
    dedicace: 'radiochaabi_accueil_1920x600.jpg'
  };
  var DEFAULT_KEY = 'home';

  var TITLE_RULES = [
    [/d[eé]dicace|dedication|إهداء|اهداء/i, 'dedicaces'],
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
    /* ancien dossier -> à corriger */
    if (all.indexOf('assets/img_hero/') !== -1) return true;
    if (all.indexOf('/music/img_hero/') !== -1) return false;
    /* aucune image ou autre chose */
    return true;
  }

  /* ---------- Arrondi + ombre imposés en inline !important ----------
     Un style inline !important l'emporte sur TOUTE feuille de style (même externe),
     quel que soit le thème (iOS…) ou la spécificité des sélecteurs. */
  function cssVar(name, fallback) {
    var v = '';
    try { v = w.getComputedStyle(d.documentElement).getPropertyValue(name); } catch (e) {}
    v = (v || '').replace(/^\s+|\s+$/g, '');
    return v || fallback;
  }
  function setImp(el, prop, val) {
    if (!el) return;
    if (el.style.getPropertyPriority(prop) === 'important' && el.__rcImp && el.__rcImp[prop] === val) return;
    el.style.setProperty(prop, val, 'important');
    (el.__rcImp = el.__rcImp || {})[prop] = val;
  }
  function enforceRound() {
    var R = cssVar('--rc-hero-radius', '1.25rem');
    var S = cssVar('--rc-hero-shadow', '0 14px 38px rgba(0,0,0,.45), 0 3px 10px rgba(0,0,0,.30)');
    var home = d.querySelector('#view-home > section.hero-bg');
    if (home) { setImp(home, 'border-radius', R); setImp(home, 'box-shadow', S); }
    var bar = d.getElementById('section-page-bar');
    if (bar) {
      setImp(bar, 'border-radius', R); setImp(bar, 'box-shadow', S); setImp(bar, 'overflow', 'hidden');
      var top = R + ' ' + R + ' 0 0';
      var media = bar.firstElementChild;
      if (media && media.tagName === 'DIV') {
        setImp(media, 'border-radius', top);
        for (var i = 0; i < media.children.length; i++) {
          if (media.children[i].tagName === 'DIV') setImp(media.children[i], 'border-radius', top);
        }
      }
      var nav = bar.querySelector('nav');
      if (nav) setImp(nav, 'border-radius', '0 0 ' + R + ' ' + R);
    }
    var on = d.querySelector('.onair-hero');
    if (on) { setImp(on, 'border-radius', R); setImp(on, 'box-shadow', S); }
  }

  function tick() {
    enforceRound();
    var wrap = d.getElementById('section-hero');
    if (!wrap) return;
    var visible =
      wrap.style.display !== 'none' &&
      !wrap.classList.contains('hidden') &&
      wrap.getAttribute('aria-hidden') !== 'true';
    /* même si display:none au début, on prépare */
    var key = detectKey();
    var bg = d.getElementById('section-hero-bg');
    if (!key) {
      /* Section inconnue : on ne réutilise JAMAIS l'image de la section précédente.
         Si le fond est déjà correct (ex. après changement de langue) on n'y touche pas,
         sinon on met l'image d'accueil par défaut. */
      if (bg && needsFix(bg)) key = DEFAULT_KEY;
      else return;
    }
    if (needsFix(bg) || lastKey !== key || (!bg && needsFix(wrap))) {
      apply(key);
    }
  }

  /* ---------- Balayage : réécrit toute ancienne URL assets/img_hero/* ---------- */
  var OLD_DIR = 'assets/img_hero/';
  var OLD_URL_RE = /url\(\s*(['"]?)([^'")]*assets\/img_hero\/([^'")?#]+)[^'")]*)\1\s*\)/gi;

  function norm(name) {
    var t = String(name).replace(/\.[a-z0-9]+$/i, '').toLowerCase();
    if (t.normalize) t = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return t.replace(/^radiochaabi_?/, '').replace(/_?\d+x\d+$/, '').replace(/[^a-z0-9]/g, '');
  }

  function newUrlForOldFile(file) {
    var n = norm(file), k, best = null;
    if (FILES[n]) return BASE + FILES[n];
    for (k in FILES) {                       /* commence par (ex. memoireduchaabi) */
      var nk = norm(k);
      if (nk.length > 3 && n.indexOf(nk) === 0) return BASE + FILES[k];
    }
    for (k in FILES) {                       /* contient (ex. hero_artistes) */
      var nk2 = norm(k);
      if (nk2.length > 3 && n.indexOf(nk2) !== -1) { best = FILES[k]; break; }
    }
    return BASE + (best || FILES[DEFAULT_KEY]);
  }

  function fixEl(el) {
    if (!el || el.nodeType !== 1) return;
    var st = el.getAttribute && el.getAttribute('style');
    if (st && st.indexOf(OLD_DIR) !== -1) {
      var ns = st.replace(OLD_URL_RE, function (m, q, full, file) {
        return 'url("' + newUrlForOldFile(file) + '")';
      });
      if (ns !== st) el.setAttribute('style', ns);
    }
    if (el.tagName === 'IMG') {
      var src = el.getAttribute('src') || '';
      if (src.indexOf(OLD_DIR) !== -1) {
        var f = src.split(OLD_DIR)[1].split(/[?#]/)[0];
        el.setAttribute('src', newUrlForOldFile(f));
      }
    }
  }

  function sweep(root) {
    var list;
    try {
      list = (root || d).querySelectorAll('[style*="assets/img_hero/"], img[src*="assets/img_hero/"]');
    } catch (e) { return; }
    for (var i = 0; i < list.length; i++) fixEl(list[i]);
  }

  function watchOldImages() {
    if (w.__rcHeroSweep || !w.MutationObserver || !d.documentElement) return;
    w.__rcHeroSweep = true;
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type === 'attributes') { fixEl(m.target); continue; }
        for (var j = 0; j < m.addedNodes.length; j++) {
          var n = m.addedNodes[j];
          if (n.nodeType !== 1) continue;
          fixEl(n);
          if (n.querySelectorAll) sweep(n);
        }
      }
    }).observe(d.documentElement, {
      subtree: true, childList: true, attributes: true, attributeFilter: ['style', 'src']
    });
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
      } else {
        lastKey = '';   /* section sans image dédiée : pas de réutilisation de l'ancienne */
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
    watchOldImages();
    sweep();
    enforceRound();
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
    sweep();
    tick();
  }, 400);
})(window, document);
