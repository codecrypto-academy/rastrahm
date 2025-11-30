# Guía TDD (Test-Driven Development)

Este proyecto sigue la metodología TDD (Test-Driven Development) para garantizar código de calidad y cobertura de tests.

## Ciclo TDD: RED → GREEN → REFACTOR

### 1. RED: Escribir tests que fallen
- Escribir tests para la funcionalidad deseada
- Los tests deben fallar inicialmente (comportamiento esperado)

### 2. GREEN: Implementar código mínimo para pasar los tests
- Escribir solo el código necesario para que los tests pasen
- No agregar funcionalidad extra

### 3. REFACTOR: Mejorar el código sin romper los tests
- Refactorizar el código para mejorar calidad
- Asegurarse de que todos los tests sigan pasando

## Estructura de Tests

```
lib/__tests__/          # Tests para utilidades
hooks/__tests__/        # Tests para hooks
components/__tests__/   # Tests para componentes
contexts/__tests__/     # Tests para contextos
app/__tests__/          # Tests para páginas y API routes
```

## Convenciones de Naming

- Archivos de test: `*.test.ts` o `*.test.tsx`
- Archivos de spec: `*.spec.ts` o `*.spec.tsx`
- Ubicación: Misma carpeta que el código o en `__tests__/`

## Ejecutar Tests

```bash
# Ejecutar todos los tests
npm test

# Ejecutar tests en modo watch
npm test:watch

# Ejecutar tests con cobertura
npm test:coverage
```

## Mejores Prácticas

### 1. Tests deben ser independientes
- Cada test debe poder ejecutarse de forma aislada
- No depender del orden de ejecución

### 2. Tests deben ser rápidos
- Tests unitarios deben ser muy rápidos (< 10ms)
- Mockear operaciones lentas (API calls, blockchain calls)

### 3. Tests deben ser legibles
- Nombres descriptivos: `describe` y `it` deben ser claros
- Un test = un comportamiento
- Usar `describe` para agrupar tests relacionados

### 4. Tests deben ser mantenibles
- DRY (Don't Repeat Yourself) pero sin sobre-abstraer
- Usar factories y helpers cuando sea necesario

### 5. Cobertura objetivo
- Mínimo 80% de cobertura
- Cubrir casos edge y errores
- No solo casos felices

## Ejemplo TDD

### Paso 1: RED - Escribir test que falla

```typescript
// lib/__tests__/math.test.ts
describe('add', () => {
  it('should add two numbers', () => {
    expect(add(2, 3)).toBe(5);
  });
});
```

### Paso 2: GREEN - Implementar función mínima

```typescript
// lib/math.ts
export function add(a: number, b: number): number {
  return a + b;
}
```

### Paso 3: REFACTOR - Mejorar si es necesario

```typescript
// lib/math.ts
export function add(a: number, b: number): number {
  // Add validation if needed
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new Error('Both arguments must be numbers');
  }
  return a + b;
}
```

## Testing de Componentes React

### Ejemplo básico

```typescript
import { render, screen } from '@testing-library/react';
import { WalletButton } from '@/components/WalletButton';

describe('WalletButton', () => {
  it('should render connect button when not connected', () => {
    render(<WalletButton />);
    expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
  });
});
```

### Testing con Contexts

```typescript
import { render, screen } from '@testing-library/react';
import { WalletProvider } from '@/contexts/WalletContext';
import { WalletButton } from '@/components/WalletButton';

describe('WalletButton', () => {
  it('should render wallet address when connected', () => {
    const mockAccount = '0x1234...5678';
    // Mock WalletContext
    render(
      <WalletProvider>
        <WalletButton />
      </WalletProvider>
    );
    // Test implementation
  });
});
```

## Testing de Hooks

```typescript
import { renderHook, act } from '@testing-library/react';
import { useEuroToken } from '@/hooks/useEuroToken';

describe('useEuroToken', () => {
  it('should return token balance', async () => {
    const { result } = renderHook(() => useEuroToken());
    // Test implementation
  });
});
```

## Testing de API Routes

```typescript
import { POST } from '@/app/api/create-payment-intent/route';
import { NextRequest } from 'next/server';

describe('POST /api/create-payment-intent', () => {
  it('should create payment intent', async () => {
    const request = new NextRequest('http://localhost/api/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ amount: 10000, buyerAddress: '0x123...' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
  });
});
```

## Mocks y Fixtures

### Mock de window.ethereum

Ya configurado en `jest.setup.js`:

```typescript
Object.defineProperty(window, 'ethereum', {
  writable: true,
  value: {
    request: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn(),
  },
});
```

### Mock de Ethers.js

```typescript
jest.mock('ethers', () => ({
  ethers: {
    BrowserProvider: jest.fn(),
    Contract: jest.fn(),
  },
}));
```

## Checklist TDD

Antes de implementar una nueva funcionalidad:

- [ ] Escribir tests primero (RED)
- [ ] Implementar código mínimo (GREEN)
- [ ] Refactorizar si es necesario
- [ ] Verificar cobertura de tests
- [ ] Documentar cambios importantes
- [ ] Todos los tests pasan

## Recursos

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/react)
- [TDD by Example](https://www.amazon.com/Test-Driven-Development-Kent-Beck/dp/0321146530)

