/**
 * Rendu qacidate_noms — schéma chaabi_music_qacidats_v1
 * emoji | nom_ar | nom_fr | description_fr | description_ar | ordre
 */
(function (w) {
  'use strict';
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function val(r, k) {
    var v = r[k];
    return v != null && String(v).trim() !== '' ? String(v).trim() : '';
  }
  function isSummaryJunk(noms) {
    if (!noms || !noms.length) return true;
    if (noms.length === 1) {
      var t = val(noms[0], 'nom_fr') + ' ' + val(noms[0], 'description_fr');
      return /éloge de leurs prénoms|Allah vous a comblées/i.test(t);
    }
    return false;
  }
  /**
   * Appeler APRÈS les sections du poème.
   * el.insertAdjacentHTML('beforeend', renderQacidateNoms(data.noms));
   */
  w.renderQacidateNoms = function (noms) {
    if (!noms || !noms.length || isSummaryJunk(noms)) return '';
    var rows = noms.slice().sort(function (a, b) {
      return (parseInt(a.ordre, 10) || 0) - (parseInt(b.ordre, 10) || 0);
    });
    var h = '<section class="q-noms-block">';
    h += '<h3 class="q-noms-title">';
    h += '<span class="ar" dir="rtl" lang="ar">الأسماء المباركة — الغزلان المسمّاة</span>';
    h += '<span class="fr">Les Gazelles Nommées</span></h3>';
    h += '<ul class="q-noms-list">';
    rows.forEach(function (r) {
      var ar = val(r, 'nom_ar');
      var fr = val(r, 'nom_fr');
      var dfr = val(r, 'description_fr');
      var dar = val(r, 'description_ar');
      var em = val(r, 'emoji') || '✨';
      if (!ar && !fr) return;
      h += '<li class="q-noms-item">';
      h += '<span class="q-noms-emoji" aria-hidden="true">' + esc(em) + '</span>';
      h += '<div class="q-noms-body">';
      if (ar) h += '<p class="q-noms-ar" dir="rtl" lang="ar">' + esc(ar) + '</p>';
      if (fr) h += '<p class="q-noms-fr">' + esc(fr) + (dfr ? ' — ' + esc(dfr) : '') + '</p>';
      else if (dfr) h += '<p class="q-noms-fr">' + esc(dfr) + '</p>';
      if (dar) h += '<p class="q-noms-ar-desc" dir="rtl" lang="ar">' + esc(dar) + '</p>';
      h += '</div></li>';
    });
    h += '</ul>';
    h += '<p class="q-noms-closing" dir="rtl" lang="ar">وخى توصافكم</p>';
    h += '<p class="q-noms-closing-fr">Ainsi s\'achève mon éloge.</p>';
    h += '</section>';
    return h;
  };
})(window);
