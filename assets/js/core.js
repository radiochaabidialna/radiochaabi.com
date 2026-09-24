/**
 * Chaabi Music Pro — module core (état + utilitaires globaux)
 * Chargé en premier (defer). Les onclick HTML s'appuient sur window.*.
 */
'use strict';

/* ── State ── */
var currentTab = 'home';
var currentPage = 1;
var currentLang = (function () {
    try {
        var s = localStorage.getItem('chaabi_lang');
        if (s === 'ar' || s === 'fr') return s;
    } catch (_) {}
    return 'fr';
})();

var MEDIA_BASE = '/music/';
var DEFAULT_IMG = (typeof MEDIA_BASE === 'string' ? MEDIA_BASE : '/music/') + 'images/chaabidialna.png';

/** URL publique pour les liens de partage (jamais localhost) */
var SHARE_ORIGIN = 'https://radiochaabi.com';
var SHARE_PATH = '/index.html';

function getShareBase() {
    return SHARE_ORIGIN + SHARE_PATH;
}
function getSharePlayUrl(type, id) {
    return getShareBase() + '#play/' + encodeURIComponent(type) + '/' + id;
}
function getShareDetailUrl(kind, id) {
    return getShareBase() + '#' + encodeURIComponent(kind) + '/' + id;
}

/* ── Chemins médias ── */
/** Placeholder uniquement si l’image échoue au chargement (pas injecté si chemin vide) */
var IMG_FALLBACK = 'assets/img_hero/onair.png';

/**
 * Construit une URL média. Ne force JAMAIS une image par défaut.
 * Chemin vide → chaîne vide (l’UI / onerror gère le fallback).
 */
function formatPath(path) {
    if (path == null || path === '' || path === false) return '';
    path = String(path).trim();
    if (!path) return '';
    if (path.indexOf('http://') === 0 || path.indexOf('https://') === 0 || path.charAt(0) === '/') return path;
    if (path.indexOf('assets/') === 0) return path;
    return MEDIA_BASE + path.replace(/^\//, '');
}

/**
 * Première image valide parmi les candidats.
 * Ignore le logo site (chaabidialna) s’il reste d’autres options.
 * Si rien de valide → '' (pas de fausse image unique).
 */
function resolveMediaImage() {
    var logoRe = /chaabidialna\.(png|jpe?g|webp)$/i;
    for (var i = 0; i < arguments.length; i++) {
        var p = arguments[i];
        if (p == null || p === '') continue;
        var url = formatPath(p);
        if (!url) continue;
        if (logoRe.test(url)) continue;
        return url;
    }
    return '';
}
window.resolveMediaImage = resolveMediaImage;
window.IMG_FALLBACK = IMG_FALLBACK;
window.formatPath = formatPath;



/**
 * Balise <img> responsive + lazy loading
 * priority: 'high' → eager (above-the-fold / featured / détail)
 * sinon → loading="lazy" + classe js-lazy
 */
function responsiveImg(src, opts) {
    opts = opts || {};
    var url = formatPath(src);
    if (!url) url = (typeof IMG_FALLBACK !== 'undefined' ? IMG_FALLBACK : '');
    var alt = opts.alt != null ? String(opts.alt) : '';
    var baseCls = opts.className || opts.class || 'w-full h-full object-cover';
    var isHigh = opts.priority === 'high';
    var cls = (baseCls + (isHigh ? '' : ' js-lazy') + ' chaabi-img').replace(/\s+/g, ' ').trim();
    var sizes = opts.sizes || '(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 200px';
    var w = opts.width || 360;
    var h = opts.height || 360;
    var lazy = isHigh ? 'eager' : 'lazy';
    var fetchp = isHigh ? ' fetchpriority="high"' : '';
    var extra = opts.extra || '';
    return '<img src="' + jsStr(url) + '" sizes="' + jsStr(sizes) + '"'
        + ' width="' + w + '" height="' + h + '"'
        + ' alt="' + jsStr(alt) + '"'
        + ' loading="' + lazy + '" decoding="async"' + fetchp
        + ' class="' + jsStr(cls) + '"'
        + ' style="aspect-ratio:' + w + '/' + h + ';background:#0f172a"'
        + (extra ? ' ' + extra : '')
        + ' onerror="this.onerror=null;this.src=\'' + jsStr(typeof IMG_FALLBACK !== 'undefined' ? IMG_FALLBACK : DEFAULT_IMG) + '\'">';
}

function supportsNativeLazy() {
    try {
        return 'loading' in HTMLImageElement.prototype;
    } catch (_) {
        return false;
    }
}

var _lazyObserver = null;
function ensureLazyObserver() {
    if (_lazyObserver) return _lazyObserver;
    if (!('IntersectionObserver' in window)) return null;
    _lazyObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            var img = entry.target;
            var ds = img.getAttribute('data-src');
            if (ds) {
                img.src = ds;
                img.removeAttribute('data-src');
            }
            img.classList.remove('js-lazy-pending');
            img.classList.add('js-lazy-loaded');
            _lazyObserver.unobserve(img);
        });
    }, { rootMargin: '320px 0px', threshold: 0.01 });
    return _lazyObserver;
}

