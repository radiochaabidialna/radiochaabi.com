/**
 * Slider accueil Swiper — émissions + chansons (format API radiochaabi réel)
 */
(function (w, d) {
  'use strict';
  var API = (w.CHAABI_API || 'api/radiochaabi.php').split('?')[0];
  var swiperInstance = null;
  /* Toutes les médias BDD sont sous /music/ (pas le dossier de la page) */

  var MEDIA_BASE = (w.CHAABI_MEDIA_BASE != null) ? w.CHAABI_MEDIA_BASE : '/music/';
  var LAST_ITEMS = [];

  function getLang() {
    try {
      var sl = localStorage.getItem('chaabi_lang') || localStorage.getItem('rc_lang');
      if (sl === 'ar' || sl === 'fr') return sl;
    } catch (e) {}
    var htmlLang = (d.documentElement.getAttribute('lang') || '').toLowerCase();
    if (htmlLang.indexOf('ar') === 0) return 'ar';
    if (d.documentElement.classList.contains('lang-ar') || d.documentElement.dir === 'rtl') return 'ar';
    return 'fr';
  }

  var SW_I18N = {
    fr: {
      listen: 'Écouter',
      more: 'Voir',
      emission: 'Émission',
      interview: 'Interview',
      song: 'Chanson',
      empty: 'Aucun média',
      num: 'N°'
    },
    ar: {
      listen: 'استمع',
      more: 'المزيد',
      emission: 'حلقة',
      interview: 'حوار',
      song: 'أغنية',
      empty: 'لا يوجد محتوى',
      num: 'رقم'
    }
  };

  function swT(key) {
    var lang = getLang();
    return (SW_I18N[lang] && SW_I18N[lang][key]) || SW_I18N.fr[key] || key;
  }


  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function mediaUrl(path) {
    if (!path) return '/music/img_hero/radiochaabi_emissions_1920x600.jpg';
    path = String(path).trim();
    if (!path) return '/music/img_hero/radiochaabi_emissions_1920x600.jpg';
    // déjà absolu http(s)
    if (/^https?:\/\//i.test(path)) return path;
    // déjà /music/...
    if (path.indexOf('/music/') === 0) return path;
    // /img_... ou /audio_... → préfixer /music
    if (path.charAt(0) === '/') {
      if (path.indexOf('/music/') === 0) return path;
      return '/music' + path;
    }
    // img_emissions/... audio_chaabi/... → /music/img_emissions/...
    return MEDIA_BASE.replace(/\/?$/, '/') + path.replace(/^\/+/, '');
  }

  function api(action, extra) {
    var u = API + '?action=' + encodeURIComponent(action) + '&_=' + Date.now();
    if (extra) u += extra;
    return u;
  }

  function toList(json) {
    if (!json) return [];
    if (Array.isArray(json)) return json;
    if (Array.isArray(json.data)) return json.data;
    if (Array.isArray(json.items)) return json.items;
    return [];
  }

  function pickImg(item) {
    return mediaUrl(item.image || item.cover || item.img || item.thumbnail || '');
  }
  function pickTitle(item) {
    if (getLang() === 'ar') {
      var ar = (item.titre_ar || item.title_ar || item.nom_ar || '').toString().trim();
      if (ar) return ar;
    }
    return (item.titre || item.title || item.nom || 'Sans titre').toString();
  }
  function pickArtist(item) {
    var type = pickType(item);
    if (getLang() === 'ar') {
      if (type === 'emission') {
        var arE = (item.invites_noms_ar || item.invite_ar || item.invites_ar ||
          item.artiste_nom_ar || item.artiste_ar || '').toString().trim();
        if (arE) return arE;
      } else {
        var arA = (item.artiste_nom_ar || item.artiste_ar || item.artist_ar ||
          item.interprete_ar || '').toString().trim();
        if (arA) return arA;
      }
    }
    if (type === 'emission') {
      return (item.invites_noms || item.invite || item.guest || item.invites ||
        item.artiste_nom || item.artiste || item.artist || '').toString();
    }
    return (item.artiste_nom || item.artiste || item.artist || item.interprete ||
      item.invites_noms || item.invite || '').toString();
  }

  function pickEmissionNum(item) {
    var n = item.numero_emission != null ? item.numero_emission : item.numero;
    if (n == null || n === '') return '';
    return String(n).trim();
  }
  function pickAudio(item) {
    return mediaUrl(item.audio || item.url || item.fichier || '');
  }
  function pickType(item, fallback) {
    if (item.numero_emission != null || item.date_emission) return 'emission';
    var t = (item.media_type || item.type || fallback || 'chanson').toString().toLowerCase();
    if (t.indexOf('emission') >= 0) return 'emission';
    if (t.indexOf('interview') >= 0) return 'interview';
    return 'chanson';
  }
  function typeLabel(t, item) {
    if (t === 'emission') {
      var n = item ? pickEmissionNum(item) : '';
      var em = swT('emission');
      return n ? '📻 ' + em + ' #' + n : '📻 ' + em;
    }
    if (t === 'interview') return '🎤 ' + swT('interview');
    return '🎵 ' + swT('song');
  }


  function formatTime(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function updateProgressUI() {
    var a = d.getElementById('fp-audio');
    if (!a) return;
    var dur = a.duration;
    var cur = a.currentTime || 0;
    var pct = (dur && isFinite(dur) && dur > 0) ? (cur / dur) * 100 : 0;
    var fill = d.getElementById('fp-progress-fill');
    var knob = d.getElementById('fp-progress-knob');
    var tEl = d.getElementById('fp-time');
    var dEl = d.getElementById('fp-duration');
    if (fill) fill.style.width = pct + '%';
    if (knob) knob.style.left = pct + '%';
    if (tEl) tEl.textContent = formatTime(cur);
    if (dEl) dEl.textContent = (dur && isFinite(dur)) ? formatTime(dur) : '0:00';
  }

  var progressBound = false;
  function bindProgressBar() {
    var a = d.getElementById('fp-audio');
    if (!a || progressBound) return;
    progressBound = true;
    a.addEventListener('timeupdate', updateProgressUI);
    a.addEventListener('loadedmetadata', updateProgressUI);
    a.addEventListener('durationchange', updateProgressUI);
    a.addEventListener('play', updateProgressUI);
    // seek au clic
    var bar = d.getElementById('fp-progress');
    if (bar && !bar.getAttribute('data-swiper-seek')) {
      bar.setAttribute('data-swiper-seek', '1');
      bar.addEventListener('click', function (e) {
        var a2 = d.getElementById('fp-audio');
        if (!a2 || !a2.duration || !isFinite(a2.duration)) return;
        var rect = bar.getBoundingClientRect();
        var ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
        a2.currentTime = ratio * a2.duration;
        updateProgressUI();
      });
    }
  }

  function setText(el, text) {
    if (!el) return;
    var v = (text == null ? '' : String(text));
    el.textContent = v;
    el.innerText = v;
    if (v) {
      el.setAttribute('title', v);
      el.style.visibility = 'visible';
      el.style.opacity = '1';
      el.style.display = '';
      el.classList.remove('hidden');
    }
  }

  function fillFloatingPlayer(payload, item) {
    var title = (payload && payload.title) || pickTitle(item) || '';
    var artist = (payload && payload.artist) || pickArtist(item) || '';
    var img = (payload && payload.image) || pickImg(item) || '';
    var audio = (payload && payload.audio) || pickAudio(item) || '';
    var type = (payload && payload.type) || pickType(item) || 'chanson';

    var fp = d.getElementById('floating-player');
    var a = d.getElementById('fp-audio');
    var tEl = d.getElementById('fp-title');
    var arEl = d.getElementById('fp-artist');
    var im = d.getElementById('fp-img');
    var typeEl = d.getElementById('fp-type');
    var icon = d.getElementById('fp-play-icon');
    var toggle = d.getElementById('fp-toggle');

    // Titre + interprète (forcer le DOM)
    setText(tEl, title);
    setText(arEl, artist);

    if (im && img) {
      im.src = img;
      im.setAttribute('alt', title);
      im.classList.add('spinning');
    }
    if (typeEl) {
      var lab = type === 'emission' ? 'ÉMISSION' : (type === 'interview' ? 'INTERVIEW' : 'CHANSON');
      setText(typeEl, lab);
      typeEl.setAttribute('data-type', type);
      typeEl.classList.remove('hidden');
    }
    if (a && audio) {
      var abs = audio;
      try {
        if (!/^https?:/i.test(audio) && audio.charAt(0) === '/') {
          abs = audio; // /music/...
        }
        if (a.getAttribute('src') !== abs && a.src.indexOf(abs.replace(/^\//,'')) < 0) {
          a.setAttribute('src', abs);
          a.src = abs;
          a.load();
        }
      } catch (e) {
        a.src = abs;
      }
      var playPromise = a.play();
      if (playPromise && playPromise.catch) playPromise.catch(function () {});
    }
    if (fp) {
      fp.classList.remove('hidden');
      fp.style.display = '';
      fp.style.visibility = 'visible';
      fp.removeAttribute('hidden');
    }
    d.body.classList.add('has-player');
    if (icon) {
      icon.className = 'fas fa-pause text-white text-sm';
    }
    if (toggle) toggle.setAttribute('aria-pressed', 'true');
    var eq = d.getElementById('fp-eq');
    if (eq) eq.classList.remove('paused');

    // Vue « À l'antenne » si présente
    var ot = d.getElementById('onair-title');
    var oa = d.getElementById('onair-artist');
    var oc = d.getElementById('onair-cover');
    if (ot) setText(ot, title);
    if (oa) setText(oa, artist);
    if (oc && img) oc.src = img;

    if (w.console && console.debug) {
      console.debug('[chaabi-swiper] player UI', title, artist, audio);
    }
  }

  function playItem(item) {
    var title = pickTitle(item);
    var artist = pickArtist(item);
    var img = pickImg(item);
    var audio = pickAudio(item);
    var type = pickType(item);

    var payload = {
      id: item.id,
      title: title,
      titre: title,
      name: title,
      artist: artist,
      artiste: artist,
      artiste_nom: artist,
      image: img,
      cover: img,
      img: img,
      audio: audio,
      url: audio,
      src: audio,
      file: audio,
      path: audio,
      media_type: type,
      type: type,
      kind: type
    };

    // 1) Remplir le player tout de suite (avant le moteur principal)
    fillFloatingPlayer(payload, item);

    // 2) Brancher le moteur Chaabi s'il existe
    try {
      if (typeof w.playMedia === 'function') w.playMedia(payload);
      else if (typeof w.playTrack === 'function') w.playTrack(payload);
      else if (typeof w.openPlayer === 'function') w.openPlayer(payload);
      else if (typeof w.playSong === 'function') w.playSong(payload);
      else if (typeof w.play === 'function') w.play(payload);
    } catch (e) {
      if (w.console) console.warn('[chaabi-swiper] play engine', e);
    }

    // 3) Re-appliquer après le moteur (il peut écraser le DOM)
    [50, 150, 350, 700].forEach(function (ms) {
      setTimeout(function () { fillFloatingPlayer(payload, item); }, ms);
    });
  }

  function slideHtml(item, idx) {
    var title = pickTitle(item);
    var artist = pickArtist(item);
    var img = pickImg(item);
    var type = pickType(item);
    var badge = typeLabel(type, item);
    var num = pickEmissionNum(item);
    var sub = '';
    if (type === 'emission') {
      if (num && artist) sub = swT('num') + num + ' — ' + artist;
      else if (num) sub = swT('num') + num;
      else if (artist) sub = artist;
    } else {
      sub = artist;
    }
    return (
      '<div class="swiper-slide chaabi-sw-slide" data-idx="' + idx + '">' +
        '<div class="chaabi-sw-bg" style="background-image:url(\'' + esc(img) + '\')"></div>' +
        '<div class="chaabi-sw-gradient"></div>' +
        '<div class="chaabi-sw-content">' +
          '<span class="chaabi-sw-badge">' + esc(badge) + '</span>' +
          '<h3 class="chaabi-sw-title">' + esc(title) + '</h3>' +
          (sub ? '<p class="chaabi-sw-artist">' + esc(sub) + '</p>' : '') +
          '<div class="chaabi-sw-actions">' +
            '<button type="button" class="chaabi-sw-play" data-play-idx="' + idx + '">' +
              '<i class="fas fa-play"></i> ' + esc(swT('listen')) + '</button>' +
            '<button type="button" class="chaabi-sw-more" data-more-idx="' + idx + '" aria-label="' + esc(swT('more')) + '">' +
              '<i class="fas fa-info-circle"></i></button>' +
          '</div>' +
        '</div>' +
        '<div class="chaabi-sw-side">' +
          '<img src="' + esc(img) + '" alt="" loading="lazy" onerror="this.src=\'/music/img_hero/radiochaabi_emissions_1920x600.jpg\'">' +
          '<div class="chaabi-sw-side-meta">' +
            '<strong>' + esc(title) + '</strong>' +
            (sub ? '<span>' + esc(sub) + '</span>' : '') +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function bindPlays(items) {
    var root = d.getElementById('home-swiper');
    if (!root) return;
    root.querySelectorAll('[data-play-idx]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        var i = parseInt(btn.getAttribute('data-play-idx'), 10);
        if (items[i]) playItem(items[i]);
      });
    });
    root.querySelectorAll('[data-more-idx]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        var i = parseInt(btn.getAttribute('data-more-idx'), 10);
        var item = items[i];
        if (!item) return;
        var type = pickType(item);
        if (typeof w.navigateTo === 'function') {
          w.navigateTo(type === 'emission' ? 'emissions' : 'chansons');
        }
      });
    });
    root.querySelectorAll('.chaabi-sw-slide').forEach(function (slide) {
      slide.addEventListener('click', function (e) {
        if (e.target.closest('button')) return;
        var i = parseInt(slide.getAttribute('data-idx'), 10);
        if (items[i]) playItem(items[i]);
      });
    });
  }

  function initSwiper() {
    if (typeof w.Swiper === 'undefined') {
      console.warn('[chaabi-swiper] Swiper non chargé');
      return null;
    }
    if (swiperInstance) {
      try { swiperInstance.destroy(true, true); } catch (e) {}
    }
    swiperInstance = new w.Swiper('#home-swiper', {
      effect: 'fade',
      fadeEffect: { crossFade: true },
      loop: true,
      speed: 600,
      grabCursor: true,
      autoplay: { delay: 5000, disableOnInteraction: false, pauseOnMouseEnter: true },
      pagination: { el: '#home-swiper-pagination', clickable: true },
      navigation: { nextEl: '#home-swiper-next', prevEl: '#home-swiper-prev' },
      keyboard: { enabled: true }
    });
    return swiperInstance;
  }

  function render(items) {
    var wrap = d.getElementById('home-swiper-wrapper');
    if (!wrap) return;
    if (!items.length) {
      wrap.innerHTML = '<div class="swiper-slide chaabi-sw-slide chaabi-sw-empty"><p>' + esc(swT('empty')) + '</p></div>';
      return;
    }
    LAST_ITEMS = items;
    wrap.innerHTML = items.map(slideHtml).join('');
    bindPlays(items);
    setTimeout(initSwiper, 40);
  }

  function fetchList(action, extra) {
    return fetch(api(action, extra), { credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(toList)
      .catch(function (err) {
        if (w.console) console.warn('[chaabi-swiper]', action, err);
        return [];
      });
  }

  function load() {
    // Actions alignées sur l’API réelle (réponse data[] + pagination)
    Promise.all([
      fetchList('get_emissions', '&limit=6&page=1'),
      fetchList('get_chansons', '&limit=6&page=1'),
      // variantes fréquentes
      fetchList('emissions', '&limit=6&page=1'),
      fetchList('chansons', '&limit=6&page=1')
    ]).then(function (lists) {
      var em = lists[0].length ? lists[0] : lists[2];
      var ch = lists[1].length ? lists[1] : lists[3];
      em.forEach(function (x) { x.media_type = 'emission'; });
      ch.forEach(function (x) { x.media_type = 'chanson'; });
      var ordered = [];
      var i = 0, j = 0;
      while (ordered.length < 10 && (i < em.length || j < ch.length)) {
        if (i < em.length) ordered.push(em[i++]);
        if (j < ch.length && ordered.length < 10) ordered.push(ch[j++]);
      }
      render(ordered);
    });
  }

  function boot() {
    if (!d.getElementById('home-swiper')) return;
    load();
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', boot);
  else boot();
  w.chaabiReloadHomeSwiper = load;

  w.addEventListener('chaabi:langchange', function () {
    if (LAST_ITEMS && LAST_ITEMS.length) render(LAST_ITEMS);
  });
  // Compat: si toggleLanguage du site ne dispatch pas l'event
  var _origToggle = w.toggleLanguage;
  if (typeof _origToggle === 'function') {
    w.toggleLanguage = function () {
      var r = _origToggle.apply(this, arguments);
      setTimeout(function () {
        if (LAST_ITEMS && LAST_ITEMS.length) render(LAST_ITEMS);
      }, 50);
      return r;
    };
  }
  // Observe uniquement lang / dir (pas class = thèmes)
  try {
    var lastLang = getLang();
    var mo = new MutationObserver(function () {
      var now = getLang();
      if (now !== lastLang) {
        lastLang = now;
        if (LAST_ITEMS && LAST_ITEMS.length) render(LAST_ITEMS);
      }
    });
    mo.observe(d.documentElement, { attributes: true, attributeFilter: ['lang', 'dir'] });
  } catch (e) {}

})(window, document);
