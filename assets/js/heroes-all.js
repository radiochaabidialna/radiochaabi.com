
/**
 * Tous les heroes news_hero, sans filtre, ratio 3:1
 * + data-section pour CSS
 */
(function () {
  var MAP = {
    home: '/music/news_hero/moisaique.png',
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

  function setHero(el, view) {
    if (!el) return;
    var url = MAP[view] || MAP.home;
    el.setAttribute('data-section', view || 'home');
    el.style.setProperty('background-image', "url('" + url + "')", 'important');
    el.style.setProperty('background-size', 'cover', 'important');
    el.style.setProperty('background-position', 'center center', 'important');
    el.style.setProperty('background-repeat', 'no-repeat', 'important');
    el.style.setProperty('filter', 'none', 'important');
  }

  function apply(view) {
    view = view || 'home';
    if (view === 'home') {
      document.querySelectorAll('#view-home .hero-bg, #view-home .hero-casbah').forEach(function (el) {
        setHero(el, 'home');
      });
    }
    document.querySelectorAll('#section-hero, #section-page-bar, .section-hero').forEach(function (el) {
      setHero(el, view);
    });
  }

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function () {
    apply('home');
    setTimeout(function () { apply('home'); }, 500);
  });

  var _nav = window.navigateTo;
  if (typeof _nav === 'function') {
    window.navigateTo = function (view) {
      var r = _nav.apply(this, arguments);
      setTimeout(function () { apply(view || 'home'); }, 40);
      return r;
    };
  }

  /* Hook applySectionHero si existe */
  var tries = 0;
  var t = setInterval(function () {
    tries++;
    if (typeof window.applySectionHero === 'function' && !window.applySectionHero._chaabiWrapped) {
      var orig = window.applySectionHero;
      window.applySectionHero = function (view) {
        var r = orig.apply(this, arguments);
        setTimeout(function () { apply(view); }, 20);
        return r;
      };
      window.applySectionHero._chaabiWrapped = true;
      clearInterval(t);
    }
    if (tries > 40) clearInterval(t);
  }, 100);
})();
