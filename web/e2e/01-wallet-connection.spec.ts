import { test, expect } from '@playwright/test';

/**
 * Tests E2E para conexión de wallet
 */
test.describe('Wallet Connection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('debe mostrar el botón de conectar wallet cuando no hay cuenta conectada', async ({ page }) => {
    // Verificar que el botón de conectar existe
    const connectButton = page.getByRole('button', { name: /conectar con anvil/i });
    await expect(connectButton).toBeVisible();
    
    // Verificar que el texto de información está presente
    await expect(page.getByText(/esta aplicación usa automáticamente/i)).toBeVisible();
  });

  test('debe conectar wallet al hacer clic en el botón', async ({ page }) => {
    // Hacer clic en conectar
    await page.getByRole('button', { name: /conectar con anvil/i }).click();
    
    // Esperar a que se cargue la información de la cuenta
    // La dirección de Anvil debería aparecer
    await expect(page.getByText(/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266/i)).toBeVisible({ timeout: 10000 });
    
    // Verificar que se muestra la información de la cuenta
    await expect(page.getByText(/cuenta/i)).toBeVisible();
    await expect(page.getByText(/EUR Balance/i)).toBeVisible();
    await expect(page.getByText(/EURx Balance/i)).toBeVisible();
  });

  test('debe mostrar la red correcta después de conectar', async ({ page }) => {
    // Conectar wallet
    await page.getByRole('button', { name: /conectar con anvil/i }).click();
    
    // Verificar que se muestra la red Anvil
    await expect(page.getByText(/Anvil Local/i)).toBeVisible({ timeout: 10000 });
  });
});

