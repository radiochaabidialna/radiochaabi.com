/* qacid-card-polish */
/**
 * Chaabi qacid — i18n dynamique FR/AR (sans rechargement)
 * Optimisé : bascule instantanée menu, ancres, boutons, titres
 */
(function () {
  'use strict';
  var BASE = '../..';
  var appliedOnce = false;

  var ANCHOR_AR = {
    'Toutes': 'جميع',
    'Introduction': 'مقدمة',
    'Refrain': 'لازمة',
    'Muqaddima': 'مقدمة',
    'Final': 'الختام',
    'Conclusion': 'الخاتمة',
    'Khamasa': 'خمسة',
    'Bayt I': 'البيت ١',
    'Bayt II': 'البيت ٢',
    'Bayt III': 'البيت ٣',
    'I. Bayt 1': '١. البيت ١',
    'II. Bayt 2': '٢. البيت ٢',
    'III. Bayt 3': '٣. البيت ٣',
    'IV. Bayt 4': '٤. البيت ٤',
    'V. Bayt 5': '٥. البيت ٥',
    'VI. Final': '٦. الختام',
    "I. La Visite": '١. الزيارة',
    "II. La Nuit": '٢. الليل',
    "III. L'Orgueil": '٣. الكبرياء',
    "IV. La Révélation": '٤. الكشف',
    "V. La Gazelle": '٥. الغزالة',
    "VI. Le Maître": '٦. الشيخ',
    "I. L'Apparition": '١. الظهور',
    "II. La Parure": '٢. الزينة',
    "III. La Rencontre": '٣. اللقاء',
    "III. La Procession": '٣. الموكب',
    "IV. Les Beautés": '٤. الحسان',
    "IV. L'Invitation": '٤. الدعوة',
    "V. Le Jardin": '٥. البستان',
    "V. Les Beautés": '٥. الحسان',
    "VI. L'Ivresse": '٦. السكر',
    "VI. Le Jardin": '٦. البستان',
    "VII. L'Auteur": '٧. المؤلف',
    "I. Le Procès": '١. المحاكمة',
    "I. L'Érudit": '١. العالم',
    "II. Le Cerbère": '٢. الحارس',
    "I. Le Cerbère": '١. الحارس',
    "III. Le Qadi": '٣. القاضي',
    "IV. Sidi Rahhal": '٤. سيدي رحال',
    "V. Les Musiciennes": '٥. العازفات',
    "VI. La Fin": '٦. النهاية',
    "I. Jeunesse": '١. الشباب',
    "II. La Mer": '٢. البحر',
    "III. Le Déclin": '٣. الأفول',
    "I. Le Sommeil": '١. النوم',
    "II. La Langueur": '٢. الفتور',
    "III. La Violette": '٣. البنفسج',
    "I. L'Amitié": '١. الصداقة',
    "I. Le Censeur": '١. العذول',
    "I. Le Défi": '١. التحدي',
    "I. Le Passé": '١. الماضي',
    "II. L'Exil": '٢. الغربة',
    "II. La Défense": '٢. الدفاع',
    "II. La Jeune Vierge": '٢. العذراء',
    "II. La Trahison": '٢. الخيانة',
    "II. Le Débat": '٢. الجدال',
    "II. Le Médecin": '٢. الطبيب',
    "II. Les Types": '٢. الأصناف',
    "III. L'Abandon": '٣. الهجر',
    "III. La Passion": '٣. العشق',
    "III. La Preuve": '٣. الدليل',
    "III. La Prière": '٣. الصلاة',
    "III. La Vieille Femme": '٣. العجوز',
    "III. Le Verdict": '٣. الحكم',
    "III. Les Amis": '٣. الأصحاب',
    "IV. La Bédouine": '٤. البدوية',
    "IV. La Fête": '٤. الفرح',
    "IV. Le Bonheur Perdu": '٤. السعادة الضائعة',
    "IV. Le Maître": '٤. الشيخ',
    "IV. Les Coupes": '٤. الكؤوس',
    "IV. Les Traîtres": '٤. الخونة',
    "V. L'Abandon": '٥. الهجر',
    "V. L'Auteur": '٥. المؤلف',
    "V. La Misère": '٥. البؤس',
    "V. Le Gnaoui": '٥. القناوي',
    "VI. La Foi": '٦. الإيمان',
    "VI. La Sagesse": '٦. الحكمة',
    "VII. La Sagesse": '٧. الحكمة'
  };

  var T = {
    fr: {
      home: 'Accueil', artists: 'Artistes', songs: 'Chansons', shows: 'Émissions',
      interviews: 'Interviews', qacidates: 'Qacidates', proverbs: 'Bouqalla',
      dedicaces: 'Dédicaces', comments: 'Commentaires', contacts: 'Contacts',
      back: 'Retour aux qacidates',
      listen: 'Écouter cette qacidate', radio: 'Radio Chaabi', all: 'Toutes les qacidates',
      prev: '← Précédent', next: 'Suivant →',
      badge: 'CHAABI ALGÉRIEN • SPIRITUEL',
      read: 'Lire la qacida', youtube: 'YouTube',
      bio: "Biographie de l'artiste",
      other: 'Autres qacidates',
      all_q: 'Toutes les qacidates',
      arabic_ver: 'Version arabe',
      part: 'Partie',
      interpreters: 'Interprètes',
      author: 'Auteur',
      end: 'Fin de la qacidate',
      no_audio: 'Fichier audio non disponible',
      onair: 'On Air'
    },
    ar: {
      home: 'الرئيسية', artists: 'فنانون', songs: 'أغانٍ', shows: 'برامج',
      interviews: 'مقابلات', qacidates: 'قصائد', proverbs: 'بوقالة',
      dedicaces: 'إهداءات', comments: 'تعليقات', contacts: 'اتصل بنا',
      back: 'العودة إلى القصائد',
      listen: 'استمع إلى هذه القصيدة', radio: 'راديو الشعبي', all: 'كل القصائد',
      prev: '→ السابق', next: 'التالي ←',
      badge: 'شعبي جزائري • روحي',
      read: 'اقرأ القصيدة', youtube: 'يوتيوب',
      bio: 'سيرة الفنان',
      other: 'قصائد أخرى',
      all_q: 'كل القصائد',
      arabic_ver: 'النسخة العربية',
      part: 'الجزء',
      interpreters: 'المؤدون',
      author: 'المؤلف',
      end: 'نهاية القصيدة',
      no_audio: 'الملف الصوتي غير متوفر',
      onair: 'على الهواء'
    }
  };

  var HREF_MAP = [
    { re: /index\.html$/, key: 'home' },
    { re: /#artistes/, key: 'artists' },
    { re: /#chansons/, key: 'songs' },
    { re: /#emissions/, key: 'shows' },
    { re: /#interviews/, key: 'interviews' },
    { re: /qacidates\.html$/, key: 'qacidates' },
    { re: /#bouqalla/, key: 'proverbs' },
    { re: /#dedicaces/, key: 'dedicaces' },
    { re: /#commentaires/, key: 'comments' },
    { re: /#contacts/, key: 'contacts' }
  ];

  var TEXT_TABLE = {
    'CHAABI ALGÉRIEN • SPIRITUEL': 'badge',
    'LIRE LA QACIDA': 'read',
    'Lire la qacida': 'read',
    'YOUTUBE': 'youtube',
    'YouTube': 'youtube',
    "Biographie de l'Artiste": 'bio',
    "Biographie de l'artiste": 'bio',
    'Autres Qacidattes': 'other',
    'Autres Qacidates': 'other',
    'Toutes les qacidattes': 'all_q',
    'Toutes les qacidates': 'all_q',
    'Fin de la Qacidatte': 'end',
    'Fin de la qacidate': 'end',
    'Fichier audio non disponible': 'no_audio',
    'Interprètes légendaires': 'interpreters'
  };

  function getLang() {
    try {
      var s = localStorage.getItem('chaabi_lang') || localStorage.getItem('rc_lang');
      if (s === 'ar' || s === 'fr') return s;
    } catch (e) {}
    return 'fr';
  }

  function t(key, lang) {
    lang = lang || getLang();
    return (T[lang] && T[lang][key]) || (T.fr && T.fr[key]) || key;
  }

  /**
   * Bascule FR/AR SANS rechargement (rapide).
   * Sauvegarde localStorage pour les autres pages.
   */
  function changeLang(l) {
    if (l !== 'fr' && l !== 'ar') return;
    if (l === getLang() && appliedOnce) {
      applyChromeLang();
      return;
    }
    try {
      localStorage.setItem('chaabi_lang', l);
      localStorage.setItem('rc_lang', l);
    } catch (e) {}
    applyChromeLang();
    // Footer bilingue
    try {
      if (typeof window.refreshFooter === 'function') window.refreshFooter();
      else if (typeof window.applyFooterI18n === 'function') window.applyFooterI18n();
    } catch (e) {}
  }
  window.setLangQ = changeLang;
  window.setLanguage = changeLang;
  window.setLang = changeLang;
  window.qT = t;
  window.getQLang = getLang;
  window.applyQacidLang = applyChromeLang;

  function setTextPreserveIcons(el, text) {
    if (!el) return;
    var icons = el.querySelectorAll('i, svg');
    if (!icons.length) {
      el.textContent = text;
      return;
    }
    var html = '';
    for (var i = 0; i < icons.length; i++) html += icons[i].outerHTML + ' ';
    el.innerHTML = html + text;
  }

  function plainText(el) {
    var c = el.cloneNode(true);
    var ics = c.querySelectorAll('i, svg');
    for (var i = 0; i < ics.length; i++) {
      if (ics[i].parentNode) ics[i].parentNode.removeChild(ics[i]);
    }
    return (c.textContent || '').replace(/\s+/g, ' ').trim();
  }

  /** Mémorise les textes FR une seule fois */
  function snapshotFr() {
    if (appliedOnce) return;
    document.querySelectorAll('.anchor-nav a, .anchor-btn').forEach(function (a) {
      if (!a.getAttribute('data-label-fr')) a.setAttribute('data-label-fr', plainText(a));
    });
    document.querySelectorAll('.image-label').forEach(function (el) {
      if (!el.getAttribute('data-label-fr')) el.setAttribute('data-label-fr', plainText(el));
    });
    document.querySelectorAll('[data-i18n], [data-i18n-q]').forEach(function (el) {
      if (!el.getAttribute('data-fr')) el.setAttribute('data-fr', plainText(el));
    });
    // UI texts matched by table
    document.querySelectorAll('div, span, p, a, h3, button').forEach(function (el) {
      if (el.closest && el.closest('#chaabi-topnav, #chaabi-mob, #chaabi-back, .qacid-pager, .qacid-listen')) return;
      if (el.children.length > 3) return;
      var raw = plainText(el);
      if (TEXT_TABLE[raw] && !el.getAttribute('data-i18n-key')) {
        el.setAttribute('data-i18n-key', TEXT_TABLE[raw]);
        el.setAttribute('data-fr', raw);
      }
    });
    document.querySelectorAll('p, span, div').forEach(function (el) {
      if (el.children.length > 1) return;
      var tx = (el.textContent || '').trim();
      if (/^Auteur\s*:/i.test(tx) && !el.getAttribute('data-author-rest')) {
        el.setAttribute('data-author-rest', tx.replace(/^Auteur\s*:/i, ''));
        el.setAttribute('data-i18n-key', 'author_line');
      }
    });
    appliedOnce = true;
  }

  function applyChromeLang() {
    snapshotFr();
    var lang = getLang();
    document.documentElement.lang = lang;
    document.documentElement.classList.toggle('lang-ar', lang === 'ar');
    document.documentElement.classList.toggle('lang-fr', lang === 'fr');
    if (document.body) document.body.classList.toggle('lang-ar', lang === 'ar');

    // Boutons langue
    document.querySelectorAll('.lang-opt').forEach(function (btn) {
      var on = btn.getAttribute('data-lang') === lang;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

    // data-i18n
    document.querySelectorAll('[data-i18n], [data-i18n-q]').forEach(function (el) {
      var key = el.getAttribute('data-i18n') || el.getAttribute('data-i18n-q');
      if (key && T.fr[key]) setTextPreserveIcons(el, t(key, lang));
    });

    // Menu
    document.querySelectorAll('#chaabi-topnav a, #chaabi-mob a').forEach(function (a) {
      var href = a.getAttribute('href') || '';
      for (var i = 0; i < HREF_MAP.length; i++) {
        if (HREF_MAP[i].re.test(href)) {
          var lbl = a.querySelector('.lbl, span.lbl, span[data-i18n]');
          if (lbl) lbl.textContent = t(HREF_MAP[i].key, lang);
          else setTextPreserveIcons(a, t(HREF_MAP[i].key, lang));
          break;
        }
      }
    });

    // Retour
    var back = document.querySelector('#chaabi-back a');
    if (back) {
      var arrow = lang === 'ar' ? 'fa-arrow-right' : 'fa-arrow-left';
      back.innerHTML = '<i class="fas ' + arrow + '"></i> ' + t('back', lang);
    }

    // Listen / pager
    document.querySelectorAll('.qacid-listen a').forEach(function (a) {
      var href = a.getAttribute('href') || '';
      var onclick = a.getAttribute('onclick') || '';
      var ic = a.querySelector('i');
      var icHtml = ic ? ic.outerHTML + ' ' : '';
      if (href.indexOf('#mini-player') >= 0 || onclick.indexOf('togglePlay') >= 0) {
        a.innerHTML = icHtml + t('listen', lang);
      } else if (href.indexOf('index.html') >= 0) {
        a.innerHTML = icHtml + t('radio', lang);
      } else if (href.indexOf('qacidates.html') >= 0) {
        a.innerHTML = icHtml + t('all', lang);
      }
    });
    document.querySelectorAll('.qacid-pager .pg-label').forEach(function (el) {
      var parent = el.closest('a');
      el.textContent = (parent && parent.classList.contains('pg-next')) ? t('next', lang) : t('prev', lang);
    });

    // Ancres
    document.querySelectorAll('.anchor-nav a, .anchor-btn').forEach(function (a) {
      var fr = a.getAttribute('data-label-fr') || '';
      var ar = a.getAttribute('data-label-ar') || ANCHOR_AR[fr] || '';
      var ic = a.querySelector('i');
      var icHtml = ic ? ic.outerHTML + ' ' : '';
      a.innerHTML = icHtml + ((lang === 'ar' && ar) ? ar : fr);
    });

    // Labels image
    document.querySelectorAll('.image-label').forEach(function (el) {
      var fr = el.getAttribute('data-label-fr') || plainText(el);
      var m = fr.match(/Partie\s*([IVXLC0-9]+)/i);
      var num = m ? m[1] : '';
      var ic = el.querySelector('i');
      var icHtml = ic ? ic.outerHTML + ' ' : '';
      if (lang === 'ar') {
        el.innerHTML = icHtml + t('arabic_ver', lang) + (num ? ' — ' + t('part', lang) + ' ' + num : '');
      } else {
        el.innerHTML = icHtml + fr.replace(/^\s*/, '');
        // restore original structure simply
        if (fr) {
          var only = fr;
          el.innerHTML = icHtml + only;
        }
      }
    });

    // UI keys mémorisés
    document.querySelectorAll('[data-i18n-key]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-key');
      if (key === 'author_line') {
        var rest = el.getAttribute('data-author-rest') || '';
        el.textContent = t('author', lang) + ' :' + rest;
        return;
      }
      if (T.fr[key]) setTextPreserveIcons(el, t(key, lang));
    });

    // Titres FR/AR
    document.querySelectorAll('.title-wrapper, .header-content').forEach(function (wrap) {
      var arTitle = wrap.querySelector('.arabic-title');
      var frTitle = wrap.querySelector('.title');
      if (arTitle && frTitle) {
        if (lang === 'ar') {
          frTitle.style.opacity = '0.75';
          frTitle.style.fontSize = '0.85em';
        } else {
          frTitle.style.opacity = '';
          frTitle.style.fontSize = '';
        }
      }
    });
  }

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function ensureFooterRoot() {
    var root = document.getElementById('footer-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'footer-root';
      document.body.appendChild(root);
    }
    return root;
  }

  function tryInjectFooter(attempt) {
    attempt = attempt || 0;
    ensureFooterRoot();
    try {
      if (typeof window.refreshFooter === 'function') {
        window.refreshFooter();
        return true;
      }
      if (typeof window.injectChaabiFooter === 'function') {
        window.injectChaabiFooter();
        return true;
      }
      if (typeof window.applyFooterTheme === 'function') {
        window.applyFooterTheme();
        return true;
      }
    } catch (e) {}
    if (attempt < 8) {
      setTimeout(function () { tryInjectFooter(attempt + 1); }, 120 + attempt * 80);
    }
    return false;
  }

  function siteRoot() {
    try {
      var path = location.pathname || '';
      var i = path.toLowerCase().indexOf('/qacid/');
      if (i >= 0) return path.substring(0, i) || '';
      if (/\.html?$/i.test(path)) {
        return path.replace(/\/[^\/]*$/, '') || '';
      }
      return path.replace(/\/$/, '') || '';
    } catch (e) {
      return '';
    }
  }

  function loadFooterScript() {
    ensureFooterRoot();
    if (document.querySelector('script[data-chaabi-footer="1"]')) {
      tryInjectFooter(0);
      return;
    }
    var root = siteRoot();
    var candidates = [];
    if (root) candidates.push(root + '/footer.js');
    candidates.push('../../footer.js');
    candidates.push('../footer.js');
    candidates.push('/footer.js');
    // relative from current folder depth
    candidates.push(BASE.replace(/\/$/, '') + '/footer.js');

    var tried = 0;
    function tryNext() {
      if (tried >= candidates.length) {
        console.warn('[chaabi] footer.js introuvable');
        return;
      }
      var src = candidates[tried++];
      var fs = document.createElement('script');
      fs.src = src;
      fs.setAttribute('data-chaabi-footer', '1');
      fs.onload = function () {
        tryInjectFooter(0);
        setTimeout(function () { tryInjectFooter(0); applyChromeLang(); }, 150);
        setTimeout(function () { tryInjectFooter(0); }, 500);
      };
      fs.onerror = function () {
        fs.remove();
        tryNext();
      };
      document.body.appendChild(fs);
    }
    tryNext();
  }

  function injectLiveBar() {
    if (document.getElementById('chaabi-livebar')) return;
    var title = (document.title || 'Qacidate').split('|')[0].trim();
    var arEl = document.querySelector('.arabic-title, .poem-arabic, h1');
    var arBit = arEl ? (arEl.textContent || '').trim().slice(0, 40) : '';
    var msg = '✦ ' + title + (arBit ? '  ·  ' + arBit : '') +
      '  ·  Radio Chaabi Dialna  ·  تراث الشعبي الجزائري  ·  ';
    var bar = document.createElement('div');
    bar.id = 'chaabi-livebar';
    bar.setAttribute('role', 'marquee');
    bar.innerHTML =
      '<div class="clb-inner"><span class="clb-track">' +
      msg + msg +
      '</span></div>';
    var nav = document.getElementById('chaabi-topnav');
    if (nav && nav.parentNode) {
      if (nav.nextSibling) nav.parentNode.insertBefore(bar, nav.nextSibling);
      else nav.parentNode.appendChild(bar);
    } else {
      document.body.insertBefore(bar, document.body.firstChild);
    }
  }

  ready(function () {
    applyChromeLang();
    injectLiveBar();

    var burger = document.getElementById('chaabi-burger');
    var mob = document.getElementById('chaabi-mob');
    if (burger && mob) {
      burger.addEventListener('click', function () {
        var open = mob.classList.toggle('open');
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
        burger.innerHTML = open ? '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
      });
    }

    // Ne jamais masquer le chrome Chaabi
    document.querySelectorAll('#chaabi-topnav, #chaabi-livebar, #chaabi-back, #chaabi-mob, #footer-root').forEach(function (el) {
      el.style.removeProperty('display');
      el.style.setProperty('visibility', 'visible', 'important');
    });
    document.querySelectorAll('body > nav.navbar, body > .navbar').forEach(function (el) {
      el.style.setProperty('display', 'none', 'important');
    });
    document.querySelectorAll('header.header').forEach(function (el) {
      el.style.removeProperty('display');
    });

    loadFooterScript();
    // Re-try footer after slow networks
    setTimeout(function () { tryInjectFooter(0); }, 400);
    setTimeout(function () { tryInjectFooter(0); applyChromeLang(); }, 1200);
  });
})();
