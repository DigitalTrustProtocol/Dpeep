export function promiseWithTimeout<T>(
    promise: Promise<T>,
    ms: number,
    timeoutError = new Error('Promise timed out')
  ): Promise<T> {
    let timer: NodeJS.Timeout;
  
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(timeoutError);
      }, ms);
    });
  
    return Promise.race<T>([promise, timeout]).finally(() => {
      clearTimeout(timer);
    });
  }
  