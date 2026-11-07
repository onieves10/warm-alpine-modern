// Render the mood board to a pixel-perfect, single-page PDF via system Chrome.
const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SRC = 'file://' + path.resolve(__dirname, 'moodboard-source.html');
const OUT = path.resolve(__dirname, 'Warm-Alpine-Modern.pdf');
const WIDTH = 1440; // the board's design canvas width

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--font-render-hinting=none', '--force-color-profile=srgb'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: 1400, deviceScaleFactor: 2 });
  await page.goto(SRC, { waitUntil: 'networkidle0', timeout: 120000 });
  await page.evaluate(async () => { if (document.fonts && document.fonts.ready) await document.fonts.ready; });
  await new Promise(r => setTimeout(r, 700)); // let the board's image-injection script settle

  const height = await page.evaluate(() => {
    const el = document.querySelector('[data-document-role="page"]') || document.body;
    return Math.ceil(Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      el.getBoundingClientRect().height
    ));
  });

  await page.addStyleTag({ content: `@page{ size:${WIDTH}px ${height}px; margin:0 } html,body{ margin:0 }` });
  await page.pdf({
    path: OUT,
    width: `${WIDTH}px`,
    height: `${height}px`,
    printBackground: true,
    pageRanges: '1',
  });
  await browser.close();
  console.log('PDF written:', OUT, '— page', WIDTH + 'x' + height + 'px');
})().catch(e => { console.error(e); process.exit(1); });
