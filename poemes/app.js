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
  const THEMES = ['parchemin', 'zellige', 'nuit'];

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
    facets: { interpretes: [], themes: [], total: 0 },
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
    if (meta) meta.setAttribute('content', name === 'nuit' ? '#0f0d0a' : (name === 'zellige' ? '#e9eff1' : '#f4efe3'));
    $('.themepick').setAttribute('title', 'Ambiance : ' + name);
    try { localStorage.setItem('qacidates-theme', name); } catch {}
  }
  (function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem('qacidates-theme'); } catch {}
    if (!saved) saved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'nuit' : 'parchemin';
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

    audio.addEventListener('play', syncPlayBtn);
    audio.addEventListener('pause', syncPlayBtn);
    audio.addEventListener('ended', () => step(1));
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
      $('#footer-meta').textContent =
        `${d.total} qacidate(s) · ${d.interpretes.length} interprète(s) · ${d.themes.length} thème(s)`;

      $('#footer-interpretes').innerHTML = d.interpretes.slice(0, 5)
        .map((i) => `<li><a href="#" data-interprete-link="${esc(i.nom)}">${esc(i.nom)} <span class="n">(${i.count})</span></a></li>`).join('');
      $('#footer-themes').innerHTML = d.themes.slice(0, 5)
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
      (item.auteur ? `<b>${esc(item.auteur)}</b>` : '<i>Auteur inconnu</i>') +
      (item.interprete ? ` · <span>${esc(item.interprete)}</span>` : '');

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
    const { manuscript = false, images = [], placeholder = '' } = opts;

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
        ${lines.map((l) => `<p>${esc(l)}</p>`).join('')}
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
      <div class="ornament" aria-hidden="true">❖</div>
      <section class="chant">
        <div class="chant__head"><p class="chant__label-ar" dir="rtl" lang="ar">الأسماء</p><h3 class="chant__label-fr">Les noms cités</h3></div>
        <ul class="facts">${d.noms.map((n) => `<li><i aria-hidden="true">${esc(n.emoji || '❖')}</i>
          <div><b>${esc(n.nom_fr || '')} ${n.nom_ar ? '· ' + esc(n.nom_ar) : ''}</b><span>${esc(n.description_fr || '')}</span></div></li>`).join('')}</ul>
      </section>` : '';

    const chants = (d.sections || []).map((s) => {
      const linesAr = s.lines_ar || [];
      const linesFr = s.lines_fr || [];
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
            placeholder: arHas ? 'Traduction française à venir.' : ''
          })}
          ${leafBlock('ar', linesAr, 'العربية', {
            manuscript: !!s.ar_is_image,
            images: s.images || [],
            placeholder: frHas ? 'النص العربي غير متوفر.' : ''
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
      </header>
      ${(refAr || refFr) ? `
        <div class="ornament" aria-hidden="true">﴿ ❖ ﴾</div>
        <section class="refrain" aria-label="Refrain">
          <p class="refrain__label">Refrain</p>
          <div class="refrain__grid">
            ${refFr ? `<div class="refrain__col"><h3>Français</h3><div class="refrain__fr">${refFr}</div></div>` : ''}
            ${refAr ? `<div class="refrain__col"><h3>العربية</h3><div class="refrain__ar" dir="rtl" lang="ar">${refAr}</div></div>` : ''}
          </div>
        </section>` : ''}
      ${facts ? `<ul class="facts">${facts}</ul>` : ''}
      ${chants}
      ${noms}
      <nav class="poem__nav" aria-label="Navigation entre qacidates">
        ${navItem('prev', d.navigation && d.navigation.prev)}
        ${navItem('next', d.navigation && d.navigation.next)}
      </nav>
      <div class="reader-bar" role="toolbar" aria-label="Confort de lecture">
        <div class="reader-bar__inner">
          ${it.audio ? `<button type="button" id="btn-listen" aria-pressed="false">▶︎ Écouter</button><span class="reader-bar__sep" aria-hidden="true"></span>` : ''}
          <button type="button" id="fs-minus" aria-label="Réduire la taille du texte">A−</button>
          <button type="button" id="fs-reset" aria-label="Taille normale">A</button>
          <button type="button" id="fs-plus" aria-label="Augmenter la taille du texte">A+</button>
          <span class="reader-bar__sep" aria-hidden="true"></span>
          <button type="button" id="btn-print" aria-label="Imprimer ce poème">🖨️ Imprimer</button>
        </div>
      </div>
      ${related}`;

    poemEl.querySelector('[data-route="list"]').addEventListener('click', () => go('#/'));

    const setFs = (v) => {
      state.fs = Math.min(1.5, Math.max(.85, v));
      $$('.leaves', poemEl).forEach((el) => el.style.setProperty('--fs', state.fs));
      try { localStorage.setItem('qacidates-fs', String(state.fs)); } catch {}
    };
    $('#fs-minus').addEventListener('click', () => setFs(state.fs - 0.08));
    $('#fs-plus').addEventListener('click', () => setFs(state.fs + 0.08));
    $('#fs-reset').addEventListener('click', () => setFs(1));
    $('#btn-print').addEventListener('click', () => window.print());

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
        q: state.q, interprete: state.interprete, theme: state.theme, sort: state.sort,
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

  $('#footer-interpretes').addEventListener('click', (e) => {
    const a = e.target.closest('[data-interprete-link]'); if (!a) return;
    e.preventDefault();
    state.interprete = a.dataset.interpreteLink; state.page = 1;
    go('#/');
    $$('.chip', chipsEl).forEach((c) => c.setAttribute('aria-pressed', c.dataset.interprete === state.interprete ? 'true' : 'false'));
    refreshResetBtn(); loadList(); window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  $('#footer-themes').addEventListener('click', (e) => {
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
    debounce(() => { state.q = v; state.page = 1; refreshResetBtn(); loadList(); });
  });
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
