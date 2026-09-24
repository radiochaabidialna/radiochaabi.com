/**
 * Chaabi Music Pro — Lecteur audio optimisé
 * - Réutilisation du même <audio> (pas de rechargement si même URL)
 * - preload metadata → auto à la lecture
 * - Préchargement de la piste suivante (historique)
 * - Media Session API (écran verrouillé / casque)
 * - UI progress throttlée (rAF)
 * - Stats d'écoute en keepalive / sendBeacon
 * - Gestion d'erreur + retry léger
 */
/* ── Lecteur ── */

var CURRENT_PLAY = { key: null, mediaType: null, mediaId: null, title: '', artist: '', image: '', numero: '', invite: '', audioEl: null };
function setCurrentPlay(obj) {
    CURRENT_PLAY = obj || { key: null, mediaType: null, mediaId: null, title: '', artist: '', image: '', numero: '', invite: '', audioEl: null };
    try { window.CURRENT_PLAY = CURRENT_PLAY; } catch (_) {}
    return CURRENT_PLAY;
}
window.setCurrentPlay = setCurrentPlay;
var PLAY_HISTORY = [];
var PLAY_IDX = -1;
var _audioUiRaf = 0;
var _audioLastUiAt = 0;
var _prefetchAudio = null;
var _prefetchSrc = null;
var _playRetryCount = 0;
var _playerInited = false;
/** Mode radio continue (enchaîne automatiquement) — activé par défaut */
var RADIO_CONTINUOUS = (function () {
    try {
        var s = localStorage.getItem('chaabi_radio_continuous');
        if (s === '0') return false;
        if (s === '1') return true;
    } catch (_) {}
    return true;
})();
var _continuousFetching = false;
var QUEUE_PANEL_USER_OPEN = false;
var RADIO_QUEUE = []; // pistes à venir {title, artist, src, img, mediaInfo}
/** Mode aléatoire */
var RADIO_SHUFFLE = (function () {
    try { return localStorage.getItem('chaabi_radio_shuffle') === '1'; } catch (_) { return false; }
})();
/** Repeat: off | one | all */
var RADIO_REPEAT = (function () {
    try {
        var r = localStorage.getItem('chaabi_radio_repeat');
        if (r === 'one' || r === 'all') return r;
    } catch (_) {}
    return 'off';
})();


function getAudioEl() {
    return document.getElementById('fp-audio');
}

/** Normalise une URL audio pour comparaison (même piste = pas de reload) */
function sameAudioSrc(a, b) {
    if (!a || !b) return false;
    try {
        var ua = new URL(a, location.href).href;
        var ub = new URL(b, location.href).href;
        return ua === ub;
    } catch (_) {
        return String(a) === String(b);
    }
}

/** Précharge une URL audio au survol d'une carte (léger, 1 seule à la fois) */
function prefetchAudioUrl(src) {
    if (!src) return;
    try {
        if (_prefetchSrc === src) return;
        // Ne pas précharger la piste déjà en cours
        var a = getAudioEl();
        if (a && sameAudioSrc(a.currentSrc || a.src, src)) return;
        _prefetchSrc = src;
        if (!_prefetchAudio) {
            _prefetchAudio = new Audio();
            _prefetchAudio.preload = 'auto';
            _prefetchAudio.muted = true;
            _prefetchAudio.volume = 0;
        }
        if (!sameAudioSrc(_prefetchAudio.src, src)) {
            _prefetchAudio.src = src;
            _prefetchAudio.load();
        }
    } catch (_) {}
}



function mediaTypeLabel(type) {
    var isAr = (typeof window !== 'undefined' && window.currentLang === 'ar') || (typeof currentLang !== 'undefined' && currentLang === 'ar');
    var map = {
        chanson: isAr ? 'أغنية' : 'CHANSON',
        emission: isAr ? 'حصة' : 'ÉMISSION',
        interview: isAr ? 'مقابلة' : 'INTERVIEW',
        artiste: isAr ? 'فنان' : 'ARTISTE'
    };
    return map[type] || (type ? String(type).toUpperCase() : '');
}

function updatePlayerTypeBadge() {
    var el = document.getElementById('fp-type');
    if (!el) return;
    var type = (CURRENT_PLAY && CURRENT_PLAY.mediaType) || '';
    var label = mediaTypeLabel(type);
    if (!label) {
        el.classList.add('hidden');
        el.textContent = '';
        return;
    }
    el.textContent = label;
    el.classList.remove('hidden');
    el.setAttribute('data-type', type);
}

function markPlayingCards() {
    try {
        var key = CURRENT_PLAY && CURRENT_PLAY.key;
        document.querySelectorAll('.media-card.is-playing, .media-card[data-playing="1"]').forEach(function (c) {
            c.classList.remove('is-playing');
            c.removeAttribute('data-playing');
        });
        if (!key) return;
        var parts = key.split('-');
        var type = parts[0];
        var id = parts.slice(1).join('-');
        document.querySelectorAll('.media-card[data-media-key="' + key + '"]').forEach(function (c) {
            c.classList.add('is-playing');
            c.setAttribute('data-playing', '1');
        });
        // fallback: data-id + data-type
        document.querySelectorAll('.media-card[data-id="' + id + '"][data-type="' + type + '"]').forEach(function (c) {
            c.classList.add('is-playing');
            c.setAttribute('data-playing', '1');
        });
    } catch (_) {}
}

function setCoverSpinning(on) {
    var img = document.getElementById('fp-img');
    if (!img) return;
    img.classList.toggle('fp-cover-spin', !!on);
}

function toggleShuffle() {
    RADIO_SHUFFLE = !RADIO_SHUFFLE;
    try { localStorage.setItem('chaabi_radio_shuffle', RADIO_SHUFFLE ? '1' : '0'); } catch (_) {}
    updateShuffleUI();
    if (typeof showToast === 'function') {
        showToast(RADIO_SHUFFLE
            ? ((currentLang === 'ar') ? 'تشغيل عشوائي' : 'Mode aléatoire activé')
            : ((currentLang === 'ar') ? 'ترتيب عادي' : 'Mode aléatoire désactivé'), 'info');
    }
}

function updateShuffleUI() {
    var btn = document.getElementById('fp-shuffle');
    if (btn) {
        btn.classList.toggle('fp-ctrl-on', RADIO_SHUFFLE);
        btn.setAttribute('aria-pressed', RADIO_SHUFFLE ? 'true' : 'false');
    }
}

function cycleRepeat() {
    RADIO_REPEAT = RADIO_REPEAT === 'off' ? 'all' : (RADIO_REPEAT === 'all' ? 'one' : 'off');
    try { localStorage.setItem('chaabi_radio_repeat', RADIO_REPEAT); } catch (_) {}
    updateRepeatUI();
    if (typeof showToast === 'function') {
        var msg = {
            off: (currentLang === 'ar' ? 'بدون تكرار' : 'Répétition désactivée'),
            all: (currentLang === 'ar' ? 'تكرار القائمة' : 'Répéter la file'),
            one: (currentLang === 'ar' ? 'تكرار المقطع' : 'Répéter le titre')
        };
        showToast(msg[RADIO_REPEAT] || '', 'info');
    }
}

function updateRepeatUI() {
    var btn = document.getElementById('fp-repeat');
    if (!btn) return;
    btn.classList.toggle('fp-ctrl-on', RADIO_REPEAT !== 'off');
    btn.setAttribute('data-repeat', RADIO_REPEAT);
    btn.setAttribute('aria-pressed', RADIO_REPEAT !== 'off' ? 'true' : 'false');
    var icon = btn.querySelector('i');
    if (icon) {
        icon.className = RADIO_REPEAT === 'one' ? 'fas fa-repeat text-xs' : 'fas fa-repeat text-xs';
        // badge 1 for one
    }
    var badge = btn.querySelector('.fp-repeat-badge');
    if (RADIO_REPEAT === 'one') {
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'fp-repeat-badge';
            badge.textContent = '1';
            btn.appendChild(badge);
        }
        badge.style.display = '';
    } else if (badge) {
        badge.style.display = 'none';
    }
}

function toggleQueuePanel() {
    var q = document.getElementById('fp-queue');
    if (!q) return;
    q.classList.toggle('hidden');
    QUEUE_PANEL_USER_OPEN = !q.classList.contains('hidden');
    document.body.classList.toggle('player-queue-open', QUEUE_PANEL_USER_OPEN);
    if (QUEUE_PANEL_USER_OPEN && typeof renderQueueUI === 'function') renderQueueUI();
}

