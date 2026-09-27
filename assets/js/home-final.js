
(function () {
  var HOME = '/music/news_hero/moisaique.png';
  var OLD = /radiochaabi_accueil|img_hero\/radiochaabi_accueil|accueil_1920/;

  function force() {
    document.querySelectorAll('#view-home .hero-bg, #view-home .hero-casbah').forEach(function (el) {
      var bg = el.style.backgroundImage || '';
      if (OLD.test(bg) || !bg || bg.indexOf('moisaique') < 0) {
        el.style.setProperty('background-image', "url('" + HOME + "')", 'important');
      }
      el.style.setProperty('background-size', 'cover', 'important');
      el.style.setProperty('background-position', 'center center', 'important');
      el.style.setProperty('filter', 'none', 'important');
    });
    var p = document.getElementById('hero-preload-mosaic');
    if (p && p.src && OLD.test(p.src)) p.src = HOME;
  }

  force();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', force);
  }
  setTimeout(force, 0);
  setTimeout(force, 200);
  setTimeout(force, 800);

  /* Si un CSS tardif remet l'ancienne image */
  try {
    var obs = new MutationObserver(force);
    obs.observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ['style', 'class'] });
  } catch (e) {}
})();
