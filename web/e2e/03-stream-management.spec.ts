import { test, expect } from '@playwright/test';

/**
 * Tests E2E para gestión de streams
 * 
 * Nota: Estos tests requieren que Anvil esté corriendo y los contratos desplegados
 */
test.describe('Stream Management', () => {
  const TEST_RECIPIENT = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'; // Segunda cuenta de Anvil

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Conectar wallet
    await page.getByRole('button', { name: /conectar con anvil/i }).click();
    await expect(page.getByText(/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266/i)).toBeVisible({ timeout: 10000 });
  });

  test('debe mostrar el formulario para agregar destinatario', async ({ page }) => {
    // Verificar que el formulario está visible
    await expect(page.getByText(/agregar destinatario/i)).toBeVisible();
    await expect(page.getByPlaceholder(/0x\.\.\./i)).toBeVisible();
    await expect(page.getByRole('button', { name: /agregar/i })).toBeVisible();
  });

  test('debe agregar un destinatario y crear stream', async ({ page }) => {
    // Llenar el formulario
    const input = page.getByPlaceholder(/0x\.\.\./i);
    await input.fill(TEST_RECIPIENT);
    
    // Hacer clic en agregar
    await page.getByRole('button', { name: /agregar/i }).click();
    
    // Esperar a que aparezca el alert de confirmación (esto puede tomar tiempo)
    // Nota: Playwright maneja los alerts automáticamente
    await page.waitForTimeout(2000);
    
    // Verificar que el destinatario aparece en la lista
    // Puede tomar tiempo porque se crea el stream
    await expect(page.getByText(TEST_RECIPIENT.substring(0, 10))).toBeVisible({ timeout: 30000 });
    
    // Verificar que el estado es "Activo"
    await expect(page.getByText(/activo/i)).toBeVisible({ timeout: 10000 });
  });

  test('debe mostrar el flow rate del stream', async ({ page }) => {
    // Primero agregar un destinatario si no existe
    const input = page.getByPlaceholder(/0x\.\.\./i);
    await input.fill(TEST_RECIPIENT);
    await page.getByRole('button', { name: /agregar/i }).click();
    await page.waitForTimeout(5000);
    
    // Verificar que se muestra el flow rate
    await expect(page.getByText(/Flow Rate/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/EUR\/mes/i)).toBeVisible();
  });

  test('debe mostrar el botón de pausar para streams activos', async ({ page }) => {
    // Agregar destinatario si no existe
    const input = page.getByPlaceholder(/0x\.\.\./i);
    await input.fill(TEST_RECIPIENT);
    await page.getByRole('button', { name: /agregar/i }).click();
    await page.waitForTimeout(5000);
    
    // Verificar que aparece el botón de pausar
    await expect(page.getByRole('button', { name: /pausar/i })).toBeVisible({ timeout: 15000 });
  });

  test('debe pausar un stream activo', async ({ page }) => {
    // Agregar destinatario si no existe
    const input = page.getByPlaceholder(/0x\.\.\./i);
    await input.fill(TEST_RECIPIENT);
    await page.getByRole('button', { name: /agregar/i }).click();
    await page.waitForTimeout(5000);
    
    // Esperar a que el stream esté activo
    await expect(page.getByRole('button', { name: /pausar/i })).toBeVisible({ timeout: 15000 });
    
    // Hacer clic en pausar
    await page.getByRole('button', { name: /pausar/i }).click();
    await page.waitForTimeout(3000);
    
    // Verificar que aparece el botón de reanudar
    await expect(page.getByRole('button', { name: /reanudar/i })).toBeVisible({ timeout: 10000 });
  });

  test('debe reanudar un stream pausado', async ({ page }) => {
    // Agregar y pausar stream primero
    const input = page.getByPlaceholder(/0x\.\.\./i);
    await input.fill(TEST_RECIPIENT);
    await page.getByRole('button', { name: /agregar/i }).click();
    await page.waitForTimeout(5000);
    
    // Pausar
    await expect(page.getByRole('button', { name: /pausar/i })).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /pausar/i }).click();
    await page.waitForTimeout(3000);
    
    // Reanudar
    await expect(page.getByRole('button', { name: /reanudar/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /reanudar/i }).click();
    await page.waitForTimeout(5000);
    
    // Verificar que vuelve a estar activo
    await expect(page.getByRole('button', { name: /pausar/i })).toBeVisible({ timeout: 15000 });
  });
});