/** Ajoute toute une liste et lance la première (ex: toutes les chansons d'un artiste) */
function playAllTracks(items, type) {
    if (!items || !items.length) return;
    type = type || 'chanson';
    var queue = [];
    for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (!it) continue;
        var audio = it.audio ? (typeof formatPath === 'function' ? formatPath(it.audio) : it.audio) : '';
        if (!audio) continue;
        var title = (typeof getFld === 'function' ? (getFld(it, 'titre') || getFld(it, 'title')) : null) || it.titre || it.title || '';
        var artist = (typeof getFld === 'function' ? (getFld(it, 'artiste_nom') || getFld(it, 'artist')) : null) || it.artiste_nom || it.artist || '';
        var img = (typeof resolveMediaImage === 'function')
            ? resolveMediaImage(it.image, it.image_url, it.photo, it.artiste_image, it.img, window._lastArtistImage)
            : (typeof formatPath === 'function' ? (formatPath(it.image || it.artiste_image || it.img || window._lastArtistImage || '', true) || window._lastArtistImage || DEFAULT_IMG) : (it.image || window._lastArtistImage || ''));
        queue.push({
            title: title,
            artist: artist,
            audio: audio,
            image: img,
            type: type,
            id: it.id || 0,
            meta: { type: type, id: it.id || 0, title: title, artist: artist, numero: it.numero || '', invite: it.invite || '', image: img }
        });
    }
    if (!queue.length) return;
    // Remplir la file en silence — ne PAS ouvrir le panneau
    QUEUE_PANEL_USER_OPEN = false;
    try {
        RADIO_QUEUE = [];
        for (var j = 0; j < queue.length; j++) {
            var e = queue[j];
            RADIO_QUEUE.push({
                title: e.title,
                artist: e.artist,
                src: e.audio,
                img: e.image,
                mediaInfo: e.meta
            });
        }
        if (typeof persistQueue === 'function') persistQueue();
        if (typeof renderQueueUI === 'function') renderQueueUI(); // reste fermé
    } catch (_) {}
    var first = queue[0];
    // Retirer le premier de la file car playTrack le joue maintenant
    if (RADIO_QUEUE.length && RADIO_QUEUE[0].src === first.audio) {
        RADIO_QUEUE.shift();
        if (typeof persistQueue === 'function') persistQueue();
        if (typeof renderQueueUI === 'function') renderQueueUI();
    }
    if (typeof playTrack === 'function') {
        playTrack(first.title, first.artist, first.audio, first.image, first.meta);
    }
    if (typeof showToast === 'function') {
        var n = queue.length;
        showToast(
            (typeof currentLang !== 'undefined' && currentLang === 'ar')
                ? ('تشغيل ' + n + ' مقاطع')
                : (n + ' titres en file — lecture démarrée'),
            'success'
        );
    }
}
window.playAllTracks = playAllTracks;
window.toggleShuffle = toggleShuffle;
window.cycleRepeat = cycleRepeat;
window.toggleQueuePanel = toggleQueuePanel;
window.updatePlayerTypeBadge = updatePlayerTypeBadge;
window.markPlayingCards = markPlayingCards;

function playTrack(title, artist, audioSrc, imgSrc, mediaInfo, fromHistory) {
    if (fromHistory === undefined) fromHistory = false;
    if (typeof resolveMediaImage === 'function') {
        imgSrc = resolveMediaImage(
            imgSrc,
            mediaInfo && (mediaInfo.image || mediaInfo.img),
            window._lastArtistImage
        );
    } else {
        if (!imgSrc || /chaabidialna/i.test(String(imgSrc || ''))) {
            imgSrc = window._lastArtistImage || imgSrc || (typeof DEFAULT_IMG !== 'undefined' ? DEFAULT_IMG : '/music/images/chaabidialna.png');
        }
        if (!imgSrc) imgSrc = typeof DEFAULT_IMG !== 'undefined' ? DEFAULT_IMG : '/music/images/chaabidialna.png';
    }

    var player = document.getElementById('floating-player');
    var a = getAudioEl();
    if (!a || !player) return;

    if ((!title || title === 'Interview' || /^Interview\b/i.test(String(title))) && mediaInfo && mediaInfo.type === 'interview') {
        title = (typeof mediaTypeTitle === 'function' ? mediaTypeTitle('interview') : 'Interview') + (artist ? ' — ' + artist : '');
    }
    document.getElementById('fp-title').innerText = title || '';
    document.getElementById('fp-artist').innerText = artist || '';
    var img = document.getElementById('fp-img');
    if (img) {
        var nextImg = imgSrc || (typeof IMG_FALLBACK !== 'undefined' ? IMG_FALLBACK : '') || img.getAttribute('src') || '';
        if (nextImg && img.getAttribute('src') !== nextImg) {
            img.onerror = function () {
                img.onerror = null;
                if (typeof IMG_FALLBACK !== 'undefined' && img.src.indexOf('onair.png') < 0) img.src = IMG_FALLBACK;
            };
            img.src = nextImg;
        }
    }
    player.classList.remove('hidden');
    document.body.classList.add('has-player');

    var isSame = sameAudioSrc(a.currentSrc || a.src, audioSrc);
    if (!isSame) {
        _playRetryCount = 0;
        // Libère le buffer précédent proprement
        try { a.pause(); } catch (_) {}
        a.preload = 'auto';
        a.src = audioSrc;
        a.load();
    }

    var p = a.play();
    if (p && p.catch) {
        p.catch(function (err) {
            // Autoplay bloqué ou réseau : un retry après canplay
            if (_playRetryCount < 2) {
                _playRetryCount++;
                var once = function () {
                    a.removeEventListener('canplay', once);
                    a.play().catch(function () {});
                };
                a.addEventListener('canplay', once);
            } else {
                if (window.CHAABI_DEBUG) console.warn('[Chaabi] Lecture impossible:', err && err.message ? err.message : err);
            }
        });
    }

    schedulePlayerUI();

    if (mediaInfo && mediaInfo.type) {
        setCurrentPlay({
            key: mediaInfo.type + '-' + mediaInfo.id,
            mediaType: mediaInfo.type,
            mediaId: mediaInfo.id,
            title: mediaInfo.title || title,
            artist: mediaInfo.artist || artist,
            image: imgSrc,
            numero: mediaInfo.numero || '',
            invite: mediaInfo.invite || '',
            audioEl: a
        });
        try { updatePlayerTypeBadge(); markPlayingCards(); if (typeof syncOnAirFromPlayer === "function") syncOnAirFromPlayer(); if (typeof renderOnAirQueue === "function") renderOnAirQueue(); } catch (_) {}
        if (!fromHistory) {
            var key = mediaInfo.type + '-' + mediaInfo.id;
            if (!PLAY_HISTORY.length || PLAY_HISTORY[PLAY_HISTORY.length - 1].key !== key) {
                PLAY_HISTORY.push({
                    key: key,
                    title: title,
                    artist: artist,
                    src: audioSrc,
                    img: imgSrc || (mediaInfo && mediaInfo.image) || (CURRENT_PLAY && CURRENT_PLAY.image) || '',
                    mediaInfo: Object.assign({}, mediaInfo || {}, { image: imgSrc || (mediaInfo && mediaInfo.image) || '' })
                });
                // Limite mémoire historique
                if (PLAY_HISTORY.length > 40) PLAY_HISTORY.shift();
            }
            PLAY_IDX = PLAY_HISTORY.length - 1;
            if (typeof persistPlayHistory === 'function') persistPlayHistory();
        }
        reportPlaying();
        updateMediaSession(title, artist, imgSrc);
        prefetchAdjacentTracks();
        // Vue à la lecture (chanson / interview / emission)
        if (typeof trackView === 'function') {
            trackView(mediaInfo.type, mediaInfo.id);
        }
        if (typeof renderRecentPlayed === 'function') renderRecentPlayed();
        if (typeof renderHomeFavorites === 'function') renderHomeFavorites();
        if (typeof renderContinueBar === 'function') renderContinueBar();
        if (typeof updatePlayerFavBtn === 'function') updatePlayerFavBtn();
        if (typeof renderQueueUI === 'function') renderQueueUI();
    }
}

