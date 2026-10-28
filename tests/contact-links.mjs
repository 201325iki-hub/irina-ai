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
  const expectedMax = 'https://max.ru/u/f9LHodD0cOLam7rHWCiFmnHQAslcCxm8ibT0nnoDO153oOt2m2lwgbKu2dY';
  const contactMax = page.locator('#contact .social-row a[aria-label="MAX"]');
  const footerMax = page.locator('footer a.footer-icon[aria-label="MAX"]');
  if (await contactMax.count() !== 1 || await footerMax.count() !== 1) {
    throw new Error('MAX должен присутствовать по одному разу в разделе контактов и подвале');
  }
  for (const link of [contactMax, footerMax]) {
    if (await link.getAttribute('href') !== expectedMax) {
      throw new Error('Указана неверная ссылка MAX');
    }
    if (await link.getAttribute('target') !== '_blank' || await link.getAttribute('rel') !== 'noopener') {
      throw new Error('Ссылка MAX должна безопасно открываться в новой вкладке');
    }
  }
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    offenders: [...document.querySelectorAll('body *')]
      .filter((element) => element.getBoundingClientRect().right > window.innerWidth + 1)
      .slice(0, 8)
      .map((element) => {
        const box = element.getBoundingClientRect();
        return `${element.tagName}.${element.className}[${box.left},${box.right},${box.width}]`;
      }),
    keyRects: ['body', '.hero .wrap', '.hero-grid', '#contact .wrap', '#contact .social-row']
      .map((selector) => {
        const element = document.querySelector(selector);
        const box = element?.getBoundingClientRect();
        return [selector, box && { left: box.left, right: box.right, width: box.width }];
      }),
  }));
  if (overflow.scrollWidth > overflow.innerWidth) {
    throw new Error(`После добавления мессенджеров мобильная страница выходит за ширину экрана: ${JSON.stringify(overflow)}`);
  }
  console.log('WhatsApp и MAX присутствуют в контактах; мобильная ширина корректна.');
} finally {
  await browser.close();
}
