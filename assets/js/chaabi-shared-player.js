/**
 * Chaabi — player unifié index ↔ poemes
 * localStorage: chaabi_shared_player_v1
 * Charger APRÈS player.js
 */
(function () {
  var KEY = 'chaabi_shared_player_v1';

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; }
  }
  function save(payload) {
    try {
      localStorage.setItem(KEY, JSON.stringify(Object.assign({ t: Date.now() }, payload || {})));
    } catch (e) {}
  }

  window.ChaabiSharedPlayer = { KEY: KEY, save: save, load: load };

  function setFloatingMeta(data) {
    var titleEl = document.getElementById('fp-title');
    var artistEl = document.getElementById('fp-artist');
    var imgEl = document.getElementById('fp-img');
    var typeEl = document.getElementById('fp-type');
    var player = document.getElementById('floating-player');
    if (titleEl) {
      titleEl.textContent = data.title || 'Lecture';
      titleEl.setAttribute('title', data.title || '');
    }
    if (artistEl) {
      artistEl.textContent = data.artist || '';
      artistEl.setAttribute('title', data.artist || '');
    }
    if (imgEl && data.image) imgEl.src = data.image;
    if (typeEl) {
      typeEl.textContent = data.source === 'poemes' ? 'Qacidate' : (data.media_type || '');
      typeEl.classList.toggle('hidden', !(data.source === 'poemes' || data.media_type));
    }
    if (player) player.classList.remove('hidden');
  }

  function hookMainPlayer() {
    var audio = document.getElementById('fp-audio');
    if (!audio || audio._chaabiSharedHooked) return;
    audio._chaabiSharedHooked = true;

    function snapshot(extra) {
      var titleEl = document.getElementById('fp-title');
      var artistEl = document.getElementById('fp-artist');
      var imgEl = document.getElementById('fp-img');
      save(Object.assign({
        url: audio.currentSrc || audio.src || '',
        title: titleEl ? titleEl.textContent : '',
        artist: artistEl ? artistEl.textContent : '',
        image: imgEl ? imgEl.src : '',
        source: 'radio',
        position: audio.currentTime || 0,
        paused: !!audio.paused
      }, extra || {}));
    }

    audio.addEventListener('play', function () { snapshot({ paused: false }); });
    audio.addEventListener('pause', function () { snapshot({ paused: true }); });
    audio.addEventListener('timeupdate', function () {
      if (Math.floor(audio.currentTime) % 5 === 0) snapshot({ paused: audio.paused });
    });
  }

  function resumeFromPoemes() {
    var data = load();
    if (!data || !data.url) return;
    if (data.source !== 'poemes') return;
    if (data.t && (Date.now() - data.t) > 2 * 60 * 60 * 1000) return;

    var audio = document.getElementById('fp-audio');
    if (!audio) return;

    setFloatingMeta(data);

    /* Si déjà en lecture autre piste, ne pas écraser */
    if (!audio.paused && audio.src && audio.src !== data.url && audio.currentSrc !== data.url) return;

    if (!audio.src || (audio.currentSrc !== data.url && audio.src !== data.url)) {
      audio.src = data.url;
    }
    if (data.position && data.position > 1) {
      var seek = function () {
        try { audio.currentTime = data.position; } catch (e) {}
      };
      if (audio.readyState >= 1) seek();
      else audio.addEventListener('loadedmetadata', function once() {
        audio.removeEventListener('loadedmetadata', once);
        seek();
      });
    }
    /* Reprise auto si n’était pas en pause */
    if (!data.paused) {
      var p = audio.play();
      if (p && p.catch) p.catch(function () { /* autoplay bloqué : user clique play */ });
    }
  }

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function () {
    hookMainPlayer();
    setTimeout(resumeFromPoemes, 350);
  });

  /* Storage event : autre onglet / retour poemes */
  window.addEventListener('storage', function (e) {
    if (e.key === KEY) setTimeout(resumeFromPoemes, 100);
  });
})();
