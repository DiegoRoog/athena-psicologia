import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const qa = path.join(process.cwd(), 'docs', 'qa');
const basePath = process.env.PLAYWRIGHT_BASE_PATH || '';
fs.mkdirSync(qa, { recursive: true });

const diagnostics: { type: string; message: string }[] = [];
function observeBrowser(page: Page) {
  page.on('pageerror', error => diagnostics.push({ type: 'runtime', message: error.message }));
  page.on('console', message => {
    if (message.type() === 'error') diagnostics.push({ type: 'console', message: message.text() });
  });
  page.on('requestfailed', request => diagnostics.push({ type: 'request', message: `${request.url()}: ${request.failure()?.errorText}` }));
}

test.beforeEach(async ({ page }) => {
  diagnostics.length = 0;
  observeBrowser(page);
});

test.afterEach(async ({ browserName }, testInfo) => {
  await testInfo.attach('browser-diagnostics', { body: JSON.stringify({ browser: browserName, events: diagnostics }, null, 2), contentType: 'application/json' });
  expect(diagnostics.filter(entry => entry.type === 'runtime')).toEqual([]);
});

async function ready(page: Page) {
  await page.goto(`${basePath}/`);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.athena')).toHaveAttribute('data-enhanced', 'true');
  await expect(page.locator('.sequence-canvas')).toHaveAttribute('data-status', 'ready');
}

async function atProgress(page: Page, progress: number) {
  await page.evaluate(p => window.scrollTo({ top: (document.documentElement.scrollHeight - innerHeight) * p, behavior: 'instant' }), progress);
  const actual = await page.evaluate(() => scrollY / (document.documentElement.scrollHeight - innerHeight));
  const expected = actual >= 1 ? 239 : Math.min(238, Math.round(actual * 239));
  await expect(page.locator('.sequence-canvas')).toHaveAttribute('data-target-frame', String(expected));
  await expect(page.locator('.sequence-canvas')).toHaveAttribute('data-frame', String(expected));
  await expect(page.locator('.sequence-canvas')).toHaveAttribute('data-status', 'ready');
  return expected;
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
}

test('desktop sequence: endpoints, narrative, pause, reverse and screenshots', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await ready(page);
  await atProgress(page, 0);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/ATHENA\s*PSICOLOGIA/);
  await page.screenshot({ path: path.join(qa, 'desktop-top.png') });
  await atProgress(page, .3);
  await expect(page.locator('#escuta')).toHaveAttribute('aria-hidden', 'false');
  expect(await page.locator('.golden-emblem').evaluate(el => Number(getComputedStyle(el).opacity))).toBeGreaterThan(.9);
  await page.screenshot({ path: path.join(qa, 'desktop-open.png') });
  const paused = await page.locator('.sequence-canvas').getAttribute('data-frame');
  await page.waitForTimeout(800);
  await expect(page.locator('.sequence-canvas')).toHaveAttribute('data-frame', paused!);
  await atProgress(page, .55);
  await expect(page.locator('#perceber')).toHaveAttribute('aria-hidden', 'false');
  expect(await page.locator('.golden-emblem').evaluate(el => Number(getComputedStyle(el).opacity))).toBe(0);
  await page.screenshot({ path: path.join(qa, 'desktop-reflection.png') });
  await atProgress(page, .78);
  await expect(page.locator('#caminho')).toHaveAttribute('aria-hidden', 'false');
  await page.screenshot({ path: path.join(qa, 'desktop-path.png') });
  await atProgress(page, .999);
  await expect(page.locator('.sequence-canvas')).toHaveAttribute('data-frame', '238');
  await atProgress(page, 1);
  await expect(page.locator('.sequence-canvas')).toHaveAttribute('data-frame', '239');
  await expect(page.locator('#contato')).toHaveAttribute('aria-hidden', 'false');
  await page.screenshot({ path: path.join(qa, 'desktop-final.png') });
  await atProgress(page, .3);
  await expect(page.locator('#escuta')).toHaveAttribute('aria-hidden', 'false');
  expect(Number(await page.locator('.sequence-canvas').getAttribute('data-cache-size'))).toBeLessThanOrEqual(28);
  await noOverflow(page);
  expect(errors).toEqual([]);
});

