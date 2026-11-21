// Records a phone-size tour of the site as JPEG frames with timestamps (CDP screencast).
// usage: node record.js <outdir> <speed> <holdsJSON>
const { chromium } = require('playwright');
const fs = require('fs');
const [out, speed = '1', holdsArg = '[4500,3500,3500,3500,3500,3500]'] = process.argv.slice(2);
const holds = JSON.parse(holdsArg);
fs.mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch({ channel: 'chrome', args: ['--window-size=432,768', '--force-device-scale-factor=2.5'] });
  const ctx = await b.newContext({ viewport: { width: 432, height: 768 }, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true });
  await ctx.addInitScript(s => { try { localStorage.setItem('btd-timing', JSON.stringify({ enter: s, exit: s })); } catch (e) {} }, +speed);
  // Leave out the swipe hint (word + fingertip): the recording navigates by itself
  await ctx.addInitScript(() => {
    const css = document.createElement('style'); css.textContent = '.swipe-hint{display:none!important}';
    new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.classList && n.classList.contains('swipe-hint')) n.remove(); }))).observe(document, { childList: true, subtree: true });
    setInterval(() => { if (window.BTD && BTD.cursor && BTD.cursor.demo && !BTD.cursor.demo.off) { BTD.cursor.demo = Object.assign(() => {}, { off: true }); } }, 50);
  });
  const p = await ctx.newPage();
  await p.goto('http://localhost:4480/');
  await p.waitForSelector('[data-sound="on"]');
  await p.waitForTimeout(3500); // let it load to READY
  const cdp = await ctx.newCDPSession(p);
  const log = [];
  let n = 0, t0 = null;
  cdp.on('Page.screencastFrame', async f => {
    const t = f.metadata.timestamp; if (t0 === null) t0 = t;
    const name = `f${String(n++).padStart(5, '0')}.jpg`;
    fs.writeFileSync(`${out}/${name}`, Buffer.from(f.data, 'base64'));
    log.push([name, t - t0]);
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1080, maxHeight: 1920, everyNthFrame: 1 });
  const marks = [];
  const mark = m => marks.push([m, t0 === null ? 0 : Date.now() / 1000 - t0]);
  await p.waitForTimeout(600);
  mark('tap-no-sound');
  await p.tap('[data-sound="on"]');
  await p.evaluate(() => window.dispatchEvent(new Event('touchstart'))); // a visitor who touched: no swipe hint
  await p.waitForTimeout(holds[0]);
  for (let i = 1; i < holds.length; i++) {
    const from = p.url();
    mark('next-' + i);
    while (p.url() === from) { await p.keyboard.press('ArrowRight'); await p.waitForTimeout(250); }
    mark('arrived ' + new URL(p.url()).pathname);
    await p.waitForTimeout(150);
    await p.evaluate(() => window.dispatchEvent(new Event('touchstart'))); // a visitor who touched: no swipe hint
    await p.waitForTimeout(holds[i]);
  }
  await cdp.send('Page.stopScreencast');
  await p.waitForTimeout(300);
  fs.writeFileSync(`${out}/frames.json`, JSON.stringify({ log, marks }));
  console.log('frames', n, 'duration', log.length ? log[log.length - 1][1].toFixed(2) : 0, 'marks', JSON.stringify(marks.map(m => [m[0], +m[1].toFixed(2)])));
  await b.close();
})();
