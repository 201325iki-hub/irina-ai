import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(new URL('..', import.meta.url).pathname);
const server = http.createServer((request, response) => {
  const relative = decodeURIComponent(new URL(request.url, 'http://preview.local').pathname).replace(/^\/+/, '') || 'index.html';
  const filePath = path.resolve(root, relative);
  if (!filePath.startsWith(`${root}${path.sep}`) || !fs.existsSync(filePath)) return response.writeHead(404).end('Not found');
  response.setHeader('Content-Type', filePath.endsWith('.html') ? 'text/html; charset=utf-8' : 'image/webp');
  fs.createReadStream(filePath).pipe(response);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));

const browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/chromium' });
try {
  for (const file of ['index.html', 'solutions/index.html']) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'ru-RU' });
    await page.goto(`http://127.0.0.1:${server.address().port}/${file}`, { waitUntil: 'load' });
    assert.equal(await page.locator('[data-contact-entry][href^="http"], [data-contact-entry][href^="mailto:"]').count(), 0, `${file}: входы в связь не обходят форму`);
    assert.equal(await page.locator('#choose-channel').isDisabled(), true, `${file}: выбор канала заблокирован до заполнения`);
    await page.locator('#contact-name').fill('Анна');
    await page.locator('#contact-reply').fill('anna@example.com');
    await page.locator('#contact-task').fill('Нужен сайт');
    await page.locator('#processing-consent').check();
    await page.locator('#privacy-awareness').check();
    assert.equal(await page.locator('#choose-channel').isEnabled(), true, `${file}: выбор канала разблокируется после формы и двух галочек`);
    await page.locator('#choose-channel').click();
    const email = await page.locator('[data-channel="email"]').evaluate(element => ({ href: element.getAttribute('href'), target: element.getAttribute('target') }));
    assert.equal(email.target, '_top', `${file}: Email открывается верхним окном`);
    assert.match(email.href, /^mailto:20\.13\.25\.iki@gmail\.com\?subject=.+&body=.+/u, `${file}: письмо содержит адрес, тему и текст`);
    assert.equal(await page.locator('[data-channel]').count(), 5, `${file}: доступны пять каналов связи`);
    await page.close();
  }
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}

console.log('PASS: формы, две галочки, Email и пять каналов проверены на обеих страницах.');