/** Précharge la piste suivante (et précédente) de l'historique en arrière-plan */
function prefetchAdjacentTracks() {
    var next = PLAY_HISTORY[PLAY_IDX + 1];
    var target = next && next.src ? next.src : null;
    if (!target) return;
    if (_prefetchSrc === target) return;
    _prefetchSrc = target;
    try {
        if (!_prefetchAudio) {
            _prefetchAudio = new Audio();
            _prefetchAudio.preload = 'auto';
            // Volume 0 + pause : pure précharge réseau
            _prefetchAudio.muted = true;
            _prefetchAudio.volume = 0;
        }
        if (!sameAudioSrc(_prefetchAudio.src, target)) {
            _prefetchAudio.src = target;
            _prefetchAudio.load();
        }
    } catch (_) {}
}

function playHistoryAt(idx) {
    if (idx < 0 || idx >= PLAY_HISTORY.length) return;
    var h = PLAY_HISTORY[idx];
    PLAY_IDX = idx;
    playTrack(h.title, h.artist, h.src, h.img, h.mediaInfo, true);
}
function playPrev() { playHistoryAt(PLAY_IDX - 1); }
function playNext(fromEnded) {
    if (fromEnded && RADIO_REPEAT === 'one') {
        var a = getAudioEl();
        if (a) {
            try { a.currentTime = 0; a.play().catch(function () {}); } catch (_) {}
        }
        return;
    }
    // File d'attente
    if (RADIO_QUEUE && RADIO_QUEUE.length) {
        var idx = 0;
        if (RADIO_SHUFFLE && RADIO_QUEUE.length > 1) {
            idx = Math.floor(Math.random() * RADIO_QUEUE.length);
        }
        var item = RADIO_QUEUE.splice(idx, 1)[0];
        if (typeof renderQueueUI === 'function') renderQueueUI();
        if (item) {
            playTrack(item.title, item.artist, item.src, item.img, item.mediaInfo, false);
            return;
        }
    }
    // Historique suivant
    if (PLAY_IDX >= 0 && PLAY_IDX < PLAY_HISTORY.length - 1) {
        playHistoryAt(PLAY_IDX + 1);
        return;
    }
    if (fromEnded && RADIO_REPEAT === 'all' && PLAY_HISTORY.length) {
        playHistoryAt(0);
        return;
    }
    // Mode radio continue : charge la suite via API
    if (RADIO_CONTINUOUS && typeof fetchContinuousNext === 'function') {
        fetchContinuousNext();
        return;
    }
    if (fromEnded && RADIO_REPEAT === 'all' && PLAY_HISTORY.length) {
        playHistoryAt(0);
    }
}

function toggleRadioContinuous() {
    RADIO_CONTINUOUS = !RADIO_CONTINUOUS;
    try { localStorage.setItem('chaabi_radio_continuous', RADIO_CONTINUOUS ? '1' : '0'); } catch (_) {}
    updateContinuousUI();
    if (typeof showToast === 'function') {
        var msg = RADIO_CONTINUOUS
            ? (currentLang === 'ar' ? 'التشغيل المتواصل مفعّل' : 'Radio continue activée')
            : (currentLang === 'ar' ? 'التشغيل المتواصل متوقف' : 'Radio continue désactivée');
        showToast(msg, 'success');
    }
    // Précharger si on vient d'activer
    if (RADIO_CONTINUOUS) prefetchContinuousNext();
}
window.toggleRadioContinuous = toggleRadioContinuous;

function updateContinuousUI() {
    var btn = document.getElementById('fp-continuous');
    if (!btn) return;
    btn.setAttribute('aria-pressed', RADIO_CONTINUOUS ? 'true' : 'false');
    btn.classList.toggle('fp-continuous-on', RADIO_CONTINUOUS);
    btn.title = RADIO_CONTINUOUS
        ? (currentLang === 'ar' ? 'إيقاف التشغيل المتواصل' : 'Désactiver la radio continue')
        : (currentLang === 'ar' ? 'تفعيل التشغيل المتواصل' : 'Activer la radio continue');
}
window.updateContinuousUI = updateContinuousUI;

/** Ajoute des pistes à la file (depuis une liste affichée) */
function enqueueTracks(items, type) {
    if (!items || !items.length) return;
    items.forEach(function (item) {
        var audio = item.audio ? formatPath(item.audio) : '';
        if (!audio) return;
        var title = type === 'interview'
            ? (getFld(item, 'artiste_nom') || (typeof mediaTypeTitle === 'function' ? mediaTypeTitle('interview') : 'Interview'))
            : (getFld(item, 'titre') || getFld(item, 'nom') || '');
        var artist = type === 'chanson'
            ? (getFld(item, 'artiste_nom') || '')
            : (type === 'emission' ? ('#' + (item.numero_emission || '')) : (getFld(item, 'artiste_nom') || ''));
        var img = formatPath(item.image || item.artiste_image);
        var id = item.id;
        var mediaType = type || 'chanson';
        var key = mediaType + '-' + id;
        // éviter doublon immédiat
        if (CURRENT_PLAY.key === key) return;
        if (RADIO_QUEUE.some(function (q) { return q.mediaInfo && q.mediaInfo.type === mediaType && q.mediaInfo.id === id; })) return;
        RADIO_QUEUE.push({
            title: title,
            artist: artist,
            src: audio,
            img: img,
            mediaInfo: { type: mediaType, id: id, title: title, artist: artist, numero: item.numero_emission || '', invite: '' }
        });
    });
    if (typeof persistQueue === 'function') persistQueue();
    if (typeof renderQueueUI === 'function') renderQueueUI();
}
window.enqueueTracks = enqueueTracks;

async function fetchAndPlayNextTrack() {
    if (_continuousFetching) return;
    _continuousFetching = true;
    try {
        var curType = (CURRENT_PLAY && CURRENT_PLAY.mediaType) || 'chanson';
        var action = 'get_chansons';
        if (curType === 'interview') action = 'get_interviews';
        else if (curType === 'emission') action = 'get_emissions';
        else action = 'get_chansons';
        var page = 1 + Math.floor(Math.random() * 5);
        var res = await fetch((window.CHAABI_API||'api/radiochaabi.php')+'?action=' + action + '&page=' + page + '&limit=12');
        var data = await res.json();
        var list = (data && data.data) ? data.data : [];
        if (!list.length && page !== 1) {
            res = await fetch((window.CHAABI_API||'api/radiochaabi.php')+'?action=' + action + '&page=1&limit=12');
            data = await res.json();
            list = (data && data.data) ? data.data : [];
        }
        // Mélanger et prendre une piste différente de l'actuelle
        list = list.filter(function (item) {
            return item.audio && !(CURRENT_PLAY.mediaId && item.id == CURRENT_PLAY.mediaId && curType === (action === 'get_chansons' ? 'chanson' : action === 'get_interviews' ? 'interview' : 'emission'));
        });
        if (!list.length) {
            if (typeof showToast === 'function') showToast(currentLang === 'ar' ? 'لا توجد مقاطع تالية' : 'Aucune piste suivante', 'info');
            return;
        }
        list.sort(function () { return Math.random() - 0.5; });
        var item = list[0];
        var type = action === 'get_chansons' ? 'chanson' : (action === 'get_interviews' ? 'interview' : 'emission');
        // Enfiler le reste pour fluidité
        enqueueTracks(list.slice(1, 6), type);
        var title = type === 'interview'
            ? (getFld(item, 'artiste_nom') || (typeof mediaTypeTitle === 'function' ? mediaTypeTitle('interview') : 'Interview'))
            : (type === 'emission'
                ? ((typeof translations !== 'undefined' && translations[currentLang] ? translations[currentLang].show_label : 'Émission') + ' #' + (item.numero_emission || '?'))
                : (getFld(item, 'titre') || ''));
        var artist = type === 'chanson' ? (getFld(item, 'artiste_nom') || '')
            : (type === 'emission' ? (getFld(item, 'invites_noms') || '') : (typeof mediaTypeTitle === 'function' ? mediaTypeTitle('interview') : 'Interview'));
        var img = formatPath(item.image || item.artiste_image);
        var src = formatPath(item.audio);
        playTrack(title, artist, src, img, {
            type: type,
            id: item.id,
            title: title,
            artist: artist,
            numero: item.numero_emission || '',
            invite: getFld(item, 'invites_noms') || ''
        }, false);
    } catch (e) {
        if (window.CHAABI_DEBUG) console.warn('[Chaabi] continuous next', e);
    } finally {
        _continuousFetching = false;
    }
}

