'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import {
  createFlow,
  deleteFlow,
  updateFlow,
  getRealtimeBalance,
  upgradeToEuroX,
  downgradeFromEuroX,
  getFlow,
  validateFlowRate,
  validateDifferentAddresses,
  validateSufficientDeposit,
  calculateRequiredDeposit,
  monthlyToFlowRate,
} from '@/lib/superfluid';
import { euroAddress, CHAIN_ID, MONTHLY_FLOW_RATE } from '@/config/web3';
import { formatErrorForUser, SuperfluidAppError, ErrorType, isRecoverableError } from '@/lib/errors';
import { getAnvilRpcUrl, validateEnvForUI } from '@/lib/env';
import Statistics from './Statistics';
import LoadingSpinner from './ui/LoadingSpinner';
import Tooltip from './ui/Tooltip';
import AddressDisplay from './ui/AddressDisplay';
import StatusBadge from './ui/StatusBadge';
import ThemeToggle from './ui/ThemeToggle';

export interface Recipient {
  address: string;
  flowRate: string;
  balance: string;
  euroBalance: string;
  status: 'active' | 'paused' | 'none'; 
  // active: flow existe con flowRate > 0
  // paused: flow eliminado pero guardado en la lista (puede reanudarse)
  // none: sin flow
}

// Configuración de Anvil
// Usar variable de entorno si está disponible, sino valor por defecto
const ANVIL_RPC_URL = getAnvilRpcUrl();
const ANVIL_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const ANVIL_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

// Mapeo de direcciones de Anvil a sus private keys
const ANVIL_ACCOUNTS: Record<string, string> = {
  '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266': '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  '0x70997970C51812dc3A010C7d01b50e0d17dc79C8': '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
  '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC': '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
  '0x90F79bf6EB2c4f870365E785982E1f101E93b906': '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6',
  '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65': '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a',
  '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc': '0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba',
  '0x976EA74026E726554dB657fA54763abd0C3a0aa9': '0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e',
  '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955': '0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356',
  '0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f': '0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97',
  '0xa0Ee7A142d267C1f36714E4a8F75612F20a79720': '0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6',
};

