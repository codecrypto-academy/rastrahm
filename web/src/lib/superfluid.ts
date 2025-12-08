import { Framework } from '@superfluid-finance/sdk-core';
import { ethers } from 'ethers';
import { 
  euroAddress, 
  euroXAddress, 
  superfluidConfig, 
  MONTHLY_FLOW_RATE,
  MIN_FLOW_RATE_WEI_PER_SEC,
  MAX_FLOW_RATE_WEI_PER_SEC,
  MIN_DEPOSIT_HOURS,
  RECOMMENDED_DEPOSIT_HOURS
} from '@/config/web3';
import { createAppError, logError, ErrorType, SuperfluidAppError } from './errors';

/**
 * Initialize Superfluid Framework with custom configuration
 * @param provider Ethers provider or signer
 * @param chainId Current chain ID
 */
async function createSuperfluidFramework(provider: any, chainId: number) {
  try {
    // Validar que el chainId sea un número válido
    const validChainId = chainId && !isNaN(chainId) && chainId > 0 ? chainId : 31337;
    
    console.log('Initializing Superfluid Framework...');
    console.log('Chain ID:', validChainId);
    console.log('Resolver:', superfluidConfig.resolver);
    
    if (!validChainId || validChainId === 0 || isNaN(validChainId)) {
      throw new Error('ChainId inválido. Se requiere un chainId válido para inicializar Superfluid Framework.');
    }
    
    const sf = await Framework.create({
      chainId: validChainId,
      provider,
      resolverAddress: superfluidConfig.resolver,
      protocolReleaseVersion: 'v1',
    });
    
    console.log('Superfluid Framework initialized successfully');
    return sf;
  } catch (error) {
    const appError = createAppError(error, 'inicializar Superfluid Framework', 'superfluid');
    logError(appError, 'createSuperfluidFramework');
    throw appError;
  }
}

/**
 * Upgrade EUR tokens to EURx Super Tokens
 * @param amount Amount to upgrade in wei
 * @param signer Ethers signer
 * @param chainId Current chain ID
 */
export async function upgradeToEuroX(
  amount: string,
  signer: ethers.Signer,
  chainId: number
) {
  try {
    console.log('Starting upgrade to EuroX...');
    console.log('Amount (wei):', amount);
    console.log('Amount (ETH):', ethers.utils.formatEther(amount));
    console.log('EuroX Address:', euroXAddress);
    console.log('Signer address:', await signer.getAddress());
    
    const sf = await createSuperfluidFramework(signer.provider!, chainId);
    
    console.log('Loading SuperToken at:', euroXAddress);
    const euroXToken = await sf.loadSuperToken(euroXAddress);
    console.log('SuperToken loaded successfully');

    const upgradeOperation = euroXToken.upgrade({
      amount: amount
    });

    console.log('Executing upgrade operation...');
    const tx = await upgradeOperation.exec(signer);
    
    console.log('Transaction sent:', tx.hash);
    await tx.wait();
    console.log('Transaction confirmed');

    return { success: true, txHash: tx.hash };
  } catch (error) {
    const appError = createAppError(error, 'hacer upgrade de EUR a EURx', 'superfluid');
    logError(appError, 'upgradeToEuroX');
    throw appError;
  }
}

/**
 * Downgrade EURx Super Tokens to EUR
 * @param amount Amount to downgrade in wei
 * @param signer Ethers signer
 * @param chainId Current chain ID
 */
export async function downgradeFromEuroX(
  amount: string,
  signer: ethers.Signer,
  chainId: number
) {
  try {
    const sf = await createSuperfluidFramework(signer.provider!, chainId);
    const euroXToken = await sf.loadSuperToken(euroXAddress);

    const downgradeOperation = euroXToken.downgrade({
      amount : amount
    });
    console.log('downgradeOperation', downgradeOperation);
    const tx = await downgradeOperation.exec(signer);
    await tx.wait();

    return { success: true, txHash: tx.hash };
  } catch (error) {
    const appError = createAppError(error, 'hacer downgrade de EURx a EUR', 'superfluid');
    logError(appError, 'downgradeFromEuroX');
    throw appError;
  }
}

