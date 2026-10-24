// Prev/next page navigation shared by every page: the big arrow links, keyboard arrows
// and swipes. Each page brings its own exit animation. Load after player.js.
//
// Page-to-page transitions: a page that wants the next page to pick up its exit
// (e.g. a whiteout) stores sessionStorage 'btd-arrive'. Every page reads and clears it
// in <head> and exposes it as <html data-arrive="...">.
(function () {
  // opts: prev, next (the arrow <a> elements; either may be null)
  //   leave(link, dir): play this page's exit ('prev' | 'next' | 'discography'); return ms to wait before going
  //   canLeave(): optional; return false to ignore navigation (e.g. before the intro starts)
  //   restore(): optional; the back/forward cache brought the page back mid-exit, so undo it
  // Returns { hint() }: call it once the page's intro has started (its arrow animations are applied).
  BTD.nav = function (opts) {
    var leaving = false;
    var timer;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function go(link, dir) {
      if (!link || leaving || (opts.canLeave && !opts.canLeave())) return;
      leaving = true;
      BTD.store('btd-last-dir', dir);
      if (reduceMotion) { location.href = link.href; return; }
      var ms = opts.leave(link, dir) / BTD.timing.exit;
      timer = setTimeout(function () { location.href = link.href; }, ms);
    }

    // The Discography link (in every page's top right) leaves with the same exit
    var discog = document.querySelector('[data-discography]');
    [[opts.prev, 'prev'], [opts.next, 'next'], [discog, 'discography']].forEach(function (pair) {
      if (!pair[0]) return;
      pair[0].addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        go(pair[0], pair[1]);
      });
    });

    window.addEventListener('keydown', function (e) {
      if (e.altKey || e.metaKey || e.ctrlKey || e.shiftKey || e.defaultPrevented) return;
      if (e.key === 'ArrowLeft') go(opts.prev, 'prev');
      if (e.key === 'ArrowRight') go(opts.next, 'next');
    });

    var touch = null;
    // Single-finger, mostly horizontal swipes only, so pinch-zoom and scrolling never navigate.
    // Swipes from the screen edge belong to the browser's own back/forward gesture.
    window.addEventListener('touchstart', function (e) {
      var t = e.touches[0];
      var edge = t.clientX < 24 || t.clientX > window.innerWidth - 24;
      touch = e.touches.length === 1 && !edge ? { x: t.clientX, y: t.clientY } : null;
    }, { passive: true });
    window.addEventListener('touchend', function (e) {
      if (touch === null || e.touches.length > 0) { touch = null; return; }
      var dx = e.changedTouches[0].clientX - touch.x;
      var dy = e.changedTouches[0].clientY - touch.y;
      touch = null;
      if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      if (dx > 0) go(opts.prev, 'prev');
      else go(opts.next, 'next');
    });

    // ---------- Hint: a streak shoots across the screen into the next arrow ----------
    // On every page, so nobody misses it. Stops once the visitor hovers or focuses this page's next arrow,
    // and skipped on a page they came back to with Previous: they've already found the way forward.
    var HINT_GAP = 12000; // play once more if they're still here this long after
    var hintTimer;
    var noticed = BTD.recall('btd-last-dir') === 'prev';
    BTD.store('btd-last-dir', ''); // only for the page it led to, not a later reload or deep link

    function engaged() { noticed = true; clearTimeout(hintTimer); }
    if (opts.next) {
      opts.next.addEventListener('pointerenter', engaged);
      opts.next.addEventListener('focus', engaged);
    }

    function streak(again) {
      var next = opts.next;
      if (leaving || noticed) return;
      // Don't waste it on a background tab; play it when they come back.
      if (document.hidden) {
        document.addEventListener('visibilitychange', function () { streak(again); }, { once: true });
        return;
      }
      var svg = next.querySelector('svg');
      var r = svg.getBoundingClientRect();
      if (!r.width || getComputedStyle(next).visibility === 'hidden') return;
      if (again) hintTimer = setTimeout(function () { streak(false); }, HINT_GAP);
      // A page can set --streak on the arrow for a brighter color than the arrow itself
      var style = getComputedStyle(next);
      var color = style.getPropertyValue('--streak').trim() || style.color;
      var dist = r.left + r.width * 0.3;
      var len = Math.min(dist, window.innerWidth * 0.45);

      var line = document.createElement('div');
      line.className = 'arrow-streak';
      line.setAttribute('aria-hidden', 'true');
      line.style.color = color;
      line.style.top = r.top + r.height / 2 + 'px';
      line.style.left = dist - len + 'px';
      line.style.width = len + 'px';
      document.body.appendChild(line);

      line.animate([
        { transform: 'translateX(' + -dist + 'px)', opacity: 1 },
        { transform: 'translateX(0)', opacity: 1, offset: 0.75 },
        { transform: 'translateX(0) scaleX(0)', opacity: 0 }
      ], { duration: 1100, easing: 'cubic-bezier(.55, 0, .8, .4)' }).onfinish = function () { line.remove(); };

      // The arrow takes the hit: a bump toward the next page and a glow, twice. Added on top of
      // whatever the arrow is already doing (its nudge), so nothing snaps.
      var glow = 'drop-shadow(0 0 14px ' + color + ')';
      var calm = 'drop-shadow(0 0 0 ' + color + ')';
      svg.animate([
        { transform: 'translateX(0) scale(1)', filter: calm },
        { transform: 'translateX(12px) scale(1.2)', filter: glow, offset: 0.2 },
        { transform: 'translateX(0) scale(1)', filter: calm, offset: 0.45 },
        { transform: 'translateX(8px) scale(1.1)', filter: glow, offset: 0.65 },
        { transform: 'translateX(0) scale(1)', filter: calm }
      ], { duration: 1300, delay: 800, easing: 'ease-in-out', composite: 'add' });
    }

    // Waits for the arrow's own entrance animations, then gives the visitor a moment to look around.
    var hinted = false;
    function hint() {
      if (hinted || !opts.next || reduceMotion) return;
      hinted = true;
      var entrance = opts.next.getAnimations().filter(function (a) {
        return a.effect.getTiming().iterations !== Infinity;
      });
      Promise.all(entrance.map(function (a) { return a.finished; })).then(function () {
        hintTimer = setTimeout(function () { streak(true); }, 1500);
      }, function () {}); // cancelled: the page is leaving
    }

    window.addEventListener('pageshow', function (e) {
      if (!e.persisted) return;
      // Came back mid-exit: don't let the pending navigation fire later.
      clearTimeout(timer);
      clearTimeout(hintTimer);
      leaving = false;
      if (opts.restore) opts.restore();
    });

    return { hint: hint };
  };
})();
