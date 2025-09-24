// Enhanced logging utility with timestamps for better debugging
export class Logger {
  private static getTimestamp(): string {
    return new Date().toISOString();
  }

  private static formatMessage(level: string, message: string, context?: string): string {
    const timestamp = this.getTimestamp();
    const contextStr = context ? ` [${context}]` : '';
    return `[${timestamp}] ${level}${contextStr}: ${message}`;
  }

  static info(message: string, context?: string): void {
    console.log(Logger.formatMessage('INFO', message, context));
  }

  static warn(message: string, context?: string): void {
    console.warn(Logger.formatMessage('WARN', message, context));
  }

  static error(message: string, error?: any, context?: string): void {
    const errorStr = error ? ` - ${error instanceof Error ? error.message : String(error)}` : '';
    console.error(Logger.formatMessage('ERROR', message + errorStr, context));
    if (error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }

  static debug(message: string, data?: any, context?: string): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(Logger.formatMessage('DEBUG', message, context));
      if (data !== undefined) {
        console.debug('Data:', data);
      }
    }
  }

  static success(message: string, context?: string): void {
    console.log(Logger.formatMessage('✅ SUCCESS', message, context));
  }

  static performance(message: string, duration?: number, context?: string): void {
    const durationStr = duration ? ` (${duration}ms)` : '';
    console.log(Logger.formatMessage('⏱️ PERF', message + durationStr, context));
  }

  static apiCall(method: string, url: string, status?: number, duration?: number): void {
    const statusStr = status ? ` [${status}]` : '';
    const durationStr = duration ? ` (${duration}ms)` : '';
    console.log(Logger.formatMessage('🌐 API', `${method} ${url}${statusStr}${durationStr}`));
  }

  static cache(operation: string, key: string, hit: boolean = false): void {
    const hitStr = hit ? '🎯 HIT' : '❌ MISS';
    console.log(Logger.formatMessage('💾 CACHE', `${hitStr} - ${operation} - ${key}`));
  }

  static market(message: string, symbol?: string): void {
    const symbolStr = symbol ? ` [${symbol}]` : '';
    console.log(Logger.formatMessage('📈 MARKET', message + symbolStr));
  }

  static portfolio(message: string, portfolioId?: string): void {
    const portfolioStr = portfolioId ? ` [${portfolioId}]` : '';
    console.log(Logger.formatMessage('💼 PORTFOLIO', message + portfolioStr));
  }
}

// Convenience exports
export const log = Logger.info;
export const logError = Logger.error;
export const logWarn = Logger.warn;
export const logDebug = Logger.debug;
export const logSuccess = Logger.success;
export const logPerf = Logger.performance;
export const logApi = Logger.apiCall;
export const logCache = Logger.cache;
export const logMarket = Logger.market;
export const logPortfolio = Logger.portfolio;