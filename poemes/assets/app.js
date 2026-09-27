/* ═══════════════════════════════════════════════════════════════
   Qacidates — module Poèmes  ·  v1.1
   Vanilla JS · aucune dépendance
   API : ./api/{qacidates,qacida,facets}.php
   ═══════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const API = document.body.dataset.api || 'api';
  const PER_PAGE = 24;
  const DEBOUNCE = 320;
  const THEMES = ['chaabi', 'parchemin', 'zellige', 'nuit'];

  /* Icônes Font Awesome → symboles universels (aucune police distante) */
  const ICONS = {
    'fa-feather': '🪶', 'fa-dove': '🕊️', 'fa-music': '🎵', 'fa-guitar': '🎸',
    'fa-users': '👥', 'fa-user': '👤', 'fa-balance-scale': '⚖️', 'fa-clock': '🕰️',
    'fa-heart': '❤️', 'fa-fire': '🔥', 'fa-book': '📖', 'fa-scroll': '📜',
    'fa-star': '⭐', 'fa-moon': '🌙', 'fa-sun': '☀️', 'fa-crown': '👑',
    'fa-plane': '✈️', 'fa-anchor': '⚓', 'fa-water': '🌊', 'fa-leaf': '🌿',
    'fa-language': '🔤', 'fa-map': '🗺️', 'fa-lightbulb': '💡', 'fa-quote-right': '❞'
  };
  const icon = (n) => ICONS[String(n || '').trim()] || '❖';

  const state = {
    q: '', interprete: '', theme: '', sort: 'recent', audioOnly: false, page: 1,
    facets: { interpretes: [], themes: [], total: 0 ,
    auteur: ''
  },
    list: null, poem: null, fs: 1
  };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const viewList   = $('#view-list');
  const viewDetail = $('#view-detail');
  const viewPage   = $('#view-page');
  const staticPage = $('#static-page');
  const grid       = $('#resultats');
  const pager      = $('#pager');
  const compteur   = $('#compteur');
  const poemEl     = $('#poem');
  const filters    = $('#filters');
  const chipsEl    = $('#chips-interpretes');
  const selTheme   = $('#sel-theme');
  const selSort    = $('#sel-sort');
  const chkAudio   = $('#chk-audio');
  const btnReset   = $('#btn-reset');
  const inputQ     = $('#q');
  const clearQ     = $('.search__clear');
  const tplCard    = $('#tpl-card');
  const menu       = $('#menu');
  const burger     = $('#burger');

  /* Mode « rendu serveur » : le HTML est déjà complet, le JS n'ajoute que les comportements. */
  const SSR  = document.body.dataset.ssr === '1';
  const BASE = (document.body.dataset.base || '').replace(/\/+$/, '');   // sans « / » final

  /** Notification discrète (copie, partage…) */
  let toastEl = null, toastT = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove('is-on'), 2600);
  }

  /* ─────────── Utilitaires ─────────── */
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  async function api(path, params = {}) {
    const url = new URL(`${API}/${path}`, window.location.href);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== '' && v !== null && v !== undefined && v !== false) url.searchParams.set(k, v);
    });
    const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
    let data = null;
    try { data = await res.json(); } catch {}
    if (!res.ok || !data || data.ok === false) throw new Error((data && data.error) || `Erreur ${res.status}`);
    return data;
  }

  const fmt = (s) => {
    s = Math.max(0, Math.floor(s || 0));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  let tmr = null;
  const debounce = (fn, ms = DEBOUNCE) => { clearTimeout(tmr); tmr = setTimeout(fn, ms); };

  /* ─────────── Ambiance (3 thèmes) ─────────── */
  function setTheme(name) {
    if (!THEMES.includes(name)) name = 'parchemin';
    document.documentElement.setAttribute('data-theme', name);
    $$('.themepick__btn').forEach((b) => b.setAttribute('aria-pressed', b.dataset.themeSet === name ? 'true' : 'false'));
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', name === 'nuit' ? '#0f0d0a' : (name === 'zellige' ? '#e9eff1' : (name === 'chaabi' ? '#0b1220' : '#f4efe3')));
    $('.themepick').setAttribute('title', 'Ambiance : ' + name);
    try { localStorage.setItem('qacidates-theme', name); } catch {}
  }
  (function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem('qacidates-theme'); } catch {}
    if (!saved) saved = 'chaabi';   /* ambiance par défaut : celle du site */
    setTheme(saved);
  })();
  $$('.themepick__btn').forEach((b) => b.addEventListener('click', () => setTheme(b.dataset.themeSet)));

  /* ─────────── Menu (mobile) ─────────── */
  burger.addEventListener('click', () => {
    const open = menu.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
  });
  const closeMenu = () => {
    if (menu.classList.contains('is-open')) {
      menu.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
    }
  };
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#menu') && !e.target.closest('#burger')) closeMenu();
  });

  /* ═══════════ MINI-LECTEUR ═══════════ */
  const Player = (() => {
    const box = $('#player');
    const audio = $('#pl-audio');
    const elTitle = $('#pl-title');
    const elSub = $('#pl-sub');
    const elCur = $('#pl-cur');
    const elDur = $('#pl-dur');
    const seek = $('#pl-seek');
    const vol = $('#pl-vol');
    const btnToggle = $('#pl-toggle');
    const btnMute = $('#pl-mute');


  /* ── Signalement live-bar (site principal) ── */
  function chaabiApiUrl() {
    /* Priorité absolue si définie dans le HTML */
    if (window.CHAABI_API_ABS) return window.CHAABI_API_ABS;
    if (window.CHAABI_API && /^https?:\/\//i.test(window.CHAABI_API)) return window.CHAABI_API;
    /* Production : toujours même origine + /api/… */
    var origin = (location.origin || (location.protocol + '//' + location.host));
    var path = location.pathname || '/';
    /* Sous-dossier local (WAMP) : /chaabi-radio/.../poemes → garder le préfixe */
    var m = path.match(/^(.*?)\/poemes(\/|$)/i);
    var basePath = m ? m[1] : '';
    /* Si on est à la racine du domaine (prod), basePath = '' */
    return origin + basePath + '/api/radiochaabi.php';
  }
  function chaabiSessionId() {
    try {
      var s = localStorage.getItem('chaabi_session_id');
      if (s) return s;
      s = 's_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('chaabi_session_id', s);
      return s;
    } catch (e) { return 's_' + Date.now(); }
  }
  function chaabiStableId(str) {
    var h = 0; str = String(str || 'q');
    for (var i = 0; i < str.length; i++) h = ((h << 5) - h) + str.charCodeAt(i) | 0;
    h = Math.abs(h) % 1000000;
    return h || 1;
  }
  var _chaabiHb = null;
  function chaabiReportQacida(item) {
    if (!item) return;
    var id = parseInt(item.id, 10) || 0;
    if (id <= 0) id = chaabiStableId((item.titre || item.slug || '') + '|' + (item.audio || ''));
    var body = {
      session_id: chaabiSessionId(),
      media_type: 'qacida',
      media_id: id,
      title: item.titre || item.slug || 'Qacidate',
      artist: item.interprete || item.auteur || 'Poème chaâbi',
      image: item.image || '',
      numero: '',
      invite: ''
    };
    var candidates = [
      chaabiApiUrl() + '?action=track_play',
      (location.origin || '') + '/api/radiochaabi.php?action=track_play',
      '/api/radiochaabi.php?action=track_play'
    ];
    /* dédoublonner */
    candidates = candidates.filter(function (u, i, a) { return u && a.indexOf(u) === i; });
    function postTo(url) {
      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'same-origin',
        keepalive: true
      }).then(function (r) {
        return r.text().then(function (t) {
          if (window.CHAABI_DEBUG) console.log('[chaabi] track_play POST', url, body, r.status, t);
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return t;
        });
      });
    }
    try {
      postTo(candidates[0]).catch(function () {
        if (candidates[1]) return postTo(candidates[1]);
      }).catch(function () {
        if (candidates[2]) return postTo(candidates[2]);
      }).catch(function (e) {
        if (window.CHAABI_DEBUG) console.warn('[chaabi] track_play ALL FAIL', e);
      });
    } catch (e) {
      if (window.CHAABI_DEBUG) console.warn('[chaabi] track_play EX', e);
    }
  }
  function chaabiStartHeartbeat(item) {
    if (_chaabiHb) clearInterval(_chaabiHb);
    chaabiReportQacida(item);
    _chaabiHb = setInterval(function () { chaabiReportQacida(item); }, 25000);
  }
  function chaabiStopHeartbeat() {
    if (_chaabiHb) { clearInterval(_chaabiHb); _chaabiHb = null; }
  }


    let playlist = [];
    let index = -1;
    let seeking = false;

    const isOpen = () => !box.hidden;
    const show = () => { box.hidden = false; document.body.classList.add('has-player'); };
    const hide = () => {
      box.hidden = true; document.body.classList.remove('has-player');
      audio.pause();
    };

    function renderVol() {
      const saved = (() => { try { return parseFloat(localStorage.getItem('qacidates-vol') || '0.85'); } catch { return 0.85; } })();
      audio.volume = Math.min(1, Math.max(0, isNaN(saved) ? 0.85 : saved));
      vol.value = Math.round(audio.volume * 100);
      box.classList.toggle('is-muted', audio.muted || audio.volume === 0);
    }

    function setPlaylist(items) {
      playlist = items.filter((i) => i && i.audio);
      const cur = current();
      index = cur ? playlist.findIndex((i) => i.slug === cur.slug) : (playlist.length ? 0 : -1);
    }

    const current = () => {
      const slug = (window.location.hash.match(/^#\/q\/(.+)$/) || [])[1];
      if (!slug) return null;
      return playlist.find((i) => i.slug === decodeURIComponent(slug)) || null;
    };

    function load(item, autoplay = true) {
      if (!item) return;
      show();
      elTitle.textContent = item.titre || item.slug;
      elSub.textContent = [item.interprete, item.auteur].filter(Boolean).join(' · ');
      document.title = `${item.titre || 'Qacidate'} — Qacidates | Chaabi Music`;
      if (audio.dataset.slug !== item.slug) {
        audio.src = item.audio;
        audio.dataset.slug = item.slug;
        seek.value = 0; elCur.textContent = '0:00';
      }
      /* Live-bar site principal */
      try {
        window._chaabiCurrentQacida = item;

      try {
        if (window.ChaabiSharedPlayer && window.ChaabiSharedPlayer.save) {
          window.ChaabiSharedPlayer.save({
            url: item.audio || '',
            title: item.titre || item.slug || 'Qacidate',
            artist: item.interprete || item.auteur || 'Poème chaâbi',
            image: item.image || '',
            source: 'poemes',
            media_type: 'qacida',
            position: 0,
            paused: false
          });
        } else {
          localStorage.setItem('chaabi_shared_player_v1', JSON.stringify({
            t: Date.now(),
            source: 'poemes',
            media_type: 'qacida',
            url: item.audio || '',
            title: item.titre || item.slug || 'Qacidate',
            artist: item.interprete || item.auteur || '',
            image: item.image || '',
            position: 0,
            paused: false
          }));
        }
      } catch (e) {}

        if (autoplay) chaabiStartHeartbeat(item);
      } catch (e) {}
      if (autoplay) audio.play().catch(() => {});
      syncPlayBtn();
    }

    const syncPlayBtn = () => box.classList.toggle('is-playing', !audio.paused);

    function play(slug, items) {
      if (items) setPlaylist(items);
      let i = playlist.findIndex((x) => x.slug === slug);
      if (i < 0) {
        const fromList = (state.list && state.list.items || []).find((x) => x.slug === slug);
        if (fromList && fromList.audio) { playlist.unshift(fromList); i = 0; }
      }
      if (i < 0) return;
      index = i;
      load(playlist[i], true);
    }

    const step = (d) => {
      if (!playlist.length) return;
      index = (index + d + playlist.length) % playlist.length;
      load(playlist[index], true);
    };

    btnToggle.addEventListener('click', () => {
      if (!audio.src) { const c = current() || playlist[0]; if (c) return load(c, true); return; }
      audio.paused ? audio.play().catch(() => {}) : audio.pause();
    });
    $('#pl-prev').addEventListener('click', () => step(-1));
    $('#pl-next').addEventListener('click', () => step(1));
    $('#pl-close').addEventListener('click', hide);

    audio.addEventListener('play', () => {
      syncPlayBtn();
      try { if (window._chaabiCurrentQacida) chaabiStartHeartbeat(window._chaabiCurrentQacida); } catch (e) {}
    });
    audio.addEventListener('pause', () => {
      syncPlayBtn();
      try { if (audio.paused) chaabiStopHeartbeat(); } catch (e) {}
    });
    audio.addEventListener('ended', () => {
      try { chaabiStopHeartbeat(); } catch (e) {}
      step(1);
    });
    audio.addEventListener('loadedmetadata', () => { elDur.textContent = fmt(audio.duration); });

    audio.addEventListener('timeupdate', () => {
      if (seeking || !audio.duration) return;
      seek.value = Math.round((audio.currentTime / audio.duration) * 1000);
      elCur.textContent = fmt(audio.currentTime);
    });

    const startSeek = () => { seeking = true; };
    const endSeek = () => {
      seeking = false;
      if (audio.duration) audio.currentTime = (seek.value / 1000) * audio.duration;
    };
    seek.addEventListener('input', startSeek);
    seek.addEventListener('change', endSeek);
    seek.addEventListener('pointerdown', startSeek);
    seek.addEventListener('pointerup', endSeek);

    vol.addEventListener('input', () => {
      audio.volume = vol.value / 100;
      audio.muted = audio.volume === 0;
      box.classList.toggle('is-muted', audio.muted);
      try { localStorage.setItem('qacidates-vol', String(audio.volume)); } catch {}
    });
    btnMute.addEventListener('click', () => {
      audio.muted = !audio.muted;
      box.classList.toggle('is-muted', audio.muted);
      btnMute.setAttribute('aria-label', audio.muted ? 'Rétablir le son' : 'Couper le son');
    });

    renderVol();
    return { setPlaylist, play, load, current, isOpen, hide, show };
  })();

  /* ─────────── Facettes ─────────── */
  async function loadFacets() {
    try {
      const d = await api('facets.php');
      state.facets = d;
      if (!chipsEl) return;             // page sans panneau de filtres

      const max = Math.max(1, ...d.interpretes.map((i) => i.count));
      chipsEl.innerHTML = d.interpretes.map((i) => {
        return `<button type="button" class="chip" data-interprete="${esc(i.nom)}" aria-pressed="false"
                        title="${esc(i.nom)} — ${i.count} qacidate(s)">
          ${i.image ? `<img src="${esc(i.image)}" alt="" loading="lazy" onerror="this.style.display='none'">` : ''}
          <span>${esc(i.nom)}</span><span class="chip__n">${i.count}</span>
        </button>`;
      }).join('');

      selTheme.innerHTML = '<option value="">Tous les thèmes</option>' +
        d.themes.map((x) => `<option value="${esc(x.nom)}">${esc(x.nom)} (${x.count})</option>`).join('');

      filters.hidden = false;
      if ($('#footer-meta')) $('#footer-meta').textContent =
        `${d.total} qacidate(s) · ${d.interpretes.length} interprète(s) · ${d.themes.length} thème(s)`;

      const footInterpList = $('#footer-interpretes');
      if (footInterpList) footInterpList.innerHTML = d.interpretes.slice(0, 5)
        .map((i) => `<li><a href="#" data-interprete-link="${esc(i.nom)}">${esc(i.nom)} <span class="n">(${i.count})</span></a></li>`).join('');
      const footThemeList = $('#footer-themes');
      if (footThemeList) footThemeList.innerHTML = d.themes.slice(0, 5)
        .map((x) => `<li><a href="#" data-theme-link="${esc(x.nom)}">${esc(x.nom)} <span class="n">(${x.count})</span></a></li>`).join('');
    } catch (e) {
      filters.hidden = true;
      console.warn('Facettes indisponibles :', e.message);
    }
  }

  /* ─────────── Liste ─────────── */
  function renderSkeletons(n = 8) {
    grid.setAttribute('aria-busy', 'true');
    grid.innerHTML = '<div class="sr-only">Chargement des qacidates…</div>' +
      Array.from({ length: n }, () => `<div class="skel" aria-hidden="true">
        <div class="skel__media"></div><div class="skel__line"></div>
        <div class="skel__line skel__line--sm"></div></div>`).join('');
  }

  function cardNode(item) {
    const node = tplCard.content.firstElementChild.cloneNode(true);
    node.dataset.slug = item.slug;
    /* VRAI lien : fonctionne sans JavaScript, au clic milieu, et pour les moteurs.
       (l'ancien routage par # ne fonctionnait plus sur les pages en rendu serveur) */
    node.href = BASE + '/q/' + encodeURIComponent(item.slug);
    node.setAttribute('aria-label', `${item.titre}${item.interprete ? ' — ' + item.interprete : ''}`);

    /* Médaillon de l'interprète (photo ronde, ou pictogramme si absente) */
    const medal = $('.card__medal', node);
    const img = $('.card__medal img', node);
    if (item.image) {
      img.src = item.image;
      img.alt = item.interprete ? `Portrait : ${item.interprete}` : '';
      medal.classList.add('has-photo');
    } else {
      img.removeAttribute('src');
      img.setAttribute('data-empty', '');
    }

    $('.card__title', node).textContent = item.titre || '(sans titre)';
    $('.card__sub', node).textContent = item.sous_titre || '';

    const ar = $('.card__ar', node);
    if (item.titre_ar) ar.textContent = item.titre_ar; else ar.hidden = true;

    /* Extrait du vers qui a fait correspondre le poème (recherche profonde) */
    const author = $('.card__author', node);
    if (item.match_html) {
      const sn = document.createElement('p');
      sn.className = 'snippet';
      sn.innerHTML = item.match_html;      // déjà échappé côté serveur (<mark> inclus)
      author.insertAdjacentElement('beforebegin', sn);
    }

    $('.card__author', node).innerHTML =
      (item.auteur
        ? `<span class="card__who card__who--poete"><span class="card__who-lbl">Poète</span>${esc(item.auteur)}</span>`
        : '<span class="card__who card__who--inconnu"><span class="card__who-lbl">Poète</span>inconnu</span>') +
      (item.interprete
        ? `<span class="card__who card__who--voix"><span class="card__who-lbl">Voix</span>${esc(item.interprete)}</span>`
        : '');

    const meta = [`<li>📄 ${item.nb_sections} chant${item.nb_sections > 1 ? 's' : ''}</li>`];
    if (item.theme) meta.push(`<li>🏷️ ${esc(item.theme)}</li>`);
    if (item.views) meta.push(`<li>👁️ ${item.views}</li>`);
    $('.card__meta', node).innerHTML = meta.join('');

    const audioBadge = $('.card__audio', node);
    if (item.audio) {
      audioBadge.hidden = false;
      audioBadge.setAttribute('role', 'button');
      audioBadge.setAttribute('tabindex', '0');
      audioBadge.setAttribute('title', 'Écouter');
      const fire = (e) => {
        e.stopPropagation(); e.preventDefault();
        Player.setPlaylist(state.list && state.list.items || []);
        Player.play(item.slug);
      };
      audioBadge.addEventListener('click', fire);
      audioBadge.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') fire(e); });
    }

    return node;
  }

  function renderList(data) {
    state.list = data;
    Player.setPlaylist(data.items);
    if (grid) grid.setAttribute('aria-busy', 'false');

    if (!data.items.length) {
      if (grid) grid.innerHTML = `<div class="state">
        <strong>Aucun poème trouvé</strong>
        <p>Essayez un autre mot-clé, ou réinitialisez les filtres.</p>
        <button class="btn" id="state-reset" type="button">Réinitialiser la recherche</button></div>`;
      const b = $('#state-reset'); if (b) b.addEventListener('click', resetFilters);
      if (compteur) compteur.innerHTML = '<b>0</b> résultat';
      if (pager) pager.hidden = true;
      return;
    }

    if (grid) {
      grid.innerHTML = '';
      const frag = document.createDocumentFragment();
      data.items.forEach((it) => frag.appendChild(cardNode(it)));
      grid.appendChild(frag);
    }

    const from = (data.page - 1) * data.per_page + 1;
    const to = Math.min(data.total, data.page * data.per_page);
    if (compteur) {
      compteur.innerHTML = `<b>${data.total}</b> poème${data.total > 1 ? 's' : ''}`
        + (data.total > PER_PAGE ? ` — affichage ${from}–${to}` : '');
    }

    renderPager(data);
  }

  function renderPager(data) {
    if (!pager) return;
    if (data.pages <= 1) { pager.hidden = true; return; }
    pager.hidden = false;
    const btn = (label, p, o = {}) => `<button type="button" data-page="${p}" ${o.current ? 'aria-current="page"' : ''} ${o.disabled ? 'disabled' : ''} aria-label="${o.label || 'Page ' + p}">${label}</button>`;
    const out = [btn('‹', data.page - 1, { disabled: data.page <= 1, label: 'Page précédente' })];
    const set = new Set([1, data.pages, data.page, data.page - 1, data.page + 1]);
    const list = [...set].filter((p) => p >= 1 && p <= data.pages).sort((a, b) => a - b);
    let prev = 0;
    list.forEach((p) => {
      if (prev && p - prev > 1) out.push('<button type="button" disabled aria-hidden="true">…</button>');
      out.push(btn(p, p, { current: p === data.page })); prev = p;
    });
    out.push(btn('›', data.page + 1, { disabled: data.page >= data.pages, label: 'Page suivante' }));
    pager.innerHTML = out.join('');
    $$('button[data-page]', pager).forEach((b) => b.addEventListener('click', () => {
      const p = parseInt(b.dataset.page, 10);
      if (!p || p === state.page) return;
      state.page = p; loadList(); window.scrollTo({ top: 0, behavior: 'smooth' });
    }));
  }

  /* ─────────── Poème ─────────── */
  /**
   * Feuillet d'un chant.
   * kind = 'fr' | 'ar'
   * opts = { manuscript, images, placeholder }
   *   - manuscript : la colonne arabe affiche le(s) manuscrit(s) (pas de texte AR)
   *   - placeholder : texte affiché si le feuillet est vide (ex. « traduction à venir »)
   */
  function leafBlock(kind, lines, title, opts = {}) {
    const { manuscript = false, images = [], placeholder = '', meta = null } = opts;

    /* Manuscrit : la section n'a pas de texte arabe -> on montre le scan */
    if (kind === 'ar' && manuscript) {
      return `<div class="leaf leaf--ar is-manuscript">
        <span class="leaf__tag">المخطوط · Manuscrit</span>
        <p class="manuscript-note">لا يوجد نصّ مطبوع لهذا المقطع — النسخة المخطوطة :</p>
        <div class="leaf__manuscript">
          ${images.map((im, i) => `<figure>
            <button type="button" class="zoom" data-zoom="${esc(im.url)}" data-caption="${esc(im.alt || 'Manuscrit')}" aria-label="Agrandir le manuscrit">
              <img src="${esc(im.url)}" alt="${esc(im.alt || 'Manuscrit')}" loading="lazy" decoding="async">
              <span class="zoom__hint">🔍 Agrandir</span>
            </button>
            <figcaption>${esc(im.alt || 'Manuscrit')}${images.length > 1 ? ` — ${i + 1}/${images.length}` : ''}</figcaption>
          </figure>`).join('')}
        </div>
        <p class="manuscript-note manuscript-note--fr">Texte arabe non saisi : le manuscrit original est affiché.</p>
      </div>`;
    }

    if (!lines || !lines.length) {
      if (!placeholder) return '';
      return `<div class="leaf leaf--${kind} is-empty">
        <span class="leaf__tag">${esc(title)}</span>
        <p class="leaf__empty">${esc(placeholder)}</p>
      </div>`;
    }

    return `<div class="leaf leaf--${kind}">
      <span class="leaf__tag">${esc(title)}</span>
      <div class="leaf__body" ${kind === 'ar' ? 'dir="rtl" lang="ar"' : ''}>
        ${(meta && meta.length
          ? meta.map((m) => {
              const t = (m && m.texte) != null ? m.texte : (typeof m === 'string' ? m : '');
              const ty = (m && m.type) ? String(m.type) : 'normal';
              const cls = ty === 'refrain' ? 'line line--refrain' : (ty === 'titre' ? 'line line--titre' : 'line');
              return `<p class="${cls}">${esc(t)}</p>`;
            })
          : lines.map((l) => `<p class="line">${esc(l)}</p>`)
        ).join('')}
      </div>
    </div>`;
  }

  function renderPoem(d) {
    const it = d.item;
    document.title = `${it.titre || 'Qacidate'} — Qacidates | Chaabi Music`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', it.meta_description || it.sous_titre || '');

    const person = (label, nFr, nAr, img) => (nFr || nAr) ? `
      <div class="poem__person">
        ${img ? `<img src="${esc(img)}" alt="Portrait : ${esc(nFr || nAr)}" loading="lazy" onerror="this.style.display='none'">` : ''}
        <div><span>${label}</span><strong>${esc(nFr || nAr)}</strong>
        ${nAr && nAr !== nFr ? `<em>${esc(nAr)}</em>` : ''}</div>
      </div>` : '';

    const refAr = (it.refrain_lines_ar || []).map((l) => `<p>${esc(l)}</p>`).join('');
    const refFr = (it.refrain_lines_fr || []).map((l) => `<p>${esc(l)}</p>`).join('');

    const facts = (d.facts || []).map((f) => `<li><i aria-hidden="true">${icon(f.icone)}</i>
      <div><b>${esc(f.titre || '')}</b><span>${esc(f.valeur || '')}</span></div></li>`).join('');

    const noms = (d.noms || []).length ? `
      <div class="ornament" aria-hidden="true">❖ ❖ ❖</div>
      <section class="noms-cites" id="noms-cites" aria-label="Noms cités">
        <div class="chant__head">
          <p class="chant__label-ar" dir="rtl" lang="ar">الأسماء المذكورة</p>
          <h3 class="chant__label-fr">Les noms cités</h3>
        </div>
        <div class="noms-grid">
          ${d.noms.map((n) => {
            const emoji = n.emoji || n.icone || '❖';
            const fr = n.nom_fr || n.nom || '';
            const ar = n.nom_ar || '';
            const desc = n.description_fr || n.description || '';
            const descAr = n.description_ar || '';
            return `<article class="nom-card">
              <span class="nom-card__emoji" aria-hidden="true">${esc(emoji)}</span>
              <div class="nom-card__body">
                <h4 class="nom-card__name">${esc(fr)}${ar ? ` <span class="nom-card__ar" dir="rtl" lang="ar">${esc(ar)}</span>` : ''}</h4>
                ${desc ? `<p class="nom-card__desc">${esc(desc)}</p>` : ''}
                ${descAr ? `<p class="nom-card__desc nom-card__desc--ar" dir="rtl" lang="ar">${esc(descAr)}</p>` : ''}
              </div>
            </article>`;
          }).join('')}
        </div>
      </section>` : '';

    const sectionsList = d.sections || [];
    const sommaire = sectionsList.length > 1 ? `
      <nav class="chapitres" id="chapitres" aria-label="Chapitres de la qacidate">
        <div class="chapitres__inner">
          <span class="chapitres__lead">Chants</span>
          ${sectionsList.map((s) => {
            const t = (s.label_fr || s.label_ar || ('Chant ' + s.numero) || '').trim();
            const short = t.length > 28 ? t.slice(0, 26) + '…' : t;
            return `<a class="chap-btn" href="#chant-${s.numero}"><span class="chap-btn__num">${s.numero}</span><span class="chap-btn__t">${esc(short)}</span></a>`;
          }).join('')}
        </div>
      </nav>` : '';

    const chants = (d.sections || []).map((s) => {

      const linesAr = s.lines_ar || [];
      const linesFr = s.lines_fr || [];
      const metaFr = s.lines_fr_meta || null;
      const metaAr = s.lines_ar_meta || null;
      const arHas = linesAr.length > 0 || s.ar_is_image;
      const frHas = linesFr.length > 0;

      return `
      <div class="ornament" aria-hidden="true">❖ ❖ ❖</div>
      <section class="chant">
        <div class="chant__head">
          <span class="chant__num">Chant ${s.numero}</span>
          ${s.label_ar ? `<p class="chant__label-ar" dir="rtl" lang="ar">${esc(s.label_ar)}</p>` : ''}
          ${s.label_fr ? `<h3 class="chant__label-fr">${esc(s.label_fr)}</h3>` : ''}
        </div>
        <div class="leaves" style="--fs:${state.fs}">
          ${leafBlock('fr', linesFr, 'Français', {
            placeholder: arHas ? 'Traduction française à venir.' : '',
            meta: metaFr
          })}
          ${leafBlock('ar', linesAr, 'العربية', {
            manuscript: !!s.ar_is_image,
            images: s.images || [],
            placeholder: frHas ? 'النص العربي غير متوفر.' : '',
            meta: metaAr
          })}
        </div>
      </section>`;
    }).join('');

    const navItem = (side, o) => {
      if (!o) return '<span aria-hidden="true"></span>';
      const lbl = side === 'prev' ? '← Qacidate précédente' : 'Qacidate suivante →';
      return `<a class="${side}" href="#/q/${encodeURIComponent(o.slug)}"><small>${lbl}</small><strong>${esc(o.titre || o.slug)}</strong></a>`;
    };

    const related = (d.related || []).length ? `
      <section class="related"><h3>À découvrir</h3><div class="related__grid">
        ${d.related.map((r) => `<a class="related__item" href="#/q/${encodeURIComponent(r.slug)}">
          ${r.image ? `<img src="${esc(r.image)}" alt="" loading="lazy" onerror="this.style.display='none'">` : ''}
          <span><b>${esc(r.titre || r.slug)}</b>${r.titre_ar ? `<small>${esc(r.titre_ar)}</small>` : ''}</span>
        </a>`).join('')}
      </div></section>` : '';

    poemEl.innerHTML = `
      <button class="poem__back" type="button" data-route="list">← Toutes les qacidates</button>
      <header class="poem__hero">
        ${it.theme ? `<p class="poem__theme">${esc(it.theme)}</p>` : ''}
        <h1 class="poem__title-ar" dir="rtl" lang="ar" id="poem-titre">${esc(it.titre_ar || it.titre || '')}</h1>
        <p class="poem__title-fr">${esc(it.titre || '')}</p>
        ${it.sous_titre ? `<p class="poem__sub">${esc(it.sous_titre)}</p>` : ''}
        <div class="poem__by">
          ${person('Auteur', it.auteur, it.auteur_ar, null)}
          ${person('Interprète', it.interprete, it.interprete_ar, it.image)}
        </div>
        ${(() => {
          const words = (d.sections || []).reduce((n, s) => {
            const lines = s.lines_fr || [];
            return n + lines.join(' ').split(/\s+/).filter(Boolean).length;
          }, 0);
          const mins = Math.max(1, Math.ceil(words / 200));
          const nCh = (d.sections || []).length;
          const shareUrl = location.href.split('#')[0];
          const shareText = (it.titre || '') + (it.auteur ? ' — ' + it.auteur : '') + ' | Qacidates Chaâbi';
          const u = encodeURIComponent(shareUrl);
          const t = encodeURIComponent(shareText);
          return `<p class="poem__readtime">📖 ≈ ${mins} min de lecture${nCh > 1 ? ' · ' + nCh + ' chants' : ''}</p>
        <div class="share-bar" role="group" aria-label="Partager cette qacidate">
          <span class="share-bar__lbl">Partager</span>
          <a class="share-btn share-btn--wa" href="https://wa.me/?text=${t}%20${u}" target="_blank" rel="noopener noreferrer">WhatsApp</a>
          <a class="share-btn share-btn--fb" href="https://www.facebook.com/sharer/sharer.php?u=${u}" target="_blank" rel="noopener noreferrer">Facebook</a>
          <a class="share-btn share-btn--x" href="https://twitter.com/intent/tweet?text=${t}&url=${u}" target="_blank" rel="noopener noreferrer">X</a>
          <button type="button" class="share-btn share-btn--copy" data-share-copy data-url="${esc(shareUrl)}" data-title="${esc(shareText)}">Copier le lien</button>
        </div>`;
        })()}
      </header>
      ${(refAr || refFr) ? `
        <div class="ornament" aria-hidden="true">﴿ ❖ ﴾</div>
        <section class="refrain refrain--rich" aria-label="Refrain">
          <p class="refrain__label">Refrain</p>
          <div class="refrain__grid">
            ${refFr ? `<div class="refrain__col"><h3>Français</h3><div class="refrain__fr">${refFr}</div></div>` : ''}
            ${refAr ? `<div class="refrain__col"><h3>العربية</h3><div class="refrain__ar" dir="rtl" lang="ar">${refAr}</div></div>` : ''}
          </div>
        </section>` : ''}
      ${facts ? `<ul class="facts">${facts}</ul>` : ''}
      ${sommaire}
      ${chants}
      ${noms}
      <nav class="poem__nav" aria-label="Navigation entre qacidates">
        ${navItem('prev', d.navigation && d.navigation.prev)}
        ${navItem('next', d.navigation && d.navigation.next)}
      </nav>
      <div class="reader-bar" role="toolbar" aria-label="Confort de lecture">
        <div class="reader-bar__inner">
          ${it.audio ? `<button type="button" id="btn-listen" aria-pressed="false">▶︎ Écouter</button><span class="reader-bar__sep" aria-hidden="true"></span>` : ''}
          <div class="readmode" role="group" aria-label="Langues affichées">
            <button type="button" class="readmode__btn" data-mode="both" aria-pressed="true">Bilingue</button>
            <button type="button" class="readmode__btn" data-mode="ar" aria-pressed="false">العربية</button>
            <button type="button" class="readmode__btn" data-mode="fr" aria-pressed="false">Français</button>
          </div>
          <span class="reader-bar__sep" aria-hidden="true"></span>
          <button type="button" id="fs-minus" aria-label="Réduire la taille du texte">A−</button>
          <button type="button" id="fs-reset" aria-label="Taille normale">A</button>
          <button type="button" id="fs-plus" aria-label="Augmenter la taille du texte">A+</button>
          <span class="reader-bar__sep" aria-hidden="true"></span>
          <button type="button" id="btn-find" aria-label="Chercher dans ce poème" aria-expanded="false">🔍 Chercher</button>
          <button type="button" id="btn-bookmark" aria-label="Enregistrer ce poème" aria-pressed="false">☆ Enregistrer</button>
          <span class="reader-bar__sep" aria-hidden="true"></span>
          <button type="button" id="btn-copy" aria-label="Copier le refrain">📋 Copier</button>
          <button type="button" id="btn-print" aria-label="Imprimer ce poème">🖨️ Imprimer</button>
        </div>
        <div id="findbar" class="findbar" hidden>
          <input type="search" id="find-input" placeholder="Chercher un mot…" autocomplete="off" aria-label="Recherche dans le poème">
          <span id="find-count" class="findbar__count">0</span>
          <button type="button" id="find-prev" aria-label="Occurrence précédente">↑</button>
          <button type="button" id="find-next" aria-label="Occurrence suivante">↓</button>
          <button type="button" id="find-close" aria-label="Fermer">✕</button>
        </div>
      </div>
      ${related}`;
      try { if (typeof initChapitres === 'function') initChapitres(); } catch (e) {}


    poemEl.querySelector('[data-route="list"]').addEventListener('click', () => go('#/'));

    const setFs = (v) => {
      state.fs = Math.min(1.5, Math.max(.85, v));
      $$('.leaves', poemEl).forEach((el) => el.style.setProperty('--fs', state.fs));
      try { localStorage.setItem('qacidates-fs', String(state.fs)); } catch {}
    };
    const _fsm = $('#fs-minus'); if (_fsm) _fsm.addEventListener('click', () => setFs(state.fs - 0.08));
    const _fsp = $('#fs-plus'); if (_fsp) _fsp.addEventListener('click', () => setFs(state.fs + 0.08));
    const _fsr = $('#fs-reset'); if (_fsr) _fsr.addEventListener('click', () => setFs(1));
    const _bpr = $('#btn-print'); if (_bpr) _bpr.addEventListener('click', () => window.print());

    if (it.audio) {
      const btn = $('#btn-listen');
      const audio = $('#pl-audio');
      const sync = () => {
        const on = !audio.paused && audio.dataset.slug === it.slug;
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        btn.textContent = on ? '⏸ En lecture' : '▶︎ Écouter';
      };
      btn.addEventListener('click', () => {
        if (Player.current() && !$('#pl-audio').paused && $('#pl-audio').dataset.slug === it.slug) {
          $('#pl-audio').pause(); sync();
        } else {
          Player.load({ ...it }, true); sync();
        }
      });
      $('#pl-audio').addEventListener('play', sync);
      $('#pl-audio').addEventListener('pause', sync);
      sync();
    }

    setFs(state.fs);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function renderPoemError(msg) {
    poemEl.innerHTML = `<div class="state"><strong>Impossible d'afficher ce poème</strong><p>${esc(msg)}</p>
      <button class="btn" type="button" data-route="list">Retour à la liste</button></div>`;
    poemEl.querySelector('[data-route="list"]').addEventListener('click', () => go('#/'));
  }

  /* ─────────── Chargements ─────────── */
  async function loadList() {
    if (!grid) return;
    renderSkeletons();
    if (pager) pager.hidden = true;
    try {
      const d = await api('qacidates.php', {
        q: state.q, interprete: state.interprete, auteur: state.auteur || '',
        theme: state.theme, sort: state.sort,
        page: state.page, per_page: PER_PAGE, audio: state.audioOnly ? 1 : ''
      });
      renderList(d);
    } catch (e) {
      grid.setAttribute('aria-busy', 'false');
      grid.innerHTML = `<div class="state"><strong>Les qacidates n'ont pas pu être chargées</strong>
        <p>${esc(e.message)}</p><button class="btn" type="button" id="state-retry">Réessayer</button></div>`;
      const rb = $('#state-retry');
      if (rb) rb.addEventListener('click', loadList);
    }
  }

  async function loadPoem(slug) {
    showView('detail');
    poemEl.innerHTML = `<div class="state"><strong>Ouverture du poème…</strong></div>`;
    try {
      const d = await api('qacida.php', { slug });
      state.poem = d;
      renderPoem(d);
      Player.setPlaylist(state.list && state.list.items || []);
      if (d.item.audio && Player.isOpen()) Player.load({ ...d.item }, false);
    } catch (e) {
      renderPoemError(e.message);
    }
  }

  /* ─────────── Pages simples ─────────── */
  function renderStatic(kind) {
    const f = state.facets;
    const head = (t, s) => `<button class="poem__back" type="button" data-route="list">← Retour</button>
      <header class="poem__hero"><p class="poem__theme">Explorer</p><h1 class="poem__title-fr">${t}</h1>
      <p class="poem__sub">${s}</p></header>`;

    if (kind === 'interpretes') {
      staticPage.innerHTML = head('Les interprètes', 'Chaque cheikh a sa voix, son istikhbar et son rythme.') +
        `<div class="tiles" style="margin-top:1.6rem">` + f.interpretes.map((i) => `
          <button class="tile" type="button" data-interprete-link="${esc(i.nom)}">
            ${i.image ? `<img src="${esc(i.image)}" alt="" loading="lazy" onerror="this.style.display='none'">` : '<span class="tile__em">🎙️</span>'}
            <span><b>${esc(i.nom)}</b><small>${i.count} qacidate(s)${i.nom_ar ? ' · ' + esc(i.nom_ar) : ''}</small></span>
          </button>`).join('') + '</div>';
    } else if (kind === 'themes') {
      staticPage.innerHTML = head('Les thèmes', 'De la louange du Prophète aux amours contrariées.') +
        `<div class="tiles" style="margin-top:1.6rem">` + f.themes.map((x) => `
          <button class="tile" type="button" data-theme-link="${esc(x.nom)}">
            <span class="tile__em">🏷️</span><span><b>${esc(x.nom)}</b><small>${x.count} qacidate(s)</small></span>
          </button>`).join('') + '</div>';
    } else {
      staticPage.innerHTML = head('À propos', 'Le répertoire du chaâbi algérien, en arabe et en français.') + `
        <section class="chant" style="margin-top:1.6rem">
          <div class="chant__head"><h3 class="chant__label-fr">Ce module</h3></div>
          <div class="leaves one">
            <div class="leaf leaf--fr" style="grid-column:1/-1">
              <span class="leaf__tag">Informations</span>
              <div class="leaf__body">
                <p><strong>${f.total}</strong> qacidates, <strong>${f.interpretes.length}</strong> interprètes,
                   <strong>${f.themes.length}</strong> thèmes.</p>
                <p>Les textes proviennent de la base <code>chaabi_music_qacidats</code> (lecture seule).
                   Chaque poème est présenté avec son texte arabe et sa traduction française, son auteur,
                   son ou ses interprètes, et les indications de structure (khamassa, mâtiâ, khalâs…).</p>
                <p>En chaâbi, un poème melhoun appartient à son poète : plusieurs cheikhs l'ont enregistré,
                   chacun avec son istikhbar, son rythme et sa voix.</p>
              </div>
            </div>
          </div>
        </section>`;
    }

    staticPage.querySelector('[data-route="list"]').addEventListener('click', () => go('#/'));
    $$('[data-interprete-link]', staticPage).forEach((b) => b.addEventListener('click', () => {
      state.interprete = b.dataset.interpreteLink; state.page = 1;
      go('#/');
      $$('.chip', chipsEl).forEach((c) => c.setAttribute('aria-pressed', c.dataset.interprete === state.interprete ? 'true' : 'false'));
      refreshResetBtn(); loadList();
    }));
    $$('[data-theme-link]', staticPage).forEach((b) => b.addEventListener('click', () => {
      state.theme = b.dataset.themeLink; selTheme.value = state.theme; state.page = 1;
      go('#/'); refreshResetBtn(); loadList();
    }));
  }

  async function randomPoem() {
    try {
      const f = await api('facets.php');
      const total = f.total || 1;
      const page = Math.max(1, Math.floor(Math.random() * Math.ceil(total / PER_PAGE)) + 1);
      const d = await api('qacidates.php', { per_page: PER_PAGE, page });
      if (!d.items.length) return;
      const pick = d.items[Math.floor(Math.random() * d.items.length)];
      window.location.href = BASE + '/q/' + encodeURIComponent(pick.slug);
    } catch { /* silencieux */ }
  }

  /* ─────────── Vues & routage ─────────── */
  function showView(name) {
    if (!viewList && !viewDetail && !viewPage) return;   // page en rendu serveur
    if (viewList)   viewList.hidden   = name !== 'list';
    if (viewDetail) viewDetail.hidden = name !== 'detail';
    if (viewPage)   viewPage.hidden   = name !== 'page';
    if (filters)    filters.hidden    = name !== 'list' || !state.facets.total;
  }

  function go(hash) {
    if (window.location.hash === hash) route(); else window.location.hash = hash;
  }

  function route() {
    if (!viewList || !viewDetail) return;   // pas de conteneur SPA (page en rendu serveur)
    const h = window.location.hash || '#/';
    closeMenu();

    if (h === '#/interpretes') { showView('page'); renderStatic('interpretes'); return; }
    if (h === '#/themes') { showView('page'); renderStatic('themes'); return; }
    if (h === '#/apropos') { showView('page'); renderStatic('apropos'); return; }
    if (h === '#/hasard') { randomPoem(); return; }

    const m = h.match(/^#\/q\/(.+)$/);
    if (m) {
      const slug = decodeURIComponent(m[1]);
      if (!state.poem || state.poem.item.slug !== slug) loadPoem(slug);
      else showView('detail');
      return;
    }

    showView('list');
    document.title = 'Qacidates — Les grands poèmes du Chaâbi | Chaabi Music';
    if (!state.list) loadList();
  }

  /* ─────────── Filtres ─────────── */
  function refreshResetBtn() {
    if (btnReset) btnReset.hidden = !(state.q || state.interprete || state.theme || state.audioOnly || state.sort !== 'recent');
  }

  function resetFilters() {
    state.q = ''; state.interprete = ''; state.theme = ''; state.sort = 'recent'; state.audioOnly = false; state.page = 1;
    if (inputQ) inputQ.value = '';
    if (selTheme) selTheme.value = '';
    if (selSort) selSort.value = 'recent';
    if (chkAudio) chkAudio.checked = false;
    if (clearQ) clearQ.hidden = true;
    if (btnReset) btnReset.hidden = true;
    if (chipsEl) $$('.chip', chipsEl).forEach((c) => c.setAttribute('aria-pressed', 'false'));
    loadList();
  }

  if (chipsEl) chipsEl.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip'); if (!chip) return;
    const name = chip.dataset.interprete || '';
    const on = chip.getAttribute('aria-pressed') === 'true';
    $$('.chip', chipsEl).forEach((c) => c.setAttribute('aria-pressed', 'false'));
    if (on) state.interprete = '';
    else { chip.setAttribute('aria-pressed', 'true'); state.interprete = name; }
    state.page = 1; refreshResetBtn(); loadList();
  });

  const footInterp = $('#footer-interpretes');
  if (footInterp) footInterp.addEventListener('click', (e) => {
    const a = e.target.closest('[data-interprete-link]'); if (!a) return;
    e.preventDefault();
    state.interprete = a.dataset.interpreteLink; state.page = 1;
    go('#/');
    $$('.chip', chipsEl).forEach((c) => c.setAttribute('aria-pressed', c.dataset.interprete === state.interprete ? 'true' : 'false'));
    refreshResetBtn(); loadList(); window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  const footThemes = $('#footer-themes');
  if (footThemes) footThemes.addEventListener('click', (e) => {
    const a = e.target.closest('[data-theme-link]'); if (!a) return;
    e.preventDefault();
    state.theme = a.dataset.themeLink; selTheme.value = state.theme; state.page = 1;
    go('#/'); refreshResetBtn(); loadList(); window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  if (selTheme) selTheme.addEventListener('change', () => { state.theme = selTheme.value; state.page = 1; refreshResetBtn(); loadList(); });
  if (selSort) selSort.addEventListener('change', () => { state.sort = selSort.value; state.page = 1; refreshResetBtn(); loadList(); });
  if (chkAudio) chkAudio.addEventListener('change', () => { state.audioOnly = chkAudio.checked; state.page = 1; refreshResetBtn(); loadList(); });
  if (btnReset) btnReset.addEventListener('click', resetFilters);

  if (inputQ) inputQ.addEventListener('input', () => {
    const v = inputQ.value.trim();
    if (clearQ) clearQ.hidden = v === '';
    debounce(() => {
      state.q = v;
      state.page = 1;
      refreshResetBtn();
      /* Met à jour l’URL sans recharger (partage / retour navigateur) */
      try {
        const u = new URL(window.location.href);
        if (v) u.searchParams.set('q', v); else u.searchParams.delete('q');
        u.searchParams.delete('page');
        history.replaceState({}, '', u.pathname + u.search + (u.hash || ''));
      } catch {}
      loadList();
    });
  });
  /* Empêche le submit natif du formulaire (sinon rechargement qui casse la recherche JS) */
  const searchForm = inputQ && inputQ.closest('form');
  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = (inputQ.value || '').trim();
      state.q = v;
      state.page = 1;
      if (clearQ) clearQ.hidden = v === '';
      refreshResetBtn();
      try {
        const u = new URL(window.location.href);
        if (v) u.searchParams.set('q', v); else u.searchParams.delete('q');
        history.replaceState({}, '', u.pathname + u.search);
      } catch {}
      loadList();
    });
  }
  if (inputQ) inputQ.addEventListener('keydown', (e) => { if (e.key === 'Escape') { inputQ.value = ''; if (clearQ) clearQ.hidden = true; } });
  if (clearQ) clearQ.addEventListener('click', () => {
    inputQ.value = ''; clearQ.hidden = true; state.q = ''; state.page = 1; refreshResetBtn(); loadList(); inputQ.focus();
  });

  /* Raccourcis clavier */
  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement.tagName;
    if (e.key === '/' && tag !== 'INPUT' && tag !== 'SELECT' && tag !== 'TEXTAREA' && inputQ) { e.preventDefault(); inputQ.focus(); }
    if (e.key === 'Escape' && !document.body.classList.contains('has-lightbox')) {
      const a = $('#pl-audio');
      if (a && !a.paused) a.pause();
    }
  });

  /* ═══════════ LOUPE (agrandir un manuscrit) ═══════════ */
  const Lightbox = (() => {
    let el, stage, img, capEl, z = 1;

    const setZ = (v) => {
      z = Math.min(6, Math.max(.4, v));
      img.style.width = (z * 100) + '%';
      $('#lb-zoom', el).textContent = Math.round(z * 100) + ' %';
    };

    function build() {
      el = document.createElement('div');
      el.className = 'lightbox';
      el.hidden = true;
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      el.setAttribute('aria-label', 'Manuscrit agrandi');
      el.innerHTML = `
        <div class="lightbox__bar">
          <span class="lightbox__cap" id="lb-cap"></span>
          <div class="lightbox__tools">
            <button type="button" id="lb-out" aria-label="Réduire">−</button>
            <span id="lb-zoom">100 %</span>
            <button type="button" id="lb-in" aria-label="Agrandir">+</button>
            <button type="button" id="lb-fit" aria-label="Ajuster à la largeur">Ajuster</button>
            <button type="button" id="lb-close" aria-label="Fermer">✕</button>
          </div>
        </div>
        <div class="lightbox__stage" id="lb-stage"><img id="lb-img" alt=""></div>`;
      document.body.appendChild(el);
      stage = $('#lb-stage', el);
      img = $('#lb-img', el);
      capEl = $('#lb-cap', el);

      $('#lb-in', el).addEventListener('click', () => setZ(z + .25));
      $('#lb-out', el).addEventListener('click', () => setZ(z - .25));
      $('#lb-fit', el).addEventListener('click', () => { setZ(1); stage.scrollTo(0, 0); });
      $('#lb-close', el).addEventListener('click', close);
      el.addEventListener('click', (e) => { if (e.target === el || e.target === stage) close(); });
      img.addEventListener('dblclick', () => setZ(z > 1.2 ? 1 : 2));
      stage.addEventListener('wheel', (e) => {
        if (e.ctrlKey) { e.preventDefault(); setZ(z - Math.sign(e.deltaY) * .15); }
      }, { passive: false });
      document.addEventListener('keydown', (e) => {
        if (el.hidden) return;
        if (e.key === 'Escape') { close(); }
        else if (e.key === '+' || e.key === '=') setZ(z + .25);
        else if (e.key === '-') setZ(z - .25);
      });
    }

    function open(url, caption) {
      if (!el) build();
      img.src = url;
      img.alt = caption || 'Manuscrit';
      capEl.textContent = caption || '';
      el.hidden = false;
      document.body.classList.add('has-lightbox');
      setZ(1);
      stage.scrollTo(0, 0);
      $('#lb-close', el).focus();
    }

    function close() {
      if (!el) return;
      el.hidden = true;
      document.body.classList.remove('has-lightbox');
    }

    return { open, close };
  })();

  /* Clic (délégué) sur une vignette de manuscrit */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-zoom]');
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    Lightbox.open(b.dataset.zoom, b.dataset.caption);
  });

  $$('[data-nav]').forEach((a) => a.addEventListener('click', () => closeMenu()));
  window.addEventListener('hashchange', route);

  /* ─────────── Démarrage ─────────── */
  /* Reprendre les filtres passés dans l'URL (rendu serveur, liens partageables) */
  try {
    const sp = new URLSearchParams(window.location.search);
    state.q          = sp.get('q') || '';
    state.interprete = sp.get('interprete') || '';
    state.theme      = sp.get('theme') || '';
    state.audioOnly  = sp.get('audio') === '1';
    state.sort       = sp.get('sort') || 'recent';
    state.page       = parseInt(sp.get('page') || '1', 10) || 1;
    if (inputQ && state.q) { inputQ.value = state.q; if (clearQ) clearQ.hidden = false; }
    if (selTheme && state.theme) selTheme.value = state.theme;
    if (selSort && state.sort) selSort.value = state.sort;
    if (chkAudio) chkAudio.checked = state.audioOnly;
  } catch {}

  try {
    const v = parseFloat(localStorage.getItem('qacidates-fs') || '1');
    if (v >= .85 && v <= 1.5) state.fs = v;
  } catch {}

  /* Comportements communs, présents aussi sur les pages en rendu serveur */
  (function bindBehaviors() {
    const poem = $('#poem');
    if (!poem) return;

    /* Confort de lecture : taille du texte */
    const setFs = (v) => {
      state.fs = Math.min(1.5, Math.max(.85, v));
      $$('.leaves', poem).forEach((el) => el.style.setProperty('--fs', state.fs));
      try { localStorage.setItem('qacidates-fs', String(state.fs)); } catch {}
    };
    setFs(state.fs);
    const fm = $('#fs-minus'), fr = $('#fs-reset'), fp = $('#fs-plus');
    if (fm) fm.addEventListener('click', () => setFs(state.fs - 0.08));
    if (fp) fp.addEventListener('click', () => setFs(state.fs + 0.08));
    if (fr) fr.addEventListener('click', () => setFs(1));

    /* Imprimer */
    const bp = $('#btn-print');
    if (bp) bp.addEventListener('click', () => window.print());

    /* Écouter (bouton dans l'en-tête du poème) */
    const bl = $('#btn-listen');
    if (bl) bl.addEventListener('click', () => {
      const audio = $('#pl-audio');
      const playing = audio && !audio.paused && audio.dataset.slug === bl.dataset.slug;
      if (playing) { audio.pause(); syncListen(); return; }
      Player.setPlaylist([{
        slug: bl.dataset.slug, titre: bl.dataset.titre, interprete: bl.dataset.interprete,
        auteur: bl.dataset.auteur, audio: bl.dataset.audio
      }]);
      Player.play(bl.dataset.slug);
      syncListen();
    });
    function syncListen() {
      if (!bl) return;
      const audio = $('#pl-audio');
      const on = audio && !audio.paused && audio.dataset.slug === bl.dataset.slug;
      bl.classList.toggle('is-playing', !!on);
      bl.firstChild.nodeValue = on ? '⏸ En lecture ' : '▶︎ Écouter ';
    }
    if (bl) {
      $('#pl-audio').addEventListener('play', syncListen);
      $('#pl-audio').addEventListener('pause', syncListen);
    }

    /* Mode d'affichage des langues : bilingue / arabe seul / français seul */
    const MODE_KEY = 'qacidates-mode';
    function setMode(m) {
      poem.classList.remove('mode-ar', 'mode-fr');
      if (m === 'ar') poem.classList.add('mode-ar');
      if (m === 'fr') poem.classList.add('mode-fr');
      $$('.readmode__btn', poem).forEach((b) => b.setAttribute('aria-pressed', b.dataset.mode === m ? 'true' : 'false'));
      try { localStorage.setItem(MODE_KEY, m); } catch {}
    }
    $$('.readmode__btn', poem).forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
    let savedMode = 'both';
    try { savedMode = localStorage.getItem(MODE_KEY) || 'both'; } catch {}
    setMode(savedMode);

    /* Chercher un mot dans le poème (surlignage + compteur + navigation) */
    const findbar = $('#findbar');
    const findInput = $('#find-input');
    const findCount = $('#find-count');
    let marks = [], mi = -1;

    function clearMarks() {
      $$('mark.find-hit', poem).forEach((m) => {
        const t = document.createTextNode(m.textContent);
        m.parentNode.replaceChild(t, m);
      });
      poem.normalize();
      marks = []; mi = -1;
    }
    function focusMark(i) {
      marks.forEach((m) => m.classList.remove('is-current'));
      if (i < 0 || !marks[i]) return;
      marks[i].classList.add('is-current');
      marks[i].scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    function doFind(term) {
      clearMarks();
      const t = (term || '').trim();
      if (t.length < 2) { if (findCount) findCount.textContent = '0'; return; }
      const rx = new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const walker = document.createTreeWalker(poem, NodeFilter.SHOW_TEXT, null);
      const nodes = []; let n;
      while ((n = walker.nextNode())) {
        if (!n.nodeValue.trim()) continue;
        if (n.parentElement && n.parentElement.closest('.reader-bar, .findbar')) continue;
        nodes.push(n);
      }
      nodes.forEach((node) => {
        const txt = node.nodeValue;
        rx.lastIndex = 0;
        if (!rx.test(txt)) return;
        rx.lastIndex = 0;
        const frag = document.createDocumentFragment();
        let last = 0, m;
        while ((m = rx.exec(txt)) !== null) {
          frag.appendChild(document.createTextNode(txt.slice(last, m.index)));
          const mk = document.createElement('mark');
          mk.className = 'find-hit';
          mk.textContent = m[0];
          frag.appendChild(mk);
          last = m.index + m[0].length;
          if (m.index === rx.lastIndex) rx.lastIndex++;
        }
        frag.appendChild(document.createTextNode(txt.slice(last)));
        node.parentNode.replaceChild(frag, node);
      });
      marks = $$('mark.find-hit', poem);
      if (findCount) findCount.textContent = String(marks.length);
      mi = marks.length ? 0 : -1;
      focusMark(mi);
    }
    const btnFind = $('#btn-find');
    if (btnFind && findbar) {
      btnFind.addEventListener('click', () => {
        const open = findbar.hidden;
        findbar.hidden = !open;
        btnFind.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open && findInput) { findInput.focus(); if (findInput.value) doFind(findInput.value); }
        else doFind('');
      });
    }
    let ft = null;
    if (findInput) findInput.addEventListener('input', () => {
      clearTimeout(ft); ft = setTimeout(() => doFind(findInput.value), 220);
    });
    if (findInput) findInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); stepFind(e.shiftKey ? -1 : 1); }
      if (e.key === 'Escape') { doFind(''); findInput.value = ''; }
    });
    function stepFind(d) {
      if (!marks.length) return;
      mi = (mi + d + marks.length) % marks.length;
      focusMark(mi);
    }
    const fPrev = $('#find-prev'), fNext = $('#find-next'), fClose = $('#find-close');
    if (fPrev) fPrev.addEventListener('click', () => stepFind(-1));
    if (fNext) fNext.addEventListener('click', () => stepFind(1));
    if (fClose) fClose.addEventListener('click', () => { doFind(''); if (findInput) findInput.value = ''; if (findbar) findbar.hidden = true; if (btnFind) btnFind.setAttribute('aria-expanded', 'false'); });

    /* Marque-pages locaux */
    const BM_KEY = 'qacidates-bookmarks';
    const bmGet = () => { try { return JSON.parse(localStorage.getItem(BM_KEY) || '[]'); } catch { return []; } };
    const bmSet = (l) => { try { localStorage.setItem(BM_KEY, JSON.stringify(l)); } catch {} };

    /* Page « Mes qacidates » : rendu de la liste enregistrée */
    const bmBox = $('#bm-list');
    if (bmBox) {
      const cnt = $('#bm-count');
      const clr = $('#bm-clear');
      const draw = () => {
        const l = bmGet();
        if (cnt) cnt.innerHTML = '<b>' + l.length + '</b> poème' + (l.length > 1 ? 's' : '');
        if (!l.length) {
          bmBox.innerHTML = '<p class="bm-empty">Aucune qacidate enregistrée pour l\'instant.<br>Ouvrez un poème et cliquez sur <strong>☆ Enregistrer</strong>.</p>';
          if (clr) clr.hidden = true;
          return;
        }
        if (clr) clr.hidden = false;
        bmBox.innerHTML = l.map((x) => `<a class="bm-item" href="${esc(BASE + '/q/' + encodeURIComponent(x.slug))}">`
          + (x.image ? `<img src="${esc(x.image)}" alt="" loading="lazy">` : '')
          + `<span><b>${esc(x.titre)}</b>${x.titre_ar ? `<small>${esc(x.titre_ar)}</small>` : ''}</span></a>`).join('');
      };
      if (clr) clr.addEventListener('click', () => {
        if (window.confirm('Retirer toutes les qacidates enregistrées ?')) { bmSet([]); draw(); }
      });
      draw();
    }
    const btnBm = $('#btn-bookmark');
    if (btnBm) {
      const slug = (document.body.dataset.base || '') && (poem.dataset.slug || '');
      const slug2 = document.querySelector('link[rel=canonical]');
      const key = slug2 ? decodeURIComponent(slug2.href.split('/').pop()) : '';
      const sync = () => {
        const on = bmGet().some((x) => x.slug === key);
        btnBm.setAttribute('aria-pressed', on ? 'true' : 'false');
        btnBm.textContent = on ? '★ Enregistré' : '☆ Enregistrer';
      };
      btnBm.addEventListener('click', () => {
        const liste = bmGet();
        const i = liste.findIndex((x) => x.slug === key);
        if (i >= 0) { liste.splice(i, 1); toast('Retiré de mes qacidates'); }
        else {
          const t = $('.poem__title-fr', poem);
          const a = $('.poem__title-ar', poem);
          const img = $('.poem__person img', poem);
          liste.unshift({ slug: key, titre: t ? t.textContent.trim() : key, titre_ar: a ? a.textContent.trim() : '', image: img ? img.getAttribute('src') : '' });
          toast('Ajouté à mes qacidates');
        }
        bmSet(liste.slice(0, 200));
        sync();
      });
      sync();
    }

    /* Copier le refrain */
    const bc = $('#btn-copy');
    if (bc) bc.addEventListener('click', async () => {
      const parts = [];
      const t = $('.poem__title-fr', poem); if (t) parts.push(t.textContent.trim());
      const fr = $('.refrain__fr', poem); if (fr) parts.push(fr.textContent.trim());
      const ar = $('.refrain__ar', poem); if (ar) parts.push(ar.textContent.trim());
      if (!parts.length) { toast('Aucun refrain à copier'); return; }
      try {
        await navigator.clipboard.writeText(parts.join('\n'));
        toast('Refrain copié');
      } catch { toast('Copie impossible'); }
    });

    /* Partager */
    const bs = $('#btn-share');
    if (bs) bs.addEventListener('click', async () => {
      const titre = ($('.poem__title-fr', poem) || {}).textContent || document.title;
      const url = window.location.href;
      if (navigator.share) {
        try { await navigator.share({ title: titre.trim(), url }); return; } catch {}
      }
      try { await navigator.clipboard.writeText(url); toast('Lien copié'); }
      catch { toast('Copie impossible'); }
    });
  })();

  /* Pagination serveur : rien à faire (vrais liens).
     Sur la liste en rendu serveur il n'y a pas de conteneur « détail » :
     on ne lance pas le routeur, on reprend la main côté client pour la liste. */
  if (viewList) {
    loadFacets();
    if (viewDetail) route();
    else loadList();
  } else {
    loadFacetsSilent();
  }

  async function loadFacetsSilent() {
    if (chipsEl) return;
    try { await loadFacets(); } catch {}
  }
})();

