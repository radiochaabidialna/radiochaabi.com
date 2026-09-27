/* ══════════════════════════════════════════════════════════════════
   CHAABI MUSIC — footer.js (adapté pour news_qacidates)
   Footer global injecté dans <div id="footer-root"></div>
   BILINGUE FR/AR — synchronisé avec QAi18n
   ══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* Racine site : depuis qacid/xxx/ → '../..' */
  var FOOTER_ROOT = (function () {
    try {
      var p = location.pathname || '';
      if (/\/qacid\//i.test(p)) return '../..';
      if (/\/admin\//i.test(p)) return '..';
      if (/\/poemes\//i.test(p)) return '..';   /* module Poemes : un cran au-dessus */
    } catch (e) {}
    return '';
  })();
  function fhref(path) {
    if (!path) return FOOTER_ROOT || './';
    if (/^https?:\/\//i.test(path) || path.charAt(0) === '#') return path;
    if (FOOTER_ROOT) return FOOTER_ROOT.replace(/\/$/, '') + '/' + path.replace(/^\//, '');
    return path;
  }

  /* ── Traductions ── */
  var i18nFooter = {
    fr: {
      col_radiochaabi   : 'Chaabi Music',
      col_chaabi        : 'Chaabi',
      col_divers        : 'Divers',
      col_autres        : 'Autres',
      nav_emissions     : 'Émissions Chaabi',
      nav_artistes      : 'Artistes',
      nav_chansons      : 'Chansons',
      nav_interviews    : 'Interviews',
      nav_bouqalla      : 'Bouqalla',
      nav_dedicaces     : 'Dédicaces',
      nav_qacidates     : 'Qacidates',
      nav_contact       : 'Contact',
      nav_commentaires  : 'Commentaires',
      stat_artistes     : '120+ Artistes',
      stat_chansons     : '400+ Chansons',
      stat_interviews   : '26 Interviews',
      stat_emissions    : '60 Émissions historiques',
      desc_artistes     : '120+ Artistes',
      desc_chansons     : '400+ Chansons',
      desc_interviews   : '26 Interviews',
      desc_bouqalla     : 'Dictionnaire chaabi',
      desc_dedicaces    : 'Partagez vos dédicaces',
      desc_qacidates    : '36 Qacidates',
      desc_contact      : 'Écrivez-nous',
      desc_commentaires : 'Vos avis sur la radio',
      footer_desc       : 'La musique populaire algérienne',
      nav_admin         : 'Administration',
      suivez_nous       : 'Suivez-nous :',
      copyright         : '© 2024',
      patrimoine_fr     : 'Patrimoine Musical Algérien',
      patrimoine_ar_txt : 'التراث الشعبي الجزائري',
      preserve          : 'Préservons ensemble notre patrimoine musical',
      visiteurs         : 'Visiteurs',
      en_ligne          : 'En ligne',
    },
    ar: {
      col_radiochaabi   : 'موسيقى الشعبي',
      col_chaabi        : 'الشعبي',
      col_divers        : 'متنوع',
      col_autres        : 'أخرى',
      nav_emissions     : 'البرامج الإذاعية',
      nav_artistes      : 'الفنانون',
      nav_chansons      : 'الأغاني',
      nav_interviews    : 'المقابلات',
      nav_bouqalla      : 'البوقالة',
      nav_dedicaces     : 'الإهداءات',
      nav_qacidates     : 'القصائد',
      nav_contact       : 'اتصل بنا',
      nav_commentaires  : 'التعليقات',
      stat_artistes     : '١٢٠+ فنان',
      stat_chansons     : '٤٠٠+ أغنية',
      stat_interviews   : '٢٦ مقابلة',
      stat_emissions    : '٦٠ حصة تاريخية',
      desc_artistes     : '١٢٠+ فنان',
      desc_chansons     : '٤٠٠+ أغنية',
      desc_interviews   : '٢٦ مقابلة',
      desc_bouqalla     : 'قاموس الشعبي',
      desc_dedicaces    : 'شاركوا إهداءاتكم',
      desc_qacidates    : '٣٦ قصيدة',
      desc_contact      : 'راسلونا',
      desc_commentaires : 'آراؤكم عن الراديو',
      footer_desc       : 'الموسيقى الشعبية الجزائرية',
      nav_admin         : 'الإدارة',
      suivez_nous       : 'تابعونا :',
      copyright         : '© ٢٠٢٤',
      patrimoine_fr     : 'التراث الموسيقي الجزائري',
      patrimoine_ar_txt : 'التراث الشعبي الجزائري',
      preserve          : 'نحافظ معاً على تراثنا الموسيقي',
      visiteurs         : 'زوار',
      en_ligne          : 'متصل',
    }
  };

  /* Récupère la langue depuis QAi18n (i18n.js) ou localStorage */
  function currentFooterLang() {
    if (window.QAi18n && typeof QAi18n.getLang === 'function') {
      return QAi18n.getLang();
    }
    try {
      return localStorage.getItem('qa_lang') || 'fr';
    } catch (e) { return 'fr'; }
  }

  function tf(key) {
    var lang = currentFooterLang();
    return (i18nFooter[lang] && i18nFooter[lang][key])
      || (i18nFooter['fr'][key]) || key;
  }

  /* Placeholder image manquante */
  var FPH = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450">' +
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="#1a2230"/><stop offset="1" stop-color="#2b2413"/>' +
    '</linearGradient></defs>' +
    '<rect width="600" height="450" fill="url(#g)"/>' +
    '<text x="300" y="245" font-size="90" text-anchor="middle" fill="#f5b942" ' +
    'font-family="Georgia, serif">♪</text></svg>'
  );
  window.FOOTER_PH = FPH;

  function hov() {
    return 'onmouseover="this.style.background=\'rgba(245,185,66,.08)\'" ' +
           'onmouseout="this.style.background=\'transparent\'"';
  }

  function buildFooter() {
    return [
      '<footer class="chaabi-footer" style="background:var(--bg-2,#0d1117);color:var(--text,#fff);margin-top:32px;border-top:1px solid var(--border,rgba(245,185,66,.18));backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)">',
      '<div style="max-width:1280px;margin:0 auto;padding:48px 16px">',
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:32px;margin-bottom:48px">',

      /* ── Colonne 1 : Chaabi Music ── */
      '<div>',
        '<h3 style="font-size:1.5rem;font-weight:700;margin-bottom:12px;background:linear-gradient(to right,#3b82f6,#2563eb);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text" data-footer-i18n="col_radiochaabi">' + tf('col_radiochaabi') + '</h3>',
        '<div style="width:64px;height:4px;background:linear-gradient(to right,#3b82f6,#2563eb);border-radius:99px;margin-bottom:16px"></div>',
        '<h4 style="font-weight:600;margin-bottom:12px">',
          '<a href="' + fhref('index.html#emissions') + '" style="color:#3b82f6;text-decoration:none;display:flex;align-items:center;gap:6px;font-size:.9rem" data-footer-i18n="nav_emissions" onmouseover="this.style.color=\'#ffd97a\'" onmouseout="this.style.color=\'#3b82f6\'">',
            '<i class="fas fa-radio" style="font-size:.8rem"></i><span>' + tf('nav_emissions') + '</span>',
          '</a>',
        '</h4>',
        '<img src="/music/images/chaabidialna.png" alt="Musique Chaabi" style="width:100%;max-height:160px;height:auto;object-fit:contain;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.3);margin-bottom:12px;background:rgba(0,0,0,.15)" onerror="this.onerror=null;this.src=FOOTER_PH">',
        '<p style="color:var(--text-muted,#9ca3af);font-size:.875rem;font-weight:500;margin-bottom:12px" data-footer-i18n="footer_desc">' + tf('footer_desc') + '</p>',
        '<a href="' + fhref('admin/index.php') + '" style="display:inline-flex;align-items:center;justify-content:center;height:36px;padding:0 14px;border-radius:10px;font-size:.8rem;font-weight:700;gap:8px;color:#fff;background:linear-gradient(135deg,#2563eb,#1d4ed8);text-decoration:none;box-shadow:0 4px 12px rgba(37,99,235,.35)"><i class="fas fa-lock" style="font-size:.7rem"></i><span data-footer-i18n="nav_admin">' + tf('nav_admin') + '</span></a>',
      '</div>',

      /* ── Colonne 2 : Chaabi ── */
      '<div>',
        '<h3 style="font-size:1.25rem;font-weight:700;margin-bottom:8px;display:flex;align-items:center;gap:8px"><i class="fas fa-music" style="color:#059669"></i><span data-footer-i18n="col_chaabi">' + tf('col_chaabi') + '</span></h3>',
        '<div style="width:64px;height:4px;background:linear-gradient(to right,#3b82f6,#2563eb);border-radius:99px;margin-bottom:16px"></div>',
        '<div style="display:flex;flex-direction:column;gap:12px">',
          '<div style="display:flex;align-items:center;gap:16px;padding:12px;background:var(--bg-3,#161b22);border-radius:12px;border:1px solid var(--border,transparent);transition:background .2s" ' + hov() + '>',
            '<img src="/music/img_artistes/el hadj el anka_2.jpeg" style="width:48px;height:48px;object-fit:cover;border-radius:8px;flex-shrink:0" onerror="this.onerror=null;this.src=FOOTER_PH">',
            '<div><a href="' + fhref('index.html#artistes') + '" style="color:#3b82f6;text-decoration:none;font-weight:500;font-size:.875rem;display:block" data-footer-i18n="nav_artistes" onmouseover="this.style.color=\'#ffd97a\'" onmouseout="this.style.color=\'#3b82f6\'">' + tf('nav_artistes') + '</a><p style="color:var(--text-muted,#9ca3af);font-size:.75rem">' + tf('desc_artistes') + '</p></div>',
          '</div>',
          '<div style="display:flex;align-items:center;gap:16px;padding:12px;background:var(--bg-3,#161b22);border-radius:12px;border:1px solid var(--border,transparent);transition:background .2s" ' + hov() + '>',
            '<img src="/music/img_artistes/Amar-Ezzahi.jpg" style="width:48px;height:48px;object-fit:cover;border-radius:8px;flex-shrink:0" onerror="this.onerror=null;this.src=FOOTER_PH">',
            '<div><a href="' + fhref('index.html#chansons') + '" style="color:#3b82f6;text-decoration:none;font-weight:500;font-size:.875rem;display:block" data-footer-i18n="nav_chansons" onmouseover="this.style.color=\'#ffd97a\'" onmouseout="this.style.color=\'#3b82f6\'">' + tf('nav_chansons') + '</a><p style="color:var(--text-muted,#9ca3af);font-size:.75rem">' + tf('desc_chansons') + '</p></div>',
          '</div>',
          '<div style="display:flex;align-items:center;gap:16px;padding:12px;background:var(--bg-3,#161b22);border-radius:12px;border:1px solid var(--border,transparent);transition:background .2s" ' + hov() + '>',
            '<img src="/music/img_artistes/el hachmi guerouabi.jpg" style="width:48px;height:48px;object-fit:cover;border-radius:8px;flex-shrink:0" onerror="this.onerror=null;this.src=FOOTER_PH">',
            '<div><a href="' + fhref('index.html#interviews') + '" style="color:#3b82f6;text-decoration:none;font-weight:500;font-size:.875rem;display:block" data-footer-i18n="nav_interviews" onmouseover="this.style.color=\'#ffd97a\'" onmouseout="this.style.color=\'#3b82f6\'">' + tf('nav_interviews') + '</a><p style="color:var(--text-muted,#9ca3af);font-size:.75rem">' + tf('desc_interviews') + '</p></div>',
          '</div>',
        '</div>',
      '</div>',

      /* ── Colonne 3 : Divers ── */
      '<div>',
        '<h3 style="font-size:1.25rem;font-weight:700;margin-bottom:8px;display:flex;align-items:center;gap:8px"><i class="fas fa-th-large" style="color:#3b82f6"></i><span data-footer-i18n="col_divers">' + tf('col_divers') + '</span></h3>',
        '<div style="width:64px;height:4px;background:linear-gradient(to right,#3b82f6,#2563eb);border-radius:99px;margin-bottom:16px"></div>',
        '<div style="display:flex;flex-direction:column;gap:12px">',
          '<div style="display:flex;align-items:center;gap:16px;padding:12px;background:var(--bg-3,#161b22);border-radius:12px;border:1px solid var(--border,transparent);transition:background .2s" ' + hov() + '>',
            '<img src="/music/img_artistes/el hadj mrizek.png" style="width:48px;height:48px;object-fit:cover;border-radius:8px;flex-shrink:0" onerror="this.onerror=null;this.src=FOOTER_PH">',
            '<div><a href="' + fhref('qacidates.php') + '" style="color:#3b82f6;text-decoration:none;font-weight:500;font-size:.875rem;display:block" data-footer-i18n="nav_qacidates" onmouseover="this.style.color=\'#ffd97a\'" onmouseout="this.style.color=\'#3b82f6\'">' + tf('nav_qacidates') + '</a><p style="color:var(--text-muted,#9ca3af);font-size:.75rem">' + tf('desc_qacidates') + '</p></div>',
          '</div>',
          '<div style="display:flex;align-items:center;gap:16px;padding:12px;background:var(--bg-3,#161b22);border-radius:12px;border:1px solid var(--border,transparent);transition:background .2s" ' + hov() + '>',
            '<img src="/music/img_artistes/dahmane el harrachi.jpg" style="width:48px;height:48px;object-fit:cover;border-radius:8px;flex-shrink:0" onerror="this.onerror=null;this.src=FOOTER_PH">',
            '<div><a href="' + fhref('index.html#bouqalla') + '" style="color:#3b82f6;text-decoration:none;font-weight:500;font-size:.875rem;display:block" data-footer-i18n="nav_bouqalla" onmouseover="this.style.color=\'#ffd97a\'" onmouseout="this.style.color=\'#3b82f6\'">' + tf('nav_bouqalla') + '</a><p style="color:var(--text-muted,#9ca3af);font-size:.75rem">' + tf('desc_bouqalla') + '</p></div>',
          '</div>',
          '<div style="display:flex;align-items:center;gap:16px;padding:12px;background:var(--bg-3,#161b22);border-radius:12px;border:1px solid var(--border,transparent);transition:background .2s" ' + hov() + '>',
            '<img src="/music/img_artistes/reda doumaz.jpg" style="width:48px;height:48px;object-fit:cover;border-radius:8px;flex-shrink:0" onerror="this.onerror=null;this.src=FOOTER_PH">',
            '<div><a href="' + fhref('index.html#dedicaces') + '" style="color:#3b82f6;text-decoration:none;font-weight:500;font-size:.875rem;display:block" data-footer-i18n="nav_dedicaces" onmouseover="this.style.color=\'#ffd97a\'" onmouseout="this.style.color=\'#3b82f6\'">' + tf('nav_dedicaces') + '</a><p style="color:var(--text-muted,#9ca3af);font-size:.75rem">' + tf('desc_dedicaces') + '</p></div>',
          '</div>',
        '</div>',
      '</div>',

      /* ── Colonne 4 : Autres ── */
      '<div>',
        '<h3 style="font-size:1.25rem;font-weight:700;margin-bottom:8px;display:flex;align-items:center;gap:8px"><i class="fas fa-star" style="color:#3b82f6"></i><span data-footer-i18n="col_autres">' + tf('col_autres') + '</span></h3>',
        '<div style="width:64px;height:4px;background:linear-gradient(to right,#3b82f6,#2563eb);border-radius:99px;margin-bottom:16px"></div>',
        '<div style="display:flex;flex-direction:column;gap:12px">',
          '<div style="display:flex;align-items:center;gap:16px;padding:12px;background:var(--bg-3,#161b22);border-radius:12px;border:1px solid var(--border,transparent);transition:background .2s" ' + hov() + '>',
            '<div style="width:48px;height:48px;border-radius:8px;flex-shrink:0;background:linear-gradient(135deg,#2563eb,#1d4ed8);display:flex;align-items:center;justify-content:center"><i class="fas fa-podcast" style="color:#ffffff"></i></div>',
            '<div><a href="' + fhref('index.html#emissions') + '" style="color:#3b82f6;text-decoration:none;font-weight:500;font-size:.875rem;display:block" data-footer-i18n="nav_emissions" onmouseover="this.style.color=\'#ffd97a\'" onmouseout="this.style.color=\'#3b82f6\'">' + tf('nav_emissions') + '</a><p style="color:var(--text-muted,#9ca3af);font-size:.75rem">' + tf('stat_emissions') + '</p></div>',
          '</div>',
          '<div style="display:flex;align-items:center;gap:16px;padding:12px;background:var(--bg-3,#161b22);border-radius:12px;border:1px solid var(--border,transparent);transition:background .2s" ' + hov() + '>',
            '<div style="width:48px;height:48px;border-radius:8px;flex-shrink:0;background:linear-gradient(135deg,#2563eb,#1d4ed8);display:flex;align-items:center;justify-content:center"><i class="fas fa-envelope" style="color:#ffffff"></i></div>',
            '<div><a href="' + fhref('index.html#contacts') + '" style="color:#3b82f6;text-decoration:none;font-weight:500;font-size:.875rem;display:block" data-footer-i18n="nav_contact" onmouseover="this.style.color=\'#ffd97a\'" onmouseout="this.style.color=\'#3b82f6\'">' + tf('nav_contact') + '</a><p style="color:var(--text-muted,#9ca3af);font-size:.75rem">' + tf('desc_contact') + '</p></div>',
          '</div>',
          '<div style="display:flex;align-items:center;gap:16px;padding:12px;background:var(--bg-3,#161b22);border-radius:12px;border:1px solid var(--border,transparent);transition:background .2s" ' + hov() + '>',
            '<div style="width:48px;height:48px;border-radius:8px;flex-shrink:0;background:linear-gradient(135deg,#2563eb,#1d4ed8);display:flex;align-items:center;justify-content:center"><i class="fas fa-comment" style="color:#ffffff"></i></div>',
            '<div><a href="' + fhref('index.html#commentaires') + '" style="color:#3b82f6;text-decoration:none;font-weight:500;font-size:.875rem;display:block" data-footer-i18n="nav_commentaires" onmouseover="this.style.color=\'#ffd97a\'" onmouseout="this.style.color=\'#3b82f6\'">' + tf('nav_commentaires') + '</a><p style="color:var(--text-muted,#9ca3af);font-size:.75rem">' + tf('desc_commentaires') + '</p></div>',
          '</div>',
        '</div>',
      '</div>',

      '</div>', /* /grid */

      /* ── Bas du footer (3 cartes) ── */
      '<div style="border-top:1px solid var(--border,rgba(245,185,66,.18));padding-top:28px;margin-top:8px">',
        '<div style="display:flex;flex-wrap:wrap;gap:16px;align-items:stretch">',

          /* Carte copyright + logo */
          '<div style="flex:1 1 260px;min-width:240px;padding:16px;background:var(--bg-3,#161b22);border-radius:12px;border:1px solid var(--border,rgba(245,185,66,.12));display:flex;flex-direction:column;gap:12px">',
            '<p style="color:var(--text-muted,#9ca3af);font-size:.875rem;margin:0"><span data-footer-i18n="copyright">' + tf('copyright') + '</span> <a href="' + fhref('index.html') + '" style="color:#3b82f6;font-weight:600;text-decoration:none">Chaabi Music</a></p>',
            '<p style="color:var(--text-subtle,#6b7280);font-size:.75rem;margin:0" data-footer-i18n="preserve">' + tf('preserve') + '</p>',
            '<div style="display:flex;align-items:center;gap:12px;margin-top:4px">',
              '<div style="display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#2563eb,#1d4ed8);height:44px;width:44px;border-radius:12px;flex-shrink:0;box-shadow:0 0 0 2px rgba(245,185,66,.25)">',
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="22" height="22" aria-hidden="true"><ellipse cx="22" cy="38" rx="16" ry="18" fill="#fff"/><path d="M34 28c8-10 18-16 26-18-2 8-8 18-18 26l-8-8z" fill="#fff"/><circle cx="22" cy="38" r="6" fill="#1d4ed8"/></svg>',
              '</div>',
              '<div>',
                '<h3 style="font-size:1.05rem;font-weight:700;line-height:1.2;font-family:\'Amiri\',serif;margin:0" data-footer-i18n="patrimoine_ar_txt">' + tf('patrimoine_ar_txt') + '</h3>',
                '<p style="color:#d1d5db;font-size:.75rem;margin:4px 0 0" data-footer-i18n="patrimoine_fr">' + tf('patrimoine_fr') + '</p>',
              '</div>',
            '</div>',
          '</div>',

          /* Carte réseaux sociaux */
          '<div style="flex:1 1 220px;min-width:200px;padding:16px;background:var(--bg-3,#161b22);border-radius:12px;border:1px solid var(--border,rgba(245,185,66,.12));display:flex;flex-direction:column;gap:14px;justify-content:center">',
            '<span style="color:var(--text-muted,#9ca3af);font-size:.875rem;font-weight:600" data-footer-i18n="suivez_nous">' + tf('suivez_nous') + '</span>',
            '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">',
              '<a href="https://www.facebook.com/radiochaabidialna/" target="_blank" rel="noopener" aria-label="Facebook" style="width:40px;height:40px;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;text-decoration:none;transition:transform .2s" onmouseover="this.style.transform=\'scale(1.1)\'" onmouseout="this.style.transform=\'scale(1)\'"><i class="fab fa-facebook-f" style="font-size:.75rem"></i></a>',
              '<a href="https://x.com/chaabiradio" target="_blank" rel="noopener" aria-label="X" style="width:40px;height:40px;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;text-decoration:none;transition:transform .2s" onmouseover="this.style.transform=\'scale(1.1)\'" onmouseout="this.style.transform=\'scale(1)\'"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="#ffffff" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>',
              '<a href="https://www.instagram.com/chaabiradio/" target="_blank" rel="noopener" aria-label="Instagram" style="width:40px;height:40px;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;text-decoration:none;transition:transform .2s" onmouseover="this.style.transform=\'scale(1.1)\'" onmouseout="this.style.transform=\'scale(1)\'"><i class="fab fa-instagram" style="font-size:.75rem"></i></a>',
              '<a href="https://www.youtube.com/@mahfoud8027" target="_blank" rel="noopener" aria-label="YouTube" style="width:40px;height:40px;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;text-decoration:none;transition:transform .2s" onmouseover="this.style.transform=\'scale(1.1)\'" onmouseout="this.style.transform=\'scale(1)\'"><i class="fab fa-youtube" style="font-size:.75rem"></i></a>',
            '</div>',
          '</div>',

          /* Carte stats */
          '<div style="flex:1 1 220px;min-width:200px;padding:16px;background:var(--bg-3,#161b22);border-radius:12px;border:1px solid var(--border,rgba(245,185,66,.12));display:flex;align-items:center;justify-content:space-around;gap:12px;flex-wrap:wrap">',
            '<div style="text-align:center"><p style="font-size:0.95rem;font-weight:700;color:#3b82f6;margin:0">12k+</p><p style="color:var(--text-muted,#9ca3af);font-size:.75rem;margin:4px 0 0" data-footer-i18n="visiteurs">' + tf('visiteurs') + '</p></div>',
            '<div style="text-align:center"><p style="font-size:0.95rem;font-weight:700;color:#3b82f6;margin:0" data-footer-i18n="desc_qacidates">' + tf('desc_qacidates') + '</p><p style="color:var(--text-muted,#9ca3af);font-size:.75rem;margin:4px 0 0" data-footer-i18n="nav_qacidates">' + tf('nav_qacidates') + '</p></div>',
            '<div style="text-align:center"><p style="font-size:0.95rem;font-weight:700;color:#3b82f6;margin:0" data-footer-i18n="desc_artistes">' + tf('desc_artistes') + '</p><p style="color:var(--text-muted,#9ca3af);font-size:.75rem;margin:4px 0 0" data-footer-i18n="nav_artistes">' + tf('nav_artistes') + '</p></div>',
          '</div>',

        '</div>',
      '</div>',

      '</div>', /* /inner */
      '</footer>',
    ].join('\n');
  }

  function injectFooter() {
    var root = document.getElementById('footer-root');
    if (!root) return;
    root.innerHTML = buildFooter();
  }

  function retranslateFooter() {
    var root = document.getElementById('footer-root');
    if (!root) return;
    root.querySelectorAll('[data-footer-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-footer-i18n');
      var val = tf(key);
      if (val) el.textContent = val;
    });
  }

  window.applyFooterTheme = function () { injectFooter(); };
  window.refreshFooter = function () { injectFooter(); };
  window.injectChaabiFooter = injectFooter;

  /* Réagit au changement de langue */
  document.addEventListener('click', function (e) {
    if (e.target.closest('.lang-btn')) {
      setTimeout(retranslateFooter, 50);
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectFooter);
  } else {
    injectFooter();
  }
  window.__chaabiFooterReady = true;
})();