/**
 * Après rendu d'une liste / home :
 * - les `eagerCount` premières images → eager (above the fold)
 * - le reste → lazy natif, ou IntersectionObserver en secours
 */
function initLazyImages(root, eagerCount) {
    root = root || document;
    // Moins d'images eager sur 2G/3G ou data-saver
    if (eagerCount == null) {
        eagerCount = 6;
        try {
            var c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            if (c) {
                if (c.saveData) eagerCount = 2;
                else if (/2g/i.test(c.effectiveType || '')) eagerCount = 2;
                else if (/3g/i.test(c.effectiveType || '')) eagerCount = 4;
            }
            if (window.matchMedia && window.matchMedia('(max-width:640px)').matches) {
                eagerCount = Math.min(eagerCount, 4);
            }
        } catch (_) {}
    }
    var imgs = root.querySelectorAll ? root.querySelectorAll('img.js-lazy, img[loading="lazy"]') : [];
    if (!imgs.length) return;

    var native = supportsNativeLazy();
    var obs = native ? null : ensureLazyObserver();

    Array.prototype.forEach.call(imgs, function (img, i) {
        // évite re-init
        if (img.dataset.lazyInit === '1') return;
        img.dataset.lazyInit = '1';

        if (i < eagerCount) {
            img.loading = 'eager';
            if (i === 0) try { img.setAttribute('fetchpriority', 'high'); } catch (_) {}
            img.classList.remove('js-lazy', 'js-lazy-pending');
            var ds0 = img.getAttribute('data-src');
            if (ds0) {
                img.src = ds0;
                img.removeAttribute('data-src');
            }
            return;
        }
        if (native) {
            img.loading = 'lazy';
            img.setAttribute('decoding', 'async');
            return;
        }
        if (img.src && !img.getAttribute('data-src') && img.src.indexOf('data:') !== 0) {
            img.setAttribute('data-src', img.src);
            img.removeAttribute('src');
            img.classList.add('js-lazy-pending');
        }
        if (obs) obs.observe(img);
    });
}

/* ── Libellés type média (FR/AR) ── */
function mediaTypeTitle(type) {
    var lang = 'fr';
    try {
        if (typeof window !== 'undefined' && (window.currentLang === 'ar' || window.currentLang === 'fr')) lang = window.currentLang;
        else if (typeof currentLang !== 'undefined' && (currentLang === 'ar' || currentLang === 'fr')) lang = currentLang;
    } catch (_) {}
    var t = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang] : {};
    var map = {
        interview: t.interview_label || (lang === 'ar' ? 'مقابلة' : 'Interview'),
        emission: t.show_label || (lang === 'ar' ? 'برنامج' : 'Émission'),
        chanson: t.songs ? (lang === 'ar' ? 'أغنية' : 'Chanson') : (lang === 'ar' ? 'أغنية' : 'Chanson'),
        artiste: t.artists ? (lang === 'ar' ? 'فنان' : 'Artiste') : (lang === 'ar' ? 'فنان' : 'Artiste')
    };
    return map[type] || (type || '');
}
window.mediaTypeTitle = mediaTypeTitle;

/* ── Champs bilingues ── */
function getFld(item, base) {
    if (!item) return '';
    // Toujours la langue courante (window + variable globale)
    var lang = 'fr';
    try {
        if (typeof window !== 'undefined' && (window.currentLang === 'ar' || window.currentLang === 'fr')) lang = window.currentLang;
        else if (typeof currentLang !== 'undefined' && (currentLang === 'ar' || currentLang === 'fr')) lang = currentLang;
    } catch (_) {}
    var arVal = item[base + '_ar'];
    var frVal = item[base];
    // Accepte string non vide (évite null / "  ")
    var hasAr = arVal != null && String(arVal).trim() !== '';
    var hasFr = frVal != null && String(frVal).trim() !== '';
    if (lang === 'ar' && hasAr) return String(arVal).trim();
    if (hasFr) return String(frVal).trim();
    if (hasAr) return String(arVal).trim();
    return '';
}

