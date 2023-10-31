import { Event } from 'nostr-tools';

import { seconds } from 'hurdak';
import { FeedOption } from '../WOTPubSub';
import { EPOCH } from '../../Utils/Nostr';
import relaySubscription from '../RelaySubscription';
import eventManager from '@/dwotr/EventManager';
import { ID } from '@/utils/UniqueIds';
import { EventContainer } from '@/dwotr/model/ContainerTypes';
import { BaseCursor } from './BaseCursor';


export class RelayCursor<T extends EventContainer> extends BaseCursor<T> {
  
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


  async next(): Promise<T | null> {

    if(this.done) return null;

    if(this.buffer.length)
      return this.buffer.shift() as T;
    
    await this.load(this.timeout);
    this.#sort(); // Sort the buffer

    // Potentially a dead loop if the relay is not returning events and not closing
    return await this.next();
  }


  async load(timeOut: number = 1000): Promise<number> {
    // If we're already loading, or we have enough buffered, do nothing
    if (this.done) {
      return 0;
    }

    const { limit, since, until } = this;
    const { filter } = this.options;

    let options = {
      filter: { ...filter,  until, limit, since },
      onEvent: (event: Event ) => { //afterEose: boolean, relayUrl: string
        
        this.until = Math.min(until, event.created_at) - 1;

        let container = eventManager.getContainerByEvent(event) as T;
        if(!container) return;

        this.buffer.push(container);
      },
      maxDelayms: 0,
      onClose: () => { // subId:number

        // Relays can't be relied upon to return events in descending order, do exponential
        // windowing to ensure we get the most recent stuff on first load, but eventually find it all
        let factor = 10;

        if (this.since <= EPOCH) {
          // We've reached the end of EPOCH, we're done
          this.done = true;

        } else {
          this.since -= this.delta;
          //let factor = Math.floor(this.limit / this.buffer.length + 1);
          if(this.buffer.length < 10) {
            this.delta *= factor;
            if(this.timeout < 3000) 
              this.timeout += 1000; // Increase timeout if we're not getting events
          }
        }
      },
    } as FeedOption;

    await relaySubscription.once(options, timeOut);

    return this.buffer.length;
  }

  #sort() {
    this.buffer.sort((a, b) => b.event!.created_at - a.event!.created_at);
  }

}
