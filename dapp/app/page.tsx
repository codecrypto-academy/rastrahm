import WalletConnection from './components/WalletConnection';
import DocumentSigner from './components/DocumentSigner';
import DocumentVerifier from './components/DocumentVerifier';
import SignatureHistory from './components/SignatureHistory';
import Tabs from './components/Tabs';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-indigo-950 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300">
            📄 Document Signer
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 transition-colors duration-300">
            Sistema descentralizado para firmar y verificar documentos
          </p>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          {/* Wallet Connection Section */}
          <WalletConnection />

          {/* Empty space for balance */}
          <div></div>
        </div>

        {/* Tabs Section */}
        <div className="mt-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 transition-colors duration-300">
            <Tabs
              tabs={[
                {
                  label: 'Firmar',
                  icon: '✍️',
                  children: <DocumentSigner />
                },
                {
                  label: 'Verificar',
                  icon: '🔍',
                  children: <DocumentVerifier />
                },
                {
                  label: 'Historial',
                  icon: '📋',
                  children: <SignatureHistory />
                }
              ]}
            />
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors duration-300">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-2">
            ℹ️ Información importante
          </h3>
          <ul className="text-blue-800 dark:text-blue-300 space-y-1 text-sm">
            <li>• Esta aplicación utiliza un smart contract desplegado en Anvil</li>
            <li>• Puedes usar MetaMask o la wallet simulada de Anvil</li>
            <li>• Asegúrate de que Anvil esté ejecutándose en el puerto 8545</li>
            <li>• Las firmas se almacenan de forma permanente en la blockchain</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
