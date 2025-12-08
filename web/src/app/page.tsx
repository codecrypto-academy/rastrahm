import Dashboard from '@/components/Dashboard';
import { validateEnvForUI } from '@/lib/env';

export default function Home() {
  // Validar variables de entorno al cargar la página
  const envValidation = validateEnvForUI();
  
  // Si hay errores críticos, mostrarlos
  if (!envValidation.isValid) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-red-50 dark:bg-red-900 border-2 border-red-200 dark:border-red-700 rounded-lg p-6 max-w-2xl w-full">
          <h1 className="text-2xl font-bold text-red-800 dark:text-red-200 mb-4">
            ⚠️ Error de Configuración
          </h1>
          <div className="bg-white dark:bg-gray-800 rounded p-4 mb-4">
            <pre className="whitespace-pre-wrap text-sm text-red-700 dark:text-red-300 font-mono">
              {envValidation.formattedErrors}
            </pre>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded p-4">
            <h2 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">💡 Cómo solucionarlo:</h2>
            <ol className="list-decimal list-inside text-blue-700 dark:text-blue-300 space-y-1 text-sm">
              <li>Copia el archivo <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">.env.example</code> a <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">.env.local</code></li>
              <li>Edita <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">.env.local</code> y corrige los errores</li>
              <li>Reinicia el servidor de desarrollo: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">npm run dev</code></li>
              <li>Consulta <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">TROUBLESHOOTING.md</code> para más ayuda</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  // Si hay warnings pero no errores, mostrar advertencias importantes (solo en desarrollo)
  // Filtrar warnings sobre variables opcionales con valores por defecto
  const importantWarnings = envValidation.warnings.filter(w => 
    !w.includes('no está configurada. Se usará el valor por defecto')
  );
  const nodeEnv = typeof window === 'undefined' 
    ? process.env.NODE_ENV 
    : (process.env as any).NODE_ENV || 'development';
  if (importantWarnings.length > 0 && nodeEnv === 'development') {
    console.warn('⚠️ Advertencias de configuración:', importantWarnings);
  }

  return <Dashboard />;
}