/* ── Échappement HTML / attributs ── */
function jsStr(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/\n/g, ' ');
}
function jsAttr(s) {
    return jsStr(s).replace(/'/g, "\\'");
}
function jsonAttr(v) {
    return JSON.stringify(v == null ? '' : v).replace(/"/g, '&quot;');
}

/* ── Session auditeur ── */
function getSessionId() {
    try {
        var s = localStorage.getItem('chaabi_session');
        if (!s) {
            s = (window.crypto && crypto.randomUUID)
                ? crypto.randomUUID()
                : ('s-' + Date.now() + '-' + Math.random().toString(36).slice(2));
            localStorage.setItem('chaabi_session', s);
        }
        return s;
    } catch (_) {
        return 's-' + Date.now();
    }
}

/* ── Fetch JSON sûr ── */
async function safeFetch(url, options) {
    try {
        var res = await fetch(url, options || {});
        if (!res.ok) {
            if (window.CHAABI_DEBUG) console.warn('[Chaabi] HTTP', res.status, url);
            return null;
        }
        return await res.json();
    } catch (e) {
        if (window.CHAABI_DEBUG) console.warn('[Chaabi] safeFetch', url, e && e.message ? e.message : e);
        return null;
    }
}

/* ── Toasts ── */
function showToast(message, type) {
    type = type || 'info';
    var root = document.getElementById('toast-root');
    if (!root) {
        root = document.createElement('div');
        root.id = 'toast-root';
        root.className = 'toast-host';
        root.setAttribute('aria-live', 'polite');
        root.setAttribute('role', 'status');
        document.body.appendChild(root);
    }
    var icons = {
        success: 'fa-circle-check',
        error: 'fa-circle-xmark',
        info: 'fa-circle-info',
        warn: 'fa-triangle-exclamation'
    };
    var el = document.createElement('div');
    el.className = 'chaabi-toast chaabi-toast--' + type;
    el.innerHTML = '<i class="fas ' + (icons[type] || icons.info) + ' chaabi-toast-icon" aria-hidden="true"></i>' +
        '<span class="chaabi-toast-msg"></span>';
    el.querySelector('.chaabi-toast-msg').textContent = message || '';
    root.appendChild(el);
    // animation enter
    requestAnimationFrame(function () { el.classList.add('is-in'); });
    setTimeout(function () {
        el.classList.remove('is-in');
        el.classList.add('is-out');
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 280);
    }, 3200);
}

/** Feedback bouton : pulse / loading */
function btnFeedback(btn, state) {
    if (!btn || !btn.classList) return;
    btn.classList.remove('btn-fb-ok', 'btn-fb-err', 'btn-fb-loading');
    if (state === 'loading') {
        btn.classList.add('btn-fb-loading');
        btn.disabled = true;
        btn.dataset._fb = '1';
    } else if (state === 'ok') {
        btn.classList.add('btn-fb-ok');
        btn.disabled = false;
        setTimeout(function () { btn.classList.remove('btn-fb-ok'); }, 900);
    } else if (state === 'err') {
        btn.classList.add('btn-fb-err');
        btn.disabled = false;
        setTimeout(function () { btn.classList.remove('btn-fb-err'); }, 900);
    } else {
        btn.disabled = false;
        btn.classList.remove('btn-fb-loading');
    }
}
window.btnFeedback = btnFeedback;

/* ── Vues ── */
var _viewedKeys = {};
function trackView(type, id) {
    if (!type || !id) return;
    var key = type + ':' + id;
    try {
        if (sessionStorage.getItem('view_' + key)) return;
        sessionStorage.setItem('view_' + key, '1');
    } catch (_) {
        if (_viewedKeys[key]) return;
        _viewedKeys[key] = 1;
    }
    fetch((window.CHAABI_API||'api/radiochaabi.php')+'?action=track_view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: type, id: id, session_id: getSessionId() })
    }).catch(function () {});
}

