
/**
 * Force hero home = moisaique.png + portraits object-position top
 * assets/js/home-portraits.js
 */
(function () {
  var HOME = '/music/news_hero/moisaique.png';
  var GRAD = 'linear-gradient(180deg, rgba(7,9,13,0.22) 0%, rgba(7,9,13,0.48) 100%)';

  function forceHomeHero() {
    var nodes = document.querySelectorAll('#view-home .hero-bg, #view-home .hero-casbah, .hero-bg.hero-casbah');
    nodes.forEach(function (el) {
      el.style.setProperty(
        'background-image',
        GRAD + ', url(\'' + HOME + '\')',
        'important'
      );
      el.style.setProperty('background-size', 'cover', 'important');
      el.style.setProperty('background-position', 'center center', 'important');
      el.style.setProperty('background-repeat', 'no-repeat', 'important');
    });
    var preload = document.getElementById('hero-preload-mosaic');
    if (preload) preload.src = HOME;
  }

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function () {
    forceHomeHero();
    setTimeout(forceHomeHero, 300);
    setTimeout(forceHomeHero, 1200);
  });

  // si navigation SPA revient à home
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-nav="home"], [onclick*="home"]');
    if (t) setTimeout(forceHomeHero, 50);
  });
})();
