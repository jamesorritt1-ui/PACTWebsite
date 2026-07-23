// Render a local HTML file to a print-quality PDF using pre-installed Chromium.
// Usage: node render.js input.html output.pdf
const puppeteer = require('puppeteer-core');
const path = require('path');

// Path to a Chromium/Chrome executable. Override with CHROME_PATH for your machine.
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

(async () => {
  const input = path.resolve(process.argv[2]);
  const output = path.resolve(process.argv[3]);
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
  });
  const page = await browser.newPage();
  await page.goto('file://' + input, { waitUntil: 'networkidle0' });
  // Ensure all @font-face fonts are loaded before printing
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.pdf({
    path: output,
    width: '210mm',
    height: '297mm',
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });
  await browser.close();
  console.log('WROTE', output);
})().catch(e => { console.error(e); process.exit(1); });