/* ═══════════════════════════════════════════════════════════════
   Sommaire de la qacidate : hauteur de la barre du haut (pour que
   le sommaire colle sous elle) et surlignage du chapitre en cours.
   ═══════════════════════════════════════════════════════════════ */
function initChapitres() {
  const bar = document.querySelector('.topbar');
  const majHauteurBarre = () => {
    if (!bar) return;
    document.documentElement.style.setProperty(
      '--topbar-h', Math.round(bar.getBoundingClientRect().height) + 'px');
  };
  majHauteurBarre();

  const nav = document.getElementById('chapitres');
  if (!nav) return;

  const liens = Array.from(nav.querySelectorAll('.chap-btn'));
  const cibles = liens.map((a) => {
    const href = a.getAttribute('href') || '';
    const id = href.replace(/^#/, '');
    return id ? document.getElementById(id) : null;
  });
  if (!cibles.some(Boolean)) return;

  if (liens.length > 6) nav.classList.add('is-compact');
  else nav.classList.remove('is-compact');

  const seuil = () => {
    const v = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--topbar-h')) || 58;
    return v + 96;
  };

  let frame = 0;
  const surligner = () => {
    frame = 0;
    const y = seuil();
    let actif = 0;
    cibles.forEach((el, idx) => {
      if (el && el.getBoundingClientRect().top <= y) actif = idx;
    });
    liens.forEach((a, idx) => a.classList.toggle('is-active', idx === actif));
    const bouton = liens[actif];
    if (bouton) {
      const r = bouton.getBoundingClientRect();
      const p = nav.getBoundingClientRect();
      if (r.left < p.left || r.right > p.right) {
        const piste = nav.querySelector('.chapitres__inner');
        if (piste) piste.scrollTo({ left: bouton.offsetLeft - 60, behavior: 'smooth' });
      }
    }
  };
  const surDemande = () => { if (!frame) frame = requestAnimationFrame(surligner); };

  if (!window._chapScrollBound) {
    window._chapScrollBound = true;
    addEventListener('scroll', surDemande, { passive: true });
    addEventListener('resize', majHauteurBarre);
  }

  liens.forEach((a) => {
    if (a._chapClick) return;
    a._chapClick = true;
    a.addEventListener('click', (ev) => {
      const id = (a.getAttribute('href') || '').replace(/^#/, '');
      const el = id ? document.getElementById(id) : null;
      if (el) {
        ev.preventDefault();
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
  surligner();
}
window.initChapitres = initChapitres;
initChapitres();



/* ── Bouton remonter en haut ── */
(function () {
  function ensureBtn() {
    var b = document.getElementById('btn-back-top');
    if (b) return b;
    b = document.createElement('button');
    b.id = 'btn-back-top';
    b.type = 'button';
    b.className = 'back-top';
    b.setAttribute('aria-label', 'Remonter en haut de page');
    b.innerHTML = '↑<span class="back-top__lbl">Haut</span>';
    b.hidden = true;
    document.body.appendChild(b);
    b.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    return b;
  }
  function onScroll() {
    var b = ensureBtn();
    var show = window.scrollY > 480;
    b.hidden = !show;
    b.classList.toggle('is-visible', show);
  }
  ensureBtn();
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();


/* Partage — copier le lien */
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-share-copy], #btn-share-copy');
  if (!btn) return;
  e.preventDefault();
  const url = btn.getAttribute('data-url') || location.href;
  const title = btn.getAttribute('data-title') || document.title;
  const done = () => {
    const t = btn.textContent;
    btn.textContent = '✓ Copié';
    btn.classList.add('is-copied');
    setTimeout(() => { btn.textContent = t; btn.classList.remove('is-copied'); }, 1800);
  };
  if (navigator.share) {
    navigator.share({ title, url }).then(done).catch(() => {
      (navigator.clipboard && navigator.clipboard.writeText(url) || Promise.reject()).then(done).catch(() => prompt('Copier ce lien :', url));
    });
  } else if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(done).catch(() => prompt('Copier ce lien :', url));
  } else {
    prompt('Copier ce lien :', url);
  }
});
