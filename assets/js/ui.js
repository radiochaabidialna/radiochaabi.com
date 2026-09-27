/**
 * Chaabi Music Pro — module JS
 * Chargé en séquence (defer). Les onclick HTML restent valides (scope global).
 */
/* ── UI : navigation, cartes, formulaires, recherche, détail ── */
        function toggleMobileMenu() {
            var mm = document.getElementById('mobile-menu');
            var btn = document.getElementById('mobile-menu-btn');
            if (!mm) return;
            var open = mm.classList.toggle('hidden') === false;
            if (btn) {
                btn.setAttribute('aria-expanded', open ? 'true' : 'false');
                btn.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
            }
        }
        window.toggleMobileMenu = toggleMobileMenu;

        function imgFallback(el) {
            if (!el || el.dataset.fallbackApplied) return;
            el.dataset.fallbackApplied = '1';
            el.src = '/music/images/radiochabidialna.jpg';
            el.classList.add('img-fallback');
        }
        window.imgFallback = imgFallback;


        /* ══════════════════════════════════════════
           GESTION DES ÉTATS UI (vues)
           source unique pour home / list / detail
           ══════════════════════════════════════════ */
        var UIState = {
            view: 'home',       // 'home' | 'list' | 'detail'
            tab: 'home',        // section liste (artistes, chansons…)
            detail: null,       // { type, id } | null
            searching: false
        };
        var listSearchQuery = '';
        var _listSearchTimer = null;

        function uiGet(id) {
            return document.getElementById(id);
        }

        /** Affiche une seule vue principale et masque les autres */
        function setUIView(view, opts) {
            opts = opts || {};
            var views = ['view-home', 'view-list', 'view-detail', 'view-admin', 'view-onair', 'view-radio'];
            views.forEach(function (id) {
                var el = uiGet(id);
                if (!el) return;
                if (id === 'view-' + view) el.classList.remove('hidden');
                else el.classList.add('hidden');
            });
            UIState.view = view;
            if (typeof setNavActive === 'function') setNavActive(opts.tab || view);
            if (opts.tab) {
                if (UIState.tab !== opts.tab) { listSearchQuery = ''; var _ls = document.getElementById('list-search'); if (_ls) _ls.value = ''; }
                UIState.tab = opts.tab;
            }
            if (opts.detail !== undefined) UIState.detail = opts.detail;
            if (opts.searching !== undefined) UIState.searching = !!opts.searching;

            try {
                document.body.setAttribute('data-ui-view', view);
                if (UIState.tab) document.body.setAttribute('data-ui-tab', UIState.tab);
            } catch (_) {}

            // Fermer suggestions recherche
            var box = uiGet('search-suggest');
            if (box && !opts.keepSearch) box.classList.add('hidden');

            // Menu mobile
            var mm = uiGet('mobile-menu');
            if (mm) mm.classList.add('hidden');
            var mbtn = uiGet('mobile-menu-btn');
            if (mbtn) {
                mbtn.setAttribute('aria-expanded', 'false');
                var ic = mbtn.querySelector('i');
                if (ic) ic.className = 'fas fa-bars';
            }

            if (opts.scroll !== false) {
                try {
                    window.scrollTo({ top: 0, behavior: opts.smooth === false ? 'auto' : 'smooth' });
                } catch (_) {
                    window.scrollTo(0, 0);
                }
            }
            return uiGet('view-' + view);
        }

        function setUIHash(hash) {
            try {
                hash = String(hash || '').replace(/^#/, '');
                if ((location.hash || '').replace(/^#/, '') !== hash) {
                    history.replaceState(null, '', location.pathname + location.search + (hash ? '#' + hash : ''));
                }
                if (hash) sessionStorage.setItem('chaabi_last_view', hash);
            } catch (_) {}
        }

        window.UIState = UIState;
        window.setUIView = setUIView;
        window.setUIHash = setUIHash;


        /** Titre + image de section (listes Artistes, Chansons, etc.) */

        /** Titre + hero + fil d'Ariane pour chaque section (Artistes, Chansons…) */

        /** Bandeau section : titre + fil d'Ariane (toujours visible) */
        function applySectionHero(view) {
            try {
                var lang = (typeof currentLang !== 'undefined' && currentLang) ? currentLang : 'fr';
                var t = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang] : {};
                var titleMap = {
                    artistes: 'artists', chansons: 'songs', emissions: 'shows',
                    interviews: 'interviews', bouqalla: 'proverbs', dedicaces: 'dedicaces',
                    commentaires: 'comments', contacts: 'contacts'
                };
                var defaults = {
                    artists: 'Artistes', songs: 'Chansons', shows: 'Émissions',
                    interviews: 'Interviews', proverbs: 'Bouqalla', dedicaces: 'Dédicaces',
                    comments: 'Commentaires', contacts: 'Contacts'
                };
                var imgMap = {
                    home: '/music/news_hero/moisaique.png',
                    artistes: '/music/news_hero/radiochaabi_artistes.webp',
                    chansons: '/music/news_hero/chansons_chaabi.webp',
                    emissions: '/music/news_hero/emissions_chaabi.webp',
                    interviews: '/music/news_hero/interviews_chaabi.webp',
                    bouqalla: '/music/news_hero/bouqalla_chaabi.webp',
                    dedicaces: '/music/news_hero/dedicaces_chaabi.webp',
                    commentaires: '/music/news_hero/radiochaabi_commentaires.webp',
                    contacts: '/music/news_hero/radiochaabi_contacts.webp',
                    onair: '/music/news_hero/onair.webp',
                    qacidates: '/music/news_hero/qacidate.webp',
                    memoire: '/music/news_hero/histoire.webp',
                    histoire: '/music/news_hero/histoire.webp'
                };

                var viewList = document.getElementById('view-list');
                // Créer / récupérer la barre de section (indépendante du hero CSS)
                var bar = document.getElementById('section-page-bar');
                if (!bar && viewList) {
                    bar = document.createElement('div');
                    bar.id = 'section-page-bar';
                    viewList.insertBefore(bar, viewList.firstChild);
                }

                if (!view || view === 'home') {
                    if (bar) bar.style.display = 'none';
                    var hero0 = document.getElementById('section-hero');
                    if (hero0) { hero0.style.display = 'none'; hero0.setAttribute('aria-hidden', 'true'); }
                    var bc0 = document.getElementById('section-breadcrumb');
                    if (bc0) bc0.style.display = 'none';
                    var fb0 = document.getElementById('list-title-fallback');
                    if (fb0) fb0.style.display = 'none';
                    return;
                }

                var key = titleMap[view] || view;
                var iconMap = {
                    artistes: 'mic', chansons: 'oud', emissions: 'radio',
                    interviews: 'mic', bouqalla: 'lantern', dedicaces: 'heart',
                    commentaires: 'note', contacts: 'radio', qacidates: 'scroll'
                };
                var sectionIcon = iconMap[view] || 'star8';
                var title = (t[key] || defaults[key] || view || '').toString();
                if (title) title = title.charAt(0).toUpperCase() + title.slice(1);
                var homeLabel = t.home || (lang === 'ar' ? 'الرئيسية' : 'Accueil');
                var sep = lang === 'ar' ? '‹' : '›';
                var desc = t['section_desc_' + view] || '';
                var img = imgMap[view] || '/music/news_hero/moisaique.png';

                // === Barre ultra-visible (inline styles) ===
                if (bar) {
                    bar.style.cssText = [
                        'display:block',
                        'margin:0 0 1.35rem 0',
                        'border-radius:1.25rem',
                        'overflow:hidden',
                        'border:1px solid rgba(245,185,66,0.22)',
                        'box-shadow:0 8px 28px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)',
                        'background:transparent',
                        'width:100%'
                    ].join(';');
                    /* Image claire : cover + brightness, voile léger seulement */
                    bar.innerHTML =
                        '<div class="section-hero-banner" style="position:relative;width:100%;aspect-ratio:1200/400;max-height:400px;min-height:120px;overflow:hidden;border-radius:1.25rem 1.25rem 0 0;">' +
                        '<div style="position:absolute;inset:0;background-image:url(\'' + img + '\');background-size:cover;background-position:center center;background-repeat:no-repeat;filter:none;"></div>' +
                        '<div style="position:relative;z-index:1;height:100%;display:flex;flex-direction:column;justify-content:flex-end;padding:1rem 1.15rem 1.15rem;">' +
                        '<div style="display:inline-block;max-width:min(100%,28rem);padding:0.75rem 1rem;border-radius:1rem;background:rgba(15,23,42,0.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.14);box-shadow:0 8px 24px rgba(0,0,0,0.35);">' +
                        '<div style="font-size:0.65rem;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;color:#fde68a;margin-bottom:0.25rem;">Radio Chaabi</div>' +
                        '<h2 style="margin:0;font-size:clamp(1.25rem,2.8vw,1.75rem);font-weight:900;line-height:1.2;color:#ffffff;display:flex;align-items:center;gap:0.45rem;flex-wrap:wrap;">' + (typeof chaabiIcon === 'function' ? chaabiIcon(sectionIcon, 'ci-amber ci-lg') : '') + ' ' + title + '</h2>' +
                        (desc ? '<p style="margin:0.35rem 0 0;font-size:0.86rem;line-height:1.35;color:rgba(255,255,255,0.92);">' + desc + '</p>' : '') +
                        '</div></div></div>' +
                        '<nav aria-label="Fil d\'Ariane" style="display:flex;flex-wrap:wrap;align-items:center;gap:0.4rem;padding:0.65rem 1rem;background:rgba(15,23,42,0.96);border-top:1px solid rgba(245,185,66,0.25);font-size:0.85rem;font-weight:600;border-radius:0 0 1.25rem 1.25rem;">' +
                        '<a href="#home" style="color:#fbbf24;text-decoration:none;" onclick="event.preventDefault();navigateTo(\'home\')">' + homeLabel + '</a>' +
                        '<span style="color:#64748b;" aria-hidden="true">' + sep + '</span>' +
                        '<span style="color:#e2e8f0;font-weight:800;" aria-current="page">' + title + '</span>' +
                        '</nav>';
                }

                // Sync anciens éléments si présents
                var hero = document.getElementById('section-hero');
                if (hero) hero.style.display = 'none'; // remplacé par section-page-bar
                var titleEl = document.getElementById('list-title');
                if (titleEl) titleEl.textContent = title;
                var fallback = document.getElementById('list-title-fallback');
                if (fallback) {
                    fallback.textContent = title;
                    fallback.style.display = 'none';
                }
                var bc = document.getElementById('section-breadcrumb');
                if (bc) bc.style.display = 'none';
            } catch (err) {
                console.error('applySectionHero error:', err);
            }
        }
        window.applySectionHero = applySectionHero;





        
        /** SEO dynamique par vue SPA */
        function updateSeoForView(view, detailTitle) {
            try {
                var isAr = (typeof currentLang !== 'undefined' && currentLang === 'ar');
                var base = 'https://radiochaabi.com/index.html';
                var mapFr = {
                    home: ['Radio Chaabi — Musique populaire algérienne', 'Écoutez le chaâbi : chansons, émissions, interviews et qacidates.'],
                    artistes: ['Artistes chaâbi', 'Portraits et discographies des maîtres et interprètes du chaâbi algérien.'],
                    chansons: ['Chansons chaâbi', 'Répertoire de chansons populaires algériennes à écouter en ligne.'],
                    emissions: ['Émissions Radio Chaabi', 'Archives des émissions Chaabi Dialna et invités.'],
                    interviews: ['Interviews', 'Paroles d\'artistes et invités du chaâbi.'],
                    bouqalla: ['Bouqalla', 'Sagesse populaire et proverbs du patrimoine algérien.'],
                    dedicaces: ['Dédicaces', 'Messages des auditeurs de Radio Chaabi.'],
                    onair: ['À l\'antenne', 'Ce qui est diffusé en ce moment sur Radio Chaabi.'],
                    radio: ['Ma radio', 'Favoris, récents et file d\'attente.'],
                    qacidates: ['Qacidates', 'Poésie chaâbi en arabe et en français.']
                };
                var mapAr = {
                    home: ['راديو الشعبي — الموسيقى الشعبية الجزائرية', 'استمع إلى الشابي: أغاني، برامج، مقابلات وقصيدات.'],
                    artistes: ['فنانو الشابي', 'سير ذاتية وأعمال كبار الشابي الجزائري.'],
                    chansons: ['أغاني الشابي', 'ذخيرة الأغاني الشعبية للاستماع عبر الإنترنت.'],
                    emissions: ['برامج راديو الشعبي', 'أرشيف البرامج والضيوف.'],
                    interviews: ['مقابلات', 'كلمات الفنانين والضيوف.'],
                    bouqalla: ['بوقالة', 'حكم شعبية من التراث الجزائري.'],
                    dedicaces: ['إهداءات', 'رسائل المستمعين.'],
                    onair: ['على الهواء', 'ما يُبث الآن على راديو الشعبي.'],
                    radio: ['راديوي', 'المفضلة والسجل وقائمة الانتظار.']
                };
                var map = isAr ? mapAr : mapFr;
                var pair = map[view] || mapFr.home;
                var title = detailTitle || pair[0];
                var desc = pair[1] || mapFr.home[1];
                var fullTitle = title + (isAr ? ' | راديو الشعبي' : ' | Radio Chaabi');
                document.title = fullTitle;
                var url = base + (view && view !== 'home' ? '#' + view : '');
                if (typeof setMeta === 'function') {
                    setMeta('og:title', fullTitle);
                    setMeta('og:description', desc);
                    setMeta('og:url', url);
                }
                var md = document.querySelector('meta[name="description"]');
                if (md) md.setAttribute('content', desc);
                var can = document.querySelector('link[rel="canonical"]');
                if (can) can.setAttribute('href', url.indexOf('#') >= 0 ? base : url);
                var tw = document.querySelector('meta[name="twitter:title"]');
                if (tw) tw.setAttribute('content', fullTitle);
                var td = document.querySelector('meta[name="twitter:description"]');
                if (td) td.setAttribute('content', desc);
            } catch (e) { console.warn('[SEO]', e); }
        }
        window.updateSeoForView = updateSeoForView;

        
        function setNavActive(view) {
            try {
                var v = String(view || 'home');
                document.querySelectorAll('[data-nav]').forEach(function (el) {
                    var on = el.getAttribute('data-nav') === v;
                    el.classList.toggle('nav-active', on);
                    if (on) el.setAttribute('aria-current', 'page');
                    else el.removeAttribute('aria-current');
                });
            } catch (_) {}
        }
        window.setNavActive = setNavActive;

        function navigateTo(view) {
            if (view === 'admin') { location.href = 'admin/dashboard.html'; return; }
            if (typeof setNavActive === 'function') setNavActive(view);
            // Mémoriser la vue dans le hash (reprise après changement de langue / reload)
            try {
                var h = (view === 'home') ? 'home' : view;
                setUIHash(h);
            } catch (_) {}
            var mm = document.getElementById('mobile-menu');
            if (mm) mm.classList.add('hidden');
            var mbtn = document.getElementById('mobile-menu-btn');
            if (mbtn) {
                mbtn.setAttribute('aria-expanded', 'false');
                var ic = mbtn.querySelector('i');
                if (ic) ic.className = 'fas fa-bars';
            }
            if (view === 'home') {
                currentTab = 'home';
                try {
                    setUIView('home', { tab: 'home' });
                    var vh = document.getElementById('view-home');
                    if (vh) vh.classList.remove('hidden');
                    ['view-list', 'view-detail', 'view-admin', 'view-onair', 'view-radio'].forEach(function (id) {
                        var el = document.getElementById(id);
                        if (el) el.classList.add('hidden');
                    });
                } catch (_) {}
                if (typeof applySectionHero === 'function') {
                    try { applySectionHero('home'); } catch (_) {}
                }
                try { loadHome(); } catch (eH) { console.error('[Chaabi] loadHome', eH); }
                try { if (typeof renderRecentPlayed === 'function') renderRecentPlayed(); } catch (_) {}
                try { if (typeof renderHomeFavorites === 'function') renderHomeFavorites(); } catch (_) {}
                try { if (typeof renderContinueBar === 'function') renderContinueBar(); } catch (_) {}
                window.scrollTo({ top: 0, behavior: 'smooth' });
                if (typeof updateSeoForView === 'function') updateSeoForView('home');
                return; // IMPORTANT: ne pas tomber dans le else list (vide)
            } else if (view === 'radio') {
                setUIView('radio', { tab: 'radio' });
                if (typeof renderMaRadio === 'function') renderMaRadio();
                if (typeof updateSeoForView === 'function') updateSeoForView('radio');
                try { location.hash = 'radio'; } catch (_) {}
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }
            if (view === 'onair') {
                currentTab = 'onair';
                setUIView('onair', { tab: 'onair' });
                if (typeof loadOnAir === 'function') loadOnAir();
                if (typeof updateSeoForView === 'function') updateSeoForView('onair');
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }
            if (view === 'admin') { location.href = 'admin/dashboard.html'; return; }
            {
                // list sections
                currentTab = view;
                currentPage = 1;
                setUIView('list', { tab: view });
                // Toujours appliquer hero + titre + breadcrumb
                if (typeof applySectionHero === 'function') {
                    applySectionHero(view);
                }
                // Filet de sécurité titre
                try {
                    var tSafe = (typeof translations !== 'undefined' && translations[currentLang]) ? translations[currentLang] : {};
                    var mapSafe = { artistes: 'artists', chansons: 'songs', emissions: 'shows', interviews: 'interviews', bouqalla: 'proverbs', dedicaces: 'dedicaces', commentaires: 'comments', contacts: 'contacts' };
                    var defSafe = { artists: 'Artistes', songs: 'Chansons', shows: 'Émissions', interviews: 'Interviews', proverbs: 'Bouqalla', dedicaces: 'Dédicaces', comments: 'Commentaires', contacts: 'Contacts' };
                    var kSafe = mapSafe[view] || view;
                    var titleSafe = tSafe[kSafe] || defSafe[kSafe] || view;
                    var lt2 = document.getElementById('list-title');
                    var fb2 = document.getElementById('list-title-fallback');
                    if (lt2) lt2.textContent = titleSafe;
                    if (fb2) { fb2.textContent = titleSafe; fb2.style.display = 'block'; fb2.classList.add('title-on'); }
                } catch (eSafe) {}
                var fc = document.getElementById('form-container'); if (fc) fc.innerHTML = renderForm(view);
                if (typeof updateSeoForView === 'function') updateSeoForView(view);
                loadListData();
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        window.navigateTo = navigateTo;

        /* Navigation profonde depuis le footer (index.html#vue) — appel initial en fin d'init */
        function applyHash() {
            const v = (location.hash || '').replace('#', '');
            if (v && /^(?:play\/)?(chanson|emission|interview)\/\d+$/i.test(v)) {
                if (typeof handlePlayHash === 'function') handlePlayHash();
            } else if (/^artiste\/\d+$/i.test(v)) {
                var aid = parseInt(v.split('/')[1], 10);
                if (aid && typeof loadDetail === 'function') loadDetail('artiste_complet', aid);
            } else if (/^emission\/\d+$/i.test(v)) {
                var eid = parseInt(v.split('/')[1], 10);
                if (eid && typeof loadDetail === 'function') loadDetail('emission_complet', eid);
            } else if (v && ['home', 'onair', 'radio', 'artistes', 'chansons', 'emissions', 'interviews', 'dedicaces', 'commentaires', 'contacts', 'bouqalla'].includes(v)) navigateTo(v);
        }
        window.addEventListener('hashchange', applyHash);

        function renderSkeletons(count = 8) {
            let html = '';
            for (let i = 0; i < count; i++) {
                html += `<div class="media-card">
                    <div class="skeleton aspect-square w-full rounded-lg"></div>
                    <div class="mt-2 space-y-1.5">
                        <div class="skeleton h-3.5 w-4/5 rounded"></div>
                        <div class="skeleton h-3 w-1/2 rounded"></div>
                    </div>
                </div>`;
            }
            return html;
        }

        
            function renderHomeSlider(items) {
                const box = document.getElementById('home-slider');
                if (!box) return;
                const list = (items || []).slice(0, 8);
                if (!list.length) { box.innerHTML = ''; return; }
                const t = translations[currentLang] || {};
                box.innerHTML = list.map(s => {
                    const titre = getFld(s, 'titre') || s.titre || '';
                    const artiste = getFld(s, 'artiste_nom') || s.artiste_nom || '';
                    const img = (typeof resolveMediaImage === 'function') ? resolveMediaImage(s.image, s.artiste_image) : formatPath(s.image || s.artiste_image);
                    const audio = s.audio ? formatPath(s.audio) : '';
                    const play = audio
                        ? `playTrack('${jsAttr(titre)}','${jsAttr(artiste)}','${jsAttr(audio)}','${jsAttr(img)}',{type:'chanson',id:${s.id},title:'${jsAttr(titre)}',artist:'${jsAttr(artiste)}',numero:'',invite:''})`
                        : `navigateTo('chansons')`;
                    return `<div class="chaabi-slide" role="listitem" onclick="${play}">
                        <img src="${jsStr(img)}" alt="" loading="lazy" decoding="async" width="48" height="48">
                        <div class="chaabi-slide-overlay">
                            <h3>${jsStr(titre)}</h3>
                            <p>${jsStr(artiste)}</p>
                            <button type="button" class="slide-play" onclick="event.stopPropagation();${play}"><i class="fas fa-circle-play"></i> ${t.listen || 'Écouter'}</button>
                        </div>
                    </div>`;
                }).join('');
            }

        
        function loadOnAir() {
            try { syncOnAirFromPlayer(); } catch (e) { console.warn(e); }
            try { renderOnAirQueue(); } catch (e) {}
            try { renderOnAirHistory(); } catch (e) {}
            if (window._onairTimer) clearInterval(window._onairTimer);
            window._onairTimer = setInterval(function () {
                if (typeof UIState === 'undefined' || UIState.view !== 'onair') return;
                syncOnAirFromPlayer();
            }, 500);
        }

        function syncOnAirFromPlayer() {
            var titleEl = document.getElementById('onair-title');
            var artistEl = document.getElementById('onair-artist');
            var coverEl = document.getElementById('onair-cover');
            var typeEl = document.getElementById('onair-type');
            var timeEl = document.getElementById('onair-time');
            var durEl = document.getElementById('onair-duration');
            var prog = document.getElementById('onair-progress');
            var playIcon = document.getElementById('onair-play-icon');
            var a = document.getElementById('fp-audio');
            var cp = null;
            try { cp = window.CURRENT_PLAY || (typeof CURRENT_PLAY !== 'undefined' ? CURRENT_PLAY : null); } catch (_) { cp = null; }
            var isAr = (typeof currentLang !== 'undefined' && currentLang === 'ar');
            var fpTitle = document.getElementById('fp-title');
            var fpArtist = document.getElementById('fp-artist');
            var fpImg = document.getElementById('fp-img');
            var hasPlay = cp && cp.key;
            var title = hasPlay ? (cp.title || '') : (fpTitle && fpTitle.textContent ? fpTitle.textContent.trim() : '');
            var artist = hasPlay ? (cp.artist || '') : (fpArtist && fpArtist.textContent ? fpArtist.textContent.trim() : '');
            var imgSrc = hasPlay ? (cp.image || '') : (fpImg && fpImg.getAttribute('src')) || '';
            if (!imgSrc || /chaabidialna/i.test(imgSrc)) {
                if (hasPlay && window._lastArtistImage) imgSrc = window._lastArtistImage;
            }
            if (!imgSrc) imgSrc = '/music/news_hero/emissions_chaabi.webp';
            var playerVisible = document.getElementById('floating-player') && !document.getElementById('floating-player').classList.contains('hidden');

            if (hasPlay || (playerVisible && title)) {
                if (titleEl) titleEl.textContent = title || (isAr ? 'قيد التشغيل' : 'En lecture');
                if (artistEl) artistEl.textContent = artist || '';
                if (coverEl) {
                    if (coverEl.getAttribute('src') !== imgSrc) coverEl.src = imgSrc;
                    coverEl.classList.toggle('fp-cover-spin', !!(a && !a.paused && !a.ended));
                }
                if (typeEl) {
                    var mt = hasPlay ? cp.mediaType : '';
                    typeEl.textContent = (typeof mediaTypeLabel === 'function' && mt) ? mediaTypeLabel(mt) : (mt || (isAr ? 'راديو' : 'RADIO'));
                    typeEl.classList.remove('hidden');
                    if (mt) typeEl.setAttribute('data-type', mt);
                }
            } else {
                if (titleEl) titleEl.textContent = isAr ? 'لا شيء قيد التشغيل' : 'Rien en lecture';
                if (artistEl) artistEl.textContent = isAr ? 'شغّل أغنية أو حصة لبدء البث' : 'Lancez une chanson ou une emission pour demarrer';
                if (typeEl) { typeEl.textContent = '—'; typeEl.classList.add('hidden'); }
                if (coverEl) {
                    var onairHero = '/music/news_hero/emissions_chaabi.webp';
                    if (coverEl.getAttribute('src') !== onairHero) coverEl.src = onairHero;
                    coverEl.classList.remove('fp-cover-spin');
                }
            }
            if (a && timeEl && durEl && prog) {
                var cur = a.currentTime || 0;
                var dur = a.duration || 0;
                function fmt(s) {
                    s = Math.floor(s || 0);
                    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
                }
                timeEl.textContent = fmt(cur);
                durEl.textContent = isFinite(dur) ? fmt(dur) : '0:00';
                prog.style.width = (dur > 0 ? (100 * cur / dur) : 0) + '%';
            }
            if (playIcon && a) {
                playIcon.className = (!a.paused && !a.ended) ? 'fas fa-pause' : 'fas fa-play';
            }
        }

        function renderOnAirQueue() {
            var box = document.getElementById('onair-queue');
            if (!box) return;
            var q = (typeof RADIO_QUEUE !== 'undefined' && RADIO_QUEUE) ? RADIO_QUEUE : [];
            var isAr = (typeof currentLang !== 'undefined' && currentLang === 'ar');
            if (!q.length) {
                box.innerHTML = '<p class="text-slate-500 text-sm">' + (isAr ? 'القائمة فارغة' : 'File vide — ajoutez des titres ou activez la radio continue') + '</p>';
                return;
            }
            box.innerHTML = q.slice(0, 8).map(function (item, i) {
                var img = item.img || item.image || (item.mediaInfo && item.mediaInfo.image) || window._lastArtistImage || '/music/news_hero/emissions_chaabi.webp';
                if (typeof formatPath === 'function' && img && img.indexOf('assets/') !== 0 && img.indexOf('http') !== 0 && img.charAt(0) !== '/') {
                    img = formatPath(img);
                }
                return '<div class="onair-row" onclick="playQueueAt(' + i + ')">' +
                    '<img src="' + img + '" alt="" loading="lazy" decoding="async" width="48" height="48" onerror="this.onerror=null;this.src=\'/music/news_hero/emissions_chaabi.webp\'">' +
                    '<div class="min-w-0"><div class="t truncate">' + (item.title || '') + '</div><div class="a truncate">' + (item.artist || '') + '</div></div></div>';
            }).join('');
        }

        function renderOnAirHistory() {
            var box = document.getElementById('onair-history');
            if (!box) return;
            var h = (typeof PLAY_HISTORY !== 'undefined' && PLAY_HISTORY) ? PLAY_HISTORY : [];
            var isAr = (typeof currentLang !== 'undefined' && currentLang === 'ar');
            if (!h.length) {
                box.innerHTML = '<p class="text-slate-500 text-sm">' + (isAr ? 'لا يوجد تاريخ بعد' : 'Pas encore d historique') + '</p>';
                return;
            }
            box.innerHTML = h.slice().reverse().slice(0, 8).map(function (item, idx) {
                var realIdx = h.length - 1 - idx;
                var img = item.img || '/music/images/radiochabidialna.jpg';
                return '<div class="onair-row" onclick="playHistoryAt(' + realIdx + ')">' +
                    '<img src="' + img + '" alt="" loading="lazy" decoding="async" width="48" height="48">' +
                    '<div class="min-w-0"><div class="t truncate">' + (item.title || '') + '</div><div class="a truncate">' + (item.artist || '') + '</div></div></div>';
            }).join('');
        }

        window.loadOnAir = loadOnAir;
        window.syncOnAirFromPlayer = syncOnAirFromPlayer;
        window.renderOnAirQueue = renderOnAirQueue;
        window.renderOnAirHistory = renderOnAirHistory;


        
        /* Glossaire chaâbi (FR / AR) */
        var CHAABI_GLOSSARY = [
            { id: 'istikhbar', fr: 'Istikhbar', ar: 'استخبار', def_fr: 'Prélude improvisé, souvent en solo, qui ouvre un morceau et pose le mode (tab‘).', def_ar: 'مقدمة مرتجلة غالباً على العود أو الصوت، تمهّد للمقطوعة وتحدد الطبع.' },
            { id: 'rial', fr: 'Rial / Refrain', ar: 'ريال / لازمة', def_fr: 'Refrain récurrent d’une qacidate ou d’une chanson, repris par le public ou le chœur.', def_ar: 'اللازمة المتكررة في القصيدة أو الأغنية يردّدها الجمهور أو المجموعة.' },
            { id: 'bayt', fr: 'Bayt', ar: 'بيت', def_fr: 'Vers ou couplet de la qasida ; unité poétique de base.', def_ar: 'البيت الشعري، وحدة أساسية في القصيدة.' },
            { id: 'qacida', fr: 'Qacidate / Qasida', ar: 'قصيدة', def_fr: 'Long poème chanté du répertoire chaâbi, souvent en arabe dialectal maghrébin.', def_ar: 'قصيدة طويلة تُغنّى في الشابي، غالباً بالدارجة المغاربية.' },
            { id: 'tab', fr: 'Tab‘ (mode)', ar: 'طبع', def_fr: 'Mode mélodique (proche du maqâm) qui colore l’ambiance du morceau.', def_ar: 'المقام أو الطبع اللحني الذي يطبع جو المقطوعة.' },
            { id: 'inchad', fr: 'Inchâd', ar: 'إنشاد', def_fr: 'Déclamation chantée, entre le parlé et le chant, typique de certaines ouvertures.', def_ar: 'إلقاء غنائي بين الكلام والغناء، شائع في بعض المقدمات.' },
            { id: 'kuitra', fr: 'Kwitra', ar: 'كويترة', def_fr: 'Luth traditionnel algérien à quatre doubles cordes, cousin de l’oud.', def_ar: 'آلة وترية جزائرية تقليدية ذات أوتار مزدوجة، قريبة من العود.' },
            { id: 'mandole', fr: 'Mondol / Mandole', ar: 'مندول', def_fr: 'Instrument à cordes pincées, très présent dans le chaâbi citadin algérois.', def_ar: 'آلة وترية منقورة، حاضرة بقوة في الشابي الجزائري الحضري.' },
            { id: 'tar', fr: 'Tar / Bendir', ar: 'طار / بندير', def_fr: 'Percussions à cadre qui marquent le rythme et accompagnent la danse du souffle.', def_ar: 'إيقاعات بإطار تضبط الإيقاع وترافق النفس الغنائي.' },
            { id: 'malhun', fr: 'Malhûn', ar: 'الملحون', def_fr: 'Poésie dialectale chantée, parent proche du chaâbi ; souvent source des qacidates.', def_ar: 'شعر دارج مُغنّى، قريب من الشابي وغالباً مصدر للقصيدات.' },
            { id: 'siana', fr: 'Siana', ar: 'صيانة', def_fr: 'Ornementation vocale, fioritures et mélismes sur une syllabe.', def_ar: 'زخارف صوتية وتمطيط لحني على المقاطع.' },
            { id: 'chaabi', fr: 'Chaâbi', ar: 'الشعبي', def_fr: 'Musique populaire citadine algérienne, née à Alger, héritière d’Andalous et de malhûn.', def_ar: 'موسيقى شعبية حضرية جزائرية وُلدت في الجزائر العاصمة، وريثة الأندلس والملحون.' }
        ];

        function glossaryTermHtml(term, compact) {
            var isAr = (typeof currentLang !== 'undefined' && currentLang === 'ar');
            var name = isAr ? term.ar : term.fr;
            var def = isAr ? term.def_ar : term.def_fr;
            if (compact) {
                return '<button type="button" class="glossary-chip text-left w-full rounded-xl px-3 py-2 border border-amber-400/25 hover:border-amber-400/50 hover:bg-amber-500/10 transition" onclick="openGlossary(\'' + term.id + '\')">' +
                    '<span class="font-bold text-amber-700 dark:text-amber-300 text-sm">' + (typeof jsStr === 'function' ? jsStr(name) : name) + '</span>' +
                    '<span class="block text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">' + (typeof jsStr === 'function' ? jsStr(def) : def) + '</span></button>';
            }
            return '<article class="rounded-xl border border-amber-400/20 bg-amber-500/5 p-3" id="gloss-' + term.id + '">' +
                '<h3 class="font-bold text-amber-800 dark:text-amber-300">' + (typeof jsStr === 'function' ? jsStr(name) : name) +
                (isAr ? ' <span class="text-xs font-normal opacity-70">(' + term.fr + ')</span>' : ' <span class="text-xs font-normal opacity-70" dir="rtl">(' + term.ar + ')</span>') +
                '</h3>' +
                '<p class="mt-1 text-slate-600 dark:text-slate-300 leading-relaxed">' + (typeof jsStr === 'function' ? jsStr(def) : def) + '</p></article>';
        }

        function renderHomeGlossary() {
            var el = document.getElementById('home-glossary');
            if (!el) return;
            // 3 termes du jour (rotation stable par date)
            var day = 0;
            try { day = Math.floor(Date.now() / 86400000); } catch (_) {}
            var picks = [];
            for (var i = 0; i < 3; i++) {
                picks.push(CHAABI_GLOSSARY[(day + i * 3) % CHAABI_GLOSSARY.length]);
            }
            el.innerHTML = '<div class="space-y-2">' + picks.map(function (t) { return glossaryTermHtml(t, true); }).join('') + '</div>';
        }

        function openGlossary(focusId) {
            var modal = document.getElementById('glossary-modal');
            var list = document.getElementById('glossary-modal-list');
            if (!modal || !list) return;
            list.innerHTML = CHAABI_GLOSSARY.map(function (t) { return glossaryTermHtml(t, false); }).join('');
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            if (focusId) {
                setTimeout(function () {
                    var n = document.getElementById('gloss-' + focusId);
                    if (n) n.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 50);
            }
        }
        function closeGlossary() {
            var modal = document.getElementById('glossary-modal');
            if (modal) modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
        window.openGlossary = openGlossary;
        window.closeGlossary = closeGlossary;
        window.renderHomeGlossary = renderHomeGlossary;

        async function loadHomeDedicace() {
            var el = document.getElementById('home-dedicace');
            if (!el) return;
            var isAr = (typeof currentLang !== 'undefined' && currentLang === 'ar');
            try {
                var res = await fetch((window.CHAABI_API || 'api/radiochaabi.php') + '?action=get_last_dedicaces');
                var data = await res.json();
                var list = (data && (data.data || data)) || [];
                if (!Array.isArray(list)) list = [];
                if (!list.length) {
                    el.innerHTML = '<p class="text-sm text-slate-500">' + (isAr ? 'لا إهداءات بعد — كن أول من يرسل!' : 'Pas encore de dédicace — soyez le premier !') +
                        '</p><button type="button" class="mt-3 text-sm font-bold text-rose-600 hover:underline" onclick="navigateTo(\'dedicaces\')">' +
                        (isAr ? 'أرسل إهداء' : 'Envoyer une dédicace') + '</button>';
                    return;
                }
                // Dédicace du jour : rotation stable parmi les 5 dernières
                var day = 0;
                try { day = Math.floor(Date.now() / 86400000); } catch (_) {}
                var d = list[day % list.length];
                var from = isAr && d.nom_ar ? d.nom_ar : (d.nom || '');
                var to = isAr && d.pour_ar ? d.pour_ar : (d.pour || '');
                var msg = isAr && d.description_ar ? d.description_ar : (d.description || d.message || '');
                var de = isAr ? 'من' : 'De';
                var pour = isAr ? 'إلى' : 'Pour';
                var msgL = isAr ? 'الرسالة' : 'Message';
                el.innerHTML =
                    '<div class="dedicace-day-card" dir="' + (isAr ? 'rtl' : 'ltr') + '">' +
                      '<div class="flex items-start gap-3">' +
                        '<span class="text-2xl shrink-0" aria-hidden="true">💌</span>' +
                        '<div class="min-w-0 flex-1">' +
                          '<p class="text-xs font-bold uppercase tracking-wide text-rose-600/90 dark:text-rose-300">' + de + ' <span class="text-slate-900 dark:text-white">' + (typeof jsStr === 'function' ? jsStr(from) : from) + '</span></p>' +
                          (to ? '<p class="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300 mt-1">' + pour + ' <span class="text-slate-900 dark:text-white">' + (typeof jsStr === 'function' ? jsStr(to) : to) + '</span></p>' : '') +
                          '<p class="mt-2 text-sm text-slate-700 dark:text-slate-200 leading-relaxed">« ' + (typeof jsStr === 'function' ? jsStr(msg) : msg) + ' »</p>' +
                        '</div>' +
                      '</div>' +
                    '</div>';
            } catch (e) {
                el.innerHTML = '<p class="text-sm text-slate-500">' + (isAr ? 'تعذر التحميل' : 'Chargement impossible') + '</p>';
            }
        }
        window.loadHomeDedicace = loadHomeDedicace;



        window.startRadioFromHome = async function startRadioFromHome() {
            try {
                if (typeof navigateTo === 'function') navigateTo('onair');
            } catch (_) {}
            try {
                var audio = document.querySelector('audio#main-audio, audio#player-audio, audio');
                if (audio && !audio.paused && typeof CURRENT_PLAY !== 'undefined' && CURRENT_PLAY) return;
                // Reprendre si déjà chargé
                if (audio && audio.paused && audio.src && typeof togglePlay === 'function') {
                    togglePlay();
                    return;
                }
                // Chanson coup de cœur
                var res = await fetch((window.CHAABI_API || 'api/radiochaabi.php') + '?action=get_chanson_featured');
                var f = await res.json();
                if (f && f.id && typeof playItem === 'function') {
                    playItem(f, 'chanson');
                    return;
                }
                // Fallback: première chanson
                res = await fetch((window.CHAABI_API || 'api/radiochaabi.php') + '?action=get_chansons&page=1&limit=1');
                var data = await res.json();
                var first = (data.data || data)[0];
                if (first && typeof playItem === 'function') playItem(first, 'chanson');
            } catch (e) {
                console.warn('startRadioFromHome', e);
            }
        };

        function syncHomeOnairTeaser() {
            try {
                var title = document.getElementById('home-onair-title');
                var artist = document.getElementById('home-onair-artist');
                var cover = document.getElementById('home-onair-cover');
                if (!title) return;
                var cur = (typeof CURRENT_PLAY !== 'undefined') ? CURRENT_PLAY : null;
                if (!cur) {
                    title.textContent = (typeof currentLang !== 'undefined' && currentLang === 'ar') ? 'راديو الشعبي' : 'Radio Chaabi';
                    if (artist) artist.textContent = (typeof currentLang !== 'undefined' && currentLang === 'ar') ? 'اضغط للاستماع' : 'Appuyez pour écouter';
                    return;
                }
                var t = cur.titre || cur.title || cur.nom || '—';
                var a = cur.artiste || cur.artist || cur.interprete || '';
                title.textContent = t;
                if (artist) artist.textContent = a || (cur.type || '');
                if (cover) {
                    var img = cur.image || cur.cover || '';
                    if (img) {
                        cover.src = (typeof formatPath === 'function') ? formatPath(img) : img;
                    }
                }
            } catch (_) {}
        }
        window.syncHomeOnairTeaser = syncHomeOnairTeaser;


        async function loadHomeQacidates() {
            var el = document.getElementById('home-qacidates');
            var sec = document.getElementById('home-qacid-section');
            if (!el) return;
            el.innerHTML = typeof renderSkeletons === 'function' ? renderSkeletons(4) : '';
            try {
                var res = await fetch('api/qacidates_api.php?action=list&limit=4&_t=' + Date.now());
                var data = await res.json();
                var rows = data.data || data.items || data.qacidates || [];
                if (!Array.isArray(rows)) rows = [];
                rows = rows.slice(0, 4);
                if (!rows.length) {
                    if (sec) sec.classList.add('home-section-empty');
                    el.innerHTML = '';
                    return;
                }
                if (sec) sec.classList.remove('home-section-empty');
                var isAr = (typeof currentLang !== 'undefined' && currentLang === 'ar');
                el.innerHTML = rows.map(function (r) {
                    var slug = r.slug || '';
                    var titre = isAr ? (r.titre_ar || r.titre) : (r.titre || r.titre_ar);
                    var titreAr = r.titre_ar || '';
                    var inter = r.interprete || r.artiste || '';
                    if (typeof normalizeInterprete === 'function') inter = normalizeInterprete(inter);
                    var img = r.image || '/music/images/radiochabidialna.jpg';
                    var href = 'qacidates-v2.html?slug=' + encodeURIComponent(slug);
                    return '<a class="home-qacid-card" href="' + href + '">' +
                        '<img src="' + String(img).replace(/"/g, '') + '" alt="" loading="lazy" width="200" height="200" onerror="if(window.imgFallback)imgFallback(this)">' +
                        '<div class="body">' +
                        (titreAr ? '<p class="ar" dir="rtl">' + (typeof escHtml === 'function' ? escHtml(titreAr) : titreAr) + '</p>' : '') +
                        '<p class="fr">' + (typeof escHtml === 'function' ? escHtml(titre || '') : (titre || '')) + '</p>' +
                        (inter ? '<p class="meta">' + (typeof escHtml === 'function' ? escHtml(inter) : inter) + '</p>' : '') +
                        '</div></a>';
                }).join('');
            } catch (e) {
                if (sec) sec.classList.add('home-section-empty');
                el.innerHTML = '';
            }
        }

        async function loadHome() {
            try { syncHomeOnairTeaser(); } catch(_) {}
            const grids = {
                'home-chansons': ['get_chansons', 'chansons', 4],
                'home-emissions': ['get_emissions', 'emissions', 4],
                'home-artistes': ['get_artistes', 'artistes', 4],
                'home-interviews': ['get_interviews', 'interviews', 4]
            };
            Object.keys(grids).forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = renderSkeletons(4); });
            const topEl = document.getElementById('home-top'); if (topEl) topEl.innerHTML = renderSkeletons(4);
            const bq = document.getElementById('home-bouqalla'); if (bq) bq.innerHTML = '<div class="skeleton h-24 w-full rounded"></div>';
            try {
                await Promise.all(Object.entries(grids).map(async ([id, [action, type, limit]]) => {
                    const res = await fetch((window.CHAABI_API||'api/radiochaabi.php')+`?action=${action}&page=1&limit=${limit}`);
                    const data = await res.json();
                    const el = document.getElementById(id);
                    if (el) {
                        el.innerHTML = (data.data || []).map(i => generateCard(i, type)).join('') || '';
                        if (typeof initLazyImages === 'function') initLazyImages(el, 4);
                    }
                }));
            } catch(e) {}
                        try { const resF = await fetch((window.CHAABI_API||'api/radiochaabi.php')+'?action=get_chanson_featured'); const f = await resF.json(); const tF = translations[currentLang]; const elF = document.getElementById('home-featured'); if (elF && f && f.id) {
                            elF.innerHTML = `<div class="featured-compact glass-featured rounded-xl p-3 flex items-center gap-3">
                                ${typeof responsiveImg === "function" ? responsiveImg(f.image, { className: "w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg shrink-0", sizes: "80px", width: 80, height: 80, priority: "high" }) : `<img src="${formatPath(f.image)}" class="w-16 h-16 object-cover rounded-lg shrink-0">`}
                                <div class="min-w-0 flex-1">
                                    <div class="text-[10px] uppercase tracking-wider text-amber-500 font-bold mb-0.5">${tF.song_of_week_label || tF.song_of_week || 'Coup de cœur'}</div>
                                    <h3 class="text-sm sm:text-base font-bold truncate leading-tight">${jsStr(getFld(f, 'titre') || f.titre)}</h3>
                                    <p class="text-xs text-gray-500 dark:text-gray-400 truncate">${jsStr(getFld(f, 'artiste_nom') || f.artiste_nom || '')}</p>
                                    <div class="flex items-center gap-2 mt-1.5">
                                        <button type="button" onclick="playTrack('${jsAttr(getFld(f, 'titre') || f.titre)}', '${jsAttr(getFld(f, 'artiste_nom') || f.artiste_nom || '')}', '${jsStr(formatPath(f.audio))}', '${jsStr(formatPath(f.image))}', { type: 'chanson', id: ${f.id}, title: '${jsAttr(getFld(f, 'titre') || f.titre)}', artist: '${jsAttr(getFld(f, 'artiste_nom') || f.artiste_nom || '')}', numero: '', invite: '' })" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg"><i class="fas fa-play mr-1"></i>${tF.listen}</button>
                                        <span class="text-[10px] text-gray-400"><i class="fas fa-heart text-emerald-400 mr-0.5"></i>${f.likes || 0}</span>
                                    </div>
                                </div>
                            </div>`;
                        } } catch(e) {}
            try {
                const resTop = await fetch((window.CHAABI_API||'api/radiochaabi.php')+`?action=get_top_ecoutes&limit=4`); const dataTop = await resTop.json();
                const topSongs = (dataTop.data || []).map(s => generateCard(s, 'chansons')).join('');
                var topEl2 = document.getElementById('home-top');
                if (topEl2) {
                    var emptyTop = (translations[currentLang] && translations[currentLang].empty_top) || '—';
                    topEl2.innerHTML = topSongs || '<div class="col-span-full empty-state"><i class="fas fa-headphones"></i>' + emptyTop + '</div>';
                }
                if (typeof renderHomeSlider === 'function') renderHomeSlider(dataTop.data || []);
                if (typeof initLazyImages === 'function') initLazyImages(document.getElementById('view-home'), 8);
            } catch(e) {}
            try {
                const resB = await fetch((window.CHAABI_API||'api/radiochaabi.php')+`?action=get_bouqalla_jour`); const b = await resB.json();
                if (b && (b.arabe || b.francais || b.phonetic)) {
                    const tB = translations[currentLang] || {};
                    const num = b.num || b.id || '';
                    const ar = (typeof getFld === 'function' ? getFld(b, 'arabe') : null) || b.arabe || '';
                    const fr = (typeof getFld === 'function' ? getFld(b, 'francais') : null) || b.francais || '';
                    const ph = b.phonetic || b.phonetique || '';
                    var bqEl = document.getElementById('home-bouqalla'); if (bqEl) bqEl.innerHTML =
                        '<article class="bq-card">' +
                          (num ? '<div class="bq-num">N° ' + jsStr(num) + '</div>' : '') +
                          (ar ? '<div class="bq-ar" dir="rtl" lang="ar">' + jsStr(ar) + '</div>' : '') +
                          (ph ? '<div class="bq-ph">' + jsStr(ph) + '</div>' : '') +
                          (fr ? '<div class="bq-fr">' + jsStr(fr) + '</div>' : '') +
                        '</article>';
                }
            } catch(e) {}
            try {
                const resS = await fetch((window.CHAABI_API||'api/radiochaabi.php')+`?action=get_stats`); const s = await resS.json();
                const t = (translations && translations[currentLang]) ? translations[currentLang] : {};
                const stat = (n, label) => `<div class="home-stat-pill flex flex-col items-center bg-white/10 border border-white/15 rounded-lg px-2 py-1 backdrop-blur-sm min-w-[52px]"><span class="font-bold text-amber-300 leading-tight" style="font-size:.82rem">${n || 0}</span><span class="uppercase tracking-wide text-slate-300 leading-tight" style="font-size:.55rem;margin-top:2px">${label}</span></div>`;
                var hs = document.getElementById('home-stats');
                if (hs && t) hs.innerHTML = stat(s.chansons, t.stats_songs) + stat(s.emissions, t.stats_shows) + stat(s.artistes, t.stats_artists) + stat(s.interviews, t.stats_interviews);
            } catch(e) {}
            try { if (typeof loadHomeDedicace === 'function') await loadHomeDedicace(); } catch (_) {}
            try { if (typeof renderHomeGlossary === 'function') renderHomeGlossary(); } catch (_) {}
        }

        async function loadListData() {
            const container = document.getElementById('grid-container');
            container.innerHTML = renderSkeletons(8);
            document.getElementById('pagination').innerHTML = '';
            // Barre de recherche + tri par section
            var toolbar = document.getElementById('list-toolbar');
            var listSearch = document.getElementById('list-search');
            var sortSel = document.getElementById('list-sort');
            var searchableTabs = ['artistes', 'chansons', 'emissions', 'interviews', 'bouqalla', 'dedicaces'];
            if (toolbar) {
                if (searchableTabs.indexOf(currentTab) >= 0) {
                    toolbar.classList.remove('hidden');
                    if (listSearch) {
                        var phMap = {
                            artistes: (translations[currentLang] && translations[currentLang].list_search_artistes) || 'Rechercher un artiste…',
                            chansons: (translations[currentLang] && translations[currentLang].list_search_chansons) || 'Rechercher une chanson…',
                            emissions: (translations[currentLang] && translations[currentLang].list_search_emissions) || 'Rechercher une émission…',
                            interviews: (translations[currentLang] && translations[currentLang].list_search_interviews) || 'Rechercher une interview…',
                            bouqalla: (translations[currentLang] && translations[currentLang].list_search_bouqalla) || 'Rechercher une bouqalla…',
                            dedicaces: (translations[currentLang] && translations[currentLang].list_search_dedicaces) || 'Rechercher une dédicace…'
                        };
                        listSearch.placeholder = phMap[currentTab] || ((translations[currentLang] && translations[currentLang].list_search_ph) || 'Rechercher dans cette section…');
                        if (listSearch.value !== listSearchQuery) listSearch.value = listSearchQuery || '';
                        var clr = document.getElementById('list-search-clear');
                        if (clr) clr.classList.toggle('hidden', !(listSearchQuery && listSearchQuery.length));
                    }
                } else {
                    toolbar.classList.add('hidden');
                }
            }
            if (sortSel) {
                if (currentTab === 'dedicaces') {
                    sortSel.innerHTML = '<option value="recent">' + translations[currentLang].sort_recent + '</option><option value="likes">' + translations[currentLang].sort_likes + '</option>';
                    sortSel.classList.remove('hidden');
                } else {
                    sortSel.classList.add('hidden');
                }
            }
            const sortQ = (currentTab === 'dedicaces' && sortSel && sortSel.value) ? '&tri=' + encodeURIComponent(sortSel.value) : '';
            const searchQ = (listSearchQuery && listSearchQuery.trim()) ? '&q=' + encodeURIComponent(listSearchQuery.trim()) : '';
            const result = await safeFetch((window.CHAABI_API||'api/radiochaabi.php')+'?action=get_' + currentTab + '&page=' + currentPage + '&limit=8' + sortQ + searchQ);
            if (!result || !result.data || result.data.length === 0) {
                var tEmpty = (translations[currentLang] || {});
            container.innerHTML = '<div class="col-span-full empty-state">' +
                '<i class="fas fa-inbox"></i>' +
                '<p class="mt-2">' + (tEmpty.empty_list || 'Aucun contenu pour le moment.') + '</p>' +
                '<button type="button" class="mt-4 px-4 py-2 rounded-full bg-emerald-600 text-white text-sm font-bold" onclick="navigateTo(\'home\')">' +
                (tEmpty.empty_list_cta || 'Retour à l\'accueil') + '</button></div>';
                return;
            }
            if (currentTab === 'bouqalla') container.classList.add('home-card-grid', 'home-card-grid--bouqalla');
            else { container.classList.add('home-card-grid', 'home-card-grid--list'); container.classList.remove('home-card-grid--bouqalla'); }
            container.innerHTML = result.data.map(item => generateCard(item, currentTab)).join('');
            if (typeof initLazyImages === 'function') initLazyImages(container, 4);
            if (container) {
                if (currentTab === 'emissions') container.classList.add('timeline-emissions');
                else container.classList.remove('timeline-emissions');
            }
            if (result.pagination) renderPagination(result.pagination);
            if (typeof initLazyImages === 'function') initLazyImages(container, 6);
            // Réapplique le bandeau section (au cas où)
            if (typeof applySectionHero === 'function' && currentTab && currentTab !== 'home') applySectionHero(currentTab);
        }

        /* ── Interactions : likes, notes, commentaires ── */
        async function likeItem(type, id, btn) {
            type = String(type || '').toLowerCase();
            id = parseInt(id, 10) || 0;
            if (!type || !id) return;
            try {
                if (btn && typeof btnFeedback === 'function') btnFeedback(btn, 'loading');
                else if (btn) { btn.disabled = true; btn.classList.add('opacity-70'); }
                // Qacidates = BDD dédiée
                var url, body;
                if (type === 'qacidate' || type === 'qacidates') {
                    url = 'api/qacidates_api.php?action=like';
                    body = JSON.stringify({ id: id });
                } else {
                    url = (window.CHAABI_API || 'api/radiochaabi.php') + '?action=like_item';
                    body = JSON.stringify({
                        type: type,
                        id: id,
                        session_id: (typeof getSessionId === 'function' ? getSessionId() : '')
                    });
                }
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: body
                });
                let data = null;
                try { data = await res.json(); } catch (_) {}
                if (btn) {
                    btn.classList.remove('opacity-70');
                    btn.disabled = false;
                    btn.classList.add('is-liked');
                    if (typeof btnFeedback === 'function') btnFeedback(btn, 'ok');
                    var cnt = btn.querySelector('.like-count');
                    if (cnt && data && (data.likes != null || data.count != null)) {
                        cnt.textContent = data.likes != null ? data.likes : data.count;
                    } else if (cnt) {
                        var n = parseInt(cnt.textContent, 10);
                        if (!isNaN(n)) cnt.textContent = n + 1;
                    }
                }
                if (data && data.error) {
                    if (typeof showToast === 'function') showToast(data.error, 'error');
                } else if (typeof showToast === 'function') {
                    showToast(currentLang === 'ar' ? '❤️ شكراً!' : '❤️ Merci !', 'success');
                }
            } catch (e) {
                console.warn('[Chaabi] likeItem', e);
                if (btn && typeof btnFeedback === 'function') btnFeedback(btn, 'err');
                else if (btn) { btn.disabled = false; btn.classList.remove('opacity-70'); }
                if (typeof showToast === 'function') {
                    showToast(currentLang === 'ar' ? 'تعذر تسجيل الإعجاب' : "Impossible d'enregistrer le like", 'error');
                }
            }
        }
        window.likeItem = likeItem;

        async function rateEmission(emissionId, rating) {
            try {
                const res = await fetch((window.CHAABI_API||'api/radiochaabi.php')+'?action=rate_emission', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emission_id: emissionId, rating }) });
                const data = await res.json();
                if (data.success) {
                    loadDetail('emission_complet', emissionId);
                    if (typeof showToast === 'function') {
                        showToast(
                            (currentLang === 'ar' ? '⭐ شكراً على تقييمك!' : '⭐ Merci pour votre note !') +
                            (rating ? ' (' + rating + '/5)' : ''),
                            'success',
                            { icon: 'check' }
                        );
                    }
                } else {
                    if (typeof showToast === 'function') showToast(data.error || (currentLang === 'ar' ? 'خطأ' : 'Erreur'), 'error');
                }
            } catch (e) {
                if (typeof showToast === 'function') showToast(currentLang === 'ar' ? 'تعذر إرسال التقييم' : 'Impossible d’envoyer la note', 'error');
            }
        }

        async function submitComment(emissionId) {
            const nom = document.getElementById('cmt-nom').value;
            const email = document.getElementById('cmt-email') ? document.getElementById('cmt-email').value : '';
            const msg = document.getElementById('cmt-msg').value;
            if (!nom || !msg) {
                if (typeof showToast === 'function') {
                    showToast(currentLang === 'ar' ? 'الاسم والرسالة مطلوبان' : 'Nom et message requis', 'warn');
                }
                return;
            }
            try {
                const res = await fetch((window.CHAABI_API||'api/radiochaabi.php')+'?action=add_emission_comment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ emission_id: emissionId, nom, email, message: msg })
                });
                const data = await res.json();
                if (data.success) {
                    var st = document.getElementById('cmt-status');
                    if (st) {
                        st.innerText = currentLang === 'ar' ? 'تم الإرسال للمراجعة' : 'Soumis pour modération !';
                        st.classList.remove('hidden');
                    }
                    var n = document.getElementById('cmt-nom'); if (n) n.value = '';
                    var m = document.getElementById('cmt-msg'); if (m) m.value = '';
                    if (typeof showToast === 'function') {
                        showToast(currentLang === 'ar' ? '💬 شكراً على تعليقك!' : '💬 Merci pour votre commentaire !', 'success', { icon: 'check' });
                    }
                } else {
                    if (typeof showToast === 'function') showToast(data.error || (currentLang === 'ar' ? 'خطأ' : 'Erreur'), 'error');
                }
            } catch (e) {
                if (typeof showToast === 'function') showToast(currentLang === 'ar' ? 'تعذر إرسال التعليق' : 'Impossible d’envoyer le commentaire', 'error');
            }
        }
        window.rateEmission = rateEmission;
        window.submitComment = submitComment;


        /* ══════════════════════════════════════════
           RECHERCHE
           ══════════════════════════════════════════ */
        
        var _searchTimer = null;
        var _searchSuggestItems = [];

        function escAttr(s) {
            return String(s == null ? '' : s)
                .replace(/&/g, '&amp;')
                .replace(/"/g, '&quot;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        }
        function escHtml(s) {
            return String(s == null ? '' : s)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        }

        function onSearchInput() {
            clearTimeout(_searchTimer);
            var input = document.getElementById('search-input');
            var box = document.getElementById('search-suggest');
            if (!input || !box) return;
            var q = input.value.trim();
            // Autoriser #12 (recherche par numéro d'émission)
            var isNumSearch = /^#\d+$/.test(q);
            if (!isNumSearch && q.length < 2) {
                box.classList.add('hidden');
                box.innerHTML = '';
                _searchSuggestItems = [];
                return;
            }
            if (isNumSearch && q.length < 2) return;
            _searchTimer = setTimeout(async function () {
                try {
                    var data = await safeFetch((window.CHAABI_API||'api/radiochaabi.php')+'?action=search&q=' + encodeURIComponent(q));
                    var poemesSug = null;
                    try {
                        poemesSug = await safeFetch((window.CHAABI_POEMES_API || 'poemes/api/search.php') + '?q=' + encodeURIComponent(q) + '&limit=4');
                    } catch (_) { poemesSug = null; }
                    if (!data && !(poemesSug && poemesSug.items && poemesSug.items.length)) { box.classList.add('hidden'); return; }
                    if (!data) data = {};
                    var isAr = (typeof currentLang !== 'undefined' && currentLang === 'ar');
                    var showLab = (typeof translations !== 'undefined' && translations[currentLang] && translations[currentLang].show_label)
                        ? translations[currentLang].show_label
                        : (isAr ? 'برنامج' : 'Émission');
                    function fmtDate(d) {
                        if (!d) return '';
                        try {
                            return new Date(d).toLocaleDateString(isAr ? 'ar-DZ' : 'fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
                        } catch (_) { return String(d).slice(0, 10); }
                    }
                    var items = [];
                    (data.chansons || []).slice(0, 4).forEach(function (c) {
                        var titre = (typeof getFld === 'function') ? getFld(c, 'titre') : (c.titre || '');
                        var art = (typeof getFld === 'function') ? (getFld(c, 'artiste_nom') || c.artiste_nom || '') : (c.artiste_nom || '');
                        items.push({
                            kind: 'chanson',
                            icon: 'fa-music',
                            label: titre + (art ? ' — ' + art : ''),
                            sub: art || '',
                            id: c.id,
                            audio: c.audio,
                            image: c.image,
                            title: titre,
                            artist: art
                        });
                    });
                    (data.artistes || []).slice(0, 3).forEach(function (a) {
                        var nom = (typeof getFld === 'function') ? getFld(a, 'nom') : (a.nom || '');
                        items.push({ kind: 'artiste', icon: 'fa-user', label: nom, sub: '', id: a.id });
                    });
                    (data.emissions || []).slice(0, 5).forEach(function (e) {
                        var num = e.numero_emission || e.id || '?';
                        var dateStr = fmtDate(e.date_emission);
                        // Titre générique "chaabi dialna" : on privilégie n° + date
                        var label = showLab + ' #' + num + (dateStr ? ' · ' + dateStr : '');
                        var sub = (e.invites_noms || e.invite || '') ? String(e.invites_noms || e.invite) : '';
                        items.push({
                            kind: 'emission',
                            icon: 'fa-podcast',
                            label: label,
                            sub: sub,
                            id: e.id,
                            numero: num,
                            date: dateStr
                        });
                    });
                    (data.interviews || []).slice(0, 3).forEach(function (iv) {
                        var lab = (typeof mediaTypeTitle === 'function') ? mediaTypeTitle('interview') : (isAr ? 'مقابلة' : 'Interview');
                        var who = iv.artiste_nom || '';
                        items.push({
                            kind: 'interview',
                            icon: 'fa-microphone',
                            label: lab + (who ? ' — ' + who : ''),
                            sub: iv.date_interview ? fmtDate(iv.date_interview) : '',
                            id: iv.id,
                            audio: iv.audio,
                            image: iv.image,
                            title: lab,
                            artist: who
                        });
                    });
                    (data.invites || []).slice(0, 3).forEach(function (inv) {
                        var nom = isAr && inv.nom_ar ? inv.nom_ar : (inv.nom || '');
                        items.push({
                            kind: 'invite',
                            icon: 'fa-user-friends',
                            label: nom,
                            sub: inv.invite_type || (isAr ? 'ضيف' : 'Invité'),
                            id: 0,
                            nom: inv.nom || nom
                        });
                    });
                    
                    if (poemesSug && Array.isArray(poemesSug.items)) {
                        poemesSug.items.slice(0, 3).forEach(function (qc) {
                            var qt = (isAr && qc.title_ar) ? qc.title_ar : (qc.title || '');
                            items.push({
                                kind: 'qacida',
                                icon: 'fa-scroll',
                                label: qt,
                                sub: (qc.subtitle || 'Qacidate'),
                                url: qc.url || ('poemes/q/' + encodeURIComponent(qc.slug || '')),
                                slug: qc.slug || '',
                                image: qc.image || null
                            });
                        });
                    }
                    _searchSuggestItems = items;
                    if (!items.length) {
                        box.innerHTML = '<div class="search-suggest-empty">' +
                            (isAr ? 'لا نتائج' : 'Aucun résultat') + '</div>';
                        box.classList.remove('hidden');
                        return;
                    }
                    box.innerHTML = items.map(function (it, idx) {
                        return '<button type="button" class="search-suggest-item" data-suggest-idx="' + idx + '" role="option">' +
                            '<i class="fas ' + it.icon + ' opacity-70 w-4 shrink-0" aria-hidden="true"></i>' +
                            '<span class="min-w-0 flex-1 text-start">' +
                            '<span class="block truncate font-medium">' + escHtml(it.label) + '</span>' +
                            (it.sub ? '<span class="block truncate text-xs opacity-60">' + escHtml(it.sub) + '</span>' : '') +
                            '</span></button>';
                    }).join('');
                    box.classList.remove('hidden');
                } catch (e) {
                    box.classList.add('hidden');
                }
            }, 280);
        }

        function activateSearchSuggestion(idx) {
            var it = _searchSuggestItems[idx];
            var box = document.getElementById('search-suggest');
            if (!it) return;
            if (box) box.classList.add('hidden');

            
            if (it.kind === 'qacida') {
                var u = it.url || ('poemes/q/' + encodeURIComponent(it.slug || ''));
                window.location.href = u;
                return;
            }
if (it.kind === 'chanson') {
                var audio = it.audio;
                if (typeof formatPath === 'function' && audio) audio = formatPath(audio);
                if (typeof playTrack === 'function' && audio) {
                    playTrack(it.title || '', it.artist || '', audio, it.image || '', { type: 'chanson', id: it.id });
                } else if (typeof navigateTo === 'function') {
                    navigateTo('chansons');
                }
                return;
            }
            if (it.kind === 'artiste') {
                if (typeof loadDetail === 'function') {
                    loadDetail('artiste_complet', it.id);
                } else if (typeof navigateTo === 'function') {
                    navigateTo('artiste/' + it.id);
                } else {
                    location.hash = 'artiste/' + it.id;
                }
                return;
            }
            if (it.kind === 'emission') {
                if (typeof loadDetail === 'function') {
                    loadDetail('emission_complet', it.id);
                } else {
                    location.hash = 'emission/' + it.id;
                }
                return;
            }
            if (it.kind === 'interview') {
                var audio = it.audio;
                if (typeof formatPath === 'function' && audio) audio = formatPath(audio);
                if (typeof playTrack === 'function' && audio) {
                    playTrack(it.title || '', it.artist || '', audio, it.image || '', { type: 'interview', id: it.id, title: it.title, artist: it.artist });
                } else if (typeof navigateTo === 'function') {
                    navigateTo('interviews');
                }
                return;
            }
            if (it.kind === 'invite') {
                if (typeof loadExternalGuestProfile === 'function' && it.nom) {
                    loadExternalGuestProfile(it.nom);
                }
            }
        }

        document.addEventListener('click', function (ev) {
            var box = document.getElementById('search-suggest');
            var input = document.getElementById('search-input');
            var btn = ev.target && ev.target.closest ? ev.target.closest('.search-suggest-item') : null;
            if (btn && box && box.contains(btn)) {
                ev.preventDefault();
                ev.stopPropagation();
                var idx = parseInt(btn.getAttribute('data-suggest-idx'), 10);
                if (!isNaN(idx)) activateSearchSuggestion(idx);
                return;
            }
            if (!box || !input) return;
            if (!box.contains(ev.target) && ev.target !== input) box.classList.add('hidden');
        });

        function handleSearch(e) {
            if (e.key === 'Enter') { performSearch(); var b=document.getElementById('search-suggest'); if(b) b.classList.add('hidden'); }
        }
        window.onSearchInput = onSearchInput;
        window.activateSearchSuggestion = activateSearchSuggestion;
		
        
        function onListSearchInput(immediate) {
            var input = document.getElementById('list-search');
            if (!input) return;
            var q = String(input.value || '').trim();
            var clr = document.getElementById('list-search-clear');
            if (clr) clr.classList.toggle('hidden', !q);
            clearTimeout(_listSearchTimer);
            var run = function () {
                listSearchQuery = q;
                if (typeof currentPage !== 'undefined') currentPage = 1;
                if (typeof loadListData === 'function') loadListData();
            };
            if (immediate) run();
            else _listSearchTimer = setTimeout(run, 320);
        }
        function clearListSearch() {
            listSearchQuery = '';
            var input = document.getElementById('list-search');
            if (input) input.value = '';
            var clr = document.getElementById('list-search-clear');
            if (clr) clr.classList.add('hidden');
            if (typeof currentPage !== 'undefined') currentPage = 1;
            if (typeof loadListData === 'function') loadListData();
        }
        window.onListSearchInput = onListSearchInput;
        window.clearListSearch = clearListSearch;

        async function performSearch() {
            var input = document.getElementById('search-input');
            var q = input ? String(input.value || '').trim() : '';
            // #59 = 2 chars min ; sinon au moins 2 lettres
            if (q.charAt(0) === '#') {
                if (!/^#\d+$/.test(q)) return;
            } else if (q.length < 2) return;

            if (typeof setUIView === 'function') {
                setUIView('list', { tab: 'search', searching: true });
            } else {
                var vh = document.getElementById('view-home');
                var vl = document.getElementById('view-list');
                var vd = document.getElementById('view-detail');
                if (vh) vh.classList.add('hidden');
                if (vd) vd.classList.add('hidden');
                if (vl) vl.classList.remove('hidden');
            }
            var fc = document.getElementById('form-container');
            if (fc) fc.innerHTML = '';

            var titleEl = document.getElementById('list-title');
            if (titleEl) {
                titleEl.textContent = (currentLang === 'ar' ? 'نتائج: ' : 'Resultats pour: ') + '"' + q + '"';
            }
            var container = document.getElementById('grid-container');
            if (!container) return;
            container.innerHTML = typeof renderSkeletons === 'function' ? renderSkeletons(4) : '';
            container.classList.remove('timeline-emissions');
            var pag = document.getElementById('pagination');
            if (pag) pag.innerHTML = '';

            var apiUrl = (window.CHAABI_API || 'api/radiochaabi.php') + '?action=search&q=' + encodeURIComponent(q);
            var poemesUrl = (window.CHAABI_POEMES_API || 'poemes/api/search.php') + '?q=' + encodeURIComponent(q) + '&limit=8';
            var data = await safeFetch(apiUrl);
            var poemesData = null;
            try {
                /* Recherche globale : aussi les qacidates (module poemes) */
                poemesData = await safeFetch(poemesUrl);
            } catch (eP) { poemesData = null; }
            if (!data && !(poemesData && poemesData.items && poemesData.items.length)) {
                container.innerHTML = '<div class="col-span-full empty-state"><i class="fas fa-triangle-exclamation"></i>Erreur de recherche</div>';
                return;
            }
            if (!data) data = {};

            var isAr = currentLang === 'ar';
            var labels = {
                artistes: (translations[currentLang] && translations[currentLang].artists) || 'Artistes',
                chansons: (translations[currentLang] && translations[currentLang].songs) || 'Chansons',
                emissions: (translations[currentLang] && translations[currentLang].shows) || 'Emissions',
                interviews: (translations[currentLang] && translations[currentLang].interviews) || (isAr ? 'مقابلات' : 'Interviews'),
                invites: isAr ? 'ضيوف' : 'Invites',
                qacidates: (translations[currentLang] && translations[currentLang].qacidates) || (isAr ? 'قصائد' : 'Qacidates')
            };
            if (poemesData && Array.isArray(poemesData.items) && poemesData.items.length) {
                data.qacidates = poemesData.items;
            }
            var html = '';
            var keys = ['artistes', 'chansons', 'emissions', 'interviews', 'invites', 'qacidates'];
            for (var ki = 0; ki < keys.length; ki++) {
                var key = keys[ki];
                var arr = data[key];
                if (arr && arr.length > 0) {
                    html += '<div class="col-span-full text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-4 mb-2">' + labels[key] + '</div>';
                    if (key === 'qacidates') {
                        for (var jq = 0; jq < arr.length; jq++) {
                            var qc = arr[jq];
                            var qTitre = (isAr && qc.title_ar) ? qc.title_ar : (qc.title || qc.titre || '');
                            var qSub = qc.subtitle || '';
                            var qUrl = qc.url || ('poemes/q/' + encodeURIComponent(qc.slug || ''));
                            var qImg = qc.image || '/music/images/chaabidialna.png';
                            html += '<a class="media-card group p-3 flex items-center gap-3 no-underline text-inherit" href="' + qUrl + '">';
                            html += '<img src="' + qImg + '" alt="" class="w-14 h-14 rounded-xl object-cover" loading="lazy" onerror="this.src=\'/music/images/chaabidialna.png\'">';
                            html += '<div class="min-w-0 flex-1"><p class="font-bold text-sm truncate">' + (typeof escHtml === 'function' ? escHtml(qTitre) : qTitre) + '</p>';
                            if (qSub) html += '<p class="text-xs text-slate-500 truncate">' + (typeof escHtml === 'function' ? escHtml(qSub) : qSub) + '</p>';
                            html += '<p class="text-[10px] text-amber-600 mt-0.5">Qacidate</p></div></a>';
                        }
                    } else if (key === 'invites') {
                        for (var j = 0; j < arr.length; j++) {
                            var inv = arr[j];
                            var nom = (isAr && inv.nom_ar) ? inv.nom_ar : (inv.nom || '');
                            var img = (typeof formatPath === 'function' ? formatPath(inv.image) : inv.image) || '/music/images/radiochabidialna.jpg';
                            var nb = inv.nb_emissions || 0;
                            html += '<article class="media-card group cursor-pointer p-3 flex items-center gap-3" onclick="loadExternalGuestProfile(\'' + String(inv.nom || '').replace(/'/g, "\\'") + '\')">';
                            html += '<img src="' + img + '" alt="" class="w-14 h-14 rounded-xl object-cover" loading="lazy">';
                            html += '<div class="min-w-0"><h3 class="mc-title truncate">' + nom + '</h3>';
                            html += '<p class="mc-sub">' + (inv.invite_type || (isAr ? 'ضيف' : 'Invite')) + (nb ? ' · ' + nb + (isAr ? ' حصص' : ' emissions') : '') + '</p></div></article>';
                        }
                    } else {
                        for (var j = 0; j < arr.length; j++) {
                            html += generateCard(arr[j], key);
                        }
                    }
                }
            }
            container.innerHTML = html || '<div class="col-span-full empty-state"><i class="fas fa-search"></i>' + (isAr ? 'لا توجد نتائج' : 'Aucun resultat trouve.') + '</div>';
            if (typeof initLazyImages === 'function') initLazyImages(container, 4);

            if (q.charAt(0) === '#' && data.emissions && data.emissions.length === 1) {
                loadDetail('emission_complet', data.emissions[0].id);
            }
        }

		
		
		
		

        /* ══════════════════════════════════════════
           FORMULAIRES
           ══════════════════════════════════════════ */
        function renderForm(type) {
            const t = translations[currentLang];
            if (type === 'dedicaces') {
                return `<div class="contact-layout grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
  <aside class="md:col-span-1">
    <div class="contact-card rounded-2xl p-6 text-white shadow-lg" style="background:linear-gradient(145deg,#0f172a 0%,#1e293b 55%,#064e3b 140%);">
      <div class="text-xs tracking-[.3em] opacity-80 mb-2 uppercase">${currentLang === 'ar' ? 'إهداء' : 'Dédicace'}</div>
      <h3 class="text-xl font-bold mb-4" style="font-family:'Playfair Display',Georgia,serif">Radio Chaabi</h3>
      <p class="text-sm opacity-90 leading-relaxed mb-3">${currentLang === 'ar' ? 'أرسل إهداءً للمستمعين — سيظهر في الشريط بعد الموافقة.' : 'Envoyez une dédicace aux auditeurs — elle apparaîtra dans le bandeau après validation.'}</p>
      <p class="text-sm opacity-80 mt-4 italic" style="font-family:'Playfair Display',Georgia,serif">« ${currentLang === 'ar' ? 'الشابي صوت الشعب' : 'La musique chaabi est la voix du peuple.'} »</p>
    </div>
  </aside>
  <div class="md:col-span-2 rounded-2xl p-6 md:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl">
    <h2 class="text-2xl font-bold mb-1 text-slate-900 dark:text-white">${t.form_dedicace_title || (currentLang === 'ar' ? 'إهداء' : 'Envoyer une dédicace')}</h2>
    <p class="text-slate-600 dark:text-slate-400 mb-6 text-sm">${currentLang === 'ar' ? 'املأ الحقول أدناه.' : 'Remplissez les champs ci-dessous.'}</p>
    <div class="grid gap-4">
      <div class="grid md:grid-cols-2 gap-4">
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">${t.name_ph || 'De (nom)'} *
          <input id="form-nom" type="text" required maxlength="100" class="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 bg-white dark:bg-slate-950 dark:border-slate-600 focus:ring-2 focus:ring-emerald-500 outline-none">
        </label>
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">${t.form_pour_ph || 'Pour'} *
          <input id="form-pour" type="text" required maxlength="100" class="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 bg-white dark:bg-slate-950 dark:border-slate-600 focus:ring-2 focus:ring-emerald-500 outline-none">
        </label>
      </div>
      <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">${t.form_msg_ph || 'Message'} *
        <textarea id="form-description" required rows="5" class="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 bg-white dark:bg-slate-950 dark:border-slate-600 focus:ring-2 focus:ring-emerald-500 outline-none"></textarea>
      </label>
      <p class="text-xs text-slate-500"><i class="fas fa-language mr-1 opacity-70"></i>${t.form_auto_translate || (currentLang === 'ar' ? 'يُترجم النص تلقائياً FR ↔ AR عند الإرسال' : 'Traduction automatique FR / AR a l envoi')}</p>
      <div class="flex flex-wrap items-center gap-4">
        <div class="chaabi-hp" aria-hidden="true" style="position:absolute;left:-9999px;opacity:0;height:0;overflow:hidden">
        <label>Site web<input type="text" id="form-website" name="website" tabindex="-1" autocomplete="off"></label>
      </div>
      <button type="button" onclick="submitForm('dedicace')" class="px-5 py-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-medium transition">${t.send || 'Envoyer'}</button>
        <p id="form-status" class="text-sm text-emerald-700 hidden"></p>
      </div>
    </div>
  </div>
</div>`;
            }
            if (type === 'commentaires') {
                return `<div class="contact-layout grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
  <aside class="md:col-span-1">
    <div class="contact-card rounded-2xl p-6 text-white shadow-lg" style="background:linear-gradient(145deg,#0f172a 0%,#1e293b 55%,#064e3b 140%);">
      <div class="text-xs tracking-[.25em] uppercase text-emerald-300/90 mb-2">Feedback</div>
      <h3 class="text-xl font-bold mb-3" style="font-family:'Playfair Display',Georgia,serif">${t.form_comment_title || (currentLang === 'ar' ? 'تعليق' : 'Votre avis')}</h3>
      <p class="text-sm text-slate-300 leading-relaxed mb-4">${currentLang === 'ar' ? 'شاركنا رأيك حول الموقع والبث.' : 'Partagez votre avis sur le site et les émissions.'}</p>
      <p class="text-sm italic text-emerald-100/90" style="font-family:'Playfair Display',Georgia,serif">« ${currentLang === 'ar' ? 'الشابي صوت الشعب' : 'La musique chaabi est la voix du peuple.'} »</p>
    </div>
  </aside>
  <div class="md:col-span-2 rounded-2xl p-6 md:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl">
    <h3 class="text-2xl font-bold mb-1 text-slate-900 dark:text-white">${t.form_comment_title || 'Commentaire'}</h3>
    <p class="text-slate-600 dark:text-slate-400 mb-6 text-sm">${currentLang === 'ar' ? 'نقرأ كل الرسائل بعناية.' : 'Nous lisons chaque message avec attention.'}</p>
    <div class="grid gap-4">
      <div class="grid md:grid-cols-2 gap-4">
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">${t.name_ph || 'Nom'} *
          <input id="form-nom" type="text" required maxlength="100" class="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none">
        </label>
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">${t.email_ph || 'Email'}
          <input id="form-email" type="email" class="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none">
        </label>
      </div>
      <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">${t.msg_ph || 'Message'} *
        <textarea id="form-message" required rows="5" class="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"></textarea>
      </label>
      <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">${t.rating_label || 'Note'}
        <select id="form-rating" class="mt-1 w-full md:w-48 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none">
          <option value="5">${t.stars_5 || '5 ★'}</option><option value="4">${t.stars_4 || '4 ★'}</option><option value="3">${t.stars_3 || '3 ★'}</option><option value="2">${t.stars_2 || '2 ★'}</option><option value="1">${t.stars_1 || '1 ★'}</option>
        </select>
      </label>
      <div class="flex flex-wrap items-center gap-4 pt-1">
        <div class="chaabi-hp" aria-hidden="true" style="position:absolute;left:-9999px;opacity:0;height:0;overflow:hidden">
        <label>Site web<input type="text" id="form-website" name="website" tabindex="-1" autocomplete="off"></label>
      </div>
      <button type="button" onclick="submitForm('commentaire')" class="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-md transition">${t.send || 'Envoyer'}</button>
        <p id="form-status" class="text-sm text-emerald-700 dark:text-emerald-400 hidden"></p>
      </div>
    </div>
  </div>
</div>`;
            }
            if (type === 'contacts') {
                return `<div class="contact-layout grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
  <aside class="md:col-span-1">
    <div class="contact-card rounded-2xl p-6 text-white shadow-lg" style="background:linear-gradient(145deg,#0f172a 0%,#1e293b 55%,#064e3b 140%);">
      <div class="text-xs tracking-[.3em] uppercase text-emerald-300/90 mb-2">${currentLang === 'ar' ? 'تواصل معنا' : 'Nous joindre'}</div>
      <h3 class="text-xl font-bold mb-4" style="font-family:'Playfair Display',Georgia,serif">Radio Chaabi</h3>
      <a href="mailto:contact@radiochaabi.com" class="flex items-center gap-3 mb-3 text-sm text-slate-200 hover:text-amber-300 transition">
        <i class="fas fa-envelope text-emerald-400"></i>
        <span>contact@radiochaabi.com</span>
      </a>
      <p class="text-sm text-slate-400 mt-2">${currentLang === 'ar' ? 'نرد خلال 48 ساعة.' : 'Réponse sous 48 h.'}</p>
      <p class="text-sm italic text-emerald-100/90 mt-5" style="font-family:'Playfair Display',Georgia,serif">« ${currentLang === 'ar' ? 'الشابي صوت الشعب' : 'La musique chaabi est la voix du peuple.'} »</p>
    </div>
  </aside>
  <div class="md:col-span-2 rounded-2xl p-6 md:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl">
    <h3 class="text-2xl font-bold mb-1 text-slate-900 dark:text-white">${t.form_contact_title || (currentLang === 'ar' ? 'راسلنا' : 'Envoyez-nous un message')}</h3>
    <p class="text-slate-600 dark:text-slate-400 mb-6 text-sm">${currentLang === 'ar' ? 'سؤال أو اقتراح ؟ اكتب لنا.' : 'Une question, une suggestion ? Écrivez-nous.'}</p>
    <div class="grid gap-4">
      <div class="grid md:grid-cols-2 gap-4">
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">${t.name_ph || 'Nom'} *
          <input id="form-nom" type="text" required maxlength="100" class="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none">
        </label>
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">${t.email_ph || 'Email'} *
          <input id="form-email" type="email" required class="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none">
        </label>
      </div>
      <div class="grid md:grid-cols-2 gap-4">
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">${t.phone_ph || 'Téléphone'}
          <input id="form-phone" type="tel" class="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none">
        </label>
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">${t.sujet_ph || 'Sujet'} *
          <input id="form-sujet" type="text" required maxlength="200" class="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none">
        </label>
      </div>
      <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">${t.msg_ph || 'Message'} *
        <textarea id="form-message" required rows="6" class="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"></textarea>
      </label>
      <div class="flex flex-wrap items-center gap-4 pt-1">
        <div class="chaabi-hp" aria-hidden="true" style="position:absolute;left:-9999px;opacity:0;height:0;overflow:hidden">
        <label>Site web<input type="text" id="form-website" name="website" tabindex="-1" autocomplete="off"></label>
      </div>
      <button type="button" onclick="submitForm('contact')" class="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-md transition">${t.send || 'Envoyer'}</button>
        <p id="form-status" class="text-sm text-emerald-700 dark:text-emerald-400 hidden"></p>
      </div>
    </div>
  </div>
</div>`;
            }
            return '';
        }

        async function submitForm(type) {
            var isAr = (typeof currentLang !== 'undefined' && currentLang === 'ar');
            // Honeypot : si rempli → bot (succès faux, rien n'est envoyé)
            var hp = document.getElementById('form-website');
            if (hp && String(hp.value || '').trim() !== '') {
                if (typeof showToast === 'function') showToast(isAr ? 'تم الإرسال' : 'Envoyé !', 'success');
                return;
            }
            // Rate-limit client : 1 envoi / 45s
            try {
                var last = parseInt(sessionStorage.getItem('chaabi_form_ts') || '0', 10);
                if (last && (Date.now() - last) < 45000) {
                    if (typeof showToast === 'function') {
                        showToast(isAr ? 'انتظر قليلاً قبل إرسال آخر' : 'Patientez quelques secondes avant un nouvel envoi.', 'warn');
                    }
                    return;
                }
            } catch (_) {}

            var payload = { website: '' }; // honeypot côté API
            var g = function (id) { var el = document.getElementById(id); return el ? String(el.value || '').trim() : ''; };
            if (type === 'dedicace') {
                payload.nom = g('form-nom');
                payload.pour = g('form-pour');
                payload.description = g('form-description');
                if (!payload.nom || !payload.pour || !payload.description) {
                    if (typeof showToast === 'function') showToast(isAr ? 'املأ كل الحقول' : 'Veuillez remplir tous les champs.', 'error');
                    return;
                }
            } else if (type === 'commentaire') {
                payload.nom = g('form-nom');
                payload.message = g('form-message');
                payload.email = g('form-email');
                payload.rating = g('form-rating') || '5';
                if (!payload.nom || !payload.message) {
                    if (typeof showToast === 'function') showToast(isAr ? 'املأ كل الحقول' : 'Veuillez remplir tous les champs.', 'error');
                    return;
                }
            } else if (type === 'contact') {
                payload.nom = g('form-nom');
                payload.email = g('form-email');
                payload.phone = g('form-phone');
                payload.sujet = g('form-sujet');
                payload.message = g('form-message');
                if (!payload.nom || !payload.email || !payload.message) {
                    if (typeof showToast === 'function') showToast(isAr ? 'املأ الحقول الإلزامية' : 'Champs obligatoires manquants.', 'error');
                    return;
                }
            }

            var btn = document.querySelector('#form-container button[onclick*="submitForm"]');
            if (btn && typeof btnFeedback === 'function') btnFeedback(btn, 'loading');

            try {
                const res = await fetch((window.CHAABI_API||'api/radiochaabi.php')+'?action=add_' + type, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data.success) {
                    try { sessionStorage.setItem('chaabi_form_ts', String(Date.now())); } catch (_) {}
                    const st = document.getElementById('form-status');
                    if (st) { st.innerText = data.message; st.classList.remove('hidden'); }
                    document.querySelectorAll('#form-container input, #form-container textarea, #form-container select').forEach(function (el) {
                        if (el.id !== 'form-website') el.value = '';
                    });
                    if (btn && typeof btnFeedback === 'function') btnFeedback(btn, 'ok');
                    if (typeof showToast === 'function') showToast(data.message || (isAr ? 'تم الإرسال' : 'Envoyé !'), 'success');
                } else {
                    if (btn && typeof btnFeedback === 'function') btnFeedback(btn, 'err');
                    const err = data.error || (isAr ? 'خطأ' : 'Erreur');
                    if (typeof showToast === 'function') showToast(err, 'error');
                }
            } catch (e) {
                console.error(e);
                if (btn && typeof btnFeedback === 'function') btnFeedback(btn, 'err');
                if (typeof showToast === 'function') showToast(isAr ? 'خطأ في الشبكة' : 'Erreur réseau', 'error');
            }
        }

        // Partage réseaux sociaux + SEO dynamique (pages détail)
        function setMeta(prop, content) {
            let el = document.querySelector('meta[property="' + prop + '"]');
            if (!el) { el = document.createElement('meta'); el.setAttribute('property', prop); document.head.appendChild(el); }
            el.setAttribute('content', content);
        }
        function shareButton(network, icon, color, title, shareUrl) {
            const url = shareUrl || (window._detailShareUrl || location.href);
            const u = encodeURIComponent(url);
            const txt = encodeURIComponent(title || 'Chaabi Music');
            let href = '#';
            if (network === 'whatsapp') href = 'https://wa.me/?text=' + txt + '%20' + u;
            if (network === 'facebook') href = 'https://www.facebook.com/sharer/sharer.php?u=' + u;
            if (network === 'twitter') href = 'https://x.com/intent/tweet?text=' + txt + '&url=' + u;
            return '<a href="' + href + '" target="_blank" rel="noopener noreferrer" class="w-9 h-9 rounded-full flex items-center justify-center text-white hover:scale-110 transition shadow" style="background:' + color + '" aria-label="' + network + '"><i class="' + icon + ' text-sm"></i></a>';
        }
        function copyShareLink() {
            const url = window._detailShareUrl || ((typeof getShareBase === 'function' ? getShareBase() : 'https://radiochaabi.com/index.html') + (location.hash || ''));
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(url).then(function () {
                    if (typeof showToast === 'function') showToast(currentLang === 'ar' ? 'تم نسخ الرابط' : 'Lien copié', 'success');
                }).catch(function () { prompt('Lien :', url); });
            } else prompt('Lien :', url);
        }
        function renderDetailExtras() {
            const detailView = document.getElementById('view-detail');
            const h1 = detailView ? detailView.querySelector('h1') : null;
            if (!h1) return;
            const title = h1.textContent.trim();
            document.title = title + ' | Radio Chaabi';
            // URL partageable de la fiche (pas seulement l'accueil)
            const shareUrl = window._detailShareUrl || ((typeof getShareBase === 'function' ? getShareBase() : 'https://radiochaabi.com/index.html') + (location.hash || ''));
            setMeta('og:title', title);
            setMeta('og:description', title + ' — ' + translations[currentLang].hero_desc);
            const img = detailView.querySelector('img');
            if (img && img.src) setMeta('og:image', new URL(img.src, location.origin).href);
            setMeta('og:url', shareUrl);
            // Évite les doublons si re-render
            const old = detailView.querySelector('.detail-share-row');
            if (old) old.remove();
            h1.insertAdjacentHTML('afterend',
                '<div class="detail-share-row flex items-center gap-2 mt-3 flex-wrap">' +
                shareButton('whatsapp', 'fab fa-whatsapp', '#25D366', title, shareUrl) +
                shareButton('facebook', 'fab fa-facebook-f', '#1877F2', title, shareUrl) +
                shareButton('twitter', 'fab fa-x-twitter', '#111827', title, shareUrl) +
                '<button type="button" id="share-copy" onclick="copyShareLink()" class="w-9 h-9 rounded-full bg-slate-600 text-white flex items-center justify-center hover:scale-110 transition" aria-label="Copier le lien"><i class="fas fa-link text-sm"></i></button></div>'
            );
        }

        /** Clic sur un nom d'invité : artiste en 1 clic, sinon profil invité externe */
        async function openGuestProfile(name) {
            name = String(name || '').trim();
            if (!name) return;
            try {
                const res = await fetch((window.CHAABI_API||'api/radiochaabi.php')+'?action=search&q=' + encodeURIComponent(name));
                const data = await res.json();
                const artists = (data && data.artistes) ? data.artistes : [];
                if (artists.length) {
                    // Match exact prioritaire
                    const low = name.toLowerCase();
                    let best = artists.find(a => (a.nom || '').toLowerCase() === low || (a.nom_ar || '') === name);
                    if (!best) best = artists[0];
                    if (best && best.id) {
                        loadDetail('artiste_complet', best.id);
                        return;
                    }
                }
            } catch (e) { console.warn(e); }
            if (typeof loadExternalGuestProfile === 'function') {
                loadExternalGuestProfile(name);
            }
        }
        window.openGuestProfile = openGuestProfile;

        /* ══════════════════════════════════════════
           CARTES & LISTES
           ══════════════════════════════════════════ */
        function generateCard(item, type) {
            const imgSrc = (typeof resolveMediaImage === 'function') ? resolveMediaImage(item.image, item.artiste_image, item.photo) : formatPath(item.image || item.artiste_image);
            const t = (translations && translations[currentLang]) ? translations[currentLang] : {};
            const audioUrl = item.audio ? formatPath(item.audio) : '';
            const metaRow = (views, likes, subType, id, title, artist, audio, img) => {
                let html = '<div class="mc-actions">';
                if (views != null) html += `<span class="mc-stat" title="Vues"><i class="fas fa-eye"></i><span class="view-count">${views}</span></span>`;
                if (likes != null && subType && id) {
                    html += `<button type="button" class="mc-like-btn" onclick="event.stopPropagation();likeItem('${subType}',${id},this)" title="Like"><i class="fas fa-heart"></i><span class="like-count">${likes}</span></button>`;
                }
                if (subType && id && (subType === 'chanson' || subType === 'emission' || subType === 'interview' || subType === 'artiste')) {
                    const favOn = (typeof isFavorite === 'function' && isFavorite(subType, id));
                    const t0 = title || '';
                    const a0 = artist || '';
                    const au = audio || '';
                    const im = img || '';
                    html += `<button type="button" class="${favOn ? 'is-fav' : ''}" onclick="event.stopPropagation();toggleFavorite('${subType}',${id},'${jsAttr(t0)}','${jsAttr(a0)}','${jsAttr(im)}','${jsAttr(au)}',this)" title="Favori"><i class="${favOn ? 'fas' : 'far'} fa-star"></i></button>`;
                    if (subType !== 'artiste') {
                        html += `<button type="button" onclick="event.stopPropagation();shareMedia('${subType}',${id},'${jsAttr(t0)}','${jsAttr(a0)}')" title="Partager"><i class="fas fa-share-nodes"></i></button>`;
                    }
                }
                html += '</div>';
                return html;
            };
            const coverPlay = (onclick, duration, badge) => `
                <div class="mc-img-bx" onclick="${onclick}"${audioUrl ? ` onmouseenter="prefetchAudioUrl('${jsAttr(audioUrl)}')"` : ''}>
                    ${typeof responsiveImg === 'function' ? responsiveImg(imgSrc, { className: '', sizes: '(max-width:640px) 45vw, (max-width:1024px) 22vw, 180px', width: 360, height: 360 }) : `<img src="${imgSrc}" alt="" loading="lazy" decoding="async">`}
                    <span class="mc-img-overlay"></span>
                    ${duration ? `<span class="mc-duration">${duration}</span>` : ''}
                    ${badge ? `<span class="mc-badge">${badge}</span>` : ''}
                    <span class="mc-play"><span><i class="fas fa-play text-sm ml-0.5"></i></span></span>
                </div>`;

            if (type === 'artistes') {
                const aNom = getFld(item, 'nom') || '';
                return `<article class="media-card group cursor-pointer" data-type="artiste" data-id="${item.id}" data-media-key="artiste-${item.id}" onclick="loadDetail('artiste_complet', ${item.id})">
                    <div class="mc-img-bx">
                        ${typeof responsiveImg === 'function' ? responsiveImg(imgSrc, { alt: aNom, className: '', sizes: '(max-width:640px) 45vw, (max-width:1024px) 22vw, 180px', width: 360, height: 360 }) : `<img src="${imgSrc}" alt="${jsStr(aNom)}" loading="lazy">`}
                        <span class="mc-img-overlay"></span>
                    </div>
                    <div class="mc-content">
                        <h3 class="mc-title">${jsStr(aNom)}</h3>
                        <p class="mc-sub">${t.artists || 'Artiste'}</p>
                        ${metaRow(item.views, item.likes, 'artiste', item.id, aNom, '', '', imgSrc)}
                    </div>
                </article>`;
            }

            if (type === 'chansons') {
                const titre = getFld(item, 'titre') || '';
                const artiste = getFld(item, 'artiste_nom') || '';
                const playFn = `playTrack('${jsAttr(titre)}', '${jsAttr(artiste)}', '${jsAttr(audioUrl)}', '${jsAttr(imgSrc)}', { type: 'chanson', id: ${item.id}, title: '${jsAttr(titre)}', artist: '${jsAttr(artiste)}', numero: '', invite: '' })`;
                const queueFn = audioUrl ? `event.stopPropagation();addToQueue('${jsAttr(titre)}', '${jsAttr(artiste)}', '${jsAttr(audioUrl)}', '${jsAttr(imgSrc)}', { type: 'chanson', id: ${item.id}, title: '${jsAttr(titre)}', artist: '${jsAttr(artiste)}', numero: '', invite: '' })` : '';
                return `<article class="media-card group" data-type="chanson" data-id="${item.id}" data-media-key="chanson-${item.id}">
                    ${coverPlay(playFn, item.duree || '')}
                    <div class="mc-content">
                        <h3 class="mc-title" title="${jsStr(titre)}">${jsStr(titre)}</h3>
                        <p class="mc-sub">${jsStr(artiste)}</p>
                        ${metaRow(item.views, item.likes, 'chanson', item.id, titre, artiste, audioUrl, imgSrc)}
                        ${queueFn ? `<div class="mc-actions" style="margin-top:0.15rem"><button type="button" onclick="${queueFn}" title="${currentLang === 'ar' ? 'أضف للقائمة' : 'File d\'attente'}"><i class="fas fa-list-ul"></i></button></div>` : ''}
                    </div>
                </article>`;
            }

            if (type === 'emissions') {
                const inviteNames = [];
                if (item.invites_noms) {
                    String(item.invites_noms).split(',').forEach(n => { n = n.trim(); if (n) inviteNames.push(n); });
                }
                const playFn = audioUrl
                    ? `event.stopPropagation();playTrack('${jsAttr((t.show_label || 'Émission') + ' #' + (item.numero_emission || '?'))}', '${jsAttr(item.invites_noms || '')}', '${jsAttr(audioUrl)}', '${jsAttr(imgSrc)}', { type: 'emission', id: ${item.id}, title: '${jsAttr((t.show_label || 'Émission') + ' #' + (item.numero_emission || '?'))}', artist: '${jsAttr(item.invites_noms || '')}', numero: '${jsAttr(item.numero_emission || '')}', invite: '${jsAttr(item.invites_noms || '')}' })`
                    : '';
                const invitesHtml = inviteNames.length
                    ? `<div class="mc-invites">${inviteNames.map(n =>
                        `<button type="button" onclick="event.stopPropagation();openGuestProfile('${jsAttr(n)}')">${jsStr(n)}</button>`
                      ).join('')}</div>`
                    : '';
                const badge = `${t.show_label || 'Émission'} #${item.numero_emission || '?'}`;
                return `<article class="media-card group cursor-pointer" data-type="emission" data-id="${item.id}" data-media-key="emission-${item.id}" onclick="loadDetail('emission_complet', ${item.id})">
                    ${coverPlay(playFn || `loadDetail('emission_complet', ${item.id})`, item.duree || '', badge)}
                    <div class="mc-content">
                        <div class="flex items-center gap-2 mb-1"><span class="timeline-num">#${item.numero_emission || item.id}</span>${item.date_emission ? `<span class="text-xs text-slate-500">${new Date(item.date_emission).toLocaleDateString(currentLang==='ar'?'ar-DZ':'fr-FR')}</span>` : ''}</div>
                        <h3 class="mc-title">${badge}</h3>
                        <p class="mc-sub"><i class="fas fa-users mr-1"></i>${t.invites || 'Invités'}${inviteNames.length ? ' · ' + inviteNames.length : ''}</p>
                        ${invitesHtml}
                        ${metaRow(item.views, item.likes, 'emission', item.id, badge, item.invites_noms || '', audioUrl, imgSrc)}
                    </div>
                </article>`;
            }

            if (type === 'interviews') {
                const aNom = getFld(item, 'artiste_nom') || '';
                const iLab = (typeof mediaTypeTitle === 'function' ? mediaTypeTitle('interview') : 'Interview');
                const playFn = `playTrack('${jsAttr(iLab)}', '${jsAttr(aNom)}', '${jsAttr(audioUrl)}', '${jsAttr(imgSrc)}', { type: 'interview', id: ${item.id}, title: '${jsAttr(iLab)}', artist: '${jsAttr(aNom)}', numero: '', invite: '' })`;
                return `<article class="media-card group" data-type="chanson" data-id="${item.id}" data-media-key="chanson-${item.id}">
                    ${coverPlay(playFn, item.duree || '', t.interview_label || 'Interview')}
                    <div class="mc-content">
                        <h3 class="mc-title">${jsStr(aNom)}</h3>
                        <p class="mc-sub">${t.interview_label || 'Interview'}</p>
                        ${metaRow(item.views, item.likes, 'interview', item.id, aNom, 'Interview', audioUrl, imgSrc)}
                    </div>
                </article>`;
            }

            if (type === 'bouqalla') {
                const num = item.num || item.id || '?';
                const ar = getFld(item, 'arabe') || item.arabe || '';
                const ph = item.phonetic || item.phonetique || '';
                const fr = getFld(item, 'francais') || item.francais || '';
                return `<article class="bq-card">
                    <div class="bq-num">N° ${jsStr(num)}</div>
                    ${ar ? `<div class="bq-ar" dir="rtl" lang="ar">${jsStr(ar)}</div>` : ''}
                    ${ph ? `<div class="bq-ph">${jsStr(ph)}</div>` : ''}
                    ${fr ? `<div class="bq-fr">${jsStr(fr)}</div>` : ''}
                </article>`;
            }

            if (type === 'dedicaces') {
                const dDate = item.created_at ? new Date(item.created_at).toLocaleDateString(currentLang === 'ar' ? 'ar-DZ' : 'fr-FR') : '';
                const tD = translations[currentLang] || translations.fr || {};
                const lDe = tD.dedicace_de || (currentLang === 'ar' ? 'من' : 'De');
                const lPour = tD.dedicace_pour || (currentLang === 'ar' ? 'إلى' : 'Pour');
                const lMsg = tD.dedicace_message || (currentLang === 'ar' ? 'الرسالة' : 'Message');
                const pickD = (fr, ar) => {
                    if (currentLang === 'ar' && ar != null && String(ar).trim() !== '') return String(ar).trim();
                    if (fr != null && String(fr).trim() !== '') return String(fr).trim();
                    if (ar != null && String(ar).trim() !== '') return String(ar).trim();
                    return '';
                };
                const dNom = pickD(item.nom, item.nom_ar);
                const dPour = pickD(item.pour, item.pour_ar);
                const dMsg = pickD(item.description, item.description_ar);
                const rtl = currentLang === 'ar' ? ' dir="rtl" lang="ar"' : '';
                return `<div class="glass-panel p-4 flex flex-col"${rtl}>
                <p class="text-xs text-stone-500 dark:text-slate-400"><span class="uppercase tracking-wide opacity-70">${lDe}</span> <span class="font-bold text-blue-600 dark:text-blue-400">${jsStr(dNom || '…')}</span></p>
                <p class="text-xs text-stone-500 dark:text-slate-400 mt-1"><span class="uppercase tracking-wide opacity-70">${lPour}</span> <span class="font-bold text-stone-800 dark:text-gray-200">${jsStr(dPour || '…')}</span></p>
                <p class="text-stone-700 dark:text-gray-300 text-sm mt-2 flex-1"><span class="text-[11px] uppercase tracking-wide text-stone-500 dark:text-slate-400 not-italic">${lMsg}</span><br><span class="italic">"${jsStr(dMsg)}"</span></p>
                <div class="flex items-center gap-3 text-[11px] text-stone-500 dark:text-slate-400 mt-3 pt-2 border-t border-stone-200/60 dark:border-slate-700">
                    ${item.likes != null ? `<button type="button" onclick="event.stopPropagation();likeItem('dedicace',${item.id},this)" class="inline-flex items-center gap-1 hover:text-emerald-400"><i class="fas fa-heart"></i><span class="like-count">${item.likes}</span></button>` : ''}
                    ${dDate ? `<span class="ml-auto inline-flex items-center gap-1"><i class="fas fa-calendar-day opacity-60"></i>${dDate}</span>` : ''}
                </div>
            </div>`;
            }

            if (type === 'commentaires') {
                let stars = '';
                for (let i = 1; i <= 5; i++) stars += `<i class="fas fa-star ${i <= item.rating ? 'text-yellow-400' : 'text-stone-300 dark:text-gray-600'} text-xs"></i>`;
                const cDate = item.created_at ? new Date(item.created_at).toLocaleDateString() : '';
                return `<div class="glass-panel p-4 flex flex-col">
                    <div class="flex items-center mb-2">
                        <div class="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center font-bold text-amber-800 dark:text-amber-300 mr-3">${(item.nom || '?').charAt(0)}</div>
                        <div><p class="font-bold text-stone-800 dark:text-gray-100 text-sm">${item.nom || ''}</p><div class="flex gap-1 mt-1">${stars}</div></div>
                    </div>
                    <p class="text-stone-600 dark:text-gray-400 text-sm flex-1">${item.message || ''}</p>
                    ${cDate ? `<p class="text-[11px] text-stone-500 dark:text-slate-400 mt-3 pt-2 border-t border-stone-200/60 dark:border-slate-700"><i class="fas fa-calendar-day opacity-60 mr-1"></i>${cDate}</p>` : ''}
                </div>`;
            }

            if (type === 'contacts') return `<div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5 flex flex-col">
                <div class="flex justify-between mb-2">
                    <p class="font-bold text-gray-800 dark:text-gray-100">${item.nom} <span class="text-xs font-normal text-gray-500">(${item.email})</span></p>
                    <span class="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">${new Date(item.created_at).toLocaleDateString()}</span>
                </div>
                <p class="text-xs text-emerald-600 font-bold mb-2">${item.sujet || 'Sans sujet'}</p>
                <p class="text-gray-600 dark:text-gray-400 text-sm flex-1">${item.message}</p>
            </div>`;

            return '';
        }

        // PAGINATION COMPACTE (1, 2 ... 5, 6, 7 ... 20)
        function renderPagination(pagination) {
            const container = document.getElementById('pagination');
            container.innerHTML = '';
            const { current_page, total_pages } = pagination;
            if (total_pages <= 1) return;

            const createBtn = (page, text, disabled, active = false) => {
                const btn = document.createElement('button');
                btn.innerHTML = text;
                btn.disabled = disabled;
                btn.className = `px-3 py-1.5 text-sm rounded-md border transition ${active ? 'bg-amber-600 text-white border-amber-500' : disabled ? 'bg-gray-200 text-gray-400 dark:bg-gray-700' : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'}`;
                if (!disabled) btn.onclick = () => { currentPage = page; loadListData(); };
                return btn;
            };

            container.appendChild(createBtn(current_page - 1, '<i class="fas fa-chevron-left"></i>', current_page === 1));

            let pages = [];
            if (total_pages <= 5) {
                for (let i = 1; i <= total_pages; i++) pages.push(i);
            } else {
                pages.push(1);
                if (current_page > 3) pages.push('...');
                if (current_page > 2) pages.push(current_page - 1);
                if (current_page !== 1 && current_page !== total_pages) pages.push(current_page);
                if (current_page < total_pages - 1) pages.push(current_page + 1);
                if (current_page < total_pages - 2) pages.push('...');
                pages.push(total_pages);
            }

            pages.forEach(p => {
                if (p === '...') {
                    const span = document.createElement('span');
                    span.className = 'px-2 text-gray-500 self-center';
                    span.textContent = '...';
                    container.appendChild(span);
                } else {
                    container.appendChild(createBtn(p, p, false, p === current_page));
                }
            });

            container.appendChild(createBtn(current_page + 1, '<i class="fas fa-chevron-right"></i>', current_page === total_pages));
        }

        function switchDetailTab(tabName) {
            document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
            document.getElementById('tab-' + tabName).classList.remove('hidden');
            document.querySelectorAll('.tab-btn-detail').forEach(btn => {
                btn.classList.remove('border-emerald-600', 'text-emerald-600');
                btn.classList.add('border-transparent', 'hover:text-gray-600', 'hover:border-gray-300', 'dark:hover:text-gray-300');
            });
            let activeBtn = document.querySelector(`.tab-btn-detail[data-tab="${tabName}"]`);
            if(activeBtn) {
                activeBtn.classList.add('border-emerald-600', 'text-emerald-600');
                activeBtn.classList.remove('border-transparent', 'hover:text-gray-600', 'hover:border-gray-300', 'dark:hover:text-gray-300');
            }
        }

        
        
        async function loadExternalGuestProfile(invite_nom) {
            try {
                var gHash = 'invite/' + encodeURIComponent(invite_nom);
                history.replaceState(null, '', location.pathname + location.search + '#' + gHash);
                window._detailShareUrl = (typeof getShareBase === 'function' ? getShareBase() : 'https://radiochaabi.com/index.html') + '#' + gHash;
            } catch (_) {}
            var detailView = setUIView('detail', {
                detail: { type: 'guest', id: invite_nom },
                tab: 'emissions'
            });
            if (!detailView) return;
            detailView.innerHTML = '<div class="flex justify-center py-20"><div class="skeleton w-16 h-16 rounded-full"></div></div>';

            try {
                var response = await fetch((window.CHAABI_API || 'api/radiochaabi.php') + '?action=get_guest_complet&invite_externe_nom=' + encodeURIComponent(invite_nom));
                var data = await response.json();
                if (data.error) {
                    detailView.innerHTML = '<p class="text-center text-red-500 py-12">' + (data.error || 'Erreur') + '</p>';
                    return;
                }
                var t = translations[currentLang] || {};
                var isAr = currentLang === 'ar';
                var nom = (typeof getFld === 'function' ? getFld(data, 'nom') : data.nom) || invite_nom;
                var typ = (typeof getFld === 'function' ? getFld(data, 'invite_type') : data.invite_type) || (isAr ? 'ضيف' : 'Invite');
                var bio = (typeof getFld === 'function' ? getFld(data, 'bio') : data.bio) || '';
                var img = (typeof formatPath === 'function' ? formatPath(data.image) : data.image) || '/music/images/radiochabidialna.jpg';
                var nEm = (data.emissions || []).length;
                var nIv = (data.interviews || []).length;
                var nCh = (data.chansons || []).length;

                function fmtDate(d) {
                    if (!d) return '';
                    try {
                        return new Date(d).toLocaleDateString(isAr ? 'ar-DZ' : 'fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
                    } catch (_) {
                        return String(d).slice(0, 10);
                    }
                }
                function esc(s) {
                    return typeof escHtml === 'function' ? escHtml(s) : String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
                }

                var html = '';
                html += '<button type="button" onclick="navigateTo(\'emissions\')" class="mb-6 text-emerald-600 font-medium"><i class="fas fa-arrow-' + (isAr ? 'right' : 'left') + ' mr-2"></i> ' + (t.back || 'Retour') + '</button>';
                html += '<div class="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl">';
                html += '<div class="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 p-6 sm:p-8 text-white">';
                html += '<div class="flex flex-col sm:flex-row gap-6 items-center sm:items-start">';
                html += '<img src="' + esc(img) + '" alt="" class="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl object-cover ring-2 ring-emerald-400/40 shadow-2xl" loading="lazy">';
                html += '<div class="flex-1 text-center sm:text-left min-w-0">';
                html += '<p class="text-xs uppercase tracking-[0.2em] text-emerald-300 font-bold mb-1">' + esc(typ) + '</p>';
                html += '<h1 class="text-2xl sm:text-3xl font-black leading-tight">' + esc(nom) + '</h1>';
                html += '<div class="flex flex-wrap gap-2 mt-4 justify-center sm:justify-start">';
                html += '<span class="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">' + nEm + ' ' + (isAr ? 'حصص' : 'emissions') + '</span>';
                html += '<span class="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-slate-200 border border-white/15">' + nIv + ' ' + (isAr ? 'مقابلات' : 'interviews') + '</span>';
                if (nCh) html += '<span class="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-200 border border-amber-400/30">' + nCh + ' ' + (isAr ? 'اغاني' : 'chansons') + '</span>';
                html += '</div></div></div></div>';

                html += '<div class="border-b border-slate-200 dark:border-slate-700 flex gap-1 px-2 sm:px-4 overflow-x-auto">';
                html += '<button type="button" class="tab-btn-detail border-b-2 border-emerald-600 text-emerald-600 px-4 py-3 text-sm font-semibold whitespace-nowrap" data-tab="bio" onclick="switchDetailTab(\'bio\')">' + (t.bio || 'Bio') + '</button>';
                html += '<button type="button" class="tab-btn-detail border-b-2 border-transparent px-4 py-3 text-sm font-semibold whitespace-nowrap" data-tab="emissions" onclick="switchDetailTab(\'emissions\')">' + (t.shows || 'Emissions') + ' (' + nEm + ')</button>';
                html += '<button type="button" class="tab-btn-detail border-b-2 border-transparent px-4 py-3 text-sm font-semibold whitespace-nowrap" data-tab="interviews" onclick="switchDetailTab(\'interviews\')">' + (t.interviews || 'Interviews') + ' (' + nIv + ')</button>';
                if (nCh) html += '<button type="button" class="tab-btn-detail border-b-2 border-transparent px-4 py-3 text-sm font-semibold whitespace-nowrap" data-tab="chansons" onclick="switchDetailTab(\'chansons\')">' + (t.songs || 'Chansons') + ' (' + nCh + ')</button>';
                html += '</div>';

                html += '<div id="tab-bio" class="tab-content p-5 sm:p-6">';
                html += bio
                    ? '<p class="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line" dir="auto">' + esc(bio) + '</p>'
                    : '<p class="text-slate-500 text-sm">' + (isAr ? 'لا توجد سيرة' : 'Pas de biographie disponible.') + '</p>';
                html += '</div>';

                html += '<div id="tab-emissions" class="tab-content hidden p-4 sm:p-6">';
                if (nEm) {
                    html += '<div class="grid gap-3 sm:grid-cols-2">';
                    (data.emissions || []).forEach(function (e) {
                        var num = e.numero_emission || e.id || '?';
                        var d = fmtDate(e.date_emission);
                        var eImg = (typeof formatPath === 'function' ? formatPath(e.image) : e.image) || img;
                        html += '<button type="button" class="guest-media-card text-left rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-3 flex gap-3 hover:border-emerald-500 hover:shadow-md transition w-full" onclick="loadDetail(\'emission_complet\', ' + e.id + ')">';
                        html += '<img src="' + esc(eImg) + '" alt="" class="w-16 h-16 rounded-lg object-cover shrink-0" loading="lazy">';
                        html += '<div class="min-w-0 flex-1">';
                        html += '<span class="inline-block text-[10px] font-extrabold uppercase tracking-wide text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full mb-1">#' + num + '</span>';
                        if (d) html += '<p class="text-xs text-slate-500 mb-0.5">' + d + '</p>';
                        html += '<p class="font-semibold text-sm truncate">' + (t.show_label || 'Emission') + ' #' + num + '</p>';
                        html += '<p class="text-xs text-emerald-600 mt-1 font-medium">' + (t.view_show || 'Voir') + ' →</p>';
                        html += '</div></button>';
                    });
                    html += '</div>';
                } else {
                    html += '<p class="text-slate-500 text-sm">' + (t.empty_participation || (isAr ? 'لا مشاركات' : 'Aucune participation')) + '</p>';
                }
                html += '</div>';

                html += '<div id="tab-interviews" class="tab-content hidden p-4 sm:p-6">';
                if (nIv) {
                    html += '<div class="grid gap-3 sm:grid-cols-2">';
                    (data.interviews || []).forEach(function (i) {
                        var d = fmtDate(i.date_interview);
                        var iLab = (typeof mediaTypeTitle === 'function') ? mediaTypeTitle('interview') : (isAr ? 'مقابلة' : 'Interview');
                        var iImg = (typeof formatPath === 'function' ? formatPath(i.image || data.image) : (i.image || data.image)) || img;
                        var audio = typeof formatPath === 'function' ? formatPath(i.audio) : i.audio;
                        html += '<div class="guest-media-card rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-3 flex gap-3 items-center">';
                        html += '<img src="' + esc(iImg) + '" alt="" class="w-16 h-16 rounded-lg object-cover shrink-0" loading="lazy">';
                        html += '<div class="min-w-0 flex-1"><p class="font-semibold text-sm">' + esc(iLab) + '</p>';
                        if (d) html += '<p class="text-xs text-slate-500">' + d + '</p>';
                        html += '</div>';
                        if (audio) {
                            html += '<button type="button" class="shrink-0 w-10 h-10 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 flex items-center justify-center guest-play-btn" data-title="' + esc(iLab) + '" data-artist="' + esc(nom) + '" data-audio="' + esc(audio) + '" data-img="' + esc(iImg) + '" data-type="interview" data-id="' + i.id + '"><i class="fas fa-play text-xs"></i></button>';
                        }
                        html += '</div>';
                    });
                    html += '</div>';
                } else {
                    html += '<p class="text-slate-500 text-sm">' + (t.empty_interviews || (isAr ? 'لا مقابلات' : 'Aucune interview')) + '</p>';
                }
                html += '</div>';

                if (nCh) {
                    html += '<div id="tab-chansons" class="tab-content hidden p-4 sm:p-6"><div class="grid gap-3 sm:grid-cols-2">';
                    (data.chansons || []).forEach(function (c) {
                        var titre = (typeof getFld === 'function' ? getFld(c, 'titre') : c.titre) || '';
                        var cImg = (typeof formatPath === 'function' ? formatPath(c.image || data.image) : (c.image || data.image)) || img;
                        var audio = typeof formatPath === 'function' ? formatPath(c.audio) : c.audio;
                        html += '<div class="guest-media-card rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-3 flex gap-3 items-center">';
                        html += '<img src="' + esc(cImg) + '" alt="" class="w-14 h-14 rounded-lg object-cover shrink-0">';
                        html += '<div class="min-w-0 flex-1"><p class="font-semibold text-sm truncate">' + esc(titre) + '</p></div>';
                        if (audio) {
                            html += '<button type="button" class="shrink-0 w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center guest-play-btn" data-title="' + esc(titre) + '" data-artist="' + esc(nom) + '" data-audio="' + esc(audio) + '" data-img="' + esc(cImg) + '" data-type="chanson" data-id="' + c.id + '"><i class="fas fa-play text-xs"></i></button>';
                        }
                        html += '</div>';
                    });
                    html += '</div></div>';
                }

                html += '</div>';

                window._lastGuestInterviews = data.interviews || [];
                detailView.innerHTML = html;
                detailView.querySelectorAll('.guest-play-btn').forEach(function (btn) {
                    btn.addEventListener('click', function (ev) {
                        ev.stopPropagation();
                        var title = btn.getAttribute('data-title') || '';
                        var artist = btn.getAttribute('data-artist') || '';
                        var audio = btn.getAttribute('data-audio') || '';
                        var im = btn.getAttribute('data-img') || '';
                        var type = btn.getAttribute('data-type') || 'chanson';
                        var id = parseInt(btn.getAttribute('data-id') || '0', 10);
                        if (typeof playTrack === 'function' && audio) {
                            playTrack(title, artist, audio, im, { type: type, id: id, title: title, artist: artist });
                        }
                    });
                });
                if (typeof renderDetailExtras === 'function') renderDetailExtras();
                switchDetailTab('bio');
            } catch (error) {
                console.error(error);
                detailView.innerHTML = '<p class="text-center text-red-500 py-12">Erreur de chargement</p>';
            }
        }

        
        /* ══════════════════════════════════════════
           PAGES DÉTAIL
           ══════════════════════════════════════════ */
        async function loadDetail(type, id) {
            window._lastDetail = { type: type, id: id };
                // Hash partageable : #artiste/12 ou #emission/5
            var hashKind = type === 'artiste_complet' ? 'artiste' : (type === 'emission_complet' ? 'emission' : type);
            try {
                var newHash = hashKind + '/' + id;
                if (location.hash.replace(/^#/, '') !== newHash) {
                    history.replaceState(null, '', location.pathname + location.search + '#' + newHash);
                }
                window._detailShareUrl = (typeof getShareBase === 'function' ? getShareBase() : 'https://radiochaabi.com/index.html') + '#' + newHash;
            } catch (_) {}
            const detailView = setUIView('detail', {
                detail: { type: type, id: id },
                tab: type === 'artiste_complet' ? 'artistes' : 'emissions'
            });
            if (!detailView) return;
            detailView.innerHTML = `<div class="flex justify-center py-20"><div class="skeleton w-16 h-16 rounded-full"></div></div>`;

            try {
                const response = await fetch((window.CHAABI_API||'api/radiochaabi.php')+`?action=get_${type}&id=${id}`);
                const data = await response.json();
                // Incremente la vue a l'ouverture de la fiche
                if (type === 'artiste_complet' && data && data.id && typeof trackView === 'function') trackView('artiste', data.id);
                if (type === 'artiste_complet') {
                    window._lastArtistSongs = data.chansons || [];
                    window._lastArtistImage = (typeof formatPath === 'function' ? formatPath(data.image) : data.image) || '';
                }
                if (type === 'artiste_complet' && typeof updateSeoForView === 'function') {
                    updateSeoForView('artistes', (typeof getFld === 'function' ? getFld(data, 'nom') : data.nom) || 'Artiste');
                }
                if (type === 'emission_complet' && data && data.id && typeof trackView === 'function') trackView('emission', data.id);
                const t = translations[currentLang]; let html = `<button onclick="navigateTo('${type.includes('artiste') ? 'artistes' : 'emissions'}')" class="mb-6 text-emerald-600 font-medium"><i class="fas fa-arrow-${currentLang === 'ar' ? 'right' : 'left'} mr-2"></i> ${t.back}</button>`;

                if (type === 'artiste_complet') {
                    const aNom = getFld(data, 'nom') || '';
                    const nSongs = (data.chansons && data.chansons.length) || 0;
                    const nInt = (data.interviews && data.interviews.length) || 0;
                    const nEm = (data.emissions && data.emissions.length) || 0;
                    const playAllLbl = currentLang === 'ar' ? 'استمع للكل' : 'Écouter tout';
                    const songsLbl = currentLang === 'ar' ? 'أغاني' : 'chansons';
                    const intLbl = currentLang === 'ar' ? 'مقابلات' : 'interviews';
                    const emLbl = currentLang === 'ar' ? 'برامج' : 'émissions';
                    html += `<div class="glass-panel p-4 sm:p-6 md:p-8 artist-profile">
                        <div class="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-6 sm:mb-8 border-b dark:border-gray-700 pb-6 sm:pb-8">
                            ${typeof responsiveImg === "function" ? responsiveImg(data.image, { alt: aNom, className: "w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 rounded-2xl object-cover shadow-lg mx-auto sm:mx-0 shrink-0 ring-2 ring-amber-400/40", sizes: "(max-width:640px) 112px, 176px", width: 176, height: 176, priority: "high" }) : `<img src="${formatPath(data.image)}" alt="${jsStr(aNom)}" class="w-28 h-28 sm:w-44 sm:h-44 rounded-2xl object-cover shadow-lg mx-auto sm:mx-0 shrink-0" loading="eager">`}
                            <div class="flex-1 min-w-0 text-center sm:text-left">
                                <p class="text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400 font-bold mb-1">${currentLang==='ar'?'فنان الشابي':'Artiste chaâbi'}</p>
                                <h1 class="text-2xl sm:text-3xl font-bold break-words text-slate-900 dark:text-white">${aNom}</h1>
                                <div class="flex flex-wrap justify-center sm:justify-start gap-2 mt-3 text-xs sm:text-sm">
                                    <span class="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"><i class="fas fa-music mr-1 text-amber-500"></i>${nSongs} ${songsLbl}</span>
                                    <span class="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"><i class="fas fa-microphone mr-1 text-sky-500"></i>${nInt} ${intLbl}</span>
                                    <span class="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"><i class="fas fa-podcast mr-1 text-emerald-500"></i>${nEm} ${emLbl}</span>
                                    <span class="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"><i class="fas fa-eye mr-1"></i> ${data.views || 0}</span>
                                    <button type="button" onclick="likeItem('artiste', ${data.id}, this)" class="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:text-amber-500 transition"><i class="fas fa-heart"></i> <span class="like-count">${data.likes || 0}</span></button>
                                </div>
                                <div class="flex flex-wrap justify-center sm:justify-start gap-2 mt-4">
                                    ${ nSongs ? `<button type="button" class="px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md" onclick="event.stopPropagation();playAllTracks(window._lastArtistSongs||[],'chanson')"><i class="fas fa-play mr-2"></i>${playAllLbl}</button>` : '' }
                                    <button type="button" class="px-4 py-2 rounded-full border border-slate-300 dark:border-slate-600 text-sm font-semibold hover:border-amber-500 transition" onclick="switchDetailTab('chansons')">${currentLang==='ar'?'الأغاني':'Voir les chansons'}</button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="border-b border-gray-200 dark:border-gray-700 mb-6 overflow-hidden">
                            <ul class="detail-tabs -mb-px text-sm font-medium text-center">
                                <li class="mr-2"><button onclick="switchDetailTab('bio')" class="tab-btn-detail px-3 py-3 text-sm font-medium border-b-2 border-transparent" data-tab="bio">${t.bio}</button></li>
                                <li class="mr-2"><button onclick="switchDetailTab('chansons')" class="tab-btn-detail px-3 py-3 text-sm font-medium border-b-2 border-transparent" data-tab="chansons">${t.songs} (${(data.chansons && data.chansons.length) || 0})</button></li>
                                <li class="mr-2"><button onclick="switchDetailTab('interviews')" class="tab-btn-detail px-3 py-3 text-sm font-medium border-b-2 border-transparent" data-tab="interviews">${t.interviews} (${(data.interviews && data.interviews.length) || 0})</button></li>
                                <li class="mr-2"><button onclick="switchDetailTab('emissions')" class="tab-btn-detail px-3 py-3 text-sm font-medium border-b-2 border-transparent" data-tab="emissions">${t.shows} (${(data.emissions && data.emissions.length) || 0})</button></li>
                            </ul>
                        </div>

                        <div id="tab-bio" class="tab-content hidden p-4 text-gray-700 dark:text-gray-300 leading-relaxed">${getFld(data, 'bio')}</div>
                        <div id="tab-chansons" class="tab-content hidden p-4">
                            <div class="grid gap-3 sm:grid-cols-2">
                            ${(data.chansons || []).map(c => {
                                const titre = getFld(c, 'titre') || '';
                                const audio = formatPath(c.audio);
                                const cImg = (typeof resolveMediaImage === 'function') ? resolveMediaImage(c.image, data.image) : formatPath(c.image || data.image);
                                const aNom = getFld(data, 'nom') || '';
                                return `<div class="guest-media-card rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-3 flex gap-3 items-center">
                                    <img src="${cImg}" alt="" class="w-14 h-14 rounded-lg object-cover shrink-0" loading="lazy">
                                    <div class="min-w-0 flex-1"><p class="font-semibold text-sm truncate">${titre}</p></div>
                                    ${audio ? `<button type="button" class="shrink-0 w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700" onclick="playTrack('${jsStr(titre)}','${jsStr(aNom)}','${audio}','${cImg}',{type:'chanson',id:${c.id},title:'${jsStr(titre)}',artist:'${jsStr(aNom)}'})"><i class="fas fa-play text-xs"></i></button>` : ''}
                                </div>`;
                            }).join('') || '<p class="text-slate-500 col-span-full">' + t.empty_songs + '</p>'}
                            </div>
                        </div>
                                                <div id="tab-interviews" class="tab-content hidden p-4">
                            <div class="grid gap-3 sm:grid-cols-2">
                            ${(data.interviews || []).map(i => {
                                const iLab = (typeof mediaTypeTitle === 'function') ? mediaTypeTitle('interview') : (t.interview_label || 'Interview');
                                const d = i.date_interview ? new Date(i.date_interview).toLocaleDateString(currentLang==='ar'?'ar-DZ':'fr-FR') : '';
                                const audio = formatPath(i.audio);
                                const iImg = formatPath(i.image || data.image);
                                const aNom = getFld(data, 'nom') || '';
                                return `<div class="guest-media-card rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-3 flex gap-3 items-center">
                                    <img src="${iImg}" alt="" class="w-16 h-16 rounded-lg object-cover shrink-0" loading="lazy">
                                    <div class="min-w-0 flex-1">
                                        <p class="font-semibold text-sm">${iLab}</p>
                                        ${d ? `<p class="text-xs text-slate-500">${d}</p>` : ''}
                                    </div>
                                    ${audio ? `<button type="button" class="shrink-0 w-10 h-10 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 flex items-center justify-center" onclick="playTrack('${jsStr(iLab)}','${jsStr(aNom)}','${audio}','${iImg}',{type:'interview',id:${i.id},title:'${jsStr(iLab)}',artist:'${jsStr(aNom)}'})"><i class="fas fa-play text-xs"></i></button>` : ''}
                                </div>`;
                            }).join('') || '<p class="text-slate-500 col-span-full">' + t.empty_interviews + '</p>'}
                            </div>
                        </div>
                        <div id="tab-emissions" class="tab-content hidden p-4">
                            <div class="grid gap-3 sm:grid-cols-2">
                            ${(data.emissions || []).map(e => {
                                const num = e.numero_emission || e.id || '?';
                                const d = e.date_emission ? new Date(e.date_emission).toLocaleDateString(currentLang==='ar'?'ar-DZ':'fr-FR',{day:'2-digit',month:'short',year:'numeric'}) : '';
                                const eImg = formatPath(e.image || data.image);
                                return `<button type="button" class="guest-media-card text-left rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-3 flex gap-3 hover:border-emerald-500 hover:shadow-md transition w-full" onclick="loadDetail('emission_complet', ${e.id})">
                                    <img src="${eImg}" alt="" class="w-16 h-16 rounded-lg object-cover shrink-0" loading="lazy">
                                    <div class="min-w-0 flex-1">
                                        <span class="inline-block text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full mb-1">#${num}</span>
                                        ${d ? `<p class="text-xs text-slate-500">${d}</p>` : ''}
                                        <p class="font-semibold text-sm">${t.show_label} #${num}</p>
                                        <p class="text-xs text-emerald-600 mt-1 font-medium">${t.view_show || 'Voir'} →</p>
                                    </div>
                                </button>`;
                            }).join('') || '<p class="text-slate-500 col-span-full">' + t.empty_participation + '</p>'}
                            </div>
                        </div>
                    </div>`;
                    
                    detailView.innerHTML = html;
                    renderDetailExtras();
                    switchDetailTab('bio');
                
                } else if (type === 'emission_complet') {
                    const title = getFld(data, 'invites_noms') || 'Invité(s)';
                    const avg = (data.rating_stats && data.rating_stats.avg) || 0; const votes = (data.rating_stats && data.rating_stats.total_votes) || 0;
                    let stars = '<div class="flex items-center gap-2 mt-2">';
                    for(let i=1; i<=5; i++) stars += `<i onclick="rateEmission(${data.id}, ${i})" class="fas fa-star ${i <= Math.round(avg) ? 'text-yellow-400' : 'text-gray-300'} text-xl cursor-pointer hover:scale-110"></i>`;
                    stars += `<span class="text-sm text-gray-500">(${avg > 0 ? avg + '/5' : 'Non noté'} - ${votes} votes)</span></div>`;

                    html += `<div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
                        <div class="flex flex-col md:flex-row gap-6 mb-8">
                            <img src="${formatPath(data.image)}" class="w-40 h-40 rounded-lg object-cover shadow-lg">
                            <div class="flex-1">
                                <span class="text-sm bg-amber-100 text-amber-900 px-3 py-1 rounded-full">${t.show_label}</span>
                                <h1 class="text-3xl font-bold mt-2">${t.show_label} #${data.numero_emission || '?'}</h1>
                                <p class="text-md text-gray-500 mt-1"><i class="fas fa-users mr-1"></i> ${title}</p>
                                <div class="flex gap-6 text-sm text-gray-500 mt-2"><span><i class="fas fa-eye mr-1"></i> ${data.views}</span><button onclick="likeItem('emission', ${data.id}, this)" class="hover:text-emerald-400"><i class="fas fa-heart"></i> <span class="like-count">${data.likes}</span></button></div>
                                ${stars}<p class="mt-4">${getFld(data, 'description')}</p></div>
                        </div>
                        ${data.audio ? `<button onclick="playTrack('${t.show_label} #${jsStr(data.numero_emission || '?')}', '${jsStr(getFld(data, 'invites_noms') || '')}', '${formatPath(data.audio)}', '${formatPath(data.image)}', { type: 'emission', id: ${data.id}, title: '', artist: '', numero: '${jsStr(data.numero_emission || '')}', invite: '${jsStr(getFld(data, 'invites_noms') || '')}' })" class="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition mb-8 shadow-lg shadow-emerald-900/30"><i class="fas fa-play"></i> ${t.listen_emission}</button>` : ''}
                        
                                                <h3 class="text-xl font-semibold border-l-4 border-emerald-600 pl-3 mb-4">${t.invites}</h3>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                        ${(data.invites || []).map(inv => {
                            const isInternal = !!inv.artiste_id;
                            const nom = getFld(inv, 'artiste_nom') || getFld(inv, 'invite_externe_nom') || '';
                            const typ = getFld(inv, 'invite_externe_type') || (isInternal
                                ? (currentLang === 'ar' ? 'فنان / ضيف داخلي' : 'Artiste · invité interne')
                                : (currentLang === 'ar' ? 'ضيف خارجي' : 'Invité externe'));
                            const img = formatPath(inv.artiste_image || inv.invite_externe_image) || '/music/images/radiochabidialna.jpg';
                            const clickAction = isInternal
                                ? `onclick="loadDetail('artiste_complet', ${inv.artiste_id})"`
                                : `onclick="loadExternalGuestProfile('${String(inv.invite_externe_nom||nom).replace(/'/g, "\\'")}')"`;
                            const iLab = (typeof mediaTypeTitle === 'function') ? mediaTypeTitle('interview') : 'Interview';
                            const ivs = (inv.interviews || []);
                            return `
                            <div ${clickAction} class="guest-card group rounded-2xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 p-4 cursor-pointer hover:border-emerald-500/60 hover:shadow-lg transition">
                                <div class="flex items-center gap-3 mb-3">
                                    <img src="${img}" alt="" class="w-16 h-16 rounded-xl object-cover ring-2 ring-emerald-500/20 group-hover:ring-emerald-400/50 transition" loading="lazy">
                                    <div class="min-w-0 flex-1">
                                        <p class="font-bold text-slate-900 dark:text-white truncate">${nom}</p>
                                        <span class="inline-block mt-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${isInternal ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'}">${typ}</span>
                                    </div>
                                    <i class="fas fa-chevron-right text-slate-400 group-hover:text-emerald-500 transition"></i>
                                </div>
                                ${(function(){
                                if (!ivs.length) return '<p class="text-xs text-slate-400">' + (currentLang==='ar' ? 'لا مقابلة مسجلة' : "Pas d'interview liée") + '</p>';
                                return '<div class="border-t border-slate-200 dark:border-slate-700 pt-3 space-y-2" onclick="event.stopPropagation()">' +
                                    '<p class="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">' + (t.interviews || 'Interviews') + ' · ' + ivs.length + '</p>' +
                                    ivs.map(function(i) {
                                        var d = i.date_interview ? new Date(i.date_interview).toLocaleDateString(currentLang==='ar'?'ar-DZ':'fr-FR') : '';
                                        var audio = formatPath(i.audio);
                                        var h = '<div class="flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 px-2.5 py-2"><div class="min-w-0 flex-1"><p class="text-xs font-semibold">' + iLab + '</p>';
                                        if (d) h += '<p class="text-[10px] text-slate-500">' + d + '</p>';
                                        h += '</div>';
                                        if (audio) {
                                            h += '<button type="button" class="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700" onclick="event.stopPropagation();playTrack(' + JSON.stringify(iLab) + ',' + JSON.stringify(nom) + ',' + JSON.stringify(audio) + ',' + JSON.stringify(img) + ',{type:\'interview\',id:' + i.id + '})"><i class="fas fa-play text-[10px]"></i></button>';
                                        }
                                        h += '</div>';
                                        return h;
                                    }).join('') + '</div>';
                            })()}
                            </div>`;
                        }).join('') || '<p class="text-slate-500 col-span-full">' + (currentLang==='ar'?'لا ضيوف':'Aucun invité') + '</p>'}
                        </div>

                        <h3 class="text-xl font-semibold border-l-4 border-emerald-600 pl-3 mb-4">${t.comments}</h3>
                        <div class="space-y-3 mb-6">${(data.comments || []).map(c => `<div class="bg-gray-50 dark:bg-gray-700 p-3 rounded"><p class="font-semibold text-sm">${c.nom}</p><p class="text-sm mt-1">${c.message}</p></div>`).join('') || '<p class="text-gray-500">' + t.empty_comments + '</p>'}</div>
                        <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                            <input id="cmt-nom" type="text" placeholder="${t.name_ph}" class="w-full p-2 mb-2 rounded border dark:bg-gray-600 text-black dark:text-white">
                            <input id="cmt-email" type="email" placeholder="${t.email_ph}" class="w-full p-2 mb-2 rounded border dark:bg-gray-600 text-black dark:text-white">
                            <textarea id="cmt-msg" placeholder="${t.msg_ph}" class="w-full p-2 mb-2 rounded border dark:bg-gray-600 text-black dark:text-white"></textarea>
                            <button onclick="submitComment(${data.id})" class="bg-emerald-600 text-white px-4 py-2 rounded">${t.send}</button>
                            <p id="cmt-status" class="text-green-600 text-sm mt-2 hidden"></p>
                        </div>
                    </div>`;
                    
                    detailView.innerHTML = html;
                    renderDetailExtras();
                }
            } catch (error) { console.error(error); }
        }

        window.loadDetail = loadDetail;

        document.addEventListener('keydown', function (ev) {
            if (ev.key === 'Escape') {
                var mm = document.getElementById('mobile-menu');
                if (mm && !mm.classList.contains('hidden')) {
                    mm.classList.add('hidden');
                    var btn = document.getElementById('mobile-menu-btn');
                    if (btn) btn.setAttribute('aria-expanded', 'false');
                }
            }
        });

        function renderMaRadio() {
            var root = document.getElementById('view-radio');
            if (!root) return;
            var isAr = currentLang === 'ar';
            var t = (typeof translations !== 'undefined' && translations[currentLang]) ? translations[currentLang] : {};
            var favs = (typeof loadFavorites === 'function' ? loadFavorites() : []).slice(0, 30);
            var hist = (typeof PLAY_HISTORY !== 'undefined' && PLAY_HISTORY) ? PLAY_HISTORY.slice().reverse().slice(0, 20) : [];
            var queue = (typeof RADIO_QUEUE !== 'undefined' && RADIO_QUEUE) ? RADIO_QUEUE : [];

            function row(item, kind) {
                var title = item.title || item.titre || '';
                var artist = item.artist || item.artiste_nom || '';
                var audio = item.audio || item.src || '';
                var img = (typeof resolveMediaImage === 'function') ? resolveMediaImage(item.img, item.image, item.photo, item.artiste_image, item.mediaInfo && item.mediaInfo.image, window._lastArtistImage) : (typeof formatPath === 'function' ? formatPath(item.img || item.image) : (item.img || item.image || ''));
                if (!img) img = (typeof IMG_FALLBACK !== 'undefined' ? IMG_FALLBACK : '/music/news_hero/emissions_chaabi.webp');
                var type = (item.mediaInfo && item.mediaInfo.type) || item.type || kind || 'chanson';
                var id = (item.mediaInfo && item.mediaInfo.id) || item.id || 0;
                var mi = { type: type, id: id, title: title, artist: artist, image: img };
                if (!audio) {
                    return '<div class="guest-media-card rounded-xl border border-slate-200 dark:border-slate-700 p-3 flex gap-3 items-center opacity-70">' +
                        '<img src="' + img + '" class="w-12 h-12 rounded-lg object-cover" alt="">' +
                        '<div class="min-w-0 flex-1"><p class="text-sm font-semibold truncate text-slate-900 dark:text-white">' + (title || '—') + '</p>' +
                        (artist ? '<p class="text-xs font-medium text-slate-600 dark:text-slate-300 truncate">' + artist + '</p>' : '') + '</div></div>';
                }
                return '<button type="button" class="guest-media-card w-full text-left rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-3 flex gap-3 items-center hover:border-emerald-500 transition" onclick=\'playTrack(' +
                    JSON.stringify(title) + ',' + JSON.stringify(artist) + ',' + JSON.stringify(audio) + ',' + JSON.stringify(img) + ',' + JSON.stringify(mi) + ')\'>' +
                    '<img src="' + img + '" class="w-12 h-12 rounded-lg object-cover shrink-0" alt="">' +
                    '<div class="min-w-0 flex-1"><p class="text-sm font-semibold truncate text-slate-900 dark:text-white">' + title + '</p>' +
                    (artist ? '<p class="text-xs font-medium text-slate-600 dark:text-slate-300 truncate">' + artist + '</p>' : '') + '</div>' +
                    '<span class="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0"><i class="fas fa-play text-xs"></i></span></button>';
            }

            var html = '';
            html += '<div class="max-w-3xl mx-auto px-3 sm:px-4 py-6">';
            html += '<div class="rounded-2xl bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white p-6 mb-6 shadow-xl">';
            html += '<p class="text-xs uppercase tracking-[0.2em] text-emerald-300 font-bold mb-1">' + (isAr ? 'راديو' : 'Radio') + '</p>';
            html += '<h1 class="text-2xl sm:text-3xl font-black mb-2">' + (isAr ? 'راديوي' : 'Ma radio') + '</h1>';
            html += '<p class="text-sm text-slate-300">' + (isAr ? 'مفضلاتك، تاريخ الاستماع وقائمة الانتظار' : "Favoris, historique et file d'attente") + '</p>';
            html += '<div class="flex flex-wrap gap-2 mt-4">';
            html += '<span class="px-3 py-1 rounded-full text-xs font-bold bg-white/10 border border-white/15">' + favs.length + ' ' + (isAr ? 'مفضلة' : 'favoris') + '</span>';
            html += '<span class="px-3 py-1 rounded-full text-xs font-bold bg-white/10 border border-white/15">' + hist.length + ' ' + (isAr ? 'حديثة' : 'récents') + '</span>';
            html += '<span class="px-3 py-1 rounded-full text-xs font-bold bg-white/10 border border-white/15">' + queue.length + ' ' + (isAr ? 'في الانتظار' : 'en file') + '</span>';
            html += '</div></div>';

            // Favoris
            html += '<section class="mb-8"><div class="flex items-center justify-between mb-3">';
            html += '<h2 class="text-lg font-bold"><i class="fas fa-star text-amber-400 mr-2"></i>' + (t.my_favorites || (isAr ? 'مفضلتي' : 'Mes favoris')) + '</h2>';
            if (favs.length) html += '<button type="button" class="text-xs font-bold text-red-500" onclick="clearFavorites();renderMaRadio()">' + (isAr ? 'مسح' : 'Vider') + '</button>';
            html += '</div>';
            if (favs.length) {
                html += '<div class="grid gap-2">' + favs.map(function (f) { return row(f, f.type); }).join('') + '</div>';
            } else {
                html += '<p class="text-slate-500 text-sm">' + (isAr ? 'لا مفضلات بعد — اضغط ★ على بطاقة' : 'Aucun favori — appuyez sur ★ sur une carte') + '</p>';
            }
            html += '</section>';

            // Récents
            html += '<section class="mb-8"><div class="flex items-center justify-between mb-3">';
            html += '<h2 class="text-lg font-bold m-0"><i class="fas fa-history text-emerald-500 mr-2"></i>' + (t.recent_played || (isAr ? 'استمعت مؤخراً' : 'Écoutés récemment')) + '</h2>';
            if (hist.length) html += '<button type="button" class="text-xs font-bold text-red-500 hover:underline" onclick="clearPlayHistory()">' + (isAr ? 'مسح السجل' : 'Vider l\'historique') + '</button>';
            html += '</div>';
            if (hist.length) {
                html += '<div class="grid gap-2">' + hist.map(function (h) { return row(h, 'chanson'); }).join('') + '</div>';
            } else {
                html += '<p class="text-slate-500 text-sm">' + (isAr ? 'لا تاريخ بعد' : 'Aucun historique pour le moment') + '</p>';
            }
            html += '</section>';

            // Queue
            html += '<section class="mb-8"><h2 class="text-lg font-bold mb-3"><i class="fas fa-list-ol text-amber-400 mr-2"></i>' + (t.player_queue || (isAr ? "قائمة الانتظار" : "File d'attente")) + '</h2>';
            if (queue.length) {
                html += '<div class="grid gap-2">' + queue.map(function (q) { return row(q, q.type); }).join('') + '</div>';
            } else {
                html += '<p class="text-slate-500 text-sm">' + (isAr ? 'القائمة فارغة' : 'File vide') + '</p>';
            }
            html += '</section>';

            html += '<div class="flex flex-wrap gap-2 pb-8">';
            html += '<button type="button" class="px-4 py-2 rounded-full bg-emerald-600 text-white text-sm font-bold" onclick="navigateTo(\'onair\')">' + (t.onair || "À l'antenne") + '</button>';
            html += '<button type="button" class="px-4 py-2 rounded-full border border-slate-300 dark:border-slate-600 text-sm font-bold" onclick="navigateTo(\'chansons\')">' + (t.songs || 'Chansons') + '</button>';
            html += '</div></div>';

            root.innerHTML = html;
        }
        window.renderMaRadio = renderMaRadio;

window.performSearch = performSearch;