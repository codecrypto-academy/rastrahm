/**
 * Content Script para inyectar el provider en páginas web
 */

// Inyectar el script inpage en el contexto de la página
function injectInpageScript(): void {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('inpage.js');
  script.onload = () => {
    script.remove();
  };
  (document.head || document.documentElement).appendChild(script);
}

// Inyectar inmediatamente si el documento ya está listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectInpageScript);
} else {
  injectInpageScript();
}

// Escuchar mensajes del script inpage
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  
  if (event.data.type === 'CODECRYPTO_REQUEST') {
    // Reenviar al background script
    const { id, method, data } = event.data;
    
    chrome.runtime.sendMessage({
      type: method,
      data: data,
      requestId: id
    }, (response) => {
      // Enviar respuesta de vuelta al inpage script
      if (response && response.success) {
        window.postMessage({
          type: 'CODECRYPTO_RESPONSE',
          id: id,
          result: response,
          error: undefined
        }, '*');
      } else {
        window.postMessage({
          type: 'CODECRYPTO_RESPONSE',
          id: id,
          result: undefined,
          error: { message: response?.error || 'Error desconocido' }
        }, '*');
      }
    });
  }
});

// Escuchar respuestas del background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CODECRYPTO_RESPONSE') {
    // Reenviar al script inpage
    window.postMessage(message, '*');
  }
});

export {};
