'use client';

import { ethers } from 'ethers';
import { Recipient } from './Dashboard';

interface StatisticsProps {
  recipients: Recipient[];
  euroBalance: string;
  euroXBalance: string;
  account: string;
}

interface StatisticsData {
  // Streams
  totalStreams: number;
  activeStreams: number;
  pausedStreams: number;
  
  // Flow Rates
  totalFlowRateMonthly: number;
  averageFlowRateMonthly: number;
  minFlowRateMonthly: number;
  maxFlowRateMonthly: number;
  
  // Balances
  totalRecipientsBalanceEURx: number;
  totalRecipientsBalanceEUR: number;
  
  // Tiempo estimado
  estimatedDepletionTime: string | null; // en horas/días
  
  // Distribución
  totalRecipients: number;
}

export default function Statistics({ recipients, euroBalance, euroXBalance, account }: StatisticsProps) {
  // Calcular estadísticas
  const calculateStatistics = (): StatisticsData => {
    const activeRecipients = recipients.filter(r => r.status === 'active');
    const pausedRecipients = recipients.filter(r => r.status === 'paused');
    
    // Streams
    const totalStreams = recipients.length;
    const activeStreams = activeRecipients.length;
    const pausedStreams = pausedRecipients.length;
    
    // Flow Rates
    const flowRates = activeRecipients.map(r => parseFloat(r.flowRate) || 0);
    const totalFlowRateMonthly = flowRates.reduce((sum, rate) => sum + rate, 0);
    const averageFlowRateMonthly = flowRates.length > 0 ? totalFlowRateMonthly / flowRates.length : 0;
    const minFlowRateMonthly = flowRates.length > 0 ? Math.min(...flowRates) : 0;
    const maxFlowRateMonthly = flowRates.length > 0 ? Math.max(...flowRates) : 0;
    
    // Balances de destinatarios
    const totalRecipientsBalanceEURx = recipients.reduce((sum, r) => sum + parseFloat(r.balance || '0'), 0);
    const totalRecipientsBalanceEUR = recipients.reduce((sum, r) => sum + parseFloat(r.euroBalance || '0'), 0);
    
    // Tiempo estimado de agotamiento
    let estimatedDepletionTime: string | null = null;
    if (totalFlowRateMonthly > 0 && parseFloat(euroXBalance) > 0) {
      const balanceEURx = parseFloat(euroXBalance);
      const flowRatePerHour = totalFlowRateMonthly / (30 * 24); // EUR/hora
      const hoursUntilDepletion = balanceEURx / flowRatePerHour;
      
      if (hoursUntilDepletion < 24) {
        estimatedDepletionTime = `${hoursUntilDepletion.toFixed(1)} horas`;
      } else if (hoursUntilDepletion < 720) {
        estimatedDepletionTime = `${(hoursUntilDepletion / 24).toFixed(1)} días`;
      } else {
        estimatedDepletionTime = `${(hoursUntilDepletion / 720).toFixed(1)} meses`;
      }
    }
    
    return {
      totalStreams,
      activeStreams,
      pausedStreams,
      totalFlowRateMonthly,
      averageFlowRateMonthly,
      minFlowRateMonthly,
      maxFlowRateMonthly,
      totalRecipientsBalanceEURx,
      totalRecipientsBalanceEUR,
      estimatedDepletionTime,
      totalRecipients: recipients.length,
    };
  };

  const stats = calculateStatistics();

  // Calcular total enviado (aproximado desde balances de destinatarios)
  // Esto es una aproximación ya que los destinatarios pueden haber hecho downgrade
  const totalSentApprox = stats.totalRecipientsBalanceEURx;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
        📊 Estadísticas
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Streams */}
        <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
          <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">Streams</h3>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-blue-700 dark:text-blue-300">Total:</span>
              <span className="font-semibold text-blue-900 dark:text-blue-100">{stats.totalStreams}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-700 dark:text-green-300">▶️ Activos:</span>
              <span className="font-semibold text-green-900 dark:text-green-100">{stats.activeStreams}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-orange-700 dark:text-orange-300">⏸️ Pausados:</span>
              <span className="font-semibold text-orange-900 dark:text-orange-100">{stats.pausedStreams}</span>
            </div>
          </div>
        </div>

        {/* Flow Rates */}
        <div className="bg-purple-50 dark:bg-purple-900 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
          <h3 className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-2">Flow Rates</h3>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-purple-700 dark:text-purple-300">Total Saliente:</span>
              <span className="font-semibold text-purple-900 dark:text-purple-100">
                {stats.totalFlowRateMonthly.toFixed(2)} EUR/mes
              </span>
            </div>
            {stats.activeStreams > 0 && (
              <>
                <div className="flex justify-between">
                  <span className="text-purple-700 dark:text-purple-300">Promedio:</span>
                  <span className="font-semibold text-purple-900 dark:text-purple-100">
                    {stats.averageFlowRateMonthly.toFixed(2)} EUR/mes
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-purple-600 dark:text-purple-400">Mín:</span>
                  <span className="text-purple-800 dark:text-purple-200">{stats.minFlowRateMonthly.toFixed(2)}</span>
                  <span className="text-purple-600 dark:text-purple-400">Máx:</span>
                  <span className="text-purple-800 dark:text-purple-200">{stats.maxFlowRateMonthly.toFixed(2)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Balances de Destinatarios */}
        <div className="bg-green-50 dark:bg-green-900 rounded-lg p-4 border border-green-200 dark:border-green-700">
          <h3 className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">Total en Destinatarios</h3>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-green-700 dark:text-green-300">EURx:</span>
              <span className="font-semibold text-green-900 dark:text-green-100">
                {stats.totalRecipientsBalanceEURx.toFixed(4)} EURx
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-700 dark:text-green-300">EUR:</span>
              <span className="font-semibold text-green-900 dark:text-green-100">
                {stats.totalRecipientsBalanceEUR.toFixed(2)} EUR
              </span>
            </div>
            <div className="text-xs text-green-600 dark:text-green-400 mt-2 pt-2 border-t border-green-200 dark:border-green-700">
              💡 Aproximación basada en balances actuales
            </div>
          </div>
        </div>

        {/* Tiempo Estimado */}
        {stats.estimatedDepletionTime && (
          <div className="bg-yellow-50 dark:bg-yellow-900 rounded-lg p-4 border border-yellow-200 dark:border-yellow-700">
            <h3 className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-2">⏱️ Tiempo Estimado</h3>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-yellow-700 dark:text-yellow-300">Agotamiento:</span>
                <span className="font-semibold text-yellow-900 dark:text-yellow-100">
                  {stats.estimatedDepletionTime}
                </span>
              </div>
              <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                Basado en balance actual y flow rate total
              </div>
            </div>
          </div>
        )}

        {/* Balance Propio */}
        <div className="bg-indigo-50 dark:bg-indigo-900 rounded-lg p-4 border border-indigo-200 dark:border-indigo-700">
          <h3 className="text-sm font-medium text-indigo-900 dark:text-indigo-100 mb-2">Tu Balance</h3>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-indigo-700 dark:text-indigo-300">EUR:</span>
              <span className="font-semibold text-indigo-900 dark:text-indigo-100">
                {parseFloat(euroBalance).toFixed(2)} EUR
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-indigo-700 dark:text-indigo-300">EURx:</span>
              <span className="font-semibold text-indigo-900 dark:text-indigo-100">
                {parseFloat(euroXBalance).toFixed(4)} EURx
              </span>
            </div>
          </div>
        </div>

        {/* Resumen General */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Resumen</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Destinatarios:</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{stats.totalRecipients}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Streams Activos:</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{stats.activeStreams}</span>
            </div>
            {stats.totalFlowRateMonthly > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Total/Mes:</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {stats.totalFlowRateMonthly.toFixed(2)} EUR
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Información Adicional */}
      {stats.activeStreams > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600 dark:text-gray-300 mb-1">
                <span className="font-medium">Flujo por hora:</span>{' '}
                <span className="text-gray-900 dark:text-gray-100">
                  {(stats.totalFlowRateMonthly / (30 * 24)).toFixed(4)} EUR/hora
                </span>
              </p>
              <p className="text-gray-600 dark:text-gray-300 mb-1">
                <span className="font-medium">Flujo por día:</span>{' '}
                <span className="text-gray-900 dark:text-gray-100">
                  {(stats.totalFlowRateMonthly / 30).toFixed(2)} EUR/día
                </span>
              </p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-300 mb-1">
                <span className="font-medium">Flujo por semana:</span>{' '}
                <span className="text-gray-900 dark:text-gray-100">
                  {(stats.totalFlowRateMonthly / 4.33).toFixed(2)} EUR/semana
                </span>
              </p>
              <p className="text-gray-600 dark:text-gray-300 mb-1">
                <span className="font-medium">Flujo por año:</span>{' '}
                <span className="text-gray-900 dark:text-gray-100">
                  {(stats.totalFlowRateMonthly * 12).toFixed(2)} EUR/año
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {stats.activeStreams === 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-center text-gray-500 dark:text-gray-400 text-sm">
            💡 Crea streams activos para ver estadísticas detalladas
          </p>
        </div>
      )}
    </div>
  );
}

