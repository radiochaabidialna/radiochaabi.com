/**
 * Radio Chaabi — micro-interactions
 * like (cœur), transitions de vues, anim switch thème
 */
(function (w, d) {
  'use strict';

  /* —— 1. Like : cœur qui bat —— */
  function heartAnim(btn) {
    if (!btn) return;
    btn.classList.add('is-liked', 'rc-heart-anim');
    var icon = btn.querySelector('i');
    if (icon) {
      icon.classList.remove('far');
      icon.classList.add('fas');
    }
    setTimeout(function () {
      btn.classList.remove('rc-heart-anim');
    }, 650);
  }

  d.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('.mc-like-btn, button[onclick*="likeItem"]');
    if (!btn) return;
    heartAnim(btn);
  }, true);

  /* Patch likeItem si défini plus tard */
  function patchLike() {
    if (typeof w.likeItem !== 'function' || w.likeItem.__rcPatched) return;
    var orig = w.likeItem;
    w.likeItem = function () {
      var btn = arguments[2];
      if (btn && btn.nodeType) heartAnim(btn);
      return orig.apply(this, arguments);
    };
    w.likeItem.__rcPatched = true;
  }

  /* —— 2. Transitions de vues —— */
  function viewEnter(el) {
    if (!el) return;
    el.classList.remove('rc-view-enter');
    void el.offsetWidth;
    el.classList.add('rc-view-enter');
  }

  function patchNavigate() {
    if (typeof w.navigateTo !== 'function' || w.navigateTo.__rcPatched) return;
    var orig = w.navigateTo;
    w.navigateTo = function (view) {
      var r = orig.apply(this, arguments);
      setTimeout(function () {
        var ids = ['view-home', 'view-list', 'view-detail', 'view-admin', 'view-onair', 'view-radio'];
        for (var i = 0; i < ids.length; i++) {
          var el = d.getElementById(ids[i]);
          if (!el) continue;
          var hidden = el.classList.contains('hidden') || el.style.display === 'none';
          if (!hidden) {
            viewEnter(el);
            break;
          }
        }
      }, 30);
      return r;
    };
    w.navigateTo.__rcPatched = true;
  }

  /* —— 3. Anim switch thème (glass iOS) —— */
  function patchTheme() {
    var apply = w.chaabiSetTheme || w.applyTheme;
    if (typeof w.chaabiSetTheme === 'function' && !w.chaabiSetTheme.__rcPatched) {
      var origApply = w.chaabiSetTheme;
      w.chaabiSetTheme = function (t) {
        var html = d.documentElement;
        html.classList.remove('rc-theme-anim');
        void html.offsetWidth;
        html.classList.add('rc-theme-anim');
        var r = origApply.apply(this, arguments);
        setTimeout(function () {
          html.classList.remove('rc-theme-anim');
        }, 600);
        return r;
      };
      w.chaabiSetTheme.__rcPatched = true;
      // cycle uses chaabiSetTheme via applyTheme alias
      if (typeof w.chaabiCycleTheme === 'function') {
        /* cycleTheme already calls applyTheme/chaabiSetTheme */
      }
    }
    // Also wrap toggleDarkMode
    if (typeof w.toggleDarkMode === 'function' && !w.toggleDarkMode.__rcThemeAnim) {
      var origToggle = w.toggleDarkMode;
      w.toggleDarkMode = function () {
        var html = d.documentElement;
        html.classList.remove('rc-theme-anim');
        void html.offsetWidth;
        html.classList.add('rc-theme-anim');
        var r = origToggle.apply(this, arguments);
        setTimeout(function () {
          html.classList.remove('rc-theme-anim');
        }, 600);
        return r;
      };
      w.toggleDarkMode.__rcThemeAnim = true;
    }
  }

  function boot() {
    patchLike();
    patchNavigate();
    patchTheme();
  }

  if (d.readyState === 'loading') {
    d.addEventListener('DOMContentLoaded', function () {
      boot();
      setTimeout(boot, 400);
      setTimeout(boot, 1200);
    });
  } else {
    boot();
    setTimeout(boot, 400);
  }
  w.addEventListener('load', function () { setTimeout(boot, 200); });
})(window, document);
