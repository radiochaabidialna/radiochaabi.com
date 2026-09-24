/**
 * Radio Chaabi — boutons utilitaires (sans chevauchement)
 *
 * - Sommeil : UNIQUEMENT dans le player (avant mute)
 * - Haut de page : bas droite, uniquement après scroll
 * - Surprends-moi : bas gauche, au-dessus du bouton install
 */
(function (w, d) {
  'use strict';

  var STYLE_ID = 'rc-fabs-style';
  var BTT_ID = 'back-to-top';
  var SURP_ID = 'rc-fab-surprise';
  var INLINE_ID = 'fp-sleep-inline';

  function ensureStyle() {
    var s = d.getElementById(STYLE_ID);
    if (!s) {
      s = d.createElement('style');
      s.id = STYLE_ID;
      (d.head || d.documentElement).appendChild(s);
    }
    s.textContent = [
      /* Masquer tout ancien FAB sommeil flottant */
      '#rc-fab-sleep{display:none!important;visibility:hidden!important;pointer-events:none!important;}',

      /* Haut de page — bas DROITE, au-dessus du player, sans conflit */
      '#' + BTT_ID + '{',
      'position:fixed!important;z-index:60!important;',
      'right:max(0.75rem, env(safe-area-inset-right))!important;',
      'bottom:calc(6.5rem + env(safe-area-inset-bottom,0px))!important;',
      'width:2.75rem!important;height:2.75rem!important;border-radius:9999px!important;',
      'display:flex!important;align-items:center!important;justify-content:center!important;',
      'border:none!important;cursor:pointer!important;',
      'background:#f5b942!important;color:#0f172a!important;',
      'box-shadow:0 6px 20px rgba(0,0,0,.25)!important;font-size:1rem!important;',
      'opacity:0!important;pointer-events:none!important;transform:translateY(8px)!important;',
      'transition:opacity .2s ease,transform .2s ease!important;',
      '}',
      '#' + BTT_ID + '.btt-visible{',
      'opacity:1!important;pointer-events:auto!important;transform:none!important;',
      '}',

      /* Surprends-moi — bas GAUCHE, AU-DESSUS de #install-btn (install ~ bottom 5.5rem) */
      '#' + SURP_ID + '{',
      'position:fixed!important;z-index:60!important;',
      'left:max(0.75rem, env(safe-area-inset-left))!important;',
      'bottom:calc(9.5rem + env(safe-area-inset-bottom,0px))!important;',
      'height:2.75rem!important;width:auto!important;min-width:2.75rem!important;',
      'padding:0 0.9rem!important;gap:0.4rem!important;',
      'display:inline-flex!important;align-items:center!important;justify-content:center!important;',
      'border:none!important;border-radius:9999px!important;cursor:pointer!important;',
      'background:linear-gradient(135deg,#f5b942,#e08c2b)!important;color:#111!important;',
      'font:800 0.72rem/1 system-ui,sans-serif!important;',
      'box-shadow:0 6px 20px rgba(0,0,0,.25)!important;',
      'opacity:1!important;pointer-events:auto!important;visibility:visible!important;',
      '}',
      '#' + SURP_ID + ' i{font-size:0.85rem;}',

      /* Install : rester en bas gauche sous Surprise */
      '#install-btn.install-fab,button.install-fab{',
      'left:max(0.75rem, env(safe-area-inset-left))!important;',
      'bottom:calc(5.75rem + env(safe-area-inset-bottom,0px))!important;',
      'z-index:55!important;',
      '}',

      /* Sommeil dans le player */
      '#' + INLINE_ID + '{',
      'display:inline-flex!important;align-items:center!important;justify-content:center!important;',
      'width:2.25rem!important;height:2.25rem!important;border-radius:9999px!important;',
      'border:1px solid rgba(167,139,250,.55)!important;',
      'background:rgba(124,58,237,.35)!important;color:#ede9fe!important;',
      'cursor:pointer!important;flex-shrink:0!important;',
      '}',
      '#' + INLINE_ID + ':hover{background:rgba(124,58,237,.55)!important;}'
    ].join('');
  }

  var sleepTimer = null, sleepEnds = 0;

  function toast(msg) {
    if (typeof w.chaabiToast === 'function') { w.chaabiToast(msg); return; }
    var t = d.getElementById('rc-fab-toast');
    if (!t) {
      t = d.createElement('div');
      t.id = 'rc-fab-toast';
      t.style.cssText = 'position:fixed;left:50%;bottom:11rem;transform:translateX(-50%);z-index:99999;background:#111827;color:#fff;padding:.55rem 1rem;border-radius:999px;font:600 13px/1.2 system-ui;opacity:0;transition:opacity .2s;pointer-events:none;max-width:90vw';
      d.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    clearTimeout(t._tm);
    t._tm = setTimeout(function () { t.style.opacity = '0'; }, 2500);
  }

  function clearSleep() {
    if (sleepTimer) clearInterval(sleepTimer);
    sleepTimer = null; sleepEnds = 0;
    var b = d.getElementById(INLINE_ID);
    if (b) { b.classList.remove('on'); b.title = 'Minuteur sommeil'; }
  }

  function startSleep(min) {
    clearSleep();
    sleepEnds = Date.now() + min * 60000;
    var b = d.getElementById(INLINE_ID);
    if (b) {
      b.classList.add('on');
      b.style.outline = '2px solid #f5b942';
    }
    sleepTimer = setInterval(function () {
      var left = sleepEnds - Date.now();
      if (left <= 0) {
        clearSleep();
        if (b) b.style.outline = '';
        var a = d.getElementById('fp-audio');
        if (a && !a.paused) a.pause();
        toast('Bonne nuit — lecture arrêtée');
        return;
      }
      var s = Math.ceil(left / 1000), m = Math.floor(s / 60), r = s % 60;
      if (b) b.title = 'Sommeil ' + m + ':' + (r < 10 ? '0' : '') + r;
    }, 1000);
    toast('Sommeil : arrêt dans ' + min + ' min');
  }

  function onSleepClick(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (sleepEnds > Date.now()) {
      clearSleep();
      var b = d.getElementById(INLINE_ID);
      if (b) b.style.outline = '';
      toast('Minuteur annulé');
      return;
    }
    var c = w.prompt('Minuteur sommeil (minutes)\n15, 30, 45 ou 60', '30');
    if (c === null) return;
    var n = parseInt(c, 10);
    if (n > 0 && n <= 180) startSleep(n);
    else toast('Indique un nombre entre 1 et 180');
  }

  function surpriseMe() {
    var cards = d.querySelectorAll(
      '#view-home .media-card, #list-container .media-card, .home-card-grid .media-card, .media-card'
    );
    if (!cards.length) {
      toast('Aucune piste visible');
      return;
    }
    var card = cards[Math.floor(Math.random() * cards.length)];
    toast('Surprise !');
    setTimeout(function () {
      var zone = card.querySelector('.mc-img-bx') || card;
      if (zone && zone.click) zone.click();
      else card.click();
    }, 120);
  }

  w.chaabiSurpriseMe = surpriseMe;
  w.chaabiSleepTimer = onSleepClick;

  function ensureEl(id, html, title, onClick) {
    var el = d.getElementById(id);
    if (!el) {
      el = d.createElement('button');
      el.type = 'button';
      el.id = id;
      el.innerHTML = html;
      el.title = title;
      el.setAttribute('aria-label', title);
      d.body.appendChild(el);
    } else if (id === SURP_ID) {
      el.innerHTML = html;
    }
    if (!el.__rcBound) {
      el.__rcBound = true;
      el.addEventListener('click', onClick);
    }
    return el;
  }

  function injectPlayerSleep() {
    /* supprimer FAB sommeil orphelin */
    var oldFab = d.getElementById('rc-fab-sleep');
    if (oldFab) oldFab.remove();

    var mute = d.getElementById('fp-mute');
    if (!mute || !mute.parentNode) return;
    var btn = d.getElementById(INLINE_ID);
    if (!btn) {
      btn = d.createElement('button');
      btn.type = 'button';
      btn.id = INLINE_ID;
      btn.innerHTML = '<i class="fas fa-moon"></i>';
      btn.title = 'Minuteur sommeil';
      btn.setAttribute('aria-label', 'Minuteur sommeil');
      mute.parentNode.insertBefore(btn, mute);
    }
    if (!btn.__rcBound) {
      btn.__rcBound = true;
      btn.addEventListener('click', onSleepClick);
    }
  }

  function syncBtt() {
    var b = d.getElementById(BTT_ID);
    if (!b) return;
    if (w.scrollY > 320) b.classList.add('btt-visible');
    else b.classList.remove('btt-visible');
  }

  function boot() {
    if (!d.body) return;
    ensureStyle();
    /* pas de FAB sommeil */
    var ghost = d.getElementById('rc-fab-sleep');
    if (ghost) ghost.remove();

    ensureEl(BTT_ID, '<i class="fas fa-arrow-up"></i>', 'Haut de page', function () {
      w.scrollTo({ top: 0, behavior: 'smooth' });
    });
    ensureEl(
      SURP_ID,
      '<i class="fas fa-shuffle"></i><span>Surprise</span>',
      'Surprends-moi',
      function (e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        surpriseMe();
      }
    );
    injectPlayerSleep();
    syncBtt();
  }

  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', boot);
  else boot();
  w.addEventListener('load', boot);
  w.addEventListener('scroll', syncBtt, { passive: true });
  setInterval(boot, 4000);
})(window, document);
