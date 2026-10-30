import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const required = [
  '<em>Продавайте больше.</em>',
  '<span>Не теряйте заявки.</span>',
  '<span>Не тратьте время на рутину.</span>',
  '<li><strong>сайты</strong></li>',
  '<li><strong>AI-ассистентов</strong></li>',
  '<li><strong>Автоматизирую рабочие процессы</strong></li>',
  '<img src="irina-ai.jpg"',
  '<a href="#services">Чем помогу</a>',
  '<a href="#about">Обо мне</a>',
  '<a class="mini-cta" href="#contact">Обсудить задачу</a>',
  'href="#contact">Разобрать мою задачу',
  'href="solutions/">Посмотреть решения</a>',
  'id="services"',
  'id="about"',
  'id="contact"',
  '113843787',
  'https://wa.me/79127630299',
];

for (const fragment of required) {
  if (!html.includes(fragment)) throw new Error(`Не найден обязательный фрагмент: ${fragment}`);
}

const hero = html.match(/<section class="hero"[\s\S]*?<\/section>/)?.[0] ?? '';
const order = [
  'Продавайте больше.',
  'Не теряйте заявки.',
  'Не тратьте время на рутину.',
  'Создаю понятные цифровые решения',
  '<ul class="hero-list">',
  'Разобрать мою задачу',
];
let previous = -1;
for (const item of order) {
  const current = hero.indexOf(item);
  if (current <= previous) throw new Error(`Нарушен порядок первого экрана: ${item}`);
  previous = current;
}

if (hero.includes('Автоматизирую рабочие процессы бизнеса')) {
  throw new Error('В согласованном перечислении не должно быть слова «бизнеса»');
}
if (html.length > 1_000_000) {
  throw new Error(`HTML слишком тяжёлый: ${html.length} байт`);
}

for (const [, target] of html.matchAll(/href="#([^"]+)"/g)) {
  if (!html.includes(`id="${target}"`)) {
    throw new Error(`Кнопка ведёт к отсутствующему разделу: #${target}`);
  }
}

console.log('PASS: согласованный первый экран, ссылки, фото и лёгкий HTML проверены.');
