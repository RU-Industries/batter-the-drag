// How fast every page-to-page transition plays: each page's entrance and its exit.
// Every page keeps its own hand-tuned timings in its CSS and JS; these speeds scale them
// all at once (2 = twice as fast, .5 = twice as slow). Load in <head>, before anything animates.
//
// On a dev host (localhost, 127.0.0.1, Tailscale), Tab opens a panel to try other speeds.
// Those stay in this browser only; copy the ones you like into SPEED below.
(function () {
  var SPEED = { enter: 3, exit: 3 }; // the global setting

  var KEY = 'btd-timing';
  var dev = /^(localhost|127\.0\.0\.1|\[::1\])$|\.ts\.net$/.test(location.hostname);
  // Without the Web Animations API the CSS can't be rescaled, so the JS timers stay in step with it
  var speed = document.getAnimations ? { enter: SPEED.enter, exit: SPEED.exit } : { enter: 1, exit: 1 };
  if (dev) {
    try {
      var saved = JSON.parse(localStorage.getItem(KEY));
      if (saved) { speed.enter = +saved.enter || speed.enter; speed.exit = +saved.exit || speed.exit; }
    } catch (e) {}
  }

  // Pages divide their own transition timers by these: setTimeout(go, 1400 / BTD.timing.exit)
  var BTD = window.BTD || (window.BTD = {});
  BTD.timing = speed;

  // CSS animations and (while leaving) transitions get rescaled as they appear: their
  // durations and delays for the one-off ones, only the delay before a looping one starts.
  // Pages start their entrances and exits by setting a class on <html> or <body>, so watch
  // for a while after each of those.
  // (On a dev host always, since the panel can change the speeds at any time.)
  if ((dev || speed.enter !== 1 || speed.exit !== 1) && document.getAnimations) {
    var seen = new WeakSet();
    var watchUntil = 0, frame = 0;
    var leaving = function () {
      return document.documentElement.classList.contains('is-leaving') ||
        !!(document.body && document.body.classList.contains('is-leaving'));
    };
    var scan = function () {
      var out = leaving();
      document.getAnimations().forEach(function (a) {
        if (seen.has(a)) return;
        seen.add(a);
        var transition = window.CSSTransition && a instanceof CSSTransition;
        if (transition && !out) return; // hovers and the like keep their own pace
        if (!transition && !(window.CSSAnimation && a instanceof CSSAnimation)) return;
        var s = out ? speed.exit : speed.enter;
        if (s === 1) return;
        var t = a.effect.getTiming();
        var next = {};
        if (t.delay > 0) next.delay = t.delay / s;
        if (t.iterations !== Infinity && typeof t.duration === 'number') next.duration = t.duration / s;
        a.effect.updateTiming(next);
      });
    };
    var tick = function () {
      scan();
      frame = performance.now() < watchUntil || leaving() ? requestAnimationFrame(tick) : 0;
    };
    var watch = function () {
      watchUntil = performance.now() + 12000 / Math.min(speed.enter, 1);
      if (!frame) frame = requestAnimationFrame(tick);
    };
    watch();
    var classes = new MutationObserver(watch);
    classes.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('DOMContentLoaded', function () {
      classes.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    });
  }

  if (!dev) return;

  // ---------- The panel ----------
  var panel;

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(speed)); } catch (e) {}
  }

  function build() {
    panel = document.createElement('div');
    panel.id = 'btd-timing';
    panel.innerHTML =
      '<style>' +
      '#btd-timing { position: fixed; left: 16px; bottom: 16px; z-index: 2147483001; width: 270px; padding: 14px 16px 12px;' +
      '  background: rgba(16, 16, 18, .94); color: #eee; border: 1px solid rgba(255, 255, 255, .15); border-radius: 10px;' +
      '  font: 12px/1.4 ui-monospace, Menlo, monospace; box-shadow: 0 10px 30px rgba(0, 0, 0, .5); }' +
      '#btd-timing, #btd-timing * { cursor: auto !important; letter-spacing: 0; text-transform: none; }' +
      '#btd-timing b { display: block; margin-bottom: 10px; font-size: 11px; letter-spacing: .1em !important; text-transform: uppercase !important; color: #aaa; }' +
      '#btd-timing label { display: grid; grid-template-columns: 64px 1fr 46px; align-items: center; gap: 8px; margin-bottom: 6px; }' +
      '#btd-timing input { width: 100%; accent-color: #9cf; }' +
      '#btd-timing output { text-align: right; }' +
      '#btd-timing .row { display: flex; gap: 8px; margin-top: 8px; }' +
      '#btd-timing button { flex: 1; padding: 5px 0; font: inherit; color: #eee; background: rgba(255, 255, 255, .08);' +
      '  border: 1px solid rgba(255, 255, 255, .18); border-radius: 6px; }' +
      '#btd-timing button:hover { background: rgba(255, 255, 255, .16); }' +
      '#btd-timing p { margin-top: 10px; color: #888; font-size: 11px; }' +
      '</style>' +
      '<b>Transition speed</b>' +
      '<label>Entrance <input type="range" name="enter" min=".25" max="3" step=".05"><output></output></label>' +
      '<label>Exit <input type="range" name="exit" min=".25" max="3" step=".05"><output></output></label>' +
      '<div class="row"><button type="button" data-act="replay">Replay entrance</button><button type="button" data-act="reset">Reset</button></div>' +
      '<p>2&times; = twice as fast. Tab hides this.<br>Global (timing.js): <span class="global"></span></p>';
    var inputs = panel.querySelectorAll('input');
    function show() {
      inputs.forEach(function (input) {
        input.value = speed[input.name];
        input.nextElementSibling.textContent = (+speed[input.name]).toFixed(2) + '×';
      });
      panel.querySelector('.global').textContent = 'enter ' + SPEED.enter + ', exit ' + SPEED.exit;
    }
    // Takes effect from the next entrance or exit (exits read it live)
    inputs.forEach(function (input) {
      input.addEventListener('input', function () {
        speed[input.name] = +input.value;
        save();
        show();
      });
    });
    panel.addEventListener('click', function (e) {
      var act = e.target.dataset && e.target.dataset.act;
      if (act === 'replay') location.reload();
      if (act === 'reset') {
        speed.enter = SPEED.enter;
        speed.exit = SPEED.exit;
        try { localStorage.removeItem(KEY); } catch (err) {}
        show();
      }
    });
    // The page's arrow keys move between releases; here they move the sliders
    panel.addEventListener('keydown', function (e) { if (e.key !== 'Tab') e.stopPropagation(); });
    show();
    document.body.appendChild(panel);
  }

  function toggle(open) {
    if (!panel) build();
    panel.hidden = !open;
  }

  window.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab' || e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    toggle(!panel || panel.hidden);
  });
})();
