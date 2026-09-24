/**
 * Qacidates détail — rendu, menu mobile, mini-player, zoom manuscrits
 */
(function (w, d) {
  'use strict';

  var API = 'api/qacidates_api.php';
  var LANG = 'fr';
  var LAST_DATA = null;
  try {
    var sl = localStorage.getItem('chaabi_lang') || localStorage.getItem('rc_lang');
    if (sl === 'ar' || sl === 'fr') LANG = sl;
  } catch (e) {}

  var NAV_I18N = {
    fr: {
      home: 'Accueil', artists: 'Artistes', songs: 'Chansons', shows: 'Émissions',
      interviews: 'Interviews', qacidates: 'Qacidates', proverbs: 'Bouqalla',
      back: 'Retour aux qacidates', onair: 'ON AIR',
      interprete: 'Interprète', auteur: 'Auteur', theme: 'Thème',
      prev: 'Précédent', next: 'Suivant', arabe: 'Arabe'
    },
    ar: {
      home: 'الرئيسية', artists: 'فنانون', songs: 'أغانٍ', shows: 'برامج',
      interviews: 'مقابلات', qacidates: 'قصائد', proverbs: 'بوقالة',
      back: 'العودة إلى القصائد', onair: 'على الهواء',
      interprete: 'المؤدي', auteur: 'المؤلف', theme: 'الموضوع',
      prev: 'السابق', next: 'التالي', arabe: 'عربي'
    }
  };

  function t(k) {
    return (NAV_I18N[LANG] && NAV_I18N[LANG][k]) || (NAV_I18N.fr[k] || k);
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function qs(sel, root) { return (root || d).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || d).querySelectorAll(sel)); }

  /* ── Langue UI ── */
  function applyNavLang() {
    qsa('[data-i18n-nav]').forEach(function (el) {
      var k = el.getAttribute('data-i18n-nav');
      var v = t(k);
      if (!v) return;
      var icon = el.querySelector('i');
      if (icon) el.innerHTML = icon.outerHTML + ' ' + v;
      else el.textContent = v;
    });
    /* Menu mobile + desktop sans data-i18n-nav */
    var map = {
      home: t('home'), artists: t('artists'), songs: t('songs'), shows: t('shows'),
      interviews: t('interviews'), qacidates: t('qacidates'), proverbs: t('proverbs')
    };
    var hrefMap = {
      'index.html#home': 'home', 'index.html#artistes': 'artists', 'index.html#chansons': 'songs',
      'index.html#emissions': 'shows', 'index.html#interviews': 'interviews',
      'qacidates.html': 'qacidates', 'index.html#bouqalla': 'proverbs'
    };
    qsa('#nav-links a, #mobile-menu a').forEach(function (a) {
      var href = (a.getAttribute('href') || '').split('?')[0];
      var key = hrefMap[href];
      if (!key || !map[key]) return;
      var icon = a.querySelector('i');
      a.innerHTML = (icon ? icon.outerHTML + ' ' : '') + map[key];
    });
    d.documentElement.lang = LANG;
    d.documentElement.dir = LANG === 'ar' ? 'rtl' : 'ltr';
    d.documentElement.classList.toggle('lang-ar', LANG === 'ar');
    if (d.body) {
      d.body.dir = LANG === 'ar' ? 'rtl' : 'ltr';
      d.body.classList.toggle('lang-ar', LANG === 'ar');
    }
    var rb = qs('#btn-reading-mode');
    if (rb) {
      var on = d.documentElement.classList.contains('reading-mode');
      rb.textContent = on
        ? (LANG === 'ar' ? 'إنهاء القراءة' : 'Quitter la lecture')
        : (LANG === 'ar' ? 'وضع القراءة' : 'Mode lecture');
    }
  }

  /* ── Menu mobile ── */
  function initMobileMenu() {
    var btn = qs('#btn-menu');
    var menu = qs('#mobile-menu');
    if (!btn || !menu) return;
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var open = !menu.classList.contains('open');
      menu.classList.toggle('open', open);
      menu.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      var ic = btn.querySelector('i');
      if (ic) ic.className = open ? 'fas fa-times' : 'fas fa-bars';
    });
    qsa('#mobile-menu a').forEach(function (a) {
      a.addEventListener('click', function () {
        menu.classList.remove('open', 'is-open');
        btn.setAttribute('aria-expanded', 'false');
        var ic = btn.querySelector('i');
        if (ic) ic.className = 'fas fa-bars';
      });
    });
    d.addEventListener('click', function (e) {
      if (!menu.classList.contains('open') && !menu.classList.contains('is-open')) return;
      if (menu.contains(e.target) || btn.contains(e.target)) return;
      menu.classList.remove('open', 'is-open');
      btn.setAttribute('aria-expanded', 'false');
      var ic = btn.querySelector('i');
      if (ic) ic.className = 'fas fa-bars';
    });
  }

  /* ── Lecture progress ── */
  function initProgress() {
    var bar = qs('#reading-progress');
    if (!bar) return;
    w.addEventListener('scroll', function () {
      var h = d.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var p = max > 0 ? (h.scrollTop / max) * 100 : 0;
      bar.style.width = p + '%';
    }, { passive: true });
  }

  /* ── Back to top ── */
  function initBackTop() {
    var btn = qs('#back-to-top');
    if (!btn) return;
    w.addEventListener('scroll', function () {
      if (w.pageYOffset > 400) btn.classList.add('is-on');
      else btn.classList.remove('is-on');
    }, { passive: true });
    btn.addEventListener('click', function () {
      w.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ── FR blocks ── */
  function parseFr(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try {
        var j = JSON.parse(raw);
        if (Array.isArray(j)) return j;
      } catch (e) {}
      return [{ type: 'normal', texte: raw }];
    }
    return [];
  }

  function renderFr(blocks) {
    blocks = parseFr(blocks);
    if (!blocks.length) return '<p class="fr-block" style="opacity:.5">—</p>';
    return blocks.map(function (b) {
      var txt = (b.texte || b.text || '').replace(/\n/g, '<br>');
      var cls = 'fr-block' + (b.type === 'refrain' ? ' refrain' : '');
      return '<div class="' + cls + '">' + txt + '</div>';
    }).join('');
  }

  function renderAr(sec) {
    var ar = (sec.contenu_ar || '').trim();
    var imgs = sec.images || [];
    if (typeof imgs === 'string') {
      try { imgs = JSON.parse(imgs); } catch (e) { imgs = []; }
    }
    if (!Array.isArray(imgs)) imgs = [];
    // Normalize image paths
    var paths = imgs.map(function (im) {
      if (typeof im === 'string') return im;
      return im.src || im.url || '';
    }).filter(Boolean);

    if (ar) {
      return '<div class="ar-text">' + esc(ar).replace(/\n/g, '<br>') + '</div>';
    }
    if (paths.length) {
      return '<div class="ms-wrap">' + paths.map(function (src, i) {
        if (src.charAt(0) !== '/' && src.indexOf('http') !== 0) src = src;
        return '<img class="ms-img" src="' + esc(src) + '" alt="' + esc(t('arabe')) + '" loading="lazy" decoding="async" data-ms-idx="' + i + '">';
      }).join('') + '</div>';
    }
    return '<p style="opacity:.5">—</p>';
  }

  function isBeautesSection(sec) {
    var lab = ((sec.label_fr || '') + ' ' + (sec.label_ar || '')).toLowerCase();
    return /beauté|beautes|gazelle|أسماء|تعداد|nomm|prénom|زهرة/.test(lab);
  }

  function renderNoms(noms, titleFr, titleAr) {
    if (!noms || !noms.length) return '';
    noms = noms.slice().sort(function (a, b) { return (a.ordre || 0) - (b.ordre || 0); });
    var title = LANG === 'ar' ? (titleAr || titleFr || 'الأسماء') : (titleFr || titleAr || 'Les noms');
    var html = '<section class="q-noms-block"><h3>' + esc(title) + '</h3><ul>';
    noms.forEach(function (n) {
      html += '<li>' + esc(n.emoji || '✨') + ' ';
      if (n.nom_ar) html += '<span dir="rtl">' + esc(n.nom_ar) + '</span>';
      if (n.nom_fr) html += (n.nom_ar ? ' — ' : '') + esc(n.nom_fr);
      if (n.description_fr && LANG !== 'ar') html += ' — <em>' + esc(n.description_fr) + '</em>';
      if (n.description_ar && LANG === 'ar') html += ' — <em dir="rtl">' + esc(n.description_ar) + '</em>';
      html += '</li>';
    });
    html += '</ul>';
    if (LANG === 'ar') html += '<p class="closer" dir="rtl">وخى توصافكم</p>';
    else html += '<p class="closer">Ainsi s\'achève mon éloge.</p>';
    html += '</section>';
    return html;
  }

  function renderSection(sec, idx, noms) {
    var label = LANG === 'ar' && sec.label_ar ? sec.label_ar : (sec.label_fr || ('Partie ' + (sec.numero || idx + 1)));
    var id = 'part-' + (sec.numero || idx + 1);
    var frHtml = renderFr(sec.contenu_fr_parsed || sec.contenu_fr);
    var arHtml = renderAr(sec);
    var nomsHtml = '';
    if (noms && noms.length && isBeautesSection(sec)) {
      nomsHtml = renderNoms(noms, sec.label_fr, sec.label_ar);
      noms = null; // only once
    }
    return {
      html:
        '<section class="part-block" id="' + id + '">' +
          '<h2 class="part-label">' + esc(label) + '</h2>' +
          '<div class="part-grid">' +
            '<div class="col-fr">' + frHtml + '</div>' +
            '<div class="col-ar">' + arHtml + '</div>' +
          '</div>' +
          nomsHtml +
        '</section>',
      usedNoms: !noms
    };
  }

  function renderMiniPlayer(row) {
    var audio = (row.audio || '').trim();
    if (!audio) return '';
    var img = row.image || row.thumbnail || '/music/images/radiochabidialna.jpg';
    var title = LANG === 'ar' && row.titre_ar ? row.titre_ar : (row.titre || '');
    var art = row.interprete || row.artiste || '';
    return (
      '<div class="q-mini-player" id="q-mini-player">' +
        '<img src="' + esc(img) + '" alt="" width="40" height="40" onerror="this.style.opacity=\'.3\'">' +
        '<div class="mp-info">' +
          '<div class="mp-title">' + esc(title) + '</div>' +
          '<div class="mp-sub">' + esc(art) + '</div>' +
        '</div>' +
        '<div class="mp-controls">' +
          '<button type="button" id="mp-play" aria-label="Play"><i class="fas fa-play"></i></button>' +
          '<button type="button" id="mp-mute" aria-label="Mute"><i class="fas fa-volume-high"></i></button>' +
          '<input type="range" id="mp-vol" min="0" max="100" value="80" aria-label="Volume">' +
        '</div>' +
        '<audio id="mp-audio" preload="none" src="' + esc(audio) + '"></audio>' +
      '</div>'
    );
  }

  function wireMiniPlayer() {
    var audio = qs('#mp-audio');
    var play = qs('#mp-play');
    var mute = qs('#mp-mute');
    var vol = qs('#mp-vol');
    if (!audio || !play) return;
    try {
      var v = localStorage.getItem('chaabi_q_vol');
      if (v != null) { audio.volume = parseInt(v, 10) / 100; if (vol) vol.value = v; }
    } catch (e) {}
    play.addEventListener('click', function () {
      if (audio.paused) {
        audio.play().catch(function () {});
        play.innerHTML = '<i class="fas fa-pause"></i>';
      } else {
        audio.pause();
        play.innerHTML = '<i class="fas fa-play"></i>';
      }
    });
    audio.addEventListener('ended', function () {
      play.innerHTML = '<i class="fas fa-play"></i>';
    });
    if (mute) {
      mute.addEventListener('click', function () {
        audio.muted = !audio.muted;
        mute.innerHTML = audio.muted ? '<i class="fas fa-volume-xmark"></i>' : '<i class="fas fa-volume-high"></i>';
      });
    }
    if (vol) {
      vol.addEventListener('input', function () {
        audio.volume = parseInt(vol.value, 10) / 100;
        audio.muted = false;
        try { localStorage.setItem('chaabi_q_vol', vol.value); } catch (e) {}
      });
    }
  }

  /* ── Lightbox manuscrits ── */
  var msList = [];
  var msIdx = 0;
  var msScale = 1, msX = 0, msY = 0;

  function openMs(idx) {
    msIdx = idx;
    var box = qs('#ms-lightbox');
    var img = qs('#ms-lightbox-img');
    var cap = qs('#ms-caption');
    if (!box || !img || !msList[idx]) return;
    img.src = msList[idx];
    if (cap) cap.textContent = (idx + 1) + ' / ' + msList.length;
    msScale = 1; msX = 0; msY = 0;
    img.style.transform = '';
    box.hidden = false;
    box.style.display = 'flex';
  }
  function closeMs() {
    var box = qs('#ms-lightbox');
    if (box) { box.hidden = true; box.style.display = 'none'; }
  }
  function applyMsTransform() {
    var img = qs('#ms-lightbox-img');
    if (img) img.style.transform = 'translate(' + msX + 'px,' + msY + 'px) scale(' + msScale + ')';
  }

  function initLightbox() {
    var box = qs('#ms-lightbox');
    if (!box) return;
    var close = qs('#ms-close');
    var prev = qs('#ms-prev');
    var next = qs('#ms-next');
    var zin = qs('#ms-zoom-in');
    var zout = qs('#ms-zoom-out');
    var zreset = qs('#ms-zoom-reset');
    var stage = qs('#ms-stage');
    if (close) close.onclick = closeMs;
    box.addEventListener('click', function (e) { if (e.target === box) closeMs(); });
    if (prev) prev.onclick = function () { openMs((msIdx - 1 + msList.length) % msList.length); };
    if (next) next.onclick = function () { openMs((msIdx + 1) % msList.length); };
    if (zin) zin.onclick = function () { msScale = Math.min(4, msScale + 0.25); applyMsTransform(); };
    if (zout) zout.onclick = function () { msScale = Math.max(0.5, msScale - 0.25); applyMsTransform(); };
    if (zreset) zreset.onclick = function () { msScale = 1; msX = 0; msY = 0; applyMsTransform(); };
    d.addEventListener('keydown', function (e) {
      if (box.hidden) return;
      if (e.key === 'Escape') closeMs();
      if (e.key === 'ArrowLeft') openMs((msIdx - 1 + msList.length) % msList.length);
      if (e.key === 'ArrowRight') openMs((msIdx + 1) % msList.length);
    });
    if (stage) {
      stage.addEventListener('wheel', function (e) {
        e.preventDefault();
        msScale = Math.min(4, Math.max(0.5, msScale + (e.deltaY < 0 ? 0.15 : -0.15)));
        applyMsTransform();
      }, { passive: false });
      var drag = false, lx = 0, ly = 0;
      stage.addEventListener('mousedown', function (e) { drag = true; lx = e.clientX; ly = e.clientY; });
      w.addEventListener('mouseup', function () { drag = false; });
      w.addEventListener('mousemove', function (e) {
        if (!drag) return;
        msX += e.clientX - lx; msY += e.clientY - ly;
        lx = e.clientX; ly = e.clientY;
        applyMsTransform();
      });
    }
    // Délégation clic images
    d.addEventListener('click', function (e) {
      var img = e.target.closest && e.target.closest('.ms-img');
      if (!img) return;
      e.preventDefault();
      var src = img.getAttribute('src');
      var idx = msList.indexOf(src);
      if (idx < 0) { msList.push(src); idx = msList.length - 1; }
      openMs(idx);
    });
  }

  function collectMsImages(root) {
    msList = [];
    qsa('.ms-img', root).forEach(function (img) {
      var s = img.getAttribute('src');
      if (s && msList.indexOf(s) < 0) msList.push(s);
    });
  }

  /* ── Render page ── */
  function render(data) {
    LAST_DATA = data;
    var status = qs('#status');
    var content = qs('#content');
    if (!data) {
      if (status) status.textContent = 'Qacidate introuvable';
      return;
    }
    var title = LANG === 'ar' && data.titre_ar ? data.titre_ar : (data.titre || '');
    var titleAr = data.titre_ar || '';
    d.title = title + ' — Chaabi Music';

    var hTitle = qs('#h-title');
    var hAr = qs('#h-ar');
    var hMeta = qs('#h-meta');
    var hPhoto = qs('#hero-photo');
    if (hTitle) hTitle.textContent = data.titre || title;
    if (hAr) hAr.textContent = titleAr;
    if (hPhoto && data.image) {
      hPhoto.src = data.image;
      hPhoto.alt = data.interprete || '';
    }
    if (hMeta) {
      var art = data.interprete || data.artiste || '';
      var artAr = data.interprete_ar || data.artiste_ar || '';
      var aut = data.auteur || '';
      var autAr = data.auteur_ar || '';
      var th = data.theme || data.genre || '';
      var thAr = data.theme_ar || '';
      var showArt = LANG === 'ar' && artAr ? artAr : art;
      var showAut = LANG === 'ar' && autAr ? autAr : aut;
      var showTh = LANG === 'ar' && thAr ? thAr : th;
      var parts = [];
      if (showArt) parts.push('<span><i class="fas fa-microphone"></i> <em class="meta-lbl">' + esc(t('interprete')) + '</em> ' + esc(showArt) + '</span>');
      if (showAut) parts.push('<span><i class="fas fa-pen-fancy"></i> <em class="meta-lbl">' + esc(t('auteur')) + '</em> ' + esc(showAut) + '</span>');
      if (showTh) parts.push('<span><i class="fas fa-tag"></i> <em class="meta-lbl">' + esc(t('theme')) + '</em> ' + esc(showTh) + '</span>');
      hMeta.innerHTML = parts.join('');
    }

    var sections = data.sections || [];
    var noms = data.noms || [];
    var nomsUsed = false;
    var html = '';
    sections.forEach(function (sec, i) {
      var r = renderSection(sec, i, nomsUsed ? null : noms);
      html += r.html;
      if (r.usedNoms) nomsUsed = true;
    });
    if (!nomsUsed && noms.length) {
      html += renderNoms(noms, null, null);
    }

    // Facts
    var facts = data.facts || [];
    if (facts.length) {
      html += '<div class="facts-row">';
      facts.forEach(function (f) {
        html += '<div class="fact-card">';
        if (f.icone) html += '<i class="fas ' + esc(f.icone) + '"></i>';
        html += '<div class="ft">' + esc(f.titre || '') + '</div>';
        html += '<div class="fv">' + esc(f.valeur || '') + '</div></div>';
      });
      html += '</div>';
    }

    // Nav prev/next
    var nav = data.navigation || data.nav || null;
    if (nav && (nav.prev_slug || nav.next_slug || nav.slug_prev || nav.slug_next)) {
      var pSlug = nav.prev_slug || nav.slug_prev;
      var nSlug = nav.next_slug || nav.slug_next;
      var pTitle = nav.prev_titre || nav.titre_prev || pSlug;
      var nTitle = nav.next_titre || nav.titre_next || nSlug;
      html += '<div class="nav-prevnext">';
      if (pSlug) html += '<a href="?slug=' + encodeURIComponent(pSlug) + '"><div class="np-lbl">' + esc(t('prev')) + '</div><div class="np-title">' + esc(pTitle) + '</div></a>';
      else html += '<div></div>';
      if (nSlug) html += '<a href="?slug=' + encodeURIComponent(nSlug) + '"><div class="np-lbl">' + esc(t('next')) + '</div><div class="np-title">' + esc(nTitle) + '</div></a>';
      html += '</div>';
    }

    html += renderMiniPlayer(data);

    if (status) status.hidden = true;
    if (content) {
      content.innerHTML = html;
      content.hidden = false;
    }

    // Anchors
    var anchorNav = qs('#anchor-nav');
    var anchorLinks = qs('#anchor-links');
    if (anchorNav && anchorLinks && sections.length) {
      anchorLinks.innerHTML = sections.map(function (sec, i) {
        var label = LANG === 'ar' && sec.label_ar ? sec.label_ar : (sec.label_fr || String(sec.numero || i + 1));
        var id = 'part-' + (sec.numero || i + 1);
        return '<a href="#' + id + '">' + esc(label) + '</a>';
      }).join('');
      anchorNav.hidden = false;
    }

    collectMsImages(content);
    wireMiniPlayer();

    // Track view
    if (data.id) {
      try {
        fetch(API + '?action=track_view', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: data.id })
        }).catch(function () {});
      } catch (e) {}
    }
  }

  function load() {
    var params = new URLSearchParams(w.location.search);
    var slug = params.get('slug') || '';
    var status = qs('#status');
    if (!slug) {
      if (status) status.innerHTML = 'Aucune qacidate. <a href="qacidates.html">Retour à la liste</a>';
      return;
    }
    fetch(API + '?action=get&slug=' + encodeURIComponent(slug) + '&_t=' + Date.now(), { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j && j.error) throw new Error(j.error);
        var data = j.data || j;
        if (data && data.qacidate) data = Object.assign({}, data.qacidate, data);
        render(data);
      })
      .catch(function (err) {
        if (status) status.textContent = 'Erreur : ' + (err.message || err);
      });
  }

  /* ── Lang button ── */
  function initLangBtn() {
    var btn = qs('#btn-lang');
    if (!btn) return;
    btn.textContent = LANG === 'ar' ? 'FR' : 'ع';
    btn.addEventListener('click', function () {
      LANG = LANG === 'ar' ? 'fr' : 'ar';
      try {
        localStorage.setItem('chaabi_lang', LANG);
        localStorage.setItem('rc_lang', LANG);
      } catch (e) {}
      applyNavLang();
      btn.textContent = LANG === 'ar' ? 'FR' : 'ع';
      /* Re-rendu immédiat sans attendre le réseau */
      if (LAST_DATA) render(LAST_DATA);
      else load();
      load();
      /* Footer + i18n global (sans recharger la page) */
      try {
        w.dispatchEvent(new CustomEvent('chaabi:langchange', { detail: { lang: LANG } }));
      } catch (e) {}
      if (typeof w.refreshFooter === 'function') {
        try { w.refreshFooter(LANG); } catch (e1) {
          try { w.refreshFooter(); } catch (e2) {}
        }
      }
      if (typeof w.setLanguage === 'function') {
        try { w.setLanguage(LANG); } catch (e) {}
      }
      if (typeof w.applyI18n === 'function') {
        try { w.applyI18n(LANG); } catch (e) {}
      }
      if (typeof w.updateFooterLang === 'function') {
        try { w.updateFooterLang(LANG); } catch (e) {}
      }
      // Recharge le script footer s'il expose un init
      if (typeof w.initFooter === 'function') {
        try { w.initFooter(LANG); } catch (e) {}
      }
      // Fallback : relire le HTML du footer-root via attribut data
      var fr = d.getElementById('footer-root');
      if (fr) {
        fr.setAttribute('data-lang', LANG);
        // bascule textes data-i18n / data-i18n-ar si présents
        fr.querySelectorAll('[data-i18n],[data-i18n-fr],[data-i18n-ar]').forEach(function (el) {
          var ar = el.getAttribute('data-i18n-ar');
          var frt = el.getAttribute('data-i18n-fr') || el.getAttribute('data-i18n');
          if (LANG === 'ar' && ar) el.textContent = ar;
          else if (frt) el.textContent = frt;
        });
        fr.querySelectorAll('[data-i18n-html-ar],[data-i18n-html-fr]').forEach(function (el) {
          var ar = el.getAttribute('data-i18n-html-ar');
          var frt = el.getAttribute('data-i18n-html-fr');
          if (LANG === 'ar' && ar) el.innerHTML = ar;
          else if (frt) el.innerHTML = frt;
        });
      }
    });
  }

  function init() {
    applyNavLang();
    initMobileMenu();
    initProgress();
    initBackTop();
    initLightbox();
    initLangBtn();
    load();
  }

  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', init);
  else init();
})(window, document);