function prefetchContinuousNext() {
    if (!RADIO_CONTINUOUS || RADIO_QUEUE.length) return;
    // Précharge une page de chansons en arrière-plan pour la file
    var action = 'get_chansons';
    var curType = (CURRENT_PLAY && CURRENT_PLAY.mediaType) || 'chanson';
    if (curType === 'interview') action = 'get_interviews';
    else if (curType === 'emission') action = 'get_emissions';
    fetch((window.CHAABI_API||'api/radiochaabi.php')+'?action=' + action + '&page=1&limit=8')
        .then(function (r) { return r.json(); })
        .then(function (data) {
            var list = (data && data.data) ? data.data : [];
            var type = action === 'get_chansons' ? 'chanson' : (action === 'get_interviews' ? 'interview' : 'emission');
            enqueueTracks(list, type);
            if (RADIO_QUEUE[0] && typeof prefetchAudioUrl === 'function') {
                prefetchAudioUrl(RADIO_QUEUE[0].src);
            }
        })
        .catch(function () {});
}


/** Stats d'écoute — keepalive pour ne pas bloquer la navigation */
function trackListen(eventType, info) {
    if (!info) info = CURRENT_PLAY;
    var a = (info && info.audioEl) || getAudioEl();
    var payload = JSON.stringify({
        media_type: info.mediaType,
        media_id: info.mediaId,
        event_type: eventType,
        position: Math.round(a ? (a.currentTime || 0) : 0),
        duration: Math.round(a && a.duration ? a.duration : 0),
        listened_seconds: eventType === 'progress' ? 30 : 0,
        session_id: getSessionId(),
        page_path: location.pathname + location.hash,
        language_code: currentLang
    });
    var url = (window.CHAABI_API||'api/radiochaabi.php')+'?action=track_listen';
    try {
        if (navigator.sendBeacon && (eventType === 'pause' || eventType === 'complete')) {
            var blob = new Blob([payload], { type: 'application/json' });
            if (navigator.sendBeacon(url, blob)) return;
        }
        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true
        }).catch(function () {});
    } catch (_) {}
}

function closePlayer() {
    var a = getAudioEl();
    if (a) {
        try { a.pause(); } catch (_) {}
        // Garde le buffer (src) pour une reprise rapide si l'utilisateur réouvre
    }
    document.getElementById('floating-player').classList.add('hidden');
    document.body.classList.remove('has-player', 'player-queue-open');
    CURRENT_PLAY.key = null;
    if (navigator.mediaSession) {
        try { navigator.mediaSession.playbackState = 'none'; } catch (_) {}
    }
    schedulePlayerUI();
}

function updateMediaSession(title, artist, imgSrc) {
    if (!('mediaSession' in navigator)) return;
    try {
        var artwork = [];
        if (imgSrc && !String(imgSrc).startsWith('data:')) {
            artwork = [
                { src: imgSrc, sizes: '96x96', type: 'image/jpeg' },
                { src: imgSrc, sizes: '256x256', type: 'image/jpeg' },
                { src: imgSrc, sizes: '512x512', type: 'image/jpeg' }
            ];
        }
        navigator.mediaSession.metadata = new MediaMetadata({
            title: title || 'Chaabi Music',
            artist: artist || 'Radio Chaabi',
            album: 'Chaabi Music Pro',
            artwork: artwork
        });
        navigator.mediaSession.playbackState = 'playing';
        navigator.mediaSession.setActionHandler('play', function () { togglePlayerPlay(); });
        navigator.mediaSession.setActionHandler('pause', function () { togglePlayerPlay(); });
        navigator.mediaSession.setActionHandler('previoustrack', function () { playPrev(); });
        navigator.mediaSession.setActionHandler('nexttrack', function () { playNext(); });
        navigator.mediaSession.setActionHandler('seekto', function (d) {
            var a = getAudioEl();
            if (a && d && typeof d.seekTime === 'number' && isFinite(a.duration)) {
                a.currentTime = Math.max(0, Math.min(a.duration, d.seekTime));
                schedulePlayerUI();
            }
        });
    } catch (_) {}
}

function initPlayerControls() {
    if (_playerInited) return;
    _playerInited = true;
    try { updateShuffleUI(); updateRepeatUI(); updatePlayerTypeBadge(); updateContinuousUI(); } catch (_) {}

    var a = getAudioEl();
    if (!a) return;

    // Attributs perf mobiles
    a.setAttribute('playsinline', '');
    a.setAttribute('webkit-playsinline', '');
    a.preload = 'metadata';
    // crossOrigin anonyme uniquement si vos fichiers audio envoient les bons headers CORS
    // a.crossOrigin = 'anonymous';

    a.addEventListener('play', function () {
        if (CURRENT_PLAY.key && CURRENT_PLAY.audioEl === a) {
            reportPlaying();
            trackListen('play', CURRENT_PLAY);
            setCoverSpinning(true);
            markPlayingCards();
        }
        if (navigator.mediaSession) {
            try { navigator.mediaSession.playbackState = 'playing'; } catch (_) {}
        }
        schedulePlayerUI();
    });
    a.addEventListener('pause', function () {
        if (CURRENT_PLAY.key && CURRENT_PLAY.audioEl === a) {
            trackListen(a.ended ? 'complete' : 'pause', CURRENT_PLAY);
            setCoverSpinning(false);
        }
        if (navigator.mediaSession) {
            try { navigator.mediaSession.playbackState = a.ended ? 'none' : 'paused'; } catch (_) {}
        }
        schedulePlayerUI();
    });
    a.addEventListener('ended', function () {
        if (CURRENT_PLAY.key) trackListen('complete', CURRENT_PLAY);
        // Radio continue / historique / file
        if ((PLAY_IDX >= 0 && PLAY_IDX < PLAY_HISTORY.length - 1) || RADIO_QUEUE.length || RADIO_CONTINUOUS) {
            playNext(true);
        } else {
            schedulePlayerUI();
        }
    });
    // Progress UI : max ~4 fps (suffisant pour une barre)
    a.addEventListener('timeupdate', function () {
        var now = performance.now();
        if (now - _audioLastUiAt < 250) return;
        _audioLastUiAt = now;
        schedulePlayerUI();
        // Position Media Session
        if (navigator.mediaSession && 'setPositionState' in navigator.mediaSession && a.duration && isFinite(a.duration)) {
            try {
                navigator.mediaSession.setPositionState({
                    duration: a.duration,
                    playbackRate: a.playbackRate || 1,
                    position: Math.min(a.currentTime, a.duration)
                });
            } catch (_) {}
        }
    });
    a.addEventListener('loadedmetadata', schedulePlayerUI);
    a.addEventListener('durationchange', schedulePlayerUI);
    a.addEventListener('waiting', function () {
        // Buffering : on pourrait afficher un indicateur ; pour l'instant UI inchangée
    });
    a.addEventListener('error', function () {
        if (window.CHAABI_DEBUG) console.warn('[Chaabi] Erreur audio', a.error && a.error.code);
    });

    // Volume persisté
    var saved = parseInt(localStorage.getItem('chaabi_vol') || '100', 10);
    var sv = isNaN(saved) ? 100 : Math.max(0, Math.min(100, saved));
    a.volume = sv / 100;
    if (sv > 0) lastVolume = sv / 100;
    a.muted = sv === 0;
    var sl = document.getElementById('fp-volume');
    if (sl) sl.value = String(sv);
    updateVolumeIcon();
}

function updateVolumeIcon() {
    var a = getAudioEl();
    var ic = document.getElementById('fp-mute-icon');
    if (!a || !ic) return;
    var v = a.muted ? 0 : a.volume;
    ic.className = v === 0 ? 'fas fa-volume-xmark' : (v < 0.5 ? 'fas fa-volume-low' : 'fas fa-volume-high');
}

function setVolume(val) {
    var a = getAudioEl();
    if (!a) return;
    var v = Math.max(0, Math.min(100, parseInt(val, 10) || 0));
    a.volume = v / 100;
    a.muted = v === 0;
    if (v > 0) lastVolume = v / 100;
    var sl = document.getElementById('fp-volume');
    if (sl) sl.value = String(v);
    try { localStorage.setItem('chaabi_vol', String(v)); } catch (_) {}
    updateVolumeIcon();
}

