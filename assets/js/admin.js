/**
 * Chaabi Music Pro — module JS
 * Chargé en séquence (defer). Les onclick HTML restent valides (scope global).
 */
/* ── Admin ── */
        var ADMIN_LOGGED = false;
        var ADMIN_KEY_CACHE = '';
        var ADMIN_MODE = 'key';
        var ADMIN_STATE = { tab: 0, data: null };
        try {
            var _ak = sessionStorage.getItem('chaabi_admin_key');
            if (_ak) { ADMIN_KEY_CACHE = _ak; ADMIN_LOGGED = true; }
        } catch (_) {}

        async function adminCall(action, payload) {
            const res = await fetch((window.CHAABI_API||'api/radiochaabi.php')+'?action=' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ admin_key: ADMIN_KEY_CACHE }, payload)) });
            let data = null;
            try { data = await res.json(); } catch (e) { throw new Error('Réponse API invalide (HTTP ' + res.status + ') — radiochaabi.php est-il à jour sur le serveur ?'); }
            if (data.error) {
                if (data.error.indexOf('Clé') >= 0) { ADMIN_KEY_CACHE = ''; sessionStorage.removeItem('chaabi_admin_key'); }
                throw new Error(data.error);
            }
            return data;
        }
        async function renderAdmin() {
            const root = document.getElementById('admin-root');
            const t = translations[currentLang];
            if (!root) return;
            if (!ADMIN_LOGGED) {
                root.innerHTML = '<div class="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mt-10">' +
                    '<div class="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-3xl">🛡️</div>' +
                    '<h2 class="text-2xl font-bold mb-6 text-center">' + t.admin_login_title + '</h2>' +
                    '<div class="flex gap-2 mb-6">' +
                    '<button onclick="adminMode(\'key\')" id="am-key" class="flex-1 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white">' + t.admin_key_tab + '</button>' +
                    '<button onclick="adminMode(\'account\')" id="am-account" class="flex-1 py-2 rounded-xl text-sm font-semibold bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">' + t.admin_account_tab + '</button></div>' +
                    '<div id="admin-login-form">' + adminLoginForm() + '</div></div>';
                return;
            }
            root.innerHTML = '<div class="flex items-center justify-between mb-6 flex-wrap gap-3">' +
                '<h2 class="text-2xl font-bold">🛡️ ' + t.admin + '</h2>' +
                '<button onclick="adminLogout()" class="text-sm text-gray-500 hover:text-red-500"><i class="fas fa-sign-out-alt mr-1"></i>' + t.admin_logout + '</button></div>' +
                '<div id="admin-tabs" class="flex gap-2 mb-6 flex-wrap"></div><div id="admin-lists"></div>';
            document.getElementById('admin-tabs').innerHTML = [['commentaires', t.admin_comments], ['dedicaces', t.admin_dedicaces], ['contacts', t.admin_contacts]].map((a, i) =>
                '<button onclick="adminTab(' + i + ')" class="px-4 py-2 rounded-full text-sm font-semibold ' + (i === 0 ? 'bg-emerald-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300') + '">' + a[1] + '</button>').join('');
            ADMIN_STATE = { tab: 0, data: null };
            adminTab(0);
        }
        function adminBadge(status, t) {
            const map = { pending: t.admin_pending, published: t.admin_published, rejected: t.admin_rejected, new: t.admin_new, read: t.admin_read, archived: t.admin_archived };
            const cls = { pending: 'bg-amber-100 text-amber-800', published: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800', new: 'bg-blue-100 text-blue-800', read: 'bg-gray-200 text-gray-700', archived: 'bg-gray-200 text-gray-500' };
            return '<span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ' + (cls[status] || 'bg-gray-200 text-gray-600') + '">' + (map[status] || status) + '</span>';
        }
        async function adminTab(i) {
            ADMIN_STATE.tab = i;
            document.querySelectorAll('#admin-tabs button').forEach((b, k) => { b.className = 'px-4 py-2 rounded-full text-sm font-semibold ' + (k === i ? 'bg-emerald-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'); });
            if (!ADMIN_STATE.data) {
                try { ADMIN_STATE.data = await adminCall('admin_list', {}); }
                catch (e) {
                    ADMIN_STATE.data = null;
                    const lists = document.getElementById('admin-lists');
                    if (e.message && e.message.indexOf('Clé') >= 0) { ADMIN_LOGGED = false; window.ADMIN_LOGGED = false; renderAdmin(); const m = document.getElementById('admin-login-msg'); if (m) m.classList.remove('hidden'); return; }
                    if (lists) lists.innerHTML = '<div class="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-300 rounded-xl p-5 text-center font-semibold">⚠️ ' + jsStr(e.message || 'Erreur inconnue') + '</div>';
                    return;
                }
            }
            renderAdminLists();
        }
        function renderAdminLists() {
            const t = translations[currentLang];
            const d = ADMIN_STATE.data || { commentaires: [], dedicaces: [], contacts: [] };
            const key = [['commentaires'], ['dedicaces'], ['contacts']][ADMIN_STATE.tab][0];
            const labels = { commentaires: t.admin_comments, dedicaces: t.admin_dedicaces, contacts: t.admin_contacts };
            const items = d[key] || [];
            document.getElementById('admin-lists').innerHTML = '<div class="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden"><div class="px-5 py-4 border-b dark:border-gray-700 font-bold">' + labels[key] + ' <span class="text-xs text-gray-400">(' + items.length + ')</span></div>' +
                '<div class="divide-y dark:divide-gray-700">' + (items.length ? items.map(it => adminCard(key, it, t)).join('') : '<div class="px-5 py-10 text-center text-gray-400">' + (t.admin_empty || (currentLang==='ar'?'لا عناصر':'Aucun élément')) + '</div>') + '</div></div>';
        }
        function adminCard(key, it, t) {
            const status = key === 'contacts' ? it.admin_status : it.status;
            const name = jsStr(it.nom || '?');
            const body = jsStr(key === 'commentaires' ? (it.message || '') : key === 'dedicaces' ? ((it.pour || '') + ' — ' + (it.description || '')) : ((it.sujet || '') + (it.message ? ' : ' + it.message : '')));
            const date = it.created_at ? new Date(it.created_at).toLocaleDateString() : '';
            const isContact = key === 'contacts';
            const actions = isContact
                ? '<button onclick="adminAction(\'' + key + '\',' + it.id + ',\'mark_read\')" class="text-xs px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100">' + t.admin_mark_read + '</button>' +
                  '<button onclick="adminAction(\'' + key + '\',' + it.id + ',\'archive\')" class="text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200">' + t.admin_archive + '</button>'
                : '<button onclick="adminAction(\'' + key + '\',' + it.id + ',\'approve\')" class="text-xs px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-300 hover:bg-green-100">✔ ' + t.admin_approve + '</button>' +
                  '<button onclick="adminAction(\'' + key + '\',' + it.id + ',\'reject\')" class="text-xs px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-300 hover:bg-red-100">✖ ' + t.admin_reject + '</button>';
            return '<div class="px-5 py-4">' +
                '<div class="flex items-center gap-2 flex-wrap">' + adminBadge(status, t) + '<span class="font-semibold">' + name + '</span>' + (date ? '<span class="text-xs text-gray-400 ml-auto">' + date + '</span>' : '') + '</div>' +
                '<p class="text-sm text-gray-600 dark:text-gray-300 mt-1.5 leading-relaxed break-words">' + body + '</p>' +
                '<div class="flex gap-2 mt-3 flex-wrap items-center">' + actions +
                '<button onclick="adminAction(\'' + key + '\',' + it.id + ',\'delete\')" class="text-xs px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-red-500"><i class="fas fa-trash"></i> ' + t.admin_delete + '</button></div></div>';
        }
        async function adminAction(key, id, action) {
            const t = translations[currentLang];
            if (action === 'delete' && !confirm(t.admin_confirm_delete)) return;
            try {
                const d = await adminCall('admin_action', { table: key.replace(/s$/, ''), id, action });
                if (d && d.success === false) return;
            } catch (e) { return; }
            const items = ADMIN_STATE.data[key] || [];
            const idx = items.findIndex(x => x.id === id);
            if (action === 'delete') items.splice(idx, 1);
            else if (idx >= 0) items[idx].status = ({ approve: 'published', reject: 'rejected', mark_read: 'read', archive: 'archived' })[action] || items[idx].status;
            renderAdminLists();
        }
        function adminLoginForm() {
            const t = translations[currentLang];
            if (ADMIN_MODE === 'account') {
                return '<input id="admin-email" type="email" placeholder="Email" autocomplete="email" class="w-full p-3 rounded-xl border dark:bg-gray-700 dark:border-gray-600 mb-4" onkeydown="if(event.key===\'Enter\')adminLogin()">' +
                    '<input id="admin-pass" type="password" placeholder="••••••••" autocomplete="current-password" class="w-full p-3 rounded-xl border dark:bg-gray-700 dark:border-gray-600 mb-4" onkeydown="if(event.key===\'Enter\')adminLogin()">' +
                    '<button onclick="adminLogin()" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl">' + t.admin_login_btn + '</button>' +
                    '<p id="admin-login-msg" class="text-red-500 text-sm mt-3 hidden text-center"></p>';
            }
            return '<input id="admin-key-input" type="password" placeholder="' + t.admin_key_ph + '" onkeydown="if(event.key===\'Enter\')adminLogin()" class="w-full p-3 rounded-xl border dark:bg-gray-700 dark:border-gray-600 mb-4 text-center">' +
                '<button onclick="adminLogin()" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl">' + t.admin_login_btn + '</button>' +
                '<p id="admin-login-msg" class="text-red-500 text-sm mt-3 hidden">' + t.admin_bad_key + '</p>';
        }
        function adminMode(m) {
            ADMIN_MODE = m;
            document.getElementById('admin-login-form').innerHTML = adminLoginForm();
            const k = document.getElementById('am-key'), a = document.getElementById('am-account');
            if (k) k.className = 'flex-1 py-2 rounded-xl text-sm font-semibold ' + (m === 'key' ? 'bg-emerald-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300');
            if (a) a.className = 'flex-1 py-2 rounded-xl text-sm font-semibold ' + (m === 'account' ? 'bg-emerald-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300');
        }
        async function adminLogin() {
            const t = translations[currentLang];
            try {
                if (ADMIN_MODE === 'account') {
                    const email = (document.getElementById('admin-email').value || '').trim();
                    const pass = document.getElementById('admin-pass').value || '';
                    if (!email || !pass) return;
                    const d = await adminCall('admin_login', { email, password: pass });
                    if (d && d.success) { ADMIN_KEY_CACHE = ''; sessionStorage.removeItem('chaabi_admin_key'); ADMIN_LOGGED = true; window.ADMIN_LOGGED = true; renderAdmin(); }
                } else {
                    ADMIN_KEY_CACHE = document.getElementById('admin-key-input').value.trim();
                    sessionStorage.setItem('chaabi_admin_key', ADMIN_KEY_CACHE);
                    ADMIN_LOGGED = true; window.ADMIN_LOGGED = true;
                    renderAdmin();
                }
            } catch (e) {
                const m = document.getElementById('admin-login-msg');
                if (m) { m.textContent = e.message || t.admin_bad_key; m.classList.remove('hidden'); }
                if (e.message && e.message.indexOf('Clé') >= 0) { ADMIN_KEY_CACHE = ''; sessionStorage.removeItem('chaabi_admin_key'); ADMIN_LOGGED = false; }
            }
        }
        function adminLogout() {
            adminCall('admin_logout', {}).catch(() => {});
            ADMIN_KEY_CACHE = ''; sessionStorage.removeItem('chaabi_admin_key'); ADMIN_LOGGED = false; window.ADMIN_LOGGED = false; renderAdmin();
        }

        window.ADMIN_LOGGED = ADMIN_LOGGED;
        window.renderAdmin = renderAdmin;
        window.adminLogin = adminLogin;
        window.adminLogout = adminLogout;
        window.adminMode = adminMode;
        window.adminTab = adminTab;
        window.adminAction = adminAction;
        window.adminCall = adminCall;
