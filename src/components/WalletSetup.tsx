import React, { useState } from 'react';
import { useWallet } from './WalletProvider';
import { ValidationUtils } from '../utils/validation';

interface WalletSetupProps {
  onComplete: () => void;
}

export const WalletSetup: React.FC<WalletSetupProps> = ({ onComplete }) => {
  const { generateWallet, importWallet, error, setError } = useWallet();
  const [step, setStep] = useState<'choose' | 'generate' | 'import' | 'complete'>('choose');
  const [mnemonic, setMnemonic] = useState('');
  const [importMnemonic, setImportMnemonic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);

  const handleGenerateWallet = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await generateWallet();
      setMnemonic(result.mnemonic);
      setStep('generate');
    } catch (error) {
      console.error('Error al generar wallet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportWallet = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Validar mnemonic
      const validation = ValidationUtils.validateMnemonic(importMnemonic);
      if (!validation.isValid) {
        setError(validation.errors.join(', '));
        return;
      }
      
      await importWallet(importMnemonic);
      setStep('complete');
    } catch (error) {
      console.error('Error al importar wallet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    onComplete();
  };

  const copyMnemonic = () => {
    navigator.clipboard.writeText(mnemonic);
  };

  if (step === 'choose') {
    return (
      <div className="wallet-setup">
        <div className="setup-header">
          <h2>Bienvenido a CodeCrypto Wallet</h2>
          <p>Configura tu wallet para comenzar</p>
        </div>
        
        <div className="setup-options">
          <button 
            className="setup-option primary"
            onClick={handleGenerateWallet}
            disabled={isLoading}
          >
            <div className="option-icon">🆕</div>
            <div className="option-content">
              <h3>Crear Nuevo Wallet</h3>
              <p>Genera un nuevo wallet con frase mnemónica</p>
            </div>
          </button>
          
          <button 
            className="setup-option secondary"
            onClick={() => setStep('import')}
            disabled={isLoading}
          >
            <div className="option-icon">📥</div>
            <div className="option-content">
              <h3>Importar Wallet</h3>
              <p>Importa un wallet existente con frase mnemónica</p>
            </div>
          </button>
        </div>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
      </div>
    );
  }

  if (step === 'generate') {
    return (
      <div className="wallet-setup">
        <div className="setup-header">
          <h2>Wallet Generado</h2>
          <p>Guarda tu frase mnemónica de forma segura</p>
        </div>
        
        <div className="mnemonic-container">
          <div className="mnemonic-label">
            <span>Frase Mnemónica (12 palabras)</span>
            <button 
              className="toggle-visibility"
              onClick={() => setShowMnemonic(!showMnemonic)}
            >
              {showMnemonic ? '👁️' : '🙈'}
            </button>
          </div>
          
          <div className={`mnemonic-words ${showMnemonic ? 'visible' : 'hidden'}`}>
            {mnemonic.split(' ').map((word, index) => (
              <div key={index} className="mnemonic-word">
                <span className="word-number">{index + 1}</span>
                <span className="word-text">{word}</span>
              </div>
            ))}
          </div>
          
          <button 
            className="copy-button"
            onClick={copyMnemonic}
          >
            📋 Copiar Frase
          </button>
        </div>
        
        <div className="warning-box">
          <div className="warning-icon">⚠️</div>
          <div className="warning-content">
            <h4>Importante</h4>
            <ul>
              <li>Guarda esta frase en un lugar seguro</li>
              <li>Nunca la compartas con nadie</li>
              <li>Sin esta frase no podrás recuperar tu wallet</li>
            </ul>
          </div>
        </div>
        
        <button 
          className="continue-button"
          onClick={() => setStep('complete')}
        >
          Continuar
        </button>
      </div>
    );
  }

  if (step === 'import') {
    return (
      <div className="wallet-setup">
        <div className="setup-header">
          <h2>Importar Wallet</h2>
          <p>Ingresa tu frase mnemónica de 12 palabras</p>
        </div>
        
        <div className="import-form">
          <label htmlFor="mnemonic">Frase Mnemónica</label>
          <textarea
            id="mnemonic"
            value={importMnemonic}
            onChange={(e) => setImportMnemonic(e.target.value)}
            placeholder="palabra1 palabra2 palabra3 ..."
            rows={3}
            className="mnemonic-input"
          />
          
          <button 
            className="import-button"
            onClick={handleImportWallet}
            disabled={isLoading || !importMnemonic.trim()}
          >
            {isLoading ? 'Importando...' : 'Importar Wallet'}
          </button>
        </div>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        <button 
          className="back-button"
          onClick={() => setStep('choose')}
        >
          ← Volver
        </button>
      </div>
    );
  }

  if (step === 'complete') {
    return (
      <div className="wallet-setup">
        <div className="setup-header">
          <h2>¡Wallet Configurado!</h2>
          <p>Tu wallet está listo para usar</p>
        </div>
        
        <div className="success-icon">✅</div>
        
        <div className="setup-info">
          <h3>Próximos pasos:</h3>
          <ul>
            <li>Tu wallet está conectado a Anvil (localhost:8545)</li>
            <li>Se han generado 5 cuentas de prueba</li>
            <li>Puedes cambiar de cuenta en el menú</li>
            <li>Puedes agregar nuevas redes</li>
          </ul>
        </div>
        
        <button 
          className="complete-button"
          onClick={handleComplete}
        >
          Comenzar a Usar
        </button>
      </div>
    );
  }

  return null;
};
