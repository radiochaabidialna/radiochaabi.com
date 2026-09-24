/**
 * Chaabi Music Pro — module JS
 * Chargé en séquence (defer). Les onclick HTML restent valides (scope global).
 */
/* ── i18n + thème ── */
        var translations = {
            fr: { logo_brand: "Chaabi", logo_music: "Music", logo_sub: "Radio", home: "Accueil", artists: "Artistes", songs: "Chansons", shows: "Émissions", interviews: "Interviews", dedicaces: "Dédicaces", comments: "Commentaires", contacts: "Contacts", proverbs: "Bouqalla", hero_title: "L'Âme du Chaabi Algérien", hero_desc: "Plongez dans la richesse de notre patrimoine.", hero_btn: "Écouter", hero_btn_listen: "Écouter maintenant", hero_btn_onair: "À l'antenne", hero_btn_qacid: "Qacidates", portal_music: "Musique", portal_music_desc: "Chansons & plus écoutées", portal_shows: "Émissions", portal_shows_desc: "Émissions & interviews", portal_qacid: "Qacidates", portal_qacid_desc: "Poésie chaâbi bilingue", listen_now: "Écouter",  latest_shows: "Dernières Émissions", top_artists: "Artistes Phares", rights_reserved: "Tous droits réservés.", views: "vues", leave_comment: "Laisser un commentaire", send: "Envoyer", live_now: "En ce moment...", show_label: "Émission", invites: "Invités", bio: "Biographie", back: "Retour", listen: "Écouter", listen_emission: "Écouter l'émission", view_show: "Voir l'émission", interview_in_show: "Interviews dans cette émission :", interview_label: "Interview", name_ph: "Votre nom", msg_ph: "Votre message", empty_comments: "Aucun commentaire", empty_invites: "Aucun invité.", empty_participation: "Aucune participation", empty_songs: "Aucune chanson", empty_interviews: "Aucune interview", live_emission: "Émission n°", live_invited: " - invité ", live_interview: "Interview de", live_empty: "Aucune écoute en cours pour le moment.", live_error: "Live indisponible.", live_direct: "En direct", top_songs: "Les plus écoutées", dedicace_of_day: "Dédicace du jour", glossary_title: "Glossaire chaâbi", glossary_all: "Tout voir", proverb_day: "Bouqalla", proverb_num: "Proverbe N°", empty_top: "Aucune écoute pour le moment.", live_listeners: "auditeurs", live_radio_label: "Radio", admin_key_tab: "Clé", admin_account_tab: "Compte", hero_badge: "Radio Chaabi · Patrimoine vivant", hero_btn2: "Voir les artistes", dedicace_ticker_title: "Dédicaces", dedicace_de: "De", dedicace_pour: "Pour", dedicace_message: "Message", form_auto_translate: "Le texte sera traduit automatiquement FR ↔ AR à l’envoi", stats_songs: "Chansons", stats_artists: "Artistes", stats_shows: "Émissions", stats_interviews: "Interviews", home_latest_songs: "Chansons", home_latest_artists: "Artistes", home_latest_interviews: "Interviews", form_dedicace_title: "Envoyer une dédicace", form_comment_title: "Laisser un commentaire", form_contact_title: "Nous contacter", form_pour_ph: "Pour qui ?", form_msg_ph: "Votre message / Titre souhaité", email_ph: "Votre Email *", phone_ph: "Téléphone (Optionnel)", sujet_ph: "Sujet", rating_label: "Note (1-5) :", stars_5: "5 Étoiles", stars_4: "4 Étoiles", stars_3: "3 Étoiles", stars_2: "2 Étoiles", stars_1: "1 Étoile", admin: "Administration", admin_login_title: "Espace administrateur", admin_key_ph: "Clé d'administration", admin_login_btn: "Se connecter", admin_bad_key: "Clé invalide", admin_logout: "Déconnexion", admin_comments: "Commentaires", admin_dedicaces: "Dédicaces", admin_contacts: "Contacts", admin_pending: "En attente", admin_published: "Publié", admin_rejected: "Rejeté", admin_new: "Nouveau", admin_read: "Lu", admin_archived: "Archivé", admin_approve: "Publier", admin_reject: "Rejeter", admin_delete: "Supprimer", admin_mark_read: "Marquer lu", admin_archive: "Archiver", admin_empty: "Aucun élément.", admin_confirm_delete: "Supprimer définitivement ?", song_of_week: "Coup de cœur de la semaine", song_of_week_label: "Coup de cœur", details: "Toutes les chansons", sort_recent: "Récentes", sort_likes: "Plus aimées", qacidates: "Qacidates", search_ph: "Rechercher... (ex: #51)", seo_title: "Radio Chaabi — Musique populaire algérienne", seo_description: "Radio Chaabi Music — L'âme du chaabi algérien : chansons, émissions, interviews et dédicaces.", empty_list: "Aucun contenu pour le moment.", empty_list_cta: "Retour à l'accueil", offline_msg: "Hors ligne — certaines fonctions sont indisponibles", recent_played: "Écoutés récemment", player_prev: "Précédent", player_next: "Suivant", player_queue: "File d'attente", player_shuffle: "Aléatoire", player_repeat: "Répéter", player_mute: "Muet", player_share: "Partager", player_close: "Fermer", player_continuous: "Radio continue", onair: "À l'antenne", my_radio: "Ma radio", qacidates: "Qacidates", my_favorites: "Mes favoris", see_all: "Voir tout →", popular_playlist: "Playlists populaires", continue_listen: "Continuer l'écoute", section_desc_artistes: "Les voix du chaabi, d'hier et d'aujourd'hui.", section_desc_chansons: "Le répertoire : classiques et pépites.", section_desc_emissions: "Magazines, invités et archives radio.", section_desc_interviews: "Paroles d'artistes, en exclusivité.", section_desc_bouqalla: "Sagesse populaire, un proverbe à la fois.", section_desc_dedicaces: "Messages d'auditeurs, cœur ouvert.", section_desc_commentaires: "Vos avis sur la radio.", section_desc_contacts: "Écrire à l'équipe Chaabi Music." },
            ar: { dedicace_de: "من", dedicace_pour: "إلى", dedicace_message: "الرسالة", dedicace_ticker_title: "إهداءات", dedicace_of_day: "إهداء اليوم", glossary_title: "قاموس الشابي", glossary_all: "عرض الكل", form_auto_translate: "ستُترجم الرسالة تلقائياً FR ↔ AR عند الإرسال", song_of_week: "أغنية الأسبوع", song_of_week_label: "الأكثر تميزاً", details: "كل الأغاني", sort_recent: "الأحدث", sort_likes: "الأكثر إعجاباً", qacidates: "قصائد", logo_brand: "الشعبي", logo_music: "موسيقى", logo_sub: "راديو", home: "الرئيسية", artists: "الفنانون", songs: "الأغاني", shows: "البرامج", interviews: "مقابلات", dedicaces: "إهداءات", comments: "تعليقات", contacts: "اتصال", proverbs: "بوقالة", hero_title: "روح الشعبي الجزائري", hero_desc: "اغوص في غنى تراثنا.", hero_btn: "الاستماع", latest_shows: "آخر البرامج", top_artists: "فنانون بارزون", rights_reserved: "جميع الحقوق محفوظة.", views: "مشاهدة", leave_comment: "اترك تعليقا", send: "إرسال", live_now: "في هذه اللحظة...", show_label: "برنامج", invites: "الضيوف", bio: "السيرة", back: "رجوع", listen: "استمع", listen_emission: "استمع للبرنامج", view_show: "عرض البرنامج", interview_in_show: "مقابلات في هذا البرنامج :", interview_label: "مقابلة", name_ph: "اسمك", msg_ph: "رسالتك", empty_comments: "لا توجد تعليقات", empty_invites: "لا ضيوف", empty_participation: "لا مشاركات", empty_songs: "لا توجد أغان", empty_interviews: "لا توجد مقابلات", live_emission: "برنامج رقم ", live_invited: " - ضيف ", live_interview: "مقابلة مع", live_empty: "لا توجد استماعات حاليا.", live_error: "البث غير متاح.", live_direct: "مباشر", top_songs: "الأكثر استماعا", proverb_day: "بوقالة", proverb_num: "بوقالة رقم", empty_top: "لا توجد استماعات بعد.", live_listeners: "مستمع", live_radio_label: "راديو", admin_key_tab: "مفتاح", admin_account_tab: "حساب", hero_badge: "راديو الشعبي · تراث حي", hero_btn2: "شاهد الفنانين", dedicace_ticker_title: "إهداءات", dedicace_of_day: "إهداء اليوم", glossary_title: "قاموس الشابي", glossary_all: "عرض الكل", stats_songs: "أغنية", stats_artists: "فنان", stats_shows: "برنامج", stats_interviews: "مقابلة", home_latest_songs: "أغاني", home_latest_artists: "فنانين", home_latest_interviews: "مقابلات", form_dedicace_title: "أرسل إهداء", form_comment_title: "اترك تعليقا", form_contact_title: "اتصل بنا", form_pour_ph: "لمن الإهداء ؟", form_msg_ph: "رسالتك / الأغنية المطلوبة", email_ph: "بريدك الإلكتروني *", phone_ph: "الهاتف (اختياري)", sujet_ph: "الموضوع", rating_label: "التقييم (1-5) :", stars_5: "5 نجوم", stars_4: "4 نجوم", stars_3: "3 نجوم", stars_2: "نجمتان", stars_1: "نجمة واحدة", admin: "الإدارة", admin_login_title: "فضاء الإدارة", admin_key_ph: "مفتاح الإدارة", admin_login_btn: "دخول", admin_bad_key: "مفتاح غير صالح", admin_logout: "خروج", admin_comments: "تعليقات", admin_dedicaces: "إهداءات", admin_contacts: "اتصالات", admin_pending: "قيد الانتظار", admin_published: "منشور", admin_rejected: "مرفوض", admin_new: "جديد", admin_read: "مقروء", admin_archived: "مؤرشف", admin_approve: "نشر", admin_reject: "رفض", admin_delete: "حذف", admin_mark_read: "تحديد كمقروء", admin_archive: "أرشفة", admin_empty: "لا توجد عناصر.", admin_confirm_delete: "حذف نهائي؟", search_ph: "بحث... (مثال: #51)", seo_title: "راديو الشعبي — الموسيقى الشعبية الجزائرية", seo_description: "راديو الشعبي — روح الشابي الجزائري: أغاني، برامج، مقابلات وإهداءات.", empty_list: "لا يوجد محتوى حالياً.", empty_list_cta: "العودة للرئيسية", offline_msg: "غير متصل — بعض الوظائف غير متاحة", recent_played: "استمعت مؤخراً", my_favorites: "مفضلتي", see_all: "عرض الكل ←", popular_playlist: "قوائم شائعة", continue_listen: "واصل الاستماع", section_desc_artistes: "أصوات الشعبي، أمس واليوم.", section_desc_chansons: "الذخيرة: كلاسيكيات وكنوز.", section_desc_emissions: "برامج وضيوف وأرشيف.", section_desc_interviews: "كلمات الفنانين.", section_desc_bouqalla: "حكمة شعبية كل يوم.", section_desc_dedicaces: "رسائل المستمعين.", section_desc_commentaires: "آراؤكم.", section_desc_contacts: "راسلوا الفريق.", onair: "على الهواء", my_radio: "راديوي", player_prev: "السابق", player_next: "التالي", player_queue: "قائمة الانتظار", player_shuffle: "عشوائي", player_repeat: "تكرار", player_mute: "صامت", player_share: "مشاركة", player_close: "إغلاق", player_continuous: "راديو متواصل", qacidates: "قصيدات" }
        };

        function applyLanguage() {
            try { window.currentLang = currentLang; } catch (_) {}

            var dict = translations[currentLang] || translations.fr;
            document.querySelectorAll('[data-i18n]').forEach(function (el) {
                var key = el.getAttribute('data-i18n');
                if (key && dict[key] != null && dict[key] !== '') el.textContent = dict[key];
            });
            document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
                var key = el.getAttribute('data-i18n-placeholder');
                if (key && dict[key] != null) el.setAttribute('placeholder', dict[key]);
            });
            document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
                var key = el.getAttribute('data-i18n-title');
                if (key && dict[key] != null) {
                    el.setAttribute('title', dict[key]);
                    el.setAttribute('aria-label', dict[key]);
                }
            });
            // IMPORTANT: garder dir="ltr" sur <html> — dir="rtl" décale tout le site hors écran
            document.documentElement.lang = currentLang;
            document.documentElement.dir = 'ltr';
            document.documentElement.classList.toggle('lang-ar', currentLang === 'ar');
            document.documentElement.classList.toggle('lang-fr', currentLang === 'fr');
            if (document.body) {
                document.body.classList.toggle('lang-ar', currentLang === 'ar');
                document.body.classList.toggle('lang-fr', currentLang === 'fr');
            }
            // Appliquer dir=rtl UNIQUEMENT sur les blocs de texte arabes
            document.querySelectorAll('[data-rtl-text]').forEach(function (el) {
                el.setAttribute('dir', currentLang === 'ar' ? 'rtl' : 'ltr');
            });
            (function(){
                var tb = document.getElementById('lang-toggle-btn');
                if (tb) {
                    tb.textContent = (currentLang === 'ar') ? 'ع' : 'FR';
                    tb.setAttribute('title', currentLang === 'ar' ? 'Français' : 'العربية');
                }
            })();
            if (typeof updateLangButtons === 'function') updateLangButtons();
            if (window.refreshFooter) refreshFooter();
            // SEO meta FR/AR
            try {
                if (dict.seo_title) {
                    document.title = dict.seo_title;
                    var ogt = document.querySelector('meta[property="og:title"]');
                    if (ogt) ogt.setAttribute('content', dict.seo_title);
                    var twt = document.querySelector('meta[name="twitter:title"]');
                    if (twt) twt.setAttribute('content', dict.seo_title);
                }
                if (dict.seo_description) {
                    var md = document.querySelector('meta[name="description"]');
                    if (md) md.setAttribute('content', dict.seo_description);
                    var ogd = document.querySelector('meta[property="og:description"]');
                    if (ogd) ogd.setAttribute('content', dict.seo_description);
                    var twd = document.querySelector('meta[name="twitter:description"]');
                    if (twd) twd.setAttribute('content', dict.seo_description);
                }
                document.documentElement.setAttribute('lang', currentLang === 'ar' ? 'ar' : 'fr');
            } catch (_seo) {}
        }
        function setLanguage(lang) {
            if (lang !== 'fr' && lang !== 'ar') return;
            if (lang === currentLang) {
                if (typeof applyLanguage === 'function') applyLanguage();
                return;
            }
            currentLang = lang;
            try { window.currentLang = lang; } catch (_) {}
            if (typeof syncCurrentLang === 'function') syncCurrentLang(lang);
            try { localStorage.setItem('chaabi_lang', lang); } catch (_) {}
            try {
                var mm = document.getElementById('mobile-menu');
                if (mm) mm.classList.add('hidden');
            } catch (_) {}
            // Bascule instantanée — le player continue sans interruption
            if (typeof applyLanguage === 'function') applyLanguage();
            else if (typeof updateLangButtons === 'function') (function(){
                var tb = document.getElementById('lang-toggle-btn');
                if (tb) {
                    tb.textContent = (currentLang === 'ar') ? 'ع' : 'FR';
                    tb.setAttribute('title', currentLang === 'ar' ? 'Français' : 'العربية');
                }
            })();
            if (typeof updateLangButtons === 'function') updateLangButtons();
            if (typeof refreshAfterLanguageChange === 'function') {
                try { refreshAfterLanguageChange(); } catch (e) { console.warn(e); }
            }
            try {
                if (window.refreshFooter) refreshFooter();
            } catch (_) {}
        }
        function refreshAfterLanguageChange() {
            try { if (typeof loadHomeDedicace === "function") loadHomeDedicace(); } catch(_){}
            try { if (typeof renderHomeGlossary === "function") renderHomeGlossary(); } catch(_){}

            if (typeof loadLiveBar === 'function') loadLiveBar();
            if (typeof loadDedicaceTicker === 'function') loadDedicaceTicker();
            // Toujours re-traduire blocs dynamiques accueil / player
            try {
                if (typeof renderRecentPlayed === 'function') renderRecentPlayed();
                if (typeof renderHomeFavorites === 'function') renderHomeFavorites();
                if (typeof renderContinueBar === 'function') renderContinueBar();
                if (typeof updateContinuousUI === 'function') updateContinuousUI();
                if (typeof updateShuffleUI === 'function') updateShuffleUI();
                if (typeof updateRepeatUI === 'function') updateRepeatUI();
                if (typeof updatePlayerTypeBadge === 'function') updatePlayerTypeBadge();
                if (typeof syncOnAirFromPlayer === 'function') syncOnAirFromPlayer();
                if (typeof renderOnAirQueue === 'function') renderOnAirQueue();
                if (typeof renderOnAirHistory === 'function') renderOnAirHistory();
                if (typeof renderQueueUI === 'function') renderQueueUI();
            } catch (eDyn) { console.warn(eDyn); }
            var detail = document.getElementById('view-detail');
            var list = document.getElementById('view-list');
            var admin = document.getElementById('view-admin');
            var onair = document.getElementById('view-onair');
            if (admin && !admin.classList.contains('hidden')) {
                if (typeof renderAdmin === 'function') renderAdmin();
                return;
            }
            if (onair && !onair.classList.contains('hidden')) {
                if (typeof loadOnAir === 'function') loadOnAir();
                return;
            }
            if (detail && !detail.classList.contains('hidden')) {
                if (window._lastDetail && typeof loadDetail === 'function') {
                    loadDetail(window._lastDetail.type, window._lastDetail.id);
                }
                return;
            }
            if (list && !list.classList.contains('hidden') && typeof currentTab !== 'undefined' && currentTab && currentTab !== 'home' && currentTab !== 'onair') {
                if (typeof navigateTo === 'function') navigateTo(currentTab);
                return;
            }
            if (typeof navigateTo === 'function') navigateTo('home');
            else if (typeof loadHome === 'function') loadHome();
        }
        window.refreshAfterLanguageChange = refreshAfterLanguageChange;
        function updateLangButtons() {
            // Segmented switch FR | ع
            document.querySelectorAll('.lang-switch .lang-opt').forEach(function(btn) {
                var on = btn.getAttribute('data-lang') === currentLang;
                btn.classList.toggle('is-active', on);
                btn.setAttribute('aria-pressed', on ? 'true' : 'false');
            });
            // Compat anciens boutons
            var btn = document.getElementById('lang-toggle');
            var label = document.getElementById('lang-toggle-label');
            if (btn) {
                if (label) label.textContent = currentLang === 'fr' ? 'ع' : 'FR';
                btn.title = currentLang === 'fr' ? 'العربية' : 'Français';
            }
            var fr = document.getElementById('lang-btn-fr');
            var ar = document.getElementById('lang-btn-ar');
            if (fr && ar && !fr.classList.contains('lang-opt')) {
                fr.style.opacity = currentLang === 'fr' ? '1' : '0.45';
                ar.style.opacity = currentLang === 'ar' ? '1' : '0.45';
            }
        }
        function toggleLanguage() { setLanguage(currentLang === 'fr' ? 'ar' : 'fr'); }
        /** Thèmes : dark | light | ios — cycle au clic */
        function getTheme() {
            var html = document.documentElement;
            if (html.classList.contains('theme-ios')) return 'ios';
            if (html.classList.contains('dark')) return 'dark';
            return 'light';
        }
        function applyTheme(theme) {
            // Compat ancienne API: applyTheme(true/false)
            if (theme === true) theme = 'dark';
            if (theme === false) theme = 'light';
            if (theme !== 'dark' && theme !== 'light' && theme !== 'ios') theme = 'dark';
            var html = document.documentElement;
            html.classList.remove('dark', 'theme-ios', 'theme-light');
            if (theme === 'dark') html.classList.add('dark');
            else if (theme === 'ios') html.classList.add('theme-ios');
            else html.classList.add('theme-light');
            html.setAttribute('data-theme', theme);
            var icon = document.getElementById('theme-icon');
            if (icon) {
                if (theme === 'dark') icon.className = 'fas fa-sun text-amber-400';
                else if (theme === 'light') icon.className = 'fas fa-moon text-amber-700';
                else icon.className = 'fas fa-wand-magic-sparkles text-sky-500'; // iOS glass
            }
            var btn = document.getElementById('theme-btn');
            if (btn) {
                var labels = { dark: 'Thème sombre', light: 'Thème clair', ios: 'Thème iOS Glass' };
                var next = { dark: 'clair', light: 'iOS', ios: 'sombre' };
                btn.title = labels[theme] + ' — clic pour ' + next[theme];
                btn.setAttribute('aria-label', labels[theme]);
            }
            try { localStorage.setItem('chaabi_theme', theme); } catch (_) {}
            if (typeof updateLangButtons === 'function') (function(){
                var tb = document.getElementById('lang-toggle-btn');
                if (tb) {
                    tb.textContent = (currentLang === 'ar') ? 'ع' : 'FR';
                    tb.setAttribute('title', currentLang === 'ar' ? 'Français' : 'العربية');
                }
            })();
            if (typeof updateLangButtons === 'function') updateLangButtons();
            // Footer suit le thème
            if (typeof window.refreshFooter === 'function') {
                try { window.refreshFooter(); } catch (_) {}
            }
            if (typeof window.applyFooterTheme === 'function') {
                try { window.applyFooterTheme(theme); } catch (_) {}
            }
            if (theme === 'ios') applyGlassPerformanceHints();
            else document.documentElement.classList.remove('reduce-glass');
        }

        function applyGlassPerformanceHints() {
            try {
                var reduce = false;
                if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) reduce = true;
                if (navigator.connection && (navigator.connection.saveData || (navigator.connection.effectiveType || '').indexOf('2g') >= 0)) reduce = true;
                if (navigator.deviceMemory && navigator.deviceMemory <= 4) reduce = true;
                if (window.matchMedia && window.matchMedia('(max-width: 480px)').matches && navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) reduce = true;
                document.documentElement.classList.toggle('reduce-glass', !!reduce);
            } catch (_) {}
        }
        
        function toggleDarkMode() {
            var cur = getTheme();
            var next = cur === 'dark' ? 'light' : (cur === 'light' ? 'ios' : 'dark');
            applyTheme(next);
        }
        function initTheme() {
            var theme = 'dark';
            try {
                var saved = localStorage.getItem('chaabi_theme');
                if (saved === 'light' || saved === 'dark' || saved === 'ios') theme = saved;
                else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) theme = 'light';
            } catch (_) {}
            applyTheme(theme);
        }
        window.getTheme = getTheme;


window.setLanguage = setLanguage;
window.toggleLanguage = toggleLanguage;
window.applyLanguage = applyLanguage;
window.toggleDarkMode = toggleDarkMode;
window.initTheme = initTheme;
window.updateLangButtons = updateLangButtons;

function toggleSearchPanel() {
    var panel = document.getElementById('search-panel');
    var btn = document.getElementById('search-toggle-btn');
    if (!panel) return;
    var open = panel.classList.toggle('hidden') === false;
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
        var input = document.getElementById('search-input');
        if (input) setTimeout(function () { try { input.focus(); } catch (_) {} }, 40);
    } else {
        var sug = document.getElementById('search-suggest');
        if (sug) sug.classList.add('hidden');
    }
}
window.toggleSearchPanel = toggleSearchPanel;

document.addEventListener('click', function (ev) {
    var panel = document.getElementById('search-panel');
    var btn = document.getElementById('search-toggle-btn');
    if (!panel || panel.classList.contains('hidden')) return;
    if (panel.contains(ev.target) || (btn && btn.contains(ev.target))) return;
    panel.classList.add('hidden');
    if (btn) btn.setAttribute('aria-expanded', 'false');
});
