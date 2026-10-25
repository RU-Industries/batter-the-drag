// Music player shared by both pages. Each page brings its own markup and styles.
//
// sessionStorage 'btd-sound' holds the visitor's own choice ('on' / 'off'). Only their
// clicks change it, so a blocked autoplay or a page change never flips it.
(function () {
  function store(key, value) { try { sessionStorage.setItem(key, value); } catch (e) {} }
  function recall(key) { try { return sessionStorage.getItem(key); } catch (e) { return null; } }

  // opts: player (element), tracks [{ title, src }], start (index),
  // resumeKey (optional sessionStorage key to pick the track and time back up)
  function createPlayer(opts) {
    var player = opts.player;
    var tracks = opts.tracks;
    var toggle = player.querySelector('.player-toggle');
    var title = player.querySelector('.player-title');
    var trackButtons = document.querySelectorAll('[data-track]');
    var audio = new Audio();
    audio.preload = 'none';

    var index = opts.start;
    var wantPlaying = false;
    var leaving = false;
    var pendingSeek = 0;
    var fadeTimer;

    // Volume ramp. iOS ignores audio.volume, so there it simply starts and stops.
    function fadeTo(volume, ms, done) {
      clearInterval(fadeTimer);
      var from = audio.volume;
      var start = performance.now();
      fadeTimer = setInterval(function () {
        var k = Math.min(1, (performance.now() - start) / ms);
        audio.volume = from + (volume - from) * k;
        if (k === 1) {
          clearInterval(fadeTimer);
          if (done) done();
        }
      }, 30);
    }

    function setPlaying(on) {
      wantPlaying = on;
      player.classList.toggle('is-playing', on);
      toggle.setAttribute('aria-label', on ? 'Pause' : 'Play');
    }

    function loadTrack(i, time) {
      index = i;
      pendingSeek = time || 0;
      audio.src = tracks[i].src;
      title.textContent = tracks[i].title;
      player.style.setProperty('--progress', 0);
      trackButtons.forEach(function (b) {
        b.setAttribute('aria-current', String(Number(b.dataset.track) === i));
      });
    }

    function play(fadeMs) {
      setPlaying(true);
      audio.volume = 0;
      audio.play().then(function () {
        // Pause or a page change may have happened while the file was still buffering.
        if (wantPlaying && !leaving) fadeTo(1, fadeMs);
      }, function (err) {
        // AbortError just means another track was loaded first; anything else (autoplay
        // blocked, file failed) leaves the player paused so one tap can retry.
        if (err.name === 'AbortError') return;
        setPlaying(false);
        if (err.name === 'NotAllowedError') playOnFirstTouch(fadeMs);
      });
    }

    // Phones (and some desktop browsers) won't start sound on a page the visitor hasn't
    // touched yet, so music they turned on earlier stops at the first page change. Start it
    // with their first tap or key press here instead.
    var unlockEvents = ['touchend', 'mousedown', 'keydown'];
    var awaitingTouch = false;

    function playOnFirstTouch(fadeMs) {
      if (awaitingTouch) return;
      awaitingTouch = true;
      function retry(e) {
        unlockEvents.forEach(function (type) { window.removeEventListener(type, retry, true); });
        awaitingTouch = false;
        // The player's own buttons start (or keep off) the music themselves
        var own = e.target.closest && (player.contains(e.target) || e.target.closest('[data-track]'));
        if (!own && !leaving && !wantPlaying && recall('btd-sound') === 'on') play(fadeMs);
      }
      unlockEvents.forEach(function (type) { window.addEventListener(type, retry, true); });
    }

    function pause() {
      setPlaying(false);
      fadeTo(0, 400, function () { audio.pause(); });
    }

    function savePosition() {
      if (opts.resumeKey) store(opts.resumeKey, index + ':' + Math.floor(audio.currentTime));
    }

    toggle.addEventListener('click', function () {
      if (wantPlaying) {
        pause();
        store('btd-sound', 'off');
      } else {
        play(600);
        store('btd-sound', 'on');
      }
    });

    trackButtons.forEach(function (b) {
      b.addEventListener('click', function () {
        loadTrack(Number(b.dataset.track));
        play(300);
        store('btd-sound', 'on');
      });
    });

    audio.addEventListener('loadedmetadata', function () {
      if (pendingSeek) audio.currentTime = pendingSeek;
      pendingSeek = 0;
    });

    audio.addEventListener('ended', function () {
      loadTrack((index + 1) % tracks.length);
      if (wantPlaying && !leaving) play(10);
    });

    audio.addEventListener('timeupdate', function () {
      if (audio.duration) player.style.setProperty('--progress', audio.currentTime / audio.duration);
    });

    // Media keys / OS controls can pause us behind our back; keep the button honest.
    audio.addEventListener('pause', function () {
      if (wantPlaying && audio.paused && !audio.ended) setPlaying(false);
    });

    audio.addEventListener('error', function () { setPlaying(false); });

    window.addEventListener('pagehide', savePosition);

    var saved = opts.resumeKey ? (recall(opts.resumeKey) || '').split(':') : [];
    if (tracks[saved[0]]) loadTrack(Number(saved[0]), Number(saved[1]) || 0);
    else loadTrack(index);

    return {
      play: play,
      // Fade out on the way to the other page.
      leave: function (ms) {
        leaving = true;
        savePosition();
        if (wantPlaying) fadeTo(0, ms / BTD.timing.exit); // in step with the page's exit
      },
      // Back/forward cache restored this page: pick the music back up if it's wanted.
      restore: function (fadeMs) {
        leaving = false;
        if (recall('btd-sound') === 'on') play(fadeMs);
        else setPlaying(false);
      }
    };
  }

  var BTD = window.BTD || (window.BTD = {});
  BTD.store = store;
  BTD.recall = recall;
  BTD.createPlayer = createPlayer;
})();
