/**
 * Web3 Configuration
 * Update these addresses after deployment
 * 
 * Las direcciones pueden ser sobrescritas con variables de entorno:
 * - NEXT_PUBLIC_EURO_ADDRESS
 * - NEXT_PUBLIC_EUROX_ADDRESS
 */

// Deployed contract addresses (pueden ser sobrescritas con variables de entorno)
// En Next.js, las variables NEXT_PUBLIC_* están disponibles tanto en servidor como en cliente
// Usar acceso directo a process.env que Next.js expone automáticamente
function getEnvVarSafe(key: string): string | undefined {
  // En Next.js, process.env.NEXT_PUBLIC_* está disponible en cliente y servidor
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  // Fallback para casos especiales
  if (typeof window !== 'undefined' && (window as any).__NEXT_DATA__?.env) {
    return (window as any).__NEXT_DATA__.env[key];
  }
  return undefined;
}

// Leer direcciones de contratos desde variables de entorno o usar valores por defecto
// IMPORTANTE: Las variables NEXT_PUBLIC_* deben estar en .env.local y reiniciar el servidor
// En Next.js, process.env.NEXT_PUBLIC_* está disponible tanto en servidor como en cliente
// Next.js reemplaza estas variables en tiempo de compilación, así que debemos accederlas directamente
// NOTA: En Next.js, las variables NEXT_PUBLIC_* se reemplazan en tiempo de build,
// por lo que debemos accederlas directamente sin funciones intermedias

// Leer las direcciones directamente de process.env
// Next.js expone NEXT_PUBLIC_* automáticamente en el cliente y servidor
// Acceso directo sin función intermedia para evitar problemas con el reemplazo en tiempo de compilación
export const euroAddress = (
  typeof process !== 'undefined' && 
  process.env && 
  process.env.NEXT_PUBLIC_EURO_ADDRESS && 
  process.env.NEXT_PUBLIC_EURO_ADDRESS.trim() !== ''
) 
  ? process.env.NEXT_PUBLIC_EURO_ADDRESS.trim()
  : '0x6384D5F8999EaAC8bcCfae137D4e535075b47494';

export const euroXAddress = (
  typeof process !== 'undefined' && 
  process.env && 
  process.env.NEXT_PUBLIC_EUROX_ADDRESS && 
  process.env.NEXT_PUBLIC_EUROX_ADDRESS.trim() !== ''
)
  ? process.env.NEXT_PUBLIC_EUROX_ADDRESS.trim()
  : '0x357f63DB7C18C99051f9507532F426c2A070975a';

// Log para debugging (solo en desarrollo)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const envEuro = process.env.NEXT_PUBLIC_EURO_ADDRESS;
  const envEuroX = process.env.NEXT_PUBLIC_EUROX_ADDRESS;
  
  console.log('📋 Direcciones de contratos cargadas:');
  console.log('  EUR (usada):', euroAddress);
  console.log('  EURx (usada):', euroXAddress);
  console.log('  Variables de entorno (raw):', {
    NEXT_PUBLIC_EURO_ADDRESS: envEuro || 'no definida',
    NEXT_PUBLIC_EUROX_ADDRESS: envEuroX || 'no definida',
  });
  
  // Advertencia si las direcciones no coinciden
  if (envEuro && envEuro !== euroAddress) {
    console.warn('⚠️ ADVERTENCIA: La variable NEXT_PUBLIC_EURO_ADDRESS está definida pero no se está usando.');
    console.warn('   Variable:', envEuro);
    console.warn('   Usada:', euroAddress);
    console.warn('   Solución: Reinicia el servidor de desarrollo (Ctrl+C y luego npm run dev)');
  }
  if (envEuroX && envEuroX !== euroXAddress) {
    console.warn('⚠️ ADVERTENCIA: La variable NEXT_PUBLIC_EUROX_ADDRESS está definida pero no se está usando.');
    console.warn('   Variable:', envEuroX);
    console.warn('   Usada:', euroXAddress);
    console.warn('   Solución: Reinicia el servidor de desarrollo (Ctrl+C y luego npm run dev)');
  }
}
// Superfluid Framework addresses (mainnet - available via Anvil fork)
export const superfluidConfig = {
  resolver: '0xeE4cD028f5fdaAdeA99f8fc38e8bA8A57c90Be53',
  host: '0x4E583d9390082B65Bef884b629DFA426114CED6d',
  governance: '0xe2E14e2C4518cB06c32Cd0818B4C01f53E1Ba653',
  cfaV1: '0x2844c1BBdA121E9E43105630b9C8310e5c72744b',
  cfaV1Forwarder: '0xcfA132E353cB4E398080B9700609bb008eceB125',
  idaV1: '0xbCF9cfA8Da20B591790dF27DE65C1254Bf91563d',
  gdaV1: '0xAAdBB3Eee3Bd080f5353d86DdF1916aCA3fAC842',
  superTokenFactory: '0x0422689cc4087b6B7280e0a7e7F655200ec86Ae1',
};

