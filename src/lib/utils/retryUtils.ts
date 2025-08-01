import { SEARCH_CONFIG } from '../config/searchConfig';

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  exponentialBackoff?: boolean;
  retryableStatusCodes?: number[];
  retryCondition?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

export interface RetryResult<T> {
  result: T;
  attempts: number;
  totalDuration: number;
  errors: any[];
}

export class RetryError extends Error {
  public attempts: number;
  public errors: any[];
  public totalDuration: number;

  constructor(message: string, attempts: number, errors: any[], totalDuration: number) {
    super(message);
    this.name = 'RetryError';
    this.attempts = attempts;
    this.errors = errors;
    this.totalDuration = totalDuration;
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const {
    maxRetries = SEARCH_CONFIG.RETRY.maxRetries,
    baseDelayMs = SEARCH_CONFIG.RETRY.baseDelayMs,
    maxDelayMs = SEARCH_CONFIG.RETRY.maxDelayMs,
    exponentialBackoff = SEARCH_CONFIG.RETRY.exponentialBackoff,
    retryableStatusCodes = SEARCH_CONFIG.RETRY.retryableStatusCodes,
    retryCondition,
    onRetry,
  } = options;

  const startTime = Date.now();
  const errors: any[] = [];
  let attempts = 0;

  while (attempts <= maxRetries) {
    attempts++;
    
    try {
      const result = await fn();
      return {
        result,
        attempts,
        totalDuration: Date.now() - startTime,
        errors,
      };
    } catch (error) {
      errors.push(error);
      
      // Check if we should retry
      const shouldRetry = attempts <= maxRetries && (
        retryCondition ? retryCondition(error) : isRetryableError(error, retryableStatusCodes)
      );

      if (!shouldRetry) {
        throw new RetryError(
          `Operation failed after ${attempts} attempts: ${error.message}`,
          attempts,
          errors,
          Date.now() - startTime
        );
      }

      // Calculate delay
      let delay = baseDelayMs;
      if (exponentialBackoff) {
        delay = Math.min(baseDelayMs * Math.pow(2, attempts - 1), maxDelayMs);
      }

      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 0.1 * delay;
      delay += jitter;

      // Call retry callback
      if (onRetry) {
        onRetry(attempts, error);
      }

      console.warn(`Attempt ${attempts} failed, retrying in ${delay}ms:`, error.message);
      
      // Wait before retry
      await sleep(delay);
    }
  }

  throw new RetryError(
    `Operation failed after ${attempts} attempts`,
    attempts,
    errors,
    Date.now() - startTime
  );
}

export function isRetryableError(error: any, retryableStatusCodes: number[]): boolean {
  // Network errors
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return true;
  }

  // Timeout errors
  if (error.name === 'AbortError') {
    return true;
  }

  // HTTP status code errors
  if (error.status && retryableStatusCodes.includes(error.status)) {
    return true;
  }

  // Rate limit errors
  if (error.message?.includes('rate limit') || error.message?.includes('too many requests')) {
    return true;
  }

  // Temporary service unavailable
  if (error.message?.includes('service unavailable') || error.message?.includes('temporarily unavailable')) {
    return true;
  }

  return false;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Circuit breaker implementation
export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private failureThreshold: number = 5,
    private recoveryTimeMs: number = 60000, // 1 minute
    private successThreshold: number = 3
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.recoveryTimeMs) {
        this.state = 'HALF_OPEN';
        console.log('Circuit breaker transitioning to HALF_OPEN state');
      } else {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
    }

    try {
      const result = await fn();
      
      if (this.state === 'HALF_OPEN') {
        this.failures = 0;
        this.state = 'CLOSED';
        console.log('Circuit breaker transitioning to CLOSED state');
      }
      
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();

      if (this.failures >= this.failureThreshold) {
        this.state = 'OPEN';
        console.log('Circuit breaker transitioning to OPEN state');
      }

      throw error;
    }
  }

  getState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
    return this.state;
  }

  getStats(): { failures: number; state: string; lastFailureTime: number } {
    return {
      failures: this.failures,
      state: this.state,
      lastFailureTime: this.lastFailureTime,
    };
  }

  reset(): void {
    this.failures = 0;
    this.lastFailureTime = 0;
    this.state = 'CLOSED';
  }
}

// Timeout wrapper
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timer));
  });
}

// Batch retry for multiple operations
export async function batchRetry<T>(
  operations: Array<() => Promise<T>>,
  options: RetryOptions = {}
): Promise<Array<RetryResult<T> | Error>> {
  const results = await Promise.allSettled(
    operations.map(op => withRetry(op, options))
  );

  return results.map(result => 
    result.status === 'fulfilled' ? result.value : result.reason
  );
}