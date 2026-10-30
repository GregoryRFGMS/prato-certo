import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('modais contêm foco, fecham com Escape e restauram o acionador', async ({ page }) => {
  for (const [route, action] of [
    ['/app', 'Registrar venda'],
    ['/insumos', 'Novo insumo'],
  ]) {
    await page.goto('/#' + route);
    const opener = page.locator('main').getByRole('button', { name: action, exact: true });
    await opener.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect
      .poll(() => dialog.evaluate((el) => el.contains(document.activeElement)))
      .toBe(true);
    const first = dialog.getByRole('button', { name: 'Fechar', exact: true });
    const last = dialog.getByRole('button', {
      name: action === 'Novo insumo' ? 'Salvar insumo' : action,
      exact: true,
    });
    await last.focus();
    await page.keyboard.press('Tab');
    await expect(first).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(last).toBeFocused();
    // A modal nativo impede até foco programático no fundo.
    await opener.evaluate((el) => (el as HTMLElement).focus());
    await expect(last).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
    await opener.click();
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(opener).toBeFocused();
  }
});

test('menu móvel fechado não recebe foco, abertura e Escape são acessíveis', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/app');
  const sidebar = page.locator('#kitchen-navigation');
  await expect(sidebar).toHaveAttribute('inert', '');
  await page.getByRole('link', { name: 'Ir para o conteúdo' }).focus();
  await expect(page.getByRole('link', { name: 'Ir para o conteúdo' })).toBeFocused();
  await page.keyboard.press('Tab');
  const toggle = page.getByRole('button', { name: 'Abrir navegação' });
  await expect(toggle).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('button', { name: 'Fechar navegação', exact: true }).last(),
  ).toHaveAttribute('aria-expanded', 'true');
  await expect.poll(() => sidebar.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(sidebar).toHaveAttribute('inert', '');
  await expect(page.getByRole('button', { name: 'Abrir navegação' })).toBeFocused();
});

test('editor adapta-se a 320 px e erros são anunciados sem perder os dados', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/#/receitas');
  await page.getByRole('button', { name: 'Nova ficha', exact: true }).click();
  await page.getByRole('button', { name: 'Salvar ficha técnica' }).click();
  await expect(page.getByRole('alert')).not.toBeEmpty();
  await page.getByLabel('Nome do prato').fill('Receita de teste 🥗');
  await page.getByRole('button', { name: 'Salvar ficha técnica' }).click();
  await expect(page.getByLabel('Nome do prato')).toHaveValue('Receita de teste 🥗');
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
});

test('gráfico tem tabela equivalente acessível por teclado', async ({ page }) => {
  await page.goto('/#/app');
  await page.getByText('Consultar valores por dia').focus();
  await page.keyboard.press('Enter');
  const table = page.getByRole('table', { name: 'Vendas e contribuição nos últimos 14 dias' });
  await expect(table).toBeVisible();
  await expect(table.getByRole('row')).toHaveCount(15);
});

test('simulador anuncia combinação inválida e bloqueia aplicação', async ({ page }) => {
  await page.goto('/#/simulador');
  await page.getByLabel('Taxas sobre a venda (%)').fill('90');
  await expect(page.locator('#simulation-error')).not.toBeEmpty();
  await expect(page.locator('#simulation-error')).toHaveAttribute('role', 'status');
  await expect(page.getByRole('button', { name: 'Aplicar preço e taxa à ficha' })).toBeDisabled();
  await page.getByLabel('Taxas sobre a venda (%)').fill('12');
  await expect(page.locator('#simulation-error')).toBeEmpty();
  await expect(page.getByRole('button', { name: 'Aplicar preço e taxa à ficha' })).toBeEnabled();
});

