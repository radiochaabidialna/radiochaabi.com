/**
 * Chaabi — live-bar : afficher TOUTES les qacidates en cours + libellé clair
 * Charger APRÈS assets/js/live.js
 */
(function () {
  function esc(s) {
    if (typeof jsStr === 'function') return jsStr(s);
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function qacidaChip(item) {
    var light = (typeof isLightTheme === 'function') ? isLightTheme() : false;
    var chipStyle = light
      ? 'background:#f5e6c8;border:1px solid #b45309;color:#1c1410'
      : 'background:rgba(245,185,66,0.22);border:1px solid rgba(245,185,66,0.45);color:#fef3c7';
    var chip = 'live-chip glass-chip live-chip--qacida inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs sm:text-[13px] leading-snug transition-colors duration-200 whitespace-nowrap no-underline';
    var isAr = (typeof currentLang !== 'undefined' && currentLang === 'ar');
    var title = (isAr && item.title_ar) ? item.title_ar : (item.title || 'Qacidate');
    var artist = (isAr && item.artist_ar) ? item.artist_ar : (item.artist || '');
    var label = isAr ? 'قصيدة' : 'Qacidate';
    var n = parseInt(item.listeners_count, 10) || 1;
    var countBadge = '<span class="live-chip-count opacity-90 text-[10px] font-bold tabular-nums" title="Auditeurs">×' + n + '</span>';
    var href = item.url || (item.slug ? ('poemes/q/' + encodeURIComponent(item.slug)) : 'poemes/');
    var sub = artist ? (' — <b>' + esc(artist) + '</b>') : '';
    return '<a href="' + esc(href) + '" title="' + esc(label + ' · ' + title + ' — ' + artist) + ' · ' + n + ' auditeur(s)" class="' + chip + '" style="' + chipStyle + '">'
      + '<span class="shrink-0" aria-hidden="true">📜</span>'
      + '<span><span class="opacity-80 font-semibold">' + esc(label) + '</span> · ' + esc(title) + sub + '</span>'
      + countBadge
      + '</a>';
  }

  function patchFormat() {
    if (typeof formatLiveItem !== 'function') {
      setTimeout(patchFormat, 80);
      return;
    }
    if (formatLiveItem._qacidaAll) return;
    var orig = formatLiveItem;
    formatLiveItem = function (item) {
      if (item && item.media_type === 'qacida') return qacidaChip(item);
      /* Pour les autres types : toujours afficher le compteur d’auditeurs si > 0 */
      var html = orig.call(this, item);
      try {
        var n = parseInt(item && item.listeners_count, 10) || 0;
        if (n > 0 && html && html.indexOf('live-chip-count') === -1) {
          html = html.replace(/<\/span>\s*$/, '<span class="live-chip-count opacity-70 text-[10px] font-bold tabular-nums">×' + n + '</span></span>');
        }
      } catch (e) {}
      return html;
    };
    formatLiveItem._qacidaAll = true;
  }

  /** S’assure que loadLiveBar n’écrase pas / limite trop les items */
  function patchLoad() {
    if (typeof loadLiveBar !== 'function') {
      setTimeout(patchLoad, 80);
      return;
    }
    if (loadLiveBar._qacidaAll) return;
    var origLoad = loadLiveBar;
    loadLiveBar = async function () {
      await origLoad.apply(this, arguments);
      /* Re-fetch léger si besoin de forcer le rendu multi-qacidates */
      try {
        var container = document.getElementById('live-bar-items');
        if (!container) return;
        var res = await fetch((window.CHAABI_API || 'api/radiochaabi.php') + '?action=get_live_bar&minutes=15');
        var data = await res.json();
        var items = (data && Array.isArray(data.data)) ? data.data : [];
        if (!items.length) return;
        /* Signature incluant listeners pour rafraîchir si ×N change */
        var sig = (typeof currentLang !== 'undefined' ? currentLang : 'fr') + '|' + items.map(function (i) {
          return i.media_type + '-' + i.media_id + 'x' + (i.listeners_count || 1);
        }).join(',');
        if (container.dataset.sigQ === sig) return;
        container.dataset.sigQ = sig;
        /* Invalider le cache interne de live.js pour forcer rebuild */
        container.dataset.sig = '';
        await origLoad.apply(this, arguments);
      } catch (e) {}
    };
    loadLiveBar._qacidaAll = true;
  }

  function boot() {
    patchFormat();
    patchLoad();
    if (typeof loadLiveBar === 'function') {
      try { loadLiveBar(); } catch (e) {}
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 120); });
  } else {
    setTimeout(boot, 120);
  }
})();
