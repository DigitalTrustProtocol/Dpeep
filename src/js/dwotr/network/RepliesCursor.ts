// Original source: https://github.com/coracle-social/coracle/blob/master/src/engine/util/Cursor.ts

import { Event } from 'nostr-tools';

import { seconds, first } from 'hurdak';
import { getNostrTime } from '../Utils';
import { FeedOptions } from './WOTPubSub';
import relaySubscription from './RelaySubscription';
import { ICursor } from './types';


export class RepliesCursor implements ICursor {
  limit = 100;

  //  An event matches a filter if since <= created_at <= until holds.
  until = 0; // - (60 * 60 * 4); // 4 hours ago
  delta = 0;
  since = 0;

  loading = false;
  done = false;

  feedOptions: FeedOptions;

  buffer: Event[] = [];

  constructor(opts: FeedOptions, size = 100) {
    this.feedOptions = opts;
    this.limit = size;
  }

  async load(timeOut: number = 30000): Promise<number> {
    // If we're already loading, or we have enough buffered, do nothing
    if (this.done) {
      return 0;
    }

    const { filter, onEvent, onClose, onDone } = this.feedOptions;

    let options = {
      filter,
      onEvent: (event: Event, afterEose: boolean, relayUrl: string) => {
        //this.until = Math.max(until, getNostrTime());
        
        // The event has been added to eventHandler memory, but not yet to the buffer
        if(this.feedOptions.filterFn?.(event) === false) return; // Filter out events that don't match the filterFn, undefined means match

        this.buffer.push(event);
        onEvent?.(event, afterEose, relayUrl);
      },
      maxDelayms: 0,
      onClose: (subId:number) => {

        this.done = true;

        onClose?.(subId);
        onDone?.(subId);
      },
    } as FeedOptions;

    console.log('RepliesCursor:load:relaySubscription.options:', options)

    this.loading = true;
    console.time('RepliesCursor:load:relaySubscription.once');
    await relaySubscription.once(options, timeOut);
    console.timeEnd('RepliesCursor:load:relaySubscription.once');
    this.loading = false;

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
