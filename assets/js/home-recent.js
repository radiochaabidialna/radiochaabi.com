/**
 * Écoutés récemment / Favoris — rendu ordonné & uniforme
 * v=20260926recent
 */
(function () {
  var DEFAULT_IMG = '/music/images/chaabidialna.png';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function getHistory() {
    var h = (typeof PLAY_HISTORY !== 'undefined' && Array.isArray(PLAY_HISTORY)) ? PLAY_HISTORY : null;
    if (h && h.length) return h;
    try {
      var raw = localStorage.getItem('chaabi_play_history') || localStorage.getItem('PLAY_HISTORY') || '[]';
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function normalize(item) {
    if (!item || typeof item !== 'object') return null;
    return {
      title: item.title || item.titre || item.name || 'Sans titre',
      artist: item.artist || item.artiste || item.artiste_nom || item.author || '',
      img: item.img || item.image || item.cover || DEFAULT_IMG,
      url: item.url || item.audio || item.src || '',
      id: item.id || item.media_id || null,
      type: item.type || item.media_type || 'chanson',
      t: item.t || item.ts || item.time || 0
    };
  }

  function dedupeNewestFirst(list) {
    var seen = {};
    var out = [];
    // newest last in PLAY_HISTORY typically → reverse
    var arr = list.slice().reverse();
    for (var i = 0; i < arr.length; i++) {
      var n = normalize(arr[i]);
      if (!n) continue;
      var key = (n.id != null ? String(n.id) : '') + '|' + n.title + '|' + n.artist;
      if (seen[key]) continue;
      seen[key] = true;
      out.push(n);
      if (out.length >= 12) break;
    }
    return out;
  }

  function chipHtml(item, idx) {
    return (
      '<button type="button" class="recent-chip" data-recent-idx="' + idx + '" data-audio="' + esc(item.url) + '" title="' + esc(item.title) + '">' +
        '<img src="' + esc(item.img) + '" alt="" width="42" height="42" loading="lazy" decoding="async" onerror="this.src=\'' + DEFAULT_IMG + '\'">' +
        '<span class="recent-chip-text">' +
          '<span class="rc-title t">' + esc(item.title) + '</span>' +
          '<span class="rc-artist a">' + esc(item.artist) + '</span>' +
        '</span>' +
      '</button>'
    );
  }

  function bindPlay(container, items) {
    if (!container) return;
    container.onclick = function (e) {
      var btn = e.target.closest('.recent-chip');
      if (!btn) return;
      var i = parseInt(btn.getAttribute('data-recent-idx'), 10);
      var item = items[i];
      if (!item) return;
      if (typeof playHistoryAt === 'function') {
        try { playHistoryAt(i); return; } catch (err) {}
      }
      // fallback floating player
      var audio = document.getElementById('fp-audio');
      var titleEl = document.getElementById('fp-title');
      var artistEl = document.getElementById('fp-artist');
      var imgEl = document.getElementById('fp-img');
      var player = document.getElementById('floating-player');
      if (titleEl) titleEl.textContent = item.title;
      if (artistEl) artistEl.textContent = item.artist;
      if (imgEl && item.img) imgEl.src = item.img;
      if (player) player.classList.remove('hidden');
      if (audio && item.url) {
        audio.src = item.url;
        var p = audio.play();
        if (p && p.catch) p.catch(function () {});
      }
    };
  }

  window.renderRecentPlayed = function renderRecentPlayed() {
    var wrap = document.getElementById('home-recent-wrap');
    var box = document.getElementById('home-recent');
    if (!box) return;
    var items = dedupeNewestFirst(getHistory());
    if (!items.length) {
      if (wrap) wrap.classList.add('hidden');
      box.innerHTML = '';
      return;
    }
    if (wrap) wrap.classList.remove('hidden');
    box.innerHTML = items.map(chipHtml).join('');
    bindPlay(box, items);
  };

  window.renderHomeFavorites = window.renderHomeFavorites || function () {
    var wrap = document.getElementById('home-fav-wrap');
    var box = document.getElementById('home-fav');
    if (!box) return;
    var favs = [];
    try {
      if (typeof getFavorites === 'function') favs = getFavorites() || [];
      else {
        var raw = localStorage.getItem('chaabi_favorites') || localStorage.getItem('FAVORITES') || '[]';
        favs = JSON.parse(raw);
      }
    } catch (e) { favs = []; }
    if (!Array.isArray(favs) || !favs.length) {
      if (wrap) wrap.classList.add('hidden');
      box.innerHTML = '';
      return;
    }
    var items = favs.slice(0, 12).map(normalize).filter(Boolean);
    if (wrap) wrap.classList.remove('hidden');
    box.innerHTML = items.map(chipHtml).join('');
    bindPlay(box, items);
  };

  function boot() {
    try { window.renderRecentPlayed(); } catch (e) {}
    try { window.renderHomeFavorites(); } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  // re-render after player may fill PLAY_HISTORY
  setTimeout(boot, 800);
  setTimeout(boot, 2000);
})();
