import { test, expect } from '@playwright/test';

/**
 * Tests E2E para visualización de balances
 */
test.describe('Balances Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Conectar wallet primero
    await page.getByRole('button', { name: /conectar con anvil/i }).click();
    // Esperar a que se cargue
    await expect(page.getByText(/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266/i)).toBeVisible({ timeout: 10000 });
  });

  test('debe mostrar el balance EUR', async ({ page }) => {
    // Verificar que el balance EUR está visible
    await expect(page.getByText(/EUR Balance/i)).toBeVisible();
    
    // Verificar que hay un valor numérico
    const balanceText = await page.locator('text=/EUR Balance/').locator('..').textContent();
    expect(balanceText).toMatch(/\d+\.\d{2}\s*EUR/);
  });

  test('debe mostrar el balance EURx', async ({ page }) => {
    // Verificar que el balance EURx está visible
    await expect(page.getByText(/EURx Balance/i)).toBeVisible();
    
    // Verificar que hay un valor numérico
    const balanceText = await page.locator('text=/EURx Balance/').locator('..').textContent();
    expect(balanceText).toMatch(/\d+\.\d+\s*EURx/);
  });

  test('debe mostrar la dirección de la cuenta', async ({ page }) => {
    // Verificar que la dirección está visible (truncada)
    await expect(page.getByText(/0xf39/i)).toBeVisible();
  });
});

