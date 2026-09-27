
/* Force home hero = moisaique (ne touche pas aux sections) */
(function () {
  var HOME = '/music/news_hero/moisaique.png';
  function force() {
    document.querySelectorAll('#view-home .hero-bg, #view-home .hero-casbah').forEach(function (el) {
      el.style.setProperty('background-image', "url('" + HOME + "')", 'important');
      el.style.setProperty('background-size', 'cover', 'important');
      el.style.setProperty('background-position', 'center center', 'important');
      el.style.setProperty('filter', 'none', 'important');
    });
    var p = document.getElementById('hero-preload-mosaic');
    if (p) p.src = HOME;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', force);
  else force();
  setTimeout(force, 400);
  setTimeout(force, 1500);
})();
