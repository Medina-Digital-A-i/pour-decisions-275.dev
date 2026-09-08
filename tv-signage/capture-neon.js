const puppeteer = require('puppeteer-core');
const path = require('path');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const N = parseInt(process.env.FRAMES || '900', 10);   // 30s @ 30fps
const FILE = process.env.FILE || 'board-neon-A.html';
const OUT = process.env.OUT || path.join(__dirname, 'frames');
const START = parseInt(process.env.START || '0', 10); const COUNT = parseInt(process.env.COUNT || String(N), 10);
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-color-profile=srgb', '--hide-scrollbars'], defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 } });
  const page = await browser.newPage();
  await page.goto('file://' + path.join(__dirname, FILE), { waitUntil: 'networkidle0' });
  try { await page.waitForFunction('window.__fontsReady === true', { timeout: 15000 }); } catch (e) { console.log('fonts: timeout, continuing'); }
  await new Promise(r => setTimeout(r, 800));
  const t0 = Date.now();
  for (let i = START; i < Math.min(N, START + COUNT); i++) {
    await page.evaluate((i, N) => window.drawFrame(i, N), i, N);
    await page.screenshot({ path: path.join(OUT, 'frame_' + String(i).padStart(4, '0') + '.png'), clip: { x: 0, y: 0, width: 1920, height: 1080 } });
    if (i % 150 === 0) console.log(`${FILE} frame ${i}/${N} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  }
  console.log(`done ${N} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  await Promise.race([browser.close(), new Promise(r => setTimeout(r, 5000))]); // never hang on exit
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
