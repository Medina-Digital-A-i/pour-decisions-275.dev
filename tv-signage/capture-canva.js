// Renders text-free background plates of the neon boards (one per page) for the Canva import.
// usage: THEME=brand node capture-canva.js   -> canva/bg-<theme>-A1.jpg ... B3.jpg
const puppeteer = require('puppeteer-core');
const path = require('path'); const fs = require('fs');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const THEME = process.env.THEME || 'brand'; const SUF = THEME === 'dark' ? '' : '-' + THEME;
const OUT = path.join(__dirname, 'canva'); fs.mkdirSync(OUT, { recursive: true });
const N = 900;
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-color-profile=srgb', '--hide-scrollbars'], defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 } });
  for (const b of ['A', 'B']) {
    const page = await browser.newPage();
    await page.goto('file://' + path.join(__dirname, `board-neon-${b}${SUF}.html`), { waitUntil: 'networkidle0' });
    try { await page.waitForFunction('window.__fontsReady === true', { timeout: 15000 }); } catch (e) {}
    await page.addStyleTag({ content: '.left,.hdrR,.foot,.dots,.brand .tg{visibility:hidden !important}' });
    await new Promise(r => setTimeout(r, 500));
    for (let pg = 0; pg < 3; pg++) {
      const i = Math.round((pg + 0.5) * N / 3);
      await page.evaluate((i, N) => window.drawFrame(i, N), i, N);
      await page.screenshot({ path: path.join(OUT, `bg-${THEME}-${b}${pg + 1}.jpg`), type: 'jpeg', quality: 88, clip: { x: 0, y: 0, width: 1920, height: 1080 } });
    }
    await page.close(); console.log('plates', b);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