/* ── Favoris locaux ── */
var FAVORITES_KEY = 'chaabi_favorites_v1';
function loadFavorites() {
    try {
        var raw = localStorage.getItem(FAVORITES_KEY);
        var arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
    } catch (_) { return []; }
}
function saveFavorites(list) {
    try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(list.slice(0, 200))); } catch (_) {}
}
function favKey(type, id) { return String(type) + ':' + String(id); }
function isFavorite(type, id) {
    var k = favKey(type, id);
    return loadFavorites().some(function (f) { return f.key === k; });
}
function toggleFavorite(type, id, title, artist, img, audio, btn) {
    if (!type || !id) return;
    var list = loadFavorites();
    var k = favKey(type, id);
    var idx = list.findIndex(function (f) { return f.key === k; });
    if (idx >= 0) {
        list.splice(idx, 1);
        if (typeof showToast === 'function') showToast(currentLang === 'ar' ? 'أزيل من المفضلة' : 'Retiré des favoris', 'info');
    } else {
        list.unshift({
            key: k, type: type, id: id,
            title: title || '', artist: artist || '',
            img: img || '', audio: audio || '',
            at: Date.now()
        });
        if (typeof showToast === 'function') showToast(currentLang === 'ar' ? 'أضيف إلى المفضلة' : 'Ajouté aux favoris', 'success');
    }
    saveFavorites(list);
    if (btn) {
        btn.classList.toggle('is-fav', idx < 0);
        var ic = btn.querySelector('i');
        if (ic) ic.className = (idx < 0 ? 'fas' : 'far') + ' fa-star';
    }
    if (typeof updatePlayerFavBtn === 'function') updatePlayerFavBtn();
    if (typeof renderHomeFavorites === 'function') renderHomeFavorites();
}

/* ── Partage ── */
function shareMedia(type, id, title, artist) {
    var url = getSharePlayUrl(type, id);
    var text = (title || '') + (artist ? ' — ' + artist : '') + ' | Chaabi Music';
    if (navigator.share) {
        navigator.share({ title: title || 'Chaabi Music', text: text, url: url }).catch(function () {});
        return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () {
            showToast(currentLang === 'ar' ? 'تم نسخ الرابط' : 'Lien copié', 'success');
        }).catch(function () { prompt(currentLang === 'ar' ? 'انسخ الرابط:' : 'Copiez le lien :', url); });
    } else {
        prompt(currentLang === 'ar' ? 'انسخ الرابط:' : 'Copiez le lien :', url);
    }
}

/* ── Deep links lecture ── */
async function playFromDeepLink(type, id) {
    try {
        var res = await fetch((window.CHAABI_API||'api/radiochaabi.php')+'?action=get_media&type=' + encodeURIComponent(type) + '&id=' + encodeURIComponent(id));
        var item = await res.json();
        if (!item || item.error || !item.audio) {
            showToast(currentLang === 'ar' ? 'المقطع غير متاح' : 'Média introuvable', 'error');
            return;
        }
        var title, artist, img;
        if (type === 'chanson') {
            title = getFld(item, 'titre') || item.titre;
            artist = getFld(item, 'artiste_nom') || item.artiste_nom || '';
            img = formatPath(item.image || item.artiste_image);
        } else if (type === 'emission') {
            title = ((typeof translations !== 'undefined' && translations[currentLang]) ? translations[currentLang].show_label : 'Émission') + ' #' + (item.numero_emission || '?');
            artist = item.invites_noms || '';
            img = formatPath(item.image);
        } else {
            title = (typeof translations !== 'undefined' && translations[currentLang]) ? (translations[currentLang].interview_label || 'Interview') : 'Interview';
            artist = item.artiste_nom || '';
            img = formatPath(item.image);
        }
        if (typeof playTrack === 'function') {
            playTrack(title, artist, formatPath(item.audio), img, {
                type: type, id: item.id, title: title, artist: artist,
                numero: item.numero_emission || '', invite: item.invites_noms || ''
            });
        }
    } catch (e) {
        console.warn('[Chaabi] deep link', e);
    }
}
function handlePlayHash() {
    var h = (location.hash || '').replace(/^#/, '');
    var m = h.match(/^(?:play\/)?(chanson|emission|interview)\/(\d+)$/i);
    if (m && typeof playFromDeepLink === 'function') {
        playFromDeepLink(m[1].toLowerCase(), parseInt(m[2], 10));
    }
}

/* ── Exports globaux ── */
window.currentTab = currentTab;
window.currentPage = currentPage;
window.currentLang = currentLang;
function syncCurrentLang(lang) {
    if (lang !== 'ar' && lang !== 'fr') return currentLang;
    currentLang = lang;
    try { window.currentLang = lang; } catch (_) {}
    return currentLang;
}
window.syncCurrentLang = syncCurrentLang;
window.MEDIA_BASE = MEDIA_BASE;
window.DEFAULT_IMG = DEFAULT_IMG;
window.SHARE_ORIGIN = SHARE_ORIGIN;
window.getShareBase = getShareBase;
window.getSharePlayUrl = getSharePlayUrl;
window.getShareDetailUrl = getShareDetailUrl;
window.formatPath = formatPath;
window.responsiveImg = responsiveImg;
window.initLazyImages = initLazyImages;
window.supportsNativeLazy = supportsNativeLazy;
window.getFld = getFld;
window.jsStr = jsStr;
window.jsAttr = jsAttr;
window.jsonAttr = jsonAttr;
window.getSessionId = getSessionId;
window.safeFetch = safeFetch;
window.showToast = showToast;
window.trackView = trackView;
function clearFavorites() {
    saveFavorites([]);
    if (typeof renderHomeFavorites === 'function') renderHomeFavorites();
    if (typeof showToast === 'function') {
        showToast((typeof window !== 'undefined' && window.currentLang === 'ar') ? 'تم مسح المفضلة' : 'Favoris effacés', 'info');
    }
}
window.clearFavorites = clearFavorites;
window.loadFavorites = loadFavorites;
window.isFavorite = isFavorite;
window.toggleFavorite = toggleFavorite;
window.shareMedia = shareMedia;
window.playFromDeepLink = playFromDeepLink;
window.handlePlayHash = handlePlayHash;


/* Fallback navigation si ui.js échoue au parse */
window.__chaabiNavStub = true;
if (typeof window.navigateTo !== 'function') {
  window.navigateTo = function (view) {
    try {
      view = view || 'home';
      if (view === 'admin') { location.href = 'admin/dashboard.html'; return; }
      var hash = (view === 'home') ? 'home' : view;
      try {
        if ((location.hash || '').replace(/^#/, '') !== hash) {
          history.replaceState(null, '', location.pathname + location.search + '#' + hash);
        }
        sessionStorage.setItem('chaabi_last_view', hash);
      } catch (e) {}
      var ids = ['view-home', 'view-list', 'view-detail', 'view-admin'];
      ids.forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        if (id === 'view-' + (view === 'home' ? 'home' : (view === 'admin' ? 'admin' : 'list'))) {
          el.classList.remove('hidden');
        } else {
          el.classList.add('hidden');
        }
      });
      if (view !== 'home' && view !== 'admin') {
        var title = document.getElementById('list-title');
        if (title) title.textContent = view;
      }
      window.scrollTo(0, 0);
      console.warn('[chaabi] navigateTo stub — ui.js non chargé correctement');
    } catch (e) {
      console.error(e);
    }
  };
}


