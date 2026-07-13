const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const N = parseInt(process.env.FRAMES || '360', 10);   // 12s @ 30fps
const OUT = path.join(__dirname, 'frames');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--force-color-profile=srgb', '--hide-scrollbars'],
    defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
  });
  const page = await browser.newPage();
  await page.goto('file://' + path.join(__dirname, 'index.html'), { waitUntil: 'load' });
  // wait for the logo image to decode
  await page.waitForFunction('window.__ready && window.__ready()', { timeout: 15000 });

  const t0 = Date.now();
  for (let i = 0; i < N; i++) {
    await page.evaluate((i, N) => window.drawFrame(i, N), i, N);
    const name = 'frame_' + String(i).padStart(4, '0') + '.png';
    await page.screenshot({ path: path.join(OUT, name), clip: { x: 0, y: 0, width: 1920, height: 1080 } });
    if (i % 30 === 0) console.log(`frame ${i}/${N}  (${((Date.now()-t0)/1000).toFixed(1)}s)`);
  }
  console.log(`done ${N} frames in ${((Date.now()-t0)/1000).toFixed(1)}s`);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
