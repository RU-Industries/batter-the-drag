const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  for (const [w, h, out] of [[432, 768, 'end-916.png'], [432, 540, 'end-45.png']]) {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2.5 });
    await p.goto('file://' + __dirname + '/endcard.html'); await p.waitForTimeout(1500);
    await p.screenshot({ path: __dirname + '/' + out });
  }
  await b.close();
})();
