import fs from 'node:fs';

const landingPath = new URL('../solutions/index.html', import.meta.url);
if (!fs.existsSync(landingPath)) throw new Error('Публичная страница /solutions/ отсутствует');

const landing = fs.readFileSync(landingPath, 'utf8');
const home = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const sitemap = fs.readFileSync(new URL('../sitemap.xml', import.meta.url), 'utf8');

const requiredLanding = [
  'https://201325iki-hub.github.io/irina-ai/solutions/',
  'data:image/webp;base64,',
  'href="../"',
  'https://wa.me/79127630299',
  'https://t.me/XgWydWim95I4ZDEy',
  'data-language="ru"',
  'data-language="en"',
  'data-language="it"',
  'href="#email-modal"',
  'id="reviews"',
];
for (const fragment of requiredLanding) {
  if (!landing.includes(fragment)) throw new Error(`В лендинге отсутствует: ${fragment}`);
}
if (!home.includes('https://201325iki-hub.github.io/irina-ai/solutions/')) throw new Error('Сайт-визитка не ведёт на лендинг');
if (!sitemap.includes('https://201325iki-hub.github.io/irina-ai/solutions/')) {
  throw new Error('Лендинг отсутствует в sitemap.xml');
}
if (/\.portrait::before\s*\{/i.test(landing)) throw new Error('Над фотографией остался декоративный ореол');

console.log('PASS: /solutions/ готов к публикации, фото и двусторонняя связь присутствуют.');
