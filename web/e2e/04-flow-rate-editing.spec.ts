import { test, expect } from '@playwright/test';

/**
 * Tests E2E para edición de flow rate
 */
test.describe('Flow Rate Editing', () => {
  const TEST_RECIPIENT = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Conectar wallet
    await page.getByRole('button', { name: /conectar con anvil/i }).click();
    await expect(page.getByText(/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266/i)).toBeVisible({ timeout: 10000 });
    
    // Agregar destinatario si no existe
    const input = page.getByPlaceholder(/0x\.\.\./i);
    await input.fill(TEST_RECIPIENT);
    await page.getByRole('button', { name: /agregar/i }).click();
    await page.waitForTimeout(5000);
    
    // Esperar a que el stream esté activo
    await expect(page.getByRole('button', { name: /pausar/i })).toBeVisible({ timeout: 15000 });
  });

  test('debe mostrar el botón de editar para streams activos', async ({ page }) => {
    // Verificar que el botón de editar está visible
    await expect(page.getByRole('button', { name: /editar/i })).toBeVisible({ timeout: 10000 });
  });

  test('debe abrir el formulario de edición al hacer clic en editar', async ({ page }) => {
    // Hacer clic en editar
    await page.getByRole('button', { name: /editar/i }).first().click();
    
    // Verificar que aparece el formulario
    await expect(page.getByText(/editar flow rate/i)).toBeVisible();
    await expect(page.getByText(/flow rate actual/i)).toBeVisible();
    
    // Verificar que hay un input para el nuevo flow rate
    const input = page.locator('input[type="number"]').filter({ hasText: /ej: 1500/i }).or(
      page.locator('input[placeholder*="1500"]')
    );
    await expect(input.first()).toBeVisible({ timeout: 5000 });
  });

  test('debe permitir ingresar un nuevo flow rate', async ({ page }) => {
    // Abrir formulario de edición
    await page.getByRole('button', { name: /editar/i }).first().click();
    await expect(page.getByText(/editar flow rate/i)).toBeVisible();
    
    // Buscar el input de flow rate
    const flowRateInput = page.locator('input[type="number"]').nth(0);
    await flowRateInput.fill('1500');
    
    // Verificar que el valor se ingresó
    await expect(flowRateInput).toHaveValue('1500');
  });

  test('debe mostrar botones de guardar y cancelar', async ({ page }) => {
    // Abrir formulario de edición
    await page.getByRole('button', { name: /editar/i }).first().click();
    await expect(page.getByText(/editar flow rate/i)).toBeVisible();
    
    // Verificar botones
    await expect(page.getByRole('button', { name: /guardar/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /cancelar/i })).toBeVisible();
  });

  test('debe cerrar el formulario al hacer clic en cancelar', async ({ page }) => {
    // Abrir formulario
    await page.getByRole('button', { name: /editar/i }).first().click();
    await expect(page.getByText(/editar flow rate/i)).toBeVisible();
    
    // Cancelar
    await page.getByRole('button', { name: /cancelar/i }).click();
    
    // Verificar que el formulario desaparece
    await expect(page.getByText(/editar flow rate/i)).not.toBeVisible({ timeout: 2000 });
  });
});

