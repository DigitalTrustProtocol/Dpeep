export type ProviderStatus = 'idle' | 'loading' | 'waiting' | 'error';

export interface Cursor<T> {
  isDone(): boolean;
  hasNew(): boolean;
  next(): Promise<T | undefined>;
  reset(): void;
  mount(): void;
  unmount(): void;
  preLoad(): T[];
}

export interface DataProviderEvents<T> {
  //onNewData?: (data: T[]) => void;
  onDataLoaded?: (data: T[]) => void;
  onDataResolved?: (data: T[]) => void;
  onStatusChanged?: (status: ProviderStatus) => void;
  onError?: (error: any) => void;
}
