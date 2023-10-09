import { IndexableType, Table } from 'dexie';
import { throttle } from 'lodash';

export class BulkStorage<K, T> {
  #table: Table<T>;

  #saveQueue: Map<K, T> = new Map();
  #updateQueue: Map<K, any> = new Map();
  #deleteQueue: Set<K> = new Set();

  #working: boolean = false;

  constructor(table: Table<T>) {
    this.#table = table;
  }

  save(id: K, item: T) {
    this.#saveQueue.set(id, item);
    this.#saveBulk();
  }

  update(key: K, item: any) {
    this.#updateQueue.set(key, item);
    this.#updateBulk();
  }

  delete(key: K) {
    this.#deleteQueue.add(key);
    this.#deleteBulk();
  }

  #saveBulk = throttle(() => {
    if (this.#working) {
      this.#saveBulk(); // try again later
      return;
    }

    this.#working = true;

    const queue = [...this.#saveQueue.values()];
    this.#saveQueue.clear();

    this.#table.bulkPut(queue).finally(() => {
      this.#working = false;
    });
  }, 1000);

  #updateBulk = throttle(async () => {
    if (this.#working) {
      this.#updateBulk(); // try again later
      return;
    }

    this.#working = true;

    const queue = [...this.#updateQueue.entries()]; // create a copy array
    this.#updateQueue.clear();

    try {
      for (const [key, item] of queue) {
        await this.#table.update(key as IndexableType, item);
      }
    } finally {
      this.#working = false;
    }
    this.#working = false;
  }, 1000);

  #deleteBulk = throttle(() => {
    if (this.#working) {
      this.#deleteBulk(); // try again later
      return;
    }

    this.#working = true;

    const queue = [...this.#deleteQueue.values()] as IndexableType[];
    this.#deleteQueue = new Set<K>();

    this.#table.bulkDelete(queue).finally(() => {
      this.#working = false;
    });
  }, 1000);

  get instance() {
    return this.#table;
  }

  async count() {
    return await this.#table.count();
  }

  async toArray() {
    return await this.#table.toArray();
  }
}