/**
 * Create a new Superfluid stream
 * @param receiver Recipient address
 * @param signer Ethers signer
 * @param chainId Current chain ID
 * @param flowRate Flow rate in wei/second (default: 2000 EUR/month)
 * @param skipValidations Skip validations (use with caution, for internal use)
 */
export async function createFlow(
  receiver: string,
  signer: ethers.Signer,
  chainId: number,
  flowRate: string = MONTHLY_FLOW_RATE,
  skipValidations: boolean = false
) {
  try {
    const sender = await signer.getAddress();

    // Validaciones
    if (!skipValidations) {
      // 1. Validar que sender y receiver sean diferentes
      validateDifferentAddresses(sender, receiver);

      // 2. Validar flow rate está dentro de los límites
      validateFlowRate(flowRate);

      // 3. Validar que haya suficiente balance para el depósito
      await validateSufficientDeposit(
        sender,
        flowRate,
        signer.provider!,
        chainId,
        true // usar depósito recomendado (8 horas)
      );
    }

    // Crear el flow
    const sf = await createSuperfluidFramework(signer.provider!, chainId);
    const euroXToken = await sf.loadSuperToken(euroXAddress);

    const createFlowOperation = euroXToken.createFlow({
      sender,
      receiver,
      flowRate,
    });

    const tx = await createFlowOperation.exec(signer);
    await tx.wait();

    return { success: true, txHash: tx.hash };
  } catch (error) {
    // Si el error ya es de validación, mantenerlo
    if (error instanceof SuperfluidAppError && error.type === ErrorType.VALIDATION_ERROR) {
      throw error;
    }
    const appError = createAppError(error, 'crear stream', 'superfluid');
    logError(appError, 'createFlow');
    throw appError;
  }
}

/**
 * Update (modify) an existing Superfluid stream flow rate
 * @param receiver Recipient address
 * @param newFlowRate New flow rate in wei/second
 * @param signer Ethers signer
 * @param chainId Current chain ID
 * @param skipValidations Skip validations (use with caution, for internal use)
 */
export async function updateFlow(
  receiver: string,
  newFlowRate: string,
  signer: ethers.Signer,
  chainId: number,
  skipValidations: boolean = false
) {
  try {
    const sender = await signer.getAddress();

    // Validaciones
    if (!skipValidations) {
      // 1. Validar que sender y receiver sean diferentes
      validateDifferentAddresses(sender, receiver);

      // 2. Validar flow rate está dentro de los límites
      validateFlowRate(newFlowRate);

      // 3. Verificar que el flow existe
      const existingFlow = await getFlow(sender, receiver, signer.provider!, chainId);
      if (!existingFlow || existingFlow.flowRate === '0') {
        throw new SuperfluidAppError(
          ErrorType.FLOW_ERROR,
          'No existe un flow activo para actualizar',
          'No hay un stream activo para este destinatario. Crea uno nuevo primero.',
          true,
          ['Crea un nuevo stream usando "Agregar Destinatario"'],
        );
      }

      // 4. Si el nuevo flow rate es mayor, validar depósito adicional
      const currentFlowRateBN = ethers.BigNumber.from(existingFlow.flowRate);
      const newFlowRateBN = ethers.BigNumber.from(newFlowRate);
      
      if (newFlowRateBN.gt(currentFlowRateBN)) {
        // El flow rate aumenta, necesitamos más depósito
        const flowRateIncrease = newFlowRateBN.sub(currentFlowRateBN);
        await validateSufficientDeposit(
          sender,
          flowRateIncrease.toString(),
          signer.provider!,
          chainId,
          true
        );
      }
    }

    // Actualizar el flow
    const sf = await createSuperfluidFramework(signer.provider!, chainId);
    const euroXToken = await sf.loadSuperToken(euroXAddress);

    const updateFlowOperation = euroXToken.updateFlow({
      sender,
      receiver,
      flowRate: newFlowRate,
    });

    const tx = await updateFlowOperation.exec(signer);
    await tx.wait();

    return { success: true, txHash: tx.hash };
  } catch (error) {
    // Si el error ya es de validación o es un AppError, mantenerlo
    if (error instanceof SuperfluidAppError) {
      throw error;
    }
    const appError = createAppError(error, 'actualizar stream', 'superfluid');
    logError(appError, 'updateFlow');
    throw appError;
  }
}

