import { expect, test, type Page } from '@playwright/test';

const routes = [
  '/',
  '/app',
  '/insumos',
  '/receitas',
  '/simulador',
  '/vendas',
  '/login',
  '/cadastro',
  '/recuperar-senha',
  '/redefinir-senha',
  '/termos',
  '/privacidade',
  '/conta',
];

async function measure(page: Page) {
  return page.evaluate(() => ({
    viewport: innerWidth,
    document: document.documentElement.scrollWidth,
    overflow: [
      ...document.querySelectorAll<HTMLElement>(
        '.stat, .chart, .bars, .auth-form-inner, .account-card, .modal, .public-header, .hero-copy',
      ),
    ]
      .filter((el) => el.clientWidth && el.scrollWidth > el.clientWidth + 1)
      .map((el) => ({ element: el.className, client: el.clientWidth, scroll: el.scrollWidth })),
    smallControls: [
      ...document.querySelectorAll<HTMLElement>(
        'button, input:not([type=checkbox]), select, a.primary, a.secondary',
      ),
    ]
      .filter(
        (el) =>
          !el.closest('[inert]') &&
          el.getBoundingClientRect().width &&
          (el.getBoundingClientRect().height < 44 || el.getBoundingClientRect().width < 44),
      )
      .map((el) => ({
        label: el.getAttribute('aria-label') || el.textContent?.trim().slice(0, 40) || el.tagName,
        width: el.getBoundingClientRect().width,
        height: el.getBoundingClientRect().height,
      })),
  }));
}

test('toque nas tabelas e slider, modal e menu em paisagem', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5173/#/vendas');
  const table = page.locator('.table-wrap');
  await table.scrollIntoViewIfNeeded();
  const rect = await table.boundingBox();
  const cdp = await context.newCDPSession(page);
  const x = rect!.x + rect!.width - 30;
  const y = Math.min(rect!.y + 80, 700);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 8; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x - i * 25, y }],
    });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => table.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  await page.goto('http://127.0.0.1:5173/#/simulador');
  const slider = page.getByRole('slider');
  await slider.scrollIntoViewIfNeeded();
  const initial = await slider.inputValue();
  const sliderRect = await slider.boundingBox();
  await page.touchscreen.tap(
    sliderRect!.x + sliderRect!.width * 0.8,
    sliderRect!.y + sliderRect!.height / 2,
  );
  await expect(slider).not.toHaveValue(initial);
  await page.setViewportSize({ width: 390, height: 320 });
  await page.goto('http://127.0.0.1:5173/#/insumos');
  await page.getByRole('button', { name: 'Novo insumo', exact: true }).click();
  const cancel = page.getByRole('button', { name: 'Cancelar', exact: true });
  await cancel.scrollIntoViewIfNeeded();
  await expect(cancel).toBeInViewport();
  await cancel.click();
  await page.getByRole('button', { name: 'Abrir navegação' }).click();
  const back = page.locator('.sidebar .website-back');
  await back.scrollIntoViewIfNeeded();
  await expect(back).toBeInViewport();
  await context.close();
});

for (const width of [320, 390, 768, 1440]) {
  test(`13 rotas e estados responsivos em ${width}px`, async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 900 });
    await page.route('**/api/**', (route) => route.abort());
    const measurements: unknown[] = [];
    const capture = async (name: string) => {
      await page.evaluate(() => document.fonts.ready);
      const data = await measure(page);
      measurements.push({ name, ...data });
      await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true });
      if (!process.env.ADAPT_BASELINE) {
        expect.soft(data.document, name).toBeLessThanOrEqual(width);
        expect.soft(data.overflow, name).toEqual([]);
      }
    };
    for (const route of routes) {
      await page.goto('/#' + route);
      await page.locator('main h1').waitFor();
      await capture(route.slice(1) || 'home');
    }
    await page.goto('/#/app');
    await page.getByText('Consultar valores por dia').click();
    await capture('chart-table');
    await page.getByRole('button', { name: 'Registrar venda', exact: true }).click();
    await capture('sale-modal');
    await page.keyboard.press('Escape');
    await page.goto('/#/insumos');
    await page.getByRole('button', { name: 'Novo insumo', exact: true }).click();
    await capture('ingredient-modal');
    await page.keyboard.press('Escape');
    await page.goto('/#/receitas');
    await page.getByRole('button', { name: 'Nova ficha', exact: true }).click();
    await page.getByRole('button', { name: 'Adicionar', exact: true }).click();
    await capture('recipe-editor');
    if (width < 650) {
      await page.getByRole('button', { name: 'Abrir navegação' }).click();
      await capture('kitchen-menu');
    }
    await page.goto('/');
    if (width <= 850) {
      await page.getByRole('button', { name: 'Menu', exact: true }).click();
      await capture('public-menu');
    }
    // Dados longos legítimos revelam mínimos intrínsecos que as fixtures curtas não mostram.
    await page.route('**/api/auth/status', (route) =>
      route.fulfill({
        json: { service: 'prato-certo-auth', registration: true, password_reset: true },
      }),
    );
    await page.route('**/api/auth/me', (route) =>
      route.fulfill({
        json: {
          name: 'Responsável pela cozinha',
          kitchen: 'Cozinha de pratos e acompanhamentos artesanais',
          email: 'responsavel.pela.cozinha.artesanal@example.com',
        },
      }),
    );
    await page.goto('/#/conta');
    await page.locator('.account-card').waitFor();
    await capture('account-long');
    await testInfo.attach('measurements', {
      body: JSON.stringify(measurements, null, 2),
      contentType: 'application/json',
    });
    console.log(JSON.stringify({ width, measurements }));
  });
}