// Streaming rate: 2000 EUR/month
// Calculation: 2000 EUR * 10^18 / (30 * 24 * 60 * 60) = 771604938271604 wei/second
export const MONTHLY_FLOW_RATE = '771604938271604'; // 2000 EUR/month in wei/second

// Flow Rate Limits (validaciones)
// Mínimo: 0.01 EUR/mes (para evitar flows insignificantes)
// Máximo: 100,000 EUR/mes (límite de seguridad)
// Pueden ser sobrescritas con variables de entorno:
// - NEXT_PUBLIC_MIN_FLOW_RATE_MONTHLY
// - NEXT_PUBLIC_MAX_FLOW_RATE_MONTHLY
export const MIN_FLOW_RATE_MONTHLY = getEnvVarSafe('NEXT_PUBLIC_MIN_FLOW_RATE_MONTHLY') || '0.01'; // EUR/mes
export const MAX_FLOW_RATE_MONTHLY = getEnvVarSafe('NEXT_PUBLIC_MAX_FLOW_RATE_MONTHLY') || '100000'; // EUR/mes

// Cálculo de flow rates en wei/segundo
// 0.01 EUR/mes = 0.01 * 10^18 / (30 * 24 * 60 * 60) = 3858024691 wei/segundo
export const MIN_FLOW_RATE_WEI_PER_SEC = '3858024691'; // 0.01 EUR/mes en wei/segundo

// 100,000 EUR/mes = 100000 * 10^18 / (30 * 24 * 60 * 60) = 38580246913580246 wei/segundo
export const MAX_FLOW_RATE_WEI_PER_SEC = '38580246913580246'; // 100,000 EUR/mes en wei/segundo

// Depósito de Seguridad
// Superfluid requiere un depósito mínimo para crear flows
// Mínimo recomendado: 4 horas de flow rate
// Recomendado: 8 horas de flow rate
// Puede ser sobrescrito con NEXT_PUBLIC_RECOMMENDED_DEPOSIT_HOURS
export const MIN_DEPOSIT_HOURS = 4; // Horas mínimas de depósito
const recommendedDepositHoursStr = getEnvVarSafe('NEXT_PUBLIC_RECOMMENDED_DEPOSIT_HOURS');
export const RECOMMENDED_DEPOSIT_HOURS = recommendedDepositHoursStr 
  ? parseInt(recommendedDepositHoursStr, 10)
  : 8; // Horas recomendadas de depósito

// Chain ID - Anvil local (31337)
// Puede ser sobrescrito con NEXT_PUBLIC_CHAIN_ID
const chainIdStr = getEnvVarSafe('NEXT_PUBLIC_CHAIN_ID');
export const CHAIN_ID = chainIdStr 
  ? parseInt(chainIdStr, 10)
  : 31337;
 