/** Icône Chaâbi SVG (mask CSS) */
window.chaabiIcon = function (name, extraClass) {
  var n = String(name || 'note').replace(/[^a-z0-9-]/gi, '');
  return '<span class="ci ci-' + n + (extraClass ? ' ' + extraClass : '') + '" aria-hidden="true"></span>';
};

/** SEO JSON-LD RadioStation */
function injectJsonLd() {
    try {
        if (document.getElementById('chaabi-jsonld')) return;
        var isAr = (typeof window !== 'undefined' && window.currentLang === 'ar');
        var data = {
            "@context": "https://schema.org",
            "@type": "RadioStation",
            "name": isAr ? "راديو الشعبي" : "Radio Chaabi",
            "url": "https://radiochaabi.com/",
            "description": isAr
                ? "راديو التراث الموسيقي الشعبي الجزائري"
                : "Radio du patrimoine musical chaâbi algérien",
            "inLanguage": ["fr", "ar"],
            "image": "https://radiochaabi.com/music/images/chaabidialna.png",
            "sameAs": [
                "https://x.com/chaabiradio",
                "https://www.instagram.com/chaabiradio/",
                "https://www.facebook.com/radiochaabidialna/",
                "https://www.youtube.com/@mahfoud8027"
            ]
        };
        var s = document.createElement('script');
        s.type = 'application/ld+json';
        s.id = 'chaabi-jsonld';
        s.textContent = JSON.stringify(data);
        document.head.appendChild(s);
    } catch (_) {}
}
window.injectJsonLd = injectJsonLd;


/* ── Compteur visiteurs (en ligne / jour / total) ── */
(function chaabiVisitPing() {
  try {
    var KEY = 'chaabi_vid';
    var vid = localStorage.getItem(KEY);
    if (!vid || vid.length < 12) {
      vid = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(KEY, vid);
    }
    var api = (typeof window.CHAABI_API === 'string' && window.CHAABI_API) || 'api/radiochaabi.php';
    // anti-spam : 1 ping / 60 s par onglet
    var last = 0;
    try { last = parseInt(sessionStorage.getItem('chaabi_visit_last') || '0', 10); } catch (e) {}
    var now = Date.now();
    if (now - last < 60000) return;
    try { sessionStorage.setItem('chaabi_visit_last', String(now)); } catch (e) {}
    fetch(api + '?action=track_visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vid: vid }),
      credentials: 'same-origin',
      keepalive: true
    }).catch(function () {});
  } catch (e) {}
})();
