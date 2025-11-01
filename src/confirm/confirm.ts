/**
 * Script para la página de confirmación de firmas
 */

interface ConfirmData {
  type: 'personal_sign' | 'eth_sign' | 'eth_signTypedData_v4';
  account: string;
  message?: string;
  typedData?: any;
  origin: string;
  requestId: string;
}

// Obtener datos de la URL
const urlParams = new URLSearchParams(window.location.search);
const confirmDataStr = urlParams.get('data');

if (!confirmDataStr) {
  console.error('No hay datos de confirmación');
  window.close();
}

let confirmData: ConfirmData | null = null;

try {
  confirmData = JSON.parse(decodeURIComponent(confirmDataStr!));
} catch (error) {
  console.error('Error al parsear datos de confirmación:', error);
  window.close();
}

// Actualizar UI
if (confirmData) {
  // Título según el tipo
  const titleElement = document.getElementById('confirm-title');
  if (titleElement) {
    if (confirmData.type === 'eth_signTypedData_v4') {
      titleElement.textContent = 'Firmar Datos Tipados';
    } else {
      titleElement.textContent = 'Firmar Mensaje';
    }
  }
  
  // Sitio origen
  const siteElement = document.getElementById('confirm-site');
  if (siteElement) {
    siteElement.textContent = confirmData.origin;
  }
  
  // Cuenta
  const accountElement = document.getElementById('confirm-account');
  if (accountElement) {
    accountElement.textContent = confirmData.account;
  }
  
  // Mensaje o datos tipados
  if (confirmData.type === 'eth_signTypedData_v4' && confirmData.typedData) {
    // Mostrar datos tipados
    const messageSection = document.getElementById('message-section');
    const dataSection = document.getElementById('data-section');
    
    if (messageSection) messageSection.style.display = 'none';
    if (dataSection) {
      dataSection.style.display = 'block';
      const dataElement = document.getElementById('confirm-data');
      if (dataElement) {
        dataElement.textContent = JSON.stringify(confirmData.typedData, null, 2);
      }
    }
  } else if (confirmData.message) {
    // Mostrar mensaje
    const messageElement = document.getElementById('confirm-message');
    if (messageElement) {
      // Intentar decodificar el mensaje si es hex
      let displayMessage = confirmData.message;
      if (displayMessage.startsWith('0x')) {
        try {
          const hex = displayMessage.slice(2);
          displayMessage = '';
          for (let i = 0; i < hex.length; i += 2) {
            displayMessage += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
          }
        } catch (e) {
          // Si falla, mostrar el hex original
        }
      }
      messageElement.textContent = displayMessage;
    }
  }
}

// Botón aprobar
const approveButton = document.getElementById('approve-button');
if (approveButton) {
  approveButton.addEventListener('click', () => {
    if (confirmData) {
      // Enviar aprobación al background
      chrome.runtime.sendMessage({
        type: 'CONFIRM_SIGNATURE',
        approved: true,
        requestId: confirmData.requestId
      }, () => {
        window.close();
      });
    }
  });
}

// Botón rechazar
const rejectButton = document.getElementById('reject-button');
if (rejectButton) {
  rejectButton.addEventListener('click', () => {
    if (confirmData) {
      // Enviar rechazo al background
      chrome.runtime.sendMessage({
        type: 'CONFIRM_SIGNATURE',
        approved: false,
        requestId: confirmData.requestId
      }, () => {
        window.close();
      });
    }
  });
}

export {};
