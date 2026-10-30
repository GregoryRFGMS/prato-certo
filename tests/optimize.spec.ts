import { test, expect } from '@playwright/test';

test('imagem responsiva carrega versão compacta sem perder dimensões', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/');
  const image = page.locator('.hero-visual img');
  await image.evaluate((el: HTMLImageElement) => el.decode());
  expect(await image.evaluate((el: HTMLImageElement) => el.currentSrc)).toContain('480.webp');
  await expect(image).toHaveAttribute('width', '1448');
  await expect(image).toHaveAttribute('fetchpriority', 'high');
});

test('perfil mantém feedback durante a segunda requisição', async ({ page }) => {
  await page.route('**/api/auth/status', (route) =>
    route.fulfill({ json: { service: 'prato-certo-auth' } }),
  );
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/auth/me', async (route) => {
    await pending;
    await route.fulfill({
      json: { name: 'Teste', email: 'teste@example.com', kitchen: 'Cozinha' },
    });
  });
  await page.goto('/#/conta');
  await expect(page.getByRole('status')).toContainText('Carregando sua conta');
  release();
  await expect(page.locator('.account-card')).toBeVisible();
  await expect(page.getByText('Carregando sua conta')).toHaveCount(0);
});

test('buscas vazias podem ser recuperadas sem sair da rota', async ({ page }) => {
  for (const [route, label] of [
    ['insumos', 'Buscar insumo'],
    ['receitas', 'Buscar ficha técnica'],
  ]) {
    await page.goto('/#/' + route);
    await page.getByRole('textbox', { name: label }).fill('inexistente-123');
    await page.getByRole('button', { name: 'Limpar busca' }).click();
    await expect(page.getByRole('textbox', { name: label })).toHaveValue('');
    await expect(page.locator('.empty')).toHaveCount(0);
  }
});
