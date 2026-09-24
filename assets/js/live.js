var lastReportedKey = null;
var playHeartbeat = null;
/**
 * Chaabi Music Pro — module JS
 * Chargé en séquence (defer). Les onclick HTML restent valides (scope global).
 */
/* ── Live bar & dédicaces ── */
        function reportPlaying() {
            const info = CURRENT_PLAY;
            if (!info.key) return;
            lastReportedKey = info.key;
            fetch((window.CHAABI_API||'api/radiochaabi.php')+'?action=track_play', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: getSessionId(), media_type: info.mediaType, media_id: info.mediaId, title: info.title, artist: info.artist, image: info.image, numero: info.numero, invite: info.invite })
            }).catch(() => {});
            if (!playHeartbeat) {
                playHeartbeat = setInterval(() => {
                    const a = CURRENT_PLAY.audioEl;
                    if (CURRENT_PLAY.key === lastReportedKey && a && !a.paused && !a.ended) { reportPlaying(); trackListen('progress', CURRENT_PLAY); }
                }, 30000);
            }
            loadLiveBar();
        }

        // Suivi de lecture : toutes les lectures passent par le player global (playTrack)

        async function loadLiveBar() {
            const container = document.getElementById('live-bar-items');
            if (!container) return;
            try {
                const res = await fetch((window.CHAABI_API||'api/radiochaabi.php')+'?action=get_live_bar&minutes=15');
                const data = await res.json();
                let items = (data && Array.isArray(data.data)) ? data.data : [];
                // Radio en continu : chip "Radio" affiché SEULEMENT quand aucun média n'est en cours de lecture
                if (data.radio && data.radio.stream_url && data.radio.last_title && !items.length) {
                    items = [{ media_type: 'radio', media_id: -1, title: data.radio.last_title, artist: data.radio.last_artist || '', audio: data.radio.stream_url, image: '' }];
                }
                const eq = document.getElementById('live-eq');
                if (eq) eq.classList.toggle('paused', !items.length);
                // Nombre d'auditeurs en ce moment (mis à jour avant la signature pour rafraîchir même sans nouveau média)
                const ln = document.getElementById('live-listeners');
                if (ln && typeof data.listeners === 'number') {
                    ln.classList.toggle('hidden', data.listeners === 0);
                    ln.textContent = '· ' + data.listeners + ' ' + translations[currentLang].live_listeners;
                }
                // Signature = liste des médias (type+id) : si rien ne change, on ne reconstruit pas
                // (évite de faire "sauter" l'animation toutes les 30 s à cause des heartbeats)
                const sig = currentLang + '|' + items.map(i => i.media_type + '-' + i.media_id + (i.media_id < 0 ? ':' + i.title : '')).join(',');
                if (container.dataset.sig === sig && container.dataset.loaded === '1') return;
                container.dataset.loaded = '1';
                container.dataset.sig = sig;
                if (!items.length) {
                    container.classList.remove('live-ticker');
                    container.innerHTML = '<span class="text-xs sm:text-[13px] live-bar-muted italic whitespace-normal"><i class="fas fa-music mr-1.5"></i>' + jsStr(translations[currentLang].live_empty) + '</span>';
                    return;
                }
                // Afficher plusieurs médias en cours (au moins 3–5 si dispo, max 10)
                const MAX_SHOWN = 10;
                const shown = items.slice(0, MAX_SHOWN);
                const hasMore = items.length > MAX_SHOWN;
                const sep = '<span class="mx-4 text-amber-400/50">•</span>';
                const one = shown.map(i => formatLiveItem(i)).join(sep) + (hasMore ? '<span class="mx-3 inline-flex items-center gap-1 text-slate-500" aria-hidden="true"><i class="fas fa-ellipsis"></i></span>' : '');
                container.innerHTML = `<span class="ticker-copy">${one}</span>`;
                const copyW = container.querySelector('.ticker-copy').offsetWidth || 1;
                const viewW = container.parentElement ? container.parentElement.clientWidth : window.innerWidth;
                if (copyW <= viewW) {
                    // Peu de médias : une seule liste, sans duplication — défilement sobre
                    container.classList.remove('live-ticker');
                    container.style.removeProperty('--ticker-copies');
                    return;
                }
                container.classList.add('live-ticker');
                // Beaucoup de médias : boucle continue (copies uniquement nécessaires pour couvrir l'écran)
                const copies = Math.min(8, Math.max(2, Math.ceil(viewW / copyW) + 1));
                let tpl = '';
                for (let i = 0; i < copies; i++) tpl += `<span class="ticker-copy"${i > 0 ? ' aria-hidden="true"' : ''}>${one}</span>`;
                container.innerHTML = tpl;
                container.style.setProperty('--ticker-copies', copies);
                container.style.animationName = 'none';
                void container.offsetWidth;
                container.style.animationName = '';
                container.style.animationDuration = Math.max(20, Math.min(120, (copies * copyW) / 60)) + 's';
            } catch (e) {
                if (container.dataset.loaded !== '1') {
                    container.classList.remove('live-ticker');
                    container.innerHTML = '<span class="text-xs sm:text-[13px] live-bar-muted italic whitespace-normal"><i class="fas fa-plug mr-1.5"></i>' + jsStr(translations[currentLang].live_error) + '</span>';
                }
            }
        }
        function isLightTheme() {
            try {
                var h = document.documentElement;
                if (h.classList.contains('dark')) return false;
                if (h.classList.contains('theme-light') || h.classList.contains('theme-ios')) return true;
                return !h.classList.contains('dark');
            } catch (_) { return false; }
        }
        function formatLiveItem(item) {
            const listenersBadge = (item.listeners_count && item.listeners_count > 1)
                ? `<span class="live-chip-count opacity-70 text-[10px] font-bold">×${item.listeners_count}</span>`
                : '';

            const hasAudio = !!(item.audio && item.media_type !== 'emission');
            const light = isLightTheme();
            const chipStyle = light
                ? 'background:#f5e6c8;border:1px solid #b45309;color:#1c1410'
                : 'background:rgba(245,185,66,0.18);border:1px solid rgba(245,185,66,0.35);color:#fef3c7';
            const chip = 'live-chip glass-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs sm:text-[13px] leading-snug transition-colors duration-200 whitespace-nowrap';
            const t = translations[currentLang];
            const isAr = currentLang === 'ar';
            const artist = (isAr && item.artist_ar) ? item.artist_ar : (item.artist || '');
            const title = (isAr && item.title_ar) ? item.title_ar : (item.title || '');
            const invite = (isAr && item.invite_ar) ? item.invite_ar : (item.invite || '');
            switch (item.media_type) {
                case 'chanson': {
                    const inner = `<span><b>${jsStr(artist)}</b> — ${jsStr(title)}</span>`;
                    return hasAudio
                        ? `<span title="${jsStr(artist)} - ${jsStr(title)}" class="${chip} live-chip--song cursor-pointer" style="${chipStyle}" onclick="playTrack('${jsAttr(title)}', '${jsStr(artist)}', '${jsStr(formatPath(item.audio))}', '${jsStr(formatPath(item.image))}', { type: 'chanson', id: ${item.media_id}, title: '${jsStr(title)}', artist: '${jsStr(artist)}', numero: '', invite: '' })"><span class="shrink-0">🎵</span>${inner}</span>`
                        : `<span class="${chip} live-chip--song" style="${chipStyle}"><span class="shrink-0">🎵</span>${inner}</span>`;
                }
                case 'emission': {
                    const inv = invite ? t.live_invited + jsStr(invite) : '';
                    const label = t.live_emission + jsStr(item.numero || '?') + inv;
                    return `<span title="${label}" class="${chip} live-chip--show cursor-pointer" style="${chipStyle}" onclick="loadDetail('emission_complet', ${item.media_id})"><span class="shrink-0">📻</span><span>${label}</span></span>`;
                }
                case 'interview': {
                    const inner = `<span>${t.live_interview} ${jsStr(artist)}</span>`;
                    return hasAudio
                        ? `<span title="${t.live_interview} ${jsStr(artist)}" class="${chip} live-chip--interview cursor-pointer" style="${chipStyle}" onclick="playTrack('Interview', '${jsStr(artist)}', '${jsStr(formatPath(item.audio))}', '${jsStr(formatPath(item.image))}', { type: 'interview', id: ${item.media_id}, title: '', artist: '${jsStr(artist)}', numero: '', invite: '' })"><span class="shrink-0">🎤</span>${inner}</span>`
                        : `<span class="${chip} live-chip--interview" style="${chipStyle}"><span class="shrink-0">🎤</span>${inner}</span>`;
                }
                case 'live': case 'radio': {
                    const inner = `<span>📻 ${t.live_radio_label}${artist ? ' — ' + jsStr(artist) : ''}${title ? ' — ' + jsStr(title) : ''}</span>`;
                    return `<span title="${t.live_radio_label} ${jsStr(artist)} ${jsStr(title)}" class="${chip} live-chip--interview cursor-pointer" style="${chipStyle}" onclick="playTrack('${jsAttr(title) || t.live_radio_label}', '${jsStr(artist)}', '${jsStr(formatPath(item.audio))}', '${jsStr(formatPath(item.image))}', { type: 'live', id: 0, title: '${jsStr(title)}', artist: '${jsStr(artist)}', numero: '', invite: '' })"><span class="shrink-0">📻</span>${inner}</span>`;
                }
                default:
                    return `<span class="${chip}" style="${chipStyle}"><span class="shrink-0">🔴</span><span>${t.live_direct}${title ? ' ' + jsStr(title) : ''}</span></span>`;
            }
        }
        function startLiveBar() {
            loadLiveBar();
            setInterval(loadLiveBar, 30000);
            loadDedicaceTicker();
            setInterval(loadDedicaceTicker, 45000);
            initPlayerControls();
        }
        // Bandeau défilant : 5 dernières dédicaces publiées (sous la live-bar)
        async function loadDedicaceTicker() {
            const bar = document.getElementById('dedicaces-bar');
            const container = document.getElementById('dedicaces-ticker-items');
            if (!bar || !container) return;
            try {
                const res = await fetch((window.CHAABI_API||'api/radiochaabi.php')+'?action=get_last_dedicaces');
                const data = await res.json();
                const items = (data && Array.isArray(data.data)) ? data.data : [];
                const sig = (window.currentLang || 'fr') + ':' + items.map(i => i.id).join(',');
                if (container.dataset.sig === sig && container.dataset.loaded === '1') { if (bar.classList.contains('hidden')) bar.classList.remove('hidden'); return; }
                container.dataset.loaded = '1';
                container.dataset.sig = sig;
                if (!items.length) { bar.classList.add('hidden'); return; }
                bar.classList.remove('hidden');
                const one = items.map(d => {
                    const t = translations[currentLang] || translations.fr;
                    const lblDe = t.dedicace_de || 'De';
                    const lblPour = t.dedicace_pour || 'Pour';
                    const lblMsg = t.dedicace_message || 'Message';
                    const lang = window.currentLang || currentLang || 'fr';
                    const pick = (fr, ar) => {
                        if (lang === 'ar' && ar != null && String(ar).trim() !== '') return String(ar).trim();
                        if (fr != null && String(fr).trim() !== '') return String(fr).trim();
                        if (ar != null && String(ar).trim() !== '') return String(ar).trim();
                        return '';
                    };
                    const nom = pick(d.nom, d.nom_ar);
                    const pour = pick(d.pour, d.pour_ar);
                    const msg = pick(d.description, d.description_ar);
                    // Format explicite : De · Nom  →  Pour · destinataire  —  Message · texte
                    let html = '<span class="dedicace-item text-xs sm:text-[13px]" style="white-space:nowrap">'
                        + '<i class="fas fa-heart dedicace-heart" style="margin-right:0.4rem"></i>'
                        + '<span class="dedicace-label">' + jsStr(lblDe) + '</span> '
                        + '<span class="font-semibold dedicace-from">' + jsStr(nom || '…') + '</span>';
                    if (pour) {
                        html += ' <span class="dedicace-sep" style="margin:0 0.45rem">·</span> '
                            + '<span class="dedicace-label">' + jsStr(lblPour) + '</span> '
                            + '<span class="font-semibold dedicace-to">' + jsStr(pour) + '</span>';
                    }
                    if (msg) {
                        html += ' <span class="dedicace-sep" style="margin:0 0.45rem">—</span> '
                            + '<span class="dedicace-label">' + jsStr(lblMsg) + '</span> '
                            + '<span class="dedicace-msg">' + jsStr(msg) + '</span>';
                    }
                    return html + '</span>';
                }).join('<span class="dedicace-sep" style="display:inline-block;margin:0 1.5rem;opacity:0.75">✦</span>');
                container.classList.add('ticker-dedicaces');
                container.innerHTML = `<span class="ticker-copy">${one}</span>`;
                const copyW = container.querySelector('.ticker-copy').offsetWidth || 1;
                const viewW = container.parentElement ? container.parentElement.clientWidth : window.innerWidth;
                const copies = Math.min(8, Math.max(2, Math.ceil(viewW / copyW) + 1));
                let tpl = '';
                for (let i = 0; i < copies; i++) tpl += `<span class="ticker-copy"${i > 0 ? ' aria-hidden="true"' : ''}>${one}</span>`;
                container.innerHTML = tpl;
                container.style.setProperty('--ticker-copies', copies);
                container.style.animationName = 'none';
                void container.offsetWidth;
                container.style.animationName = '';
            } catch(e) {}
        }
