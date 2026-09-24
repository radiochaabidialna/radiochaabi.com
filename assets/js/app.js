/**
 * Chaabi Music Pro — module JS
 * Chargé en séquence (defer). Les onclick HTML restent valides (scope global).
 */
/* ── Bootstrap ── */
document.addEventListener('DOMContentLoaded', function () {
    initTheme();
    window.currentLang = currentLang;
    applyLanguage();
    if (typeof bindImageFallbacks === 'function') bindImageFallbacks();
    if (typeof initBackToTop === 'function') initBackToTop();
    if (typeof initOfflineBanner === 'function') initOfflineBanner();
    var routes = ['home', 'onair', 'artistes', 'chansons', 'emissions', 'interviews', 'dedicaces', 'commentaires', 'contacts', 'bouqalla'];
    var h0 = (location.hash || '').replace(/^#/, '').split('?')[0];
    // Ignore deep links play/artiste/… handled separately
    if (h0 && h0.indexOf('/') >= 0) {
        // play/… or artiste/5 — stay on home shell; applyHash later
        if (!/^play\//i.test(h0) && !/^(artiste|emission|invite)\//i.test(h0)) {
            h0 = h0.split('/')[0];
        } else {
            h0 = '';
        }
    }
    // Sans hash explicite → toujours l'accueil (évite d'ouvrir Bouqalla/etc.
    // quand on arrive depuis qacidates.html via le logo → index.html)
    // La reprise après changement de langue passe par le hash (#chansons, #home…).
    if (!h0 || routes.indexOf(h0) < 0) {
        h0 = 'home';
    }
    try {
        if (h0 && routes.indexOf(h0) >= 0) navigateTo(h0);
        else navigateTo('home');
    } catch (bootErr) {
        console.error('[Chaabi boot]', bootErr);
        try { navigateTo('home'); } catch (_) {}
    }
    startLiveBar();
    if (typeof injectJsonLd === 'function') injectJsonLd();
    // Astuce raccourcis (1 seule fois)
    try {
        if (!localStorage.getItem('chaabi_kb_tip')) {
            localStorage.setItem('chaabi_kb_tip', '1');
            setTimeout(function () {
                if (typeof showToast === 'function') {
                    var ar = (typeof window !== 'undefined' && window.currentLang === 'ar');
                    showToast(ar
                        ? 'اختصارات: مسافة ▶ | N التالي | P السابق | M كتم'
                        : 'Raccourcis: Espace ▶ | N suivant | P précédent | M muet', 'info');
                }
            }, 2500);
        }
    } catch (_) {}
    if (typeof updateContinuousUI === 'function') updateContinuousUI();
    if (typeof restorePlayHistory === 'function') { restorePlayHistory(); if (typeof renderRecentPlayed === 'function') renderRecentPlayed(); if (typeof renderHomeFavorites === 'function') renderHomeFavorites(); if (typeof renderContinueBar === 'function') renderContinueBar(); }
    if (typeof restoreQueue === 'function') { restoreQueue(); if (typeof renderQueueUI === 'function') renderQueueUI(); }
    // Reprise player après reload langue (attente léger DOM audio)
    setTimeout(function () {
        if (typeof restorePlayerState === 'function') restorePlayerState();
        if (typeof handlePlayHash === 'function') handlePlayHash();
    }, 120);
    if (typeof initLazyImages === 'function') initLazyImages(document, 6);
});
window.addEventListener('hashchange', function () {
    if (typeof applyHash === 'function') applyHash();
});

window.addEventListener('pagehide', function () {
    if (typeof persistPlayerState === 'function') persistPlayerState();
    if (typeof persistPlayHistory === 'function') persistPlayHistory();
    if (typeof persistQueue === 'function') persistQueue();
});

/* Offline / online */
function updateOnlineStatus() {
    var ban = document.getElementById('offline-banner');
    if (!ban) return;
    if (navigator.onLine) {
        ban.classList.add('hidden');
        ban.textContent = '';
    } else {
        var ar = (typeof window !== 'undefined' && window.currentLang === 'ar');
        ban.textContent = ar
            ? 'غير متصل — بعض الوظائف غير متاحة'
            : 'Hors ligne — certaines fonctions sont indisponibles';
        ban.classList.remove('hidden');
    }
}
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
document.addEventListener('DOMContentLoaded', function () {
    updateOnlineStatus();
});

/** Sync theme-color with dark/light */
function syncThemeColor() {
    try {
        var meta = document.querySelector('meta[name="theme-color"]');
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('name', 'theme-color');
            document.head.appendChild(meta);
        }
        var dark = document.documentElement.classList.contains('dark');
        meta.setAttribute('content', dark ? '#0b1220' : '#f8f5ef');
    } catch (_) {}
}
window.syncThemeColor = syncThemeColor;
document.addEventListener('DOMContentLoaded', function () {
    syncThemeColor();
    try {
        var obs = new MutationObserver(syncThemeColor);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    } catch (_) {}
});
