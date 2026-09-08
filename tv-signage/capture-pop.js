// Screen-record a Pop board with headless Chrome. env: FILE=pop-left.html SECS=60 OUT=pop-left.webm
const puppeteer = require('puppeteer-core'); const path = require('path');
const FILE = process.env.FILE, SECS = +(process.env.SECS || 60), OUT = process.env.OUT || FILE.replace('.html', '.webm');
(async () => {
  const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new',
    args: ['--hide-scrollbars', '--window-size=1920,1080', '--force-device-scale-factor=1', '--disable-gpu-vsync', '--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage(); await p.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await p.goto('file://' + path.resolve(FILE), { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 3200)); // let the intro settle -> steady state
  const rec = await p.screencast({ path: OUT, fps: 30 });
  await new Promise(r => setTimeout(r, SECS * 1000));
  await rec.stop(); console.log('recorded', OUT, SECS + 's');
  await Promise.race([b.close(), new Promise(r => setTimeout(r, 4000))]); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
