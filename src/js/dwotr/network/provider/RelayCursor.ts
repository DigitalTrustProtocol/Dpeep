import { Event } from 'nostr-tools';
import { seconds } from 'hurdak';
import { FeedOption } from '../provider';
import { EPOCH } from '../../Utils/Nostr';
import relaySubscription from '../RelaySubscription';
import { EventContainer } from '@/dwotr/model/ContainerTypes';
import { BaseCursor } from './BaseCursor';
import eventManager from '@/dwotr/EventManager';

export class RelayCursor<T extends EventContainer> extends BaseCursor<T> {
  factor = 10;
  limit = 50;
  //  An event matches a filter if since <= created_at <= until holds.
  delta = seconds(10, 'minute');
  timeout = 1000;

  buffer: T[] = [];

  constructor(opts: FeedOption) {
    super(opts);
    this.since = this.until - this.delta;
  }

  reset() {
    super.reset();
    this.buffer = [];
  }

  async next(): Promise<T | undefined> {
    while (true) {
      if (this.done) break;

      if (this.buffer.length) return this.buffer.shift() as T;

      await this.load();
      this.#sort(); // Sort the buffer
    }
    return;
  }

  async load(): Promise<number> {
    // If we're already loading, or we have enough buffered, do nothing
    if (this.done) return 0;

    const { limit, since, until } = this;
    const { filter } = this.options;

    let options = {
      filter: { ...filter, until, limit, since },
      eoseSubTimeout: this.timeout,
    } as FeedOption;

    let events = await relaySubscription.list(options);

    if (!events || events.length == 0) {
      if (this.since <= EPOCH) {
        this.done = true;
        return 0;
      }

      this.until = this.since;
      this.since -= this.delta;

      //let factor = Math.floor(this.limit / this.buffer.length + 1);

      if (this.buffer.length < 10) {
        this.delta *= this.factor;
        if (this.timeout < 3000) this.timeout += 1000; // Increase timeout if we're not getting events
      }
    } else {
      for (let event of events) {
        this.#addEvent(event);

        this.until = Math.min(this.until, event.created_at) - 1;
      }
      this.since = this.until - this.delta;
    }

    return this.buffer.length;
  }

  #addEvent(event: Event) {
    let container = eventManager.getContainerByEvent(event) as T;
    if (!container) return;

    this.buffer.push(container);
  }

  #sort() {
    this.buffer.sort((a, b) => b.event!.created_at - a.event!.created_at);
  }
}
