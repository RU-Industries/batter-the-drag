// Each page's own cursor: a drawn head that follows the mouse and a trail of particles
// behind it, in the page's look. Call BTD.cursor('<kind>') once; kinds are below.
// The head is for a mouse or trackpad: pen and touch keep the normal cursor, and so does a
// page whose script never runs (the system cursor is hidden only once ours draws). Touch
// still gets the effects: a tap bursts, and a finger trails and sprays as it scrolls.
// Reduced motion gets none of it.
(function () {
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function rgba(c, a) { return 'rgba(' + c + ', ' + a + ')'; }

  // A soft round glow: color at full alpha in the middle, gone at r
  function glow(ctx, x, y, r, c, a) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(c, a));
    g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Four-point sparkle
  function sparkle(ctx, x, y, r, turn) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(turn);
    ctx.beginPath();
    for (var i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.moveTo(0, -r);
      ctx.quadraticCurveTo(r * .12, -r * .12, r, 0);
      ctx.quadraticCurveTo(r * .12, r * .12, 0, r);
      ctx.quadraticCurveTo(-r * .12, r * .12, -r, 0);
      ctx.quadraticCurveTo(-r * .12, -r * .12, 0, -r);
    }
    ctx.fill();
    ctx.restore();
  }

  // A watercolor blot for the Big Sleep's brush: a few overlapping lobes, so no two are round
  function blot(x, y, size, grow, c) {
    var lobes = [];
    for (var i = 0; i < 2; i++) {
      lobes.push([rand(-.35, .35), rand(-.35, .35), rand(.6, 1)]);
    }
    return { x: x, y: y, vx: 0, vy: 0, max: rand(1.8, 3), size: size, grow: grow, c: c, lobes: lobes };
  }

  // Each kind:
  //   blend: how the trail mixes with the page
  //   every: px of mouse travel per trail particle
  //   spawn(x, y, dx, dy): one trail particle (dx/dy: this move, px)
  //   burst(x, y): particles for a click
  //   move(p, dt): optional forces on top of velocity
  //   paint(ctx, p, k, t): draw a particle at life k (1 new → 0 gone)
  //   head(ctx, x, y, t, hot, down): the cursor itself (hot: over a link or button)
  //   finger, halo: the fingertip in the swipe hint (nav.js) and the ring that sets it off
  //     from the page, as 'r, g, b'
  var KINDS = {
    // The Wendt: a mote of the light at the end of the tunnel, shedding dust
    mote: {
      blend: 'lighter',
      finger: '255, 248, 214',
      halo: '0, 0, 0',
      every: 7,
      spawn: function (x, y, dx, dy) {
        return { x: x + rand(-4, 4), y: y + rand(-4, 4), vx: dx * .6 + rand(-10, 10), vy: dy * .6 + rand(-14, 4),
          max: rand(1.2, 2.4), size: rand(1.2, 3), c: pick(['255, 250, 222', '255, 244, 200', '214, 232, 168']), f: rand(4, 9) };
      },
      burst: function (x, y) {
        var out = [];
        for (var i = 0; i < 40; i++) {
          var a = rand(0, Math.PI * 2), s = rand(60, 260);
          out.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, max: rand(1.2, 2.2), size: rand(1.4, 3.6), c: '255, 250, 222', f: rand(4, 9) });
        }
        return out;
      },
      move: function (p, dt) {
        p.vx *= Math.pow(.25, dt);
        p.vy = p.vy * Math.pow(.25, dt) - 6 * dt; // dust drifts up in the light
      },
      paint: function (ctx, p, k, t) {
        var a = k * (.55 + .45 * Math.sin(t * p.f + p.max * 9));
        ctx.fillStyle = rgba(p.c, a * .22);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgba(p.c, a);
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      },
      head: function (ctx, x, y, t, hot, down) {
        var r = (hot ? 44 : 32) * (down ? .8 : 1) * (1 + .1 * Math.sin(t * 2.4));
        glow(ctx, x, y, r, '255, 248, 214', .5);
        glow(ctx, x, y, r * .35, '255, 250, 230', .9);
        // A faint dark ring so it still shows over the bright opening
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = 'rgba(40, 38, 24, .35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, hot ? 11 : 7, 0, Math.PI * 2);
        ctx.stroke();
        if (hot) {
          ctx.strokeStyle = 'rgba(255, 250, 222, .9)';
          ctx.beginPath();
          ctx.arc(x, y, 12, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = '#fffbe8';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    },

    // Ensete: a live coal throwing sparks
    ember: {
      blend: 'lighter',
      finger: '255, 190, 110',
      halo: '30, 6, 0',
      every: 5,
      spawn: function (x, y, dx, dy) {
        return { x: x, y: y, vx: -dx * 2 + rand(-60, 60), vy: -dy * 2 + rand(-90, 10), max: rand(.5, 1.1), size: rand(1.4, 3) };
      },
      burst: function (x, y) {
        var out = [];
        for (var i = 0; i < 56; i++) {
          var a = rand(0, Math.PI * 2), s = rand(180, 640);
          out.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 120, max: rand(.6, 1.3), size: rand(1.6, 3.6) });
        }
        return out;
      },
      move: function (p, dt) {
        p.vx *= Math.pow(.2, dt);
        p.vy = p.vy * Math.pow(.2, dt) - 140 * dt; // heat carries them up
      },
      paint: function (ctx, p, k) {
        var c = k > .6 ? '255, 234, 153' : k > .3 ? '255, 138, 42' : '255, 90, 18';
        ctx.strokeStyle = rgba(c, Math.min(1, k * 1.6));
        ctx.lineWidth = p.size * (.4 + k * .6);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * .025, p.y - p.vy * .025);
        ctx.stroke();
      },
      head: function (ctx, x, y, t, hot, down) {
        var f = 1 + .12 * Math.sin(t * 13) * Math.sin(t * 5.3); // flicker
        var r = (hot ? 40 : 30) * (down ? .75 : 1) * f;
        glow(ctx, x, y, r, '255, 90, 18', .6);
        glow(ctx, x, y, r * .45, '255, 170, 70', 1);
        // A charred ring so it reads against the fire
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = 'rgba(40, 12, 0, .55)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, 7.5, 0, Math.PI * 2);
        ctx.stroke();
        if (hot) {
          ctx.strokeStyle = 'rgba(255, 234, 153, .85)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(x, y, 12, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = '#fff4cc';
        ctx.beginPath();
        ctx.arc(x, y, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    },

    // The Universe Is Ours: a turning star leaving a trail of small ones
    star: {
      blend: 'lighter',
      finger: '201, 211, 227',
      halo: '0, 0, 0',
      every: 9,
      spawn: function (x, y, dx, dy) {
        return { x: x + rand(-6, 6), y: y + rand(-6, 6), vx: dx * .3 + rand(-8, 8), vy: dy * .3 + rand(-8, 8),
          max: rand(1, 2.2), size: rand(1.5, 5), c: pick(['255, 255, 255', '201, 211, 227', '169, 200, 238', '120, 160, 230', '196, 170, 240']),
          spin: rand(-2, 2), f: rand(3, 8) };
      },
      burst: function (x, y) {
        var out = [];
        for (var i = 0; i < 24; i++) {
          var a = i / 24 * Math.PI * 2, s = rand(220, 300);
          out.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, max: rand(.9, 1.3), size: rand(6, 12), c: '201, 211, 227', spin: rand(-3, 3), f: 6 });
        }
        return out;
      },
      move: function (p, dt) {
        p.vx *= Math.pow(.3, dt);
        p.vy *= Math.pow(.3, dt);
      },
      paint: function (ctx, p, k, t) {
        var a = k * (.5 + .5 * Math.sin(t * p.f + p.max * 7));
        ctx.fillStyle = rgba(p.c, a);
        if (p.size < 2.5) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          sparkle(ctx, p.x, p.y, p.size * (.6 + .4 * k), t * p.spin);
        }
      },
      head: function (ctx, x, y, t, hot, down) {
        var r = (hot ? 16 : 11) * (down ? .75 : 1);
        glow(ctx, x, y, r * 2.2, '102, 147, 200', .45);
        ctx.fillStyle = '#f4f8ff';
        sparkle(ctx, x, y, r, t * .9);
        ctx.fillStyle = 'rgba(169, 200, 238, .8)';
        sparkle(ctx, x, y, r * .55, -t * 1.4 + .4);
      }
    },

    // The Big Sleep: a wet brush, blooming watercolor where it's been
    paint: {
      blend: 'multiply',
      finger: '98, 88, 132',
      halo: '255, 255, 255',
      every: 8,
      spawn: function (x, y, dx, dy) {
        // Off the line a little, to either side, so it reads as brushwork rather than beads
        var d = Math.hypot(dx, dy) || 1, side = rand(-5, 5);
        return blot(x - dy / d * side, y + dx / d * side, rand(5, 9), rand(5, 13),
          pick(['126, 118, 160', '118, 130, 158', '150, 118, 84', '126, 118, 160']));
      },
      burst: function (x, y) {
        var out = [blot(x, y, 18, 60, '126, 118, 160')];
        for (var i = 0; i < 10; i++) {
          var a = rand(0, Math.PI * 2), d = rand(32, 80);
          out.push(blot(x + Math.cos(a) * d, y + Math.sin(a) * d, rand(3, 6), rand(6, 16), pick(['126, 118, 160', '150, 118, 84'])));
        }
        return out;
      },
      paint: function (ctx, p, k) {
        // Spreads fast then slows, like pigment in wet paper; each lobe's edge stays darker than its middle
        var a = .14 * Math.min(1, k * 2.5);
        for (var i = 0; i < p.lobes.length; i++) {
          var l = p.lobes[i];
          var r = (p.size + p.grow * (1 - k * k)) * l[2];
          var lx = p.x + l[0] * r, ly = p.y + l[1] * r;
          var g = ctx.createRadialGradient(lx, ly, 0, lx, ly, r);
          g.addColorStop(0, rgba(p.c, a * .6));
          g.addColorStop(.85, rgba(p.c, a * .85));
          g.addColorStop(.95, rgba(p.c, a));
          g.addColorStop(1, rgba(p.c, 0));
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(lx, ly, r, 0, Math.PI * 2);
          ctx.fill();
        }
      },
      head: function (ctx, x, y, t, hot, down) {
        var r = (hot ? 13 : 8) * (down ? .8 : 1);
        ctx.globalCompositeOperation = 'source-over';
        var g = ctx.createRadialGradient(x - r * .25, y - r * .25, 0, x, y, r);
        g.addColorStop(0, 'rgba(126, 118, 160, .35)');
        g.addColorStop(.85, 'rgba(98, 88, 132, .6)');
        g.addColorStop(1, 'rgba(70, 60, 100, .85)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(x, y, r, r * (.92 + .06 * Math.sin(t * 3)), Math.sin(t * .7), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#19140a';
        ctx.beginPath();
        ctx.arc(x, y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    },

    // Unfathomable Depths: a paintbrush loaded with the cover's blue, flicking drops as it
    // goes (the page itself splats on click)
    ink: {
      blend: 'source-over',
      finger: '17, 17, 17',
      halo: '246, 245, 240',
      every: 12,
      spawn: function (x, y, dx, dy) {
        return { x: x + rand(-2, 2), y: y + rand(-2, 2), vx: dx * 5 + rand(-50, 50), vy: dy * 5 + rand(-90, 10),
          max: rand(.5, 1), size: rand(1, 2.8), c: pick(['47, 134, 180', '47, 134, 180', '17, 17, 17']) };
      },
      burst: function (x, y) {
        var out = [];
        for (var i = 0; i < 20; i++) {
          var a = rand(0, Math.PI * 2), s = rand(160, 440);
          out.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 160, max: rand(.6, 1), size: rand(1.6, 4), c: pick(['17, 17, 17', '47, 134, 180']) });
        }
        return out;
      },
      move: function (p, dt) {
        p.vy += 900 * dt; // drops fall
      },
      paint: function (ctx, p, k) {
        ctx.fillStyle = rgba(p.c, Math.min(1, k * 2));
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.size * .8, p.size * (1 + Math.min(.8, Math.abs(p.vy) / 900)), 0, 0, Math.PI * 2);
        ctx.fill();
      },
      // The brush points up-left like a normal cursor, its tip on the hotspot, and leans a
      // little with the stroke
      lean: 0,
      lastX: null,
      head: function (ctx, x, y, t, hot, down) {
        var self = KINDS.ink;
        // (a jump means it just came back onto the page: no swing)
        if (self.lastX !== null && Math.abs(x - self.lastX) < 150) self.lean += (Math.max(-.5, Math.min(.5, (x - self.lastX) * .03)) - self.lean) * .15;
        self.lastX = x;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 4 - (hot ? .2 : 0) + self.lean);
        ctx.scale(hot ? 1.15 : 1, hot ? 1.15 : 1);
        if (down) ctx.translate(-2, 0);
        // Handle
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.moveTo(23, -3.6);
        ctx.lineTo(52, -2.4);
        ctx.quadraticCurveTo(56, 0, 52, 2.4);
        ctx.lineTo(23, 3.6);
        ctx.closePath();
        ctx.fill();
        // Ferrule
        ctx.fillStyle = '#8c9094';
        ctx.fillRect(13, -4.2, 11, 8.4);
        ctx.fillStyle = '#111';
        ctx.fillRect(16, -4.2, 1.2, 8.4);
        // Bristles, dark at the root, loaded with blue toward the tip
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(4, -4, 13.5, -3.8);
        ctx.lineTo(13.5, 3.8);
        ctx.quadraticCurveTo(4, 4, 0, 0);
        ctx.fill();
        ctx.fillStyle = '#2f86b4';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(3, -3.4, 8, -3.4);
        ctx.quadraticCurveTo(6.5, 0, 8, 3.4);
        ctx.quadraticCurveTo(3, 3.4, 0, 0);
        ctx.fill();
        ctx.restore();
      }
    }
  };

  // Discography: a plain ring, rippling on click
  KINDS.ring = {
    blend: 'source-over',
    every: Infinity,
    burst: function (x, y) {
      return [{ x: x, y: y, vx: 0, vy: 0, max: .8 }];
    },
    paint: function (ctx, p, k) {
      ctx.strokeStyle = 'rgba(236, 235, 230, ' + k * .6 + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 14 + (1 - k) * 80, 0, Math.PI * 2);
      ctx.stroke();
    },
    head: function (ctx, x, y, t, hot, down) {
      ctx.strokeStyle = 'rgba(236, 235, 230, .6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, (hot ? 24 : 14) * (down ? .8 : 1), 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ecebe6';
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  var MAX_PARTICLES = 260;
  var DRAG_EVERY = 36; // px of dragging per extra spray of the click effect
  var HOT = 'a, button, input, label, select, [role="button"], .stage';

  var BTD = window.BTD || (window.BTD = {});
  BTD.cursor = function (name) {
    var kind = KINDS[name];
    BTD.cursor.demo = null; // (the last page's, until this one's is ready)
    if (!kind || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:2147483000;pointer-events:none';
    var ctx = canvas.getContext('2d');
    var style = document.createElement('style');
    style.textContent = 'html.has-cursor, html.has-cursor * { cursor: none !important; }' +
      'html.is-spraying { -webkit-user-select: none; user-select: none; }';
    document.head.appendChild(style);

    var dpr, w, h;
    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    size();
    window.addEventListener('resize', size);

    var x = 0, y = 0;
    var shown = false, hot = false, down = false;
    var demo = null;
    var travel = 0, dragTravel = 0;
    var parts = [];
    var frame = 0, last = 0;

    function add(list) {
      for (var i = 0; i < list.length; i++) {
        list[i].life = list[i].max;
        parts.push(list[i]);
      }
      // Over the cap the oldest go first, so a click always shows
      if (parts.length > MAX_PARTICLES) parts.splice(0, parts.length - MAX_PARTICLES);
    }

    // Holding the button down and dragging keeps the click effect going: part of a burst at a time
    function spray(sx, sy) {
      add(kind.burst(sx, sy).filter(function (p, i) { return i === 0 || Math.random() < .3; }));
    }

    function run() {
      if (!canvas.isConnected) document.body.appendChild(canvas);
      if (!frame) { last = performance.now(); frame = requestAnimationFrame(tick); }
    }

    // A move from (fx, fy) to (tx, ty): the trail laid evenly along it, however far it went
    // this frame, and while spraying, part of the click effect every DRAG_EVERY px
    function stroke(fx, fy, tx, ty, spraying) {
      var dx = tx - fx, dy = ty - fy;
      var dist = Math.hypot(dx, dy);
      travel += dist;
      var n = Math.floor(travel / kind.every), step = kind.every;
      if (n > 12) { n = 12; step = travel / n; } // a fast flick: fewer, wider-spaced
      for (var i = 1; i <= n; i++) {
        var s = 1 - (travel - i * step) / Math.max(dist, 1);
        add([kind.spawn(fx + dx * s, fy + dy * s, dx / Math.max(1, n), dy / Math.max(1, n))]);
      }
      if (n) travel -= n * step;
      if (!spraying) return;
      dragTravel += dist;
      for (var j = 1; dragTravel >= DRAG_EVERY && j <= 6; j++) {
        dragTravel -= DRAG_EVERY;
        var f = 1 - dragTravel / Math.max(dist, 1);
        spray(fx + dx * f, fy + dy * f);
      }
      dragTravel %= DRAG_EVERY;
    }

    function tick(now) {
      var dt = Math.min(.05, (now - last) / 1000);
      var t = now / 1000;
      last = now;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = kind.blend;
      for (var i = parts.length - 1; i >= 0; i--) {
        var p = parts[i];
        p.life -= dt;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        if (kind.move) kind.move(p, dt);
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        kind.paint(ctx, p, p.life / p.max, t);
      }
      if (shown) {
        ctx.globalCompositeOperation = kind.blend === 'multiply' ? 'source-over' : kind.blend;
        kind.head(ctx, x, y, t, hot, down);
      }
      if (demo) fingertip(now);
      // Rest once the cursor has left and the trail has faded
      frame = shown || parts.length || demo ? requestAnimationFrame(tick) : 0;
    }

    // ---------- The swipe hint: a fingertip pressing down, gliding across, lifting off ----------
    // A pointing hand, its fingertip at 0,0 (about 43 by 50 px)
    var HAND = new Path2D('M-5 5A5 5 0 0 1 5 5L5 18A4.6 4.6 0 0 1 14 19A4.3 4.3 0 0 1 22 22' +
      'A4 4 0 0 1 29 25.5L29 34C29 44 23 50 14 50L6 50C1 50-2 48-5 45L-14 34A3.6 3.6 0 0 1-9 29L-5 32Z');
    var CREASES = new Path2D('M5 18L5 26M14 19L14 27M22 22L22 28');
    // It trails the page's own effect, like a real finger would.
    function fingertip(now) {
      var k = (now - demo.start) / demo.ms;
      if (k >= 1) { demo = null; return; }
      var press = Math.min(1, k / .18);         // touches down
      var lift = Math.max(0, (k - .82) / .18);  // and lets go
      var glide = Math.min(1, Math.max(0, (k - .18) / .64));
      glide = glide < .5 ? 2 * glide * glide : 1 - Math.pow(-2 * glide + 2, 2) / 2;
      var fx = demo.fx + (demo.tx - demo.fx) * glide;
      var fy = demo.fy + (demo.ty - demo.fy) * glide;
      if (glide > 0 && lift === 0) stroke(demo.x, demo.y, fx, fy, false);
      demo.x = fx;
      demo.y = fy;
      var a = press * (1 - lift);
      var r = 22 - 4 * press + 6 * lift;
      ctx.globalCompositeOperation = 'source-over';
      glow(ctx, fx, fy, r * 1.8, kind.finger, .22 * a);
      ctx.strokeStyle = rgba(kind.halo, .55 * a);
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(fx, fy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = rgba(kind.finger, .16 * a);
      ctx.strokeStyle = rgba(kind.finger, .75 * a);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(fx, fy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // and the hand it belongs to, pointing up into the ring, pressing in and lifting off
      ctx.save();
      ctx.translate(fx, fy + 4);
      ctx.rotate(-.18);
      ctx.scale(1.12 - .12 * press + .1 * lift, 1.12 - .12 * press + .1 * lift);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.fillStyle = rgba(kind.halo, .7 * a);
      ctx.strokeStyle = rgba(kind.halo, .7 * a);
      ctx.lineWidth = 5;
      ctx.fill(HAND);
      ctx.stroke(HAND);
      ctx.strokeStyle = rgba(kind.finger, .95 * a);
      ctx.lineWidth = 1.6;
      ctx.stroke(HAND);
      ctx.stroke(CREASES);
      ctx.restore();
    }

    // nav.js calls this to play the hint from (fx, fy) to (tx, ty)
    BTD.cursor.demo = function (fx, fy, tx, ty, ms) {
      demo = { fx: fx, fy: fy, tx: tx, ty: ty, x: fx, y: fy, ms: ms, start: performance.now() };
      travel = 0;
      run();
    };

    window.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      if (!shown) {
        shown = true;
        document.documentElement.classList.add('has-cursor');
        x = e.clientX;
        y = e.clientY;
      }
      if (down && !(e.buttons & 1)) release(); // let go outside the window
      stroke(x, y, e.clientX, e.clientY, down);
      x = e.clientX;
      y = e.clientY;
      hot = !!(e.target.closest && e.target.closest(HOT));
      run();
    }, { passive: true });

    window.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || !shown) return;
      down = true;
      dragTravel = 0;
      add(kind.burst(e.clientX, e.clientY));
      // Dragging from open page paints rather than selecting text
      if (!e.target.closest('p, li, h1, h2, h3, a, button')) document.documentElement.classList.add('is-spraying');
      run();
    });
    function release() {
      down = false;
      document.documentElement.classList.remove('is-spraying');
    }
    window.addEventListener('pointerup', release);
    // An image would start the browser's own drag and stop the pointer events
    window.addEventListener('dragstart', function (e) {
      if (e.target.tagName === 'IMG' && !e.target.closest('a')) e.preventDefault();
    });

    // Off the page: hide ours (the trail finishes on its own)
    document.documentElement.addEventListener('mouseleave', function () { shown = false; });
    // Touch or a hovering pen: hand back to the system
    function handBack(e) {
      if (e.pointerType === 'mouse') return;
      shown = false;
      document.documentElement.classList.remove('has-cursor');
    }
    window.addEventListener('pointerdown', handBack);
    window.addEventListener('pointermove', handBack, { passive: true });

    // Touch: the finger trails and sprays as it goes, scrolling as normal (touch events keep
    // coming while the page scrolls, where pointer events stop), and a tap bursts like a click
    var finger = null;
    window.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) { finger = null; return; } // a pinch or two-finger scroll
      var t = e.touches[0];
      finger = { id: t.identifier, x: t.clientX, y: t.clientY, moved: 0 };
      travel = dragTravel = 0;
    }, { passive: true });
    window.addEventListener('touchmove', function (e) {
      var t = finger && e.touches.length === 1 && e.touches[0];
      if (!t || t.identifier !== finger.id) return;
      finger.moved += Math.hypot(t.clientX - finger.x, t.clientY - finger.y);
      stroke(finger.x, finger.y, t.clientX, t.clientY, true);
      finger.x = t.clientX;
      finger.y = t.clientY;
      run();
    }, { passive: true });
    window.addEventListener('touchend', function () {
      if (finger && finger.moved < 10) { add(kind.burst(finger.x, finger.y)); run(); }
      finger = null;
    }, { passive: true });
    window.addEventListener('touchcancel', function () { finger = null; }, { passive: true });
  };
})();