function toggleMute() {
    var a = getAudioEl();
    if (!a) return;
    if (a.muted || a.volume === 0) {
        a.muted = false;
        a.volume = lastVolume || 0.8;
    } else {
        lastVolume = a.volume || 1;
        a.muted = true;
    }
    var sl = document.getElementById('fp-volume');
    if (sl) sl.value = a.muted ? '0' : String(Math.round(a.volume * 100));
    try { localStorage.setItem('chaabi_vol', String(sl ? sl.value : 0)); } catch (_) {}
    updateVolumeIcon();
}

function fmtTime(s) {
    if (!isFinite(s) || s < 0) s = 0;
    return Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
}

// Auto-save position toutes les 4s pendant la lecture (reprise fiable après reload)
setInterval(function () {
    try {
        var a = getAudioEl();
        if (a && a.src && !a.paused && !a.ended && typeof persistPlayerState === 'function') {
            persistPlayerState();
        }
    } catch (_) {}
}, 4000);

function schedulePlayerUI() {
    if (_audioUiRaf) return;
    _audioUiRaf = requestAnimationFrame(function () {
        _audioUiRaf = 0;
        updatePlayerUI();
    });
}

function updatePlayerUI() {
  try { if (typeof syncHomeOnairTeaser === "function") syncHomeOnairTeaser(); } catch (_) {}

    var a = getAudioEl();
    if (!a) return;
    var dur = a.duration || 0, cur = a.currentTime || 0;
    if (!isFinite(dur)) dur = 0;
    var pct = dur ? Math.min(100, (cur / dur) * 100) : 0;
    var fill = document.getElementById('fp-progress-fill');
    var knob = document.getElementById('fp-progress-knob');
    if (fill) fill.style.width = pct + '%';
    if (knob) knob.style.left = pct + '%';
    var t = document.getElementById('fp-time'), d = document.getElementById('fp-duration');
    if (t) t.textContent = fmtTime(cur);
    if (d) d.textContent = fmtTime(dur);
    var playing = !a.paused && !a.ended && !!a.src;
    var ic = document.getElementById('fp-play-icon');
    if (ic) ic.className = playing ? 'fas fa-pause text-white text-sm' : 'fas fa-play text-white text-sm';
    var btn = document.getElementById('fp-toggle');
    if (btn) btn.setAttribute('aria-pressed', playing ? 'true' : 'false');
    var img = document.getElementById('fp-img');
    if (img) img.classList.toggle('spinning', playing);
    var peq = document.getElementById('fp-eq');
    if (peq) peq.classList.toggle('paused', !playing);
    var leq = document.getElementById('live-eq');
    if (leq) leq.classList.toggle('paused', !playing);
}

function togglePlayerPlay() {
    var a = getAudioEl();
    if (!a || !a.src) return;
    if (a.paused) {
        var p = a.play();
        if (p && p.catch) p.catch(function () {});
    } else {
        a.pause();
    }
    schedulePlayerUI();
}

function seekPlayer(ev) {
    var bar = document.getElementById('fp-progress');
    var a = getAudioEl();
    if (!bar || !a || !a.duration || !isFinite(a.duration)) return;
    var r = bar.getBoundingClientRect();
    var clientX = ev.clientX;
    if (ev.touches && ev.touches[0]) clientX = ev.touches[0].clientX;
    var ratio = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    a.currentTime = ratio * a.duration;
    schedulePlayerUI();
}

function seekPlayerKey(ev) {
    var a = getAudioEl();
    if (!a || !a.duration || !isFinite(a.duration)) return;
    var step = ev.key === 'ArrowRight' ? 5 : ev.key === 'ArrowLeft' ? -5 : 0;
    if (step) {
        ev.preventDefault();
        a.currentTime = Math.min(a.duration, Math.max(0, a.currentTime + step));
        schedulePlayerUI();
    }
}

// Raccourcis clavier globaux (hors champs de saisie)
document.addEventListener('keydown', function (ev) {
        var _kbm = document.getElementById('kb-help-modal');
        if (_kbm && (ev.key === 'Escape' || ev.key === '?' )) { ev.preventDefault(); _kbm.remove(); return; }

    var tag = (ev.target && ev.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (ev.target && ev.target.isContentEditable)) return;
    var fp = document.getElementById('floating-player');
    var playerOpen = fp && !fp.classList.contains('hidden');
    // Espace = play/pause
    if (ev.code === 'Space' && playerOpen) {
        ev.preventDefault();
        if (typeof togglePlayerPlay === 'function') togglePlayerPlay();
        else if (typeof togglePlay === 'function') togglePlay();
        return;
    }
    // N = suivant, P = précédent, M = muet
    if (playerOpen && !ev.metaKey && !ev.ctrlKey && !ev.altKey) {
        if (ev.key === 'n' || ev.key === 'N') { ev.preventDefault(); playNext(); return; }
        if (ev.key === 'p' || ev.key === 'P') { ev.preventDefault(); playPrev(); return; }
        if (ev.key === 'm' || ev.key === 'M') { ev.preventDefault(); if (typeof toggleMute === 'function') toggleMute(); return; }
        if (ev.key === '?' || ev.key === '/') { ev.preventDefault(); showKeyboardHelp(); return; }
        if (ev.key === 'q' || ev.key === 'Q') { ev.preventDefault(); if (typeof toggleQueuePanel === 'function') toggleQueuePanel(); return; }
    }
    if (ev.code === 'ArrowRight' && (ev.metaKey || ev.ctrlKey)) playNext();
    else if (ev.code === 'ArrowLeft' && (ev.metaKey || ev.ctrlKey)) playPrev();
});

window.playNext = playNext;
window.playPrev = playPrev;

/* ── Historique d'écoute (visiteurs) ── */
function persistPlayHistory() {
    try {
        var slim = PLAY_HISTORY.slice(-20).map(function (h) {
            var mi = h.mediaInfo || null;
            var im = h.img || (mi && (mi.image || mi.img)) || '';
            if (mi && im && !mi.image) mi = Object.assign({}, mi, { image: im });
            return {
                key: h.key, title: h.title, artist: h.artist, src: h.src, img: im,
                mediaInfo: mi
            };
        });
        sessionStorage.setItem('chaabi_play_history', JSON.stringify(slim));
    } catch (_) {}
}
function clearPlayHistory() {
    try {
        PLAY_HISTORY = [];
        PLAY_IDX = -1;
        sessionStorage.removeItem('chaabi_play_history');
    } catch (_) {}
    try { if (typeof renderRecentPlayed === 'function') renderRecentPlayed(); } catch (_) {}
    try { if (typeof renderContinueBar === 'function') renderContinueBar(); } catch (_) {}
    try { if (typeof renderMaRadio === 'function') renderMaRadio(); } catch (_) {}
    try { if (typeof renderOnAirHistory === 'function') renderOnAirHistory(); } catch (_) {}
    if (typeof showToast === 'function') {
        showToast((typeof currentLang !== 'undefined' && currentLang === 'ar') ? 'تم مسح السجل' : 'Historique vidé', 'info');
    }
}
window.clearPlayHistory = clearPlayHistory;

