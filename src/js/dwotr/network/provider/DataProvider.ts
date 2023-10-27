import { UID } from '@/utils/UniqueIds';
import { Cursor, DataProviderEvents, ProviderStatus } from '.';
import { FeedOption } from '../WOTPubSub';
import { EventContainer } from '@/dwotr/model/ContainerTypes';
import embedLoader from '../embed/EmbedLoader';

export class DataProvider {
  private cursor: Cursor<EventContainer>;
  private status: ProviderStatus = 'idle';
  private listeners?: DataProviderEvents<EventContainer>;
  private options: FeedOption;

  id: string = 'default';
  logging = false;

  batchSize = 10;

  seen: Set<UID> = new Set<UID>();
  buffer: Array<EventContainer> = [];

  constructor(opt: FeedOption, listeners?: DataProviderEvents<EventContainer>, batchSize = 15) {
    this.listeners = listeners;

    this.options = opt;
    this.id = opt.id!;

    this.cursor = new opt.cursor(this.options);

    this.batchSize = batchSize;
  }

  private setStatus(status: ProviderStatus) {
    this.status = status;
    this.listeners?.onStatusChanged?.(status);
  }

  private setError(error: any) {
    this.setStatus('error');
    this.listeners?.onError?.(error);
  }

  getStatus(): ProviderStatus {
    return this.status;
  }

  isDone(): boolean {
    return this.cursor.isDone();
  }

  hasNew(): boolean {
    return this.cursor.hasNew();
  }

  getBuffer(): EventContainer[] {
    return this.buffer;
  }

  reset() {
    this.cursor.reset();
    this.buffer = [];
    this.seen = new Set<UID>();
    this.setStatus('idle');
  }

  mount() {
    this.cursor.mount();
  }

  unmount() {
    this.cursor.unmount();
  }

  // No resove, just load
  preLoad() {
    let items = this.cursor.preLoad();
    let preItems: EventContainer[] = [];
    for (let item of items) {
      if (this.seen.has(item.id)) continue;
      this.seen.add(item.id);
      preItems.push(item);
    }
    this.buffer = [...preItems, ...this.buffer];
    this.listeners?.onDataLoaded?.(preItems);
  }

  // Get the next batch of data into the buffer at the end
  async nextPage(): Promise<EventContainer[]> {
    this.setStatus('loading'); // Set status to loading because of async method

    try {
      const items = await this.fetchItems();

      // Failsafe in async senario
      if (this.status != 'loading') return []; // If the status has changed, then exit and return empty array

      // If there are no new items, then don't do anything
      if (items.length == 0) return [];

      this.buffer = this.buffer.concat(items); // Add the new items to the buffer, creating a new array
      this.listeners?.onDataLoaded?.(items);

      let events = items.map((item) => item.event!);
      await embedLoader.resolve(events);

      this.setStatus('idle');
      return items;
    } catch (error) {
      this.setError(error);
    }
    return [];
  }

  async fetchItems(): Promise<EventContainer[]> {
    let items: EventContainer[] = [];

    while (items.length < this.batchSize) {
      //if (!this.hasNext()) break;

      const data = await this.cursor.next();
      if (!data) break;

      if (this.seen.has(data.id)) continue;
      this.seen.add(data.id);
      items.push(data);
    }

    return items;
  }

  // Statics
  static providers: Map<string, DataProvider> = new Map<string, DataProvider>();

  static getProvider(
    opt: FeedOption,
    listeners?: DataProviderEvents<EventContainer>,
    batchSize = 15,
  ): DataProvider | undefined {
    let provider = DataProvider.providers.get(opt.id!);
    if (!provider) {
      provider = new DataProvider(opt, listeners, batchSize);
      this.providers.set(opt.id!, provider);
    }
    return provider;
  }
}

/*

1. Gets data from cursor into buffer
2. Get more data into buffer
3. New data is available from cursor.
3.1. Reset cursor.
3.2. Reset buffer.
3.3. Get data from cursor into buffer.

*/
