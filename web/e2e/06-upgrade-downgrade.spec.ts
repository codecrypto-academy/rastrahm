import { test, expect } from '@playwright/test';

/**
 * Tests E2E para upgrade y downgrade de tokens
 */
test.describe('Upgrade and Downgrade', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Conectar wallet
    await page.getByRole('button', { name: /conectar con anvil/i }).click();
    await expect(page.getByText(/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266/i)).toBeVisible({ timeout: 10000 });
  });

  test('debe mostrar el formulario de upgrade', async ({ page }) => {
    // Verificar que el formulario de upgrade está visible
    await expect(page.getByText(/upgrade EUR → EURx/i)).toBeVisible();
    await expect(page.getByPlaceholder(/cantidad en EUR/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /upgrade/i })).toBeVisible();
  });

  test('debe mostrar el formulario de downgrade', async ({ page }) => {
    // Verificar que el formulario de downgrade está visible
    await expect(page.getByText(/downgrade EURx → EUR/i)).toBeVisible();
    await expect(page.getByPlaceholder(/cantidad en EURx/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /downgrade/i })).toBeVisible();
  });

  test('debe permitir ingresar cantidad para upgrade', async ({ page }) => {
    const input = page.getByPlaceholder(/cantidad en EUR/i);
    await input.fill('100');
    
    // Verificar que el valor se ingresó
    await expect(input).toHaveValue('100');
    
    // Verificar que el botón está habilitado
    await expect(page.getByRole('button', { name: /upgrade/i })).toBeEnabled();
  });

  test('debe deshabilitar el botón de upgrade cuando no hay cantidad', async ({ page }) => {
    const input = page.getByPlaceholder(/cantidad en EUR/i);
    await input.fill('');
    
    // Verificar que el botón está deshabilitado
    await expect(page.getByRole('button', { name: /upgrade/i })).toBeDisabled();
  });

  test('debe permitir ingresar cantidad para downgrade', async ({ page }) => {
    const input = page.getByPlaceholder(/cantidad en EURx/i);
    await input.fill('50');
    
    // Verificar que el valor se ingresó
    await expect(input).toHaveValue('50');
    
    // Verificar que el botón está habilitado
    await expect(page.getByRole('button', { name: /downgrade/i })).toBeEnabled();
  });
});