export default function Dashboard() {
  const [provider, setProvider] = useState<ethers.providers.JsonRpcProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Wallet | null>(null);
  const [account, setAccount] = useState<string>('');
  const [chainId, setChainId] = useState<number>(0);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [newRecipient, setNewRecipient] = useState<string>('');
  const [euroBalance, setEuroBalance] = useState<string>('0');
  const [euroXBalance, setEuroXBalance] = useState<string>('0');
  const [upgradeAmount, setUpgradeAmount] = useState<string>('');
  const [downgradeAmount, setDowngradeAmount] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [editingFlowRate, setEditingFlowRate] = useState<string | null>(null);
  const [newFlowRateMonthly, setNewFlowRateMonthly] = useState<string>('');
  
  useEffect(() => {
    // Solo ejecutar si tenemos provider, account y un chainId válido
    if (!provider || !account || !chainId || chainId === 0 || isNaN(chainId)) return;

    const interval = setInterval(async () => {
      try {
        // Validar que el chainId sigue siendo válido
        if (!chainId || chainId === 0 || isNaN(chainId)) {
          console.warn('ChainId inválido, saltando actualización de balance');
          return;
        }
        
        // Actualizar balance EURx del emisor
        const balance = await getRealtimeBalance(account, provider, chainId);
        if (balance && balance.availableBalance) {
          const formattedBalance = ethers.utils.formatEther(balance.availableBalance);
          setEuroXBalance(formattedBalance);
        }
      } catch (err) {
        console.error('Error updating sender balance:', err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [provider, account, chainId]);

  // Actualizar balances de destinatarios cada 5 segundos
  useEffect(() => {
    // Solo ejecutar si tenemos provider, account, chainId válido y recipients
    if (!provider || !account || !chainId || chainId === 0 || isNaN(chainId) || recipients.length === 0) return;

    const interval = setInterval(async () => {
      // Validar que el chainId sigue siendo válido
      if (!chainId || chainId === 0 || isNaN(chainId)) {
        console.warn('ChainId inválido, saltando actualización de balances');
        return;
      }

      const updated = await Promise.all(
        recipients.map(async (recipient) => {
          try {
            // Obtener balance EURx
            const balance = await getRealtimeBalance(
              recipient.address,
              provider,
              chainId
            );

            // Obtener balance EUR
            const euroContract = new ethers.Contract(
              euroAddress,
              ['function balanceOf(address) view returns (uint256)'],
              provider
            );
            const euroBal = await euroContract.balanceOf(recipient.address);

            // Verificar el estado del flow en la blockchain
            const flow = await getFlow(account, recipient.address, provider, chainId);
            let status: 'active' | 'paused' | 'none' = recipient.status; // Mantener el estado actual por defecto
            let flowRateEurPerMonth = '0';
            
            if (flow && flow.flowRate !== '0') {
              // El flow existe y está activo
              status = 'active';
              
              // Calcular flowRate en EUR/mes desde wei/segundo
              const flowRatePerSecond = ethers.BigNumber.from(flow.flowRate);
              const secondsInMonth = 30 * 24 * 60 * 60;
              const flowRatePerMonth = flowRatePerSecond.mul(secondsInMonth);
              flowRateEurPerMonth = ethers.utils.formatEther(flowRatePerMonth);
            } else {
              // El flow no existe
              // Si en nuestra lista estaba como 'active', cambiar a 'paused' o 'none'
              // Si ya estaba como 'paused', mantenerlo así
              if (recipient.status === 'active') {
                status = 'paused'; // Se detuvo externamente
              }
              flowRateEurPerMonth = '0';
            }

            return {
              ...recipient,
              balance: balance?.availableBalance ? ethers.utils.formatEther(balance.availableBalance) : '0',
              euroBalance: euroBal ? ethers.utils.formatEther(euroBal) : '0',
              flowRate: flowRateEurPerMonth || '0',
              status,
            };
          } catch (err) {
            console.error('Error updating recipient:', err);
            return recipient;
          }
        })
      );
      setRecipients(updated);
    }, 5000);

    return () => clearInterval(interval);
  }, [provider, account, recipients.length, chainId]);

  // Cargar recipients desde localStorage al montar el componente
  useEffect(() => {
    const savedRecipients = localStorage.getItem('superfluid_recipients');
    if (savedRecipients) {
      try {
        const parsed = JSON.parse(savedRecipients);
        // Validar y limpiar los datos cargados
        const cleanedRecipients = parsed.map((r: any) => ({
          ...r,
          flowRate: r.flowRate || '0',
          balance: r.balance || '0',
          euroBalance: r.euroBalance || '0',
          status: r.status || 'none',
        }));
        console.log('Loaded recipients from localStorage:', cleanedRecipients);
        setRecipients(cleanedRecipients);
      } catch (err) {
        console.error('Error loading recipients from localStorage:', err);
        // Si hay error, limpiar localStorage
        localStorage.removeItem('superfluid_recipients');
      }
    }
  }, []);

  // Guardar recipients en localStorage cada vez que cambian
  useEffect(() => {
    if (recipients.length > 0) {
      localStorage.setItem('superfluid_recipients', JSON.stringify(recipients));
    }
  }, [recipients]);

  // Conectar automáticamente con la cuenta de Anvil
  const connectWallet = async () => {
    let jsonRpcProvider: ethers.providers.StaticJsonRpcProvider | null = null;
    
    try {
      setError('');
      setLoading(true);

      // Usar StaticJsonRpcProvider con configuración específica para evitar errores de red
      // StaticJsonRpcProvider no hace polling automático de la red
      // IMPORTANTE: No especificar chainId en el constructor para que ethers.js lo obtenga de Anvil
      // Esto es crítico cuando Anvil hace fork de mainnet (reporta chainId 1, no 31337)
      try {
        // Primero crear el provider sin chainId para que obtenga el real de Anvil
        jsonRpcProvider = new ethers.providers.StaticJsonRpcProvider(ANVIL_RPC_URL);
        // Obtener el chainId real de Anvil
        const network = await jsonRpcProvider.getNetwork();
        const actualChainId = network.chainId;
        console.log('ChainId obtenido de Anvil:', actualChainId);
        
        // Si el chainId es diferente al esperado, recrear el provider con el chainId correcto
        // Esto asegura que las transacciones se firmen con el chainId que Anvil espera
        if (actualChainId !== CHAIN_ID) {
          console.warn(`⚠️ Anvil reporta chainId ${actualChainId} en lugar de ${CHAIN_ID}. Recreando provider con el chainId correcto.`);
          jsonRpcProvider = new ethers.providers.StaticJsonRpcProvider(
            ANVIL_RPC_URL,
            {
              name: 'anvil',
              chainId: actualChainId,
            }
          );
        } else {
          // Si coincide, configurarlo explícitamente para evitar problemas
          jsonRpcProvider = new ethers.providers.StaticJsonRpcProvider(
            ANVIL_RPC_URL,
            {
              name: 'anvil',
              chainId: actualChainId,
            }
          );
        }
      } catch (providerErr: any) {
        // Si hay un error al crear el provider (puede ser cambio de red), crear uno nuevo
        if (providerErr?.code === 'NETWORK_ERROR' || providerErr?.message?.includes('network changed')) {
          console.warn('Error al crear provider inicial, creando uno nuevo:', providerErr.message);
          jsonRpcProvider = new ethers.providers.StaticJsonRpcProvider(ANVIL_RPC_URL);
          // Intentar obtener el chainId
          try {
            const network = await jsonRpcProvider.getNetwork();
            const actualChainId = network.chainId;
            jsonRpcProvider = new ethers.providers.StaticJsonRpcProvider(
              ANVIL_RPC_URL,
              {
                name: 'anvil',
                chainId: actualChainId,
              }
            );
          } catch (e) {
            // Si falla, usar el chainId por defecto
            jsonRpcProvider = new ethers.providers.StaticJsonRpcProvider(
              ANVIL_RPC_URL,
              {
                name: 'anvil',
                chainId: CHAIN_ID,
              }
            );
          }
        } else {
          throw providerErr;
        }
      }

      // Deshabilitar completamente el polling para evitar cualquier verificación de red
      // Esto previene el error "network changed"
      if (jsonRpcProvider && jsonRpcProvider.polling !== undefined) {
        jsonRpcProvider.polling = false;
      }
      
      // Configurar un intervalo muy largo si el polling no se puede deshabilitar completamente
      if (jsonRpcProvider && jsonRpcProvider.pollingInterval !== undefined) {
        jsonRpcProvider.pollingInterval = 300000; // 5 minutos (muy largo)
      }

      // Deshabilitar listeners de eventos de red que pueden causar el error
      // Remover cualquier listener existente
      if (jsonRpcProvider) {
        jsonRpcProvider.removeAllListeners();
      }

      // Obtener el chainId real de Anvil ANTES de crear el wallet
      // Esto es importante porque Anvil con fork puede reportar el chainId de la red original (1 para mainnet)
      // en lugar del chainId local (31337)
      let actualChainId = CHAIN_ID;
      try {
        const network = await jsonRpcProvider.getNetwork();
        actualChainId = network.chainId;
        console.log('ChainId obtenido de Anvil:', actualChainId);
        // Si Anvil reporta un chainId diferente (por ejemplo, 1 si hace fork de mainnet),
        // necesitamos recrear el provider con ese chainId para que las transacciones funcionen
        if (actualChainId !== CHAIN_ID) {
          console.warn(`⚠️ Anvil reporta chainId ${actualChainId} en lugar de ${CHAIN_ID}. Recreando provider con el chainId correcto.`);
          // Recrear el provider con el chainId que Anvil realmente está usando
          jsonRpcProvider = new ethers.providers.StaticJsonRpcProvider(
            ANVIL_RPC_URL,
            {
              name: 'anvil',
              chainId: actualChainId,
            }
          );
          // Reconfigurar el provider
          if (jsonRpcProvider.polling !== undefined) {
            jsonRpcProvider.polling = false;
          }
          if (jsonRpcProvider.pollingInterval !== undefined) {
            jsonRpcProvider.pollingInterval = 300000;
          }
          jsonRpcProvider.removeAllListeners();
        }
      } catch (e) {
        // Si falla, usar el chainId configurado
        console.warn('No se pudo obtener el network del provider, usando chainId configurado:', CHAIN_ID);
        actualChainId = CHAIN_ID;
      }
      
      // Crear wallet con la private key
      // El provider ahora tiene el chainId correcto que Anvil está usando
      const wallet = new ethers.Wallet(ANVIL_PRIVATE_KEY, jsonRpcProvider);

      // Usar el chainId real obtenido de Anvil
      // Esto es importante porque Anvil con fork puede reportar un chainId diferente
      const validChainId = actualChainId && !isNaN(actualChainId) ? actualChainId : CHAIN_ID;
      
      // Verificar que los contratos existen
      console.log('Verificando contratos desplegados...');
      console.log('EUR address:', euroAddress);
      const { euroXAddress } = await import('@/config/web3');
      console.log('EURx address:', euroXAddress);
      
      // Intentar leer código del contrato EUR
      // Envolver en try-catch para manejar errores de cambio de red
      let euroCode: string;
      let euroXCode: string;
      let finalProvider = jsonRpcProvider;
      let finalWallet = wallet;
      
      try {
        euroCode = await jsonRpcProvider.getCode(euroAddress);
      } catch (codeErr: any) {
        // Si hay error de cambio de red, crear un nuevo provider y reintentar
        if (codeErr?.code === 'NETWORK_ERROR' || codeErr?.message?.includes('network changed')) {
          console.warn('Error al leer código del contrato (cambio de red), creando nuevo provider...');
          // Crear un nuevo provider limpio
          finalProvider = new ethers.providers.StaticJsonRpcProvider(
            ANVIL_RPC_URL,
            {
              name: 'anvil',
              chainId: CHAIN_ID,
            }
          );
          if (finalProvider.polling !== undefined) finalProvider.polling = false;
          if (finalProvider.pollingInterval !== undefined) finalProvider.pollingInterval = 300000;
          finalProvider.removeAllListeners();
          
          // Obtener el chainId real de Anvil
          let actualChainIdRetry = CHAIN_ID;
          try {
            const network = await finalProvider.getNetwork();
            actualChainIdRetry = network.chainId;
            if (actualChainIdRetry !== CHAIN_ID) {
              console.warn(`⚠️ Anvil reporta chainId ${actualChainIdRetry} en lugar de ${CHAIN_ID}. Usando el chainId de Anvil.`);
            }
          } catch (e) {
            console.warn('No se pudo obtener el network del provider, usando chainId configurado:', CHAIN_ID);
          }
          
          // Crear nuevo wallet con el nuevo provider
          // El provider ya tiene el chainId configurado en su constructor
          finalWallet = new ethers.Wallet(ANVIL_PRIVATE_KEY, finalProvider);
          
          // Reintentar
          euroCode = await finalProvider.getCode(euroAddress);
        } else {
          throw codeErr;
        }
      }
      
      if (euroCode === '0x') {
        throw new Error(`⚠️ El contrato EUR no existe en ${euroAddress}\n\n🔄 Redesplega los contratos:\n\ncd sc && forge script script/DeployAll.s.sol:DeployAllScript --rpc-url http://127.0.0.1:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast`);
      }
      
      // Verificar contrato EURx
      try {
        euroXCode = await finalProvider.getCode(euroXAddress);
      } catch (codeErr: any) {
        // Si hay error de cambio de red, el provider ya debería estar actualizado
        if (codeErr?.code === 'NETWORK_ERROR' || codeErr?.message?.includes('network changed')) {
          console.warn('Error al leer código de EURx (cambio de red), reintentando...');
          euroXCode = await finalProvider.getCode(euroXAddress);
        } else {
          throw codeErr;
        }
      }
      
      if (euroXCode === '0x') {
        throw new Error(`⚠️ El contrato EURx no existe en ${euroXAddress}\n\n🔄 Redesplega los contratos:\n\ncd sc && forge script script/DeployAll.s.sol:DeployAllScript --rpc-url http://127.0.0.1:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast`);
      }
      
      // Establecer el chainId PRIMERO para evitar que los useEffects se ejecuten con NaN
      setChainId(validChainId);
      setProvider(finalProvider);
      setSigner(finalWallet);
      setAccount(ANVIL_ADDRESS);
      
      console.log('✅ Contratos verificados correctamente');

      // Cargar balances usando el provider final (puede ser el original o uno nuevo)
      await loadBalances(finalProvider, ANVIL_ADDRESS, validChainId);
      
      setLoading(false);

      console.log('✅ Conectado exitosamente a Anvil:', {
        cuenta: ANVIL_ADDRESS,
        red: 'Anvil Local',
        chainId: validChainId,
        rpcUrl: ANVIL_RPC_URL,
      });
    } catch (err: any) {
      setLoading(false);
      
      let errorMsg: string;
      
      // Manejar específicamente el error de cambio de red
      // Este error puede ocurrir pero no es crítico - intentar continuar de todas formas
      if (err?.code === 'NETWORK_ERROR' || 
          err?.message?.includes('network changed') || 
          err?.message?.includes('underlying network changed') ||
          err?.message?.includes('Cambio de red')) {
        // Este es un warning, no un error crítico
        // Intentar continuar la conexión de todas formas
        console.warn('⚠️ Cambio de red detectado (intentando continuar):', err.message);
        
        // El provider original está en estado inválido, crear uno nuevo limpio
        try {
          // Asegurarse de que el chainId sea válido
          const validChainId = CHAIN_ID && !isNaN(CHAIN_ID) ? CHAIN_ID : 31337;
          
          // Crear un nuevo provider limpio (sin estado de error)
          const newProvider = new ethers.providers.StaticJsonRpcProvider(
            ANVIL_RPC_URL,
            {
              name: 'anvil',
              chainId: validChainId,
            }
          );

          // Deshabilitar polling y listeners para evitar nuevos errores
          if (newProvider.polling !== undefined) {
            newProvider.polling = false;
          }
          if (newProvider.pollingInterval !== undefined) {
            newProvider.pollingInterval = 300000;
          }
          newProvider.removeAllListeners();
          
          // Obtener el chainId real de Anvil
          let actualChainIdRetry = validChainId;
          try {
            const network = await newProvider.getNetwork();
            actualChainIdRetry = network.chainId;
            if (actualChainIdRetry !== validChainId) {
              console.warn(`⚠️ Anvil reporta chainId ${actualChainIdRetry} en lugar de ${validChainId}. Usando el chainId de Anvil.`);
            }
          } catch (e) {
            console.warn('No se pudo obtener el network del provider, usando chainId configurado:', validChainId);
          }
          
          // Verificar que los contratos existen (operación rápida)
          const euroCode = await newProvider.getCode(euroAddress);
          if (euroCode !== '0x') {
            // Si los contratos existen, la conexión funciona
            // Crear wallet y continuar con la carga de balances
            // El provider ya tiene el chainId configurado en su constructor
            const wallet = new ethers.Wallet(ANVIL_PRIVATE_KEY, newProvider);
            
            // Actualizar validChainId con el chainId real de Anvil
            const finalValidChainId = actualChainIdRetry;
            
            // Establecer el chainId PRIMERO para evitar que los useEffects se ejecuten con NaN
            setChainId(finalValidChainId);
            setProvider(newProvider);
            setSigner(wallet);
            setAccount(ANVIL_ADDRESS);
            
            // Continuar con la carga de balances usando el chainId válido
            await loadBalances(newProvider, ANVIL_ADDRESS, finalValidChainId);
            setLoading(false);
            console.log('✅ Conectado exitosamente a Anvil (después de cambio de red):', {
              cuenta: ANVIL_ADDRESS,
              red: 'Anvil Local',
              chainId: validChainId,
              rpcUrl: ANVIL_RPC_URL,
              nota: 'Se detectó un cambio de red, pero se creó una nueva conexión exitosamente',
            });
            return;
          } else {
            throw new Error('Los contratos no están desplegados');
          }
        } catch (retryErr: any) {
          // Si falla el retry, mostrar el error original
          errorMsg = 'La red de Anvil cambió y no se pudo reconectar. Por favor, recarga la página (F5) o verifica que Anvil esté corriendo correctamente.';
          console.error('❌ Error al intentar reconectar a Anvil:', retryErr);
          console.error('💡 Solución:', {
            paso1: 'Recarga la página (F5)',
            paso2: `Verifica que Anvil esté corriendo en ${ANVIL_RPC_URL}`,
            error: retryErr.message || 'Error desconocido',
          });
          setError(errorMsg);
          return;
        }
        
        // Si no se pudo continuar, mostrar el error
        errorMsg = 'La red de Anvil cambió. Por favor, recarga la página (F5) o verifica que Anvil esté corriendo correctamente.';
        console.error('❌ Cambio de red detectado - no se pudo continuar:', err);
        console.error('💡 Solución:', {
          paso1: 'Recarga la página (F5)',
          paso2: `Verifica que Anvil esté corriendo en ${ANVIL_RPC_URL}`,
        });
        setError(errorMsg);
        return;
      } else if (err instanceof SuperfluidAppError) {
        errorMsg = formatErrorForUser(err);
        console.error('❌ Error de Superfluid:', errorMsg);
        console.error('Detalles del error:', err);
        setError(errorMsg);
      } else {
        errorMsg = `Error conectando a Anvil: ${err.message || 'Error desconocido'}`;
        console.error('❌ Error conectando a Anvil:', {
          mensaje: err.message || 'Error desconocido',
          error: err,
          rpcUrl: ANVIL_RPC_URL,
          sugerencia: `Asegúrate de que Anvil esté corriendo en ${ANVIL_RPC_URL}`,
        });
        setError(errorMsg);
      }
      
      setError(errorMsg);
    }
  };

  // Cargar balances EUR y EURx
  const loadBalances = async (
    jsonRpcProvider: ethers.providers.JsonRpcProvider,
    userAddress: string,
    networkChainId: number
  ) => {
    try {
      console.log('Loading balances for:', userAddress);
      
      // EUR balance
      const euroContract = new ethers.Contract(
        euroAddress,
        ['function balanceOf(address) view returns (uint256)'],
        jsonRpcProvider
      );
      const euroBal = await euroContract.balanceOf(userAddress);
      const eurBalFormatted = ethers.utils.formatEther(euroBal || '0');
      console.log('EUR balance loaded:', eurBalFormatted);
      setEuroBalance(eurBalFormatted);

      // EURx balance
      const balance = await getRealtimeBalance(userAddress, jsonRpcProvider, networkChainId);
      const eurxBalFormatted = ethers.utils.formatEther(balance.availableBalance || '0');
      console.log('EURx balance loaded:', eurxBalFormatted);
      setEuroXBalance(eurxBalFormatted);
    } catch (err: any) {
      console.error('Error loading balances:', err);
      // Establecer valores predeterminados en caso de error
      setEuroBalance('0');
      setEuroXBalance('0');
    }
  };

  // Upgrade EUR a EURx
  const handleUpgrade = async () => {
    if (!signer || !upgradeAmount || !provider) return;

    setLoading(true);
    setError('');

    try {
      // Validar y parsear el monto
      const amount = parseFloat(upgradeAmount);
      if (isNaN(amount) || amount <= 0) {
        const errorMsg = 'Por favor ingresa un monto válido mayor a 0';
        console.error('❌ Error en upgrade:', errorMsg);
        setError(errorMsg);
        return;
      }

      const amountWei = ethers.utils.parseEther(upgradeAmount.trim());

      // Verificar y obtener el chainId real de Anvil antes de crear transacciones
      // Esto es crítico porque Anvil con fork puede reportar un chainId diferente
      // Si el chainId no coincide, necesitamos recrear el signer con el chainId correcto
      let actualChainIdForTx = chainId;
      let signerToUse = signer;
      
      if (signer.provider) {
        try {
          const network = await signer.provider.getNetwork();
          actualChainIdForTx = network.chainId;
          console.log('ChainId del provider del signer:', actualChainIdForTx);
          if (actualChainIdForTx !== chainId) {
            console.warn(`⚠️ El provider del signer reporta chainId ${actualChainIdForTx} en lugar de ${chainId}.`);
            console.warn('Recreando signer con el chainId correcto...');
            // Recrear el provider con el chainId correcto
            const newProvider = new ethers.providers.StaticJsonRpcProvider(
              ANVIL_RPC_URL,
              {
                name: 'anvil',
                chainId: actualChainIdForTx,
              }
            );
            if (newProvider.polling !== undefined) newProvider.polling = false;
            if (newProvider.pollingInterval !== undefined) newProvider.pollingInterval = 300000;
            newProvider.removeAllListeners();
            
            // Recrear el signer con el nuevo provider
            signerToUse = new ethers.Wallet(ANVIL_PRIVATE_KEY, newProvider);
            console.log('✅ Signer recreado con chainId:', actualChainIdForTx);
            
            // Actualizar el chainId en el estado
            setChainId(actualChainIdForTx);
            setProvider(newProvider);
            setSigner(signerToUse);
          }
        } catch (e) {
          console.warn('No se pudo obtener el network del provider del signer:', e);
        }
      }

      // Crear contrato EUR usando el signer correcto (puede ser el original o uno recreado)
      const euroContract = new ethers.Contract(
        euroAddress,
        [
          'function approve(address spender, uint256 amount) returns (bool)',
          'function balanceOf(address) view returns (uint256)',
          'function allowance(address owner, address spender) view returns (uint256)'
        ],
        signerToUse
      );

      // Verificar balance suficiente
      const eurBalance = await euroContract.balanceOf(account);
      if (eurBalance.lt(amountWei)) {
        const errorMsg = `Balance insuficiente. Tienes: ${ethers.utils.formatEther(eurBalance)} EUR, necesitas: ${upgradeAmount} EUR`;
        console.error('❌ Error en upgrade:', errorMsg);
        console.error('Detalles:', {
          balanceDisponible: ethers.utils.formatEther(eurBalance),
          balanceNecesario: upgradeAmount,
          cuenta: account,
        });
        setError(errorMsg);
        return;
      }

      // Obtener dirección de EURx
      const { euroXAddress } = await import('@/config/web3');

      // Aprobar si es necesario
      const currentAllowance = await euroContract.allowance(account, euroXAddress);
      if (currentAllowance.lt(amountWei)) {
        console.log('🔄 Aprobando EUR para upgrade...');
        // El chainId se determina automáticamente del provider/signer
        // No podemos pasarlo como override porque ethers.js no lo permite
        const approveTx = await euroContract.approve(euroXAddress, ethers.constants.MaxUint256);
        await approveTx.wait();
        console.log('✅ Aprobación exitosa. Ahora haciendo upgrade de', upgradeAmount, 'EUR a EURx...');
      } else {
        console.log('🔄 Haciendo upgrade de', upgradeAmount, 'EUR a EURx...');
      }

      // Realizar upgrade usando el signer correcto y el chainId real
      await upgradeToEuroX(amountWei.toString(), signerToUse, actualChainIdForTx);

      // Recargar balances y limpiar input
      // Usar el provider actualizado si se recreó el signer
      const providerToUse = signerToUse.provider || provider;
      await loadBalances(providerToUse, account, actualChainIdForTx);
      setUpgradeAmount('');
      console.log('✅ Upgrade completado:', {
        cantidad: upgradeAmount,
        unidad: 'EUR',
        convertidoA: 'EURx',
        cuenta: account,
      });
    } catch (err: any) {
      let errorMsg: string;
      if (err instanceof SuperfluidAppError) {
        errorMsg = formatErrorForUser(err);
      } else {
        errorMsg = `Error en upgrade: ${err.message || 'Error desconocido'}`;
      }
      console.error('❌ Error en upgrade:', errorMsg);
      console.error('Detalles del error:', {
        error: err,
        mensaje: err.message,
        stack: err.stack,
        upgradeAmount: upgradeAmount,
        cuenta: account,
      });
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Downgrade EURx a EUR
  const handleDowngrade = async () => {
    if (!signer || !downgradeAmount) return;

    setLoading(true);
    setError('');

    try {
      // Validar que el monto sea un número válido
      const amount = parseFloat(downgradeAmount);
      if (isNaN(amount) || amount <= 0) {
        alert('❌ Por favor ingresa un monto válido mayor a 0');
        setLoading(false);
        return;
      }

      const amountWei = ethers.utils.parseEther(downgradeAmount);

      alert(`🔄 Convirtiendo ${downgradeAmount} EURx a EUR...\n\nEspera la confirmación.`);

      // Downgrade
      await downgradeFromEuroX(amountWei.toString(), signer, chainId);

      // Recargar balances
      if (provider && account) {
        await loadBalances(provider, account, chainId);
      }

      setDowngradeAmount('');
      alert(`✅ Downgrade completado!\n\nSe han convertido ${downgradeAmount} EURx a EUR exitosamente.`);
    } catch (err: any) {
      let errorMsg: string;
      if (err instanceof SuperfluidAppError) {
        errorMsg = formatErrorForUser(err);
      } else {
        errorMsg = `Error en downgrade: ${err.message || 'Error desconocido'}`;
      }
      setError(errorMsg);
      alert(`❌ ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // Agregar destinatario y comenzar stream
  const handleAddRecipient = async () => {
    if (!signer || !newRecipient || !provider) return;

    setLoading(true);
    setError('');

    try {
      // Validar dirección
      if (!ethers.utils.isAddress(newRecipient)) {
        throw new Error('Dirección Ethereum inválida');
      }

      // Validar que el destinatario no sea la misma cuenta
      try {
        validateDifferentAddresses(account, newRecipient);
      } catch (err: any) {
        alert(`❌ ${err.message}`);
        setLoading(false);
        return;
      }

      // Verificar si ya está en la lista
      if (recipients.find((r) => r.address.toLowerCase() === newRecipient.toLowerCase())) {
        alert(`⚠️ Este destinatario ya está en tu lista.`);
        setLoading(false);
        return;
      }

      // Verificar si ya existe un flujo
      const existingFlow = await getFlow(account, newRecipient, provider, chainId);
      
      if (existingFlow && existingFlow.flowRate !== '0') {
        // Si ya existe un flujo activo, agregarlo a la lista sin crear uno nuevo
        const flowRatePerSecond = ethers.BigNumber.from(existingFlow.flowRate);
        const secondsInMonth = 30 * 24 * 60 * 60;
        const flowRatePerMonth = flowRatePerSecond.mul(secondsInMonth);
        const flowRateEurPerMonth = ethers.utils.formatEther(flowRatePerMonth);

        const balance = await getRealtimeBalance(newRecipient, provider, chainId);
        
        // Obtener balance EUR
        const euroContract = new ethers.Contract(
          euroAddress,
          ['function balanceOf(address) view returns (uint256)'],
          provider
        );
        const euroBal = await euroContract.balanceOf(newRecipient);
        
        const newRec: Recipient = {
          address: newRecipient,
          flowRate: flowRateEurPerMonth,
          balance: ethers.utils.formatEther(balance.availableBalance),
          euroBalance: ethers.utils.formatEther(euroBal),
          status: 'active',
        };
        setRecipients([...recipients, newRec]);
        setNewRecipient('');
        
        alert(`✅ Se agregó el destinatario a tu lista!\n\nYa existe un stream activo de ${parseFloat(flowRateEurPerMonth).toFixed(2)} EUR/mes`);
        setLoading(false);
        return;
      }

      // Validar flow rate antes de crear
      try {
        validateFlowRate(MONTHLY_FLOW_RATE);
      } catch (err: any) {
        alert(`❌ ${err.message}`);
        setLoading(false);
        return;
      }

      // Validar depósito suficiente antes de crear
      try {
        await validateSufficientDeposit(account, MONTHLY_FLOW_RATE, provider, chainId, true);
      } catch (err: any) {
        alert(`❌ ${err.message}`);
        setLoading(false);
        return;
      }

      // Calcular depósito requerido para mostrar información
      const requiredDeposit = calculateRequiredDeposit(MONTHLY_FLOW_RATE, 8);
      const depositFormatted = ethers.utils.formatEther(requiredDeposit);

      alert(
        `🚀 Creando stream de 2000 EUR/mes a:\n${newRecipient}\n\n` +
        `Depósito requerido: ${parseFloat(depositFormatted).toFixed(4)} EURx (8 horas)\n\n` +
        `Espera la confirmación...`
      );

      // Crear flow (2000 EUR/month)
      await createFlow(newRecipient, signer, chainId);

      // Agregar a la lista local
      const newRec: Recipient = {
        address: newRecipient,
        flowRate: '2000',
        balance: '0',
        euroBalance: '0',
        status: 'active',
      };
      setRecipients([...recipients, newRec]);
      setNewRecipient('');

      alert(`✅ Stream creado exitosamente!\n\nEstás enviando 2000 EUR/mes a:\n${newRecipient}`);
    } catch (err: any) {
      let errorMsg: string;
      if (err instanceof SuperfluidAppError) {
        errorMsg = formatErrorForUser(err);
      } else {
        errorMsg = `Error creando stream: ${err.message || 'Error desconocido'}`;
      }
      setError(errorMsg);
      alert(`❌ ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // Pausar stream (eliminar flow pero mantener en la lista)
  const handlePauseStream = async (recipient: string) => {
    if (!signer || !provider) return;

    setLoading(true);
    setError('');

    try {
      alert(`⏸️ Pausando stream a:\n${recipient}\n\nEspera la confirmación...`);

      // En Superfluid no se puede poner flowRate a 0, hay que eliminar el flow
      // Pero lo mantenemos en la lista para poder reanudarlo después
      await deleteFlow(recipient, signer, chainId);

      // Actualizar lista local - mantener destinatario pero cambiar estado a pausado
      setRecipients(
        recipients.map((r) =>
          r.address === recipient ? { ...r, flowRate: '0', status: 'paused' } : r
        )
      );

      alert(`✅ Stream pausado exitosamente!\n\nEl flujo se eliminó pero puedes reanudarlo cuando quieras.`);
    } catch (err: any) {
      let errorMsg: string;
      if (err instanceof SuperfluidAppError) {
        errorMsg = formatErrorForUser(err);
      } else {
        errorMsg = `Error pausando stream: ${err.message || 'Error desconocido'}`;
      }
      setError(errorMsg);
      alert(`❌ ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // Downgrade EURx a EUR para un destinatario específico
  const handleDowngradeRecipient = async (recipientAddress: string) => {
    if (!provider) return;

    setLoading(true);
    setError('');

    try {
      // Verificar si la dirección está en las cuentas de Anvil
      const privateKey = ANVIL_ACCOUNTS[recipientAddress];
      
      if (!privateKey) {
        alert(`⚠️ Esta dirección no está en las cuentas de Anvil.\n\nSolo se puede hacer downgrade automático de cuentas de Anvil.`);
        setLoading(false);
        return;
      }

      // Crear un signer temporal con la private key del destinatario
      const recipientSigner = new ethers.Wallet(privateKey, provider);

      // Obtener el balance EURx del destinatario desde el contrato
      const { euroXAddress } = await import('@/config/web3');
      const euroXContract = new ethers.Contract(
        euroXAddress,
        ['function balanceOf(address) view returns (uint256)'],
        provider
      );
      const contractBalance = await euroXContract.balanceOf(recipientAddress);

      if (contractBalance.eq(0)) {
        alert(`⚠️ El destinatario no tiene EURx para hacer downgrade.`);
        setLoading(false);
        return;
      }

      // Para estar seguros, hacer downgrade solo del 80% del balance
      // Esto evita problemas con depósitos bloqueados y flujos activos
      const downgradeAmount = contractBalance.mul(80).div(100);

      if (downgradeAmount.eq(0)) {
        alert(`⚠️ El destinatario no tiene suficiente EURx disponible para hacer downgrade.`);
        setLoading(false);
        return;
      }

      const downgradeAmountFormatted = ethers.utils.formatEther(downgradeAmount);
      
      alert(`🔄 Haciendo downgrade de ${parseFloat(downgradeAmountFormatted).toFixed(4)} EURx a EUR\n\nDesde: ${recipientAddress}\n\nEspera la confirmación...`);

      // Hacer downgrade desde la cuenta del destinatario
      await downgradeFromEuroX(downgradeAmount.toString(), recipientSigner, chainId);

      alert(`✅ Downgrade completado!\n\n${parseFloat(downgradeAmountFormatted).toFixed(4)} EURx convertidos a EUR\nEn la cuenta: ${recipientAddress}`);
    } catch (err: any) {
      let errorMsg: string;
      if (err instanceof SuperfluidAppError) {
        errorMsg = formatErrorForUser(err);
      } else {
        errorMsg = `Error en downgrade: ${err.message || 'Error desconocido'}`;
      }
      setError(errorMsg);
      alert(`❌ ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // Eliminar destinatario de la lista
  const handleRemoveRecipient = async (recipient: string) => {
    if (!signer || !provider) return;

    setLoading(true);
    setError('');

    try {
      // Verificar si hay un flow activo
      const existingFlow = await getFlow(account, recipient, provider, chainId);
      
      if (existingFlow && existingFlow.flowRate !== '0') {
        // Si hay un flow activo, eliminarlo primero
        alert(`🗑️ Eliminando stream y destinatario:\n${recipient}\n\nEspera la confirmación...`);
        await deleteFlow(recipient, signer, chainId);
      }

      // Remover de la lista local
      setRecipients(recipients.filter((r) => r.address !== recipient));

      alert(`✅ Destinatario eliminado de tu lista.`);
    } catch (err: any) {
      let errorMsg: string;
      if (err instanceof SuperfluidAppError) {
        errorMsg = formatErrorForUser(err);
      } else {
        errorMsg = `Error eliminando destinatario: ${err.message || 'Error desconocido'}`;
      }
      setError(errorMsg);
      alert(`❌ ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // Editar flow rate de un stream existente
  const handleUpdateFlowRate = async (recipient: string, newFlowRateMonthly: string) => {
    if (!signer || !provider || !newFlowRateMonthly) return;

    setLoading(true);
    setError('');

    try {
      // Validar que el destinatario no sea la misma cuenta
      try {
        validateDifferentAddresses(account, recipient);
      } catch (err: any) {
        alert(`❌ ${err.message}`);
        setLoading(false);
        return;
      }

      // Validar que el flow existe
      const existingFlow = await getFlow(account, recipient, provider, chainId);
      if (!existingFlow || existingFlow.flowRate === '0') {
        alert('❌ No hay un stream activo para este destinatario. Crea uno nuevo primero.');
        setLoading(false);
        setEditingFlowRate(null);
        setNewFlowRateMonthly('');
        return;
      }

      // Convertir flow rate mensual a wei/segundo
      const newFlowRateWeiPerSec = monthlyToFlowRate(newFlowRateMonthly);

      // Validar flow rate
      try {
        validateFlowRate(newFlowRateWeiPerSec);
      } catch (err: any) {
        alert(`❌ ${err.message}`);
        setLoading(false);
        return;
      }

      // Obtener flow rate actual
      const currentFlowRateBN = ethers.BigNumber.from(existingFlow.flowRate);
      const newFlowRateBN = ethers.BigNumber.from(newFlowRateWeiPerSec);

      // Si el nuevo flow rate es mayor, validar depósito adicional
      if (newFlowRateBN.gt(currentFlowRateBN)) {
        const flowRateIncrease = newFlowRateBN.sub(currentFlowRateBN);
        try {
          await validateSufficientDeposit(
            account,
            flowRateIncrease.toString(),
            provider,
            chainId,
            true
          );
        } catch (err: any) {
          alert(`❌ ${err.message}`);
          setLoading(false);
          return;
        }

        // Calcular depósito adicional requerido
        const additionalDeposit = calculateRequiredDeposit(flowRateIncrease.toString(), 8);
        const depositFormatted = ethers.utils.formatEther(additionalDeposit);

        alert(
          `🔄 Actualizando flow rate de ${parseFloat(recipients.find(r => r.address === recipient)?.flowRate || '0').toFixed(2)} a ${newFlowRateMonthly} EUR/mes\n\n` +
          `Depósito adicional requerido: ${parseFloat(depositFormatted).toFixed(4)} EURx (8 horas)\n\n` +
          `Espera la confirmación...`
        );
      } else {
        alert(
          `🔄 Actualizando flow rate de ${parseFloat(recipients.find(r => r.address === recipient)?.flowRate || '0').toFixed(2)} a ${newFlowRateMonthly} EUR/mes\n\n` +
          `Espera la confirmación...`
        );
      }

      // Actualizar el flow
      await updateFlow(recipient, newFlowRateWeiPerSec, signer, chainId);

      // Actualizar lista local
      setRecipients(
        recipients.map((r) =>
          r.address === recipient ? { ...r, flowRate: newFlowRateMonthly, status: 'active' } : r
        )
      );

      setEditingFlowRate(null);
      setNewFlowRateMonthly('');
      alert(`✅ Flow rate actualizado exitosamente!\n\nAhora estás enviando ${newFlowRateMonthly} EUR/mes a:\n${recipient}`);
    } catch (err: any) {
      let errorMsg: string;
      if (err instanceof SuperfluidAppError) {
        errorMsg = formatErrorForUser(err);
      } else {
        errorMsg = `Error actualizando flow rate: ${err.message || 'Error desconocido'}`;
      }
      setError(errorMsg);
      alert(`❌ ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // Reanudar stream
  const handleResumeStream = async (recipient: string) => {
    if (!signer || !provider) return;

    setLoading(true);
    setError('');

    try {
      // Validar que el destinatario no sea la misma cuenta
      try {
        validateDifferentAddresses(account, recipient);
      } catch (err: any) {
        alert(`❌ ${err.message}`);
        setLoading(false);
        return;
      }

      // Si está pausado, el flow fue eliminado, así que crear uno nuevo
      // Importar MONTHLY_FLOW_RATE
      const { MONTHLY_FLOW_RATE } = await import('@/config/web3');

      // Verificar si ya existe un flujo activo
      const existingFlow = await getFlow(account, recipient, provider, chainId);
      
      if (existingFlow && existingFlow.flowRate !== '0') {
        // Ya existe un flujo activo, solo actualizar la lista local
        const flowRatePerSecond = ethers.BigNumber.from(existingFlow.flowRate);
        const secondsInMonth = 30 * 24 * 60 * 60;
        const flowRatePerMonth = flowRatePerSecond.mul(secondsInMonth);
        const flowRateEurPerMonth = ethers.utils.formatEther(flowRatePerMonth);
        
        setRecipients(
          recipients.map((r) =>
            r.address === recipient ? { ...r, flowRate: flowRateEurPerMonth, status: 'active' } : r
          )
        );
        
        alert(`✅ Ya existe un stream activo de ${parseFloat(flowRateEurPerMonth).toFixed(2)} EUR/mes`);
      } else {
        // Validar flow rate antes de crear
        try {
          validateFlowRate(MONTHLY_FLOW_RATE);
        } catch (err: any) {
          alert(`❌ ${err.message}`);
          setLoading(false);
          return;
        }

        // Validar depósito suficiente antes de crear
        try {
          await validateSufficientDeposit(account, MONTHLY_FLOW_RATE, provider, chainId, true);
        } catch (err: any) {
          alert(`❌ ${err.message}`);
          setLoading(false);
          return;
        }

        // Calcular depósito requerido
        const requiredDeposit = calculateRequiredDeposit(MONTHLY_FLOW_RATE, 8);
        const depositFormatted = ethers.utils.formatEther(requiredDeposit);

        alert(
          `▶️ Reanudando stream de 2000 EUR/mes a:\n${recipient}\n\n` +
          `Depósito requerido: ${parseFloat(depositFormatted).toFixed(4)} EURx (8 horas)\n\n` +
          `Espera la confirmación...`
        );

        // No existe flujo, crear uno nuevo
        await createFlow(recipient, signer, chainId);
        
        // Actualizar lista local
        setRecipients(
          recipients.map((r) =>
            r.address === recipient ? { ...r, flowRate: '2000', status: 'active' } : r
          )
        );
        
        alert(`✅ Stream reanudado exitosamente!\n\nEstás enviando 2000 EUR/mes a:\n${recipient}`);
      }
    } catch (err: any) {
      let errorMsg: string;
      if (err instanceof SuperfluidAppError) {
        errorMsg = formatErrorForUser(err);
      } else {
        errorMsg = `Error reanudando stream: ${err.message || 'Error desconocido'}`;
      }
      setError(errorMsg);
      alert(`❌ ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // Actualizar balances del emisor cada 5 segundos
 
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4 transition-colors">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              💧 Superfluid EUR Streaming
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Dashboard para gestionar streams de dinero en tiempo real con Superfluid
            </p>
          </div>
          <ThemeToggle />
        </div>

        {!account ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center border border-gray-200 dark:border-gray-700">
            <div className="mb-6">
              <div className="text-6xl mb-4">🔗</div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                Conectar Wallet
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Esta aplicación usa automáticamente la cuenta de Anvil para desarrollo.
              </p>
            </div>
            <button
              onClick={connectWallet}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-8 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg transform hover:scale-105 font-medium"
            >
              Conectar con Anvil
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Account Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <span>👤</span> Cuenta
                </h2>
                <Tooltip content="Tu dirección de wallet en la red">
                  <div className="text-sm text-gray-500 dark:text-gray-400">ℹ️</div>
                </Tooltip>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 block">Dirección</label>
                  <AddressDisplay address={account} />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 block">Red</label>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {chainId === CHAIN_ID ? 'Anvil Local (Chain 31337)' : `Chain ${chainId}`}
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 rounded-lg p-4 border border-green-200 dark:border-green-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-green-700 dark:text-green-200">EUR Balance</span>
                      <span className="text-lg">💶</span>
                    </div>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                      {parseFloat(euroBalance).toFixed(2)} <span className="text-lg">EUR</span>
                    </p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-lg p-4 border border-blue-200 dark:border-blue-700 relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-200">EURx Balance</span>
                      <span className="text-lg">💧</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 font-mono">
                      {parseFloat(euroXBalance).toFixed(6)} <span className="text-lg">EURx</span>
                    </p>
                    {recipients.some(r => r.status === 'active') && (
                      <div className="absolute top-2 right-2">
                        <span className="inline-flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900 px-2 py-1 rounded-full animate-pulse">
                          <span>⬇️</span>
                          <span>Streaming...</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {recipients.some(r => r.status === 'active') && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="bg-red-50 dark:bg-red-900 rounded-lg p-4 border border-red-200 dark:border-red-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-red-700 dark:text-red-200 mb-1">Flujo Total Saliente</p>
                        <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                          {recipients
                            .filter(r => r.status === 'active')
                            .reduce((sum, r) => sum + parseFloat(r.flowRate), 0)
                            .toFixed(2)}{' '}
                          <span className="text-lg">EUR/mes</span>
                        </p>
                      </div>
                      <div className="text-3xl">💸</div>
                    </div>
                    <p className="text-xs text-red-600 dark:text-red-300 mt-3 flex items-center gap-1">
                      <span>💡</span>
                      <span>El balance se actualiza cada 5 segundos mientras hay streams activos</span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Statistics */}
            {recipients.length > 0 && (
              <Statistics
                recipients={recipients}
                euroBalance={euroBalance}
                euroXBalance={euroXBalance}
                account={account}
              />
            )}

            {/* Debug: Clear localStorage */}
            <div className="bg-yellow-50 dark:bg-yellow-900 border-2 border-yellow-300 dark:border-yellow-700 rounded-xl p-4 mb-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💡</span>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                    Si tienes problemas, limpia los datos guardados
                  </p>
                </div>
                <button
                  onClick={() => {
                    localStorage.clear();
                    setRecipients([]);
                    alert('✅ Datos locales limpiados.\n\nRecarga la página.');
                  }}
                  className="bg-gradient-to-r from-yellow-600 to-yellow-700 text-white px-4 py-2 rounded-lg hover:from-yellow-700 hover:to-yellow-800 transition-all shadow-md hover:shadow-lg text-sm font-medium"
                >
                  🗑️ Limpiar Datos
                </button>
              </div>
            </div>

            {/* Upgrade EUR to EURx */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-gray-900 dark:text-white">
                <span>🔄</span> Convertir EUR ↔ EURx
              </h2>
              
              {/* Upgrade */}
              <div className="mb-6 p-4 bg-green-50 dark:bg-green-900 rounded-lg border border-green-200 dark:border-green-700">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-green-900 dark:text-green-200">📈 Upgrade EUR → EURx</h3>
                  <Tooltip content="Convierte EUR a EURx (Super Token) para poder crear streams">
                    <span className="text-xs text-green-600 dark:text-green-400">ℹ️</span>
                  </Tooltip>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={upgradeAmount}
                      onChange={(e) => {
                        const val = e.target.value;
                        setUpgradeAmount(val === '' || isNaN(parseFloat(val)) ? '' : val);
                      }}
                      placeholder="Cantidad en EUR (ej: 1000)"
                      className="w-full px-4 py-3 border border-green-300 dark:border-green-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                  <button
                    onClick={handleUpgrade}
                    disabled={loading || !upgradeAmount}
                    className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-none font-medium flex items-center gap-2"
                  >
                    {loading ? <LoadingSpinner size="sm" /> : null}
                    Upgrade
                  </button>
                </div>
              </div>

              {/* Downgrade */}
              <div className="p-4 bg-purple-50 dark:bg-purple-900 rounded-lg border border-purple-200 dark:border-purple-700">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-200">📉 Downgrade EURx → EUR</h3>
                  <Tooltip content="Convierte EURx de vuelta a EUR (unwrap)">
                    <span className="text-xs text-purple-600 dark:text-purple-400">ℹ️</span>
                  </Tooltip>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={downgradeAmount}
                      onChange={(e) => setDowngradeAmount(e.target.value)}
                      placeholder="Cantidad en EURx (ej: 500)"
                      className="w-full px-4 py-3 border border-purple-300 dark:border-purple-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                  <button
                    onClick={handleDowngrade}
                    disabled={loading || !downgradeAmount}
                    className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all shadow-md hover:shadow-lg disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-none font-medium flex items-center gap-2"
                  >
                    {loading ? <LoadingSpinner size="sm" /> : null}
                    Downgrade
                  </button>
                </div>
              </div>
            </div>

            {/* Add Recipient */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                  <span>➕</span> Agregar Destinatario
                </h2>
                <Tooltip content="Crea un nuevo stream de 2000 EUR/mes o agrega un stream existente a tu lista">
                  <span className="text-sm text-gray-500 dark:text-gray-400">ℹ️</span>
                </Tooltip>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Ingresa una dirección para crear un nuevo stream de 2000 EUR/mes, o para agregar un stream existente a tu lista.
              </p>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newRecipient}
                  onChange={(e) => setNewRecipient(e.target.value.trim())}
                  placeholder="0x... (dirección Ethereum)"
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition font-mono text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
                <button
                  onClick={handleAddRecipient}
                  disabled={loading || !newRecipient}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-none font-medium flex items-center gap-2"
                >
                  {loading ? <LoadingSpinner size="sm" /> : null}
                  Agregar
                </button>
              </div>
            </div>

            {/* Recipients List */}
            {recipients.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-gray-900 dark:text-white">
                  <span>👥</span> Destinatarios ({recipients.length})
                </h2>
                <div className="space-y-4">
                  {recipients.map((recipient, index) => {
                    return (
                      <div
                        key={index}
                        className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900"
                      >
                        <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="mb-3">
                            <AddressDisplay address={recipient.address} />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                              <p className="text-xs text-blue-600 dark:text-blue-300 mb-1">Flow Rate</p>
                              <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                                {parseFloat(recipient.flowRate).toFixed(2)} <span className="text-sm">EUR/mes</span>
                              </p>
                            </div>
                            
                            <div className="bg-green-50 dark:bg-green-900 rounded-lg p-3 border border-green-200 dark:border-green-700">
                              <p className="text-xs text-green-600 dark:text-green-300 mb-1">Balance EURx</p>
                              <p className="text-lg font-bold text-green-900 dark:text-green-100">
                                {parseFloat(recipient.balance).toFixed(4)} <span className="text-sm">EURx</span>
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <StatusBadge status={recipient.status} />
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              EUR: {parseFloat(recipient.euroBalance).toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 ml-4">
                          <div className="flex gap-2">
                            {recipient.status === 'active' && (
                              <>
                                <Tooltip content="Editar el flow rate de este stream">
                                  <button
                                    onClick={() => {
                                      setEditingFlowRate(recipient.address);
                                      setNewFlowRateMonthly(recipient.flowRate);
                                    }}
                                    disabled={loading || editingFlowRate === recipient.address}
                                    className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-none flex items-center gap-2 text-sm font-medium"
                                  >
                                    ✏️ Editar
                                  </button>
                                </Tooltip>
                                <Tooltip content="Pausar este stream (se puede reanudar después)">
                                  <button
                                    onClick={() => handlePauseStream(recipient.address)}
                                    disabled={loading || editingFlowRate === recipient.address}
                                    className="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-4 py-2 rounded-lg hover:from-orange-700 hover:to-orange-800 transition-all shadow-md hover:shadow-lg disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-none flex items-center gap-2 text-sm font-medium"
                                  >
                                    ⏸️ Pausar
                                  </button>
                                </Tooltip>
                              </>
                            )}
                            {recipient.status === 'paused' && (
                              <>
                                <Tooltip content="Reanudar este stream">
                                  <button
                                    onClick={() => handleResumeStream(recipient.address)}
                                    disabled={loading}
                                    className="bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-none flex items-center gap-2 text-sm font-medium"
                                  >
                                    ▶️ Reanudar
                                  </button>
                                </Tooltip>
                                <Tooltip content="Eliminar este destinatario de tu lista">
                                  <button
                                    onClick={() => handleRemoveRecipient(recipient.address)}
                                    disabled={loading}
                                    className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded-lg hover:from-red-700 hover:to-red-800 transition-all shadow-md hover:shadow-lg disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-none flex items-center gap-2 text-sm font-medium"
                                  >
                                    🗑️ Eliminar
                                  </button>
                                </Tooltip>
                              </>
                            )}
                            {recipient.status === 'none' && (
                              <>
                                <Tooltip content="Iniciar un nuevo stream para este destinatario">
                                  <button
                                    onClick={() => handleResumeStream(recipient.address)}
                                    disabled={loading}
                                    className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-none flex items-center gap-2 text-sm font-medium"
                                  >
                                    ▶️ Iniciar
                                  </button>
                                </Tooltip>
                                <Tooltip content="Eliminar este destinatario de tu lista">
                                  <button
                                    onClick={() => handleRemoveRecipient(recipient.address)}
                                    disabled={loading}
                                    className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-4 py-2 rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all shadow-md hover:shadow-lg disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-none flex items-center gap-2 text-sm font-medium"
                                  >
                                    🗑️ Eliminar
                                  </button>
                                </Tooltip>
                              </>
                            )}
                          </div>
                          {/* Botón de Downgrade para cuentas de Anvil */}
                          {ANVIL_ACCOUNTS[recipient.address] && parseFloat(recipient.balance) > 0 && (
                            <Tooltip content="Hacer downgrade del 80% del balance EURx del destinatario">
                              <button
                                onClick={() => handleDowngradeRecipient(recipient.address)}
                                disabled={loading || editingFlowRate === recipient.address}
                                className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all shadow-md hover:shadow-lg disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-none flex items-center gap-2 text-xs font-medium"
                              >
                                📉 Downgrade 80%
                              </button>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    </div>
                    );
                  })}
                  
                  {/* Formulario de edición de flow rate */}
                  {editingFlowRate && (
                    <div className="border-2 border-blue-400 dark:border-blue-600 rounded-xl p-5 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 shadow-lg mt-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-blue-900 dark:text-blue-100 text-lg flex items-center gap-2">
                          <span>✏️</span> Editar Flow Rate
                        </h3>
                        <Tooltip content="Modifica el flow rate de este stream sin perder el historial">
                          <span className="text-sm text-blue-600 dark:text-blue-400">ℹ️</span>
                        </Tooltip>
                      </div>
                      
                      <div className="mb-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-700">
                        <p className="text-sm text-blue-700 dark:text-blue-300 mb-1">
                          <span className="font-medium">Destinatario:</span>
                        </p>
                        <AddressDisplay address={recipients.find(r => r.address === editingFlowRate)?.address || ''} />
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                          <span className="font-medium">Flow Rate Actual:</span>{' '}
                          <span className="font-bold text-blue-900 dark:text-blue-100">
                            {parseFloat(recipients.find(r => r.address === editingFlowRate)?.flowRate || '0').toFixed(2)} EUR/mes
                          </span>
                        </p>
                      </div>
                      
                      <div className="flex gap-4 items-end">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-blue-900 mb-2">
                            Nuevo Flow Rate (EUR/mes)
                          </label>
                          <input
                            type="number"
                            min="0.01"
                            max="100000"
                            step="0.01"
                            value={newFlowRateMonthly}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNewFlowRateMonthly(val === '' || isNaN(parseFloat(val)) ? '' : val);
                            }}
                            placeholder="Ej: 1500"
                            className="w-full px-4 py-3 border-2 border-blue-300 dark:border-blue-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition font-medium bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                          />
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 flex items-center gap-2">
                            <span>📊</span>
                            <span>Mínimo: 0.01 EUR/mes | Máximo: 100,000 EUR/mes</span>
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const recipient = recipients.find(r => r.address === editingFlowRate);
                              if (recipient && newFlowRateMonthly) {
                                handleUpdateFlowRate(editingFlowRate, newFlowRateMonthly);
                              }
                            }}
                            disabled={loading || !newFlowRateMonthly || parseFloat(newFlowRateMonthly) <= 0}
                            className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-none font-medium flex items-center gap-2"
                          >
                            {loading ? <LoadingSpinner size="sm" /> : <span>✅</span>}
                            Guardar
                          </button>
                          <button
                            onClick={() => {
                              setEditingFlowRate(null);
                              setNewFlowRateMonthly('');
                            }}
                            disabled={loading}
                            className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-6 py-3 rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all shadow-md hover:shadow-lg disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-none font-medium"
                          >
                            ❌ Cancelar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900 border-2 border-red-300 dark:border-red-700 rounded-xl p-4 flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div className="flex-1">
                  <p className="text-red-800 dark:text-red-200 font-medium">{error}</p>
                </div>
                <button
                  onClick={() => setError('')}
                  className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition"
                  title="Cerrar"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Loading Indicator */}
            {loading && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 flex items-center justify-center gap-4">
                <LoadingSpinner size="md" />
                <p className="text-blue-800 font-medium">Procesando transacción...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
