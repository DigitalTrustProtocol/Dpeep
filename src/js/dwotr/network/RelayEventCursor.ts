// Original source: https://github.com/coracle-social/coracle/blob/master/src/engine/util/Cursor.ts

import { Event } from 'nostr-tools';

import { mergeRight } from 'ramda';
import { seconds, first } from 'hurdak';
import { getNostrTime } from '../Utils';
import { FeedOptions } from './WOTPubSub';
import { EPOCH } from '../Utils/Nostr';
import relaySubscription from './RelaySubscription';
import { ICursor } from './ICursor';


export class RelayEventCursor implements ICursor {
  limit = 50;

  //  An event matches a filter if since <= created_at <= until holds.
  until = getNostrTime();
  delta = seconds(60, 'minute');
  since = this.until - this.delta;

  loading = false;
  done = false;

  timeout = 3000;

  subscribeOptions: FeedOptions;

  buffer: Event[] = [];

  constructor(opts: FeedOptions, size = 50) {
    this.subscribeOptions = opts;
    this.limit = size;
  }

  hasMore(): boolean {
    return this.buffer.length > 0;
  }



  async load(): Promise<number> {
    // If we're already loading, or we have enough buffered, do nothing
    if (this.done) {
      return 0;
    }

    const { limit, since, until } = this;
    const { filter, onEvent, onClose, onDone } = this.subscribeOptions;

    let options = {
      filter: { ...filter,  until, limit, since },
      onEvent: (event: Event, afterEose: boolean, relayUrl: string) => {
        this.until = Math.min(until, event.created_at) - 1;
        
        // The event has been added to eventHandler memory, but not yet to the buffer
        if(this.subscribeOptions.filterFn?.(event) === false) return; // Filter out events that don't match the filterFn, undefined means match

        this.buffer.push(event);
        onEvent?.(event, afterEose, relayUrl);
      },
      maxDelayms: 0,
      onClose: () => {
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

        //console.log('Closed Sub Relay: ', relayUrl, afterEose, new Date(event.created_at * 1000).toLocaleString());
        //console.log('Relay Feed closed, events loaded', this.buffer.length, 'done', this.done, 'Since: ', new Date(this.since * 1000).toLocaleString(), 'Until: ', this.until ? new Date(this.until * 1000).toLocaleString() : 'undefined');
      },
    } as FeedOptions;

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

}
