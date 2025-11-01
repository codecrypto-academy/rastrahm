/**
 * Utilidades para internacionalización (i18n)
 */
import esTranslations from './i18n/es.json';
import enTranslations from './i18n/en.json';

export class I18nUtils {
  private static readonly LANGUAGE_KEY = 'codecrypto_language';
  private static readonly DEFAULT_LANGUAGE = 'es';
  private static currentLanguage: 'es' | 'en' = this.DEFAULT_LANGUAGE;

  // Traducciones importadas desde JSON (extensibles a futuro)
  private static readonly translations: { es: Record<string, string>; en: Record<string, string> } = {
    es: esTranslations as Record<string, string>,
    en: enTranslations as Record<string, string>
  };

  /**
   * Obtiene el idioma actual
   */
  static getCurrentLanguage(): 'es' | 'en' {
    return this.currentLanguage;
  }

  /**
   * Establece el idioma
   */
  static setLanguage(language: 'es' | 'en'): void {
    try {
      this.currentLanguage = language;
      localStorage.setItem(this.LANGUAGE_KEY, language);
      this.applyLanguage(language);
    } catch (error) {
      console.error('Error al establecer idioma:', error);
    }
  }

  /**
   * Aplica el idioma al documento
   */
  static applyLanguage(language: 'es' | 'en'): void {
    try {
      document.documentElement.setAttribute('lang', language);
      document.documentElement.setAttribute('data-language', language);
    } catch (error) {
      console.error('Error al aplicar idioma:', error);
    }
  }

  /**
   * Inicializa el idioma al cargar la página
   */
  static initializeLanguage(): void {
    try {
      const stored = localStorage.getItem(this.LANGUAGE_KEY);
      const language = (stored as 'es' | 'en') || this.DEFAULT_LANGUAGE;
      this.setLanguage(language);
    } catch (error) {
      console.error('Error al inicializar idioma:', error);
      this.setLanguage(this.DEFAULT_LANGUAGE);
    }
  }

  /**
   * Obtiene una traducción
   */
  static t(key: string, params?: { [key: string]: string | number }): string {
    try {
      const translation = (this.translations[this.currentLanguage] as any)[key] || key;
      
      if (params) {
        return this.interpolate(translation, params);
      }
      
      return translation;
    } catch (error) {
      console.error('Error al obtener traducción:', error);
      return key;
    }
  }

  /**
   * Interpola parámetros en una traducción
   */
  private static interpolate(text: string, params: { [key: string]: string | number }): string {
    try {
      return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return params[key]?.toString() || match;
      });
    } catch (error) {
      return text;
    }
  }

  /**
   * Obtiene todas las traducciones para un idioma
   */
  static getTranslations(language: 'es' | 'en'): { [key: string]: string } {
    return this.translations[language] || {};
  }

  /**
   * Obtiene todas las claves de traducción
   */
  static getTranslationKeys(): string[] {
    return Object.keys(this.translations.es);
  }

  /**
   * Verifica si una clave de traducción existe
   */
  static hasTranslation(key: string, language?: 'es' | 'en'): boolean {
    const lang = language || this.currentLanguage;
    return key in this.translations[lang];
  }

  /**
   * Obtiene el idioma del navegador
   */
  static getBrowserLanguage(): 'es' | 'en' {
    try {
      const browserLang = navigator.language || navigator.languages[0];
      return browserLang.startsWith('es') ? 'es' : 'en';
    } catch (error) {
      return 'en';
    }
  }

  /**
   * Establece el idioma basado en el navegador
   */
  static setBrowserLanguage(): void {
    const browserLang = this.getBrowserLanguage();
    this.setLanguage(browserLang);
  }

  /**
   * Alterna entre idiomas
   */
  static toggleLanguage(): 'es' | 'en' {
    const newLanguage = this.currentLanguage === 'es' ? 'en' : 'es';
    this.setLanguage(newLanguage);
    return newLanguage;
  }

  /**
   * Obtiene información del idioma actual
   */
  static getLanguageInfo(): {
    current: 'es' | 'en';
    browser: 'es' | 'en';
    isBrowser: boolean;
    available: ('es' | 'en')[];
  } {
    return {
      current: this.currentLanguage,
      browser: this.getBrowserLanguage(),
      isBrowser: this.currentLanguage === this.getBrowserLanguage(),
      available: ['es', 'en']
    };
  }

  /**
   * Formatea números según el idioma
   */
  static formatNumber(number: number, options?: Intl.NumberFormatOptions): string {
    try {
      const locale = this.currentLanguage === 'es' ? 'es-ES' : 'en-US';
      return new Intl.NumberFormat(locale, options).format(number);
    } catch (error) {
      return number.toString();
    }
  }

  /**
   * Formatea fechas según el idioma
   */
  static formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
    try {
      const locale = this.currentLanguage === 'es' ? 'es-ES' : 'en-US';
      return new Intl.DateTimeFormat(locale, options).format(date);
    } catch (error) {
      return date.toString();
    }
  }

  /**
   * Formatea monedas según el idioma
   */
  static formatCurrency(amount: number, currency: string = 'USD', options?: Intl.NumberFormatOptions): string {
    try {
      const locale = this.currentLanguage === 'es' ? 'es-ES' : 'en-US';
      return new Intl.NumberFormat(locale, { style: 'currency', currency, ...options }).format(amount);
    } catch (error) {
      return `${amount} ${currency}`;
    }
  }
}