/**
 * Delete (stop) a Superfluid stream
 * @param receiver Recipient address
 * @param signer Ethers signer
 * @param chainId Current chain ID
 */
export async function deleteFlow(
  receiver: string,
  signer: ethers.Signer,
  chainId: number
) {
  try {
    const sf = await createSuperfluidFramework(signer.provider!, chainId);
    const euroXToken = await sf.loadSuperToken(euroXAddress);

    const deleteFlowOperation = euroXToken.deleteFlow({
      sender: await signer.getAddress(),
      receiver,
    });

    const tx = await deleteFlowOperation.exec(signer);
    await tx.wait();

    return { success: true, txHash: tx.hash };
  } catch (error) {
    const appError = createAppError(error, 'eliminar stream', 'superfluid');
    logError(appError, 'deleteFlow');
    throw appError;
  }
}

/**
 * Get flow information for a specific receiver
 * @param sender Sender address
 * @param receiver Receiver address
 * @param provider Ethers provider
 * @param chainId Current chain ID
 */
export async function getFlow(
  sender: string,
  receiver: string,
  provider: ethers.providers.Provider,
  chainId: number
) {
  try {
    const sf = await createSuperfluidFramework(provider, chainId);
    const euroXToken = await sf.loadSuperToken(euroXAddress);

    const flow = await euroXToken.getFlow({
      sender,
      receiver,
      providerOrSigner: provider,
    });

    return flow;
  } catch (error) {
    // Para getFlow, no lanzar error, retornar null o objeto vacío
    // ya que es una operación de lectura
    console.warn('Error getting flow (no crítico):', error);
    return {
      flowRate: '0',
      timestamp: '0',
      deposit: '0',
      owedDeposit: '0',
    };
  }
}

/**
 * Get real-time balance of an account
 * @param account Account address
 * @param provider Ethers provider
 * @param chainId Current chain ID
 */
export async function getRealtimeBalance(
  account: string,
  provider: ethers.providers.Provider,
  chainId: number
) {
  try {
    const sf = await createSuperfluidFramework(provider, chainId);
    const euroXToken = await sf.loadSuperToken(euroXAddress);

    const balance = await euroXToken.realtimeBalanceOf({
      account,
      providerOrSigner: provider,
    });

    return balance;
  } catch (error) {
    // Para getRealtimeBalance, retornar balance cero en caso de error
    // ya que es una operación de lectura no crítica
    console.warn('Error getting realtime balance (no crítico):', error);
    return {
      availableBalance: '0',
      deposit: '0',
      owedDeposit: '0',
      timestamp: Date.now(),
    };
  }
}

/**
 * Calculate monthly amount from flow rate
 * @param flowRate Flow rate in wei/second
 */
export function flowRateToMonthly(flowRate: string): string {
  const secondsInMonth = 30 * 24 * 60 * 60;
  const monthly = ethers.BigNumber.from(flowRate).mul(secondsInMonth);
  return ethers.utils.formatEther(monthly);
}

/**
 * Calculate flow rate from monthly amount
 * @param monthlyAmount Monthly amount in EUR
 */
export function monthlyToFlowRate(monthlyAmount: string): string {
  const secondsInMonth = 30 * 24 * 60 * 60;
  const amountWei = ethers.utils.parseEther(monthlyAmount);
  const flowRate = amountWei.div(secondsInMonth);
  return flowRate.toString();
}

/**
 * Validate flow rate is within acceptable limits
 * @param flowRate Flow rate in wei/second
 * @throws Error if flow rate is invalid
 */
