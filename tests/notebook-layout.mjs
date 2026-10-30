import { createRequire } from 'node:module';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const { chromium } = require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/chromium' });

try {
  for (const width of [320, 360, 390, 430, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.setContent(html, { waitUntil: 'domcontentloaded' });

    for (let index = 0; index < 4; index += 1) {
      await page.locator(`[data-go="${index + 1}"]`).click();
      await page.evaluate(() => new Promise(requestAnimationFrame));

      const report = await page.evaluate(() => {
        const pagesBox = document.querySelector('.pages').getBoundingClientRect();
        const visibleSections = [...document.querySelectorAll('[data-note-section]')]
          .filter((section) => Number.parseFloat(getComputedStyle(section).opacity) > 0.05);
        const textBoxes = visibleSections.flatMap((section) =>
          [...section.querySelectorAll('h3,p,li,.step,.note-card')].map((element) => element.getBoundingClientRect()));
        return {
          documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          clipped: textBoxes.some((box) =>
            box.left < pagesBox.left - 0.5 || box.right > pagesBox.right + 0.5 ||
            box.top < pagesBox.top - 0.5 || box.bottom > pagesBox.bottom + 0.5),
        };
      });

      if (report.documentOverflow > 1 || report.clipped) {
        throw new Error(`Страница блокнота ${index + 1} обрезается при ширине ${width}px: ${JSON.stringify(report)}`);
      }
    }
    await page.close();
  }
  console.log('PASS: все страницы блокнота полностью читаются на телефоне, планшете и ПК.');
} finally {
  await browser.close();
}
