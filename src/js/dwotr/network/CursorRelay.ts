// Original source: https://github.com/coracle-social/coracle/blob/master/src/engine/util/Cursor.ts

import { Event } from 'nostr-tools';

import { seconds, first } from 'hurdak';
import { getNostrTime } from '../Utils';
import { FeedOptions } from './WOTPubSub';
import { EPOCH } from '../Utils/Nostr';
import relaySubscription from './RelaySubscription';
import { ICursor } from './types';


export class EventCursor implements ICursor {
  limit = 50;

  //  An event matches a filter if since <= created_at <= until holds.
  until = getNostrTime(); // - (60 * 60 * 4); // 4 hours ago
  delta = seconds(10, 'minute');
  since = this.until - this.delta;

  loading = false;
  done = false;

  timeout = 3000;

  feedOptions: FeedOptions;

  buffer: Event[] = [];

  constructor(opts: FeedOptions, size = 50) {
    this.feedOptions = opts;
    this.limit = size;
  }

  hasMore(): boolean {
    return this.buffer.length > 0;
  }



  async load(timeOut: number = 3000): Promise<number> {
    // If we're already loading, or we have enough buffered, do nothing
    if (this.done) {
      return 0;
    }

    const { limit, since, until } = this;
    const { filter, onEvent, onClose, onDone } = this.feedOptions;

    let options = {
      filter: { ...filter,  until, limit, since },
      onEvent: (event: Event, afterEose: boolean, relayUrl: string) => {
        this.until = Math.min(until, event.created_at) - 1;
        
        // The event has been added to eventHandler memory, but not yet to the buffer
        if(this.feedOptions.filterFn?.(event) === false) return; // Filter out events that don't match the filterFn, undefined means match

        this.buffer.push(event);
        onEvent?.(event, afterEose, relayUrl);
      },
      maxDelayms: 0,
      onClose: (subId:number) => {

        // Relays can't be relied upon to return events in descending order, do exponential
        // windowing to ensure we get the most recent stuff on first load, but eventually find it all

        let factor = 10;
        //let factor = Math.floor(this.limit / this.buffer.length + 1);
        if(this.buffer.length < 10) 
          this.delta *= factor;

        if (this.since <= EPOCH) {
          this.done = true;
        }

        this.since -= this.delta;

        onClose?.(subId);

        if (this.done) onDone?.(subId);

        console.log('Closed Sub Relay', ' - SubID:', subId, " - Since:", new Date(this.since * 1000).toLocaleString(), " - Until:", new Date(this.until * 1000).toLocaleString(), " - Limit:", this.limit, " - Delta:", this.delta, " - Factor:", factor, " - Buffer:", this.buffer.length, " - Done:", this.done);
        //console.log('Relay Feed closed, events loaded', this.buffer.length, 'done', this.done, 'Since: ', new Date(this.since * 1000).toLocaleString(), 'Until: ', this.until ? new Date(this.until * 1000).toLocaleString() : 'undefined');
      },
    } as FeedOptions;

    await relaySubscription.Once(options, timeOut);

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
