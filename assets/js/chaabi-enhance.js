/**
 * Radio Chaabi — pack UX (carte blanche)
 * - Media Session (écran de verrouillage)
 * - Raccourcis clavier player
 * - Historique local + bandeau « continuer »
 * - Liens profonds ?play= / #play=
 * - Empty states grilles
 */
(function (w, d) {
  'use strict';

  var HISTORY_KEY = 'chaabi_play_history_v1';
  var MAX_HISTORY = 24;

  function $(id) { return d.getElementById(id); }
  function audio() { return $('fp-audio'); }

  function getMeta() {
    return {
      title: ($('fp-title') && $('fp-title').textContent) || 'Radio Chaabi',
      artist: ($('fp-artist') && $('fp-artist').textContent) || 'Radio Chaabi',
      artwork: ($('fp-img') && $('fp-img').src) || '',
      type: ($('fp-type') && $('fp-type').textContent) || ''
    };
  }

  /* ========== Media Session ========== */
  function updateMediaSession() {
    if (!('mediaSession' in navigator)) return;
    var m = getMeta();
    var arts = [];
    if (m.artwork) {
      arts = [
        { src: m.artwork, sizes: '96x96', type: 'image/jpeg' },
        { src: m.artwork, sizes: '256x256', type: 'image/jpeg' },
        { src: m.artwork, sizes: '512x512', type: 'image/jpeg' }
      ];
    }
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: m.title,
        artist: m.artist,
        album: 'Radio Chaabi',
        artwork: arts
      });
    } catch (e) {}

    try {
      navigator.mediaSession.setActionHandler('play', function () {
        var a = audio();
        if (a) a.play().catch(function () {});
        if (typeof w.togglePlayerPlay === 'function' && a && a.paused) w.togglePlayerPlay();
      });
      navigator.mediaSession.setActionHandler('pause', function () {
        var a = audio();
        if (a) a.pause();
      });
      navigator.mediaSession.setActionHandler('seekbackward', function (dets) {
        var a = audio();
        if (a) a.currentTime = Math.max(0, a.currentTime - (dets.seekOffset || 10));
      });
      navigator.mediaSession.setActionHandler('seekforward', function (dets) {
        var a = audio();
        if (a) a.currentTime = Math.min(a.duration || 1e9, a.currentTime + (dets.seekOffset || 10));
      });
      navigator.mediaSession.setActionHandler('previoustrack', function () {
        if (typeof w.playPrevious === 'function') w.playPrevious();
        else if (typeof w.queuePrev === 'function') w.queuePrev();
      });
      navigator.mediaSession.setActionHandler('nexttrack', function () {
        if (typeof w.playNext === 'function') w.playNext();
        else if (typeof w.queueNext === 'function') w.queueNext();
      });
    } catch (e) {}
  }

  function syncPlaybackState() {
    if (!('mediaSession' in navigator)) return;
    var a = audio();
    try {
      navigator.mediaSession.playbackState = a && !a.paused ? 'playing' : 'paused';
    } catch (e) {}
  }

  /* ========== Historique local ========== */
  function loadHistory() {
    try {
      var raw = localStorage.getItem(HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveHistory(list) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_HISTORY)));
    } catch (e) {}
  }

  function pushHistory(entry) {
    if (!entry || !entry.title) return;
    var list = loadHistory().filter(function (x) {
      return !(x.title === entry.title && x.audio === entry.audio);
    });
    list.unshift(entry);
    saveHistory(list);
    renderRecent();
    renderContinueBar();
  }

  function clearPlayHistory() {
    try { localStorage.removeItem(HISTORY_KEY); } catch (e) {}
    renderRecent();
    renderContinueBar();
  }
  w.clearPlayHistory = clearPlayHistory;

  function renderRecent() {
    var wrap = $('home-recent-wrap');
    var box = $('home-recent');
    if (!box) return;
    var list = loadHistory().slice(0, 8);
    if (!list.length) {
      if (wrap) wrap.classList.add('hidden');
      box.innerHTML = '';
      return;
    }
    if (wrap) wrap.classList.remove('hidden');
    box.innerHTML = list.map(function (item, i) {
      var img = item.img || '/music/img_hero/radiochaabi_emissions_1920x600.jpg';
      var title = escapeHtml(item.title || '');
      var sub = escapeHtml(item.artist || item.type || '');
      var audioUrl = (item.audio || '').replace(/'/g, "\\'");
      var imgUrl = (img || '').replace(/'/g, "\\'");
      return (
        '<button type="button" class="recent-chip" data-i="' + i + '" ' +
        'onclick="window.chaabiReplayHistory && chaabiReplayHistory(' + i + ')" title="' + title + '">' +
        '<img src="' + img + '" alt="" width="40" height="40" loading="lazy">' +
        '<span class="recent-chip-text"><strong>' + title + '</strong><small>' + sub + '</small></span>' +
        '<i class="fas fa-play recent-chip-play" aria-hidden="true"></i>' +
        '</button>'
      );
    }).join('');
  }

  w.chaabiReplayHistory = function (index) {
    var list = loadHistory();
    var item = list[index];
    if (!item) return;
    if (typeof w.playMedia === 'function' && item.audio) {
      try {
        w.playMedia(item.type || 'chanson', item.id || 0, item.title, item.artist || '', item.img || '', item.audio);
        return;
      } catch (e) {}
    }
    var a = audio();
    if (a && item.audio) {
      a.src = item.audio;
      a.play().catch(function () {});
      if ($('fp-title')) $('fp-title').textContent = item.title || '';
      if ($('fp-artist')) $('fp-artist').textContent = item.artist || '';
      if ($('fp-img') && item.img) $('fp-img').src = item.img;
      var fp = $('floating-player');
      if (fp) fp.classList.remove('hidden');
      updateMediaSession();
    }
  };

  function renderContinueBar() {
    var bar = $('continue-bar');
    if (!bar) return;
    var list = loadHistory();
    if (!list.length) {
      bar.classList.add('hidden');
      bar.innerHTML = '';
      return;
    }
    var item = list[0];
    bar.classList.remove('hidden');
    bar.innerHTML =
      '<button type="button" class="continue-bar-btn" onclick="window.chaabiReplayHistory && chaabiReplayHistory(0)">' +
      '<img src="' + (item.img || '/music/img_hero/radiochaabi_emissions_1920x600.jpg') + '" alt="" width="44" height="44">' +
      '<span class="continue-bar-meta">' +
      '<span class="continue-bar-label">Continuer l’écoute</span>' +
      '<strong>' + escapeHtml(item.title || '') + '</strong>' +
      '<small>' + escapeHtml(item.artist || '') + '</small>' +
      '</span>' +
      '<i class="fas fa-play continue-bar-play"></i>' +
      '</button>';
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function captureFromPlayer() {
    var a = audio();
    var m = getMeta();
    if (!a || !a.src || !m.title || m.title === 'Titre') return;
    pushHistory({
      title: m.title,
      artist: m.artist,
      img: m.artwork,
      audio: a.currentSrc || a.src,
      type: (m.type || '').toLowerCase() || 'chanson',
      id: 0,
      ts: Date.now()
    });
    updateMediaSession();
  }

  /* ========== Raccourcis clavier ========== */
  function isTypingTarget(el) {
    if (!el) return false;
    var tag = (el.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
  }

  d.addEventListener('keydown', function (e) {
    if (isTypingTarget(e.target)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    var a = audio();
    var key = e.key;

    if (key === ' ' || key === 'k' || key === 'K') {
      e.preventDefault();
      if (typeof w.togglePlayerPlay === 'function') w.togglePlayerPlay();
      else if (a) {
        if (a.paused) a.play().catch(function () {});
        else a.pause();
      }
      return;
    }
    if (key === 'ArrowRight' || key === 'l' || key === 'L') {
      if (!a) return;
      e.preventDefault();
      a.currentTime = Math.min(a.duration || 1e9, a.currentTime + 5);
      return;
    }
    if (key === 'ArrowLeft' || key === 'j' || key === 'J') {
      if (!a) return;
      e.preventDefault();
      a.currentTime = Math.max(0, a.currentTime - 5);
      return;
    }
    if (key === 'm' || key === 'M') {
      e.preventDefault();
      if (typeof w.toggleMute === 'function') w.toggleMute();
      else if (a) a.muted = !a.muted;
      return;
    }
    if (key === 'f' || key === 'F') {
      if (typeof w.toggleCurrentFavorite === 'function') {
        e.preventDefault();
        w.toggleCurrentFavorite();
      }
      return;
    }
  });

  /* ========== Liens profonds ========== */
  function handleDeepLink() {
    var params = new URLSearchParams(w.location.search);
    var play = params.get('play') || params.get('p');
    if (!play && w.location.hash) {
      var h = w.location.hash.replace(/^#/, '');
      if (h.indexOf('play=') === 0) play = decodeURIComponent(h.slice(5));
      else if (h.indexOf('play/') === 0) play = decodeURIComponent(h.slice(5));
    }
    if (!play) return;

    // formats: emission-3 | chanson-12 | url audio
    setTimeout(function () {
      if (play.indexOf('http') === 0 || play.indexOf('/music/') === 0 || /\.mp3|\.m4a|\.ogg/i.test(play)) {
        var a = audio();
        if (a) {
          a.src = play;
          a.play().catch(function () {});
          var fp = $('floating-player');
          if (fp) fp.classList.remove('hidden');
        }
        return;
      }
      var parts = play.split('-');
      if (parts.length >= 2 && typeof w.playMedia === 'function') {
        var type = parts[0];
        var id = parseInt(parts[1], 10);
        if (type && id) {
          // best effort: app may need full metadata — try navigate + play if helpers exist
          try {
            if (typeof w.openMediaById === 'function') {
              w.openMediaById(type, id);
              return;
            }
          } catch (e) {}
        }
      }
    }, 800);
  }

  /* ========== Empty states ========== */
  function ensureEmptyState(container) {
    if (!container || container.children.length > 0) {
      var old = container && container.querySelector('.rc-empty');
      if (old && container.children.length > 1) old.remove();
      return;
    }
    if (container.querySelector('.rc-empty')) return;
    var el = d.createElement('div');
    el.className = 'rc-empty';
    el.innerHTML =
      '<div class="rc-empty-inner">' +
      '<i class="fas fa-compact-disc rc-empty-icon" aria-hidden="true"></i>' +
      '<p class="rc-empty-title">Rien à afficher pour le moment</p>' +
      '<p class="rc-empty-sub">Revenez bientôt ou explorez une autre section.</p>' +
      '</div>';
    container.appendChild(el);
  }

  function watchGrids() {
    var ids = ['home-chansons', 'home-emissions', 'home-top', 'home-artistes', 'home-interviews', 'list-container', 'grid-container'];
    ids.forEach(function (id) {
      var el = $(id);
      if (!el) return;
      // only if still empty after load
      setTimeout(function () { ensureEmptyState(el); }, 2500);
    });
  }

  /* ========== Hooks player ========== */
  function bindAudio() {
    var a = audio();
    if (!a || a.__rcEnhance) return;
    a.__rcEnhance = true;
    a.addEventListener('play', function () {
      syncPlaybackState();
      updateMediaSession();
      // capture after a short delay so title is filled
      setTimeout(captureFromPlayer, 400);
    });
    a.addEventListener('pause', syncPlaybackState);
    a.addEventListener('ended', syncPlaybackState);
  }

  function patchPlayMedia() {
    if (typeof w.playMedia !== 'function' || w.playMedia.__rcEnhance) return;
    var orig = w.playMedia;
    w.playMedia = function (type, id, title, artist, img, audioUrl) {
      var r = orig.apply(this, arguments);
      pushHistory({
        type: type || 'chanson',
        id: id || 0,
        title: title || '',
        artist: artist || '',
        img: img || '',
        audio: audioUrl || (audio() && (audio().currentSrc || audio().src)) || '',
        ts: Date.now()
      });
      setTimeout(updateMediaSession, 200);
      return r;
    };
    w.playMedia.__rcEnhance = true;
  }

  function boot() {
    bindAudio();
    patchPlayMedia();
    renderRecent();
    renderContinueBar();
    updateMediaSession();
    handleDeepLink();
    watchGrids();
  }

  if (d.readyState === 'loading') {
    d.addEventListener('DOMContentLoaded', function () {
      boot();
      setTimeout(boot, 500);
      setTimeout(boot, 1500);
    });
  } else {
    boot();
    setTimeout(boot, 500);
  }
  w.addEventListener('load', function () { setTimeout(boot, 300); });
})(window, document);

/* ========== EXTENSION PACK 2 ========== */
(function (w, d) {
  'use strict';

  function $(id) { return d.getElementById(id); }

  /* —— Toast global —— */
  function toast(msg, ms) {
    ms = ms || 2800;
    var t = d.getElementById('rc-toast');
    if (!t) {
      t = d.createElement('div');
      t.id = 'rc-toast';
      t.className = 'rc-toast';
      t.setAttribute('role', 'status');
      d.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('rc-toast-show');
    clearTimeout(t._tm);
    t._tm = setTimeout(function () {
      t.classList.remove('rc-toast-show');
    }, ms);
  }
  w.chaabiToast = toast;

  /* —— Offline banner —— */
  function ensureOfflineBar() {
    var bar = $('rc-offline');
    if (!bar) {
      bar = d.createElement('div');
      bar.id = 'rc-offline';
      bar.className = 'rc-offline hidden';
      bar.innerHTML = '<i class="fas fa-wifi" aria-hidden="true"></i> <span>Hors ligne — lecture locale possible si déjà en cache</span>';
      d.body.appendChild(bar);
    }
    return bar;
  }
  function syncOnline() {
    var bar = ensureOfflineBar();
    if (navigator.onLine) {
      bar.classList.add('hidden');
    } else {
      bar.classList.remove('hidden');
      toast('Connexion perdue');
    }
  }
  w.addEventListener('online', function () {
    syncOnline();
    toast('De retour en ligne');
  });
  w.addEventListener('offline', syncOnline);

  /* —— PWA install soft banner —— */
  var deferredPrompt = null;
  w.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    showInstallBanner();
  });

  function showInstallBanner() {
    try {
      if (localStorage.getItem('chaabi_install_dismissed') === '1') return;
    } catch (err) {}
    if ($('rc-install-banner')) return;
    var b = d.createElement('div');
    b.id = 'rc-install-banner';
    b.className = 'rc-install-banner';
    b.innerHTML =
      '<div class="rc-install-inner">' +
      '<i class="fas fa-mobile-screen-button" aria-hidden="true"></i>' +
      '<div><strong>Installer Radio Chaabi</strong><span>Accès rapide depuis l’écran d’accueil</span></div>' +
      '<button type="button" class="rc-install-yes" id="rc-install-yes">Installer</button>' +
      '<button type="button" class="rc-install-no" id="rc-install-no" aria-label="Fermer">×</button>' +
      '</div>';
    d.body.appendChild(b);
    $('rc-install-yes').onclick = function () {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function () {
          deferredPrompt = null;
          b.remove();
        });
      } else if (typeof w.installApp === 'function') {
        w.installApp();
        b.remove();
      }
    };
    $('rc-install-no').onclick = function () {
      try { localStorage.setItem('chaabi_install_dismissed', '1'); } catch (e) {}
      b.remove();
    };
  }

  /* —— Share with deep link —— */
  function buildShareUrl() {
    var a = $('fp-audio');
    var title = ($('fp-title') && $('fp-title').textContent) || 'Radio Chaabi';
    var url = w.location.origin + w.location.pathname;
    if (a && (a.currentSrc || a.src)) {
      try {
        var src = a.currentSrc || a.src;
        // relative path preferred
        var path = src.replace(w.location.origin, '');
        url += '?play=' + encodeURIComponent(path);
      } catch (e) {}
    }
    return { title: title, url: url };
  }

  function enhanceShare() {
    if (typeof w.shareCurrentTrack === 'function' && !w.shareCurrentTrack.__rcShare) {
      var orig = w.shareCurrentTrack;
      w.shareCurrentTrack = function () {
        var info = buildShareUrl();
        if (navigator.share) {
          navigator.share({
            title: info.title,
            text: info.title + ' — Radio Chaabi',
            url: info.url
          }).catch(function () {
            copyShare(info.url);
          });
          return;
        }
        try {
          return orig.apply(this, arguments);
        } catch (e) {
          copyShare(info.url);
        }
      };
      w.shareCurrentTrack.__rcShare = true;
    }
  }

  function copyShare(url) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () {
        toast('Lien copié');
      }).catch(function () {
        toast(url);
      });
    } else {
      toast('Lien : ' + url);
    }
  }

  /* —— Lecture continue : utilise playNext() natif du site —— */
  var continuousOn = true;
  try {
    continuousOn = localStorage.getItem('chaabi_continuous') !== '0';
  } catch (e) {}

  function onEndedContinuous() {
    if (!continuousOn) return;
    // Délai court pour laisser le player terminer proprement
    setTimeout(function () {
      if (!continuousOn) return;
      if (typeof w.playNext === 'function') {
        toast('Piste suivante…');
        try {
          w.playNext();
          return;
        } catch (err) {}
      }
      // Repli : chercher une carte avec le même type / suivant dans le DOM
      var a = $('fp-audio');
      var src = a ? (a.currentSrc || a.src || '') : '';
      var cards = d.querySelectorAll('.media-card');
      var idx = -1;
      for (var i = 0; i < cards.length; i++) {
        var oc = cards[i].getAttribute('onclick') || '';
        var da = cards[i].getAttribute('data-audio') || '';
        if ((src && da && src.indexOf(da.replace(/^\//, '')) !== -1) ||
            (src && oc && src.split('/').pop() && oc.indexOf(src.split('/').pop()) !== -1)) {
          idx = i;
          break;
        }
      }
      var next = idx >= 0 && cards[idx + 1] ? cards[idx + 1] : null;
      if (next) {
        toast('Piste suivante…');
        var zone = next.querySelector('.mc-img-bx') || next;
        if (typeof zone.click === 'function') zone.click();
        else next.click();
      } else {
        toast('Fin de la file');
      }
    }, 250);
  }

  function bindContinuous() {
    var a = $('fp-audio');
    if (!a) return;
    if (a.__rcContinuous) return;
    a.__rcContinuous = true;
    a.addEventListener('ended', onEndedContinuous);
    // Certains navigateurs ne fire pas "ended" si loop — on double-check timeupdate
    a.addEventListener('timeupdate', function () {
      if (!continuousOn || !a.duration || !isFinite(a.duration)) return;
      if (a.duration - a.currentTime < 0.35 && a.duration > 1 && !a.paused) {
        if (a.__rcNearEnd) return;
        a.__rcNearEnd = true;
      }
      if (a.currentTime < 1) a.__rcNearEnd = false;
    });
  }

  /* Toggle continue button near player if missing */
  function ensureContinuousBtn() {
    var fav = $('fp-fav');
    if (!fav || $('fp-continuous-btn')) return;
    var btn = d.createElement('button');
    btn.type = 'button';
    btn.id = 'fp-continuous-btn';
    btn.className = 'w-9 h-9 rounded-full text-slate-300 hover:text-amber-300 hover:bg-white/10 transition flex items-center justify-center' + (continuousOn ? ' rc-cont-on' : '');
    btn.title = continuousOn ? "Lecture continue : ON" : "Lecture continue : OFF";
    btn.setAttribute('aria-label', 'Lecture continue');
    btn.innerHTML = '<i class="fas fa-infinity"></i>';
    btn.onclick = function () {
      continuousOn = !continuousOn;
      try { localStorage.setItem('chaabi_continuous', continuousOn ? '1' : '0'); } catch (e) {}
      btn.classList.toggle('rc-cont-on', continuousOn);
      btn.title = continuousOn ? "Lecture continue : ON" : "Lecture continue : OFF";
      toast(continuousOn ? "Lecture continue activée" : "Lecture continue désactivée");
    };
    fav.parentNode.insertBefore(btn, fav);
  }

  /* —— Nav aria-current —— */
  function setNavCurrent(view) {
    var map = {
      home: "navigateTo('home')",
      onair: "navigateTo('onair')",
      radio: "navigateTo('radio')",
      artistes: "navigateTo('artistes')",
      chansons: "navigateTo('chansons')",
      emissions: "navigateTo('emissions')",
      interviews: "navigateTo('interviews')"
    };
    d.querySelectorAll('header button[onclick*="navigateTo"], #mobile-menu button[onclick*="navigateTo"]').forEach(function (btn) {
      var on = btn.getAttribute('onclick') || '';
      var active = view && on.indexOf("'" + view + "'") !== -1;
      if (active) {
        btn.setAttribute('aria-current', 'page');
        btn.classList.add('rc-nav-active');
      } else {
        btn.removeAttribute('aria-current');
        btn.classList.remove('rc-nav-active');
      }
    });
  }

  function patchNav() {
    if (typeof w.navigateTo !== 'function' || w.navigateTo.__rcNavAria) return;
    var orig = w.navigateTo;
    w.navigateTo = function (view) {
      var r = orig.apply(this, arguments);
      setNavCurrent(view);
      return r;
    };
    w.navigateTo.__rcNavAria = true;
  }

  /* —— Focus trap menu mobile —— */
  function trapMobileMenu() {
    var menu = $('mobile-menu');
    var btn = $('mobile-menu-btn');
    if (!menu || menu.__rcTrap) return;
    menu.__rcTrap = true;

    d.addEventListener('keydown', function (e) {
      if (menu.classList.contains('hidden')) return;
      if (e.key === 'Escape') {
        if (typeof w.toggleMobileMenu === 'function') w.toggleMobileMenu();
        else menu.classList.add('hidden');
        if (btn) btn.focus();
        return;
      }
      if (e.key !== 'Tab') return;
      var focusables = menu.querySelectorAll('button, a, [tabindex]:not([tabindex="-1"])');
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (e.shiftKey && d.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && d.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  /* —— Skeletons on empty grids at start —— */
  function injectSkeletons() {
    ['home-chansons', 'home-emissions', 'home-top', 'home-artistes', 'home-interviews'].forEach(function (id) {
      var el = $(id);
      if (!el || el.children.length) return;
      el.innerHTML = '';
      for (var i = 0; i < 4; i++) {
        var s = d.createElement('div');
        s.className = 'rc-skeleton-card';
        s.innerHTML = '<div class="rc-skel-img rc-shimmer"></div><div class="rc-skel-line rc-shimmer"></div><div class="rc-skel-line short rc-shimmer"></div>';
        el.appendChild(s);
      }
    });
    // remove skeletons once real cards appear
    setTimeout(function () {
      d.querySelectorAll('.rc-skeleton-card').forEach(function (s) {
        if (s.parentNode && s.parentNode.querySelector('.media-card')) {
          s.parentNode.querySelectorAll('.rc-skeleton-card').forEach(function (x) { x.remove(); });
        }
      });
    }, 1200);
    setTimeout(function () {
      d.querySelectorAll('.rc-skeleton-card').forEach(function (s) { s.remove(); });
    }, 4000);
  }

  /* —— Lazy images enhancement —— */
  function lazyImages() {
    d.querySelectorAll('.media-card img:not([loading])').forEach(function (img) {
      img.setAttribute('loading', 'lazy');
      img.setAttribute('decoding', 'async');
    });
  }

  /* —— Badge "Nouveau" si data-date récente —— */
  function badgeNew() {
    var limit = Date.now() - 14 * 24 * 3600 * 1000;
    d.querySelectorAll('.media-card[data-date]').forEach(function (card) {
      var ds = card.getAttribute('data-date');
      var t = Date.parse(ds);
      if (!t || t < limit) return;
      if (card.querySelector('.rc-badge-new')) return;
      var b = d.createElement('span');
      b.className = 'rc-badge-new';
      b.textContent = 'Nouveau';
      var bx = card.querySelector('.mc-img-bx') || card;
      bx.appendChild(b);
    });
  }

  /* —— Light theme contrast boost —— */
  function contrastHint() {
    /* CSS handles most; optional class */
    if (d.documentElement.classList.contains('theme-light')) {
      d.documentElement.classList.add('rc-contrast');
    }
  }

  function boot2() {
    syncOnline();
    enhanceShare();
    bindContinuous();
    ensureContinuousBtn();
    patchNav();
    trapMobileMenu();
    injectSkeletons();
    lazyImages();
    badgeNew();
    contrastHint();
  }

  if (d.readyState === 'loading') {
    d.addEventListener('DOMContentLoaded', function () {
      boot2();
      setTimeout(boot2, 600);
      setTimeout(function () { lazyImages(); badgeNew(); }, 2000);
    });
  } else {
    boot2();
    setTimeout(boot2, 600);
  }
  w.addEventListener('load', function () {
    setTimeout(boot2, 400);
    setTimeout(lazyImages, 1500);
  });
})(window, document);


/* =========================================================
 * FIX FORT — lecture continue → playNext() à la fin de piste
 * ========================================================= */
(function (w, d) {
  'use strict';
  var KEY = 'chaabi_continuous';
  function enabled() {
    try { return localStorage.getItem(KEY) !== '0'; } catch (e) { return true; }
  }
  function toast(msg) {
    if (typeof w.chaabiToast === 'function') w.chaabiToast(msg);
  }
  function goNext(reason) {
    if (!enabled()) return;
    if (typeof w.playNext !== 'function') {
      toast('playNext indisponible');
      return;
    }
    toast('Piste suivante…');
    try { w.playNext(); } catch (e) { console.warn('playNext error', e); }
  }

  var lastEndedAt = 0;
  function onEnded() {
    var now = Date.now();
    if (now - lastEndedAt < 800) return; // anti double-fire
    lastEndedAt = now;
    setTimeout(function () { goNext('ended'); }, 180);
  }

  function bindAudio(a) {
    if (!a || a.__rcContStrong) return;
    a.__rcContStrong = true;
    a.addEventListener('ended', onEnded);
    // Fallback: near end detection (certains flux ne dispatchent pas ended)
    a.addEventListener('timeupdate', function () {
      if (!enabled() || a.paused) return;
      var d = a.duration;
      if (!d || !isFinite(d) || d < 2) return;
      if (d - a.currentTime <= 0.4 && a.currentTime > 1) {
        if (a.__rcEndArmed) return;
        a.__rcEndArmed = true;
        // wait briefly for natural ended; if still not ended, force
        setTimeout(function () {
          if (a.ended || (a.duration - a.currentTime <= 0.15 && !a.paused)) {
            onEnded();
          }
          a.__rcEndArmed = false;
        }, 500);
      }
      if (a.currentTime < 1) a.__rcEndArmed = false;
    });
  }

  function scan() {
    bindAudio(d.getElementById('fp-audio'));
    d.querySelectorAll('audio').forEach(bindAudio);
  }

  // Bouton ∞ : s'assurer qu'il existe et pilote bien localStorage
  function ensureBtn() {
    var fav = d.getElementById('fp-fav');
    var btn = d.getElementById('fp-continuous-btn');
    if (!btn && fav && fav.parentNode) {
      btn = d.createElement('button');
      btn.type = 'button';
      btn.id = 'fp-continuous-btn';
      btn.className = 'w-9 h-9 rounded-full text-slate-300 hover:text-amber-300 hover:bg-white/10 transition flex items-center justify-center';
      btn.innerHTML = '<i class="fas fa-infinity"></i>';
      fav.parentNode.insertBefore(btn, fav);
    }
    if (!btn || btn.__rcBound) return;
    btn.__rcBound = true;
    function sync() {
      var on = enabled();
      btn.classList.toggle('rc-cont-on', on);
      btn.title = on ? "Lecture continue : ON" : "Lecture continue : OFF";
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var next = !enabled();
      try { localStorage.setItem(KEY, next ? '1' : '0'); } catch (err) {}
      sync();
      toast(next ? "Lecture continue activée" : "Lecture continue désactivée");
    });
    sync();
  }

  scan();
  ensureBtn();
  setInterval(function () { scan(); ensureBtn(); }, 1500);
  d.addEventListener('DOMContentLoaded', function () { scan(); ensureBtn(); });
  w.addEventListener('load', function () { scan(); ensureBtn(); });
})(window, document);


/* =========================================================
 * Minuteur sommeil + Surprends-moi
 * ========================================================= */
(function (w, d) {
  'use strict';

  function $(id) { return d.getElementById(id); }
  function toast(m) {
    if (typeof w.chaabiToast === 'function') w.chaabiToast(m);
    else try { console.log(m); } catch (e) {}
  }

  var sleepTimer = null;
  var sleepEndsAt = 0;

  function clearSleep() {
    if (sleepTimer) clearInterval(sleepTimer);
    sleepTimer = null;
    sleepEndsAt = 0;
    var b = $('fp-sleep-btn');
    if (b) {
      b.classList.remove('rc-sleep-on');
      b.title = "Minuteur sommeil";
      b.removeAttribute('data-left');
    }
    var badge = $('rc-sleep-badge');
    if (badge) badge.remove();
  }

  function formatLeft(ms) {
    var s = Math.max(0, Math.ceil(ms / 1000));
    var m = Math.floor(s / 60);
    var r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  function tickSleep() {
    var left = sleepEndsAt - Date.now();
    var badge = $('rc-sleep-badge');
    if (left <= 0) {
      clearSleep();
      var a = $('fp-audio');
      if (a && !a.paused) {
        a.pause();
        toast("Bonne nuit — lecture arrêtée");
      } else {
        toast("Minuteur terminé");
      }
      return;
    }
    if (badge) badge.textContent = formatLeft(left);
    var b = $('fp-sleep-btn');
    if (b) b.title = 'Sommeil : ' + formatLeft(left) + ' (clic pour annuler)';
  }

  function startSleep(minutes) {
    clearSleep();
    sleepEndsAt = Date.now() + minutes * 60 * 1000;
    var b = $('fp-sleep-btn');
    if (b) b.classList.add('rc-sleep-on');
    // badge near player
    var fp = $('floating-player');
    if (fp && !$('rc-sleep-badge')) {
      var badge = d.createElement('span');
      badge.id = 'rc-sleep-badge';
      badge.className = 'rc-sleep-badge';
      badge.textContent = formatLeft(minutes * 60 * 1000);
      fp.appendChild(badge);
    }
    sleepTimer = setInterval(tickSleep, 1000);
    tickSleep();
    toast("Sommeil : arrêt dans " + minutes + ' min');
  }

  function cycleSleep() {
    // Si déjà actif → annuler
    if (sleepEndsAt > Date.now()) {
      clearSleep();
      toast("Minuteur annulé");
      return;
    }
    // Menu simple : 15 → 30 → 45 → 60
    var choice = w.prompt('Minuteur sommeil (minutes) :\n15, 30, 45 ou 60', '30');
    if (choice === null) return;
    var n = parseInt(choice, 10);
    if ([15, 30, 45, 60].indexOf(n) === -1) {
      if (n > 0 && n <= 180) startSleep(n);
      else toast("Choisis 15, 30, 45 ou 60");
      return;
    }
    startSleep(n);
  }

  /* Surprends-moi : piste au hasard parmi les cartes visibles */
  function surpriseMe() {
    var cards = d.querySelectorAll(
      '#view-home .media-card, #list-container .media-card, .home-card-grid .media-card'
    );
    if (!cards.length) {
      toast("Aucune piste visible");
      return;
    }
    var card = cards[Math.floor(Math.random() * cards.length)];
    toast("Surprise !");
    var zone = card.querySelector('.mc-img-bx') || card;
    // léger highlight
    card.classList.add('rc-surprise-flash');
    setTimeout(function () { card.classList.remove('rc-surprise-flash'); }, 1200);
    setTimeout(function () {
      if (zone && zone.click) zone.click();
      else card.click();
    }, 180);
  }
  w.chaabiSurpriseMe = surpriseMe;
  w.chaabiSleepTimer = cycleSleep;

  function ensureExtraBtns() {
    var fav = $('fp-fav');
    var share = $('fp-share');
    var host = (fav && fav.parentNode) || (share && share.parentNode);
    if (!host) return;

    var sleepBtn = $('fp-sleep-btn');
    if (sleepBtn && !sleepBtn.__rcBound) {
      sleepBtn.__rcBound = true;
      sleepBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        cycleSleep();
      });
    }
    if (!sleepBtn) {
      var sleep = d.createElement('button');
      sleep.type = 'button';
      sleep.id = 'fp-sleep-btn';
      sleep.className = 'w-9 h-9 rounded-full text-slate-300 hover:text-violet-300 hover:bg-white/10 transition flex items-center justify-center';
      sleep.title = "Minuteur sommeil";
      sleep.setAttribute('aria-label', "Minuteur sommeil");
      sleep.innerHTML = '<i class="fas fa-moon text-xs"></i>';
      sleep.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        cycleSleep();
      });
      if (share && share.parentNode === host) host.insertBefore(sleep, share.nextSibling);
      else if (fav) host.insertBefore(sleep, fav);
      else host.appendChild(sleep);
    }

    if (!$('fp-surprise-btn')) {
      var sur = d.createElement('button');
      sur.type = 'button';
      sur.id = 'fp-surprise-btn';
      sur.className = 'w-9 h-9 rounded-full text-slate-300 hover:text-amber-300 hover:bg-white/10 transition flex items-center justify-center';
      sur.title = "Surprends-moi";
      sur.setAttribute("aria-label", "Surprends-moi");
      sur.innerHTML = '<i class="fas fa-shuffle"></i>';
      sur.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        surpriseMe();
      });
      // after continuous if present, else before fav
      var cont = $('fp-continuous-btn');
      if (cont && cont.parentNode) cont.parentNode.insertBefore(sur, cont.nextSibling);
      else fav.parentNode.insertBefore(sur, fav);
    }
  }

  // Bouton accueil optionnel
  function ensureHomeSurprise() {
    var section = d.getElementById('section-home-recent') || d.getElementById('view-home');
    if (!section || $('rc-surprise-home')) return;
    var heroActions = d.querySelector('.hero-bg .flex.flex-col.sm\\:flex-row, .hero-casbah .flex.gap-3, .hero-inner .flex');
    // floating chip near continue bar
    var bar = d.getElementById('continue-bar');
    var host = bar && bar.parentNode ? bar.parentNode : null;
    if (!host) return;
    var btn = d.createElement('button');
    btn.type = 'button';
    btn.id = 'rc-surprise-home';
    btn.className = 'rc-surprise-home';
    btn.innerHTML = '<i class="fas fa-shuffle"></i> Surprends-moi';
    btn.addEventListener('click', surpriseMe);
    host.appendChild(btn);
  }

  function boot() {
    ensureExtraBtns();
    ensureHomeSurprise();
  }
  boot();
  setInterval(ensureExtraBtns, 2000);
  d.addEventListener('DOMContentLoaded', boot);
  w.addEventListener('load', function () { setTimeout(boot, 400); });
})(window, document);



/* Back to top visibility */
(function (w, d) {
  function syncBtt() {
    var b = d.getElementById('back-to-top');
    if (!b) return;
    if (w.scrollY > 280) b.classList.add('btt-visible');
    else b.classList.remove('btt-visible');
  }
  w.addEventListener('scroll', syncBtt, { passive: true });
  d.addEventListener('DOMContentLoaded', syncBtt);
  var b = d.getElementById('back-to-top');
  if (b && !b.__rcClick) {
    b.__rcClick = true;
    b.addEventListener('click', function () {
      w.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
})(window, document);
