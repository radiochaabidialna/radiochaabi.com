/**
 * Live-bar + dédicaces — pages qacidates
 */
(function (w, d) {
  'use strict';
  var API = (w.CHAABI_API || 'api/radiochaabi.php').split('?')[0];
  function api(action) {
    return API + '?action=' + encodeURIComponent(action) + '&_=' + Date.now();
  }
  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }
  function double(el) {
    if (!el) return;
    var html = el.innerHTML.trim();
    if (!html) return;
    el.innerHTML = html + html;
  }

  function fillLive(items) {
    var ticker = d.getElementById('liveTicker') || d.getElementById('live-bar-track');
    if (!ticker) return;
    if (!items || !items.length) {
      ticker.innerHTML = '<span class="live-empty">Aucun média en lecture</span>';
      return;
    }
    var parts = items.map(function (i) {
      var title = (i.title || i.titre || '').trim();
      var artist = (i.artist || i.artiste || i.artiste_nom || '').trim();
      var label;
      if (i.media_type === 'emission') {
        label = '📻 ' + (title || 'Émission');
      } else if (i.media_type === 'interview') {
        label = '🎤 ' + (artist || title || 'Interview');
      } else {
        label = artist && title ? '🎵 ' + title + ' — ' + artist : '🎵 ' + (title || artist || 'Chaabi');
      }
      return '<span class="live-chip">' + esc(label) + '</span>';
    });
    var sep = '<span style="opacity:.5;padding:0 8px">★</span>';
    var html = parts.join(sep) + sep;
    ticker.innerHTML = html + html;
  }

  function loadLive() {
    fetch(api('get_live_bar') + '&minutes=15', { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var list = data.data || data.items || [];
        if (list.length) fillLive(list);
      })
      .catch(function () {});
  }

  function loadDedicaces() {
    var bar = d.getElementById('dedicaces-bar');
    var track = d.getElementById('dedicaces-ticker-items');
    if (!track) return;
    fetch(api('get_last_dedicaces'), { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var list = data.data || data.dedicaces || [];
        if (!list.length) {
          track.innerHTML = '<span class="live-empty">✦ Aucune dédicace</span>';
        } else {
          track.innerHTML = list.map(function (x) {
            var from = x.nom || x.from || '';
            var to = x.pour || x.to || '';
            var msg = x.description || x.message || '';
            return '<span>✦ <strong>' + esc(from) + '</strong>' +
              (to ? ' → ' + esc(to) : '') +
              (msg ? ' — ' + esc(msg) : '') + '</span>';
          }).join('');
          double(track);
        }
        if (bar) bar.classList.add('is-on');
      })
      .catch(function () {
        track.innerHTML = '<span class="live-empty">✦ Dédicaces indisponibles</span>';
        if (bar) bar.classList.add('is-on');
      });
  }

  function init() {
    loadLive();
    loadDedicaces();
    setInterval(loadLive, 30000);
    setInterval(loadDedicaces, 60000);
    var btn = d.getElementById('liveMiniPlay');
    if (btn) {
      btn.hidden = false;
      btn.onclick = function () {
        w.location.href = 'index.html#onair';
      };
    }
  }

  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', init);
  else init();
})(window, document);
