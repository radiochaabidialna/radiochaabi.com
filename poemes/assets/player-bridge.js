/**
 * Pont poemes → localStorage (player unifié)
 */
(function () {
  var KEY = 'chaabi_shared_player_v1';
  function save(p) {
    try {
      localStorage.setItem(KEY, JSON.stringify(Object.assign({ t: Date.now(), source: 'poemes' }, p || {})));
    } catch (e) {}
  }
  window.ChaabiSharedPlayer = window.ChaabiSharedPlayer || { save: save, load: function () {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; }
  }, KEY: KEY };
  window.ChaabiSharedPlayer.save = window.ChaabiSharedPlayer.save || save;

  /* Sync position depuis audio player poemes */
  document.addEventListener('DOMContentLoaded', function () {
    var audio = document.querySelector('#pl-audio, #player audio, .player audio');
    if (!audio) return;
    setInterval(function () {
      if (!audio.src || audio.paused) return;
      var cur = window.ChaabiSharedPlayer.load && window.ChaabiSharedPlayer.load();
      if (!cur || cur.source !== 'poemes') return;
      cur.position = audio.currentTime || 0;
      cur.paused = false;
      cur.t = Date.now();
      try { localStorage.setItem(KEY, JSON.stringify(cur)); } catch (e) {}
    }, 5000);
  });
})();
