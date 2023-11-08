// Original source: https://github.com/coracle-social/coracle/blob/master/src/engine/util/Cursor.ts

import { Event } from 'nostr-tools';

import { first } from 'hurdak';
import { FeedOption, ReactionKind } from './provider';
import relaySubscription from './RelaySubscription';
import NotesCursor from './NotesCursor';
import { ID, UID } from '@/utils/UniqueIds';
import replyManager from '../ReplyManager';
import eventManager from '../EventManager';
import { NoteContainer } from '../model/ContainerTypes';
import noteManager from '../NoteManager';
import reactionManager from '../ReactionManager';

export class LikesCursor extends NotesCursor {
  loading: boolean = false;

  constructor(opts: FeedOption, seen?: Set<UID>) {
    super(opts, seen);
    // Load from memory
    this.kinds.add(ReactionKind);

    this.#preLoad();
  }

  #preLoad() {
    // Load from memory
    let reactions = reactionManager.authors.get(this.options.user!);

    for(let reaction of reactions?.values() ?? []) {
      let container = eventManager.getContainer(reaction.subjectEventId);
      if(!container) continue;

      this.preBuffer.push(container?.event!);
    }
  }

  eventHandler(event: Event) {
    let container = eventManager.getContainerByEvent(event) as NoteContainer;

    if (!this.accept(container)) return; // Skip events that don't match the filterFn, undefined means match

    this.buffer.push(event);
  }

  subscribe() {
    noteManager.onEvent.addGenericListener(this.eventHandler.bind(this));
  }

  unsubscribe() {
    noteManager.onEvent.removeGenericListener(this.eventHandler.bind(this));
  }

  async load(timeOut: number = 30000): Promise<number> {
    // If we're already loading, or we have enough buffered, do nothing
    if (this.done) {
      return 0;
    }

    this.buffer = replyManager.getEventReplies(this.options.eventId!);

    //const { filter, onEvent, onClose, onDone } = this.options;

    // let options = {
    //   filter,
    //   onEvent: (event: Event, afterEose: boolean, relayUrl: string) => {
    //     //this.until = Math.max(until, getNostrTime());

    //     // The event has been added to eventHandler memory, but not yet to the buffer
    //     //if(this.options.filterFn?.(event) === false) return; // Filter out events that don't match the filterFn, undefined means match

    //     this.buffer.push(event);
    //     onEvent?.(event, afterEose, relayUrl);
    //   },
    //   maxDelayms: 0,
    //   onClose: (subId:number) => {

    //     this.done = true;

    //     onClose?.(subId);
    //     onDone?.(subId);
    //   },
    // } as FeedOption;

    //console.log('RepliesCursor:load:relaySubscription.options:', options)

    this.loading = true;
    //console.time('RepliesCursor:load:relaySubscription.once');
    await relaySubscription.getEvent(this.options);
    //console.timeEnd('RepliesCursor:load:relaySubscription.once');
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
