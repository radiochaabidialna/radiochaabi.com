/**
 * Radio Chaabi — interactions cartes (progressif)
 * Ne remplace pas app.js : complète like / fav / playing state
 */
(function (w, d) {
  'use strict';

  function closestCard(el) {
    return el && el.closest ? el.closest('.media-card') : null;
  }

  /* Ripple sur boutons actions */
  d.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('.mc-actions button');
    if (!btn) return;
    btn.classList.remove('mc-ripple');
    void btn.offsetWidth;
    btn.classList.add('mc-ripple');
    setTimeout(function () { btn.classList.remove('mc-ripple'); }, 450);

    if (btn.classList.contains('mc-like-btn')) {
      btn.classList.toggle('is-liked');
    }
  }, true);

  /* Marquer carte "playing" quand playMedia / audio change */
  function syncPlaying() {
    var a = d.getElementById('fp-audio');
    var src = a && a.src ? a.src : '';
    var cards = d.querySelectorAll('.media-card');
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      var match = false;
      if (src) {
        var dataAudio = card.getAttribute('data-audio') || '';
        var img = card.querySelector('img');
        var onclick = card.getAttribute('onclick') || '';
        if (dataAudio && src.indexOf(dataAudio.replace(/^\//, '')) !== -1) match = true;
        if (!match && onclick && src) {
          // heuristique : titre dans player
        }
      }
      card.classList.toggle('is-playing', !!match && a && !a.paused);
    }
  }

  var a = d.getElementById('fp-audio');
  if (a) {
    a.addEventListener('play', syncPlaying);
    a.addEventListener('pause', function () {
      d.querySelectorAll('.media-card.is-playing').forEach(function (c) {
        c.classList.remove('is-playing');
      });
    });
  }

  /* Accessibilité : Entrée / Espace sur carte focusable */
  d.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var card = closestCard(e.target);
    if (!card || e.target.closest('button, a, input')) return;
    if (e.key === ' ') e.preventDefault();
    var playZone = card.querySelector('.mc-img-bx') || card;
    playZone.click();
  });

  /* Rendre les cartes focusables si pas déjà */
  function enhanceCards(root) {
    (root || d).querySelectorAll('.media-card').forEach(function (card) {
      if (!card.hasAttribute('tabindex')) card.setAttribute('tabindex', '0');
      if (!card.getAttribute('role')) card.setAttribute('role', 'button');
    });
  }

  if (d.readyState === 'loading') {
    d.addEventListener('DOMContentLoaded', function () { enhanceCards(); });
  } else {
    enhanceCards();
  }

  /* Observer grilles dynamiques */
  try {
    var mo = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        if (muts[i].addedNodes && muts[i].addedNodes.length) {
          enhanceCards(muts[i].target);
        }
      }
    });
    mo.observe(d.body, { childList: true, subtree: true });
  } catch (err) {}

  w.chaabiEnhanceCards = enhanceCards;
})(window, document);