for (const width of [390, 1440]) {
  test(`WCAG automático nas rotas e estados principais (${width}px)`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 900 });
    await page.route('**/api/**', (route) => route.abort());
    const failures: unknown[] = [];
    for (const route of [
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
    ]) {
      await page.goto('/#' + route);
      await page.locator('main h1').waitFor();
      // Aguarda a transição de 150 ms da navegação antes de medir contraste.
      await page.waitForTimeout(200);
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      if (result.violations.length)
        failures.push({
          route,
          violations: result.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
          })),
        });
    }
    expect(failures).toEqual([]);
  });
}

test('estados de erro, formulário e diálogo passam pelas regras automáticas', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const scan = async () => {
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(
      result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.failureSummary) })),
    ).toEqual([]);
  };
  await page.goto('/#/insumos');
  await page.getByRole('button', { name: 'Novo insumo', exact: true }).click();
  await scan();
  await page.getByLabel('Nome do insumo').fill('Teste de acessibilidade');
  await page.getByLabel('Preço total da compra (R$)').fill('10');
  await page.getByRole('button', { name: 'Salvar insumo', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Novo insumo', exact: true })).toBeFocused();
  await page.goto('/#/receitas');
  await page.getByRole('button', { name: 'Nova ficha', exact: true }).click();
  await page.getByRole('button', { name: 'Salvar ficha técnica' }).click();
  await scan();
  await page.goto('/#/simulador');
  await page.getByLabel('Taxas sobre a venda (%)').fill('90');
  await scan();
});

test('menu público permite teclado e erro da API preserva dados', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/');
  const menu = page.getByRole('button', { name: 'Menu', exact: true });
  await menu.click();
  await expect(page.getByRole('button', { name: 'O que você controla' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await page.route('**/api/auth/status', (route) =>
    route.fulfill({
      json: { service: 'prato-certo-auth', registration: true, password_reset: true },
    }),
  );
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({ status: 401, json: { detail: 'Confira seu e-mail e sua senha.' } }),
  );
  await page.goto('/#/login');
  await page.getByLabel('E-mail', { exact: true }).fill('teste@example.com');
  await page.locator('#auth-password').fill('senha-de-teste');
  await page.getByRole('button', { name: 'Entrar na minha conta' }).click();
  await expect(page.getByRole('alert')).toContainText('Confira seu e-mail');
  await expect(page.getByLabel('E-mail', { exact: true })).toHaveValue('teste@example.com');
  await expect(page.locator('#auth-password')).toHaveValue('senha-de-teste');
});

test('navegação move foco ao título e fechar o menu não deixa foco invisível', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/app');
  await page.getByRole('button', { name: 'Abrir navegação' }).click();
  await page.getByRole('button', { name: 'Insumos', exact: true }).click();
  await expect(page.locator('main h1')).toBeFocused();
  await expect(page.locator('#kitchen-navigation')).toHaveAttribute('inert', '');
  await page.getByRole('button', { name: 'Abrir navegação' }).click();
  await page.getByRole('button', { name: 'Insumos', exact: true }).click();
  await expect(page.locator('main h1')).toBeFocused();
});

test('capturas e reflow do editor em celular e texto ampliado', async ({ page }, testInfo) => {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.goto('/#/receitas');
    await page.getByRole('button', { name: 'Nova ficha', exact: true }).click();
    await page
      .getByLabel('Nome do prato')
      .fill('Receita com um nome longo, legumes e acompanhamentos 🥗');
    await page.getByRole('button', { name: 'Adicionar', exact: true }).click();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    if (width === 390)
      await page.screenshot({ path: testInfo.outputPath('editor-mobile.png'), fullPage: true });
  }
  // Amplia somente o texto, mantendo dimensões e controles do layout.
  await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>('main *'));
    const sizes = elements.map((el) => parseFloat(getComputedStyle(el).fontSize));
    elements.forEach((el, index) => {
      el.style.fontSize = `${sizes[index] * 2}px`;
    });
  });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  await page.goto('/');
  await page.goto('/#/app');
  await page.screenshot({ path: testInfo.outputPath('dashboard-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: 'Registrar venda', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('sale-dialog.png') });
});