export function validateFlowRate(flowRate: string): void {
  const flowRateBN = ethers.BigNumber.from(flowRate);
  const minFlowRate = ethers.BigNumber.from(MIN_FLOW_RATE_WEI_PER_SEC);
  const maxFlowRate = ethers.BigNumber.from(MAX_FLOW_RATE_WEI_PER_SEC);

  if (flowRateBN.lt(minFlowRate)) {
    const minMonthly = flowRateToMonthly(MIN_FLOW_RATE_WEI_PER_SEC);
    throw new Error(
      `Flow rate demasiado bajo. Mínimo permitido: ${parseFloat(minMonthly).toFixed(2)} EUR/mes`
    );
  }

  if (flowRateBN.gt(maxFlowRate)) {
    const maxMonthly = flowRateToMonthly(MAX_FLOW_RATE_WEI_PER_SEC);
    throw new Error(
      `Flow rate demasiado alto. Máximo permitido: ${parseFloat(maxMonthly).toFixed(2)} EUR/mes`
    );
  }

  // Validar que el flow rate no sea cero
  if (flowRateBN.eq(0)) {
    throw new Error('Flow rate no puede ser cero');
  }
}

/**
 * Calculate required deposit for a flow rate
 * @param flowRate Flow rate in wei/second
 * @param hours Number of hours to cover (default: recommended)
 * @returns Required deposit in wei
 */
export function calculateRequiredDeposit(
  flowRate: string,
  hours: number = RECOMMENDED_DEPOSIT_HOURS
): string {
  const flowRateBN = ethers.BigNumber.from(flowRate);
  const secondsInHours = hours * 60 * 60;
  const deposit = flowRateBN.mul(secondsInHours);
  return deposit.toString();
}

/**
 * Validate that sender has sufficient balance for deposit
 * @param senderAddress Sender address
 * @param flowRate Flow rate in wei/second
 * @param provider Ethers provider
 * @param chainId Chain ID
 * @param useRecommendedDeposit Use recommended deposit (8h) instead of minimum (4h)
 * @throws Error if balance is insufficient
 */
export async function validateSufficientDeposit(
  senderAddress: string,
  flowRate: string,
  provider: ethers.providers.Provider,
  chainId: number,
  useRecommendedDeposit: boolean = true
): Promise<void> {
  try {
    // Obtener balance EURx del sender
    const balance = await getRealtimeBalance(senderAddress, provider, chainId);
    const availableBalance = ethers.BigNumber.from(balance.availableBalance || '0');

    // Calcular depósito requerido
    const depositHours = useRecommendedDeposit ? RECOMMENDED_DEPOSIT_HOURS : MIN_DEPOSIT_HOURS;
    const requiredDeposit = ethers.BigNumber.from(
      calculateRequiredDeposit(flowRate, depositHours)
    );

    // Verificar que el balance sea suficiente
    if (availableBalance.lt(requiredDeposit)) {
      const requiredDepositFormatted = ethers.utils.formatEther(requiredDeposit);
      const availableBalanceFormatted = ethers.utils.formatEther(availableBalance);
      const depositType = useRecommendedDeposit ? 'recomendado' : 'mínimo';
      
      throw new Error(
        `Balance insuficiente para crear el stream.\n\n` +
        `Balance disponible: ${parseFloat(availableBalanceFormatted).toFixed(4)} EURx\n` +
        `Depósito ${depositType} requerido (${depositHours}h): ${parseFloat(requiredDepositFormatted).toFixed(4)} EURx\n\n` +
        `Haz upgrade de más EUR a EURx o reduce el flow rate.`
      );
    }
  } catch (error: any) {
    // Si el error ya es un AppError con mensaje descriptivo, relanzarlo
    if (error instanceof SuperfluidAppError) {
      throw error;
    }
    if (error.message && error.message.includes('Balance insuficiente')) {
      throw new SuperfluidAppError(
        ErrorType.BALANCE_ERROR,
        error.message,
        error.message,
        true,
        ['Haz upgrade de más EUR a EURx', 'Reduce el flow rate'],
        error
      );
    }
    // Si es otro error, crear un AppError
    const appError = createAppError(error, 'validar depósito', 'superfluid');
    throw appError;
  }
}

/**
 * Validate that sender and receiver are different addresses
 * @param sender Sender address
 * @param receiver Receiver address
 * @throws Error if addresses are the same
 */
export function validateDifferentAddresses(sender: string, receiver: string): void {
  if (sender.toLowerCase() === receiver.toLowerCase()) {
    throw new Error('No puedes crear un stream a ti mismo. El sender y receiver deben ser diferentes.');
  }
}

