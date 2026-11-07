import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(new URL('..', import.meta.url).pathname);
const publicBase = 'https://201325iki-hub.github.io/irina-ai';

const browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/chromium' });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ru-RU' });
const page = await context.newPage();

await page.route(`${publicBase}/**`, async route => {
  const requestUrl = new URL(route.request().url());
  const relative = requestUrl.pathname.replace(/^\/irina-ai\/?/u, '') || 'index.html';
  const candidate = relative.endsWith('/') ? `${relative}index.html` : relative;
  const filePath = path.resolve(root, candidate);
  if (!filePath.startsWith(`${root}${path.sep}`) || !fs.existsSync(filePath)) {
    await route.fulfill({ status: 404, body: 'Not found' });
    return;
  }
  const contentType = filePath.endsWith('.html') ? 'text/html; charset=utf-8' : 'image/webp';
  await route.fulfill({ status: 200, contentType, body: fs.readFileSync(filePath) });
});

async function assertVisibleTarget(selector, id, label) {
  await page.locator(selector).first().click();
  await page.waitForFunction(targetId => {
    const target = document.getElementById(targetId);
    if (!target) return false;
    const box = target.getBoundingClientRect();
    return box.top < innerHeight && box.bottom > 0;
  }, id);
  assert.ok(await page.locator(`#${id}`).isVisible(), `${label}: раздел #${id} должен быть виден`);
}

async function fillAndOpenChannel(label) {
  assert.equal(await page.locator('#choose-channel').isDisabled(), true, `${label}: канал заблокирован до формы и двух галочек`);
  await page.locator('#contact-name').fill('Анна');
  await page.locator('#contact-reply').fill('anna@example.com');
  await page.locator('#contact-task').fill('Нужен сайт');
  await page.locator('#processing-consent').check();
  await page.locator('#privacy-awareness').check();
  assert.equal(await page.locator('#choose-channel').isEnabled(), true, `${label}: канал доступен после заполнения`);
  await page.locator('#choose-channel').click();
  const email = await page.locator('[data-channel="email"]').evaluate(element => ({
    href: element.getAttribute('href'),
    target: element.getAttribute('target'),
  }));
  assert.equal(email.target, '_top', `${label}: Email открывается верхним окном`);
  assert.match(email.href, /^mailto:20\.13\.25\.iki@gmail\.com\?subject=.+&body=.+/u, `${label}: Email содержит адрес, тему и текст`);
  await page.locator('#channel-modal .close-modal').click();
}

try {
  await page.goto(`${publicBase}/`, { waitUntil: 'load' });
  await assertVisibleTarget('.nav a[href="#services"]', 'services', 'Визитка — «Чем помогу»');
  await assertVisibleTarget('.nav a[href="#about"]', 'about', 'Визитка — «Обо мне»');
  await assertVisibleTarget('.nav a[href="#contact"]', 'contact', 'Визитка — «Обсудить задачу»');
  await fillAndOpenChannel('Визитка');

  await page.locator('[data-language="en"]').click();
  await page.locator('.hero-actions a.btn-secondary').click();
  await page.waitForURL(/\/irina-ai\/solutions\/?\?lang=en$/u);
  assert.equal(await page.locator('html').getAttribute('lang'), 'en', 'Лендинг сохраняет EN после перехода');

  for (const pain of ['leads', 'site', 'routine', 'start']) {
    await page.locator(`[data-pain="${pain}"]`).click();
    assert.equal(await page.locator(`[data-pain="${pain}"]`).getAttribute('aria-pressed'), 'true', `Лендинг: работает вариант ${pain}`);
    assert.equal(await page.locator('[data-pain][aria-pressed="true"]').count(), 1, 'Лендинг: активна одна рекомендация');
  }

  const contactIcons = page.locator('.contact-icon');
  for (let index = 0; index < await contactIcons.count(); index += 1) {
    await contactIcons.nth(index).click();
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'contact-name', `Лендинг: значок связи ${index + 1} ведёт к форме`);
  }

  for (const modalId of ['privacy-modal', 'consent-modal', 'offer-modal']) {
    await page.locator(`[data-modal="${modalId}"]`).first().click();
    assert.equal(await page.locator(`#${modalId}`).getAttribute('aria-hidden'), 'false', `Лендинг: ${modalId} открывается`);
    await page.locator(`#${modalId} .close-modal`).click();
  }

  await assertVisibleTarget('.nav-links a[href="#services"]', 'services', 'Лендинг — «Решения»');
  await assertVisibleTarget('.nav-links a[href="#method"]', 'method', 'Лендинг — «Как работаем»');
  await assertVisibleTarget('.nav-links a[href="#reviews"]', 'reviews', 'Лендинг — «Отзывы»');
  await assertVisibleTarget('.nav-links a[href="#contact"]', 'contact', 'Лендинг — «Обсудить задачу»');
  await fillAndOpenChannel('Лендинг');

  await page.locator('[data-language="it"]').click();
  await page.locator('.nav-links a').first().click();
  await page.waitForURL(/\/irina-ai\/?\?lang=it$/u);
  assert.equal(await page.locator('html').getAttribute('lang'), 'it', 'Визитка сохраняет IT после возврата');

  for (const width of [320, 360, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: width <= 430 ? 900 : 1000 });
    for (const url of [`${publicBase}/`, `${publicBase}/solutions/`]) {
      await page.goto(url, { waitUntil: 'load' });
      const report = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        imagesReady: [...document.images].every(image => image.complete && image.naturalWidth > 0),
      }));
      assert.ok(report.overflow <= 1, `${url}: горизонтальный сдвиг ${report.overflow}px на ${width}px`);
      assert.equal(report.imagesReady, true, `${url}: изображения загружены на ${width}px`);
    }
  }
} finally {
  await context.close();
  await browser.close();
}

console.log('PASS release flow: card → landing interactions → card, RU/EN/IT, forms and responsive widths');
