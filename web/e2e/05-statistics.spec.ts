import { test, expect } from '@playwright/test';

/**
 * Tests E2E para visualización de estadísticas
 */
test.describe('Statistics Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Conectar wallet
    await page.getByRole('button', { name: /conectar con anvil/i }).click();
    await expect(page.getByText(/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266/i)).toBeVisible({ timeout: 10000 });
  });

  test('debe mostrar estadísticas cuando hay destinatarios', async ({ page }) => {
    // Agregar un destinatario
    const TEST_RECIPIENT = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
    const input = page.getByPlaceholder(/0x\.\.\./i);
    await input.fill(TEST_RECIPIENT);
    await page.getByRole('button', { name: /agregar/i }).click();
    await page.waitForTimeout(5000);
    
    // Verificar que aparecen las estadísticas
    await expect(page.getByText(/estadísticas/i)).toBeVisible({ timeout: 15000 });
  });

  test('debe mostrar información de streams en estadísticas', async ({ page }) => {
    // Agregar destinatario
    const TEST_RECIPIENT = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
    const input = page.getByPlaceholder(/0x\.\.\./i);
    await input.fill(TEST_RECIPIENT);
    await page.getByRole('button', { name: /agregar/i }).click();
    await page.waitForTimeout(5000);
    
    // Verificar que se muestra información de streams
    await expect(page.getByText(/streams/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/activos/i)).toBeVisible({ timeout: 10000 });
  });

  test('debe mostrar flow rates en estadísticas', async ({ page }) => {
    // Agregar destinatario
    const TEST_RECIPIENT = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
    const input = page.getByPlaceholder(/0x\.\.\./i);
    await input.fill(TEST_RECIPIENT);
    await page.getByRole('button', { name: /agregar/i }).click();
    await page.waitForTimeout(5000);
    
    // Verificar que se muestra información de flow rates
    await expect(page.getByText(/flow rates/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/EUR\/mes/i)).toBeVisible({ timeout: 10000 });
  });
});

