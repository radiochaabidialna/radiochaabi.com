
/**
 * Heroes propres (sans filtre) + home moisaique
 * assets/js/heroes-clean.js
 */
(function () {
  var HOME = '/music/news_hero/moisaique.png';
  var MAP = {
    home: HOME,
    artistes: '/music/news_hero/radiochaabi_artistes.webp',
    chansons: '/music/news_hero/chansons_chaabi.webp',
    emissions: '/music/news_hero/emissions_chaabi.webp',
    interviews: '/music/news_hero/interviews_chaabi.webp',
    bouqalla: '/music/news_hero/bouqalla_chaabi.webp',
    dedicaces: '/music/news_hero/dedicaces_chaabi.webp',
    commentaires: '/music/news_hero/radiochaabi_commentaires.webp',
    contacts: '/music/news_hero/radiochaabi_contacts.webp',
    onair: '/music/news_hero/onair.webp',
    qacidates: '/music/news_hero/qacidate.webp',
    memoire: '/music/news_hero/histoire.webp',
    histoire: '/music/news_hero/histoire.webp'
  };

  function setBg(el, url) {
    if (!el || !url) return;
    /* Image seule — pas de linear-gradient */
    el.style.setProperty('background-image', "url('" + url + "')", 'important');
    el.style.setProperty('background-size', 'cover', 'important');
    el.style.setProperty('background-position', 'center center', 'important');
    el.style.setProperty('background-repeat', 'no-repeat', 'important');
    el.style.setProperty('filter', 'none', 'important');
    el.style.setProperty('opacity', '1', 'important');
  }

  function forceHome() {
    document.querySelectorAll('#view-home .hero-bg, #view-home .hero-casbah, .hero-bg.hero-casbah').forEach(function (el) {
      setBg(el, HOME);
    });
    var p = document.getElementById('hero-preload-mosaic');
    if (p) p.src = HOME;
  }

  function forceSection(view) {
    var url = MAP[view] || MAP.home;
    document.querySelectorAll('#section-hero, #section-page-bar, .section-hero').forEach(function (el) {
      setBg(el, url);
    });
  }

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function () {
    forceHome();
    setTimeout(forceHome, 400);
    setTimeout(forceHome, 1500);
  });

  /* Hook navigation */
  var _nav = window.navigateTo;
  if (typeof _nav === 'function') {
    window.navigateTo = function (view) {
      var r = _nav.apply(this, arguments);
      setTimeout(function () {
        if (!view || view === 'home') forceHome();
        else forceSection(view);
      }, 30);
      return r;
    };
  }

  window.ChaabiSetHero = function (view) {
    if (!view || view === 'home') forceHome();
    else forceSection(view);
  };
})();
