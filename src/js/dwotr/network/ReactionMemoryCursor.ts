import { Event } from 'nostr-tools';
import { STR, UID } from '@/utils/UniqueIds';
import { Events, ICursor, ReactionEvent } from './types';
import reactionManager, { Reaction } from '../ReactionManager';
import { getNostrTime } from '../Utils';
import { EPOCH } from '../Utils/Nostr';

export class ReactionMemoryCursor implements ICursor {
  limit = 50;
  until: number;
  delta: number = 1;
  since: number = EPOCH;

  logging = false;

  done: boolean = false;
  userId: UID;

  buffer: Events = [];

  seen: Map<UID, number> = new Map();

  #valuePointer: IterableIterator<Reaction>; // Pointer to the current value in the notes map

  constructor(_uid: UID, size = 50) {
    this.userId = _uid;
    this.limit = size;
    this.until = getNostrTime();

    this.#valuePointer = reactionManager.getAuthor(this.userId)!.values(); // Get an iterator to the notes map
  }

  async load(): Promise<number> {
    if (this.done) return 0;

    let found = 0;
    let remaning = this.limit - this.buffer.length;

    while (remaning > 0 && !this.done) {
      let reaction = this.#valuePointer.next().value as Reaction;
      if (reaction === undefined) {
        this.done = true;
        if(this.logging)
          console.log('ReactionMemoryCursor:load:valuePointer:END');
        break; // If the iterator is done, we're done
      } 

      if (this.#checkSeen(reaction)) continue; // Skip reactions that have already been seen for the same subject event, checks for created_at
      if (reaction.value != 1) continue; // Skip latest reactions for subject event that have been "deleted" or nullified or downvoted

      let event = reactionManager.getEvent(reaction) as ReactionEvent;
      event.meta = reaction; // Meta property is never saved to Database

      this.buffer.push(event); // Add the note to the buffer to save the next() value, iterator cannot be rewound
      remaning--;

      found++;
    }

    
    return Promise.resolve(found);
  }

  #checkSeen(reaction: Reaction) : boolean {
    let lastCreated_at = this.seen.get(reaction.subjectEventId);
    if(lastCreated_at && lastCreated_at >= reaction.created_at) return true;
    this.seen.set(reaction.subjectEventId, reaction.created_at); 

    return false;
  }

  take(count: number): Events {
    return this.buffer.splice(0, count);
  }

  count(): number {
    return this.buffer.length;
  }

  peek(): Event | undefined {
    return this.buffer[0];
  }

  pop(): Event | undefined {
    return this.buffer.shift();
  }
}
