// This class handles callbacks for events that are dispatched from the server.

import { UID } from '@/utils/UniqueIds';

// Its uses a counter for each callback and a key to identify the same group of callbacks.
export default class EventCallbacks {

  static GENERIC_KEY = 0;

  private callbacks = new Map<UID, Set<Function>>();
  
  has(key: UID) {
    return this.callbacks.has(key);
  }

  // Add a callback to the list of callbacks for the given key.
  addListener(key: UID, callback: Function) {
    if (!this.callbacks.has(key)) {
      this.callbacks.set(key, new Set());
    }

    this.callbacks.get(key)!.add(callback);
  }

  addGenericListener(callback: Function) {
    this.addListener(EventCallbacks.GENERIC_KEY, callback);
  }

  // Remove a callback from the list of callbacks for the given key.
  removeListener(key: UID, callback: Function) {
    this.callbacks.get(key)?.delete(callback);
    if (this.callbacks.get(key)?.size === 0) 
      this.callbacks.delete(key);
  }

  removeGenericListener(callback: Function) {
    this.removeListener(EventCallbacks.GENERIC_KEY, callback);
  }


  dispatchAll(value: any | Function) {
    let fn = typeof value === 'function' ? value : (v: any) => value;

    for (const id of this.callbacks.keys()) {
      this.dispatch(id, fn(id));
    }
  }

  // Dispatch an event to all callbacks for the given key.
  dispatch(key: UID, value: any) {

    if(key != EventCallbacks.GENERIC_KEY)
      this.dispatch(EventCallbacks.GENERIC_KEY, value); // Dispatch to generic listeners

    if (!this.callbacks.has(key)) return;

    let list = this.callbacks.get(key)!;
    for (const callback of list) {
      callback(value);
    }
  }

  // Remove all callbacks for the given key.
  clear(key: UID) {
    if (!this.callbacks.has(key)) return;

    let map = this.callbacks.get(key)!;
    map.clear();
    this.callbacks.delete(key);
  }

  // Remove all callbacks.
  clearAll() {
    this.callbacks.clear();
  }

  // Get the number of callbacks for the given key.
  size(key: UID) {
    if (!this.callbacks.has(key)) return 0;

    let map = this.callbacks.get(key)!;
    return map.size;
  }

  // Get the number of callbacks.
  sizeAll() {
    let size = 0;
    this.callbacks.forEach((map) => {
      size += map.size;
    });
    return size;
  }

  // Get the list of keys.
  keys() {
    return this.callbacks.keys();
  }

  // Get the list of callbacks for the given key.
  values(key: UID) {
    if (!this.callbacks.has(key)) return [];

    let map = this.callbacks.get(key)!;
    return map.values();
  }
}
