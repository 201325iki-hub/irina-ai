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
  'id="channel-modal"',
  'id="choose-channel"',
  'data-channel="email"',
  'id="reviews"',
  'href="#service-site"',
  'href="#service-ai"',
  'href="#service-bot"',
  'href="#service-automation"',
  'id="service-site"',
  'id="service-ai"',
  'id="service-bot"',
  'id="service-automation"',
  '* Сроки зависят от объёма работы. Они будут указаны в КП после согласования работы.',
];
for (const fragment of requiredLanding) {
  if (!landing.includes(fragment)) throw new Error(`В лендинге отсутствует: ${fragment}`);
}
if (!home.includes('https://201325iki-hub.github.io/irina-ai/solutions/')) throw new Error('Сайт-визитка не ведёт на лендинг');
if (!sitemap.includes('https://201325iki-hub.github.io/irina-ai/solutions/')) {
  throw new Error('Лендинг отсутствует в sitemap.xml');
}
if (/\.portrait::before\s*\{/i.test(landing)) throw new Error('Над фотографией остался декоративный ореол');
if (/<ul class="hero-list"[^>]*>[\s\S]*?<li>\s*(?!<a\b)/u.test(landing)) {
  throw new Error('Плашки первого экрана должны быть интерактивными ссылками');
}
if (!/\.service-card:target/u.test(landing)) throw new Error('Целевая карточка решения не выделяется после перехода');

console.log('PASS: /solutions/ содержит интерактивные плашки, пояснение о сроках, фото и двустороннюю связь.');
