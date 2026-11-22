import { createRequire } from 'node:module';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const { chromium } = require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/chromium' });

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const waitForPaint = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const focusOutsideNotebook = page => page.evaluate(() => document.activeElement?.blur());
const scrollNotebookIntoView = page => page.evaluate(() => document.querySelector('#business-notebook').scrollIntoView({ block: 'center', behavior: 'instant' }));

async function notebookState(page) {
  return page.evaluate(() => ({
    active: document.querySelector('.note-section.active')?.dataset.noteSection,
    visible: [...document.querySelectorAll('[data-note-section]')]
      .filter(section => section.getAttribute('aria-hidden') === 'false' && !section.inert)
      .map(section => section.dataset.noteSection),
    currentDot: document.querySelector('.dot[aria-current="page"]')?.dataset.go,
  }));
}

try {
  for (const language of ['ru', 'en', 'it']) {
    for (const width of [320, 360, 390, 430, 768, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      await page.locator(`[data-language="${language}"]`).click();

      const notebook = page.locator('#business-notebook');
      await notebook.scrollIntoViewIfNeeded();
      await notebook.focus();

      for (let index = 0; index < 4; index += 1) {
        await page.locator(`[data-go="${index + 1}"]`).click();
        await page.waitForTimeout(850);

        const report = await page.evaluate(() => {
          const pagesBox = document.querySelector('.pages').getBoundingClientRect();
          const visibleSections = [...document.querySelectorAll('[data-note-section]')]
            .filter(section => section.getAttribute('aria-hidden') === 'false' && !section.inert);
          const textBoxes = visibleSections.flatMap(section =>
            [...section.querySelectorAll('h3,h4,p,li,.step,.note-card,.photo-accent')]
              .map(element => element.getBoundingClientRect()));
          return {
            documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            clipped: textBoxes.some(box =>
              box.left < pagesBox.left - 0.5 || box.right > pagesBox.right + 0.5 ||
              box.top < pagesBox.top - 0.5 || box.bottom > pagesBox.bottom + 0.5),
            activeCount: document.querySelectorAll('.note-section.active').length,
            visibleCount: visibleSections.length,
            turningCount: document.querySelectorAll('.turning-out,.is-flipping').length,
          };
        });

        assert(report.documentOverflow <= 1 && !report.clipped,
          `Страница ${index + 1}, язык ${language}, ширина ${width}px обрезается: ${JSON.stringify(report)}`);
        assert(report.activeCount === 1 && report.visibleCount === 1 && report.turningCount === 0,
          `Некорректное состояние страниц: ${JSON.stringify(report)}`);
      }

      const toggleLabel = await page.locator('#notebook-toggle').getAttribute('aria-label', { timeout: 500 });
      assert(toggleLabel && !toggleLabel.includes('undefined'), `Нет перевода кнопки паузы для ${language}`);
      await page.close();
    }
  }

  const page = await browser.newPage({ viewport: { width: 1024, height: 900 } });
  await page.clock.install();
  await page.setContent(html, { waitUntil: 'domcontentloaded' });

  const structure = await page.evaluate(() => ({
    arrows: document.querySelectorAll('#notebook-prev,#notebook-next').length,
    externalPhoto: Boolean(document.querySelector('.paper-section > .wrap > .photo-accent')),
    pageTwoPhoto: Boolean(document.querySelector('[data-note-section="2"] .photo-accent img')),
    pageTwoTitle: document.querySelector('[data-note-section="2"] h3')?.textContent.trim(),
    pageTwoSubtitle: document.querySelector('[data-note-section="2"] h4')?.textContent.trim(),
    photoLoading: document.querySelector('[data-note-section="2"] .photo-accent img')?.loading,
  }));
  assert(structure.arrows === 2, 'У блокнота должны быть обе видимые стрелки перелистывания');
  assert(!structure.externalPhoto && structure.pageTwoPhoto, 'Фото должно находиться внутри страницы 2');
  assert(structure.pageTwoTitle === 'Личное участие на каждом этапе.', 'Неверный заголовок страницы 2');
  assert(structure.pageTwoSubtitle === 'Что вы получите', 'Не сохранён подзаголовок выгод');
  assert(structure.photoLoading === 'eager', 'Фото страницы 2 должно загружаться сразу');

  await page.locator('#notebook-next').click();
  assert((await notebookState(page)).active === '2', 'Правая стрелка не открывает следующую страницу');
  await page.locator('#notebook-prev').click();
  assert((await notebookState(page)).active === '1', 'Левая стрелка не открывает предыдущую страницу');
  await focusOutsideNotebook(page);
  await page.locator('body').hover({ position: { x: 1, y: 1 } });

  const notebook = page.locator('#business-notebook');
  await scrollNotebookIntoView(page);
  await waitForPaint(page);
  await page.clock.fastForward(14001);
  assert((await notebookState(page)).active === '2', 'Автоперелистывание не открыло страницу 2');

  await page.locator('[data-go="4"]').click();
  await focusOutsideNotebook(page);
  await scrollNotebookIntoView(page);
  await page.mouse.move(5, 5);
  await waitForPaint(page);
  await page.clock.fastForward(14001);
  const loopState = await page.evaluate(() => ({
    active: document.querySelector('.note-section.active')?.dataset.noteSection,
    activeElement: document.activeElement?.className,
    live: document.querySelector('.pages')?.getAttribute('aria-live'),
    notebookHovered: document.querySelector('#business-notebook')?.matches(':hover'),
    notebookRect: document.querySelector('#business-notebook')?.getBoundingClientRect().toJSON(),
  }));
  assert(loopState.active === '1', `Автоперелистывание не зациклено 4→1: ${JSON.stringify(loopState)}`);

  await notebook.hover();
  await page.clock.fastForward(20000);
  assert((await notebookState(page)).active === '1', 'Hover не приостанавливает автоперелистывание');
  await page.mouse.move(5, 5);

  await notebook.focus();
  await page.clock.fastForward(20000);
  assert((await notebookState(page)).active === '1', 'Focus не приостанавливает автоперелистывание');
  await focusOutsideNotebook(page);

  await page.evaluate(() => {
    const target = document.querySelector('.pages');
    const touch = new Touch({ identifier: 1, target, clientX: 200, clientY: 100 });
    target.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, changedTouches: [touch] }));
  });
  await page.clock.fastForward(20000);
  assert((await notebookState(page)).active === '1', 'Touch не приостанавливает автоперелистывание');
  await page.evaluate(() => {
    const target = document.querySelector('.pages');
    const touch = new Touch({ identifier: 1, target, clientX: 200, clientY: 100 });
    target.dispatchEvent(new TouchEvent('touchend', { bubbles: true, changedTouches: [touch] }));
  });

  await page.locator('#notebook-toggle').click();
  await focusOutsideNotebook(page);
  await page.clock.fastForward(20000);
  assert((await notebookState(page)).active === '1', 'Кнопка паузы не останавливает автоперелистывание');
  await page.locator('#notebook-toggle').click();
  await page.mouse.move(5, 5);
  await focusOutsideNotebook(page);
  await page.clock.fastForward(14001);
  const resumedState = await page.evaluate(() => ({
    active: document.querySelector('.note-section.active')?.dataset.noteSection,
    pressed: document.querySelector('#notebook-toggle')?.getAttribute('aria-pressed'),
    live: document.querySelector('.pages')?.getAttribute('aria-live'),
    notebookHovered: document.querySelector('#business-notebook')?.matches(':hover'),
    notebookRect: document.querySelector('#business-notebook')?.getBoundingClientRect().toJSON(),
  }));
  assert(resumedState.active === '2', `Кнопка продолжения не возобновляет автоперелистывание: ${JSON.stringify(resumedState)}`);

  await notebook.focus();
  await page.keyboard.press('ArrowRight');
  assert((await notebookState(page)).active === '3', 'ArrowRight не переключает страницу');
  await page.keyboard.press('Home');
  assert((await notebookState(page)).active === '1', 'Home не открывает первую страницу');
  await page.keyboard.press('End');
  const endState = await notebookState(page);
  assert(endState.active === '4' && endState.visible.length === 1 && endState.currentDot === '4',
    `End/ARIA-состояние некорректно: ${JSON.stringify(endState)}`);
  await page.close();

  const offscreenPage = await browser.newPage({ viewport: { width: 1024, height: 700 } });
  await offscreenPage.clock.install();
  await offscreenPage.setContent(html, { waitUntil: 'domcontentloaded' });
  await offscreenPage.clock.fastForward(20000);
  assert((await notebookState(offscreenPage)).active === '1', 'Блокнот перелистывается вне экрана');
  await scrollNotebookIntoView(offscreenPage);
  await waitForPaint(offscreenPage);
  await offscreenPage.clock.fastForward(14001);
  assert((await notebookState(offscreenPage)).active === '2', 'Блокнот не продолжил работу после появления в экране');
  await offscreenPage.close();

  const hiddenPage = await browser.newPage({ viewport: { width: 1024, height: 900 } });
  await hiddenPage.clock.install();
  await hiddenPage.setContent(html, { waitUntil: 'domcontentloaded' });
  await scrollNotebookIntoView(hiddenPage);
  await waitForPaint(hiddenPage);
  await hiddenPage.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await hiddenPage.clock.fastForward(20000);
  assert((await notebookState(hiddenPage)).active === '1', 'Скрытая вкладка не приостанавливает блокнот');
  await hiddenPage.close();

  const reducedPage = await browser.newPage({ viewport: { width: 1024, height: 900 } });
  await reducedPage.emulateMedia({ reducedMotion: 'reduce' });
  await reducedPage.clock.install();
  await reducedPage.setContent(html, { waitUntil: 'domcontentloaded' });
  await scrollNotebookIntoView(reducedPage);
  await waitForPaint(reducedPage);
  await reducedPage.clock.fastForward(30000);
  const reduced = await reducedPage.evaluate(() => ({
    active: document.querySelector('.note-section.active')?.dataset.noteSection,
    transition: getComputedStyle(document.querySelector('.note-section.active')).transitionDuration,
    toggleHidden: document.querySelector('#notebook-toggle').hidden,
  }));
  assert(reduced.active === '1', 'prefers-reduced-motion не отключает autoplay');
  assert(reduced.transition.split(',').every(value => Number.parseFloat(value) <= 0.00001), `Анимация не отключена: ${reduced.transition}`);
  assert(reduced.toggleHidden, 'Кнопка autoplay должна быть скрыта при reduced motion');
  await reducedPage.locator('[data-go="2"]').click();
  assert((await notebookState(reducedPage)).active === '2', 'Ручное управление не работает при reduced motion');
  await reducedPage.close();

  const printPage = await browser.newPage({ viewport: { width: 1024, height: 900 } });
  await printPage.setContent(html, { waitUntil: 'domcontentloaded' });
  await printPage.emulateMedia({ media: 'print' });
  const print = await printPage.evaluate(() => ({
    visiblePages: [...document.querySelectorAll('.note-section')]
      .filter(section => getComputedStyle(section).display !== 'none' && Number.parseFloat(getComputedStyle(section).opacity) > 0.9).length,
    controls: getComputedStyle(document.querySelector('.notebook-controls')).display,
    overflow: getComputedStyle(document.querySelector('.pages')).overflow,
  }));
  assert(print.visiblePages === 4 && print.controls === 'none' && print.overflow === 'visible',
    `Печатная версия блокнота сломана: ${JSON.stringify(print)}`);
  await printPage.close();

  console.log('PASS: блокнот адаптивен, доступен с клавиатуры, перелистывается автоматически и корректно ставится на паузу.');
} finally {
  await browser.close();
}
