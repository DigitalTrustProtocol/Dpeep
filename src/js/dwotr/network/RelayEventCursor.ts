// Original source: https://github.com/coracle-social/coracle/blob/master/src/engine/util/Cursor.ts

import { Event } from 'nostr-tools';

import { mergeRight } from 'ramda';
import { seconds, first } from 'hurdak';
import { getNostrTime } from '../Utils';
import { SubscribeOptions } from './WOTPubSub';
import { EPOCH } from '../Utils/Nostr';
import relaySubscription from './RelaySubscription';
import { ICursor } from './ICursor';


export class RelayEventCursor implements ICursor {
  pageSize = 50;

  //  An event matches a filter if since <= created_at <= until holds.
  until = getNostrTime();
  delta = seconds(60, 'minute');
  since = this.until - this.delta;

  loading = false;
  done = false;

  timeout = 3000;

  subscribeOptions: SubscribeOptions;

  buffer: Event[] = [];

  constructor(opts: SubscribeOptions, size = 10) {
    this.subscribeOptions = opts;
    this.pageSize = size;
  }

  hasMore(): boolean {
    return this.buffer.length > 0;
  }



  async load(): Promise<number> {
    const limit = this.pageSize;

    // If we're already loading, or we have enough buffered, do nothing
    if (this.done || this.loading || limit <= 0) {
      return 0;
    }

    const { since, until } = this;
    const { filters, onEvent, onClose, onDone } = this.subscribeOptions;

    this.loading = true;

    let options = {
      filters: filters.map(mergeRight({ until, limit, since })),
      onEvent: (event: Event) => {
        this.until = Math.min(until, event.created_at) - 1;
        this.buffer.push(event);
        onEvent?.(event);
        //console.log('Relay Feed event', this.buffer.length, this.until, this.since);
      },
      maxDelayms: 0,
      onClose: () => {
        this.loading = false;
        // Relays can't be relied upon to return events in descending order, do exponential
        // windowing to ensure we get the most recent stuff on first load, but eventually find it all
        if (this.buffer.length === 0) {
          this.delta *= 5;
        }

        if (this.since <= EPOCH) {
          this.done = true;
        }

        this.since -= this.delta;

        onClose?.();

        if (this.done) onDone?.();

        console.log('Relay Feed closed, events loaded', this.buffer.length, 'done', this.done, 'Since: ', new Date(this.since * 1000).toLocaleString(), 'Until: ', this.until ? new Date(this.until * 1000).toLocaleString() : 'undefined');
      },
    } as SubscribeOptions;

    await relaySubscription.Once(options);


    return this.buffer.length;
  }

  take(n: number): Event[] {
    return this.buffer.splice(0, n) || [];
  }

  count() {
    return this.buffer.length;
  }

  peek() {
    return this.buffer[0];
  }

  pop() {
    return first(this.take(1));
  }

  clone(): ICursor {
    return new RelayEventCursor(this.subscribeOptions, this.pageSize);
  }
}
