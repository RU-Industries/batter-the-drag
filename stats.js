// Visit counts with GoatCounter (https://batterthedrag.goatcounter.com): no cookies and nothing
// personal stored, so no consent banner. Counts each page shown (site.js swaps pages in without
// a page load, so it calls BTD.stats.page() itself), and as events: the links out (Bandcamp,
// Spotify, YouTube Music, Apple Music, Instagram, Facebook) and the Wendt's Sound / No sound.
//
// Only on batterthedrag.com, so local and preview copies don't count. Load in <head> after site.js, with defer.
(function () {
  var BTD = window.BTD || (window.BTD = {});
  var live = /(^|\.)batterthedrag\.com$/.test(location.hostname);

  // One name per page however it was reached: /ensete, /ensete.html, /ensete?fbclid=...
  function here() {
    return location.pathname.replace(/(index)?\.html$/, '') || '/';
  }

  // Held until count.js has loaded (it loads alongside the site's preload, so it can be slow),
  // so the first page and an early Sound / No sound still count
  var queue = [];
  function count(vars) {
    if (!live) return;
    if (!window.goatcounter.count) { queue.push(vars); return; }
    try { window.goatcounter.count(vars); } catch (e) {} // never let counting break the page
  }

  BTD.stats = {
    // A swapped-in page came from the one before it, as a page load would report it,
    // not from wherever the visit started
    page: function () {
      var from = (BTD.site && BTD.site.from) || here();
      count({ path: here(), referrer: location.origin + from });
    },
    event: function (name, title) { count({ path: name, title: title || name, event: true }); }
  };

  if (!live) return;

  window.goatcounter = { no_onload: true };
  count({ path: here() }); // this page, with its own referrer
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://gc.zgo.at/count.js';
  s.setAttribute('data-goatcounter', 'https://batterthedrag.goatcounter.com/count');
  s.onload = function () {
    // count.js takes a window.phantom for PhantomJS (a dead headless browser) and drops the visit
    // as a bot, but the Phantom crypto wallet extension sets it too. PhantomJS also sets callPhantom.
    var gc = window.goatcounter, data = gc.get_data;
    gc.get_data = function (vars) {
      var d = data(vars);
      if (d.b === 150 && !window.callPhantom && !window._phantom) d.b = 0;
      return d;
    };
    queue.splice(0).forEach(count);
  };
  document.head.appendChild(s);

  // Lasts the whole visit, so it uses the original listener site.js keeps (it stops each page's own)
  var on = BTD.raw ? BTD.raw.on : function (target, type, fn) { target.addEventListener(type, fn); };
  var chose = false;
  function clicked(e) {
    if (e.type === 'auxclick' && e.button !== 1) return; // a middle-click opens it in a new tab
    var el = e.target.closest && e.target.closest('a[href^="http"], [data-sound]');
    if (!el) return;
    if (el.hasAttribute('data-sound')) {
      // Once: a double tap, or both buttons while the question fades out, is still one choice
      if (!chose) BTD.stats.event(el.dataset.sound === 'on' ? 'Sound on' : 'No sound');
      chose = true;
      return;
    }
    // e.g. "Spotify · /ensete" (the icon's label, or the button's words)
    var label = el.getAttribute('aria-label') || el.textContent.replace(/\s+/g, ' ').trim();
    BTD.stats.event(label + ' · ' + here(), el.href);
  }
  on(document, 'click', clicked);
  on(document, 'auxclick', clicked);
})();
