// This class handles callbacks for events that are dispatched from the server.

import { UID } from '@/utils/UniqueIds';

// Its uses a counter for each callback and a key to identify the same group of callbacks.
export default class Subscriptions {
  callbacks = new Map<UID, Map<number, any>>();
  unsubscribe = new Map<UID, any>();

  counter = 0;

  has(key: UID) {
    return this.callbacks.has(key);
  }

  // Add a callback to the list of callbacks for the given key.
  add(key: UID, callback: any) {
    if (!this.callbacks.has(key)) {
      this.callbacks.set(key, new Map<number, any>());
    }

    let index = this.counter++;
    let map = this.callbacks.get(key)!;
    map.set(index, callback);
    return index;
  }

  hasUnsubscribe(key: UID) {
    return this.unsubscribe.has(key);
  }

  addUnsubscribe(key: UID, callback: any) {
    if (!this.unsubscribe.has(key)) {
      this.unsubscribe.set(key, callback);
    }
  }

  removeUnsubscribe(key: UID) {
    if (!this.unsubscribe.has(key)) return;

    let callback = this.unsubscribe.get(key)!;
    callback();
    this.unsubscribe.delete(key);
  }

  // Remove a callback from the list of callbacks for the given key.
  remove(key: UID, index: number) {
    if (!this.callbacks.has(key)) return;

    let map = this.callbacks.get(key)!;
    map.delete(index);
    if (map.size == 0) {
      this.callbacks.delete(key);
      this.removeUnsubscribe(key);
    }
  }

  // Dispatch an event to all callbacks for the given key.
  dispatch(key: UID, event: any) {
    if (!this.callbacks.has(key)) return;

    let map = this.callbacks.get(key)!;
    map.forEach((callback) => {
      callback(event);
    });
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
