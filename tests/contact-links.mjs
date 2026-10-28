import { createRequire } from 'node:module';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const { chromium } = require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/chromium' });

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  const whatsapp = page.locator('#contact .social-row a[aria-label="WhatsApp"]');
  if (await whatsapp.count() !== 1) {
    throw new Error('В разделе «Что в вашем бизнесе отнимает время?» нет одной ссылки WhatsApp');
  }
  if (await whatsapp.getAttribute('href') !== 'https://wa.me/79127630299') {
    throw new Error('В разделе контактов указана неверная ссылка WhatsApp');
  }
  if (await whatsapp.getAttribute('target') !== '_blank' || await whatsapp.getAttribute('rel') !== 'noopener') {
    throw new Error('Ссылка WhatsApp должна безопасно открываться в новой вкладке');
  }
  console.log('WhatsApp присутствует в разделе контактов.');
} finally {
  await browser.close();
}