function restorePlayHistory() {
    try {
        var raw = sessionStorage.getItem('chaabi_play_history');
        if (!raw) return;
        var arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length) {
            PLAY_HISTORY = arr;
            PLAY_IDX = PLAY_HISTORY.length - 1;
        }
    } catch (_) {}
}
function renderRecentPlayed() {
    var wrap = document.getElementById('home-recent-wrap');
    var box = document.getElementById('home-recent');
    if (!wrap || !box) return;
    var list = PLAY_HISTORY.slice().reverse().slice(0, 12);
    if (!list.length) {
        wrap.classList.add('hidden');
        box.innerHTML = '';
        return;
    }
    wrap.classList.remove('hidden');
    box.innerHTML = list.map(function (h) {
        var mi = h.mediaInfo || {};
        var img = (typeof resolveMediaImage === 'function')
            ? resolveMediaImage(h.img, mi.image, mi.img, window._lastArtistImage)
            : (typeof formatPath === 'function' ? formatPath(h.img) : (h.img || ''));
        if (!img) img = (typeof IMG_FALLBACK !== 'undefined' ? IMG_FALLBACK : 'assets/img_hero/onair.png');
        var title = h.title || '';
        var artist = h.artist || '';
        if (mi.type === 'interview') {
            var lab = (typeof mediaTypeTitle === 'function') ? mediaTypeTitle('interview') : 'Interview';
            if (!title || title === 'Interview' || title.indexOf('Interview') === 0) {
                title = lab + (artist ? ' — ' + artist : '');
            }
        }
        var tEsc = (typeof jsStr === 'function' ? jsStr(title) : String(title).replace(/</g, ''));
        var aEsc = (typeof jsStr === 'function' ? jsStr(artist) : String(artist).replace(/</g, ''));
        var playImg = img;
        return '<button type="button" class="recent-chip" title="' + tEsc.replace(/"/g, '&quot;') + (artist ? ' — ' + aEsc.replace(/"/g, '&quot;') : '') + '" onclick="playTrack(' +
            JSON.stringify(h.title || '') + ',' + JSON.stringify(h.artist || '') + ',' +
            JSON.stringify(h.src || '') + ',' + JSON.stringify(playImg || '') + ',' +
            JSON.stringify(mi) + ')">' +
            '<img src="' + String(img).replace(/"/g, '') + '" alt="" width="40" height="40" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=\'assets/img_hero/onair.png\'">' +
            '<span class="recent-chip-text">' +
              '<span class="rc-title">' + tEsc + '</span>' +
              (artist ? '<span class="rc-artist">' + aEsc + '</span>' : '') +
            '</span></button>';
    }).join('');
}
function renderHomeFavorites() {
    var wrap = document.getElementById('home-fav-wrap');
    var box = document.getElementById('home-fav');
    if (!wrap || !box) return;
    var list = (typeof loadFavorites === 'function' ? loadFavorites() : []).slice(0, 10);
    var isAr = (typeof window !== 'undefined' && window.currentLang === 'ar') || (typeof currentLang !== 'undefined' && currentLang === 'ar');
    // Titre + bouton vider (toujours visibles si favoris)
    var titleRow = wrap.querySelector('.fav-title-row');
    if (!titleRow) {
        titleRow = document.createElement('div');
        titleRow.className = 'fav-title-row flex items-center justify-between gap-2 mb-2 px-1';
        var oldP = wrap.querySelector('p');
        if (oldP) {
            titleRow.appendChild(oldP);
            wrap.insertBefore(titleRow, box);
        } else {
            titleRow.innerHTML = '<p class="text-xs uppercase tracking-widest text-amber-600 dark:text-amber-300/90 font-bold"><i class="fas fa-star mr-1.5"></i><span data-i18n="my_favorites">' + (isAr ? 'مفضلتي' : 'Mes favoris') + '</span></p>';
            wrap.insertBefore(titleRow, box);
        }
    }
    var clearEl = titleRow.querySelector('.btn-clear-favs');
    if (!list.length) {
        wrap.classList.add('hidden');
        box.innerHTML = '';
        if (clearEl) clearEl.remove();
        return;
    }
    wrap.classList.remove('hidden');
    if (!clearEl) {
        clearEl = document.createElement('button');
        clearEl.type = 'button';
        clearEl.className = 'btn-clear-favs text-xs font-bold px-2.5 py-1 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-100 border border-red-200 dark:border-red-800';
        clearEl.onclick = function (e) { e.stopPropagation(); if (typeof clearFavorites === 'function') clearFavorites(); };
        titleRow.appendChild(clearEl);
    }
    clearEl.textContent = isAr ? 'مسح المفضلة' : 'Vider les favoris';
    box.innerHTML = list.map(function (f) {
        var img = (typeof resolveMediaImage === 'function')
            ? resolveMediaImage(f.img, f.image)
            : (typeof formatPath === 'function' ? formatPath(f.img) : (f.img || ''));
        if (!img) img = (typeof IMG_FALLBACK !== 'undefined' ? IMG_FALLBACK : 'assets/img_hero/onair.png');
        var title = f.title || '';
        var artist = f.artist || f.invite || '';
        var type = f.type || 'chanson';
        var isAr = (typeof window !== 'undefined' && window.currentLang === 'ar') || (typeof currentLang !== 'undefined' && currentLang === 'ar');
        if (type === 'interview') {
            var lab = (typeof mediaTypeTitle === 'function') ? mediaTypeTitle('interview') : 'Interview';
            if (!title || title === 'Interview' || /^Interview\b/i.test(title)) {
                title = lab;
            }
        }
        var audio = f.audio || '';
        var mi = { type: type, id: f.id, title: title, artist: artist, image: img, numero: '', invite: artist };
        var tEsc = (typeof jsStr === 'function' ? jsStr(title) : String(title).replace(/</g, ''));
        var aEsc = (typeof jsStr === 'function' ? jsStr(artist) : String(artist).replace(/</g, ''));
        var typeLab = type === 'emission' ? (isAr ? 'برنامج' : 'Émission')
            : type === 'interview' ? (isAr ? 'مقابلة' : 'Interview')
            : type === 'artiste' ? (isAr ? 'فنان' : 'Artiste')
            : (isAr ? 'أغنية' : 'Chanson');
        var subLine = artist || typeLab;
        var detailKind = type === 'emission' ? 'emission_complet' : (type === 'artiste' ? 'artiste_complet' : (type === 'interview' ? 'interview' : 'artiste_complet'));
        var btn;
        if (audio) {
            btn = '<button type="button" class="recent-chip recent-chip--fav" title="' + tEsc.replace(/"/g, '&quot;') + (artist ? ' — ' + aEsc.replace(/"/g, '&quot;') : '') + '" onclick="playTrack(' +
                JSON.stringify(title) + ',' + JSON.stringify(artist) + ',' + JSON.stringify(audio) + ',' + JSON.stringify(img) + ',' + JSON.stringify(mi) + ')">';
        } else {
            btn = '<button type="button" class="recent-chip recent-chip--fav" title="' + tEsc.replace(/"/g, '&quot;') + '" onclick="if(typeof loadDetail===\'function\')loadDetail(\'' + detailKind + '\',' + f.id + ')">';
        }
        return btn +
            '<i class="fas fa-star text-amber-400 text-xs shrink-0"></i>' +
            '<img src="' + String(img).replace(/"/g, '') + '" alt="" width="40" height="40" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=\'assets/img_hero/onair.png\'">' +
            '<span class="recent-chip-text">' +
              '<span class="rc-title">' + tEsc + '</span>' +
              '<span class="rc-artist">' + (typeof jsStr === 'function' ? jsStr(subLine) : subLine) + '</span>' +
            '</span></button>';
    }).join('');
}

function renderContinueBar() {
    var bar = document.getElementById('continue-bar');
    if (!bar) return;
    var a = typeof getAudioEl === 'function' ? getAudioEl() : null;
    var last = PLAY_HISTORY.length ? PLAY_HISTORY[PLAY_HISTORY.length - 1] : null;
    var playing = a && a.src && !a.paused && !a.ended;
    if (!last || playing) {
        bar.classList.add('hidden');
        return;
    }
    var isAr = (typeof window !== 'undefined' && window.currentLang === 'ar') || (typeof currentLang !== 'undefined' && currentLang === 'ar');
    bar.classList.remove('hidden');
    bar.innerHTML = '<div class="continue-inner" role="button" tabindex="0" onclick="resumeContinueListen()" onkeydown="if(event.key===\'Enter\')resumeContinueListen()">' +
        '<i class="fas fa-play-circle text-emerald-400 text-lg"></i>' +
        '<div class="min-w-0 flex-1">' +
        '<p class="text-[10px] uppercase tracking-wider font-bold text-emerald-400/90">' + (isAr ? 'واصل الاستماع' : 'Continuer l\'écoute') + '</p>' +
        '<p class="text-sm font-semibold truncate">' + (typeof jsStr === 'function' ? jsStr(last.title) : (last.title || '')) +
        (last.artist ? ' <span class="opacity-60 font-normal">— ' + (typeof jsStr === 'function' ? jsStr(last.artist) : last.artist) + '</span>' : '') + '</p></div>' +
        '<button type="button" class="btn-continue" id="btn-continue-listen" onclick="event.stopPropagation();resumeContinueListen()">' +
        '<i class="fas fa-play mr-1"></i>' + (isAr ? 'استئناف' : 'Reprendre') + '</button></div>';
}

function resumeContinueListen() {
    try {
        var last = PLAY_HISTORY.length ? PLAY_HISTORY[PLAY_HISTORY.length - 1] : null;
        if (!last || !last.src) {
            if (typeof showToast === 'function') {
                showToast((typeof currentLang !== 'undefined' && currentLang === 'ar') ? 'لا يوجد مقطع للاستئناف' : 'Aucune piste a reprendre', 'info');
            }
            return;
        }
        playTrack(
            last.title || '',
            last.artist || '',
            last.src || '',
            last.img || '',
            last.mediaInfo || { type: 'chanson', id: 0 },
            true
        );
    } catch (e) {
        console.warn('[Chaabi] resumeContinueListen', e);
    }
}
window.resumeContinueListen = resumeContinueListen;
window.renderRecentPlayed = renderRecentPlayed;
window.renderHomeFavorites = renderHomeFavorites;
window.renderContinueBar = renderContinueBar;
window.persistPlayHistory = persistPlayHistory;
window.restorePlayHistory = restorePlayHistory;


function persistPlayerState() {
    try {
        var a = getAudioEl();
        var src = a ? (a.currentSrc || a.src || '') : '';
        if (!src && !(CURRENT_PLAY && CURRENT_PLAY.key)) return;
        var payload = {
            title: (CURRENT_PLAY && CURRENT_PLAY.title) || (document.getElementById('fp-title') && document.getElementById('fp-title').innerText) || '',
            artist: (CURRENT_PLAY && CURRENT_PLAY.artist) || (document.getElementById('fp-artist') && document.getElementById('fp-artist').innerText) || '',
            src: src,
            img: (CURRENT_PLAY && CURRENT_PLAY.image) || (document.getElementById('fp-img') && document.getElementById('fp-img').getAttribute('src')) || '',
            mediaInfo: {
                type: (CURRENT_PLAY && CURRENT_PLAY.mediaType) || 'chanson',
                id: (CURRENT_PLAY && CURRENT_PLAY.mediaId) || 0,
                title: (CURRENT_PLAY && CURRENT_PLAY.title) || '',
                artist: (CURRENT_PLAY && CURRENT_PLAY.artist) || '',
                numero: (CURRENT_PLAY && CURRENT_PLAY.numero) || '',
                invite: (CURRENT_PLAY && CURRENT_PLAY.invite) || ''
            },
            t: a && isFinite(a.currentTime) ? a.currentTime : 0,
            playing: !!(a && !a.paused && !a.ended && src),
            volume: a ? a.volume : 1,
            rate: a ? a.playbackRate : 1,
            at: Date.now()
        };
        sessionStorage.setItem('chaabi_player_resume', JSON.stringify(payload));
        // localStorage en secours (certains navigateurs vident session au reload rare)
        try { localStorage.setItem('chaabi_player_resume', JSON.stringify(payload)); } catch (_) {}
    } catch (_) {}
}
function restorePlayerState() {
    try {
        var raw = sessionStorage.getItem('chaabi_player_resume') || localStorage.getItem('chaabi_player_resume');
        if (!raw) return;
        try { sessionStorage.removeItem('chaabi_player_resume'); } catch (_) {}
        try { localStorage.removeItem('chaabi_player_resume'); } catch (_) {}
        var s = JSON.parse(raw);
        if (!s || !s.src) return;
        // Ignore si trop vieux (> 2h)
        if (s.at && (Date.now() - s.at) > 7200000) return;
        playTrack(s.title || '', s.artist || '', s.src, s.img || '', s.mediaInfo || {}, true);
        var a = getAudioEl();
        if (!a) return;
        var fp = document.getElementById('floating-player');
        if (fp) fp.classList.remove('hidden');
        var applyT = function () {
            try {
                if (s.volume != null) a.volume = s.volume;
                if (s.rate) a.playbackRate = s.rate;
                if (s.t > 0.5 && isFinite(s.t)) a.currentTime = s.t;
            } catch (_) {}
            if (s.playing) {
                var p = a.play();
                if (p && p.catch) {
                    // Autoplay policy : au moins le player est visible, l'utilisateur peut reprendre
                    p.catch(function () {
                        if (typeof showToast === 'function') {
                            showToast(currentLang === 'ar' ? 'اضغط تشغيل للمتابعة' : 'Appuyez sur Lecture pour continuer', 'info');
                        }
                    });
                }
            } else {
                try { a.pause(); } catch (_) {}
            }
            schedulePlayerUI();
        };
        if (a.readyState >= 1) {
            applyT();
        } else {
            var once = function () {
                a.removeEventListener('loadedmetadata', once);
                a.removeEventListener('canplay', once);
                applyT();
            };
            a.addEventListener('loadedmetadata', once);
            a.addEventListener('canplay', once);
            // Filet de sécurité
            setTimeout(applyT, 800);
        }
    } catch (_) {}
}
window.persistPlayerState = persistPlayerState;
window.restorePlayerState = restorePlayerState;

window.playTrack = playTrack;
window.RADIO_CONTINUOUS = RADIO_CONTINUOUS;


function persistQueue() {
    try {
        sessionStorage.setItem('chaabi_queue', JSON.stringify(RADIO_QUEUE.slice(0, 40)));
    } catch (_) {}
}
function restoreQueue() {
    try {
        var raw = sessionStorage.getItem('chaabi_queue');
        if (!raw) return;
        var arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length) RADIO_QUEUE = arr;
    } catch (_) {}
}
function addToQueue(title, artist, src, img, mediaInfo, playNext) {
    if (!src) return;
    var type = (mediaInfo && mediaInfo.type) || 'chanson';
    var id = mediaInfo && mediaInfo.id;
    if (id && CURRENT_PLAY && CURRENT_PLAY.mediaType === type && CURRENT_PLAY.mediaId == id) {
        if (typeof showToast === 'function') showToast(currentLang === 'ar' ? 'يُشغّل الآن' : 'Déjà en lecture', 'info');
        return;
    }
    if (id && RADIO_QUEUE.some(function (q) {
        return q.mediaInfo && q.mediaInfo.type === type && q.mediaInfo.id == id;
    })) {
        if (typeof showToast === 'function') showToast(currentLang === 'ar' ? 'موجود في القائمة' : 'Déjà dans la file', 'info');
        return;
    }
    var entry = {
        title: title || '',
        artist: artist || '',
        src: src,
        img: img || '',
        mediaInfo: mediaInfo || { type: type, id: id || 0, title: title || '', artist: artist || '', numero: '', invite: '' }
    };
    if (playNext) RADIO_QUEUE.unshift(entry);
    else RADIO_QUEUE.push(entry);
    persistQueue();
    renderQueueUI();
    if (typeof showToast === 'function') {
        showToast(
            playNext
                ? (currentLang === 'ar' ? 'يُشغّل بعد الحالي' : 'Ajouté en prochain')
                : (currentLang === 'ar' ? 'أضيف إلى القائمة' : 'Ajouté à la file'),
            'success'
        );
    }
    // Si rien ne joue, démarrer
    var a = getAudioEl();
    if ((!CURRENT_PLAY || !CURRENT_PLAY.key) || (a && a.paused && !a.src)) {
        playQueueAt(0);
    }
}
function removeFromQueue(index) {
    if (index < 0 || index >= RADIO_QUEUE.length) return;
    RADIO_QUEUE.splice(index, 1);
    persistQueue();
    renderQueueUI();
}
function clearQueue() {
    RADIO_QUEUE = [];
    persistQueue();
    renderQueueUI();
    if (typeof showToast === 'function') showToast(currentLang === 'ar' ? 'تم تفريغ القائمة' : 'File vidée', 'info');
}
function moveQueueItem(index, dir) {
    var j = index + dir;
    if (index < 0 || j < 0 || index >= RADIO_QUEUE.length || j >= RADIO_QUEUE.length) return;
    var tmp = RADIO_QUEUE[index];
    RADIO_QUEUE[index] = RADIO_QUEUE[j];
    RADIO_QUEUE[j] = tmp;
    persistQueue();
    renderQueueUI();
}
function syncPlayerClearance() {
    try {
        var q = document.getElementById('fp-queue');
        var open = QUEUE_PANEL_USER_OPEN && q && !q.classList.contains('hidden') && RADIO_QUEUE && RADIO_QUEUE.length;
        document.body.classList.toggle('player-queue-open', !!open);
    } catch (_) {}
}
function renderQueueUI() {
    try { if (typeof renderOnAirQueue === "function" && typeof UIState !== "undefined" && UIState.view === "onair") renderOnAirQueue(); } catch (_e) {}
    try { if (typeof renderOnAirHistory === "function" && typeof UIState !== "undefined" && UIState.view === "onair") renderOnAirHistory(); } catch (_e2) {}

    var box = document.getElementById('fp-queue');
    if (!box) return;
    if (!RADIO_QUEUE.length) {
        box.innerHTML = '';
        box.classList.add('hidden');
        syncPlayerClearance();
        return;
    }
    var isAr = currentLang === 'ar';
    var html = '';
    html += '<div class="fp-queue-head">';
    html += '<span class="fp-queue-title">' + (isAr ? 'قائمة الانتظار' : 'File d\'attente') + ' · ' + RADIO_QUEUE.length + '</span>';
    html += '<div class="fp-queue-actions">';
    html += '<button type="button" class="fp-queue-btn" onclick="clearQueue()" title="' + (isAr ? 'تفريغ' : 'Tout vider') + '"><i class="fas fa-trash-can"></i></button>';
    html += '</div></div>';
    html += '<div class="fp-queue-list">';
    RADIO_QUEUE.slice(0, 12).forEach(function (q, i) {
        var t = (q.title || '').replace(/</g, '');
        var a = (q.artist || '').replace(/</g, '');
        var im = (q.img || q.image || (q.mediaInfo && q.mediaInfo.image) || window._lastArtistImage || 'assets/img_hero/onair.png').replace(/"/g, '');
        html += '<div class="fp-queue-item">';
        html += '<button type="button" class="fp-queue-main" onclick="playQueueAt(' + i + ')" title="' + (isAr ? 'تشغيل' : 'Lire') + '">';
        html += '<img class="fp-queue-cover" src="' + im + '" alt="" width="36" height="36" loading="lazy" onerror="this.onerror=null;this.src=\'assets/img_hero/onair.png\'">';
        html += '<span class="fp-queue-num">' + (i + 1) + '</span>';
        html += '<span class="fp-queue-meta"><span class="fp-queue-t">' + t + '</span><span class="fp-queue-a">' + a + '</span></span>';
        html += '</button>';
        html += '<div class="fp-queue-item-actions">';
        html += '<button type="button" class="fp-queue-btn" onclick="moveQueueItem(' + i + ',-1)" title="↑" ' + (i === 0 ? 'disabled' : '') + '><i class="fas fa-chevron-up"></i></button>';
        html += '<button type="button" class="fp-queue-btn" onclick="moveQueueItem(' + i + ',1)" title="↓" ' + (i >= Math.min(RADIO_QUEUE.length, 12) - 1 ? 'disabled' : '') + '><i class="fas fa-chevron-down"></i></button>';
        html += '<button type="button" class="fp-queue-btn fp-queue-btn-danger" onclick="removeFromQueue(' + i + ')" title="' + (isAr ? 'إزالة' : 'Retirer') + '"><i class="fas fa-times"></i></button>';
        html += '</div></div>';
    });
    if (RADIO_QUEUE.length > 12) {
        html += '<p class="fp-queue-more">+' + (RADIO_QUEUE.length - 12) + (isAr ? ' أخرى' : ' autres') + '</p>';
    }
    html += '</div>';
    box.innerHTML = html;
    // Ne pas ouvrir automatiquement (ex: « Écouter tout » avec 40+ pistes)
    if (QUEUE_PANEL_USER_OPEN) {
        box.classList.remove('hidden');
    } else {
        box.classList.add('hidden');
    }
    // Badge nombre sur le bouton file
    try {
        var qb = document.getElementById('fp-queue-btn');
        if (qb) {
            var n = RADIO_QUEUE.length;
            qb.setAttribute('data-count', n > 0 ? String(n) : '');
            qb.title = (typeof currentLang !== 'undefined' && currentLang === 'ar' ? 'قائمة الانتظار' : 'File d\'attente') + (n ? ' (' + n + ')' : '');
        }
    } catch (_) {}
    syncPlayerClearance();
}
function playQueueAt(index) {
    if (index < 0 || index >= RADIO_QUEUE.length) return;
    var item = RADIO_QUEUE.splice(index, 1)[0];
    persistQueue();
    playTrack(item.title, item.artist, item.src, item.img, item.mediaInfo, false);
    renderQueueUI();
}
function updatePlayerFavBtn() {
    var btn = document.getElementById('fp-fav');
    if (!btn || !CURRENT_PLAY || !CURRENT_PLAY.mediaType || !CURRENT_PLAY.mediaId) return;
    var on = typeof isFavorite === 'function' && isFavorite(CURRENT_PLAY.mediaType, CURRENT_PLAY.mediaId);
    btn.classList.toggle('is-fav', !!on);
    var ic = btn.querySelector('i');
    if (ic) ic.className = (on ? 'fas' : 'far') + ' fa-star';
}
function toggleCurrentFavorite() {
    if (!CURRENT_PLAY || !CURRENT_PLAY.mediaType || !CURRENT_PLAY.mediaId) return;
    toggleFavorite(
        CURRENT_PLAY.mediaType, CURRENT_PLAY.mediaId,
        CURRENT_PLAY.title, CURRENT_PLAY.artist, CURRENT_PLAY.image,
        (getAudioEl() && getAudioEl().src) || '',
        document.getElementById('fp-fav')
    );
}
function shareCurrentTrack() {
    if (!CURRENT_PLAY || !CURRENT_PLAY.mediaType || !CURRENT_PLAY.mediaId) return;
    shareMedia(CURRENT_PLAY.mediaType, CURRENT_PLAY.mediaId, CURRENT_PLAY.title, CURRENT_PLAY.artist);
}
window.renderQueueUI = renderQueueUI;
window.playQueueAt = playQueueAt;
window.addToQueue = addToQueue;
window.removeFromQueue = removeFromQueue;
window.clearQueue = clearQueue;
window.moveQueueItem = moveQueueItem;
window.persistQueue = persistQueue;
window.restoreQueue = restoreQueue;
window.toggleCurrentFavorite = toggleCurrentFavorite;
window.shareCurrentTrack = shareCurrentTrack;
window.updatePlayerFavBtn = updatePlayerFavBtn;

window.CURRENT_PLAY = CURRENT_PLAY;
window.RADIO_QUEUE = RADIO_QUEUE;

window.playHistoryAt = playHistoryAt;
window.PLAY_HISTORY = PLAY_HISTORY;


function showKeyboardHelp() {
    var isAr = (typeof currentLang !== 'undefined' && currentLang === 'ar');
    var existing = document.getElementById('kb-help-modal');
    if (existing) { existing.remove(); return; }
    var rows = isAr ? [
        ['مسافة', 'تشغيل / إيقاف'],
        ['N', 'المقطع التالي'],
        ['P', 'المقطع السابق'],
        ['M', 'كتم الصوت'],
        ['Q', 'قائمة الانتظار'],
        ['?', 'هذه المساعدة']
    ] : [
        ['Espace', 'Lecture / Pause'],
        ['N', 'Piste suivante'],
        ['P', 'Piste précédente'],
        ['M', 'Muet'],
        ['Q', 'File d\'attente'],
        ['?', 'Cette aide']
    ];
    var html = '<div id="kb-help-modal" class="kb-help-overlay" role="dialog" aria-modal="true" aria-label="' + (isAr ? 'اختصارات' : 'Raccourcis clavier') + '">';
    html += '<div class="kb-help-card">';
    html += '<div class="kb-help-head"><strong>' + (isAr ? 'اختصارات لوحة المفاتيح' : 'Raccourcis clavier') + '</strong>';
    html += '<button type="button" class="kb-help-close" aria-label="OK" onclick="document.getElementById(\'kb-help-modal\').remove()">×</button></div>';
    html += '<ul class="kb-help-list">';
    for (var i = 0; i < rows.length; i++) {
        html += '<li><kbd>' + rows[i][0] + '</kbd><span>' + rows[i][1] + '</span></li>';
    }
    html += '</ul><p class="kb-help-note">' + (isAr ? 'اضغط ؟ أو Esc للإغلاق' : 'Appuyez sur ? ou Échap pour fermer') + '</p></div></div>';
    document.body.insertAdjacentHTML('beforeend', html);
    var ov = document.getElementById('kb-help-modal');
    if (ov) ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
}
window.showKeyboardHelp = showKeyboardHelp;