test('rapid scroll, reload mid-page and responsive resize retain correct frame', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => {
    const max = document.documentElement.scrollHeight - innerHeight;
    for (const p of [.8, .1, 1, .4, .9, .55]) scrollTo({ top: max * p, behavior: 'instant' });
  });
  await atProgress(page, .55);
  await page.reload();
  await expect(page.locator('.athena')).toHaveAttribute('data-enhanced', 'true');
  await expect.poll(async () => Number(await page.locator('.sequence-canvas').getAttribute('data-progress'))).toBeGreaterThan(.4);
  const current = await page.evaluate(() => scrollY / (document.documentElement.scrollHeight - innerHeight));
  await atProgress(page, current);
  for (const size of [{ width: 1024, height: 768 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(size);
    await atProgress(page, .78);
    await noOverflow(page);
    await expect(page.locator('#caminho')).toHaveAttribute('aria-hidden', 'false');
  }
});

test('mobile portrait: complete flow and both demonstration dialogs', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  await atProgress(page, 0);
  await expect(page.getByRole('heading', { level: 1 })).toBeInViewport();
  await page.screenshot({ path: path.join(qa, 'mobile-top.png') });
  await atProgress(page, .3);
  await page.screenshot({ path: path.join(qa, 'mobile-open.png') });
  await atProgress(page, .55);
  await page.screenshot({ path: path.join(qa, 'mobile-reflection.png') });
  await atProgress(page, 1);
  await page.screenshot({ path: path.join(qa, 'mobile-final.png') });
  const contact = page.getByRole('button', { name: 'Entre em contato conosco' });
  await expect(contact).toBeInViewport();
  await contact.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('não há agendamentos');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(contact).toBeFocused();
  const social = page.getByRole('button', { name: 'Nos siga em nossas redes sociais' });
  await social.click();
  await expect(page.getByRole('dialog')).toContainText('ainda não existem');
  await page.getByRole('button', { name: 'Continuar explorando' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(social).toBeFocused();
  await noOverflow(page);
});

test('reduced motion: all chapters available with static poster only', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  observeBrowser(page);
  const frameRequests: string[] = [];
  page.on('request', request => { if (/\/frames\//.test(request.url())) frameRequests.push(request.url()); });
  await page.goto(`${basePath}/`);
  await expect(page.locator('.sequence-canvas')).toHaveAttribute('data-status', 'reduced-motion');
  await expect(page.locator('.athena')).not.toHaveAttribute('data-enhanced');
  for (const id of ['inicio', 'escuta', 'perceber', 'caminho', 'contato']) {
    await expect(page.locator(`#${id}`)).toBeVisible();
    expect(await page.locator(`#${id}`).evaluate(el => (el as HTMLElement).inert)).toBe(false);
  }
  await page.locator('#contato').scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'Entre em contato conosco' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.screenshot({ path: path.join(qa, 'mobile-reduced-motion.png'), fullPage: true });
  expect(frameRequests.filter(url => !url.endsWith('/frame-0001.jpg'))).toEqual([]);
  await noOverflow(page);
  await context.close();
});

test('deep links and skip navigation reach the intended chapter with focus', async ({ page }) => {
  await page.goto(`${basePath}/#escuta`);
  await expect(page.locator('.athena')).toHaveAttribute('data-enhanced', 'true');
  await expect(page.locator('#escuta')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('.sequence-canvas')).toHaveAttribute('data-status', 'ready');
  expect(Number(await page.locator('.sequence-canvas').getAttribute('data-progress'))).toBeGreaterThan(.15);
  expect(Number(await page.locator('.sequence-canvas').getAttribute('data-progress'))).toBeLessThan(.44);

  await page.goto(`${basePath}/#contato`);
  await expect(page.locator('#contato')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.getByRole('button', { name: 'Entre em contato conosco' })).toBeInViewport();
  expect(Number(await page.locator('.sequence-canvas').getAttribute('data-progress'))).toBeGreaterThan(.9);

  // Use a fresh navigation so the first Tab starts at the document boundary,
  // independent of the browser's native fragment-focus restoration.
  await page.goto('about:blank');
  await ready(page);
  const hiddenFooter = page.locator('.site-footer');
  await expect.poll(() => hiddenFooter.evaluate(el => (el as HTMLElement).inert)).toBe(true);
  expect(await hiddenFooter.locator('a').evaluate(el => {
    (el as HTMLElement).focus();
    return document.activeElement === el;
  })).toBe(false);
  const skip = page.getByRole('link', { name: 'Ir para as opções de contato' });
  await page.keyboard.press('Tab');
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#contato$/);
  await expect(page.locator('#contato')).toHaveAttribute('aria-hidden', 'false');
  await expect.poll(() => page.evaluate(() => Boolean(document.activeElement?.closest('#contato')))).toBe(true);
  await atProgress(page, 1);
  expect(await hiddenFooter.evaluate(el => (el as HTMLElement).inert)).toBe(false);
});

test('failed frame requests preserve the static artwork and usable contact dialog', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/frames/**', route => route.request().resourceType() === 'fetch' ? route.abort('failed') : route.continue());
  await page.goto(`${basePath}/`);
  const canvas = page.locator('.sequence-canvas');
  const poster = page.locator('.sequence-poster');
  await expect(canvas).toHaveAttribute('data-status', 'fallback');
  await expect.poll(() => poster.evaluate(el => (el as HTMLImageElement).naturalWidth)).toBe(1280);
  await expect(poster).toHaveCSS('opacity', '1');
  await expect(canvas).toHaveCSS('opacity', '0');
  await page.getByRole('link', { name: 'Comece por você' }).click();
  await expect(page.locator('#contato')).toHaveAttribute('aria-hidden', 'false');
  await page.getByRole('button', { name: 'Entre em contato conosco' }).click();
  await expect(page.getByRole('dialog')).toContainText('não há agendamentos');
  await page.keyboard.press('Escape');
  await page.screenshot({ path: path.join(qa, 'desktop-frame-fallback.png') });
  await noOverflow(page);
  expect(errors).toEqual([]);
});

test('JavaScript disabled: narrative and honest demonstration notice are available', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  observeBrowser(page);
  await page.goto(`${basePath}/`);
  for (const id of ['inicio', 'escuta', 'perceber', 'caminho', 'contato']) await expect(page.locator(`#${id}`)).toBeVisible();
  await expect(page.locator('footer')).toContainText('Projeto conceitual de portfólio');
  await page.screenshot({ path: path.join(qa, 'mobile-no-js.png'), fullPage: true });
  await noOverflow(page);
  // Non-functional CTAs must be explained to visitors when scripts are disabled.
  await expect(page.locator('.no-script-note')).toBeVisible();
  await expect(page.locator('.no-script-note')).toContainText(/demonstra|JavaScript/i);
  await context.close();
});

test('compact portrait and landscape keep final content and dialogs reachable', async ({ page }) => {
  for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await ready(page);
    const label = `${viewport.width}x${viewport.height}`;
    await atProgress(page, 0);
    await page.screenshot({ path: path.join(qa, `compact-${label}-top.png`) });
    await atProgress(page, .3);
    await page.screenshot({ path: path.join(qa, `compact-${label}-open.png`) });
    await atProgress(page, 1);
    await page.screenshot({ path: path.join(qa, `compact-${label}-final.png`) });
    await noOverflow(page);
    const header = await page.locator('.site-header').boundingBox();
    const footer = await page.locator('.site-footer').boundingBox();
    for (const selector of ['#contato .eyebrow', '#contato h2', '#contato .body-copy', '#contato .final-actions']) {
      const box = await page.locator(selector).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.y).toBeGreaterThanOrEqual(header!.y + header!.height);
      expect(box!.y + box!.height).toBeLessThanOrEqual(footer!.y);
    }
    const contact = page.getByRole('button', { name: 'Entre em contato conosco' });
    const social = page.getByRole('button', { name: 'Nos siga em nossas redes sociais' });
    await expect(contact).toBeInViewport({ ratio: 1 });
    await expect(social).toBeInViewport({ ratio: 1 });
    await contact.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.screenshot({ path: path.join(qa, `compact-${label}-dialog.png`) });
    await page.getByRole('button', { name: 'Continuar explorando' }).click();
    await expect(contact).toBeFocused();
    await social.click();
    await expect(page.getByRole('dialog')).toContainText('ainda não existem');
    await page.keyboard.press('Escape');
    await expect(social).toBeFocused();
  }
});
