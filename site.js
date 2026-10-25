// One continuous visit across the release pages, so music the visitor turned on keeps
// working from page to page (phones only allow sound after a tap on the same page load,
// and every full page load counts as a new one).
//
// Every page is still a complete page of its own: a first visit, a reload or a shared link
// loads it normally. After that, moving between pages swaps the next one in here (its head,
// its body, its scripts) and updates the address, so Back, reload and links work as before.
// Each page's code runs as written. Everything it starts on the window, document, <html>,
// <body> or the shared audio (listeners, timers, animation frames, WebGL) is tracked and
// stopped when the page is swapped out.
//
// It also preloads the whole site (every page, the images this screen size uses, the
// fonts) and reports byte-accurate progress for the Wendt's sound question to show.
//
// Load first in <head>, before any other script that registers anything.
(function () {
  if (!window.fetch || !window.DOMParser || !window.Promise || !window.Set || !history.pushState) return;

  var BTD = window.BTD || (window.BTD = {});
  var addListener = EventTarget.prototype.addEventListener;
  var removeListener = EventTarget.prototype.removeEventListener;

  // ---------- The originals, for code that lasts the whole visit ----------
  var raw = BTD.raw = {
    setTimeout: window.setTimeout.bind(window),
    clearTimeout: window.clearTimeout.bind(window),
    setInterval: window.setInterval.bind(window),
    clearInterval: window.clearInterval.bind(window),
    requestAnimationFrame: window.requestAnimationFrame.bind(window),
    cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
    on: function (target, type, fn, opts) { addListener.call(target, type, fn, opts); }
  };

  // ---------- What the current page has started ----------
  function makeScope() {
    return { timers: new Set(), intervals: new Set(), frames: new Set(), listeners: [], contexts: [], back: null, progress: [] };
  }
  var scope = makeScope();

  // Callbacks check they still belong to the page on screen before running
  window.setTimeout = function (fn, ms) {
    var s = scope, args = [].slice.call(arguments, 2);
    var id = raw.setTimeout(function () {
      s.timers.delete(id);
      if (s === scope) fn.apply(window, args);
    }, ms);
    s.timers.add(id);
    return id;
  };
  window.clearTimeout = function (id) { scope.timers.delete(id); raw.clearTimeout(id); };

  window.setInterval = function (fn, ms) {
    var s = scope, args = [].slice.call(arguments, 2);
    var id = raw.setInterval(function () { if (s === scope) fn.apply(window, args); }, ms);
    s.intervals.add(id);
    return id;
  };
  window.clearInterval = function (id) { scope.intervals.delete(id); raw.clearInterval(id); };

  window.requestAnimationFrame = function (fn) {
    var s = scope;
    var id = raw.requestAnimationFrame(function (t) {
      s.frames.delete(id);
      if (s === scope) fn(t);
    });
    s.frames.add(id);
    return id;
  };
  window.cancelAnimationFrame = function (id) { scope.frames.delete(id); raw.cancelAnimationFrame(id); };

  // Listeners on anything that outlives the page (its own elements go with it)
  function lasting(target) {
    return target === window || target === document || target === document.documentElement ||
      target === document.body || (!!BTD.audio && target === BTD.audio);
  }
  EventTarget.prototype.addEventListener = function (type, fn, opts) {
    if (lasting(this)) scope.listeners.push([this, type, fn, opts]);
    return addListener.call(this, type, fn, opts);
  };

  // WebGL contexts are limited per tab: let each page's go when it does
  var getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type) {
    var ctx = getContext.apply(this, arguments);
    if (ctx && /webgl/.test(type)) scope.contexts.push(ctx);
    return ctx;
  };

  function teardown() {
    // What a real page change tells the page (player.js saves its place in the music)
    window.dispatchEvent(new Event('pagehide'));
    var s = scope;
    scope = makeScope();
    s.timers.forEach(function (id) { raw.clearTimeout(id); });
    s.intervals.forEach(function (id) { raw.clearInterval(id); });
    s.frames.forEach(function (id) { raw.cancelAnimationFrame(id); });
    s.listeners.forEach(function (l) { removeListener.call(l[0], l[1], l[2], l[3]); });
    s.contexts.forEach(function (gl) {
      var lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    });
    // Whatever the old page was fading out stops here (iOS can't fade anyway)
    if (BTD.audio) BTD.audio.pause();
  }

  // ---------- Pages ----------
  // In preload order after the one on screen: the release order, then the Discography
  var PAGES = ['/', '/ensete', '/the-universe-is-ours', '/the-big-sleep', '/unfathomable-depths', '/discography'];

  // '/ensete.html' and '/ensete' are the same page; null for anywhere else
  function pathOf(href) {
    var url = new URL(href, location.href);
    if (url.origin !== location.origin) return null;
    var path = url.pathname.replace(/(index)?\.html$/, '');
    return PAGES.indexOf(path) >= 0 ? path : null;
  }

  var shown = pathOf(location.href);
  var html = {}; // path -> Promise of the page's HTML

  function page(path) {
    if (!html[path]) {
      html[path] = counted(path).then(function (chunks) { return new Blob(chunks).text(); });
      html[path].catch(function () { delete html[path]; });
    }
    return html[path];
  }

  // Scripts already loaded here, so a swapped-in page doesn't load them again
  var loaded = new Set();
  [].forEach.call(document.scripts, function (s) { if (s.src) loaded.add(s.src); });
  raw.on(document, 'DOMContentLoaded', function () {
    [].forEach.call(document.scripts, function (s) { if (s.src) loaded.add(s.src); });
  });

  var busy = false;
  history.scrollRestoration = 'manual';

  function go(href) {
    var path = pathOf(href);
    if (path === null) { location.href = href; return; }
    if (busy) return;
    busy = true;
    // Back/Forward has already moved the address there
    var push = path !== pathOf(location.href);
    // A stalled connection would leave the old page's exit on screen: load it normally instead
    var stalled = new Promise(function (resolve, reject) {
      raw.setTimeout(function () { reject(new Error('Timed out loading ' + path)); }, 8000);
    });
    Promise.race([page(path), stalled])
      .then(function (text) { return swap(text, href, path, push); })
      .catch(function (err) {
        if (window.console) console.error(err);
        location.href = href;
      })
      .then(function () {
        busy = false;
        // Back or Forward pressed mid-swap: catch up, without an exit
        var now = pathOf(location.href);
        if (now !== null && now !== shown) go(location.href);
      });
  }

  function copyAttributes(from, to) {
    [].slice.call(to.attributes).forEach(function (a) { to.removeAttribute(a.name); });
    [].forEach.call(from.attributes, function (a) { to.setAttribute(a.name, a.value); });
  }

  function inline(source) {
    var s = document.createElement('script');
    s.textContent = source.textContent;
    return s;
  }

  function swap(text, href, path, push) {
    var doc = new DOMParser().parseFromString(text, 'text/html');
    var head = document.head;

    // Its stylesheets first, while this page still shows its exit
    var have = new Set();
    [].forEach.call(head.querySelectorAll('link[rel="stylesheet"]'), function (l) { have.add(l.href); });
    var sheets = [].filter.call(doc.head.querySelectorAll('link[rel="stylesheet"]'), function (l) {
      return !have.has(new URL(l.getAttribute('href'), location.href).href);
    }).map(function (l) {
      var link = document.importNode(l, true);
      return new Promise(function (done) {
        link.onload = link.onerror = done;
        raw.setTimeout(done, 3000);
        head.appendChild(link);
      });
    });

    return Promise.all(sheets).then(function () {
      // The address first: before the new <title>, so the old entry keeps its own, and before
      // the page's code runs, so it sees its own. Each entry keeps its scroll for Back/Forward.
      var y = 0;
      if (push) {
        history.replaceState({ y: window.scrollY }, '');
        history.pushState(null, '', href);
      } else if (history.state) {
        y = history.state.y || 0;
      }
      teardown();
      copyAttributes(doc.documentElement, document.documentElement);
      copyAttributes(doc.body, document.body);

      // <head>: drop what this page had that the next doesn't, add what it brings.
      // Scripts stay put (they've run); the next page's inline ones run again below.
      var incoming = [].slice.call(doc.head.children);
      var wanted = new Set(incoming.map(function (el) { return el.outerHTML; }));
      [].slice.call(head.children).forEach(function (el) {
        if (el.tagName !== 'SCRIPT' && !el.hasAttribute('data-persist') && !wanted.has(el.outerHTML)) el.remove();
      });
      var present = new Set([].map.call(head.children, function (el) { return el.outerHTML; }));
      var headScripts = [];
      incoming.forEach(function (el) {
        if (el.tagName === 'SCRIPT') { if (!el.hasAttribute('src')) headScripts.push(el); return; }
        if (!present.has(el.outerHTML)) head.appendChild(document.importNode(el, true));
      });

      // <body>: everything but what lasts the visit (the dev timing panel)
      var body = document.body;
      [].slice.call(body.childNodes).forEach(function (n) {
        if (!(n.nodeType === 1 && n.hasAttribute('data-persist'))) n.remove();
      });

      shown = path;
      site.swapped = true;

      headScripts.forEach(function (s) { head.appendChild(inline(s)).remove(); });
      return addBody([].slice.call(doc.body.childNodes), body.firstChild).then(function () {
        window.scrollTo(0, y);
      });
    });
  }

  // Adds the page's body in order, running its scripts as a page load would. Shared scripts
  // it needs (player.js, nav.js, cursor.js) load first if this visit hasn't had them yet.
  function addBody(nodes, before) {
    var body = document.body;
    var i = 0;
    function next() {
      for (; i < nodes.length; i++) {
        var n = nodes[i];
        if (n.nodeName !== 'SCRIPT') { body.insertBefore(document.importNode(n, true), before); continue; }
        if (!n.hasAttribute('src')) { body.insertBefore(inline(n), before); continue; }
        var src = new URL(n.getAttribute('src'), location.href).href;
        if (loaded.has(src)) continue;
        loaded.add(src);
        i++;
        return new Promise(function (done) {
          var s = document.createElement('script');
          s.src = src;
          s.onload = s.onerror = done;
          body.insertBefore(s, before);
        }).then(next);
      }
    }
    return Promise.resolve().then(next);
  }

  // Back / Forward: the page plays its exit if it has one for there, otherwise straight in.
  // Safari's edge swipe has already slid the page away with its own animation: straight in.
  raw.on(window, 'popstate', function (e) {
    var path = pathOf(location.href);
    if (path === null) { location.reload(); return; }
    if (path === shown || busy) return;
    if (!e.hasUAVisualTransition && scope.back && scope.back(path)) return;
    go(location.href);
  });

  // ---------- Preload ----------
  // Every page's HTML, then the images this screen size uses and the fonts (just the Latin
  // files the pages draw with), all into the browser's cache. Progress counts real bytes
  // against each file's size from the server; it's known (not null) once every file has
  // answered with its size.
  var files = [];
  var listed = false; // every file is in `files`
  var progress = null;

  function counted(url, opts) {
    var f = { size: 0, got: 0, sized: false, done: false };
    files.push(f);
    return fetch(url, opts).then(function (res) {
      if (!res.ok) throw new Error(url + ': ' + res.status);
      f.size = +res.headers.get('content-length') || 0;
      f.sized = true;
      report();
      var chunks = [];
      if (!res.body || !res.body.getReader) return res.arrayBuffer().then(function (b) { return [b]; });
      var reader = res.body.getReader();
      return (function pump() {
        return reader.read().then(function (r) {
          if (r.done) return chunks;
          chunks.push(r.value);
          f.got += r.value.length;
          report();
          return pump();
        });
      })();
    }).then(function (chunks) {
      f.done = true;
      report();
      return chunks;
    }, function (err) {
      f.sized = f.done = true;
      report();
      throw err;
    });
  }

  function report() {
    if (!listed || files.some(function (f) { return !f.sized; })) return;
    var size = 0, got = 0;
    files.forEach(function (f) {
      size += f.size;
      // Compressed pages arrive as more bytes than they were sent as
      got += f.done ? f.size : Math.min(f.got, f.size);
    });
    var p = files.every(function (f) { return f.done; }) ? 1 : size ? Math.min(got / size, .99) : 0;
    if (p === progress) return;
    progress = p;
    scope.progress.forEach(function (fn) { fn(p); });
  }

  // The images a page shows at this screen size
  function images(doc) {
    var urls = [];
    var other = new Set(); // the other screen size's version, also named in the CSS
    [].forEach.call(doc.querySelectorAll('link[rel="preload"][as="image"]'), function (l) {
      var media = l.getAttribute('media');
      if (media && !matchMedia(media).matches) other.add(l.getAttribute('href'));
      else urls.push(l.getAttribute('href'));
    });
    [].forEach.call(doc.querySelectorAll('img[src]'), function (img) {
      var src = img.getAttribute('src');
      if (img.parentNode.nodeName === 'PICTURE') {
        var source = [].filter.call(img.parentNode.querySelectorAll('source[srcset]'), function (s) {
          return matchMedia(s.getAttribute('media') || 'all').matches;
        })[0];
        if (source) src = source.getAttribute('srcset');
      }
      urls.push(src);
    });
    [].forEach.call(doc.querySelectorAll('style'), function (s) {
      // (inline SVGs first: their insides have url()s of their own)
      s.textContent.replace(/url\(\s*(["'])data:.*?\1\s*\)/g, '').replace(/url\(\s*['"]?([^'")]+?)['"]?\s*\)/g, function (m, u) {
        if (!/^(data:|#)/.test(u)) urls.push(u);
      });
    });
    return urls.filter(function (u) { return !other.has(u); });
  }

  // The Latin font files a page's Google Fonts stylesheet points to
  function fonts(css) {
    var urls = [];
    css.replace(/\/\*\s*latin\s*\*\/\s*@font-face\s*\{[^}]*?url\(([^)]+)\)/g, function (m, u) { urls.push(u); });
    return urls;
  }

  function preload() {
    var order = PAGES.filter(function (p) { return p !== shown; });
    if (shown) order.unshift(shown);
    var assets = new Set(), sheets = new Set();
    var settled = function (p) { return p.catch(function () {}); };

    Promise.all(order.map(function (path) {
      return settled(page(path).then(function (text) {
        var doc = new DOMParser().parseFromString(text, 'text/html');
        images(doc).forEach(function (u) { assets.add(new URL(u, location.origin + path).href); });
        return Promise.all([].map.call(doc.querySelectorAll('link[rel="stylesheet"][href^="https://fonts.googleapis.com"]'), function (l) {
          var href = l.getAttribute('href');
          if (sheets.has(href)) return;
          sheets.add(href);
          // credentials: omit, like the browser's own font requests, so they share the cache
          return settled(counted(href, { credentials: 'omit' }).then(function (chunks) { return new Blob(chunks).text(); }).then(function (css) {
            fonts(css).forEach(function (u) { assets.add(u); });
          }));
        }));
      }));
    })).then(function () {
      var all = [];
      assets.forEach(function (u) {
        var font = u.indexOf(location.origin) !== 0;
        all.push(settled(counted(u, font ? { credentials: 'omit' } : undefined)));
      });
      listed = true;
      report();
      return Promise.all(all);
    }).then(function () {
      // Every page's fonts ready ahead of it (their families don't overlap)
      sheets.forEach(function (href) {
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.setAttribute('data-persist', '');
        document.head.appendChild(link);
      });
    });
  }

  raw.on(document, 'DOMContentLoaded', preload);

  var site = BTD.site = {
    // Show the page at href (after the current page's own exit)
    go: go,
    // Start fetching it now, during the exit
    prefetch: function (href) { var path = pathOf(href); if (path !== null) page(path).catch(function () {}); },
    // The page's own exit for Back/Forward: fn(path) returns true if it's leaving for there
    onBack: function (fn) { scope.back = fn; },
    // The page path of a link ('/ensete'), whatever its form; null if it isn't one of the pages
    pathOf: pathOf,
    // For a page's promise callbacks (which can't be stopped): returns a check that's false
    // once the page that asked has been swapped out
    alive: function () { var s = scope; return function () { return s === scope; }; },
    // fn(p): the preload's progress, 0 to 1, or null until the total is known
    onProgress: function (fn) { scope.progress.push(fn); fn(progress); },
    // False on the page the visit started on (or a reload), true once a page has been swapped in
    swapped: false
  };
})();
