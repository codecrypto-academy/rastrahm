/**
 * Utilidades para el manejo de temas
 */
export class ThemeUtils {
  private static readonly THEME_KEY = 'codecrypto_theme';
  private static readonly DEFAULT_THEME = 'light';

  /**
   * Obtiene el tema actual
   */
  static getCurrentTheme(): 'light' | 'dark' {
    try {
      const stored = localStorage.getItem(this.THEME_KEY);
      return (stored as 'light' | 'dark') || this.DEFAULT_THEME;
    } catch (error) {
      console.error('Error al obtener tema:', error);
      return this.DEFAULT_THEME;
    }
  }

  /**
   * Establece el tema
   */
  static setTheme(theme: 'light' | 'dark'): void {
    try {
      localStorage.setItem(this.THEME_KEY, theme);
      this.applyTheme(theme);
    } catch (error) {
      console.error('Error al establecer tema:', error);
    }
  }

  /**
   * Aplica el tema al documento
   */
  static applyTheme(theme: 'light' | 'dark'): void {
    try {
      const root = document.documentElement;
      
      // Remover clases de tema anteriores
      root.classList.remove('theme-light', 'theme-dark');
      
      // Agregar nueva clase de tema
      root.classList.add(`theme-${theme}`);
      
      // Establecer atributo data-theme
      root.setAttribute('data-theme', theme);
      
      // Actualizar meta theme-color
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', theme === 'dark' ? '#1a1a1a' : '#ffffff');
      }
    } catch (error) {
      console.error('Error al aplicar tema:', error);
    }
  }

  /**
   * Alterna entre tema claro y oscuro
   */
  static toggleTheme(): 'light' | 'dark' {
    const currentTheme = this.getCurrentTheme();
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
    return newTheme;
  }

  /**
   * Inicializa el tema al cargar la página
   */
  static initializeTheme(): void {
    const theme = this.getCurrentTheme();
    this.applyTheme(theme);
  }

  /**
   * Obtiene las variables CSS del tema
   */
  static getThemeVariables(theme: 'light' | 'dark'): { [key: string]: string } {
    const themes = {
      light: {
        '--bg-primary': '#ffffff',
        '--bg-secondary': '#f8f9fa',
        '--bg-tertiary': '#e9ecef',
        '--text-primary': '#333333',
        '--text-secondary': '#6c757d',
        '--text-muted': '#adb5bd',
        '--border-color': '#dee2e6',
        '--border-light': '#f1f3f4',
        '--shadow': 'rgba(0, 0, 0, 0.1)',
        '--shadow-hover': 'rgba(0, 0, 0, 0.15)',
        '--accent-primary': '#007BFF',
        '--accent-secondary': '#0056CC',
        '--success': '#28a745',
        '--warning': '#ffc107',
        '--error': '#dc3545',
        '--info': '#17a2b8'
      },
      dark: {
        '--bg-primary': '#1a1a1a',
        '--bg-secondary': '#2d2d2d',
        '--bg-tertiary': '#404040',
        '--text-primary': '#ffffff',
        '--text-secondary': '#b3b3b3',
        '--text-muted': '#808080',
        '--border-color': '#404040',
        '--border-light': '#2d2d2d',
        '--shadow': 'rgba(0, 0, 0, 0.3)',
        '--shadow-hover': 'rgba(0, 0, 0, 0.4)',
        '--accent-primary': '#4dabf7',
        '--accent-secondary': '#339af0',
        '--success': '#51cf66',
        '--warning': '#ffd43b',
        '--error': '#ff6b6b',
        '--info': '#74c0fc'
      }
    };

    return themes[theme];
  }

  /**
   * Aplica las variables CSS del tema
   */
  static applyThemeVariables(theme: 'light' | 'dark'): void {
    try {
      const variables = this.getThemeVariables(theme);
      const root = document.documentElement;
      
      Object.entries(variables).forEach(([property, value]) => {
        root.style.setProperty(property, value);
      });
    } catch (error) {
      console.error('Error al aplicar variables del tema:', error);
    }
  }

  /**
   * Detecta la preferencia del sistema
   */
  static getSystemTheme(): 'light' | 'dark' {
    try {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
      return 'light';
    } catch (error) {
      return 'light';
    }
  }

  /**
   * Establece el tema basado en la preferencia del sistema
   */
  static setSystemTheme(): void {
    const systemTheme = this.getSystemTheme();
    this.setTheme(systemTheme);
  }

  /**
   * Escucha cambios en la preferencia del sistema
   */
  static watchSystemTheme(callback: (theme: 'light' | 'dark') => void): () => void {
    try {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleChange = (e: MediaQueryListEvent) => {
        const theme = e.matches ? 'dark' : 'light';
        callback(theme);
      };
      
      mediaQuery.addEventListener('change', handleChange);
      
      // Retornar función para remover el listener
      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    } catch (error) {
      console.error('Error al escuchar cambios del sistema:', error);
      return () => {};
    }
  }

  /**
   * Obtiene el contraste de un color
   */
  static getContrast(color: string): 'light' | 'dark' {
    try {
      // Convertir hex a RGB
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      
      // Calcular luminancia
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      
      return luminance > 0.5 ? 'dark' : 'light';
    } catch (error) {
      return 'light';
    }
  }

  /**
   * Genera un color complementario
   */
  static getComplementaryColor(color: string): string {
    try {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      
      const compR = 255 - r;
      const compG = 255 - g;
      const compB = 255 - b;
      
      return `#${compR.toString(16).padStart(2, '0')}${compG.toString(16).padStart(2, '0')}${compB.toString(16).padStart(2, '0')}`;
    } catch (error) {
      return color;
    }
  }

  /**
   * Obtiene el tema recomendado basado en la hora
   */
  static getTimeBasedTheme(): 'light' | 'dark' {
    try {
      const hour = new Date().getHours();
      return hour >= 18 || hour <= 6 ? 'dark' : 'light';
    } catch (error) {
      return 'light';
    }
  }

  /**
   * Establece el tema basado en la hora
   */
  static setTimeBasedTheme(): void {
    const timeTheme = this.getTimeBasedTheme();
    this.setTheme(timeTheme);
  }

  /**
   * Obtiene información del tema actual
   */
  static getThemeInfo(): {
    current: 'light' | 'dark';
    system: 'light' | 'dark';
    timeBased: 'light' | 'dark';
    isSystem: boolean;
    isTimeBased: boolean;
  } {
    const current = this.getCurrentTheme();
    const system = this.getSystemTheme();
    const timeBased = this.getTimeBasedTheme();
    
    return {
      current,
      system,
      timeBased,
      isSystem: current === system,
      isTimeBased: current === timeBased
    };
  }
}
